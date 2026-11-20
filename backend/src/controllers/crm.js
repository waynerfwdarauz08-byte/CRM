const { Op } = require("sequelize");
const {
  db,
  Sede,
  Etapa,
  Prospecto,
  HistorialEtapa,
  MensajeIA,
} = require("../models");
const v = require("../middlewares/validation");
const service = require("../services/prospectos");
const { metrics, DAY } = require("../services/metrics");
const ai = require("../services/ai");
const { AppError } = require("../middlewares/errors");
const json = (res, data, status = 200) => res.status(status).json({ data });
module.exports = {
  async health(req, res) {
    await db.authenticate();
    json(res, { estado: "ok", baseDatos: "conectada" });
  },
  async sedes(req, res) {
    json(res, await Sede.findAll({ order: [["id", "ASC"]] }));
  },
  async etapas(req, res) {
    json(res, await Etapa.findAll({ order: [["orden", "ASC"]] }));
  },
  async create(req, res) {
    json(res, await service.register(v.contact.parse(req.body)), 201);
  },
  async update(req, res) {
    const id = v.id.parse(req.params.id);
    const data = v.contact
      .partial()
      .refine((x) => Object.keys(x).length > 0, "No hay campos para editar")
      .parse(req.body);
    const result = await db.transaction(async (transaction) => {
      const p = await Prospecto.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!p) throw new AppError(404, "Prospecto no encontrado.");
      if (data.sedeId && !(await Sede.findByPk(data.sedeId, { transaction })))
        throw new AppError(400, "Sede inválida.");
      if (data.sedeId && data.sedeId !== p.sedeId && p.campaniaOrigenId) {
        const c = await require("../models").Campania.findByPk(
          p.campaniaOrigenId,
          { transaction },
        );
        if (c && c.sedeId !== data.sedeId)
          throw new AppError(
            409,
            "Quitá la atribución de campaña antes de cambiar de sede.",
          );
      }
      await p.update(
        { ...data, ...(data.correo === "" ? { correo: null } : {}) },
        { transaction },
      );
      return service.get(id, { transaction });
    });
    json(res, result);
  },
  async advance(req, res) {
    json(
      res,
      await service.advance(
        v.id.parse(req.params.id),
        v.transition.parse(req.body),
      ),
    );
  },
  async detail(req, res) {
    json(res, await service.get(v.id.parse(req.params.id)));
  },
  async history(req, res) {
    const id = v.id.parse(req.params.id);
    await service.get(id);
    json(
      res,
      await HistorialEtapa.findAll({
        where: { prospectoId: id },
        include: [
          { model: Etapa, as: "origen" },
          { model: Etapa, as: "destino" },
        ],
        order: [
          ["fechaCambio", "ASC"],
          ["id", "ASC"],
        ],
      }),
    );
  },
  async messages(req, res) {
    const id = v.id.parse(req.params.id);
    await service.get(id);
    json(
      res,
      await MensajeIA.findAll({
        where: { prospectoId: id },
        include: [{ model: Etapa, as: "etapa" }],
        order: [
          ["fechaGeneracion", "DESC"],
          ["id", "DESC"],
        ],
      }),
    );
  },
  async list(req, res) {
    const f = v.list.parse(req.query);
    const where = {};
    if (f.sedeId) where.sedeId = f.sedeId;
    if (f.etapaId) where.etapaActualId = f.etapaId;
    if (f.estadoProceso) where.estadoProceso = f.estadoProceso;
    if (f.canalOrigen) where.canalOrigen = f.canalOrigen;
    if (f.q) {
      const term = f.q.replace(/[\\%_]/g, "\\$&");
      where[Op.or] = [
        { nombre: { [Op.like]: "%" + term + "%" } },
        { correo: { [Op.like]: "%" + term + "%" } },
      ];
    }
    const { rows, count } = await Prospecto.findAndCountAll({
      where,
      include: service.include,
      limit: f.limit,
      offset: (f.page - 1) * f.limit,
      order: [
        ["fechaIngreso", "DESC"],
        ["id", "DESC"],
      ],
    });
    res.json({
      data: rows,
      meta: {
        total: count,
        page: f.page,
        limit: f.limit,
        pages: Math.ceil(count / f.limit),
      },
    });
  },
  async funnel(req, res) {
    const filters = v.filters.parse(req.query);
    const result = await db.transaction(
      { isolationLevel: "REPEATABLE READ" },
      async (transaction) => {
        const people = await Prospecto.findAll({
          where: service.cohortWhere(filters),
          raw: true,
          transaction,
        });
        const stages = await Etapa.findAll({
          order: [["orden", "ASC"]],
          raw: true,
          transaction,
        });
        const history = people.length
          ? await HistorialEtapa.findAll({
              where: { prospectoId: { [Op.in]: people.map((p) => p.id) } },
              raw: true,
              transaction,
            })
          : [];
        return metrics(stages, people, history);
      },
    );
    json(res, result);
  },
  async board(req, res) {
    const f = v.filters.parse(req.query);
    const people = await Prospecto.findAll({
      where: service.cohortWhere(f),
      include: service.include,
      order: [
        ["fechaUltimoAvance", "ASC"],
        ["id", "ASC"],
      ],
    });
    json(res, people);
  },
  async attention(req, res) {
    const f = v.attention.parse(req.query);
    const where = {
      etapaActualId: { [Op.ne]: 9 },
      estadoProceso: "activo",
      fechaUltimoAvance: { [Op.lte]: new Date(Date.now() - f.dias * DAY) },
    };
    if (f.sedeId) where.sedeId = f.sedeId;
    const people = await Prospecto.findAll({
      where,
      include: service.include,
      order: [
        ["fechaUltimoAvance", "ASC"],
        ["id", "ASC"],
      ],
    });
    json(
      res,
      people.map((p) => ({
        ...p.toJSON(),
        diasTranscurridos: Math.floor(
          (Date.now() - +p.fechaUltimoAvance) / DAY,
        ),
      })),
    );
  },
  async message(req, res) {
    v.contact
      .pick({})
      .strict()
      .parse(req.body || {});
    const p = await service.get(v.id.parse(req.params.id));
    if (p.estadoProceso === "excluido")
      throw new AppError(
        409,
        "Reactivá al prospecto antes de generar mensajes de avance.",
      );
    const generated = await ai.generate(p);
    const fechaGeneracion = new Date();
    const message = await MensajeIA.create({
      ...generated,
      prospectoId: p.id,
      etapaId: p.etapaActualId,
      estado: "borrador",
      fechaGeneracion,
    });
    json(res, { ...message.toJSON(), etapa: p.etapa }, 201);
  },
};
