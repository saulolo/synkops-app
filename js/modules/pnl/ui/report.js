// Informe PDF autoexplicativo: arma un documento claro (A4, fondo blanco) en #report y abre el diálogo
// de impresión, donde se elige "Guardar como PDF". Pensado para quien no tiene acceso a la app.
(() => {
  const PYL = globalThis.PYL;
  const { $, el, rich } = PYL.ui.dom;
  const { nf, fmt, short } = PYL.core.format;
  const { periodLabel } = PYL.core.dates;
  const D = PYL.core.diagnostics;
  const I = PYL.core.insights;
  const summary = PYL.ui.summary;

  const pct = (v) => fmt(v, 'pct');
  const cop = (v) => fmt(v, 'cop');

  // Nodo con hijos: strings, nodos o arreglos anidados (los falsy se omiten).
  function h(tag, cls, ...kids) {
    const n = el(tag, cls);
    kids.flat(Infinity).forEach((k) => { if (k == null || k === false) return; n.append(k instanceof Node ? k : String(k)); });
    return n;
  }
  const richEl = (tag, cls, segments) => { const n = el(tag, cls); rich(n, segments); return n; };
  const pill = (level, text) => h('span', 'r-pill ' + (level || ''), text);
  const bar = (share, cls) => { const b = el('span', 'r-bar ' + (cls || '')); b.style.width = Math.max(1, Math.min(1, Math.abs(share || 0)) * 100) + '%'; return h('span', 'r-track', b); };

  function table(head, rows, cls) {
    return h('table', 'r-table ' + (cls || ''),
      h('thead', null, h('tr', null, head.map((c) => h('th', null, c)))),
      h('tbody', null, rows.map((r) => h('tr', r.cls || null, r.cells.map((c) => (c instanceof Node && c.tagName === 'TD' ? c : h('td', null, c)))))));
  }
  const td = (cls, ...kids) => h('td', cls, kids);

  function section(num, title, intro, ...body) {
    return h('section', 'r-sec', h('h2', null, h('span', 'r-num', num), title), intro && h('p', 'r-intro', intro), body);
  }

  // ---------- Secciones ----------

  function cover(d) {
    const { a, x } = d;
    const v = D.verdict(a.util, a.fact);
    const stat = (label, value, cls, sub) => h('div', 'r-stat', h('small', null, label), h('b', cls, value), sub && h('span', null, sub));
    return h('header', 'r-cover',
      h('div', 'r-eyebrow', 'Informe de rentabilidad · Dropshipping contra entrega (Dropi + Meta Ads)'),
      h('h1', null, x.producto),
      h('div', 'r-meta', `Periodo analizado: ${x.periodo || 'Todo el periodo'}`, ' · ', `Generado el ${d.generated}`),
      pill(v.level, v.label),
      h('div', 'r-stats',
        stat('Cobrado a clientes', cop(a.fact), null, `${nf(a.ent)} pedidos entregados`),
        stat('Invertido en Meta Ads', cop(a.ads), null, `${a.withIva ? 'Con' : 'Sin'} IVA`),
        stat('Utilidad neta real', cop(a.util), a.util >= 0 ? 'ok' : 'bad', 'Lo que quedó en el bolsillo'),
        stat('Margen neto', pct(a.margen), a.margen >= 0.15 ? 'ok' : a.margen >= 0 ? 'warn' : 'bad', 'Meta: 15% a 20%')));
  }

  function execSummary(d) {
    const { a, x } = d;
    const p = I.projection(a);
    const of = (v) => pct(a.fact ? v / a.fact : null);
    return section('1', 'Resumen ejecutivo', null,
      richEl('p', 'r-story', D.story(a, x.producto)),
      richEl('p', 'r-plain', ['De cada peso cobrado, la mercancía se llevó ', { b: of(a.merc) }, ', los fletes ', { b: of(a.fletes) },
        ', Meta Ads ', { b: of(a.ads) }, ' y quedó como utilidad ', { b: of(a.util) }, '.']),
      p && richEl('p', 'r-callout', ['🚚 ', { b: `${nf(p.ruta)} pedidos siguen en ruta.` }, ' Si se entregan con la efectividad actual (',
        { b: pct(p.efect) }, ') serían ≈', { b: nf(Math.round(p.ent)) }, ' entregas más y la utilidad pasaría a ', { b: cop(p.util) },
        ` (${p.extra >= 0 ? '+' : ''}${short(p.extra)}). La publicidad de esos pedidos ya está pagada.`]));
  }

  function actionPlan(d) {
    const list = I.actions(d.a, d.products);
    if (!list.length) return section('2', 'Plan de acción', 'No se detectaron acciones urgentes en este periodo.');
    return section('2', 'Plan de acción', 'Acciones ordenadas por el dinero que mueven. El impacto es una estimación sobre los mismos pedidos del periodo; cada acción se calcula por separado, así que los impactos no se suman.',
      h('ol', 'r-actions', list.map((ac) => h('li', null,
        h('div', 'r-act-h', pill(ac.priority === 'Alta' ? 'bad' : 'warn', `Prioridad ${ac.priority.toLowerCase()}`), h('b', null, ac.title)),
        h('p', null, ac.detail),
        ac.gain != null && h('div', 'r-gain ' + (ac.gain >= 0 ? 'ok' : 'bad'), `Impacto estimado: ${ac.gain >= 0 ? '+' : ''}${cop(ac.gain)} de utilidad en el periodo`)))));
  }

  function indicators(d) {
    const { a, prev } = d;
    const st = D.kpis(a);
    const fair = I.projectedVsPrevious(a, prev);
    const ref = {
      util: 'Mayor a $0',
      margen: '15% a 20%',
      efect: '70% o más',
      roas: `Mayor al equilibrio (${fmt(a.roasEq, 'x')})`,
      cpa: `Menor al máximo (${cop(a.cpaMax)})`,
    };
    const val = { util: cop(a.util), margen: pct(a.margen), efect: pct(a.efect), roas: fmt(a.roas, 'x'), cpa: cop(a.cpa) };
    const rows = Object.keys(ref).map((k) => {
      const dl = summary.delta(k, a, prev), s = st[k];
      return { cells: [
        td('r-kpi', h('b', null, summary.TIPS[k].h), h('small', null, summary.TIPS[k].p)),
        td('r-num-c', h('b', null, val[k])),
        td('r-muted', ref[k]),
        td(null, s ? pill(s.level, s.text) : '—'),
        td('r-num-c ' + (dl ? dl.level : ''), dl ? dl.text : '—'),
      ] };
    });
    return section('3', 'Indicadores clave', prev
      ? `La columna "vs. anterior" compara con ${periodLabel(prev.from, prev.to)}, un periodo de la misma duración justo antes.`
      : 'No hay un periodo anterior comparable (misma duración, justo antes) con pedidos cobrados.',
    table(['Indicador y qué significa', 'Resultado', 'Referencia', 'Estado', 'vs. anterior'], rows, 'r-kpis'),
    fair && richEl('p', 'r-note', ['Ojo: la utilidad de este periodo aún no incluye ', { b: `${nf(fair.ruta)} pedidos en ruta` },
      '. Contándolos con la efectividad actual, la utilidad proyectada es ', { b: cop(fair.now) }, ' frente a ', { b: cop(fair.before) },
      ` del periodo anterior proyectado (${fair.diff >= 0 ? '+' : ''}${short(fair.diff)}). Esa es la comparación más justa.`]));
  }

  function diagTable(diag) {
    return [
      table(['Métrica', 'Resultado', 'Referencia', 'Diagnóstico'], diag.rows.map((r) => ({ cells: [
        td(null, h('b', null, r.name), h('small', null, r.desc)), td('r-num-c', h('span', 'r-dot ' + r.level), r.value), td('r-muted', r.bench), td('r-dx', r.text),
      ] }))),
      richEl('p', 'r-concl', diag.conclusion),
    ];
  }

  function money(d) {
    const { a } = d;
    const of = (v) => (a.fact ? v / a.fact : null);
    const rows = [
      ['Cobrado a clientes (pedidos entregados)', a.fact, 'tot'],
      ['− Mercancía (costo del proveedor)', -a.merc, 'cost'],
      ['− Fletes (entregas + devoluciones ida y retorno)', -a.fletes, 'cost'],
      ['= Wallet Dropi (lo que queda antes de publicidad)', a.wallet, 'tot'],
      [`− Meta Ads (${a.withIva ? 'con' : 'sin'} IVA)`, -a.ads, 'cost'],
      ['= Utilidad neta real', a.util, a.util >= 0 ? 'ok' : 'badbar'],
    ].map(([name, v, c]) => ({ cls: name.startsWith('=') ? 'r-strong' : null, cells: [name, td('r-num-c', cop(v)), td('r-num-c', pct(of(v))), td('r-barcell', bar(of(v), c))] }));
    return section('4', 'De lo cobrado al bolsillo', 'Cómo se fue restando cada costo hasta llegar a la utilidad. Los porcentajes son sobre lo cobrado.',
      table(['Concepto', 'Monto', '% de lo cobrado', ''], rows), h('h3', null, 'Diagnóstico financiero'), diagTable(D.cascade(a)));
  }

  function logistics(d) {
    const { a, x } = d;
    const share = (v) => (a.rec ? v / a.rec : null);
    const rows = [
      ['Recibidos', 'Pedidos que entraron a la tienda', a.rec],
      ['Cancelados', 'Filtrados en la confirmación por WhatsApp', a.can],
      ['Despachados', 'Salieron con guía', a.desp],
      ['Entregados', 'Cobrados en efectivo', a.ent],
      ['Devueltos', 'El cliente no recibió o no pagó', a.dev],
      ['En ruta', 'Todavía viajando', a.ruta],
    ].map(([n, desc, v]) => ({ cells: [td(null, h('b', null, n), h('small', null, desc)), td('r-num-c', nf(v)), td('r-num-c', pct(share(v))), td('r-barcell', bar(share(v), 'tot'))] }));
    return section('5', 'Logística contra entrega', 'El recorrido de los pedidos, de la compra al cobro. Los porcentajes son sobre los pedidos recibidos.',
      table(['Fase', 'Pedidos', '% de recibidos', ''], rows), h('h3', null, 'Diagnóstico vs. benchmark'), diagTable(D.funnel(a, x.producto)));
  }

  function unitEconomics(d) {
    const rows = I.unitEconomics(d.a);
    if (!rows.length) return null;
    return section('6', 'Economía por pedido entregado', 'Cómo se reparte, en promedio, el dinero de cada pedido entregado. Las devoluciones se reparten entre los pedidos que sí se cobraron.',
      table(['Concepto', 'Por entrega', '% del ticket', 'Total del periodo'], rows.map((r) => ({
        cls: r.key === 'util' || r.key === 'cpa' ? 'r-strong' : null,
        cells: [r.name, td('r-num-c ' + (r.key === 'util' ? (r.per >= 0 ? 'ok' : 'bad') : ''), cop(r.per)), td('r-num-c', pct(r.pct)), td('r-num-c r-muted', cop(r.total))],
      }))),
      richEl('p', 'r-note', ['El ', { b: 'Margen Máximo para Publicidad' }, ' es lo que deja cada entrega para pagar anuncios. Si la publicidad por entrega lo supera, cada venta pierde dinero.']));
  }

  function trend(d) {
    if (d.weeks.length < 2) return null;
    const max = Math.max(1, ...d.weeks.map((w) => Math.abs(w.a.util)));
    return section('7', 'Tendencia semanal', 'Resultado por semana de pedido (lunes a domingo). Las semanas recientes pueden verse peor porque aún tienen pedidos en ruta.',
      table(['Semana', 'Utilidad', '', 'Margen', 'ROAS', 'Efectividad', 'Entregas', 'En ruta'], d.weeks.map((w) => ({ cells: [
        periodLabel(w.from, w.to) + (w.partial ? ' *' : ''),
        td('r-num-c ' + (w.a.util >= 0 ? 'ok' : 'bad'), cop(w.a.util)),
        td('r-barcell', bar(w.a.util / max, w.a.util >= 0 ? 'ok' : 'badbar')),
        td('r-num-c', pct(w.a.margen)), td('r-num-c', fmt(w.a.roas, 'x')), td('r-num-c', pct(w.a.efect)), td('r-num-c', nf(w.a.ent)), td('r-num-c', nf(w.a.ruta)),
      ] }))),
      d.weeks.some((w) => w.partial) && h('p', 'r-note', '* Semana incompleta dentro del rango analizado.'));
  }

  function productsSec(d) {
    if (d.products.length < 2) return null;
    return section('8', 'Resultado por producto', 'Cada producto con su propia inversión en Meta Ads, asignada según las fechas en que tuvo pedidos activos.',
      table(['Producto', 'Veredicto', 'Entregados', 'Efectividad', 'Cobrado', 'Meta Ads', 'Utilidad', 'Margen'], d.products.map(({ label, a }) => {
        const u = a.wallet - a.adsAuto, v = D.verdict(u, a.fact);
        return { cells: [h('b', null, label), pill(v.level, v.label), td('r-num-c', nf(a.ent)), td('r-num-c', pct(a.efect)), td('r-num-c', cop(a.fact)),
          td('r-num-c', cop(a.adsAuto)), td('r-num-c ' + (u >= 0 ? 'ok' : 'bad'), cop(u)), td('r-num-c', pct(a.fact ? u / a.fact : null))] };
      })));
  }

  const GLOSSARY = [
    ['COD (contra entrega)', 'El cliente paga en efectivo cuando recibe el paquete, no al comprar.'],
    ['Wallet Dropi', 'Lo cobrado menos mercancía y fletes: el dinero disponible antes de pagar publicidad.'],
    ['Efectividad de entrega', 'Entregados ÷ (entregados + devueltos). Solo cuenta pedidos que ya cerraron ciclo.'],
    ['ROAS real', 'Pesos cobrados por cada $1 invertido en Meta Ads.'],
    ['ROAS de equilibrio', 'El ROAS mínimo para no perder dinero: lo cobrado ÷ la Wallet.'],
    ['CPA real', 'Inversión en Meta Ads ÷ pedidos entregados: lo que costó conseguir cada cliente que pagó.'],
    ['CPA máximo sostenible', 'Wallet ÷ entregados: lo máximo que se puede pagar en publicidad por entrega sin perder.'],
    ['Flete de devolución', 'Lo que cobra la transportadora por un pedido devuelto: la ida más el retorno.'],
  ];

  function appendix(d) {
    const { a, x, f, notes } = d;
    const assumptions = [
      `Inversión en Meta Ads ${a.withIva ? 'con IVA (lo cobrado a la tarjeta)' : 'sin IVA (cargos ÷ 1,19)'}${f.adsOverride != null ? ', escrita manualmente para este periodo' : ''}.`,
      `Campaña / ángulo: ${x.campana}.`,
      'Los pedidos se ubican en el periodo por su fecha de creación en Dropi.',
      'Las estimaciones del plan de acción mantienen los mismos pedidos cerrados del periodo y cambian una sola variable a la vez.',
      ...notes.map((n) => n.text),
    ];
    return section('9', 'Glosario y notas', null,
      h('dl', 'r-gloss', GLOSSARY.map(([t, dd]) => [h('dt', null, t), h('dd', null, dd)])),
      h('h3', null, 'Fuentes y supuestos'),
      h('ul', 'r-notes', assumptions.map((t) => h('li', null, t))));
  }

  // d: { a, x, f, prev, weeks, products: [{ label, a }], notes: [{ text }], generated }
  function build(d) {
    const box = $('#report'); box.textContent = '';
    box.append(cover(d), execSummary(d), actionPlan(d), indicators(d), money(d), logistics(d));
    [unitEconomics(d), trend(d), productsSec(d)].filter(Boolean).forEach((s) => box.appendChild(s));
    const logo = el('img'); logo.src = 'img/autor.png'; logo.alt = ''; logo.width = 40; logo.height = 40;
    box.append(appendix(d), h('footer', 'r-foot',
      h('div', 'r-sign', logo, h('div', null, h('small', null, 'Aplicación creada por'), h('b', null, 'Ingeniero Saul Echeverri'), h('span', null, 'saulolo@gmail.com'))),
      h('div', 'r-gen', `Informe generado con P&L COD · ${d.generated}`)));
    // Las secciones opcionales pueden faltar: se numeran según las que quedaron.
    box.querySelectorAll('.r-sec .r-num').forEach((n, i) => { n.textContent = i + 1; });
  }

  // El título del documento es el nombre de archivo que propone "Guardar como PDF".
  async function print(d, fileName) {
    build(d);
    // El logo se acaba de crear: se espera a que cargue para que no salga en blanco en el PDF.
    await Promise.all([...$('#report').querySelectorAll('img')].map((i) => i.decode().catch(() => {})));
    const prevTitle = document.title;
    document.title = fileName;
    document.body.classList.add('print-report');
    const done = () => { document.body.classList.remove('print-report'); document.title = prevTitle; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
  }

  PYL.ui.report = { build, print };
})();
