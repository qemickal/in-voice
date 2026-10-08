# Diseño de la interfaz — v3.2 «Cielo abierto»

Notas del rediseño de octubre 2026. La interfaz vive en **una sola hoja**
(`css/app.css`), con **un solo tema (claro)** y una escala tipográfica corta.
`js/render.js` y `js/pdf.js` **no se tocaron**: el PDF y su vista previa
permanecen intactos.

---

## 1. Qué cambió respecto a la v3.1

| Antes (v3.1) | Ahora (v3.2) |
|---|---|
| Fondo plano `#f4f6f9` | **Degrade azul → blanco** fijo a la ventana (`body::before`) |
| Héroe como tarjeta azul con degradado de marca | **Sin tarjeta**: el contenido va directo sobre el degrade |
| Texto del héroe en blanco sobre azul | Tinta oscura; el saldo por cobrar lleva el **azul de marca** |
| Accesos rápidos transparentes sobre la tarjeta | **Baldosas de vidrio claro** que flotan sobre el degrade |
| Menú compacto (lista de 290 px bajo el ☰) | **Hoja a pantalla completa**, con cabecera y aspa de cierre |
| Barra inferior móvil pegada al borde | **Píldora flotante** con aire a los lados |
| Barra superior blanca opaca | Barra **traslúcida** que deja ver el degrade |
| `--ink-2` / `--ink-3` / `--warn` / `--accent-ink` claros | Un pelo más oscuros: con fondo azul se lavaban |

Lo demás se queda como estaba: una sola hoja, tema claro fijo, 4 tamaños de
letra, jerarquía por peso y color, y jsPDF cargado bajo demanda.

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
de siempre (4 / 6 / 8 / 10 / 14 px).

---

## 3. Paleta

| Token | Valor | Uso |
|---|---|---|
| `--brand` | `#294d7b` | acciones principales, acentos |
| `--brand-ink` | `#294d7b` | texto azul legible sobre claro **y sobre el degrade** |
| `--brand-soft` | `rgba(41,77,123,.07)` | fondos de acento suaves |
| `--accent` / `--accent-ink` | `#4fada5` / `#2b7a74` | turquesa del documento (lo abonado) |
| `--grad-page` | azul → blanco | el fondo de toda la app (ver §3.1) |
| `--veil` | `rgba(255,255,255,.62)` | velo de las baldosas flotantes |
| `--bg` / `--surface` | `#e9f0f8` / `#ffffff` | respaldo del fondo y tarjetas |
| `--ink` / `--ink-2` / `--ink-3` | `#1f2836` / `#52606d` / `#626e7b` | texto principal, secundario, terciario |
| `--ok` / `--warn` / `--danger` | `#278166` / `#96661f` / `#bc5157` | estados |

`<html>` no lleva `data-theme` ni `data-skin`. En `Ajustes` no hay sección
«Apariencia».

### 3.1 El degrade del fondo

```css
body::before {
  content: ''; position: fixed; inset: 0; z-index: -1;
  background-image: var(--grad-page);
}
```

- Va en un **pseudo-elemento fijo** en vez de `background-attachment: fixed`
  sobre `<body>`: es lo que mejor se comporta en Safari de iOS.
- `--grad-page` son dos capas: un **resplandor turquesa** arriba a la derecha
  (hereda el acento del documento) y un **lineal vertical** que va de
  `#bed7ec` a `#ffffff`.
- El azul superior es claro a propósito: la tinta oscura de las vistas
  (Documentos, Clientes, Catálogo…) tiene que seguir leyéndose bien ahí
  encima. Contraste medido sobre `#bed7ec`: `--ink` 9.6:1, `--brand-ink`
  5.6:1, `--ink-2` 4.3:1.
- En **impresión** `body::before` se apaga: el papel sale en blanco.

---

## 4. Vistas

| # | Vista | ID | Notas |
|---|---|---|---|
| 01 | Inicio | `#view-inicio` | Encabezado sin tarjeta, accesos, 3 indicadores, cobranza y avisos |
| 02 | Documentos | `#view-list` | Recibos y cotizaciones |
| 03 | Por cobrar | `#view-cxc` | Saldos por cliente |
| 04 | Por pagar | `#view-cxp` | Gastos y facturas |
| 05 | Clientes | `#view-clientes` | Directorio (tabla que se vuelve tarjetas en móvil) |
| 06 | Catálogo | `#view-productos` | Productos y servicios |

La navegación se hace con `switchMainView(vista)`. Para añadir una sección:
agrega la `<section>` en `index.html`, súmala a `MAIN_VIEW_IDS` en `js/app.js`,
añade su caso en `switchMainView` y su botón en `#nav-pop`.

### 4.1 Héroe sin tarjeta

`.hero` ya no pinta nada: sin fondo, sin radio, sin sombra. Todo el peso lo
llevan la tipografía y el color:

