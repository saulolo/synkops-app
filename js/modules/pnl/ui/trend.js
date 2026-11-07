// Tendencia semanal en SVG: mini-líneas de las tarjetas KPI y barras de utilidad por semana.
(() => {
  const PYL = globalThis.PYL;
  const { $, el } = PYL.ui.dom;
  const { F, fmt, short } = PYL.core.format;
  const { periodLabel } = PYL.core.dates;
  const tooltip = PYL.ui.tooltip;

  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (W, H) => {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('width', '100%'); s.setAttribute('height', H); s.setAttribute('viewBox', `0 0 ${W} ${H}`);
    s.setAttribute('preserveAspectRatio', 'none');
    return s;
  };
  const add = (svg, tag, attrs, text) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text != null) n.textContent = text; svg.appendChild(n); return n; };
  const weekLabel = (w) => periodLabel(w.from, w.to) + (w.partial ? ' (parcial)' : '');

  // Mini-línea de una tarjeta. points: [{ v, w }] con w = semana; los valores nulos cortan la línea.
  // Cada semana tiene una franja invisible que muestra su valor al pasar el mouse.
  function spark(sel, points, kind, label) {
    const box = $(sel); box.textContent = '';
    if (points.filter((p) => p.v != null && isFinite(p.v)).length < 2) return;
    const W = 160, H = 30, pad = 3;
    const vs = points.map((p) => p.v).filter((v) => v != null && isFinite(v));
    const lo = Math.min(...vs), hi = Math.max(...vs), span = hi - lo || 1;
    const x = (i) => (points.length === 1 ? W / 2 : (i / (points.length - 1)) * W);
    const y = (v) => pad + ((hi - v) / span) * (H - 2 * pad);
    const svg = svgEl(W, H);
    if (lo < 0 && hi > 0) add(svg, 'line', { x1: 0, x2: W, y1: y(0), y2: y(0), stroke: '#3a4458', 'stroke-dasharray': '2 2', 'vector-effect': 'non-scaling-stroke' });
    let d = '', pen = false;
    points.forEach((p, i) => {
      if (p.v == null || !isFinite(p.v)) { pen = false; return; }
      d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1); pen = true;
    });
    add(svg, 'path', { d, fill: 'none', stroke: 'var(--accent-2)', 'stroke-width': 1.6, 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' });
    const step = W / points.length;
    points.forEach((p, i) => {
      const r = add(svg, 'rect', { x: Math.max(0, x(i) - step / 2), y: 0, width: step, height: H, fill: 'transparent' });
      r.addEventListener('mousemove', (ev) => tooltip.show(ev, [weekLabel(p.w), fmt(p.v, kind), label]));
      r.addEventListener('mouseleave', tooltip.hide);
    });
    box.appendChild(svg);
  }

  // Barras de utilidad por semana, verdes o rojas, con el detalle de la semana en el tooltip.
  function weekly(weeks) {
    const box = $('#trend'); box.textContent = '';
    if (weeks.length < 2) { box.appendChild(el('p', 'muted', 'Elige un rango de al menos dos semanas para ver la tendencia.')); return; }
    const W = Math.max(box.clientWidth, 300), H = 220, m = { t: 22, b: 40 };
    const vals = weeks.map((w) => w.a.util);
    const lo = Math.min(0, ...vals), hi = Math.max(0, ...vals) || 1;
    const y = (v) => m.t + ((hi - v) / (hi - lo || 1)) * (H - m.t - m.b);
    const step = W / weeks.length, bw = Math.min(48, step * 0.62);
    const svg = svgEl(W, H); svg.removeAttribute('preserveAspectRatio');
    add(svg, 'line', { x1: 0, x2: W, y1: y(0), y2: y(0), stroke: '#3a4458' });
    const every = Math.ceil(weeks.length / Math.max(1, Math.floor(W / 70)));
    weeks.forEach((w, i) => {
      const v = w.a.util, cx = i * step + step / 2;
      const top = y(Math.max(0, v)), h = Math.max(2, Math.abs(y(v) - y(0)));
      const r = add(svg, 'rect', { x: cx - bw / 2, y: top, width: bw, height: h, rx: 3, fill: v >= 0 ? 'var(--ok)' : 'var(--bad)', 'fill-opacity': w.partial ? 0.5 : 0.9 });
      r.addEventListener('mousemove', (ev) => tooltip.show(ev, [weekLabel(w), F.cop(v),
        `Margen ${fmt(w.a.margen, 'pct')} · ROAS ${fmt(w.a.roas, 'x')} · Efect. ${fmt(w.a.efect, 'pct')} · ${w.a.ent} entregas · ${w.a.ruta} en ruta`]));
      r.addEventListener('mouseleave', tooltip.hide);
      if (weeks.length <= 10) add(svg, 'text', { x: cx, y: v >= 0 ? top - 6 : top + h + 13, 'text-anchor': 'middle', fill: '#c9cedb', 'font-size': 11, 'font-family': 'Inter, sans-serif' }, short(v));
      if (i % every === 0) add(svg, 'text', { x: cx, y: H - 7, 'text-anchor': 'middle', fill: '#8a93a6', 'font-size': 11, 'font-family': 'Inter, sans-serif' }, periodLabel(w.from, w.from).slice(0, 6));
    });
    box.appendChild(svg);
  }

  PYL.ui.trend = { spark, weekly };
})();
