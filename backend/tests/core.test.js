const test = require("node:test");
const assert = require("node:assert/strict");
const {
  metrics,
  validateTransition,
  needsAttention,
  DAY,
} = require("../src/services/metrics");
const { demo, names, goals } = require("../src/services/demo");
const v = require("../src/middlewares/validation");
const ai = require("../src/services/ai");
const stages = names.map((nombre, i) => ({
  id: i + 1,
  nombre,
  orden: i + 1,
  metaConversion: goals[i],
}));
test("120 a 26: conversión, sin avance y brecha con historia única", () => {
  const people = Array.from({ length: 120 }, (_, i) => ({
    id: i + 1,
    etapaActualId: i < 26 ? 4 : 3,
    fechaIngreso: new Date(),
    fechaUltimoAvance: new Date(),
  }));
  const history = people.flatMap((p) => [
    { prospectoId: p.id, etapaDestinoId: 3, fechaCambio: new Date(0) },
    ...(p.id <= 26
      ? [
          {
            prospectoId: p.id,
            etapaDestinoId: 4,
            fechaCambio: new Date(2 * DAY),
          },
        ]
      : []),
  ]);
  history.push(history[0]);
  const row = metrics(stages, people, history).etapas[2];
  assert.ok(Math.abs(row.conversionPorcentaje - 21.6666666667) < 1e-7);
  assert.ok(Math.abs(row.sinAvancePorcentaje - 78.3333333333) < 1e-7);
  assert.ok(Math.abs(row.brechaMetaPuntos - 53.3333333333) < 1e-7);
  assert.equal(row.diasPromedio, 2);
  assert.equal(row.alcanzaronEtapa, 120);
});
test("denominador cero y etapa final devuelven null", () => {
  const r = metrics(stages, [], []);
  for (const x of r.etapas) {
    assert.equal(x.conversionPorcentaje, null);
    assert.equal(x.brechaMetaPuntos, null);
  }
  assert.equal(r.etapas[8].metaConversion, null);
  assert.equal(r.mayorBrecha, null);
});
test("solo se admite siguiente etapa", () => {
  validateTransition(1, 2);
  for (const [a, b] of [
    [1, 1],
    [3, 2],
    [2, 4],
    [9, 10],
  ])
    assert.throws(() => validateTransition(a, b), { status: 409 });
});
test("atención incluye límite exacto y excluye estudiantes", () => {
  const now = new Date();
  const old = new Date(+now - 3 * DAY);
  assert.equal(
    needsAttention({ etapaActualId: 1, fechaUltimoAvance: old }, 3, now),
    true,
  );
  assert.equal(
    needsAttention({ etapaActualId: 9, fechaUltimoAvance: old }, 3, now),
    false,
  );
  assert.equal(
    needsAttention(
      { etapaActualId: 1, fechaUltimoAvance: new Date(+old + 1) },
      3,
      now,
    ),
    false,
  );
});
test("40 personas, nueve etapas e historial completo y coherente", () => {
  const now = new Date();
  const { personas, historial } = demo(now);
  assert.equal(personas.length, 40);
  assert.equal(new Set(personas.map((p) => p.etapaActualId)).size, 9);
  for (const p of personas) {
    const h = historial.filter((x) => x.prospectoId === p.id);
    assert.equal(h.length, p.etapaActualId);
    assert.equal(+h[0].fechaCambio, +p.fechaIngreso);
    assert.equal(+h.at(-1).fechaCambio, +p.fechaUltimoAvance);
    assert.ok(+p.fechaUltimoAvance <= +now);
    h.forEach((e, i) => {
      assert.equal(e.etapaOrigenId, i || null);
      assert.equal(e.etapaDestinoId, i + 1);
      if (i) assert.ok(+e.fechaCambio > +h[i - 1].fechaCambio);
    });
  }
  const m = metrics(stages, personas, historial, now);
  assert.equal(m.mayorBrecha.id, 3);
  assert.equal(m.mayorBrecha.alcanzaronEtapa, 27);
  assert.ok(Math.abs(m.mayorBrecha.brechaMetaPuntos - 30.5555555556) < 1e-7);
});
test("validación rechaza fechas imposibles, campos de proceso y paginación", () => {
  assert.throws(() => v.filters.parse({ fechaDesde: "2026-02-30" }));
  assert.throws(() =>
    v.filters.parse({ fechaDesde: "2026-11-20", fechaHasta: "2026-11-01" }),
  );
  assert.throws(() => v.contact.partial().parse({ etapaActualId: 8 }));
  for (const dias of ["0", "1.5", "-1", "9999"])
    assert.throws(() => v.attention.parse({ dias }));
  assert.throws(() => v.list.parse({ limit: 101 }));
});
test("errores IA sin consumir créditos", async (t) => {
  const saved = { ...process.env };
  try {
    delete process.env.AI_API_KEY;
    await assert.rejects(() => ai.complete("s", {}), {
      status: 503,
      code: "IA_SIN_CONFIGURAR",
    });
    process.env.AI_API_KEY = "ficticia";
    process.env.AI_MODEL = "modelo-mock";
    process.env.AI_BASE_URL = "https://example.com";
    for (const [status, expected] of [
      [401, 502],
      [403, 502],
      [429, 429],
      [500, 502],
    ])
      await t.test("HTTP " + status, async () => {
        await assert.rejects(
          () => ai.complete("s", {}, async () => ({ ok: false, status })),
          { status: expected },
        );
      });
    await assert.rejects(
      () =>
        ai.complete("s", {}, async () => {
          throw Object.assign(new Error(), { name: "TimeoutError" });
        }),
      { status: 504 },
    );
    await assert.rejects(
      () =>
        ai.complete("s", {}, async () => {
          throw Error("red");
        }),
      { status: 502, code: "IA_CONEXION" },
    );
    await assert.rejects(
      () =>
        ai.complete("s", {}, async () => ({
          ok: true,
          json: async () => ({ choices: [] }),
        })),
      { status: 502, code: "IA_RESPUESTA" },
    );
    await assert.rejects(
      () =>
        ai.complete("s", {}, async () => ({
          ok: true,
          json: async () => {
            throw new SyntaxError("JSON inválido");
          },
        })),
      { status: 502, code: "IA_RESPUESTA" },
    );
    const result = await ai.complete("s", {}, async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Mensaje ficticio" } }],
      }),
    }));
    assert.equal(result.contenido, "Mensaje ficticio");
  } finally {
    for (const key of Object.keys(process.env))
      if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});
