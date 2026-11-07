// Reporte de órdenes de Dropi: detección, clasificación de estados y armado de líneas.
(() => {
  const core = globalThis.PYL.core;
  const { norm, num } = core.parse;
  const { toISO } = core.dates;

  const isDropi = (rows) => rows.slice(0, 10).some((r) => r.map(norm).includes('ESTATUS'));

  // Estado de Dropi → fase del embudo: can | ent | dev | pen | rut.
  function classify(s) {
    if (/DEVOLU|DEVUELT/.test(s)) return 'dev';
    if (/CANCELAD|RECHAZAD|ANULAD/.test(s)) return 'can';
    if (/^ENTREGAD/.test(s) && !/TRANSPORTADORA/.test(s)) return 'ent';
    if (/PENDIENTE/.test(s)) return 'pen';
    return 'rut';
  }

  const DROPI_COLS = {
    id: 'ID', status: 'ESTATUS', total: 'TOTAL DE LA ORDEN', flete: 'PRECIO FLETE',
    dev: 'COSTO DEVOLUCION FLETE', prov: 'PRECIO PROVEEDOR X CANTIDAD', prod: 'PRODUCTO', date: 'FECHA',
  };
  const GIFT = /OBSEQUIO|REGALO|GRATIS|\bGIFT\b/;

  // Dropi exporta una fila por producto. TOTAL, FLETE y PROVEEDOR vienen por línea;
  // COSTO DEVOLUCION FLETE se repite en cada línea de la orden, así que se toma una vez
  // y se reparte entre líneas según su flete.
  function buildDropi(rows) {
    const hi = rows.findIndex((r) => r.map(norm).includes('ESTATUS'));
    if (hi < 0) throw new Error('No encontré la columna ESTATUS. ¿Es el reporte de órdenes de Dropi?');
    const H = rows[hi].map(norm);
    const idx = {}, missing = [];
    for (const [k, name] of Object.entries(DROPI_COLS)) {
      idx[k] = H.indexOf(name);
      if (idx[k] < 0) missing.push(name);
    }
    if (missing.length) throw new Error('Faltan columnas en Dropi: ' + missing.join(', '));
    const lines = [];
    let noDate = 0;
    for (const r of rows.slice(hi + 1)) {
      const id = String(r[idx.id] ?? '').trim();
      if (!id) continue;
      const status = norm(r[idx.status]);
      const date = toISO(r[idx.date]);
      if (!date) noDate++;
      lines.push({
        id, status, cls: classify(status), date,
        prod: String(r[idx.prod] ?? '').trim() || '(sin producto)',
        total: num(r[idx.total], true), flete: num(r[idx.flete], true),
        devRaw: num(r[idx.dev], true), prov: num(r[idx.prov], true),
      });
    }
    if (!lines.length) throw new Error('El reporte de Dropi no tiene órdenes.');
    const byId = new Map();
    lines.forEach((l) => { if (!byId.has(l.id)) byId.set(l.id, []); byId.get(l.id).push(l); });
    byId.forEach((ls) => {
      const dev = Math.max(...ls.map((l) => l.devRaw));
      const fs = ls.reduce((s, l) => s + l.flete, 0);
      ls.forEach((l) => { l.dev = dev ? (fs ? (dev * l.flete) / fs : dev / ls.length) : 0; });
    });
    // Los obsequios son parte de la oferta del producto principal de su orden: su recaudo,
    // mercancía y fletes se suman a ese producto en vez de aparecer como producto aparte.
    let gifts = 0;
    const giftNames = new Set();
    byId.forEach((ls) => {
      const main = ls.filter((l) => !GIFT.test(norm(l.prod))).sort((a, b) => b.total - a.total)[0];
      if (!main) return;
      ls.forEach((l) => {
        if (l === main || !GIFT.test(norm(l.prod))) return;
        giftNames.add(l.prod);
        l.giftOf = l.prod; l.prod = main.prod; gifts++;
      });
    });
    return { lines, noDate, orders: byId.size, gifts, giftNames: [...giftNames] };
  }

  core.dropi = { isDropi, classify, buildDropi };
})();
