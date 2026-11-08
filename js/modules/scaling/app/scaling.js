// Escalado: estado (app.state.scaling), persistencia y conexión con la UI.
// Módulo informativo: no lee campañas reales. Guarda en pyl-scaling la sub-pestaña, el avance del paso a paso,
// el modo del simulacro, el mejor puntaje y los números de "Juega con los números".
// El paso a paso usa los mismos componentes de la guía de Meta Ads (ui.landing.stepList/stepDetail).
(() => {
  const PYL = globalThis.PYL;
  const { $ } = PYL.ui.dom;
  const C = PYL.core.scaling, L = PYL.core.landing, U = PYL.ui.scaling, UL = PYL.ui.landing;
  const store = PYL.services.storage.scaling, toast = PYL.ui.feedback.toast;
  const STEPS = C.TEST_STEPS, KEYS = STEPS.map((s) => s.k);
  const MODES = ['practice', 'free'];
  const FREE0 = { daily: C.TEST_PRACTICE.daily, spend: 0, pi: 0, sales: 0, tope: C.TEST_PRACTICE.tope };

  const saved = store.load() || {};
  const t0 = saved.test || {}, f0 = saved.free || {};
  const num = (v, d) => (Number.isFinite(v) && v >= 0 ? v : d);
  const S = (PYL.app.state.scaling = {
    part: C.scalingPart(saved.part).k, // sub-pestaña abierta ('test' | 'surf')
    test: {
      active: Number.isInteger(t0.active) && t0.active >= 0 && t0.active < STEPS.length ? t0.active : 0, // paso abierto
      done: Array.isArray(t0.done) ? KEYS.filter((k) => t0.done.includes(k)) : [],                       // pasos hechos (sus k)
    },
    mode: MODES.includes(saved.mode) ? saved.mode : 'practice',  // modo del simulacro
    best: num(saved.best, null),                                  // mejor % de aciertos de una ronda (0–100)
    free: Object.fromEntries(Object.keys(FREE0).map((k) => [k, num(f0[k], FREE0[k])])), // "Juega con los números"
    run: C.practiceNew(),                                         // ronda de práctica en curso (no se guarda)
  });

  const persist = () => {
    if (!store.save({ part: S.part, test: S.test, mode: S.mode, best: S.best, free: S.free })) toast('No pude guardar en el navegador.', 'error');
  };

  // L.progress y stepDetail leen casillas { 'paso.ok': true }; cada paso tiene una sola.
  const doneMap = () => Object.fromEntries(S.test.done.map((k) => [k + '.ok', true]));

  // Práctica: cada acción cambia la ronda y repinta solo el panel (y el mapa), sin rehacer el paso.
  const paintPractice = (anim) => {
    const v = { ...C.practiceView(S.run), best: S.best };
    U.practice($('#es-mode'), v, PRACTICE, anim);
    U.light($('#es-step'), v.last ? v.verdict.branch : null);
  };
  const PRACTICE = {
    advance: () => { S.run = C.practiceShow(S.run); paintPractice(true); },
    decide: (k) => { S.run = C.practiceDecide(S.run, k); paintPractice(false); },
    next: () => {
      S.run = C.practiceNext(S.run);
      if (S.run.i >= S.run.order.length) { const b = C.practiceBest(S.best, S.run); if (b !== S.best) { S.best = b; persist(); } }
      paintPractice(false);
    },
    again: () => { S.run = C.practiceNew(); paintPractice(false); },
    seeStep: (n) => open(n - 1), // "Ver el paso": el paso de TEST_STEPS que explica el corte (2–4 → índice 1–3)
  };
  const open = (j) => { S.test.active = j; persist(); render(); };

  // Repinta lo derivado de "Juega con los números" sin rehacer los campos (no pierden el foco) e ilumina barra y mapa.
  function sync() {
    if (!$('#es-mode')) return;
    if (S.mode === 'practice') { paintPractice(false); return; }
    if (!$('#es-free-out')) return;
    const v = C.testFree(S.free);
    U.freeOut($('#es-mode'), v, S.free.spend);
    U.light($('#es-step'), v.verdict ? v.verdict.branch : null);
  }

  function renderTest() {
    const T = S.test, total = STEPS.length, i = T.active, s = STEPS[i], map = doneMap(), prog = L.progress(map, STEPS);
    $('#es-h').textContent = C.TEST_HEAD.h;
    $('#es-sub').textContent = C.TEST_HEAD.sub;
    const select = open;
    U.progress($('#es-prog'), prog, reset);
    UL.stepList($('#es-steps'), STEPS, prog, i, select);
    UL.stepDetail($('#es-step'), s, i, total, {
      done: map, key: L.key, fill: (x) => x, st: { step: s, mode: S.mode, free: S.free }, v: null,
      tools: U.TOOLS, last: null, // el último paso no lleva botón a otra pestaña
    }, {
      toggle: (k) => { const p = k.split('.')[0]; T.done = KEYS.filter((x) => (x === p ? !T.done.includes(x) : T.done.includes(x))); persist(); render(); },
      clearStep: () => { T.done = T.done.filter((x) => x !== s.k); persist(); render(); },
      copy: () => {},
      prev: () => select(i - 1),
      next: () => select(i + 1),
      go: () => {},
      mode: (k) => { S.mode = k; persist(); render(); },
      free: (k, raw) => { S.free[k] = Number(String(raw).replace(/\D/g, '')) || 0; persist(); sync(); },
    });
    sync();
  }

  async function reset() {
    const r = await PYL.ui.feedback.ask('Empezar de nuevo', 'Desmarco todos los pasos de la Fase de testeo.', [{ r: 'ok', label: 'Empezar de cero' }]);
    if (r !== 'ok') return;
    S.test = { active: 0, done: [] };
    persist(); render();
  }

  function render() {
    const p = C.scalingPart(S.part);
    U.parts($('#es-parts'), C.SCALING_PARTS, p.k, (k) => { S.part = k; persist(); render(); });
    $('#es-test').hidden = !!p.soon;
    $('#es-soon').hidden = !p.soon;
    if (p.soon) U.soon($('#es-soon'), p.soon);
    else renderTest();
  }

  render();
})();
