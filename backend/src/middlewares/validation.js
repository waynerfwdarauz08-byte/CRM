const { z } = require("zod");
const { channels } = require("../services/demo");
const id = z.coerce.number().int().positive().max(2147483647);
const text = (n) => z.string().trim().max(n);
const contact = z
  .object({
    nombre: text(120).min(2),
    correo: z
      .union([z.string().trim().email().max(254), z.literal("")])
      .nullable()
      .optional(),
    telefono: text(30).nullable().optional(),
    sedeId: id,
    canalOrigen: z.enum(channels),
    observaciones: text(3000).nullable().optional(),
  })
  .strict();
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s,
    "Fecha inválida",
  );
const filters = z
  .object({
    sedeId: id.optional(),
    canalOrigen: z.enum(channels).optional(),
    fechaDesde: day.optional(),
    fechaHasta: day.optional(),
  })
  .refine(
    (v) => !v.fechaDesde || !v.fechaHasta || v.fechaDesde <= v.fechaHasta,
    "Rango de fechas inválido",
  );
module.exports = {
  id,
  contact,
  filters,
  list: z.object({
    sedeId: id.optional(),
    etapaId: id.optional(),
    canalOrigen: z.enum(channels).optional(),
    q: text(120).optional(),
    estadoProceso: z.enum(["activo", "espera", "excluido"]).optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
  attention: z.object({
    dias: z.coerce.number().int().min(1).max(3650).default(3),
    sedeId: id.optional(),
  }),
  transition: z
    .object({ etapaId: id, comentario: text(1000).optional() })
    .strict(),
};
