import { useState } from "react";
import { Link } from "react-router-dom";
import { Resource, useResource, Notice } from "../components/Resource";
import Filters from "../components/Filters";
import Advance from "../components/Advance";
import { query, days } from "../services/api";
export default function Funnel({ sedes, stages }) {
  const [filters, f] = useState({});
  const [version, v] = useState(0);
  const r = useResource("/tablero" + query(filters), version);
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">CADA PASO CUENTA</div>
          <h1>Embudo de admisiones</h1>
          <p>
            Un panorama del proceso actual, desde el primer contacto hasta el
            aula.
          </p>
        </div>
      </div>
      <section className="panel">
        <Filters sedes={sedes} value={filters} onChange={f} />
        <p className="hint">
          El tablero incluye toda la población filtrada. Avanzá únicamente a la
          siguiente etapa.
        </p>
      </section>
      <Resource resource={r}>
        <div
          className="kanban"
          tabIndex="0"
          role="region"
          aria-label="Tablero de nueve etapas con desplazamiento horizontal"
        >
          {stages.map((s, i) => (
            <section className="column" key={s.id}>
              <div className="column-head">
                <span className={"stage-line line" + i} />
                <h2>{s.nombre}</h2>
                <span className="count">
                  {r.data?.filter((p) => p.etapaActualId === s.id).length || 0}
                </span>
              </div>
              {r.data
                ?.filter((p) => p.etapaActualId === s.id)
                .map((p) => (
                  <article className="kanban-card" key={p.id}>
                    <span className="avatar">
                      {p.nombre.slice(0, 2).toUpperCase()}
                    </span>
                    <h3>
                      <Link to={"/prospectos/" + p.id}>{p.nombre}</Link>
                    </h3>
                    <p>{p.sede.nombre}</p>
                    <span
                      className={
                        "badge " +
                        (days(p.fechaUltimoAvance) >= 3 ? "amber" : "")
                      }
                    >
                      {days(p.fechaUltimoAvance)} días sin avance
                    </span>
                    <Advance
                      person={p}
                      stages={stages}
                      onSaved={() => v((x) => x + 1)}
                    />
                  </article>
                ))}
              {!r.data?.some((p) => p.etapaActualId === s.id) && (
                <div className="empty">Sin prospectos</div>
              )}
            </section>
          ))}
        </div>
      </Resource>
    </>
  );
}
