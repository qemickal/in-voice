/* ============================================================
   PDF ENGINE — genera el PDF real (para correo / compartir)
   usando jsPDF + fuentes Space Grotesk incrustadas + el logo.
   Dibuja con las mismas coordenadas que la vista previa (LAYOUT).
   ============================================================ */
(function () {
  const L = () => window.LAYOUT;

  const FONT_URLS = {
    light:   'assets/fonts/SpaceGrotesk-Light.ttf',
    regular: 'assets/fonts/SpaceGrotesk-Regular.ttf',
    medium:  'assets/fonts/SpaceGrotesk-Medium.ttf',
    bold:    'assets/fonts/SpaceGrotesk-Bold.ttf',
  };
  const FONT_NAMES = { light: 'SGLight', regular: 'SGRegular', medium: 'SGMedium', bold: 'SGBold' };

  let fontB64Cache = null;

  async function toBase64(url) {
    const r = await fetch(url);
    const b = await r.blob();
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);       // dataURL
      fr.onerror = rej;
      fr.readAsDataURL(b);
    });
  }

  async function getFontB64() {
    if (fontB64Cache) return fontB64Cache;
    const out = {};
    for (const key of Object.keys(FONT_URLS)) {
      const dataUrl = await toBase64(FONT_URLS[key]);
      out[key] = dataUrl.split(',')[1];
    }
    fontB64Cache = out;
    return out;
  }

  // Cada instancia de jsPDF necesita sus propias fuentes registradas.
  async function ensureFonts(pdf) {
    const fonts = await getFontB64();
    for (const key of Object.keys(FONT_URLS)) {
      const vfsName = 'SG-' + key + '.ttf';
      pdf.addFileToVFS(vfsName, fonts[key]);
      pdf.addFont(vfsName, FONT_NAMES[key], 'normal');
    }
  }

  function fitText(pdf, str, maxW) {
    if (pdf.getTextWidth(str) <= maxW) return str;
    let s = str;
    while (s.length > 1 && pdf.getTextWidth(s + '…') > maxW) s = s.slice(0, -1);
    return s + '…';
  }

  function contain(img, box) {
    const s = Math.min(box.w / img.w, box.h / img.h);
    const w = img.w * s, h = img.h * s;
    return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
  }

  function drawClock(pdf, x, y) {
    const c = L().brand;
    pdf.setDrawColor(...c); pdf.setLineWidth(0.8);
    pdf.circle(x + 5.5, y - 4, 5.5, 'S');                 // esfera
    pdf.line(x + 5.5, y - 4, x + 5.5, y - 7.4);           // manecilla 12
    pdf.line(x + 5.5, y - 4, x + 8.4, y - 2.2);           // manecilla 3
  }

  function drawBox(pdf, x, y) {
    const c = L().brand;
    pdf.setDrawColor(...c); pdf.setLineWidth(0.8);
    pdf.rect(x + 1, y - 2.5, 10, 7.5, 'S');               // caja
    pdf.line(x + 1, y - 2.5, x + 6, y - 6);               // solapa izq
    pdf.line(x + 6, y - 6, x + 11, y - 2.5);              // solapa der
    pdf.line(x + 6, y - 6, x + 6, y + 0.5);               // pliegue
  }

  async function build(doc, settings, images) {
    const LAY = L();
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'pt', format: [LAY.pageW, LAY.pageH], compress: true });
    await ensureFonts(pdf);

    const F = (w) => pdf.setFont(FONT_NAMES[w], 'normal');
    const blue = LAY.brand;
    pdf.setTextColor(...blue);
    pdf.setFillColor(...blue);
    pdf.setDrawColor(...blue);

    /* ---------- Marca de agua (extraída del diseño original) ---------- */
    if (images && images.watermark) {
      pdf.addImage(images.watermark.dataUrl, 'PNG', LAY.watermark.x, LAY.watermark.y, LAY.watermark.w, LAY.watermark.h);
    }

    /* ---------- Logo azul ---------- */
    if (images && images.blue) {
      const p = contain(images.blue, LAY.logoBox);
      pdf.addImage(images.blue.dataUrl, 'PNG', p.x, p.y, p.w, p.h);
    }

    /* ---------- Nombre de la empresa ---------- */
    F('medium'); pdf.setFontSize(LAY.brandLine1.size);
    pdf.text(settings.empresa || 'Mono Cromat & Co.', LAY.brandLine1.x, LAY.brandLine1.y);
    F('light'); pdf.setFontSize(LAY.brandSlash.size);
    pdf.text('/', LAY.brandSlash.x, LAY.brandSlash.y);
    pdf.setFontSize(LAY.brandLine2.size);
    pdf.text(settings.empresaSub || 'Estudio Creativo', LAY.brandLine2.x, LAY.brandLine2.y);

    /* ---------- Contacto (columna derecha) ---------- */
    F('light'); pdf.setFontSize(LAY.contact.size);
    const contactLines = [settings.email, settings.telefono, settings.web, settings.ciudad].filter(Boolean);
    contactLines.forEach((t, i) => {
      if (i < LAY.contact.ys.length) {
        pdf.text(t, LAY.contact.right, LAY.contact.ys[i], { align: 'right' });
      }
    });

    /* ---------- Título ---------- */
    const titulo = doc.tipo === 'cotizacion' ? 'COTIZACIÓN NRO. ' : 'RECIBO NRO. ';
    F('light'); pdf.setFontSize(LAY.title.size);
    pdf.text(titulo + (doc.numero || ''), LAY.title.x, LAY.title.y);

    F('light'); pdf.setFontSize(LAY.date.size);
    pdf.text('Fecha: ' + window.fmtDate(doc.fecha), LAY.date.x, LAY.date.y);
    if (doc.tipo === 'cotizacion' && doc.vigencia) {
      pdf.text('Vigencia: ' + window.fmtDate(doc.vigencia), LAY.vigencia.x, LAY.vigencia.y);
    }

    /* ---------- Datos del cliente ---------- */
    const clientRows = [
      ['Proyecto:', doc.proyecto, LAY.clientYs.proyecto],
      ['Representante:', doc.representante, LAY.clientYs.representante],
      ['Teléfono:', doc.telefono, LAY.clientYs.telefono],
      ['Email:', doc.email, LAY.clientYs.email],
    ];
    clientRows.forEach(([label, val, y]) => {
      F('light'); pdf.setFontSize(LAY.clientSize);
      pdf.text(label, LAY.clientX, y);
      F('regular');
      const maxW = LAY.contentR - LAY.clientValueX - 6;
      pdf.text(fitText(pdf, val || '', maxW), LAY.clientValueX, y);
    });

    /* ---------- Encabezado de la tabla ---------- */
    F('light'); pdf.setFontSize(LAY.tableHeaderSize);
    pdf.text('Descripción del servicio', LAY.colDesc, LAY.tableHeaderY);
    pdf.text('Q', LAY.colQ, LAY.tableHeaderY);
    pdf.text('Precio U', LAY.colPrecio, LAY.tableHeaderY);
    pdf.text('Sub-total', LAY.colSubtotal, LAY.tableHeaderY);
    pdf.setLineWidth(LAY.headerLineW);
    pdf.line(LAY.contentL, LAY.headerLineY, LAY.contentR, LAY.headerLineY);

    /* ---------- Conceptos (descripción multi-línea) ---------- */
    const items = (doc.items || []).filter((it) => it.desc && it.desc.trim());
    const table = window.layoutItems(doc);
    const shift = table.delta;
    const itemSize = table.size;
    const descMaxW = LAY.qtyAlignX - 6 - LAY.colDesc;
    let y = table.startY;
    table.rows.forEach((r) => {
      F('regular'); pdf.setFontSize(itemSize);
      r.lines.forEach((ln, li) => {
        pdf.text(ln, LAY.colDesc, y + li * table.lineH);
      });
      const q = r.q;
      if (q) pdf.text(String(q), LAY.qtyAlignX, y, { align: 'right' });
      const pu = r.pu;
      if (pu) pdf.text(window.fmtMoney(pu), LAY.priceAlignX, y, { align: 'right' });
      pdf.text(window.fmtMoney(q * pu), LAY.subtotalAlignX, y, { align: 'right' });
      y += r.rowH;
    });

    /* ---------- Totales ---------- */
    const subtotal = items.reduce((a, it) => a + (Number(it.q) || 0) * (Number(it.precioU) || 0), 0);
    const ivaRate = (doc.conIva === false) ? 0 : (Number(doc.iva != null ? doc.iva : settings.iva) || 0);
    const iva = subtotal * ivaRate / 100;
    const total = subtotal + iva;
    F('light'); pdf.setFontSize(LAY.totalsSize);
    pdf.text('Subtotal', LAY.totalsAlignX - 90, LAY.totalsYs.subtotal + shift, { align: 'right' });
    F('regular');
    pdf.text(window.fmtMoney(subtotal), LAY.totalsAlignX, LAY.totalsYs.subtotal + shift, { align: 'right' });
    if (ivaRate > 0) {
      F('light');
      pdf.text('IVA (' + ivaRate + '%)', LAY.totalsAlignX - 90, LAY.totalsYs.iva + shift, { align: 'right' });
      F('regular');
      pdf.text(window.fmtMoney(iva), LAY.totalsAlignX, LAY.totalsYs.iva + shift, { align: 'right' });
    }
    F('medium'); pdf.setFontSize(LAY.totalSize);
    pdf.text('Total', LAY.totalsAlignX - 90, LAY.totalsYs.total + shift, { align: 'right' });
    F('bold');
    pdf.text(window.fmtMoney(total), LAY.totalsAlignX, LAY.totalsYs.total + shift, { align: 'right' });

    /* ---------- Línea separadora ---------- */
    pdf.setLineWidth(0.57);
    pdf.line(LAY.contentL, LAY.sectionLineY + shift, LAY.contentR, LAY.sectionLineY + shift);

    /* ---------- Datos para pagos ---------- */
    pdf.setDrawColor(...blue); pdf.setLineWidth(0.57);
    pdf.roundedRect(LAY.qrBox.x, LAY.qrBox.y + shift, LAY.qrBox.w, LAY.qrBox.h, LAY.qrBox.r, LAY.qrBox.r, 'S');
    if (settings.qr) {
      try { pdf.addImage(settings.qr, 'PNG', LAY.qrBox.x + 6, LAY.qrBox.y + 6 + shift, LAY.qrBox.w - 12, LAY.qrBox.h - 12); } catch (e) {}
    }
    F('light'); pdf.setFontSize(LAY.pagosTitle.size);
    pdf.text('Datos para pagos', LAY.pagosTitle.x, LAY.pagosTitle.y + shift);
    const pagoRows = [
      ['Cuenta Nro. ', doc.pagos.cuenta, LAY.pagosYs.cuenta],
      ['Nro. Clabe', doc.pagos.clabe, LAY.pagosYs.clabe],
      ['Beneficiario', doc.pagos.beneficiario, LAY.pagosYs.beneficiario],
      ['Banco', doc.pagos.banco, LAY.pagosYs.banco],
    ];
    pagoRows.forEach(([label, val, py]) => {
      F('light'); pdf.setFontSize(LAY.pagosSize);
      pdf.text(label, LAY.pagosLabelX, py + shift);
      F('regular');
      const maxW = LAY.condX - LAY.pagosValueX - 8;
      pdf.text(fitText(pdf, val || '', maxW), LAY.pagosValueX, py + shift);
    });

    /* ---------- Columna derecha: condiciones ---------- */
    drawClock(pdf, LAY.condIcon1.x, LAY.condIcon1.y + shift);
    if (doc.entregaFecha) {
      F('light'); pdf.setFontSize(LAY.entregaClockText.size);
      pdf.text('Fecha de entrega:', LAY.entregaClockText.labelX, LAY.entregaClockText.y + shift);
      F('regular');
      pdf.text(window.fmtDate(doc.entregaFecha), LAY.entregaClockText.valueX, LAY.entregaClockText.y + shift);
    }
    pdf.setLineWidth(0.57);
    pdf.line(LAY.condX - 0.3, LAY.condLineY + shift, LAY.contentR, LAY.condLineY + shift);
    drawBox(pdf, LAY.condIcon2.x, LAY.condIcon2.y + shift);
    if (doc.entregaForma) {
      F('light'); pdf.setFontSize(LAY.entregaBoxText.size);
      pdf.text('Forma de entrega:', LAY.entregaBoxText.labelX, LAY.entregaBoxText.y + shift);
      F('regular');
      const formaLines = pdf.splitTextToSize(doc.entregaForma || '', LAY.entregaBoxText.maxW).slice(0, 2);
      pdf.text(formaLines, LAY.entregaBoxText.valueX, LAY.entregaBoxText.y + shift, { lineHeightFactor: 1.3 });
    }
    F('light'); pdf.setFontSize(LAY.condTitle.size);
    pdf.text('Condiciones de Entrega', LAY.condTitle.x, LAY.condTitle.y + shift);
    F('regular'); pdf.setFontSize(LAY.condTextSize);
    const condLines = pdf.splitTextToSize(doc.condiciones || settings.condiciones || '', LAY.condTextW).slice(0, 3);
    pdf.text(condLines, LAY.condX, LAY.condTextY + shift, { lineHeightFactor: 1.35 });

    /* ---------- Abonos ---------- */
    F('light'); pdf.setFontSize(LAY.abonosSize);
    pdf.text('Fecha', LAY.abonosFechaX, LAY.abonosHeaderY + shift);
    pdf.text('Abonos', LAY.abonosAbonoX, LAY.abonosHeaderY + shift);
    pdf.text('Saldo', LAY.abonosSaldoX, LAY.abonosHeaderY + shift);
    const abonos = (doc.abonos || []).filter((a) => a.fecha || (Number(a.monto) || 0) !== 0).slice(0, LAY.abonosMax);
    let saldo = total;
    F('regular');
    abonos.forEach((a, i) => {
      const yy = LAY.abonosStartY + i * LAY.abonosRowH + shift;
      pdf.text(window.fmtDate(a.fecha) || '—', LAY.abonosFechaX, yy);
      pdf.text(window.fmtMoney(a.monto), LAY.abonosAbonoX, yy);
      saldo -= (Number(a.monto) || 0);
      pdf.text(window.fmtMoney(saldo), LAY.abonosSaldoX, yy);
    });

    /* ---------- Pie: términos ---------- */
    pdf.setLineWidth(0.28);
    pdf.line(57, LAY.footerLineY + shift, 549, LAY.footerLineY + shift);
    F('light'); pdf.setFontSize(LAY.terminosTitle.size);
    pdf.text('Términos', LAY.terminosTitle.x, LAY.terminosTitle.y + shift);
    F('regular'); pdf.setFontSize(LAY.terminosSize);
    const termLines = pdf.splitTextToSize(doc.terminos || settings.terminos || '', LAY.terminosW).slice(0, 3);
    pdf.text(termLines, LAY.terminosTitle.x, LAY.terminosY + shift, { lineHeightFactor: 1.3 });

    return pdf.output('blob');
  }

  window.PDFEngine = { build };
})();
