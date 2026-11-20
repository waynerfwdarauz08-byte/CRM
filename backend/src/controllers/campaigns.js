const { Campania, Sede } = require("../models");
const service = require("../services/campaigns");
const { z } = require("zod");
module.exports = {
  async create(req, res) {
    res.status(201).json({ data: await service.create(req.body) });
  },
  async list(req, res) {
    const { page, limit } = z
      .object({
        page: z.coerce.number().int().min(1).max(100000).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(10),
      })
      .parse(req.query);
    const { rows, count } = await Campania.findAndCountAll({
      include: [{ model: Sede, as: "sede" }],
      order: [
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
      limit,
      offset: (page - 1) * limit,
    });
    res.json({
      data: rows,
      meta: { total: count, page, limit, pages: Math.ceil(count / limit) },
    });
  },
};
