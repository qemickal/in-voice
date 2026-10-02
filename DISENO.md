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

La navegación se hace con `switchMainView(vista)`. Para añadir una sección:
agrega la `<section>` en `index.html`, súmala a `MENU_VIEWS` en `js/app.js` y
añade su caso en `switchMainView`.

---

## 3. Panel de inicio

`renderInicio()` en `js/app.js` compone todo a partir de los datos locales, sin
peticiones extra:

| Bloque | Fuente |
|---|---|
| Hero (saludo, fecha, chips) | `docs`, `mc_cxp`, fecha del sistema |
| 4 indicadores | `getCxCData()`, `cxpStats()`, `monthlySeries(6)` |
| Gráfica de 6 meses | `monthlySeries(6)` → SVG generado en `buildChart()` |
| Requiere tu atención | Vencimientos de CxP, cotizaciones vencidas, saldos con +30 días |
| Actividad reciente | Documentos y cuentas por pagar ordenados por `updatedAt` |

Los montos de los indicadores se animan con `countUp()`, que incluye una red de
seguridad (`setTimeout`) para que la cifra final siempre quede pintada.

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

## 5. Movimiento

- Entrada escalonada: las tarjetas usan `--i` (0, 1, 2…) para el retardo.
- El fondo es plano y el botón flotante ya no tiene pulso; el movimiento queda
  reservado para indicar cambios o respuestas de la interfaz.
- Todo respeta `@media (prefers-reduced-motion: reduce)`.

---

## 6. Al publicar

Si cambias `css/app.css` o `js/*.js`, sube la versión del caché en `sw.js`
(`const CACHE = 'mc-pwa-vNN'`) para que los usuarios reciban los archivos nuevos.

---

## 7. Limpieza (2026-10)

Se eliminó la carpeta `in-voice/` que vivía dentro del repositorio: era una
copia obsoleta de la app (sin las vistas de Por cobrar, Por pagar ni Clientes)
y nada la referenciaba. El sitio se sirve siempre desde la raíz del
repositorio. Si alguien tenía guardada la URL antigua `/in-voice/pwa/`, ya no
existe; la app está en la raíz.
