// Testeo: estado (app.state.testing), persistencia y conexión con la UI.
// Módulo informativo: no lee campañas reales. Guarda en pyl-testing la sub-pestaña, el avance del paso a paso,
// el mejor puntaje (con la versión v: se reinicia solo si lo guardado es anterior a TEST_BEST_SINCE), los números de "Números a mano"
// y las entradas del Simulador (sim). La corrida del Simulador, su semilla y el punto actual no se guardan.
// El paso a paso usa los mismos componentes de la guía de Meta Ads (ui.landing.stepList/stepDetail).
(() => {
  const PYL = globalThis.PYL;
  const { $ } = PYL.ui.dom;
  const C = PYL.core.testing, L = PYL.core.landing, U = PYL.ui.testing, UL = PYL.ui.landing, SC = PYL.core.simulator, US = PYL.ui.simulator;
  const store = PYL.services.storage.testing, toast = PYL.ui.feedback.toast;
  const STEPS = C.TEST_STEPS, KEYS = STEPS.map((s) => s.k);
  const FREE0 = { daily: C.TEST_PRACTICE.daily, spend: 0, pi: 0, sales: 0, tope: C.TEST_PRACTICE.tope };

  const newSeed = () => Math.floor(Math.random() * 2147483647);
  const saved = store.load() || {};
  const t0 = saved.test || {}, f0 = saved.free || {};
  const num = (v, d) => (Number.isFinite(v) && v >= 0 ? v : d);
  const S = (PYL.app.state.testing = {
    part: C.testingPart(saved.part).k, // sub-pestaña abierta ('test' | 'surf')
    test: {
      active: Number.isInteger(t0.active) && t0.active >= 0 && t0.active < STEPS.length ? t0.active : 0, // paso abierto
      done: Array.isArray(t0.done) ? KEYS.filter((k) => t0.done.includes(k)) : [],                       // pasos hechos (sus k)
    },
    best: saved.v >= C.TEST_BEST_SINCE ? num(saved.best, null) : null, // mejor % de aciertos (0–100); sin v o con v < 2 se calculó con la regla vieja y se reinicia
    free: Object.fromEntries(Object.keys(FREE0).map((k) => [k, num(f0[k], FREE0[k])])), // "Juega con los números"
    run: C.practiceNew(),                                         // ronda de práctica en curso (no se guarda)
    sim: SC.simLoad(saved.sim),                                     // Simulador: modo ('chain' | 'manual') y entradas de la cadena
    simRun: { seed: newSeed(), run: null, spend: 0, playing: false }, // corrida del modo Cadena (no se guarda)
  });

  const persist = () => {
    if (!store.save({ v: C.TEST_VERSION, part: S.part, test: S.test, best: S.best, free: S.free, sim: S.sim })) toast('No pude guardar en el navegador.', 'error');
  };

  if (Object.keys(saved).length && saved.v !== C.TEST_VERSION) persist(); // migración única: lo guardado con otra versión se reescribe con la actual (el mejor puntaje solo se reinicia si es anterior a v: 2)

  // L.progress y stepDetail leen casillas { 'paso.ok': true }; cada paso tiene una sola.
  const doneMap = () => Object.fromEntries(S.test.done.map((k) => [k + '.ok', true]));

  // Práctica: cada acción cambia la ronda y repinta solo el panel (y el mapa), sin rehacer el paso.
  const paintPractice = (anim) => {
    const v = { ...C.practiceView(S.run), best: S.best };
    U.practice($('#ts-mode'), v, PRACTICE, anim);
    U.light($('#ts-step'), v.last ? v.verdict.branch : null);
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

  // "Números a mano" (Simulador): edita un número y repinta lo derivado.
  const onFree = (k, raw) => { S.free[k] = Number(String(raw).replace(/\D/g, '')) || 0; persist(); syncSim(); };

  // Repinta la práctica del paso 6 (si está en pantalla).
  function sync() {
    if ($('#ts-mode')) paintPractice(false);
  }

  function renderTest() {
    const T = S.test, total = STEPS.length, i = T.active, s = STEPS[i], map = doneMap(), prog = L.progress(map, STEPS);
    $('#ts-h').textContent = C.TEST_HEAD.h;
    $('#ts-sub').textContent = C.TEST_HEAD.sub;
    const select = open;
    U.progress($('#ts-prog'), prog, reset);
    UL.stepList($('#ts-steps'), STEPS, prog, i, select);
    UL.stepDetail($('#ts-step'), s, i, total, {
      done: map, key: L.key, fill: (x) => x, st: { step: s }, v: null,
      tools: U.TOOLS, last: null, // el último paso no lleva botón a otra pestaña
    }, {
      toggle: (k) => { const p = k.split('.')[0]; T.done = KEYS.filter((x) => (x === p ? !T.done.includes(x) : T.done.includes(x))); persist(); render(); },
      clearStep: () => { T.done = T.done.filter((x) => x !== s.k); persist(); render(); },
      copy: () => {},
      prev: () => select(i - 1),
      next: () => select(i + 1),
      go: () => {},
      toSim: () => { S.part = 'sim'; persist(); render(); },
    });
    sync();
  }

  // Simulador: armazón (modos + mapa) y el panel del modo abierto.
  function renderSim() {
    stopPlay();
    US.shell($('#ts-simu'), { mode: S.sim.mode }, { mode: (k) => { S.sim.mode = k; persist(); renderSim(); } });
    const panel = $('#ts-sx-panel');
    if (S.sim.mode === 'manual') US.free(panel, S.free, { free: onFree });
    else {
      US.chain(panel, S.sim, CHAIN);
      if (!S.simRun.run && !SC.simCheck(S.sim)) S.simRun.run = SC.simRun(S.sim, S.simRun.seed);
    }
    syncSim();
  }

  // Modo Cadena: cada entrada rehace la corrida (misma semilla) y repinta lo derivado sin rehacer los campos.
  const CHAIN = {
    plat: (k) => {
      stopPlay();
      S.sim.plat = k;
      persist();
      document.querySelectorAll('#ts-sx-f-plat [data-plat]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.plat === k)));
      syncSim();
    },
    field: (k, text) => {
      stopPlay();
      S.sim[k] = SC.simNum(text);
      persist();
      const R = S.simRun;
      R.run = SC.simCheck(S.sim) ? null : SC.simRun(S.sim, R.seed);
      syncSim();
    },
    spend: (n) => { stopPlay(); S.simRun.spend = n; syncSim(); },
    play: togglePlay,
    reset: () => { stopPlay(); S.simRun.spend = 0; syncSim(); },
    again: () => { stopPlay(); S.simRun = { seed: newSeed(), run: null, spend: 0, playing: false }; renderSim(); },
    // Escenario: carga la cadena (no toca presupuesto ni tope) y arma una corrida nueva desde 0.
    scen: (k) => {
      stopPlay();
      Object.assign(S.sim, SC.SIM_SCENARIOS.find((x) => x.k === k).v);
      persist();
      S.simRun = { seed: newSeed(), run: null, spend: 0, playing: false };
      renderSim();
    },
  };

  // ▶ Correr: suma SIM_STEP de gasto cada 120 ms y se pausa en cada corte y al fin del día (o al apagar).
  // Con prefers-reduced-motion salta de pausa en pausa sin tics. Se detiene al cambiar de parte, de modo, de entrada o de pestaña.
  const TICK_MS = 120;
  let timer = null;
  const reduced = () => !!(globalThis.matchMedia && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function stopPlay() {
    if (timer) { clearInterval(timer); timer = null; }
    S.simRun.playing = false;
  }
  const lastSpend = () => S.simRun.run.points[S.simRun.run.points.length - 1].spend;
  const isStop = (spend) => spend >= lastSpend() || S.simRun.run.cuts.some((c) => c.at === spend);
  function tick() {
    const R = S.simRun;
    R.spend = Math.min(R.spend + SC.SIM_STEP, lastSpend());
    if (isStop(R.spend)) stopPlay();
    syncSim();
  }
  function togglePlay() {
    const R = S.simRun;
    if (!R.run || SC.simCheck(S.sim)) return;
    if (R.playing) { stopPlay(); syncSim(); return; }
    if (R.spend >= lastSpend()) return;
    if (reduced()) { // salta al siguiente corte (o al fin) sin animar
      const next = R.run.cuts.map((c) => c.at).filter((at) => at > R.spend).concat(lastSpend()).sort((a, b) => a - b)[0];
      R.spend = Math.min(next, lastSpend());
      syncSim();
      return;
    }
    R.playing = true;
    timer = setInterval(tick, TICK_MS);
    syncSim();
  }
  document.addEventListener('nav:vista', stopPlay);

  // Lo que pinta el modo Cadena en el punto actual (el gasto se queda dentro de la corrida y no pasa del apagado).
  function chainView() {
    const R = S.simRun, err = SC.simCheck(S.sim);
    if (err || !R.run) return { err: err || {} };
    const last = R.run.points[R.run.points.length - 1].spend;
    R.spend = Math.min(R.spend, last);
    const a = SC.simAt(R.run, R.spend, S.sim), off = R.run.cuts.find((c) => c.at === R.run.offAt);
    return { err: null, a, spend: R.spend, max: last, playing: R.playing, zones: C.cpaZones(S.sim.tope), stop: off && R.spend >= R.run.offAt ? off.verdict.cut : null };
  }

  // Repinta lo derivado del Simulador (la tarjeta del veredicto lleva su rama en data-branch).
  function syncSim() {
    if (S.sim.mode === 'chain' && $('#ts-sx-spend')) {
      const v = chainView();
      if (v.err) v.zones = S.sim.tope > 0 ? C.cpaZones(S.sim.tope) : null;
      US.chainOut($('#ts-sx-panel'), v);
      return;
    }
    if (S.sim.mode !== 'manual' || !$('#ts-free-out')) return;
    const v = C.testFree(S.free);
    US.freeOut($('#ts-sx-panel'), v, S.free.spend);
  }

  async function reset() {
    const r = await PYL.ui.feedback.ask('Empezar de nuevo', 'Desmarco todos los pasos de la Fase de testeo.', [{ r: 'ok', label: 'Empezar de cero' }]);
    if (r !== 'ok') return;
    S.test = { active: 0, done: [] };
    persist(); render();
  }

  function render() {
    stopPlay();
    const p = C.testingPart(S.part);
    U.parts($('#ts-parts'), C.TESTING_PARTS, p.k, (k) => { S.part = k; persist(); render(); });
    const sim = p.k === 'sim';
    $('#ts-test').hidden = !!p.soon || sim;
    $('#ts-simu').hidden = !sim;
    $('#ts-soon').hidden = !p.soon;
    // Un solo lugar a la vez en el DOM: los ids de "Números a mano" también los usa el modo libre del paso 6.
    if (sim) $('#ts-step').textContent = ''; else $('#ts-simu').textContent = '';
    if (p.soon) U.soon($('#ts-soon'), p.soon);
    else if (sim) renderSim();
    else renderTest();
  }

  render();
})();
