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
