import { localDateKey } from "../services/api";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Resource, useResource, Notice } from "../components/Resource";
import { Heading, AsyncForm, Pager, money } from "../components/OperationsUI";
import Modal from "../components/Modal";
import { api, query } from "../services/api";
function Ledger({ campaign, onChanged }) {
  const [version, v] = useState(0),
    [page, p] = useState(1),
    [cancel, c] = useState(null),
    [reason, r] = useState("");
  const resource = useResource(
    "/campanias/" + campaign.id + "/gastos" + query({ page }),
    version,
  );
  return (
    <>
      <Resource resource={resource}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                <th>Importe</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {resource.data?.map((g) => (
                <tr key={g.id}>
                  <td>{g.fecha}</td>
                  <td>
                    {g.concepto}
                    {g.anulado && (
                      <small className="block">{g.motivoAnulacion}</small>
                    )}
                  </td>
                  <td>{money(g.monto, campaign.moneda)}</td>
                  <td>
                    {g.anulado ? (
                      <span className="badge amber">Anulado</span>
                    ) : (
                      <button
                        className="secondary"
                        onClick={() => {
                          c(g);
                          r("");
                        }}
                      >
                        Anular con motivo
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!resource.data?.length && (
            <p className="empty">No hay gastos registrados.</p>
          )}
        </div>
        <Pager page={page} meta={resource.meta} onChange={p} />
      </Resource>
      {cancel && (
        <div className="message">
          <h3>Anular {cancel.concepto}</h3>
          <AsyncForm
            label="Confirmar anulación"
            submit={() =>
              api("/gastos/" + cancel.id + "/anular", {
                method: "POST",
                body: { motivo: reason },
              })
            }
            onSuccess={() => {
              c(null);
              v((x) => x + 1);
              onChanged();
            }}
          >
            <label>
              Motivo
              <textarea
                required
                maxLength="500"
                value={reason}
                onChange={(e) => r(e.target.value)}
              />
            </label>
          </AsyncForm>
        </div>
      )}
    </>
  );
}
export default function Finance({ sedes }) {
  const [filters, f] = useState({}),
    [version, v] = useState(0),
    [modal, m] = useState(null),
    [budget, b] = useState(""),
    [currency, c] = useState("CRC"),
    [amount, a] = useState(""),
    [concept, k] = useState(""),
    [day, d] = useState(""),
    [notice, n] = useState("");
  const r = useResource("/finanzas" + query(filters), version);
  const field = (e) => f({ ...filters, [e.target.name]: e.target.value });
  const changed = () => {
    v((x) => x + 1);
    n("Información financiera actualizada.");
  };
  function open(type, campaign) {
    m({ type, campaign });
    b(String(campaign.presupuesto));
    c(campaign.moneda);
    a("");
    k("");
    d(localDateKey());
  }
  return (
    <>
      <Heading
        title="Presupuestos y costo por admitido"
        description="Gastos registrados, saldos y admisiones atribuidas. Sin cobros ni compra automática de anuncios."
      />
      <Notice>{notice}</Notice>
      <section className="panel">
        <div className="filters">
          <label>
            Sede
            <select name="sedeId" value={filters.sedeId || ""} onChange={field}>
              <option value="">Todas</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Período desde
            <input
              type="date"
              name="fechaDesde"
              value={filters.fechaDesde || ""}
              onChange={field}
            />
          </label>
          <label>
            Período hasta
            <input
              type="date"
              name="fechaHasta"
              value={filters.fechaHasta || ""}
              onChange={field}
            />
          </label>
        </div>
        <p className="hint">
          El período filtra fechas de gastos y la primera llegada a Admitido. El
          presupuesto, gasto total y saldo son acumulados. La atribución se
          asigna en la ficha; no se mezclan monedas ni se interpreta el costo
          como causal.
        </p>
      </section>
      <Resource resource={r}>
        {r.data && (
          <>
            <div className="finance-summary">
              {r.data.resumen.map((x) => (
                <section className="panel" key={x.moneda}>
                  <span className="badge">{x.moneda}</span>
                  <dl>
                    <dt>Presupuesto total</dt>
                    <dd>{money(x.presupuesto, x.moneda)}</dd>
                    <dt>Saldo disponible</dt>
                    <dd>{money(x.saldo, x.moneda)}</dd>
                    <dt>Gasto del período</dt>
                    <dd>{money(x.gastadoPeriodo, x.moneda)}</dd>
                    <dt>Admitidos atribuidos</dt>
                    <dd>{x.admitidosPeriodo}</dd>
                    <dt>Costo por admitido</dt>
                    <dd>
                      <strong>{money(x.costoPorAdmitido, x.moneda)}</strong>
                    </dd>
                  </dl>
                </section>
              ))}
            </div>
            <p className="hint">
              {r.data.admitidosSinAtribucion} admitidos del período no tienen
              campaña atribuida. No se incluyen en el costo por campaña.
            </p>
            <section className="panel space-top">
              <h2>Campañas y ejecución</h2>
              {!r.data.campanias.length && (
                <p>
                  No hay campañas.{" "}
                  <Link to="/campanias">Crear una campaña</Link>
                </p>
              )}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Campaña</th>
                      <th>Presupuesto</th>
                      <th>Gasto total</th>
                      <th>Saldo</th>
                      <th>Gasto período</th>
                      <th>Admitidos período</th>
                      <th>Costo por admitido</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.data.campanias.map((x) => (
                      <tr key={x.id}>
                        <td>
                          <strong>
                            #{x.id} · {x.sede.nombre}
                          </strong>
                          <small className="block wrap">{x.objetivo}</small>
                        </td>
                        <td>{money(x.presupuesto, x.moneda)}</td>
                        <td>{money(x.gastadoTotal, x.moneda)}</td>
                        <td>{money(x.saldo, x.moneda)}</td>
                        <td>{money(x.gastadoPeriodo, x.moneda)}</td>
                        <td>{x.admitidosPeriodo}</td>
                        <td>{money(x.costoPorAdmitido, x.moneda)}</td>
                        <td>
                          <div className="inline-actions">
                            <button
                              className="secondary"
                              onClick={() => open("budget", x)}
                            >
                              Presupuesto
                            </button>
                            <button
                              className="secondary"
                              onClick={() => open("expense", x)}
                            >
                              Registrar gasto
                            </button>
                            <button
                              className="secondary"
                              onClick={() => open("ledger", x)}
                            >
                              Ver gastos
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </Resource>
      {modal && (
        <Modal
          title={
            (modal.type === "budget"
              ? "Editar presupuesto"
              : modal.type === "expense"
                ? "Registrar gasto"
                : "Gastos de campaña") +
            " #" +
            modal.campaign.id
          }
          onClose={() => m(null)}
        >
          {modal.type === "ledger" ? (
            <Ledger campaign={modal.campaign} onChanged={changed} />
          ) : (
            <AsyncForm
              label="Guardar"
              submit={() =>
                api(
                  "/campanias/" +
                    modal.campaign.id +
                    (modal.type === "budget" ? "/presupuesto" : "/gastos"),
                  {
                    method: modal.type === "budget" ? "PATCH" : "POST",
                    body:
                      modal.type === "budget"
                        ? { presupuesto: budget, moneda: currency }
                        : { concepto: concept, monto: amount, fecha: day },
                  },
                )
              }
              onSuccess={() => {
                m(null);
                changed();
              }}
            >
              {modal.type === "budget" ? (
                <>
                  <label>
                    Moneda
                    <select
                      value={currency}
                      onChange={(e) => c(e.target.value)}
                    >
                      <option>CRC</option>
                      <option>USD</option>
                    </select>
                  </label>
                  <label>
                    Presupuesto
                    <input
                      required
                      type="number"
                      min="0"
                      max="999999999"
                      step="0.01"
                      value={budget}
                      onChange={(e) => b(e.target.value)}
                    />
                  </label>
                  <p className="hint">
                    No puede bajar del gasto vigente. La moneda queda fija una
                    vez que se registren gastos.
                  </p>
                </>
              ) : (
                <>
                  <label>
                    Concepto
                    <input
                      required
                      maxLength="200"
                      value={concept}
                      onChange={(e) => k(e.target.value)}
                    />
                  </label>
                  <label>
                    Importe ({modal.campaign.moneda})
                    <input
                      required
                      type="number"
                      min="0.01"
                      max="999999999"
                      step="0.01"
                      value={amount}
                      onChange={(e) => a(e.target.value)}
                    />
                  </label>
                  <label>
                    Fecha del gasto
                    <input
                      required
                      type="date"
                      value={day}
                      onChange={(e) => d(e.target.value)}
                    />
                  </label>
                  <p className="hint">
                    Es un registro contable; no realiza pagos ni compra
                    anuncios.
                  </p>
                </>
              )}
            </AsyncForm>
          )}
        </Modal>
      )}
    </>
  );
}
