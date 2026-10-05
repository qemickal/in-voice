# Integrar la piel «Cristal» (capa 18)

Guía para llevar el estilo de la referencia a `in-voice` **sin tocar datos, PDF ni comportamiento**.
Todo lo de abajo ya está probado en la copia `in-voice-cristal/` y en la rama `piel-cristal` del clon.

---

## 1. Qué es y qué no es

| Es | No es |
|---|---|
| Una capa CSS más (`18 · Piel — Cristal`) que **re-viste** los componentes existentes usando los mismos tokens | Un rediseño: no cambia HTML de componentes, ni IDs, ni clases, ni JS de datos |
| Un conmutador (`data-skin`) reversible: quitar el atributo devuelve la app a «Calma» exactamente como está hoy | Un cambio de marca: `--accent` turquesa y el Archivo del documento se conservan |
| Dos claves: **oscura** (la referencia) y **clara** («cristal diurno») | Un cambio del motor de PDF/vista previa: eso vive en `render.js`/`pdf.js` y **no se tocó** |

**Archivos de la piel**

```
css/skin-cristal.css      ← la capa completa (tokens, vidrio, menú, impresión, modo ligero)
```

**Tres ediciones al repo (nada más)**

1. `index.html` → un `<link>` después de `app.css`.
2. `index.html` → cuatro líneas en el script de tema (antes del primer pintado) para fijar `data-skin`.
3. `sw.js` → `CACHE` a `'mc-pwa-v25'` y sumar `./css/skin-cristal.css` a `ASSETS`.

---

## 2. Parche exacto

### 2.1 `index.html` — el `<link>`

```html
<link rel="stylesheet" href="css/app.css">
<link rel="stylesheet" href="css/skin-cristal.css">   <!-- capa 18 -->
```

### 2.2 `index.html` — el atributo (sin destello)

Dentro del script que ya fija el tema, **después** de `data-theme`:

```js
      root.setAttribute('data-theme-mode', mode);

      /* Capa 18 · «Cristal»: piel opcional (ver css/skin-cristal.css) */
      var skin = 'cristal';
      try { skin = localStorage.getItem('mc_skin') || 'cristal'; } catch (e) { }
      root.setAttribute('data-skin', skin);
```

| `data-skin` | Resultado |
|---|---|
| `"cristal"` | Piel nueva. El tema claro/oscuro sigue funcionando y el **claro usa «cristal diurno»**. |
| *(sin atributo / `"calma"`)* | La app de hoy, idéntica. |

**Para arrancar con la piel apagada** y encenderla desde Ajustes: cambia `|| 'cristal'` por `|| 'calma'`.

### 2.3 `sw.js` — caché

```js
const CACHE = 'mc-pwa-v25';                 // subir versión: obligatorio
const ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './css/skin-cristal.css',                 // ← nuevo
  ...
];
```

### 2.4 Nada más

No hay que tocar `js/app.js`, `js/layout.js`, `js/render.js`, `js/pdf.js` ni `js/sync.js`.

---

## 3. Interruptor opcional en Ajustes

Si quieres que el usuario elija piel (mismo patrón que el selector de tema):

```js
/* Encender/apagar la piel */
function applySkin(name) {          // 'cristal' | 'calma'
  document.documentElement.setAttribute('data-skin', name);
  try { localStorage.setItem('mc_skin', name); } catch (e) { }
}
```

Notas de coherencia con tu arquitectura:

- Si quieres que la piel **viaje entre dispositivos**, guárdala en `mc_settings`
  (`theme` ya viaja); el arranque del `<head>` la lee de `mc_settings` y no de `mc_skin`.
- Si algún día usas la clave `'calma'` en un selector, escríbela con cuidado:
  `calma` *no* lleva el prefijo `cristal`, así que no hereda ningún estilo nuevo.

---

## 4. Modo ligero (aparatos modestos)

El vidrio cuesta. Para Android de gama baja o batería en 15 %:

```js
document.documentElement.setAttribute('data-perf', 'lite');   // o quitarlo
```

Qué hace: quita todos los `backdrop-filter` de la piel y pinta superficies sólidas
(`--surface-2`). Se ve casi igual; el desplazamiento deja de trabjar de más.
Se puede automatizar:

```js
/* Sugerencia: activar el modo ligero en equipos modestos */
var modesta = (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
              (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
if (modesta) document.documentElement.setAttribute('data-perf', 'lite');
```

---

### 4.1 El héroe: una decisión que sí cambia el inicio

«Calma» dejó el inicio **sin bloque promocional**: `.hero` quedó con
`background: transparent`, `padding: 0`, `border-radius: 0` y sus `::before/::after`
en `display: none`. La referencia visual, en cambio, se apoya en ese bloque azul.

La piel **lo vuelve a levantar** (fondo `--grad-brand`, radio `--r-xl`, velo oscuro
para el contraste del texto, píldoras translúcidas). Es la única regla de la capa 18
que cambia algo más que color y forma de superficie.

- Si quieres **conservar el inicio plano** de Calma: borra el bloque comentado
  `/* ---- Héroe: el bloque azul de la referencia ---- */` de `skin-cristal.css`.
  El resto de la piel sigue funcionando igual.
- Si lo dejas, ganas el gesto central de la referencia sin tocar `render.js`.

---

## 5. Decisiones de diseño que conviene conocer

