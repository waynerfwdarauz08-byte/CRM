const { z } = require("zod");
const { Op } = require("sequelize");
const {
  Prospecto,
  HistorialEstado,
  Evento,
  Entrevista,
  Gasto,
  Campania,
  Imagen,
  Publicacion,
  PublicacionEvento,
} = require("../models");
const { id } = require("../middlewares/validation");
const v = require("../middlewares/operations-validation");
const operations = require("../services/operations");
const finance = require("../services/finance");
const images = require("../services/images");
const publications = require("../services/publications");
const json = (res, data, status = 200) => res.status(status).json({ data });
const param = (req) => id.parse(req.params.id);
async function paged(Model, req, res, options = {}) {
  const { page, limit } = v.pagination.parse(req.query);
  const { rows, count } = await Model.findAndCountAll({
    ...options,
    limit,
    offset: (page - 1) * limit,
    order: options.order || [
      ["createdAt", "DESC"],
      ["id", "DESC"],
    ],
  });
  res.json({
    data: Model === Imagen ? rows.map(images.view) : rows,
    meta: { total: count, page, limit, pages: Math.ceil(count / limit) },
  });
}
module.exports = {
  async state(req, res) {
    json(res, await operations.changeState(param(req), req.body));
  },
  async stateHistory(req, res) {
    const prospectoId = param(req);
    await operations.required(Prospecto, prospectoId);
    json(
      res,
      await HistorialEstado.findAll({
        where: { prospectoId },
        order: [
          ["fechaCambio", "DESC"],
          ["id", "DESC"],
        ],
      }),
    );
  },
  async attribute(req, res) {
    const data = z
      .object({ campaniaId: id.nullable() })
      .strict()
      .parse(req.body);
    json(res, await operations.attribute(param(req), data.campaniaId));
  },
  async reviewInterview(req, res) {
    json(res, await operations.reviewInterview(param(req), req.body));
  },
  async interviews(req, res) {
    const f = z
      .object({
        estado: z
          .enum(["programada", "realizada", "cancelada", "no_asistio"])
          .optional(),
        prospectoId: id.optional(),
        resultado: z
          .enum(["pendiente", "favorable", "desfavorable"])
          .optional(),
        sedeId: id.optional(),
      })
      .parse(req.query);
    const where = {};
    if (f.estado) where.estado = f.estado;
    if (f.prospectoId) where.prospectoId = f.prospectoId;
    if (f.resultado) where.resultado = f.resultado;
    const include = operations.interviewInclude.map((x) =>
      x.as === "evento" && f.sedeId
        ? { ...x, where: { sedeId: f.sedeId }, required: true }
        : x,
    );
    await paged(Entrevista, req, res, {
      where,
      include,
      order: [
        [{ model: Evento, as: "evento" }, "inicio", "ASC"],
        ["id", "ASC"],
      ],
    });
  },
  async createInterview(req, res) {
    json(res, await operations.createInterview(req.body), 201);
  },
  async moveInterview(req, res) {
    json(res, await operations.moveInterview(param(req), req.body));
  },
  async resultInterview(req, res) {
    json(res, await operations.finishInterview(param(req), req.body));
  },
  async calendar(req, res) {
    json(res, await operations.events(req.query));
  },
  async exportCalendar(req, res) {
    const events = await operations.events(req.query);
    res
      .type("text/calendar")
      .set("Content-Disposition", 'attachment; filename="admisiones.ics"')
      .send(operations.ics(events));
  },
  async createEvent(req, res) {
    json(res, await operations.createEvent(req.body), 201);
  },
  async updateEvent(req, res) {
    json(res, await operations.updateEvent(param(req), req.body));
  },
  async finishEvent(req, res) {
    const { estado } = z
      .object({ estado: z.enum(["completado", "cancelado"]) })
      .strict()
      .parse(req.body);
    json(res, await operations.finishEvent(param(req), estado));
  },
  async budget(req, res) {
    json(res, await finance.budget(param(req), req.body));
  },
  async expense(req, res) {
    json(res, await finance.expense(param(req), req.body), 201);
  },
  async expenses(req, res) {
    const campaign = param(req);
    await operations.required(Campania, campaign);
    await paged(Gasto, req, res, {
      where: { campaniaId: campaign },
      order: [
        ["fecha", "DESC"],
        ["id", "DESC"],
      ],
    });
  },
  async cancelExpense(req, res) {
    const { motivo } = z
      .object({ motivo: v.text(500) })
      .strict()
      .parse(req.body);
    json(res, await finance.cancelExpense(param(req), motivo));
  },
  async finance(req, res) {
    json(res, await finance.report(req.query));
  },
  async images(req, res) {
    const campaign = req.query.campaniaId
      ? id.parse(req.query.campaniaId)
      : null;
    await paged(Imagen, req, res, {
      where: campaign ? { campaniaId: campaign } : {},
    });
  },
  async createImage(req, res) {
    json(res, images.view(await images.generate(req.body)), 201);
  },
  async retryImage(req, res) {
    v.revision
      .pick({})
      .strict()
      .parse(req.body || {});
    json(res, images.view(await images.retry(param(req))), 201);
  },
  async posts(req, res) {
    const f = z
      .object({
        red: z.enum(["facebook", "instagram"]).optional(),
        estado: z
          .enum([
            "borrador",
            "aprobada",
            "publicando",
            "procesando",
            "publicada",
            "error",
            "incierta",
          ])
          .optional(),
        campaniaId: id.optional(),
      })
      .parse(req.query);
    await paged(Publicacion, req, res, {
      where: f,
      include: publications.include,
    });
  },
  async createPost(req, res) {
    json(res, await publications.create(req.body), 201);
  },
  async editPost(req, res) {
    json(res, await publications.edit(param(req), req.body));
  },
  async approvePost(req, res) {
    json(res, await publications.approve(param(req), req.body));
  },
  async publishPost(req, res) {
    json(res, await publications.publish(param(req), req.body));
  },
  async reconcilePost(req, res) {
    const { externoId } = z
      .object({
        externoId: z
          .string()
          .regex(/^\d+(?:_\d+)?$/)
          .max(200),
      })
      .strict()
      .parse(req.body);
    json(res, await publications.reconcile(param(req), externoId));
  },
  async postHistory(req, res) {
    const publication = param(req);
    await operations.required(Publicacion, publication);
    json(
      res,
      await PublicacionEvento.findAll({
        where: { publicacionId: publication },
        order: [
          ["fecha", "DESC"],
          ["id", "DESC"],
        ],
      }),
    );
  },
  async integrations(req, res) {
    json(res, publications.integrations());
  },
  async verifyIntegrations(req, res) {
    json(res, await publications.verify());
  },
  async approveCampaign(req, res) {
    z.object({})
      .strict()
      .parse(req.body || {});
    const c = await operations.required(Campania, param(req));
    await c.update({ estado: "aprobada" });
    json(res, c);
  },
};
