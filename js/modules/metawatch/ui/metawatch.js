// Cortes de testeo en la barra (SPEC 21): pinta el bloque y el panel. No guarda estado:
// recibe la vista ya calculada por app/metawatch.js y avisa con callbacks.
(() => {
  const PYL = globalThis.PYL;
  const { el } = PYL.ui.dom;

  // Bloque de la barra. view = { head, sub, msg, rows, marks, label }.
  // rows: [{ id, short, name, k, fill, active, alert }]; marks: posiciones de los cortes (0–1).
  // Todo va en <span>: el bloque es un <button>.
  const rail = (btn, view) => {
    btn.textContent = '';
    const head = el('span', 'mw-head');
    head.append(el('b', null, view.head));
    if (view.sub) head.append(el('span', 'mw-sub', ' · ' + view.sub));
    btn.append(head);
    if (view.msg) btn.append(el('span', 'mw-msg', view.msg));
    const list = el('span', 'mw-sets');
    for (const r of view.rows || []) {
      const row = el('span', 'mw-set' + (r.active ? '' : ' mw-off-set') + (r.alert != null ? ' mw-alert' : ''));
      row.dataset.id = r.id;
      if (r.alert != null) row.dataset.cut = String(r.alert);
      row.title = r.name;
      row.append(el('span', 'mw-short', r.short));
      if (r.active) {
        const bar = el('span', 'mw-bar');
        const fill = el('span', 'mw-fill');
        fill.style.width = Math.round(r.fill * 1000) / 10 + '%';
        bar.append(fill);
        for (const m of view.marks || []) {
          const mk = el('i', 'mw-mark');
          mk.style.left = Math.round(m * 1000) / 10 + '%';
          bar.append(mk);
        }
        row.append(bar);
      } else row.append(el('span', 'mw-tag', 'OFF'));
      row.append(el('span', 'mw-k', r.k));
      list.append(row);
    }
    if (list.childNodes.length) btn.append(list);
    btn.setAttribute('aria-label', view.label);
  };

  // Tarjetas del teléfono de Inicio (SVG #mw-hero-*). view = { cpm, cpmLight, sales, bars, cpa, cpaLight, cpaFill,
  // topeAt, note } con textos ya formateados; null = sin dato (rayas y sin semáforo). No guarda estado.
  const LIGHT = { g: '#22C55E', y: '#EAB308', r: '#EF4444' }, NONE = '#3A475A';
  const SOFT = { g: 'rgba(34,197,94,.18)', y: 'rgba(234,179,8,.18)', r: 'rgba(239,68,68,.18)' };
  const INK = { g: '#6EE7A0', y: '#FDE047', r: '#FCA5A5' };
  const BARS = ['#2E3D59', '#4A5DCC', 'var(--b)', '#22D3EE', '#7DE6F6'];
  const SVGNS = 'http://www.w3.org/2000/svg';
  const hero = (svg, view) => {
    const v = view || {};
    const q = (id, cls) => svg.querySelector('#' + id + ' .' + cls);
    const set = (id, cls, text) => { const n = q(id, cls); if (n) n.textContent = text; };
    const show = (n, on) => { if (n) n.setAttribute('visibility', on ? 'visible' : 'hidden'); };
    // CPM Meta
    set('mw-hero-cpm', 'mh-val', v.cpm || '—');
    const dot = q('mw-hero-cpm', 'mh-dot');
    if (dot) dot.setAttribute('fill', LIGHT[v.cpmLight] || NONE);
    const bg = q('mw-hero-cpm', 'mh-badge'), bt = q('mw-hero-cpm', 'mh-badge-t');
    show(bg, !!v.cpmLight);
    show(bt, !!v.cpmLight);
    if (v.cpmLight) {
      bg.setAttribute('fill', SOFT[v.cpmLight]);
      bt.setAttribute('fill', INK[v.cpmLight]);
      bt.textContent = v.cpmLight === 'g' ? 'OK' : 'CARO';
    }
    // Ventas: número y una barrita por conjunto (alto proporcional a sus ventas)
    set('mw-hero-sales', 'mh-val', v.sales == null ? '—' : String(v.sales));
    const g = q('mw-hero-sales', 'mh-bars');
    if (g) {
      g.textContent = '';
      const bars = (v.bars || []).slice(0, BARS.length), top = Math.max(1, ...bars);
      bars.forEach((n, i) => {
        const h = n > 0 ? Math.max(6, Math.round((n / top) * 46)) : 3;
        const r = document.createElementNS(SVGNS, 'rect');
        r.setAttribute('x', String(386 + i * 11));
        r.setAttribute('y', String(132 - h));
        r.setAttribute('width', '8');
        r.setAttribute('height', String(h));
        r.setAttribute('rx', '3');
        r.setAttribute('fill', n > 0 ? BARS[i] : '#263243');
        g.append(r);
      });
    }
    // CPA contra el tope
    const cd = q('mw-hero-cpa', 'mh-dot');
    if (cd) cd.setAttribute('fill', LIGHT[v.cpaLight] || NONE);
    const fill = q('mw-hero-cpa', 'mh-fill');
    if (fill) {
      fill.setAttribute('width', String(Math.round((v.cpaFill || 0) * 118)));
      fill.setAttribute('fill', LIGHT[v.cpaLight] || NONE);
    }
    const mark = q('mw-hero-cpa', 'mh-mark');
    show(mark, v.topeAt != null);
    if (mark && v.topeAt != null) mark.setAttribute('x', String(Math.round(316 + v.topeAt * 118 - 1)));
    set('mw-hero-cpa', 'mh-note', v.note || '');
    // CPA actual
    set('mw-hero-cpa-now', 'mh-val', v.cpa || '—');
    const ic = q('mw-hero-cpa-now', 'mh-ic'), it = q('mw-hero-cpa-now', 'mh-ic-t');
    show(ic, !!v.cpaLight);
    show(it, !!v.cpaLight);
    if (v.cpaLight) {
      ic.setAttribute('fill', SOFT[v.cpaLight]);
      it.setAttribute('fill', INK[v.cpaLight]);
      it.textContent = v.cpaLight === 'g' ? '✓' : v.cpaLight === 'y' ? '!' : '✕';
    }
    // Foto del producto en la pantalla del teléfono (reemplaza la botella de ejemplo)
    const img = svg.querySelector('#mw-hero-photo'), art = svg.querySelector('#mw-hero-art');
    if (img) {
      if (v.photo) img.setAttribute('href', v.photo);
      show(img, !!v.photo);
    }
    if (art) show(art, !v.photo);
    if (v.label) svg.setAttribute('aria-label', v.label);
  };

  // Estimado de la campaña junto al tema: view = { rows: [[etiqueta, valor, tono?]], label, hint } o null (se oculta).
  const sum = (node, v) => {
    node.textContent = '';
    node.hidden = !v;
    if (!v) return;
    node.setAttribute('role', 'group');
    node.setAttribute('aria-label', v.label);
    node.title = v.hint;
    node.append(el('span', 'mw-sum-cap', 'ESTIMADO DE CAMPAÑA'));
    for (const [k, val, tone] of v.rows) {
      const r = el('span', 'mw-sum-row' + (tone ? ' ' + tone : ''));
      r.append(el('span', 'mw-sum-k', k), el('b', 'mw-sum-v', val));
      node.append(r);
    }
  };

  // Lluvia de bolitas con el ícono de Shopify: sube por la pantalla del teléfono (de abajo hacia arriba) cuando una
  // consulta trae una venta nueva. Cada bolita se borra sola al terminar. Sin animación con prefers-reduced-motion.
  const rain = (svg) => {
    const g = svg.querySelector('#mw-hero-rain');
    if (!g || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    const mk = (tag, attrs) => {
      const n = document.createElementNS(SVGNS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      return n;
    };
    for (let i = 0; i < 16; i++) {
      const drop = mk('g', { class: 'mh-drop' }), sc = 0.8 + Math.random() * 0.5;
      const dur = 2.2 + Math.random() * 1.3, delay = Math.random() * 1.4;
      drop.style.setProperty('--dx', Math.round(Math.random() * 24 - 12) + 'px');
      drop.style.animationDuration = dur + 's';
      drop.style.animationDelay = delay + 's';
      const at = mk('g', { transform: 'translate(' + Math.round(186 + Math.random() * 118) + ' 306) scale(' + sc.toFixed(2) + ')' });
      at.append(
        mk('circle', { r: '9', fill: '#131B27', stroke: '#95BF47', 'stroke-width': '1.4' }),
        mk('path', { d: 'M-4.6 -2.6h9.2l-.9 8.2h-7.4z', fill: '#95BF47' }),
        mk('path', { d: 'M-2.3 -2.6v-.9a2.3 2.3 0 0 1 4.6 0v.9', fill: 'none', stroke: '#95BF47', 'stroke-width': '1.3', 'stroke-linecap': 'round' }),
      );
      drop.append(at);
      g.append(drop);
      setTimeout(() => drop.remove(), (dur + delay) * 1000 + 300);
    }
  };

  // none = texto cuando la lista vino vacía: única opción y lista deshabilitada.
  const select = (id, label, empty, opts, value, onChange, off, none) => {
    const wrap = el('label', 'mw-field');
    wrap.append(el('span', 'mw-lab', label));
    const s = el('select', 'mw-in');
    s.id = id;
    s.append(new Option(none || empty, ''));
    for (const o of opts) s.append(new Option(o.label, o.id));
    s.value = value || '';
    s.disabled = !!off || !!none;
    s.addEventListener('change', () => onChange(s.value));
    wrap.append(s);
    return wrap;
  };

  // Filas del panel: rows = [{ id, short, name, active, pulse, cells: [[etiqueta, valor]], verdict: { text, light } | null }].
  const rowsList = (rows, onSeen) => {
    const ul = el('ul', 'mw-rows');
    ul.id = 'mw-rows';
    for (const r of rows) {
      const li = el('li', 'mw-prow' + (r.active ? '' : ' mw-off-set') + (r.pulse ? ' mw-alert' : ''));
      li.dataset.id = r.id;
      const h = el('div', 'mw-pname');
      h.append(el('b', null, r.short), ' ' + r.name);
      if (!r.active) h.append(el('span', 'mw-tag', 'OFF'));
      li.append(h);
      const dl = el('dl', 'mw-cells');
      for (const [k, v] of r.cells) dl.append(el('dt', null, k), el('dd', null, v));
      li.append(dl);
      if (r.verdict) li.append(el('p', 'mw-verdict mw-l-' + (r.verdict.light || 'n'), r.verdict.text));
      if (r.pulse) {
        const b = el('button', 'btn ghost sm mw-seen', 'Revisado');
        b.type = 'button';
        b.setAttribute('aria-label', 'Revisado: ' + r.short);
        b.addEventListener('click', () => onSeen(r.id));
        li.append(b);
      }
      ul.append(li);
    }
    return ul;
  };

  // Panel. view = { connected, needToken, busy, status, accounts, account, campaigns, campaign, noCampaigns, rows, empty, note, sound }.
  // on = { close, connect, account, campaign, refresh, seen, sound, off }.
  // Conserva lo escrito en el token y el foco entre repintadas.
  const panel = (node, view, on) => {
    const prevTok = node.querySelector('#mw-token');
    const tokVal = prevTok ? prevTok.value : '';
    const focusId = node.contains(document.activeElement) ? document.activeElement.id : '';
    node.textContent = '';

    const top = el('div', 'mw-ptop');
    const h = el('h2', 'mw-title', 'Cortes de testeo');
    h.id = 'mw-title';
    const x = el('button', 'mw-x', '✕');
    x.id = 'mw-x'; x.type = 'button'; x.setAttribute('aria-label', 'Cerrar');
    x.addEventListener('click', () => on.close());
    top.append(h, x);
    node.append(top);

    if (view.needToken) {
      const form = el('form', 'mw-conn');
      const lab = el('label', 'mw-lab', 'Token de Meta (solo lectura, ads_read)');
      lab.htmlFor = 'mw-token';
      const row = el('div', 'mw-row');
      const tok = el('input', 'mw-in');
      tok.id = 'mw-token'; tok.type = 'password'; tok.autocomplete = 'off'; tok.spellcheck = false;
      tok.placeholder = 'Pega el token del usuario del sistema';
      tok.value = tokVal;
      const go = el('button', 'btn sm mw-go', 'Conectar');
      go.id = 'mw-connect'; go.type = 'submit';
      if (view.busy) go.disabled = true;
      row.append(tok, go);
      form.append(lab, row);
      form.addEventListener('submit', (e) => { e.preventDefault(); on.connect(tok.value.trim()); });
      node.append(form);
    }

    const st = el('p', 'mw-status', view.status || '');
    st.id = 'mw-status';
    st.setAttribute('role', 'status');
    st.hidden = !view.status;
    node.append(st);

    if (view.connected) {
      // Las listas no se deshabilitan mientras consulta: perderían el foco. app descarta respuestas viejas.
      node.append(select('mw-account', 'Cuenta publicitaria', 'Elige una cuenta', view.accounts, view.account, on.account, false));
      node.append(select('mw-campaign', 'Campaña (activas)', 'Elige una campaña', view.campaigns, view.campaign, on.campaign, !view.account, view.noCampaigns));
      if (view.note) node.append(el('p', 'mw-note', view.note));
      if (view.empty) node.append(el('p', 'mw-empty', view.empty));
      if (view.rows.length) node.append(rowsList(view.rows, on.seen));
      const acts = el('div', 'mw-acts');
      const rf = el('button', 'btn ghost sm', 'Actualizar');
      rf.id = 'mw-refresh'; rf.type = 'button';
      rf.disabled = !!view.busy || !view.campaign;
      rf.addEventListener('click', () => on.refresh());
      const snd = el('button', 'btn ghost sm mw-sound', view.sound ? '🔔 Sonido' : '🔕 Sin sonido');
      snd.id = 'mw-sound'; snd.type = 'button';
      snd.setAttribute('aria-pressed', String(!!view.sound));
      snd.title = view.sound ? 'Suena al llegar a un corte. Toca para silenciar.' : 'Silenciado. Toca para que suene al llegar a un corte.';
      snd.addEventListener('click', () => on.sound());
      const off = el('button', 'btn ghost sm mw-off', 'Desconectar');
      off.id = 'mw-off'; off.type = 'button';
      off.addEventListener('click', () => on.off());
      acts.append(rf, snd, off);
      node.append(acts);
    }

    const back = focusId && node.querySelector('#' + focusId);
    if (back && !back.disabled) back.focus();
  };

  PYL.ui.metawatch = { rail, panel, hero, sum, rain };
})();
