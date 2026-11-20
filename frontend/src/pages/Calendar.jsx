import { localDateKey } from "../services/api";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Resource, useResource, Notice } from "../components/Resource";
import { Heading, AsyncForm, PersonLink } from "../components/OperationsUI";
import EventForm from "../components/EventForm";
import Modal from "../components/Modal";
import { api, query, date, assetUrl } from "../services/api";
const monthNow = () => localDateKey().slice(0, 7);
export default function Calendar({ sedes }) {
  const [month, m] = useState(monthNow),
    [sede, s] = useState(""),
    [version, v] = useState(0),
    [editing, e] = useState(null),
    [closing, c] = useState(null),
    [notice, n] = useState("");
  const first = month + "-01";
  const [year, number] = month.split("-").map(Number);
  const last = month + "-" + new Date(Date.UTC(year, number, 0)).getUTCDate();
  const filters = { sedeId: sede, fechaDesde: first, fechaHasta: last };
  const r = useResource("/calendario" + query(filters), version);
  const changed = () => {
    v((x) => x + 1);
    e(null);
    c(null);
    n("Calendario actualizado.");
  };
  const countDays = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const startDay =
    (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7;
  const dayOf = localDateKey;
  return (
    <>
      <Heading
        title="Calendario"
        description="Campus Days, seguimientos y entrevistas. Todas las horas se muestran en Costa Rica."
      >
        <div className="inline-actions">
          <a
            className="button secondary"
            href={assetUrl("/calendario.ics" + query(filters))}
          >
            Exportar calendario .ics
          </a>
          <button onClick={() => e({})}>Nueva actividad</button>
        </div>
      </Heading>
      <Notice>{notice}</Notice>
      <section className="panel">
        <div className="filters">
          <label>
            Mes
            <input
              required
              type="month"
              value={month}
              onChange={(ev) => {
                if (ev.target.value) m(ev.target.value);
              }}
            />
          </label>
          <label>
            Sede
            <select value={sede} onChange={(e) => s(e.target.value)}>
              <option value="">Todas</option>
              {sedes.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Resource resource={r}>
          <div
            className="calendar-grid"
            role="region"
            aria-label="Actividades del mes"
          >
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <strong className="calendar-weekday" key={d}>
                {d}
              </strong>
            ))}
            {Array.from({ length: startDay }, (_, i) => (
              <div className="calendar-empty" key={"empty" + i} />
            ))}
            {Array.from({ length: countDays }, (_, i) => {
              const key = month + "-" + String(i + 1).padStart(2, "0");
              return (
                <div className="calendar-day" key={key}>
                  <strong>{i + 1}</strong>
                  {r.data
                    ?.filter(
                      (x) =>
                        dayOf(x.inicio) <= key &&
                        dayOf(new Date(+new Date(x.fin) - 1)) >= key,
                    )
                    .map((x) => (
                      <button
                        className={
                          "calendar-event " +
                          (x.estado === "cancelado" ? "cancelled" : "")
                        }
                        key={x.id}
                        onClick={() =>
                          x.tipo === "entrevista"
                            ? c({ ...x, interview: true })
                            : c(x)
                        }
                      >
                        {x.titulo}
                      </button>
                    ))}
                </div>
              );
            })}
          </div>
          <h2 className="space-top">Agenda del mes</h2>
          {!r.data?.length && (
            <div className="empty">No hay actividades en este período.</div>
          )}
          {r.data?.map((x) => (
            <article className="agenda-row" key={x.id}>
              <div className="grow">
                <strong>{x.titulo}</strong>
                <p>
                  {date(x.inicio)} a {date(x.fin)} · {x.sede.nombre}
                </p>
                <small>
                  {x.responsable} · {x.lugar} ·{" "}
                  <PersonLink person={x.prospecto} />
                </small>
              </div>
              <span className="badge">{x.estado}</span>
              {x.tipo === "entrevista" ? (
                <Link className="button secondary" to="/entrevistas">
                  Ver entrevistas
                </Link>
              ) : (
                x.estado === "programado" && (
                  <div className="inline-actions">
                    <button className="secondary" onClick={() => e(x)}>
                      Reprogramar
                    </button>
                    <button className="secondary" onClick={() => c(x)}>
                      Cerrar actividad
                    </button>
                  </div>
                )
              )}
            </article>
          ))}
        </Resource>
      </section>
      {editing && (
        <Modal
          title={editing.id ? "Reprogramar actividad" : "Nueva actividad"}
          onClose={() => e(null)}
        >
          <EventForm
            sedes={sedes}
            initial={editing.id ? editing : null}
            onSaved={changed}
          />
        </Modal>
      )}
      {closing && (
        <Modal title={closing.titulo} onClose={() => c(null)}>
          <p>
            {date(closing.inicio)} · {closing.lugar} · {closing.responsable}
          </p>
          {closing.interview || closing.tipo === "entrevista" ? (
            <Link className="button" to="/entrevistas">
              Gestionar en entrevistas
            </Link>
          ) : closing.estado === "programado" ? (
            <>
              <AsyncForm
                label="Marcar completada"
                submit={() =>
                  api("/calendario/" + closing.id + "/estado", {
                    method: "PATCH",
                    body: { estado: "completado" },
                  })
                }
                onSuccess={changed}
              >
                <p>Registrá que la actividad se completó.</p>
              </AsyncForm>
              <div className="space-top">
                <AsyncForm
                  label="Confirmar cancelación"
                  submit={() =>
                    api("/calendario/" + closing.id + "/estado", {
                      method: "PATCH",
                      body: { estado: "cancelado" },
                    })
                  }
                  onSuccess={changed}
                >
                  <p>La cancelación se conserva en el calendario.</p>
                </AsyncForm>
              </div>
            </>
          ) : (
            <p>Actividad {closing.estado}.</p>
          )}
        </Modal>
      )}
    </>
  );
}
