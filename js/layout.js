/* ============================================================
   LAYOUT — especificación única del diseño del documento
   Todas las medidas en puntos (pt). Página Letter 612 x 792 pt.
   Rediseño 2026: cabecera a una línea, columna de totales con
   DESCUENTO / POR PAGAR, bloque P.O. TRACK con estado, PAGOS +
   TÉRMINOS a dos columnas y pie de página con datos de contacto.
   ============================================================ */
window.LAYOUT = {
  pageW: 612,
  pageH: 792,

  /* ---------- Paleta ---------- */
  brand:     [31, 61, 143],   // #1F3D8F  azul profundo (títulos)
  brandHex:  '#1F3D8F',
  steel:     [64, 100, 162],  // #4064A2  azul acero (etiquetas)
  steelHex:  '#4064A2',
  turq:      [73, 194, 190],  // #49C2BE  turquesa (tipo de documento)
  turqHex:   '#49C2BE',
  grey:      [154, 163, 178], // #9AA3B2  gris (subtítulos, P.O. TRACK)
  greyHex:   '#9AA3B2',
  body:      [51, 58, 71],    // #333A47  texto de términos
  bodyHex:   '#333A47',
  lineArt:   [205, 231, 230], // #CDE7E6  fondo de líneas
  lineArtHex:'#CDE7E6',
  rule:      [143, 163, 196], // #8FA3C4  reglas finas
  ruleHex:   '#8FA3C4',
  light:     [232, 242, 248],
  lightHex:  '#E8F2F8',

  contentL: 34,
  contentR: 560,

  /* ---------- Marca de agua + fondo de líneas ---------- */
  // Lettering pálido anclado arriba a la derecha (se recorta con la hoja).
  // Se dibuja con el propio logo escalado y muy poca opacidad: el PNG
  // antiguo traía el texto del diseño anterior incrustado.
  watermark: { x: 330, y: -54, w: 430, h: 281, opacity: 0.055 },
  // string-art: envolvente de rectas, esquina inferior izquierda
  lineArtBox: { x: -30, y: 330, w: 660, h: 470 },

  /* ---------- Cabecera ---------- */
  logoBox:    { x: 38, y: 26, w: 78, h: 60 },
  brandLine1: { x: 183, y: 50, size: 20.5 },   // "MONO CROMAT & CO."
  brandSlash: { x: 183, y: 50, size: 16.5 },   // "// estudio creativo" (x se calcula)
  docType:    { right: 560, y: 70, size: 17 }, // "RECIBO" / "COTIZACIÓN"

  /* ---------- Datos (dos columnas) ---------- */
  metaSize: 10.5,
  metaLeftX: 34, metaRightX: 247,
  metaYs: { fecha: 112, representante: 128, proyecto: 112, telefono: 128, email: 144 },

  /* ---------- Tabla de conceptos ---------- */
  headRuleY: 163, headRuleW: 0.9,
  tableHeaderY: 177, tableHeaderSize: 10.5,
  colDesc: 34, colQ: 339, colPrecio: 406, colSubtotal: 486,
  qtyAlignX: 356, priceAlignX: 447, subtotalAlignX: 560,
  itemsStartY: 196, rowH: 17, itemsMaxBottom: 380, itemSize: 10,
  itemsShiftBudget: 26,

  /* ---------- Totales (columna derecha) ---------- */
  totalsLabelX: 387, totalsAlignX: 560, totalsSize: 10.5,
  totalsYs: { subtotal: 397, iva: 407, total: 417, descuento: 427, porPagar: 446 },
  porPagarSize: 11.5,

  /* ---------- P.O. TRACK ---------- */
  trackDashY: 460,
  trackTitle: { x: 34, y: 478, size: 17 },
  trackHeaderY: 492, trackSize: 9.5,
  trackFechaX: 34, trackAbonoX: 205, trackSaldoX: 349, trackEstadoX: 502,
  trackStartY: 508, trackRowH: 14, trackMax: 5,
  trackRuleY: 546,

  /* ---------- Pagos (columna izquierda) ---------- */
  pagosTitle:  { x: 34, y: 570, size: 22 },
  pagosSubt:   { x: 34, y: 586, size: 9.5 },
  pagosLabelX: 34, pagosSize: 9.5,
  pagosYs: { cuenta: 604, clabe: 614, beneficiario: 624, banco: 634 },
  qrBox: { x: 34, y: 646, w: 48, h: 48, r: 7 },

  /* ---------- Términos (columna derecha) ---------- */
  termsTitle: { x: 259, y: 562, size: 9.5 },
  termsX: 259, termsY: 574, termsW: 301, termsSize: 6.6, termsLineH: 1.33,
  termsMaxLines: 15,
  // ninguna línea puede pisar la regla del pie
  termsBottom: 688,

  /* ---------- Pie ---------- */
  footRuleY: 695, footRuleW: 2.2,
  footSize: 8,
  footYs: [708, 719],
  footColL: 34, footColM: 279, footColR: 560,

  /* compat: claves antiguas que aún consultan algunos helpers */
  clientX: 34, clientValueX: 247, clientSize: 10.5,
  condX: 259, condTextW: 301, condTextSize: 7.4,
  abonosMax: 5,
  terminosW: 301, terminosSize: 7.4,
};

