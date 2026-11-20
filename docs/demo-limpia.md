# Demo limpia de entrega

Se creó y verificó una base independiente con exactamente 40 personas ficticias:

admisiones_crm_limpia_20261120_1795207311425

La base de trabajo mantiene sus 41 personas y la configuración no cambió. La demo limpia tiene las cuatro migraciones y los catálogos; los módulos nuevos comienzan vacíos para que se demuestre la creación de entrevistas, campañas, presupuestos y piezas sin datos inventados de actividad real.

Para usarla temporalmente desde PowerShell, primero detené el backend actual y luego ejecutá:

```powershell
$env:DB_NAME='admisiones_crm_limpia_20261120_1795207311425'
npm run dev:backend
```

Después de detener esa sesión, para volver a la base configurada en .env:

```powershell
Remove-Item Env:DB_NAME
npm run dev:backend
```

El frontend sigue usando la misma API. No copies contraseñas a archivos de entrega.

En otra computadora o para generar una demo nueva:

```powershell
npm run demo:clean -w backend
```

El script crea un nombre único, aplica migraciones, carga el seeder y comprueba 40 registros. No reutiliza ni borra bases. El nombre de esta entrega es local: no existirá en otra máquina hasta que se cree su propia demo.
