import ProspectWorkflow from "../components/ProspectWorkflow";
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Sparkles, Copy, Pencil } from "lucide-react";
import { Resource, useResource, Notice } from "../components/Resource";
import Advance from "../components/Advance";
import Modal from "../components/Modal";
import ProspectForm from "../components/ProspectForm";
import { api, date, days } from "../services/api";
export default function Detail({ sedes, stages }) {
  const { id } = useParams();
  const [version, v] = useState(0);
  const r = useResource("/prospectos/" + id, version);
  const h = useResource("/prospectos/" + id + "/historial", version);
  const messages = useResource("/prospectos/" + id + "/mensajes", version);
  const [edit, e] = useState(false);
  const [busy, b] = useState(false);
  const [note, n] = useState("");
  const [error, err] = useState("");
  const refresh = () => {
    v((x) => x + 1);
    n("Cambio guardado correctamente.");
  };
  async function generate() {
    b(true);
    err("");
    try {
      await api("/prospectos/" + id + "/mensaje", { method: "POST", body: {} });
      v((x) => x + 1);
      n("Borrador generado. Revisalo antes de usarlo.");
    } catch (e) {
      err(e.message);
    } finally {
      b(false);
    }
  }
  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      n("Mensaje copiado.");
    } catch {
      err("No se pudo copiar. Seleccioná el texto y copialo manualmente.");
    }
  }
  return (
    <>
      <Link className="back" to="/prospectos">
        Volver a prospectos
      </Link>
      <Notice>{note}</Notice>
      <Resource resource={r}>
        {r.data && (
          <>
            <div className="page-head">
              <div>
                <div className="eyebrow">FICHA DEL PROSPECTO</div>
                <h1>{r.data.nombre}</h1>
                <p>
                  {r.data.sede.nombre} ·{" "}
                  <span className="badge">{r.data.etapa.nombre}</span>
                </p>
              </div>
              <button className="secondary" onClick={() => e(true)}>
                <Pencil size={16} /> Editar datos
              </button>
            </div>
            <div className="detail-grid">
              <div>
                <section className="panel">
                  <h2>Información general</h2>
                  <dl>
                    <dt>Correo</dt>
                    <dd>{r.data.correo || "Sin registrar"}</dd>
                    <dt>Teléfono</dt>
                    <dd>{r.data.telefono || "Sin registrar"}</dd>
                    <dt>Canal de origen</dt>
                    <dd>{r.data.canalOrigen}</dd>
                    <dt>Ingreso</dt>
                    <dd>{date(r.data.fechaIngreso)}</dd>
                    <dt>Último avance</dt>
                    <dd>
                      {date(r.data.fechaUltimoAvance)} ·{" "}
                      {days(r.data.fechaUltimoAvance)} días
                    </dd>
                  </dl>
                  <h3>Observaciones</h3>
                  <p className="pre">
                    {r.data.observaciones || "Sin observaciones."}
                  </p>
                  <Advance person={r.data} stages={stages} onSaved={refresh} />
                </section>
                <ProspectWorkflow
                  key={r.data.id}
                  person={r.data}
                  onChange={refresh}
                />
                <section className="panel">
                  <h2>Un recorrido con historia</h2>
                  <Resource resource={h}>
                    <ol className="timeline">
                      {h.data?.map((x) => (
                        <li key={x.id}>
                          <strong>{x.destino.nombre}</strong>
                          <small>{date(x.fechaCambio)}</small>
                          <p>{x.comentario || "Sin comentario."}</p>
                        </li>
                      ))}
                    </ol>
                  </Resource>
                </section>
              </div>
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <span className="eyebrow">ASISTENTE DE ADMISIÓN</span>
                    <h2>Un mensaje para continuar</h2>
                  </div>
                  <Sparkles color="#7c3aed" />
                </div>
                <p>
                  Generá un borrador según la sede y etapa actual. Revisá su
                  contenido antes de compartirlo.
                </p>
                <button
                  disabled={busy || r.data.estadoProceso === "excluido"}
                  onClick={generate}
                >
                  <Sparkles size={16} />
                  {busy ? "Generando con IA…" : "Generar mensaje con IA"}
                </button>
                {error && (
                  <p role="alert" className="error">
                    {error}
                  </p>
                )}
                <p className="hint">
                  Los mensajes se guardan como borrador. Las personas excluidas
                  deben reactivarse para generar mensajes de avance. No se
                  envían automáticamente.
                </p>
                <Resource resource={messages}>
                  {!messages.data?.length && (
                    <div className="empty">
                      Todavía no hay mensajes generados.
                    </div>
                  )}
                  {messages.data?.map((m) => (
                    <article className="message" key={m.id}>
                      <div>
                        <span className="badge purple">
                          Borrador · {m.etapa.nombre}
                        </span>
                        <small>{date(m.fechaGeneracion)}</small>
                      </div>
                      <p className="pre">{m.contenido}</p>
                      <button
                        className="secondary"
                        onClick={() => copy(m.contenido)}
                      >
                        <Copy size={15} /> Copiar mensaje
                      </button>
                    </article>
                  ))}
                </Resource>
              </section>
            </div>
            {edit && (
              <Modal title="Editar datos" onClose={() => e(false)}>
                <ProspectForm
                  sedes={sedes}
                  initial={r.data}
                  onCancel={() => e(false)}
                  onSaved={() => {
                    e(false);
                    refresh();
                  }}
                />
              </Modal>
            )}
          </>
        )}
      </Resource>
    </>
  );
}
