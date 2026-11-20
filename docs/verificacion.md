# Verificación de entrega — 20 de noviembre de 2026

- `npm run format`: correcto; código fuente, migraciones, seeders y pruebas formateados con Prettier.
- `NODE_ENV=test` y `RUN_DB_TESTS=true`, `npm test`: 24 pruebas aprobadas, cero fallos y cero omitidas.
- `npm run build`: correcto con Vite 6.4.6; 1.615 módulos transformados y artefactos generados en `frontend/dist`.
- MySQL: núcleo, campañas y módulos operativos verificados con migraciones reales y una base de pruebas separada.
- CRM: 40 personas iniciales, nueve etapas, dos sedes, historial coherente, avance transaccional y bloqueo de concurrencia.
- Procesos: lista de espera, exclusión y reactivación conservan etapa y fechas; cada cambio queda auditado con motivo.
- Entrevistas y calendario: conflictos, reprogramación, asistencia, revisión de resultados y exportación ICS probados.
- Finanzas: presupuesto, gastos concurrentes, anulaciones, monedas separadas y costo por admitido verificados con centavos exactos.
- Imágenes: configuración ausente explícita, validación, JPEG normalizado, persistencia y reintento probados con proveedor simulado.
- Publicaciones: revisión, aprobación exacta, cuenta destino, concurrencia, Instagram y conciliación de estados inciertos probados sin duplicar envíos.
- Groq: generación de campañas con tres textos y respuesta estructurada probada; los errores no exponen credenciales.
- Seguridad de entrega: `backend/.env` está ignorado; los archivos `.env.example` no contienen contraseñas, tokens ni claves.

## Pendientes externos

- La generación real de imágenes requiere configurar un proveedor compatible en `backend/.env`.
- La publicación real en Facebook e Instagram requiere una aplicación Meta, permisos, cuentas conectadas, token y una URL pública HTTPS para las imágenes.
- No se ejecutaron publicaciones reales ni llamadas pagadas a proveedores durante esta verificación.
- La revisión visual automatizada de escritorio y móvil no pudo ejecutarse porque el navegador de automatización no estaba disponible; la compilación y las rutas API sí fueron verificadas.
- Antes de exponer el sistema en Internet se debe agregar autenticación/autorización y revisar los avisos moderados de dependencias documentados en el README.
