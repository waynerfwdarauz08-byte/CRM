const { Sequelize } = require("sequelize");
const { execFileSync } = require("child_process");
const path = require("path");
const base = require("../backend/src/config/database").development;
async function main() {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replaceAll("-", "");
  const name = "admisiones_crm_limpia_" + day + "_" + Date.now();
  if (!/^admisiones_crm_limpia_\d+_\d+$/.test(name))
    throw Error("Nombre de base inválido");
  const connection = new Sequelize({ ...base, database: undefined });
  try {
    await connection.query(
      "CREATE DATABASE " +
        connection.getQueryInterface().quoteIdentifier(name) +
        " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    );
  } finally {
    await connection.close();
  }
  const cli = require.resolve("sequelize-cli/lib/sequelize");
  const cwd = path.resolve(__dirname, "../backend");
  const env = { ...process.env, NODE_ENV: "development", DB_NAME: name };
  for (const action of ["db:migrate", "db:seed:all"])
    execFileSync(process.execPath, [cli, action], {
      cwd,
      env,
      stdio: "inherit",
    });
  const verify = new Sequelize({ ...base, database: name });
  try {
    const [rows] = await verify.query(
      "SELECT COUNT(*) AS total FROM Prospectos",
    );
    if (Number(rows[0].total) !== 40)
      throw Error("La demo no tiene exactamente 40 personas");
    console.log("DEMO_LIMPIA=" + name);
    console.log(
      "40 personas ficticias; la base de trabajo y su configuración no se modificaron.",
    );
  } finally {
    await verify.close();
  }
}
main().catch((e) => {
  console.error(e.original?.code || e.message);
  process.exitCode = 1;
});
