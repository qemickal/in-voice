/* Generador de los iconos de la PWA a partir del logo en SVG.
 *
 *   node scripts/icons.mjs [fuente.svg]
 *
 * Por defecto usa assets/img/logo-clerki.svg. Escribe:
 *
 *   icons/icon-192.png            icono "any"    (fondo transparente)
 *   icons/icon-512.png            icono "any"    (fondo transparente)
 *   icons/icon-180.png            apple-touch-icon (fondo blanco opaco;
 *                                                 iOS no_alpha bien)
 *   icons/icon-maskable-512.png   icono "maskable" (fondo a sangre con el
 *                                                 degradado de marca y la
 *                                                 llama dentro de la zona
 *                                                 segura)
 *
 * Después de regenerarlos hay que subir la versión de la caché en sw.js
 * (const CACHE = 'mc-pwa-vNN') o el móvil seguirá mostrando los iconos viejos.
 *
 * Requiere sharp:  npm install --save-dev sharp
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, process.argv[2] || 'assets/img/logo-clerki.svg');

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch (err) {
  console.error('Falta sharp. Instálalo con:  npm install --save-dev sharp');
  process.exit(1);
}

/* ---------- El logo: viewBox -> tamaño en píxeles ---------- */
const svgRaw = await readFile(source, 'utf8');
const viewBox = svgRaw.match(/viewBox="([^"]+)"/);
if (!viewBox) {
  console.error('El SVG de origen no tiene viewBox; no se puede dimensionar.');
  process.exit(1);
}
const [, , vw, vh] = viewBox[1].trim().split(/\s+/).map(Number);
const aspect = vw / vh;

/* Se fuerza width/height en el <svg> raíz para que librsvg lo dibuje
   al tamaño exacto que queremos. */
function sizedSvg(px) {
  const w = Math.round(px * aspect);
  const h = Math.round(px);
  const out = svgRaw.replace(
    /<svg([^>]*)>/,
    (_m, attrs) => `<svg${attrs.replace(/\s(width|height)="[^"]*"/g, '')} width="${w}" height="${h}">`
  );
  return { buf: Buffer.from(out), w, h };
}

/* Renderiza el logo a un tamaño exacto: se dibuja con densidad alta
   (para que no pierda detalle al escalar) y luego se ajusta al píxel. */
async function renderLogo(px) {
  const { buf, w, h } = sizedSvg(px);
  return sharp(buf, { density: 600 }).resize(w, h, { fit: 'fill' }).png().toBuffer();
}

/* ---------- Fondos ---------- */
function fondoBlanco(size) {
  return sharp({
    create: { width: size, height: size, channels: 4, background: '#ffffff' },
  }).png().toBuffer();
}

/* Fondo a sangre del icono maskable.
   Tiene que ser oscuro a propósito: la C del logo es espacio NEGATIVO, así
   que si el fondo es claro el hueco se pierde y la C deja de leerse. Con un
   fondo profundo la llama destaca y la C se mantiene.

   Se puede desactivar con MASKABLE_SIN_FONDO = true: el icono queda
   transparente y en el móvil se ve sólo la llama. Ojo: en iOS el icono
   nunca puede ser transparente (el apple-touch-icon necesita fondo opaco
   o iOS lo pinta de negro), y muchos lanzadores de Android le ponen su
   propio disco blanco o de color detrás al icono transparente. */
const MASKABLE_SIN_FONDO = true;

function fondoDegradado(size) {
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#4E1E0A"/>
        <stop offset="55%" stop-color="#2E1206"/>
        <stop offset="100%" stop-color="#1B0B04"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#bg)"/>
  </svg>`);
  return sharp(svg).png().toBuffer();
}

/* ---------- Generadores ---------- */
async function iconoAny(size, altoRelativo) {
  const logo = await renderLogo(size * altoRelativo);
  const meta = await sharp(logo).metadata();
  // La llama se centra en el lienzo (su alto define el margen).
  const left = Math.round((size - meta.width) / 2);
  const top = Math.round((size - meta.height) / 2);
  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: logo, left, top }])
    .png()
    .toBuffer();
}

async function iconoSobreFondo(size, altoRelativo, fondo) {
  const logo = await renderLogo(size * altoRelativo);
  const meta = await sharp(logo).metadata();
  const left = Math.round((size - meta.width) / 2);
  const top = Math.round((size - meta.height) / 2);
  return sharp(await fondo(size))
    .composite([{ input: logo, left, top }])
    .png()
    .toBuffer();
}

/* La zona segura de un icono maskable es un círculo de diámetro 80% del
   lienzo (radio 40%). En vez de estimarlo con la caja del dibujo —que
   desperdicia espacio porque la llama no llena su rectángulo— se mide la
   forma real: se renderiza, se busca el píxel opaco más lejano del centro
   y se escala para que quepa dentro del círculo con un margen de seguridad.
   Así funciona con cualquier logo, sea alto, ancho o irregular. */
async function altoQueCabeEnZonaSegura(size) {
  const ref = await sharp(sizedSvg(size * 0.9).buf, { density: 300 })
    .resize(Math.round(size * 0.9 * aspect), Math.round(size * 0.9), { fit: 'fill' })
    .png().toBuffer();
  const meta = await sharp(ref).metadata();
  const { data } = await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{
      input: ref,
      left: Math.round((size - meta.width) / 2),
      top: Math.round((size - meta.height) / 2),
    }])
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  let maxRadio = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (data[(y * size + x) * 4 + 3] < 128) continue;
      const r = Math.hypot(x - size / 2, y - size / 2);
      if (r > maxRadio) maxRadio = r;
    }
  }
  if (!maxRadio) return 0.8;
  const radioSeguro = size * 0.40 * 0.95;   // 5% de margen
  const factor = radioSeguro / maxRadio;    // el render de referencia usa 0.9
  return Math.min(0.9, 0.9 * factor);
}

const ALTO_MASKABLE = await altoQueCabeEnZonaSegura(512);

const salidas = [
  ['icons/icon-192.png', 192, await iconoAny(192, 0.86)],
  ['icons/icon-512.png', 512, await iconoAny(512, 0.86)],
  // iOS exige fondo opaco en el apple-touch-icon: si no, lo pinta de negro.
  ['icons/icon-180.png', 180, await iconoSobreFondo(180, 0.76, fondoBlanco)],
  // El maskable va transparente si así se quiere ver sólo la llama.
  ['icons/icon-maskable-512.png', 512, MASKABLE_SIN_FONDO
    ? await iconoAny(512, ALTO_MASKABLE)
    : await iconoSobreFondo(512, ALTO_MASKABLE, fondoDegradado)],
];

for (const [rel, size, buf] of salidas) {
  await writeFile(resolve(root, rel), buf);
  console.log(`${rel}  ${size}x${size}  ${(buf.length / 1024).toFixed(1)} KB`);
}

console.log('\nListo. Si cambiaste el logo, sube la versión de la caché en sw.js.');
