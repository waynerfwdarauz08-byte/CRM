const { Op } = require("sequelize");
const {
  db,
  Prospecto,
  HistorialEstado,
  Campania,
  Evento,
  Entrevista,
  Sede,
} = require("../models");
const { AppError } = require("../middlewares/errors");
const v = require("../middlewares/operations-validation");
const fail = (status, message) => {
  throw new AppError(status, message);
};
async function required(Model, id, options = {}) {
  const row = await Model.findByPk(id, options);
  if (!row) fail(404, "Registro no encontrado.");
  return row;
}
async function changeState(id, input) {
  const data = v.state.parse(input);
  return db.transaction(async (transaction) => {
    const p = await required(Prospecto, id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (p.estadoProceso === data.estado)
      fail(409, "La persona ya tiene ese estado.");
    if (p.etapaActualId === 9 && data.estado !== "activo")
      fail(
        409,
        "Un estudiante no se gestiona como prospecto en espera o excluido.",
      );
    const before = p.estadoProceso;
    await p.update({ estadoProceso: data.estado }, { transaction });
    await HistorialEstado.create(
      {
        prospectoId: id,
        estadoAnterior: before,
        estadoNuevo: data.estado,
        motivo: data.motivo,
        fechaCambio: new Date(),
      },
      { transaction },
    );
    return p;
  });
}
async function attribute(id, campaniaId) {
  return db.transaction(async (transaction) => {
    const p = await required(Prospecto, id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (campaniaId) {
      const c = await required(Campania, campaniaId, { transaction });
      if (c.sedeId !== p.sedeId)
        fail(
          400,
          "La campaña y el prospecto deben pertenecer a la misma sede.",
        );
    }
    await p.update({ campaniaOrigenId: campaniaId }, { transaction });
    return p;
  });
}
const eventInclude = [
  { model: Sede, as: "sede" },
  { model: Prospecto, as: "prospecto" },
];
const interviewInclude = [
  { model: Evento, as: "evento", include: [{ model: Sede, as: "sede" }] },
  { model: Prospecto, as: "prospecto" },
];
async function schedule(data, transaction, excludeId) {
  await required(Sede, data.sedeId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (data.prospectoId) {
    const p = await required(Prospecto, data.prospectoId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (p.estadoProceso !== "activo")
      fail(409, "Reactivá al prospecto antes de programar actividades.");
    if (p.sedeId !== data.sedeId)
      fail(400, "La actividad debe usar la sede del prospecto.");
  }
  const where = {
    sedeId: data.sedeId,
    responsable: data.responsable,
    estado: "programado",
    inicio: { [Op.lt]: new Date(data.fin) },
    fin: { [Op.gt]: new Date(data.inicio) },
  };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  if (await Evento.findOne({ where, transaction }))
    fail(409, "Ese responsable ya tiene una actividad que se superpone.");
  return { ...data, inicio: new Date(data.inicio), fin: new Date(data.fin) };
}
async function createEvent(input) {
  const data = v.event.parse(input);
  return db.transaction(async (transaction) =>
    Evento.create(await schedule(data, transaction), { transaction }),
  );
}
async function updateEvent(id, input) {
  const data = v.event.parse(input);
  return db.transaction(async (transaction) => {
    await required(Sede, data.sedeId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const event = await required(Evento, id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (event.tipo === "entrevista")
      fail(409, "Reprogramá la entrevista desde su módulo.");
    if (event.estado !== "programado")
      fail(409, "Solo se reprograman eventos pendientes.");
    return event.update(await schedule(data, transaction, id), { transaction });
  });
}
async function finishEvent(id, estado) {
  return db.transaction(async (transaction) => {
    const e = await required(Evento, id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (e.tipo === "entrevista")
      fail(409, "Actualizá la entrevista desde su módulo.");
    if (e.estado !== "programado") fail(409, "El evento ya fue cerrado.");
    return e.update({ estado }, { transaction });
  });
}
async function createInterview(input) {
  const data = v.interview.parse(input);
  return db.transaction(async (transaction) => {
    const event = await Evento.create(
      await schedule({ ...data, tipo: "entrevista" }, transaction),
      { transaction },
    );
    return Entrevista.create(
      {
        eventoId: event.id,
        prospectoId: data.prospectoId,
        estado: "programada",
        resultado: "pendiente",
        notas: data.notas || "",
      },
      { transaction },
    );
  });
}
async function moveInterview(id, input) {
  const data = v.interview.parse(input);
  return db.transaction(async (transaction) => {
    await required(Sede, data.sedeId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const interview = await required(Entrevista, id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (interview.estado !== "programada")
      fail(409, "Solo se reprograman entrevistas pendientes.");
    if (interview.prospectoId !== data.prospectoId)
      fail(400, "No se puede reasignar la entrevista a otra persona.");
    const event = await required(Evento, interview.eventoId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    await event.update(
      await schedule({ ...data, tipo: "entrevista" }, transaction, event.id),
      { transaction },
    );
    return interview;
  });
}
async function finishInterview(id, input) {
  const data = v.interviewResult.parse(input);
  return db.transaction(async (transaction) => {
    const interview = await required(Entrevista, id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (interview.estado !== "programada")
      fail(409, "La entrevista ya fue cerrada.");
    if (data.estado !== "realizada" && data.resultado !== "pendiente")
      fail(400, "Solo una entrevista realizada puede tener resultado.");
    await interview.update(data, { transaction });
    await Evento.update(
      { estado: data.estado === "cancelada" ? "cancelado" : "completado" },
      { where: { id: interview.eventoId }, transaction },
    );
    return interview;
  });
}
async function events(filters) {
  const f = v.range.parse(filters);
  const where = {};
  if (f.sedeId) where.sedeId = f.sedeId;
  if (f.fechaDesde)
    where.fin = { [Op.gt]: new Date(f.fechaDesde + "T00:00:00-06:00") };
  if (f.fechaHasta)
    where.inicio = {
      [Op.lt]: new Date(+new Date(f.fechaHasta + "T00:00:00-06:00") + 86400000),
    };
  return Evento.findAll({
    where,
    include: eventInclude,
    order: [
      ["inicio", "ASC"],
      ["id", "ASC"],
    ],
  });
}
function ics(events) {
  const escape = (s) =>
    String(s || "")
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");
  const stamp = (s) =>
    new Date(s)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Admisiones CRM//Calendario//ES",
    "CALSCALE:GREGORIAN",
  ];
  for (const e of events)
    lines.push(
      "BEGIN:VEVENT",
      "UID:evento-" + e.id + "@admisiones-crm.local",
      "DTSTAMP:" + stamp(e.updatedAt),
      "DTSTART:" + stamp(e.inicio),
      "DTEND:" + stamp(e.fin),
      "SUMMARY:" + escape(e.titulo),
      "LOCATION:" + escape(e.lugar),
      "DESCRIPTION:" +
        escape("Sede: " + e.sede.nombre + "; responsable: " + e.responsable),
      "STATUS:" + (e.estado === "cancelado" ? "CANCELLED" : "CONFIRMED"),
      "END:VEVENT",
    );
  lines.push("END:VCALENDAR");
  const fold = (line) => {
    const chunks = [];
    let current = "";
    for (const char of line) {
      if (Buffer.byteLength(current + char) > 73) {
        chunks.push(current);
        current = " " + char;
      } else current += char;
    }
    chunks.push(current);
    return chunks.join("\r\n");
  };
  return lines.map(fold).join("\r\n") + "\r\n";
}
async function reviewInterview(id, input) {
  const { z } = require("zod");
  const data = z
    .object({
      resultado: z.enum(["favorable", "desfavorable"]),
      notas: z.string().trim().max(4000).default(""),
    })
    .strict()
    .parse(input);
  return db.transaction(async (transaction) => {
    const interview = await required(Entrevista, id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (interview.estado !== "realizada" || interview.resultado !== "pendiente")
      throw new AppError(
        409,
        "Solo se revisan entrevistas realizadas con resultado pendiente.",
      );
    return interview.update(data, { transaction });
  });
}
module.exports = {
  reviewInterview,
  required,
  changeState,
  attribute,
  eventInclude,
  interviewInclude,
  createEvent,
  updateEvent,
  finishEvent,
  createInterview,
  moveInterview,
  finishInterview,
  events,
  ics,
};