1. **Superficies, no cristal real.** Las tarjetas usan un degradado translúcido
   `rgba(255,255,255,.10) → .035` sobre el fondo azul, más `blur(16px)`.
   Ese degradado es el respaldo cuando el navegador no soporta `backdrop-filter`:
   se ve sólido y legible, nunca roto.
2. **Canto iluminado.** La línea de 1 px blanco al 55 % en la parte alta de cada
   tarjeta es lo que hace que «se sienta» vidrio. Está en `.stat-card::after`,
   `.panel::after` y `.card::after`.
   `.card` ya usa `::before` para su línea superior: la piel no lo pisa, lo atenúa.
3. **Contraste medido, no a ojo.** Sobre `--bg` oscuro: `--ink` 16.1:1,
   `--ink-2` 9.6:1, `--ink-3` 6.0:1. Todos por encima de AA.
   El texto blanco del héroe lleva un velo `linear-gradient(100deg, rgba(6,18,38,.62) …)`
   en `::before` que baja el fondo bajo el título a ≈6:1.
4. **El turquesa no se toca.** `--accent` sigue siendo `#5bb5ad`: es la firma del
   estudio y la del documento. La piel solo añade azul hacia el hielo.
5. **Cifras tabulares ya estaban** (`font-variant-numeric: tabular-nums` en `.stat-value`):
   la piel no rompe la alineación de montos.
6. **Nada de `background-attachment: fixed`.** En iOS cuesta y rompe el pintado;
   el degradado base se estira al alto del documento y la luz vive en `body::after`
   (fijo al viewport, que sí es barato y no salta al hacer scroll).

---

## 6. Riesgos y cómo se apagan

| Riesgo | Qué pasa | Mitigación |
|---|---|---|
| `backdrop-filter` ausente | Tarjetas sólidas oscuras | Ya previsto: el degradado translúcido funciona como color de respaldo |
| Android de gama baja | Scroll con tirones | `data-perf="lite"` |
| Impresión | El recibo podría salir con fondos | Bloque `@media print` en la capa 18 fuerza superficies blancas. Tu capa 16 ya oculta la interfaz; esto es cinturón y tirantes |
| Menú a pantalla completa | Su degradado se apagó por el `1 · TOKENS` + especificidad | La capa 18 lo vuelve a declarar con `html[data-skin]` |
| Grises claros con poco contraste | `--ink-3` en 10 px | En la clave oscura subió a `#8298b1` (6:1) |
| Vista previa / PDF | Nada: no se tocó `render.js`/`pdf.js` | — |

---

## 7. Cómo probar

```bash
# en el repo
npx serve .            # o: python3 -m http.server 8080
```

1. Abre la app en el celular (o DevTools en modo móvil).
2. Compara: `localStorage.setItem('mc_skin','cristal')` ⇄ `'calma'` y recarga.
3. Cambia el tema (Ajustes → Apariencia) en los tres modos: la piel responde.
4. Revisa que el documento, su vista previa y el PDF salgan **idénticos**.
5. En Chrome DevTools → Rendering → *Disable local fonts* / prueba con blur apagado:
   la app debe seguir legible.

---

## 8. Qué no copiaría de la referencia (ya corregido en esta capa)

- Etiquetas de 9-10 px → aquí el mínimo real es 11 px con 5:1 de contraste.
- «+4.73 %» con pinta de botón → en tu app los deltas ya son `<span class="stat-delta">`, no botones: se mantiene así.
- Mezclar moneda (`$96k` vs `$12,236.12`) → tu `fmtMoney()` es consistente: no se cambió.
- Nota: tu `.chart-label` mide 9.5 px para los meses (así viene de «Calma»). Si quieres
  cumplir AA estricto también ahí, súbelo a 11 px en la **capa 17** (no en la piel),
  porque es una decisión de tipografía base, no de tema.

---

## 9. Capa 19 — que todo quepa en pantallas chicas

Va en el mismo PR y también en `css/app.css`. **No es cosmética: es un arreglo real**
que ya existía en `main` antes de la piel (se reproduce igual en «Calma»).

**El problema:** `grid-template-columns: 1fr` equivale a `minmax(auto, 1fr)`, y ese
`auto` es el ancho **mínimo del contenido**. Como varias filas llevan texto en
`white-space: nowrap` (título + monto), el mínimo crecía hasta **431px**. En una
pantalla de 360px, 71px quedaban fuera y el `overflow-x: hidden` del `body` los
recortaba sin dejar scroll: la información desaparecía.

**El arreglo:** mínimos a 0 en las rejillas, `min-width: 0` en sus hijos y, en las
filas de texto + cifra, el texto cede con puntos suspensivos mientras la cifra se
conserva entera. Más `overflow-wrap: anywhere` para correos/SKU y píldoras de estado
compactas abajo de 420px.

**Medición:** 7 vistas × 5 anchos (430/390/360/320/300) × 2 pieles × 2 temas = **140 casos**.
Antes: hasta 86 elementos fuera de pantalla. Después: **0**. Escritorio sin cambios.

**Lo que NO se toca:** la hoja del documento en la vista previa escala igual que
siempre. Una primera versión de la capa 19 intentó además forzar el ajuste de la
hoja y **rompía la vista previa a 430px** (el membrete se cortaba); se descartó y se
volvió al comportamiento original, verificado con captura.
