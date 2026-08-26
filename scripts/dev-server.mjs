/* ============================================================
   dev-server — Servidor local de desarrollo
   ------------------------------------------------------------
   Reproduce lo que hace Vercel en producción:
     - sirve los archivos estáticos de la PWA
     - sirve /api/state con la MISMA función de api/state.js

   Uso:
     node scripts/dev-server.mjs                 → modo demo (nube en memoria, código: demo1234)
     UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... SYNC_CODE=mi-codigo \
       node scripts/dev-server.mjs               → usa tu Upstash real

   ⚠️ El modo demo NO persiste nada: es solo para probar la app
      localmente. El sync real ocurre en Vercel + Upstash.
   ============================================================ */
import http from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8080);

/* --- Cargar la función real de api/state.js (se copia a .mjs para que Node la trate como ESM) --- */
const tmpDir = path.join(os.tmpdir(), 'in-voice-dev');
await mkdir(tmpDir, { recursive: true });
const tmpFn = path.join(tmpDir, 'state.mjs');
await writeFile(tmpFn, await readFile(path.join(ROOT, 'api', 'state.js'), 'utf8'), 'utf8');
const { default: apiHandler } = await import('file://' + tmpFn);

/* --- Modo demo: simular Upstash en memoria interceptando fetch --- */
const DEMO = !process.env.UPSTASH_REDIS_REST_URL;
if (DEMO) {
  process.env.UPSTASH_REDIS_REST_URL = 'https://demo-upstash.local';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'demo-token';
  if (!process.env.SYNC_CODE) process.env.SYNC_CODE = 'demo1234';
  const mem = new Map();
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (!u.startsWith('https://demo-upstash.local')) return realFetch(url, opts);
    const pathPart = new URL(u).pathname;
    const auth = (opts.headers || {}).Authorization;
    if (auth !== 'Bearer demo-token') return Response.json({ error: 'unauthorized' }, { status: 401 });
    if (pathPart.startsWith('/get/')) {
      const key = decodeURIComponent(pathPart.slice(5));
      return Response.json({ result: mem.has(key) ? mem.get(key) : null });
    }
    if (pathPart === '/' && (opts.method || 'GET') === 'POST') {
      const cmd = JSON.parse(opts.body);
      mem.set(cmd[1], cmd[2]);
      return Response.json({ result: 'OK' });
    }
    return Response.json({ error: 'unknown' }, { status: 404 });
  };
}

/* --- Estáticos --- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.pdf': 'application/pdf',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !existsSync(file)) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    return res.end('404');
  }
  stat(file).then((st) => {
    if (!st.isFile()) throw new Error('no file');
    return readFile(file);
  }).then((buf) => {
    res.writeHead(200, {
      'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    res.end(buf);
  }).catch(() => {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('404');
  });
}

/* --- /api/state → misma función que en Vercel --- */
async function serveApi(req, res) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  const request = new Request('http://local' + req.url, {
    method: req.method,
    headers: req.headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
  });
  const response = await apiHandler(request);
  const buf = Buffer.from(await response.arrayBuffer());
  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  res.end(buf);
}

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://local').pathname;
  if (pathname.startsWith('/api/')) return serveApi(req, res).catch(() => {
    res.writeHead(500); res.end('error');
  });
  return serveStatic(req, res, pathname);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`▶ PWA en http://localhost:${PORT}`);
  if (DEMO) {
    console.log('▶ MODO DEMO: la "nube" vive en memoria y NO persiste.');
    console.log(`▶ Código de sincronización para vincular dispositivos: ${process.env.SYNC_CODE}`);
  } else {
    console.log(`▶ Usando Upstash real · código SYNC_CODE: ${process.env.SYNC_CODE || '(no definido: el API devolverá 500)'}`);
  }
});
