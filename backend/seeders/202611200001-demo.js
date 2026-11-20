const { names, goals, demo } = require("../src/services/demo");
module.exports = {
  async up(q) {
    await q.sequelize.transaction(async (transaction) => {
      const o = { transaction };
      const now = new Date();
      for (const [id, nombre] of [
        [1, "Puntarenas"],
        [2, "Desamparados"],
      ]) {
        const [rows] = await q.sequelize.query(
          "SELECT nombre FROM Sedes WHERE id=:id",
          { replacements: { id }, transaction },
        );
        if (rows.length && rows[0].nombre !== nombre)
          throw Error("El catálogo de sedes no coincide.");
        if (!rows.length)
          await q.bulkInsert(
            "Sedes",
            [{ id, nombre, createdAt: now, updatedAt: now }],
            o,
          );
      }
      for (let i = 0; i < names.length; i++) {
        const [rows] = await q.sequelize.query(
          "SELECT nombre,orden,metaConversion FROM Etapas WHERE id=:id",
          { replacements: { id: i + 1 }, transaction },
        );
        if (
          rows.length &&
          (rows[0].nombre !== names[i] ||
            rows[0].orden !== i + 1 ||
            (rows[0].metaConversion === null
              ? null
              : Number(rows[0].metaConversion)) !== goals[i])
        )
          throw Error("El catálogo de etapas no coincide.");
        if (!rows.length)
          await q.bulkInsert(
            "Etapas",
            [
              {
                id: i + 1,
                nombre: names[i],
                orden: i + 1,
                metaConversion: goals[i],
                createdAt: now,
                updatedAt: now,
              },
            ],
            o,
          );
      }
      const { personas, historial } = demo(now);
      await q.bulkInsert("Prospectos", personas, o);
      await q.bulkInsert("HistorialEtapas", historial, o);
    });
  },
  async down(q) {
    const { Op } = require("sequelize");
    await q.sequelize.transaction(async (transaction) => {
      const [rows] = await q.sequelize.query(
        "SELECT id,nombre,correo FROM Prospectos WHERE id BETWEEN 100001 AND 100040",
        { transaction },
      );
      for (const row of rows) {
        const number = String(row.id - 100000).padStart(3, "0");
        if (
          row.nombre !== "Persona Demo " + number ||
          row.correo !== "prospecto" + number + "@example.com"
        )
          throw Error(
            "Restablecimiento cancelado: se modificó la identidad de un registro demo.",
          );
      }
      const where = { prospectoId: { [Op.between]: [100001, 100040] } };
      await q.bulkDelete("MensajeIA", where, { transaction });
      await q.bulkDelete("HistorialEtapas", where, { transaction });
      await q.bulkDelete(
        "Prospectos",
        {
          id: { [Op.between]: [100001, 100040] },
          correo: { [Op.like]: "%@example.com" },
        },
        { transaction },
      );
    });
  },
};
