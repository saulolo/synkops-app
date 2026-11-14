// Testeo · Simulador: encabezado, modos (Cadena / Números a mano) y mapa de los 3 cortes, más "Números a mano"
// (campos editables y su salida, el antiguo "Juega con los números"). Recibe datos y callbacks; no toca el estado.
// Comparte el namespace con el simulador del tablero P&L (ui/simulator.js de pnl): se suma sin pisar su `draw`.
(() => {
  const PYL = globalThis.PYL;
  const { el, rich } = PYL.ui.dom;
  const T = PYL.ui.testing;
  const { seg, stat, money, ICON, bar } = T;
  const copText = PYL.core.metrics.copText;

  const MODES = [{ k: 'chain', t: '🔗 Cadena' }, { k: 'manual', t: '🎛️ Números a mano' }];

  // Armazón del Simulador: título, línea de ayuda, selector de modos (#ts-sx-modes) y panel (#ts-sx-panel).
  // st = { mode }; on.mode(k) cambia de modo. El panel y el mapa los llena la app según el modo.
  function shell(node, st, on) {
    node.textContent = '';
    node.append(el('h3', 'st-h', 'Simulador de testeo'),
      el('p', 'muted', 'Configuro la cadena y veo qué decide el Lab en cada corte. Es para aprender: no es una campaña real.'));
    const modes = el('div', 'seg'); modes.id = 'ts-sx-modes'; modes.setAttribute('role', 'group'); modes.setAttribute('aria-label', 'Modo del simulador');
    for (const m of MODES) {
      const b = el('button', null, m.t); b.type = 'button'; b.dataset.mode = m.k; b.setAttribute('aria-pressed', String(m.k === st.mode));
      b.addEventListener('click', () => on.mode(m.k));
      modes.append(b);
    }
    const panel = el('div', 'ts-mode mt-s'); panel.id = 'ts-sx-panel';
    node.append(modes, panel);
  }

  // Tarjeta del veredicto de testVerdict (la usan "Números a mano" y el modo Cadena).
  function verdictCard(r, head) {
    const card = el('div', 'ts-ex ts-' + (r.light || 'w'));
    if (r.branch) card.dataset.branch = r.branch; // la rama del veredicto (las pruebas la leen de aquí)
    card.append(el('small', 'ts-ex-h', head || (r.cut ? 'Así lo califica el Lab de NovaSociety' : 'Todavía no hay corte')));
    const vr = el('p', 'ts-ex-v');
    vr.append(el('span', null, (r.action ? ICON[r.action] : '⏳') + ' '), el('b', null, r.toca), el('span', null, ' · ' + r.veredicto));
    card.append(vr, seg('p', 'small', r.detalle));
    if (r.cut) card.append(seg('p', 'small muted', ['Los números que deciden: ', ...r.senales]));
    return card;
  }

  const FIELDS = [
    ['daily', 'Presupuesto diario', 'Lo que gasta el testeo en un día.'],
    ['pi', 'Pagos iniciados', 'Acumulados hasta ahora.'],
    ['sales', 'Ventas', 'Acumuladas hasta ahora.'],
    ['tope', 'CPA tope', 'El CPA máximo de tu costeo.'],
  ];

  // "Juega con los números": campos editables. Cada cambio avisa con on.free(campo, texto) y la app repinta
  // lo derivado con freeOut (sin rehacer los campos, para no perder el foco).
  function free(node, st, on) {
    node.textContent = '';
    node.append(el('p', 'small muted', 'Cambio los números y veo qué decide el Lab en cada corte. Es para aprender: no es una campaña real.'));
    const input = (k, id) => {
      const x = el('input'); x.id = id; x.type = 'text'; x.inputMode = 'numeric'; x.value = String(st[k]);
      return x;
    };
    const field = (k, label, hint, extra) => {
      const f = el('div', 'field'), lb = el('label', null, label), x = input(k, 'ts-f-' + k);
      lb.htmlFor = x.id;
      x.addEventListener('input', () => on.free(k, x.value));
      f.append(lb, x);
      if (extra) f.append(extra);
      f.append(el('span', 'hint', hint));
      return f;
    };
    const grid = el('div', 'ts-free-grid');
    grid.append(field('daily', ...FIELDS[0].slice(1)));

    // Gasto acumulado: deslizador y número, siempre iguales.
    const sf = el('div', 'field ts-spend'), sl = el('label', null, 'Gasto acumulado'), sx = input('spend', 'ts-f-spend'), sr = el('input');
    sl.htmlFor = sx.id;
    sr.type = 'range'; sr.id = 'ts-f-spend-r'; sr.min = '0'; sr.step = '1000'; sr.value = String(st.spend); sr.setAttribute('aria-label', 'Gasto acumulado');
    sx.addEventListener('input', () => { sr.value = sx.value.replace(/\D/g, '') || '0'; on.free('spend', sx.value); });
    sr.addEventListener('input', () => { sx.value = sr.value; on.free('spend', sr.value); });
    sf.append(sl, sx, sr, el('span', 'hint', 'Lo que lleva gastado el conjunto.'));
    grid.append(sf, field('pi', ...FIELDS[1].slice(1)), field('sales', ...FIELDS[2].slice(1)));
    const zones = el('div', 'ts-zones small muted'); zones.id = 'ts-zones';
    grid.append(field('tope', FIELDS[3][1], FIELDS[3][2], zones));
    const bar = el('div', 'ts-free-bar'); bar.id = 'ts-free-bar';
    const out = el('div', 'ts-free-out'); out.id = 'ts-free-out'; out.setAttribute('aria-live', 'polite');
    node.append(grid, bar, out);
  }

  // Pinta lo que se deriva de los números (v = core.testing.testFree): zonas, barra, veredicto o aviso, día, CPPI y CPA.
  function freeOut(node, v, spend) {
    const z = node.querySelector('#ts-zones');
    z.textContent = '';
    if (v.zones) rich(z, ['Zonas: escala ', { b: money(v.zones.escala) }, ' · apaga ', { b: money(v.zones.apaga) }]);
    const sr = node.querySelector('#ts-f-spend-r');
    if (v.bar) sr.max = String(v.bar.max);
    const bx = node.querySelector('#ts-free-bar');
    bx.textContent = '';
    if (v.bar) bx.append(bar(v.bar, spend));

    const out = node.querySelector('#ts-free-out');
    out.textContent = '';
    const r = v.verdict, st = el('div', 'ts-stats');
    if (v.err) out.append(el('div', 'note ny', '⚠️ ' + v.err));
    else if (v.scaling) out.append(el('div', 'note ny', '🚀 ' + PYL.core.testing.TEST_SCALE_NOTE + ' Pasa a la pestaña Escalado.'));
    else {
      out.append(verdictCard(r));
      st.append(stat('Corte alcanzado', r.cut ? 'Corte ' + r.cut + ' · ' + copText(PYL.core.metrics.NS_TEST.cuts[r.cut - 1]) : 'Antes del corte 1'));
    }
    st.append(
      stat('Día del testeo', v.day == null ? '—' : String(v.day)),
      stat('CPPI', v.cppi == null ? '—' : money(v.cppi)),
      stat('CPA', v.cpa == null ? '—' : money(v.cpa)),
    );
    out.append(st);
  }

  // ---------- Modo Cadena ----------
  const SX = [
    ['daily', 'Presupuesto diario', 'COP que gasta el conjunto en un día.'],
    ['tope', 'CPA tope', 'El CPA máximo de tu costeo.'],
    ['cpm', 'CPM', 'Costo por mil impresiones, en COP.'],
    ['ctr', 'CTR (%)', 'Clics en el enlace ÷ impresiones. Acepta coma: 1,5.'],
    ['toPi', '% de clics que inician pago', 'De cada 100 clics, cuántos llegan a pago iniciado.'],
    ['toSale', '% de pagos iniciados que compran', 'De cada 100 pagos iniciados, cuántos compran.'],
  ];
  const PLATS = [{ k: 'meta', t: 'Meta' }, { k: 'tiktok', t: 'TikTok' }];
  const fmt = (v) => String(v).replace('.', ',');

  // Lectura "Si… / Solución…" de un eslabón roto (TEST_CHAIN.reads): k = 'cpm' | 'cpc' | 'cppi'.
  function read(k) {
    const r = PYL.core.testing.TEST_CHAIN.reads.find((x) => x.k === k), c = el('div', 'ts-read');
    c.dataset.read = r.k;
    const w1 = seg('p', 'ts-read-w', r.when), f1 = seg('p', 'ts-read-f', r.fix);
    w1.prepend(el('span', 'ts-pill si', 'Si'));
    f1.prepend(el('span', 'ts-pill fix', 'Solución'));
    c.append(w1, f1);
    return c;
  }

  // Modo Cadena: entradas (st = S.sim) con su error por campo. on = { plat(k), field(k, texto), spend(n) }.
  // Lo derivado y la salida los pinta chainOut sin rehacer los campos (no pierden el foco).
  function chain(node, st, on) {
    node.textContent = '';
    const scen = el('div', 'ts-scen'); scen.id = 'ts-sx-scen';
    scen.append(el('small', 'muted', 'Escenarios: cargan una cadena de ejemplo y una corrida nueva. Con azar puede variar; prueba otra corrida.'));
    const sb = el('div', 'row');
    for (const sc of PYL.core.simulator.SIM_SCENARIOS) {
      const b = el('button', 'btn ghost sm', sc.t); b.type = 'button'; b.dataset.scen = sc.k;
      b.addEventListener('click', () => on.scen(sc.k));
      sb.append(b);
    }
    scen.append(sb);
    const grid = el('div', 'ts-free-grid');
    const pf = el('div', 'field'), plb = el('label', null, 'Plataforma'), pseg = el('div', 'seg');
    pseg.id = 'ts-sx-f-plat'; pseg.setAttribute('role', 'group'); pseg.setAttribute('aria-label', 'Plataforma');
    for (const p of PLATS) {
      const b = el('button', null, p.t); b.type = 'button'; b.dataset.plat = p.k; b.setAttribute('aria-pressed', String(p.k === st.plat));
      b.addEventListener('click', () => on.plat(p.k));
      pseg.append(b);
    }
    pf.append(plb, pseg, el('span', 'hint', 'Solo cambia los límites del semáforo.'));
    grid.append(pf);
    for (const [k, label, hint] of SX) {
      const f = el('div', 'field'), lb = el('label', null, label), x = el('input');
      x.id = 'ts-sx-f-' + k; x.type = 'text'; x.inputMode = 'decimal'; x.value = Number.isFinite(st[k]) ? fmt(st[k]) : '';
      lb.htmlFor = x.id;
      x.addEventListener('input', () => on.field(k, x.value));
      const er = el('span', 'hint ts-err'); er.id = 'ts-sx-err-' + k;
      f.append(lb, x);
      if (k === 'tope') { const z = el('div', 'ts-zones small muted'); z.id = 'ts-sx-zones'; f.append(z); }
      f.append(er, el('span', 'hint', hint));
      grid.append(f);
    }
    const sf = el('div', 'field ts-spend'), sl = el('label', null, 'Gasto acumulado'), sr = el('input');
    sr.type = 'range'; sr.id = 'ts-sx-spend'; sr.min = '0'; sr.step = '1000'; sr.value = '0'; sl.htmlFor = sr.id;
    sr.addEventListener('input', () => on.spend(Number(sr.value)));
    sf.append(sl, sr, el('span', 'hint', 'Muevo el punto de la corrida y veo su estado.'));
    // Controles de la corrida: ▶ Correr / Continuar (alterna con ⏸ Pausa), ⏮ volver a 0 y 🎲 otra corrida.
    const ctl = el('div', 'row ts-sx-ctl');
    const btn = (id, label, fn, cls) => { const b = el('button', cls || 'btn ghost sm', label); b.type = 'button'; b.id = id; b.addEventListener('click', fn); return b; };
    ctl.append(btn('ts-sx-play', '▶ Correr', on.play, 'btn sm'), btn('ts-sx-reset', '⏮ Volver a 0', on.reset), btn('ts-sx-again', '🎲 Otra corrida', on.again));
    const der = el('div', 'ts-stats'); der.id = 'ts-sx-derived';
    const out = el('div', 'ts-free-out'); out.id = 'ts-sx-out'; out.setAttribute('aria-live', 'polite');
    const chn = el('div', 'ts-sx-chain'); chn.id = 'ts-sx-chain';
    const hist = el('div', 'ts-sx-hist'); hist.id = 'ts-sx-hist';
    node.append(scen, grid, sf, ctl, der, chn, out, hist);
  }

  // Cadena con semáforo del punto actual (simChain) y, si hay eslabón roto, su lectura Si… / Solución…
  const LINK = { cpm: 'CPM', ctr: 'CTR', cpc: 'CPC', cppi: 'CPPI', cpa: 'CPA' };
  const LIGHT_DOT = { r: '🔴', y: '🟡', g: '🟢' };
  function chainLinks(node, a) {
    const row = el('div', 'ts-flow');
    a.chain.forEach((c, i) => {
      if (i) row.append(el('span', 'ts-flow-a', '→'));
      const n = el('div', 'ts-flow-n ts-link' + (c.light ? ' ts-' + c.light : ''));
      n.dataset.link = c.k;
      const value = c.value == null ? '—' : c.k === 'ctr' ? fmt(c.value) + ' %' : money(c.value);
      n.append(el('small', null, LINK[c.k]), el('b', null, value));
      if (c.light) n.append(el('span', 'ts-dot', LIGHT_DOT[c.light]));
      if (c.ideal) n.append(el('em', 'ts-ideal', 'ideal'));
      if (c.note) n.append(el('em', 'ts-nodec', c.note));
      row.append(n);
    });
    node.append(row);
    if (a.broken) node.append(read(a.broken));
  }

  // Historial de cortes: 20K · 30K · 40K · Fin del día, con lo que dio la corrida al pasar por ahí.
  function histRow(node, hist) {
    const row = el('div', 'ts-hist');
    for (const h of hist) {
      const c = el('div', 'ts-h-c ts-' + h.state);
      c.dataset.hist = h.end ? 'end' : String(h.at);
      c.append(el('small', null, h.label));
      let t = '—';
      if (h.state === 'stopped') t = 'Apagado';
      else if (h.state === 'done') t = ICON[h.verdict.action] + ' ' + h.verdict.toca + ' · ' + h.pi + ' PI · ' + h.sales + ' ventas';
      c.append(el('span', 'ts-h-t', t));
      row.append(c);
    }
    node.append(row);
  }

  // Pinta lo derivado de la corrida. v = { err, a (simAt), spend, max, zones, stop }:
  //   err = avisos de simCheck por campo o null · a = simAt del punto actual · max = último punto · stop = corte de apagado (1–3) o null ·
  //   playing = la corrida está corriendo (el botón ▶ pasa a ⏸ Pausa).
  function chainOut(node, v) {
    for (const [k] of SX) {
      const x = node.querySelector('#ts-sx-f-' + k), e = node.querySelector('#ts-sx-err-' + k), bad = !!(v.err && v.err[k]);
      if (bad) x.setAttribute('aria-invalid', 'true'); else x.removeAttribute('aria-invalid');
      e.textContent = bad ? v.err[k] : '';
    }
    const z = node.querySelector('#ts-sx-zones');
    z.textContent = '';
    if (v.zones) rich(z, ['Zonas: escala ', { b: money(v.zones.escala) }, ' · apaga ', { b: money(v.zones.apaga) }]);
    const sr = node.querySelector('#ts-sx-spend'), play = node.querySelector('#ts-sx-play');
    sr.disabled = !!v.err;
    play.disabled = !!v.err || v.spend >= v.max;
    play.textContent = v.playing ? '⏸ Pausa' : v.spend > 0 ? 'Continuar ▶' : '▶ Correr';
    if (!v.err) { sr.max = String(v.max); sr.value = String(v.spend); }
    const der = node.querySelector('#ts-sx-derived'), out = node.querySelector('#ts-sx-out');
    const chn = node.querySelector('#ts-sx-chain'), hist = node.querySelector('#ts-sx-hist');
    der.textContent = ''; out.textContent = ''; chn.textContent = ''; hist.textContent = '';
    if (v.err) { out.append(el('div', 'note ny', '⚠️ Revisa los campos marcados: sin números válidos no hay veredicto.')); return; }
    const a = v.a, p = a.point, val = (k) => a.chain.find((c) => c.k === k).value;
    const n = (x) => copText(Math.floor(x));
    der.append(stat('CPC', money(val('cpc'))), stat('Impresiones', n(p.impr)), stat('Clics', n(p.clicks)), stat('Pagos iniciados', String(p.pi)),
      stat('Ventas', String(p.sales)), stat('CPPI', val('cppi') == null ? '—' : money(val('cppi'))), stat('CPA', val('cpa') == null ? '—' : money(val('cpa'))));
    chainLinks(chn, a);
    histRow(hist, a.hist);
    if (v.stop) {
      const card = verdictCard(a.verdict, 'Apagado en el corte ' + v.stop);
      if (a.broken) card.append(el('p', 'small ts-ex-h', 'Qué revisar'), read(a.broken));
      out.append(card);
    } else if (a.scaling) out.append(el('div', 'note ny', '🚀 ' + PYL.core.testing.TEST_SCALE_NOTE + ' Pasa a la pestaña Escalado.'));
    else out.append(verdictCard(a.verdict));
  }

  PYL.ui.simulator = Object.assign(PYL.ui.simulator || {}, { MODES, shell, free, freeOut, chain, chainOut, read, verdictCard });

})();
