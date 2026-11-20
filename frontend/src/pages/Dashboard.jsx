import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  UserPlus,
  Clock,
  GraduationCap,
  SlidersHorizontal,
} from "lucide-react";
import { useResource, Resource } from "../components/Resource";
import Filters from "../components/Filters";
import { query, percent } from "../services/api";
export default function Dashboard({ sedes }) {
  const [filters, set] = useState({});
  const r = useResource("/embudo" + query(filters));
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">VISTA GENERAL</div>
          <h1>Un buen comienzo, para cada persona.</h1>
          <p>
            Seguí el proceso de admisión y encontrá dónde hacer la diferencia.
          </p>
        </div>
        <Link className="button" to="/prospectos?nuevo=1">
          <UserPlus size={18} /> Nuevo prospecto
        </Link>
      </div>
      <section className="panel filter-panel">
        <div className="section-label">
          <SlidersHorizontal size={16} /> Tu población de análisis
        </div>
        <Filters value={filters} onChange={set} sedes={sedes} dates />
        <p className="hint">
          Las fechas seleccionan personas por ingreso. Su progreso se calcula
          hasta hoy; no es una fotografía histórica.
        </p>
      </section>
      <Resource resource={r}>
        {r.data && (
          <>
            <div className="stats">
              {[
                [
                  "Prospectos en total",
                  r.data.total,
                  Users,
                  "Población seleccionada",
                ],
                [
                  "Nuevos ingresos",
                  r.data.nuevos,
                  UserPlus,
                  "En los últimos 7 días",
                ],
                [
                  "Necesitan atención",
                  r.data.atencion,
                  Clock,
                  "3 días o más sin avance",
                ],
                [
                  "Estudiantes",
                  r.data.estudiantes,
                  GraduationCap,
                  "Llegaron a la meta",
                ],
              ].map(([label, value, Icon, detail], i) => (
                <article className="stat panel" key={label}>
                  <div className={"stat-icon i" + i}>
                    <Icon size={21} />
                  </div>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <small>{detail}</small>
                </article>
              ))}
            </div>
            <div className="dashboard-grid">
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h2>El recorrido de admisión</h2>
                    <p>Personas que alcanzaron cada etapa</p>
                  </div>
                  <span className="badge">Historial acumulado</span>
                </div>
                <div className="funnel-bars">
                  {r.data.etapas.map((s, i) => (
                    <div className="bar-row" key={s.id}>
                      <span>{s.nombre}</span>
                      <div className="bar-track">
                        <div
                          style={{
                            width:
                              (r.data.total
                                ? (s.alcanzaronEtapa / r.data.total) * 100
                                : 0) + "%",
                            background: i > 5 ? "#7c3aed" : "#2563eb",
                          }}
                        />
                      </div>
                      <strong>{s.alcanzaronEtapa}</strong>
                    </div>
                  ))}
                </div>
              </section>
              <aside className="insight panel">
                <span className="eyebrow">UNA OPORTUNIDAD PARA ACTUAR</span>
                <div className="insight-icon">
                  <Clock size={28} />
                </div>
                <h2>
                  {r.data.mayorBrecha
                    ? "Enfocá el seguimiento"
                    : "El proceso va por buen camino"}
                </h2>
                {r.data.mayorBrecha ? (
                  <>
                    <p>
                      La mayor brecha está después de{" "}
                      <strong>{r.data.mayorBrecha.nombre}</strong>.
                    </p>
                    <div className="gap">
                      {r.data.mayorBrecha.brechaMetaPuntos.toFixed(2)}{" "}
                      <small>pp bajo la meta</small>
                    </div>
                    <p>
                      Muestra: {r.data.mayorBrecha.alcanzaronEtapa} personas.
                      Revisá barreras y ofrecé orientación para el siguiente
                      paso.
                    </p>
                  </>
                ) : (
                  <p>
                    No hay transiciones con muestra válida por debajo de su
                    meta.
                  </p>
                )}
                <Link className="button" to="/atencion">
                  Revisar seguimiento
                </Link>
                <p className="hint">
                  Permanecer en una etapa no confirma abandono.
                </p>
              </aside>
            </div>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Conversión, paso a paso</h2>
                  <p>
                    Fuga provisional / sin avance: no haber avanzado todavía no
                    significa abandono confirmado.
                  </p>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Transición desde</th>
                      <th>Alcanzaron</th>
                      <th>Avanzaron</th>
                      <th>Conversión</th>
                      <th>Sin avance</th>
                      <th>Meta</th>
                      <th>Brecha (pp)</th>
                      <th>Días promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.data.etapas.map((s) => (
                      <tr key={s.id}>
                        <td>{s.nombre}</td>
                        <td>{s.alcanzaronEtapa}</td>
                        <td>{s.alcanzaronSiguiente ?? "—"}</td>
                        <td>{percent(s.conversionPorcentaje)}</td>
                        <td>{percent(s.sinAvancePorcentaje)}</td>
                        <td>{percent(s.metaConversion)}</td>
                        <td>{s.brechaMetaPuntos?.toFixed(2) ?? "—"}</td>
                        <td>{s.diasPromedio?.toFixed(1) ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </Resource>
    </>
  );
}
