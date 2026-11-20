const { DataTypes: D } = require("sequelize");
module.exports = {
  async up(q) {
    const id = {
      type: D.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    };
    const date = { type: D.DATE, allowNull: false };
    const ts = { createdAt: date, updatedAt: date };
    const fk = (model, nullable = false) => ({
      type: D.INTEGER,
      allowNull: nullable,
      references: { model, key: "id" },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    await q.createTable("Sedes", {
      id,
      nombre: { type: D.STRING(80), allowNull: false, unique: true },
      ...ts,
    });
    await q.createTable("Etapas", {
      id,
      nombre: { type: D.STRING(80), allowNull: false },
      orden: { type: D.INTEGER, allowNull: false, unique: true },
      metaConversion: D.DECIMAL(5, 2),
      ...ts,
    });
    await q.createTable("Prospectos", {
      id,
      nombre: { type: D.STRING(120), allowNull: false },
      correo: D.STRING(254),
      telefono: D.STRING(30),
      sedeId: fk("Sedes"),
      etapaActualId: fk("Etapas"),
      canalOrigen: { type: D.STRING(30), allowNull: false },
      observaciones: D.TEXT,
      fechaIngreso: date,
      fechaUltimoAvance: date,
      ...ts,
    });
    await q.createTable("HistorialEtapas", {
      id,
      prospectoId: fk("Prospectos"),
      etapaOrigenId: fk("Etapas", true),
      etapaDestinoId: fk("Etapas"),
      fechaCambio: date,
      comentario: D.STRING(1000),
    });
    await q.createTable("MensajeIA", {
      id,
      prospectoId: fk("Prospectos"),
      etapaId: fk("Etapas"),
      contenido: { type: D.TEXT, allowNull: false },
      proveedor: D.STRING(30),
      modelo: D.STRING(100),
      estado: {
        type: D.STRING(30),
        allowNull: false,
        defaultValue: "borrador",
      },
      fechaGeneracion: date,
      ...ts,
    });
    await q.addIndex("Prospectos", ["sedeId", "canalOrigen", "fechaIngreso"]);
    await q.addIndex("Prospectos", ["etapaActualId", "fechaUltimoAvance"]);
    await q.addIndex("HistorialEtapas", ["prospectoId", "etapaDestinoId"], {
      unique: true,
    });
  },
  async down(q) {
    for (const t of [
      "MensajeIA",
      "HistorialEtapas",
      "Prospectos",
      "Etapas",
      "Sedes",
    ])
      await q.dropTable(t);
  },
};
