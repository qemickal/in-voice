/* ============================================================
   LAYOUT — especificación única del diseño del documento
   Todas las medidas en puntos (pt). Página Letter 612 x 792 pt.
   Extraídas fielmente del PDF de diseño proporcionado.
   ============================================================ */
window.LAYOUT = {
  pageW: 612,
  pageH: 792,

  brand: [43, 94, 171],      // #2B5EAB
  brandHex: '#2B5EAB',
  light: [238, 244, 251],    // #EEF4FB
  lightHex: '#EEF4FB',

  contentL: 61,
  contentR: 553,

  /* ---------- Encabezado ---------- */
  watermark: { x: 0, y: 0, w: 612, h: 792 },        // marca de agua (extraída del PDF original)
  logoBox:   { x: 60.8, y: 67.7, w: 76.4, h: 51.1 },   // logo azul (marca)
  brandLine1: { x: 143.9, y: 84.1, size: 21.8 },        // "Mono Cromat & Co."
  brandSlash: { x: 349, y: 84.1, size: 16 },          // "/"
  brandLine2: { x: 143.9, y: 101.4, size: 16 },         // "Estudio Creativo"
  contact: { right: 553, ys: [76.5, 90.8, 105.1, 119.4], size: 11, gap: 14.3 },

  /* ---------- Título y fecha ---------- */
  title: { x: 59.8, y: 163.2, size: 20 },
  date:  { x: 377.9, y: 156.6, size: 11 },
  vigencia: { x: 377.9, y: 173, size: 11 },

  /* ---------- Datos del cliente ---------- */
  clientX: 60.8, clientValueX: 150, clientSize: 11,
  clientYs: { proyecto: 197.5, representante: 211.8, telefono: 226.1, email: 240.4 },

  /* ---------- Tabla de conceptos ---------- */
  tableHeaderY: 289.5, tableHeaderSize: 11,
  colDesc: 61, colQ: 283.1, colPrecio: 368.8, colSubtotal: 475.5,
  qtyAlignX: 302, priceAlignX: 460, subtotalAlignX: 553,
  headerLineY: 300.4, headerLineW: 2.13,
  itemsStartY: 318, rowH: 21, itemsMaxBottom: 432, itemSize: 11,
  itemsShiftBudget: 48,   // máx. puntos que se empuja el bloque inferior por descripciones largas

  /* ---------- Totales ---------- */
  totalsAlignX: 553,
  totalsYs: { subtotal: 436, iva: 453, total: 470 },
  totalsSize: 11, totalSize: 12,

  sectionLineY: 479,

  /* ---------- Datos para pagos ---------- */
  qrBox: { x: 61.1, y: 495, w: 61.1, h: 61.1, r: 8 },
  pagosTitle: { x: 131.1, y: 502, size: 10 },
  pagosLabelX: 131.1, pagosValueX: 202, pagosSize: 9.9,
  pagosYs: { cuenta: 515, clabe: 528, beneficiario: 541, banco: 554 },

  /* ---------- Condiciones de entrega (columna derecha) ---------- */
  condX: 368.5,
  condIcon1: { x: 370, y: 500 },   // reloj
  condIcon2: { x: 370, y: 534 },   // paquete
  condLineY: 519,
  entregaClockText: { labelX: 387, valueX: 470, y: 503, size: 9, maxW: 83 },
  entregaBoxText:  { labelX: 387, valueX: 470, y: 537, size: 9, maxW: 83 },
  condTitle: { x: 368.5, y: 592, size: 10 },
  condTextY: 605, condTextW: 184, condTextSize: 9,

  /* ---------- Abonos ---------- */
  abonosHeaderY: 591, abonosSize: 10,
  abonosFechaX: 62.6, abonosAbonoX: 159.5, abonosSaldoX: 260.9,
  abonosStartY: 606, abonosRowH: 16, abonosMax: 4,

  /* ---------- Pie ---------- */
  footerLineY: 668,
  terminosTitle: { x: 56.8, y: 687.5, size: 10 },
  terminosY: 700.5, terminosW: 490, terminosSize: 9,
};

