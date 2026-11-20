import { channels } from "./constants";
export default function Filters({
  value,
  onChange,
  sedes = [],
  stages = [],
  dates = false,
  search = false,
}) {
  const field = (key, val) => onChange({ ...value, [key]: val });
  return (
    <div className="filters">
      {search && (
        <label>
          Buscar
          <input
            placeholder="Nombre o correo"
            value={value.q || ""}
            onChange={(e) => field("q", e.target.value)}
          />
        </label>
      )}
      <label>
        Sede
        <select
          value={value.sedeId || ""}
          onChange={(e) => field("sedeId", e.target.value)}
        >
          <option value="">Todas las sedes</option>
          {sedes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      </label>
      <label>
        Canal
        <select
          value={value.canalOrigen || ""}
          onChange={(e) => field("canalOrigen", e.target.value)}
        >
          <option value="">Todos los canales</option>
          {channels.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      {stages.length > 0 && (
        <label>
          Etapa
          <select
            value={value.etapaId || ""}
            onChange={(e) => field("etapaId", e.target.value)}
          >
            <option value="">Todas las etapas</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
      )}
      {dates && (
        <>
          <label>
            Ingreso desde
            <input
              type="date"
              value={value.fechaDesde || ""}
              onChange={(e) => field("fechaDesde", e.target.value)}
            />
          </label>
          <label>
            Ingreso hasta
            <input
              type="date"
              value={value.fechaHasta || ""}
              onChange={(e) => field("fechaHasta", e.target.value)}
            />
          </label>
        </>
      )}
    </div>
  );
}
