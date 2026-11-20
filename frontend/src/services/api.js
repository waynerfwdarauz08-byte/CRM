const base = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001"
).replace(/\/$/, "");
export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(base + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new Error(
      "No se pudo conectar con la API. Verificá que el backend esté iniciado.",
    );
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("El servidor devolvió una respuesta inválida.");
  }
  if (!response.ok)
    throw new Error(
      payload.error?.message || "No se pudo completar la operación.",
    );
  return payload;
}
export const query = (f) => {
  const p = new URLSearchParams(
    Object.entries(f).filter(([, v]) => v !== "" && v !== undefined),
  );
  return p.size ? "?" + p : "";
};
export const date = (s) =>
  new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Costa_Rica",
  }).format(new Date(s));
export const days = (s) =>
  Math.max(0, Math.floor((Date.now() - +new Date(s)) / 86400000));
export const percent = (v) =>
  v === null || v === undefined
    ? "Sin datos"
    : new Intl.NumberFormat("es-CR", { maximumFractionDigits: 2 }).format(v) +
      " %";

export const assetUrl = (path) => base + path;

export function localDateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const get = (type) => parts.find((p) => p.type === type).value;
  return get("year") + "-" + get("month") + "-" + get("day");
}
