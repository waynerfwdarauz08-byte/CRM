const { Op } = require("sequelize");
const { db, Prospecto, HistorialEtapa, Etapa, Sede } = require("../models");
const { AppError } = require("../middlewares/errors");
const { validateTransition } = require("./metrics");
const include = [
  { model: Etapa, as: "etapa" },
  { model: Sede, as: "sede" },
];
async function get(id, options = {}) {
  const p = await Prospecto.findByPk(id, { include, ...options });
  if (!p) throw new AppError(404, "Prospecto no encontrado.");
  return p;
}
async function register(data) {
  return db.transaction(async (transaction) => {
    if (!(await Sede.findByPk(data.sedeId, { transaction })))
      throw new AppError(400, "Sede inválida.");
    const now = new Date();
    const p = await Prospecto.create(
      {
        ...data,
        correo: data.correo || null,
        etapaActualId: 1,
        fechaIngreso: now,
        fechaUltimoAvance: now,
      },
      { transaction },
    );
    await HistorialEtapa.create(
      {
        prospectoId: p.id,
        etapaOrigenId: null,
        etapaDestinoId: 1,
        fechaCambio: now,
        comentario: "Registro inicial",
      },
      { transaction },
    );
    return get(p.id, { transaction });
  });
}
async function advance(id, data) {
  return db.transaction(async (transaction) => {
    const p = await Prospecto.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!p) throw new AppError(404, "Prospecto no encontrado.");
    if (p.estadoProceso !== "activo")
      throw new AppError(409, "Reactivá al prospecto antes de avanzar.");
    validateTransition(p.etapaActualId, data.etapaId);
    const old = p.etapaActualId;
    const now = new Date();
    await p.update(
      { etapaActualId: data.etapaId, fechaUltimoAvance: now },
      { transaction },
    );
    await HistorialEtapa.create(
      {
        prospectoId: id,
        etapaOrigenId: old,
        etapaDestinoId: data.etapaId,
        fechaCambio: now,
        comentario: data.comentario || null,
      },
      { transaction },
    );
    return {
      etapaAnterior: await Etapa.findByPk(old, { transaction }),
      etapaNueva: await Etapa.findByPk(data.etapaId, { transaction }),
      fechaCambio: now,
      prospecto: await get(id, { transaction }),
    };
  });
}
function cohortWhere(f) {
  const w = {};
  if (f.sedeId) w.sedeId = f.sedeId;
  if (f.canalOrigen) w.canalOrigen = f.canalOrigen;
  if (f.fechaDesde || f.fechaHasta) {
    w.fechaIngreso = {};
    if (f.fechaDesde)
      w.fechaIngreso[Op.gte] = new Date(f.fechaDesde + "T00:00:00-06:00");
    if (f.fechaHasta)
      w.fechaIngreso[Op.lt] = new Date(
        +new Date(f.fechaHasta + "T00:00:00-06:00") + 86400000,
      );
  }
  return w;
}
module.exports = { get, register, advance, include, cohortWhere };
