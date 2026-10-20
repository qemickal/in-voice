# Diseño de la interfaz — v10

Rediseño y consolidación del 20 de octubre de 2026. Las dos capas que
convivían —`css/app.css` (v8 «Pizarra») y `css/imprenta.css` (v9 «Imprenta»,
cargada encima)— se funden en **una sola hoja**: `css/app.css`. Desaparece la
bandera `/?estilo=pizarra` y con ella la duplicidad de reglas que se pisaban.

Se conserva lo que funcionaba: la **paleta azul pizarra**, la **tipografía
Archivo** (ahora también en su eje de anchura para titulares, cifras y
rótulos), la diagramación por zonas y la composición móvil. Sobre eso, la
interfaz se actualiza: radios consistentes, profundidad en capas finas, cifras
alineadas y micro-transiciones que se apagan con `prefers-reduced-motion`.

Las reglas de siempre siguen en pie: **sin dependencias nuevas, sin fuentes
externas, todos los recursos locales**. La lógica de datos, la sincronización
(`js/sync.js`) y el documento impreso (`js/layout.js`, `js/render.js`,
`js/pdf.js`) no cambian de motor.

Cambian `index.html`, `css/app.css` (antes dos hojas), `js/app.js`,
`js/layout.js`, `scripts/dev-server.mjs`, `scripts/audit.mjs`, `sw.js`
(caché `mc-pwa-v90`) y este documento.

## 1. Dirección visual

- **Un solo clima cromático.** Fondo hielo (`#F4F7FC`) con dos luces radiales
  muy tenues, superficies blancas y una tinta azul casi negra. El azul pizarra
  es el color de acción; verde para cobranza y positivo; ámbar y rojo sólo
  para alertas.
- **Una sola escala de radios y sombras.** `20 / 16 / 11 / 8 px` y tres
  sombras cortas. Antes había tres escalas distintas compitiendo entre la capa
  base y la capa «Imprenta»; ahora cada componente sabe qué radio le toca.
- **Profundidad por capas finas.** Nada de borrones de 60 px: borde de 1 px +
  sombra baja. El desenfoque queda donde aporta (barra superior y navegación
  inferior) y se apaga con `prefers-reduced-transparency`.
- **Cifras alineadas.** Todo importe usa `font-variant-numeric: tabular-nums`
  y Archivo condensada: las columnas de dinero se leen de arriba abajo sin
  que los números bailen. Era la mayor deuda de legibilidad de la v8.
- **Movimiento corto y opcional.** Transiciones de 110–140 ms en botones,
  tarjetas, campos y filas; nunca en `*`; y anuladas por completo con
  `prefers-reduced-motion: reduce`.
- **Inicio como tablero.** Saludo y fecha a la izquierda, tarjeta «Nuevo
  recibo» a la derecha; debajo, la tarjeta de saldo con dona y reparto
  abonado/por cobrar; cinco accesos cuadrados; tarjeta «Tu siguiente paso»; y
  la sección «General» con las listas de apoyo.
- **El contacto es una hoja, no un modal pequeño.** En móvil ocupa toda la
  pantalla, con cabecera propia (volver, marca, sync y ajustes), campos con
  icono, segmento Cliente/Prospecto y botón de guardado al pie. En escritorio
  se centra como una hoja de 720 px.
- **Listas legibles.** Cada registro es una tarjeta independiente; la identidad
  va a la izquierda, la cifra a la derecha, y estado/acciones al pie.
- **Navegación inferior flotante.** Barra clara con blur, elemento activo en
  azul suave y botón central elevado de 52 px.

## 2. Tokens principales

