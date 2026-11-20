import { useState } from "react";
import { api, date } from "../services/api";
import { useResource, Resource, Notice } from "./Resource";
import { AsyncForm, useAllPages } from "./OperationsUI";
export default function ProspectWorkflow({ person, onChange }) {
  const [version, v] = useState(0);
  const [state, s] = useState(""),
    [motivo, m] = useState(""),
    [campaign, c] = useState(String(person.campaniaOrigenId || ""));
  const history = useResource("/prospectos/" + person.id + "/estados", version);
  const campaigns = useAllPages("/campanias");
  const [note, n] = useState("");
  const changed = () => {
    v((x) => x + 1);
    onChange();
    n("Estado actualizado. El historial de etapas se conserva.");
    m("");
    s("");
  };
  return (
    <section className="panel">
      <h2>Estado del proceso</h2>
      <span
        className={
          "badge " + (person.estadoProceso === "activo" ? "green" : "amber")
        }
      >
        {person.estadoProceso}
      </span>
      <p>
        La espera y la exclusión no agregan etapas ni borran el recorrido. Las
        citas existentes se conservan; revisá el calendario si necesitás
        cancelarlas.
      </p>
      <Notice>{note}</Notice>
      {person.etapaActualId !== 9 && (
        <AsyncForm
          label="Cambiar estado"
          submit={() =>
            api("/prospectos/" + person.id + "/estado", {
              method: "PATCH",
              body: { estado: state, motivo },
            })
          }
          onSuccess={changed}
        >
          <label>
            Nuevo estado
            <select required value={state} onChange={(e) => s(e.target.value)}>
              <option value="">Seleccionar estado</option>
              {["activo", "espera", "excluido"]
                .filter((x) => x !== person.estadoProceso)
                .map((x) => (
                  <option key={x} value={x}>
                    {x === "activo"
                      ? "Reactivar"
                      : x === "espera"
                        ? "Lista de espera"
                        : "Excluir del proceso"}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Motivo obligatorio
            <textarea
              required
              maxLength="1000"
              value={motivo}
              onChange={(e) => m(e.target.value)}
            />
          </label>
        </AsyncForm>
      )}
      <h3>Atribución de campaña</h3>
      <Resource resource={campaigns}>
        <AsyncForm
          label="Guardar atribución"
          submit={() =>
            api("/prospectos/" + person.id + "/atribucion", {
              method: "PATCH",
              body: { campaniaId: campaign ? Number(campaign) : null },
            })
          }
          onSuccess={() => {
            onChange();
            n("Atribución guardada.");
          }}
        >
          <label>
            Campaña de origen
            <select value={campaign} onChange={(e) => c(e.target.value)}>
              <option value="">Sin atribución</option>
              {campaigns.data
                .filter((x) => x.sedeId === person.sedeId)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    #{x.id} · {x.objetivo}
                  </option>
                ))}
            </select>
          </label>
          <p className="hint">
            Atribución manual a una campaña de la misma sede. Cambiarla modifica
            el reporte de costo por admitido; no demuestra causalidad.
          </p>
        </AsyncForm>
      </Resource>
      <h3>Historial de estados</h3>
      <Resource resource={history}>
        {!history.data?.length && <p>Sin cambios de estado.</p>}
        {history.data?.map((h) => (
          <article key={h.id} className="message">
            <strong>
              {h.estadoAnterior} a {h.estadoNuevo}
            </strong>
            <small>{date(h.fechaCambio)}</small>
            <p>{h.motivo}</p>
          </article>
        ))}
      </Resource>
    </section>
  );
}
