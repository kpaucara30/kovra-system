# Endpoints principales

Rutas principales del servidor:

```text
POST /api/login
POST /api/logout
GET  /api/me

GET  /api/invoices
PUT  /api/invoices

GET  /api/providers
POST /api/providers
PUT  /api/providers/:id

GET  /api/users
POST /api/users
PUT  /api/users/:id

GET  /api/settings
PUT  /api/settings

GET  /api/backup
POST /api/backup/restore

GET  /api/document-pages
POST /api/process-invoice
GET  /api/status
```

Las rutas de papelera se pueden agregar como mejora:

```text
GET  /api/trash
POST /api/invoices/:id/trash
POST /api/invoices/:id/restore
DELETE /api/invoices/:id
```

La informacion que modifican estas rutas se guarda en SQLite:

```text
data/sistema.db
```
