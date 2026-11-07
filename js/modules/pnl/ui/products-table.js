// Tabla "Desglose por producto" con veredicto y barra de utilidad. Clic en una fila filtra por ese producto.
(() => {
  const PYL = globalThis.PYL;
  const { $, el } = PYL.ui.dom;
  const { nf, fmt } = PYL.core.format;
  const { verdict } = PYL.core.diagnostics;

  const cls = (v, good, mid) => (v == null ? '' : v >= good ? 'ok' : v >= mid ? 'warn' : 'bad');

  // Celda de dos líneas: valor principal arriba, detalle pequeño abajo.
  const cell = (main, sub, mainCls, subCls) => {
    const td = el('td', mainCls);
    td.appendChild(el('span', 'main', main));
    if (sub != null) td.appendChild(el('span', 'sub ' + (subCls || ''), sub));
    return td;
  };

  // rows: [{ label, key, a }] con a = agregado del producto (sin inversión manual).
  // hasBilling: hay facturación de Meta cargada (cambia la nota sobre cómo se asigna la inversión).
  function draw({ rows, selected, hasBilling, onSelect }) {
    $('#prod-note').textContent = hasBilling
      ? 'Clic en una fila para filtrar. Cada cargo de Meta del rango se asigna al producto con pedidos activos en esa fecha.'
      : 'Clic en una fila para filtrar. Sin facturación, la inversión de cada producto sale del gasto de sus campañas.';
    const tb = $('#prod-table tbody'); tb.textContent = '';
    const utilOf = (a) => a.wallet - a.adsAuto;
    // Las barras se escalan contra el producto con mayor utilidad (o pérdida); el consolidado no cuenta.
    const maxAbs = Math.max(1, ...rows.filter((r) => r.key !== '__all').map((r) => Math.abs(utilOf(r.a))));
    rows.forEach(({ label, key, a }) => {
      const util = utilOf(a), margen = a.fact ? util / a.fact : null;
      const sign = util >= 0 ? 'ok' : 'bad';
      const ofRec = (n) => fmt(a.rec ? n / a.rec : null, 'pct');
      const adsSub = a.buys != null || a.ctr != null
        ? `CPA: ${fmt(a.buys ? a.adsAuto / a.buys : null, 'cop')} · CTR: ${a.ctr == null ? '—' : nf(a.ctr, { maximumFractionDigits: 1 }) + '%'}`
        : null;
      const tr = el('tr', (key === '__all' ? 'total ' : '') + (selected === key ? 'sel' : ''));
      const name = el('td', null, label);
      const v = verdict(util, a.fact);
      name.appendChild(el('span', 'badge ' + v.level, v.label));
      const utilTd = cell(fmt(util, 'cop'), margen == null ? null : `Margen ${fmt(margen, 'pct')}`, sign, sign);
      if (key !== '__all') {
        const bar = el('span', 'ubar ' + sign); bar.style.width = Math.max(2, (Math.abs(util) / maxAbs) * 100) + '%';
        const track = el('span', 'utrack'); track.appendChild(bar); utilTd.appendChild(track);
      }
      tr.append(
        name,
        cell(nf(a.rec), null),
        cell(nf(a.can), ofRec(a.can)),
        cell(nf(a.ent), ofRec(a.ent)),
        cell(nf(a.dev), ofRec(a.dev)),
        cell(nf(a.ruta), ofRec(a.ruta)),
        cell(fmt(a.efect, 'pct'), null, cls(a.efect, 0.7, 0.6)),
        cell(fmt(a.fact, 'cop'), null),
        cell(fmt(a.adsAuto, 'cop'), adsSub),
        cell(fmt(a.wallet, 'cop'), null),
        utilTd,
      );
      tr.addEventListener('click', () => onSelect(key));
      tb.appendChild(tr);
    });
  }

  PYL.ui.productsTable = { draw };
})();
