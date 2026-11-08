// Hard Metrics (pestaña del Entrenador): diagrama TikTok · ¿Cómo se logra? · Meta de las 5 métricas duras.
// Recibe datos y callbacks; no guarda estado ni escucha eventos de la app.
//   map(node, rows, on)        pinta el diagrama (estático: no sigue a los datos reales); rows = PYL.core.metrics.HARD_METRICS
//   expand(node, on)           expande o contrae el diagrama (clase hm-wide y texto del botón)
//   mark(node, k)              marca la métrica elegida (aria-pressed) en sus dos botones; k = null desmarca
//   drawArrows(node)           dibuja la llave y las flechas (SVG) sobre el mapa midiendo sus nodos; devuelve false si no hay
//                              con qué medir (vista oculta, celular o sin layout) y entonces no dibuja nada
//   arrowPaths(geom)           pura: de las medidas (geom) saca los trazos { k, d, head }; es lo que se prueba sin navegador
// on = { pick(k) } se llama al hacer clic (o Enter / Espacio) en una métrica.
// Cada fila es un .hm-row con display:contents en PC (sus celdas son celdas de la rejilla del mapa) y una tarjeta en celular.
(() => {
  const PYL = globalThis.PYL;
  const { el, rich } = PYL.ui.dom;
  const { GOALS, GENERIC_CPA, FAIL_HEAD, HARD_METRICS, copText } = PYL.core.metrics;
  const { tooltip } = PYL.ui;

  const FIRST_ROW = 6; // filas 1 cabecera, 2 título, 3 llave, 4 plataformas, 5 "Quiero que sea…"; las métricas empiezan en la 6
  const PLATS = [
    { id: 'tiktok', name: 'TikTok', side: 'l' },
    { id: 'meta', name: 'Meta', side: 'r' },
  ];

  const at = (node, row, span) => { node.style.setProperty('--r', row); if (span) node.style.setProperty('--span', span); return node; };

  // Color del número grande: el de su primera zona; sin número (CTR, CPC) va apagado.

  function dirCell(row, side) {
    const d = el('span', 'hm-dir ' + row.dir + ' ' + side, row.dir === 'up' ? 'Alta' : 'Baja');
    return d;
  }

  function nodeBtn(row, on) {
    const b = el('button', 'hm-node'); b.type = 'button'; b.dataset.k = row.k;
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', row.name + ' (' + row.tag + '): ver cómo se lee');
    b.append(el('b', null, row.name), el('small', null, row.tag));
    b.addEventListener('click', () => on.pick(row.k));
    return b;
  }

  // ---------- Popover "¿Qué significa?" (botón i junto a cada métrica) ----------
  // Es un panel aparte de los tooltips: se abre con clic, trae la explicación simple y el semáforo, y se cierra con
  // clic afuera, Esc, otro clic en la i o al mover la ventana.
  let pop = null, popBtn = null;

  function closePop() {
    if (!pop) return;
    pop.remove(); pop = null;
    if (popBtn) popBtn.setAttribute('aria-expanded', 'false');
    popBtn = null;
    document.removeEventListener('mousedown', onOutside, true);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', closePop);
    window.removeEventListener('scroll', closePop, true);
  }
  const onOutside = (e) => { if (pop && !pop.contains(e.target) && !(popBtn && popBtn.contains(e.target))) closePop(); };
  const onKey = (e) => { if (e.key === 'Escape') { const b = popBtn; closePop(); if (b) b.focus(); } };

  function popContent(row) {
    const m = row.means;
    const box = el('div', 'hm-pop m-' + row.k);
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Qué significa ' + row.name);
    const head = el('div', 'hm-pop-head');
    const x = el('button', 'hm-pop-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Cerrar');
    x.addEventListener('click', () => { const b = popBtn; closePop(); if (b) b.focus(); });
    head.append(el('span', 'hm-pop-name', row.name), el('span', 'hm-pop-full', m.full), x);
    const simple = el('p', 'hm-pop-simple', m.simple);
    const analogy = el('div', 'hm-pop-analogy');
    analogy.append(el('span', 'hm-pop-ico', '💡'), el('span', null, m.analogy));
    const sigs = el('div', 'hm-pop-sigs');
    sigs.append(el('div', 'hm-pop-h', 'Cómo leer sus señales'));
    m.signals.forEach((s, i) => {
      const r = el('div', 'hm-pop-sig z-' + s.z);
      r.style.setProperty('--d', (i * 70 + 160) + 'ms');
      const txt = el('span', 'hm-pop-sigtxt');
      txt.append(el('b', null, s.t), el('span', null, s.m));
      r.append(el('span', 'hm-pop-dot'), txt);
      sigs.append(r);
    });
    box.append(head, simple);
    // Cómo se calcula (una línea por plataforma cuando difieren, como el CTR).
    if (m.formula) {
      const f = el('div', 'hm-pop-formula');
      f.append(el('span', 'hm-pop-flbl', 'Fórmula'));
      m.formula.forEach((line) => { const p = el('p'); rich(p, line); f.append(p); });
      box.append(f);
    }
    // Nombre con que sale la métrica en el reporte de Meta y, si lo trae, cómo la cuenta cada plataforma.
    if (row.report) { const r = el('p', 'hm-pop-report', 'En el reporte de Meta: '); r.append(el('b', null, '«' + row.report + '»')); box.append(r); }
    if (m.unique) box.append(el('p', 'hm-pop-unique', m.unique));
    box.append(analogy, sigs);
    if (m.warn) box.append(el('p', 'hm-warn', '⚠ ' + m.warn));
    if (m.note) { const n = el('div', 'hm-pop-note'); n.append(el('b', null, 'Ojo · '), m.note); box.append(n); }
    return box;
  }

  function openPop(row, btn) {
    const same = popBtn === btn;
    closePop();
    if (same) return; // otro clic en la misma i la cierra
    pop = popContent(row); popBtn = btn;
    btn.setAttribute('aria-expanded', 'true');
    document.body.append(pop);
    // Debajo de la i; si no cabe, arriba. Sin salirse de la ventana por los lados.
    const r = btn.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - pw / 2), window.innerWidth - pw - 8);
    const below = r.bottom + 10 + ph <= window.innerHeight - 8;
    const top = below ? r.bottom + 10 : Math.max(8, r.top - 10 - ph);
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
    pop.style.setProperty('--ox', (r.left + r.width / 2 - left) + 'px');
    pop.classList.add(below ? 'down' : 'up');
    document.addEventListener('mousedown', onOutside, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', closePop);
    window.addEventListener('scroll', closePop, true);
  }

  // El botón de la métrica con su "i" al lado (un contenedor aparte: no se anidan botones).
  function nodeBox(row, on) {
    const box = el('div', 'hm-nodebox');
    const i = el('button', 'hm-info', 'i'); i.type = 'button';
    i.setAttribute('aria-label', 'Qué significa ' + row.name); i.setAttribute('aria-haspopup', 'dialog'); i.setAttribute('aria-expanded', 'false');
    i.addEventListener('click', () => openPop(row, i));
    box.append(nodeBtn(row, on), i);
    return box;
  }

  // Número grande y, debajo, su texto pequeño (si lo hay): salen de row.view, que es lo que dice el diagrama.
  function valCell(row, plat) {
    const j = row.view[plat.id];
    const v = el('div', 'hm-val');
    const big = el('b', 'hm-main z-g', j.main);
    if (j.tip) tooltip.attach(big, j.tip.h, j.tip); // aviso al pasar el mouse por el número (CTR: "No se mira" y, en Meta, la advertencia)
    v.append(el('span', 'hm-plat-tag', plat.name), big);
    if (j.ref) v.append(el('small', 'hm-ref', j.ref));
    return v;
  }

  // Un lado (TikTok a la izquierda, Meta a la derecha): de afuera hacia adentro, dirección · nombre · número.
  function sideCell(row, plat, on) {
    const box = el('div', 'hm-side ' + plat.side);
    const parts = [dirCell(row, plat.side), nodeBox(row, on), valCell(row, plat)];
    box.append(...(plat.side === 'l' ? parts : parts.reverse()));
    return box;
  }

  // Tabla que sale al pasar el mouse por "¿Cómo se logra?": solo la métrica de esa fila.
  function failTable(r) {
    return {
      h: r.name + ': si falla', p: null,
      table: { head: FAIL_HEAD, on: null, rows: [{ k: r.k, cells: [r.diag, r.lever] }] },
    };
  }

  function howCell(row) {
    const c = el('div', 'hm-how');
    const t = el('span'); rich(t, row.how);
    c.append(t);
    tooltip.attach(c, row.name + ': diagnóstico y solución', failTable(row));
    if (row.group === 'curiosidad') c.append(el('small', 'hm-grp', 'Despierta curiosidad'));
    return c;
  }

  function map(node, rows, on) {
    node.textContent = '';
    node.classList.add('hm-map');
    const R = rows;

    // Título y llave (la llave se dibuja aparte, en .hm-brace).
    const title = el('h2', 'hm-title');
    title.append('Las 5 métricas más ', el('span', 'hm-hl', 'importantes'));
    const brace = el('div', 'hm-brace'); brace.setAttribute('aria-hidden', 'true');
    // Cabecera del apartado: va dentro del contenedor porque habrá otro parecido para las métricas blandas.
    const intro = el('div', 'hm-intro');
    intro.append(el('h2', null, 'Métricas duras'), el('p', 'muted', 'Toca una métrica para ver cómo se lee, sus rangos, qué falla y cómo se arregla.'));
    // Botón para expandir el diagrama (también se expande con un clic en un espacio vacío de la tarjeta).
    const tg = el('button', 'hm-expand'); tg.type = 'button';
    tg.append(el('span', 'hm-expand-ico', '⤢'), el('span', 'hm-expand-txt', 'Expandir'));
    tg.setAttribute('aria-expanded', 'false');
    tg.addEventListener('click', () => on.toggle());
    intro.append(tg);
    node.append(intro, title, brace);

    // Encabezados de columna.
    const hd = (cls, main, sub) => { const h = el('div', 'hm-colhead ' + cls); h.append(el('b', null, main)); if (sub) h.append(el('small', null, sub)); return h; };
    node.append(hd('l', 'TikTok'), hd('c', '¿Cómo se logra?'), hd('r', 'Meta'));
    // "Rangos" justo sobre los números de cada lado; al pasar el mouse dice la frase de la gráfica del curso.
    const rangosTip = { h: 'Quiero que esta métrica sea lo más ( ) posible', p: 'Mira Alta o Baja junto a cada métrica: dice si la quiero lo más alta o lo más baja posible.', cls: 'hm-tip' };
    const cap = (s) => {
      const c = el('div', 'hm-cap ' + s), r = el('span', 'hm-cap-r');
      r.append(tooltip.infoLabel('Rangos', rangosTip));
      c.append(r);
      return c;
    };
    node.append(cap('l'), cap('r'));

    // Filas.
    R.forEach((row, i) => {
      const r = FIRST_ROW + i;
      const box = el('div', 'hm-row m-' + row.k); box.dataset.k = row.k;
      const goal = el('div', 'hm-goal-chip', '→ ' + GOALS[row.goal]);
      box.append(
        at(sideCell(row, PLATS[0], on), r),
        at(howCell(row), r),
        at(sideCell(row, PLATS[1], on), r),
        goal,
      );
      node.append(box);
    });

    // CPA: al pasar el mouse (o enfocar) por su número, aviso con los valores genéricos de NovaSociety.
    const G = GENERIC_CPA;
    const tip = {
      h: 'CPA genérico de NovaSociety',
      p: 'Es una referencia fija: los números del producto sin costeo.', cls: 'hm-tip',
      li: [['Sube un escalón, por debajo de', copText(G.escala), 'ok', ''], ['Se sostiene hasta (el tope)', copText(G.tope), '', ''], ['Apaga por encima de', copText(G.apaga), 'bad', '']],
    };
    node.querySelectorAll('.m-cpa .hm-val').forEach((n) => tooltip.attach(n, 'CPA', tip));

    // Destinos de las flechas exteriores: un bloque por cada tramo seguido con el mismo destino.
    for (let i = 0; i < R.length;) {
      let j = i; while (j + 1 < R.length && R[j + 1].goal === R[i].goal) j++;
      ['l', 'r'].forEach((s) => {
        const g = at(el('div', 'hm-goal ' + s + ' g-' + R[i].goal, GOALS[R[i].goal]), FIRST_ROW + i, j - i + 1);
        g.dataset.ks = R.slice(i, j + 1).map((r) => r.k).join(','); // filas que llegan a este destino (lo usa drawArrows)
        node.append(g);
      });
      i = j + 1;
    }

    // Marca "Despierta curiosidad": una vez, en el límite entre las dos primeras filas que la comparten.
    const grp = R.map((r, i) => (r.group ? i : -1)).filter((i) => i >= 0);
    if (grp.length > 1) node.append(at(el('div', 'hm-spark', 'Despierta curiosidad'), FIRST_ROW + grp[1]));
  }

  // Expande o contrae el diagrama (solo se nota en pantallas anchas): cambia la clase y el botón.
  function expand(node, on) {
    node.classList.toggle('hm-wide', on);
    const b = node.querySelector('.hm-expand');
    if (!b) return;
    b.setAttribute('aria-expanded', String(on));
    b.querySelector('.hm-expand-ico').textContent = on ? '⤡' : '⤢';
    b.querySelector('.hm-expand-txt').textContent = on ? 'Contraer' : 'Expandir';
  }

  function mark(node, k) {
    node.querySelectorAll('.hm-node').forEach((b) => {
      const on = b.dataset.k === k;
      b.setAttribute('aria-pressed', String(on));
      b.closest('.hm-row').classList.toggle('sel', on);
    });
  }

  /* ---------- Flechas y llave ---------- */
  // Medidas (en px, relativas al mapa) que necesita arrowPaths:
  //   brace = { cx, y0, y1, tx: [xTikTok, xMeta] }  desde debajo del título hasta encima de los encabezados
  //   rows  = [{ k, y, l: { dir, node, val, how }, r: { dir, node, val, how } }]
  //           dir/node/val = [x0, x1]; how = x del borde de "¿Cómo se logra?" que mira a ese lado
  //   goals = [{ side: 'l' | 'r', ks: [k...], x, y }]  x = borde del destino que mira al mapa, y = su centro
  const GAP = 4;        // aire entre una flecha y el nodo que toca
  const MIN_LEN = 10;   // una flecha más corta que esto no se dibuja
  const num = (n) => Math.round(n * 10) / 10;

  // Línea recta horizontal de x0 a x1 con la punta en x1.
  function hline(k, y, x0, x1) {
    if (Math.abs(x1 - x0) < MIN_LEN) return null;
    return { k, d: `M${num(x0)} ${num(y)}H${num(x1)}`, head: { x: x1, y, to: x1 > x0 ? 'r' : 'l' } };
  }

  function arrowPaths(g) {
    const out = [];
    // Llave del título: sale del centro y baja, con la punta hacia TikTok (izquierda) y Meta (derecha).
    g.brace.tx.forEach((tx) => {
      const { cx, y0, y1 } = g.brace;
      // Sale del centro hacia abajo, se abre hacia su plataforma y llega bajando recto (la punta mira hacia abajo).
      const h = y1 - y0, dx = tx - cx;
      out.push({ k: 'brace', d: `M${num(cx)} ${num(y0)}C${num(cx)} ${num(y0 + h * 0.4)} ${num(cx + dx * 0.2)} ${num(y0 + h * 0.5)} ${num(cx + dx * 0.5)} ${num(y0 + h * 0.5)}S${num(tx)} ${num(y0 + h * 0.6)} ${num(tx)} ${num(y1)}`, head: { x: tx, y: y1, to: 'd' } });
    });

    g.rows.forEach((r) => {
      [['l', -1], ['r', 1]].forEach(([s, sign]) => {
        const c = r[s];
        // Hacia afuera (dirección) y hacia adentro (número, y de ahí a "¿Cómo se logra?").
        const outer = sign < 0 ? [c.node[0] - GAP, c.dir[1] + GAP] : [c.node[1] + GAP, c.dir[0] - GAP];
        const inner = sign < 0 ? [c.node[1] + GAP, c.val[0] - GAP] : [c.node[0] - GAP, c.val[1] + GAP];
        const toHow = sign < 0 ? [c.val[1] + GAP, c.how - GAP] : [c.val[0] - GAP, c.how + GAP];
        [outer, inner, toHow].forEach(([a, b]) => { const p = hline(r.k, r.y, a, b); if (p) out.push(p); });
      });
    });

    // De cada dirección al destino: las curvas llegan juntas y comparten una sola punta.
    g.goals.forEach((go) => {
      const sign = go.side === 'l' ? -1 : 1;
      go.ks.forEach((k) => {
        const r = g.rows.find((x) => x.k === k);
        const dir = r[go.side].dir;
        const sx = sign < 0 ? dir[0] - GAP : dir[1] + GAP;
        const ex = go.x - sign * 9; // la curva termina un poco antes: ahí empieza la punta
        if (Math.abs(sx - go.x) < MIN_LEN) return;
        const c = Math.abs(sx - ex) * 0.55;
        out.push({ k, d: `M${num(sx)} ${num(r.y)}C${num(sx + sign * c)} ${num(r.y)} ${num(ex - sign * c)} ${num(go.y)} ${num(ex)} ${num(go.y)}`, head: null });
      });
      out.push({ k: 'goal', d: '', head: { x: go.x, y: go.y, to: go.side === 'l' ? 'l' : 'r' }, ks: go.ks });
    });
    return out.filter((p) => p.d || p.head);
  }

  // Punta de flecha (triángulo de 8 px) en (x, y) mirando hacia 'l' | 'r' | 'd'.
  function headPath({ x, y, to }) {
    const t = {
      r: [[-8, -4], [-8, 4]], l: [[8, -4], [8, 4]], d: [[-5, -10], [5, -10]],
    }[to];
    return `M${num(x)} ${num(y)}l${t[0][0]} ${t[0][1]}L${num(x + t[1][0])} ${num(y + t[1][1])}z`;
  }

  // Mide los nodos del mapa y los devuelve en el formato de arrowPaths; null si no hay con qué medir.
  function measure(node) {
    const mr = node.getBoundingClientRect();
    const first = node.querySelector('.hm-row');
    if (!first || !mr.width || !mr.height || getComputedStyle(first).display !== 'contents') return null;
    const ox = mr.left + node.clientLeft, oy = mr.top + node.clientTop;
    const R = (e) => { const b = e.getBoundingClientRect(); return { x0: b.left - ox, x1: b.right - ox, y0: b.top - oy, y1: b.bottom - oy, cx: (b.left + b.right) / 2 - ox, cy: (b.top + b.bottom) / 2 - oy }; };
    const xs = (e) => { const b = R(e); return [b.x0, b.x1]; };

    const title = R(node.querySelector('.hm-title'));
    const hl = R(node.querySelector('.hm-colhead.l b')), hr = R(node.querySelector('.hm-colhead.r b'));
    const brace = { cx: title.cx, y0: title.y1 + 2, y1: Math.min(hl.y0, hr.y0) - 6, tx: [hl.cx, hr.cx] };

    const rows = [...node.querySelectorAll('.hm-row')].map((row) => {
      const side = (s) => {
        const q = row.querySelector('.hm-side.' + s);
        return { dir: xs(q.querySelector('.hm-dir')), node: xs(q.querySelector('.hm-node')), val: xs(q.querySelector('.hm-val')), how: 0 };
      };
      const how = R(row.querySelector('.hm-how')), l = side('l'), r = side('r');
      l.how = how.x0; r.how = how.x1;
      return { k: row.dataset.k, y: R(row.querySelector('.hm-side.l .hm-node')).cy, l, r };
    });

    const goals = [...node.querySelectorAll('.hm-goal')].map((go) => {
      const b = R(go), s = go.classList.contains('l') ? 'l' : 'r';
      return { side: s, ks: go.dataset.ks.split(','), x: s === 'l' ? b.x1 - 6 : b.x0 + 6, y: b.cy };
    });
    return { w: mr.width, h: mr.height, brace, rows, goals };
  }

  const NS = 'http://www.w3.org/2000/svg';

  function drawArrows(node) {
    node.querySelector(':scope > .hm-arrows')?.remove();
    const g = measure(node);
    if (!g) return false;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'hm-arrows'); svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', num(g.w)); svg.setAttribute('height', num(g.h)); svg.setAttribute('viewBox', `0 0 ${num(g.w)} ${num(g.h)}`);
    node.append(svg); // primero en la página: getTotalLength() necesita el trazo ya montado
    const order = g.rows.map((r) => r.k);
    arrowPaths(g).forEach((p) => {
      // La punta de destino comparte clase con las métricas que llegan a ella: se ilumina con cualquiera de ellas.
      const cls = 'hm-arr' + (order.includes(p.k) ? ' m-' + p.k : ' hm-a-' + p.k) + (p.ks ? ' ' + p.ks.map((k) => 'm-' + k).join(' ') : '');
      // Orden de entrada: la llave primero (-1), luego cada fila, y las puntas de los destinos al final.
      const i = p.k === 'brace' ? -1 : p.k === 'goal' ? order.length : order.indexOf(p.k);
      if (p.d) {
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('class', cls); path.setAttribute('d', p.d); path.style.setProperty('--i', i);
        svg.append(path);
        try { path.style.setProperty('--len', Math.ceil(path.getTotalLength()) + 2); } catch { /* sin layout (jsdom): la animación usa un largo por defecto */ }
        if (p.k === 'brace') { // la llave del título tiene su propio movimiento: una luz que viaja por la flecha
          const glow = document.createElementNS(NS, 'path');
          glow.setAttribute('class', 'hm-glow'); glow.setAttribute('d', p.d); glow.style.setProperty('--i', 0);
          svg.append(glow);
          try { glow.style.setProperty('--len', (Math.ceil(glow.getTotalLength()) + 20) + 'px'); } catch { /* sin layout */ }
        }
      }
      if (p.head) {
        const h = document.createElementNS(NS, 'path');
        h.setAttribute('class', cls + ' hm-head'); h.setAttribute('d', headPath(p.head)); h.style.setProperty('--i', i);
        svg.append(h);
      }
    });
    return true;
  }

  /* ---------- Métricas base ---------- */
  // Tarjeta desplegable (<details>, la abre el usuario) con los números crudos del Administrador de anuncios en una
  // tabla glosario: Métrica · Qué es · Da · NovaSociety. Dentro no hay avisos, "i" ni clics.
  //   head    = { title, sub }                                       (BASE_HEAD)
  //   rows    = métricas { k, name, csv?, def, uses, ns }             (BASE_METRICS)
  //   formula = { cap, num, divs: [{ k | label, hm, factor?, uses? }] } (BASE_FORMULA): orden de las filas;
  //             un divisor que es solo label (Pagos iniciados) va en el pie de la tabla
  const BASE_COLS = ['Métrica', 'Qué es', 'Da', 'NovaSociety'];
  function base(node, head, rows, formula) {
    node.textContent = '';
    const byK = (k) => rows.find((m) => m.k === k);
    const hmName = (k) => HARD_METRICS.find((r) => r.k === k).name;
    const segs = (cls, s) => { const p = el('p', cls); rich(p, s); return p; };
    const chip = (k, factor) => {
      const c = el('span', 'hm-base-gives');
      c.append(el('b', 'hm-base-chip', hmName(k)));
      if (factor) c.append(el('span', 'hm-base-factor', factor));
      return c;
    };
    const td = (cls, label) => { const c = el('td', cls); c.dataset.label = label; return c; };

    const sum = el('summary'), hd = el('div');
    hd.append(el('h2', null, head.title), el('p', 'muted hm-base-sub', head.sub));
    sum.append(hd);

    const table = el('table', 'hm-base-table');
    const thead = el('thead'), hr = el('tr');
    BASE_COLS.forEach((h) => hr.append(el('th', null, h)));
    thead.append(hr);
    const tbody = el('tbody');

    // Filas: lo que se gasta (tope y numerador) y luego las métricas que dan Hard Metric, en el orden de la cadena.
    const order = [{ k: formula.cap, gives: 'Tope diario' }, { k: formula.num, gives: 'Numerador' }]
      .concat(formula.divs.filter((d) => d.k));
    order.forEach((d) => {
      const m = byK(d.k);
      const tr = el('tr', 'hm-base-row m-' + m.k); tr.dataset.k = m.k;
      const c1 = td('hm-base-m', BASE_COLS[0]);
      const name = el('div', 'hm-base-name');
      name.append(el('b', null, m.name));
      if (m.csv) name.append(el('small', 'hm-base-csv', '«' + m.csv + '»'));
      c1.append(name);
      const c2 = td('hm-base-def', BASE_COLS[1]); c2.textContent = m.def;
      const c3 = td('hm-base-da', BASE_COLS[2]);
      c3.append(d.hm ? chip(d.hm, d.factor) : el('span', 'hm-base-gives is-text', d.gives));
      m.uses.forEach((u) => c3.append(segs('hm-base-use', u)));
      const c4 = td('hm-base-ns', BASE_COLS[3]); rich(c4, m.ns);
      tr.append(c1, c2, c3, c4);
      tbody.append(tr);
    });
    table.append(thead, tbody);

    // Pie: las métricas que no tienen fila propia (Pagos iniciados → CPPI).
    const foot = el('div', 'hm-base-foot');
    formula.divs.filter((d) => !d.k).forEach((d) => {
      const line = el('div', 'hm-base-footrow');
      const arrow = el('span', 'hm-base-arrow', '→'); arrow.setAttribute('aria-hidden', 'true');
      line.append(el('b', 'hm-base-footname', d.label), arrow, chip(d.hm));
      d.uses.forEach((u) => line.append(segs('hm-base-use', u)));
      foot.append(line);
    });

    const body = el('div', 'hm-base-body');
    body.append(table, foot);
    node.append(sum, body);
  }

  (PYL.ui.metrics ??= {}).map = map;
  PYL.ui.metrics.base = base;
  PYL.ui.metrics.mark = mark;
  PYL.ui.metrics.expand = expand;
  PYL.ui.metrics.drawArrows = drawArrows;
  PYL.ui.metrics.arrowPaths = arrowPaths;
})();
