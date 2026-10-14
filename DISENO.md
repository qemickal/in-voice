# Diseño de la interfaz — v6.1 «Cristal»

Rediseño del 14 de octubre de 2026. La interfaz deja de ser una sucesión de
bloques apilados y se organiza como un **espacio de trabajo por zonas**: riel
de navegación, barra superior, tarjeta principal, panel lateral de filtros y
listas densas. Líneas finas y jerarquía por tamaño y peso. **Sin animaciones**,
sin dependencias nuevas y con todos los recursos locales.

La **v6.1** cambia sólo la tarjeta principal del panel: el degradado oscuro se
va y en su lugar queda un **vidrio translúcido** —velo claro, desenfoque del
fondo y luces de color por detrás— con la misma información que antes.

Cambian `index.html`, `css/app.css`, `js/app.js` (sólo el marcado que pintan
sus funciones de render) y la versión de caché en `sw.js`. La lógica de datos,
las rutas, la sincronización (`js/sync.js`) y el documento impreso
(`js/layout.js`, `js/render.js`, `js/pdf.js`) quedan intactos.

## 1. Dirección visual

- **Zonas, no tarjetas repetidas.** Cada pantalla combina un espacio principal
  con uno de apoyo: franja oscura + columna de cifras en el panel; cabecera con
  cifras + panel lateral de filtros en las listas; formulario + vista previa en
  el editor; bloques en dos columnas en Ajustes.
- **Listas densas.** Documentos, cuentas, directorio, catálogo y tareas son
  `<ul>` de filas con rejilla de áreas (título y metadatos a la izquierda,
  cifra a la derecha, estado y acciones abajo). Ninguna lista se convirtió en
  una rejilla de tarjetas.
- **Una sola voz cromática.** Un tema claro, tinta profunda y acentos lavanda /
  menta. El degradado oscuro queda sólo en la pantalla de acceso; el resto son
  superficies blancas, grises muy claros y **cristal**.
- **La tarjeta principal es un vidrio.** Velo blanco translúcido al 62–38 %,
  borde de luz de 1 px, brillo radial arriba a la izquierda y `backdrop-filter`
  sobre tres luces de color (lavanda, menta, azul) y dos órbitas finas. Nada de
  sombras duras: profundidad por desenfoque y una sombra larga y baja. El
  contenido va en tinta oscura, así que el contraste no depende del fondo.
- **Cifras protagonistas.** El importe manda en cada fila (19–21 px, tabular);
  los metadatos van en una línea con separadores y los detalles finos en 10–11 px.
- **Estado sin ruido.** Pastillas semánticas (liquidado, parcial, pendiente,
  vencida), barras de avance de 4 px y reglas de 1 px: nada de sombras duras ni
  iconos decorativos repetidos.

## 2. Tokens principales

| Token | Valor | Uso |
|---|---|---|
| `--brand` | `#5b55d9` | Acciones primarias y navegación activa |
| `--brand-ink` | `#4c46b4` | Texto lavanda sobre claro (7.4:1) |
| `--accent` | `#219c88` | Cobranza y avances positivos |
| `--mint` / `--lavender` | `#b6f3dc` / `#c8bdff` | Acentos sobre la franja oscura |
| `--bg` | `#f4f5fa` | Lienzo, `theme-color` y color de la PWA |
| `--surface` / `-2` / `-3` | `#fff` / `#f8f9fc` / `#edeff6` | Superficies y apoyos |
| `--line` / `--line-2` | `#e6e8f1` / `#d3d7e6` | Bordes y separadores |
| `--ink` / `-2` / `-3` | `#1f2338` / `#545972` / `#61667e` | Texto (15.5 / 6.9 / 5.7:1) |
| `--ok` `--warn` `--danger` `--info` | `#14704f` `#8d5a1f` `#ad3c53` `#41639c` | Estados, con su variante `*-soft` |
| `--glass-veil` / `-2` | `rgba(255,255,255,.62)` / `.38` | Degradado del vidrio |
| `--glass-line` / `--glass-hair` | `rgba(255,255,255,.78)` / `rgba(31,35,56,.1)` | Borde de luz y hairline del cristal |
| `--glass-soft` | `rgba(255,255,255,.58)` | Píldoras y controles sobre vidrio |
| `--glass-shadow` | `0 28px 56px -34px rgba(31,35,56,.45)` | Sombra baja de la tarjeta |
| `--glass-blur` | `blur(22px) saturate(150%)` | Desenfoque del fondo tras el vidrio |
| `--r-xl/-lg/-md/-sm` | `18/14/10/8px` | Zonas, filas, controles, pastillas |
| `--topbar-h` `--rail-w` `--content-w` | `60px` `244px` `1180px` | Estructura (220 y 1080 px hasta 1280 px) |
| `--pad-x` | `clamp(16px, 2.6vw, 32px)` | Margen lateral fluido |

