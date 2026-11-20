import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, query } from "../services/api";
import { Resource, useResource } from "./Resource";
export function Heading({ title, description, children }) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">ADMISIONES Y MERCADEO</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function Pager({ meta, page, onChange }) {
  return (
    <div className="pagination">
      <span>
        {meta?.total || 0} registros · Página {page} de {meta?.pages || 1}
      </span>
      <div>
        <button
          type="button"
          className="secondary"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
        >
          Anterior
        </button>{" "}
        <button
          type="button"
          className="secondary"
          disabled={page >= (meta?.pages || 1)}
          onClick={() => onChange(page + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
export function AsyncForm({
  submit,
  label = "Guardar",
  children,
  onSuccess,
  disabled = false,
}) {
  const [busy, b] = useState(false),
    [error, e] = useState("");
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    b(true);
    e("");
    try {
      const data = await submit();
      onSuccess?.(data);
    } catch (x) {
      e(x.message);
    } finally {
      b(false);
    }
  }
  return (
    <form className="form" onSubmit={save}>
      <fieldset className="form-fieldset" disabled={busy || disabled}>
        {children}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit">{busy ? "Procesando…" : label}</button>
      </fieldset>
    </form>
  );
}
export function useAllPages(path, version = 0) {
  const [state, set] = useState({ loading: true, data: [], error: "" });
  const [attempt, a] = useState(0);
  useEffect(() => {
    let active = true;
    set({ loading: true, data: [], error: "" });
    (async () => {
      let data = [],
        page = 1,
        pages = 1;
      do {
        const r = await api(
          path + (path.includes("?") ? "&" : "?") + "limit=100&page=" + page,
        );
        data.push(...r.data);
        pages = r.meta?.pages || 1;
        page++;
      } while (page <= pages && active);
      if (active) set({ loading: false, data, error: "" });
    })().catch((e) => {
      if (active) set({ loading: false, data: [], error: e.message });
    });
    return () => {
      active = false;
    };
  }, [path, version, attempt]);
  return { ...state, retry: () => a((x) => x + 1) };
}
export function ProspectPicker({
  value,
  onChange,
  required = true,
  disabled = false,
}) {
  const [q, s] = useState("");
  const r = useResource("/prospectos" + query({ q, limit: 20 }));
  return (
    <div className="picker">
      <label>
        Buscar persona
        <input
          type="search"
          value={q}
          onChange={(e) => s(e.target.value)}
          placeholder="Nombre o correo ficticio"
          disabled={disabled}
        />
      </label>
      <label>
        Prospecto
        <select
          value={value || ""}
          required={required}
          disabled={disabled || r.loading}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Seleccionar persona</option>
          {value && !r.data?.some((p) => String(p.id) === String(value)) && (
            <option value={value}>Prospecto #{value}</option>
          )}
          {r.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} · {p.sede.nombre} · {p.estadoProceso}
            </option>
          ))}
        </select>
      </label>
      {r.error && (
        <p role="alert" className="error">
          {r.error}{" "}
          <button type="button" onClick={r.retry}>
            Reintentar
          </button>
        </p>
      )}
      <p className="hint">
        Se muestran hasta 20 coincidencias. Escribí el nombre para encontrar
        cualquier registro.
      </p>
    </div>
  );
}
export const toInstant = (value) =>
  new Date(value + (value.length === 16 ? ":00" : "") + "-06:00").toISOString();
export function localInput(value) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return (
    get("year") +
    "-" +
    get("month") +
    "-" +
    get("day") +
    "T" +
    get("hour") +
    ":" +
    get("minute")
  );
}
export const money = (amount, currency = "CRC") =>
  amount === null || amount === undefined
    ? "Sin datos"
    : new Intl.NumberFormat("es-CR", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(Number(amount));
export function PersonLink({ person }) {
  return person ? (
    <Link to={"/prospectos/" + person.id}>{person.nombre}</Link>
  ) : (
    <span>Actividad general</span>
  );
}
