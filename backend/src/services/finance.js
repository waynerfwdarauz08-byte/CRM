const { localDay } = require("./dates");
const { Op } = require("sequelize");
const {
  db,
  Campania,
  Gasto,
  Prospecto,
  HistorialEtapa,
  Sede,
} = require("../models");
const { AppError } = require("../middlewares/errors");
const { required } = require("./operations");
const v = require("../middlewares/operations-validation");
const cents = (s) => {
  const [a, b = ""] = String(s).split(".");
  return Number(a) * 100 + Number(b.padEnd(2, "0"));
};
const amount = (n) => (n / 100).toFixed(2);
async function spent(id, transaction) {
  const rows = await Gasto.findAll({
    where: { campaniaId: id, anulado: false },
    transaction,
    raw: true,
  });
  return rows.reduce((n, g) => n + cents(g.monto), 0);
}
async function budget(id, input) {
  const data = v.budget.parse(input);
  return db.transaction(async (transaction) => {
    const c = await required(Campania, id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const expenses = await Gasto.count({
      where: { campaniaId: id },
      transaction,
    });
    if (expenses && c.moneda !== data.moneda)
      throw new AppError(
        409,
        "No se cambia la moneda después de registrar gastos.",
      );
    if (cents(data.presupuesto) < (await spent(id, transaction)))
      throw new AppError(
        409,
        "El presupuesto no puede ser menor que el gasto vigente.",
      );
    return c.update(data, { transaction });
  });
}
async function expense(id, input) {
  const data = v.expense.parse(input);
  if (cents(data.monto) <= 0)
    throw new AppError(400, "El gasto debe ser mayor que cero.");
  const today = localDay();
  if (data.fecha > today)
    throw new AppError(400, "No se registran gastos futuros.");
  return db.transaction(async (transaction) => {
    const c = await required(Campania, id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (
      (await spent(id, transaction)) + cents(data.monto) >
      cents(c.presupuesto)
    )
      throw new AppError(409, "El gasto supera el presupuesto disponible.");
    return Gasto.create({ ...data, campaniaId: id }, { transaction });
  });
}
async function cancelExpense(id, motivo) {
  const existing = await required(Gasto, id);
  return db.transaction(async (transaction) => {
    await required(Campania, existing.campaniaId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const g = await required(Gasto, id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (g.anulado) throw new AppError(409, "El gasto ya fue anulado.");
    return g.update(
      { anulado: true, motivoAnulacion: motivo },
      { transaction },
    );
  });
}
function summarize(campaigns, expenses, people, history, f) {
  const inDate = (day) =>
    (!f.fechaDesde || day >= f.fechaDesde) &&
    (!f.fechaHasta || day <= f.fechaHasta);
  const local = localDay;
  const admitted = new Set(
    history
      .filter((h) => h.etapaDestinoId === 7 && inDate(local(h.fechaCambio)))
      .map((h) => h.prospectoId),
  );
  const rows = campaigns.map((c) => {
    const costs = expenses.filter((g) => g.campaniaId === c.id && !g.anulado);
    const total = costs.reduce((n, g) => n + cents(g.monto), 0);
    const period = costs
      .filter((g) => inDate(g.fecha))
      .reduce((n, g) => n + cents(g.monto), 0);
    const count = people.filter(
      (p) => p.campaniaOrigenId === c.id && admitted.has(p.id),
    ).length;
    return {
      ...c,
      presupuesto: String(c.presupuesto),
      gastadoTotal: amount(total),
      gastadoPeriodo: amount(period),
      saldo: amount(cents(c.presupuesto) - total),
      admitidosPeriodo: count,
      costoPorAdmitido: count ? amount(Math.round(period / count)) : null,
    };
  });
  return {
    campanias: rows,
    resumen: ["CRC", "USD"].map((moneda) => {
      const list = rows.filter((r) => r.moneda === moneda);
      const gasto = list.reduce((n, c) => n + cents(c.gastadoPeriodo), 0);
      const admits = list.reduce((n, c) => n + c.admitidosPeriodo, 0);
      return {
        moneda,
        presupuesto: amount(list.reduce((n, c) => n + cents(c.presupuesto), 0)),
        gastadoTotal: amount(
          list.reduce((n, c) => n + cents(c.gastadoTotal), 0),
        ),
        gastadoPeriodo: amount(gasto),
        saldo: amount(list.reduce((n, c) => n + cents(c.saldo), 0)),
        admitidosPeriodo: admits,
        costoPorAdmitido: admits ? amount(Math.round(gasto / admits)) : null,
      };
    }),
    admitidosSinAtribucion: people.filter(
      (p) => !p.campaniaOrigenId && admitted.has(p.id),
    ).length,
  };
}
async function report(input) {
  const f = v.range.parse(input);
  return db.transaction(
    { isolationLevel: "REPEATABLE READ" },
    async (transaction) => {
      const where = {};
      if (f.sedeId) where.sedeId = f.sedeId;
      if (f.campaniaId) where.id = f.campaniaId;
      const campaigns = await Campania.findAll({
        where,
        include: [{ model: Sede, as: "sede" }],
        order: [["id", "DESC"]],
        transaction,
      });
      const ids = campaigns.map((c) => c.id);
      const expenses = ids.length
        ? await Gasto.findAll({
            where: { campaniaId: { [Op.in]: ids } },
            raw: true,
            transaction,
          })
        : [];
      const people = await Prospecto.findAll({
        where: f.sedeId ? { sedeId: f.sedeId } : {},
        raw: true,
        transaction,
      });
      const history = people.length
        ? await HistorialEtapa.findAll({
            where: {
              prospectoId: { [Op.in]: people.map((p) => p.id) },
              etapaDestinoId: 7,
            },
            raw: true,
            transaction,
          })
        : [];
      return summarize(
        campaigns.map((c) => c.toJSON()),
        expenses,
        people,
        history,
        f,
      );
    },
  );
}
module.exports = {
  cents,
  amount,
  budget,
  expense,
  cancelExpense,
  summarize,
  report,
};
