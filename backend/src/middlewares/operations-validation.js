const { z } = require("zod");
const { id } = require("./validation");
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s,
    "Fecha inválida",
  );
const instant = z.string().datetime({ offset: true });
const text = (n) => z.string().trim().min(1).max(n);
const money = z
  .union([z.string(), z.number()])
  .transform(String)
  .refine(
    (s) => /^\d{1,9}(\.\d{1,2})?$/.test(s),
    "Usá un importe positivo con hasta dos decimales",
  );
const range = z
  .object({
    sedeId: id.optional(),
    campaniaId: id.optional(),
    fechaDesde: day.optional(),
    fechaHasta: day.optional(),
  })
  .refine(
    (v) => !v.fechaDesde || !v.fechaHasta || v.fechaDesde <= v.fechaHasta,
    "Rango inválido",
  );
const eventShape = {
  sedeId: id,
  titulo: text(160),
  tipo: z.enum(["campus_day", "seguimiento", "otro"]),
  inicio: instant,
  fin: instant,
  responsable: text(120),
  lugar: text(200),
  prospectoId: id.nullable().optional(),
  notas: z.string().trim().max(3000).optional(),
};
const validEvent = (v) =>
  +new Date(v.fin) > +new Date(v.inicio) &&
  +new Date(v.fin) - +new Date(v.inicio) <= 86400000;
const event = z
  .object(eventShape)
  .strict()
  .refine(
    validEvent,
    "El evento debe durar más de cero y como máximo 24 horas",
  );
const interview = z
  .object({
    ...eventShape,
    tipo: z.literal("entrevista").optional(),
    prospectoId: id,
  })
  .strict()
  .refine(validEvent, "Duración inválida");
module.exports = {
  day,
  instant,
  text,
  money,
  range,
  event,
  interview,
  pagination: z.object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
  state: z
    .object({
      estado: z.enum(["activo", "espera", "excluido"]),
      motivo: text(1000),
    })
    .strict(),
  budget: z
    .object({ presupuesto: money, moneda: z.enum(["CRC", "USD"]) })
    .strict(),
  expense: z.object({ concepto: text(200), monto: money, fecha: day }).strict(),
  image: z
    .object({
      campaniaId: id.nullable().optional(),
      prompt: text(3000),
      tamano: z
        .enum(["1024x1024", "1536x1024", "1024x1536"])
        .default("1024x1024"),
    })
    .strict(),
  post: z
    .object({
      campaniaId: id,
      imagenId: id.nullable().optional(),
      red: z.enum(["facebook", "instagram"]),
      texto: text(2200),
    })
    .strict(),
  revision: z.object({ revision: z.number().int().positive() }).strict(),
  interviewResult: z
    .object({
      estado: z.enum(["realizada", "cancelada", "no_asistio"]),
      resultado: z
        .enum(["pendiente", "favorable", "desfavorable"])
        .default("pendiente"),
      notas: z.string().trim().max(4000).default(""),
    })
    .strict(),
};
