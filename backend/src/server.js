const app = require("./app");
const { db } = require("./models");
async function start() {
  try {
    await db.authenticate();
    const { Imagen, Publicacion } = require("./models");
    await Imagen.update(
      { estado: "error", error: "Generación interrumpida. Podés reintentar." },
      { where: { estado: "generando" } },
    );
    await Publicacion.update(
      {
        estado: "incierta",
        error:
          "El servidor se reinició durante el envío. Verificá la cuenta antes de repetir.",
      },
      { where: { estado: "publicando" } },
    );
    const server = app.listen(
      Number(process.env.PORT || 3001),
      "127.0.0.1",
      () =>
        console.log(
          "Admisiones CRM API lista en puerto " + (process.env.PORT || 3001),
        ),
    );
    for (const signal of ["SIGINT", "SIGTERM"])
      process.on(signal, () =>
        server.close(async () => {
          await db.close();
          process.exit(0);
        }),
      );
  } catch {
    console.error(
      "No se pudo conectar con MySQL. Revisá backend/.env y ejecutá las migraciones.",
    );
    process.exitCode = 1;
  }
}
start();
