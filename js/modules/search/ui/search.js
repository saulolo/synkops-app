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

  // Semáforo de proveedores (SPEC 28): barra de 4 segmentos (decorativa) y lista con el texto completo de cada zona.
  const zoneRange = (z) => (z.to == null ? `${z.from} +` : `${z.from} – ${z.to}`);
  function zones(list) {
    const box = el('div', 'fl-zones mt-s');
    box.append(el('b', 'fl-zones-h', 'Proveedores en Dropi'));
    const bar = el('div', 'fl-zones-bar');
    bar.setAttribute('aria-hidden', 'true');
    list.forEach((z) => {
      const c = el('div', 'fl-zones-seg');
      c.dataset.tone = z.tone;
      c.append(el('span', 'fl-zones-fill'), el('span', 'fl-zones-range', zoneRange(z)), el('span', 'fl-zones-name', z.t));
      bar.append(c);
    });
    const ul = el('ul', 'fl-zones-list');
    list.forEach((z) => {
      const li = el('li', 'fl-zones-item');
      li.dataset.tone = z.tone;
      const tx = el('span', 'fl-zones-tx');
      tx.append(el('b', null, `${z.t} · ${zoneRange(z)}: `));
      const d = el('span'); rich(d, z.d); tx.append(d);
      li.append(el('i', 'fl-zones-dot'), tx);
      ul.append(li);
    });
    box.append(bar, ul);
    return box;
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
    if (s.zones) box.append(zones(s.zones));
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
        const wic = el('span', 'b-win-ic'); wic.append(PYL.ui.icons.el(x.icon, 20, 'ic-solo'));
        head.append(wic, el('span', 'b-win-ck', on ? '✓' : ''));
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
      const sic = el('span', 'st-ic'); sic.append(PYL.ui.icons.el(s.icon, 22, 'ic-solo'));
      b.append(sic, tx);
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
      const ic = el('span', 'ps-ic'); ic.append(PYL.ui.icons.el(x.icon, 18, 'ic-solo'), el('span', 'ps-n', String(j + 1)));
      b.append(ic, el('b', null, x.t), el('small', 'ps-out', x.out));
      b.addEventListener('click', () => on.select(j));
      li.append(b); ol.append(li);
    });
    node.append(ol);

    const box = el('div', 'ps-det pop');
    const top = el('div', 'row between');
    top.append(el('span', 'tag tb', `Fase ${i + 1} de ${steps.length}`), el('span', 'small', s.where));
    const fh = el('h3', 'mt-s fl-h'); fh.append(PYL.ui.icons.el(s.icon, 18), s.t);
    box.append(top, fh, seg('fl-p', s.p));

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
        const h = el('div', 'ps-csh'); const ci = el('span', 'ps-ci'); ci.append(PYL.ui.icons.el(c.icon, 16, 'ic-solo'));
        h.append(ci, el('small', null, 'Paso ' + (j + 1)));
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

  // La Caza: frase, dos puertas, selector A/B/C y el detalle del método elegido (ruta, fichas y prompt).
  // k = método abierto ('a' | 'b' | 'c'). on = { select(k), copy(text) }. No muta estado.
  function caza(node, data, k, on) {
    node.textContent = '';
    const icon = (name, size, cls) => PYL.ui.icons.el(name, size, cls || 'ic-solo');
    const idx = Math.max(0, data.methods.findIndex((x) => x.k === k));
    const m = data.methods[idx];

    node.append(seg('cz-lead', data.lead));

    const gates = el('div', 'cz-gates');
    const from = el('div', 'cz-end'); from.append(el('small', null, 'Lo que ya se vende'));
    gates.append(from);
    data.gates.forEach((g) => {
      gates.append(el('span', 'cz-link'));
      const c = el('div', 'cz-gate');
      const top = el('div', 'cz-gh'); top.append(icon(g.icon, 20), el('small', null, 'Puerta ' + g.n));
      c.append(top, el('b', null, g.t), seg('cz-gd', g.d));
      gates.append(c);
    });
    gates.append(el('span', 'cz-link'));
    const to = el('div', 'cz-end cz-cand'); to.append(icon('check-circle', 18), el('small', null, 'Candidato'));
    gates.append(to);
    node.append(gates);

    const sel = el('div', 'cz-methods'); sel.setAttribute('role', 'group'); sel.setAttribute('aria-label', 'Método de caza');
    data.methods.forEach((x) => {
      const b = el('button', 'cz-node' + (x.k === m.k ? ' on' : ''));
      b.type = 'button'; b.dataset.m = x.k; b.setAttribute('aria-pressed', String(x.k === m.k));
      const tx = el('span', 'cz-tx'); tx.append(el('b', null, x.t), el('small', null, x.short));
      b.append(el('span', 'cz-letter', x.letter), icon(x.icon, 20), tx);
      b.addEventListener('click', () => on.select(x.k));
      sel.append(b);
    });
    node.append(sel);

    const box = el('div', 'cz-det pop');
    const top = el('div', 'row between');
    top.append(el('span', 'tag tb', `Método ${m.letter} de ${data.methods.length}`), el('span', 'small', m.where));
    const h = el('h3', 'mt-s fl-h'); h.append(icon(m.icon, 18, ''), m.t);
    box.append(top, h, seg('fl-p', m.p));

    const route = el('ol', 'cz-route');
    m.route.forEach((s, j) => {
      const li = el('li', 'cz-st' + (s.fork ? ' cz-fork' : '')); li.style.setProperty('--i', String(j));
      const hd = el('div', 'cz-sh');
      hd.append(el('span', 'cz-sn', String(j + 1)));
      if (s.icon) hd.append(icon(s.icon, 16));
      li.append(hd, el('b', null, s.t));
      if (s.d) li.append(seg('cz-sd', s.d));
      if (s.fork) {
        const outs = el('div', 'cz-outs');
        [['yes', 'g'], ['no', 'y']].forEach(([w, tone]) => {
          const o = el('div', 'cz-out ' + tone); o.dataset.out = w;
          o.append(el('b', null, s[w].t), seg('cz-od', s[w].d));
          outs.append(o);
        });
        li.append(outs);
      }
      route.append(li);
    });
    box.append(route);

    const checks = el('div', 'cz-checks');
    m.checks.forEach((r) => {
      const c = el('div', 'ps-rule');
      const big = el('div', 'ps-big'); big.append(el('b', null, r.big), el('small', null, r.unit));
      c.append(big, el('span', 'ps-rt', r.t), seg('ps-rd', r.d));
      checks.append(c);
    });
    box.append(el('h4', 'cz-h', 'Qué miro'), checks);

    const pr = el('div', 'cz-prompt');
    const ph = el('div', 'row between');
    ph.append(el('b', null, 'Prompt para DropKiller'));
    const cp = el('button', 'btn sm'); cp.type = 'button'; cp.id = 'cz-copy';
    cp.append(icon('copy', 16), 'Copiar prompt');
    cp.addEventListener('click', () => on.copy(m.prompt));
    ph.append(cp);
    pr.append(ph, el('p', 'cz-pt', m.prompt));
    box.append(pr);

    const acts = el('div', 'row mt');
    if (idx > 0) { const pv = el('button', 'btn ghost sm', '← Método anterior'); pv.type = 'button'; pv.addEventListener('click', () => on.select(data.methods[idx - 1].k)); acts.append(pv); }
    if (idx < data.methods.length - 1) { const nx = el('button', 'btn ghost sm', 'Siguiente método →'); nx.type = 'button'; nx.addEventListener('click', () => on.select(data.methods[idx + 1].k)); acts.append(nx); }
    box.append(acts);
    node.append(box);
  }

  // El Espía: frase, la pantalla de una tienda (cinco fichas), selector A/B y el detalle de la entrada elegida.
  // k = entrada abierta ('a' | 'b'). on = { select(k), copy(text) }. No muta estado.
  function espia(node, data, k, on) {
    node.textContent = '';
    const icon = (name, size, cls) => PYL.ui.icons.el(name, size, cls || 'ic-solo');
    const idx = Math.max(0, data.modes.findIndex((x) => x.k === k));
    const m = data.modes[idx];

    node.append(seg('sp-lead', data.lead));

    const screen = el('div', 'sp-screen');
    const inp = el('div', 'sp-in'); inp.append(icon('search', 16), el('small', null, 'Pego el dominio o cualquier enlace de la tienda'));
    const grid = el('div', 'sp-tiles');
    data.screen.forEach((t, i) => {
      const c = el('div', 'sp-tile'); c.dataset.k = t.k; c.style.setProperty('--i', String(i));
      c.append(icon(t.icon, 20), el('b', null, t.t), el('small', null, t.d));
      grid.append(c);
    });
    screen.append(inp, grid);
    node.append(screen);

    const sel = el('div', 'sp-modes'); sel.setAttribute('role', 'group'); sel.setAttribute('aria-label', 'Entrada del espía');
    data.modes.forEach((x) => {
      const b = el('button', 'sp-node' + (x.k === m.k ? ' on' : ''));
      b.type = 'button'; b.dataset.m = x.k; b.setAttribute('aria-pressed', String(x.k === m.k));
      const tx = el('span', 'sp-tx'); tx.append(el('b', null, x.t), el('small', null, x.short));
      b.append(el('span', 'sp-letter', x.letter), icon(x.icon, 20), tx);
      b.addEventListener('click', () => on.select(x.k));
      sel.append(b);
    });
    node.append(sel);

    const box = el('div', 'sp-det');
    const top = el('div', 'row between');
    top.append(el('span', 'tag tb', `Entrada ${m.letter} de ${data.modes.length}`), el('span', 'small', m.where));
    const h = el('h3', 'mt-s fl-h'); h.append(icon(m.icon, 18, ''), m.t);
    box.append(top, h, seg('fl-p', m.p));

    const route = el('ol', 'sp-route');
    m.route.forEach((s, j) => {
      const li = el('li', 'sp-st'); li.style.setProperty('--i', String(j));
      const hd = el('div', 'sp-sh'); hd.append(el('span', 'sp-sn', String(j + 1)), icon(s.icon, 16));
      li.append(hd, el('b', null, s.t), seg('sp-sd', s.d));
      route.append(li);
    });
    box.append(route);

    const checks = el('div', 'sp-checks');
    m.checks.forEach((r) => {
      const c = el('div', 'ps-rule');
      const big = el('div', 'ps-big'); big.append(el('b', null, r.big), el('small', null, r.unit));
      c.append(big, el('span', 'ps-rt', r.t), seg('ps-rd', r.d));
      checks.append(c);
    });
    box.append(el('h4', 'sp-h', 'Qué veo'), checks);

    const ul = el('ul', 'fl-list sp-use');
    m.use.forEach((x) => { const li = el('li'); rich(li, x); ul.append(li); });
    box.append(el('h4', 'sp-h', 'Qué hago con lo que veo'), ul);

    const pr = el('div', 'sp-prompt');
    const ph = el('div', 'row between');
    ph.append(el('b', null, 'Prompt para DropKiller'));
    const cp = el('button', 'btn sm'); cp.type = 'button'; cp.id = 'sp-copy';
    cp.append(icon('copy', 16), 'Copiar prompt');
    cp.addEventListener('click', () => on.copy(m.prompt));
    ph.append(cp);
    pr.append(ph, el('p', 'sp-pt', m.prompt));
    box.append(pr);

    const acts = el('div', 'row mt');
    if (idx > 0) { const pv = el('button', 'btn ghost sm', '← Entrada anterior'); pv.type = 'button'; pv.addEventListener('click', () => on.select(data.modes[idx - 1].k)); acts.append(pv); }
    if (idx < data.modes.length - 1) { const nx = el('button', 'btn ghost sm', 'Siguiente entrada →'); nx.type = 'button'; nx.addEventListener('click', () => on.select(data.modes[idx + 1].k)); acts.append(nx); }
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

  PYL.ui.search = { flowList, flowStep, progress, result, stages, winner, vdo, strategyTabs, byProvider, caza, espia, pyramidMap, cards, mistakes };
})();
