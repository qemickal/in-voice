/* ============================================================
   /api/state — Función serverless de Vercel (Node 18+)
   Guarda el estado de la PWA en Upstash Redis (API REST).

   Variables de entorno requeridas (en Vercel → Settings → Environment Variables):
     UPSTASH_REDIS_REST_URL     → la asigna solo la integración de Upstash
     UPSTASH_REDIS_REST_TOKEN   → la asigna solo la integración de Upstash
     SYNC_CODE                  → la defines tú (el código que escriben tus dispositivos)

   Uso:
     GET  /api/state  (header: x-sync-code)  → { updatedAt: number|null, state: {...}|null }
     POST /api/state  (header: x-sync-code)  → body: { settings, docs, clientes, cxp }
                                              → { ok: true, updatedAt: number }
   ============================================================ */

const KEY = 'mc:state:v1';
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB de estado máximo

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

/* Comparación en tiempo ~constante para no filtrar el código por timing */
function codesMatch(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function authorized(request) {
  const expected = process.env.SYNC_CODE;
  if (!expected) return { ok: false, why: 'config' };
  const got = request.headers.get('x-sync-code') || '';
  return codesMatch(got, expected) ? { ok: true } : { ok: false, why: 'code' };
}

/* ---- Cliente mínimo de Upstash Redis REST (mismo formato que el SDK oficial) ---- */
function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

async function redisGet(cfg) {
  const res = await fetch(`${cfg.url}/get/${encodeURIComponent(KEY)}`, {
    headers: { Authorization: `Bearer ${cfg.token}` },
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const data = await res.json();
  return typeof data.result === 'string' ? data.result : null; // null = clave inexistente
}

async function redisSet(cfg, value) {
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'content-type': 'application/json',
    },
    // Formato de comando suelto que usa el SDK oficial de @upstash/redis
    body: JSON.stringify(['SET', KEY, value]),
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const data = await res.json();
  if (!data || data.result !== 'OK') throw new Error('upstash set falló');
}

export default async function handler(request) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return json(405, { error: 'Método no permitido' });
  }

  const auth = authorized(request);
  if (!auth.ok) {
    if (auth.why === 'config') {
      return json(500, { error: 'El servidor no tiene configurada la variable SYNC_CODE.' });
    }
    return json(401, { error: 'Código de sincronización incorrecto.' });
  }

  const cfg = redisConfig();
  if (!cfg) {
    return json(500, {
      error: 'Falta conectar Upstash: define UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN.',
    });
  }

  try {
    if (request.method === 'GET') {
      const raw = await redisGet(cfg);
      if (!raw) return json(200, { updatedAt: null, state: null });
      const state = JSON.parse(raw);
      return json(200, { updatedAt: state.updatedAt ?? null, state });
    }

    // POST — el servidor pone su propio reloj (inmune a relojes desviados en el celu)
    const rawBody = await request.text();
    if (rawBody.length > MAX_BYTES) {
      return json(413, { error: 'El estado es demasiado grande.' });
    }
    const body = JSON.parse(rawBody);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return json(400, { error: 'Cuerpo inválido.' });
    }
    const state = {
      settings: body.settings && typeof body.settings === 'object' ? body.settings : {},
      docs: Array.isArray(body.docs) ? body.docs : [],
      clientes: Array.isArray(body.clientes) ? body.clientes : [],
      cxp: Array.isArray(body.cxp) ? body.cxp : [],
      updatedAt: Date.now(),
    };
    await redisSet(cfg, JSON.stringify(state));
    return json(200, { ok: true, updatedAt: state.updatedAt });
  } catch (err) {
    return json(502, { error: 'Error hablando con la base de datos.', detail: String(err && err.message) });
  }
}
