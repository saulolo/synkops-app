// Encabezado con veredicto, tarjetas KPI (semáforo, tooltip, cambio vs. periodo anterior y tendencia),
// proyección de pedidos en ruta e historia ejecutiva con opciones para compartirla.
(() => {
  const PYL = globalThis.PYL;
  const { $, rich, chip } = PYL.ui.dom;
  const { nf, fmt, short } = PYL.core.format;
  const { periodLabel } = PYL.core.dates;
  const { verdict, kpis } = PYL.core.diagnostics;
  const { projectedVsPrevious } = PYL.core.insights;
  const tooltip = PYL.ui.tooltip;
  const { toast } = PYL.ui.feedback;

  // Explicación de cada tarjeta, enlazada por data-tip en index.html.
  const TIPS = {
    util: { h: '💰 Utilidad neta real', p: 'El dinero líquido final que queda en mi bolsillo tras restar del recaudo en Dropi los costos de producto, fletes de entregas, fletes de devoluciones y toda la publicidad de Meta Ads.' },
    margen: { h: '📊 Margen neto real', p: 'Qué porcentaje de cada $100 pesos cobrados en efectivo se convirtió en ganancia limpia. Meta saludable en NovaSociety: 15% a 20%.' },
    efect: { h: '🚚 Efectividad de entrega', p: 'De los paquetes que salieron a carretera con guía y ya cerraron ciclo, qué porcentaje cobró la transportadora con éxito. Meta Nova: 70% a 75%+.' },
    roas: { h: '📈 ROAS real (cobrado / ads)', p: 'Cuántos pesos en EFECTIVO cobrado me devolvió cada $1 peso invertido en anuncios. Si mi ROAS real es menor al "Equilibrio", estoy perdiendo dinero.' },
    cpa: { h: '🎯 CPA real por entrega', p: 'Cuánto dinero en publicidad tuviste que gastar para lograr que 1 cliente reciba y pague en mano. Si supera el "Máximo sostenible", cada entrega pierde dinero.' },
  };

  // [clave en a, formato, ¿más alto es mejor?]
  const KPIS = [['util', 'cop', true], ['margen', 'pct', true], ['efect', 'pct', true], ['roas', 'x', true], ['cpa', 'cop', false]];

  // Una sola vez al arrancar: tooltips de las etiquetas y botones de compartir.
  function init() {
    document.querySelectorAll('.kpis [data-tip]').forEach((n) => tooltip.attach(n, n.firstChild.textContent, TIPS[n.dataset.tip]));
    $('#story-copy').addEventListener('click', copyStory);
  }

  function renderHeader(a, x) {
    $('#title').textContent = `${x.producto} · ${x.periodo || 'Todo el periodo'}`;
    const v = verdict(a.util, a.fact);
    const badge = $('#verdict');
    badge.className = 'badge lg ' + v.level; badge.textContent = v.label;
    const of = (v) => fmt(a.fact ? v / a.fact : null, 'pct');
    rich($('#take'), ['De cada peso cobrado, la mercancía se lleva ', { b: of(a.merc) }, ', los fletes ', { b: of(a.fletes) },
      ' y Meta Ads ', { b: of(a.ads) }, '.']);
  }

  // Cambio frente al periodo anterior: utilidad en pesos, márgenes en puntos, ROAS en x y CPA en %.
  function deltaText(k, kind, now, before) {
    const d = now - before;
    if (k === 'cpa') return fmt(before ? d / before : null, 'pct');
    if (kind === 'cop') return (d > 0 ? '+' : '') + short(d);
    if (kind === 'pct') return (d > 0 ? '+' : '') + nf(d * 100, { maximumFractionDigits: 1 }) + ' pts';
    return (d > 0 ? '+' : '') + nf(d, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'x';
  }

  // Cambio de un KPI frente al periodo anterior: { level, text, title } o null sin base de comparación.
  function delta(k, a, prev) {
    const [, kind, up] = KPIS.find((x) => x[0] === k);
    const now = a[k], before = prev && prev.a[k];
    if (now == null || before == null || !isFinite(now) || !isFinite(before)) return null;
    const d = now - before, flat = Math.abs(d) < (kind === 'cop' ? 1 : 0.0005);
    return {
      level: flat ? '' : (d > 0) === up ? 'ok' : 'bad',
      text: `${flat ? '=' : d > 0 ? '▲' : '▼'} ${flat ? 'Igual' : deltaText(k, kind, now, before)}`,
      title: `Periodo anterior (${periodLabel(prev.from, prev.to)}): ${fmt(before, kind)}`,
    };
  }

  // prev: { from, to, a } del periodo anterior o null. weeks: semanas de core.insights.weeks.
  function renderKpis(a, prev, weeks) {
    $('#k-util').textContent = fmt(a.util, 'cop');
    $('#k-util').className = 'k-val ' + (a.util >= 0 ? '' : 'bad');
    $('#k-util-f').textContent = `Wallet ${fmt(a.wallet, 'cop')} − Ads ${fmt(a.ads, 'cop')} (${a.withIva ? 'con' : 'sin'} IVA)`;
    $('#k-margen').textContent = fmt(a.margen, 'pct');
    $('#k-efect').textContent = fmt(a.efect, 'pct');
    $('#k-efect-f').textContent = `${nf(a.ent)} entregados · ${nf(a.dev)} devueltos`;
    $('#k-roas').textContent = fmt(a.roas, 'x');
    $('#k-roas-eq').textContent = fmt(a.roasEq, 'x');
    $('#k-cpa').textContent = fmt(a.cpa, 'cop');
    $('#k-cpa-max').textContent = fmt(a.cpaMax, 'cop');

    const st = kpis(a);
    KPIS.forEach(([k]) => chip('#c-' + k, st[k]?.level, st[k]?.text));

    KPIS.forEach(([k, kind]) => {
      const node = $('#d-' + k), dl = delta(k, a, prev);
      node.className = 'delta ' + (dl ? dl.level : '');
      node.textContent = dl ? dl.text + ' vs. periodo anterior' : '';
      node.title = dl ? dl.title : '';
      if (k === 'util') renderProjectedDelta(a, prev);
      PYL.ui.trend.spark('#s-' + k, weeks.map((w) => ({ v: w.a[k], w })), kind, TIPS[k].h.replace(/^\S+\s/, ''));
    });
  }

  // Segunda línea de la tarjeta de utilidad: comparación justa contando los pedidos en ruta.
  function renderProjectedDelta(a, prev) {
    const node = $('#d-util-p'), c = projectedVsPrevious(a, prev);
    node.className = 'delta sub ' + (c ? (c.diff >= 0 ? 'ok' : 'bad') : '');
    node.textContent = c ? `${c.diff >= 0 ? '▲ +' : '▼ '}${short(c.diff)} contando ${nf(c.ruta)} en ruta` : '';
    node.title = c ? `Utilidad proyectada: ${fmt(c.now, 'cop')} frente a ${fmt(c.before, 'cop')} del periodo anterior. Compara ambos periodos como si sus pedidos en ruta se entregaran con su efectividad actual.` : '';
  }

  // p: core.insights.projection(a) o null.
  function renderProjection(p) {
    const box = $('#proj');
    box.classList.toggle('hidden', !p);
    if (!p) return;
    rich(box, ['🚚 ', { b: `${nf(p.ruta)} pedidos en ruta.` }, ' Si cierran con mi efectividad actual (', { b: fmt(p.efect, 'pct') },
      ') serían ≈', { b: nf(Math.round(p.ent)) }, ' entregas más y la utilidad pasaría a ', { b: fmt(p.util, 'cop') },
      ` (${p.extra >= 0 ? '+' : ''}${short(p.extra)}). La pauta de esos pedidos ya está pagada.`]);
    box.className = 'proj ' + (p.util >= 0 ? 'ok' : 'bad');
  }

  // story: segmentos de PYL.core.diagnostics.story.
  function renderStory(story) { rich($('#story'), story); }

  // Resumen en texto plano (para WhatsApp o correo) a partir de lo que muestra el tablero.
  function shareText() {
    const t = (s) => $(s).textContent.trim();
    const lines = [t('#title'), t('#verdict'), ''];
    document.querySelectorAll('.kpis .card').forEach((c) => {
      const chipTxt = c.querySelector('.chip').textContent;
      lines.push(`• ${c.querySelector('[data-tip]').firstChild.textContent}: ${c.querySelector('.k-val').textContent}${chipTxt ? ` (${chipTxt})` : ''}`);
    });
    lines.push('', t('#story'));
    if (!$('#proj').classList.contains('hidden')) lines.push('', t('#proj'));
    return lines.join('\n');
  }

  async function copyStory() {
    const text = shareText();
    if (!(await PYL.ui.dom.copy(text))) { toast('No pude copiar el resumen. El navegador bloqueó el portapapeles.', 'error'); return; }
    toast('Resumen copiado: pégalo en WhatsApp o en un correo.', 'ok');
  }

  PYL.ui.summary = { init, renderHeader, renderKpis, renderProjection, renderStory, TIPS, delta };
})();
