const { DataTypes: D } = require("sequelize");
module.exports = {
  async up(q) {
    const pk = {
      type: D.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    };
    const date = { type: D.DATE, allowNull: false };
    const ts = { createdAt: date, updatedAt: date };
    const fk = (table, nullable = false) => ({
      type: D.INTEGER,
      allowNull: nullable,
      references: { model: table, key: "id" },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    await q.addColumn("Prospectos", "estadoProceso", {
      type: D.STRING(20),
      allowNull: false,
      defaultValue: "activo",
    });
    await q.addColumn("Prospectos", "campaniaOrigenId", fk("Campanias", true));
    await q.addColumn("Campanias", "presupuesto", {
      type: D.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await q.addColumn("Campanias", "moneda", {
      type: D.STRING(3),
      allowNull: false,
      defaultValue: "CRC",
    });
    await q.createTable("HistorialEstados", {
      id: pk,
      prospectoId: fk("Prospectos"),
      estadoAnterior: { type: D.STRING(20), allowNull: false },
      estadoNuevo: { type: D.STRING(20), allowNull: false },
      motivo: { type: D.STRING(1000), allowNull: false },
      fechaCambio: date,
    });
    await q.createTable("Eventos", {
      id: pk,
      sedeId: fk("Sedes"),
      prospectoId: fk("Prospectos", true),
      titulo: { type: D.STRING(160), allowNull: false },
      tipo: { type: D.STRING(30), allowNull: false },
      inicio: date,
      fin: date,
      responsable: { type: D.STRING(120), allowNull: false },
      lugar: { type: D.STRING(200), allowNull: false },
      estado: {
        type: D.STRING(20),
        allowNull: false,
        defaultValue: "programado",
      },
      notas: D.TEXT,
      ...ts,
    });
    await q.createTable("Entrevistas", {
      id: pk,
      eventoId: { ...fk("Eventos"), unique: true },
      prospectoId: fk("Prospectos"),
      estado: {
        type: D.STRING(20),
        allowNull: false,
        defaultValue: "programada",
      },
      resultado: {
        type: D.STRING(20),
        allowNull: false,
        defaultValue: "pendiente",
      },
      notas: D.TEXT,
      ...ts,
    });
    await q.createTable("Gastos", {
      id: pk,
      campaniaId: fk("Campanias"),
      concepto: { type: D.STRING(200), allowNull: false },
      monto: { type: D.DECIMAL(12, 2), allowNull: false },
      fecha: { type: D.DATEONLY, allowNull: false },
      anulado: { type: D.BOOLEAN, allowNull: false, defaultValue: false },
      motivoAnulacion: D.STRING(500),
      ...ts,
    });
    await q.createTable("Imagenes", {
      id: pk,
      campaniaId: fk("Campanias", true),
      prompt: { type: D.STRING(3000), allowNull: false },
      modelo: { type: D.STRING(100), allowNull: false },
      estado: { type: D.STRING(20), allowNull: false },
      archivo: D.STRING(100),
      error: D.STRING(300),
      ...ts,
    });
    await q.createTable("Publicaciones", {
      id: pk,
      campaniaId: fk("Campanias"),
      imagenId: fk("Imagenes", true),
      red: { type: D.STRING(20), allowNull: false },
      texto: { type: D.STRING(2200), allowNull: false },
      estado: {
        type: D.STRING(30),
        allowNull: false,
        defaultValue: "borrador",
      },
      revision: { type: D.INTEGER, allowNull: false, defaultValue: 1 },
      revisionAprobada: D.INTEGER,
      cuentaDestino: D.STRING(100),
      fechaAprobacion: D.DATE,
      fechaPublicacion: D.DATE,
      externoId: D.STRING(200),
      url: D.STRING(500),
      contenedorId: D.STRING(200),
      error: D.STRING(300),
      ...ts,
    });
    await q.createTable("PublicacionEventos", {
      id: pk,
      publicacionId: fk("Publicaciones"),
      tipo: { type: D.STRING(30), allowNull: false },
      detalle: { type: D.STRING(500), allowNull: false },
      fecha: date,
    });
    await q.addIndex("Prospectos", ["estadoProceso", "sedeId"]);
    await q.addIndex("Eventos", ["sedeId", "responsable", "inicio", "fin"]);
    await q.addIndex("Entrevistas", ["prospectoId", "estado"]);
    await q.addIndex("Gastos", ["campaniaId", "fecha", "anulado"]);
    await q.addIndex("Publicaciones", ["estado", "createdAt"]);
  },
  async down(q) {
    for (const t of [
      "PublicacionEventos",
      "Publicaciones",
      "Imagenes",
      "Gastos",
      "Entrevistas",
      "Eventos",
      "HistorialEstados",
    ])
      await q.dropTable(t);
    await q.removeColumn("Prospectos", "campaniaOrigenId");
    await q.removeColumn("Prospectos", "estadoProceso");
    await q.removeColumn("Campanias", "moneda");
    await q.removeColumn("Campanias", "presupuesto");
  },
};
