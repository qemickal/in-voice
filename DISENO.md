# Diseño de la interfaz — v5.0 «Creative glass»

Rediseño del 10 de octubre de 2026. Una interfaz de estudio creativo con
superficies de vidrio, tinta profunda, lavanda y menta. **Sin animaciones**,
sin frameworks visuales nuevos y con todos los recursos servidos localmente.

La interfaz sigue en `index.html`, `css/app.css` y `js/app.js`. El diseño de
los documentos (`layout.js`, `render.js`, `pdf.js`) se mantiene independiente.

## 1. Dirección visual

- **Hero con presencia:** degradado azul profundo, órbitas SVG estáticas y el
  mensaje «Menos gestión. Más creación.». El saldo, los deudores y la barra de
  cobranza permanecen conectados a los datos reales.
- **Vidrio con moderación:** transparencias, bordes luminosos y sombras suaves
  en las tarjetas. El `backdrop-filter` se limita a la cabecera, la navegación
  inferior y una superficie del hero; no se aplica a cada tarjeta ni fila.
- **Más jerarquía:** títulos y cifras grandes, textos secundarios discretos,
  iconos en recuadros de color y más espacio entre grupos.
- **Una identidad completa:** acceso, menú, documentos, cuentas, directorio,
  catálogo, tareas, editor y modales comparten el mismo sistema.
- **Estados útiles:** documentos pendientes/liquidados, saldos por cliente,
  prioridades y vacíos con acciones para empezar. No hay gráficas ficticias.

## 2. Tokens principales

| Token | Valor | Uso |
|---|---|---|
| `--brand` | `#5b55d9` | Acciones y navegación activa |
| `--brand-ink` | `#514bb8` | Texto lavanda legible sobre claro |
| `--mint` | `#b6f3dc` | CTA del hero y cobranza abonada |
| `--lavender` | `#c8bdff` | Acento del hero y del acceso |
| `--bg` | `#f3f4fa` | Lienzo y color de la PWA |
| `--ink` | `#22253d` | Texto principal |
| `--ink-2` / `--ink-3` | `#5c6079` / `#646882` | Texto secundario y metadatos |
| `--r-xl` / `--r-lg` | `24px` / `18px` | Tarjetas, paneles y controles |

**Archivo** continúa siendo la única familia, en WOFF2 local. Se precargan
los pesos 400 y 700. La escala de UI pasa a 11 / 12 / 14 / 16 px, con títulos
hasta 48 px y cifras hasta 46 px. Los campos editables usan al menos 16 px
para evitar el zoom automático de iOS; el documento conserva sus medidas en pt.

## 3. Distribución adaptable

| Tamaño | Navegación y distribución |
|---|---|
| Más de 980 px | Navegación en cabecera; hero y paneles en dos columnas |
| 761–980 px | Dock de vidrio flotante; editor con pestañas |
| Hasta 760 px | Navegación inferior con safe areas; hero y paneles apilados |
| Hasta 620 px | Hero resumido; indicadores en tarjetas horizontales y directorio en tarjetas |
| Hasta 560 px | Formularios y listas en una columna |

La navegación usa las mismas acciones existentes. Las vistas activas se
reflejan tanto en la cabecera como en la barra inferior, con `aria-current`.
Las cifras grandes y las etiquetas largas pueden envolver sin romper la rejilla.

## 4. Rapidez y accesibilidad

- Regla global `animation: none`, `transition: none`, `scroll-behavior: auto`.
  Las cifras se pintan directamente; no hay conteos, parallax ni hover animado.
- Geometría decorativa SVG y degradados CSS, sin imágenes pesadas adicionales.
- Si no hay soporte de blur, la composición sigue funcionando. Con
  `prefers-reduced-transparency`, se usan superficies opacas.
- Enlace «Ir al contenido», foco visible, búsquedas etiquetadas y aviso de
  guardado mediante `role="status"`.
- Menú y modales contienen el foco, bloquean el fondo con `inert`, se cierran
  con Escape y devuelven el foco al control de origen.
- La pantalla de cuenta oculta la interfaz de fondo, sin cambiar el flujo de
  autenticación ni los endpoints.

## 5. PWA y documentos

- Caché actual: **`mc-pwa-v50`**. HTML, CSS y JS siguen con estrategia
  *network-first*; fuentes, logo e iconos conservan *cache-first*.
- Las cuatro TTF de Archivo se precargan también en la caché, para que la
  **primera generación de PDF funcione sin conexión**.
- `/api/` queda fuera de la caché: no se guardan respuestas privadas ni se
  devuelve HTML como respaldo de una petición de sincronización.
- Manifest y `theme-color` coinciden con el nuevo fondo.
- La impresión excluye toda la UI. Los PDF siguen monocromos, en tamaño
  Letter y con sus coordenadas originales. No se modificó el motor de cálculo.

Al actualizar la interfaz, subir siempre la versión de la caché para que
los dispositivos instalados descarten los recursos viejos.

## 6. Vista previa local

```sh
npm run preview
```

Abre el puerto 3000 en `0.0.0.0`, con datos de ejemplo identificados como
**«Demo local»**. Se guardan en un espacio de almacenamiento separado
(`in-voice-preview:`); no se crean tokens, no se envían datos a una API y no
se instala el service worker. `/?auth=1` permite inspeccionar el acceso real.

```sh
npm run dev
```

Sirve la interfaz real con puerta de cuenta y service worker. Este servidor
estático no reemplaza las Functions de Vercel: la cuenta y la sincronización
necesitan el backend descrito en `SINCRONIZACION.md`.

Los scripts de demo **no se incluyen en `index.html` ni en la caché de
producción**: sólo los inyecta el servidor de desarrollo con `--demo`.

## 7. Validación del rediseño

Pruebas realizadas con Chromium / Playwright:

- 12 anchos: 320, 360, 390, 430, 620, 760, 768, 980, 1024, 1280, 1440 y 1920 px.
- Panel, deudores, seis secciones, búsqueda, menú, ajustes y editor.
- Guardado de documentos, pestañas de vista previa y formularios de cuenta.
- Sin desbordamientos horizontales, animaciones activas ni errores JS.
- Comprobaciones axe WCAG AA en panel, documentos, menú y acceso: sin
  infracciones en las vistas comprobadas. No sustituye una auditoría completa.
- App real con API simulada en un contexto de prueba: recarga y guardado
  offline, primera descarga PDF offline, impresión Letter de una página y
  conservación del icono de enviar tras la descarga.

## 8. Historial

- **v4.0 «Plano cromático»**: superficies opacas y escala tipográfica compacta.
- **v5.0 «Creative glass»**: vuelve la profundidad visual, pero no el movimiento.
