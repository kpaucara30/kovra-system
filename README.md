# FactuIA

Sistema web local para control, procesamiento y validacion de facturas.

## Como iniciar

Ejecuta el archivo:

```bat
iniciar-sistema.bat
```

Luego abre:

```text
http://localhost:8001/index.html
```

Usuario inicial:

```text
admin / 123456
```

## Estructura

```text
client/   Interfaz web del sistema.
server/   Servidor local y rutas API.
data/     Base SQLite, backups y logs.
uploads/  PDFs, imagenes y previsualizaciones cargadas.
docs/     Documentacion tecnica y funcional.
tests/    Pruebas del proyecto.
```

CSS principal:

```text
client/assets/css/styles.css
client/assets/css/app/base.css
client/assets/css/app/login.css
client/assets/css/app/layout.css
client/assets/css/app/dashboard.css
client/assets/css/app/invoices.css
client/assets/css/app/users.css
client/assets/css/app/settings.css
client/assets/css/app/modals.css
```

Modulos JS principales:

```text
client/assets/js/app/invoices.js
client/assets/js/app/invoice-drafts.js
client/assets/js/app/invoice-validation.js
client/assets/js/app/trash.js
client/assets/js/app/dashboard.js
client/assets/js/app/agenda.js
client/assets/js/app/activity.js
client/assets/js/app/reports.js
client/assets/js/app/report-export.js
```

`styles.css` funciona como indice y conserva el orden de carga de los estilos.

## Base de datos

La base activa del sistema es SQLite:

```text
data/sistema.db
```

Si existe `data/db.json`, el servidor solo lo usa como origen de migracion inicial hacia SQLite.

## Documentacion

- `docs/arquitectura.md`: estructura del frontend/backend.
- `docs/endpoints.md`: rutas API principales.
- `docs/pruebas_funcionales.md`: checklist manual de flujo real.