/* ================== Iconos SVG minimalistas ================== */
// Stroke-only, sin relleno, estilo Lucide/Feather
window.ICONS = (function() {
  var S = 'stroke="currentColor" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  function wrap(w, h, inner, cls) {
    return '<svg class="ic' + (cls ? ' ' + cls : '') + '" width="' + w + '" height="' + h + '" viewBox="0 0 24 24" ' + S + '>' + inner + '</svg>';
  }
  return {
    docs: function(cls) {
      return wrap(18, 18, '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>', cls);
    },
    coin: function(cls) {
      return wrap(18, 18, '<circle cx="12" cy="12" r="9"/><path d="M15 9.2c-.5-1-1.5-1.5-3-1.5-1.7 0-3 .8-3 2.3 0 3 6 1.5 6 4.5 0 1.5-1.3 2.3-3 2.3-1.7 0-2.7-.7-3.2-1.8"/><line x1="12" y1="5.5" x2="12" y2="7"/><line x1="12" y1="17" x2="12" y2="18.5"/>', cls);
    },
    clipboard: function(cls) {
      return wrap(18, 18, '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2h6V3"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="15" y2="14"/>', cls);
    },
    settings: function(cls) {
      return wrap(18, 18, '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>', cls);
    },
    trash: function(cls) {
      return wrap(18, 18, '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 3h4a1 1 0 0 1 1 1v2H8V4a1 1 0 0 1 1-1Z"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>', cls);
    },
    save: function(cls) {
      return wrap(18, 18, '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>', cls);
    },
    printer: function(cls) {
      return wrap(18, 18, '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>', cls);
    },
    envelope: function(cls) {
      return wrap(18, 18, '<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/>', cls);
    },
    share: function(cls) {
      return wrap(18, 18, '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>', cls);
    },
    download: function(cls) {
      return wrap(18, 18, '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>', cls);
    },
    user: function(cls) {
      return wrap(18, 18, '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', cls);
    },
    receipt: function(cls) {
      return wrap(18, 18, '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2Z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/>', cls);
    },
    cash: function(cls) {
      return wrap(18, 18, '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>', cls);
    },
    plus: function(cls) {
      return wrap(18, 18, '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', cls);
    },
    check: function(cls) {
      return wrap(18, 18, '<polyline points="20 6 9 17 4 12"/>', cls);
    },
    arrowLeft: function(cls) {
      return wrap(18, 18, '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>', cls);
    },
    close: function(cls) {
      return wrap(18, 18, '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', cls);
    },
    warning: function(cls) {
      return wrap(18, 18, '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>', cls);
    },
    search: function(cls) {
      return wrap(18, 18, '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>', cls);
    }
  };
})();

