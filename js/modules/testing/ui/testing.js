// Testeo: sub-pestañas, tarjeta "Pronto" y los bloques propios del paso a paso (barra de gasto, tarjetas de corte,
// caja del tope, cadena, mapa de los 3 cortes). Recibe datos y callbacks; no toca el estado.
// Los bloques entran a ui.landing.stepDetail por ctx.tools: cada uno es (on, st) => nodo, con st = { step }.
(() => {
  const PYL = globalThis.PYL;
  const { el, rich } = PYL.ui.dom;
  const C = PYL.core.testing;
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
      if (p.disabled) { b.disabled = true; b.title = 'Pronto'; }
      b.dataset.part = p.k;
      b.setAttribute('aria-pressed', String(p.k === current));
      b.addEventListener('click', () => onPick(p.k));
      node.append(b);
    }
  }

  // Parte que todavía no está lista: qué traerá.
  function soon(node, s) {
    node.textContent = '';
    const w = el('div', 'ts-soon');
    const ul = el('ul', 'ts-soon-list');
    for (const it of s.items) { const li = el('li'); rich(li, it); ul.append(li); }
    w.append(el('span', 'ts-soon-ic', s.icon), el('span', 'tag tn', 'Pronto'), el('h3', 'st-h mt-s', s.h), el('p', 'muted', s.d), ul);
    node.append(w);
  }

  // ---------- Barra de gasto acumulado ----------
  // bar.marks = [{ at, label, end? }]; spend = lo gastado (el relleno). Una marca "end" es el fin del día.
  function bar(b, spend) {
    const w = el('div', 'ts-bar'), track = el('div', 'ts-bar-track'), fill = el('i', 'ts-bar-fill');
    fill.style.width = Math.min(100, (spend / b.max) * 100) + '%';
    track.append(fill);
    for (const m of b.marks) {
      const pos = (m.at / b.max) * 100;
      const tick = el('span', 'ts-bar-mark' + (m.end ? ' end' : ''));
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
    const card = el('div', 'ts-cut');
    card.dataset.cut = String(def.cut);
    card.append(el('h4', 'ts-cut-h', def.head), el('p', 'small ts-cut-look', 'Miro: ' + def.look));
    let group = null, box = card;
    for (const br of def.branches) {
      if (br.group && br.group !== group) { group = br.group; box = el('div', 'ts-grp'); box.append(el('b', 'ts-grp-h', group)); card.append(box); }
      const row = el('div', 'ts-br ts-' + br.light + (lit === br.id ? ' ts-on' : ''));
      row.dataset.branch = br.id;
      row.append(el('span', 'ts-dot', DOT[br.light]), seg('span', 'ts-cond', br.cond), el('span', 'ts-arrow', '→'), seg('span', 'ts-t', br.t));
      const vd = el('span', 'ts-vd' + (br.own ? ' ts-own' : ''), (br.badgeIcon || ICON[br.verdict.action]) + ' ' + br.badge);
      if (br.tip) PYL.ui.tooltip.attach(vd, br.tip.h, br.tip); // regla propia: la aclaración sale al pasar el mouse
      row.append(vd);
      box.append(row);
    }
    return card;
  }

  // Los tres cortes juntos (paso 6): en cada tarjeta se ilumina la rama del caso, si hay.
  function cuts(lit) {
    const w = el('div', 'ts-cuts');
    for (const d of C.TEST_CUTS) w.append(cut(d, lit));
    return w;
  }

  // ---------- Caja "¿De dónde sale el tope?" ----------
  function tope(examples) {
    const w = el('div', 'ts-tope note nn');
    w.append(el('h4', null, '¿De dónde sale el tope?'));
    w.append(seg('p', null, [{ b: 'El tope es el CPA máximo de tu costeo' }, '. De él salen dos zonas que se usan al escalar; en el testeo solo cuenta el tope.']));
    const ul = el('ul', 'ts-tope-list');
    for (const t of examples) {
      const z = C.cpaZones(t);
      ul.append(seg('li', null, ['Tope ', { b: money(z.tope) }, ' → escala ', { b: money(z.escala) }, ' (tope × ' + String(C.CPA_ZONES.escala).replace('.', ',') + ') · apaga ', { b: money(z.apaga) }, ' (tope × 4/3)']));
    }
    w.append(ul);
    return w;
  }

  // ---------- Cadena: qué revisar si se apagó ----------
  function chain() {
    const H = C.TEST_CHAIN, w = el('div', 'ts-chain');
    const fl = el('div', 'ts-flow');
    H.flow.forEach((n, i) => { if (i) fl.append(el('span', 'ts-flow-a', '→')); fl.append(el('span', 'ts-flow-n', n)); });
    w.append(fl);
    const list = el('div', 'ts-reads');
    H.reads.forEach((r) => {
      const c = el('div', 'ts-read');
      c.dataset.read = r.k;
      const w1 = seg('p', 'ts-read-w', r.when), f1 = seg('p', 'ts-read-f', r.fix);
      w1.prepend(el('span', 'ts-pill si', 'Si'));
      f1.prepend(el('span', 'ts-pill fix', 'Solución'));
      c.append(w1, f1);
      list.append(c);
    });
    const donts = el('div', 'ts-donts');
    donts.append(el('h4', 'ts-donts-h', 'Lo que no hago'));
    H.donts.forEach((d) => {
      const c = el('div', 'ts-dont');
      c.append(el('span', 'ts-dont-ic', d.icon), seg('p', null, [{ b: d.b }, ...d.p]));
      donts.append(c);
    });
    w.append(list, donts);
    return w;
  }

  // ---------- Simulacro ----------
  const MODES = [{ k: 'practice', t: '🎯 Práctica' }, { k: 'free', t: '🎛️ Juega con los números' }];

  // Ilumina en el mapa de los 3 cortes la rama indicada (id de testVerdict) y apaga las demás.
  function light(root, branch) {
    root.querySelectorAll('.ts-cuts [data-branch]').forEach((n) => n.classList.toggle('ts-on', n.dataset.branch === branch));
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

  const stat = (label, value) => { const s = el('div', 'ts-stat'); s.append(el('small', null, label), el('b', null, value)); return s; };

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
      const card = el('div', 'ts-ex ts-' + (r.light || 'w'));
      card.append(el('small', 'ts-ex-h', r.cut ? 'Así lo califica el Lab de NovaSociety' : 'Todavía no hay corte'));
      const vr = el('p', 'ts-ex-v');
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
  // v = core.testing.practiceView(run) (+ best); on = { advance, decide(k), next, again, seeStep(n) }.
  // anim: la barra parte del corte anterior y se llena hasta el corte nuevo (con prefers-reduced-motion salta sin animar).
  function practice(node, v, on, anim) {
    node.textContent = '';
    if (v.over) { practiceEnd(node, v, on); return; }
    const head = el('div', 'ts-pr-head row between');
    head.append(seg('b', null, ['Caso ', { b: v.n + ' de ' + v.of }, ' · ' + v.name]), el('span', 'small muted', `Aciertos ${v.score.hits} de ${v.score.total} decisiones`));
    node.append(head);

    const b = bar(v.bar, v.shown && anim ? v.from : v.shown ? v.to : v.from), fill = b.querySelector('.ts-bar-fill');
    fill.dataset.spend = String(v.shown ? v.to : v.from);
    if (v.shown && anim) {
      const go = () => { fill.style.width = Math.min(100, (v.to / v.bar.max) * 100) + '%'; };
      (globalThis.requestAnimationFrame || ((f) => setTimeout(f, 16)))(() => (globalThis.requestAnimationFrame || ((f) => setTimeout(f, 16)))(go));
    }
    node.append(b);

    if (!v.shown) {
      const row = el('div', 'row mt-s');
      const btn = el('button', 'btn sm', 'Avanzar hasta el corte ' + v.cutN + ' →'); btn.type = 'button'; btn.id = 'ts-adv';
      btn.addEventListener('click', on.advance);
      row.append(btn, el('span', 'small muted', 'Dejo correr el conjunto sin tocarlo.'));
      node.append(row);
      return;
    }

    const st = el('div', 'ts-stats');
    st.append(stat('Gasto', money(v.point.spend)), stat('Pagos iniciados', String(v.point.pi)), stat('Ventas', String(v.point.sales)),
      stat('CPPI', v.point.cppi == null ? '—' : money(v.point.cppi)), stat('CPA', v.point.cpa == null ? '—' : money(v.point.cpa)),
      stat('CPM', money(v.cpm)), stat('Tope', money(v.tope)));
    node.append(st, el('p', 'ts-pr-q', '¿Qué hago con este conjunto?'));
    const decs = el('div', 'ts-decs');
    for (const a of C.TEST_ACTIONS) {
      const d = el('button', 'btn ghost ts-dec'); d.type = 'button'; d.dataset.action = a.k;
      d.append(el('span', null, a.icon + ' '), el('b', null, a.t));
      if (v.last) {
        d.disabled = true;
        if (a.k === v.last.correct.k) d.classList.add('ts-right');
        else if (a.k === v.last.chosen.k) d.classList.add('ts-wrong');
      } else d.addEventListener('click', () => on.decide(a.k));
      decs.append(d);
    }
    node.append(decs);
    if (v.last) node.append(feedback(v, on));
  }

  // Después de decidir: acierto o fallo, qué dice el Lab y por qué, "Ver el paso" y cómo sigue.
  function feedback(v, on) {
    const r = v.verdict, L = v.last, w = el('div', 'ts-fb ts-' + (L.ok ? 'g' : 'r'));
    w.id = 'ts-fb';
    w.append(el('b', 'ts-fb-h', L.ok ? '✅ ¡Acertaste!' : '❌ No era esa'));
    if (!L.ok) w.append(seg('p', 'small', ['Elegiste ', { b: L.chosen.icon + ' ' + L.chosen.t }, '; tocaba ', { b: L.correct.icon + ' ' + L.correct.t }, '.']));
    w.append(seg('p', null, ['Así lo califica el Lab de NovaSociety: ', { b: r.veredicto }, '. ', ...r.detalle]));
    w.append(seg('p', 'small muted', ['Los números que deciden: ', ...r.senales]));
    if (v.note) w.append(seg('p', 'small', ['💡 ', ...v.note]));
    const row = el('div', 'row mt-s');
    const see = el('button', 'btn ghost sm', 'Ver el paso'); see.type = 'button'; see.id = 'ts-see';
    see.addEventListener('click', () => on.seeStep(r.step));
    const nx = el('button', 'btn sm', v.ends ? (v.lastCase ? 'Ver el resultado →' : 'Siguiente caso →') : 'Siguiente corte →'); nx.type = 'button'; nx.id = 'ts-next';
    nx.addEventListener('click', on.next);
    row.append(see, nx);
    w.append(row);
    return w;
  }

  // Fin de la ronda: aciertos / decisiones y el mejor puntaje.
  function practiceEnd(node, v, on) {
    const w = el('div', 'ts-ex ts-' + (v.score.pct >= 70 ? 'g' : 'y'));
    w.id = 'ts-end';
    w.append(el('small', 'ts-ex-h', 'Ronda terminada'));
    w.append(seg('p', 'ts-ex-v', [{ b: `${v.score.hits} de ${v.score.total} decisiones acertadas` }, ` (${v.score.pct} %)`]));
    w.append(el('p', 'small', 'Mejor puntaje: ' + (v.best == null ? '—' : v.best + ' %') + (v.best != null && v.score.pct >= v.best ? ' 🏆' : '')));
    const again = el('button', 'btn sm mt-s', 'Otra ronda'); again.type = 'button'; again.id = 'ts-again';
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
      const w = el('div', 'ts-tool');
      w.append(el('h4', null, 'Gasto acumulado de un día'), bar(st.step.bar, st.step.bar.max),
        el('p', 'small muted', 'Los tres cortes caen el mismo día: el día 1.'));
      return w;
    },
    cut: (on, st) => {
      const w = el('div', 'ts-tool'), d = C.TEST_CUTS.find((x) => x.cut === st.step.cut);
      w.append(cut(d, null)); // sin fila iluminada: cada fila ya dice su veredicto
      return w;
    },
    tope: (on, st) => tope(st.step.tope.examples),
    chain,
    cuts: () => cuts(null),
    // Simulacro con dos modos. st = { step, mode, free }; on.mode(k) cambia de modo y on.free(k, texto) edita un número.
    sim: (on, st) => {
      const w = el('div', 'ts-tool'); w.id = 'ts-sim';
      w.append(el('h4', null, 'Simulacro'));
      const seg2 = el('div', 'seg'); seg2.id = 'ts-modes'; seg2.setAttribute('role', 'group'); seg2.setAttribute('aria-label', 'Modo del simulacro');
      for (const m of MODES) {
        const b = el('button', null, m.t); b.type = 'button'; b.dataset.mode = m.k; b.setAttribute('aria-pressed', String(m.k === st.mode));
        b.addEventListener('click', () => on.mode(m.k));
        seg2.append(b);
      }
      const panel = el('div', 'ts-mode mt-s'); panel.id = 'ts-mode';
      if (st.mode === 'free') free(panel, st.free, on);
      // En Práctica el panel lo pinta la app con ui.testing.practice (cada decisión lo repinta sin rehacer el paso).
      w.append(seg2, panel);
      return w;
    },
  };

  PYL.ui.testing = { parts, soon, progress, light, free, freeOut, practice, bar, cut, cuts, tope, chain, TOOLS };
})();
