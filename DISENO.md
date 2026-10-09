# Diseño de la interfaz — v3.3 «Vidrio y píldoras»

Notas del rediseño de octubre 2026. La interfaz vive en **una sola hoja**
(`css/app.css`), con **un solo tema (claro)** y una escala tipográfica corta.
`js/render.js` y `js/pdf.js` **no se tocaron**: el PDF y su vista previa
permanecen intactos.

> La v3.2 («Panel accionable») queda documentada abajo; la v3.3 añade
> **glassmorphism** y **píldoras** sobre esa base (ver §7).

---

## 1. Qué cambió respecto a la v3

| Antes | Ahora |
|---|---|
| Tres capas de CSS (`app.css` base + «Calma» + piel `skin-cristal.css`) | **Una hoja**: `css/app.css` (≈55 KB) |
| Tema claro / oscuro / automático, guardado y sincronizado | **Solo claro**, permanente. Sin conmutador ni script anti-destello |
| Menú a pantalla completa con índice y ficha de cifras | **Menú compacto desplegable** (botón ☰ del masthead y «Más» en la barra inferior) |
| Panel de «Actividad reciente» con filtros | Retirado; el inicio queda en héroe → acciones → indicadores → cobranza → to-do |
| Gráfica de 6 meses (2 barras por mes, SVG) | **Una barra horizontal partida en dos** (abonado / por cobrar) |
| ~20 tamaños de letra distintos (8.5 → 88 px) | **4 tamaños + una cifra** (10 / 11 / 12 / 14 px + 17 px) |
| Jerarquía por tamaño | Jerarquía por **negrita y color** |
| Vidrio esmerilado, fondo animado, desenfoques | Superficies **planas** de color sólido (mismo dibujo, menos costo) |
| jsPDF (364 KB) al abrir la app | Se descarga **solo al imprimir o enviar** |

---

## 2. Tipografía y acento

Los tokens están en `:root` al inicio de `css/app.css`:

| Token | Valor | Uso |
|---|---|---|
| `--fs-1` | 10px | etiquetas, metas, mayúsculas, píldoras |
| `--fs-2` | 11px | texto secundario, ayudas, chips |
| `--fs-3` | 12px | cuerpo, títulos de panel y de tarjeta |
| `--fs-4` | 14px | títulos de vista, barra del editor, modales |
| `--fs-n` | 17px | cifras (indicadores, saldos, precios) |
| `--fs-hero` | 22px | la cifra del héroe (saldo por cobrar) |

**Regla de acento:** cuando algo tiene que destacar, sube de **peso** (600/700)
y toma **color** (azul de marca, turquesa, verde, ámbar o rojo); nunca crece a
lo grande. Los títulos de vista no pasan de 14 px.

El interlineado base es 1.45 y los espacios se manejan con los valores cortos
de siempre (4 / 6 / 8 / 10 / 14 px). El panel de inicio mide ~15 % menos de
alto que en la v3.

---

## 3. Paleta

| Token | Valor | Uso |
|---|---|---|
| `--brand` | `#294d7b` | acciones principales, acentos |
| `--brand-ink` | `#294d7b` | texto azul legible sobre claro |
| `--brand-soft` | `rgba(41,77,123,.07)` | fondos de acento suaves |
| `--accent` | `#4fada5` | turquesa del documento (lo abonado) |
| `--bg` / `--surface` | `#f4f6f9` / `#ffffff` | fondo y tarjetas |
| `--ink` / `--ink-2` / `--ink-3` | `#1f2836` / `#5b6673` / `#6e7a87` | texto principal, secundario, terciario |
| `--ok` / `--warn` / `--danger` | `#278166` / `#a9762b` / `#bc5157` | estados |

`<html>` ya no lleva `data-theme` ni `data-skin`. En `Ajustes` ya no hay
sección «Apariencia».

---

## 4. Vistas

| # | Vista | ID | Notas |
|---|---|---|---|
| 01 | Inicio | `#view-inicio` | Héroe (saldo tap), barra de acciones, 3 indicadores, cobranza por documento y to-do por área |
| 02 | Documentos | `#view-list` | Recibos y cotizaciones |
| 03 | Por cobrar | `#view-cxc` | Saldos por cliente |
| 04 | Por pagar | `#view-cxp` | Gastos y facturas |
| 05 | Clientes | `#view-clientes` | Directorio (tabla que se vuelve tarjetas en móvil) |
| 06 | Catálogo | `#view-productos` | Productos y servicios |

La navegación se hace con `switchMainView(vista)`. Para añadir una sección:
agrega la `<section>` en `index.html`, súmala a `MAIN_VIEW_IDS` en `js/app.js`,
añade su caso en `switchMainView` y su botón en `#nav-pop`.

### 4.1 Menú compacto

- Se abre con el botón ☰ del masthead o con «Más» en la barra inferior.
- Es una lista corta (`#nav-pop`): Inicio, Documentos, Por cobrar, Por pagar,
  Clientes, Catálogo, Ajustes y Cerrar sesión. Sin cifras ni ficha lateral.
- Se cierra al elegir, al tocar fuera, con `Esc` o al redimensionar.
- En pantalla chica aparece pegado a la barra inferior; en escritorio, bajo el
  botón del masthead. `body.nav-open` marca el estado.

### 4.2 Héroe y acciones

- La cifra de **saldo por cobrar** es un botón: despliega una mini-lista de
  clientes con saldo (`#hero-debtors`). Tocar un cliente abre Por cobrar filtrado.