/* ================== Helpers de formato ================== */
window.fmtMoney = function (n) {
  const v = Number(n) || 0;
  const sign = v < 0 ? '-' : '';
  return sign + '$' + Math.abs(v).toLocaleString('es-MX', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
};

window.fmtDate = function (iso) {
  if (!iso) return '';
  // acepta yyyy-mm-dd y dd/mm/yyyy
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return iso;
};

window.todayISO = function () {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

window.uid = function () {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
};

/* ================== Texto multi-línea ================== */
// Divide un texto en líneas que caben en maxW (ancho estimado por nº de caracteres)
window.wrapText = function (text, maxW, size) {
  const charW = size * 0.575;                 // factor medido de Space Grotesk + margen
  const maxChars = Math.max(6, Math.floor(maxW / charW));
  const words = String(text == null ? '' : text).trim().split(/\s+/);
  if (!words.length || !words[0]) return [''];
  const lines = [];
  let cur = '';
  for (const w of words) {
    let word = w;
    while (word.length > maxChars) {          // romper palabras muy largas
      if (cur) { lines.push(cur); cur = ''; }
      lines.push(word.slice(0, maxChars));
      word = word.slice(maxChars);
    }
    const test = cur ? cur + ' ' + word : word;
    if (test.length > maxChars) { lines.push(cur); cur = word; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
};

/* ================== Código de barras Code 128 (real, escaneable) ==================
   Simbología Code 128 (ISO/IEC 15417): 107 símbolos de 11 módulos
   (3 barras + 3 espacios, anchos 1–4) + dígito de verificación.
   - Code B: ASCII 32–127 (letras, dígitos, signos)
   - Code C: pares de dígitos, se activa en corridas de 4+ números
   - Verificación: (start + Σ valor_i × posición_i) mod 103
   La tabla y el algoritmo están validados contra bwip-js y jsbarcode
   (identidad módulo a módulo) y la salida se decodifica con ZXing.
   barcodeBars() devuelve las barras en pt (para el PDF);
   barcodeSVG() genera el SVG (para la app y la vista previa). */
window.C128 = (function () {
  var T = [
    "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213","221312","231212","112232","122132","122231","113222","123122","123221","223211","221132","221231",
    "213212","223112","312131","311222","321122","321221","312212","322112","322211","212123","212321","232121","111323","131123","131321","112313","132113","132311","211313","231113","231311",
    "112133","112331","132131","113123","113321","133121","313121","211331","231131","213113","213311","213131","311123","311321","331121","312113","312311","332111","314111","221411","431111",
    "111224","111422","121124","121421","141122","141221","112214","112412","122114","122411","142112","142211","241211","221114","413111","241112","134111","111242","121142","121241","114212",
    "124112","124211","411212","421112","421211","212141","214121","412121","111143","111341","131141","114113","114311","411113","411311","113141","114131","311141","411131","211412","211214",
    "211232","233111"  ];
  var START_B = 104, START_C = 105, STOP = 106;
  var SWITCH_C = 99, SWITCH_B = 100;

  // Code B solo cubre ASCII 32–127; mapea lo común y descarta el resto
  var MAP = { 'º': 'O', 'ª': 'a', '°': 'D', '·': '-', '–': '-', '—': '-',
              '…': '...', '¡': '!', '¿': '?', '‘': "'", '’': "'",
              '“': '"', '”': '"', '€': 'EUR', '¢': 'c', '×': 'x',
              '÷': '/', '²': '2', '³': '3', '½': '1/2' };
  function sanitize(t) {
    var s = String(t == null ? '' : t);
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i], v = s.charCodeAt(i);
      if (v >= 32 && v < 128) out += c;
      else if (MAP[c]) out += MAP[c];
      else {
        var lo = c.toLowerCase(), up = c.toUpperCase();
        if (lo.length === 1 && lo.charCodeAt(0) >= 32 && lo.charCodeAt(0) < 128) out += lo;
        else if (up.length === 1 && up.charCodeAt(0) >= 32 && up.charCodeAt(0) < 128) out += up;
      }
    }
    return out;
  }

  // Devuelve el array de valores de patrón (incluye start, verificación y stop)
  function encode(text) {
    var t = sanitize(text);
    if (!t) t = 'MC';
    var n = t.length, i = 0;
    function digitsAt(k) {
      var m = 0;
      while (k + m < n) {
        var c = t.charCodeAt(k + m);
        if (c >= 48 && c <= 57) m++; else break;
      }
      return m;
    }
    var pats = [];
    var startsC = n >= 4 && digitsAt(0) >= 4;
    pats.push(startsC ? START_C : START_B);
    var modeC = startsC;
    while (i < n) {
      if (!modeC) {
        if (digitsAt(i) >= 4) { pats.push(SWITCH_C); modeC = true; continue; }
        pats.push(t.charCodeAt(i) - 32); i++;
      } else {
        if (digitsAt(i) >= 2) {
          pats.push((t.charCodeAt(i) - 48) * 10 + (t.charCodeAt(i + 1) - 48)); i += 2;
        } else { pats.push(SWITCH_B); modeC = false; }
      }
    }
    var sum = pats[0];
    for (var k = 1; k < pats.length; k++) sum += pats[k] * k;
    pats.push(sum % 103, STOP);
    return pats;
  }

  // Cadena de módulos: '1' = barra, '0' = espacio (sin zonas de quietud)
  function modules(text) {
    var pats = encode(text);
    var s = '';
    for (var p = 0; p < pats.length; p++) {
      var w = T[pats[p]];
      for (var k = 0; k < 6; k++) {
        var n = +w.charAt(k);
        for (var m = 0; m < n; m++) s += (k % 2 === 0 ? '1' : '0');
      }
    }
    s += '11'; // barra final de 2 módulos del símbolo de parada
    return s;
  }

  return { TABLE: T, sanitize: sanitize, encode: encode, modules: modules };
})();

window.barcodeBars = function (text, width) {
  var w = width || 140;
  var mods = window.C128.modules(text);
  var Q = 10;                                   // quietud (mín. 10 módulos por lado)
  var scale = w / (mods.length + 2 * Q);
  var bars = [], i = 0;
  while (i < mods.length) {
    if (mods.charAt(i) === '1') {
      var j = i;
      while (j < mods.length && mods.charAt(j) === '1') j++;
      bars.push({ x: (Q + i) * scale, w: (j - i) * scale });
      i = j;
    } else i++;
  }
  return { bars: bars, w: w };
};

window.barcodeSVG = function (text, width, height) {
  var d = window.barcodeBars(text, width);
  var h = height || 24;
  var w = d.w;
  var inner = '<g fill="currentColor">' + d.bars.map(function (b) {
    return '<rect x="' + b.x.toFixed(3) + '" y="0" width="' + b.w.toFixed(3) + '" height="' + h + '"/>';
  }).join('') + '</g>';
  return '<svg class="barcode-svg" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' + inner + '</svg>';
};

/* ================== Layout de la tabla de conceptos ==================
   Calcula el alto de cada renglón según cuántas líneas ocupa la
   descripción, elige el tamaño de letra que cabe y devuelve el
   desplazamiento (delta) que debe aplicarse al bloque inferior. */
window.layoutItems = function (doc) {
  const L = window.LAYOUT;
  const items = (doc.items || []).filter((it) => it.desc && it.desc.trim());
  const maxDescW = L.qtyAlignX - 6 - L.colDesc;
  const avail = L.itemsMaxBottom - L.itemsStartY;
  const budget = L.itemsShiftBudget;

  function build(size) {
    const lineH = Math.round(size * 1.18 * 10) / 10;
    const baseRow = size + 10;
    const rows = items.map((it) => ({
      desc: String(it.desc || '').trim(),
      q: Number(it.q) || 0,
      pu: Number(it.precioU) || 0,
      lines: window.wrapText(it.desc, maxDescW, size),
      rowH: 0,
    }));
    rows.forEach((r) => { r.rowH = baseRow + (r.lines.length - 1) * lineH; });
    const totalH = rows.reduce((a, r) => a + r.rowH, 0);
    const delta = Math.max(0, L.itemsStartY + totalH - L.itemsMaxBottom);
    return { rows, size, lineH, delta, clipped: false };
  }

  let res = build(11);
  for (const size of [10, 9]) {
    if (res.delta <= budget) break;
    res = build(size);
  }

  if (res.delta > budget) {
    const { rows, lineH } = res;
    const target = avail + budget;
    rows.forEach((r) => { r.rowH = lineH * r.lines.length; });
    let totalH = rows.reduce((a, r) => a + r.rowH, 0);
    if (totalH > target) {
      res.clipped = true;
      while (true) {
        const cur = rows.reduce((a, r) => a + lineH * r.lines.length, 0);
        if (cur <= target) break;
        let removed = false;
        for (let i = rows.length - 1; i >= 0; i--) {
          if (rows[i].lines.length > 1) { rows[i].lines.pop(); removed = true; break; }
        }
        if (!removed) break;
      }
      rows.forEach((r) => { r.rowH = lineH * r.lines.length; });
      const last = rows[rows.length - 1];
      if (last && last.lines.length) last.lines[last.lines.length - 1] += '…';
      totalH = rows.reduce((a, r) => a + r.rowH, 0);
    }
    res.delta = Math.max(0, L.itemsStartY + totalH - L.itemsMaxBottom);
  }
  res.startY = L.itemsStartY;
  return res;
};
