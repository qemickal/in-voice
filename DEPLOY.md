# Sincronización entre dispositivos (Vercel + Upstash)

Tu PWA ahora puede mantener los mismos datos en tu **celu** y tu **compu** (y cualquier otro dispositivo). Los datos siguen guardándose en `localStorage` como siempre (la app funciona 100% offline), y además se sincronizan con una nube propia cada vez que hay internet.

## Qué hace

- Al abrir la app: baja el estado más reciente de la nube.
- Con cada cambio (documento, cliente, abono, ajustes…): lo sube automáticamente (~1 s después).
- Sin conexión: sigue funcionando igual y sube los cambios al reconectarse.
- Conflictos: gana el cambio más reciente (*last-write-wins*, con reloj del servidor). Si editas en ambos equipos a la vez, el botón **Sincronizar ahora** te pregunta cuál versión conservar.
- Estado visible: punto en la barra superior 🟢 sincronizado · 🟡 subiendo/pendiente · 🔴 error · gris sin conexión o sin vincular.

## Cómo desplegarlo (una sola vez, ~10 minutos)

### 1. Sube este repo a GitHub
Si aún no lo tienes en GitHub, crea un repositorio (privado recomendado, tus datos financieros viajan ahí) y haz push de esta rama.

### 2. Importa el proyecto en Vercel
1. Entra a [vercel.com](https://vercel.com) → **Add New → Project**.
2. Importa tu repo. Vercel lo detecta como sitio estático con la función `api/state.js` — **no configure nada especial**, deja todo por defecto y presiona **Deploy**.
3. Tu app queda en `https://tu-proyecto.vercel.app`. Instálala como PWA en celu y compu.

### 3. Conecta la base de datos (Upstash Redis, gratis)
1. En Vercel: **Storage → Create Database → Upstash Redis** (o desde [vercel.com/marketplace/upstash](https://vercel.com/marketplace/upstash)).
2. Crea la base en el plan **Free** y conéctala a tu proyecto. Vercel agregará solito las variables `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`.

### 4. Define tu código de sincronización
1. En Vercel: **Settings → Environment Variables → Add**.
   - Name: `SYNC_CODE`
   - Value: una frase secreta tuya (ej. `mono-cromat-2026-no-compartir`)
   - Environments: Production, Preview y Development.
2. **Deployments → ⋯ → Redeploy** para que la variable aplique.

### 5. Vincula tus dispositivos
1. Abre la app en tu dispositivo **principal** (el que ya tiene tus datos).
2. **Ajustes → Sincronización entre dispositivos** → escribe tu `SYNC_CODE` → **Vincular**.
   - Como la nube está vacía, subirá los datos de ese dispositivo.
3. Repite en el otro dispositivo con el **mismo código**.
   - Si ya tenía datos propios, te preguntará si conservar los de la nube o los locales — elige los de la nube la primera vez.

¡Listo! Desde ahora todo lo que hagas en uno aparece en el otro.

## Pruebas locales

```bash
node scripts/dev-server.mjs
```

Levanta `http://localhost:8080` con la misma función de `api/state.js`. Sin variables de entorno corre en **modo demo**: la "nube" vive en memoria (código `demo1234`, no persiste al reiniciar). Para probar contra tu Upstash real:

```bash
UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... SYNC_CODE=tu-codigo node scripts/dev-server.mjs
```

## Detalles técnicos

| Pieza | Rol |
|---|---|
| `api/state.js` | Función serverless de Vercel: `GET /api/state` baja el estado, `POST /api/state` lo sube. Requiere el header `x-sync-code`. |
| `js/sync.js` | Módulo cliente: pull al abrir/volver a la pestaña, push con debounce en cada escritura, cola offline, reintento cada 60 s. |
| `js/app.js` | Gancho en `storeSet()` + puente `MC_APP` (snapshot / aplicar estado remoto). Sin cambios en la lógica de la app. |
| Upstash Redis | Guarda un único JSON (`mc:state:v1`) con settings, docs, clientes y cxp. Plan free: 500 mil comandos/mes — de sobra. |
| `sw.js` | Caché v6; las rutas `/api/` nunca se sirven de caché. |

### Notas
- El **primer dispositivo que se vincula a una nube vacía** sube sus datos; los demás descargan. Vincula primero el equipo con tus datos reales.
- El estado máximo es 4 MB (miles de documentos; el límite del plan free de Upstash es mucho mayor).
- Si el reloj de un dispositivo está desviado no importa: el servidor pone la marca de tiempo.
- El código de sync viaja en cada petición y se guarda en el `localStorage` de cada dispositivo. Cámbialo en Vercel si sospechas que se filtró.
- `.vercelignore` evita que se desplieguen tus recibos de ejemplo, screenshots y carpetas duplicadas del repo.
