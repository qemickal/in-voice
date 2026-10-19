# Diseño de la interfaz — v8.0 «Pizarra»

Rediseño del 19 de octubre de 2026. La interfaz abandona el naranja como color
de estructura y adopta una **paleta azul pizarra sobre hielo**. El naranja queda
solo en el logo. La composición se acerca a la referencia móvil: saludo grande,
tarjeta de saldo con dona, accesos en cuadrícula, formularios de contacto a
pantalla completa y navegación inferior flotante.

Se mantienen las reglas de siempre: **sin animaciones, sin dependencias nuevas,
sin fuentes externas y con todos los recursos locales**. La lógica de datos, las
rutas, la sincronización (`js/sync.js`) y el documento impreso (`js/layout.js`,
`js/render.js`, `js/pdf.js`) no cambian de motor.

Cambian `index.html`, `css/app.css`, `js/app.js`, `manifest.webmanifest`,
`sw.js` (caché `mc-pwa-v81`) y este documento.

## 1. Dirección visual

- **Un solo clima cromático.** Fondo hielo (`#F3F6FB`) con dos luces radiales
  muy tenues, superficies blancas y una tinta azul casi negra. El azul pizarra
  es el color de acción; verde para cobranza y positivo; ámbar y rojo sólo para
  alertas.
- **Tarjetas, no bloques apilados.** Radio 18–26 px, borde de 1 px y sombras
  largas y bajas. La jerarquía la dan el espacio y el peso tipográfico, no los
  degradados.
- **Inicio como tablero móvil.** Saludo y fecha a la izquierda, tarjeta «Nuevo
  recibo» a la derecha; debajo, la tarjeta de saldo con dona y reparto
  abonado/por cobrar; cinco accesos cuadrados; tarjeta «Tu siguiente paso»; y
  la sección «General» con las listas de apoyo.
- **El contacto es una hoja, no un modal pequeño.** En móvil ocupa toda la
  pantalla, con cabecera propia (volver, marca, sync y ajustes), campos con
  icono, segmento Cliente/Prospecto y botón de guardado al pie. En escritorio se
  centra como una hoja de 760 px con esquinas de 28 px.
- **Listas legibles.** Cada registro es una tarjeta independiente; la identidad
  va a la izquierda, la cifra a la derecha, y estado/acciones al pie. Se
  conservan las rejillas por áreas de la v6.
- **Navegación inferior flotante.** Barra blanca con blur, elemento activo en
  azul suave y botón central elevado de 52 px.

## 2. Tokens principales

| Token | Valor | Uso |
|---|---|---|
| `--brand` | `#5B729B` | Acciones primarias, navegación activa, dona |
| `--brand-ink` | `#3F557A` | Texto azul sobre fondos claros (≈6.9:1) |
| `--brand-soft` / `-200` / `-300` | `#EEF3FA` / `#DBE5F2` / `#B9C8DE` | Rellenos, bordes y pistas |
| `--accent` / `-ink` / `-soft` | `#2F8F6B` / `#1F7355` / `#E7F6EF` | Cobranza y avances |
| `--ok` / `--warn` / `--danger` / `--info` | `#157A4E` / `#8A5A0C` / `#B34A44` / `#41639C` | Estados, con su variante `*-soft` |
| `--bg` | `#F3F6FB` | Lienzo, `theme-color` y fondo de la PWA |
| `--surface` / `-2` / `-3` | `#FFF` / `#F7F9FD` / `#EEF2F8` | Superficies y apoyos |
| `--field` | `#F5F8FC` | Campos dentro de las tarjetas |
| `--line` / `--line-2` | `#E6ECF5` / `#D7E0EC` | Bordes y separadores |
| `--ink` / `-2` / `-3` | `#0E1729` / `#526076` / `#5F6E84` | Texto (16.4 / 6.0 / 4.9:1) |
| `--grad-brand` | `#586F98 → #455A80` | Botón primario y botón central |
| `--grad-band` | `#101A2E → #1D2F4D → #2A4266` | Escaparate de acceso |
| `--r-xl/-lg/-md/-sm` | `24/18/14/10px` | Hojas, tarjetas, controles, píldoras |
| `--shadow-1/-2/-3` | sombras azuladas de 12–60 px | Profundidad baja |
| `--ring` | `0 0 0 4px rgba(91,114,155,.14)` | Foco accesible |
| `--topbar-h` | `64px` (+ safe area) | Barra superior |
| `--content-w` / `--rail-w` | `1180px` / `244px` | Estructura de escritorio |