| Token | Valor | Uso |
|---|---|---|
| `--brand-600` | `#3A5A98` | Acciones primarias, navegación activa, dona |
| `--brand-700` / `-500` / `-400` | `#2C4370` / `#4C71B8` / `#7E9CDB` | Hover, foco y barras de avance |
| `--brand-ink` | `#2C4370` | Texto azul sobre fondos claros (7.3:1) |
| `--brand-soft` / `-200` / `-300` | `#EDF3FC` / `#CFDDF3` / `#A9C0E6` | Rellenos, bordes y pistas |
| `--accent-ink` / `-soft` | `#1F7355` / `#E7F6EF` | Cobranza y cotizaciones |
| `--ok` / `--warn` / `--danger` | `#12805C` / `#9A6100` / `#B3372F` | Estados, con su variante `*-soft` |
| `--bg` | `#F4F7FC` | Lienzo, `theme-color` y fondo de la PWA |
| `--surface` / `-2` / `-3` | `#FFF` / `#F8FAFD` / `#EEF2F8` | Superficies y apoyos |
| `--field` | `#F5F8FC` | Campos dentro de las tarjetas |
| `--line` / `--line-2` | `#E4EAF3` / `#D3DCE8` | Bordes y separadores |
| `--ink` / `-2` / `-3` | `#0E1729` / `#4E5C72` / `#6B7A90` | Texto (16.4 / 7.0 / 4.9:1) |
| `--grad-brand` | `#47659F → #33518C` | Botón primario y botón central |
| `--grad-band` | `#101A2E → #1D2F4D → #2A4266` | Escaparate de acceso |
| `--r-xl/-lg/-md/-sm` | `20 / 16 / 11 / 8 px` | Hojas, tarjetas, controles, píldoras |
| `--shadow-1/-2/-3` | sombras azuladas de 16–64 px | Profundidad baja |
| `--ring` | `0 0 0 3px rgba(58,90,152,.22)` | Foco accesible |
| `--t-fast` / `--t` | `110ms` / `140ms` | Micro-transiciones |
| `--display` | `'Archivo Variable'` | Titulares, cifras y rótulos |
| `--ancho-titular` / `--ancho-rotulo` | `76 %` / `88 %` | Cuánto se condensa cada voz |
| `--topbar-h` | `64px` (+ safe area) | Barra superior |
| `--content-w` / `--rail-w` | `1180px` / `244px` | Estructura de escritorio |

**Archivo** sigue siendo la única familia, en WOFF2 local. El texto corrido usa
los estáticos (400/500/700); titulares, cifras y rótulos usan el archivo
variable. Escala: 11/12/14/16 px; cifras 16–28 px; saludo 31–58 px; título de
hoja 30–40 px. Los campos editables usan mínimo 16 px para evitar el zoom de
iOS.

El variable (45 KB) sale del archivo latino de
`@fontsource-variable/archivo` 5.3.0, limitado a peso 600–900 y anchura
62–100 % (dibujo idéntico dentro de ese rango):

```
python -m fontTools.varLib.instancer archivo-latin-wdth-normal.woff2 \
  wght=600:900 wdth=62:100 --no-recalc-timestamp -o archivo-latin-variable.woff2
```

Licencia OFL 1.1 en `assets/fonts/OFL-Archivo.txt`. Se precarga en
`index.html` y entra en la caché del SW.

## 3. Composición por pantalla

| Pantalla | Composición |
|---|---|
| **Inicio** | `home-top` (saludo + «Nuevo recibo»), `balance-card` con dona y reparto, `quick-grid` de cinco accesos, `next-card` con las tres primeras tareas, cabecera `general-head` y rejilla de apoyo: «Por cobrar» (documentos) y «El mes en cifras». |
| **Documentos, CxC, CxP, Clientes, Catálogo, Tareas** | `page-head` con kicker, título, descripción y acciones; `page-grid` con panel lateral de búsqueda/filtros y tarjetas de registro. |
| **Hoja de cliente / prospecto** | Cabecera con volver, marca, sync y ajustes; kicker y título («Crear cliente» / «Crear prospecto»); segmento de tipo; campos con icono; pie fijo con guardar. |
| **Editor** | Barra superior con volver, guardar, imprimir, enviar y eliminar; formulario en secciones numeradas; vista previa sticky. |
| **Ajustes, CxP, producto, tarea** | Modales con cabecera, cuerpo desplazable y pie. En móvil se apoyan en el borde inferior. |
| **Búsqueda global** | `cmdk` centrado arriba: campo, resultados agrupados por colección y pie con los atajos. |
| **Acceso** | `auth-gate` a pantalla completa con escaparate pizarra y tarjeta de sesión. |

