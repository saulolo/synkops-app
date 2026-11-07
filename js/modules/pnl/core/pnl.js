// P&L contra entrega: ciclos de producto, reparto de la inversión Meta y agregado del filtro.
(() => {
  const core = globalThis.PYL.core;

  const IVA = 0.19;
  const div = (a, b) => (b ? a / b : null);

  // Ciclo de cada producto: de su primer a su último pedido en Dropi. El producto más
  // reciente sigue activo hasta hoy. giftFrom marca el primer pedido con obsequio.
  function cycles(lines, today) {
    const m = new Map();
    lines.forEach((l) => {
      if (!l.date) return;
      const c = m.get(l.prod) || { prod: l.prod, from: l.date, to: l.date, giftFrom: null, gift: null };
      if (l.date < c.from) c.from = l.date;
      if (l.date > c.to) c.to = l.date;
      if (l.giftOf && (!c.giftFrom || l.date < c.giftFrom)) { c.giftFrom = l.date; c.gift = l.giftOf; }
      m.set(l.prod, c);
    });
    const list = [...m.values()].sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
    const lastEnd = list.reduce((s, c) => (c.to > s ? c.to : s), '');
    list.forEach((c) => {
      c.lastOrder = c.to;
      if (c.to === lastEnd && today && today > c.to) { c.to = today; c.toToday = true; }
    });
    return list;
  }

  // Fracción de un cargo de Meta (fecha d) que corresponde a prod.
  function chargeShare(d, prod, cyc, w) {
    let cand = cyc.filter((c) => d >= c.from && d <= c.to);
    if (!cand.length) {
      // Cargo fuera de todo ciclo: va al último producto que terminó antes (Meta cobra con retraso),
      // o al primero si el cargo es anterior a cualquier pedido.
      const before = cyc.filter((c) => c.to < d).sort((a, b) => (a.to < b.to ? 1 : -1));
      cand = before.length ? [before[0]] : cyc.slice(0, 1);
    }
    if (!cand.some((c) => c.prod === prod)) return 0;
    if (cand.length === 1) return 1;
    const tot = cand.reduce((s, c) => s + (w[c.prod] || 0), 0);
    return tot ? (w[prod] || 0) / tot : 1 / cand.length;
  }

  // f: { prod: '__all' | nombre, from, to, adsOverride: number|null, iva: boolean (por defecto true), today: 'aaaa-mm-dd' }
  // mx: { camps, map: {campaña: producto|null} } o null si no hay reporte de métricas.
  function aggregate(lines, meta, f, mx) {
    const inRange = (d) => !!d && (!f.from || d >= f.from) && (!f.to || d <= f.to);
    const rangeLines = lines.filter((l) => inRange(l.date));
    const sel = f.prod === '__all' ? rangeLines : rangeLines.filter((l) => l.prod === f.prod);
    const orders = new Map();
    sel.forEach((l) => orders.set(l.id, l.cls));
    const c = { rec: orders.size, can: 0, ent: 0, dev: 0, rut: 0, pen: 0 };
    orders.forEach((k) => c[k]++);
    const sum = (cls, k) => sel.reduce((s, l) => s + (l.cls === cls ? l[k] : 0), 0);
    const fact = sum('ent', 'total'), merc = sum('ent', 'prov');
    const fEnt = sum('ent', 'flete'), fDevIda = sum('dev', 'flete'), fRet = sum('dev', 'dev');
    const fletes = fEnt + fDevIda + fRet;

    // Métricas: sin prorrateo. Entran las filas de campaña cuyo periodo toca el filtro;
    // si el export no trae desglose diario, son los totales del reporte completo.
    // Tampoco entran campañas de un producto sin pedidos activos en el rango.
    const all = f.prod === '__all';
    const cyc = cycles(lines, f.today);
    const live = (p) => { const c = cyc.find((x) => x.prod === p); return !c || ((!f.to || c.from <= f.to) && (!f.from || c.to >= f.from)); };
    const touches = (cp) => (!cp.start || !f.to || cp.start <= f.to) && (!cp.end || !f.from || cp.end >= f.from);
    const camps = mx ? mx.camps.map((cp) => ({ ...cp, prod: mx.map[cp.name] ?? null })).filter((cp) => touches(cp) && (!cp.prod || live(cp.prod))) : [];
    const selCamps = all ? camps : camps.filter((cp) => cp.prod === f.prod);
    const csum = (list, fn) => list.reduce((s, cp) => s + fn(cp), 0);
    const mSpendAll = csum(camps, (cp) => cp.spend);
    const mSpendSel = csum(selCamps, (cp) => cp.spend);
    const mUnassigned = csum(camps.filter((cp) => !cp.prod), (cp) => cp.spend);
    const metricsWider = camps.some((cp) => (cp.start && f.from && cp.start < f.from) || (cp.end && f.to && cp.end > f.to));

    // Inversión: suma exacta de los cargos de facturación con fecha dentro del rango.
    // Por producto, cada cargo va al producto con pedidos activos en esa fecha (ciclo de
    // Dropi); si dos productos coinciden, se divide según el gasto de sus campañas.
    // Con IVA = cargo de tarjeta; sin IVA = cargo ÷ 1,19. Sin facturación se usan las métricas.
    const metaR = meta.filter((m) => inRange(m.date));
    const billTotal = metaR.reduce((s, m) => s + m.amt, 0);
    const withIva = f.iva !== false;
    let adsIva;
    if (meta.length) {
      const w = {};
      if (mx) mx.camps.forEach((cp) => { const p = mx.map[cp.name]; if (p) w[p] = (w[p] || 0) + cp.spend; });
      adsIva = all ? billTotal : metaR.reduce((s, m) => s + m.amt * chargeShare(m.date, f.prod, cyc, w), 0);
    } else adsIva = mSpendSel * (1 + IVA);
    const adsAuto = withIva ? adsIva : adsIva / (1 + IVA);
    const ads = f.adsOverride != null ? f.adsOverride : adsAuto;

    const buys = camps.length ? Math.round(csum(selCamps, (cp) => cp.purchases)) : null;
    const imprW = csum(selCamps.filter((cp) => cp.ctr > 0), (cp) => cp.impr);
    const ctr = imprW ? csum(selCamps.filter((cp) => cp.ctr > 0), (cp) => cp.ctr * cp.impr) / imprW : null;
    const active = [...new Set(selCamps.filter((cp) => cp.spend > 0).map((cp) => cp.name))];
    const campAuto = !all && active.length ? active.join(' + ') : null;

    // Control del IVA: facturación del periodo del reporte de métricas frente a su gasto.
    let ivaCheck = null;
    if (mx && meta.length) {
      const mFrom = mx.camps.map((cp) => cp.start).filter(Boolean).sort()[0];
      const mTo = mx.camps.map((cp) => cp.end).filter(Boolean).sort().pop();
      const mTot = mx.camps.reduce((s, cp) => s + cp.spend, 0);
      const bill = meta.filter((m) => (!mFrom || m.date >= mFrom) && (!mTo || m.date <= mTo)).reduce((s, m) => s + m.amt, 0);
      if (mTot) ivaCheck = { bill, spend: mTot, pct: bill / mTot - 1 };
    }

    const wallet = fact - merc - fletes;
    const util = wallet - ads;
    return {
      ...c, desp: c.rec - c.can, ruta: c.rut + c.pen,
      fact, merc, fEnt, fDevIda, fRet, fletes, wallet, util,
      ads, adsAuto, billTotal, withIva, metaN: metaR.length,
      buys, ctr, campAuto, mSpendAll, mSpendSel, mUnassigned, metricsWider, ivaCheck,
      checkouts: camps.length ? Math.round(csum(selCamps, (cp) => cp.checkouts)) : null,
      cpaMeta: buys ? mSpendSel / buys : null,
      margen: div(util, fact), efect: div(c.ent, c.ent + c.dev), roas: div(fact, ads), roasEq: div(fact, wallet),
      cpa: div(ads, c.ent), cpaMax: div(wallet, c.ent), pesoCostos: div(fletes + ads, fact),
    };
  }

  // Productos ordenados por número de líneas, de mayor a menor.
  function products(lines) {
    const n = new Map();
    lines.forEach((l) => n.set(l.prod, (n.get(l.prod) || 0) + 1));
    return [...n.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
  }

  core.pnl = { cycles, aggregate, products };
})();
