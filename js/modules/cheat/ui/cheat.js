// Atajos flotantes de Testeo (SPEC 12): dos botones redondos y sus paneles ("Cadena que decide" y "Métricas duras").
// Recibe datos y callbacks; no guarda estado. on = { toggle(which), close() }, which = 'chain' | 'hard'.
// Reutiliza los estilos del guardado rápido (.qk-btn, .qk-panel, .qk-head, .qk-title, .qk-x).
(() => {
  const PYL = globalThis.PYL;
  const { el } = PYL.ui.dom;

  // Eslabones de una cadena. currentColor = el color del texto del botón.
  const ICON_CHAIN = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>';
  // Barras de una gráfica.
  const ICON_HARD = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></svg>';

  // Los dos atajos. which = clave del estado; id = prefijo de los ids (#ch-<id>-btn…).
  const SHORTCUTS = [
    { which: 'chain', id: 'c', title: 'Cadena que decide', head: 'La cadena que decide todo', icon: ICON_CHAIN },
    { which: 'hard', id: 'd', title: 'Métricas duras', head: 'Métricas duras', icon: ICON_HARD },
  ];

  // Crea los dos botones y los dos paneles dentro de root (una sola vez). Cada panel deja su `body` vacío para su contenido.
  function build(root, on) {
    root.textContent = '';
    const k = {};
    for (const s of SHORTCUTS) {
      const btn = el('button', 'qk-btn ch-btn ch-' + s.id + '-btn'); btn.type = 'button'; btn.id = 'ch-' + s.id + '-btn';
      btn.title = s.title; btn.setAttribute('aria-label', s.title);
      btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'ch-' + s.id + '-panel');
      btn.innerHTML = s.icon;
      btn.addEventListener('click', () => on.toggle(s.which));

      const panel = el('div', 'qk-panel ch-panel ch-' + s.id + '-panel'); panel.id = 'ch-' + s.id + '-panel'; panel.hidden = true;
      panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', s.title);
      const head = el('div', 'qk-head');
      const title = el('div', 'qk-title'); title.append(el('b', null, s.head), el('small', null, 'Criterio NovaSociety'));
      const x = el('button', 'qk-x', '✕'); x.type = 'button'; x.id = 'ch-' + s.id + '-x'; x.title = 'Cerrar'; x.setAttribute('aria-label', 'Cerrar');
      x.addEventListener('click', on.close);
      head.append(title, x);
      const body = el('div', 'ch-body');
      panel.append(head, body);
      k[s.which] = { btn, panel, body };      root.append(panel, btn);
    }
    root._ch = k;
  }

  // v = { open }: 'chain' | 'hard' | null. Repinta abierto/cerrado de los dos.
  function render(root, v) {
    for (const [which, p] of Object.entries(root._ch)) {
      const on = v.open === which;
      p.btn.setAttribute('aria-expanded', String(on));
      p.btn.classList.toggle('on', on);
      p.panel.hidden = !on;
    }
  }

  // ---- Panel "Cadena que decide" ----

  // Arma la cadena y su zona de detalle dentro del panel (una sola vez).
  //   chain = chChain() · sides = CH_SIDES · on = { select(k) }
  // Solo el clic marca un eslabón (también con Tab + Enter o con el toque): pasar el mouse o enfocar no cambia nada.
  function chainBuild(root, chain, sides, on) {
    const body = root._ch.chain.body;
    body.textContent = '';
    const line = el('p', 'ch-line', 'El primero que se rompe es mi problema; lo que viene después es consecuencia.');
    const wrap = el('div', 'ch-chain'); wrap.id = 'ch-c-chain';
    const links = {};
    for (const s of sides) {
      const side = el('div', 'ch-side'); side.dataset.side = s.k;
      const row = el('div', 'ch-links');
      for (const e of chain.filter((x) => x.side === s.k)) {
        const b = el('button', 'ch-link'); b.type = 'button'; b.dataset.k = e.k; b.setAttribute('aria-pressed', 'false');
        b.append(el('small', null, 'Paso ' + e.step), el('b', null, e.name));
        b.addEventListener('click', () => on.select(e.k));
        links[e.k] = b;
        row.append(b);
      }
      side.append(el('div', 'ch-side-t', s.t), row);
      wrap.append(side);
    }
    const zone = el('div', 'ch-zone'); zone.id = 'ch-c-zone'; zone.setAttribute('aria-live', 'polite');
    body.append(line, wrap, zone);
    root._ch.chain.links = links; root._ch.chain.zone = zone;
  }

  const zoneRow = (label, segs) => { const r = el('p', 'ch-z-row'); const t = el('b', 'ch-z-lab', label), v = el('span'); PYL.ui.dom.rich(v, segs); r.append(t, v); return r; };

  // Marca el eslabón `sel` (el resto se desmarca) y pinta su resumen en la zona. No rehace los botones.
  function chainSel(root, chain, sel) {
    const c = root._ch.chain, e = chain.find((x) => x.k === sel);
    for (const [k, b] of Object.entries(c.links)) { b.classList.toggle('on', k === sel); b.setAttribute('aria-pressed', String(k === sel)); }
    const z = c.zone; z.textContent = '';
    const head = el('div', 'ch-z-head'); head.append(el('b', null, e.name + ' · ' + e.full), el('p', null, e.simple));
    const lim = el('div', 'ch-z-lim');
    for (const [plat, v] of [['Meta', e.lim.meta], ['TikTok', e.lim.tiktok]]) { const s = el('span'); s.append(plat + ' ', el('b', null, v)); lim.append(s); }
    const read = el('div', 'ch-z-read');
    read.append(zoneRow('Si falla →', e.read.when), zoneRow('Solución →', e.read.fix));
    z.append(head, lim, read, helpBlock(e.help));
  }

  // "¿Qué falla y cómo lo arreglo?": una tarjeta por causa (cómo se nota · solución) y el pie de la regla.
  function helpBlock(help) {
    const box = el('div', 'ch-help');
    box.append(el('b', 'ch-z-lab', '¿Qué falla y cómo lo arreglo?'));
    for (const r of help.rows) {
      const c = el('div', 'ch-cause'), how = el('p'), fix = el('p');
      PYL.ui.dom.rich(how, r.how); how.prepend(el('span', 'ch-c-lab', 'Se nota: '));
      PYL.ui.dom.rich(fix, r.fix); fix.prepend(el('span', 'ch-c-lab', 'Solución: '));
      c.append(el('b', null, r.cause), how, fix);
      box.append(c);
    }
    const foot = el('p', 'ch-z-foot'); PYL.ui.dom.rich(foot, help.foot);
    box.append(foot);
    return box;
  }

  // ---- Panel "Métricas duras" ----

  const PLATS = [['meta', 'Meta'], ['tiktok', 'TikTok']];
  const asSegs = (x) => (Array.isArray(x) ? x : [x]);

  // Arma el interruptor Meta | TikTok, la tabla de 5 filas y su zona de detalle (una sola vez).
  //   rows = chHard(plat) (solo se usan k, name y question aquí) · on = { select(k), plat(p) }
  // Solo el clic marca una fila (también con Tab + Enter o con el toque): pasar el mouse o enfocar no cambia nada.
  function hardBuild(root, rows, on) {
    const body = root._ch.hard.body;
    body.textContent = '';
    const seg = el('div', 'dk-seg ch-plat'); seg.id = 'ch-d-plat'; seg.setAttribute('role', 'radiogroup'); seg.setAttribute('aria-label', 'Plataforma');
    const radios = {};
    for (const [v, text] of PLATS) {
      const lab = el('label', 'dk-radio');
      const r = el('input'); r.type = 'radio'; r.name = 'ch-plat'; r.id = 'ch-d-plat-' + v; r.value = v;
      r.addEventListener('change', () => { if (r.checked) on.plat(v); });
      radios[v] = r;
      lab.append(r, el('span', null, text));
      seg.append(lab);
    }
    const table = el('div', 'ch-rows'); table.id = 'ch-d-rows';
    const btns = {}, lims = {};
    for (const r of rows) {
      const b = el('button', 'ch-row'); b.type = 'button'; b.dataset.k = r.k; b.setAttribute('aria-pressed', 'false');
      const lim = el('span', 'ch-r-lim');
      b.append(el('b', 'ch-r-name', r.name), lim, el('small', 'ch-r-q', r.question));
      b.addEventListener('click', () => on.select(r.k));
      btns[r.k] = b; lims[r.k] = lim;
      table.append(b);
    }
    const zone = el('div', 'ch-zone'); zone.id = 'ch-d-zone'; zone.setAttribute('aria-live', 'polite');
    body.append(seg, table, zone);
    Object.assign(root._ch.hard, { radios, btns, lims, zone });
  }

  // Lista con título: items de HARD_METRICS.diag/lever (texto plano o segmentos).
  function failList(cls, title, items) {
    const box = el('div', 'ch-z-fail ' + cls), ul = el('ul');
    for (const it of items) { const li = el('li'); PYL.ui.dom.rich(li, asSegs(it)); ul.append(li); }
    box.append(el('b', 'ch-z-lab', title), ul);
    return box;
  }

  // Repinta el panel: radios, límite de cada fila (según la plataforma), fila marcada y zona de detalle.
  // rows = chHard(plat) · v = { sel, plat } · o = { head: FAIL_HEAD, fmt: copText (miles es-CO) }
  const ZONE_LABELS = [['escala', 'Escala bajo'], ['tope', 'Tope'], ['apaga', 'Apaga sobre']];
  function hardRender(root, rows, v, o) {
    const h = root._ch.hard, row = rows.find((r) => r.k === v.sel);
    for (const [p, r] of Object.entries(h.radios)) r.checked = p === v.plat;
    for (const r of rows) h.lims[r.k].textContent = r.main;
    for (const [k, b] of Object.entries(h.btns)) { b.classList.toggle('on', k === v.sel); b.setAttribute('aria-pressed', String(k === v.sel)); }
    const z = h.zone; z.textContent = '';
    z.append(el('b', 'ch-z-title', row.name + ' · ' + row.question));
    const lim = el('div', 'ch-z-limits');
    if (row.tip) {
      lim.append(el('b', 'ch-z-lab', row.tip.h));
      for (const [before, hi, cls, after] of row.tip.li) { const p = el('p', 'ch-z-row'); p.append(before, el('b', cls ? 'ch-' + cls : null, hi), after); lim.append(p); }
      if (row.tip.p) lim.append(el('p', 'ch-z-note', row.tip.p));
    } else if (row.zones) {
      lim.append(el('b', 'ch-z-lab', 'Zonas del CPA (genéricas)'));
      for (const [k, text] of ZONE_LABELS) { const p = el('p', 'ch-z-row'); p.append(text + ' ', el('b', null, '$ ' + o.fmt(row.zones[k]))); lim.append(p); }
    }
    if (row.warn) lim.append(el('p', 'hm-warn', '⚠ ' + row.warn));
    z.append(lim, failList('ch-z-diag', o.head[0], row.diag), failList('ch-z-lever', o.head[1], row.lever));
  }

  PYL.ui.cheat = { ICON_CHAIN, ICON_HARD, build, render, chainBuild, chainSel, hardBuild, hardRender };
})();
