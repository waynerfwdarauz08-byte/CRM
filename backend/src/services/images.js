const path = require("path");
const fs = require("fs/promises");
const { randomUUID } = require("crypto");
const sharp = require("sharp");
const { db, Imagen, Campania } = require("../models");
const { AppError } = require("../middlewares/errors");
const v = require("../middlewares/operations-validation");
const { required } = require("./operations");
const uploads = path.resolve(__dirname, "../../uploads");
function config() {
  const {
    IMAGE_API_KEY: key,
    IMAGE_BASE_URL: base,
    IMAGE_MODEL: model,
  } = process.env;
  if (!key || !base || !model)
    throw new AppError(
      503,
      "Configurá IMAGE_API_KEY, IMAGE_BASE_URL e IMAGE_MODEL para generar imágenes.",
      "IMAGEN_SIN_CONFIGURAR",
    );
  let url;
  try {
    url = new URL(base);
    if (url.protocol !== "https:") throw Error();
  } catch {
    throw new AppError(
      503,
      "El proveedor de imágenes requiere una URL HTTPS válida.",
    );
  }
  return { key, base: base.replace(/\/$/, ""), model };
}
async function provider(data, fetcher = fetch) {
  const c = config();
  let response;
  try {
    response = await fetcher(c.base + "/images/generations", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + c.key,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(120000),
      body: JSON.stringify({
        model: c.model,
        prompt:
          "Material para una demostración académica independiente. No incluyás logotipos oficiales, datos personales ni afirmaciones de becas, precios o admisión. " +
          data.prompt,
        n: 1,
        size: data.tamano,
        ...(process.env.IMAGE_RESPONSE_FORMAT
          ? { response_format: process.env.IMAGE_RESPONSE_FORMAT }
          : {}),
      }),
    });
  } catch (e) {
    throw new AppError(
      e.name === "TimeoutError" ? 504 : 502,
      "No se pudo completar la generación de imágenes. Intentá nuevamente.",
      "IMAGEN_PROVEEDOR",
    );
  }
  if (!response.ok)
    throw new AppError(
      response.status === 429 ? 429 : 502,
      response.status === 401 || response.status === 403
        ? "El proveedor rechazó la clave de imágenes."
        : "El proveedor de imágenes rechazó la solicitud.",
      "IMAGEN_PROVEEDOR",
    );
  let payload;
  try {
    if (Number(response.headers?.get("content-length") || 0) > 16000000)
      throw Error();
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 16000000) throw Error();
      chunks.push(chunk);
    }
    payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AppError(
      502,
      "La respuesta del proveedor de imágenes es inválida o demasiado grande.",
      "IMAGEN_RESPUESTA",
    );
  }
  const b64 = payload?.data?.[0]?.b64_json;
  if (
    typeof b64 !== "string" ||
    !b64 ||
    b64.length > 15000000 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)
  )
    throw new AppError(
      502,
      "El proveedor debe devolver una imagen base64 válida (b64_json).",
      "IMAGEN_RESPUESTA",
    );
  try {
    const image = sharp(Buffer.from(b64, "base64"), {
      limitInputPixels: 20000000,
    }).rotate();
    const info = await image.metadata();
    const ratio = info.width / info.height;
    if (ratio < 0.8)
      image.resize(1080, 1350, { fit: "contain", background: "#ffffff" });
    else if (ratio > 1.91)
      image.resize(1080, 566, { fit: "contain", background: "#ffffff" });
    else if (info.width < 320) image.resize({ width: 320 });
    else image.resize(1440, 1440, { fit: "inside", withoutEnlargement: true });
    return await image.jpeg({ quality: 90 }).toBuffer();
  } catch {
    throw new AppError(
      502,
      "La respuesta no contiene una imagen compatible.",
      "IMAGEN_RESPUESTA",
    );
  }
}
async function run(row, tamano, fetcher) {
  let filename;
  try {
    const bytes = await provider({ prompt: row.prompt, tamano }, fetcher);
    filename = randomUUID() + ".jpg";
    await fs.mkdir(uploads, { recursive: true });
    await fs.writeFile(path.join(uploads, filename), bytes, { flag: "wx" });
    await row.update({ estado: "lista", archivo: filename, error: null });
    return row;
  } catch (e) {
    if (filename) await fs.unlink(path.join(uploads, filename)).catch(() => {});
    await row.update({
      estado: "error",
      error:
        e instanceof AppError ? e.message : "No se pudo guardar la imagen.",
    });
    if (e instanceof AppError) throw e;
    throw new AppError(500, "No se pudo guardar la imagen generada.");
  }
}
async function generate(input, fetcher) {
  const data = v.image.parse(input);
  const c = config();
  if (data.campaniaId) await required(Campania, data.campaniaId);
  const row = await Imagen.create({
    prompt: data.prompt,
    campaniaId: data.campaniaId || null,
    modelo: c.model,
    tamano: data.tamano,
    estado: "generando",
  });
  return run(row, data.tamano, fetcher);
}
async function retry(id, fetcher) {
  config();
  const row = await db.transaction(async (transaction) => {
    const image = await required(Imagen, id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (image.estado !== "error")
      throw new AppError(409, "Solo se reintentan imágenes fallidas.");
    return image.update({ estado: "generando", error: null }, { transaction });
  });
  return run(row, row.tamano, fetcher);
}
function view(row) {
  const data = row.toJSON ? row.toJSON() : row;
  const { archivo, ...rest } = data;
  return { ...rest, url: archivo ? "/archivos/" + archivo : null };
}
function publicUrl(image) {
  const base = process.env.MEDIA_PUBLIC_BASE_URL;
  if (!base || !image.archivo)
    throw new AppError(
      503,
      "Configurá MEDIA_PUBLIC_BASE_URL con una dirección HTTPS pública para compartir imágenes con Meta.",
      "REDES_MEDIA",
    );
  let url;
  try {
    url = new URL(base);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      /^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[|0\.)/i.test(url.hostname)
    )
      throw Error();
  } catch {
    throw new AppError(
      503,
      "MEDIA_PUBLIC_BASE_URL debe ser una URL HTTPS pública.",
    );
  }
  return base.replace(/\/$/, "") + "/" + image.archivo;
}
module.exports = {
  uploads,
  config,
  provider,
  generate,
  retry,
  view,
  publicUrl,
};
