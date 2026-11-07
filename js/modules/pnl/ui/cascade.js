// Gráfica de cascada P&L en SVG: de lo cobrado a la utilidad neta.
(() => {
  const PYL = globalThis.PYL;
  const { $ } = PYL.ui.dom;
  const { F, fmt, short } = PYL.core.format;
  const tooltip = PYL.ui.tooltip;

  const NS = 'http://www.w3.org/2000/svg';

  function draw(a) {
    const box = $('#cascade'); box.textContent = '';
    // [etiqueta corta, etiqueta del tooltip, tipo, valor]. 'total' arranca en cero; 'cost' resta del acumulado.
    const rows = [
      ['Cobrado', 'Facturación cobrada', 'total', a.fact],
      ['Mercancía', 'Costo de mercancía', 'cost', -a.merc],
      ['Fletes', 'Fletes (entregas + devoluciones)', 'cost', -a.fletes],
      ['Wallet', 'Ganancia wallet Dropi', 'total', a.wallet],
      ['Ads', `Inversión Meta Ads (${a.withIva ? 'con' : 'sin'} IVA)`, 'cost', -a.ads],
      ['Utilidad', 'Utilidad neta real', 'total', a.util],
    ];
    let run = 0;
    const bars = rows.map(([s, l, t, v]) => {
      let y0, y1;
      if (t === 'total') { y0 = 0; y1 = v; run = v; } else { y0 = run; y1 = run + v; run = y1; }
      return { s, l, t, v, y0, y1 };
    });

    const W = Math.max(box.clientWidth, 300), H = 300, m = { t: 28, r: 4, b: 30, l: 4 };
    const lo = Math.min(0, ...bars.map((b) => Math.min(b.y0, b.y1)));
    const hi = Math.max(1, ...bars.map((b) => Math.max(b.y0, b.y1))) * 1.1;
    const y = (v) => m.t + ((hi - v) / (hi - lo)) * (H - m.t - m.b);
    const step = (W - m.l - m.r) / bars.length, bw = step * 0.62;
    const xb = (i) => m.l + i * step + (step - bw) / 2;

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '100%'); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const mk = (tag, attrs, text) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text != null) n.textContent = text; svg.appendChild(n); return n; };

    // Líneas guía con un paso "redondo" (1, 2, 2,5, 5 o 10 × potencia de 10).
    const raw = (hi - lo) / 4, mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
    const tick = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((k) => k >= raw) || mag;
    for (let v = Math.ceil(lo / tick) * tick; v <= hi; v += tick) mk('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: Math.abs(v) < tick / 2 ? '#3a4458' : '#1c2331' });

    // Conectores punteados entre el final de una barra y el inicio de la siguiente.
    bars.forEach((b, i) => {
      if (i) mk('line', { x1: xb(i - 1) + bw, x2: xb(i), y1: y(bars[i - 1].y1), y2: y(bars[i - 1].y1), stroke: '#4a5470', 'stroke-dasharray': '3 3' });
    });

    const last = bars.length - 1;
    bars.forEach((b, i) => {
      const fill = b.t === 'cost' ? 'var(--cost)' : i === last ? (b.v >= 0 ? 'var(--ok)' : 'var(--bad)') : 'var(--accent)';
      const top = y(Math.max(b.y0, b.y1));
      const r = mk('rect', { x: xb(i), y: top, width: bw, height: Math.max(2, Math.abs(y(b.y0) - y(b.y1))), rx: 4, fill, 'fill-opacity': b.t === 'cost' ? 0.8 : 1 });
      r.addEventListener('mousemove', (ev) => tooltip.show(ev, [b.l, F.cop(b.v), a.fact ? fmt(b.v / a.fact, 'pct') + ' de lo cobrado' : '']));
      r.addEventListener('mouseleave', tooltip.hide);
      mk('text', { x: xb(i) + bw / 2, y: top - 7, 'text-anchor': 'middle', fill: '#e7eaf0', 'font-size': 12, 'font-family': 'Inter, sans-serif' }, short(b.v));
      mk('text', { x: xb(i) + bw / 2, y: H - 9, 'text-anchor': 'middle', fill: '#8a93a6', 'font-size': 12, 'font-family': 'Inter, sans-serif' }, b.s);
    });
    box.appendChild(svg);
  }

  PYL.ui.cascade = { draw };
})();