- El texto bajo la cifra reacciona: si hay vencimientos **hoy**, se pone ámbar
  con *«N vencimiento(s) hoy — Ver ahora»*; si ya hay vencidos, rojo.
  «Ver ahora» baja al to-do.
- Los 5 accesos (Cotizar, Recibo, Cliente, Gasto, Producto) viven en
  `#action-bar`, una fila **sticky** bajo el héroe, con icono chico y etiqueta
  siempre visible. El héroe solo habla de cobranza.

### 4.3 Cobranza (panel de inicio)

Una barra horizontal en `#chart-host` (sigue calculada por `cobranzaStats()`)
**más** una lista de documentos:

- El 100 % de la barra son **todos los documentos abiertos** (recibos y
  cotizaciones con saldo pendiente).
- **Turquesa** = lo ya abonado · **azul** = lo que falta por cobrar.
- Cada documento abierto muestra folio, cliente, vencimiento y monto, con
  **Cobrar** (abono) y un check de **Marcar pagado**.
- Un documento **sale de la barra** en cuanto se liquida; puede quedar un
  momento en la lista como «Pagado».

### 4.4 Indicadores y to-do

- *Por pagar / Facturado / Cobrado*: si el mes va en $0, el pie es un CTA
  (*Registrar gasto*, *Crear primera factura*, *Registrar recibo*) en vez de
  «sin movimientos aún». Si hay cifra, se muestra flecha o punto vs. el mes
  anterior.
- El panel de avisos se sustituye por **Áreas / To-Do** (`#todo-host`): tareas
  derivadas de datos reales, agrupadas en Contabilidad, Ventas y Cobranza.
  Cada una tiene prioridad (rojo / ámbar / verde), checkbox para darla por
  hecha (local) y botón *Ir*.

### 4.5 Móvil

- En ≤620 px los indicadores se vuelven **una fila por indicador**: icono y
  etiqueta a la izquierda, la cifra a la derecha (sin partirse nunca).
- La barra inferior (`#mobile-nav`) sigue apareciendo solo en móvil y fuera del
  editor y de la puerta de cuenta.

---

## 5. Peso

- `css/app.css`: **una hoja** (antes eran 144 KB entre dos archivos, con reglas
  pisándose).
- `js/app.js`: sin el código de temas ni del menú a pantalla completa.
- **jsPDF se carga bajo demanda** (`ensureJsPDF()` en `js/app.js`): el arranque
  de la app no arrastra 364 KB.
- Se eliminaron archivos que nada referenciaba: `css/skin-cristal.css`,
  las fuentes `SpaceGrotesk-*.ttf` y la carpeta `uploads/`.
  (`assets/fonts/Archivo-*.ttf` **se conservan**: los usa el PDF.)

---

## 6. Al publicar

`sw.js` sirve **primero la red** (`SIEMPRE_FRESCO`) para el HTML, el CSS y los
JS: si hay internet se baja la versión nueva y se refresca la caché, y sólo se
usa la caché cuando no hay señal.

Aun así, sube la versión de la caché (`const CACHE = 'mc-pwa-vNN'`) cuando
cambien los archivos: es lo que provoca que los teléfonos reinstalen el SW y
descartén las copias viejas de fuentes, logo e íconos.

> Al publicar la v3.2 se subió a `mc-pwa-v32`.

---

## 7. v3.3 — «Vidrio y píldoras»

Cambios de octubre 2026 sobre la v3.2:

- **El héroe es vidrio otra vez**: tarjeta semitransparente con degrade
  **azul → blanco** (`--grad-hero`), `backdrop-filter` y dos brillos internos
  (`::before` / `::after`). El texto del héroe sigue en blanco sobre la zona
  azul (arriba); la zona clara queda abajo, donde va la gráfica.
- **La gráfica horizontal de cobranza subió al héroe**: la barra
  abonado / por cobrar + su leyenda se renderizan en `#hero-chart-host`,
  dentro de una **franja de vidrio claro** (`.hero-chart`) con su propia
  cabecera («Cobranza» + píldora «n% abonado»). El panel inferior pasó a
  llamarse **«Por cobrar»** y conserva la lista de documentos
  (`cobranzaDocsHTML`); la gráfica es `cobranzaChartHTML`.
- **Lienzo en malla**: `body::before` (fijo, `z-index: -1`) pinta degradados
  radiales de marca sobre el fondo claro; las superficies de vidrio los
  desenfocan. Sin `backdrop-filter`, las tarjetas siguen siendo translúcidas.
- **Píldoras**: botones, chips activos (sólidos de marca), iconos, avatares,
  checks, buscadores, controles segmentados y el botón flotante «+» con
  `border-radius: 999px`. Los botones primarios y el pie de abono usan el
  degrade de marca.
- **Glassmorphism** en topbar, barra de acciones, indicadores, paneles del
  inicio, modales (con desenfoque del fondo), menú desplegable, toast, barra
  inferior móvil y puerta de cuenta (su fondo es transparente para ver la
  malla). Las tarjetas de lista usan translúcida **sin** desenfoque
  (`--glass-flat`) para no recargar equipos chicos.
- Tokens nuevos en `:root`: `--grad-hero`, `--glass`, `--glass-flat`,
  `--glass-soft`, `--glass-line`, `--glass-blur`.
- Al publicar la v3.3 se subió la caché a `mc-pwa-v34`.
