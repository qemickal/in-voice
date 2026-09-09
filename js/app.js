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
    if (k === 'mc_docs' || k === 'mc_settings' || k === 'mc_clientes' || k === 'mc_cxp') {
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
  let editing = null;   // copia de trabajo
  let editingCxp = null; // copia de trabajo para cuenta por pagar
  let selectedClientId = null;
  let images = null;    // dataURLs pre-cargados para el PDF
  let listFilter = 'todos';
  let listQuery = '';
  let mainView = 'docs';  // 'docs' | 'cxc' | 'cxp'
  let previousView = 'docs'; // vista antes de entrar al editor
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
      items: [{ desc: '', q: 1, precioU: 0 }],
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
      // logo de cabecera + lettering de fondo ya tenido (LAYOUT.watermark)
      const blue = await toDataURL('assets/img/logo-blue.png', 500, 327);
      const lettering = await toDataURL('assets/img/bg-lettering.png', 500, 327);
      images = { blue, lettering };
    } catch (e) { /* sin imágenes, el PDF saldrá sin logo */ }
  }

  /* ================= LISTA ================= */
  function showList() {
    $('#view-list').hidden = false;
    $('#view-editor').hidden = true;
    $('#topbar').classList.remove('hidden');
    document.body.classList.remove('in-editor');
    closeMenu();
    renderList();
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
          <span class="stamp empty-stamp">${docs.length ? 'Sin coincidencias' : 'Sin registros'}</span>
          <h3>${docs.length ? 'No hay documentos que coincidan' : 'Aún no hay documentos'}</h3>
          <p>${docs.length ? 'Prueba con otra búsqueda o filtro.' : 'Crea tu primer recibo o cotización y guárdalo en este dispositivo.'}</p>
          <div class="empty-actions">
            <button class="btn primary" data-action="new-recibo"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nuevo recibo</button>
            <button class="btn outline" data-action="new-cotizacion"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nueva cotización</button>
          </div>
        </div>`;
      refreshMenuCounts();
      return;
    }

    wrap.innerHTML = filtered.map((d) => {
      const t = computeTotals(d);
      const stamp = d.tipo === 'cotizacion'
        ? '<span class="stamp">Cotización</span>'
        : '<span class="stamp solid">Recibo</span>';
      return `
      <div class="card">
        <div class="card-top">
          ${stamp}
          <span class="card-num">Nº ${esc(d.numero)}</span>
          <span class="card-date">${window.fmtDate(d.fecha)}</span>
        </div>
        <div class="card-title">${esc(d.proyecto || 'Sin proyecto')}</div>
        <div class="card-sub">${esc(d.representante || '')}${d.representante ? ' · ' : ''}${esc(d.email || '')}</div>
        <div class="perf"></div>
        <div class="card-foot">
          <strong>${window.fmtMoney(t.total)}</strong>
          <span class="card-count">${t.n} concepto${t.n !== 1 ? 's' : ''}</span>
          <span class="barcode card-bc">${window.barcodeSVG(d.numero, 104, 20)}</span>
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
  function switchMainView(view) {
    mainView = view;
    $$('#menu-overlay .menu-item').forEach(function(b) {
      b.classList.toggle('active', b.dataset.view === view);
    });
    $('#view-list').hidden = view !== 'docs';
    $('#view-cxc').hidden = view !== 'cxc';
    $('#view-cxp').hidden = view !== 'cxp';
    $('#view-editor').hidden = true;
    $('#topbar').classList.remove('hidden');
    document.body.classList.remove('in-editor');
    closeMenu();
    if (view === 'docs') renderList();
    if (view === 'cxc') renderCxC();
    if (view === 'cxp') renderCxP();
    window.scrollTo(0, 0);
  }

  function refreshMenuCounts() {
    var d = $('#menu-count-docs');
    if (d) d.textContent = docs.length + ' EXP.';
    var c = $('#menu-count-cxc');
    if (c) c.textContent = getCxCData().length + ' CLT';
    var pen = 0;
    cuentasXPagar.forEach(function(x) {
      var ab = (x.abonos || []).reduce(function(s, a) { return s + (Number(a.monto) || 0); }, 0);
      if (x.monto - ab > 0.005) pen++;
    });
    var p = $('#menu-count-cxp');
    if (p) p.textContent = pen + ' PEN';
  }

  function openMenu() {
    refreshMenuCounts();
    $('#menu-overlay').classList.add('open');
    var fab = $('#menu-fab');
    if (fab) fab.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    var o = $('#menu-overlay');
    if (!o || !o.classList.contains('open')) return;
    o.classList.remove('open');
    var fab = $('#menu-fab');
    if (fab) fab.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function paintBarcodes() {
    var tb = $('#topbar-barcode');
    if (tb) tb.innerHTML = window.barcodeSVG('MONO CROMAT & CO. · ARCHIVO', 128, 22);
    var mb = $('#menu-barcode');
    if (mb) mb.innerHTML = window.barcodeSVG('MC-ARCHIVO-2026', 220, 34);
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
      wrap.innerHTML = '<div class="empty"><span class="stamp empty-stamp">' + (data.length ? 'Sin coincidencias' : 'Sin registros') + '</span>'
        + '<h3>' + (data.length ? 'No hay coincidencias' : 'No hay cuentas por cobrar') + '</h3>'
        + '<p>' + (data.length ? 'Prueba con otra búsqueda.' : 'Los saldos pendientes de tus recibos y cotizaciones aparecerán aquí automáticamente.') + '</p></div>';
      refreshMenuCounts();
      return;
    }

    wrap.innerHTML = filtered.map(function(c) {
      var docsHtml = c.docs.map(function(d) {
        var badge = d.tipo === 'cotizacion'
          ? '<span class="stamp mini">COT</span>'
          : '<span class="stamp mini solid">REC</span>';
        var pct = d.total > 0 ? Math.min(100, (d.abonado / d.total) * 100) : 0;
        return '<div class="card-doc-item">'
          + '<div>' + badge + ' <span>Nº ' + esc(d.numero) + '</span>'
          + (d.proyecto ? ' <span class="muted">— ' + esc(d.proyecto) + '</span>' : '')
          + '</div>'
          + '<div><strong>' + window.fmtMoney(d.saldo) + '</strong> <span class="muted">de ' + window.fmtMoney(d.total) + '</span></div>'
          + '</div>';
      }).join('');

      var pctGlobal = c.docs.reduce(function(s, d) { return s + d.abonado; }, 0);
      var pctTotal = c.docs.reduce(function(s, d) { return s + d.total; }, 0);
      var pct = pctTotal > 0 ? Math.min(100, (pctGlobal / pctTotal) * 100) : 0;

      return '<div class="card-cxc" data-cliente="' + esc(c.cliente) + '">'
        + '<div class="card-top">'
        + '<span class="stamp mini">Pendiente</span>'
        + '<span style="width:20px;height:20px;display:inline-flex">' + window.ICONS.user() + '</span>'
        + '<div><div style="font-weight:700;font-size:16px">' + esc(c.cliente) + '</div>'
        + (c.email ? '<div class="muted">' + esc(c.email) + '</div>' : '')
        + '</div>'
        + '<div style="margin-left:auto;text-align:right">'
        + '<div class="card-cxc-saldo">' + window.fmtMoney(c.saldoTotal) + '</div>'
        + '<div class="card-total-orig">DE ' + window.fmtMoney(pctTotal) + '</div>'
        + '</div>'
        + '</div>'
        + '<div class="perf"></div>'
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
      wrap.innerHTML = '<div class="empty"><span class="stamp empty-stamp">' + (cuentasXPagar.length ? 'Sin coincidencias' : 'Sin registros') + '</span>'
        + '<h3>' + (cuentasXPagar.length ? 'No hay coincidencias' : 'No hay cuentas por pagar') + '</h3>'
        + '<p>' + (cuentasXPagar.length ? 'Prueba con otra búsqueda o filtro.' : 'Registra tus gastos y facturas pendientes de pago.') + '</p>'
        + '<div class="empty-actions"><button class="btn primary" data-action="new-cxp"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nueva cuenta por pagar</button></div></div>';
      refreshMenuCounts();
      return;
    }

    wrap.innerHTML = filtered.map(function(c) {
      var abonosTotal = (c.abonos || []).reduce(function(s, a) { return s + (Number(a.monto) || 0); }, 0);
      var saldo = c.monto - abonosTotal;
      var status, statusClass;
      if (saldo <= 0.005) { status = 'PAGADA'; statusClass = 'pagada'; }
      else if (abonosTotal > 0) { status = 'PARCIAL'; statusClass = 'parcial'; }
      else { status = 'PENDIENTE'; statusClass = 'pendiente'; }

      var pct = c.monto > 0 ? Math.min(100, (abonosTotal / c.monto) * 100) : 0;
      var vencida = c.vencimiento && c.vencimiento < window.todayISO() && saldo > 0.005;

      var catLabels = {
        material: 'Material', servicio: 'Servicio', renta: 'Renta',
        servicios: 'Servicios', nomina: 'Nómina', impuestos: 'Impuestos', otro: 'Otro'
      };

      return '<div class="card-cxp ' + statusClass + '">'
        + '<div class="card-top">'
        + '<span class="cxp-status ' + statusClass + '">' + status + '</span>'
        + '<span class="card-categoria">' + (catLabels[c.categoria] || c.categoria) + '</span>'
        + (c.folio ? '<span class="muted" style="font-size:12px">' + esc(c.folio) + '</span>' : '')
        + (vencida ? '<span class="cxp-vencida">' + window.ICONS.warning() + ' Vencida ' + window.fmtDate(c.vencimiento) + '</span>' : '')
        + '</div>'
        + '<div style="font-weight:700;font-size:15px">' + esc(c.proveedor || 'Sin proveedor') + '</div>'
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
    previousView = mainView;
    $('#view-list').hidden = true;
    $('#view-cxc').hidden = true;
    $('#view-cxp').hidden = true;
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
              ${clientes.map((c) => `<option value="${c.id}" ${c.id === selectedClientId ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}
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
      <input class="i-desc" type="text" placeholder="Descripción del servicio" value="${esc(it.desc)}">
      <div class="i-nums">
        <label>Q<input class="i-q" type="number" min="0" step="1" value="${esc(it.q)}"></label>
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
    showList();
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

  async function shareDoc() {
    if (!editing) return;
    syncForm();
    const btn = $('[data-action="share"]');
    const old = btn.textContent; btn.disabled = true; btn.textContent = 'Generando…';
    try {
      const file = await makePdfFile();
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: file.name, text: file.name });
      } else {
        downloadBlob(file, file.name);
        toast('PDF descargado (compartir archivos no está disponible en este navegador).');
      }
    } catch (err) {
      if (!(err && err.name === 'AbortError')) toast('No se pudo compartir: ' + (err && err.message ? err.message : 'error'));
    } finally {
      btn.disabled = false; btn.textContent = old;
    }
  }

  /* ---------------- Ajustes ---------------- */
  function openSettings() {
    const s = settings;
    $('#settings-body').innerHTML = `
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

  /* ---------------- Eventos ---------------- */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const a = btn.dataset.action;
    switch (a) {
      case 'new-recibo': { const d = blankDoc('recibo'); docs.push(d); storeSet('mc_docs', docs); showEditor(d); break; }
      case 'new-cotizacion': { const d = blankDoc('cotizacion'); docs.push(d); storeSet('mc_docs', docs); showEditor(d); break; }
      case 'back': saveDoc(true); switchMainView(previousView); break;
      case 'save': saveDoc(false); break;
      case 'print': printDoc(); break;
      case 'email': sendEmail(); break;
      case 'share': shareDoc(); break;
      case 'delete':
        if (editing) { if (confirm('¿Eliminar este documento?')) { docs = docs.filter((d) => d.id !== editing.id); storeSet('mc_docs', docs); if (window.SYNC) window.SYNC.tombstone('docs', editing.id); switchMainView(previousView); } }
        break;
      case 'edit': { const d = docs.find((x) => x.id === btn.dataset.id); if (d) showEditor(d); break; }
      case 'duplicate': {
        const src = docs.find((x) => x.id === btn.dataset.id);
        if (src) {
          const copy = JSON.parse(JSON.stringify(src));
          copy.id = window.uid(); copy.numero = nextNumero(src.tipo);
          copy.createdAt = copy.updatedAt = Date.now();
          docs.push(copy); storeSet('mc_docs', docs); renderList();
        }
        break;
      }
      case 'delete-list': deleteDoc(btn.dataset.id); break;
      case 'set-tipo':
        if (editing) { editing.tipo = btn.dataset.tipo; renderEditor(); renderPreview(); }
        break;
      case 'add-item':
        if (editing) { editing.items.push({ desc: '', q: 1, precioU: 0 }); renderEditor(); renderPreview(); }
        break;
      case 'del-item': {
        editing.items.splice(Number(btn.dataset.index), 1);
        if (!editing.items.length) editing.items = [{ desc: '', q: 1, precioU: 0 }];
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
          cli = { id: window.uid(), nombre, telefono: editing.telefono || '', email: editing.email || '', updatedAt: Date.now() };
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
      case 'settings': openSettings(); break;
      case 'save-settings': saveSettings(); break;
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

      /* --- Menú inferior (índice general) --- */
      case 'toggle-menu':
        if ($('#menu-overlay').classList.contains('open')) closeMenu(); else openMenu();
        break;
      case 'close-menu': closeMenu(); break;

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
        e.target.classList.contains('a-fecha') || e.target.classList.contains('a-monto')) {
      syncForm();
      updateTotalsBox();
      updateAbonosSaldo();
      renderPreview();
    }
  });

  document.addEventListener('change', (e) => {
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

  // Menú inferior: índice general (pantalla completa)
  $$('#menu-overlay .menu-item').forEach(function(b) {
    b.addEventListener('click', function() {
      if (!b.dataset.view) return; // items sin vista (cuenta/salir)
      closeMenu();
      switchMainView(b.dataset.view);
    });
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeMenu();
  });

  // Búsqueda CxC
  var searchCxc = $('#search-cxc');
  if (searchCxc) searchCxc.addEventListener('input', function(e) { cxcQuery = e.target.value; renderCxC(); });

  // Búsqueda y filtros CxP
  var searchCxp = $('#search-cxp');
  if (searchCxp) searchCxp.addEventListener('input', function(e) { cxpQuery = e.target.value; renderCxP(); });
  $$('.chip[data-cxp-filter]').forEach(function(c) {
    c.addEventListener('click', function() { cxpFilter = c.dataset.cxpFilter; renderCxP(); });
  });

  // Input events para modal CxP
  document.addEventListener('input', function(e) {
    if (!$('#modal-cxp').classList.contains('open')) return;
    if (e.target.id && e.target.id.indexOf('cxp-') === 0) {
      updateCxpSaldo();
    }
  });

  window.addEventListener('resize', () => { if (!$('#view-editor').hidden) autoscale(); });

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
    }
    if (changed.has('mc_docs')) docs = storeGet('mc_docs', []);
    if (changed.has('mc_clientes')) clientes = storeGet('mc_clientes', []);
    if (changed.has('mc_cxp')) cuentasXPagar = storeGet('mc_cxp', []);

    const acc = $('#sync-account');
    if (acc && window.SYNC) acc.textContent = window.SYNC.accountEmail() || 'Sin cuenta';

    if (!$('#view-editor').hidden && editing) {
      // si el documento que estoy editando se borró en otro equipo, salir del editor
      if (docs.some((d) => d.id === editing.id)) {
        renderPreview();
        updateTotalsBox();
      } else {
        switchMainView(previousView);
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
    const acc = $('#sync-account');
    if (acc && window.SYNC) acc.textContent = window.SYNC.accountEmail() || 'Sin cuenta';
    showList();
    $$('#menu-overlay .menu-item').forEach(function(b) {
      b.classList.toggle('active', b.dataset.view === mainView);
    });
  }

  /* ---------------- Init ---------------- */
  async function init() {
    paintBarcodes();
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
