const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
test(
  "API real MySQL: rutas, historial, bloqueo concurrente y cohortes",
  { skip: process.env.RUN_DB_TESTS !== "true" },
  async () => {
    const {
      db,
      Prospecto,
      HistorialEtapa,
      MensajeIA,
      Campania,
    } = require("../src/models");
    const config = db.config;
    assert.match(
      config.database,
      /^admisiones_crm_test_/,
      "Solo se admite una base de pruebas independiente",
    );
    const app = require("../src/app");
    const api = request(app);
    const corsResponse = await request(app)
      .get("/sedes")
      .set("Origin", "http://127.0.0.1:5173");
    assert.equal(
      corsResponse.headers["access-control-allow-origin"],
      "http://127.0.0.1:5173",
    );
    let created;
    try {
      assert.equal(await Prospecto.count(), 40);
      HistorialEtapa.addHook("beforeCreate", "falloPrueba", () => {
        throw Error("Fallo simulado de escritura");
      });
      try {
        const failed = await api.post("/prospectos").send({
          nombre: "Persona Demo Rollback",
          sedeId: 1,
          canalOrigen: "Otro",
        });
        assert.equal(failed.status, 500);
        assert.equal(await Prospecto.count(), 40);
      } finally {
        HistorialEtapa.removeHook("beforeCreate", "falloPrueba");
      }
      assert.equal((await api.get("/salud")).status, 200);
      const invalid = await api
        .post("/prospectos")
        .send({ nombre: "Persona prueba", sedeId: 9999, canalOrigen: "Otro" });
      assert.equal(invalid.status, 400);
      assert.equal(await Prospecto.count(), 40);
      const r = await api.post("/prospectos").send({
        nombre: "Persona Demo Prueba",
        correo: "prueba@example.com",
        sedeId: 1,
        canalOrigen: "Otro",
      });
      assert.equal(r.status, 201);
      created = r.body.data.id;
      assert.equal(r.body.data.etapa.id, 1);
      const original = r.body.data.fechaUltimoAvance;
      let h = await api.get("/prospectos/" + created + "/historial");
      assert.equal(h.body.data.length, 1);
      assert.equal(h.body.data[0].etapaOrigenId, null);
      assert.equal(h.body.data[0].fechaCambio, original);
      assert.equal(
        (
          await api
            .patch("/prospectos/" + created)
            .send({ observaciones: "Seguimiento registrado" })
        ).status,
        200,
      );
      assert.equal(
        (await api.get("/prospectos/" + created)).body.data.fechaUltimoAvance,
        original,
      );
      assert.equal(
        (await api.patch("/prospectos/" + created).send({ etapaActualId: 5 }))
          .status,
        400,
      );
      assert.equal(
        (
          await api
            .patch("/prospectos/" + created + "/etapa")
            .send({ etapaId: 3 })
        ).status,
        409,
      );
      const pair = await Promise.all([
        api.patch("/prospectos/" + created + "/etapa").send({ etapaId: 2 }),
        api.patch("/prospectos/" + created + "/etapa").send({ etapaId: 2 }),
      ]);
      assert.deepEqual(pair.map((r) => r.status).sort(), [200, 409]);
      h = await api.get("/prospectos/" + created + "/historial");
      assert.equal(h.body.data.length, 2);
      assert.equal(h.body.data[1].etapaOrigenId, 1);
      const detail = await api.get("/prospectos/" + created);
      assert.equal(detail.body.data.etapaActualId, 2);
      assert.equal(
        detail.body.data.fechaUltimoAvance,
        h.body.data[1].fechaCambio,
      );
      const funnel = await api.get("/embudo");
      assert.equal(funnel.status, 200);
      assert.equal(funnel.body.data.total, 41);
      assert.equal(
        funnel.body.data.etapas[1].actual,
        (await api.get("/tablero")).body.data.filter(
          (x) => x.etapaActualId === 2,
        ).length,
      );
      const filtered = await api.get("/embudo?sedeId=1");
      assert.equal(
        filtered.body.data.total,
        await Prospecto.count({ where: { sedeId: 1 } }),
      );
      const attention = await api.get("/atencion?dias=3");
      assert.equal(attention.status, 200);
      assert.ok(
        attention.body.data.every(
          (p) => p.etapaActualId !== 9 && p.diasTranscurridos >= 3,
        ),
      );
      assert.ok(
        attention.body.data.every(
          (p, i, a) =>
            !i ||
            +new Date(a[i - 1].fechaUltimoAvance) <=
              +new Date(p.fechaUltimoAvance),
        ),
      );
      assert.equal((await api.get("/atencion?dias=0")).status, 400);
      assert.equal((await api.get("/prospectos/0")).status, 400);
      assert.equal((await api.get("/prospectos/999999")).status, 404);
      assert.equal(
        (await api.get("/embudo?fechaDesde=2026-02-30")).status,
        400,
      );
      const key = process.env.AI_API_KEY;
      delete process.env.AI_API_KEY;
      try {
        const m = await api
          .post("/prospectos/" + created + "/mensaje")
          .send({});
        assert.equal(m.status, 503);
        assert.equal(m.body.error.code, "IA_SIN_CONFIGURAR");
        assert.equal(
          await MensajeIA.count({ where: { prospectoId: created } }),
          0,
        );
      } finally {
        if (key !== undefined) process.env.AI_API_KEY = key;
      }
      const ai = require("../src/services/ai");
      const originalGenerate = ai.generate;
      const originalComplete = ai.complete;
      let campaign;
      try {
        ai.generate = async () => ({
          contenido: "Borrador ficticio solo de prueba",
          modelo: "mock",
          proveedor: "Groq",
        });
        const before = (await api.get("/prospectos/" + created)).body.data;
        const generated = await api
          .post("/prospectos/" + created + "/mensaje")
          .send({});
        assert.equal(generated.status, 201);
        assert.equal(generated.body.data.estado, "borrador");
        assert.equal(generated.body.data.etapaId, 2);
        assert.equal(
          await MensajeIA.count({ where: { prospectoId: created } }),
          1,
        );
        const after = (await api.get("/prospectos/" + created)).body.data;
        assert.equal(after.etapaActualId, before.etapaActualId);
        assert.equal(after.fechaUltimoAvance, before.fechaUltimoAvance);
        ai.complete = async () => ({
          contenido: '{"textos":["Solo uno"]}',
          modelo: "mock",
          proveedor: "Groq",
        });
        const invalidCampaign = await api
          .post("/campanias")
          .send({ objetivo: "Invitar a solicitar orientación", sedeId: 1 });
        assert.equal(invalidCampaign.status, 502);
        ai.complete = async () => ({
          contenido:
            '{"textos":["Propuesta ficticia 1","Propuesta ficticia 2","Propuesta ficticia 3"]}',
          modelo: "mock",
          proveedor: "Groq",
        });
        const validCampaign = await api
          .post("/campanias")
          .send({ objetivo: "Invitar a solicitar orientación", sedeId: 1 });
        assert.equal(validCampaign.status, 201);
        campaign = validCampaign.body.data.id;
        assert.equal(validCampaign.body.data.textos.length, 3);
        assert.equal(validCampaign.body.data.estado, "pendiente_aprobacion");
        assert.equal((await api.get("/campanias")).status, 200);
      } finally {
        ai.generate = originalGenerate;
        ai.complete = originalComplete;
        if (campaign) await Campania.destroy({ where: { id: campaign } });
      }
      const list = await api.get("/prospectos?limit=5&page=1");
      assert.equal(list.body.data.length, 5);
      assert.equal(list.body.meta.total, 41);
    } finally {
      if (created) {
        await MensajeIA.destroy({ where: { prospectoId: created } });
        await HistorialEtapa.destroy({ where: { prospectoId: created } });
        await Prospecto.destroy({ where: { id: created } });
      }
      await db.close();
    }
  },
);
