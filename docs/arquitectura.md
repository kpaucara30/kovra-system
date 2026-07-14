# Arquitectura del sistema

El sistema esta organizado con arquitectura cliente-servidor.

## Cliente

Ubicacion:

```text
client/
```

Contiene la interfaz web: login, dashboard, facturas, reportes, usuarios, configuracion, agenda, actividad y papelera.

Archivos principales:

```text
client/index.html
client/assets/css/styles.css
client/assets/js/app.js
client/assets/js/app/
```

Los estilos se cargan desde `styles.css`, que importa archivos por area en `client/assets/css/app/`.

El frontend JavaScript esta dividido por responsabilidad en `client/assets/js/app/`: estado/API, navegacion, facturas, borradores, validacion, papelera, dashboard, agenda, actividad, reportes, exportacion, usuarios y configuracion.

## Servidor

Ubicacion:

```text
server/
```

Contiene el backend local. Recibe solicitudes del cliente, procesa facturas, administra usuarios, configuracion, backups, documentos y persistencia.

Archivo principal actual:

```text
server/server.js
```

## Datos

Ubicacion:

```text
data/
```

Base activa:

```text
data/sistema.db
```

Tambien puede contener backups, logs y archivos de migracion. `data/db.json`, si existe, es legado y solo sirve como origen de migracion inicial.

## Archivos subidos

Ubicacion:

```text
uploads/
```

Contiene PDFs, imagenes y previsualizaciones generadas por el flujo de facturas.

## Flujo general

```text
Usuario -> Cliente -> API local -> SQLite/uploads -> API local -> Cliente
```