## 4. Inicio

- El saludo se calcula por hora (`Buenos días / Buenas tardes / Buenas noches`)
  y la fecha se escribe completa en español.
- La píldora de documentos cuenta el archivo y lleva a Documentos; la píldora
  de estado muestra los vencimientos de hoy o los vencidos.
- La tarjeta de saldo usa un anillo SVG (`stroke-dasharray`) sin librerías. Al
  centro va el porcentaje abonado; debajo, el reparto Abonado / Por cobrar con
  importes y porcentajes. El botón del saldo despliega hasta cinco deudores.
- «Nuevo recibo» abre directamente un recibo en blanco. Si se sale sin
  escribir nada, **el borrador se descarta** (§7).
- Los cinco accesos son Cotizar, Recibo, Cliente, Gasto y Producto.
- «Tu siguiente paso» reúne las tareas del día y de las áreas; muestra las tres
  primeras y el enlace «Ver todas».
- «General» agrupa la cuenta por cobrar (por documento) y las cifras del mes
  (por pagar, facturado y cobrado).

## 5. Hoja de cliente / prospecto

Conserva los ids y las acciones que ya usaba el despachador (`cl-nombre`,
`cl-empresa`, `cl-email`, `cl-telefono`, `cl-direccion`, `cl-notas`,
`cl-estado`, `save-cliente`, `set-cli-tipo`).

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

No se incluyen foto, CFDI, «interés» ni persona física/moral. Los campos
viajan como parte del registro JSON de `clientes`; la API de sincronización no
necesita cambios. En el directorio, los prospectos muestran origen, estado y
fecha de seguimiento (en rojo si ya venció y el prospecto sigue abierto); los
clientes muestran RFC y método de pago.

## 6. Distribución adaptable

| Tamaño | Navegación y composición |
|---|---|
| 1024 px o más | Riel lateral en tarjetas; Inicio en dos columnas; listas con panel lateral; hoja de contacto centrada de 720 px |
| 761–1023 px | Sin riel; navegación inferior flotante; Inicio a una columna con el saldo a lo ancho |
| Hasta 900 px | El panel de filtros pasa arriba y la lista debajo, a todo el ancho; los chips se vuelven fila; el editor apila formulario y vista previa |
| Hasta 760 px | Barra superior compacta sin subtítulo; pestañas Datos/Vista previa en el editor; modales como hoja inferior; hoja de contacto a pantalla completa |
| Hasta 700 px | **Modo compacto**: barra del editor en rejilla, etiquetas de acción abreviadas, acciones de fila convertidas en iconos, parejas de campos a una columna |
| Hasta 420 px | Se reduce la dona y el CTA; se ocultan textos secundarios |

`html { overflow-x: hidden }` y `body { overflow-x: clip }` impiden el
desplazamiento lateral. Todas las columnas flexibles usan `minmax(0, 1fr)` y
los textos largos `overflow-wrap: anywhere` o elipsis.

## 7. Rapidez, accesibilidad y experiencia

**Movimiento.** Se retira la regla global `animation: none; transition: none`.
En su lugar, cada componente declara la suya (110–140 ms) y un único bloque
`@media (prefers-reduced-motion: reduce)` lo deja todo quieto.

**Búsqueda global (`Ctrl` / `⌘ + K`).** Un solo campo llega a cualquier dato:
documentos, directorio, cuentas por pagar, catálogo, tareas y acciones.
Coincide sin acentos, sin mayúsculas y con las palabras en cualquier orden;
se navega con `↑` `↓`, se abre con `↵` y se cierra con `Esc` o tocando fuera.
Con el campo vacío muestra las acciones y lo último tocado. Al elegir un
registro abre su editor (o su hoja) directamente.

**Atajos.** `Ctrl/⌘ + K` busca y `Ctrl/⌘ + S` guarda el documento abierto.

