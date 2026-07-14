# Pruebas funcionales manuales

Usa esta lista despues de cambios grandes en frontend, backend o base de datos.

## Arranque y sesion

- Iniciar con `iniciar-sistema.bat`.
- Abrir `http://localhost:8001/index.html`.
- Iniciar sesion con el usuario inicial.
- Confirmar que dashboard, facturas, reportes, usuarios y configuracion cargan sin errores visibles.

## Flujo de factura

- Subir un PDF de factura.
- Subir una imagen de factura.
- Procesar el documento.
- Revisar proveedor, RUC, fecha, numero, moneda, subtotal, IGV y total.
- Corregir datos manualmente si corresponde.
- Guardar la factura.
- Confirmar que aparece en el listado y en los indicadores del dashboard.

## Papelera

- Mover una factura a papelera.
- Confirmar que deja de aparecer en el listado principal.
- Restaurar la factura.
- Confirmar que vuelve al listado principal.
- Probar eliminacion definitiva solo con datos de prueba.

## Backups

- Exportar backup.
- Verificar que el archivo se descarga o queda disponible.
- Restaurar un backup de prueba.
- Confirmar que facturas, usuarios, proveedores y configuracion se mantienen consistentes.

## Regresion visual

- Revisar login.
- Revisar dashboard.
- Revisar listado y modal de facturas.
- Revisar usuarios.
- Revisar configuracion.
- Revisar vistas en ancho pequeno de navegador.
