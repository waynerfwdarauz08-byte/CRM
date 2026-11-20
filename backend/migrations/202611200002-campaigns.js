const { DataTypes: D } = require("sequelize");
module.exports = {
  async up(q) {
    await q.createTable("Campanias", {
      id: {
        type: D.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      objetivo: { type: D.STRING(1000), allowNull: false },
      sedeId: {
        type: D.INTEGER,
        allowNull: false,
        references: { model: "Sedes", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      textos: { type: D.JSON, allowNull: false },
      estado: {
        type: D.STRING(40),
        allowNull: false,
        defaultValue: "pendiente_aprobacion",
      },
      proveedor: D.STRING(30),
      modelo: D.STRING(100),
      createdAt: { type: D.DATE, allowNull: false },
      updatedAt: { type: D.DATE, allowNull: false },
    });
    await q.addIndex("Campanias", ["sedeId", "createdAt"]);
  },
  async down(q) {
    await q.dropTable("Campanias");
  },
};
