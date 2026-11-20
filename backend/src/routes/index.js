const router = require("express").Router();
const c = require("../controllers/crm");
const { rateLimit } = require("express-rate-limit");
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res)).catch(next);
const limiter = rateLimit({
  windowMs: 60000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      code: "LIMITE_IA",
      message: "Esperá un minuto antes de generar más mensajes.",
    },
  },
});
router.get("/salud", wrap(c.health));
router.get("/sedes", wrap(c.sedes));
router.get("/etapas", wrap(c.etapas));
router.get("/embudo", wrap(c.funnel));
router.get("/tablero", wrap(c.board));
router.get("/atencion", wrap(c.attention));
router.route("/prospectos").get(wrap(c.list)).post(wrap(c.create));
router.route("/prospectos/:id").get(wrap(c.detail)).patch(wrap(c.update));
router.patch("/prospectos/:id/etapa", wrap(c.advance));
router.get("/prospectos/:id/historial", wrap(c.history));
router.get("/prospectos/:id/mensajes", wrap(c.messages));
router.post("/prospectos/:id/mensaje", limiter, wrap(c.message));
const campaigns = require("../controllers/campaigns");
router.get("/campanias", wrap(campaigns.list));
router.post("/campanias", limiter, wrap(campaigns.create));
module.exports = router;
