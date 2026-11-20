const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
async function cycle() {
  const proc = spawn(
    process.execPath,
    [path.resolve(__dirname, "../src/server.js")],
    {
      env: { ...process.env, NODE_ENV: "development", PORT: "3002" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let text = "";
  proc.stdout.on("data", (d) => (text += d));
  proc.stderr.on("data", () => {});
  try {
    for (let i = 0; i < 100; i++) {
      if (proc.exitCode !== null)
        throw Error("La API de prueba terminó antes de iniciar");
      if (text.includes("API lista")) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.ok(text.includes("API lista"), "Inicio de API agotó espera");
    const records = [];
    let page = 1,
      pages = 1;
    do {
      const res = await fetch(
        "http://127.0.0.1:3002/prospectos?limit=100&page=" + page,
      );
      assert.equal(res.status, 200);
      const body = await res.json();
      records.push(...body.data);
      pages = body.meta.pages;
      page++;
    } while (page <= pages);
    return records.map((p) => ({
      id: p.id,
      etapa: p.etapaActualId,
      fecha: p.fechaUltimoAvance,
      estado: p.estadoProceso,
      campania: p.campaniaOrigenId,
    }));
  } finally {
    proc.kill();
    await new Promise((r) => proc.once("exit", r));
  }
}
(async () => {
  const first = await cycle();
  const second = await cycle();
  assert.ok(first.length >= 40);
  assert.equal(
    first.filter((p) => p.id >= 100001 && p.id <= 100040).length,
    40,
  );
  assert.deepEqual(first, second);
  console.log(
    "Persistencia confirmada: " +
      first.length +
      " registros idénticos tras reiniciar la API.",
  );
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
