// Desarrollo → Meta Ads: estado (app.state.ads), persistencia y conexión con la UI.
// También maneja las sub-pestañas de Desarrollo (Landing en Shopify / Meta Ads) y el selector de estrategia
// (ABO / CBO): cada estrategia guarda su propio paso abierto y sus casillas en S.plans[k].
// El producto (nombre y precio) es el de "Producto que estoy montando" (app.state.landing.prod).
(() => {
  const PYL = globalThis.PYL;
  const { $ } = PYL.ui.dom;
  const C = PYL.core.ads, L = PYL.core.landing, UL = PYL.ui.landing, U = PYL.ui.ads;
  const store = PYL.services.storage.ads, toast = PYL.ui.feedback.toast;
  const PARTS = ['shop', 'meta'];

  const saved = store.load() || {};
  // Antes solo había ABO: su avance estaba en saved.active / saved.done.
  const plans = saved.plans || (saved.done ? { abo: { active: saved.active || 0, done: saved.done } } : {});
  const S = (PYL.app.state.ads = {
    part: PARTS.includes(saved.part) ? saved.part : 'shop', // sub-pestaña abierta
    strat: C.strategy(saved.strat).k,                       // estrategia abierta ('abo' | 'cbo')
    plans,                                                  // { abo: { active, done: { 'paso.casilla': true } } }
    slug: saved.slug || '',                                 // identificador de URL escrito a mano; vacío = primer nombre del producto
    slugFor: saved.slugFor || '',                           // producto para el que se escribió (otro producto → vuelve al automático)
  });
  const plan = () => (S.plans[S.strat] ??= { active: 0, done: {} });

  const persist = () => { if (!store.save(S)) toast('No pude guardar en el navegador.', 'error'); };
  const root = $('#ma-card');
  const prod = () => (PYL.app.state.landing && PYL.app.state.landing.prod) || {};
  const view = () => C.adsView(S, prod().name);
  const refresh = () => U.outputs(root, view());
  // El botón muestra ✓ al copiar; solo el error va como mensaje.
  const copy = async (text) => { const ok = await PYL.ui.dom.copy(text); if (!ok) toast('No pude copiar: lo selecciono y copio a mano.', 'error'); return ok; };

  function pick(k) { S.strat = k; persist(); render(); }

  function render() {
    const st = C.strategy(S.strat);
    PYL.ui.search.strategyTabs($('#ma-strats'), C.AD_STRATEGIES.map((x) => (x.steps ? x : { ...x, t: x.t + ' · pronto' })), st.k, pick);
    $('#ma-plan').hidden = !st.steps;
    $('#ma-soon').hidden = !!st.steps;
    if (!st.steps) { U.soon($('#ma-soon'), st, C.AD_STRATEGIES.find((x) => x.steps), pick); return; }

    $('#ma-h').textContent = st.h;
    $('#ma-sub').textContent = st.sub;
    const P = plan(), steps = st.steps, total = steps.length, i = Math.min(P.active, total - 1), s = steps[i], prog = L.progress(P.done, steps);
    const select = (j) => { P.active = j; persist(); render(); };
    $('#ma-map').hidden = !st.map;
    if (st.map) {
      const copies = {}; for (let n = 2; n <= C.ADS.sets; n++) copies[n] = !!P.done['dup.s' + n];
      U.map($('#ma-map'), C.ADS, copies, copy);
    }
    UL.progress($('#ma-prog'), prog, reset);
    UL.stepList($('#ma-steps'), steps, prog, i, select);
    UL.stepDetail($('#ma-step'), s, i, total, {
      done: P.done, key: L.key, fill: (t) => L.fill(t, { producto: prod().name, precio: prod().price }), st: { done: P.done }, v: view(),
      tools: U.TOOLS, levels: C.LEVELS, last: { label: 'Leer el testeo en el Simulador →', view: 'sim' },
    }, {
      toggle: (k) => { P.done[k] = !P.done[k]; persist(); render(); },
      clearStep: () => { s.items.forEach((it) => { delete P.done[L.key(s, it)]; }); persist(); render(); },
      field: (k, val) => { S[k] = val; S.slugFor = prod().name || ''; persist(); refresh(); },
      copy,
      prev: () => select(i - 1),
      next: () => select(i + 1),
      go: (v) => $(`#tabs [data-v="${v}"]`).click(),
    });
    refresh();
  }

  async function reset() {
    const name = C.strategy(S.strat).k.toUpperCase();
    const r = await PYL.ui.feedback.ask('Nueva campaña', `Desmarco todas las casillas del paso a paso ${name}.`, [{ r: 'ok', label: 'Empezar de cero' }]);
    if (r !== 'ok') return;
    S.plans[S.strat] = { active: 0, done: {} };
    persist(); render();
  }

  // ---------- Sub-pestañas ----------
  function showPart(p) {
    S.part = p;
    document.querySelectorAll('#d-parts [data-part]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.part === p)));
    $('#d-shop').hidden = p !== 'shop';
    root.hidden = p !== 'meta';
  }
  document.querySelectorAll('#d-parts [data-part]').forEach((b) => b.addEventListener('click', () => { showPart(b.dataset.part); persist(); }));

  // El nombre o el precio cambiaron en "Producto que estoy montando": cambian el nombre de la campaña, la URL y el prompt.
  // Con otro producto, el identificador escrito a mano ya no aplica.
  document.addEventListener('landing:prod', () => {
    if (S.slug && S.slugFor !== (prod().name || '')) { S.slug = ''; persist(); }
    render();
  });

  showPart(S.part);
  render();
})();