- `--kicker` en azul de marca, título en tinta, subtítulo en tinta secundaria.
- El **saldo por cobrar** (22 px) en azul de marca: es la mancha de color.
- Las píldoras de estado pasan a ser blancas (`is-ok` verde, `is-alert` ámbar).

### 4.2 Accesos rápidos

Los 5 accesos van **siempre en una sola fila** (`display: flex` + `flex: 1 1 0`),
cada uno como una baldosa de `rgba(255,255,255,.62)` con borde claro y
`--shadow-1`. Al pasar el ratón suben 1 px y ganan sombra; en táctil sólo
cambian el fondo.

### 4.3 Menú a pantalla completa

- Se abre con el ☰ del masthead o con «Más» en la barra inferior.
- Es una **hoja fija a toda la ventana** (`.nav-pop`, `z-index: 65`): por
  encima de la barra superior (40) y de la barra inferior (55), por debajo de
  los modales (70) y de la puerta de cuenta (100).
- Estructura: `.nav-pop-head` (logo, nombre y aspa) → `.nav-pop-list`
  (secciones, separador, ajustes y cerrar sesión) → `.nav-pop-foot`.
- Cada opción es una fila grande: icono en baldosa de 38 px, título y
  descripción. Entran en cascada (`--i` en el HTML + `rise-in`).
- La **sección actual queda marcada** (`.nav-pop-item.active`): lo hace
  `markNavPopActive()` en `js/app.js` con el mapa `NAV_POP_VIEW`.
- Se cierra al elegir, con el aspa, tocando el fondo de la hoja, con `Esc` o
  si el ancho de la ventana cambia de verdad (giro del teléfono).
- `body.nav-open` congela el desplazamiento de la página de abajo; la hoja
  tiene su propio `overflow-y: auto`.
- Accesibilidad: `role="dialog"` + `aria-modal="true"`, las opciones son
  botones normales y el foco entra al aspa al abrir.

### 4.4 Cobranza (panel de inicio)

Una sola barra horizontal en `#chart-host`, calculada por `cobranzaStats()`:

- El 100 % de la barra son **todos los documentos abiertos** (recibos y
  cotizaciones con saldo pendiente).
- **Turquesa** = lo ya abonado · **azul** = lo que falta por cobrar.
- Un documento **sale de la barra** en cuanto se liquida (deja de contar en el
  100 %); el pie indica cuántos ya se liquidaron.
- Debajo, dos lecturas con el monto y el porcentaje de cada color.

### 4.5 Móvil

- Los 5 accesos del encabezado van en una sola fila, con su etiqueta visible.
- En ≤620 px los indicadores se vuelven **una fila por indicador**: icono y
  etiqueta a la izquierda, la cifra a la derecha (sin partirse nunca).
- La barra inferior (`#mobile-nav`) es una **píldora flotante** (`left/right:
  10px`, `border-radius: 20px`) y sigue apareciendo sólo en móvil, fuera del
  editor y de la puerta de cuenta.

---

## 5. Peso

- `css/app.css`: **una hoja** (≈57 KB).
- **jsPDF se carga bajo demanda** (`ensureJsPDF()` en `js/app.js`).
- **Desenfoque (`backdrop-filter`) en sólo tres piezas** y siempre dentro de
  `@supports`, con respaldo traslúcido sin blur:

  | Pieza | Blur | Respaldo sin blur |
  |---|---|---|
  | `#topbar` | 14 px | `rgba(255,255,255,.58)` |
  | `.nav-pop` (hoja del menú) | 20 px | `rgba(255,255,255,.93)` |
  | `#mobile-nav` | 16 px | `rgba(255,255,255,.92)` |

  Son elementos fijos, sin contenido animado detrás: el costo se paga una vez.
  Ninguna tarjeta, lista ni documento usa blur.
- Sin fondos animados ni partículas. Las únicas animaciones son las de entrada
  (`rise-in`, `sheet-in`) y respetan `prefers-reduced-motion`.

---

## 6. Al publicar

`sw.js` sirve **primero la red** (`SIEMPRE_FRESCO`) para el HTML, el CSS y los
JS: si hay internet se baja la versión nueva y se refresca la caché, y sólo se
usa la caché cuando no hay señal.

Aun así, sube la versión de la caché (`const CACHE = 'mc-pwa-vNN'`) cuando
cambien los archivos: es lo que provoca que los teléfonos reinstalen el SW y
descarten las copias viejas de fuentes, logo e íconos.

> Al publicar la v3.2 se subió a `mc-pwa-v32`. Como el color de la barra del
> navegador cambió, también se actualizaron `theme_color` y `background_color`
> en `manifest.webmanifest` y el `<meta name="theme-color">` de `index.html`
> (los tres a `#bed7ec`, el azul del extremo superior del degrade).
