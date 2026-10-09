# Diseño de la interfaz — v4.0 «Plano cromático»

Notas del rediseño de octubre 2026. La interfaz vive en **una sola hoja**
(`css/app.css`), con **un solo tema (claro)**, tipografía **Archivo** y una
escala tipográfica corta. La jerarquía la carga el **color**, no el tamaño.

> Las versiones anteriores (v3.2 «Panel accionable» y v3.3 «Vidrio y
> píldoras») quedan resumidas al final, en §9.

---

## 1. Qué cambió respecto a la v3.3

| Antes (v3.3) | Ahora (v4.0) |
|---|---|
| Glassmorphism: `backdrop-filter`, translúcidos y degradados | **Superficies planas**: blanco sólido, borde de 1 px, sombra mínima |
| Lienzo con degradados radiales (`body::before`) | Fondo liso `--bg` (#f1f4f8) |
| Animaciones: `rise-in`, `view-in`, `pop-in`, `modal-in`, conteo de cifras, barras que crecen | **Cero animaciones**: no hay `@keyframes`, `transition` ni conteo |
| Dos botones de menú (☰ en el masthead y «Más» abajo) | **Uno solo**: «Más», en la barra inferior |
| Menú compacto: lista flotante de ~290 px | **Menú a pantalla completa**, con cabecera, dos grupos y pie |
| Jerarquía repartida entre tamaño, peso y color | Jerarquía por **color + peso**; los tamaños casi no se mueven |
| Barra inferior sólo en móvil | La misma barra, también en escritorio como **dock flotante** |
| Folio del PDF con código de barras Code 128 | **Folio en texto**, rótulo chico + número en negrita |
| PDF con acentos en azul / turquesa | **PDF monocromo**: los acentos van en negrita |

---

## 2. Tipografía

Toda la interfaz es **Archivo** (`assets/fonts/archivo-latin-*.woff2`, pesos
300/400/500/700), declarada en `--sans` y usada también por el PDF
(`assets/fonts/Archivo-*.ttf`).

| Token | Valor | Uso |
|---|---|---|
| `--fs-1` | 10px | etiquetas, metas, mayúsculas, píldoras |
| `--fs-2` | 11px | texto secundario, ayudas, chips |
| `--fs-3` | 12px | cuerpo, títulos de panel y de tarjeta |
| `--fs-4` | 14px | títulos de vista, barra del editor, modales |
| `--fs-n` | 17px | cifras (indicadores, saldos, precios) |
| `--fs-hero` | 20px | la cifra del héroe (saldo por cobrar) |

**Regla de acento:** cuando algo tiene que destacar sube de **peso** (700) y
toma **color** (azul de marca, turquesa, verde, ámbar o rojo); nunca crece a
lo grande. Ningún título de vista pasa de 14 px. El cuerpo se queda en 12 px
a propósito: así cabe más información útil por pantalla.

---

## 3. Paleta

| Token | Valor | Uso |
|---|---|---|
| `--brand` / `--brand-700` | `#2b5286` / `#24497a` | acciones principales, estado activo |
| `--brand-ink` | `#234a78` | texto azul legible sobre claro |
| `--brand-soft` / `--brand-soft-2` | `#eef3f9` / `#dde7f2` | fondos de acento |
| `--accent` / `--accent-ink` | `#0f9d8f` / `#0b7c71` | turquesa: cotizaciones y lo abonado |
| `--bg` / `--surface` / `--surface-2` | `#f1f4f8` / `#ffffff` / `#f8fafc` | fondo, tarjetas, filas |
| `--line` / `--line-2` | `#e2e8f0` / `#ccd6e1` | bordes |
| `--ink` / `--ink-2` / `--ink-3` | `#101c2c` / `#47596c` / `#6c7f92` | texto principal, secundario, terciario |
| `--ok` / `--warn` / `--danger` | `#0f7b56` / `#a86414` / `#b03a3f` | estados (con su variante `-soft`) |

Los tokens `--glass*`, `--grad-brand` y `--grad-hero` siguen existiendo como
**alias planos** (sólidos, `--glass-blur: none`) para no romper reglas viejas.

### Dónde trabaja el color

- **Filete izquierdo de 3 px**: en los indicadores (`.stat-card::before`),
  en las tarjetas de documento (azul = recibo, turquesa = cotización) y en
  las cuentas por pagar (verde = pagada, ámbar = parcial, azul = pendiente).
- **Etiqueta y cifra del indicador** comparten tono (`.tone-warn`,
  `.tone-ok`, `.tone-accent`), así se lee el estado sin leer el número.
- **Accesos rápidos**: cada uno tiene su color de icono (azul, turquesa,
  verde, ámbar, azul oscuro) para reconocerlos de un vistazo.
- **Píldoras**: `solid` azul = recibo, `ghost` turquesa = cotización.

---

## 4. Sin animaciones

- No queda ningún `@keyframes` ni `transition` en `css/app.css`.
- `--dur-1` y `--dur-2` valen `0s` y `--ease-out` es `linear`: si alguna
  regla futura las usa, el cambio sigue siendo instantáneo.
- `countUp()` en `js/app.js` pinta la cifra final de una vez.
- Se eliminó `prefersReducedMotion()`: ya no hace falta, y el
  `scrollIntoView` del to-do usa `behavior: 'auto'`.
- Lo único que se mueve es el estado (`:hover`, `aria-pressed`, `.active`),
  y lo hace sin interpolación.

---

## 5. Navegación

### 5.1 Barra inferior (única)

`#mobile-nav` es la navegación principal: Inicio · Archivo · **+** (nuevo
recibo) · Cobros · **Más**. En ≤760 px va pegada al borde inferior; en
escritorio (≥761 px) es un **dock flotante** centrado de 540 px con píldoras
horizontales. No aparece en el editor ni en la puerta de cuenta.

### 5.2 Menú a pantalla completa

- Se abre **sólo** con «Más» (el botón ☰ del masthead desapareció).
- `#nav-pop` ocupa todo el viewport (`position: fixed; inset: 0`), con
  cabecera (marca + ✕), dos grupos en rejilla — *Secciones* y *Cuenta* — y
  un pie de estado. Cada ítem es una tarjeta con icono en recuadro,
  título y descripción.
- Se cierra al elegir sección, con el ✕ o con `Esc`. Ya no se cierra al
  tocar fuera (no hay fuera) ni al redimensionar (lo disparaba el teclado
  del móvil). `body.nav-open` bloquea el scroll del fondo.

### 5.3 Vistas

| # | Vista | ID |
|---|---|---|
| 01 | Inicio | `#view-inicio` |
| 02 | Documentos | `#view-list` |
| 03 | Por cobrar | `#view-cxc` |
| 04 | Por pagar | `#view-cxp` |
| 05 | Clientes | `#view-clientes` |
| 06 | Catálogo | `#view-productos` |
| 07 | Tareas | `#view-tareas` |

Para añadir una sección: agrega la `<section>` en `index.html`, súmala a
`MAIN_VIEW_IDS` en `js/app.js`, añade su caso en `switchMainView` y su botón
en `#nav-pop`.

---

## 6. El panel de inicio

1. **Héroe** (`.hero`): bloque azul sólido. Saludo, fecha, saldo por cobrar
   (botón que despliega deudores) y aviso de vencimientos en ámbar o rojo.
   Dentro lleva la **franja de cobranza**: barra partida abonado / por cobrar
   con su leyenda y la píldora «n % abonado».
2. **Accesos rápidos** (`#action-bar`): fila *sticky* bajo el héroe, cinco
   botones con icono de color y etiqueta.
3. **Indicadores** (`#stat-grid`): Por pagar · Facturado · Cobrado. Cada uno
   con filete, icono y etiqueta del mismo tono. En ≤620 px pasan a una fila
   por indicador con la cifra a la derecha.
4. **Por cobrar** (`#chart-host`): la lista de documentos abiertos con
   *Cobrar* y el check de *Marcar pagado*.
5. **Áreas / To-Do** (`#todo-host`): tareas derivadas de datos reales,
   agrupadas en Contabilidad, Ventas, Cobranza y General, con punto de
   prioridad (rojo / ámbar / verde).

---

## 7. El documento (PDF y vista previa)

`js/layout.js` es la especificación; `js/render.js` la dibuja en HTML y
`js/pdf.js` en jsPDF, con **las mismas coordenadas**.

- **Monocromo.** La paleta de `LAYOUT` pasó a escala de grises
  (`brand` #141B26, `steel` #3E4856, `grey` #7E8896, `body` #333A47). Los
  acentos — ITEM / Q / $ U / SUB TOTAL, SUBTOTAL, POR PAGAR, P.O. TRACK,
  PAGOS, TÉRMINOS, LIQUIDADO — se marcan con **negrita**, no con azul ni
  turquesa.
- **Sin código de barras.** El bloque de folio es ahora el rótulo `FOLIO`
  en 8 pt sobre el número en 15 pt negrita, alineados a la derecha. El
  prefijo ya identifica el documento (PO = recibo, RQ = cotización). Se
  borró el motor Code 128 completo de `layout.js` (~115 líneas) y el
  código de barras decorativo de la puerta de cuenta.
- **Cabecera alineada.** El logo ocupa `34,28 → 110,86`. El nombre de la
  empresa arranca en `x=126` (justo a su derecha) con línea base en `y=56`,
  y la bajada «// estudio creativo» baja a **su propia línea** (`y=72`, 9.5
  pt) con la misma sangría. Antes el subtítulo se imprimía en línea tras el
  nombre y la pareja quedaba descolgada del logo; ahora el bloque de texto
  queda centrado ópticamente contra el alto del logo.

El resto del documento (tabla de conceptos, totales, P.O. TRACK, PAGOS +
TÉRMINOS a dos columnas, pie y fondo string-art) no cambió de posición.

---

## 8. Al publicar

`sw.js` sirve **primero la red** (`SIEMPRE_FRESCO`) para el HTML, el CSS y
los JS: si hay internet se baja la versión nueva y se refresca la caché, y
sólo se usa la caché cuando no hay señal.

Aun así, sube la versión de la caché (`const CACHE = 'mc-pwa-vNN'`) cuando
cambien los archivos: es lo que provoca que los teléfonos reinstalen el SW y
descarten las copias viejas de fuentes, logo e íconos.

> Al publicar la v4.0 se subió a `mc-pwa-v40`.

---

## 9. Historial

- **v3.2 «Panel accionable»**: una sola hoja de CSS, tema claro único,
  escala de 4 tamaños, menú compacto desplegable, barra de cobranza
  partida en dos, jsPDF bajo demanda.
- **v3.3 «Vidrio y píldoras»**: glassmorphism en topbar, paneles y modales,
  héroe con degradado y brillos, lienzo de degradados radiales, todo en
  píldoras. Revertido por la v4.0 a superficies planas.
