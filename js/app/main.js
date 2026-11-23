// Orquestador: calcula el P&L del filtro actual y pide a cada componente que se pinte.
// Último script en cargar: aquí se conectan los eventos y arranca la app.
(() => {
  const PYL = globalThis.PYL;
  const { core, ui, app } = PYL;
  const S = app.state;
  const { $, setPressed } = ui.dom;
  const { aggregate, products } = core.pnl;

  function render() {
    $('#btn-report').classList.toggle('hidden', !S.dropi);
    if (!S.dropi) { ui.notices.render(null, S); $('#dash').classList.add('hidden'); return; }
    $('#dash').classList.remove('hidden');
    const f = app.filters.read();
    const mx = app.dataLoader.metricsContext();
    const a = aggregate(S.dropi.lines, S.meta || [], f, mx);
    const x = app.filters.extras(f, a);
    const lines = S.dropi.lines, meta = S.meta || [];
    const prev = core.insights.previous(lines, meta, f, mx);
    const weeks = core.insights.weeks(lines, meta, f, mx);
    const prodRows = productRows(f, mx);
    S.current = { a, x, f, weeks, prev, products: prodRows.filter((r) => r.key !== '__all') };
    saveSnap(a, f);

    ui.notices.render(a, S);
    app.filters.showAutoValues(a);
    ui.summary.renderHeader(a, x);
    ui.summary.renderKpis(a, prev, weeks);
    ui.summary.renderProjection(core.insights.projection(a));
    ui.summary.renderStory(core.diagnostics.story(a, x.producto));
    ui.trend.weekly(weeks);
    ui.simulator.draw(a);
    ui.cascade.draw(a);
    ui.diagnosisPanel.render('#cdiag-table', '#cdiag-concl', core.diagnostics.cascade(a));
    ui.funnel.draw(a, S.funnelMode === 'pct');
    ui.diagnosisPanel.render('#diag-table', '#diag-concl', core.diagnostics.funnel(a, x.producto));
    ui.unitTable.draw(a);
    ui.productsTable.draw({
      rows: prodRows,
      selected: S.prod,
      hasBilling: !!S.meta,
      onSelect: (key) => app.filters.selectProduct(key),
    });
    ui.campaignsTable.draw({
      rows: campaignRows(f),
      products: products(S.dropi.lines),
      onAssign: app.dataLoader.assignCampaign,
    });
    ui.presets.draw(app.filters.presetList(), f, (p) => app.filters.selectProduct(p.prod, p.from, p.to));
  }

  // Foto de los números clave para Inicio → Mini P&L (SPEC 22). Sin espacio o sin localStorage no pasa nada.
  function saveSnap(a, f) {
    const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    if (n(a.util) === null || n(a.fact) === null) return;
    PYL.services.storage.pnlSnap.save({
      v: core.indicators.IX_VERSION, at: Date.now(), prod: f.prod === '__all' ? 'Todos' : f.prod, from: f.from || null, to: f.to || null,
      util: a.util, fact: a.fact, margen: n(a.margen), roas: n(a.roas), roasEq: n(a.roasEq), efect: n(a.efect),
    });
  }

  // Una fila por producto más el consolidado, siempre con la inversión automática.
  function productRows(f, mx) {
    const rows = products(S.dropi.lines).map((p) => [p, p]);
    rows.push(['Todos / Consolidado', '__all']);
    return rows.map(([label, key]) => ({ label, key, a: aggregate(S.dropi.lines, S.meta || [], { ...f, prod: key, adsOverride: null }, mx) }));
  }

  // Una campaña puede venir en varias filas (desglose diario): se agregan dentro del filtro.
  function campaignRows(f) {
    if (!S.metrics) return null;
    return S.metrics.names.map((name) => ({
      name,
      assigned: S.map[name],
      a: aggregate([], [], { ...f, prod: '__all' }, { camps: S.metrics.camps.filter((c) => c.name === name), map: {} }),
    }));
  }

  function init() {
    ui.icons.hydrate(document); // SPEC 24: íconos del HTML estático (<span class="ic" data-ic>)
    app.render = render;
    app.filters.init();
    app.dataLoader.init();
    app.save.init();
    app.report.init();
    ui.diagnosisPanel.bindToggles();
    ui.summary.init();

    $('#funnel-mode').addEventListener('click', (e) => {
      const b = e.target.closest('[data-mode]');
      if (!b || !S.current) return;
      S.funnelMode = b.dataset.mode;
      setPressed($('#funnel-mode'), '[data-mode]', b);
      ui.funnel.draw(S.current.a, S.funnelMode === 'pct');
    });

    // La cascada y la tendencia dependen del ancho de su tarjeta.
    let rz;
    window.addEventListener('resize', () => {
      clearTimeout(rz);
      rz = setTimeout(() => { if (S.current) { ui.cascade.draw(S.current.a); ui.trend.weekly(S.current.weeks); } }, 120);
    });

    ui.notices.render(null, S);
  }

  init();
})();
