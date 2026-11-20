const { AppError } = require("../middlewares/errors");
const DAY = 86400000;
function validateTransition(current, next) {
  if (next !== current + 1 || current >= 9)
    throw new AppError(
      409,
      "Solo se permite avanzar a la siguiente etapa.",
      "TRANSICION_INVALIDA",
    );
}
function needsAttention(p, days, now = new Date()) {
  return (
    p.etapaActualId !== 9 &&
    (!p.estadoProceso || p.estadoProceso === "activo") &&
    +now - +new Date(p.fechaUltimoAvance) >= days * DAY
  );
}
function metrics(stages, people, history, now = new Date()) {
  const events = new Map();
  for (const h of history) {
    if (!events.has(h.prospectoId)) events.set(h.prospectoId, new Map());
    events.get(h.prospectoId).set(h.etapaDestinoId, +new Date(h.fechaCambio));
  }
  const rows = stages.map((s, i) => {
    const next = stages[i + 1];
    const reached = people.filter((p) => events.get(p.id)?.has(s.id));
    const advanced = next
      ? reached.filter((p) => events.get(p.id).has(next.id))
      : [];
    const conversion =
      next && reached.length ? (advanced.length / reached.length) * 100 : null;
    return {
      ...s,
      actual: people.filter((p) => p.etapaActualId === s.id).length,
      alcanzaronEtapa: reached.length,
      alcanzaronSiguiente: next ? advanced.length : null,
      conversionPorcentaje: conversion,
      sinAvancePorcentaje: conversion === null ? null : 100 - conversion,
      metaConversion: next ? Number(s.metaConversion) : null,
      brechaMetaPuntos:
        conversion === null
          ? null
          : Math.max(Number(s.metaConversion) - conversion, 0),
      diasPromedio:
        next && advanced.length
          ? advanced.reduce(
              (a, p) =>
                a +
                (events.get(p.id).get(next.id) - events.get(p.id).get(s.id)) /
                  DAY,
              0,
            ) / advanced.length
          : null,
    };
  });
  return {
    total: people.length,
    nuevos: people.filter((p) => +now - +new Date(p.fechaIngreso) <= 7 * DAY)
      .length,
    atencion: people.filter((p) => needsAttention(p, 3, now)).length,
    estudiantes: people.filter((p) => p.etapaActualId === 9).length,
    etapas: rows,
    mayorBrecha:
      rows
        .filter((r) => r.brechaMetaPuntos > 0)
        .sort((a, b) => b.brechaMetaPuntos - a.brechaMetaPuntos)[0] || null,
  };
}
module.exports = { DAY, metrics, validateTransition, needsAttention };