**Archivo** sigue siendo la única familia, en WOFF2 local (300/400/500/700).
Escala: 11/12/14/16 px; cifras 18–26 px; saludo 31–58 px; título de hoja
28–40 px. Los campos editables usan mínimo 16 px para evitar el zoom de iOS.

## 3. Composición por pantalla

| Pantalla | Composición |
|---|---|
| **Inicio** | `home-top` (saludo + «Nuevo recibo»), `balance-card` con dona y reparto, `quick-grid` de cinco accesos, `next-card` con las tres primeras tareas, cabecera `general-head` y rejilla de apoyo: «Por cobrar» (documentos) y «El mes en cifras». |
| **Documentos, CxC, CxP, Clientes, Catálogo, Tareas** | `page-head` con kicker, título, descripción y acciones; `page-grid` con panel lateral de búsqueda/filtros y tarjetas de registro. |
| **Hoja de cliente / prospecto** | Cabecera con volver, marca, sync y ajustes; kicker y título («Crear cliente» / «Crear prospecto»); segmento de tipo; campos con icono; pie fijo con guardar. |
| **Editor** | Barra superior con volver, guardar, imprimir, enviar y eliminar; formulario en secciones numeradas; vista previa sticky. |
| **Ajustes, CxP, producto, tarea** | Modales con cabecera, cuerpo desplazable y pie. En móvil se apoyan en el borde inferior. |
| **Acceso** | `auth-gate` a pantalla completa con escaparate pizarra y tarjeta de sesión. |

## 4. Inicio

- El saludo se calcula por hora (`Buenos días / Buenas tardes / Buenas noches`)
  y la fecha se escribe completa en español.
- La píldora de documentos cuenta el archivo y lleva a Documentos; la píldora
  de estado muestra los vencimientos de hoy o los vencidos.
- La tarjeta de saldo usa un anillo SVG (`stroke-dasharray`) sin librerías. Al
  centro va el porcentaje abonado; debajo, el reparto Abonado / Por cobrar con
  importes y porcentajes. El botón del saldo despliega hasta cinco deudores.
- «Nuevo recibo» abre directamente un recibo en blanco.
- Los cinco accesos son Cotizar, Recibo, Cliente, Gasto y Producto.
- «Tu siguiente paso» reúne las tareas del día y de las áreas; muestra las tres
  primeras y el enlace «Ver todas». El contador de la cabecera se actualiza con
  el estado real.
- «General» agrupa la cuenta por cobrar (por documento) y las cifras del mes
  (por pagar, facturado y cobrado).

## 5. Hoja de cliente / prospecto

La hoja reemplaza el modal compacto. Conserva los ids y las acciones que ya
usaba el despachador (`cl-nombre`, `cl-empresa`, `cl-email`, `cl-telefono`,
`cl-direccion`, `cl-notas`, `cl-estado`, `save-cliente`, `set-cli-tipo`).

Campos y persistencia:

| Campo | Cliente | Prospecto | Se guarda en |
|---|---|---|---|
| Nombre completo * | Sí | Sí | `nombre` |
| Empresa / Negocio | Sí | Sí | `empresa` |
| RFC | Sí | No | `rfc` (mayúsculas, sin espacios) |
| Teléfono | Sí | Sí | `telefono` |
| Correo electrónico | Sí | Sí | `email` |
| Dirección | Sí | Sí | `direccion` |
| Método de pago | Sí | No | `metodoPago` |
| Origen del prospecto | No | Sí | `origen` |
| Fecha de seguimiento | No | Sí | `seguimiento` (ISO) |
| Estado | No | Sí | `estado` |
| Notas | Sí | Sí | `notas` |

