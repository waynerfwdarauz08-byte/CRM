# Admisiones CRM

CRM académico independiente para admisiones y mercadeo. No es una plataforma oficial de FWD ni pertenece a Nuevo Origen. Usa datos ficticios; no necesita datos reales de estudiantes.

Incluye dashboard, nueve etapas, prospectos e historial, seguimiento, mensajes con Groq, campañas de tres textos, entrevistas independientes, revisión de resultados, lista de espera, excluidos, calendario, presupuestos, gastos, costo por admitido, galería de imágenes con IA y publicación revisada en Facebook e Instagram.

## Estado de esta entrega

- La base de trabajo conserva los 40 prospectos originales y el registro adicional de tus pruebas.
- Las migraciones nuevas son aditivas; conservan prospectos, mensajes, campañas e historial.
- Groq está configurado en el archivo privado; la generación real de campañas fue probada.
- Entrevistas, estados, calendario, finanzas e integración de medios tienen pruebas con MySQL.
- Los proveedores de imágenes y Meta se prueban con respuestas simuladas: todavía faltan una API de imágenes y las credenciales de las cuentas sociales.
- No se publicaron contenidos en cuentas reales.
- Hay una demo limpia independiente con exactamente 40 personas; ver docs/demo-limpia.md.
- Resultado detallado de verificaciones y sus límites: docs/verificacion.md.

Esta versión mantiene el contexto de un equipo de admisiones, sin autenticación ni roles. Se ejecuta en loopback y requiere protección de acceso antes de exponerse públicamente. La publicación en redes viene desactivada. El sistema no realiza pagos, compra anuncios ni envía WhatsApp o correos.

## Tecnologías y estructura

Node.js 24 y npm 11 recomendados; MySQL 8, Express 4, Sequelize 6 con migraciones y CommonJS. React 19, Vite 6, JavaScript, React Router, CSS responsive y Sharp para normalizar imágenes. El lock compartido está en la raíz.

- frontend/src/components: formularios, confirmaciones, filtros y estados accesibles.
- frontend/src/pages: pantallas de admisiones, calendario, finanzas y mercadeo.
- frontend/src/routes → App.jsx → main.jsx → index.html: integración de React.
- backend/src/config, models, controllers, routes, middlewares, services: separación de responsabilidades.
- backend/src/app.js configura Express; server.js valida MySQL y abre el puerto.
- backend/migrations y backend/seeders: instalación explícita, sin sync.
- backend/tests: reglas, proveedores simulados, integración MySQL y persistencia.
- backend/uploads: imágenes generadas, privadas al repositorio; respaldar junto con MySQL.
- docs: modelo de datos, HTTP de ejemplo, integraciones, demo y verificaciones.
- scripts: demo limpia y empaquetado de entrega sin secretos.

## Instalación y actualización en Windows / VS Code

Abrí la carpeta ccrm en VS Code. Iniciá MySQL80. Si ya tenés backend/.env, conservá ese archivo: contiene tu configuración privada.

Instalación inicial desde la raíz:

```powershell
npm ci
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Los comandos Copy-Item son únicamente para una instalación nueva; no reemplaces una configuración existente. Creá bases nuevas desde MySQL Workbench:

```sql
CREATE DATABASE admisiones_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE admisiones_crm_test_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Completá DB_NAME, DB_USER, DB_PASSWORD y DB_TEST_NAME en backend/.env. Usá un usuario limitado a las bases del proyecto.

```powershell
npm run migrate -w backend
npm run seed -w backend
```

Para actualizar una instalación existente, usá npm ci y npm run migrate -w backend. No vuelvas a cargar el seeder ni restablezcas datos para actualizar módulos.

En dos terminales independientes:

```powershell
npm run dev:backend
```

```powershell
npm run dev:frontend
```

Abrí http://localhost:5173. API: http://localhost:3001. Reiniciá el backend después de modificar .env. Para compilar: npm run build; para iniciar la API sin watch: npm start -w backend. Un servidor estático de frontend/dist requiere fallback a index.html.

## Configuración privada

Backend:

