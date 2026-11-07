// Simulador "¿qué pasa si?": palancas sobre los pedidos cerrados del filtro y utilidad recalculada al instante.
(() => {
  const PYL = globalThis.PYL;
  const { $, el } = PYL.ui.dom;
  const { fmt, short } = PYL.core.format;
  const { unitBase, simulate } = PYL.core.insights;

  // [clave, etiqueta, formato, paso, rango (min, max) a partir del valor real]
  const LEVERS = [
    ['efect', 'Efectividad de entrega', 'pct', 0.01, (v) => [Math.min(0.3, v), Math.max(0.95, v)]],
    ['ads', 'Inversión en Meta Ads', 'cop', 10000, (v) => [0, Math.max(v * 2, 100000)]],
    ['ticket', 'Ticket promedio cobrado', 'cop', 1000, (v) => [v * 0.6, v * 1.6]],
    ['merc', 'Mercancía por entrega', 'cop', 500, (v) => [v * 0.5, v * 1.5]],
  ];

  let base = null, real = null;
  const inputs = {};

  // El mínimo se alinea al paso para que el valor real caiga exacto en el control.
  function setRange(inp, v, [lo, hi], step) {
    inp.step = step;
    inp.min = v - step * Math.floor((v - lo) / step);
    inp.max = hi;
    inp.value = v;
  }

  function build() {
    const box = $('#sim-levers');
    LEVERS.forEach(([k, label, kind]) => {
      const row = el('label', 'lever');
      const head = el('div', 'lever-h');
      const val = el('b'); const ref = el('small', 'muted');
      head.append(el('span', null, label), val);
      const inp = el('input'); inp.type = 'range';
      inp.addEventListener('input', update);
      row.append(head, inp, ref);
      box.appendChild(row);
      inputs[k] = { inp, val, ref, kind };
    });
    $('#sim-reset').addEventListener('click', () => draw(real));
  }

  // a: agregado del filtro actual. Reinicia las palancas a los valores reales.
  function draw(a) {
    if (!inputs.efect) build();
    real = a; base = unitBase(a);
    $('#sim-card').classList.toggle('empty', !base || !a.ads);
    if (!base || !a.ads) { $('#sim-out').textContent = 'Necesitas pedidos entregados y gasto en Meta Ads en este filtro para simular.'; return; }
    LEVERS.forEach(([k, , kind, step, range]) => {
      const { inp, ref } = inputs[k];
      setRange(inp, base[k], range(base[k]), step);
      inputs[k].start = +inp.value;
      ref.textContent = 'Real: ' + fmt(base[k], kind);
    });
    update();
  }

  function update() {
    if (!base) return;
    const p = {};
    LEVERS.forEach(([k]) => { const { inp, val, kind } = inputs[k]; p[k] = +inp.value; val.textContent = fmt(p[k], kind); });
    const r = simulate(base, p);
    const d = r.util - real.util;
    $('#sim-reset').classList.toggle('dirty', LEVERS.some(([k]) => p[k] !== inputs[k].start));
    const out = $('#sim-out'); out.textContent = '';
    const big = el('div', 'sim-big');
    big.append(el('span', 'k-label', 'Utilidad simulada'), el('span', 'k-val ' + (r.util >= 0 ? 'ok' : 'bad'), fmt(r.util, 'cop')));
    const delta = el('div', 'delta ' + (Math.abs(d) < 1 ? '' : d > 0 ? 'ok' : 'bad'),
      Math.abs(d) < 1 ? 'Igual a lo real' : `${d > 0 ? '▲ +' : '▼ '}${short(d)} vs. lo real`);
    big.appendChild(delta);
    const stats = el('div', 'sim-stats');
    [
      ['Margen', fmt(r.margen, 'pct')],
      ['ROAS / equilibrio', `${fmt(r.roas, 'x')} / ${r.roasEq > 0 ? fmt(r.roasEq, 'x') : '—'}`],
      ['CPA real / máximo', `${fmt(r.cpa, 'cop')} / ${fmt(r.cpaMax, 'cop')}`],
      ['CPA para margen 15%', r.cpaMeta > 0 ? fmt(r.cpaMeta, 'cop') : 'No alcanza'],
    ].forEach(([k, v]) => { const s = el('div'); s.append(el('small', null, k), el('b', null, v)); stats.appendChild(s); });
    out.append(big, stats);
  }

  PYL.ui.simulator = { draw };
})();
