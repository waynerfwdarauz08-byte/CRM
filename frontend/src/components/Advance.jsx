import { useState } from "react";
import Modal from "./Modal";
import { api } from "../services/api";
export default function Advance({ person, stages, onSaved }) {
  const next = stages.find((s) => s.orden === person.etapa.orden + 1);
  const [open, o] = useState(false);
  const [comment, c] = useState("");
  const [busy, b] = useState(false);
  const [error, e] = useState("");
  if (person.estadoProceso && person.estadoProceso !== "activo")
    return (
      <span className="badge amber">
        Proceso en pausa: {person.estadoProceso}
      </span>
    );
  if (!next) return <span className="badge green">Proceso completado</span>;
  async function save() {
    b(true);
    e("");
    try {
      await api("/prospectos/" + person.id + "/etapa", {
        method: "PATCH",
        body: { etapaId: next.id, comentario: comment },
      });
      o(false);
      onSaved();
    } catch (x) {
      e(x.message);
    } finally {
      b(false);
    }
  }
  return (
    <>
      <button className="secondary" onClick={() => o(true)}>
        Avanzar a {next.nombre}
      </button>
      {open && (
        <Modal title="Confirmar avance" onClose={() => o(false)}>
          <p>
            {person.nombre}: <strong>{person.etapa.nombre}</strong> a{" "}
            <strong>{next.nombre}</strong>.
          </p>
          <p>El cambio quedará registrado en el historial.</p>
          <label>
            Comentario opcional
            <textarea
              maxLength="1000"
              value={comment}
              onChange={(e) => c(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="actions">
            <button className="secondary" onClick={() => o(false)}>
              Cancelar
            </button>
            <button disabled={busy} onClick={save}>
              {busy ? "Guardando…" : "Confirmar avance"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
