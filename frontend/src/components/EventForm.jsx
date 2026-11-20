import { useState } from "react";
import { api } from "../services/api";
import {
  AsyncForm,
  ProspectPicker,
  toInstant,
  localInput,
} from "./OperationsUI";
export default function EventForm({
  sedes,
  interview = false,
  initial,
  onSaved,
}) {
  const event = initial?.evento || initial;
  const [form, f] = useState({
    titulo: event?.titulo || (interview ? "Entrevista de admisión" : ""),
    sedeId: event?.sedeId || "",
    prospectoId: initial?.prospectoId || event?.prospectoId || "",
    tipo: event?.tipo || "campus_day",
    inicio: localInput(event?.inicio),
    fin: localInput(event?.fin),
    responsable: event?.responsable || "",
    lugar: event?.lugar || "",
    notas: initial?.notas || event?.notas || "",
  });
  const field = (e) => f({ ...form, [e.target.name]: e.target.value });
  async function submit() {
    const body = {
      ...form,
      sedeId: Number(form.sedeId),
      prospectoId: form.prospectoId ? Number(form.prospectoId) : null,
      inicio: toInstant(form.inicio),
      fin: toInstant(form.fin),
    };
    if (interview) delete body.tipo;
    const base = interview ? "/entrevistas" : "/calendario";
    return api(base + (initial ? "/" + initial.id : ""), {
      method: initial ? "PUT" : "POST",
      body,
    });
  }
  return (
    <AsyncForm
      submit={submit}
      onSuccess={onSaved}
      label={
        initial
          ? "Guardar reprogramación"
          : interview
            ? "Programar entrevista"
            : "Crear actividad"
      }
    >
      <label>
        Título
        <input
          required
          name="titulo"
          maxLength="160"
          value={form.titulo}
          onChange={field}
        />
      </label>
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
      {!interview && (
        <label>
          Tipo
          <select name="tipo" value={form.tipo} onChange={field}>
            <option value="campus_day">Campus Day</option>
            <option value="seguimiento">Seguimiento</option>
            <option value="otro">Otra actividad</option>
          </select>
        </label>
      )}
      <ProspectPicker
        required={interview}
        value={form.prospectoId}
        disabled={interview && Boolean(initial)}
        onChange={(v) => f({ ...form, prospectoId: v })}
      />
      <div className="form-row">
        <label>
          Inicio (Costa Rica)
          <input
            required
            name="inicio"
            type="datetime-local"
            value={form.inicio}
            onChange={field}
          />
        </label>
        <label>
          Fin (Costa Rica)
          <input
            required
            name="fin"
            type="datetime-local"
            value={form.fin}
            onChange={field}
          />
        </label>
      </div>
      <label>
        Responsable / entrevistador
        <input
          required
          name="responsable"
          maxLength="120"
          value={form.responsable}
          onChange={field}
        />
      </label>
      <label>
        Lugar o enlace verificado
        <input
          required
          name="lugar"
          maxLength="200"
          value={form.lugar}
          onChange={field}
        />
      </label>
      <label>
        Notas
        <textarea
          name="notas"
          maxLength="3000"
          value={form.notas}
          onChange={field}
        />
      </label>
      <p className="hint">
        Se bloquean las superposiciones del mismo responsable en la misma sede.
        La entrevista no avanza automáticamente la etapa.
      </p>
    </AsyncForm>
  );
}
