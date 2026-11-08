// Escalado: estado (app.state.scaling), persistencia y conexión con la UI.
// Módulo informativo: no lee campañas reales. Guarda en pyl-escalado la sub-pestaña, el método elegido, el avance de
// cada método, el modo del simulacro, el mejor puntaje y los números de "Juega con los números".
// El paso a paso usa los componentes de Testeo y de la guía de Meta Ads (ui.testing.parts/soon/progress, ui.landing.stepList/stepDetail).
(() => {
  const PYL = globalThis.PYL;
  const { $ } = PYL.ui.dom;
  const C = PYL.core.scaling, L = PYL.core.landing, U = PYL.ui.scaling, UT = PYL.ui.testing, UL = PYL.ui.landing;
  const store = PYL.services.storage.scaling, toast = PYL.ui.feedback.toast;
  const MODES = ['practice', 'free'];

  const saved = store.load() || {};
  const num = (v, d) => (Number.isFinite(v) && v >= 0 ? v : d);

  // Avance de un método: paso abierto y pasos hechos (sus k). Un valor guardado raro vuelve al inicio.
  const planFrom = (m, p = {}) => {
    const keys = m.steps.map((s) => s.k);
    return {
      active: Number.isInteger(p.active) && p.active >= 0 && p.active < keys.length ? p.active : 0,
      done: Array.isArray(p.done) ? keys.filter((k) => p.done.includes(k)) : [],
    };
  };
  const freeFrom = (f = {}) => {
    const d = C.SCALE_FREE(), tope = num(f.tope, d.tope);
    return {
      level: Number.isInteger(f.level) && f.level >= 0 && f.level < C.SCALE_RULES.levels ? f.level : d.level,
      tope: tope > 0 ? tope : d.tope,
      days: d.days.map((x, i) => {
        const g = (Array.isArray(f.days) && f.days[i]) || {};
        return { spend: num(g.spend, x.spend), sales: num(g.sales, x.sales), pi: num(g.pi, x.pi) };
      }),
    };
  };

  const S = (PYL.app.state.scaling = {
    part: C.scalingPart(saved.part).k,       // sub-pestaña abierta (la única abierta: 'scale')
    method: C.scaleMethod(saved.method).k,   // método elegido ('surf' | 'horiz' | 'refresh')
    plans: Object.fromEntries(C.SCALE_METHODS.filter((m) => m.steps).map((m) => [m.k, planFrom(m, (saved.plans || {})[m.k])])),
    mode: MODES.includes(saved.mode) ? saved.mode : 'practice', // modo del simulacro
    best: num(saved.best, null),             // mejor % de aciertos de una ronda (0–100)
    free: freeFrom(saved.free),              // "Juega con los números"
    run: C.scalePracticeNew(),               // ronda de práctica en curso (no se guarda)
  });

  const persist = () => {
    if (!store.save({ part: S.part, method: S.method, plans: S.plans, mode: S.mode, best: S.best, free: S.free })) toast('No pude guardar en el navegador.', 'error');
  };

  // L.progress y stepDetail leen casillas { 'paso.ok': true }; cada paso tiene una sola.
  const doneMap = (plan) => Object.fromEntries(plan.done.map((k) => [k + '.ok', true]));

  // Práctica: cada acción cambia la ronda y repinta solo el panel (y el mapa), sin rehacer el paso.
  // Cada caso se muestra al entrar (no hay un "Avanzar": los números del caso ya son el momento de decidir).
  const paintPractice = () => {
    if (!S.run.shown && S.run.i < S.run.order.length) S.run = C.scalePracticeShow(S.run);
    const v = { ...C.scalePracticeView(S.run), best: S.best };
    U.practice($('#es-mode'), v, PRACTICE);
    U.light($('#es-step'), v.last ? v.verdict.branch : null);
  };
  const PRACTICE = {
    decide: (k) => { S.run = C.scalePracticeDecide(S.run, k); paintPractice(); },
    next: () => {
      S.run = C.scalePracticeNext(S.run);
      if (S.run.i >= S.run.order.length) { const b = C.scalePracticeBest(S.best, S.run); if (b !== S.best) { S.best = b; persist(); } }
      paintPractice();
    },
    again: () => { S.run = C.scalePracticeNew(); paintPractice(); },
  };

  // Repinta lo derivado de "Juega con los números" sin rehacer los campos (no pierden el foco) e ilumina el mapa.
  function sync() {
    if (!$('#es-mode')) return;
    if (S.mode === 'practice') { paintPractice(); return; }
    if (!$('#es-free-out')) return;
    const v = C.scaleFree(S.free);
    U.freeOut($('#es-mode'), v);
    U.light($('#es-step'), v.verdict ? v.verdict.branch : null);
  }

  // Un campo de "Juega con los números": level (lista), tope y d<i>-spend|sales|pi (solo dígitos).
  function setFree(id, raw) {
    const n = Number(String(raw).replace(/\D/g, '')) || 0;
    if (id === 'level') S.free.level = Number.isInteger(Number(raw)) ? Number(raw) : 0;
    else if (id === 'tope') S.free.tope = n;
    else { const [d, k] = id.split('-'); S.free.days[Number(d.slice(1))][k] = n; }
  }

  function renderPlan(m) {
    const plan = S.plans[m.k], steps = m.steps, i = plan.active, s = steps[i], map = doneMap(plan), prog = L.progress(map, steps);
    const open = (j) => { plan.active = j; persist(); render(); };
    $('#es-h').textContent = C.SURF_HEAD.h;
    $('#es-sub').textContent = C.SURF_HEAD.sub;
    UT.progress($('#es-prog'), prog, reset);
    UL.stepList($('#es-steps'), steps, prog, i, open);
    UL.stepDetail($('#es-step'), s, i, steps.length, {
      done: map, key: L.key, fill: (x) => x, st: { step: s, mode: S.mode, free: S.free }, v: null,
      tools: U.TOOLS, last: null, // el último paso no lleva botón a otra pestaña
    }, {
      toggle: (k) => { const p = k.split('.')[0]; plan.done = steps.map((x) => x.k).filter((x) => (x === p ? !plan.done.includes(x) : plan.done.includes(x))); persist(); render(); },
      clearStep: () => { plan.done = plan.done.filter((x) => x !== s.k); persist(); render(); },
      copy: () => {},
      prev: () => open(i - 1),
      next: () => open(i + 1),
      go: () => {},
      mode: (k) => { S.mode = k; persist(); render(); },
      free: (id, raw) => { setFree(id, raw); persist(); sync(); },
    });
    sync();
  }

  async function reset() {
    const m = C.scaleMethod(S.method);
    const r = await PYL.ui.feedback.ask('Empezar de nuevo', 'Desmarco todos los pasos de ' + m.t + '.', [{ r: 'ok', label: 'Empezar de cero' }]);
    if (r !== 'ok') return;
    S.plans[m.k] = { active: 0, done: [] };
    persist(); render();
  }

  function pick(k) { S.method = k; persist(); render(); }

  function render() {
    const p = C.scalingPart(S.part);
    UT.parts($('#es-parts'), C.SCALING_PARTS, p.k, (k) => { S.part = k; persist(); render(); });
    $('#es-scale').hidden = !!p.soon;
    $('#es-real-soon').hidden = !p.soon;
    if (p.soon) { UT.soon($('#es-real-soon'), p.soon); return; }
    const m = C.scaleMethod(S.method);
    PYL.ui.search.strategyTabs($('#es-methods'), C.SCALE_METHODS.map((x) => (x.steps ? x : { ...x, t: x.t + ' · pronto' })), m.k, pick);
    // Un método sin pasos ("pronto") se ve apagado y no se abre, como las sub-pestañas apagadas.
    [...$('#es-methods').children].forEach((b, i) => { if (!C.SCALE_METHODS[i].steps) { b.disabled = true; b.title = 'Pronto'; } });
    $('#es-surf').hidden = !m.steps;
    $('#es-soon').hidden = !!m.steps;
    if (!m.steps) { UT.soon($('#es-soon'), m.soon); return; }
    renderPlan(m);
  }

  render();
})();
