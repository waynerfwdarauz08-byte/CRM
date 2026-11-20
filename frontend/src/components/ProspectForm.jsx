import { useState } from "react";
import { channels } from "./constants";
import { api } from "../services/api";
export default function ProspectForm({
  initial = {},
  sedes,
  onSaved,
  onCancel,
}) {
  const [form, set] = useState({
    nombre: initial.nombre || "",
    correo: initial.correo || "",
    telefono: initial.telefono || "",
    sedeId: initial.sedeId || "",
    canalOrigen: initial.canalOrigen || "Instagram",
    observaciones: initial.observaciones || "",
  });
  const [busy, b] = useState(false);
  const [error, err] = useState("");
  const field = (e) => set({ ...form, [e.target.name]: e.target.value });
  async function save(e) {
    e.preventDefault();
    b(true);
    err("");
    try {
      const result = await api(
        "/prospectos" + (initial.id ? "/" + initial.id : ""),
        {
          method: initial.id ? "PATCH" : "POST",
          body: { ...form, sedeId: Number(form.sedeId) },
        },
      );
      onSaved(result.data);
    } catch (e) {
      err(e.message);
    } finally {
      b(false);
    }
  }
  return (
    <form onSubmit={save} className="form">
      <label>
        Nombre completo
        <input
          autoFocus
          required
          name="nombre"
          minLength="2"
          maxLength="120"
          value={form.nombre}
          onChange={field}
        />
      </label>
      <div className="form-row">
        <label>
          Correo electrónico
          <input
            type="email"
            name="correo"
            maxLength="254"
            value={form.correo}
            onChange={field}
          />
        </label>
        <label>
          Teléfono
          <input
            name="telefono"
            maxLength="30"
            value={form.telefono}
            onChange={field}
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Sede
          <select required name="sedeId" value={form.sedeId} onChange={field}>
            <option value="">Seleccionar sede</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Canal de origen
          <select name="canalOrigen" value={form.canalOrigen} onChange={field}>
            {channels.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Observaciones
        <textarea
          name="observaciones"
          rows="4"
          maxLength="3000"
          value={form.observaciones}
          onChange={field}
        />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="actions">
        <button type="button" className="secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button disabled={busy}>
          {busy ? "Guardando…" : "Guardar prospecto"}
        </button>
      </div>
    </form>
  );
}