**Archivo** sigue siendo la única familia, en WOFF2 local (300/400/500/700), con
`font-display: swap`. Escala de interfaz: 11 / 12 / 14 / 16 px, cifras 17–26 px
(`--fs-n`), títulos de zona 13–15 px y 27–46 px en la franja. Los campos
editables usan mínimo 16 px para evitar el zoom automático de iOS. El documento
conserva sus medidas en pt.

## 3. Composición por pantalla

| Pantalla | Composición |
|---|---|
| **Panel (Inicio)** | Tarjeta de cristal en dos columnas: a la izquierda saludo, fecha, píldoras de estado y accesos principales; a la derecha el saldo por cobrar (botón que abre el detalle de deudores) con la barra de avance de cobranza. El estado del día cierra la tarjeta a todo lo ancho. Detrás del vidrio, tres luces de color y las órbitas del estudio. Debajo, franja de cinco accesos directos. Rejilla `home-grid`: To-Do agrupado por área (zona principal) y columna de apoyo con «Por cobrar» y «El mes en cifras» (renglones icono + etiqueta + cifra + detalle). |
| **Documentos, CxC, CxP, Clientes, Catálogo, Tareas** | `page-head` con kicker, título, descripción, cifras integradas (`head-figs`) y acciones primarias. `page-grid` con panel lateral sticky (etiqueta visible + buscador + filtros en columna + pista) y columna de resultados (`results-bar` con conteo y `rows`). |
| **Filas** | Rejilla con áreas `main / figure / status / actions`, más `progress`, `docs`, `tags` o `doc` según el tipo. Las pistas opcionales sólo se declaran cuando el contenido existe (`:has()`), para no dejar huecos. |
| **Editor** | Barra superior (volver, modo, guardar, imprimir, enviar, eliminar), pestañas Datos/Vista previa en pantallas cortas, formulario en secciones `fsec-head` + `fsec-body` y vista previa sticky del documento a escala. |
| **Ajustes** | Modal ancho con `set-grid` de bloques: estudio, pagos + QR, cuenta y clientes guardados; el bloque de textos por defecto ocupa el ancho completo con dos columnas. |
| **CxC detalle, CxP, cliente, producto, tarea** | Modales `modal-head / modal-body / modal-foot`; en móvil se apoyan en el borde inferior con safe areas y botones de 44 px. |
| **Acceso** | `auth-gate` a pantalla completa: escaparate oscuro con la propuesta y tarjeta de entrada/sesión, sin tocar el flujo de autenticación. |

## 4. Distribución adaptable

| Tamaño | Navegación y composición |
|---|---|
| 1024 px o más | Riel lateral fijo (secciones + cuenta + ajustes/salir); barra superior sin duplicados; panel y listas en dos columnas |
| 761–1023 px | El riel se oculta: dock flotante centrado arriba de la barra inferior; bandas y listas siguen en dos columnas (360/320/232/400 px de apoyo) |
| Hasta 900 px | Todo a una columna; el panel lateral de filtros se vuelve una franja horizontal de chips; el editor muestra pestañas Datos/Vista previa |
| Hasta 760 px | Barra superior compacta, accesos directos en cinco iconos con etiqueta corta, modales tipo hoja inferior |
| Hasta 620 px | Filas con estado y acciones en renglones propios, acciones sólo con icono (40 px), formularios y textos de Ajustes en una columna |
| Hasta 420 / 359 px | Se ocultan etiquetas secundarias; los accesos directos pasan a tres columnas |

`html { overflow-x: hidden }` + `body { overflow-x: clip }` impiden desplazamiento
lateral sin romper `position: sticky`. Todas las columnas flexibles usan
`minmax(0, 1fr)` y los textos largos `overflow-wrap: anywhere` o elipsis.

## 5. Rapidez y accesibilidad

- Regla global `animation: none`, `transition: none`, `scroll-behavior: auto`.
  El dinamismo viene de la composición y el espacio, no del movimiento.
- El desenfoque del vidrio baja a `blur(14px)` por debajo de 760 px para no
  cargar la GPU en cada desplazamiento del celular.
- Sin dependencias nuevas, sin fuentes externas, sin librerías de iconos: los
  iconos siguen siendo los SVG en línea de `ICONS` (`js/layout.js`) y la
  geometría decorativa son dos órbitas SVG contenidas por `overflow: hidden`.
- Contrastes medidos: todo el texto útil cumple WCAG AA (mínimo 4.9:1 en
  pastillas y 5.7:1 en metadatos); la franja oscura llega a 16:1.
- Sobre el vidrio el texto usa tinta `--ink` (10.7:1 en el peor punto) y
  `--ink-2` (4.8:1 medido sobre la luz más intensa con el velo más tenue); las
  píldoras de estado se apoyan en un fondo claro y llevan el color en tinta,
  punto y borde, para no bajar de AA.
