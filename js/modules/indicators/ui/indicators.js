// Franja de indicadores de Inicio (SPEC 22): pinta las 4 tarjetas. Recibe datos por parámetro; no guarda estado.
// Barras y medidores son decorativos (aria-hidden): el dato va en texto visible y en el aria-label de cada botón.
// El valor de cada barra va en la variable --ix-v (0–1); los números llevan data-to/data-kind para el conteo animado.
(() => {
  const PYL = globalThis.PYL;

  const TITLES = { pnl: 'Mini P&L', funnel: 'Embudo de productos', testing: 'Testeo', tasks: 'Pulso de tareas' };
  const INVITE = {
    pnl: 'Sube tus reportes en el Tablero P&L',
    funnel: 'Guarda tu primer candidato',
    testing: 'Practica en Testeo o conecta Meta',
    tasks: 'Anota tu primera tarea',
  };

  // Íconos del embudo: el nombre viene de STATUS (core.search) y se pinta con el set propio (SPEC 24).
  const icon = (name) => PYL.ui.icons.el(name || '', 15, 'ix-ico ic-solo');

  const el = (tag, cls, text) => PYL.ui.dom.el(tag, cls, text);
  const fmt = (v, k) => PYL.core.format.fmt(v, k);
  const clamp01 = (n) => Math.max(0, Math.min(1, n));
  const bar = (v, tone) => {
    const b = el('span', `ix-fill${tone ? ` ix-${tone}` : ''}`);
    b.style.setProperty('--ix-v', String(clamp01(v)));
    return b;
  };
  const track = (v, tone, mark) => {
    const t = el('span', 'ix-track');
    t.setAttribute('aria-hidden', 'true');
    t.append(bar(v, tone));
    if (mark != null) { const m = el('span', 'ix-mark'); m.style.left = `${clamp01(mark) * 100}%`; t.append(m); }
    return t;
  };
  // Número que sube de 0 a su valor (lo anima app/indicators.js): `kind` = formato de fmt ('cop', 'pct', 'x') o 'int'.
  const num = (cls, value, kind) => {
    const n = el('span', cls, kind === 'int' ? String(value) : fmt(value, kind));
    n.dataset.to = String(value);
    n.dataset.kind = kind;
    return n;
  };
  // tone = 'g' | 'y' | 'r' (semáforo) o null (neutra).
  const chip = (label, node, tone) => { const c = el('span', `ix-chip${tone ? ` ix-${tone}` : ''}`); c.append(el('span', 'ix-chip-l', label), node); return c; };
  const orNaN = (v) => (v == null ? NaN : v);

  const pnl = (d) => {
    const body = el('span', 'ix-body');
    const mLine = el('span', 'ix-line');
    mLine.append('Margen ', num('ix-strong', orNaN(d.margen), 'pct'));
    const chips = el('span', 'ix-chips');
    chips.append(chip('ROAS', num('ix-strong', orNaN(d.roas), 'x'), d.roasLevel), chip('Efectividad', num('ix-strong', orNaN(d.efect), 'pct'), d.efectLevel));
    body.append(num(`ix-big ix-t-${d.tone}`, d.util, 'cop'), track(d.marginFill, d.level, d.marginMark), mLine, chips, el('span', 'ix-sub', d.label));
    return { body, tone: d.tone, aria: `Mini P&L: utilidad ${fmt(d.util, 'cop')}, margen ${fmt(d.margen, 'pct')}, ROAS ${fmt(d.roas, 'x')}, efectividad ${fmt(d.efect, 'pct')}. ${d.label}` };
  };

  // Color de cada etapa: pendiente (amarillo), en prueba (naranja), vendiendo (verde) y ganador (el acento).
  const FUNNEL_TONE = { evaluando: 'y', testeo: 'o', activo: 'g', ganador: 'b' };

  const funnel = (d) => {
    const body = el('span', 'ix-body');
    const rows = el('span', 'ix-rows');
    for (const r of d.rows) {
      const row = el('span', 'ix-row');
      row.dataset.k = r.k;
      row.dataset.tone = FUNNEL_TONE[r.k] || 'b';
      const name = el('span', 'ix-row-t');
      name.append(icon(r.icon), r.t);
      row.append(name, track(r.pct / 100, FUNNEL_TONE[r.k] || 'b'), num('ix-strong ix-row-n', r.n, 'int'));
      rows.append(row);
    }
    const foot = el('span', 'ix-chips');
    foot.append(chip('', el('span', 'ix-strong', `${d.dropped} descartado${d.dropped === 1 ? '' : 's'}`), d.dropped ? 'r' : null), chip('', el('span', 'ix-strong', `${d.total} en la bitácora`), null));
    body.append(rows, foot);
    return { body, aria: `Embudo de productos: ${d.rows.map((r) => `${r.n} ${r.t.toLowerCase()}`).join(', ')}; ${d.dropped} descartados.` };
  };

  // Testeo en dos bloques: Práctica (mejor puntaje) y En Meta (escalera de cortes con su color de alerta y los conjuntos activos).
  // d = ixTesting; cutText = «Corte 30K · C2» ya armado por quien llama (null = sin corte); labels = ['20K', '30K', '40K'].
  const testing = (d, cutText, labels = []) => {
    const body = el('span', 'ix-body');
    const hasBest = d.best != null;

    const practice = el('span', 'ix-sec');
    const big = el('span', hasBest ? 'ix-big' : 'ix-big ix-t-n');
    if (hasBest) big.append(num('', d.best, 'int'), '%'); else big.append('—');
    big.append(el('small', 'ix-unit', hasBest ? ' mejor puntaje' : ' sin práctica aún'));
    practice.append(el('span', 'ix-sec-h', 'Práctica'), big, track(hasBest ? d.best / 100 : 0, 'b'));

    const meta = el('span', 'ix-sec');
    meta.append(el('span', 'ix-sec-h', 'En Meta'));
    if (labels.length > 1) {
      const steps = el('span', 'ix-steps');
      steps.setAttribute('aria-hidden', 'true');
      steps.style.setProperty('--ix-half', `${50 / labels.length}%`);
      const rail = el('span', 'ix-rail');
      rail.append(bar(d.cut > 0 ? d.cut / (labels.length - 1) : 0));
      steps.append(rail);
      labels.forEach((l, i) => {
        const s = el('span', `ix-step ix-s${i}${i <= d.cut ? ' ix-on' : ''}${i === d.cut ? ' ix-cur' : ''}`);
        s.append(el('span', 'ix-dot'), el('span', 'ix-step-l', l));
        steps.append(s);
      });
      meta.append(steps);
    }
    const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
    if (cutText) {
      const line = el('span', 'ix-line');
      line.append(el('span', 'ix-strong', cutText), ` · ${plural(d.active, 'conjunto')} ${d.active === 1 ? 'activo' : 'activos'}`);
      meta.append(line);
    } else meta.append(el('span', 'ix-sub', d.active > 0 ? `Aún sin corte · ${plural(d.active, 'conjunto')} ${d.active === 1 ? 'activo' : 'activos'}` : 'Meta sin dato de cortes'));

    body.append(practice, el('span', 'ix-sep'), meta);
    return { body, aria: `Testeo: ${hasBest ? `mejor puntaje ${d.best} %` : 'sin práctica aún'}${cutText ? `; ${cutText}, ${plural(d.active, 'conjunto')} ${d.active === 1 ? 'activo' : 'activos'}` : ''}.` };
  };

  // Pulso de tareas: solo el avance de hoy, en un anillo que se rellena con el porcentaje al centro. d = ixTasks.
  const tasks = (d) => {
    const body = el('span', 'ix-body ix-center');
    const pct = d.total ? Math.round((d.done / d.total) * 100) : 0;
    const ring = el('span', 'ix-ring');
    ring.setAttribute('aria-hidden', 'true');
    ring.innerHTML = '<svg viewBox="0 0 100 100" focusable="false"><defs><linearGradient id="ixg-ring" gradientUnits="userSpaceOnUse" x1="10" y1="10" x2="90" y2="90"><stop offset="0" style="stop-color:var(--b)"/><stop offset="1" style="stop-color:var(--b2)"/></linearGradient></defs><circle class="ix-ring-bg" cx="50" cy="50" r="40" fill="none" stroke-width="9"/><circle class="ix-ring-fill" cx="50" cy="50" r="40" fill="none" stroke="url(#ixg-ring)" stroke-width="9" stroke-linecap="round" pathLength="100" stroke-dasharray="100" transform="rotate(-90 50 50)"/></svg>'; // constante propia, sin datos del usuario; stroke como atributo: una url(#…) en una hoja externa puede no resolverse con file://
    const fill = ring.querySelector('.ix-ring-fill');
    fill.style.strokeDashoffset = String(100 - pct);
    if (pct === 100) fill.classList.add('ix-done');
    const mid = el('span', 'ix-ring-c');
    mid.append(num('ix-ring-n', pct, 'int'), el('span', 'ix-ring-p', '%'));
    ring.append(mid);
    const sub = pct === 100 ? '¡Todo hecho por hoy!' : `${d.total - d.done} por hacer`;
    const line = el('span', 'ix-line ix-center-t');
    line.append(num('ix-strong', d.done, 'int'), ` de ${d.total} hechas hoy`);
    body.append(ring, line, el('span', 'ix-sub ix-center-t', sub));
    return { body, tone: pct === 100 ? 'g' : 'b', aria: `Pulso de tareas: ${d.done} de ${d.total} hechas hoy, ${pct} % completado.` };
  };

  // Una tarjeta: <button> con título, flecha y cuerpo. built = { body, aria } o null (vacía: atenuada, con invitación).
  const card = (k, built) => {
    const b = el('button', `card card-side ix-card ix-tone-${built && built.tone ? built.tone : 'b'}${built ? '' : ' ix-empty'}`);
    b.type = 'button';
    b.dataset.k = k;
    const go = el('span', 'ix-go', '→');
    go.setAttribute('aria-hidden', 'true');
    const top = el('span', 'ix-top');
    top.append(el('span', 'ix-title', TITLES[k]), go);
    b.append(top);
    if (built) { b.append(built.body); b.setAttribute('aria-label', built.aria); }
    else {
      const body = el('span', 'ix-body');
      body.append(el('span', 'ix-invite', INVITE[k]));
      b.append(body);
      b.setAttribute('aria-label', `${TITLES[k]}: ${INVITE[k]}`);
    }
    return b;
  };

  // root = #ix-root; v = { pnl, funnel, testing, cutText, tasks } (salidas de core.indicators; null/undefined = vacía).
  const strip = (root, v) => {
    const testingOn = v.testing && (v.testing.best != null || v.testing.cut >= 0);
    const tasksOn = v.tasks && v.tasks.total > 0; // solo cuenta hoy
    root.replaceChildren(
      card('pnl', v.pnl ? pnl(v.pnl) : null),
      card('funnel', v.funnel ? funnel(v.funnel) : null),
      card('testing', testingOn ? testing(v.testing, v.cutText, v.cutLabels) : null),
      card('tasks', tasksOn ? tasks(v.tasks) : null),
    );
  };

  PYL.ui.indicators = { TITLES, INVITE, strip, card };
})();
