// Evaluador de candidatos (pestaña Buscar producto): formulario "Mi candidato" con foto, score en vivo,
// análisis de costos y bitácora con filtros y estadísticas. Recibe datos y callbacks; no guarda estado.
(() => {
  const PYL = globalThis.PYL;
  const { el, setPressed, copy } = PYL.ui.dom;

  const nf = (v) => Math.round(v).toLocaleString('es-CO');
  const money = (v) => (v == null || !isFinite(v) ? '—' : (v < 0 ? '−$' : '$') + nf(Math.abs(v)));
  const pct = (r) => Math.round(r * 100) + '%';
  const TAG = { g: 'tg', y: 'ty', o: 'to', r: 'tr', b: 'tb', n: 'tn' };
  // Colores vivos de las gráficas (se ven igual en modo claro y oscuro).
  const COLOR = { g: '#22C55E', y: '#FBBF24', o: '#F97316', r: '#EF4444', b: '#818CF8', n: '#64748B' };
  const tag = (tone, text) => el('span', 'tag ' + (TAG[tone] || 'tn'), text);
  const dash = () => el('span', 'soft', '—');

  // ---------- Formulario ----------
  const group = (title, hint) => {
    const g = el('div', 'cd-group');
    const h = el('div', 'cd-h'); h.append(el('span', null, title));
    if (hint) h.append(el('small', null, hint));
    g.append(h); return g;
  };

  function input(k, label, o) {
    const opt = o || {}, box = el('div', 'field'), id = 'b-f-' + k;
    const lab = el('label', null, label); lab.htmlFor = id;
    const x = el(opt.area ? 'textarea' : 'input');
    if (!opt.area) { x.type = opt.text ? 'text' : 'number'; if (!opt.text) { x.inputMode = 'numeric'; x.min = '0'; } }
    else x.rows = 3;
    x.id = id; x.dataset.k = k;
    if (opt.ph != null) x.placeholder = opt.ph;
    box.append(lab);
    if (opt.money || opt.pct) { const w = el('div', opt.money ? 'in-money' : 'in-pct'); w.append(x); box.append(w); }
    else if (opt.copy) { const w = el('div', 'in-copy'); w.append(x, copyBtn(() => x.value, label)); box.append(w); }
    else box.append(x);
    return box;
  }

  // Botón para copiar un valor (nombre, ID Dropi) sin tener que seleccionarlo.
  // get() devuelve el texto al momento del clic; cls = variante ('inline' en la bitácora).
  const ICON_COPY = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
  const ICON_OK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-11"/></svg>';
  function copyBtn(get, label, cls) {
    const b = el('button', 'cd-copy' + (cls ? ' ' + cls : '')); b.type = 'button';
    b.title = 'Copiar ' + label.toLowerCase(); b.setAttribute('aria-label', b.title); b.innerHTML = ICON_COPY;
    const tip = el('span', 'cd-copy-tip'); b.append(tip);
    let t;
    b.addEventListener('click', async () => {
      const v = String(get() || '').trim(), ok = v && (await copy(v));
      b.classList.toggle('ok', !!ok); b.innerHTML = ok ? ICON_OK : ICON_COPY; b.append(tip);
      tip.textContent = !v ? 'Vacío' : ok ? '¡Copiado!' : 'No se pudo copiar'; b.classList.add('show');
      clearTimeout(t); t = setTimeout(() => { b.classList.remove('show', 'ok'); b.innerHTML = ICON_COPY; b.append(tip); }, 1400);
    });
    return b;
  }

  // Botones de selección: uno (multi = false, se deselecciona con otro clic) o varios.
  function chips(k, items, multi, cls) {
    const row = el('div', 'cd-chips ' + (cls || ''));
    row.dataset.g = k; if (multi) row.dataset.multi = '1';
    items.forEach((it) => {
      const b = el('button', 'cd-chip' + (it.tone ? ' t-' + it.tone : ''));
      b.type = 'button'; b.dataset.v = String(it.k); b.setAttribute('aria-pressed', 'false');
      if (it.n != null) b.append(el('b', null, String(it.n)));
      if (it.icon) b.append(el('span', 'cd-ic', it.icon));
      b.append(el('span', null, it.t));
      row.append(b);
    });
    return row;
  }

  // cfg = core.search; on = { change(k, v), photo(file), photoClear() }.
  function build(node, cfg, on) {
    node.textContent = '';
    const D = cfg.COST_DEFAULTS;

    const photo = el('label', 'cd-photo');
    const file = el('input'); file.type = 'file'; file.accept = 'image/*'; file.className = 'cd-file';
    const img = el('img'); img.alt = 'Foto del producto';
    const empty = el('span', 'cd-photo-empty'); empty.append(el('b', null, 'Toco para subir la foto'), el('small', null, 'Se comprime sola'));
    photo.append(file, img, empty);
    file.addEventListener('change', () => { if (file.files[0]) on.photo(file.files[0]); file.value = ''; });
    const rm = el('button', 'btn ghost sm cd-photo-rm', 'Quitar foto'); rm.type = 'button';
    rm.addEventListener('click', on.photoClear);
    const gp = group('Foto del producto'); gp.append(photo, rm);

    const gid = el('div', 'form cd-2');
    gid.append(input('name', 'Nombre del producto', { text: true, copy: true, ph: 'Ej. Masajeador cervical inalámbrico' }), input('dropi', 'ID Dropi', { text: true, copy: true, ph: 'Ej. 1863859' }));

    const gc = group('Precios y costos del negocio');
    const pr = el('div', 'form cd-2');
    pr.append(input('price', 'Precio proveedor', { money: true, ph: '0' }), input('sellPrice', 'Precio de venta', { money: true, ph: '0' }));
    const ops = el('div', 'cd-sub'); ops.append(el('div', 'cd-h', 'Costos operativos'));
    const of = el('div', 'form cd-2');
    of.append(input('flete', 'Flete base promedio', { money: true, ph: nf(D.flete) }), input('cpa', 'CPA Ads Manager', { money: true, ph: nf(D.cpa) }),
      input('devRate', '% devoluciones', { pct: true, ph: String(D.devRate) }), input('cancelRate', '% cancelaciones', { pct: true, ph: String(D.cancelRate) }));
    ops.append(of, el('p', 'small cd-note', 'Vacíos usan el costeo genérico de NovaSociety: 25% devoluciones y 25% cancelaciones (50% de entrega efectiva).'));
    gc.append(pr, ops);

    const gs = group('Estado'); gs.append(chips('status', cfg.STATUS.map((s) => ({ ...s, t: s.k === 'testeo' ? 'Testeo' : s.t })), false, 'cd-status'));
    const gm = group('MSP', 'qué tan grande y doloroso es el problema');
    gm.append(chips('msp', cfg.MSP, false, 'cd-msp'));
    const gv = group('Percepción de valor'); gv.append(chips('val', cfg.VALUE, false));

    const gk = group('Mi mercado objetivo');
    const sel = el('select'); sel.id = 'b-f-market'; sel.dataset.k = 'market'; sel.setAttribute('aria-label', 'Mi mercado objetivo');
    [['', '— Selecciono país —'], ...cfg.COUNTRIES.map((c) => [c.k, `${c.k}  ${c.t}`])].forEach(([v, t]) => { const o = el('option', null, t); o.value = v; sel.append(o); });
    const fk = el('div', 'field'); fk.append(sel); gk.append(fk);

    const gx = group('Ventas en mi mercado (DropKiller)', 'sumando todos los proveedores con "Buscar similares"');
    const sx = el('div', 'form cd-3');
    sx.append(input('sales7', '7 días', { ph: '0' }), input('sales30', '30 días', { ph: '0' }), input('salesTotal', 'Total', { ph: '0' }));
    gx.append(sx, el('div', 'cd-comp', ''));

    const gd = group('Datos DropKiller', 'para el semáforo "¿Lo testeo?"');
    const dx = el('div', 'form cd-3');
    dx.append(input('prov', 'Proveedores (Buscar similares)', { ph: '0' }), input('advertisers', 'Anunciantes en mi mercado', { ph: '0' }), input('adDays', 'Días activo del anuncio más viejo', { ph: '0' }),
      input('stock', 'Stock', { ph: '0' }));
    const ia = el('div', 'field'); ia.append(el('label', null, 'IA de saturación'), chips('ia', cfg.SATURATION, false, 'cd-sat'));
    dx.append(ia);
    const sup = el('div', 'cd-sups'); sup.dataset.list = 'suppliers';
    const add = el('button', 'btn ghost sm cd-add', '+ Agregar proveedor'); add.type = 'button';
    add.addEventListener('click', () => on.change('suppliers', readSuppliers(node).concat({ name: '', created: '' }), true));
    const gsu = el('div', 'cd-sub'); gsu.append(el('div', 'cd-h', 'Proveedores y fecha de creación del producto'), sup, add);
    gd.append(dx, gsu);

    const gpz = group('Países validados', 'donde ya se vende'); gpz.append(chips('validated', cfg.COUNTRIES.map((c) => ({ k: c.k, t: c.k })), true, 'cd-countries'));
    const gn = group('Notas'); const fn = input('notes', 'Notas', { area: true, ph: 'Observaciones, links, ángulos creativos…' });
    fn.querySelector('label').className = 'sr-only'; gn.append(fn);

    // Arriba: foto a la izquierda y, a su lado, estado, MSP y percepción de valor.
    const top = el('div', 'cd-top'), right = el('div', 'cd-top-r');
    right.append(gs, gm, gv); top.append(gp, right);
    node.append(top, gid, gc, gk, gx, gd, gpz, gn);

    // Un solo listener por tipo: inputs y botones de selección.
    node.addEventListener('input', (e) => {
      if (e.target.dataset.sup != null) { on.change('suppliers', readSuppliers(node)); return; }
      const k = e.target.dataset.k; if (k) on.change(k, e.target.value);
    });
    node.addEventListener('change', (e) => { if (e.target.tagName === 'SELECT' && e.target.dataset.k) on.change(e.target.dataset.k, e.target.value); });
    node.addEventListener('click', (e) => {
      const rm = e.target.closest('.cd-sup-rm');
      if (rm) { const list = readSuppliers(node); list.splice(Number(rm.dataset.i), 1); on.change('suppliers', list, true); return; }
      const b = e.target.closest('.cd-chip'); if (!b) return;
      const g = b.parentElement, k = g.dataset.g, v = b.dataset.v;
      if (g.dataset.multi) {
        const cur = Array.from(g.querySelectorAll('[aria-pressed="true"]')).map((x) => x.dataset.v);
        on.change(k, cur.includes(v) ? cur.filter((x) => x !== v) : cur.concat(v));
      } else {
        const was = b.getAttribute('aria-pressed') === 'true';
        on.change(k, was ? '' : v);
      }
    });
  }

  // Filas de proveedores: nombre + fecha de creación de su producto. Siempre queda al menos una fila.
  function suppliers(node, list) {
    const box = node.querySelector('[data-list="suppliers"]'); box.textContent = '';
    const rows = list && list.length ? list : [{ name: '', created: '' }];
    rows.forEach((s, i) => {
      const r = el('div', 'cd-sup');
      const nm = el('input'); nm.type = 'text'; nm.placeholder = `Proveedor ${i + 1}`; nm.value = s.name || ''; nm.dataset.sup = i; nm.dataset.f = 'name'; nm.setAttribute('aria-label', `Nombre del proveedor ${i + 1}`);
      const dt = el('input'); dt.type = 'date'; dt.value = s.created || ''; dt.dataset.sup = i; dt.dataset.f = 'created'; dt.setAttribute('aria-label', `Fecha de creación del producto del proveedor ${i + 1}`);
      const x = el('button', 'cd-sup-rm', '×'); x.type = 'button'; x.dataset.i = i; x.title = 'Quitar proveedor'; x.hidden = rows.length === 1;
      r.append(nm, dt, x); box.append(r);
    });
  }

  function readSuppliers(node) {
    return Array.from(node.querySelectorAll('.cd-sup')).map((r) => ({ name: r.querySelector('[data-f="name"]').value, created: r.querySelector('[data-f="created"]').value }));
  }

  // Pone los valores del candidato en el formulario (al abrir, limpiar o cambiar de producto).
  function fill(node, d) {
    suppliers(node, d.suppliers);
    node.querySelectorAll('[data-k]').forEach((x) => { const v = d[x.dataset.k]; x.value = v == null ? '' : v; });
    node.querySelectorAll('.cd-chips').forEach((g) => {
      const v = d[g.dataset.g], on = Array.isArray(v) ? v.map(String) : v === '' || v == null ? [] : [String(v)];
      g.querySelectorAll('.cd-chip').forEach((b) => b.setAttribute('aria-pressed', String(on.includes(b.dataset.v))));
    });
    const ph = node.querySelector('.cd-photo');
    ph.classList.toggle('has', !!d.photo);
    ph.querySelector('img').src = d.photo || '';
    node.querySelector('.cd-photo-rm').hidden = !d.photo;
  }

  // Botones de selección tras un clic (sin repintar todo el formulario).
  function syncChips(node, k, v) {
    const g = node.querySelector(`.cd-chips[data-g="${k}"]`); if (!g) return;
    const on = Array.isArray(v) ? v.map(String) : v === '' || v == null ? [] : [String(v)];
    g.querySelectorAll('.cd-chip').forEach((b) => b.setAttribute('aria-pressed', String(on.includes(b.dataset.v))));
  }

  function comp(node, c) {
    const box = node.querySelector('.cd-comp');
    box.className = 'cd-comp' + (c ? ' t-' + c.tone : '');
    box.textContent = c ? `${c.t} · ${c.d}` : '— Escribo las ventas de 7 días —';
  }

  // ---------- Panel en vivo ----------
  function scoreBox(node, s, max, level, parts, editing) {
    node.textContent = '';
    node.className = 'cd-score t-' + level.tone;
    node.append(el('span', 'cd-score-l', editing ? 'Score · editando' : 'Score en vivo'), el('b', 'cd-score-n', `${s} / ${max}`), tag(level.tone, level.t));
    const ul = el('div', 'cd-parts');
    parts.forEach((p) => {
      const c = el('span', 'cd-part' + (p.pts ? ' on' : ''));
      c.append(el('span', null, p.t), el('b', null, `+${p.pts}/${p.max}`));
      ul.append(c);
    });
    node.append(ul);
  }

  function cost(node, u, ml) {
    node.textContent = '';
    if (!u) { node.append(el('p', 'cd-empty', 'Escribo los precios para ver el análisis.')); return; }
    const row = (l, v, note, cls) => {
      const r = el('div', 'cd-row' + (cls ? ' ' + cls : ''));
      const vv = el('span', 'cd-v', v); if (note) vv.append(el('small', null, note));
      r.append(el('span', null, l), vv); return r;
    };
    node.append(row('Flete costeado', money(u.fleteC), ` (${pct(u.entDesp)} entrega)`),
      row('CPA costeado', money(u.cpaC), ` (${pct(u.entEfec)} efectivo)`),
      row('Costos totales', money(u.costoT), null, 'cd-strong'),
      row('Precio de venta', money(u.venta)));
    const hl = el('div', 'cd-hl t-' + (u.utilidad >= 0 ? (ml ? ml.tone : 'g') : 'r'));
    const v = el('b', null, money(u.utilidad));
    if (u.margen != null) v.append(' ', tag(ml.tone, `${pct(u.margen)} · ${ml.t}`));
    hl.append(el('span', null, 'Utilidad neta por entrega'), v);
    node.append(hl);
    const ex = el('div', 'cd-extras');
    const card = (l, v2, cls) => { const c = el('div', 'cd-extra'); c.append(el('span', null, l), el('b', cls, v2)); return c; };
    ex.append(card('Precio de comparación', money(u.precioComp)), card('CPA de equilibrio', u.cpaMax > 0 ? money(u.cpaMax) : '—', 'cd-y'));
    node.append(ex);
    if (!u.complete) node.append(el('p', 'small cd-note', 'Falta el precio proveedor o el de venta para que el cálculo sea completo.'));
  }

  // ---------- Bitácora ----------
  function filters(node, items, active, onPick) {
    node.textContent = '';
    items.forEach((f) => {
      const b = el('button', 'cd-filter', (f.icon ? f.icon + ' ' : '') + f.t); b.type = 'button';
      b.setAttribute('aria-pressed', String(f.k === active));
      b.addEventListener('click', () => onPick(f.k)); node.append(b);
    });
  }

  function counts(node, st, poco) {
    node.textContent = '';
    const c = (icon, l, v, cls) => { const s = el('span', 'cd-count ' + (cls || '')); s.title = l; s.append(icon + ' ', el('b', null, String(v))); return s; };
    const total = el('span', 'cd-count'); total.append('Total ', el('b', null, String(st.total)));
    node.append(total, c('🔥', 'Alto potencial', st.high, 'o'), c('🟢', 'Poco competidos', poco, 'g'), c('🏆', 'Ganadores', st.winners, 'y'));
  }

  const ago = (id) => {
    const t = Number(id); if (!t) return '—';
    const d = Math.floor((Date.now() - t) / 86400000);
    if (d <= 0) return 'Hoy'; if (d === 1) return 'Ayer'; if (d < 7) return `Hace ${d}d`;
    const x = new Date(t); return `${x.getDate()} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][x.getMonth()]}`;
  };

  // Íconos fijos (lápiz y papelera); trazo con currentColor para que tomen el color del botón.
  const svg = (d) => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON = {
    edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
    del: svg('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>'),
  };
  function iconBtn(cls, icon, label, onClick) {
    const b = el('button', cls); b.type = 'button'; b.title = label; b.setAttribute('aria-label', label);
    b.innerHTML = icon; b.addEventListener('click', onClick);
    return b;
  }

  // rows: [{ p, score, level, comp, util, ml, status }]; sort actual; on = { open(id), sort(col), del(id) }.
  function table(node, rows, total, sort, editingId, on) {
    node.textContent = '';
    if (!rows.length) {
      const e = el('div', 'cd-emptybox');
      e.append(el('b', null, total ? 'Sin resultados' : 'Mi primer producto puede cambiarlo todo'),
        el('span', null, total ? 'Ningún producto coincide con este filtro.' : 'Lleno "Mi candidato" y toco "Guardar". Cada producto que evalúo me acerca al ganador.'));
      node.append(e); return;
    }
    const wrap = el('div', 'tbl-wrap cd-tbl'), t = el('table'), th = el('thead'), tb = el('tbody'), hr = el('tr');
    const arrow = (col) => (sort === col + '-desc' ? ' ↓' : sort === col + '-asc' ? ' ↑' : ' ↕');
    [['Foto'], ['Producto'], ['Estado'], ['Precio / utilidad'], ['MSP'], ['Competencia (7d)', 'comp'], ['Validado'], ['Score', 'score'], ['']].forEach(([h, col]) => {
      const c = el('th');
      if (col) { const b = el('button', 'cd-sort', h + arrow(col)); b.type = 'button'; b.addEventListener('click', () => on.sort(col)); c.append(b); } else c.textContent = h;
      hr.append(c);
    });
    th.append(hr);
    rows.forEach((r) => {
      const p = r.p, tr = el('tr', 'cd-tr' + (p.id === editingId ? ' editing' : '') + (p.status === 'ganador' ? ' win' : p.status === 'activo' ? ' act' : ''));

      const ph = el('td');
      if (p.photo) { const im = el('img', 'cd-thumb'); im.src = p.photo; im.alt = ''; ph.append(im); } else ph.append(el('span', 'cd-thumb cd-thumb-empty', '📦'));
      const sup = (p.suppliers || []).filter((s) => s.name).map((s) => s.name);
      // Nombre e ID Dropi con su botón de copiar al lado.
      const pn = el('td'), nl = el('div', 'cd-pline'), ml = el('small', 'cd-pmeta cd-pline');
      nl.append(el('b', 'cd-pname', p.name || 'Sin nombre'));
      if (p.name) nl.append(copyBtn(() => p.name, 'Nombre del producto', 'inline'));
      if (p.dropi) ml.append(el('span', null, 'ID ' + p.dropi), copyBtn(() => p.dropi, 'ID Dropi', 'inline'));
      const rest = [p.market, sup.length ? sup[0] + (sup.length > 1 ? ` +${sup.length - 1}` : '') : '', ago(p.id)].filter(Boolean).join(' · ');
      if (rest) ml.append(el('span', 'cd-prest', (p.dropi ? '· ' : '') + rest));
      pn.append(nl, ml);
      const st = el('td'); st.append(r.status ? tag(r.status.tone, `${r.status.icon} ${r.status.t}`) : dash());
      const pr = el('td');
      if (r.util) {
        if (r.util.costo) pr.append(el('small', 'cd-pmeta', 'Prov: ' + money(r.util.costo)));
        if (r.util.complete) { const v = el('div', 'cd-price'); v.append(money(r.util.venta), ' ', tag(r.ml.tone, `${money(r.util.utilidad)} (${pct(r.util.margen)})`)); pr.append(v); }
        else if (r.util.venta) pr.append(el('div', 'cd-price', money(r.util.venta)));
      } else pr.append(dash());
      const msp = el('td'); msp.append(r.msp ? tag(r.msp.k === 'alto' ? 'g' : r.msp.k === 'medio' ? 'y' : 'n', `${r.msp.icon} ${r.msp.t}`) : dash());
      const cp = el('td');
      if (r.comp) { cp.append(tag(r.comp.tone, r.comp.t), el('small', 'cd-pmeta', `${nf(Number(p.sales7))} ventas`)); } else cp.append(dash());
      const va = el('td'); if ((p.validated || []).length) { const f = el('span', 'cd-flags'); p.validated.forEach((c) => f.append(el('span', null, c))); va.append(f); } else va.append(dash());
      const sc = el('td'); sc.append(el('span', 'cd-badge t-' + r.level.tone, `${r.score}/8`));
      // Acciones de la fila como íconos: Editar (lo carga en Mi candidato) y Eliminar.
      const ac = el('td'), acts = el('div', 'cd-acts'), name = p.name || 'este producto';
      acts.append(iconBtn('cd-act edit', ICON.edit, `Editar ${name} en Mi candidato`, () => on.open(p.id)),
        iconBtn('cd-act del', ICON.del, `Eliminar ${name} de la bitácora`, () => on.del(p.id)));
      ac.append(acts);
      tr.append(ph, pn, st, pr, msp, cp, va, sc, ac);
      tb.append(tr);
    });
    t.append(th, tb); wrap.append(t); node.append(wrap);
  }

  // ---------- Estadísticas ----------
  function donut(title, data, total) {
    const c = el('div', 'card cd-chart'); c.append(el('h3', null, title));
    if (!total || !data.length) { c.append(el('p', 'muted', 'Sin datos aún.')); return c; }
    let acc = 0;
    const stops = data.map((d) => { const a = acc; acc += (d.n / total) * 100; return `${COLOR[d.tone] || 'var(--b)'} ${a.toFixed(1)}% ${acc.toFixed(1)}%`; });
    const w = el('div', 'cd-donut-wrap'), ring = el('div', 'cd-donut');
    ring.style.background = `conic-gradient(${stops.join(',')})`;
    const hole = el('span', 'cd-hole'); hole.append(el('b', null, String(total)), el('small', null, 'total')); ring.append(hole);
    const leg = el('div', 'cd-leg');
    data.forEach((d) => {
      const r = el('div', 'cd-leg-row'); r.style.setProperty('--c', COLOR[d.tone]);
      r.append(el('i'), el('span', 'cd-leg-t', (d.icon ? d.icon + ' ' : '') + d.t), el('b', null, String(d.n)), el('small', null, pct(d.n / total)));
      leg.append(r);
    });
    w.append(ring, leg); c.append(w); return c;
  }

  function bars(title, data) {
    const c = el('div', 'card cd-chart'); c.append(el('h3', null, title));
    if (!data.length) { c.append(el('p', 'muted', 'Sin datos aún.')); return c; }
    const max = Math.max(...data.map((d) => d.n), 1);
    data.forEach((d) => {
      const r = el('div', 'cd-barrow'), tr = el('div', 'cd-track'), f = el('i');
      r.style.setProperty('--c', COLOR[d.tone] || COLOR.b);
      f.style.width = Math.max(4, (d.n / max) * 100) + '%';
      const lb = el('span', 'cd-bar-l');
      if (d.code) lb.append(el('span', 'cd-code', d.code), ' ' + d.t); else lb.textContent = (d.icon ? d.icon + ' ' : '') + d.t;
      tr.append(f); r.append(lb, tr, el('b', null, String(d.n))); c.append(r);
    });
    return c;
  }

  function statsView(node, st) {
    node.textContent = '';
    const k = el('div', 'cd-kpis');
    const kpi = (icon, l, v, s, tone) => {
      const d = el('div', 'cd-kpi'); d.style.setProperty('--c', COLOR[tone]);
      const h = el('div', 'cd-kpi-l'); h.append(el('span', 'cd-kpi-ic', icon), l);
      d.append(h, el('div', 'cd-kpi-v', v), el('div', 'cd-kpi-s', s)); return d;
    };
    const u = st.avgUtil;
    k.append(kpi('📦', 'Productos evaluados', String(st.total), `${st.high} con alto potencial`, 'b'),
      kpi('🔥', 'Tasa de alto potencial', st.highRate == null ? '—' : pct(st.highRate), 'Score de 7 o más', 'o'),
      kpi('💵', 'Utilidad neta promedio', money(u), `${st.withCost} con cálculo completo`, u != null && u < 0 ? 'r' : 'g'),
      kpi('🏆', 'Ganadores', String(st.winners), `${st.winnersRate == null ? '0%' : pct(st.winnersRate)} del total`, 'y'));
    const g = el('div', 'cd-charts mt');
    g.append(donut('🎯 Distribución por score', st.byScore, st.total), donut('📌 Distribución por estado', st.byStatus, st.total),
      bars('🌎 Top mercados', st.byMarket), bars('⚔️ Nivel de competencia', st.byComp));
    node.append(k, g);
  }

  PYL.ui.candidate = { build, fill, syncChips, comp, scoreBox, cost, filters, counts, table, statsView, setPressed, copyBtn };
})();