- Enlace «Ir al contenido», `aria-current` en la navegación activa, búsquedas
  con etiqueta visible, botones de icono con `aria-label` y `title`, conteos con
  texto completo («3 documentos», «Ningún resultado») y aviso de guardado con
  `role="status"`.
- `:focus-visible` con anillo en toda la interfaz y anillo menta sobre la franja
  oscura; menú y modales atrapan el foco, dejan el fondo `inert`, se cierran con
  Escape y devuelven el foco al control de origen.
- `prefers-reduced-transparency: reduce` cambia el vidrio por superficies
  opacas (`--surface` / `--surface-2`) y apaga el desenfoque; `@supports not
  (backdrop-filter…)` deja un velo más blanco. En ambos casos se pierde el
  efecto, nunca la legibilidad.

## 6. PWA y documentos

- Caché actual: **`mc-pwa-v61`**. HTML, CSS y JS siguen con estrategia
  *network-first*; fuentes, logo e iconos conservan *cache-first*.
- Las cuatro TTF de Archivo continúan precargadas para que la **primera
  generación de PDF funcione sin conexión**.
- `/api/` queda fuera de la caché: no se guardan respuestas privadas ni se
  devuelve HTML como respaldo de una petición de sincronización.
- `manifest.webmanifest` y `meta[name=theme-color]` coinciden con `--bg`.
- La impresión muestra sólo `#print-area` (612 × 791.5 pt, `@page size: letter`).
  Los PDF siguen monocromos y con sus coordenadas originales: el motor de
  cálculo y de render no se modificó.

Al actualizar la interfaz, subir siempre la versión de la caché para que los
dispositivos instalados descarten los recursos viejos.

## 7. Vista previa local

```sh
npm run preview
```

Abre el puerto 3000 en `0.0.0.0`, con datos de ejemplo identificados como
**«Demo local»**. Se guardan en un espacio de almacenamiento separado
(`in-voice-preview:`); no se crean tokens, no se envían datos a una API y no se
instala el service worker. `/?auth=1` permite inspeccionar el acceso real.

```sh
npm run dev
```

Sirve la interfaz real con puerta de cuenta y service worker. Este servidor
estático no reemplaza las Functions de Vercel: la cuenta y la sincronización
necesitan el backend descrito en `SINCRONIZACION.md`.

Los scripts de demo **no se incluyen en `index.html` ni en la caché de
producción**: sólo los inyecta el servidor de desarrollo con `--demo`.

## 8. Validación del rediseño

Auditoría de código huérfano, sin dependencias (`npm run audit`): cruza el
marcado, la hoja de estilos y el despachador de acciones de `js/app.js` y
reporta clases sin uso, clases del marcado sin regla, selectores de JS sin
destino, ids que nadie consulta, `data-action` sin `case`, `case` sin disparador
y funciones sin uso. Estado actual: **0 hallazgos** (las clases que sólo activa
el script se listan aparte como informativas).

Verificación automática con un arnés de DOM (jsdom) sobre la vista previa:

- La tarjeta principal arma sus luces, píldoras, saldo, detalle de deudores y
  barra de cobranza; el pie de la tarjeta recibe el estado del día.
- Las siete vistas pintan con datos de ejemplo; búsqueda y filtros reducen las
  listas; el menú a pantalla completa abre y cierra.
- Editor: ocho secciones, totales y saldo recalculados, alta y baja de
  conceptos y abonos, pestaña de vista previa, guardado con aviso y regreso a
  la lista.
- Modales de Ajustes (14 campos), CxP, cliente, producto y tarea: abren con sus
  controles.
- Todos los identificadores que usa `js/app.js` existen en el DOM final; ninguna
  acción `data-action` perdió su control; **sin errores de JavaScript**.
- Auditoría de marcado/hoja de estilos: ninguna clase usada sin regla y ningún
  selector huérfano; dos elementos nunca comparten la misma área de rejilla.
- Comprobación de contrastes y de anchos fijos por punto de ruptura (rieles de
  258/232 px, avatares e iconos, órbitas decorativas contenidas).

Pendiente de revisión humana: el recorrido visual en navegador (no hay binario
de navegador en el entorno de trabajo). La vista previa queda levantada en el
puerto 3000 para inspeccionar móvil, tableta y escritorio.

## 9. Historial

- **v4.0 «Plano cromático»**: superficies opacas y escala tipográfica compacta.
- **v5.0 «Creative glass»**: vuelve la profundidad visual, pero no el movimiento.
- **v6.0 «Estudio»**: composición por zonas, riel lateral, listas densas y
  cifras integradas en la cabecera de cada pantalla.
- **v6.1 «Cristal»**: la tarjeta principal del panel pasa de franja oscura a
  vidrio translúcido con luces detrás; se retiran el modal de detalle CxC (sin
  uso), seis ids huérfanos, el utilitario `.sr-only` y las reglas `.zone .cob-*`
  que ya no podían coincidir con nada.
