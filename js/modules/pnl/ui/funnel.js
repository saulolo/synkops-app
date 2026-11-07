// Embudo logístico COD: seis fases y barra segmentada de lo despachado.
(() => {
  const PYL = globalThis.PYL;
  const { $, el } = PYL.ui.dom;
  const { nf, fmt } = PYL.core.format;
  const tooltip = PYL.ui.tooltip;

  // Seis fases en orden; en vista % cada una se expresa sobre los pedidos recibidos.
  function draw(a, pctMode) {
    const box = $('#funnel'); box.textContent = '';
    // [nombre, descripción, valor, color, es subfase de Despachados]
    const steps = [
      ['Recibidos', 'Entraron a Shopify', a.rec, '#3a4458', false],
      ['Cancelados', 'Filtrados en confirmación', a.can, 'var(--warn)', false],
      ['Despachados', 'Salieron con guía', a.desp, '#3a4458', false],
      ['Entregados', 'Cobrados en efectivo', a.ent, 'var(--accent)', true],
      ['Devueltos', 'Paquetes retornados', a.dev, 'var(--cost)', true],
      ['En ruta', a.pen ? `Viajando · incluye ${nf(a.pen)} pendientes` : 'Viajando actualmente', a.ruta, '#56607a', true],
    ];
    const max = Math.max(1, a.rec);
    steps.forEach(([name, desc, val, color, sub]) => {
      const share = a.rec ? val / a.rec : null;
      const row = el('div', 'f-row' + (sub ? ' sub' : ''));
      const label = el('div', 'f-name', name); label.appendChild(el('small', null, desc));
      const bar = el('div', 'f-bar'); bar.style.width = (val / max) * 100 + '%'; bar.style.background = color;
      const track = el('div'); track.appendChild(bar);
      row.append(label, track, el('div', 'f-val', pctMode ? fmt(share, 'pct') : nf(val)));
      row.addEventListener('mousemove', (ev) => tooltip.show(ev, [name, `${nf(val)} pedidos`, `${fmt(share, 'pct')} de los recibidos`]));
      row.addEventListener('mouseleave', tooltip.hide);
      box.appendChild(row);
    });

    // Sin leyenda: las fases de arriba ya muestran estas cifras; el detalle queda en el tooltip.
    const parts = [['Entregados', a.ent, 'var(--accent)'], ['Devueltos', a.dev, 'var(--cost)'], ['En ruta', a.ruta, '#56607a']];
    const tot = parts.reduce((s, p) => s + p[1], 0) || 1;
    const stack = $('#stack'); stack.textContent = '';
    parts.forEach(([label, v, c]) => {
      const seg = el('div'); seg.style.flex = String(v); seg.style.background = c;
      seg.addEventListener('mousemove', (ev) => tooltip.show(ev, [label, `${nf(v)} pedidos`, fmt(v / tot, 'pct') + ' de los despachados']));
      seg.addEventListener('mouseleave', tooltip.hide);
      stack.appendChild(seg);
    });

    $('#funnel-note').textContent = a.buys != null
      ? (pctMode ? `Meta: ${nf(a.buys)} compras (CPA ${fmt(a.cpaMeta, 'cop')} sin IVA) · % sobre ${nf(a.rec)} recibidos.`
        : `Meta reportó ${nf(a.buys)} compras (CPA Meta ${fmt(a.cpaMeta, 'cop')} sin IVA); Dropi recibió ${nf(a.rec)} pedidos.`)
      : (pctMode ? `% sobre ${nf(a.rec)} pedidos recibidos.` : 'Pedidos únicos de Dropi en el filtro.');
  }

  PYL.ui.funnel = { draw };
})();
