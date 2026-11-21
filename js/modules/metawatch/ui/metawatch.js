// Cortes de testeo en la barra (SPEC 21): pinta el bloque y el panel. No guarda estado:
// recibe la vista ya calculada por app/metawatch.js y avisa con callbacks.
(() => {
  const PYL = globalThis.PYL;
  const { el } = PYL.ui.dom;

  // Bloque de la barra. view = { head, sub, time, msg, rows, marks, label }.
  // rows: [{ id, short, name, k, fill, active, alert }]; marks: posiciones de los cortes (0–1).
  // Todo va en <span>: el bloque es un <button>.
  const rail = (btn, view) => {
    btn.textContent = '';
    const head = el('span', 'mw-head');
    head.append(el('b', null, view.head));
    if (view.sub) head.append(el('span', 'mw-sub', ' · ' + view.sub));
    if (view.time) head.append(el('span', 'mw-time', view.time));
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

  PYL.ui.metawatch = { rail, panel };
})();
