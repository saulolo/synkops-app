// Atajos flotantes de Testeo (SPEC 12): estado (app.state.cheat) y conexión con la UI.
// No guarda nada entre sesiones: al recargar los paneles quedan cerrados.
(() => {
  const PYL = globalThis.PYL;
  const { $ } = PYL.ui.dom;
  const U = PYL.ui.cheat;

  const root = $('#ch-root');

  // Id con el que cada panel avisa en 'flotante:abierto' (los demás flotantes usan 'dk', 'qk' y 'ap').
  const EVENT_ID = { chain: 'chc', hard: 'chd' };

  const S = (PYL.app.state.cheat = {
    open: null,       // null | 'chain' | 'hard'
    chainSel: 'cpm',  // eslabón marcado en Cadena
    hardSel: 'ctr',   // fila marcada en Métricas duras
    plat: 'meta',     // plataforma del panel de Métricas duras
  });

  const C = PYL.core.cheat;
  const chain = C.chChain();

  const render = () => U.render(root, { open: S.open });

  // Marca un eslabón de la cadena y pinta su resumen. No repinta si ya es el marcado.
  function selectLink(k) {
    if (S.chainSel === k) return;
    S.chainSel = k;
    U.chainSel(root, chain, k);
  }

  // Métricas duras: repinta el panel con la plataforma y la fila marcadas.
  const paintHard = () => U.hardRender(root, C.chHard(S.plat), { sel: S.hardSel, plat: S.plat }, { head: PYL.core.metrics.FAIL_HEAD, fmt: PYL.core.metrics.copText });

  function selectRow(k) {
    if (S.hardSel === k) return;
    S.hardSel = k;
    paintHard();
  }

  // Cambiar la plataforma aquí no cambia el Simulador ni se guarda.
  function setPlat(p) {
    const plat = C.chPlat(p);
    if (S.plat === plat) return;
    S.plat = plat;
    paintHard();
  }

  function setOpen(which) {
    S.open = which;
    if (which === 'chain') { S.chainSel = 'cpm'; U.chainSel(root, chain, S.chainSel); } // al abrir, siempre el paso 1
    if (which === 'hard') { S.plat = C.chPlat(PYL.app.state.testing.sim.plat); S.hardSel = 'ctr'; paintHard(); } // la plataforma del Simulador y la primera fila
    render();
    if (which) document.dispatchEvent(new CustomEvent('flotante:abierto', { detail: { id: EVENT_ID[which] } }));
  }

  U.build(root, { toggle: (which) => setOpen(S.open === which ? null : which), close: () => setOpen(null) });
  U.chainBuild(root, chain, C.CH_SIDES, { select: selectLink });
  U.chainSel(root, chain, S.chainSel);
  U.hardBuild(root, C.chHard(S.plat), { select: selectRow, plat: setPlat });
  paintHard();
  render();

  // Abrir un flotante de otra pestaña (dk, qk, ap) cierra el panel abierto de Testeo. Los dos de aquí se manejan en setOpen.
  document.addEventListener('flotante:abierto', (e) => {
    if (S.open && e.detail && e.detail.id !== EVENT_ID[S.open]) setOpen(null);
  });

  // Al salir de Testeo se cierra el panel.
  document.addEventListener('nav:vista', (e) => { if (S.open && e.detail && e.detail.v !== 'testeo') setOpen(null); });

  // Esc cierra el panel (salvo que haya un diálogo abierto encima).
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && S.open && !$('#modal').classList.contains('show')) setOpen(null);
  });
})();