/* ================== Fondo string-art ==================
   La envolvente curva del diseño es un haz de rectas que unen dos
   segmentos rectos (string art). Se genera una sola vez y se dibuja
   igual en la vista previa (SVG) y en el PDF (jsPDF). */
window.lineArtSegments = function () {
  var B = window.LAYOUT.lineArtBox;
  var out = [];
  function fan(ax, ay, bx, by, cx, cy, dx, dy, n) {
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      out.push([
        ax + (bx - ax) * t, ay + (by - ay) * t,
        cx + (dx - cx) * t, cy + (dy - cy) * t
      ]);
    }
  }
  var L = B.x, R = B.x + B.w, T = B.y, Bo = B.y + B.h;
  // Haces contenidos en la mitad izquierda / borde inferior para que
  // la curva no cruce el bloque de términos ni el pie.
  // haz principal: envolvente que baja por la izquierda y se abre
  fan(L, T,       L, Bo,        L, Bo,      R - 90, Bo, 58);
  // haz secundario: densifica el interior de la curva
  fan(L, T + 70,  L + 55, Bo,   L + 25, Bo, R - 260, Bo, 42);
  // haz de cierre: rectas que insinúan la segunda curva
  fan(L, T + 165, L, Bo - 55,   L + 130, Bo, R - 40, Bo, 30);
  return out;
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
    const lineH = Math.round(size * 1.22 * 10) / 10;
    const baseRow = Math.max(L.rowH, size + 7);
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

  let res = build(L.itemSize);
  for (const size of [9.2, 8.5, 8]) {
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

/* ================== Totales del documento ==================
   Fuente única de verdad para app, vista previa y PDF.
   subtotal → IVA → descuento → total → abonos → por pagar. */
window.docTotals = function (doc, settings) {
  var s = settings || {};
  var items = (doc.items || []).filter(function (it) { return it.desc && String(it.desc).trim(); });
  var subtotal = items.reduce(function (a, it) {
    return a + (Number(it.q) || 0) * (Number(it.precioU) || 0);
  }, 0);
  var ivaRate = (doc.conIva === false) ? 0 : (Number(doc.iva != null ? doc.iva : s.iva) || 0);
  var iva = subtotal * ivaRate / 100;
  var descuento = Math.max(0, Number(doc.descuento) || 0);
  var total = Math.max(0, subtotal + iva - descuento);
  var abonado = (doc.abonos || []).reduce(function (a, x) { return a + (Number(x.monto) || 0); }, 0);
  // si se abonó de más, el saldo se muestra en cero (no en negativo)
  var porPagar = Math.max(0, total - abonado);
  return {
    n: items.length,
    subtotal: subtotal,
    ivaRate: ivaRate,
    iva: iva,
    descuento: descuento,
    total: total,
    abonado: abonado,
    porPagar: porPagar,
    // saldado con tolerancia de medio centavo
    pagado: abonado > 0 && porPagar <= 0.005
  };
};

/* Estado de cada abono para la columna ESTADO de P.O. TRACK */
window.abonoEstado = function (saldoDespues, index) {
  if (saldoDespues <= 0.005) return 'LIQUIDADO';
  return index === 0 ? 'ANTICIPO' : 'PARCIAL';
};
