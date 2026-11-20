import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Sparkles } from "lucide-react";
import { Resource, useResource } from "../components/Resource";
import { api, query, date } from "../services/api";
import Modal from "../components/Modal";
export default function Attention({ sedes }) {
  const [filters, f] = useState({ dias: 3, sedeId: "" });
  const r = useResource("/atencion" + query(filters));
  const [message, m] = useState(null);
  const [busy, b] = useState(null);
  const [error, e] = useState("");
  async function generate(p) {
    b(p.id);
    e("");
    try {
      m(
        (
          await api("/prospectos/" + p.id + "/mensaje", {
            method: "POST",
            body: {},
          })
        ).data,
      );
    } catch (x) {
      e(x.message);
    } finally {
      b(null);
    }
  }
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">EL MOMENTO DE ACOMPAÑAR</div>
          <h1>Atención y seguimiento</h1>
          <p>
            Retomá la conversación con quienes llevan más tiempo sin avanzar.
          </p>
        </div>
        <Clock size={36} color="#7c3aed" />
      </div>
      <section className="panel">
        <div className="filters">
          <label>
            Días sin avance
            <input
              type="number"
              min="1"
              max="3650"
              value={filters.dias}
              onChange={(e) => f({ ...filters, dias: e.target.value })}
            />
          </label>
          <label>
            Sede
            <select
              value={filters.sedeId}
              onChange={(e) => f({ ...filters, sedeId: e.target.value })}
            >
              <option value="">Todas las sedes</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="hint">
          No haber avanzado todavía no significa abandono confirmado. Se
          excluyen estudiantes.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <Resource resource={r}>
          {!r.data?.length && (
            <div className="state">
              No hay seguimientos pendientes para estos filtros.
            </div>
          )}
          <div className="attention-list">
            {r.data?.map((p) => (
              <article key={p.id}>
                <div className="avatar">
                  <Clock size={19} />
                </div>
                <div className="grow">
                  <Link to={"/prospectos/" + p.id}>
                    <strong>{p.nombre}</strong>
                  </Link>
                  <p>
                    {p.etapa.nombre} · {p.sede.nombre}
                  </p>
                  <small>Último avance: {date(p.fechaUltimoAvance)}</small>
                </div>
                <span className="badge amber">{p.diasTranscurridos} días</span>
                <button
                  className="secondary"
                  disabled={busy !== null}
                  onClick={() => generate(p)}
                >
                  <Sparkles size={16} />
                  {busy === p.id ? "Generando…" : "Generar mensaje"}
                </button>
              </article>
            ))}
          </div>
        </Resource>
      </section>
      {message && (
        <Modal title="Borrador de seguimiento" onClose={() => m(null)}>
          <span className="badge purple">{message.etapa.nombre}</span>
          <p className="pre">{message.contenido}</p>
          <p className="hint">
            Guardado en la ficha del prospecto. Revisalo antes de compartirlo.
          </p>
          <button onClick={() => m(null)}>Listo</button>
        </Modal>
      )}
    </>
  );
}
