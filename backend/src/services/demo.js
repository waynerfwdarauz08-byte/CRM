const names = [
  "Prospecto",
  "Candidato",
  "Agenda Campus Day",
  "Asiste Campus Day",
  "Prueba Técnica",
  "Entrevista",
  "Admitido",
  "Semana de Prueba",
  "Estudiante",
];
const goals = [70, 70, 75, 80, 75, 70, 85, 90, null];
const channels = ["Instagram", "Facebook", "Referido", "Sitio web", "Otro"];
const distribution = [7, 6, 15, 3, 2, 1, 1, 1, 4];
function demo(now = new Date()) {
  const personas = [],
    historial = [];
  let n = 0;
  distribution.forEach((count, index) => {
    for (let j = 0; j < count; j++) {
      n++;
      const last = new Date(+now - (j % 2 === 0 ? 1 : 5 + j) * 86400000);
      const first = new Date(+last - index * 2 * 86400000);
      personas.push({
        id: 100000 + n,
        nombre: "Persona Demo " + String(n).padStart(3, "0"),
        correo: "prospecto" + String(n).padStart(3, "0") + "@example.com",
        telefono: null,
        sedeId: 1 + (n % 2),
        etapaActualId: index + 1,
        canalOrigen: channels[n % 5],
        observaciones: "Datos ficticios para el taller.",
        fechaIngreso: first,
        fechaUltimoAvance: last,
        createdAt: first,
        updatedAt: last,
      });
      for (let k = 0; k <= index; k++)
        historial.push({
          prospectoId: 100000 + n,
          etapaOrigenId: k || null,
          etapaDestinoId: k + 1,
          fechaCambio: new Date(+first + k * 2 * 86400000),
          comentario: k ? "Avance de demostración" : "Registro inicial",
        });
    }
  });
  return { personas, historial };
}
module.exports = { names, goals, channels, distribution, demo };
