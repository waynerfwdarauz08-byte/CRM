const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { summarize, cents } = require("../src/services/finance");
const validation = require("../src/middlewares/operations-validation");
const meta = require("../src/services/meta");
const images = require("../src/services/images");
const { AppError } = require("../src/middlewares/errors");
const sharp = require("sharp");
test("Finanzas: centavos exactos, monedas separadas, cohortes temporales y muestra cero", () => {
  assert.equal(cents("0.10") + cents("0.20"), 30);
  const campaigns = [
    { id: 1, moneda: "CRC", presupuesto: "100.00" },
    { id: 2, moneda: "USD", presupuesto: "20.00" },
  ];
  const expenses = [
    { campaniaId: 1, monto: "30.00", fecha: "2026-11-20", anulado: false },
    { campaniaId: 1, monto: "10.00", fecha: "2026-11-01", anulado: false },
    { campaniaId: 1, monto: "60.00", fecha: "2026-11-20", anulado: true },
    { campaniaId: 2, monto: "3.00", fecha: "2026-11-20", anulado: false },
  ];
  const people = [
    { id: 1, campaniaOrigenId: 1 },
    { id: 2, campaniaOrigenId: 1 },
    { id: 3, campaniaOrigenId: null },
  ];
  const history = [
    { prospectoId: 1, etapaDestinoId: 7, fechaCambio: "2026-11-20T12:00:00Z" },
    { prospectoId: 1, etapaDestinoId: 7, fechaCambio: "2026-11-20T12:00:00Z" },
    { prospectoId: 2, etapaDestinoId: 7, fechaCambio: "2026-11-01T12:00:00Z" },
    { prospectoId: 3, etapaDestinoId: 7, fechaCambio: "2026-11-20T12:00:00Z" },
  ];
  const result = summarize(campaigns, expenses, people, history, {
    fechaDesde: "2026-11-20",
    fechaHasta: "2026-11-20",
  });
  assert.equal(result.campanias[0].gastadoTotal, "40.00");
  assert.equal(result.campanias[0].gastadoPeriodo, "30.00");
  assert.equal(result.campanias[0].saldo, "60.00");
  assert.equal(result.campanias[0].costoPorAdmitido, "30.00");
  assert.equal(result.campanias[1].costoPorAdmitido, null);
  assert.equal(result.resumen[1].gastadoPeriodo, "3.00");
  assert.equal(result.admitidosSinAtribucion, 1);
  assert.throws(() => validation.money.parse("-1"));
  assert.throws(() => validation.money.parse("0.001"));
  assert.throws(() => validation.event.parse({}));
});
test("Meta: contenedor de Instagram se conserva durante procesamiento, sin crear duplicados", async () => {
  const saved = process.env.MEDIA_PUBLIC_BASE_URL;
  process.env.MEDIA_PUBLIC_BASE_URL = "https://media.example.com";
  try {
    let created = 0,
      container;
    const calls = [];
    const post = {
      red: "instagram",
      texto: "Texto ficticio",
      imagen: { archivo: "demo.jpg" },
    };
    const config = { account: "123", version: "v27.0", token: "ficticio" };
    let ready = false;
    const fake = async (url, options) => {
      calls.push(url);
      if (url.endsWith("/123/media")) {
        created++;
        return Response.json({ id: "987" });
      }
      if (url.includes("status_code"))
        return Response.json({
          status_code: ready ? "FINISHED" : "IN_PROGRESS",
        });
      if (url.endsWith("/media_publish")) return Response.json({ id: "555" });
      return Response.json({ permalink: "https://www.instagram.com/p/demo/" });
    };
    const first = await meta.publish(
      post,
      config,
      async (id) => {
        container = id;
      },
      fake,
    );
    assert.equal(first.pending, true);
    ready = true;
    const second = await meta.publish(
      { ...post, contenedorId: container },
      config,
      () => assert.fail("No debe recrear contenedor"),
      fake,
    );
    assert.equal(second.id, "555");
    assert.equal(created, 1);
    assert.ok(calls.some((x) => x.endsWith("/123/media_publish")));
    await assert.rejects(
      () =>
        meta.graph(config, "123/feed", { message: "Demo" }, async () => {
          throw Error("red");
        }),
      { code: "REDES_INCIERTA" },
    );
    await assert.rejects(
      () =>
        meta.reconcile(
          { red: "facebook", texto: "Demo" },
          "555",
          config,
          async () =>
            Response.json({ id: "555", from: { id: "999" }, message: "Demo" }),
        ),
      { status: 409 },
    );
  } finally {
    if (saved === undefined) delete process.env.MEDIA_PUBLIC_BASE_URL;
    else process.env.MEDIA_PUBLIC_BASE_URL = saved;
  }
});
test("Imágenes: decodificación real, JPEG y rechazo de respuestas inválidas sin créditos", async () => {
  const saved = { ...process.env };
  try {
    process.env.IMAGE_API_KEY = "ficticia";
    process.env.IMAGE_MODEL = "mock";
    process.env.IMAGE_BASE_URL = "https://image.example.com/v1";
    const png = await sharp({
      create: { width: 512, height: 512, channels: 3, background: "#2563eb" },
    })
      .png()
      .toBuffer();
    const result = await images.provider(
      { prompt: "Aula ficticia", tamano: "1024x1024" },
      async (url, options) => {
        assert.equal(url, "https://image.example.com/v1/images/generations");
        assert.equal(JSON.parse(options.body).n, 1);
        return Response.json({ data: [{ b64_json: png.toString("base64") }] });
      },
    );
    const metadata = await sharp(result).metadata();
    assert.equal(metadata.format, "jpeg");
    assert.equal(metadata.width, 512);
    await assert.rejects(
      () =>
        images.provider({ prompt: "Demo", tamano: "1024x1024" }, async () =>
          Response.json({ data: [{ b64_json: "no-es-base64" }] }),
        ),
      { code: "IMAGEN_RESPUESTA" },
    );
    await assert.rejects(
      () =>
        images.provider(
          { prompt: "Demo" },
          async () => new Response("", { status: 401 }),
        ),
      { status: 502 },
    );
    delete process.env.IMAGE_API_KEY;
    assert.throws(() => images.config(), { status: 503 });
  } finally {
    for (const k of Object.keys(process.env))
      if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  }
});
test(
  "Módulos ampliados con MySQL: estados, agenda, finanzas, imágenes y publicación idempotente",
  { skip: process.env.RUN_DB_TESTS !== "true" },
  async (t) => {
    const {
      db,
      Prospecto,
      HistorialEtapa,
      HistorialEstado,
      Evento,
      Entrevista,
      Campania,
      Gasto,
      Imagen,
      Publicacion,
      PublicacionEvento,
    } = require("../src/models");
    assert.match(db.config.database, /^admisiones_crm_test_/);
    const app = require("../src/app"),
      api = request(app);
    const { Op } = require("sequelize");
    const fs = require("fs/promises"),
      path = require("path");
    const originalMetaPublish = meta.publish,
      originalMetaReconcile = meta.reconcile,
      savedEnv = { ...process.env };
    let person, campaign;
    try {
      const registered = await api.post("/prospectos").send({
        nombre: "Persona Demo Operaciones",
        correo: "operaciones@example.com",
        sedeId: 1,
        canalOrigen: "Otro",
      });
      assert.equal(registered.status, 201);
      person = registered.body.data.id;
      campaign = await Campania.create({
        objetivo: "Prueba de módulos ampliados",
        sedeId: 1,
        textos: ["Uno", "Dos", "Tres"],
        estado: "pendiente_aprobacion",
        proveedor: "mock",
        modelo: "mock",
      });
      const original = (await Prospecto.findByPk(person)).fechaUltimoAvance;
      await t.test(
        "Espera y exclusión conservan etapas y fechas; reactivación auditable",
        async () => {
          await Prospecto.update(
            { fechaUltimoAvance: new Date(Date.now() - 10 * 86400000) },
            { where: { id: person } },
          );
          const before = (await Prospecto.findByPk(person)).fechaUltimoAvance;
          assert.equal(
            (
              await api
                .patch("/prospectos/" + person + "/estado")
                .send({ estado: "espera", motivo: "Pendiente de cupo" })
            ).status,
            200,
          );
          assert.equal(
            (
              await api
                .patch("/prospectos/" + person + "/etapa")
                .send({ etapaId: 2 })
            ).status,
            409,
          );
          assert.ok(
            !(await api.get("/atencion?dias=3")).body.data.some(
              (p) => p.id === person,
            ),
          );
          assert.ok(
            (await api.get("/prospectos?estadoProceso=espera")).body.data.some(
              (p) => p.id === person,
            ),
          );
          assert.equal(
            (await Prospecto.findByPk(person)).fechaUltimoAvance.getTime(),
            before.getTime(),
          );
          assert.equal(
            (
              await api.patch("/prospectos/" + person + "/estado").send({
                estado: "excluido",
                motivo: "Decisión ficticia de prueba",
              })
            ).status,
            200,
          );
          assert.equal(
            (
              await api
                .patch("/prospectos/" + person + "/estado")
                .send({ estado: "activo", motivo: "Solicita continuar" })
            ).status,
            200,
          );
          assert.equal(
            (await api.get("/prospectos/" + person + "/estados")).body.data
              .length,
            3,
          );
        },
      );
      await t.test(
        "Agenda: conflictos concurrentes, reprogramación, resultados e ICS",
        async () => {
          const start = new Date(Date.now() + 2 * 86400000);
          start.setUTCSeconds(0, 0);
          const end = new Date(+start + 3600000);
          const payload = {
            prospectoId: person,
            sedeId: 1,
            titulo: "Entrevista, demo; prueba",
            inicio: start.toISOString(),
            fin: end.toISOString(),
            responsable: "Equipo Demo Operaciones",
            lugar: "Sala ficticia",
            notas: "Datos ficticios",
          };
          const pair = await Promise.all([
            api.post("/entrevistas").send(payload),
            api.post("/entrevistas").send(payload),
          ]);
          assert.deepEqual(pair.map((r) => r.status).sort(), [201, 409]);
          const interview = pair.find((r) => r.status === 201).body.data;
          const conflict = await api
            .post("/calendario")
            .send({ ...payload, tipo: "seguimiento" });
          assert.equal(conflict.status, 409);
          const adjacent = await api.post("/calendario").send({
            ...payload,
            tipo: "seguimiento",
            inicio: end.toISOString(),
            fin: new Date(+end + 3600000).toISOString(),
          });
          assert.equal(adjacent.status, 201);
          assert.equal(
            (
              await api.put("/entrevistas/" + interview.id).send({
                ...payload,
                inicio: new Date(+start + 4 * 3600000).toISOString(),
                fin: new Date(+start + 5 * 3600000).toISOString(),
              })
            ).status,
            200,
          );
          const before = (await Prospecto.findByPk(person)).etapaActualId;
          assert.equal(
            (
              await api
                .patch("/entrevistas/" + interview.id + "/resultado")
                .send({
                  estado: "realizada",
                  resultado: "pendiente",
                  notas: "Resultado ficticio",
                })
            ).status,
            200,
          );
          assert.equal(
            (await Prospecto.findByPk(person)).etapaActualId,
            before,
          );
          assert.equal(
            (
              await api
                .patch("/entrevistas/" + interview.id + "/resultado")
                .send({ estado: "realizada", resultado: "favorable" })
            ).status,
            409,
          );
          assert.equal(
            (
              await api
                .patch("/entrevistas/" + interview.id + "/revision")
                .send({
                  resultado: "favorable",
                  notas: "Revisión humana ficticia",
                })
            ).status,
            200,
          );
          assert.equal(
            (
              await api
                .patch("/entrevistas/" + interview.id + "/revision")
                .send({ resultado: "desfavorable" })
            ).status,
            409,
          );
          const calendar = await api.get("/calendario");
          assert.equal(calendar.status, 200);
          assert.ok(
            calendar.body.data.some(
              (e) => e.id === interview.eventoId && e.estado === "completado",
            ),
          );
          const ics = await api.get("/calendario.ics");
          assert.equal(ics.status, 200);
          assert.match(ics.text, /BEGIN:VCALENDAR/);
          assert.match(ics.text, /DTSTART:\d{8}T\d{6}Z/);
          assert.match(ics.text, /Entrevista\\, demo\\; prueba/);
        },
      );
      await t.test(
        "Presupuesto: gastos concurrentes no exceden saldo; CPA usa historial y atribución",
        async () => {
          assert.equal(
            (
              await api
                .patch("/campanias/" + campaign.id + "/presupuesto")
                .send({ presupuesto: "100.00", moneda: "CRC" })
            ).status,
            200,
          );
          const today = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Costa_Rica",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date());
          const input = {
            concepto: "Gasto ficticio",
            monto: "60.00",
            fecha: today,
          };
          const results = await Promise.all([
            api.post("/campanias/" + campaign.id + "/gastos").send(input),
            api.post("/campanias/" + campaign.id + "/gastos").send(input),
          ]);
          assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
          const gasto = results.find((r) => r.status === 201).body.data;
          assert.equal(
            (
              await api
                .patch("/campanias/" + campaign.id + "/presupuesto")
                .send({ presupuesto: "59.99", moneda: "CRC" })
            ).status,
            409,
          );
          assert.equal(
            (
              await api
                .patch("/prospectos/" + person + "/atribucion")
                .send({ campaniaId: campaign.id })
            ).status,
            200,
          );
          assert.equal(
            (await api.patch("/prospectos/" + person).send({ sedeId: 2 }))
              .status,
            409,
          );
          for (let stage = 2; stage <= 7; stage++)
            assert.equal(
              (
                await api
                  .patch("/prospectos/" + person + "/etapa")
                  .send({ etapaId: stage })
              ).status,
              200,
            );
          let report = (await api.get("/finanzas?campaniaId=" + campaign.id))
            .body.data;
          assert.equal(report.campanias[0].admitidosPeriodo, 1);
          assert.equal(report.campanias[0].costoPorAdmitido, "60.00");
          assert.equal(report.campanias[0].saldo, "40.00");
          assert.equal(
            (
              await api
                .post("/gastos/" + gasto.id + "/anular")
                .send({ motivo: "Registro duplicado de prueba" })
            ).status,
            200,
          );
          report = (await api.get("/finanzas?campaniaId=" + campaign.id)).body
            .data;
          assert.equal(report.campanias[0].saldo, "100.00");
          assert.equal(report.campanias[0].costoPorAdmitido, "0.00");
          assert.equal(
            (
              await api
                .patch("/campanias/" + campaign.id + "/presupuesto")
                .send({ presupuesto: "100", moneda: "USD" })
            ).status,
            409,
          );
        },
      );
      let image;
      await t.test(
        "Imágenes: falta de configuración explícita, persistencia y reintento con proveedor simulado",
        async () => {
          delete process.env.IMAGE_API_KEY;
          assert.equal(
            (
              await api
                .post("/imagenes")
                .send({ prompt: "Aula ficticia", campaniaId: campaign.id })
            ).status,
            503,
          );
          Object.assign(process.env, {
            IMAGE_API_KEY: "ficticia",
            IMAGE_MODEL: "mock",
            IMAGE_BASE_URL: "https://image.example.com/v1",
          });
          const bytes = await sharp({
            create: {
              width: 512,
              height: 512,
              channels: 3,
              background: "#7c3aed",
            },
          })
            .png()
            .toBuffer();
          const good = async () =>
            Response.json({ data: [{ b64_json: bytes.toString("base64") }] });
          image = await images.generate(
            { prompt: "Imagen ficticia de prueba", campaniaId: campaign.id },
            good,
          );
          assert.equal(image.estado, "lista");
          const asset = await api.get("/archivos/" + image.archivo);
          assert.equal(asset.status, 200);
          assert.match(asset.headers["content-type"], /image\/jpeg/);
          await assert.rejects(
            () =>
              images.generate(
                { prompt: "Fallida de prueba", campaniaId: campaign.id },
                async () => Response.json({ data: [] }),
              ),
            { status: 502 },
          );
          const failed = await Imagen.findOne({
            where: { campaniaId: campaign.id, estado: "error" },
          });
          assert.ok(failed);
          await images.retry(failed.id, good);
          assert.equal((await Imagen.findByPk(failed.id)).estado, "lista");
        },
      );
      await t.test(
        "Publicación: revisión, cuenta, aprobación, concurrencia y resultado incierto sin duplicar",
        async () => {
          Object.assign(process.env, {
            SOCIAL_PUBLISH_ENABLED: "true",
            META_GRAPH_VERSION: "v27.0",
            META_PAGE_ACCESS_TOKEN: "token-ficticio",
            META_PAGE_ID: "123456",
            META_INSTAGRAM_ACCOUNT_ID: "789123",
            MEDIA_PUBLIC_BASE_URL: "https://media.example.com/archivos",
          });
          const create = await api.post("/publicaciones").send({
            campaniaId: campaign.id,
            red: "facebook",
            texto: "Borrador ficticio, no publicar realmente.",
          });
          assert.equal(create.status, 201);
          const post = create.body.data;
          let sends = 0;
          meta.publish = async () => {
            sends++;
            await new Promise((r) => setTimeout(r, 50));
            return {
              id: "123456_222",
              url: "https://www.facebook.com/123456_222",
            };
          };
          assert.equal(
            (
              await api
                .post("/publicaciones/" + post.id + "/publicar")
                .send({ revision: 1 })
            ).status,
            409,
          );
          assert.equal(
            (
              await api
                .post("/publicaciones/" + post.id + "/aprobar")
                .send({ revision: 1, cuentaDestino: "123456" })
            ).status,
            409,
          );
          assert.equal(
            (await api.post("/campanias/" + campaign.id + "/aprobar").send({}))
              .status,
            200,
          );
          assert.equal(
            (
              await api
                .post("/publicaciones/" + post.id + "/aprobar")
                .send({ revision: 1, cuentaDestino: "999" })
            ).status,
            409,
          );
          assert.equal(
            (
              await api
                .post("/publicaciones/" + post.id + "/aprobar")
                .send({ revision: 1, cuentaDestino: "123456" })
            ).status,
            200,
          );
          const edited = await api.patch("/publicaciones/" + post.id).send({
            campaniaId: campaign.id,
            red: "facebook",
            texto: "Texto ficticio revisado.",
            revision: 1,
          });
          assert.equal(edited.status, 200);
          assert.equal(edited.body.data.estado, "borrador");
          assert.equal(edited.body.data.revision, 2);
          assert.equal(
            (
              await api
                .post("/publicaciones/" + post.id + "/publicar")
                .send({ revision: 1 })
            ).status,
            409,
          );
          assert.equal(
            (
              await api
                .post("/publicaciones/" + post.id + "/aprobar")
                .send({ revision: 2, cuentaDestino: "123456" })
            ).status,
            200,
          );
          const pair = await Promise.all([
            api
              .post("/publicaciones/" + post.id + "/publicar")
              .send({ revision: 2 }),
            api
              .post("/publicaciones/" + post.id + "/publicar")
              .send({ revision: 2 }),
          ]);
          assert.deepEqual(pair.map((r) => r.status).sort(), [200, 409]);
          assert.equal(sends, 1);
          assert.equal(
            (await Publicacion.findByPk(post.id)).estado,
            "publicada",
          );
          assert.equal(
            (
              await api
                .post("/publicaciones/" + post.id + "/publicar")
                .send({ revision: 2 })
            ).status,
            409,
          );
          assert.equal(sends, 1);
          assert.equal(
            (
              await api.post("/publicaciones").send({
                campaniaId: campaign.id,
                red: "instagram",
                texto: "Demo sin imagen",
              })
            ).status,
            400,
          );
          const ig = await api.post("/publicaciones").send({
            campaniaId: campaign.id,
            red: "instagram",
            texto: "Imagen ficticia de prueba",
            imagenId: image.id,
          });
          assert.equal(ig.status, 201);
          const other = (
            await api.post("/publicaciones").send({
              campaniaId: campaign.id,
              red: "facebook",
              texto: "Resultado incierto de prueba",
            })
          ).body.data;
          await api
            .post("/publicaciones/" + other.id + "/aprobar")
            .send({ revision: 1, cuentaDestino: "123456" });
          meta.publish = async () => {
            sends++;
            throw new AppError(504, "Respuesta incierta", "REDES_INCIERTA");
          };
          const postService = require("../src/services/publications");
          await assert.rejects(
            () => postService.publish(other.id, { revision: 1 }),
            { status: 504 },
          );
          assert.equal(
            (await Publicacion.findByPk(other.id)).estado,
            "incierta",
          );
          const before = sends;
          await assert.rejects(
            () => postService.publish(other.id, { revision: 1 }),
            { status: 409 },
          );
          assert.equal(sends, before);
          meta.reconcile = async () => ({
            id: "123456_333",
            url: "https://www.facebook.com/123456_333",
          });
          await postService.reconcile(other.id, "123456_333");
          assert.equal(
            (await Publicacion.findByPk(other.id)).estado,
            "publicada",
          );
          const history = await api.get(
            "/publicaciones/" + post.id + "/historial",
          );
          assert.ok(history.body.data.some((h) => h.tipo === "publicada"));
          const config = await api.get("/integraciones");
          assert.ok(!JSON.stringify(config.body).includes("token-ficticio"));
        },
      );
    } finally {
      meta.publish = originalMetaPublish;
      meta.reconcile = originalMetaReconcile;
      for (const k of Object.keys(process.env))
        if (!(k in savedEnv)) delete process.env[k];
      Object.assign(process.env, savedEnv);
      if (campaign) {
        const posts = await Publicacion.findAll({
          where: { campaniaId: campaign.id },
        });
        const ids = posts.map((p) => p.id);
        if (ids.length) {
          await PublicacionEvento.destroy({
            where: { publicacionId: { [Op.in]: ids } },
          });
          await Publicacion.destroy({ where: { id: { [Op.in]: ids } } });
        }
        const pics = await Imagen.findAll({
          where: { campaniaId: campaign.id },
        });
        for (const pic of pics)
          if (pic.archivo && /^[a-f0-9-]+\.jpg$/.test(pic.archivo))
            await fs
              .unlink(path.join(images.uploads, pic.archivo))
              .catch(() => {});
        await Imagen.destroy({ where: { campaniaId: campaign.id } });
        await Gasto.destroy({ where: { campaniaId: campaign.id } });
      }
      if (person) {
        await Entrevista.destroy({ where: { prospectoId: person } });
        await Evento.destroy({ where: { prospectoId: person } });
        await HistorialEstado.destroy({ where: { prospectoId: person } });
        await HistorialEtapa.destroy({ where: { prospectoId: person } });
        await Prospecto.destroy({ where: { id: person } });
      }
      if (campaign) await Campania.destroy({ where: { id: campaign.id } });
      await db.close();
    }
  },
);
test("Fechas: el período financiero usa el día de Costa Rica y no el día UTC", () => {
  const { localDay } = require("../src/services/dates");
  assert.equal(localDay("2026-11-20T05:59:59Z"), "2026-11-19");
  assert.equal(localDay("2026-11-20T06:00:00Z"), "2026-11-20");
  const result = summarize(
    [{ id: 1, moneda: "CRC", presupuesto: "100.00" }],
    [{ campaniaId: 1, monto: "30.00", fecha: "2026-11-20", anulado: false }],
    [{ id: 1, campaniaOrigenId: 1 }],
    [
      {
        prospectoId: 1,
        etapaDestinoId: 7,
        fechaCambio: "2026-11-20T05:59:59Z",
      },
    ],
    { fechaDesde: "2026-11-20", fechaHasta: "2026-11-20" },
  );
  assert.equal(result.campanias[0].admitidosPeriodo, 0);
  assert.equal(result.campanias[0].costoPorAdmitido, null);
});
