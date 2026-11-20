const router = require("express").Router();
const c = require("../controllers/operations");
const { rateLimit } = require("express-rate-limit");
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res)).catch(next);
const limited = rateLimit({
  windowMs: 60000,
  limit: 6,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      code: "LIMITE_PROVEEDOR",
      message: "Esperá un minuto antes de repetir la operación.",
    },
  },
});
router.patch("/prospectos/:id/estado", wrap(c.state));
router.get("/prospectos/:id/estados", wrap(c.stateHistory));
router.patch("/prospectos/:id/atribucion", wrap(c.attribute));
router.get("/entrevistas", wrap(c.interviews));
router.post("/entrevistas", wrap(c.createInterview));
router.put("/entrevistas/:id", wrap(c.moveInterview));
router.patch("/entrevistas/:id/resultado", wrap(c.resultInterview));
router.patch("/entrevistas/:id/revision", wrap(c.reviewInterview));
router.get("/calendario.ics", wrap(c.exportCalendar));
router.get("/calendario", wrap(c.calendar));
router.post("/calendario", wrap(c.createEvent));
router.put("/calendario/:id", wrap(c.updateEvent));
router.patch("/calendario/:id/estado", wrap(c.finishEvent));
router.get("/finanzas", wrap(c.finance));
router.patch("/campanias/:id/presupuesto", wrap(c.budget));
router.post("/campanias/:id/gastos", wrap(c.expense));
router.get("/campanias/:id/gastos", wrap(c.expenses));
router.post("/gastos/:id/anular", wrap(c.cancelExpense));
router.post("/campanias/:id/aprobar", wrap(c.approveCampaign));
router.get("/imagenes", wrap(c.images));
router.post("/imagenes", limited, wrap(c.createImage));
router.post("/imagenes/:id/reintentar", limited, wrap(c.retryImage));
router.get("/publicaciones", wrap(c.posts));
router.post("/publicaciones", wrap(c.createPost));
router.patch("/publicaciones/:id", wrap(c.editPost));
router.post("/publicaciones/:id/aprobar", wrap(c.approvePost));
router.post("/publicaciones/:id/publicar", limited, wrap(c.publishPost));
router.post("/publicaciones/:id/conciliar", limited, wrap(c.reconcilePost));
router.get("/publicaciones/:id/historial", wrap(c.postHistory));
router.get("/integraciones", wrap(c.integrations));
router.post("/integraciones/verificar", limited, wrap(c.verifyIntegrations));
module.exports = router;
