# CLERKI — Recibos &amp; Cotizaciones

PWA para crear, guardar, imprimir y enviar **recibos y cotizaciones**.
Funciona sin conexión, se instala en el celular y, si se quiere, sincroniza
los datos entre dispositivos con una cuenta.

Sin framework, sin paso de compilación y sin dependencias en el navegador:
HTML, CSS y JavaScript de navegador. El único motor externo (jsPDF) se
descarga únicamente cuando se va a enviar un PDF.

## Empezar

```bash
npm run preview     # vista previa con datos de ejemplo, sin backend
npm run dev         # interfaz real, con puerta de cuenta
npm run audit       # código huérfano: clases, ids, acciones, iconos, tokens
npm run smoke       # recorrido por la interfaz sobre un DOM (jsdom)
```

`npm run preview` sirve en el puerto 3000 con datos de ejemplo y guarda los
cambios en un espacio local separado. Añade `/?auth=1` para ver también la
pantalla de acceso.

Para la cuenta y la sincronización hace falta desplegar las Functions de
`api/` (Vercel + Postgres): el proceso completo está en
[SINCRONIZACION.md](SINCRONIZACION.md).

## Secciones

| Sección | Qué guarda |
|---|---|
| **Inicio** | Saldo por cobrar, reparto abonado/por cobrar, cifras del mes y «tu siguiente paso» |
| **Documentos** | Recibos y cotizaciones, con filtro por tipo y por estado de cobro |
| **Por cobrar** | Saldos agrupados por cliente, con cobro y liquidación directos |
| **Por pagar** | Gastos y facturas, con vencimientos y abonos parciales |
| **Directorio** | Clientes y prospectos, con RFC, método de pago, origen y seguimiento |
| **Catálogo** | Productos y servicios con precio, unidad y características |
| **Tareas** | Pendientes por área, prioridad, fecha límite y documento asociado |

## Atajos

| Atajo | Acción |
|---|---|
| `Ctrl` / `⌘` + `K` | Búsqueda global (documentos, clientes, gastos, catálogo, tareas, acciones) |
| `Ctrl` / `⌘` + `S` | Guardar el documento abierto |
| `↑` `↓` `↵` | Navegar y abrir resultados en la búsqueda |
| `Esc` | Cerrar búsqueda, menú o diálogo |

## Estructura

```
index.html            Toda la interfaz: vistas, modales, hoja de contacto y acceso
css/app.css           Hoja única de estilos de la interfaz (el documento impreso no la usa)
js/layout.js          Especificación del documento en puntos + formato + iconos
js/render.js          El documento como HTML (vista previa e impresión)
js/pdf.js             El mismo documento como PDF real (jsPDF + Archivo incrustada)
js/app.js             Estado, vistas, editor y acciones
js/sync.js            Cuenta y sincronización incremental contra /api/*
api/                  Functions de Vercel: login, register, sync (Postgres)
sw.js                 Service worker: HTML/CSS/JS siempre frescos, assets en caché
scripts/              Servidor local, datos de ejemplo, auditoría e iconos
```

El documento que se imprime y se envía tiene su propia especificación en
`js/layout.js` (puntos, Letter 612 × 792) y se pinta dos veces con las mismas
coordenadas: `js/render.js` para la pantalla y `js/pdf.js` para el archivo.
Cambiar la interfaz no toca el documento, y viceversa.

## Documentos

- [DISENO.md](DISENO.md) — criterio visual, tokens, breakpoints e historial de versiones.
- [SINCRONIZACION.md](SINCRONIZACION.md) — puesta en marcha de la cuenta y detalle del protocolo de sync.

## Notas

- Los datos viven en `localStorage` (`mc_docs`, `mc_clientes`, `mc_cxp`,
  `mc_productos`, `mc_tareas`, `mc_settings`). Sin cuenta, son de este
  dispositivo.
- El motor de PDF no se carga al arrancar: se pide cuando se va a compartir.
- Todo el tipografía es local (Archivo, OFL 1.1). No hay peticiones a
  terceros.
