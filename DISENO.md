# Diseño de la interfaz — v3 «Calma»

Notas del rediseño visual de octubre 2026. La capa `17 · Interfaz — Calma` de
`css/app.css` establece la paleta, tipografía Archivo, superficies claras, radios
y espacios; `js/app.js` mantiene los datos y el tema. **No se tocaron
`js/render.js` ni `js/pdf.js`**: el PDF y su vista previa permanecen intactos.

---

## 1. Paleta y tokens

Los tokens de la interfaz están en la capa `17 · Interfaz — Calma` al final de
`css/app.css`. El sistema usa Archivo en todos los componentes, superficies
claras, bordes suaves y un acento azul sobrio; el tema oscuro tiene su propia
paleta y conserva contraste.

| Token | Valor | Uso |
|---|---|---|
| `--brand` | `#294d7b` | Azul de marca para acciones y foco |
| `--brand-500` | `#3b6ca7` | Azul de apoyo para cifras e íconos |
| `--accent` | `#5bb5ad` | Turquesa del documento (gráfica, realces) |
| `--grad-brand` | color sólido | Acciones principales, sin degradados llamativos |
| `--r-lg` | `18px` | Esquinas de tarjetas y paneles |
| `--sans` / `--display` | `Archivo` | Tipografía única de la interfaz |

> Regla práctica: para **pintar** usa `--brand`; para **escribir** en azul usa
> `--brand-ink` (cambia solo según el tema y garantiza contraste).

### Temas

`<html data-theme="light|dark">` + `<html data-theme-mode="auto|light|dark">`.

- El modo se guarda en `mc_settings.theme` y **viaja con la sincronización**.
- Un script en el `<head>` fija el tema antes del primer pintado (sin destello).
- En modo `auto` un `matchMedia` reacciona al cambio del sistema en vivo.
- Se cambia desde **Ajustes → Apariencia** o con el botón de luna en la barra
  superior (rota auto → claro → oscuro).

---

## 2. Vistas

| # | Vista | ID | Notas |
|---|---|---|---|
| 01 | Inicio | `#view-inicio` | Panel general (nuevo) |
| 02 | Documentos | `#view-list` | Recibos y cotizaciones |
| 03 | Por cobrar | `#view-cxc` | Saldos por cliente |
| 04 | Por pagar | `#view-cxp` | Gastos y facturas |
| 05 | Clientes | `#view-clientes` | Clientes y prospectos |
| 06 | Catálogo | `#view-productos` | Productos y servicios del catálogo |

La navegación se hace con `switchMainView(vista)`. Para añadir una sección:
agrega la `<section>` en `index.html`, súmala a `MENU_VIEWS` en `js/app.js` y
añade su caso en `switchMainView`.

---

## 2.1 Catálogo de productos y servicios

Es la sección **06 · Catálogo** (`#view-productos`). Guarda lo que vendes para
no tener que teclearlo dos veces:

| Campo | Uso |
|---|---|
| Tipo | Producto o servicio (cambia la píldora de la tarjeta y el grupo del selector) |
| Nombre | Se copia como descripción del concepto |
| Precio por unidad | Se copia en «Precio U» |
| Unidad de medida | Se copia en «Unidad» y se imprime junto a la cantidad (`500 pza`) |
| Características | Una por línea; se imprimen bajo la descripción, en cuerpo menor |
| Clave / SKU y notas | Referencia interna; las notas **no** se imprimen |

- Los datos viven en `mc_productos` y **viajan con la sincronización**.
- Desde el editor de recibos y cotizaciones, el selector «Agregar del catálogo»
  inserta un concepto con esos datos. Si el documento sólo tenía el renglón
  vacío inicial, ese renglón se reemplaza.
- El concepto queda como copia: editar el catálogo después **no** modifica los
  documentos ya hechos.
- En el documento (vista previa y PDF): la unidad acompaña a la columna Q y se
  imprimen hasta 4 características (`LAYOUT.itemFeatsMax`). Si la tabla se
  llena, el motor recorta primero características y luego la descripción,
  igual que ya hacía antes.

---

## 3. Panel de inicio

`renderInicio()` en `js/app.js` compone todo a partir de los datos locales, sin
peticiones extra:

