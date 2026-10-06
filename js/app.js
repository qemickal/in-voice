/* ============================================================
   APP — PWA de Recibos y Cotizaciones (Mono Cromat & Co.)
   ============================================================ */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ---------------- Storage ---------------- */
  const _memStore = {};
  function storeGet(k, d) {
    try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }
    catch (e) { return k in _memStore ? _memStore[k] : d; }
  }
  function storeSet(k, v) {
    _memStore[k] = v;
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* almacenamiento no disponible */ }
    // notificar al sincronizador (colecciones que viajan)
    if (k === 'mc_docs' || k === 'mc_settings' || k === 'mc_clientes' || k === 'mc_cxp' || k === 'mc_productos') {
      if (window.SYNC) window.SYNC.localChanged();
    }
  }

  /* ---------------- Ajustes ---------------- */
  const DEFAULT_SETTINGS = {
    empresa: 'Mono Cromat & Co.',
    empresaSub: 'Estudio Creativo',
    email: 'hola@monocromatyco.com',
    telefono: '(+52) 55 4929 1166',
    web: 'www.monocromatyco.com',
    ciudad: 'CDMX',
    iva: 16,
    theme: 'auto',   // 'auto' | 'light' | 'dark'
    pagos: { cuenta: '', clabe: '', beneficiario: '', banco: '' },
    condiciones: 'Entrega de 7 a 10 días hábiles después de confirmar el pago.',
    // Formato "Título: texto" por línea (el PDF resalta el título en negrita)
    terminos: [
      'Propiedad intelectual: Los derechos de diseño se ceden al cliente únicamente tras el pago total.',
      'Aprobación: Su visto bueno es final. No se aceptan cambios ni devoluciones tras autorizar la impresión o publicación.',
      'Presupuestos: Válidos por 15 días. Trabajos extra se cotizan por separado.',
      'Entregas: Los tiempos son estimados y no nos hacemos responsables por retrasos externos (proveedores o envíos).',
      'Pagos: Requiere 50% de anticipo para iniciar producción y 50% restante contra entrega.',
      'Garantía: Reportar cualquier defecto dentro de los 5 días hábiles posteriores a la entrega.',
      'Archivos: Se guardan en nuestro sistema por 30 días después de la entrega.',
      'Uso: El material es para el uso especifico acordado; prohibida su edición o reventa sin autorización.'
    ].join('\n'),
    qr: ''
  };

  let settings = Object.assign({}, DEFAULT_SETTINGS, storeGet('mc_settings', {}));
  settings.pagos = Object.assign({}, DEFAULT_SETTINGS.pagos, settings.pagos || {});

  let docs = storeGet('mc_docs', []);
  let clientes = storeGet('mc_clientes', []);
  let cuentasXPagar = storeGet('mc_cxp', []);
  let productos = storeGet('mc_productos', []);  // catálogo: productos y servicios
  let editing = null;   // copia de trabajo
  let editingCxp = null; // copia de trabajo para cuenta por pagar
  let editingCliente = null; // referencia al contacto en edición (null = nuevo)
  let editingProducto = null; // referencia al ítem del catálogo en edición (null = nuevo)
  let selectedClientId = null;
  let images = null;    // dataURLs pre-cargados para el PDF
  let listFilter = 'todos';
  let listQuery = '';
  let cliFilter = 'todos';  // 'todos' | 'cliente' | 'prospecto'
  let cliQuery = '';
  let cliModalTipo = 'cliente'; // tipo seleccionado en el modal de contacto
  let prodFilter = 'todos'; // 'todos' | 'producto' | 'servicio'
  let prodQuery = '';
  let prodModalTipo = 'producto'; // tipo seleccionado en el modal del catálogo
  let mainView = 'inicio';  // 'inicio' | 'docs' | 'cxc' | 'cxp' | 'clientes' | 'productos'
  let activityFilter = 'all';
  let previousView = 'inicio'; // vista antes de entrar al editor
  let cxpFilter = 'todas';
  let cxpQuery = '';
  let cxcQuery = '';
  let cxcDetailDocId = null;

  /* ---------------- Utilidades ---------------- */
  // fuente única de verdad (layout.js): subtotal → IVA → descuento → por pagar
  function computeTotals(doc) {
    return window.docTotals(doc, settings);
  }
  function nextNumero(tipo) {
    var prefijo = tipo === 'cotizacion' ? 'RQ' : 'PO';
    var now = new Date();
    var yy = String(now.getFullYear()).slice(-2);
    var mm = String(now.getMonth() + 1).padStart(2, '0');
    var dd = String(now.getDate()).padStart(2, '0');
    var hh = String(now.getHours()).padStart(2, '0');
    var mi = String(now.getMinutes()).padStart(2, '0');
    return prefijo + yy + mm + dd + hh + mi;
  }
  function blankDoc(tipo) {
    return {
      id: window.uid(), tipo, numero: nextNumero(tipo),
      fecha: window.todayISO(), vigencia: '',
      proyecto: '', representante: '', telefono: '', email: '',
      items: [{ desc: '', q: 1, precioU: 0, unidad: '', caracteristicas: [] }],
      conIva: true, iva: settings.iva, descuento: 0,
      pagos: { cuenta: settings.pagos.cuenta, clabe: settings.pagos.clabe, beneficiario: settings.pagos.beneficiario, banco: settings.pagos.banco },
      abonos: [], condiciones: settings.condiciones, terminos: settings.terminos,
      entregaFecha: '', entregaForma: '',
      createdAt: Date.now(), updatedAt: Date.now()
    };
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* Características de productos, servicios y conceptos: se guardan como
     arreglo, pero se acepta texto suelto (líneas, comas, punto y coma). */
  function splitCaract(v) {
    if (v == null) return [];
    return window.itemCaracteristicas({ caracteristicas: v });
  }
  function joinCaractLines(v) { return splitCaract(v).join('\n'); }   // textarea del catálogo
  function joinCaractInline(v) { return splitCaract(v).join(', '); }  // campo del concepto
  function fileName(doc) {
    const tipo = doc.tipo === 'cotizacion' ? 'Cotizacion' : 'Recibo';
    return `${tipo}-${doc.numero || 'sin-numero'}-${(settings.empresa || 'doc').replace(/[^a-z0-9]+/gi, '-')}.pdf`.replace(/--+/g, '-');
  }
  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* ---------------- Pre-carga de imágenes ---------------- */
  async function toDataURL(url, w, h) {
    const r = await fetch(url);
    const b = await r.blob();
    const dataUrl = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(b);
    });
    return { dataUrl, w, h };
  }
  async function preloadImages() {
    try {
      // la marca de agua se dibuja con el propio logo escalado (LAYOUT.watermark)
      const blue = await toDataURL('assets/img/logo-blue.png', 500, 327);
      images = { blue };
    } catch (e) { /* sin imágenes, el PDF saldrá sin logo */ }
  }

  /* ================= LISTA ================= */
  function showList() {
    switchMainView('inicio');
  }

  function renderList() {
    const wrap = $('#doc-list');
    const filtered = docs.filter((d) => {
      const okTipo = listFilter === 'todos' || d.tipo === listFilter;
      const q = listQuery.trim().toLowerCase();
      const okQ = !q || [d.numero, d.proyecto, d.representante, d.email].join(' ').toLowerCase().includes(q);
      return okTipo && okQ;
    }).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    $$('.chip').forEach((c) => c.classList.toggle('active', c.dataset.filter === listFilter));

    if (!filtered.length) {
      wrap.innerHTML = `
        <div class="empty">
          <span class="empty-icon">${window.ICONS.docs('ic-lg')}</span>
          <h3>${docs.length ? 'No hay documentos que coincidan' : 'Aún no hay documentos'}</h3>
          <p>${docs.length ? 'Prueba con otra búsqueda o filtro.' : 'Crea tu primer recibo o cotización y guárdalo en este dispositivo.'}</p>
          <div class="empty-actions">
            <button class="btn primary" data-action="new-recibo"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nuevo recibo</button>
            <button class="btn outline" data-action="new-cotizacion"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nueva cotización</button>
          </div>
        </div>`;
      refreshMenuCounts();
      return;
    }

    wrap.innerHTML = filtered.map((d, i) => {
      const t = computeTotals(d);
      const stamp = d.tipo === 'cotizacion'
        ? '<span class="pill ghost">Cotización</span>'
        : '<span class="pill solid">Recibo</span>';
      return `
      <div class="card" style="--i:${Math.min(i, 14)}">
        <div class="card-top">
          ${stamp}
          <span class="card-num">${esc(d.numero)}</span>
          <span class="card-date">${window.fmtDate(d.fecha)}</span>
        </div>
        <div class="card-title">${esc(d.proyecto || 'Sin proyecto')}</div>
        <div class="card-sub">${esc(d.representante || '')}${d.representante ? ' · ' : ''}${esc(d.email || '')}</div>
        <div class="perf"></div>
        <div class="card-foot">
          <strong>${window.fmtMoney(t.total)}</strong>
          <span class="card-count">${t.n} concepto${t.n !== 1 ? 's' : ''}</span>
        </div>
        <div class="card-actions">
          <button class="btn small outline" data-action="edit" data-id="${d.id}">Editar</button>
          <button class="btn small outline" data-action="duplicate" data-id="${d.id}">Duplicar</button>
          <button class="btn small danger" data-action="delete-list" data-id="${d.id}">Eliminar</button>
        </div>
      </div>`;
    }).join('');
    refreshMenuCounts();
  }

  /* ================= NAVEGACIÓN PRINCIPAL + MENÚ ================= */
  const MAIN_VIEW_IDS = ['inicio', 'docs', 'cxc', 'cxp', 'clientes', 'productos'];

  function writeAppHistory(view, replace, extra) {
    if (!window.history || typeof window.history.pushState !== 'function') return;
    const state = Object.assign({ inVoiceApp: true, view: view }, extra || {});
    try {
      if (replace) window.history.replaceState(state, '', window.location.href);
      else window.history.pushState(state, '', window.location.href);
    } catch (e) { /* historial no disponible en este contexto */ }
  }

  function resetAppHistory() {
    if (!window.history || typeof window.history.replaceState !== 'function') return;
    try {
      window.history.replaceState({ inVoiceApp: true, view: 'inicio' }, '', window.location.href);
    } catch (e) { /* historial no disponible en este contexto */ }
  }

  function refreshMobileNav() {
    const menuOpen = document.body.classList.contains('menu-open');
    $$('#mobile-nav [data-nav-view]').forEach(function (item) {
      const active = item.dataset.navView === mainView || (item.dataset.navView === 'menu' && menuOpen);
      item.classList.toggle('active', active);
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
  }

  function switchMainView(view, navigation) {
    const options = navigation || {};
    if (!options.fromPopstate && (mainView !== view || options.replaceHistory)) {
      writeAppHistory(view, !!options.replaceHistory);
    }
    mainView = view;
    $('#view-inicio').hidden = view !== 'inicio';
    $('#view-list').hidden = view !== 'docs';
    $('#view-cxc').hidden = view !== 'cxc';
    $('#view-cxp').hidden = view !== 'cxp';
    $('#view-clientes').hidden = view !== 'clientes';
    $('#view-productos').hidden = view !== 'productos';
    $('#view-editor').hidden = true;
    $('#topbar').classList.remove('hidden');
    document.body.classList.remove('in-editor');
    closeMenu();
    refreshMobileNav();
    if (view === 'inicio') renderInicio();
    if (view === 'docs') renderList();
    if (view === 'cxc') renderCxC();
    if (view === 'cxp') renderCxP();
    if (view === 'clientes') renderClientes();
    if (view === 'productos') renderProductos();
    window.scrollTo(0, 0);
  }

  /* ---------- Menú pantalla completa ----------
     Índice numerado a la izquierda + ficha lateral con las cifras
     vivas de la sección activa. Tocar una fila entra directo. */
  const MENU_VIEWS = [
    { view: 'inicio',   num: '01', name: 'Inicio',          desc: 'El estado de tu estudio de un vistazo: por cobrar, por pagar y actividad reciente.' },
    { view: 'docs',     num: '02', name: 'Documentos',      desc: 'Todo tu archivo de recibos y cotizaciones, listo para editar, duplicar o imprimir.' },
    { view: 'cxc',      num: '03', name: 'Por cobrar',      desc: 'Saldos pendientes agrupados por cliente, con el avance de cada cobro.' },
    { view: 'cxp',      num: '04', name: 'Por pagar',       desc: 'Gastos y facturas por liquidar, con abonos parciales y avisos de vencimiento.' },
    { view: 'clientes', num: '05', name: 'Clientes',        desc: 'Directorio de clientes y prospectos con su estado de seguimiento.' },
    { view: 'productos', num: '06', name: 'Catálogo',       desc: 'Productos y servicios con su precio por unidad, unidad de medida y características, listos para agregar a tus documentos.' },
    { view: 'logout',   num: '07', name: 'Cerrar sesión',   desc: 'Corta la sincronización en este dispositivo. Tus datos locales no se borran.' }
  ];
  let menuActive = 'inicio';

  function cxpStats() {
    var pendientes = 0, total = 0;
    cuentasXPagar.forEach(function (x) {
      var ab = (x.abonos || []).reduce(function (s, a) { return s + (Number(a.monto) || 0); }, 0);
      var saldo = (Number(x.monto) || 0) - ab;
      if (saldo > 0.005) { pendientes++; total += saldo; }
    });
    return { pendientes: pendientes, total: total };
  }

  function menuMeta(view) {
    switch (view) {
      case 'inicio': {
        var c = getCxCData().reduce(function (s, x) { return s + x.saldoTotal; }, 0);
        return window.fmtMoney(c) + ' por cobrar';
      }
      case 'docs': return docs.length + (docs.length === 1 ? ' documento' : ' documentos');
      case 'cxc': return getCxCData().length + ' clientes con saldo';
      case 'cxp': return cxpStats().pendientes + ' pendientes';
      case 'clientes': return clientes.length + (clientes.length === 1 ? ' contacto' : ' contactos');
      case 'productos': return productos.length + (productos.length === 1 ? ' ítem' : ' ítems');
      case 'logout': return window.SYNC && window.SYNC.authed() ? 'Cuenta conectada' : 'Sin cuenta';
    }
    return '';
  }

  /* Cifras grandes de la ficha lateral */
  function menuStats(view) {
    var cxcTotal = getCxCData().reduce(function (s, x) { return s + x.saldoTotal; }, 0);
    switch (view) {
      case 'inicio': return [
        { n: window.fmtMoney(cxcTotal), l: 'Por cobrar' },
        { n: window.fmtMoney(cxpStats().total), l: 'Por pagar' },
        { n: String(docs.length), l: 'Documentos' }
      ];
      case 'docs': {
        var r = docs.filter(function (d) { return d.tipo !== 'cotizacion'; }).length;
        return [
          { n: String(r), l: 'Recibos' },
          { n: String(docs.length - r), l: 'Cotizaciones' },
          { n: String(docs.length), l: 'Total' }
        ];
      }
      case 'cxc': {
        var d0 = getCxCData();
        var nDocs = d0.reduce(function (s, x) { return s + x.docs.length; }, 0);
        return [
          { n: window.fmtMoney(cxcTotal), l: 'Pendiente' },
          { n: String(d0.length), l: 'Clientes' },
          { n: String(nDocs), l: 'Documentos' }
        ];
      }
      case 'cxp': {
        var st = cxpStats();
        var pagadas = cuentasXPagar.length - st.pendientes;
        return [
          { n: window.fmtMoney(st.total), l: 'Por pagar' },
          { n: String(st.pendientes), l: 'Pendientes' },
          { n: String(pagadas), l: 'Pagadas' }
        ];
      }
      case 'clientes': {
        var pros = clientes.filter(function (c) { return cliTipo(c) === 'prospecto'; }).length;
        return [
          { n: String(clientes.length - pros), l: 'Clientes' },
          { n: String(pros), l: 'Prospectos' },
          { n: String(clientes.length), l: 'Total' }
        ];
      }
      case 'productos': {
        var servs = productos.filter(function (p) { return prodTipo(p) === 'servicio'; }).length;
        return [
          { n: String(productos.length - servs), l: 'Productos' },
          { n: String(servs), l: 'Servicios' },
          { n: String(productos.length), l: 'En catálogo' }
        ];
      }
      case 'logout': return [{ n: window.SYNC && window.SYNC.authed() ? 'Activa' : 'Sin cuenta', l: 'Sesión' }];
    }
    return [];
  }

  function renderMenuIndex() {
    const host = $('#menu-index');
    if (!host) return;
    host.innerHTML = MENU_VIEWS.map(function (v, i) {
      return '<button class="menu-row' + (v.view === menuActive ? ' on' : '') + '"'
        + ' style="--i:' + i + '" data-action="menu-enter" data-menu-view="' + v.view + '"'
        + ' aria-current="' + (v.view === menuActive ? 'true' : 'false') + '">'
        + '<span class="menu-row-num">' + v.num + '</span>'
        + '<span class="menu-row-body">'
        + '<span class="menu-row-name">' + v.name + '</span>'
        + '<span class="menu-row-desc">' + menuMeta(v.view) + '</span>'
        + '</span>'
        + '<span class="menu-row-side">'
        + '<span class="menu-row-meta">' + menuMeta(v.view) + '</span>'
        + '<span class="menu-row-go"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span>'
        + '</span>'
        + '</button>';
    }).join('');
  }

  function renderMenuPanel(animate) {
    const v = MENU_VIEWS.find(function (x) { return x.view === menuActive; }) || MENU_VIEWS[0];
    $('#menu-panel-num').textContent = v.num;
    $('#menu-panel-name').textContent = v.name;
    $('#menu-panel-desc').textContent = v.desc;
    $('#menu-panel-stats').innerHTML = menuStats(v.view).map(function (s) {
      return '<div class="menu-panel-stat"><b>' + s.n + '</b><span>' + s.l + '</span></div>';
    }).join('');
    const go = $('#menu-enter-label');
    if (go) go.textContent = v.view === 'logout' ? 'Cerrar sesión' : 'Entrar a ' + v.name.toLowerCase();
    if (animate) {
      const el = $('#menu-panel');
      el.classList.remove('swap');
      void el.offsetWidth;
      el.classList.add('swap');
    }
  }

  function setMenuActive(view) {
    if (view === menuActive) return;
    menuActive = view;
    $$('#menu-index .menu-row').forEach(function (r) {
      const on = r.dataset.menuView === view;
      r.classList.toggle('on', on);
      r.setAttribute('aria-current', on ? 'true' : 'false');
    });
    renderMenuPanel(true);
  }

  function refreshMenuCounts() {
    if ($('#menu-overlay').classList.contains('open')) {
      renderMenuIndex();
      renderMenuPanel(false);
    }
  }

  function openMenu(fromHistory) {
    if ($('#menu-overlay').classList.contains('open')) return;
    menuActive = mainView;
    if (!fromHistory) writeAppHistory(mainView, false, { overlay: 'menu' });
    $('#menu-overlay').classList.add('open');
    document.body.classList.add('menu-open');
    refreshMobileNav();
    var fab = $('#menu-fab');
    if (fab) fab.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    renderMenuIndex();
    renderMenuPanel(true);
    const first = $('#menu-index .menu-row.on') || $('#menu-index .menu-row');
    if (first) { try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); } }
  }

  function closeMenu() {
    var o = $('#menu-overlay');
    if (!o || !o.classList.contains('open')) return;
    o.classList.remove('open');
    document.body.classList.remove('menu-open');
    refreshMobileNav();
    var fab = $('#menu-fab');
    if (fab) fab.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    var historyState = window.history && window.history.state;
    if (historyState && historyState.inVoiceApp && historyState.overlay === 'menu') {
      window.history.back();
    }
  }

  /* ================= TEMA (claro / oscuro / automático) ================= */
  const THEME_MODES = ['auto', 'light', 'dark'];
  const THEME_LABEL = { auto: 'Automático', light: 'Claro', dark: 'Oscuro' };

  function currentThemeMode() {
    return THEME_MODES.indexOf(settings.theme) >= 0 ? settings.theme : 'auto';
  }
  function systemPrefersDark() {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function applyTheme(mode) {
    const m = THEME_MODES.indexOf(mode) >= 0 ? mode : 'auto';
    const dark = m === 'dark' || (m === 'auto' && systemPrefersDark());
    const root = document.documentElement;
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    root.setAttribute('data-theme-mode', m);
    const meta = $('#meta-theme');
    if (meta) meta.setAttribute('content', dark ? '#11161c' : '#f6f7f9');
    const btn = document.querySelector('[data-action="cycle-theme"]');
    if (btn) btn.setAttribute('title', 'Tema: ' + THEME_LABEL[m] + (m === 'auto' ? ' (según tu sistema)' : '') + ' · clic para cambiar');
  }
  function saveTheme(mode) {
    settings.theme = mode;
    settings.updatedAt = Date.now();
    storeSet('mc_settings', settings);
    applyTheme(mode);
  }
  function cycleTheme() {
    const m = currentThemeMode();
    const next = m === 'auto' ? 'light' : (m === 'light' ? 'dark' : 'auto');
    saveTheme(next);
    toast('Tema: ' + THEME_LABEL[next]);
  }

  /* ================= PANEL DE INICIO ================= */
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  function monthKeyOf(iso) { return String(iso || '').slice(0, 7); }
  function lastMonths(n) {
    const out = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({
        key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
        label: MESES[d.getMonth()],
        year: d.getFullYear()
      });
    }
    return out;
  }
  function relTime(ts) {
    if (!ts) return '';
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return 'hace ' + mins + ' min';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return 'hace ' + hours + ' h';
    const days = Math.floor(hours / 24);
    if (days < 7) return 'hace ' + days + ' d';
    const d = new Date(ts);
    return d.getDate() + ' ' + MESES[d.getMonth()];
  }
  function daysBetween(isoA, isoB) {
    const a = new Date(isoA + 'T00:00:00'), b = new Date(isoB + 'T00:00:00');
    if (isNaN(a) || isNaN(b)) return 0;
    return Math.round((a - b) / 86400000);
  }
  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function countUp(el, to, money) {
    if (!el) return;
    const val = Number(to) || 0;
    const show = (v) => { el.textContent = money ? window.fmtMoney(v) : String(Math.round(v)); };
    if (prefersReducedMotion() || !val || typeof requestAnimationFrame !== 'function') {
      show(val);
      return;
    }
    const dur = 680, t0 = performance.now();
    let done = false;
    // red de seguridad: el número final siempre acaba pintado
    const finish = () => { if (!done) { done = true; show(val); } };
    function step(t) {
      if (done) return;
      const k = Math.min(1, (t - t0) / dur);
      show(val * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step); else finish();
    }
    requestAnimationFrame(step);
    setTimeout(finish, dur + 250);
  }

  /* Resumen mensual: facturado y cobrado de los últimos N meses */
  function monthlySeries(n) {
    const months = lastMonths(n);
    const idx = {};
    months.forEach(function (m, i) { idx[m.key] = i; });
    const facturado = months.map(function () { return 0; });
    const cobrado = months.map(function () { return 0; });

    docs.forEach(function (d) {
      const t = computeTotals(d);
      const k = monthKeyOf(d.fecha || '');
      if (k in idx) facturado[idx[k]] += t.total;
      (d.abonos || []).forEach(function (a) {
        const ak = monthKeyOf(a.fecha || d.fecha || '');
        if (ak in idx) cobrado[idx[ak]] += (Number(a.monto) || 0);
      });
    });
    return { months: months, facturado: facturado, cobrado: cobrado };
  }

  function buildChart(series) {
    const fact = series.facturado, cob = series.cobrado;
    const maxV = Math.max.apply(null, fact.concat(cob).concat([1]));
    const W = 540, H = 196, padL = 6, padR = 6, padT = 16, padB = 28;
    const plotH = H - padT - padB;
    const groupW = (W - padL - padR) / fact.length;
    const barW = Math.min(22, groupW * 0.28);
    const step = 3;

    // La retícula es sólo referencia visual: basta con dejar un 12% de aire
    const top = maxV * 1.12;

    let g = '';
    // retícula
    for (let i = 1; i <= step; i++) {
      const y = padT + plotH - (plotH * i / step);
      g += '<line class="chart-grid" x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + y.toFixed(1) + '"/>';
    }
    let bars = '', labels = '';
    series.months.forEach(function (m, i) {
      const cx = padL + groupW * i + groupW / 2;
      [[fact[i], '', -1], [cob[i], ' cobrado', 1]].forEach(function (pair) {
        const v = pair[0], mod = pair[1], side = pair[2];
        const h = top > 0 ? Math.max(v > 0 ? 3 : 0, (v / top) * plotH) : 0;
        const x = cx + (side < 0 ? -barW - 1.5 : 1.5);
        const y = padT + plotH - h;
        bars += '<rect class="chart-bar' + mod + '" style="--i:' + (i * 2 + (side < 0 ? 0 : 1)) + '"'
          + ' x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + h.toFixed(1) + '"></rect>';
      });
      labels += '<text class="chart-label" x="' + cx.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + m.label + '</text>';
    });
    return '<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Facturado y cobrado de los últimos 6 meses">'
      + g + bars + labels + '</svg>';
  }

  function statCardHtml(o) {
    return '<div class="stat-card tone-' + (o.tone || 'brand') + '" style="--i:' + (o.i || 0) + '">'
      + '<div class="stat-head"><span class="stat-ico">' + o.icon + '</span>'
      + '<span class="stat-label">' + o.label + '</span></div>'
      + '<div class="stat-value" data-count="' + o.value + '" data-money="' + (o.money ? 1 : 0) + '">'
      + (o.money ? window.fmtMoney(0) : '0') + '</div>'
      + '<div class="stat-foot">' + (o.foot || '') + '</div>'
      + '</div>';
  }

  function renderInicio() {
    const host = $('#stat-grid');
    if (!host) return;

    const cxcData = getCxCData();
    const cxcTotal = cxcData.reduce(function (s, c) { return s + c.saldoTotal; }, 0);
    const cxp = cxpStats();
    const series = monthlySeries(6);
    const last = series.months.length - 1;
    const prev = series.months.length - 2;

    const factMes = series.facturado[last];
    const factPrev = series.facturado[prev];
    const cobMes = series.cobrado[last];
    const cobPrev = series.cobrado[prev];

    /* ---------- Encabezado ---------- */
    const now = new Date();
    const hoy = window.todayISO();
    $('#hero-kicker').textContent = DIAS_LARGOS[now.getDay()] + ', ' + now.getDate() + ' de ' + MESES_LARGOS[now.getMonth()] + ' de ' + now.getFullYear();
    const h = now.getHours();
    $('#hero-title').textContent = h < 12 ? 'Buenos días' : (h < 19 ? 'Buenas tardes' : 'Buenas noches');

    const saldados = docs.filter(function (d) { return computeTotals(d).pagado; }).length;
    let sub;
    if (!docs.length && !cuentasXPagar.length && !clientes.length) {
      sub = 'Registra tu primer recibo o cotización para empezar.';
    } else if (cxcTotal > 0 && cxp.total > 0) {
      sub = 'Saldo pendiente de ' + cxcData.length + ' cliente' + (cxcData.length !== 1 ? 's' : '')
        + ' · ' + window.fmtMoney(cxp.total) + ' por pagar.';
    } else if (cxcTotal > 0) {
      sub = 'Saldo pendiente de ' + cxcData.length + ' cliente' + (cxcData.length !== 1 ? 's' : '') + ' · sin pagos pendientes.';
    } else if (cxp.total > 0) {
      sub = window.fmtMoney(cxp.total) + ' por pagar · sin saldos por cobrar.';
    } else {
      sub = 'Todo al día: sin saldos pendientes.';
    }
    $('#hero-sub').textContent = sub;
    countUp($('#hero-balance-value'), cxcTotal, true);

    const vencidasCxp = cuentasXPagar.filter(function (c) {
      const ab = (c.abonos || []).reduce(function (s, a) { return s + (Number(a.monto) || 0); }, 0);
      return c.vencimiento && c.vencimiento < hoy && ((Number(c.monto) || 0) - ab) > 0.005;
    }).length;

    $('#hero-chips').innerHTML = [
      '<span class="hero-chip"><b>' + docs.length + '</b> documentos</span>',
      vencidasCxp
        ? '<span class="hero-chip is-alert"><b>' + vencidasCxp + '</b> vencido' + (vencidasCxp !== 1 ? 's' : '') + '</span>'
        : '<span class="hero-chip is-ok">Al día</span>'
    ].join('');

    /* ---------- Indicadores ---------- */
    function delta(actual, anterior) {
      // A comienzos de mes todavía no hay movimientos: no tiene sentido
      // pintar un −100% en rojo, así que se avisa en tono neutro.
      if (actual <= 0) return '<span class="stat-delta flat">sin movimientos aún</span>';
      if (anterior <= 0) return '<span class="stat-delta up">nuevo</span>';
      const pct = ((actual - anterior) / anterior) * 100;
      if (Math.abs(pct) < 1) return '<span class="stat-delta flat">= igual que el mes pasado</span>';
      const up = pct > 0;
      const arrow = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">'
        + (up ? '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>'
              : '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>')
        + '</svg>';
      return '<span class="stat-delta ' + (up ? 'up' : 'down') + '">' + arrow + Math.abs(Math.round(pct)) + '%</span>'
        + '<span>vs. mes pasado</span>';
    }

    const ICONO = {
      cobrar: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg>',
      pagar: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
      factura: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="13" y2="18"/></svg>',
      cobrado: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
    };

    host.innerHTML =
      statCardHtml({
        i: 0, tone: 'warn', icon: ICONO.pagar, label: 'Por pagar',
        value: cxp.total, money: true,
        foot: '<span>' + cxp.pendientes + ' pendiente' + (cxp.pendientes !== 1 ? 's' : '') + '</span>'
          + (vencidasCxp ? ' · <span style="color:var(--danger);font-weight:700">' + vencidasCxp + ' vencida' + (vencidasCxp !== 1 ? 's' : '') + '</span>' : '')
      }) +
      statCardHtml({
        i: 1, tone: 'accent', icon: ICONO.factura, label: 'Facturado',
        value: factMes, money: true,
        foot: '<span>' + MESES_LARGOS[now.getMonth()] + '</span> · ' + delta(factMes, factPrev)
      }) +
      statCardHtml({
        i: 2, tone: 'ok', icon: ICONO.cobrado, label: 'Cobrado',
        value: cobMes, money: true,
        foot: '<span>' + MESES_LARGOS[now.getMonth()] + '</span> · ' + delta(cobMes, cobPrev)
          + (saldados ? ' · <span>' + saldados + ' saldado' + (saldados !== 1 ? 's' : '') + '</span>' : '')
      });

    $$('#stat-grid .stat-value').forEach(function (el) {
      countUp(el, Number(el.dataset.count) || 0, el.dataset.money === '1');
    });

    /* ---------- Gráfica ---------- */
    const chartHost = $('#chart-host');
    const hayDatos = series.facturado.some(function (v) { return v > 0; }) || series.cobrado.some(function (v) { return v > 0; });
    chartHost.innerHTML = hayDatos
      ? buildChart(series)
      : '<div class="chart-empty">'
        + '<p style="margin:0">Todavía no hay movimientos en los últimos 6 meses.</p>'
        + '<span class="hint">Los montos de tus documentos aparecerán aquí.</span></div>';

    /* ---------- Alertas ---------- */
    const alerts = [];
    cuentasXPagar.forEach(function (c) {
      const ab = (c.abonos || []).reduce(function (s, a) { return s + (Number(a.monto) || 0); }, 0);
      const saldo = (Number(c.monto) || 0) - ab;
      if (saldo <= 0.005) return;
      if (c.vencimiento && c.vencimiento < hoy) {
        const d = Math.abs(daysBetween(hoy, c.vencimiento));
        alerts.push({
          tone: 'danger', action: 'edit-cxp', id: c.id,
          title: 'Pago vencido: ' + (c.proveedor || 'sin proveedor'),
          desc: 'Venció hace ' + d + ' día' + (d !== 1 ? 's' : '') + ' · ' + window.fmtDate(c.vencimiento),
          amt: window.fmtMoney(saldo)
        });
      } else if (c.vencimiento) {
        const d = daysBetween(c.vencimiento, hoy);
        if (d <= 7) {
          alerts.push({
            tone: 'warn', action: 'edit-cxp', id: c.id,
            title: 'Por vencer: ' + (c.proveedor || 'sin proveedor'),
            desc: d === 0 ? 'Vence hoy' : 'Vence en ' + d + ' día' + (d !== 1 ? 's' : ''),
            amt: window.fmtMoney(saldo)
          });
        }
      }
    });

    docs.forEach(function (d) {
      const t = computeTotals(d);
      if (t.total <= 0 || t.porPagar <= 0.005) return;
      const antig = d.fecha ? daysBetween(hoy, d.fecha) : 0;
      if (antig >= 30) {
        alerts.push({
          tone: 'info', action: 'edit', id: d.id,
          title: 'Saldo con ' + antig + ' días: ' + (d.proyecto || d.numero || 'documento'),
          desc: (d.representante || 'Sin cliente') + ' · ' + window.fmtMoney(t.porPagar) + ' pendiente de ' + window.fmtMoney(t.total),
          amt: window.fmtDate(d.fecha)
        });
      }
      if (d.tipo === 'cotizacion' && d.vigencia && d.vigencia < hoy && !t.pagado) {
        alerts.push({
          tone: 'warn', action: 'edit', id: d.id,
          title: 'Cotización vencida: ' + d.numero,
          desc: 'La vigencia terminó el ' + window.fmtDate(d.vigencia) + ' · ' + (d.representante || 'sin cliente'),
          amt: window.fmtMoney(t.total)
        });
      }
    });

    const ALERT_ICON = {
      danger: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      warn: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
      ok: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
    };
    const order = { danger: 0, warn: 1, info: 2 };
    alerts.sort(function (a, b) { return order[a.tone] - order[b.tone]; });

    $('#alert-host').innerHTML = alerts.length
      ? alerts.slice(0, 6).map(function (a) {
          return '<button class="alert ' + a.tone + '" data-action="' + a.action + '" data-id="' + a.id + '">'
            + '<span class="alert-ico">' + ALERT_ICON[a.tone] + '</span>'
            + '<span class="alert-body"><span class="alert-title">' + esc(a.title) + '</span>'
            + '<span class="alert-desc">' + esc(a.desc) + '</span></span>'
            + '<span class="alert-amt">' + esc(a.amt) + '</span>'
            + '</button>';
        }).join('')
      : '<div class="alert ok"><span class="alert-ico">' + ALERT_ICON.ok + '</span>'
        + '<span class="alert-body"><span class="alert-title">Todo en orden</span>'
        + '<span class="alert-desc">No hay vencimientos ni saldos que reclamen tu atención.</span></span></div>';

    /* ---------- Actividad reciente ---------- */
    const act = [];
    docs.forEach(function (d) {
      const t = computeTotals(d);
      act.push({
        ts: d.updatedAt || d.createdAt || 0,
        action: 'edit', id: d.id,
        cot: d.tipo === 'cotizacion',
        kind: 'docs',
        title: d.proyecto || d.numero || 'Documento',
        meta: (d.representante || 'Sin cliente') + ' · ' + (d.tipo === 'cotizacion' ? 'Cotización' : 'Recibo') + ' ' + (d.numero || ''),
        amt: window.fmtMoney(t.total)
      });
    });
    cuentasXPagar.forEach(function (c) {
      const ab = (c.abonos || []).reduce(function (s, a) { return s + (Number(a.monto) || 0); }, 0);
      const saldo = (Number(c.monto) || 0) - ab;
      act.push({
        ts: c.updatedAt || c.createdAt || 0,
        action: 'edit-cxp', id: c.id,
        cot: true,
        kind: 'expenses',
        title: c.proveedor || 'Cuenta por pagar',
        meta: (c.concepto || 'Gasto') + ' · ' + (saldo <= 0.005 ? 'Pagada' : 'Por pagar'),
        amt: window.fmtMoney(saldo <= 0.005 ? (Number(c.monto) || 0) : saldo)
      });
    });
    act.sort(function (a, b) { return b.ts - a.ts; });

    const ACT_ICON_DOC = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>';
    const ACT_ICON_COT = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2h6V3"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="15" y2="14"/></svg>';

    $$('.activity-filter').forEach(function (filterButton) {
      const active = filterButton.dataset.activityFilter === activityFilter;
      filterButton.classList.toggle('active', active);
      filterButton.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const visibleAct = act.filter(function (a) {
      return activityFilter === 'all' || a.kind === activityFilter;
    }).slice(0, 6);
    const todayKey = window.todayISO();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
    function activityDay(ts) {
      const d = new Date(ts || Date.now());
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (key === todayKey) return 'Hoy';
      if (key === yesterdayKey) return 'Ayer';
      return d.getDate() + ' ' + MESES[d.getMonth()];
    }
    let lastActivityDay = '';
    const activityMarkup = visibleAct.map(function (a) {
      const day = activityDay(a.ts);
      const dayHeading = day !== lastActivityDay ? '<div class="act-day">' + esc(day) + '</div>' : '';
      lastActivityDay = day;
      return dayHeading + '<button class="act" data-action="' + a.action + '" data-id="' + a.id + '">'
        + '<span class="act-ico' + (a.cot ? ' cot' : '') + '">' + (a.cot ? ACT_ICON_COT : ACT_ICON_DOC) + '</span>'
        + '<span class="act-body"><span class="act-title">' + esc(a.title) + '</span>'
        + '<span class="act-meta">' + esc(a.meta) + '</span></span>'
        + '<span class="act-amt">' + esc(a.amt) + '<small>' + relTime(a.ts) + '</small></span>'
        + '</button>';
    }).join('');
    $('#activity-host').innerHTML = activityMarkup || (act.length
      ? '<div class="chart-empty"><p style="margin:0">No hay movimientos en esta categoría.</p></div>'
      : '<div class="chart-empty"><p style="margin:0">Sin movimientos todavía.</p>'
        + '<span class="hint">Aquí verás lo último que edites.</span></div>');
  }

  /* ================= CUENTAS POR COBRAR ================= */
  function getCxCData() {
    // Agrupa saldos pendientes de los documentos por cliente
    var byClient = {};
    docs.forEach(function(d) {
      var t = computeTotals(d);
      if (t.total <= 0) return;
      var abonosTotal = (d.abonos || []).reduce(function(s, a) { return s + (Number(a.monto) || 0); }, 0);
      var saldo = t.total - abonosTotal;
      if (saldo <= 0.005) return; // sin saldo pendiente
      var key = (d.representante || d.email || 'Sin cliente').trim();
      if (!key) key = 'Sin cliente';
      if (!byClient[key]) {
        byClient[key] = {
          cliente: key,
          email: d.email || '',
          saldoTotal: 0,
          docs: []
        };
      }
      byClient[key].saldoTotal += saldo;
      byClient[key].docs.push({
        id: d.id,
        tipo: d.tipo,
        numero: d.numero,
        proyecto: d.proyecto || '',
        fecha: d.fecha,
        total: t.total,
        abonado: abonosTotal,
        saldo: saldo
      });
    });
    return Object.keys(byClient).map(function(k) { return byClient[k]; })
      .sort(function(a, b) { return b.saldoTotal - a.saldoTotal; });
  }

  function renderCxC() {
    var data = getCxCData();
    var totalGeneral = data.reduce(function(s, c) { return s + c.saldoTotal; }, 0);
    $('#cxc-total').textContent = window.fmtMoney(totalGeneral);
    $('#cxc-clientes').textContent = String(data.length);

    var q = cxcQuery.trim().toLowerCase();
    var filtered = data.filter(function(c) {
      if (!q) return true;
      var text = (c.cliente + ' ' + c.email + ' ' + c.docs.map(function(d) { return d.numero + ' ' + d.proyecto; }).join(' ')).toLowerCase();
      return text.indexOf(q) >= 0;
    });

    var wrap = $('#cxc-list');
    if (!filtered.length) {
      wrap.innerHTML = '<div class="empty"><span class="empty-icon">' + window.ICONS.coin('ic-lg') + '</span>'
        + '<h3>' + (data.length ? 'No hay coincidencias' : 'No hay cuentas por cobrar') + '</h3>'
        + '<p>' + (data.length ? 'Prueba con otra búsqueda.' : 'Los saldos pendientes de tus recibos y cotizaciones aparecerán aquí automáticamente.') + '</p></div>';
      refreshMenuCounts();
      return;
    }

    wrap.innerHTML = filtered.map(function(c, ci) {
      var docsHtml = c.docs.map(function(d) {
        var badge = d.tipo === 'cotizacion'
          ? '<span class="pill mini ghost">COT</span>'
          : '<span class="pill mini solid">REC</span>';
        return '<div class="card-doc-item">'
          + '<div>' + badge + ' <span>' + esc(d.numero) + '</span>'
          + (d.proyecto ? ' <span class="muted">— ' + esc(d.proyecto) + '</span>' : '')
          + '</div>'
          + '<div><strong>' + window.fmtMoney(d.saldo) + '</strong> <span class="muted">de ' + window.fmtMoney(d.total) + '</span></div>'
          + '</div>';
      }).join('');

      var pctGlobal = c.docs.reduce(function(s, d) { return s + d.abonado; }, 0);
      var pctTotal = c.docs.reduce(function(s, d) { return s + d.total; }, 0);
      var pct = pctTotal > 0 ? Math.min(100, (pctGlobal / pctTotal) * 100) : 0;

      return '<div class="card-cxc" style="--i:' + Math.min(ci, 14) + '" data-cliente="' + esc(c.cliente) + '">'
        + '<div class="card-top">'
        + '<span class="pill mini warn">Pendiente</span>'
        + '<div class="card-title">' + esc(c.cliente) + '</div>'
        + '<div style="margin-left:auto;text-align:right">'
        + '<div class="card-cxc-saldo">' + window.fmtMoney(c.saldoTotal) + '</div>'
        + '<div class="card-total-orig">de ' + window.fmtMoney(pctTotal) + '</div>'
        + '</div>'
        + '</div>'
        + (c.email ? '<div class="card-sub">' + esc(c.email) + '</div>' : '')
        + '<div class="card-progress"><div class="card-progress-bar" style="width:' + pct.toFixed(1) + '%"></div></div>'
        + '<div class="card-docs">' + docsHtml + '</div>'
        + '<div class="card-actions">'
        + '<button class="btn small outline" data-action="view-cxc-doc" data-docid="' + c.docs[0].id + '">' + window.ICONS.docs() + ' Ver documento</button>'
        + '</div>'
        + '</div>';
    }).join('');
    refreshMenuCounts();
  }

  /* ================= CUENTAS POR PAGAR ================= */
  function renderCxP() {
    var totalPendiente = 0, totalPagadas = 0, totalPendientes = 0;
    cuentasXPagar.forEach(function(c) {
      var abonosTotal = (c.abonos || []).reduce(function(s, a) { return s + (Number(a.monto) || 0); }, 0);
      var saldo = c.monto - abonosTotal;
      if (saldo <= 0.005) totalPagadas++; else totalPendientes++;
      totalPendiente += saldo;
    });

    $('#cxp-total').textContent = window.fmtMoney(totalPendiente);
    $('#cxp-pagadas').textContent = String(totalPagadas);
    $('#cxp-pendientes').textContent = String(totalPendientes);

    $$('.chip[data-cxp-filter]').forEach(function(c) {
      c.classList.toggle('active', c.dataset.cxpFilter === cxpFilter);
    });

    var q = cxpQuery.trim().toLowerCase();
    var filtered = cuentasXPagar.filter(function(c) {
      var okFilter = true;
      if (cxpFilter !== 'todas') {
        var abonosTotal = (c.abonos || []).reduce(function(s, a) { return s + (Number(a.monto) || 0); }, 0);
        var saldo = c.monto - abonosTotal;
        if (cxpFilter === 'pagada' && saldo > 0.005) okFilter = false;
        if (cxpFilter === 'pendiente' && (saldo <= 0.005 || abonosTotal > 0)) okFilter = false;
        if (cxpFilter === 'parcial' && (saldo <= 0.005 || abonosTotal <= 0)) okFilter = false;
      }
      var okQ = true;
      if (q) {
        var text = ((c.proveedor || '') + ' ' + (c.concepto || '') + ' ' + (c.folio || '')).toLowerCase();
        okQ = text.indexOf(q) >= 0;
      }
      return okFilter && okQ;
    }).sort(function(a, b) {
      // Primero vencidas, luego por fecha de vencimiento
      var now = window.todayISO();
      var aVenc = (a.vencimiento && a.vencimiento < now && (a.monto - (a.abonos || []).reduce(function(s, x) { return s + (Number(x.monto) || 0); }, 0)) > 0.005) ? 0 : 1;
      var bVenc = (b.vencimiento && b.vencimiento < now && (b.monto - (b.abonos || []).reduce(function(s, x) { return s + (Number(x.monto) || 0); }, 0)) > 0.005) ? 0 : 1;
      if (aVenc !== bVenc) return aVenc - bVenc;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    var wrap = $('#cxp-list');
    if (!filtered.length) {
      wrap.innerHTML = '<div class="empty"><span class="empty-icon">' + window.ICONS.clipboard('ic-lg') + '</span>'
        + '<h3>' + (cuentasXPagar.length ? 'No hay coincidencias' : 'No hay cuentas por pagar') + '</h3>'
        + '<p>' + (cuentasXPagar.length ? 'Prueba con otra búsqueda o filtro.' : 'Registra tus gastos y facturas pendientes de pago.') + '</p>'
        + '<div class="empty-actions"><button class="btn primary" data-action="new-cxp"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nueva cuenta por pagar</button></div></div>';
      refreshMenuCounts();
      return;
    }

    wrap.innerHTML = filtered.map(function(c, ci) {
      var abonosTotal = (c.abonos || []).reduce(function(s, a) { return s + (Number(a.monto) || 0); }, 0);
      var saldo = c.monto - abonosTotal;
      var status, statusClass, statusPill;
      if (saldo <= 0.005) { status = 'Pagada'; statusClass = 'pagada'; statusPill = 'ok'; }
      else if (abonosTotal > 0) { status = 'Parcial'; statusClass = 'parcial'; statusPill = 'warn'; }
      else { status = 'Pendiente'; statusClass = 'pendiente'; statusPill = 'ghost'; }

      var pct = c.monto > 0 ? Math.min(100, (abonosTotal / c.monto) * 100) : 0;
      var vencida = c.vencimiento && c.vencimiento < window.todayISO() && saldo > 0.005;

      var catLabels = {
        material: 'Material', servicio: 'Servicio', renta: 'Renta',
        servicios: 'Servicios', nomina: 'Nómina', impuestos: 'Impuestos', otro: 'Otro'
      };

      return '<div class="card-cxp ' + statusClass + '" style="--i:' + Math.min(ci, 14) + '">'
        + '<div class="card-top">'
        + '<span class="pill mini ' + statusPill + '">' + status + '</span>'
        + '<span class="card-categoria">' + (catLabels[c.categoria] || c.categoria) + '</span>'
        + (c.folio ? '<span class="card-num">' + esc(c.folio) + '</span>' : '')
        + (vencida ? '<span class="cxp-vencida">' + window.ICONS.warning() + ' Vencida ' + window.fmtDate(c.vencimiento) + '</span>' : '')
        + '</div>'
        + '<div class="card-title">' + esc(c.proveedor || 'Sin proveedor') + '</div>'
        + '<div class="card-sub">' + esc(c.concepto || 'Sin concepto') + '</div>'
        + '<div class="card-foot">'
        + '<span class="card-saldo">' + window.fmtMoney(saldo) + '</span>'
        + '<span class="muted">de ' + window.fmtMoney(c.monto) + '</span>'
        + (vencida ? '' : (c.vencimiento ? '<span class="muted">· Vence: ' + window.fmtDate(c.vencimiento) + '</span>' : ''))
        + '</div>'
        + '<div class="card-progress"><div class="card-progress-bar" style="width:' + pct.toFixed(1) + '%"></div></div>'
        + '<div class="card-actions">'
        + '<button class="btn small" data-action="edit-cxp" data-id="' + c.id + '">' + window.ICONS.save() + ' Editar</button>'
        + '<button class="btn small outline" data-action="quick-pay-cxp" data-id="' + c.id + '">' + window.ICONS.cash() + ' Abonar</button>'
        + '<button class="btn small danger" data-action="del-cxp" data-id="' + c.id + '">' + window.ICONS.trash() + '</button>'
        + '</div>'
        + '</div>';
    }).join('');
    refreshMenuCounts();
  }

  function openCxpModal(cxp) {
    if (cxp) {
      editingCxp = JSON.parse(JSON.stringify(cxp));
      $('#modal-cxp-title').textContent = 'Editar cuenta por pagar';
    } else {
      editingCxp = {
        id: window.uid(),
        proveedor: '', folio: '', concepto: '',
        monto: 0, vencimiento: '', fechaEmision: window.todayISO(),
        categoria: 'material', notas: '',
        abonos: [],
        createdAt: Date.now(), updatedAt: Date.now()
      };
      $('#modal-cxp-title').textContent = 'Nueva cuenta por pagar';
    }
    renderCxpModal();
    $('#modal-cxp').classList.add('open');
  }

  function renderCxpModal() {
    if (!editingCxp) return;
    $('#cxp-proveedor').value = editingCxp.proveedor || '';
    $('#cxp-folio').value = editingCxp.folio || '';
    $('#cxp-concepto').value = editingCxp.concepto || '';
    $('#cxp-monto').value = editingCxp.monto || '';
    $('#cxp-vencimiento').value = editingCxp.vencimiento || '';
    $('#cxp-fecha-emision').value = editingCxp.fechaEmision || '';
    $('#cxp-categoria').value = editingCxp.categoria || 'material';
    $('#cxp-notas').value = editingCxp.notas || '';

    var abWrap = $('#cxp-abonos-list');
    abWrap.innerHTML = (editingCxp.abonos || []).map(function(a, i) {
      return '<div class="cxp-abono-row" data-index="' + i + '">'
        + '<input class="cxp-a-fecha" type="date" value="' + esc(a.fecha) + '">'
        + '<input class="cxp-a-monto" type="number" min="0" step="0.01" placeholder="Monto" value="' + esc(a.monto) + '">'
        + '<button class="icon-btn" data-action="del-cxp-abono" data-index="' + i + '" title="Quitar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>'
        + '</div>';
    }).join('');
    updateCxpSaldo();
  }

  function syncCxpForm() {
    if (!editingCxp) return;
    var g = function(id) { var el = $('#' + id); return el ? el.value : ''; };
    editingCxp.proveedor = g('cxp-proveedor');
    editingCxp.folio = g('cxp-folio');
    editingCxp.concepto = g('cxp-concepto');
    editingCxp.monto = Number(g('cxp-monto')) || 0;
    editingCxp.vencimiento = g('cxp-vencimiento');
    editingCxp.fechaEmision = g('cxp-fecha-emision');
    editingCxp.categoria = g('cxp-categoria');
    editingCxp.notas = g('cxp-notas');

    $$('#cxp-abonos-list .cxp-abono-row').forEach(function(row) {
      var i = Number(row.dataset.index);
      if (!editingCxp.abonos[i]) editingCxp.abonos[i] = { fecha: '', monto: 0 };
      editingCxp.abonos[i].fecha = $('.cxp-a-fecha', row).value;
      editingCxp.abonos[i].monto = $('.cxp-a-monto', row).value;
    });
  }

  function updateCxpSaldo() {
    if (!editingCxp) return;
    syncCxpForm();
    var abonosTotal = (editingCxp.abonos || []).reduce(function(s, a) { return s + (Number(a.monto) || 0); }, 0);
    var saldo = editingCxp.monto - abonosTotal;
    var el = $('#cxp-saldo');
    if (el) el.textContent = window.fmtMoney(saldo);
  }

  function saveCxp() {
    if (!editingCxp) return;
    syncCxpForm();
    editingCxp.updatedAt = Date.now();
    if (!editingCxp.proveedor || !editingCxp.proveedor.trim()) {
      toast('Escribe el nombre del proveedor');
      return;
    }
    if (editingCxp.monto <= 0) {
      toast('El monto debe ser mayor a 0');
      return;
    }
    var idx = cuentasXPagar.findIndex(function(c) { return c.id === editingCxp.id; });
    if (idx >= 0) cuentasXPagar[idx] = editingCxp; else cuentasXPagar.push(editingCxp);
    storeSet('mc_cxp', cuentasXPagar);
    $('#modal-cxp').classList.remove('open');
    editingCxp = null;
    renderCxP();
    toast('Cuenta por pagar guardada ✓');
  }

  /* ================= CLIENTES / PROSPECTOS (directorio) ================= */
  const CLI_ESTADOS = {
    nuevo: 'Nuevo', contactado: 'Contactado', negociacion: 'En negociación',
    ganado: 'Ganado', perdido: 'Perdido'
  };

  function cliTipo(c) { return (c && c.tipo === 'prospecto') ? 'prospecto' : 'cliente'; }

  function fmtCliFecha(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const p = (x) => String(x).padStart(2, '0');
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  function renderClientes() {
    const wrap = $('#cli-list');
    if (!wrap) return;
    const q = cliQuery.trim().toLowerCase();
    const filtered = clientes.filter(function(c) {
      const okTipo = cliFilter === 'todos' || cliTipo(c) === cliFilter;
      const okQ = !q || [c.nombre, c.empresa, c.email, c.telefono, c.direccion, c.notas]
        .join(' ').toLowerCase().includes(q);
      return okTipo && okQ;
    }).sort(function(a, b) {
      return (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' });
    });

    $$('.chip[data-cli-filter]').forEach(function(c) {
      c.classList.toggle('active', c.dataset.cliFilter === cliFilter);
    });

    if (!filtered.length) {
      wrap.innerHTML = `
        <div class="empty" role="status">
          <span class="empty-icon">${window.ICONS.user('ic-lg')}</span>
          <h3>${clientes.length ? 'Ningún contacto coincide' : 'Aún no hay clientes ni prospectos'}</h3>
          <p>${clientes.length ? 'Prueba con otra búsqueda o quita los filtros.' : 'Agrega tu primer contacto: lo reutilizarás en recibos y cotizaciones con un toque.'}</p>
          <div class="empty-actions">
            <button class="btn primary" data-action="new-cliente">Nuevo cliente</button>
            <button class="btn outline" data-action="new-prospecto">Nuevo prospecto</button>
          </div>
        </div>`;
      return;
    }

    const plural = filtered.length === 1 ? 'contacto' : 'contactos';
    const rows = filtered.map(function(c, ci) {
      const tipo = cliTipo(c);
      const nombre = String(c.nombre || '').trim() || 'Sin nombre';
      const initials = nombre.trim().split(/\s+/).filter(Boolean).slice(0, 2)
        .map(function(part) { return part.charAt(0); }).join('').toUpperCase();
      const stamp = tipo === 'prospecto'
        ? '<span class="pill ghost mini cli-type">Prospecto</span>'
        : '<span class="pill solid mini cli-type">Cliente</span>';
      const estado = (tipo === 'prospecto' && c.estado)
        ? `<span class="cli-estado" data-estado="${esc(c.estado)}">${esc(CLI_ESTADOS[c.estado] || c.estado)}</span>`
        : '';
      const contactInfo = [
        c.email ? { label: 'Correo', value: c.email } : null,
        c.telefono ? { label: 'Teléfono', value: c.telefono } : null,
        c.direccion ? { label: 'Dirección', value: c.direccion } : null
      ].filter(Boolean);
      const contactDetails = contactInfo.length
        ? contactInfo.map(function(item) {
            return `<span class="cli-contact-item" title="${esc(item.label + ': ' + item.value)}">${esc(item.value)}</span>`;
          }).join('')
        : '<span class="cli-contact-empty">Sin datos de contacto</span>';
      const id = esc(c.id);
      const safeName = esc(nombre);

      return `
        <tr style="--i:${Math.min(ci, 14)}">
          <td class="cli-cell-main">
            <div class="cli-person">
              <span class="cli-avatar" aria-hidden="true">${esc(initials || '·')}</span>
              <span class="cli-person-copy">
                <span class="cli-name" title="${safeName}">${safeName}</span>
                ${c.empresa ? `<span class="cli-company" title="${esc(c.empresa)}">${esc(c.empresa)}</span>` : ''}
                ${c.notas ? `<span class="cli-note" title="${esc(c.notas)}">${esc(c.notas)}</span>` : ''}
              </span>
            </div>
          </td>
          <td class="cli-cell-contact"><span class="cli-contact-lines">${contactDetails}</span></td>
          <td class="cli-cell-status">
            <span class="cli-statuses">${stamp}${estado}</span>
          </td>
          <td class="cli-cell-date">${fmtCliFecha(c.updatedAt) || '—'}</td>
          <td class="cli-cell-actions">
            <span class="cli-actions">
              <button class="btn small outline" data-action="edit-cliente" data-id="${id}" aria-label="Editar ${safeName}">Editar</button>
              <button class="btn small danger cli-delete" data-action="del-cliente-card" data-id="${id}" aria-label="Eliminar ${safeName}" title="Eliminar contacto">${window.ICONS.trash()}</button>
            </span>
          </td>
        </tr>`;
    }).join('');

    wrap.innerHTML = `
      <div class="cli-table-shell">
        <div class="cli-table-summary" role="status">
          <span><strong>${filtered.length}</strong> ${plural}</span>
          <span class="cli-table-hint">Ordenados alfabéticamente</span>
        </div>
        <div class="cli-table-scroll">
          <table class="cli-table" aria-label="Directorio de clientes y prospectos">
            <caption class="sr-only">Clientes y prospectos registrados, con sus datos de contacto y acciones.</caption>
            <colgroup>
              <col class="cli-col-person">
              <col class="cli-col-contact">
              <col class="cli-col-status">
              <col class="cli-col-date">
              <col class="cli-col-actions">
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Contacto</th>
                <th scope="col">Datos de contacto</th>
                <th scope="col">Tipo / seguimiento</th>
                <th scope="col">Actualizado</th>
                <th scope="col"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }

  function setCliTipo(t) {
    cliModalTipo = t === 'prospecto' ? 'prospecto' : 'cliente';
    $$('#cli-tipo-seg .seg-btn').forEach(function(b) {
      b.classList.toggle('on', b.dataset.cliTipo === cliModalTipo);
    });
    const wrap = $('#cl-estado-wrap');
    if (wrap) wrap.hidden = cliModalTipo !== 'prospecto';
  }

  function openClienteModal(id, tipoDef) {
    editingCliente = id ? (clientes.find(function(c) { return c.id === id; }) || null) : null;
    const c = editingCliente;
    const tipo = c ? cliTipo(c) : (tipoDef === 'prospecto' ? 'prospecto' : 'cliente');
    $('#modal-cliente-title').textContent =
      (c ? 'Editar ' : 'Nuevo ') + (tipo === 'prospecto' ? 'prospecto' : 'cliente');
    $('#cl-nombre').value = c ? (c.nombre || '') : '';
    $('#cl-empresa').value = c ? (c.empresa || '') : '';
    $('#cl-email').value = c ? (c.email || '') : '';
    $('#cl-telefono').value = c ? (c.telefono || '') : '';
    $('#cl-direccion').value = c ? (c.direccion || '') : '';
    $('#cl-estado').value = (c && c.estado) || 'nuevo';
    $('#cl-notas').value = c ? (c.notas || '') : '';
    setCliTipo(tipo);
    $('#modal-cliente').classList.add('open');
    setTimeout(function() { const n = $('#cl-nombre'); if (n) n.focus(); }, 80);
  }

  function saveClienteFromModal() {
    const g = function(id) { const el = $('#' + id); return el ? el.value.trim() : ''; };
    const nombre = g('cl-nombre');
    if (!nombre) {
      toast('Escribe el nombre del contacto');
      const n = $('#cl-nombre'); if (n) n.focus();
      return;
    }
    const now = Date.now();
    let c = editingCliente;
    const esNuevo = !c;
    if (esNuevo) {
      c = { id: window.uid(), createdAt: now };
      clientes.push(c);
    }
    c.tipo = cliModalTipo;
    c.nombre = nombre;
    c.empresa = g('cl-empresa');
    c.email = g('cl-email');
    c.telefono = g('cl-telefono');
    c.direccion = g('cl-direccion');
    c.notas = g('cl-notas');
    c.estado = cliModalTipo === 'prospecto' ? ($('#cl-estado').value || 'nuevo') : '';
    c.updatedAt = now;

    storeSet('mc_clientes', clientes); // también avisa al sincronizador
    $('#modal-cliente').classList.remove('open');
    editingCliente = null;
    if (mainView === 'clientes') renderClientes();
    refreshMenuCounts();
    toast((cliModalTipo === 'prospecto' ? 'Prospecto' : 'Cliente') + (esNuevo ? ' agregado ✓' : ' actualizado ✓'));
  }

  /* ================= CATÁLOGO: PRODUCTOS Y SERVICIOS =================
     Cada ítem guarda nombre, precio por unidad, unidad de medida y
     características. Desde el editor de recibos y cotizaciones se
     agregan como conceptos copiando esos datos. */
  function prodTipo(p) { return (p && p.tipo === 'servicio') ? 'servicio' : 'producto'; }

  function renderProductos() {
    const wrap = $('#prod-list');
    if (!wrap) return;
    const q = prodQuery.trim().toLowerCase();
    const filtered = productos.filter(function (p) {
      const okTipo = prodFilter === 'todos' || prodTipo(p) === prodFilter;
      const okQ = !q || [p.nombre, p.sku, p.unidad, p.notas, splitCaract(p.caracteristicas).join(' ')]
        .join(' ').toLowerCase().includes(q);
      return okTipo && okQ;
    }).sort(function (a, b) {
      return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' });
    });

    $$('.chip[data-prod-filter]').forEach(function (c) {
      c.classList.toggle('active', c.dataset.prodFilter === prodFilter);
    });

    if (!filtered.length) {
      wrap.innerHTML = `
        <div class="empty">
          <span class="empty-icon">${window.ICONS.box('ic-lg')}</span>
          <h3>${productos.length ? 'Nada coincide con la búsqueda' : 'Tu catálogo está vacío'}</h3>
          <p>${productos.length
            ? 'Prueba con otro término o quita los filtros.'
            : 'Guarda lo que vendes con su precio por unidad, unidad de medida y características. Después los agregas a un recibo o cotización con un toque.'}</p>
          <div class="empty-actions">
            <button class="btn primary" data-action="new-producto">Nuevo producto</button>
            <button class="btn outline" data-action="new-servicio">Nuevo servicio</button>
          </div>
        </div>`;
      return;
    }

    wrap.innerHTML = filtered.map(function (p, i) {
      const tipo = prodTipo(p);
      const feats = splitCaract(p.caracteristicas);
      return `
      <div class="card card-prod" style="--i:${Math.min(i, 14)}">
        <div class="card-top">
          <span class="pill ${tipo === 'servicio' ? 'ghost' : 'solid'}">${tipo === 'servicio' ? 'Servicio' : 'Producto'}</span>
          ${p.sku ? `<span class="card-num">${esc(p.sku)}</span>` : ''}
          <span class="card-date">${fmtCliFecha(p.updatedAt)}</span>
        </div>
        <div class="card-title">${esc(p.nombre || 'Sin nombre')}</div>
        <div class="prod-price">
          <b>${window.fmtMoney(p.precio)}</b>
          <span>${p.unidad ? 'por ' + esc(p.unidad) : 'por unidad'}</span>
        </div>
        ${feats.length ? `<ul class="prod-feats">${feats.slice(0, 4).map((f) => `<li>${esc(f)}</li>`).join('')}${feats.length > 4 ? `<li class="prod-feat-more">+${feats.length - 4} más</li>` : ''}</ul>` : ''}
        ${p.notas ? `<div class="cli-notas">${esc(p.notas)}</div>` : ''}
        <div class="card-actions">
          <button class="btn small outline" data-action="edit-producto" data-id="${p.id}">Editar</button>
          <button class="btn small outline" data-action="dup-producto" data-id="${p.id}">Duplicar</button>
          <button class="btn small danger" data-action="del-producto" data-id="${p.id}">Eliminar</button>
        </div>
      </div>`;
    }).join('');
  }

  function setProdTipo(t) {
    prodModalTipo = t === 'servicio' ? 'servicio' : 'producto';
    $$('#prod-tipo-seg .seg-btn').forEach(function (b) {
      b.classList.toggle('on', b.dataset.prodTipo === prodModalTipo);
    });
    const title = $('#modal-producto-title');
    if (title) {
      title.textContent = (editingProducto ? 'Editar ' : 'Nuevo ')
        + (prodModalTipo === 'servicio' ? 'servicio' : 'producto');
    }
  }

  function openProductoModal(id, tipoDef) {
    editingProducto = id ? (productos.find(function (p) { return p.id === id; }) || null) : null;
    const p = editingProducto;
    const tipo = p ? prodTipo(p) : (tipoDef === 'servicio' ? 'servicio' : 'producto');
    $('#pr-nombre').value = p ? (p.nombre || '') : '';
    $('#pr-precio').value = p && p.precio != null ? p.precio : '';
    $('#pr-unidad').value = p ? (p.unidad || '') : '';
    $('#pr-caracteristicas').value = p ? joinCaractLines(p.caracteristicas) : '';
    $('#pr-sku').value = p ? (p.sku || '') : '';
    $('#pr-notas').value = p ? (p.notas || '') : '';
    setProdTipo(tipo);
    $('#modal-producto').classList.add('open');
    setTimeout(function () { const n = $('#pr-nombre'); if (n) n.focus(); }, 80);
  }

  function saveProducto() {
    const g = function (id) { const el = $(id); return el ? el.value : ''; };
    const nombre = g('#pr-nombre').trim();
    if (!nombre) {
      toast('Escribe el nombre del producto o servicio');
      const n = $('#pr-nombre'); if (n) n.focus();
      return;
    }
    const precioRaw = g('#pr-precio').trim();
    const precio = precioRaw === '' ? 0 : Number(precioRaw);
    if (!isFinite(precio) || precio < 0) {
      toast('Escribe un precio por unidad válido');
      const pr = $('#pr-precio'); if (pr) pr.focus();
      return;
    }
    const now = Date.now();
    let p = editingProducto;
    const esNuevo = !p;
    if (esNuevo) { p = { id: window.uid(), createdAt: now }; productos.push(p); }
    p.tipo = prodModalTipo;
    p.nombre = nombre;
    p.precio = precio;
    p.unidad = g('#pr-unidad').trim();
    p.caracteristicas = splitCaract(g('#pr-caracteristicas'));
    p.sku = g('#pr-sku').trim();
    p.notas = g('#pr-notas').trim();
    p.updatedAt = now;

    storeSet('mc_productos', productos); // también avisa al sincronizador
    $('#modal-producto').classList.remove('open');
    editingProducto = null;
    if (mainView === 'productos') renderProductos();
    refreshMenuCounts();
    toast((prodModalTipo === 'servicio' ? 'Servicio' : 'Producto') + (esNuevo ? ' agregado ✓' : ' actualizado ✓'));
  }

  /* Selector del catálogo dentro del editor de documentos */
  function catalogoPickerHtml() {
    if (!productos.length) {
      return `<div class="prod-pick-empty">
        <p class="hint">Guarda productos y servicios en tu catálogo con su precio por unidad, unidad de medida y características: después los agregas aquí con un toque.</p>
        <button class="btn small outline" data-action="go-productos">Ir al catálogo</button>
      </div>`;
    }
    const grupos = [
      { label: 'Productos', list: productos.filter((p) => prodTipo(p) === 'producto') },
      { label: 'Servicios', list: productos.filter((p) => prodTipo(p) === 'servicio') }
    ];
    const opts = grupos.map(function (g) {
      if (!g.list.length) return '';
      return '<optgroup label="' + esc(g.label) + '">' + g.list.map(function (p) {
        return `<option value="${esc(p.id)}">${esc(p.nombre)} · ${window.fmtMoney(p.precio)}${p.unidad ? '/' + esc(p.unidad) : ''}</option>`;
      }).join('') + '</optgroup>';
    }).join('');
    return `<label class="prod-pick">Agregar del catálogo
      <select id="f-catalogo">
        <option value="">— Elige un producto o servicio —</option>
        ${opts}
      </select>
    </label>`;
  }

  function addItemFromCatalog(pid) {
    if (!editing) return;
    syncForm();
    const p = productos.find((x) => x.id === pid);
    if (!p) { toast('Ese ítem ya no está en el catálogo'); return; }
    // si el documento sólo tenía el renglón vacío inicial, se reemplaza
    if (editing.items.length === 1) {
      const solo = editing.items[0];
      if (!String(solo.desc || '').trim() && !Number(solo.precioU) && !splitCaract(solo.caracteristicas).length) {
        editing.items.length = 0;
      }
    }
    editing.items.push({
      desc: p.nombre || '',
      q: 1,
      precioU: Number(p.precio) || 0,
      unidad: p.unidad || '',
      caracteristicas: splitCaract(p.caracteristicas),
      prodId: p.id
    });
    renderEditor();
    renderPreview();
    toast('Agregado ✓ ' + (p.nombre || ''));
  }

  /* ================= EDITOR ================= */
  function showEditor(doc) {
    editing = JSON.parse(JSON.stringify(doc));
    // relacionar con cliente guardado (por email o nombre)
    const em = (editing.email || '').trim().toLowerCase();
    let match = null;
    if (em) match = clientes.find((c) => (c.email || '').trim().toLowerCase() === em);
    if (!match && editing.representante) {
      match = clientes.find((c) => (c.nombre || '').trim().toLowerCase() === editing.representante.trim().toLowerCase());
    }
    selectedClientId = match ? match.id : null;
    const editorWasOpen = !$('#view-editor').hidden;
    previousView = mainView;
    if (!editorWasOpen) writeAppHistory(previousView, false, { editorReturn: true });
    $('#view-inicio').hidden = true;
    $('#view-list').hidden = true;
    $('#view-cxc').hidden = true;
    $('#view-cxp').hidden = true;
    $('#view-clientes').hidden = true;
    $('#view-productos').hidden = true;
    $('#view-editor').hidden = false;
    $('#topbar').classList.add('hidden');
    document.body.classList.add('in-editor');
    // al abrir siempre se entra por "Datos" (en móvil las pestañas
    // conservaban el estado anterior y se veía la hoja recortada)
    document.body.classList.add('tab-datos');
    document.body.classList.remove('tab-preview');
    $$('.editor-tabs [data-tab]').forEach((t) => t.classList.toggle('on', t.dataset.tab === 'datos'));
    closeMenu();
    renderEditor();
    renderPreview();
    watchPreview();
    window.scrollTo(0, 0);
  }

  function renderEditor() {
    const isCot = editing.tipo === 'cotizacion';
    $('#editor-mode-label').textContent =
      (isCot ? 'Cotización' : 'Recibo') + ' Nro. ' + (editing.numero || '');
    $('#editor-form').innerHTML = `
      <section class="fsec">
        <h2>Tipo de documento</h2>
        <div class="seg">
          <button class="seg-btn ${!isCot ? 'on' : ''}" data-action="set-tipo" data-tipo="recibo">Recibo</button>
          <button class="seg-btn ${isCot ? 'on' : ''}" data-action="set-tipo" data-tipo="cotizacion">Cotización</button>
        </div>
      </section>

      <section class="fsec">
        <h2>Datos generales</h2>
        <div class="grid2">
          <label>Número
            <input id="f-numero" type="text" value="${esc(editing.numero)}">
          </label>
          <label>Fecha
            <input id="f-fecha" type="date" value="${esc(editing.fecha)}">
          </label>
        </div>
        ${isCot ? `<label>Vigencia (válida hasta)
            <input id="f-vigencia" type="date" value="${esc(editing.vigencia || '')}">
          </label>` : ''}
      </section>

      <section class="fsec">
        <h2>Cliente / Proyecto</h2>
        <label>Cliente guardado
          <div class="client-pick">
            <select id="f-cliente">
              <option value="">— Sin guardar / nuevo —</option>
              ${clientes.map((c) => `<option value="${c.id}" ${c.id === selectedClientId ? 'selected' : ''}>${esc(c.nombre)}${cliTipo(c) === 'prospecto' ? ' · prosp.' : ''}</option>`).join('')}
            </select>
            <button class="btn small outline" data-action="save-client" title="Guardar los datos actuales como cliente"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Guardar</button>
            <button class="btn small danger" data-action="del-client" title="Eliminar cliente seleccionado"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 3h4a1 1 0 0 1 1 1v2H8V4a1 1 0 0 1 1-1Z"/></svg></button>
          </div>
        </label>
        <label>Proyecto
          <input id="f-proyecto" type="text" placeholder="Ej. Identidad de marca" value="${esc(editing.proyecto)}">
        </label>
        <div class="grid2">
          <label>Representante
            <input id="f-representante" type="text" value="${esc(editing.representante)}">
          </label>
          <label>Teléfono
            <input id="f-telefono" type="text" value="${esc(editing.telefono)}">
          </label>
        </div>
        <label>Email
          <input id="f-email" type="email" value="${esc(editing.email)}">
        </label>
      </section>

      <section class="fsec">
        <h2>Conceptos</h2>
        ${catalogoPickerHtml()}
        <div id="items-list">
          ${(editing.items || []).map((it, i) => itemRow(it, i)).join('')}
        </div>
        <button class="btn outline small" data-action="add-item"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Agregar concepto</button>
        <div class="iva-controls">
          <label class="toggle"><input type="checkbox" id="f-coniva" ${editing.conIva === false ? '' : 'checked'}><span>Aplicar IVA</span></label>
          <label class="iva-rate ${editing.conIva === false ? 'disabled' : ''}">% <input id="f-iva" type="number" min="0" max="30" step="0.1" value="${esc(editing.iva != null ? editing.iva : settings.iva)}" ${editing.conIva === false ? 'disabled' : ''}></label>
          <label class="iva-rate">Descuento $ <input id="f-descuento" type="number" min="0" step="0.01" value="${esc(editing.descuento || 0)}"></label>
        </div>
        <div class="totals-box">
          <div><span>Subtotal</span><b id="t-subtotal"></b></div>
          <div id="iva-row"><span id="t-iva-label">IVA</span><b id="t-iva"></b></div>
          <div id="desc-row"><span>Descuento</span><b id="t-descuento"></b></div>
          <div class="grand"><span>Total</span><b id="t-total"></b></div>
          <div><span>Abonado</span><b id="t-abonado"></b></div>
          <div class="grand"><span>Por pagar</span><b id="t-porpagar"></b></div>
        </div>
      </section>

      <section class="fsec">
        <h2>Datos para pagos</h2>
        <div class="grid2">
          <label>Cuenta Nro.
            <input id="f-cuenta" type="text" value="${esc(editing.pagos.cuenta)}">
          </label>
          <label>Nro. Clabe
            <input id="f-clabe" type="text" value="${esc(editing.pagos.clabe)}">
          </label>
          <label>Beneficiario
            <input id="f-beneficiario" type="text" value="${esc(editing.pagos.beneficiario)}">
          </label>
          <label>Banco
            <input id="f-banco" type="text" value="${esc(editing.pagos.banco)}">
          </label>
        </div>
      </section>

      <section class="fsec">
        <h2>Abonos <span class="hint">(opcional)</span></h2>
        <div id="abonos-list">
          ${(editing.abonos || []).map((a, i) => abonoRow(a, i)).join('')}
        </div>
        <button class="btn outline small" data-action="add-abono"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Agregar abono</button>
        <div class="abono-foot"><span>Saldo pendiente</span><b id="saldo-pendiente">—</b></div>
        <p class="hint">El saldo se recalcula automáticamente con cada abono. En el documento impreso se muestran hasta 4 abonos.</p>
      </section>

      <section class="fsec">
        <h2>Condiciones de Entrega</h2>
        <div class="grid2">
          <label>Fecha de entrega
            <input id="f-entrega-fecha" type="date" value="${esc(editing.entregaFecha)}">
          </label>
          <label>Forma de entrega
            <input id="f-entrega-forma" type="text" placeholder="Ej. Envío por paquetería" value="${esc(editing.entregaForma)}">
          </label>
        </div>
        <p class="hint">Estos datos aparecen junto al icono de reloj y caja del documento.</p>
        <textarea id="f-condiciones" rows="2">${esc(editing.condiciones)}</textarea>
      </section>

      <section class="fsec">
        <h2>Términos <span class="hint">un punto por línea</span></h2>
        <p class="hint">Formato «Título: texto». El título sale en negrita en el documento.</p>
        <textarea id="f-terminos" rows="9">${esc(editing.terminos)}</textarea>
      </section>
    `;
    updateTotalsBox();
    updateAbonosSaldo();
  }

  function itemRow(it, i) {
    return `
    <div class="item-row" data-index="${i}">
      <div class="i-main">
        <input class="i-desc" type="text" placeholder="Descripción del servicio" value="${esc(it.desc)}">
        <input class="i-car" type="text" placeholder="Características (separadas por coma)" value="${esc(joinCaractInline(it.caracteristicas))}">
      </div>
      <div class="i-nums">
        <label>Q<input class="i-q" type="number" min="0" step="1" value="${esc(it.q)}"></label>
        <label>Unidad<input class="i-u" type="text" list="unidades-list" placeholder="pza" value="${esc(it.unidad || '')}"></label>
        <label>Precio U<input class="i-pu" type="number" min="0" step="0.01" value="${esc(it.precioU)}"></label>
        <span class="i-sub">${window.fmtMoney((Number(it.q) || 0) * (Number(it.precioU) || 0))}</span>
      </div>
      <button class="icon-btn" data-action="del-item" data-index="${i}" title="Quitar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>`;
  }
  function abonoRow(a, i) {
    return `
    <div class="item-row abono" data-index="${i}">
      <input class="a-fecha" type="date" value="${esc(a.fecha)}">
      <input class="a-monto" type="number" min="0" step="0.01" placeholder="Monto del abono" value="${esc(a.monto)}">
      <span class="a-saldo" title="Saldo después de este abono">—</span>
      <button class="icon-btn" data-action="del-abono" data-index="${i}" title="Quitar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>`;
  }

  function syncForm() {
    if (!editing) return;
    const g = (id) => { const el = $('#' + id); return el ? el.value : ''; };
    editing.numero = g('f-numero');
    editing.fecha = g('f-fecha');
    editing.vigencia = g('f-vigencia');
    editing.proyecto = g('f-proyecto');
    editing.representante = g('f-representante');
    editing.telefono = g('f-telefono');
    editing.email = g('f-email');
    editing.condiciones = g('f-condiciones');
    editing.entregaFecha = g('f-entrega-fecha');
    editing.entregaForma = g('f-entrega-forma');
    editing.terminos = g('f-terminos');
    editing.pagos = {
      cuenta: g('f-cuenta'), clabe: g('f-clabe'),
      beneficiario: g('f-beneficiario'), banco: g('f-banco')
    };
    const conIvaEl = $('#f-coniva');
    editing.conIva = conIvaEl ? conIvaEl.checked : (editing.conIva !== false);
    const ivaEl = $('#f-iva');
    if (ivaEl) { const v = ivaEl.value.trim(); editing.iva = v === '' ? null : Number(v); }
    const descEl = $('#f-descuento');
    if (descEl) editing.descuento = Math.max(0, Number(descEl.value) || 0);
    // items
    $$('#items-list .item-row').forEach((row) => {
      const i = Number(row.dataset.index);
      if (!editing.items[i]) editing.items[i] = { desc: '', q: 1, precioU: 0 };
      editing.items[i].desc = $('.i-desc', row).value;
      editing.items[i].q = $('.i-q', row).value;
      editing.items[i].precioU = $('.i-pu', row).value;
      const uEl = $('.i-u', row);
      if (uEl) editing.items[i].unidad = uEl.value.trim();
      const cEl = $('.i-car', row);
      if (cEl) editing.items[i].caracteristicas = splitCaract(cEl.value);
      const sub = (Number(editing.items[i].q) || 0) * (Number(editing.items[i].precioU) || 0);
      $('.i-sub', row).textContent = window.fmtMoney(sub);
    });
    // abonos
    $$('#abonos-list .item-row').forEach((row) => {
      const i = Number(row.dataset.index);
      if (!editing.abonos[i]) editing.abonos[i] = { fecha: '', monto: 0 };
      editing.abonos[i].fecha = $('.a-fecha', row).value;
      editing.abonos[i].monto = $('.a-monto', row).value;
    });
  }

  function updateTotalsBox() {
    const t = computeTotals(editing || { items: [] });
    const s = (id, v) => { const el = $('#' + id); if (el) el.textContent = v; };
    s('t-subtotal', window.fmtMoney(t.subtotal));
    const ivaRow = $('#iva-row');
    if (ivaRow) {
      if (t.ivaRate > 0) {
        ivaRow.style.display = '';
        s('t-iva-label', 'IVA (' + t.ivaRate + '%)');
        s('t-iva', window.fmtMoney(t.iva));
      } else {
        ivaRow.style.display = 'none';
      }
    }
    const descRow = $('#desc-row');
    if (descRow) {
      descRow.style.display = t.descuento > 0 ? '' : 'none';
      s('t-descuento', '-' + window.fmtMoney(t.descuento));
    }
    s('t-total', window.fmtMoney(t.total));
    s('t-abonado', window.fmtMoney(t.abonado));
    s('t-porpagar', window.fmtMoney(t.porPagar));
  }

  function updateAbonosSaldo() {
    if (!editing) return;
    const t = computeTotals(editing);
    let saldo = t.total;
    $$('#abonos-list .item-row').forEach((row) => {
      const monto = Number($('.a-monto', row).value) || 0;
      saldo -= monto;
      const el = $('.a-saldo', row);
      if (el) el.textContent = window.fmtMoney(saldo);
    });
    const pend = $('#saldo-pendiente');
    if (pend) pend.textContent = window.fmtMoney(saldo);
  }

  /* ---------------- Vista previa ---------------- */
  function renderPreview() {
    $('#preview-inner').innerHTML = window.receiptHTML(editing, settings);
    autoscale();
  }
  function autoscale() {
    const frame = $('#preview-frame');
    const inner = $('#preview-inner');
    if (!frame || !inner) return;
    // si el frame está oculto (tabs en móvil) no hay que escalar a 0:
    // se recalcula al volver a mostrarlo
    const w = frame.clientWidth;
    if (!w) return;
    // 612pt = 816px @96dpi. El alto lo da el aspect-ratio del frame en CSS.
    frame.style.setProperty('--preview-scale', (w / 816).toFixed(5));
  }

  // Recalcula la escala cuando el frame cambia de tamaño (rotación,
  // cambio de pestaña, teclado virtual, barra de direcciones del móvil…)
  let _previewRO = null;
  function watchPreview() {
    if (_previewRO || typeof ResizeObserver === 'undefined') return;
    const frame = $('#preview-frame');
    if (!frame) return;
    _previewRO = new ResizeObserver(() => autoscale());
    _previewRO.observe(frame);
  }

  /* ---------------- Acciones ---------------- */
  function saveDoc(silent) {
    if (!editing) return;
    syncForm();
    editing.updatedAt = Date.now();
    const idx = docs.findIndex((d) => d.id === editing.id);
    if (idx >= 0) docs[idx] = editing; else docs.push(editing);
    storeSet('mc_docs', docs);
    if (!silent) toast('Guardado ✓');
  }

  function deleteDoc(id) {
    const d = docs.find((x) => x.id === id);
    if (!d) return;
    if (!confirm(`¿Eliminar el ${d.tipo === 'cotizacion' ? 'presupuesto' : 'recibo'} Nro. ${d.numero}?`)) return;
    docs = docs.filter((x) => x.id !== id);
    storeSet('mc_docs', docs);
    if (window.SYNC) window.SYNC.tombstone('docs', id);
    switchMainView(mainView);
    toast('Documento eliminado');
  }

  function printDoc() {
    if (!editing) return;
    syncForm();
    $('#print-area').innerHTML = window.receiptHTML(editing, settings);
    setTimeout(() => window.print(), 60);
  }

  function downloadBlob(blob, name) {
    const a = document.createElement('a');
    if (URL && typeof URL.createObjectURL === 'function') {
      const url = URL.createObjectURL(blob);
      a.href = url; a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } else {
      // respaldo: data URL
      const fr = new FileReader();
      fr.onload = () => {
        a.href = fr.result; a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
      };
      fr.readAsDataURL(blob);
    }
  }

  async function makePdfFile() {
    if (!images) await preloadImages();
    const blob = await window.PDFEngine.build(editing, settings, images);
    return new File([blob], fileName(editing), { type: 'application/pdf' });
  }

  async function sendEmail() {
    if (!editing) return;
    syncForm();
    const btn = $('[data-action="email"]');
    const old = btn.textContent; btn.disabled = true; btn.textContent = 'Generando…';
    try {
      const file = await makePdfFile();
      // 1) Si el dispositivo permite compartir archivos → mejor UX en móvil
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: file.name, text: `${editing.tipo === 'cotizacion' ? 'Cotización' : 'Recibo'} ${editing.numero}` });
          return;
        } catch (e) { if (e && e.name === 'AbortError') return; }
      }
      // 2) Fallback escritorio: descargar PDF + abrir correo (mailto)
      downloadBlob(file, file.name);
      const tipoTxt = editing.tipo === 'cotizacion' ? 'cotización' : 'recibo';
      const subj = encodeURIComponent(`${editing.tipo === 'cotizacion' ? 'Cotización' : 'Recibo'} ${editing.numero} — ${settings.empresa}`);
      const body = encodeURIComponent(`Hola,\n\nTe adjunto el ${tipoTxt} ${editing.numero}.\n\nSaludos,\n${settings.empresa}`);
      const to = editing.email ? encodeURIComponent(editing.email) : '';
      window.location.href = `mailto:${to}?subject=${subj}&body=${body}`;
      toast('PDF descargado. Adjúntalo en el correo que se abrió.');
    } catch (err) {
      console.error(err);
      toast('No se pudo generar el PDF: ' + (err && err.message ? err.message : 'error'));
    } finally {
      btn.disabled = false; btn.textContent = old;
    }
  }

  /* ---------------- Ajustes ---------------- */
  function openSettings() {
    const s = settings;
    const modo = currentThemeMode();
    $('#settings-body').innerHTML = `
      <h3 style="margin-top:0">Apariencia</h3>
      <div class="theme-pick">
        ${THEME_MODES.map((m) => `
          <button type="button" class="theme-opt ${modo === m ? 'on' : ''}" data-action="set-theme" data-theme-mode="${m}">
            <span class="theme-swatch ${m}"></span>
            <span class="theme-opt-name">${THEME_LABEL[m]}</span>
            <span class="theme-opt-desc">${m === 'auto' ? 'Sigue a tu sistema' : m === 'light' ? 'Siempre claro' : 'Siempre oscuro'}</span>
          </button>`).join('')}
      </div>
      <h3>Datos del estudio</h3>
      <div class="sgrid">
        <label>Empresa (línea 1)
          <input id="s-empresa" type="text" value="${esc(s.empresa)}"></label>
        <label>Empresa (línea 2)
          <input id="s-empresasub" type="text" value="${esc(s.empresaSub)}"></label>
        <label>Email
          <input id="s-email" type="text" value="${esc(s.email)}"></label>
        <label>Teléfono
          <input id="s-telefono" type="text" value="${esc(s.telefono)}"></label>
        <label>Sitio web
          <input id="s-web" type="text" value="${esc(s.web)}"></label>
        <label>Ciudad
          <input id="s-ciudad" type="text" value="${esc(s.ciudad)}"></label>
        <label>IVA (%)
          <input id="s-iva" type="number" min="0" max="30" step="0.1" value="${esc(s.iva)}"></label>
      </div>
      <h3>Datos de pago por defecto</h3>
      <div class="sgrid">
        <label>Cuenta Nro.
          <input id="s-p-cuenta" type="text" value="${esc(s.pagos.cuenta)}"></label>
        <label>Nro. Clabe
          <input id="s-p-clabe" type="text" value="${esc(s.pagos.clabe)}"></label>
        <label>Beneficiario
          <input id="s-p-beneficiario" type="text" value="${esc(s.pagos.beneficiario)}"></label>
        <label>Banco
          <input id="s-p-banco" type="text" value="${esc(s.pagos.banco)}"></label>
      </div>
      <h3>Textos por defecto</h3>
      <label>Condiciones de Entrega
        <textarea id="s-condiciones" rows="2">${esc(s.condiciones)}</textarea></label>
      <label>Términos <span class="hint">formato «Título: texto», uno por línea</span>
        <textarea id="s-terminos" rows="9">${esc(s.terminos)}</textarea></label>
      <h3>Código QR de pago (opcional)</h3>
      <div class="qr-row">
        <input id="s-qr-file" type="file" accept="image/png,image/jpeg,image/webp">
        ${s.qr ? `<div class="qr-prev"><img src="${esc(s.qr)}" alt="QR"><button class="btn small danger" data-action="clear-qr">Quitar</button></div>` : ''}
      </div>
      <h3>Clientes guardados (${clientes.length})</h3>
      <div class="client-list">
        ${clientes.length
          ? clientes.map((c) => `
              <div class="client-item">
                <span><b>${esc(c.nombre)}</b>${c.email ? `<br><span class="muted">${esc(c.email)}</span>` : ''}${c.telefono ? ` <span class="muted">· ${esc(c.telefono)}</span>` : ''}</span>
                <button class="btn small danger" data-action="del-client-settings" data-id="${c.id}">Eliminar</button>
              </div>`).join('')
          : '<p class="hint">Aún no hay clientes guardados. Guárdalos desde el editor de un documento (botón Guardar).</p>'}
      </div>
    `;
    $('#modal-settings').classList.add('open');
  }

  function saveSettings() {
    const g = (id) => { const el = $('#' + id); return el ? el.value : ''; };
    settings.empresa = g('s-empresa');
    settings.empresaSub = g('s-empresasub');
    settings.email = g('s-email');
    settings.telefono = g('s-telefono');
    settings.web = g('s-web');
    settings.ciudad = g('s-ciudad');
    settings.iva = Number(g('s-iva')) || 0;
    settings.pagos = { cuenta: g('s-p-cuenta'), clabe: g('s-p-clabe'), beneficiario: g('s-p-beneficiario'), banco: g('s-p-banco') };
    settings.condiciones = g('s-condiciones');
    settings.terminos = g('s-terminos');
    settings.updatedAt = Date.now();
    storeSet('mc_settings', settings);
    $('#modal-settings').classList.remove('open');
    if (editing) { renderPreview(); updateTotalsBox(); }
    toast('Ajustes guardados ✓');
  }

  /* El botón Atrás del navegador/PWA recorre las vistas internas antes de salir. */
  window.addEventListener('popstate', function (event) {
    const state = event.state;
    if (!state || state.inVoiceApp !== true) return;

    if (state.overlay === 'menu') {
      openMenu(true);
      return;
    }
    if (MAIN_VIEW_IDS.indexOf(state.view) === -1) return;

    const menuWasOpen = $('#menu-overlay').classList.contains('open');
    if (menuWasOpen) {
      closeMenu();
      if (state.view === mainView) return;
    }
    if (!$('#view-editor').hidden && editing) saveDoc(true);
    switchMainView(state.view, { fromPopstate: true });
  });

  /* ---------------- Eventos ---------------- */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const a = btn.dataset.action;
    switch (a) {
      case 'new-recibo': { const d = blankDoc('recibo'); docs.push(d); storeSet('mc_docs', docs); showEditor(d); break; }
      case 'new-cotizacion': { const d = blankDoc('cotizacion'); docs.push(d); storeSet('mc_docs', docs); showEditor(d); break; }
      case 'back': saveDoc(true); switchMainView(previousView, { replaceHistory: true }); break;
      case 'go-home':
        if (!$('#view-editor').hidden && editing) {
          saveDoc(true);
          switchMainView('inicio', { replaceHistory: true });
        } else {
          switchMainView('inicio');
        }
        break;
      case 'save': saveDoc(false); break;
      case 'print': printDoc(); break;
      case 'email': sendEmail(); break;
      case 'delete':
        if (editing) { if (confirm('¿Eliminar este documento?')) { docs = docs.filter((d) => d.id !== editing.id); storeSet('mc_docs', docs); if (window.SYNC) window.SYNC.tombstone('docs', editing.id); switchMainView(previousView, { replaceHistory: true }); } }
        break;
      case 'edit': { const d = docs.find((x) => x.id === btn.dataset.id); if (d) showEditor(d); break; }
      case 'duplicate': {
        const src = docs.find((x) => x.id === btn.dataset.id);
        if (src) {
          const copy = JSON.parse(JSON.stringify(src));
          copy.id = window.uid(); copy.numero = nextNumero(src.tipo);
          copy.createdAt = copy.updatedAt = Date.now();
          docs.push(copy); storeSet('mc_docs', docs);
          switchMainView(mainView);
          toast('Documento duplicado ✓');
        }
        break;
      }
      case 'delete-list': deleteDoc(btn.dataset.id); break;
      case 'set-tipo':
        if (editing) { editing.tipo = btn.dataset.tipo; renderEditor(); renderPreview(); }
        break;
      case 'add-item':
        if (editing) { editing.items.push({ desc: '', q: 1, precioU: 0, unidad: '', caracteristicas: [] }); renderEditor(); renderPreview(); }
        break;
      case 'del-item': {
        editing.items.splice(Number(btn.dataset.index), 1);
        if (!editing.items.length) editing.items = [{ desc: '', q: 1, precioU: 0, unidad: '', caracteristicas: [] }];
        renderEditor(); renderPreview(); break;
      }
      case 'add-abono': { editing.abonos.push({ fecha: window.todayISO(), monto: 0 }); renderEditor(); renderPreview(); break; }
      case 'del-abono': { editing.abonos.splice(Number(btn.dataset.index), 1); renderEditor(); renderPreview(); break; }
      case 'save-client': {
        syncForm();
        const nombre = (editing.representante || '').trim();
        if (!nombre) { toast('Escribe el nombre del cliente (campo Representante)'); break; }
        const em = (editing.email || '').trim().toLowerCase();
        let cli = em ? clientes.find((c) => (c.email || '').trim().toLowerCase() === em)
                     : clientes.find((c) => (c.nombre || '').trim().toLowerCase() === nombre.toLowerCase());
        if (cli) {
          cli.nombre = nombre; cli.telefono = editing.telefono || ''; cli.email = editing.email || '';
          cli.updatedAt = Date.now();
        } else {
          cli = { id: window.uid(), tipo: 'cliente', nombre, telefono: editing.telefono || '', email: editing.email || '', updatedAt: Date.now() };
          clientes.push(cli);
        }
        storeSet('mc_clientes', clientes);
        selectedClientId = cli.id;
        renderEditor(); renderPreview();
        toast('Cliente guardado ✓');
        break;
      }
      case 'del-client': {
        const sel = $('#f-cliente');
        if (!sel || !sel.value) { toast('Selecciona un cliente de la lista para eliminar'); break; }
        if (!confirm('¿Eliminar este cliente guardado? (No borra los documentos)')) break;
        clientes = clientes.filter((c) => c.id !== sel.value);
        storeSet('mc_clientes', clientes);
        if (window.SYNC) window.SYNC.tombstone('clientes', sel.value);
        selectedClientId = null;
        renderEditor(); renderPreview();
        toast('Cliente eliminado');
        break;
      }
      case 'del-client-settings': {
        if (!confirm('¿Eliminar este cliente guardado? (No borra los documentos)')) break;
        clientes = clientes.filter((c) => c.id !== btn.dataset.id);
        storeSet('mc_clientes', clientes);
        if (window.SYNC) window.SYNC.tombstone('clientes', btn.dataset.id);
        openSettings();
        break;
      }
      /* ------ Directorio de clientes / prospectos ------ */
      case 'new-cliente': openClienteModal(null, 'cliente'); break;
      case 'new-prospecto': openClienteModal(null, 'prospecto'); break;
      case 'edit-cliente': openClienteModal(btn.dataset.id); break;
      case 'set-cli-tipo': setCliTipo(btn.dataset.cliTipo); break;
      case 'close-cliente-modal':
        $('#modal-cliente').classList.remove('open');
        editingCliente = null;
        break;
      case 'save-cliente': saveClienteFromModal(); break;

      /* ------ Catálogo de productos y servicios ------ */
      case 'new-producto': openProductoModal(null, 'producto'); break;
      case 'new-servicio': openProductoModal(null, 'servicio'); break;
      case 'edit-producto': openProductoModal(btn.dataset.id); break;
      case 'set-prod-tipo': setProdTipo(btn.dataset.prodTipo); break;
      case 'close-producto-modal':
        $('#modal-producto').classList.remove('open');
        editingProducto = null;
        break;
      case 'save-producto': saveProducto(); break;
      case 'dup-producto': {
        const src = productos.find((x) => x.id === btn.dataset.id);
        if (src) {
          const copy = JSON.parse(JSON.stringify(src));
          copy.id = window.uid();
          copy.nombre = (src.nombre || '') + ' (copia)';
          copy.createdAt = copy.updatedAt = Date.now();
          productos.push(copy);
          storeSet('mc_productos', productos);
          renderProductos();
          refreshMenuCounts();
          toast('Ítem duplicado ✓');
        }
        break;
      }
      case 'del-producto': {
        const pp = productos.find((x) => x.id === btn.dataset.id);
        if (!pp) break;
        if (!confirm('¿Eliminar «' + (pp.nombre || 'este ítem') + '» del catálogo? (No borra los documentos donde ya se usa)')) break;
        productos = productos.filter((x) => x.id !== pp.id);
        storeSet('mc_productos', productos);
        if (window.SYNC) window.SYNC.tombstone('productos', pp.id);
        renderProductos();
        refreshMenuCounts();
        toast('Ítem eliminado');
        break;
      }
      /* desde el editor: ir al catálogo guardando el documento en silencio */
      case 'go-productos':
        if (editing) saveDoc(true);
        switchMainView('productos');
        break;
      case 'del-cliente-card': {
        const cc = clientes.find((x) => x.id === btn.dataset.id);
        if (!cc) break;
        if (!confirm('¿Eliminar a «' + (cc.nombre || 'este contacto') + '»? (No borra sus documentos)')) break;
        clientes = clientes.filter((x) => x.id !== cc.id);
        storeSet('mc_clientes', clientes);
        if (window.SYNC) window.SYNC.tombstone('clientes', cc.id);
        if (selectedClientId === cc.id) selectedClientId = null;
        renderClientes();
        refreshMenuCounts();
        toast('Contacto eliminado');
        break;
      }
      case 'settings': openSettings(); break;
      case 'save-settings': saveSettings(); break;
      case 'cycle-theme': cycleTheme(); break;
      case 'set-theme': {
        saveTheme(btn.dataset.themeMode);
        $$('.theme-opt').forEach(function (o) {
          o.classList.toggle('on', o.dataset.themeMode === currentThemeMode());
        });
        break;
      }
      case 'go-docs': switchMainView('docs'); break;
      case 'go-cxc': switchMainView('cxc'); break;
      case 'activity-filter': {
        const filter = btn.dataset.activityFilter;
        if (filter === 'all' || filter === 'docs' || filter === 'expenses') {
          activityFilter = filter;
          renderInicio();
        }
        break;
      }
      case 'close-settings': $('#modal-settings').classList.remove('open'); break;
      case 'clear-qr': { settings.qr = ''; openSettings(); break; }
      case 'tab': {
        $$('[data-tab]').forEach((t) => t.classList.toggle('on', t === btn));
        document.body.classList.toggle('tab-datos', btn.dataset.tab === 'datos');
        document.body.classList.toggle('tab-preview', btn.dataset.tab === 'preview');
        // al mostrar la vista previa, recalcular escala (pudo medirse oculta)
        requestAnimationFrame(autoscale);
        break;
      }
      case 'install': if (window._deferredPrompt) { window._deferredPrompt.prompt(); window._deferredPrompt = null; btn.style.display = 'none'; } break;

      /* --- Menú pantalla completa --- */
      case 'toggle-menu':
        if ($('#menu-overlay').classList.contains('open')) closeMenu(); else openMenu();
        break;
      case 'close-menu': closeMenu(); break;
      case 'menu-enter': {
        const target = btn.dataset.menuView || menuActive;
        if (target === 'logout') { closeMenu(); if (window.SYNC) window.SYNC.logout(); }
        else switchMainView(target, { replaceHistory: true });
        break;
      }

      /* --- Navegación principal --- */
      case 'view-cxc-doc': {
        var did = btn.dataset.docid;
        var dd = docs.find(function(x) { return x.id === did; });
        if (dd) { cxcDetailDocId = did; showEditor(dd); }
        break;
      }

      /* --- Cuentas por Pagar --- */
      case 'new-cxp': openCxpModal(null); break;
      case 'edit-cxp': {
        var cxp = cuentasXPagar.find(function(x) { return x.id === btn.dataset.id; });
        if (cxp) openCxpModal(cxp);
        break;
      }
      case 'del-cxp': {
        if (!confirm('¿Eliminar esta cuenta por pagar?')) break;
        cuentasXPagar = cuentasXPagar.filter(function(x) { return x.id !== btn.dataset.id; });
        storeSet('mc_cxp', cuentasXPagar);
        if (window.SYNC) window.SYNC.tombstone('cxp', btn.dataset.id);
        renderCxP();
        toast('Cuenta por pagar eliminada');
        break;
      }
      case 'quick-pay-cxp': {
        var cxp2 = cuentasXPagar.find(function(x) { return x.id === btn.dataset.id; });
        if (cxp2) {
          var abonosTotal2 = (cxp2.abonos || []).reduce(function(s, a) { return s + (Number(a.monto) || 0); }, 0);
          var saldo2 = cxp2.monto - abonosTotal2;
          var montoStr = prompt('Saldo pendiente: ' + window.fmtMoney(saldo2) + '\n\n¿Cuánto quieres abonar?', String(saldo2));
          if (montoStr === null) break;
          var montoAbono = Number(montoStr);
          if (isNaN(montoAbono) || montoAbono <= 0) { toast('Monto inválido'); break; }
          if (!cxp2.abonos) cxp2.abonos = [];
          cxp2.abonos.push({ fecha: window.todayISO(), monto: montoAbono });
          cxp2.updatedAt = Date.now();
          storeSet('mc_cxp', cuentasXPagar);
          renderCxP();
          toast('Abono registrado ✓');
        }
        break;
      }
      case 'save-cxp': saveCxp(); break;
      case 'close-cxp-modal': $('#modal-cxp').classList.remove('open'); break;
      case 'add-cxp-abono': {
        if (!editingCxp) editingCxp = { abonos: [] };
        if (!editingCxp.abonos) editingCxp.abonos = [];
        editingCxp.abonos.push({ fecha: window.todayISO(), monto: 0 });
        renderCxpModal();
        break;
      }
      case 'del-cxp-abono': {
        if (editingCxp && editingCxp.abonos) {
          editingCxp.abonos.splice(Number(btn.dataset.index), 1);
          renderCxpModal();
        }
        break;
      }
      case 'close-cxc-detail': $('#modal-cxc-detail').classList.remove('open'); break;
      case 'logout': if (window.SYNC) window.SYNC.logout(); break;
    }
  });

  document.addEventListener('input', (e) => {
    if (!editing) return;
    if (e.target.id === 'f-numero' || e.target.id === 'f-fecha' || e.target.id === 'f-vigencia' ||
        e.target.id === 'f-proyecto' || e.target.id === 'f-representante' || e.target.id === 'f-telefono' ||
        e.target.id === 'f-email' || e.target.id === 'f-condiciones' || e.target.id === 'f-terminos' ||
        e.target.id === 'f-entrega-fecha' || e.target.id === 'f-entrega-forma' ||
        e.target.id === 'f-cuenta' || e.target.id === 'f-clabe' || e.target.id === 'f-beneficiario' || e.target.id === 'f-banco' ||
        e.target.id === 'f-iva' || e.target.id === 'f-descuento' ||
        e.target.classList.contains('i-desc') || e.target.classList.contains('i-q') || e.target.classList.contains('i-pu') ||
        e.target.classList.contains('i-u') || e.target.classList.contains('i-car') ||
        e.target.classList.contains('a-fecha') || e.target.classList.contains('a-monto')) {
      syncForm();
      updateTotalsBox();
      updateAbonosSaldo();
      renderPreview();
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'f-catalogo' && e.target.value) {
      addItemFromCatalog(e.target.value);
    }
    if (e.target.id === 'f-cliente') {
      const c = clientes.find((x) => x.id === e.target.value);
      selectedClientId = c ? c.id : null;
      if (c) {
        const r = $('#f-representante'), t = $('#f-telefono'), m = $('#f-email');
        if (r) r.value = c.nombre || '';
        if (t) t.value = c.telefono || '';
        if (m) m.value = c.email || '';
        syncForm();
        updateTotalsBox();
        updateAbonosSaldo();
        renderPreview();
        toast('Cliente cargado ✓');
      }
    }
    if (e.target.id === 'f-coniva') {
      const on = e.target.checked;
      const rateEl = $('#f-iva');
      if (rateEl) { rateEl.disabled = !on; rateEl.closest('.iva-rate').classList.toggle('disabled', !on); }
      syncForm();
      updateTotalsBox();
      updateAbonosSaldo();
      renderPreview();
    }
    if (e.target.id === 's-qr-file' && e.target.files && e.target.files[0]) {
      const fr = new FileReader();
      fr.onload = () => { settings.qr = fr.result; openSettings(); };
      fr.readAsDataURL(e.target.files[0]);
    }
  });

  $('#search').addEventListener('input', (e) => { listQuery = e.target.value; renderList(); });
  $$('.chip[data-filter]').forEach((c) => c.addEventListener('click', () => { listFilter = c.dataset.filter; renderList(); }));

  // Menú: al pasar el cursor o enfocar una fila se adelanta la ficha lateral
  $('#menu-overlay').addEventListener('pointerover', function(e) {
    var b = e.target.closest('[data-menu-view]');
    if (b && !b.classList.contains('on')) setMenuActive(b.dataset.menuView);
  });
  $('#menu-overlay').addEventListener('focusin', function(e) {
    var b = e.target.closest('[data-menu-view]');
    if (b) setMenuActive(b.dataset.menuView);
  });
  document.addEventListener('keydown', function(e) {
    var menuOpen = $('#menu-overlay').classList.contains('open');
    if (e.key === 'Escape') { closeMenu(); return; }
    if (!menuOpen) return;
    var i = MENU_VIEWS.findIndex(function (v) { return v.view === menuActive; });
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      moveMenuFocus((i + 1) % MENU_VIEWS.length);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      moveMenuFocus((i - 1 + MENU_VIEWS.length) % MENU_VIEWS.length);
    }
  });

  function moveMenuFocus(i) {
    setMenuActive(MENU_VIEWS[i].view);
    var row = $('#menu-index .menu-row.on');
    if (row) { try { row.focus({ preventScroll: true }); } catch (err) { row.focus(); } }
  }

  // Búsqueda CxC
  var searchCxc = $('#search-cxc');
  if (searchCxc) searchCxc.addEventListener('input', function(e) { cxcQuery = e.target.value; renderCxC(); });

  // Búsqueda y filtros CxP
  var searchCxp = $('#search-cxp');
  if (searchCxp) searchCxp.addEventListener('input', function(e) { cxpQuery = e.target.value; renderCxP(); });
  $$('.chip[data-cxp-filter]').forEach(function(c) {
    c.addEventListener('click', function() { cxpFilter = c.dataset.cxpFilter; renderCxP(); });
  });

  // Búsqueda y filtros del directorio (clientes / prospectos)
  var searchCli = $('#search-cli');
  if (searchCli) searchCli.addEventListener('input', function(e) { cliQuery = e.target.value; renderClientes(); });
  $$('.chip[data-cli-filter]').forEach(function(c) {
    c.addEventListener('click', function() { cliFilter = c.dataset.cliFilter; renderClientes(); });
  });

  // Búsqueda y filtros del catálogo (productos y servicios)
  var searchProd = $('#search-prod');
  if (searchProd) searchProd.addEventListener('input', function(e) { prodQuery = e.target.value; renderProductos(); });
  $$('.chip[data-prod-filter]').forEach(function(c) {
    c.addEventListener('click', function() { prodFilter = c.dataset.prodFilter; renderProductos(); });
  });

  // Input events para modal CxP
  document.addEventListener('input', function(e) {
    if (!$('#modal-cxp').classList.contains('open')) return;
    if (e.target.id && e.target.id.indexOf('cxp-') === 0) {
      updateCxpSaldo();
    }
  });

  window.addEventListener('resize', () => {
    if (!$('#view-editor').hidden) autoscale();
  });

  // El tema «automático» reacciona al cambio de preferencia del sistema
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => { if (currentThemeMode() === 'auto') applyTheme('auto'); };
    if (mq.addEventListener) mq.addEventListener('change', onScheme);
    else if (mq.addListener) mq.addListener(onScheme);
  }

  /* Barra superior de sincronización: refleja el estado de la píldora */
  (function watchSync() {
    const pill = $('#sync-pill');
    const bar = $('#sync-bar');
    if (!pill || !bar) return;
    let doneTimer = null;
    function paint() {
      const busy = pill.classList.contains('sync-busy');
      const err = pill.classList.contains('sync-err');
      clearTimeout(doneTimer);
      bar.classList.toggle('on', busy || err);
      bar.classList.toggle('done', false);
      if (busy) return;
      if (bar.classList.contains('on')) {
        bar.classList.remove('on');
        bar.classList.add('done');
        doneTimer = setTimeout(() => bar.classList.remove('done'), 500);
      }
    }
    new MutationObserver(paint).observe(pill, { attributes: true, attributeFilter: ['class'] });
    paint();
  })();

  /* ---------------- PWA install ---------------- */
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window._deferredPrompt = e;
    const b = $('#btn-install');
    if (b) b.style.display = '';
  });
  window.addEventListener('appinstalled', () => {
    const b = $('#btn-install');
    if (b) b.style.display = 'none';
  });

  /* ---------------- Sync remoto: refrescar estado ---------------- */
  function reloadFromStore(changed) {
    if (!changed || changed.size === 0) return;
    if (changed.has('mc_settings')) {
      settings = Object.assign({}, DEFAULT_SETTINGS, storeGet('mc_settings', {}));
      settings.pagos = Object.assign({}, DEFAULT_SETTINGS.pagos, settings.pagos || {});
      applyTheme(currentThemeMode());
    }
    if (changed.has('mc_docs')) docs = storeGet('mc_docs', []);
    if (changed.has('mc_clientes')) clientes = storeGet('mc_clientes', []);
    if (changed.has('mc_cxp')) cuentasXPagar = storeGet('mc_cxp', []);
    if (changed.has('mc_productos')) productos = storeGet('mc_productos', []);

    const acc = $('#sync-account');
    if (acc && window.SYNC) acc.textContent = window.SYNC.accountEmail() || 'Sin cuenta';

    if (!$('#view-editor').hidden && editing) {
      // si el documento que estoy editando se borró en otro equipo, salir del editor
      if (docs.some((d) => d.id === editing.id)) {
        renderPreview();
        updateTotalsBox();
      } else {
        switchMainView(previousView, { replaceHistory: true });
      }
    } else {
      switchMainView(mainView);
    }
  }

  function bootApp() {
    // releer colecciones (el primer pull pudo traer datos remotos)
    settings = Object.assign({}, DEFAULT_SETTINGS, storeGet('mc_settings', {}));
    settings.pagos = Object.assign({}, DEFAULT_SETTINGS.pagos, settings.pagos || {});
    docs = storeGet('mc_docs', []);
    clientes = storeGet('mc_clientes', []);
    cuentasXPagar = storeGet('mc_cxp', []);
    productos = storeGet('mc_productos', []);
    const acc = $('#sync-account');
    if (acc && window.SYNC) acc.textContent = window.SYNC.accountEmail() || 'sin cuenta';
    showList();
  }

  /* ---------------- Init ---------------- */
  async function init() {
    resetAppHistory();
    applyTheme(currentThemeMode());
    preloadImages();
    if ('serviceWorker' in navigator) {
      try { navigator.serviceWorker.register('sw.js'); } catch (e) {}
    }
    if (window.SYNC) {
      window.SYNC.setRemoteHandler(reloadFromStore);
      if (window.SYNC.authed()) {
        bootApp();
        window.SYNC.runSync(true); // re-sincronizar al abrir
      } else {
        window.SYNC.showAuth(bootApp);
      }
    } else {
      bootApp();
    }
  }
  init();
})();
