import { useState } from "react";
import { Link } from "react-router-dom";
import { Resource, useResource, Notice } from "../components/Resource";
import Filters from "../components/Filters";
import { Heading, Pager, AsyncForm } from "../components/OperationsUI";
import Modal from "../components/Modal";
import { api, query, date } from "../services/api";
export default function AdmissionsQueue({ sedes, mode }) {
  const [filters, f] = useState({}),
    [page, p] = useState(1),
    [version, v] = useState(0),
    [selected, s] = useState(null),
    [motivo, m] = useState(""),
    [note, n] = useState("");
  const r = useResource(
    "/prospectos" + query({ ...filters, page, estadoProceso: mode }),
    version,
  );
  return (
    <>
      <Heading
        title={mode === "espera" ? "Lista de espera" : "Prospectos excluidos"}
        description="Un estado separado del embudo, con motivo e historial conservados."
      />
      <Notice>{note}</Notice>
      <section className="panel">
        <Filters
          sedes={sedes}
          search
          value={filters}
          onChange={(x) => {
            f(x);
            p(1);
          }}
        />
        <Resource resource={r}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Sede</th>
                  <th>Etapa conservada</th>
                  <th>Último avance</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {r.data?.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <Link to={"/prospectos/" + person.id}>
                        {person.nombre}
                      </Link>
                    </td>
                    <td>{person.sede.nombre}</td>
                    <td>{person.etapa.nombre}</td>
                    <td>{date(person.fechaUltimoAvance)}</td>
                    <td>
                      <button
                        className="secondary"
                        onClick={() => {
                          s(person);
                          m("");
                        }}
                      >
                        Reactivar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!r.data?.length && (
              <div className="empty">No hay personas en esta lista.</div>
            )}
          </div>
          <Pager page={page} meta={r.meta} onChange={p} />
        </Resource>
      </section>
      {selected && (
        <Modal title={"Reactivar a " + selected.nombre} onClose={() => s(null)}>
          <AsyncForm
            label="Confirmar reactivación"
            submit={() =>
              api("/prospectos/" + selected.id + "/estado", {
                method: "PATCH",
                body: { estado: "activo", motivo },
              })
            }
            onSuccess={() => {
              s(null);
              v((x) => x + 1);
              n("Persona reactivada; conserva su etapa e historial.");
            }}
          >
            <label>
              Motivo
              <textarea
                required
                maxLength="1000"
                value={motivo}
                onChange={(e) => m(e.target.value)}
              />
            </label>
          </AsyncForm>
        </Modal>
      )}
    </>
  );
}