**Borradores vacíos.** «Nuevo recibo» crea el documento al instante para poder
editarlo. Si se sale sin escribir proyecto, cliente, importe ni abono, el
cascarón se descarta: el archivo deja de llenarse de documentos fantasma.

**Filtros por estado.** Documentos filtra además por Pendientes, Pago parcial
y Liquidados. En «Por cobrar», los saldos de un solo documento llevan «Cobrar»
y «Liquidar» al alcance de la mano, sin entrar al editor.

**Escritura fluida.** La vista previa se reconstruía en cada tecla (y mide
textos con canvas). Ahora se agrupa en un fotograma con
`requestAnimationFrame`: escribir deja de trabarse.

- Sin dependencias, sin fuentes externas, sin librerías de iconos. Los SVG son
  los de `ICONS` (`js/layout.js`) y los de la propia hoja.
- Contrastes: tinta 16.4:1 sobre blanco; `--ink-2` 7.0:1; `--ink-3` 4.9:1
  sobre blanco y sobre `--bg`; el azul de acción lleva texto blanco (4.6–4.9:1).
- Los diálogos atrapan el foco, se cierran con Escape y devuelven el foco al
  control de origen. Los campos están envueltos por su `<label>`; segmentos,
  pestañas y chips usan `aria-pressed`; la dona tiene `role="img"` con etiqueta
  completa; los botones de icono llevan `aria-label` y `title`; y el fondo
  queda `inert` mientras hay algo abierto.
- La píldora de sync de la hoja es un espejo de la de la barra superior; no
  duplica lógica ni estado.

## 8. Validación

- `npm run audit`: **0 hallazgos**. Además de lo que ya revisaba (clases
  huérfanas, selectores sin destino, ids sin consulta, acciones sin `case` y
  funciones sin uso) ahora cubre tres frentes nuevos: iconos de `ICONS` que
  nadie pide, variables CSS declaradas y nunca usadas, y claves de `LAYOUT`
  que ningún helper consulta.
- Arnés de DOM con jsdom sobre `npm run preview`: el panel pinta saludo,
  saldo, dona, reparto, píldoras, accesos y tareas; las siete vistas navegan;
  la búsqueda global abre, busca con y sin acentos, navega con flechas y
  cierra con `Esc`; el filtro por estado filtra; el editor recalcula totales y
  pinta la vista previa; el borrador vacío se descarta al salir; sin errores
  de JavaScript.
- CSS parseado con `css-tree`: 774 reglas y 21 bloques `@media`, sin errores
  de sintaxis.
- **Pendiente de revisión humana**: el recorrido visual en un navegador real
  (el entorno de trabajo no tiene binario de navegador). La vista previa queda
  en el puerto 3000 para revisar móvil, tableta y escritorio.

## 9. Historial

- **v4.0 «Plano cromático»**: superficies opacas y escala tipográfica compacta.
- **v5.0 «Creative glass»**: vuelve la profundidad visual, pero no el movimiento.
- **v6.0 «Estudio»**: composición por zonas, riel lateral, listas densas y
  cifras integradas en la cabecera de cada pantalla.
- **v6.1 «Cristal»**: la tarjeta principal del panel pasa de franja oscura a
  vidrio translúcido con luces detrás.
- **v7.0 «Ámbar»**: tema claro con acentos naranjas y tarjetas de acceso rápido.
- **v8.0 «Pizarra»**: paleta azul pizarra, Inicio móvil con dona y rejilla de
  accesos, hoja de cliente/prospecto a pantalla completa; listas en tarjetas y
  navegación inferior flotante.
- **v9.0 «Imprenta»**: piel editorial con Archivo condensada, marcos de tinta y
  esquinas rectas. Se entregó como capa aparte (`css/imprenta.css`) para
  comparar.
- **v10** *(actual)*: las dos capas se funden en una sola hoja con lo mejor de
  cada una; radios y sombras unificados; cifras alineadas; micro-transiciones
  opcionales; búsqueda global, atajos de teclado, filtros por estado y
  descartado de borradores vacíos. Se retiran `css/imprenta.css` y
  `?estilo=pizarra`.
