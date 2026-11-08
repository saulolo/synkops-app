// Escalado · Surfing Scaling: bloques propios del paso a paso (línea de tiempo, zonas de CPA, escalera, ventana de 3 días,
// mapa de ramas, protecciones del curso). Recibe datos y callbacks; no toca el estado de la app.
// Las sub-pestañas, la tarjeta "Pronto" y la barra de avance son las de Testeo (ui.testing.parts/soon/progress).
// Los bloques entran a ui.landing.stepDetail por ctx.tools: cada uno es (on, st) => nodo, con st = { step }.
// Lo que el usuario toca dentro de un bloque (paso de la línea de tiempo, tope, escalón) vive solo en ese bloque.
(() => {
  const PYL = globalThis.PYL;
  const { el, rich } = PYL.ui.dom;
  const C = PYL.core.scaling, T = PYL.core.testing, M = PYL.core.metrics;
  const money = (v) => '$ ' + M.copText(v);
  const stepPct = Math.round(M.NS_TEST.step * 100);

  const seg = (tag, cls, segments) => { const n = el(tag, cls); rich(n, segments); return n; };
  const DOT = { r: '🔴', y: '🟡', g: '🟢' };
  const digits = (raw) => Number(String(raw).replace(/\D/g, '')) || 0;

  // ---------- Barra de las 4 zonas del CPA ----------
  const ZONE_DEF = [
    { k: 'up', t: 'Sube' },
    { k: 'hold', t: 'Sostiene' },
    { k: 'down', t: 'Baja' },
    { k: 'off', t: 'Apaga' },
  ];
  const ZONE_NAME = Object.fromEntries(ZONE_DEF.map((z) => [z.k, z.t]));

  // z = { escala, tope, apaga } (testing.cpaZones); cpa = el CPA que se ubica sobre la barra (o null).
  function zoneBar(z, cpa) {
    const max = z.apaga * 1.25, pos = (v) => Math.min(100, (v / max) * 100) + '%';
    const w = el('div', 'es-zbar'), track = el('div', 'es-zbar-track');
    const cuts = [0, z.escala, z.tope, z.apaga, max];
    ZONE_DEF.forEach((d, i) => {
      const s = el('div', 'es-z es-z-' + d.k, d.t);
      s.dataset.zone = d.k;
      s.style.width = ((cuts[i + 1] - cuts[i]) / max) * 100 + '%';
      track.append(s);
    });
    for (const [at, name] of [[z.escala, 'escala'], [z.tope, 'tope'], [z.apaga, 'apaga']]) {
      const m = el('span', 'es-zbar-mark'), tx = el('small', null, money(at));
      m.style.left = pos(at);
      tx.append(el('em', null, name));
      m.append(tx);
      track.append(m);
    }
    if (cpa != null) {
      const pin = el('span', 'es-zbar-pin');
      pin.style.left = pos(cpa);
      pin.append(el('small', null, 'CPA ' + money(cpa)), el('i', null, '▼'));
      w.append(pin);
    }
    w.append(track);
    return w;
  }

  // ---------- Paso 1 · Cuándo empieza ----------
  function start(on, st) {
    const S = st.step.start, w = el('div', 'es-tool');
    w.append(el('h4', null, 'De un día a otro'));
    const line = el('ol', 'es-line'), note = el('div', 'es-line-note note nn');
    note.setAttribute('aria-live', 'polite');
    const pick = (k) => {
      line.querySelectorAll('.es-node').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === k)));
      line.querySelectorAll('li').forEach((li) => li.classList.toggle('on', li.dataset.k === k));
      const t = S.timeline.find((x) => x.k === k);
      note.textContent = '';
      note.append(el('b', null, t.day + ': '));
      rich(note, t.t);
    };
    S.timeline.forEach((t, i) => {
      const li = el('li', 'es-step' + (t.k === 'd2' ? ' es-go' : ''));
      li.dataset.k = t.k;
      const b = el('button', 'es-node'); b.type = 'button'; b.dataset.k = t.k;
      b.append(el('span', 'es-n', String(i + 1)), el('b', null, t.day));
      b.addEventListener('click', () => pick(t.k));
      li.append(b);
      line.append(li);
    });
    w.append(line, note);
    const src = el('div', 'es-sources');
    for (const s of S.sources) {
      const c = el('div', 'es-source');
      c.dataset.source = s.tag === 'Lab' ? 'lab' : 'curso';
      c.append(el('span', 'tag ' + (s.tag === 'Lab' ? 'tb' : 'tv'), s.tag), seg('p', null, s.t));
      src.append(c);
    }
    w.append(src);
    pick(S.timeline[0].k);
    return w;
  }

  // ---------- Paso 2 · Zonas de CPA ----------
  const ZONE_ROWS = (z) => [
    { k: 'up', t: ['CPA bajo ', { b: money(z.escala) }, ' (escala): sube un escalón.'] },
    { k: 'hold', t: ['De ', { b: money(z.escala) }, ' hasta ', { b: money(z.tope) }, ' (tope): se sostiene.'] },
    { k: 'down', t: ['Sobre ', { b: money(z.tope) }, ' y hasta ', { b: money(z.apaga) }, ': baja un escalón.'] },
    { k: 'off', t: ['Sobre ', { b: money(z.apaga) }, ' (apaga): zona de apagar. Un solo día baja; dos seguidos apagan.'] },
  ];

  function zones(on, st) {
    const ex = st.step.zones.examples, w = el('div', 'es-tool');
    w.append(el('h4', null, 'Las 4 zonas del CPA'));
    w.append(seg('p', 'small muted', [{ b: 'El tope es el CPA máximo de tu costeo' }, ': lo que puedes pagar por una venta sin perder. Cámbialo y mira cómo se mueven las zonas.']));
    const f = el('div', 'field es-tope'), lb = el('label', null, 'CPA tope'), x = el('input');
    x.id = 'es-f-tope'; x.type = 'text'; x.inputMode = 'numeric'; x.value = String(ex[0]); lb.htmlFor = x.id;
    f.append(lb, x);
    const row = el('div', 'row es-ex mt-s');
    row.append(el('span', 'small muted', 'Probar con:'));
    [['Tope genérico', ex[0]], ['Tope de un costeo', ex[1]]].forEach(([t, v]) => {
      const b = el('button', 'btn ghost sm', t + ' · ' + money(v)); b.type = 'button'; b.dataset.tope = String(v);
      b.addEventListener('click', () => { x.value = String(v); paint(); });
      row.append(b);
    });
    const out = el('div', 'es-zones'); out.id = 'es-zones'; out.setAttribute('aria-live', 'polite');
    const paint = () => {
      const t = digits(x.value);
      out.textContent = '';
      if (!(t > 0)) { out.append(el('div', 'note ny', '⚠️ El CPA tope debe ser mayor que 0')); return; }
      const z = T.cpaZones(t);
      out.append(zoneBar(z));
      const ul = el('ul', 'es-zrows');
      for (const r of ZONE_ROWS(z)) { const li = seg('li', 'es-zrow es-z-' + r.k, r.t); li.dataset.zone = r.k; ul.append(li); }
      out.append(ul);
    };
    x.addEventListener('input', paint);
    w.append(f, row, out);
    paint();
    return w;
  }

  // ---------- Paso 3 · La escalera ----------
  function ladder() {
    const L = C.scaleLadder(), max = L[L.length - 1], w = el('div', 'es-tool');
    w.append(el('h4', null, 'La escalera: ' + L.length + ' escalones'));
    const wrap = el('div', 'es-ladder'), detail = el('div', 'es-ld note nn');
    wrap.setAttribute('role', 'group'); wrap.setAttribute('aria-label', 'Escalones de presupuesto');
    detail.id = 'es-ld'; detail.setAttribute('aria-live', 'polite');
    const pick = (i) => {
      wrap.querySelectorAll('.es-ls').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.n) === i)));
      const block = C.LADDER_BLOCKS.find((b) => i >= b.from && i <= b.to);
      detail.textContent = '';
      detail.append(seg('p', 'es-ld-h', [{ b: 'N' + (i + 1) + ' · ' + money(L[i]) }, ' al día']));
      detail.append(seg('p', null, i === 0
        ? ['Escalón base: el presupuesto del testeo.']
        : [{ b: '+' + stepPct + ' %' }, ' sobre N' + i + ' (' + money(L[i - 1]) + ').']));
      detail.append(seg('p', 'small muted', ['Bloque: ', { b: block.t }]));
    };
    let n = 0;
    for (const b of C.LADDER_BLOCKS) {
      const box = el('div', 'es-lb'), steps = el('div', 'es-lsteps');
      box.append(el('b', 'es-lb-h', b.t));
      for (let i = b.from; i <= b.to; i++) {
        const s = el('button', 'es-ls'); s.type = 'button'; s.dataset.n = String(i);
        s.style.setProperty('--h', ((L[i] / max) * 100).toFixed(1) + '%');
        s.style.setProperty('--d', n++ * 45 + 'ms');
        s.append(el('i'), el('b', null, 'N' + (i + 1)), el('small', null, M.copText(L[i])));
        s.addEventListener('click', () => pick(i));
        steps.append(s);
      }
      box.append(steps);
      wrap.append(box);
    }
    w.append(wrap, detail);
    pick(0);
    return w;
  }

  // ---------- Paso 4 · La ventana de 3 días ----------
  function windowTool(on, st) {
    const win = st.step.window, z = T.cpaZones(win.tope), w = el('div', 'es-tool');
    const spend = win.days.reduce((t, d) => t + d.spend, 0), sales = win.days.reduce((t, d) => t + d.sales, 0), cpaWin = sales > 0 ? spend / sales : null;
    w.append(el('h4', null, 'Los últimos ' + win.days.length + ' días'));
    const grid = el('div', 'es-days');
    win.days.forEach((d, i) => {
      const c = el('div', 'es-day' + (i === win.days.length - 1 ? ' last' : ''));
      c.append(el('b', null, C.SCALE_DAYS[i]), el('small', null, 'Gasto'), el('span', null, money(d.spend)), el('small', null, 'Ventas'), el('span', null, String(d.sales)),
        el('small', null, 'CPA'), el('b', 'es-day-cpa', d.sales > 0 ? money(d.spend / d.sales) : '—'));
      grid.append(c);
    });
    w.append(grid);
    const zone = C.scaleZone(spend, sales, z);
    w.append(seg('p', 'es-win mt-s', ['CPA de la ventana = ', { b: money(spend) }, ' ÷ ', { b: String(sales) + ' ventas' }, ' = ', { b: cpaWin == null ? '—' : money(cpaWin) }, zone ? ' · zona: ' : '', zone ? { b: ZONE_NAME[zone] } : '']));
    if (cpaWin != null) w.append(zoneBar(z, cpaWin));
    w.append(seg('p', 'small muted', ['Con el tope de ', { b: money(win.tope) }, ' (el genérico).']));
    return w;
  }

  // ---------- Mapa de ramas (pasos 5, 6 y 7) ----------
  // items = elementos de SCALE_MAP; cada fila lleva data-branch para iluminarla con light().
  function mapList(items, lit) {
    const w = el('div', 'es-map');
    let group = null, box = null;
    for (const br of items) {
      if (br.group !== group) { group = br.group; box = el('div', 'es-grp'); box.append(el('b', 'es-grp-h', group)); w.append(box); }
      const row = el('div', 'es-br es-' + br.light + (lit === br.id ? ' es-on' : ''));
      row.dataset.branch = br.id;
      row.append(el('span', 'es-dot', DOT[br.light]), el('span', 'es-cond', br.cond.join(' ')), el('span', 'es-arrow', '→'), seg('span', 'es-t', br.t));
      if (br.dura) row.append(el('span', 'tag tn es-dura', 'Regla dura'));
      if (br.source === 'curso') row.append(el('span', 'tag tv es-src', 'Regla del curso'));
      box.append(row);
    }
    return w;
  }

  // Ilumina en el mapa la rama indicada (id de scaleVerdict/scaleGuard) y apaga las demás.
  function light(root, branch) {
    root.querySelectorAll('[data-branch]').forEach((n) => n.classList.toggle('es-on', n.dataset.branch === branch));
  }

  function rules() {
    const w = el('div', 'es-tool');
    w.append(el('h4', null, 'Todas las salidas del día'), el('p', 'small muted', 'Se evalúan en este orden: regla dura, excepción de un solo día, día flojo y zona de la ventana.'));
    const order = ['Regla dura', 'Día malo', 'Zona de la ventana'];
    const items = C.SCALE_MAP.filter((m) => m.source === 'lab').sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
    w.append(mapList(items, null));
    return w;
  }

  // ---------- Paso 6 · Protección durante el día ----------
  function guard() {
    const w = el('div', 'es-tool');
    w.append(el('h4', null, 'Dos reglas del curso'));
    const grid = el('div', 'es-guards');
    for (const g of C.SCALE_GUARDS) {
      const c = el('div', 'es-guard');
      c.dataset.guard = g.k;
      const hd = el('div', 'row between');
      hd.append(el('h5', null, g.t), el('span', 'tag tv', 'Regla del curso'));
      c.append(hd, seg('p', null, g.p), mapList(C.SCALE_MAP.filter((m) => m.group === g.t), null));
      grid.append(c);
    }
    w.append(grid, seg('p', 'small muted mt-s', ['Los montos salen de ', { b: 'escala' }, ' (1 CPA = ' + money(C.SCALE_GUARDS[0].amount) + '; ' + C.SCALE_RULES.dawnCpa + ' CPA = ' + money(C.SCALE_GUARDS[1].amount) + ' con el tope genérico). Estas reglas protegen durante el día; la decisión de cada día la sigue dando la ventana.']));
    return w;
  }

  // ---------- Paso 7 · Simulacro ----------
  const MODES = [{ k: 'practice', t: '🎯 Práctica' }, { k: 'free', t: '🎛️ Juega con los números' }];
  const LADDER = C.scaleLadder();
  const lv = (i) => 'N' + (i + 1) + ' · ' + money(LADDER[i]);
  const stat = (label, value) => { const s = el('div', 'es-stat'); s.append(el('small', null, label), el('b', null, value)); return s; };
  const cpaTxt = (c) => (c == null ? '—' : money(c));
  const zonesTxt = (z) => ['Zonas: escala ', { b: money(z.escala) }, ' · tope ', { b: money(z.tope) }, ' · apaga ', { b: money(z.apaga) }];

  // Escalón nuevo que deja un veredicto: de dónde a dónde, o que se apaga.
  const moveTxt = (r) => (r.to == null
    ? [{ b: 'Se apaga el conjunto' }, '.']
    : r.to === r.from ? ['Se queda en ', { b: lv(r.to) }, '.'] : ['Pasa de ', { b: lv(r.from) }, ' a ', { b: lv(r.to) }, '.']);

  // Las columnas de los días: gasto, ventas, pagos iniciados y CPA (la última es ayer).
  function daysGrid(days) {
    const names = C.SCALE_DAYS.slice(-days.length), grid = el('div', 'es-days');
    days.forEach((d, i) => {
      const c = el('div', 'es-day' + (i === days.length - 1 ? ' last' : ''));
      c.append(el('b', null, names[i]), el('small', null, 'Gasto'), el('span', null, money(d.spend)), el('small', null, 'Ventas'), el('span', null, String(d.sales)),
        el('small', null, 'Pagos iniciados'), el('span', null, String(d.pi)), el('small', null, 'CPA'), el('b', 'es-day-cpa', cpaTxt(d.cpa)));
      grid.append(c);
    });
    return grid;
  }

  // El momento del día de las protecciones del curso.
  function momentTxt(g) {
    return g.kind === 'raise'
      ? ['Acabas de subir el presupuesto. Desde entonces el conjunto gastó ', { b: money(g.spend) }, ' con ', { b: String(g.sales) }, ' ventas nuevas.']
      : ['El día amaneció mal: el conjunto ya gastó ', { b: money(g.spend) }, ' con ', { b: String(g.sales) }, ' ventas hoy.'];
  }

  // Práctica. v = core.scaling.scalePracticeView(run) (+ best); on = { decide(k), next, again }.
  function practice(node, v, on) {
    node.textContent = '';
    if (v.over) { practiceEnd(node, v, on); return; }
    const head = el('div', 'es-pr-head row between');
    head.append(seg('b', null, ['Caso ', { b: v.n + ' de ' + v.of }, ' · ' + v.name]), el('span', 'small muted', `Aciertos ${v.score.hits} de ${v.score.total} decisiones`));
    node.append(head, seg('p', 'es-pr-lv', ['Escalón actual: ', { b: lv(v.level) }, ' · tope ', { b: money(v.tope) }]), seg('p', 'small muted', zonesTxt(v.zones)));
    if (v.days) node.append(daysGrid(v.days));
    else node.append(seg('p', 'es-moment', momentTxt(v.guard)), (() => { const s = el('div', 'es-stats'); s.append(stat('Gasto', money(v.guard.spend)), stat('Ventas', String(v.guard.sales)), stat('CPA', cpaTxt(v.guard.cpa))); return s; })());
    node.append(el('p', 'es-pr-q', '¿Qué hago con este conjunto?'));
    const decs = el('div', 'es-decs');
    for (const a of C.SCALE_ACTIONS) {
      const d = el('button', 'btn ghost es-dec'); d.type = 'button'; d.dataset.action = a.k;
      d.append(el('span', null, a.icon + ' '), el('b', null, a.t));
      if (v.last) {
        d.disabled = true;
        if (a.k === v.last.correct.k) d.classList.add('es-right');
        else if (a.k === v.last.chosen.k) d.classList.add('es-wrong');
      } else d.addEventListener('click', () => on.decide(a.k));
      decs.append(d);
    }
    node.append(decs);
    if (v.last) node.append(feedback(v, on));
  }

  // Después de decidir: acierto o fallo, qué dice el Lab (o la regla del curso) y por qué, y el escalón nuevo.
  function feedback(v, on) {
    const r = v.verdict, L = v.last, w = el('div', 'es-fb es-' + (L.ok ? 'g' : 'r'));
    w.id = 'es-fb';
    w.append(el('b', 'es-fb-h', L.ok ? '✅ ¡Acertaste!' : '❌ No era esa'));
    if (!L.ok) w.append(seg('p', 'small', ['Elegiste ', { b: L.chosen.icon + ' ' + L.chosen.t }, '; tocaba ', { b: L.correct.icon + ' ' + L.correct.t }, '.']));
    const who = r.source === 'curso' ? 'Así lo dice la regla del curso: ' : 'Así lo califica el Lab de NovaSociety: ';
    w.append(seg('p', null, [who, { b: r.veredicto }, '. ', ...r.detalle]));
    w.append(seg('p', 'small muted', ['Los números que deciden: ', ...r.senales]));
    w.append(seg('p', 'small', moveTxt(r)));
    if (r.source === 'curso') w.append(el('span', 'tag tv', 'Regla del curso'));
    if (v.days) w.append(zoneBar(v.zones, r.cpaWin));
    const row = el('div', 'row mt-s');
    const nx = el('button', 'btn sm', v.lastCase ? 'Ver el resultado →' : 'Siguiente caso →'); nx.type = 'button'; nx.id = 'es-next';
    nx.addEventListener('click', on.next);
    row.append(nx);
    w.append(row);
    return w;
  }

  // Fin de la ronda: aciertos / decisiones y el mejor puntaje.
  function practiceEnd(node, v, on) {
    const w = el('div', 'es-ex es-' + (v.score.pct >= 70 ? 'g' : 'y'));
    w.id = 'es-end';
    w.append(el('small', 'es-ex-h', 'Ronda terminada'));
    w.append(seg('p', 'es-ex-v', [{ b: `${v.score.hits} de ${v.score.total} decisiones acertadas` }, ` (${v.score.pct} %)`]));
    w.append(el('p', 'small', 'Mejor puntaje: ' + (v.best == null ? '—' : v.best + ' %') + (v.best != null && v.score.pct >= v.best ? ' 🏆' : '')));
    const again = el('button', 'btn sm mt-s', 'Otra ronda'); again.type = 'button'; again.id = 'es-again';
    again.addEventListener('click', on.again);
    w.append(again);
    node.append(w);
  }

  // "Juega con los números": campos editables. Cada cambio avisa con on.free(campo, texto) y la app repinta lo derivado
  // con freeOut (sin rehacer los campos, para no perder el foco). Campos: level, tope y d<i>.spend|sales|pi.
  function free(node, st, on) {
    node.textContent = '';
    node.append(el('p', 'small muted', 'Cambio el escalón, el tope y los 3 días, y veo qué decide el Lab. Es para aprender: no es una campaña real.'));
    const field = (id, label, value, hint) => {
      const f = el('div', 'field'), lb = el('label', null, label), x = el('input');
      x.id = 'es-f-' + id; x.type = 'text'; x.inputMode = 'numeric'; x.value = String(value); lb.htmlFor = x.id;
      x.addEventListener('input', () => on.free(id, x.value));
      f.append(lb, x);
      if (hint) f.append(el('span', 'hint', hint));
      return f;
    };
    const top = el('div', 'es-free-top');
    const lf = el('div', 'field'), ll = el('label', null, 'Escalón actual'), sel = el('select');
    sel.id = 'es-f-level'; ll.htmlFor = sel.id;
    LADDER.forEach((_, i) => { const o = el('option', null, lv(i)); o.value = String(i); if (i === st.level) o.selected = true; sel.append(o); });
    sel.addEventListener('change', () => on.free('level', sel.value));
    lf.append(ll, sel);
    const tf = field('tope', 'CPA tope', st.tope, 'El CPA máximo de tu costeo.');
    const zn = el('div', 'es-zones small muted'); zn.id = 'es-zones';
    tf.append(zn);
    top.append(lf, tf);
    const cols = el('div', 'es-free-days');
    st.days.forEach((d, i) => {
      const c = el('div', 'es-day' + (i === st.days.length - 1 ? ' last' : ''));
      c.append(el('b', null, C.SCALE_DAYS.slice(-st.days.length)[i]));
      c.append(field('d' + i + '-spend', 'Gasto', d.spend), field('d' + i + '-sales', 'Ventas', d.sales), field('d' + i + '-pi', 'Pagos iniciados', d.pi));
      const cp = el('div', 'es-free-cpa'); cp.dataset.cpa = String(i);
      c.append(cp);
      cols.append(c);
    });
    const out = el('div', 'es-free-out'); out.id = 'es-free-out'; out.setAttribute('aria-live', 'polite');
    node.append(top, cols, out);
  }

  // Pinta lo que se deriva de los números (v = core.scaling.scaleFree): zonas, CPA de cada día y de la ventana, zona,
  // veredicto o aviso y escalón nuevo.
  function freeOut(node, v) {
    const zn = node.querySelector('#es-zones');
    zn.textContent = '';
    if (v.zones) rich(zn, zonesTxt(v.zones));
    node.querySelectorAll('[data-cpa]').forEach((n) => { n.textContent = 'CPA ' + cpaTxt(v.cpas[Number(n.dataset.cpa)]); });
    const out = node.querySelector('#es-free-out');
    out.textContent = '';
    const r = v.verdict, st = el('div', 'es-stats');
    if (v.err) out.append(el('div', 'note ny', '⚠️ ' + v.err));
    else {
      const card = el('div', 'es-ex es-' + r.light);
      card.append(el('small', 'es-ex-h', 'Así lo califica el Lab de NovaSociety'));
      const vr = el('p', 'es-ex-v');
      vr.append(el('span', null, C.SCALE_ACTIONS.find((a) => a.k === r.action).icon + ' '), el('b', null, r.toca), el('span', null, ' · ' + r.veredicto));
      card.append(vr, seg('p', 'small', r.detalle), seg('p', 'small muted', ['Los números que deciden: ', ...r.senales]), seg('p', 'small', moveTxt(r)));
      out.append(card);
    }
    st.append(
      stat('CPA de la ventana', cpaTxt(v.cpaWin)),
      stat('Zona', v.zone ? ZONE_NAME[v.zone] : '—'),
      stat('Escalón actual', v.budget == null ? '—' : money(v.budget)),
      stat('Escalón nuevo', !v.verdict ? '—' : v.verdict.to == null ? 'Apagado' : money(v.verdict.budget)),
    );
    out.append(st);
    if (v.zones && v.cpaWin != null) out.append(zoneBar(v.zones, v.cpaWin));
  }

  // Paso 7: el mapa de decisiones y el simulacro con dos modos. st = { step, mode, free }; on.mode(k) cambia de modo
  // y on.free(campo, texto) edita un número. En Práctica el panel lo pinta la app con practice() (cada decisión lo repinta
  // sin rehacer el paso).
  function map() {
    const w = el('div', 'es-tool');
    w.append(el('h4', null, 'Mapa de decisiones'), mapList(C.SCALE_MAP, null));
    return w;
  }
  function sim(on, st) {
    const w = el('div', 'es-tool'); w.id = 'es-sim';
    w.append(el('h4', null, 'Simulacro'));
    const modes = el('div', 'seg'); modes.id = 'es-modes'; modes.setAttribute('role', 'group'); modes.setAttribute('aria-label', 'Modo del simulacro');
    for (const m of MODES) {
      const b = el('button', null, m.t); b.type = 'button'; b.dataset.mode = m.k; b.setAttribute('aria-pressed', String(m.k === st.mode));
      b.addEventListener('click', () => on.mode(m.k));
      modes.append(b);
    }
    const panel = el('div', 'es-mode mt-s'); panel.id = 'es-mode';
    if (st.mode === 'free') free(panel, st.free, on);
    w.append(modes, panel);
    return w;
  }

  const TOOLS = { start, zones, ladder, window: windowTool, rules, guard, map, sim };

  PYL.ui.scaling = { TOOLS, zoneBar, mapList, light, practice, free, freeOut };
})();
