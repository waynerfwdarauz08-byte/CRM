const {
  db,
  Publicacion,
  PublicacionEvento,
  Campania,
  Imagen,
} = require("../models");
const { AppError } = require("../middlewares/errors");
const { required } = require("./operations");
const v = require("../middlewares/operations-validation");
const meta = require("./meta");
const images = require("./images");
const include = [
  { model: Campania, as: "campania" },
  { model: Imagen, as: "imagen" },
];
const audit = (id, tipo, detalle, transaction) =>
  PublicacionEvento.create(
    { publicacionId: id, tipo, detalle, fecha: new Date() },
    { transaction },
  );
async function validate(data, transaction) {
  await required(Campania, data.campaniaId, { transaction });
  if (data.red === "instagram" && !data.imagenId)
    throw new AppError(400, "Instagram requiere una imagen.");
  if (data.imagenId) {
    const i = await required(Imagen, data.imagenId, { transaction });
    if (i.estado !== "lista")
      throw new AppError(400, "La imagen todavía no está lista.");
    if (i.campaniaId && i.campaniaId !== data.campaniaId)
      throw new AppError(400, "La imagen pertenece a otra campaña.");
  }
}
async function create(input) {
  const data = v.post.parse(input);
  return db.transaction(async (transaction) => {
    await validate(data, transaction);
    const row = await Publicacion.create(
      { ...data, estado: "borrador", revision: 1 },
      { transaction },
    );
    await audit(
      row.id,
      "creacion",
      "Borrador creado; no se publicó.",
      transaction,
    );
    return row;
  });
}
async function edit(id, input) {
  const { revision, ...fields } = require("zod")
    .z.object({
      ...v.post.shape,
      revision: require("zod").z.number().int().positive(),
    })
    .strict()
    .parse(input);
  return db.transaction(async (transaction) => {
    const row = await required(Publicacion, id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!["borrador", "aprobada", "error"].includes(row.estado))
      throw new AppError(
        409,
        "Esta publicación ya está en proceso o fue publicada.",
      );
    if (row.revision !== revision)
      throw new AppError(409, "El borrador cambió. Recargá antes de editar.");
    await validate(fields, transaction);
    await row.update(
      {
        ...fields,
        estado: "borrador",
        revision: revision + 1,
        revisionAprobada: null,
        cuentaDestino: null,
        contenedorId: null,
        error: null,
      },
      { transaction },
    );
    await audit(
      id,
      "edicion",
      "Contenido modificado; requiere nueva aprobación.",
      transaction,
    );
    return row;
  });
}
async function approve(id, input) {
  const { revision, cuentaDestino } = require("zod")
    .z.object({
      revision: require("zod").z.number().int().positive(),
      cuentaDestino: require("zod").z.string().regex(/^\d+$/),
    })
    .strict()
    .parse(input);
  return db.transaction(async (transaction) => {
    const row = await required(Publicacion, id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (
      !["borrador", "error"].includes(row.estado) ||
      row.revision !== revision
    )
      throw new AppError(409, "El borrador cambió o no admite aprobación.");
    const config = meta.settings(row.red);
    if (config.account !== cuentaDestino)
      throw new AppError(409, "La cuenta cambió. Recargá y revisá el destino.");
    const campaign = await required(Campania, row.campaniaId, { transaction });
    if (campaign.estado !== "aprobada")
      throw new AppError(409, "Primero aprobá la campaña desde Campañas.");
    await validate(row, transaction);
    const image = row.imagenId
      ? await required(Imagen, row.imagenId, { transaction })
      : null;
    if (image) images.publicUrl(image);
    await row.update(
      {
        estado: "aprobada",
        revisionAprobada: revision,
        cuentaDestino: config.account,
        fechaAprobacion: new Date(),
        contenedorId: null,
        error: null,
      },
      { transaction },
    );
    await audit(
      id,
      "aprobacion",
      "Aprobado para " + row.red + " en cuenta " + config.account + ".",
      transaction,
    );
    return row;
  });
}
async function publish(id, input, adapter = meta) {
  const { revision } = v.revision.parse(input);
  const snapshot = await db.transaction(async (transaction) => {
    const row = await required(Publicacion, id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (
      !["aprobada", "procesando"].includes(row.estado) ||
      row.revision !== revision ||
      row.revisionAprobada !== revision
    )
      throw new AppError(
        409,
        "Se requiere una aprobación vigente. No se repetirá una publicación incierta o ya publicada.",
      );
    const config = meta.settings(row.red);
    if (config.account !== row.cuentaDestino)
      throw new AppError(
        409,
        "La cuenta de destino cambió; editá y aprobá nuevamente.",
      );
    await validate(row, transaction);
    const image = row.imagenId
      ? await required(Imagen, row.imagenId, { transaction })
      : null;
    if (image) images.publicUrl(image);
    await row.update({ estado: "publicando", error: null }, { transaction });
    await audit(
      id,
      "envio",
      "Se solicitó publicar la revisión " + revision + ".",
      transaction,
    );
    return { post: { ...row.toJSON(), imagen: image }, config };
  });
  try {
    const result = await adapter.publish(
      snapshot.post,
      snapshot.config,
      (container) =>
        Publicacion.update({ contenedorId: container }, { where: { id } }),
    );
    return db.transaction(async (transaction) => {
      const row = await required(Publicacion, id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      await row.update(
        result.pending
          ? { estado: "procesando" }
          : {
              estado: "publicada",
              externoId: result.id,
              url: result.url,
              fechaPublicacion: new Date(),
            },
        { transaction },
      );
      await audit(
        id,
        result.pending ? "procesamiento" : "publicada",
        result.pending
          ? "Instagram está preparando la imagen; se conserva el contenedor."
          : "Publicación confirmada por Meta.",
        transaction,
      );
      return row;
    });
  } catch (e) {
    const uncertain = !(e instanceof AppError) || e.code === "REDES_INCIERTA";
    await db.transaction(async (transaction) => {
      await Publicacion.update(
        {
          estado: uncertain ? "incierta" : "error",
          error:
            e instanceof AppError
              ? e.message
              : "No se pudo confirmar la publicación.",
        },
        { where: { id }, transaction },
      );
      await audit(
        id,
        uncertain ? "incierta" : "error",
        uncertain
          ? "Revisar la cuenta antes de reintentar; se bloqueó la repetición."
          : "Meta rechazó la solicitud; requiere nueva aprobación.",
        transaction,
      );
    });
    if (e instanceof AppError) throw e;
    throw new AppError(
      502,
      "No se pudo confirmar el resultado de la publicación.",
      "REDES_INCIERTA",
    );
  }
}
async function reconcile(id, externalId) {
  const snapshot = await required(Publicacion, id);
  if (snapshot.estado !== "incierta")
    throw new AppError(
      409,
      "Solo se concilian publicaciones de resultado incierto.",
    );
  const config = meta.settings(snapshot.red);
  if (config.account !== snapshot.cuentaDestino)
    throw new AppError(409, "La cuenta configurada cambió.");
  const result = await meta.reconcile(snapshot, externalId, config);
  return db.transaction(async (transaction) => {
    const row = await required(Publicacion, id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (row.estado !== "incierta")
      throw new AppError(409, "El registro cambió.");
    await row.update(
      {
        estado: "publicada",
        externoId: result.id,
        url: result.url,
        fechaPublicacion: new Date(),
        error: null,
      },
      { transaction },
    );
    await audit(
      id,
      "conciliacion",
      "Se verificó en Meta el ID indicado por el usuario.",
      transaction,
    );
    return row;
  });
}
function integrations() {
  const config = (red) => {
    try {
      const c = meta.settings(red);
      return { configurada: true, cuenta: c.account };
    } catch (e) {
      return { configurada: false, mensaje: e.message };
    }
  };
  let image;
  try {
    const c = images.config();
    image = { configurada: true, modelo: c.model };
  } catch (e) {
    image = { configurada: false, mensaje: e.message };
  }
  return {
    imagenes: image,
    facebook: config("facebook"),
    instagram: config("instagram"),
    mediaPublica: Boolean(process.env.MEDIA_PUBLIC_BASE_URL),
    publicacionHabilitada: process.env.SOCIAL_PUBLISH_ENABLED === "true",
  };
}
async function verify() {
  const result = {};
  for (const red of ["facebook", "instagram"]) {
    try {
      const config = meta.settings(red);
      const data = await meta.graph(config, config.account + "?fields=id,name");
      result[red] = {
        conectada: true,
        id: String(data.id),
        nombre: data.name || config.account,
      };
    } catch (e) {
      result[red] = {
        conectada: false,
        mensaje:
          e instanceof AppError
            ? e.message
            : "No fue posible verificar la cuenta.",
      };
    }
  }
  return result;
}
module.exports = {
  include,
  create,
  edit,
  approve,
  publish,
  reconcile,
  integrations,
  verify,
};
