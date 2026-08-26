/* ============================================================
   SYNC — Consistencia de datos entre dispositivos (Vercel + Upstash)
   ------------------------------------------------------------
   - Pull al abrir la app y al volver a la pestaña
   - Push automático (con debounce) tras cada cambio local
   - Si no hay red, los cambios se guardan localmente (localStorage,
     como siempre) y se suben solos al reconectarse
   - Estrategia de conflictos: last-write-wins (gana el cambio más
     reciente, con reloj del servidor)

   Este módulo no reemplaza el almacenamiento local: lo complementa.
   Si el sync falla, la app sigue funcionando 100% offline como hoy.
   ============================================================ */
(function () {
  'use strict';

  var CODE_KEY = 'mc_sync_code';
  var LAST_KEY = 'mc_sync_last';
  var DIRTY_KEY = 'mc_sync_dirty';
  var DATA_KEYS = { mc_settings: 1, mc_docs: 1, mc_clientes: 1, mc_cxp: 1 };

  var PUSH_DEBOUNCE_MS = 1200;   // espera tras un cambio antes de subir
  var PULL_THROTTLE_MS = 20000;  // mínimo entre pulls automáticos
  var RETRY_EVERY_MS = 60000;    // reintento periódico si hay cambios pendientes

  var S = {
    code: null,          // código guardado en este dispositivo
    lastSyncedAt: null,  // updatedAt del servidor que ya incorporamos
    dirty: false,        // hay cambios locales sin subir
    status: 'idle',      // idle|unlinked|ok|syncing|pending|offline|bad-code|error
    applying: 0,         // >0 mientras aplicamos datos remotos (no re-dispara push)
    writesSeq: 0,        // contador de escrituras locales
    pushTimer: null,
    busy: false,         // hay una operación de red en curso
    started: false,
    lastPullAt: 0,
  };

  /* ---------------- utilidades ---------------- */
  function lsGet(k, d) {
    try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }
    catch (e) { return d; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }

  function app() { return window.MC_APP || null; }

  function toast(msg) { var a = app(); if (a && a.toast) a.toast(msg); }

  function fmtHora(ts) {
    if (!ts) return '';
    try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return ''; }
  }

  var STATUS_TEXT = {
    'idle':      'Sincronización lista',
    'unlinked':  'Dispositivo sin vincular',
    'ok':        'Sincronizado',
    'syncing':   'Sincronizando…',
    'pending':   'Cambios pendientes de subir',
    'offline':   'Sin conexión — se subirá al reconectar',
    'bad-code':  'Código de sincronización incorrecto',
    'error':     'Error de sincronización',
  };

  /* ---------------- red ---------------- */
  function apiHeaders() {
    return { 'content-type': 'application/json', 'x-sync-code': S.code || '' };
  }

  function apiGet() {
    return fetch('api/state', { headers: apiHeaders(), cache: 'no-store' }).then(function (r) {
      if (r.status === 401) { var e = new Error('bad-code'); e.kind = 'bad-code'; throw e; }
      if (!r.ok) { var e2 = new Error('http ' + r.status); e2.kind = 'http'; throw e2; }
      return r.json();
    });
  }

  function apiPost(state) {
    return fetch('api/state', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(state),
    }).then(function (r) {
      if (r.status === 401) { var e = new Error('bad-code'); e.kind = 'bad-code'; throw e; }
      if (!r.ok) { var e2 = new Error('http ' + r.status); e2.kind = 'http'; throw e2; }
      return r.json();
    });
  }

  function classifyErr(err) {
    if (err && err.kind === 'bad-code') return 'bad-code';
    if (err && err.kind === 'http') return 'error';
    return (typeof navigator !== 'undefined' && navigator.onLine === false) ? 'offline' : 'error';
  }

  /* ---------------- UI: indicador de la barra superior ---------------- */
  function updateIndicator() {
    var el = typeof document !== 'undefined' ? document.getElementById('sync-indicator') : null;
    if (!el) return;
    var cls = S.status === 'idle' || S.status === 'unlinked' ? '' : ' st-' + S.status;
    el.className = 'btn small outline sync-ind' + cls;
    var short = {
      'idle': 'Sync', 'unlinked': 'Vincular', 'ok': 'Sincronizado',
      'syncing': 'Sincronizando…', 'pending': 'Pendiente',
      'offline': 'Sin conexión', 'bad-code': 'Error', 'error': 'Error',
    }[S.status] || 'Sync';
    var txtEl = el.querySelector('.sync-txt');
    if (txtEl) txtEl.textContent = short;
    el.title = (STATUS_TEXT[S.status] || S.status) +
      (S.lastSyncedAt ? ' · ' + fmtHora(S.lastSyncedAt) : '');
    el.style.display = '';
  }

  function setStatus(st) {
    S.status = st;
    updateIndicator();
    // actualizar solo la línea de estado dentro de Ajustes (sin tocar el input)
    var line = typeof document !== 'undefined' ? document.getElementById('sync-status-line') : null;
    if (line) {
      var hora = S.lastSyncedAt ? ' · ' + fmtHora(S.lastSyncedAt) : '';
      line.className = 'sync-status st-' + S.status;
      line.innerHTML = '<span class="sync-dot"></span><span>' + (STATUS_TEXT[S.status] || S.status) + hora + '</span>';
    }
  }

  /* ---------------- UI: sección dentro de Ajustes ---------------- */
  function settingsHtml() {
    var linked = !!S.code;
    var statusTxt = STATUS_TEXT[S.status] || S.status;
    var hora = S.lastSyncedAt ? ' · ' + fmtHora(S.lastSyncedAt) : '';
    return '' +
      '<div id="sync-status-line" class="sync-status st-' + S.status + '"><span class="sync-dot"></span><span>' + statusTxt + hora + '</span></div>' +
      '<div class="sgrid">' +
        '<label>Código de sincronización' +
          '<input id="sync-code-input" type="password" autocomplete="off" placeholder="' +
          (linked ? 'Ya vinculado — escribe para cambiar' : 'El que definiste como SYNC_CODE') + '">' +
        '</label>' +
        '<div class="sync-actions">' +
          '<button id="sync-now-btn" class="btn primary" ' + (linked ? '' : 'disabled') + '>Sincronizar ahora</button>' +
          '<button id="sync-link-btn" class="btn outline">Vincular</button>' +
        '</div>' +
      '</div>' +
      '<p class="muted sync-help">Vincula cada dispositivo (celu, compu) con el mismo código para mantener ' +
      'tus documentos, clientes y ajustes idénticos en todos. Los datos viajan por tu cuenta de Vercel + Upstash. ' +
      'La app sigue funcionando sin conexión; los cambios se suben solos al haber red.</p>';
  }

  function bindSettings() {
    var box = document.getElementById('sync-settings');
    if (!box) return;
    var linkBtn = document.getElementById('sync-link-btn');
    var nowBtn = document.getElementById('sync-now-btn');
    var input = document.getElementById('sync-code-input');
    if (linkBtn) linkBtn.addEventListener('click', function () {
      var code = (input && input.value || '').trim();
      if (!code) {
        if (input) { input.focus(); toast('Escribe el código de sincronización'); }
        return;
      }
      link(code);
    });
    if (nowBtn) nowBtn.addEventListener('click', function () { syncNow(); });
  }

  function renderSettings(rebind) {
    var box = typeof document !== 'undefined' ? document.getElementById('sync-settings') : null;
    if (!box) return;
    box.innerHTML = settingsHtml();
    if (rebind !== false) bindSettings();
  }

  /* ---------------- aplicar estado remoto ---------------- */
  function applyRemote(state) {
    var a = app();
    if (!a || !a.applyRemoteState) return false;
    S.applying++;
    try { a.applyRemoteState(state); }
    finally { S.applying = Math.max(0, S.applying - 1); }
    return true;
  }

  /* ---------------- operaciones ---------------- */
  function push() {
    if (!S.code) return Promise.resolve(false);
    if (S.busy) return Promise.resolve(false);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setStatus('offline');
      return Promise.resolve(false);
    }
    var a = app();
    if (!a || !a.snapshot) return Promise.resolve(false);

    var payload = a.snapshot();
    var seqAtSnapshot = S.writesSeq;
    S.busy = true;
    setStatus('syncing');
    return apiPost(payload).then(function (res) {
      S.lastSyncedAt = res.updatedAt;
      lsSet(LAST_KEY, S.lastSyncedAt);
      // si no hubo escrituras nuevas durante la subida, estamos limpios
      if (S.writesSeq === seqAtSnapshot) {
        S.dirty = false;
        lsSet(DIRTY_KEY, false);
        setStatus('ok');
      } else {
        setStatus('pending');
        schedulePush();
      }
      return true;
    }).catch(function (err) {
      setStatus(classifyErr(err));
      return false;
    }).then(function (ok) {
      S.busy = false;
      return ok;
    });
  }

  function pull(opts) {
    opts = opts || {};
    if (!S.code) return Promise.resolve(false);
    if (S.busy) return Promise.resolve(false);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setStatus('offline');
      return Promise.resolve(false);
    }
    S.busy = true;
    if (opts.silent !== true) setStatus('syncing');
    return apiGet().then(function (res) {
      if (res.updatedAt == null) {
        // la nube está vacía: si este dispositivo tiene datos, súbelos
        S.lastSyncedAt = null;
        lsSet(LAST_KEY, null);
        var a = app();
        if (a && a.hasLocalData && a.hasLocalData()) {
          S.busy = false;
          return push();
        }
        setStatus('ok');
        return false;
      }
      if (S.dirty) {
        // hay cambios locales sin subir: esperan su push (last-write-wins local)
        setStatus('pending');
        return false;
      }
      if (res.updatedAt !== S.lastSyncedAt) {
        S.lastSyncedAt = res.updatedAt;
        lsSet(LAST_KEY, S.lastSyncedAt);
        applyRemote(res.state);
        setStatus('ok');
        if (opts.silent !== true) toast('Datos actualizados desde otro dispositivo ✓');
      } else {
        setStatus('ok');
      }
      return true;
    }).catch(function (err) {
      setStatus(classifyErr(err));
      return false;
    }).then(function (ok) {
      S.busy = false;
      return ok;
    });
  }

  /* Sincronización manual (botón) — resuelve el caso "ambos lados cambiaron" preguntando */
  function syncNow() {
    if (!S.code) {
      var i = document.getElementById('sync-code-input');
      if (i) i.focus();
      toast('Primero vincula este dispositivo');
      return;
    }
    if (S.dirty) {
      apiGet().then(function (res) {
        if (res.updatedAt != null && res.updatedAt !== S.lastSyncedAt && !S.busy) {
          var subir = confirm(
            'Este dispositivo tiene cambios sin subir y la nube tiene cambios más recientes.\n\n' +
            'ACEPTAR = subir los datos de ESTE dispositivo (reemplazan la nube)\n' +
            'CANCELAR = bajar los datos de la nube (reemplazan los de este dispositivo)'
          );
          if (subir) return push();
          S.dirty = false;
          lsSet(DIRTY_KEY, false);
          S.lastSyncedAt = null;
          return pull();
        }
        return push();
      }).catch(function () { return push(); });
    } else {
      pull();
    }
  }

  /* Vincular dispositivo (primera vez que se escribe el código aquí) */
  function link(code) {
    S.code = code;
    setStatus('syncing');
    return apiGet().then(function (res) {
      var a = app();
      if (res.updatedAt == null) {
        // nube vacía: subir los datos de este dispositivo
        lsSet(CODE_KEY, code);
        S.dirty = true;
        return push().then(function (ok) {
          if (ok) toast('Dispositivo vinculado ✓ Datos subidos a la nube');
          renderSettings();
        });
      }
      var localTiene = a && a.hasLocalData && a.hasLocalData();
      if (localTiene) {
        var usarNube = confirm(
          'La nube ya tiene datos de otro dispositivo.\n\n' +
          'ACEPTAR = usar los de la NUBE en este equipo (reemplazan los locales)\n' +
          'CANCELAR = conservar los de ESTE equipo y subirlos a la nube'
        );
        lsSet(CODE_KEY, code);
        if (usarNube) {
          S.lastSyncedAt = null; S.dirty = false;
          return pull().then(function (ok) {
            if (ok) toast('Dispositivo vinculado ✓ Datos descargados');
            renderSettings();
          });
        } else {
          S.dirty = true;
          return push().then(function (ok) {
            if (ok) toast('Dispositivo vinculado ✓ Datos locales subidos');
            renderSettings();
          });
        }
      }
      // dispositivo vacío vinculándose a una nube con datos: bajar todo
      lsSet(CODE_KEY, code);
      S.lastSyncedAt = null; S.dirty = false;
      return pull().then(function (ok) {
        if (ok) toast('Dispositivo vinculado ✓ Datos descargados');
        renderSettings();
      });
    }).catch(function (err) {
      S.code = null;
      setStatus(classifyErr(err));
      toast(err.kind === 'bad-code' ? 'Código incorrecto ✗' : 'No se pudo conectar con el servidor');
      renderSettings();
    });
  }

  /* ---------------- hooks de la app ---------------- */
  function onLocalWrite(key) {
    if (!DATA_KEYS[key]) return;
    if (S.applying > 0) return; // escritura causada por datos remotos: no cuenta como cambio local
    S.writesSeq++;
    S.dirty = true;
    lsSet(DIRTY_KEY, true);
    if (S.code && S.started) {
      setStatus('pending');
      schedulePush();
    }
  }

  function schedulePush() {
    if (S.pushTimer) clearTimeout(S.pushTimer);
    S.pushTimer = setTimeout(function () {
      S.pushTimer = null;
      if (S.dirty && S.code) push();
    }, PUSH_DEBOUNCE_MS);
  }

  /* ---------------- arranque ---------------- */
  function start() {
    if (S.started) return;
    S.started = true;
    S.code = lsGet(CODE_KEY, null) || null;
    S.lastSyncedAt = lsGet(LAST_KEY, null) || null;
    S.dirty = !!lsGet(DIRTY_KEY, false);

    if (S.code) {
      if (S.dirty) { setStatus('pending'); push(); }
      else pull({ silent: true });
    } else {
      setStatus('unlinked');
    }

    // reintento periódico si quedó algo pendiente
    setInterval(function () {
      if (S.dirty && S.code && (typeof navigator === 'undefined' || navigator.onLine)) push();
    }, RETRY_EVERY_MS);

    window.addEventListener('online', function () {
      if (!S.code) return;
      if (S.dirty) push(); else pull({ silent: true });
    });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'visible' || !S.code || S.dirty) return;
      var now = Date.now();
      if (now - S.lastPullAt < PULL_THROTTLE_MS) return;
      S.lastPullAt = now;
      pull({ silent: true });
    });

    // al abrir Ajustes, refrescar la sección de sync (app.js la re-crea)
    var settingsModal = document.getElementById('modal-settings');
    if (settingsModal && typeof MutationObserver !== 'undefined') {
      var body = document.getElementById('settings-body');
      if (body) {
        new MutationObserver(function () {
          if (document.getElementById('sync-settings')) renderSettings();
        }).observe(body, { childList: true });
      }
    }
    // clic en el indicador → abrir Ajustes y bajar hasta la sección
    var ind = document.getElementById('sync-indicator');
    if (ind) ind.addEventListener('click', function () {
      setTimeout(function () {
        var box = document.getElementById('sync-settings');
        if (box && box.scrollIntoView) box.scrollIntoView({ block: 'center' });
      }, 120);
    });
  }

  /* ---------------- API pública ---------------- */
  window.MCSync = {
    start: start,
    onLocalWrite: onLocalWrite,
    link: link,
    syncNow: syncNow,
    push: push,
    pull: pull,
    renderSettings: renderSettings,
    // usados por app.js al aplicar estado remoto (evitan re-disparar el push)
    pauseWrites: function () { S.applying++; },
    resumeWrites: function () { S.applying = Math.max(0, S.applying - 1); },
    state: S,
  };
})();
