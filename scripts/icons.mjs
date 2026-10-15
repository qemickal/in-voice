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
   fondo profundo la llama destaca y la C se mantiene. */
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
   lienzo. La llama es más alta que ancha, así que el alto relativo se
   calcula a partir de su diagonal: alto <= 0.40 * size * 2 / hypot(aspect,1). */
const diagonal = Math.hypot(aspect, 1);
const ALTO_MASKABLE = Math.min(0.58, 0.80 / diagonal);

const salidas = [
  ['icons/icon-192.png', 192, await iconoAny(192, 0.80)],
  ['icons/icon-512.png', 512, await iconoAny(512, 0.80)],
  ['icons/icon-180.png', 180, await iconoSobreFondo(180, 0.72, fondoBlanco)],
  ['icons/icon-maskable-512.png', 512, await iconoSobreFondo(512, ALTO_MASKABLE, fondoDegradado)],
];

for (const [rel, size, buf] of salidas) {
  await writeFile(resolve(root, rel), buf);
  console.log(`${rel}  ${size}x${size}  ${(buf.length / 1024).toFixed(1)} KB`);
}

console.log('\nListo. Si cambiaste el logo, sube la versión de la caché en sw.js.');
