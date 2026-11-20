import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import Filters from "../components/Filters";
import ProspectForm from "../components/ProspectForm";
import Modal from "../components/Modal";
import { Resource, useResource, Notice } from "../components/Resource";
import { query, date } from "../services/api";
export default function Prospects({ sedes, stages }) {
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();
  const [filter, set] = useState({});
  const [page, p] = useState(1);
  const [version, v] = useState(0);
  const [note, n] = useState("");
  const r = useResource("/prospectos" + query({ ...filter, page }), version);
  const change = (f) => {
    set(f);
    p(1);
  };
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">PERSONAS, NO SOLO REGISTROS</div>
          <h1>Prospectos</h1>
          <p>Conocé a quienes están dando su próximo paso.</p>
        </div>
        <button onClick={() => setSearch({ nuevo: "1" })}>
          <Plus size={18} /> Nuevo prospecto
        </button>
      </div>
      <Notice>{note}</Notice>
      <section className="panel">
        <Filters
          value={filter}
          onChange={change}
          sedes={sedes}
          stages={stages}
          search
        />
        <Resource resource={r}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Sede</th>
                  <th>Etapa actual</th>
                  <th>Canal</th>
                  <th>Ingreso</th>
                </tr>
              </thead>
              <tbody>
                {r.data?.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <Link className="person" to={"/prospectos/" + x.id}>
                        <span className="avatar">
                          {x.nombre.slice(0, 2).toUpperCase()}
                        </span>
                        <span>
                          <strong>{x.nombre}</strong>
                          <small>{x.correo || "Sin correo registrado"}</small>
                        </span>
                      </Link>
                    </td>
                    <td>{x.sede.nombre}</td>
                    <td>
                      <span className="badge">{x.etapa.nombre}</span>
                      {x.estadoProceso !== "activo" && (
                        <small className="block">
                          {x.estadoProceso === "espera"
                            ? "Lista de espera"
                            : "Excluido"}
                        </small>
                      )}
                    </td>
                    <td>{x.canalOrigen}</td>
                    <td>{date(x.fechaIngreso)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!r.data?.length && (
              <div className="state">
                No hay prospectos que coincidan con los filtros.
              </div>
            )}
          </div>
          <div className="pagination">
            <span>
              {r.meta?.total || 0} personas · Página {page} de{" "}
              {r.meta?.pages || 1}
            </span>
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
      {search.get("nuevo") && (
        <Modal title="Nuevo prospecto" onClose={() => setSearch({})}>
          <p className="hint">El registro comienza en la etapa Prospecto.</p>
          <ProspectForm
            sedes={sedes}
            onCancel={() => setSearch({})}
            onSaved={(person) => {
              setSearch({});
              v(version + 1);
              n("Prospecto guardado.");
              navigate("/prospectos/" + person.id);
            }}
          />
        </Modal>
      )}
    </>
  );
}