No se incluyen foto, CFDI, «interés» ni persona física/moral. Los campos nuevos
viajan como parte del registro JSON de `clientes`; la API de sincronización no
necesita cambios. En el directorio, los prospectos muestran origen, estado y
fecha de seguimiento (en rojo si ya venció y el prospecto sigue abierto); los
clientes muestran RFC y método de pago.

## 6. Distribución adaptable

| Tamaño | Navegación y composición |
|---|---|
| 1024 px o más | Riel lateral en tarjetas; Inicio en dos columnas (saludo/CTA, saldo, rejilla); listas con panel lateral; hoja de contacto centrada de 760 px |
| 761–1023 px | Sin riel; navegación inferior flotante; Inicio a una columna con el saldo a lo ancho |
| Hasta 760 px | Barra superior compacta sin subtítulo; navegación flotante; saludo y CTA en dos columnas; hoja de contacto a pantalla completa |
| Hasta 620 px | La cabecera de «Tu siguiente paso» envuelve el enlace; las tarjetas usan padding de 14 px |
| Hasta 420 px | Se reduce la dona y el CTA; la pareja fecha/estado pasa a una columna; se ocultan textos secundarios |

`html { overflow-x: hidden }` y `body { overflow-x: clip }` impiden el
desplazamiento lateral. Todas las columnas flexibles usan `minmax(0, 1fr)` y
los textos largos `overflow-wrap: anywhere` o elipsis.

## 7. Rapidez y accesibilidad

- Regla global `animation: none`, `transition: none`, `scroll-behavior: auto`.
- El desenfoque se limita a la barra superior, la navegación inferior y la
  cabecera de la hoja; `prefers-reduced-transparency: reduce` las vuelve opacas.
- Sin dependencias, sin fuentes externas, sin librerías de iconos. Los SVG son
  los de `ICONS` (`js/layout.js`) y los de la propia hoja.
- Contrastes: tinta 16.4:1 sobre blanco; `--ink-2` 6.0:1; `--ink-3` 5.2:1 sobre
  blanco y 4.9:1 sobre `--bg`; el azul de acción lleva texto blanco (4.6–4.9:1).
- La hoja atrapa el foco, se cierra con Escape y devuelve el foco al control de
  origen. Los campos están envueltos por su `<label>`, el segmento usa
  `aria-pressed`, la dona tiene `role="img"` con etiqueta completa y los botones
  de icono llevan `aria-label` y `title`.
- La píldora de sync de la hoja es un espejo de la de la barra superior; no
  duplica lógica ni estado.

## 8. Validación

- `npm run audit`: **0 hallazgos** en clases huérfanas, selectores sin destino,
  ids sin consulta, acciones sin `case` y funciones sin uso.
- Arnés de DOM con jsdom sobre `npm run preview`: Inicio pinta saludo, saldo,
  dona, reparto, píldoras, cinco accesos y tareas; las siete vistas navegan; la
  hoja de contacto abre, cambia de tipo, guarda un prospecto con RFC, origen,
  método y seguimiento, y el registro aparece en el directorio; Ajustes puede
  abrirse encima de la hoja y volver a ella; sin errores de JavaScript.
- Pendiente de revisión humana: el recorrido visual en un navegador real (el
  entorno de trabajo no tiene binario de navegador). La vista previa queda en
  el puerto 3000 para revisar móvil, tableta y escritorio.

## 9. Historial

- **v4.0 «Plano cromático»**: superficies opacas y escala tipográfica compacta.
- **v5.0 «Creative glass»**: vuelve la profundidad visual, pero no el movimiento.
- **v6.0 «Estudio»**: composición por zonas, riel lateral, listas densas y
  cifras integradas en la cabecera de cada pantalla.
- **v6.1 «Cristal»**: la tarjeta principal del panel pasa de franja oscura a
  vidrio translúcido con luces detrás.
- **v7.0 «Ámbar»**: tema claro con acentos naranjas y tarjetas de acceso rápido.
- **v8.0 «Pizarra»**: paleta azul pizarra, Inicio móvil con dona y rejilla de
  accesos, hoja de cliente/prospecto a pantalla completa con RFC, método de
  pago, origen y seguimiento; listas en tarjetas y navegación inferior
  flotante. Se retiran las clases de la franja de vidrio y de la barra de
  cobranza anteriores.
