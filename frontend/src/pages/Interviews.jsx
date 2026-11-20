import { useState } from "react";
import { Resource, useResource, Notice } from "../components/Resource";
import {
  Heading,
  Pager,
  AsyncForm,
  PersonLink,
  ProspectPicker,
} from "../components/OperationsUI";
import EventForm from "../components/EventForm";
import Modal from "../components/Modal";
import { api, query, date } from "../services/api";
export default function Interviews({ sedes }) {
  const [filters, f] = useState({}),
    [page, p] = useState(1),
    [version, v] = useState(0),
    [editing, e] = useState(null),
    [result, r] = useState(null),
    [status, s] = useState("realizada"),
    [outcome, o] = useState("pendiente"),
    [notes, n] = useState(""),
    [notice, noticeSet] = useState("");
  const resource = useResource(
    "/entrevistas" + query({ ...filters, page }),
    version,
  );
  const changed = () => {
    v((x) => x + 1);
    e(null);
    r(null);
    noticeSet("Entrevista guardada; el calendario está actualizado.");
  };
  return (
    <>
      <Heading
        title="Entrevistas"
        description="Programá citas, registrá asistencia y conservá resultados independientes del embudo."
      >
        <button onClick={() => e({})}>Programar entrevista</button>
      </Heading>
      <Notice>{notice}</Notice>
      <section className="panel">
        <div className="filters">
          <label>
            Resultado
            <select
              value={filters.resultado || ""}
              onChange={(ev) => {
                f({ ...filters, resultado: ev.target.value });
                p(1);
              }}
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="favorable">Favorable</option>
              <option value="desfavorable">Desfavorable</option>
            </select>
          </label>
          <label>
            Estado
            <select
              value={filters.estado || ""}
              onChange={(ev) => {
                f({ ...filters, estado: ev.target.value });
                p(1);
              }}
            >
              <option value="">Todos</option>
              {["programada", "realizada", "cancelada", "no_asistio"].map(
                (x) => (
                  <option key={x}>{x}</option>
                ),
              )}
            </select>
          </label>
          <label>
            Sede
            <select
              value={filters.sedeId || ""}
              onChange={(ev) => {
                f({ ...filters, sedeId: ev.target.value });
                p(1);
              }}
            >
              <option value="">Todas</option>
              {sedes.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ProspectPicker
          required={false}
          value={filters.prospectoId || ""}
          onChange={(id) => {
            f({ ...filters, prospectoId: id });
            p(1);
          }}
        />
        <Resource resource={resource}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Fecha y sede</th>
                  <th>Entrevistador</th>
                  <th>Estado / resultado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {resource.data?.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <PersonLink person={x.prospecto} />
                    </td>
                    <td>
                      {date(x.evento.inicio)}
                      <small className="block">
                        {x.evento.sede.nombre} · {x.evento.lugar}
                      </small>
                    </td>
                    <td>{x.evento.responsable}</td>
                    <td>
                      <span className="badge">{x.estado}</span>
                      <small className="block">{x.resultado}</small>
                    </td>
                    <td>
                      {x.estado === "programada" ? (
                        <div className="inline-actions">
                          <button className="secondary" onClick={() => e(x)}>
                            Reprogramar
                          </button>
                          <button
                            onClick={() => {
                              r(x);
                              s("realizada");
                              o("pendiente");
                              n(x.notas || "");
                            }}
                          >
                            Registrar resultado
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="pre">{x.notas || "Sin notas."}</p>
                          {x.estado === "realizada" &&
                            x.resultado === "pendiente" && (
                              <button
                                className="secondary"
                                onClick={() => {
                                  r(x);
                                  s("realizada");
                                  o("favorable");
                                  n(x.notas || "");
                                }}
                              >
                                Revisar resultado
                              </button>
                            )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!resource.data?.length && (
              <div className="empty">Todavía no hay entrevistas.</div>
            )}
          </div>
          <Pager page={page} meta={resource.meta} onChange={p} />
        </Resource>
      </section>
      {editing && (
        <Modal
          title={editing.id ? "Reprogramar entrevista" : "Nueva entrevista"}
          onClose={() => e(null)}
        >
          <EventForm
            sedes={sedes}
            interview
            initial={editing.id ? editing : null}
            onSaved={changed}
          />
        </Modal>
      )}
      {result && (
        <Modal title="Registrar resultado" onClose={() => r(null)}>
          <AsyncForm
            label="Guardar resultado"
            submit={() =>
              api(
                "/entrevistas/" +
                  result.id +
                  (result.estado === "realizada" ? "/revision" : "/resultado"),
                {
                  method: "PATCH",
                  body: {
                    ...(result.estado === "realizada"
                      ? {}
                      : { estado: status }),
                    resultado: status === "realizada" ? outcome : "pendiente",
                    notas: notes,
                  },
                },
              )
            }
            onSuccess={changed}
          >
            <label>
              Asistencia
              <select
                disabled={result.estado === "realizada"}
                value={status}
                onChange={(e) => s(e.target.value)}
              >
                <option value="realizada">Realizada</option>
                <option value="no_asistio">No asistió</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </label>
            {status === "realizada" && (
              <label>
                Resultado
                <select value={outcome} onChange={(e) => o(e.target.value)}>
                  <option value="pendiente">Pendiente de revisión</option>
                  <option value="favorable">Favorable</option>
                  <option value="desfavorable">Desfavorable</option>
                </select>
              </label>
            )}
            <label>
              Notas
              <textarea
                maxLength="4000"
                value={notes}
                onChange={(e) => n(e.target.value)}
              />
            </label>
            <p className="hint">
              El resultado no admite ni excluye automáticamente a la persona.
            </p>
          </AsyncForm>
        </Modal>
      )}
    </>
  );
}
