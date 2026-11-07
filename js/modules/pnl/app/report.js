// Exportar el informe PDF del filtro actual: reúne el último cálculo y se lo pasa a ui.report.
(() => {
  const PYL = globalThis.PYL;
  const app = PYL.app, S = app.state;
  const { $ } = PYL.ui.dom;

  function exportPdf() {
    if (!S.current) return;
    const { a, x, f, prev, weeks, products } = S.current;
    const generated = new Date().toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' });
    const safe = (s) => s.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_');
    PYL.ui.report.print(
      { a, x, f, prev, weeks, products, notes: PYL.ui.notices.list(a, S), generated },
      `Informe_PyL_${safe(x.producto)}_${safe(x.periodo || 'periodo')}`,
    );
  }

  function init() {
    $('#btn-report').addEventListener('click', exportPdf);
    $('#story-report').addEventListener('click', exportPdf);
  }

  app.report = { init };
})();
