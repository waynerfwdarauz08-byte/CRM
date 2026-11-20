const fs = require("fs/promises");
const path = require("path");
const { execFileSync } = require("child_process");
const { parse } = require("dotenv");
async function main() {
  const root = path.resolve(__dirname, "..");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const stage = path.join(root, ".work", "entrega-" + stamp);
  const dest = path.join(root, "entrega", "Admisiones-CRM-" + stamp + ".zip");
  if (!stage.startsWith(root + path.sep) || !dest.startsWith(root + path.sep))
    throw Error("Ruta fuera del proyecto.");
  const sample = parse(
    await fs.readFile(path.join(root, "backend/.env.example")),
  );
  for (const name of [
    "DB_PASSWORD",
    "AI_API_KEY",
    "IMAGE_API_KEY",
    "META_PAGE_ACCESS_TOKEN",
  ])
    if (sample[name])
      throw Error("El archivo de ejemplo contiene una credencial: " + name);
  await fs.mkdir(stage, { recursive: true });
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const allowed = (src) => {
    const parts = path.relative(root, src).split(path.sep);
    if (
      parts.some((p) =>
        [
          "node_modules",
          "dist",
          "uploads",
          ".work",
          "entrega",
          ".git",
        ].includes(p),
      )
    )
      return false;
    const name = path.basename(src);
    return (
      !(name.startsWith(".env") && name !== ".env.example") &&
      !name.endsWith(".log")
    );
  };
  for (const name of [
    "backend",
    "frontend",
    "docs",
    "scripts",
    "package.json",
    "package-lock.json",
    ".gitignore",
    "README.md",
  ]) {
    await fs.cp(path.join(root, name), path.join(stage, name), {
      recursive: true,
      filter: allowed,
    });
  }
  if (process.platform !== "win32")
    throw Error(
      "Este empaquetador usa Compress-Archive de Windows. La carpeta preparada está en " +
        stage,
    );
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      'Compress-Archive -Path (Join-Path $env:CRM_ENTREGA_STAGE "*") -DestinationPath $env:CRM_ENTREGA_ZIP',
    ],
    {
      env: { ...process.env, CRM_ENTREGA_STAGE: stage, CRM_ENTREGA_ZIP: dest },
      stdio: "inherit",
    },
  );
  console.log("ENTREGA_ZIP=" + dest);
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
