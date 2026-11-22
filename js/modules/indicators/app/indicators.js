// Franja de indicadores de Inicio (SPEC 22): lee los datos de cada módulo, llama al núcleo y repinta.
// No calcula negocio: solo junta. Los datos cambian en otras pestañas, así que se relee al volver a Inicio.
(() => {
  const PYL = globalThis.PYL;
  const root = document.getElementById('ix-root');
  if (!root) return;
  const { core, services, ui } = PYL;
  const C = core.indicators;
  const A = PYL.app.state;

  // data = lo último que devolvió el núcleo por tarjeta; played = si ya corrió la animación de entrada en esta visita.
  const S = (A.indicators = { data: {}, played: false });

  const cutText = (t) => (t.cut >= 0 ? `Corte ${core.metawatch.mwK(core.metrics.NS_TEST.cuts[t.cut])} · ${t.set}` : null);

  // Lee el estado actual de cada módulo y lo convierte en datos de las tarjetas.
  const read = () => {
    const meta = A.metawatch;
    const testing = C.ixTesting(A.testing ? A.testing.best : null, meta ? meta.rows : []);
    return {
      pnl: C.ixPnl(C.ixLoad(services.storage.pnlSnap.load())),
      funnel: C.ixFunnel(A.search ? A.search.log : [], core.search.STATUS),
      testing,
      cutText: cutText(testing),
      cutLabels: core.metrics.NS_TEST.cuts.map(core.metawatch.mwK),
      tasks: A.tasks ? C.ixTasks(A.tasks.note, core.tasks.tkDayKey(new Date())) : null,
    };
  };

  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const COUNT_MS = 600;
  let raf = 0;

  // Conteo de 0 a su valor (600 ms, empieza con la tarjeta + 150 ms), formateado igual que el valor final.
  const countUp = () => {
    cancelAnimationFrame(raf);
    const items = [...root.querySelectorAll('[data-to]')].map((n) => ({ n, to: Number(n.dataset.to), kind: n.dataset.kind, delay: 150 + 60 * [...root.children].indexOf(n.closest('.ix-card')) }))
      .filter((i) => Number.isFinite(i.to));
    if (!items.length) return;
    const show = (i, f) => { i.n.textContent = i.kind === 'int' ? String(Math.round(i.to * f)) : core.format.fmt(i.to * f, i.kind); };
    items.forEach((i) => show(i, 0));
    const t0 = performance.now();
    const step = (now) => {
      let live = false;
      for (const i of items) {
        const p = Math.max(0, Math.min(1, (now - t0 - i.delay) / COUNT_MS));
        show(i, 1 - (1 - p) * (1 - p)); // ease-out
        if (p < 1) live = true;
      }
      if (live) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };

  // play = true en la primera pintada y al volver a Inicio; false en los repintados por cambio de dato (sin volver a 0).
  const paint = (play = false) => {
    cancelAnimationFrame(raf);
    root.classList.remove('ix-play');
    S.data = read();
    ui.indicators.strip(root, S.data);
    if (!play) return;
    S.played = true;
    if (reduced()) return; // sin animación: todo aparece ya en su valor final
    root.classList.add('ix-play');
    countUp();
  };

  // Clic o teclado: Mini P&L, Embudo y Testeo abren su pestaña; Pulso de tareas baja a Mis tareas y enfoca «+».
  const open = (k) => {
    if (k === 'tasks') {
      const card = document.getElementById('tk-root');
      if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const add = document.getElementById('tk-new');
      if (add) add.focus({ preventScroll: true });
      return;
    }
    const tab = document.querySelector(`#tabs [data-v="${{ pnl: 'pyl', funnel: 'buscar', testing: 'testeo' }[k]}"]`);
    if (tab) tab.click();
  };

  root.addEventListener('click', (e) => {
    const card = e.target.closest('.ix-card');
    if (card && root.contains(card)) open(card.dataset.k);
  });

  // Al salir de Inicio se rearma la animación; al volver, relee los datos y la repite. En el arranque ya corrió: no se duplica.
  document.addEventListener('nav:vista', (e) => {
    if (!e.detail) return;
    if (e.detail.v === 'dash') paint(!S.played);
    else S.played = false;
  });
  // Cambios que ocurren con Inicio abierto: marcar una tarea (tareas:cambio) o terminar una consulta a Meta (meta:dato).
  document.addEventListener('tareas:cambio', () => paint());
  document.addEventListener('meta:dato', () => paint());

  paint(true);
  PYL.app.indicators = { paint };
})();
