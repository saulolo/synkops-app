// Pestaña Buscar producto: pinta el flujograma de DropKiller, el semáforo VDO del candidato, el ciclo de vida,
// las estrategias de búsqueda (VDO y por proveedor) y las fichas de consulta. El formulario y la bitácora están en modules/search/ui/candidate.js. Recibe datos y callbacks.
(() => {
  const PYL = globalThis.PYL;
  const { el, rich } = PYL.ui.dom;

  const seg = (cls, segments) => { const p = el('p', cls); rich(p, segments); return p; };
  const light = (tone) => el('i', 'light' + (tone ? ' ' + tone : ''));
  const TAG = { g: 'tg', y: 'ty', o: 'to', r: 'tr' };

  // ---------- Flujograma ----------
  // Lista de pasos con sus compuertas de decisión entre ellos.
  function flowList(node, steps, active, done, onSelect) {
    node.textContent = '';
    steps.forEach((s, i) => {
      const li = el('li', 'fl-item' + (done[s.k] ? ' done' : '') + (i === active ? ' on' : ''));
      const b = el('button', 'fl-node');
      b.type = 'button'; b.setAttribute('aria-pressed', String(i === active));
      b.append(el('span', 'fl-n', done[s.k] ? '✓' : String(i + 1)));
      const tx = el('span', 'fl-tx'); tx.append(el('b', null, s.t), el('small', null, s.where));
      b.append(tx);
      b.addEventListener('click', () => onSelect(i));
      li.append(b);
      if (s.gate) {
        const g = el('div', 'fl-gate');
        g.append(el('span', 'fl-dia', '?'), el('span', null, s.gate.q));
        li.append(g);
      }
      node.append(li);
    });
  }

  // Detalle del paso activo.
  function flowStep(node, s, i, total, isDone, on) {
    node.textContent = '';
    const box = el('div', 'fl-detail pop');
    const top = el('div', 'row between');
    top.append(el('span', 'tag tb', `Paso ${i + 1} de ${total}`), el('span', 'small', s.where));
    box.append(top, el('h3', 'mt-s fl-h', s.t), seg('fl-p', s.p));

    if (s.filters) {
      const wrap = el('div', 'chain-help-tbl'), t = el('table'), th = el('thead'), tb = el('tbody');
      const hr = el('tr'); ['Filtro', 'Valor', 'Para qué'].forEach((h) => hr.append(el('th', null, h)));
      th.append(hr);
      s.filters.forEach(([f, v, w]) => {
        const tr = el('tr'); const vv = el('td'); vv.append(el('span', 'num', v));
        tr.append(el('td', null, f), vv, el('td', null, w)); tb.append(tr);
      });
      t.append(th, tb); wrap.append(t); box.append(wrap);
    }
    if (s.list) {
      const ul = el('ul', 'fl-list');
      s.list.forEach((x) => { const li = el('li'); rich(li, x); ul.append(li); });
      box.append(ul);
    }
    if (s.example) { const ex = el('div', 'note nb mt-s'); const sp = el('span'); rich(sp, s.example); ex.append(el('b', null, 'Caso real: '), sp); box.append(ex); }
    if (s.gate) {
      const g = el('div', 'fl-decide mt-s');
      g.append(el('b', null, s.gate.q));
      const r = el('div', 'row mt-s');
      r.append(el('span', 'tag tg', 'Sí → sigo'), el('span', 'tag tr', 'No'), el('span', 'small', s.gate.no));
      g.append(r); box.append(g);
    }

    const acts = el('div', 'row mt');
    const mark = el('button', 'btn sm' + (isDone ? ' ghost' : ''), isDone ? 'Desmarcar' : 'Listo, lo hice');
    mark.type = 'button'; mark.addEventListener('click', on.toggle);
    acts.append(mark);
    // on.reset solo llega si hay algún paso hecho.
    if (on.reset) {
      const rs = el('button', 'btn ghost sm', 'Desmarcar todos');
      rs.type = 'button'; rs.title = 'Desmarca todos los pasos para empezar con otro producto';
      rs.addEventListener('click', on.reset); acts.append(rs);
    }
    if (i < total - 1) {
      const nx = el('button', 'btn ghost sm', 'Siguiente paso →');
      nx.type = 'button'; nx.addEventListener('click', on.next); acts.append(nx);
    } else {
      const cost = el('button', 'btn ghost sm', 'Ir al costeo →');
      cost.type = 'button'; cost.addEventListener('click', on.costeo); acts.append(cost);
    }
    box.append(acts);
    node.append(box);
  }

  function progress(node, done, total, onReset) {
    node.textContent = '';
    const bar = el('div', 'b-bar'), fill = el('i');
    fill.style.width = (total ? (done / total) * 100 : 0) + '%';
    bar.append(fill);
    const t = el('span', 'small', `${done} de ${total} pasos`);
    node.append(bar, t);
    if (done) {
      const r = el('button', 'btn ghost sm', 'Limpiar pasos'); r.type = 'button';
      r.title = 'Desmarca todos los pasos para empezar con otro producto';
      r.addEventListener('click', onReset); node.append(r);
    }
  }

  function result(node, ev) {
    node.textContent = '';
    const v = ev.verdict;
    const head = el('div', 'b-verdict');
    head.append(light(v.tone));
    const tx = el('div'); tx.append(el('b', 'b-vt', v.title), seg('b-vs', v.text));
    head.append(tx);
    node.append(head);
    if (!ev.checks.length) return;
    const ul = el('ul', 'b-checks');
    ev.checks.forEach((c) => {
      const li = el('li'); li.append(light(c.tone), el('b', null, c.label));
      const s = el('span'); rich(s, c.text); li.append(s); ul.append(li);
    });
    node.append(ul);
  }

  // ---------- Ciclo de vida ----------
  function stages(node, list, current, rangeOf) {
    node.textContent = '';
    list.forEach((s) => {
      const on = current && current.k === s.k;
      const c = el('div', 'b-stage st-' + s.k + (on ? ' on' : ''));
      c.append(el('span', 'b-st-r', rangeOf(s) + ' ventas'), el('b', null, s.name), el('span', 'tag ' + TAG[s.tone], s.risk));
      const p = el('p'); rich(p, s.act); c.append(p);
      if (on) c.append(el('span', 'b-here', 'Mi candidato está aquí'));
      node.append(c);
    });
  }

  // ---------- Producto ganador ----------
  // Anillo de progreso + veredicto arriba; tarjetas que se marcan con un toque, agrupadas.
  function winner(node, items, groups, traits, check, onToggle) {
    node.textContent = '';
    const top = el('div', 'b-win-top');
    const ring = el('div', 'b-win-ring' + (check.tone ? ' ' + check.tone : ''));
    ring.style.setProperty('--p', Math.round((check.done / check.total) * 100) + '%');
    const rc = el('div', 'b-win-rc'); rc.append(el('b', null, String(check.done)), el('small', null, 'de ' + check.total));
    ring.append(rc);
    const v = el('div', 'b-verdict b-win-v');
    v.append(light(check.tone));
    const tx = el('div'); tx.append(el('b', 'b-vt', check.title), seg('b-vs', check.text));
    v.append(tx);
    top.append(ring, v);
    node.append(top);
    groups.forEach((g) => {
      node.append(el('h3', 'b-win-gh', g.t));
      const grid = el('div', 'b-win-grid');
      items.filter((x) => x.group === g.k).forEach((x) => {
        const on = !!traits[x.k];
        const b = el('button', 'b-win-c' + (on ? ' on' : ''));
        b.type = 'button'; b.setAttribute('aria-pressed', String(on));
        const head = el('div', 'b-win-h');
        head.append(el('span', 'b-win-ic', x.icon), el('span', 'b-win-ck', on ? '✓' : ''));
        b.append(head, el('b', 'b-win-t', x.t), seg('b-win-d', x.d));
        const foot = el('div', 'b-win-f');
        foot.append(el('span', null, on ? 'Lo cumple' : '¿Lo cumple? Toco aquí'));
        if (x.must) foot.append(el('span', 'tag tr', 'Obligatorio'));
        b.append(foot);
        b.addEventListener('click', () => onToggle(x.k));
        grid.append(b);
      });
      node.append(grid);
    });
  }

  // ---------- Pirámide del producto ganador ----------
  // Pirámide de tres niveles + eje de enfoque; al lado, las partes del nivel elegido y el detalle de la parte.
  // sel = { lvl, item }. onSelect(lvl, item).
  function pyramidMap(node, levels, sel, onSelect) {
    node.textContent = '';
    const L = levels.find((x) => x.k === sel.lvl) || levels[levels.length - 1];
    const all = L.groups.flatMap((g) => g.items), it = all.find((x) => x.k === sel.item) || all[0];

    const fig = el('div', 'pm-fig');
    const tri = el('div', 'pm-tri');
    levels.forEach((x) => {
      const b = el('button', 'pm-lv pm-' + x.k + (x.k === L.k ? ' on' : ''));
      b.type = 'button'; b.setAttribute('aria-pressed', String(x.k === L.k));
      b.append(el('b', null, x.t), el('span', null, x.pct + '%'));
      b.addEventListener('click', () => onSelect(x.k, null));
      tri.append(b);
    });
    const axis = el('div', 'pm-axis');
    axis.append(el('span', null, 'Menor enfoque'), el('i'), el('span', null, 'Mayor enfoque'));
    fig.append(tri, axis);

    const side = el('div', 'pm-side pop pm-' + L.k);
    const hd = el('div', 'pm-hd');
    hd.append(el('span', 'pm-pct', L.pct + '%'));
    const ht = el('div'); ht.append(el('h3', null, L.t), el('small', null, L.level));
    hd.append(ht); side.append(hd);
    L.groups.forEach((g) => {
      if (L.groups.length > 1) side.append(el('div', 'pm-gt', g.t));
      const chips = el('div', 'pm-chips');
      g.items.forEach((x, i) => {
        const c = el('button', 'pm-chip' + (x.k === it.k ? ' on' : ''));
        c.type = 'button'; c.setAttribute('aria-pressed', String(x.k === it.k));
        if (g.numbered) c.append(el('span', 'pm-n', String(i + 1)));
        c.append(x.t);
        c.addEventListener('click', () => onSelect(L.k, x.k));
        chips.append(c);
      });
      side.append(chips);
    });

    const det = el('div', 'pm-det');
    det.append(el('b', 'pm-dt', it.t));
    const ul = el('ul', 'pm-li');
    it.p.forEach((x) => { const li = el('li'); rich(li, Array.isArray(x) ? x : [x]); ul.append(li); });
    det.append(ul);
    if (it.yes || it.no) {
      const vs = el('div', 'pm-vs');
      [['yes', '✓ Sí', 'g'], ['no', '✕ No', 'r']].forEach(([k, lab, tone]) => {
        const e = it[k]; if (!e) return;
        const c = el('div', 'pm-ex ' + tone);
        const h = el('div', 'pm-exh'); h.append(el('span', 'tag ' + TAG[tone], lab), el('b', null, e.t));
        const l = el('ul'); e.li.forEach((t) => l.append(el('li', null, t)));
        c.append(h, l); vs.append(c);
      });
      det.append(vs);
    }
    if (it.ex) { const ex = el('div', 'pm-ad'); ex.append(el('small', null, 'Así se ve'), el('b', null, it.ex)); det.append(ex); }
    side.append(det);

    node.append(fig, side);
  }

  // ---------- Estrategias de búsqueda ----------
  // Selector de estrategia: tarjetas grandes que se comportan como pestañas. onSelect(k).
  function strategyTabs(node, list, active, onSelect) {
    node.textContent = '';
    list.forEach((s) => {
      const on = s.k === active;
      const b = el('button', 'st-tab' + (on ? ' on' : ''));
      b.type = 'button'; b.setAttribute('aria-pressed', String(on));
      const tx = el('span', 'st-tx'); tx.append(el('b', null, s.t), el('small', null, s.d));
      b.append(el('span', 'st-ic', s.icon), tx);
      b.addEventListener('click', () => onSelect(s.k));
      node.append(b);
    });
  }

  // Estrategia por proveedor: fases conectadas (embudo) y el detalle de la fase elegida.
  // i = fase abierta. on = { select(i), cand() }.
  function byProvider(node, data, i, on) {
    node.textContent = '';
    const steps = data.steps, s = steps[i];

    const ol = el('ol', 'ps-steps');
    steps.forEach((x, j) => {
      const li = el('li', 'ps-st' + (j === i ? ' on' : '') + (j < i ? ' past' : ''));
      const b = el('button', 'ps-node');
      b.type = 'button'; b.setAttribute('aria-pressed', String(j === i));
      const ic = el('span', 'ps-ic', x.icon); ic.append(el('span', 'ps-n', String(j + 1)));
      b.append(ic, el('b', null, x.t), el('small', 'ps-out', x.out));
      b.addEventListener('click', () => on.select(j));
      li.append(b); ol.append(li);
    });
    node.append(ol);

    const box = el('div', 'ps-det pop');
    const top = el('div', 'row between');
    top.append(el('span', 'tag tb', `Fase ${i + 1} de ${steps.length}`), el('span', 'small', s.where));
    box.append(top, el('h3', 'mt-s fl-h', s.icon + ' ' + s.t), seg('fl-p', s.p));

    if (s.k === 'filtrar') {
      const group = (title, list, ally) => {
        const g = el('div', 'ps-sg');
        const h = el('div', 'ps-sgh'); h.append(el('b', null, title));
        if (ally) h.append(el('span', 'tag ty', 'Plus'));
        g.append(h);
        const grid = el('div', 'ps-sup');
        list.forEach((p) => {
          const c = el('div', 'ps-sc' + (ally ? ' ally' : ''));
          c.append(el('span', 'ps-av', p.t.charAt(0)), el('b', null, p.t));
          grid.append(c);
        });
        g.append(grid); return g;
      };
      box.append(group('Proveedores', data.suppliers), group('Proveedores aliados', data.allies, true));
    }
    if (s.rules) {
      const grid = el('div', 'ps-rules');
      s.rules.forEach((r) => {
        const c = el('div', 'ps-rule');
        const big = el('div', 'ps-big'); big.append(el('b', null, r.big), el('small', null, r.unit));
        c.append(big, el('span', 'ps-rt', r.t), seg('ps-rd', r.d));
        grid.append(c);
      });
      box.append(grid);
    }
    if (s.note) { const nt = el('div', 'note nb mt-s'); rich(nt, s.note); box.append(nt); }
    if (s.chain) {
      const ch = el('ol', 'ps-chain');
      s.chain.forEach((c, j) => {
        const li = el('li', 'ps-cs');
        const h = el('div', 'ps-csh'); h.append(el('span', 'ps-ci', c.icon), el('small', null, 'Paso ' + (j + 1)));
        li.append(h, el('b', null, c.t), seg('ps-cd', c.d));
        ch.append(li);
      });
      box.append(ch);
    }
    if (s.list) {
      const ul = el('ul', 'fl-list');
      s.list.forEach((x) => { const li = el('li'); rich(li, x); ul.append(li); });
      box.append(ul);
    }

    const acts = el('div', 'row mt');
    if (s.link) { const a = el('a', 'btn ghost sm', s.link.t); a.href = s.link.href; a.target = '_blank'; a.rel = 'noopener'; acts.append(a); }
    if (i > 0) { const pv = el('button', 'btn ghost sm', '← Fase anterior'); pv.type = 'button'; pv.addEventListener('click', () => on.select(i - 1)); acts.append(pv); }
    if (i < steps.length - 1) { const nx = el('button', 'btn sm', 'Siguiente fase →'); nx.type = 'button'; nx.addEventListener('click', () => on.select(i + 1)); acts.append(nx); }
    else { const c = el('button', 'btn sm', 'Anotarlo en Mi candidato ↑'); c.type = 'button'; c.addEventListener('click', on.cand); acts.append(c); }
    box.append(acts);
    node.append(box);
  }

  // ---------- Fichas de consulta ----------
  function vdo(node, items) {
    node.textContent = '';
    items.forEach((x) => {
      const c = el('div', 'b-vdo');
      c.append(el('span', 'b-letter', x.k));
      const tx = el('div'); tx.append(el('b', null, x.t), seg('b-rule', x.rule), el('small', null, 'Evito: ' + x.avoid));
      c.append(tx); node.append(c);
    });
  }

  function cards(node, items) {
    node.textContent = '';
    items.forEach((x) => {
      const c = el('div', 'card b-tool');
      c.append(el('b', null, x.t));
      const p = el('p'); if (Array.isArray(x.d)) rich(p, x.d); else p.textContent = x.d;
      c.append(p); node.append(c);
    });
  }

  function mistakes(node, items) {
    node.textContent = '';
    const ol = el('ol', 'b-mist');
    items.forEach(([t, d]) => { const li = el('li'); li.append(el('b', null, t + ': '), d); ol.append(li); });
    node.append(ol);
  }

  PYL.ui.search = { flowList, flowStep, progress, result, stages, winner, vdo, strategyTabs, byProvider, pyramidMap, cards, mistakes };
})();
