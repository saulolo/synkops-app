// Barra de filtros: producto, fechas, IVA, valores manuales y periodos rápidos.
(() => {
  const PYL = globalThis.PYL;
  const app = PYL.app, S = app.state;
  const { $, setPressed } = PYL.ui.dom;
  const { nf, short } = PYL.core.format;
  const { num } = PYL.core.parse;
  const { todayISO, addDays, periodLabel } = PYL.core.dates;
  const { cycles, products } = PYL.core.pnl;

  // Primera fecha de Dropi y última fecha entre Dropi, facturación y métricas.
  function dateBounds() {
    const ds = S.dropi.lines.map((l) => l.date).filter(Boolean).sort();
    const ms = (S.meta || []).map((m) => m.date).sort();
    return { min: ds[0], max: [ds[ds.length - 1], ms[ms.length - 1], S.metrics?.to].filter(Boolean).sort().pop() };
  }

  const cycleOf = (prod) => cycles(S.dropi.lines, todayISO()).find((x) => x.prod === prod);

  // Rehace el selector de productos y lleva las fechas al rango completo (o al ciclo del producto).
  function reset(keepProd) {
    const b = dateBounds();
    $('#f-from').value = b.min || ''; $('#f-to').value = b.max || '';
    if (!keepProd) S.prod = '__all';
    const sel = $('#f-prod');
    sel.textContent = '';
    sel.appendChild(new Option('Todos / Consolidado', '__all'));
    products(S.dropi.lines).forEach((p) => sel.appendChild(new Option(p, p)));
    sel.value = [...sel.options].some((o) => o.value === S.prod) ? S.prod : '__all';
    S.prod = sel.value;
    const c = S.prod !== '__all' && cycleOf(S.prod);
    if (c) { $('#f-from').value = c.from; $('#f-to').value = c.to; }
  }

  const parseInput = (id, commaDecimal) => { const v = $(id).value.trim(); return v === '' ? null : num(v, commaDecimal); };

  // Filtro para core.pnl.aggregate. Si las fechas vienen invertidas, se intercambian.
  function read() {
    let from = $('#f-from').value || null, to = $('#f-to').value || null;
    if (from && to && from > to) [from, to] = [to, from];
    return { prod: S.prod, from, to, adsOverride: parseInput('#f-ads', false), iva: S.iva, today: todayISO() };
  }

  // Datos de la fila del Registro: los campos manuales mandan sobre los automáticos.
  function extras(f, a) {
    const buysIn = parseInput('#f-buys', false), ctrIn = parseInput('#f-ctr', true);
    return {
      periodo: periodLabel(f.from, f.to),
      producto: f.prod === '__all' ? 'Consolidado' : f.prod,
      campana: $('#f-camp').value.trim() || a.campAuto || 'General',
      compras: buysIn != null ? Math.round(buysIn) : a.buys,
      ctr: ctrIn != null ? ctrIn / 100 : a.ctr != null ? a.ctr / 100 : null,
    };
  }

  // Los placeholders muestran el valor automático que se usa si el campo queda vacío.
  function showAutoValues(a) {
    $('#f-buys').placeholder = a.buys != null ? nf(a.buys) : '—';
    $('#f-ctr').placeholder = a.ctr != null ? nf(a.ctr, { maximumFractionDigits: 2 }) : '—';
    $('#f-ads').placeholder = 'Auto: ' + short(a.adsAuto);
    $('#f-camp').placeholder = a.campAuto || 'General';
  }

  // Al elegir un producto, las fechas se ajustan a su ciclo real en Dropi.
  function selectProduct(key, from, to) {
    S.prod = key;
    $('#f-prod').value = key;
    if (from === undefined) {
      if (key === '__all') { const b = dateBounds(); from = b.min; to = b.max; } else {
        const c = cycleOf(key);
        if (c) { from = c.from; to = c.to; }
      }
    }
    if (from) $('#f-from').value = from;
    if (to) $('#f-to').value = to;
    app.render();
  }

  // Periodos rápidos: ciclo completo de cada producto y, si tuvo obsequio, la etapa antes y después.
  function presetList() {
    const firstWord = (s) => { const w = s.replace(/\b(OBSEQUIO|REGALO|GRATIS|GIFT)\b/gi, '').trim().split(/\s+/)[0] || s; return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); };
    const lab = (d) => periodLabel(d, d).slice(0, 6);
    const out = [];
    cycles(S.dropi.lines, todayISO()).forEach((c) => {
      const name = firstWord(c.prod), end = c.toToday ? 'Hoy' : lab(c.to);
      if (c.giftFrom && c.giftFrom > c.from) {
        const e1 = addDays(c.giftFrom, -1);
        out.push({ label: `Ciclo completo ${name} (${lab(c.from)} - ${end})`, prod: c.prod, from: c.from, to: c.to });
        out.push({ label: `Etapa 1: ${name} sola (${lab(c.from)} - ${lab(e1)})`, prod: c.prod, from: c.from, to: e1 });
        out.push({ label: `Etapa 2: ${name} + ${firstWord(c.gift)} (${lab(c.giftFrom)} - ${end})`, prod: c.prod, from: c.giftFrom, to: c.to });
      } else out.push({ label: `${name} (${lab(c.from)} - ${end})`, prod: c.prod, from: c.from, to: c.to });
    });
    const b = dateBounds();
    out.push({ label: `Consolidado (${lab(b.min)} - ${lab(b.max)})`, prod: '__all', from: b.min, to: b.max });
    return out;
  }

  function init() {
    $('#f-iva').addEventListener('click', (e) => {
      const b = e.target.closest('[data-iva]');
      if (!b) return;
      S.iva = b.dataset.iva === '1';
      setPressed($('#f-iva'), '[data-iva]', b);
      app.render();
    });
    $('#f-prod').addEventListener('change', (e) => selectProduct(e.target.value));
    ['#f-from', '#f-to', '#f-ads', '#f-buys', '#f-ctr', '#f-camp'].forEach((id) => $(id).addEventListener('input', app.render));
    $('#f-reset').addEventListener('click', () => { reset(); $('#f-ads').value = ''; app.render(); });
  }

  app.filters = { init, reset, read, extras, showAutoValues, selectProduct, presetList };
})();
