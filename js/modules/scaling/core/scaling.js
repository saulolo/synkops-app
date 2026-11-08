// Escalado: encabezado y tarjeta "Pronto" de la pestaña. Hoy solo anuncia Surfing Scaling; no hay reglas ni estado.
// Reutiliza: el escalón (+20 %) ← metrics.NS_TEST.step.
(() => {
  const core = globalThis.PYL.core;
  const { NS_TEST } = core.metrics;
  const stepPct = Math.round(NS_TEST.step * 100);

  // Una tarjeta "Pronto": la forma que pinta ui.testing.soon.
  const SCALING_SOON = {
    icon: '🏄', h: 'Surfing Scaling',
    d: 'Cuando un conjunto pasa el testeo, se escala. Esta parte llega en otra entrega.',
    items: [
      ['Escalado vertical: ', { b: '+' + stepPct + ' %' }, ' de presupuesto por escalón.'],
      ['Niveles de presupuesto, uno tras otro.'],
      ['Refresco de campañas: cuándo y cuántos anuncios nuevos.'],
    ],
  };

  core.scaling = { SCALING_SOON };
})();