- PORT y NODE_ENV; DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD.
- DB_TEST_NAME: base separada cuyo nombre empiece por admisiones_crm_test_.
- DB_SSL=true activa TLS con verificación; DB_SSL_CA acepta una ruta de CA. No se desactiva la verificación de certificados.
- FRONTEND_URL: orígenes CORS separados por comas; localhost:5173 y 127.0.0.1:5173 en el ejemplo.
- AI_API_KEY, AI_BASE_URL, AI_MODEL, AI_TIMEOUT_MS: generación de textos con Groq.
- IMAGE_API_KEY, IMAGE_BASE_URL, IMAGE_MODEL, IMAGE_RESPONSE_FORMAT: proveedor de imágenes.
- META_GRAPH_VERSION, META_PAGE_ID, META_INSTAGRAM_ACCOUNT_ID, META_PAGE_ACCESS_TOKEN: cuentas sociales.
- SOCIAL_PUBLISH_ENABLED=false por defecto; habilitar solo después de configurar las cuentas.
- MEDIA_PUBLIC_BASE_URL: URL HTTPS pública que sirve los archivos de backend/uploads.

Frontend: únicamente VITE_API_BASE_URL. No se colocan claves en variables VITE_, archivos de ejemplo ni código. Ver docs/integraciones.md para conexión y permisos.

## Flujo de uso

1. Registrar prospectos, consultar su ficha y avanzar únicamente a la siguiente etapa.
2. Cambiar su estado a espera o excluido con un motivo; reactivar sin perder historial.
3. Programar entrevistas y actividades; registrar asistencia y revisar resultados pendientes.
4. Generar campañas con Groq, revisar los tres textos y aprobar la campaña.
5. Asignar un presupuesto, registrar gastos y atribuir prospectos a la campaña desde su ficha.
6. Configurar un proveedor de imágenes para generar y revisar piezas visuales.
7. Crear un borrador de publicación, seleccionar imagen, revisar el texto y la cuenta, aprobar la revisión y confirmar el envío real.

La aprobación de una campaña no publica sus textos. Cada pieza exige aprobación propia. Editar una pieza invalida la aprobación. Instagram necesita cuenta profesional e imagen accesible por HTTPS público; Facebook publica en Páginas, no en perfiles personales.

## API y respuestas

Éxito: {"data": ...}. Los listados paginados agregan {"meta":{"total":40,"page":1,"limit":20,"pages":2}}. Error: {"error":{"code":"...","message":"..."}}. JSON limitado a 32 KiB. Se usan 400 para validación, 404 para recursos ausentes, 409 para conflictos, 429 para límites y 502/503/504 para errores o configuración de proveedores.

Rutas obligatorias:

- POST /prospectos: nombre, sedeId y canalOrigen; contacto y observaciones opcionales. Devuelve 201 y etapa Prospecto.
- PATCH /prospectos/:id/etapa: etapaId y comentario opcional.
- GET /embudo: sedeId, canalOrigen, fechaDesde y fechaHasta opcionales.
- GET /atencion?dias=3: días enteros entre 1 y 3650, sedeId opcional.
- POST /prospectos/:id/mensaje: cuerpo {}; genera y guarda un borrador con etapa y sede.

Auxiliares de admisiones:

- GET /salud, /sedes, /etapas.
- GET /prospectos: búsqueda q, etapaId, sedeId, canalOrigen, estadoProceso, page y limit (máximo 100).
- GET /prospectos/:id, /prospectos/:id/historial y /prospectos/:id/mensajes.
- PATCH /prospectos/:id: datos de contacto, nombre, sede, canal y observaciones.
- PATCH /prospectos/:id/estado: estado y motivo obligatorio; GET /prospectos/:id/estados.
- PATCH /prospectos/:id/atribucion: campaniaId o null.
- GET /tablero: población completa, sin reutilizar una página parcial.

Entrevistas y calendario:

- GET/POST /entrevistas; filtros estado, resultado, prospectoId, sedeId y paginación.
- PUT /entrevistas/:id para reprogramar.
- PATCH /entrevistas/:id/resultado para asistencia/resultado; PATCH /entrevistas/:id/revision para revisar un resultado pendiente.
- GET/POST /calendario, PUT /calendario/:id y PATCH /calendario/:id/estado.
- GET /calendario.ics exporta eventos y entrevistas con fechas UTC.

Mercadeo:

- GET/POST /campanias; POST /campanias/:id/aprobar.
- PATCH /campanias/:id/presupuesto; GET/POST /campanias/:id/gastos.
- POST /gastos/:id/anular, con motivo.
- GET /finanzas: sedeId, campaniaId y período opcionales.
- GET/POST /imagenes; POST /imagenes/:id/reintentar.
- GET/POST /publicaciones; PATCH /publicaciones/:id.
- POST /publicaciones/:id/aprobar, /publicar y /conciliar; GET /publicaciones/:id/historial.
- GET /integraciones muestra configuración sin secretos; POST /integraciones/verificar consulta las cuentas de Meta sin publicar.

