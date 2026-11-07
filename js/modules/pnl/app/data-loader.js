// Carga de reportes y asignación campaña → producto.
(() => {
  const PYL = globalThis.PYL;
  const app = PYL.app, S = app.state;
  const { nf, F } = PYL.core.format;
  const { isDropi, buildDropi } = PYL.core.dropi;
  const { buildMeta, isMetrics, buildMetrics, matchProduct } = PYL.core.meta;
  const { products } = PYL.core.pnl;
  const { readRows } = PYL.services.files;
  const { campaignMap } = PYL.services.storage;
  const { setStatus, bind } = PYL.ui.uploadZones;

  // Asignación automática por nombre, corregible en la tabla y recordada en el navegador.
  // Un valor guardado '' significa "sin asignar" a propósito.
  function rebuildMap() {
    if (!S.metrics) { S.map = {}; return; }
    const prods = S.dropi ? products(S.dropi.lines) : [];
    const saved = campaignMap.load();
    S.map = {};
    S.metrics.names.forEach((n) => {
      const v = saved[n];
      S.map[n] = v === '' ? null : v && prods.includes(v) ? v : matchProduct(n, prods);
    });
  }

  function assignCampaign(name, prod) {
    const saved = campaignMap.load(); saved[name] = prod; campaignMap.save(saved);
    rebuildMap(); app.render();
  }

  // Contexto de métricas para core.pnl.aggregate (null sin reporte de métricas).
  const metricsContext = () => (S.metrics ? { camps: S.metrics.camps, map: S.map } : null);

  // Cada archivo se identifica por su contenido, sin importar en qué zona se suelte.
  const KIND_LABEL = { dropi: 'el reporte de órdenes de Dropi', meta: 'la facturación de Meta', metrics: 'el reporte de métricas de campañas' };
  async function handleFiles(files, zone) {
    for (const file of files) {
      let rows;
      try { rows = await readRows(file); } catch (e) { setStatus(zone, `${file.name}: ${e.message}`, 'err'); continue; }
      const kind = isDropi(rows) ? 'dropi' : isMetrics(rows) ? 'metrics' : 'meta';
      try {
        if (kind === 'dropi') {
          S.dropi = buildDropi(rows);
          setStatus('dropi', `${file.name} · ${nf(S.dropi.orders)} órdenes, ${nf(S.dropi.lines.length)} líneas`, 'done');
          app.filters.reset();
        } else if (kind === 'metrics') {
          S.metrics = buildMetrics(rows);
          const sp = S.metrics.camps.reduce((s, c) => s + c.spend, 0);
          setStatus('metrics', `${file.name} · ${nf(S.metrics.names.length)} campañas, ${F.cop(sp)} sin IVA`, 'done');
          if (S.dropi) app.filters.reset(true);
        } else {
          const info = buildMeta(rows);
          S.metaInfo = info; S.meta = info.rows;
          const tot = S.meta.reduce((s, m) => s + m.amt, 0);
          setStatus('meta', `${file.name} · ${nf(S.meta.length)} cargos, ${F.cop(tot)}`, 'done');
          if (S.dropi) app.filters.reset(true);
        }
        if (zone !== kind) setStatus(zone, `${file.name} es ${KIND_LABEL[kind]}: lo cargué en su lugar.`, '');
      } catch (e) { setStatus(kind, `${file.name}: ${e.message}`, 'err'); }
    }
    rebuildMap();
    app.render();
  }

  function init() { bind(handleFiles); }

  app.dataLoader = { init, assignCampaign, metricsContext };
})();
