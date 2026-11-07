// Tabla "Campañas Meta": métricas por campaña y selector del producto asignado.
(() => {
  const PYL = globalThis.PYL;
  const { $, el } = PYL.ui.dom;
  const { nf, fmt } = PYL.core.format;

  // rows: [{ name, a, assigned }] con a = agregado de la campaña dentro del filtro.
  // Sin reporte de métricas (rows null) la tarjeta se oculta.
  function draw({ rows, products, onAssign }) {
    $('#camps-card').classList.toggle('hidden', !rows);
    if (!rows) return;
    const tb = $('#camp-table tbody'); tb.textContent = '';
    rows.forEach(({ name, a, assigned }) => {
      const tr = el('tr', a.mSpendAll ? '' : 'off');
      const sel = el('select');
      sel.appendChild(new Option('— Sin asignar —', ''));
      products.forEach((p) => sel.appendChild(new Option(p, p)));
      sel.value = assigned || '';
      sel.addEventListener('change', () => onAssign(name, sel.value));
      const tdSel = el('td'); tdSel.appendChild(sel);
      tr.append(el('td', null, name), tdSel, el('td', null, fmt(a.mSpendAll, 'cop')), el('td', null, a.buys == null ? '—' : nf(a.buys)),
        el('td', null, fmt(a.cpaMeta, 'cop')), el('td', null, a.ctr == null ? '—' : nf(a.ctr, { maximumFractionDigits: 2 }) + '%'),
        el('td', null, a.checkouts == null ? '—' : nf(a.checkouts)));
      tb.appendChild(tr);
    });
  }

  PYL.ui.campaignsTable = { draw };
})();