Ejemplos ejecutables: docs/api.http. Las operaciones de generación pueden consumir créditos y /publicar envía contenido real cuando está configurado y aprobado.

## Reglas del proceso y calendario

Las etapas fijas son: Prospecto, Candidato, Agenda Campus Day, Asiste Campus Day, Prueba Técnica, Entrevista, Admitido, Semana de Prueba y Estudiante. Todo registro inicia en Prospecto con su evento inicial en una transacción. Solo se avanza a la siguiente; no hay saltos, retrocesos ni eliminación de prospectos.

El avance bloquea la fila en MySQL, actualiza fechaUltimoAvance y agrega historial en la misma transacción. Editar contacto u observaciones no reinicia el plazo. Para cambiar de sede con una campaña atribuida, primero se retira la atribución incompatible.

Activo, espera y excluido son estados separados de las nueve etapas. Solo los activos pueden avanzar o recibir citas nuevas. Atención excluye personas en espera, excluidas y estudiantes. El embudo histórico conserva todas las personas para no ocultar resultados. No se infiere abandono por falta de avance.

Las entrevistas no cambian automáticamente etapas, admisión o exclusión. Sus resultados se registran manualmente. Se bloquean superposiciones del mismo responsable en la misma sede mediante transacción y bloqueo de sede. Dos citas adyacentes son válidas. No se implementa un catálogo global de disponibilidad del personal entre sedes. Poner una persona en espera no cancela sus citas: se revisan explícitamente en calendario.

Se guardan instantes UTC y se muestran en America/Costa_Rica. Los formularios de calendario interpretan la hora en Costa Rica. El rango de calendario incluye actividades que se superponen al período. El calendario .ics permite importación manual; no representa sincronización bidireccional con Google u Outlook.

## Métricas del embudo y finanzas

El embudo cuenta personas únicas desde HistorialEtapa:

- Conversión = alcanzaronSiguiente / alcanzaronEtapa × 100.
- Fuga provisional / sin avance = (alcanzaronEtapa − alcanzaronSiguiente) / alcanzaronEtapa × 100.
- Brecha = max(meta − conversión, 0), en puntos porcentuales.
- Días promedio: diferencia entre entradas consecutivas solo para quienes completaron la transición.

Denominador cero: null y “Sin datos”. Estudiante no tiene transición siguiente. Las fechas del dashboard seleccionan por fechaIngreso y se calcula el progreso hasta hoy; no es una fotografía histórica. Las metas son 70, 70, 75, 80, 75, 70, 85 y 90 %. Solo la referencia de asistencia 75 % proviene del taller; las demás son supuestos académicos. No haber avanzado todavía no significa abandono confirmado.

Finanzas usa importes de dos decimales y sumas en centavos:

- Saldo = presupuesto − gastos vigentes acumulados.
- Gasto del período = registros no anulados cuyas fechas están en el rango.
- Admitidos del período = personas atribuidas a la campaña que llegaron por primera vez a la etapa 7 dentro del rango, aunque hoy estén más adelante.
- Costo por admitido = gasto del período / admitidos del período; null si no hay admitidos.

La atribución es manual y única a una campaña de la misma sede. Si se cambia, el reporte histórico se recalcula con la atribución actual; no es un modelo de atribución causal ni un CAC completo. Los admitidos sin atribución se informan aparte. CRC y USD nunca se suman entre sí ni se convierten automáticamente.

Los gastos no superan el presupuesto ni aceptan fechas futuras. Dos gastos simultáneos bloquean la campaña. Un gasto se anula con motivo, conservando el registro. No se cambia la moneda después de registrar gastos, ni siquiera si se anulan.

## IA y publicación

Groq usa AI_BASE_URL=https://api.groq.com/openai/v1; AI_MODEL debe estar habilitado en tu cuenta. La configuración privada actual usa openai/gpt-oss-20b. El servicio no incluye una clave ni modelo por defecto en el código.

