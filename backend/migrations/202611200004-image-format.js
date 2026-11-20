const { DataTypes: D } = require("sequelize");
module.exports = {
  async up(q) {
    await q.addColumn("Imagenes", "tamano", {
      type: D.STRING(20),
      allowNull: false,
      defaultValue: "1024x1024",
    });
  },
  async down(q) {
    await q.removeColumn("Imagenes", "tamano");
  },
};
