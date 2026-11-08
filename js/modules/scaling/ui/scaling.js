// Escalado: sub-pestañas, tarjeta "Pronto" y los bloques propios del paso a paso (barra de gasto, tarjetas de corte,
// caja del tope, cadena, mapa de los 3 cortes). Recibe datos y callbacks; no toca el estado.
// Los bloques entran a ui.landing.stepDetail por ctx.tools: cada uno es (on, st) => nodo, con st = { step }.
(() => {
  const PYL = globalThis.PYL;
  const { el, rich } = PYL.ui.dom;
  const C = PYL.core.scaling;
  const copText = PYL.core.metrics.copText;
  const money = (v) => '$ ' + copText(v);

  const seg = (tag, cls, segments) => { const n = el(tag, cls); rich(n, segments); return n; };
  const DOT = { r: '🔴', y: '🟡', g: '🟢' };
  const ICON = Object.fromEntries(C.TEST_ACTIONS.map((a) => [a.k, a.icon]));

  // Sub-pestañas como las de Desarrollo (#d-parts): un botón por parte, la abierta con aria-pressed.
  function parts(node, list, current, onPick) {
    node.textContent = '';
    for (const p of list) {
      const b = el('button', null, p.t);
      b.type = 'button';
      b.dataset.part = p.k;
      b.setAttribute('aria-pressed', String(p.k === current));
      b.addEventListener('click', () => onPick(p.k));
      node.append(b);
    }
  }

  // Parte que todavía no está lista: qué traerá.
  function soon(node, s) {
    node.textContent = '';
    const w = el('div', 'es-soon');
    const ul = el('ul', 'es-soon-list');
    for (const it of s.items) { const li = el('li'); rich(li, it); ul.append(li); }
    w.append(el('span', 'es-soon-ic', s.icon), el('span', 'tag tn', 'Pronto'), el('h3', 'st-h mt-s', s.h), el('p', 'muted', s.d), ul);
    node.append(w);
  }

  // ---------- Barra de gasto acumulado ----------
  // bar.marks = [{ at, label, end? }]; spend = lo gastado (el relleno). Una marca "end" es el fin del día.
  function bar(b, spend) {
    const w = el('div', 'es-bar'), track = el('div', 'es-bar-track'), fill = el('i', 'es-bar-fill');
    fill.style.width = Math.min(100, (spend / b.max) * 100) + '%';
    track.append(fill);
    for (const m of b.marks) {
      const pos = (m.at / b.max) * 100;
      const tick = el('span', 'es-bar-mark' + (m.end ? ' end' : ''));
      tick.style.left = pos + '%';
      const tx = el('small', null, m.label);
      if (m.end) tx.append(el('em', null, m.end));
      tick.append(tx);
      track.append(tick);
    }
    w.append(track);
    return w;
  }

  // ---------- Tarjeta de un corte ----------
  // def = un elemento de TEST_CUTS; on = rama que se ilumina (id de testVerdict) o null.
  function cut(def, lit) {
    const card = el('div', 'es-cut');
    card.dataset.cut = String(def.cut);
    card.append(el('h4', 'es-cut-h', def.head), el('p', 'small es-cut-look', 'Miro: ' + def.look));
    let group = null, box = card;
    for (const br of def.branches) {
      if (br.group && br.group !== group) { group = br.group; box = el('div', 'es-grp'); box.append(el('b', 'es-grp-h', group)); card.append(box); }
      const row = el('div', 'es-br es-' + br.light + (lit === br.id ? ' es-on' : ''));
      row.dataset.branch = br.id;
      row.append(el('span', 'es-dot', DOT[br.light]), seg('span', 'es-cond', br.cond), el('span', 'es-arrow', '→'), seg('span', 'es-t', br.t));
      if (br.own) row.append(el('span', 'tag tn es-own', 'Regla propia'));
      box.append(row);
    }
    return card;
  }

  // Los tres cortes juntos (paso 6): en cada tarjeta se ilumina la rama del caso, si hay.
  function cuts(lit) {
    const w = el('div', 'es-cuts');
    for (const d of C.TEST_CUTS) w.append(cut(d, lit));
    return w;
  }

  // Mini-ejemplo resuelto: lo califica testVerdict con el tope de la práctica.
  function example(e) {
    const r = C.testVerdict({ ...e, tope: C.TEST_PRACTICE.tope });
    const w = el('div', 'es-ex es-' + r.light);
    w.append(el('small', 'es-ex-h', 'Así lo califica el Lab de NovaSociety'));
    const nums = `Gasto ${money(e.spend)} · ${e.pi} pagos iniciados · ${e.sales} ventas`;
    w.append(el('p', 'es-ex-n', nums));
    const v = el('p', 'es-ex-v');
    v.append(el('span', null, ICON[r.action] + ' '), el('b', null, r.toca), el('span', null, ' · ' + r.veredicto));
    w.append(v, seg('p', 'small', r.detalle), seg('p', 'small muted', ['Los números que deciden: ', ...r.senales]));
    return w;
  }

  // ---------- Caja "¿De dónde sale el tope?" ----------
  function tope(examples) {
    const w = el('div', 'es-tope note nn');
    w.append(el('h4', null, '¿De dónde sale el tope?'));
    w.append(seg('p', null, [{ b: 'El tope es el CPA máximo de tu costeo' }, '. De él salen dos zonas que se usan al escalar; en el testeo solo cuenta el tope.']));
    const ul = el('ul', 'es-tope-list');
    for (const t of examples) {
      const z = C.cpaZones(t);
      ul.append(seg('li', null, ['Tope ', { b: money(z.tope) }, ' → escala ', { b: money(z.escala) }, ' (tope × ' + String(C.CPA_ZONES.escala).replace('.', ',') + ') · apaga ', { b: money(z.apaga) }, ' (tope × 4/3)']));
    }
    w.append(ul);
    return w;
  }

  // ---------- Cadena: qué revisar si se apagó ----------
  function chain() {
    const H = C.TEST_CHAIN, w = el('div', 'es-chain');
    const fl = el('div', 'es-flow');
    H.flow.forEach((n, i) => { if (i) fl.append(el('span', 'es-flow-a', '→')); fl.append(el('span', 'es-flow-n', n)); });
    w.append(fl, seg('p', 'small es-ctr', H.ctr));
    const list = el('div', 'es-reads');
    H.reads.forEach((r) => {
      const c = el('div', 'es-read');
      c.dataset.read = r.k;
      c.append(seg('p', 'es-read-w', ['Si: ', ...r.when]), seg('p', 'es-read-f', [{ b: 'Solución: ' }, ...r.fix]));
      list.append(c);
    });
    w.append(list, seg('div', 'note ny mt-s', ['⚠️ ', ...H.note]));
    return w;
  }

  // ---------- Simulacro ----------
  const MODES = [{ k: 'practice', t: '🎯 Práctica' }, { k: 'free', t: '🎛️ Juega con los números' }];

  // Ilumina en el mapa de los 3 cortes la rama indicada (id de testVerdict) y apaga las demás.
  function light(root, branch) {
    root.querySelectorAll('.es-cuts [data-branch]').forEach((n) => n.classList.toggle('es-on', n.dataset.branch === branch));
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
      const f = el('div', 'field'), lb = el('label', null, label), x = input(k, 'es-f-' + k);
      lb.htmlFor = x.id;
      x.addEventListener('input', () => on.free(k, x.value));
      f.append(lb, x);
      if (extra) f.append(extra);
      f.append(el('span', 'hint', hint));
      return f;
    };
    const grid = el('div', 'es-free-grid');
    grid.append(field('daily', ...FIELDS[0].slice(1)));

    // Gasto acumulado: deslizador y número, siempre iguales.
    const sf = el('div', 'field es-spend'), sl = el('label', null, 'Gasto acumulado'), sx = input('spend', 'es-f-spend'), sr = el('input');
    sl.htmlFor = sx.id;
    sr.type = 'range'; sr.id = 'es-f-spend-r'; sr.min = '0'; sr.step = '1000'; sr.value = String(st.spend); sr.setAttribute('aria-label', 'Gasto acumulado');
    sx.addEventListener('input', () => { sr.value = sx.value.replace(/\D/g, '') || '0'; on.free('spend', sx.value); });
    sr.addEventListener('input', () => { sx.value = sr.value; on.free('spend', sr.value); });
    sf.append(sl, sx, sr, el('span', 'hint', 'Lo que lleva gastado el conjunto.'));
    grid.append(sf, field('pi', ...FIELDS[1].slice(1)), field('sales', ...FIELDS[2].slice(1)));
    const zones = el('div', 'es-zones small muted'); zones.id = 'es-zones';
    grid.append(field('tope', FIELDS[3][1], FIELDS[3][2], zones));
    const bar = el('div', 'es-free-bar'); bar.id = 'es-free-bar';
    const out = el('div', 'es-free-out'); out.id = 'es-free-out'; out.setAttribute('aria-live', 'polite');
    node.append(grid, bar, out);
  }

  const stat = (label, value) => { const s = el('div', 'es-stat'); s.append(el('small', null, label), el('b', null, value)); return s; };

  // Pinta lo que se deriva de los números (v = core.scaling.testFree): zonas, barra, veredicto o aviso, día, CPPI y CPA.
  function freeOut(node, v, spend) {
    const z = node.querySelector('#es-zones');
    z.textContent = '';
    if (v.zones) rich(z, ['Zonas: escala ', { b: money(v.zones.escala) }, ' · apaga ', { b: money(v.zones.apaga) }]);
    const sr = node.querySelector('#es-f-spend-r');
    if (v.bar) sr.max = String(v.bar.max);
    const bx = node.querySelector('#es-free-bar');
    bx.textContent = '';
    if (v.bar) bx.append(bar(v.bar, spend));

    const out = node.querySelector('#es-free-out');
    out.textContent = '';
    const r = v.verdict, st = el('div', 'es-stats');
    if (v.err) out.append(el('div', 'note ny', '⚠️ ' + v.err));
    else {
      const card = el('div', 'es-ex es-' + (r.light || 'w'));
      card.append(el('small', 'es-ex-h', r.cut ? 'Así lo califica el Lab de NovaSociety' : 'Todavía no hay corte'));
      const vr = el('p', 'es-ex-v');
      vr.append(el('span', null, (r.action ? ICON[r.action] : '⏳') + ' '), el('b', null, r.toca), el('span', null, ' · ' + r.veredicto));
      card.append(vr, seg('p', 'small', r.detalle));
      if (r.cut) card.append(seg('p', 'small muted', ['Los números que deciden: ', ...r.senales]));
      out.append(card);
      st.append(stat('Corte alcanzado', r.cut ? 'Corte ' + r.cut + ' · ' + copText(PYL.core.metrics.NS_TEST.cuts[r.cut - 1]) : 'Antes del corte 1'));
    }
    st.append(
      stat('Día del testeo', v.day == null ? '—' : String(v.day)),
      stat('CPPI', v.cppi == null ? '—' : money(v.cppi)),
      stat('CPA', v.cpa == null ? '—' : money(v.cpa)),
    );
    out.append(st);
  }

  // ---------- Práctica ----------
  // v = core.scaling.practiceView(run) (+ best); on = { advance, decide(k), next, again, seeStep(n) }.
  // anim: la barra parte del corte anterior y se llena hasta el corte nuevo (con prefers-reduced-motion salta sin animar).
  function practice(node, v, on, anim) {
    node.textContent = '';
    if (v.over) { practiceEnd(node, v, on); return; }
    const head = el('div', 'es-pr-head row between');
    head.append(seg('b', null, ['Caso ', { b: v.n + ' de ' + v.of }, ' · ' + v.name]), el('span', 'small muted', `Aciertos ${v.score.hits} de ${v.score.total} decisiones`));
    node.append(head);

    const b = bar(v.bar, v.shown && anim ? v.from : v.shown ? v.to : v.from), fill = b.querySelector('.es-bar-fill');
    fill.dataset.spend = String(v.shown ? v.to : v.from);
    if (v.shown && anim) {
      const go = () => { fill.style.width = Math.min(100, (v.to / v.bar.max) * 100) + '%'; };
      (globalThis.requestAnimationFrame || ((f) => setTimeout(f, 16)))(() => (globalThis.requestAnimationFrame || ((f) => setTimeout(f, 16)))(go));
    }
    node.append(b);

    if (!v.shown) {
      const row = el('div', 'row mt-s');
      const btn = el('button', 'btn sm', 'Avanzar hasta el corte ' + v.cutN + ' →'); btn.type = 'button'; btn.id = 'es-adv';
      btn.addEventListener('click', on.advance);
      row.append(btn, el('span', 'small muted', 'Dejo correr el conjunto sin tocarlo.'));
      node.append(row);
      return;
    }

    const st = el('div', 'es-stats');
    st.append(stat('Gasto', money(v.point.spend)), stat('Pagos iniciados', String(v.point.pi)), stat('Ventas', String(v.point.sales)),
      stat('CPPI', v.point.cppi == null ? '—' : money(v.point.cppi)), stat('CPA', v.point.cpa == null ? '—' : money(v.point.cpa)));
    node.append(st, el('p', 'es-pr-q', '¿Qué hago con este conjunto?'));
    const decs = el('div', 'es-decs');
    for (const a of C.TEST_ACTIONS) {
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

  // Después de decidir: acierto o fallo, qué dice el Lab y por qué, "Ver el paso" y cómo sigue.
  function feedback(v, on) {
    const r = v.verdict, L = v.last, w = el('div', 'es-fb es-' + (L.ok ? 'g' : 'r'));
    w.id = 'es-fb';
    w.append(el('b', 'es-fb-h', L.ok ? '✅ ¡Acertaste!' : '❌ No era esa'));
    if (!L.ok) w.append(seg('p', 'small', ['Elegiste ', { b: L.chosen.icon + ' ' + L.chosen.t }, '; tocaba ', { b: L.correct.icon + ' ' + L.correct.t }, '.']));
    w.append(seg('p', null, ['Así lo califica el Lab de NovaSociety: ', { b: r.veredicto }, '. ', ...r.detalle]));
    w.append(seg('p', 'small muted', ['Los números que deciden: ', ...r.senales]));
    const row = el('div', 'row mt-s');
    const see = el('button', 'btn ghost sm', 'Ver el paso'); see.type = 'button'; see.id = 'es-see';
    see.addEventListener('click', () => on.seeStep(r.step));
    const nx = el('button', 'btn sm', v.ends ? (v.lastCase ? 'Ver el resultado →' : 'Siguiente caso →') : 'Siguiente corte →'); nx.type = 'button'; nx.id = 'es-next';
    nx.addEventListener('click', on.next);
    row.append(see, nx);
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

  // Barra de avance de los pasos hechos (mismas clases que ui.landing.progress, pero con su propio texto).
  function progress(node, prog, onReset) {
    node.textContent = '';
    const b = el('div', 'b-bar'), fill = el('i');
    fill.style.width = (prog.steps.length ? (prog.stepsDone / prog.steps.length) * 100 : 0) + '%';
    b.append(fill);
    node.append(b, el('span', 'small', prog.stepsDone + ' de ' + prog.steps.length + ' pasos hechos'));
    if (prog.stepsDone) {
      const r = el('button', 'btn ghost sm', 'Empezar de nuevo'); r.type = 'button';
      r.title = 'Desmarca todos los pasos';
      r.addEventListener('click', onReset);
      node.append(r);
    }
  }

  // Bloques para stepDetail (ctx.tools). st = { step }.
  const TOOLS = {
    bar: (on, st) => {
      const w = el('div', 'es-tool');
      w.append(el('h4', null, 'Gasto acumulado de un día'), bar(st.step.bar, st.step.bar.max),
        el('p', 'small muted', 'Los tres cortes caen el mismo día: el día 1.'));
      return w;
    },
    cut: (on, st) => {
      const w = el('div', 'es-tool'), d = C.TEST_CUTS.find((x) => x.cut === st.step.cut);
      const r = C.testVerdict({ ...st.step.example, tope: C.TEST_PRACTICE.tope });
      w.append(cut(d, r.branch), example(st.step.example));
      return w;
    },
    tope: (on, st) => tope(st.step.tope.examples),
    chain,
    cuts: () => cuts(null),
    // Simulacro con dos modos. st = { step, mode, free }; on.mode(k) cambia de modo y on.free(k, texto) edita un número.
    sim: (on, st) => {
      const w = el('div', 'es-tool'); w.id = 'es-sim';
      w.append(el('h4', null, 'Simulacro'));
      const seg2 = el('div', 'seg'); seg2.id = 'es-modes'; seg2.setAttribute('role', 'group'); seg2.setAttribute('aria-label', 'Modo del simulacro');
      for (const m of MODES) {
        const b = el('button', null, m.t); b.type = 'button'; b.dataset.mode = m.k; b.setAttribute('aria-pressed', String(m.k === st.mode));
        b.addEventListener('click', () => on.mode(m.k));
        seg2.append(b);
      }
      const panel = el('div', 'es-mode mt-s'); panel.id = 'es-mode';
      if (st.mode === 'free') free(panel, st.free, on);
      // En Práctica el panel lo pinta la app con ui.scaling.practice (cada decisión lo repinta sin rehacer el paso).
      w.append(seg2, panel);
      return w;
    },
  };

  PYL.ui.scaling = { parts, soon, progress, light, free, freeOut, practice, bar, cut, cuts, example, tope, chain, TOOLS };
})();