El mensaje incluye etapa, sede y objetivo; no envía contacto, observaciones ni historial al proveedor. El prompt pide español cordial, brevedad y acción concreta, sin inventar fechas, becas, precios, enlaces o resultados. Campañas solicita exactamente tres textos, valida JSON y conserva pendiente_aprobacion como estado inicial. Se usan respuestas estructuradas y margen de tokens para evitar truncamiento.

Imágenes usa una API compatible con POST /images/generations que devuelva b64_json. Valida tamaño y decodificación, convierte a JPEG y elimina metadatos. Las proporciones extremas reciben márgenes para ser compatibles con una publicación de Instagram. Se almacena el formato solicitado para los reintentos. La configuración ausente produce 503, nunca una imagen simulada.

Publicaciones pasa por borrador, aprobada y publicando; Meta debe confirmar el ID antes de marcar publicada. Instagram conserva el contenedor si sigue procesando. Un timeout, reinicio durante el envío o respuesta ambigua marca incierta y bloquea repeticiones. La conciliación requiere verificar el ID, la cuenta y el texto en Meta. No hay publicación programada automática ni sincronización de comentarios, anuncios o métricas sociales. Cada envío necesita acción humana.

La aplicación y los limitadores están diseñados para una instancia local. Antes de uso público: agregar autenticación, autorización, protección de secretos, respaldo de MySQL/uploads y procesamiento distribuido de trabajos.

## Datos, demo limpia y entrega

El seeder crea exactamente 40 personas ficticias en las dos sedes, con correos example.com, fechas relativas a su ejecución y recorridos completos. IDs reservados 100001–100040. Distribución: 7, 6, 15, 3, 2, 1, 1, 1 y 4 personas. No se insertan datos al iniciar.

Para una demo nueva e independiente:

```powershell
npm run demo:clean -w backend
```

El script crea una base con nombre nuevo, ejecuta migraciones y seeder, verifica 40 personas y no cambia .env ni elimina otras bases. Requiere permiso CREATE DATABASE. Ver docs/demo-limpia.md.

El restablecimiento antiguo con seed:undo solo es apropiado para una demo sin entrevistas, estados u otras referencias nuevas. Si existen, MySQL rechaza la eliminación y revierte la transacción; usar una base nueva. No ejecutar DROP DATABASE ni deshacer migraciones sobre tu base de trabajo.

Para empaquetar en Windows:

```powershell
npm run package:delivery
```

Genera un ZIP en entrega/ sin .env privados, node_modules, uploads, builds ni herramientas temporales. Verifica que .env.example no contenga claves ni contraseñas. El destinatario usa npm ci y crea su propia base. El canal y la hora de entrega se confirman con el docente.

## Pruebas

```powershell
npm test
npm run build
$env:NODE_ENV='test'
npm run migrate -w backend
npm run seed -w backend
$env:RUN_DB_TESTS='true'
npm test
Remove-Item Env:RUN_DB_TESTS
Remove-Item Env:NODE_ENV
node backend/tests/persistence.cjs
```

La integración se omite sin RUN_DB_TESTS=true. Requiere la base separada con 40 personas; crea y limpia solamente sus registros de prueba. Los proveedores de imágenes y redes se simulan para no generar costos ni publicaciones. Los archivos de prueba se ejecutan secuencialmente para evitar interferencia en esa base.

El build y las pruebas no sustituyen QA visual de escritorio/móvil ni validación real de Meta. Los avisos moderados de dependencias de Sequelize y herramientas se documentan; no se aplicó un downgrade incompatible mediante audit fix --force.

## Análisis de cinco líneas de la demo original

1. Agenda Campus Day → Asiste Campus Day tiene la mayor brecha: 30,56 puntos porcentuales.
2. De 27 personas que agendaron, 12 asistieron: conversión 44,44 % frente a una referencia de 75 %.
3. Las otras 15 representan 55,56 % sin avance provisional; no se puede afirmar abandono.
4. Priorizaría el seguimiento, consultando barreras para asistir y ofreciendo orientación sin inventar fechas.
5. Mediría nuevamente la asistencia de esa cohorte; quienes avanzaron tardaron en promedio 2 días.

## Referencias de proveedores

- Groq: https://console.groq.com/docs/api-reference y https://console.groq.com/docs/structured-outputs.
- API de imágenes compatible: https://developers.openai.com/api/reference/resources/images/methods/generate.
- Facebook: https://developers.facebook.com/docs/pages-api/posts/.
- Instagram con Facebook Login: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/content-publishing/.
