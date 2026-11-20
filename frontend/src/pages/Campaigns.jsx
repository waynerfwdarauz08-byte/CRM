import { AsyncForm } from "../components/OperationsUI";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Resource, useResource, Notice } from "../components/Resource";
import { api, date, query } from "../services/api";
export default function Campaigns({ sedes }) {
  const [version, v] = useState(0);
  const [page, p] = useState(1);
  const r = useResource("/campanias" + query({ page }), version);
  const [form, f] = useState({ objetivo: "", sedeId: "" });
  const [busy, b] = useState(false);
  const [error, e] = useState("");
  const [notice, n] = useState("");
  async function save(event) {
    event.preventDefault();
    b(true);
    e("");
    n("");
    try {
      await api("/campanias", {
        method: "POST",
        body: { objetivo: form.objetivo, sedeId: Number(form.sedeId) },
      });
      v((x) => x + 1);
      p(1);
      n("Campaña guardada con tres textos pendientes de aprobación.");
      f({ objetivo: "", sedeId: "" });
    } catch (x) {
      e(x.message);
    } finally {
      b(false);
    }
  }
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">IDEAS QUE ABREN CONVERSACIONES</div>
          <h1>Campañas</h1>
          <p>
            Tres propuestas de texto para redes, siempre con revisión humana.
          </p>
        </div>
      </div>
      <Notice>{notice}</Notice>
      <div className="detail-grid">
        <section className="panel">
          <h2>Crear una campaña</h2>
          <form className="form" onSubmit={save}>
            <label>
              Objetivo
              <textarea
                required
                minLength="10"
                maxLength="1000"
                rows="5"
                value={form.objetivo}
                onChange={(e) => f({ ...form, objetivo: e.target.value })}
                placeholder="Invitar a personas interesadas a solicitar orientación sobre el proceso de admisión."
              />
            </label>
            <label>
              Sede
              <select
                required
                value={form.sedeId}
                onChange={(e) => f({ ...form, sedeId: e.target.value })}
              >
                <option value="">Seleccionar sede</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </label>
            <button disabled={busy}>
              <Sparkles size={17} />
              {busy ? "Generando tres textos…" : "Generar campaña"}
            </button>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <p className="hint">
              La IA propone. El estado inicial es pendiente de aprobación. Las
              publicaciones se revisan y confirman desde Publicaciones.
            </p>
          </form>
        </section>
        <section className="panel">
          <h2>Campañas guardadas</h2>
          <Resource resource={r}>
            {!r.data?.length && (
              <p className="empty">Todavía no hay campañas.</p>
            )}
            {r.data?.map((c) => (
              <article className="message" key={c.id}>
                <span className="badge purple">
                  {c.estado === "aprobada"
                    ? "Aprobada"
                    : "Pendiente de aprobación"}
                </span>
                <h3>{c.objetivo}</h3>
                <small>
                  {c.sede.nombre} · {date(c.createdAt)}
                </small>
                {c.estado !== "aprobada" && (
                  <AsyncForm
                    label="Aprobar campaña"
                    submit={() =>
                      api("/campanias/" + c.id + "/aprobar", {
                        method: "POST",
                        body: {},
                      })
                    }
                    onSuccess={() => {
                      v((x) => x + 1);
                      n(
                        "Campaña aprobada. Prepará y revisá cada publicación en Publicaciones.",
                      );
                    }}
                  />
                )}
                {c.textos.map((text, i) => (
                  <div key={i}>
                    <h3>Propuesta {i + 1}</h3>
                    <p className="pre">{text}</p>
                  </div>
                ))}
              </article>
            ))}
            <div className="pagination">
              <span>{r.meta?.total || 0} campañas</span>
              <div>
                <button
                  className="secondary"
                  disabled={page === 1}
                  onClick={() => p(page - 1)}
                >
                  Anterior
                </button>{" "}
                <button
                  className="secondary"
                  disabled={page >= (r.meta?.pages || 1)}
                  onClick={() => p(page + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </Resource>
        </section>
      </div>
    </>
  );
}
