const { Sequelize, DataTypes: D } = require("sequelize");
const config =
  require("../config/database")[process.env.NODE_ENV || "development"];
const db = new Sequelize(config);
const opts = { timestamps: true };
const Sede = db.define(
  "Sede",
  { nombre: { type: D.STRING(80), allowNull: false, unique: true } },
  opts,
);
const Etapa = db.define(
  "Etapa",
  {
    nombre: { type: D.STRING(80), allowNull: false },
    orden: { type: D.INTEGER, allowNull: false, unique: true },
    metaConversion: D.DECIMAL(5, 2),
  },
  opts,
);
const Prospecto = db.define(
  "Prospecto",
  {
    nombre: { type: D.STRING(120), allowNull: false },
    correo: D.STRING(254),
    telefono: D.STRING(30),
    sedeId: { type: D.INTEGER, allowNull: false },
    etapaActualId: { type: D.INTEGER, allowNull: false },
    canalOrigen: { type: D.STRING(30), allowNull: false },
    observaciones: D.TEXT,
    estadoProceso: {
      type: D.STRING(20),
      allowNull: false,
      defaultValue: "activo",
    },
    campaniaOrigenId: D.INTEGER,
    fechaIngreso: { type: D.DATE, allowNull: false },
    fechaUltimoAvance: { type: D.DATE, allowNull: false },
  },
  opts,
);
const HistorialEtapa = db.define(
  "HistorialEtapa",
  {
    prospectoId: { type: D.INTEGER, allowNull: false },
    etapaOrigenId: D.INTEGER,
    etapaDestinoId: { type: D.INTEGER, allowNull: false },
    fechaCambio: { type: D.DATE, allowNull: false },
    comentario: D.STRING(1000),
  },
  { timestamps: false },
);
const MensajeIA = db.define(
  "MensajeIA",
  {
    prospectoId: { type: D.INTEGER, allowNull: false },
    etapaId: { type: D.INTEGER, allowNull: false },
    contenido: { type: D.TEXT, allowNull: false },
    proveedor: D.STRING(30),
    modelo: D.STRING(100),
    estado: { type: D.STRING(30), defaultValue: "borrador" },
    fechaGeneracion: { type: D.DATE, allowNull: false },
  },
  opts,
);
Prospecto.belongsTo(Sede, { foreignKey: "sedeId", as: "sede" });
Sede.hasMany(Prospecto, { foreignKey: "sedeId" });
Prospecto.belongsTo(Etapa, { foreignKey: "etapaActualId", as: "etapa" });
Prospecto.hasMany(HistorialEtapa, {
  foreignKey: "prospectoId",
  as: "historial",
});
HistorialEtapa.belongsTo(Etapa, { foreignKey: "etapaOrigenId", as: "origen" });
HistorialEtapa.belongsTo(Etapa, {
  foreignKey: "etapaDestinoId",
  as: "destino",
});
Prospecto.hasMany(MensajeIA, { foreignKey: "prospectoId", as: "mensajes" });
MensajeIA.belongsTo(Etapa, { foreignKey: "etapaId", as: "etapa" });
const Campania = db.define(
  "Campania",
  {
    objetivo: { type: D.STRING(1000), allowNull: false },
    sedeId: { type: D.INTEGER, allowNull: false },
    textos: { type: D.JSON, allowNull: false },
    presupuesto: { type: D.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    moneda: { type: D.STRING(3), allowNull: false, defaultValue: "CRC" },
    estado: { type: D.STRING(40), defaultValue: "pendiente_aprobacion" },
    proveedor: D.STRING(30),
    modelo: D.STRING(100),
  },
  { ...opts, tableName: "Campanias" },
);
Campania.belongsTo(Sede, { foreignKey: "sedeId", as: "sede" });
const HistorialEstado = db.define(
  "HistorialEstado",
  {
    prospectoId: D.INTEGER,
    estadoAnterior: D.STRING(20),
    estadoNuevo: D.STRING(20),
    motivo: D.STRING(1000),
    fechaCambio: D.DATE,
  },
  { timestamps: false, tableName: "HistorialEstados" },
);
const Evento = db.define(
  "Evento",
  {
    sedeId: D.INTEGER,
    prospectoId: D.INTEGER,
    titulo: D.STRING(160),
    tipo: D.STRING(30),
    inicio: D.DATE,
    fin: D.DATE,
    responsable: D.STRING(120),
    lugar: D.STRING(200),
    estado: { type: D.STRING(20), defaultValue: "programado" },
    notas: D.TEXT,
  },
  { ...opts, tableName: "Eventos" },
);
const Entrevista = db.define(
  "Entrevista",
  {
    eventoId: D.INTEGER,
    prospectoId: D.INTEGER,
    estado: { type: D.STRING(20), defaultValue: "programada" },
    resultado: { type: D.STRING(20), defaultValue: "pendiente" },
    notas: D.TEXT,
  },
  { ...opts, tableName: "Entrevistas" },
);
const Gasto = db.define(
  "Gasto",
  {
    campaniaId: D.INTEGER,
    concepto: D.STRING(200),
    monto: D.DECIMAL(12, 2),
    fecha: D.DATEONLY,
    anulado: { type: D.BOOLEAN, defaultValue: false },
    motivoAnulacion: D.STRING(500),
  },
  { ...opts, tableName: "Gastos" },
);
const Imagen = db.define(
  "Imagen",
  {
    campaniaId: D.INTEGER,
    prompt: D.STRING(3000),
    modelo: D.STRING(100),
    tamano: { type: D.STRING(20), defaultValue: "1024x1024" },
    estado: D.STRING(20),
    archivo: D.STRING(100),
    error: D.STRING(300),
  },
  { ...opts, tableName: "Imagenes" },
);
const Publicacion = db.define(
  "Publicacion",
  {
    campaniaId: D.INTEGER,
    imagenId: D.INTEGER,
    red: D.STRING(20),
    texto: D.STRING(2200),
    estado: { type: D.STRING(30), defaultValue: "borrador" },
    revision: { type: D.INTEGER, defaultValue: 1 },
    revisionAprobada: D.INTEGER,
    cuentaDestino: D.STRING(100),
    fechaAprobacion: D.DATE,
    fechaPublicacion: D.DATE,
    externoId: D.STRING(200),
    url: D.STRING(500),
    contenedorId: D.STRING(200),
    error: D.STRING(300),
  },
  { ...opts, tableName: "Publicaciones" },
);
const PublicacionEvento = db.define(
  "PublicacionEvento",
  {
    publicacionId: D.INTEGER,
    tipo: D.STRING(30),
    detalle: D.STRING(500),
    fecha: D.DATE,
  },
  { timestamps: false, tableName: "PublicacionEventos" },
);
Prospecto.belongsTo(Campania, {
  foreignKey: "campaniaOrigenId",
  as: "campaniaOrigen",
});
HistorialEstado.belongsTo(Prospecto, {
  foreignKey: "prospectoId",
  as: "prospecto",
});
Evento.belongsTo(Sede, { foreignKey: "sedeId", as: "sede" });
Evento.belongsTo(Prospecto, { foreignKey: "prospectoId", as: "prospecto" });
Entrevista.belongsTo(Evento, { foreignKey: "eventoId", as: "evento" });
Entrevista.belongsTo(Prospecto, { foreignKey: "prospectoId", as: "prospecto" });
Gasto.belongsTo(Campania, { foreignKey: "campaniaId", as: "campania" });
Imagen.belongsTo(Campania, { foreignKey: "campaniaId", as: "campania" });
Publicacion.belongsTo(Campania, { foreignKey: "campaniaId", as: "campania" });
Publicacion.belongsTo(Imagen, { foreignKey: "imagenId", as: "imagen" });
Publicacion.hasMany(PublicacionEvento, {
  foreignKey: "publicacionId",
  as: "historial",
});
module.exports = {
  HistorialEstado,
  Evento,
  Entrevista,
  Gasto,
  Imagen,
  Publicacion,
  PublicacionEvento,
  db,
  Sede,
  Etapa,
  Prospecto,
  HistorialEtapa,
  MensajeIA,
  Campania,
};
