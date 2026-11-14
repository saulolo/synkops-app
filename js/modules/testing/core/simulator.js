// Testeo · Simulador de un conjunto: deriva impresiones, clics, pagos iniciados y ventas desde la cadena
// (CPM, CTR, % a pago iniciado, % de venta) con azar de semilla reproducible. Sin DOM.
// Los límites y umbrales no se escriben aquí: salen de metrics (HARD_METRICS, NS_TEST, GENERIC_CPA) y testing (TEST_RULES, cpaZones).
// Nombres con prefijo sim/SIM_ para no chocar al aplanar en js/index.js.
(() => {
  const core = globalThis.PYL.core;
  const { NS_TEST, GENERIC_CPA } = core.metrics;

  // ctr, toPi y toSale en % (2 = 2 %). Presupuesto y tope salen de NovaSociety.
  const SIM_DEFAULTS = { mode: 'chain', plat: 'meta', daily: NS_TEST.budget, tope: GENERIC_CPA.tope, cpm: 12000, ctr: 2, toPi: 20, toSale: 30 };
  const SIM_STEP = 1000; // COP de gasto por punto de la corrida

  // Escenarios: cargan la cadena (no tocan presupuesto ni tope). Sus valores esperados caen en la rama que dice la spec.
  const SIM_SCENARIOS = [
    { k: 'cpm', t: '💸 CPM caro', v: { cpm: 30000, ctr: 2, toPi: 20, toSale: 30 } },
    { k: 'cpc', t: '😐 Producto no interesa', v: { cpm: 12000, ctr: 0.6, toPi: 20, toSale: 30 } },
    { k: 'page', t: '🧱 Página no convierte', v: { cpm: 12000, ctr: 2, toPi: 20, toSale: 0 } },
    { k: 'win', t: '🏆 Ganador', v: { cpm: 12000, ctr: 2, toPi: 20, toSale: 30 } },
  ];

  // Generador reproducible en [0, 1) (mulberry32).
  function simRng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Número desde texto es-CO: '1,5' → 1.5, '20.000' → 20000. Sin sentido → NaN.
  function simNum(text) {
    if (typeof text === 'number') return Number.isFinite(text) ? text : NaN;
    const t = String(text == null ? '' : text).replace(/[\s$%]/g, '');
    if (!/^\d+(\.\d{3})*(,\d+)?$|^\d+(,\d+)?$/.test(t)) return NaN;
    return Number(t.replace(/\./g, '').replace(',', '.'));
  }

  // Avisos por campo (null = todo bien). daily, tope y cpm > 0; ctr en (0, 100]; toPi y toSale en [0, 100].
  function simCheck(i) {
    const err = {};
    const num = (v) => typeof v === 'number' && Number.isFinite(v);
    if (!num(i.daily) || i.daily <= 0) err.daily = 'Escribe un presupuesto mayor que 0.';
    if (!num(i.tope) || i.tope <= 0) err.tope = 'Escribe un CPA tope mayor que 0.';
    if (!num(i.cpm) || i.cpm <= 0) err.cpm = 'Escribe un CPM mayor que 0.';
    if (!num(i.ctr) || i.ctr <= 0 || i.ctr > 100) err.ctr = 'El CTR va de más de 0 a 100 %.';
    if (!num(i.toPi) || i.toPi < 0 || i.toPi > 100) err.toPi = 'Va de 0 a 100 %.';
    if (!num(i.toSale) || i.toSale < 0 || i.toSale > 100) err.toSale = 'Va de 0 a 100 %.';
    return Object.keys(err).length ? err : null;
  }

  // Entradas guardadas (pyl-testing.sim): cada campo inválido o faltante cae en su defecto de SIM_DEFAULTS.
  function simLoad(raw) {
    const r = raw && typeof raw === 'object' ? raw : {}, out = { ...SIM_DEFAULTS };
    if (r.mode === 'chain' || r.mode === 'manual') out.mode = r.mode;
    if (r.plat === 'meta' || r.plat === 'tiktok') out.plat = r.plat;
    for (const k of ['daily', 'tope', 'cpm', 'ctr', 'toPi', 'toSale']) if (typeof r[k] === 'number' && Number.isFinite(r[k])) out[k] = r[k];
    const err = simCheck(out);
    if (err) for (const k of Object.keys(err)) out[k] = SIM_DEFAULTS[k];
    return out;
  }

  // Fin de la corrida: el fin del día en que cae el corte 3.
  const simEnd = (daily) => Math.ceil(NS_TEST.cuts[NS_TEST.cuts.length - 1] / daily) * daily;

  // Valores esperados (sin azar, sin redondear) para un gasto acumulado.
  function simExpect(i, spend) {
    const impr = (spend / i.cpm) * 1000;
    const clicks = impr * (i.ctr / 100);
    const pi = clicks * (i.toPi / 100);
    return { impr, clicks, pi, sales: pi * (i.toSale / 100), cpc: i.cpm / (10 * i.ctr) };
  }

  // Cadena con semáforo en un punto: CPM → CTR → CPC → CPPI → CPA ([{ k, value, light, ideal?, note? }], luz 'g'/'y'/'r' o null).
  // CPM y CPC salen de las entradas (límites por plataforma en HARD_METRICS[k].view[plat].lim); CPPI y CPA, del punto
  // (umbrales de TEST_RULES y zonas de cpaZones); el CTR se muestra sin luz: NovaSociety no lo mira.
  function simChain(point, i) {
    const lim = (k) => core.metrics.HARD_METRICS.find((r) => r.k === k).view[i.plat].lim;
    const within = (v, l) => (l.op === '<=' ? v <= l.max : v < l.max);
    const byLim = (k, value) => ({ k, value, light: within(value, lim(k)) ? 'g' : 'r', ideal: value < lim(k).ideal });
    const R = core.testing.TEST_RULES, z = core.testing.cpaZones(i.tope);
    const cppi = point.pi > 0 ? point.spend / point.pi : null, cpa = point.sales > 0 ? point.spend / point.sales : null;
    return [
      byLim('cpm', i.cpm),
      { k: 'ctr', value: i.ctr, light: null, note: 'No decide' },
      byLim('cpc', i.cpm / (10 * i.ctr)),
      { k: 'cppi', value: cppi, light: cppi === null ? null : cppi < R.cppiBueno ? 'g' : cppi <= R.cppiApaga ? 'y' : 'r' },
      { k: 'cpa', value: cpa, light: cpa === null ? null : cpa <= z.tope ? 'g' : cpa <= z.apaga ? 'y' : 'r' },
    ];
  }

  // Eslabón roto: el primero en rojo entre CPM, CPC y CPPI. Si ninguno lo está, hay pagos iniciados y 0 ventas pasado
  // el corte 3, el problema es la página (lectura 'cppi'). Devuelve la clave de TEST_CHAIN.reads o null.
  function simBroken(chain, point) {
    const red = ['cpm', 'cpc', 'cppi'].find((k) => chain.find((c) => c.k === k).light === 'r');
    if (red) return red;
    return point.pi > 0 && point.sales === 0 && point.spend >= NS_TEST.cuts[NS_TEST.cuts.length - 1] ? 'cppi' : null;
  }

  // Corrida completa: un punto cada SIM_STEP de gasto, de 0 al fin del día en que cae el corte 3.
  // Cada tramo trae impresiones esperadas (sin redondear); cada impresión entera nueva es clic con prob. ctr,
  // cada clic nuevo es pago iniciado con prob. toPi y cada pago iniciado nuevo es venta con prob. toSale.
  // cuts = testVerdict de cada corte y del fin del día; la corrida se corta en el primero con action 'off' (offAt).
  function simRun(i, seed) {
    const rnd = simRng(seed), end = simEnd(i.daily), tope = i.tope;
    const spends = [];
    for (let s = 0; s < end; s += SIM_STEP) spends.push(s);
    spends.push(end);
    const marks = NS_TEST.cuts.map((at) => ({ at, end: false })).concat({ at: end, end: true });
    const hit = (p) => rnd() < p / 100;
    const points = [{ spend: 0, impr: 0, clicks: 0, pi: 0, sales: 0 }], cuts = [];
    let offAt = null, cur = points[0];
    for (let k = 1; k < spends.length && offAt === null; k++) {
      const spend = spends[k], impr = cur.impr + ((spend - cur.spend) / i.cpm) * 1000;
      let clicks = cur.clicks, pi = cur.pi, sales = cur.sales;
      for (let n = Math.floor(impr) - Math.floor(cur.impr); n > 0; n--) {
        if (!hit(i.ctr)) continue;
        clicks++;
        if (!hit(i.toPi)) continue;
        pi++;
        if (hit(i.toSale)) sales++;
      }
      cur = { spend, impr, clicks, pi, sales };
      points.push(cur);
      // Los cortes caen en un punto (múltiplos de SIM_STEP); el fin del día es siempre el último.
      for (const m of marks) {
        if (m.at !== spend || cuts.some((c) => c.end === m.end && c.at === m.at)) continue;
        const verdict = core.testing.testVerdict({ spend, pi, sales, tope });
        cuts.push({ at: spend, verdict, end: m.end });
        if (verdict.action === 'off' && offAt === null) offAt = spend;
      }
    }
    return { seed, end, points, cuts, offAt };
  }

  // Lo que pinta la UI en un gasto (cae en el punto de abajo y no pasa del final ni del apagado):
  // point, verdict (testVerdict del punto), scaling (misma regla que testFree) e hist (una celda por corte y fin del día).
  function simAt(run, spend, i) {
    const pts = run.points;
    let point = pts[0];
    for (const p of pts) if (p.spend <= spend) point = p;
    const verdict = core.testing.testVerdict({ spend: point.spend, pi: point.pi, sales: point.sales, tope: i.tope });
    const scaling = point.spend >= i.daily && verdict.branch === 'c3-spend';
    const stopped = run.offAt !== null && point.spend >= run.offAt;
    const hist = NS_TEST.cuts.map((at) => ({ at, label: at / 1000 + 'K' })).concat({ at: run.end, label: 'Fin del día', end: true }).map((col) => {
      const cut = run.cuts.find((c) => c.at === col.at && !!c.end === !!col.end);
      if (cut && cut.at <= point.spend) { const q = pts.find((x) => x.spend === cut.at); return { ...col, state: 'done', verdict: cut.verdict, pi: q.pi, sales: q.sales }; }
      return { ...col, state: !cut && stopped ? 'stopped' : 'pending', verdict: null };
    });
    const chain = simChain(point, i);
    return { point, verdict, scaling, chain, broken: simBroken(chain, point), hist };
  }

  core.simulator = { SIM_DEFAULTS, SIM_SCENARIOS, SIM_STEP, simAt, simBroken, simChain, simCheck, simEnd, simExpect, simLoad, simNum, simRng, simRun };
})();
