// Escalado: pinta la tarjeta "Pronto" de Surfing Scaling. Sin estado ni guardado.
(() => {
  const PYL = globalThis.PYL;
  PYL.ui.testing.soon(PYL.ui.dom.$('#es-soon'), PYL.core.scaling.SCALING_SOON);
})();
