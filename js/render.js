/* ============================================================
   RENDER HTML — construye el documento como HTML (pt) para la
   vista previa en pantalla y la impresión. Usa LAYOUT.
   Estilo "Archivo": sellos, perforados (punteados), tipografía
   mono (Courier) y código de barras por folio.
   ============================================================ */
(function () {
  const ASC = 0.77; // fracción de la em box por encima de la línea base
  const MONO = "'Courier New',Courier,monospace";

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Texto de una línea. x = coordenada (izq para align left; derecha para align right)
  function txt(x, yBaseline, size, weight, str, opts = {}) {
    const top = (yBaseline - size * ASC).toFixed(2);
    const w = opts.w ? `width:${opts.w}pt;` : '';
    const overflow = opts.ellipsis ? 'overflow:hidden;text-overflow:ellipsis;' : '';
    const font = opts.mono ? `font-family:${MONO};` : '';
    let pos;
    if (opts.align === 'right') {
      pos = `left:auto;right:${(612 - x).toFixed(2)}pt;text-align:right;`;
    } else {
      pos = `left:${x.toFixed(2)}pt;text-align:left;`;
    }
    return `<div style="position:absolute;${pos}top:${top}pt;font-size:${size}pt;line-height:${size}pt;font-weight:${weight};white-space:nowrap;${w}${overflow}${font}">${esc(str)}</div>`;
  }

  function imgAbs(src, x, y, w, h, extra = '') {
    return `<img src="${esc(src)}" style="position:absolute;left:${x.toFixed(2)}pt;top:${y.toFixed(2)}pt;width:${w.toFixed(2)}pt;height:${h.toFixed(2)}pt;${extra}" alt="">`;
  }

  function contain(box, natW, natH) {
    const s = Math.min(box.w / natW, box.h / natH);
    const w = natW * s, h = natH * s;
    return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
  }

  function clockSVG(x, y) {
    return `<svg style="position:absolute;left:${x}pt;top:${y}pt" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#2B5EAB" stroke-width="1.1" stroke-linecap="round">
      <circle cx="6.5" cy="6.5" r="5.4"/>
      <line x1="6.5" y1="6.5" x2="6.5" y2="3.4"/>
      <line x1="6.5" y1="6.5" x2="9.1" y2="8.1"/>
    </svg>`;
  }

  function boxSVG(x, y) {
    return `<svg style="position:absolute;left:${x}pt;top:${y}pt" width="13" height="11" viewBox="0 0 13 11" fill="none" stroke="#2B5EAB" stroke-width="1.1" stroke-linejoin="round">
      <path d="M1 3.2 L6.5 0.6 L12 3.2 L12 8.4 L6.5 10.9 L1 8.4 Z"/>
      <path d="M1 3.2 L6.5 6.1 L12 3.2"/>
      <line x1="6.5" y1="6.1" x2="6.5" y2="10.9"/>
    </svg>`;
  }

  // block de texto multi-línea (ancho fijo)
  function para(x, yBaseline, size, str, widthPt, lineH = 1.35, weight = 400) {
    const top = (yBaseline - size).toFixed(2);
    return `<div style="position:absolute;left:${x.toFixed(2)}pt;top:${top}pt;width:${widthPt}pt;font-size:${size}pt;line-height:${lineH};font-weight:${weight};word-wrap:break-word;white-space:normal;">${esc(str)}</div>`;
  }

  // Línea punteada (perforado)
  function dash(x, y, w, weight) {
    return `<div style="position:absolute;left:${x.toFixed(2)}pt;top:${y.toFixed(2)}pt;width:${w.toFixed(2)}pt;border-top:${weight}pt dashed #2B5EAB;"></div>`;
  }

  // Sello tipo goma (doble anillo, rotado)
  function stamp(cx, cy, text, w, h, rot, fontPt) {
    return `<div style="position:absolute;left:${cx}pt;top:${cy}pt;width:${w}pt;height:${h}pt;transform:translate(-50%,-50%) rotate(${rot}deg);border:1.1pt solid #2B5EAB;border-radius:2pt;opacity:.92;">
      <div style="position:absolute;inset:1.2pt;border:0.5pt solid #2B5EAB;border-radius:1.5pt;"></div>
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:${fontPt}pt;font-weight:700;letter-spacing:1.5pt;text-transform:uppercase;">${esc(text)}</div>
    </div>`;
  }

  // Código de barras posicional (SVG)
  function barcodeAbs(x, y, w, h, text) {
    return `<div style="position:absolute;left:${x}pt;top:${y}pt;width:${w}pt;height:${h}pt;color:#2B5EAB;">${window.barcodeSVG(text, w, h)}</div>`;
  }

  // Mide un texto en pt (Space Grotesk, peso w). Convierte pt->px para el canvas.
  let _ctx = null;
  function measurePt(str, sizePt, weight) {
    try {
      if (!_ctx) _ctx = document.createElement('canvas').getContext('2d');
      _ctx.font = (weight || 300) + ' ' + (sizePt * 96 / 72) + 'px "Space Grotesk"';
      return _ctx.measureText(str).width * 72 / 96;
    } catch (e) {
      return str.length * sizePt * 0.58;
    }
  }

  window.receiptHTML = function (doc, settings) {
    const L = window.LAYOUT;
    const blue = L.brandHex;
    const s = settings || {};
    const isCot = doc.tipo === 'cotizacion';
    const items = (doc.items || []).filter((it) => it.desc && it.desc.trim());
    const table = window.layoutItems(doc);
    const shift = table.delta;
    const itemSize = table.size;
    const subtotal = items.reduce((a, it) => a + (Number(it.q) || 0) * (Number(it.precioU) || 0), 0);
    const ivaRate = (doc.conIva === false) ? 0 : (Number(doc.iva != null ? doc.iva : s.iva) || 0);
    const iva = subtotal * ivaRate / 100;
    const total = subtotal + iva;
    const abonosTotal = (doc.abonos || []).reduce((sum, a) => sum + (Number(a.monto) || 0), 0);
    const isPaid = (doc.abonos || []).length > 0 && (total - abonosTotal) <= 0.005;

    // posiciones del logo (contain dentro del recuadro)
    const logoNatW = 500, logoNatH = 327;
    const lp = contain(L.logoBox, logoNatW, logoNatH);

    let h = '';
    h += `<div style="width:612pt;height:792pt;position:relative;background:#ffffff;color:${blue};font-family:'Space Grotesk';font-weight:300;overflow:hidden;">`;

    /* marca de agua */
    h += imgAbs('assets/img/watermark.png', L.watermark.x, L.watermark.y, L.watermark.w, L.watermark.h);

    /* logo azul */
    h += imgAbs('assets/img/logo-blue.png', lp.x, lp.y, lp.w, lp.h);

    /* nombre de empresa */
    h += txt(L.brandLine1.x, L.brandLine1.y, L.brandLine1.size, 700, s.empresa || 'Mono Cromat & Co.');
    h += txt(L.brandSlash.x, L.brandSlash.y, L.brandSlash.size, 300, '/');
    h += txt(L.brandLine2.x, L.brandLine2.y, L.brandLine2.size, 300, s.empresaSub || 'Estudio Creativo');

    /* contacto (tipografía archivo) */
    const contact = [s.email, s.telefono, s.web, s.ciudad].filter(Boolean);
    contact.forEach((t, i) => {
      if (i < L.contact.ys.length) h += txt(L.contact.right, L.contact.ys[i], L.contact.size, 400, t, { align: 'right', w: 150, ellipsis: true, mono: true });
    });

    /* título (SG light) + número (Courier bold, tamaño adaptable) */
    const titulo = (isCot ? 'COTIZACIÓN NRO. ' : 'RECIBO NRO. ');
    h += txt(L.title.x, L.title.y, L.title.size, 300, titulo);
    const wT = measurePt(titulo, L.title.size, 300);
    const numStr = doc.numero || '';
    const numMaxW = L.date.x - 6 - (L.title.x + wT + 2);
    let numSize = 16;
    if (numStr && numStr.length * 0.6 * numSize > numMaxW) numSize = Math.max(9, numMaxW / (0.6 * numStr.length));
    h += txt(L.title.x + wT + 2, L.title.y, numSize, 700, numStr, { mono: true });

    /* fecha / vigencia (tipografía archivo) */
    h += txt(L.date.x, L.date.y, L.date.size, 400, 'FECHA: ' + window.fmtDate(doc.fecha), { mono: true });
    if (isCot && doc.vigencia) h += txt(L.vigencia.x, L.vigencia.y, L.vigencia.size, 400, 'VIGENCIA: ' + window.fmtDate(doc.vigencia), { mono: true });

    /* sello principal: RECIBO / COTIZACIÓN (banda del código de barras) */
    if (isCot) {
      h += stamp(505, 258, 'Cotización', 92, 18, -4, 10);
    } else {
      h += stamp(522, 258, 'Recibo', 58, 18, -4, 10);
    }
    /* sello secundario: PAGADO (solo si quedó saldado) */
    if (isPaid) h += stamp(468, 207, 'Pagado', 58, 16.5, 3, 9.5);

    /* cliente */
    const clientRows = [
      ['Proyecto:', doc.proyecto, L.clientYs.proyecto],
      ['Representante:', doc.representante, L.clientYs.representante],
      ['Teléfono:', doc.telefono, L.clientYs.telefono],
      ['Email:', doc.email, L.clientYs.email],
    ];
    clientRows.forEach(([label, val, y]) => {
      h += txt(L.clientX, y, L.clientSize, 300, label);
      h += txt(L.clientValueX, y, L.clientSize, 400, val, { ellipsis: true, w: L.contentR - L.clientValueX - 4 });
    });

    /* código de barras + folio (banda bajo el cliente, a la izquierda) */
    h += barcodeAbs(61, 250, 96, 16, doc.numero || 'MC');
    h += txt(61, 273, 7.5, 400, 'Nº ' + (doc.numero || ''), { mono: true });

    /* tabla (encabezado mono, doble regla) */
    h += txt(L.colDesc, L.tableHeaderY, L.tableHeaderSize, 400, 'DESCRIPCIÓN DEL SERVICIO', { mono: true });
    h += txt(L.colQ, L.tableHeaderY, L.tableHeaderSize, 400, 'Q', { mono: true });
    h += txt(L.colPrecio, L.tableHeaderY, L.tableHeaderSize, 400, 'PRECIO U', { mono: true });
    h += txt(L.colSubtotal, L.tableHeaderY, L.tableHeaderSize, 400, 'SUB-TOTAL', { mono: true });
    h += `<div style="position:absolute;left:${L.contentL}pt;top:${L.headerLineY}pt;width:${L.contentR - L.contentL}pt;height:${L.headerLineW}pt;background:${blue};"></div>`;
    h += `<div style="position:absolute;left:${L.contentL}pt;top:${(L.headerLineY + L.headerLineW + 1.7).toFixed(2)}pt;width:${L.contentR - L.contentL}pt;height:0.6pt;background:${blue};"></div>`;

    /* conceptos (descripción multi-línea) */
    let y = table.startY;
    const maxDescW = L.qtyAlignX - 6 - L.colDesc;
    table.rows.forEach((r) => {
      r.lines.forEach((ln, li) => {
        h += txt(L.colDesc, y + li * table.lineH, itemSize, 400, ln, { ellipsis: true, w: maxDescW });
      });
      const q = r.q;
      if (q) h += txt(L.qtyAlignX, y, itemSize, 400, String(q), { align: 'right', w: 34 });
      const pu = r.pu;
      if (pu) h += txt(L.priceAlignX, y, itemSize, 400, window.fmtMoney(pu), { align: 'right', w: 92 });
      h += txt(L.subtotalAlignX, y, itemSize, 400, window.fmtMoney(q * pu), { align: 'right', w: 92 });
      y += r.rowH;
    });

    /* totales */
    h += txt(L.totalsAlignX - 90, L.totalsYs.subtotal + shift, L.totalsSize, 300, 'Subtotal', { align: 'right', w: 90 });
    h += txt(L.totalsAlignX, L.totalsYs.subtotal + shift, L.totalsSize, 400, window.fmtMoney(subtotal), { align: 'right', w: 100 });
    if (ivaRate > 0) {
      h += txt(L.totalsAlignX - 90, L.totalsYs.iva + shift, L.totalsSize, 300, 'IVA (' + ivaRate + '%)', { align: 'right', w: 90 });
      h += txt(L.totalsAlignX, L.totalsYs.iva + shift, L.totalsSize, 400, window.fmtMoney(iva), { align: 'right', w: 100 });
    }
    h += txt(L.totalsAlignX - 90, L.totalsYs.total + shift, L.totalSize, 500, 'Total', { align: 'right', w: 90 });
    h += txt(L.totalsAlignX, L.totalsYs.total + shift, L.totalSize, 700, window.fmtMoney(total), { align: 'right', w: 100 });

    /* línea separadora (perforado) */
    h += dash(L.contentL, L.sectionLineY + shift, L.contentR - L.contentL, 1);

    /* datos para pagos (recuadro QR en punteado) */
    h += `<div style="position:absolute;left:${L.qrBox.x}pt;top:${(L.qrBox.y + shift).toFixed(2)}pt;width:${L.qrBox.w}pt;height:${L.qrBox.h}pt;border:0.8pt dashed ${blue};border-radius:${L.qrBox.r}pt;"></div>`;
    if (s.qr) {
      h += imgAbs(s.qr, L.qrBox.x + 6, L.qrBox.y + 6 + shift, L.qrBox.w - 12, L.qrBox.h - 12);
    }
    h += txt(L.pagosTitle.x, L.pagosTitle.y + shift, L.pagosTitle.size, 400, 'DATOS PARA PAGOS', { mono: true });
    const pagoRows = [
      ['Cuenta Nro. ', doc.pagos.cuenta, L.pagosYs.cuenta],
      ['Nro. Clabe', doc.pagos.clabe, L.pagosYs.clabe],
      ['Beneficiario', doc.pagos.beneficiario, L.pagosYs.beneficiario],
      ['Banco', doc.pagos.banco, L.pagosYs.banco],
    ];
    pagoRows.forEach(([label, val, py]) => {
      h += txt(L.pagosLabelX, py + shift, L.pagosSize, 300, label);
      h += txt(L.pagosValueX, py + shift, L.pagosSize, 400, val, { ellipsis: true, w: L.condX - L.pagosValueX - 8 });
    });

    /* columna derecha: condiciones */
    h += clockSVG(L.condIcon1.x, L.condIcon1.y - 6.5 + shift);
    if (doc.entregaFecha) {
      h += txt(L.entregaClockText.labelX, L.entregaClockText.y + shift, L.entregaClockText.size, 300, 'Fecha de entrega:');
      h += txt(L.entregaClockText.valueX, L.entregaClockText.y + shift, L.entregaClockText.size, 400, window.fmtDate(doc.entregaFecha), { w: L.entregaClockText.maxW, ellipsis: true });
    }
    h += dash(L.condX - 0.3, L.condLineY + shift, L.contentR - L.condX + 0.3, 0.8);
    h += boxSVG(L.condIcon2.x, L.condIcon2.y - 5 + shift);
    if (doc.entregaForma) {
      h += txt(L.entregaBoxText.labelX, L.entregaBoxText.y + shift, L.entregaBoxText.size, 300, 'Forma de entrega:');
      h += `<div style="position:absolute;left:${L.entregaBoxText.valueX}pt;top:${(L.entregaBoxText.y - L.entregaBoxText.size + shift).toFixed(2)}pt;width:${L.entregaBoxText.maxW}pt;font-size:${L.entregaBoxText.size}pt;line-height:1.3;font-weight:400;word-wrap:break-word;white-space:normal;max-height:24pt;overflow:hidden;">${esc(doc.entregaForma)}</div>`;
    }
    h += txt(L.condTitle.x, L.condTitle.y + shift, L.condTitle.size, 400, 'CONDICIONES DE ENTREGA', { mono: true });
    h += para(L.condX, L.condTextY + shift, L.condTextSize, doc.condiciones || s.condiciones || '', L.condTextW);

    /* abonos (encabezado mono) */
    h += txt(L.abonosFechaX, L.abonosHeaderY + shift, L.abonosSize, 400, 'FECHA', { mono: true });
    h += txt(L.abonosAbonoX, L.abonosHeaderY + shift, L.abonosSize, 400, 'ABONOS', { mono: true });
    h += txt(L.abonosSaldoX, L.abonosHeaderY + shift, L.abonosSize, 400, 'SALDO', { mono: true });
    const abonos = (doc.abonos || []).filter((a) => a.fecha || (Number(a.monto) || 0) !== 0).slice(0, L.abonosMax);
    let saldo = total;
    abonos.forEach((a, i) => {
      const yy = L.abonosStartY + i * L.abonosRowH + shift;
      h += txt(L.abonosFechaX, yy, L.abonosSize, 400, window.fmtDate(a.fecha) || '—', { mono: true });
      h += txt(L.abonosAbonoX, yy, L.abonosSize, 400, window.fmtMoney(a.monto), { mono: true });
      saldo -= (Number(a.monto) || 0);
      h += txt(L.abonosSaldoX, yy, L.abonosSize, 400, window.fmtMoney(saldo), { mono: true });
    });

    /* pie (perforado) + términos */
    h += dash(57, L.footerLineY + shift, 492, 0.6);
    h += txt(L.terminosTitle.x, L.terminosTitle.y + shift, L.terminosTitle.size, 400, 'TÉRMINOS', { mono: true });
    h += para(L.terminosTitle.x, L.terminosY + shift, L.terminosSize, doc.terminos || s.terminos || '', L.terminosW);

    h += `</div>`;
    return h;
  };
})();
