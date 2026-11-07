// Tabla "Unit economics por pedido entregado", con tooltip explicativo en cada concepto.
(() => {
  const PYL = globalThis.PYL;
  const { $, el } = PYL.ui.dom;
  const { fmt } = PYL.core.format;
  const { infoLabel } = PYL.ui.tooltip;
  const { unitEconomics } = PYL.core.insights;

  // Explicación de cada concepto. li: [antes, palabra resaltada, clase, después].
  const TIPS = {
    ticket: { h: '💵 Ticket promedio cobrado', p: 'Valor promedio que me pagó cada cliente en efectivo al recibir (incluye compras de 1 unidad y combos).' },
    merc: { h: '📦 Mercancía', p: 'Lo que le pagué a la bodega o proveedor de Dropi por el producto (y obsequios) entregado.' },
    fEnt: { h: '🚚 Fletes de entregas', p: 'Costo promedio de envío que cobró la transportadora por llevar el paquete al cliente que sí recibió.' },
    fDev: { h: '⚠️ Fletes de devoluciones', p: 'Costo de los paquetes devueltos (ida + vuelta) repartido entre los entregados: cuánta ganancia le resta cada devolución a los que sí pagaron.' },
    cpa: { h: '💡 Margen Máximo para Publicidad (CPA Sostenible)', p: 'Dinero limpio de cada venta para pagar anuncios tras cubrir producto y todos los fletes.',
      li: [['Meta Ads por entrega MENOR a este valor: ', 'GANANCIA', 'ok', '.'], ['Si lo SUPERA: estoy ', 'PERDIENDO', 'bad', ' dinero.']] },
    ads: { h: '📢 Meta Ads', p: 'Inversión publicitaria real pagada a Meta para que un cliente efectivamente reciba y pague.' },
    util: { h: '💰 Utilidad', p: 'Dinero líquido que me queda en el bolsillo por cada pedido entregado tras pagar producto, fletes, devoluciones y publicidad.' },
  };

  function draw(a) {
    const tb = $('#unit-table tbody'); tb.textContent = '';
    if (!a.ent) { const tr = el('tr'); const td = el('td', 'muted', 'Sin pedidos entregados en este filtro.'); td.colSpan = 4; tr.appendChild(td); tb.appendChild(tr); return; }
    // Color de la barra por concepto; la utilidad va en verde o rojo según su signo.
    const COLOR = { ticket: 'var(--accent)', cpa: 'var(--accent-2)', util: a.util >= 0 ? 'var(--ok)' : 'var(--bad)' };
    unitEconomics(a).forEach(({ key, name, total, per, pct }) => {
      const c = COLOR[key] || 'var(--cost)', kind = key === 'util' ? 'total' : '';
      const tr = el('tr', kind);
      const td1 = el('td'); td1.appendChild(infoLabel(name, TIPS[key]));
      const td3 = el('td');
      const bar = el('span', 'cellbar'); bar.style.width = Math.max(2, Math.min(1, Math.abs(pct || 0)) * 80) + 'px'; bar.style.background = c;
      td3.append(bar, fmt(pct, 'pct'));
      tr.append(td1, el('td', kind === 'total' ? (per >= 0 ? 'ok' : 'bad') : '', fmt(per, 'cop')), td3, el('td', 'muted', fmt(total, 'cop')));
      tb.appendChild(tr);
    });
  }

  PYL.ui.unitTable = { draw };
})();
