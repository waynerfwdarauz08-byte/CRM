require("./config/database");
const express = require("express");
const cors = require("cors");
const { errorHandler } = require("./middlewares/errors");
const app = express();
app.disable("x-powered-by");
app.use(
  cors({
    origin: (
      process.env.FRONTEND_URL || "http://localhost:5173,http://127.0.0.1:5173"
    )
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  }),
);
app.use(express.json({ limit: "32kb" }));
app.use(
  "/archivos",
  express.static(require("./services/images").uploads, {
    dotfiles: "deny",
    index: false,
    fallthrough: false,
    setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
  }),
);
app.use(require("./routes"));
app.use(require("./routes/operations"));
app.use((req, res) =>
  res
    .status(404)
    .json({ error: { code: "NO_ENCONTRADO", message: "Ruta no encontrada." } }),
);
app.use(errorHandler);
module.exports = app;
