// Archivos de Meta: facturación (gasto real con IVA) y métricas de campañas del Administrador de anuncios.
(() => {
  const core = globalThis.PYL.core;
  const { norm, num } = core.parse;
  const { toISO } = core.dates;

  // ---------- Facturación ----------
  const META_H = {
    date: (h) => /^FECHA|^DIA$|^DAY$|^DATE|INICIO DEL INFORME|REPORTING STARTS/.test(h),
    amt: (h) => /^IMPORTE|AMOUNT|GASTADO|^MONTO|^VALOR/.test(h),
    cur: (h) => /^DIVISA|^MONEDA|^CURRENCY/.test(h),
    status: (h) => /^ESTADO|^STATUS/.test(h),
    method: (h) => /METODO DE PAGO|PAYMENT METHOD/.test(h),
  };

  // Resumen de facturación de Meta. En cuentas prepago trae dos tipos de fila:
  // recargas de saldo (método = tarjeta) y gasto descontado del saldo (método = "No disponible").
  // Solo el gasto cuenta como inversión; sumar ambas duplicaría la cifra.
  function buildMeta(rows) {
    const hi = rows.slice(0, 25).findIndex((r) => { const H = r.map(norm); return H.some(META_H.date) && H.some(META_H.amt); });
    if (hi < 0) throw new Error('No encontré columnas de Fecha e Importe en el archivo de Meta.');
    const H = rows[hi].map(norm);
    const ix = {};
    for (const k of Object.keys(META_H)) ix[k] = H.findIndex(META_H[k]);
    const parsed = [];
    let skipped = 0, billed = null;
    const otherCur = new Set();
    for (const r of rows.slice(hi + 1)) {
      const label = r.map(norm).find((c) => /IMPORTE TOTAL FACTURADO|TOTAL BILLED|TOTAL AMOUNT BILLED/.test(c));
      if (label) { billed = num(r[ix.amt], false); continue; }
      const date = toISO(r[ix.date]);
      const amt = num(r[ix.amt], false);
      if (!date || !amt) continue;
      if (ix.status > -1 && /FALL|RECHAZ|DECLIN|FAIL|REEMBOLS|REFUND|CANCEL/.test(norm(r[ix.status]))) { skipped++; continue; }
      const curTxt = norm(ix.cur > -1 ? r[ix.cur] : (String(r[ix.amt]).match(/[A-Za-z]{3}/) || [''])[0]);
      if (curTxt && curTxt !== 'COP') otherCur.add(curTxt);
      parsed.push({ date, amt, method: ix.method > -1 ? norm(r[ix.method]) : '' });
    }
    const isSpend = (m) => /NO DISPONIBLE|NOT AVAILABLE/.test(m);
    const prepaid = parsed.some((p) => isSpend(p.method)) && parsed.some((p) => !isSpend(p.method));
    const out = prepaid ? parsed.filter((p) => isSpend(p.method)) : parsed;
    const deposits = prepaid ? parsed.filter((p) => !isSpend(p.method)) : [];
    if (!out.length) throw new Error('El archivo de Meta no tiene cobros con fecha e importe válidos.');
    return {
      rows: out, skipped, otherCur: [...otherCur], billed, prepaid,
      depositsN: deposits.length, depositsTotal: deposits.reduce((s, p) => s + p.amt, 0),
    };
  }

  // ---------- Métricas de campañas ----------
  // Export de campañas del Administrador de anuncios (una fila por campaña, o por campaña y día).
  const MET_H = {
    start: (h) => /^INICIO DEL INFORME|^REPORTING STARTS/.test(h),
    end: (h) => /^FIN DEL INFORME|^REPORTING ENDS/.test(h),
    day: (h) => /^DIA$|^DAY$/.test(h),
    camp: (h) => /^NOMBRE DE LA CAMPANA|^CAMPAIGN NAME/.test(h),
    status: (h) => /^ENTREGA DE LA CAMPANA|^CAMPAIGN DELIVERY/.test(h),
    results: (h) => /^RESULTADOS$|^RESULTS$/.test(h),
    indicator: (h) => /^INDICADOR DE RESULTADO$|^RESULT INDICATOR$/.test(h),
    spend: (h) => /^MONTO GASTADO|^IMPORTE GASTADO|^AMOUNT SPENT/.test(h),
    impr: (h) => /^IMPRESIONES$|^IMPRESSIONS$/.test(h),
    checkouts: (h) => /^PAGOS INICIADOS$|^CHECKOUTS INITIATED$/.test(h),
    ctr: (h) => /^CTR UNICO|^UNIQUE CTR/.test(h),
  };
  const isMetrics = (rows) => rows.slice(0, 10).some((r) => { const H = r.map(norm); return H.some(MET_H.camp) && H.some(MET_H.spend); });

  function buildMetrics(rows) {
    const hi = rows.slice(0, 10).findIndex((r) => { const H = r.map(norm); return H.some(MET_H.camp) && H.some(MET_H.spend); });
    if (hi < 0) throw new Error('No encontré "Nombre de la campaña" y "Monto gastado" en el reporte de métricas.');
    const H = rows[hi].map(norm);
    const ix = {};
    for (const k of Object.keys(MET_H)) ix[k] = H.findIndex(MET_H[k]);
    // El export usa punto decimal ("20469.55"); si viene con separadores de mil, usa num().
    const nm = (v) => { const s = String(v ?? '').trim(); return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : num(s, false); };
    const get = (r, k) => (ix[k] > -1 ? r[ix[k]] : null);
    const camps = [];
    for (const r of rows.slice(hi + 1)) {
      const name = String(get(r, 'camp') ?? '').trim();
      if (!name) continue;
      const day = toISO(get(r, 'day'));
      const ind = norm(get(r, 'indicator'));
      camps.push({
        name,
        start: day || toISO(get(r, 'start')), end: day || toISO(get(r, 'end')),
        status: String(get(r, 'status') ?? '').trim(),
        spend: nm(get(r, 'spend')),
        purchases: !ind || /PURCHASE|COMPRA/.test(ind) ? nm(get(r, 'results')) : 0,
        impr: nm(get(r, 'impr')), checkouts: nm(get(r, 'checkouts')), ctr: nm(get(r, 'ctr')),
      });
    }
    if (!camps.length) throw new Error('El reporte de métricas no tiene campañas.');
    const starts = camps.map((c) => c.start).filter(Boolean).sort();
    const ends = camps.map((c) => c.end).filter(Boolean).sort();
    return { camps, names: [...new Set(camps.map((c) => c.name))], from: starts[0] || null, to: ends[ends.length - 1] || null };
  }

  // Asigna una campaña ("16 SEP - CREMA ARBUTIN") al producto de Dropi con más palabras en común.
  const STOP = new Set(['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'SET', 'OCT', 'NOV', 'DIC', 'CON', 'DEL', 'LOS', 'LAS', 'POR', 'PARA', 'CAJA', 'CAMPANA', 'VENTAS', 'CBO', 'ABO', 'TEST']);
  const toks = (s) => norm(s).split(/[^A-Z0-9]+/).filter((t) => t.length >= 3 && !/^\d+$/.test(t) && !STOP.has(t));
  function matchProduct(name, prods) {
    const ct = toks(name);
    let best = null, score = 0;
    prods.forEach((p) => {
      const pt = toks(p);
      const s = ct.filter((t) => pt.some((q) => q === t || (t.length >= 4 && q.length >= 4 && (q.startsWith(t) || t.startsWith(q))))).length;
      if (s > score) { score = s; best = p; }
    });
    return best;
  }

  core.meta = { buildMeta, isMetrics, buildMetrics, matchProduct };
})();