test("Groq: URL, autorización y parámetros de generación", async () => {
  const saved = { ...process.env };
  try {
    process.env.AI_API_KEY = "clave-ficticia-prueba";
    process.env.AI_MODEL = "modelo-mock";
    process.env.AI_BASE_URL = "https://api.groq.com/openai/v1";
    const result = await ai.complete(
      "Instrucciones",
      { sede: "Puntarenas" },
      async (url, options) => {
        assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
        assert.equal(
          options.headers.Authorization,
          "Bearer clave-ficticia-prueba",
        );
        const body = JSON.parse(options.body);
        assert.equal(body.model, "modelo-mock");
        assert.equal(body.max_completion_tokens, 1500);
        assert.equal(body.messages[0].role, "system");
        return {
          ok: true,
          json: async () => ({
            choices: [{ message: { content: "Borrador de prueba" } }],
          }),
        };
      },
    );
    assert.equal(result.proveedor, "Groq");
  } finally {
    for (const key of Object.keys(process.env))
      if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});
test("Groq: campaña estructurada con margen de tokens y razonamiento bajo", async () => {
  const saved = { ...process.env };
  try {
    process.env.AI_API_KEY = "ficticia";
    process.env.AI_MODEL = "openai/gpt-oss-20b";
    process.env.AI_BASE_URL = "https://api.groq.com/openai/v1";
    const { generationOptions, output } = require("../src/services/campaigns");
    const options = generationOptions();
    const result = await ai.complete(
      "Solo JSON",
      { objetivo: "Solicitar orientación" },
      async (url, request) => {
        const body = JSON.parse(request.body);
        assert.equal(body.max_completion_tokens, 3000);
        assert.equal(body.reasoning_effort, "low");
        assert.equal(body.response_format.type, "json_schema");
        assert.equal(body.response_format.json_schema.strict, true);
        assert.equal(
          body.response_format.json_schema.schema.properties.textos.minItems,
          3,
        );
        assert.equal(
          body.response_format.json_schema.schema.properties.textos.maxItems,
          3,
        );
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                finish_reason: "stop",
                message: {
                  content: JSON.stringify({
                    textos: ["Primero", "Segundo", "Tercero"],
                  }),
                },
              },
            ],
          }),
        };
      },
      options,
    );
    assert.equal(output.parse(JSON.parse(result.contenido)).textos.length, 3);
    process.env.AI_MODEL = "otro-modelo";
    assert.equal(generationOptions().responseFormat.type, "json_object");
    for (const content of ["", '{"textos":["respuesta parcial"]}']) {
      await assert.rejects(
        () =>
          ai.complete("Solo JSON", {}, async () => ({
            ok: true,
            json: async () => ({
              choices: [{ finish_reason: "length", message: { content } }],
            }),
          })),
        { status: 502, code: "IA_RESPUESTA_TRUNCADA" },
      );
    }
  } finally {
    for (const key of Object.keys(process.env))
      if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});
