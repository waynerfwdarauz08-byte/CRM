class AppError extends Error {
  constructor(status, message, code = "SOLICITUD_INVALIDA") {
    super(message);
    this.status = status;
    this.code = code;
  }
}
module.exports = {
  AppError,
  errorHandler(err, req, res, next) {
    if (err.name === "ZodError")
      return res.status(400).json({
        error: {
          code: "VALIDACION",
          message: err.issues
            .map((x) => x.path.join(".") + ": " + x.message)
            .join("; "),
        },
      });
    if (err.type === "entity.parse.failed")
      return res.status(400).json({
        error: { code: "JSON_INVALIDO", message: "El JSON no es válido." },
      });
    if (err.type === "entity.too.large")
      return res.status(413).json({
        error: {
          code: "LIMITE_JSON",
          message: "La solicitud es demasiado grande.",
        },
      });
    const status =
      err.status || (err.name === "SequelizeUniqueConstraintError" ? 409 : 500);
    res.status(status).json({
      error: {
        code: err.code || "ERROR_INTERNO",
        message:
          status < 500 || err.status
            ? err.message
            : "No se pudo completar la operación. Comprobá la conexión del servidor.",
      },
    });
  },
};