| Bloque | Fuente |
|---|---|
| Hero (saludo, fecha, chips) | `docs`, `mc_cxp`, fecha del sistema |
| 3 indicadores (Por pagar, Facturado, Cobrado) | `getCxCData()`, `cxpStats()`, `monthlySeries(6)` |
| Gráfica de 6 meses | `monthlySeries(6)` → SVG generado en `buildChart()` |
| Requiere tu atención | Vencimientos de CxP, cotizaciones vencidas, saldos con +30 días |
| Actividad reciente | Documentos y cuentas por pagar ordenados por `updatedAt` |

Los montos de los indicadores se animan con `countUp()`, que incluye una red de
seguridad (`setTimeout`) para que la cifra final siempre quede pintada.

### 3.1 Panel en teléfono (≤760 px)

Las dos zonas del panel que más se desacomodaban tienen ahora **una sola regla
viva**, al final de `css/skin-cristal.css` (sección «18.13 · MÓVIL»):

- **Accesos rápidos:** 5 mosaicos *en una sola fila*, siempre. Se arma con
  `display: flex` + `flex: 1 1 0` (no con `grid-template-columns: repeat(…)`)
  para que el ancho se reparta entre los que haya y ningún botón quede solo en
  una segunda fila. Cada mosaico lleva su etiqueta visible (`Cotizar`,
  `Recibo`, `Cliente`, `Gasto`, `Producto`); sin ella los 5 iconos se confunden.
- **Indicadores:** en lugar de rejilla, una lista de filas. Cada tarjeta usa
  `grid-template-areas: "cabeza monto" "pie pie"` → icono + etiqueta a la
  izquierda, el monto a la derecha (con `white-space: nowrap`, la cifra nunca
  se parte) y el pie en su renglón. Las 3 filas miden lo mismo y ya no queda
  una tarjeta huérfana centrada a media anchura.

Prohibido para estas dos zonas: reglas tipo
`:last-child:nth-child(odd) { grid-column: 1 / -1; justify-self: center }`.
Fueron tres intentos anteriores de «centrar la que sobra» y lo que hacían era
sacar el último elemento de la fila y romper el alineamiento.

---

## 4. Menú a pantalla completa

Se eliminó el arco numerado. El menú mantiene su índice numerado, ahora con una
superficie clara y el mismo lenguaje visual sobrio que el resto de la app:

- El **botón flotante** (abajo a la derecha) abre el menú y se transforma en aspa.
- El menú muestra un **índice numerado** con la cifra viva de cada sección y una
  **ficha lateral** con el detalle y el botón *Entrar*.
- Al pasar el cursor o enfocar una fila se adelanta la ficha.
- Teclado: flechas para recorrer, `Esc` para cerrar; el foco entra en la fila
  activa al abrir.

---

## 4.1 Barra del editor

Acciones del documento, de izquierda a derecha:
*Volver* → *Guardar* → *PDF / Imprimir* → *Enviar* → *Eliminar*.

- **Enviar** genera el PDF y hace lo mejor que permite el dispositivo: abre el
  panel nativo de compartir (si el navegador acepta archivos) o descarga el PDF
  y abre el correo con el asunto y el cuerpo ya escritos.
- Antes había también un botón **Compartir**; hacía exactamente lo mismo que
  *Enviar*, así que se eliminó para no duplicar la acción.

---

## 5. Movimiento

- Entrada escalonada: las tarjetas usan `--i` (0, 1, 2…) para el retardo.
- El fondo es plano y el botón flotante ya no tiene pulso; el movimiento queda
  reservado para indicar cambios o respuestas de la interfaz.
- Todo respeta `@media (prefers-reduced-motion: reduce)`.

---

## 6. Al publicar

`sw.js` sirve **primero la red** (`SIEMPRE_FRESCO`) para el HTML, el CSS y los
JS: si hay internet se baja la versión nueva y se refresca la caché, y sólo se
usa la caché cuando no hay señal. Así un arreglo de diseño ya no queda
«invisible» en el celular por culpa del service worker.

Aun así, sube la versión del caché (`const CACHE = 'mc-pwa-vNN'`) cuando
cambien los archivos: es lo que provoca que los teléfonos reinstalen el SW y
descarten las copias viejas de fuentes, logo e íconos (esos siguen cache-first).

---

## 7. Limpieza (2026-10)

Se eliminó la carpeta `in-voice/` que vivía dentro del repositorio: era una
copia obsoleta de la app (sin las vistas de Por cobrar, Por pagar ni Clientes)
y nada la referenciaba. El sitio se sirve siempre desde la raíz del
repositorio. Si alguien tenía guardada la URL antigua `/in-voice/pwa/`, ya no
existe; la app está en la raíz.
