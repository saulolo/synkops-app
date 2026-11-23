// Centro de mando (Inicio): rejilla de accesos directos y lista de edición. Recibe datos por parámetro y no guarda estado.
(() => {
  const PYL = globalThis.PYL;
  const { el } = PYL.ui.dom;
  const C = PYL.core.hub;

  // Cuadro del ícono. Prioridad: ícono propio > favicon del sitio > iniciales.
  // Las iniciales siempre se pintan debajo: si el favicon no carga (error) o es el globo genérico de 16 px
  // (naturalWidth < 32), la imagen se quita y quedan ellas. El ícono propio llena el cuadro sin fondo.
  function icon(item) {
    const box = el('span', 'hb-ico');
    if (item.icon) {
      box.classList.add('hb-ico-own');
      const own = el('img'); own.alt = ''; own.src = item.icon;
      box.append(own);
      return box;
    }
    box.append(el('span', 'hb-ini', item.ini || C.hubInitials(item.name)));
    const fav = C.hubFavicon(item.url);
    if (fav) {
      const img = el('img', 'hb-fav'); img.alt = ''; img.hidden = true; img.referrerPolicy = 'no-referrer';
      img.addEventListener('load', () => { if (img.naturalWidth < 32) img.remove(); else { img.hidden = false; box.classList.add('hb-ico-fav'); } });
      img.addEventListener('error', () => img.remove());
      img.src = fav;
      box.append(img);
    }
    return box;
  }

  // Una tarjetita. Con URL es un enlace a pestaña nueva; sin URL, un botón punteado "poner enlace".
  // opt.preview = vista previa de la fila de edición: un <div> sin acción.
  function tile(item, opt) {
    const o = opt || {};
    let t;
    if (o.preview) t = el('div', 'hb-tile hb-preview' + (item.url ? '' : ' hb-empty'));
    else if (item.url) { t = el('a', 'hb-tile'); t.href = item.url; t.target = '_blank'; t.rel = 'noopener noreferrer'; }
    else { t = el('button', 'hb-tile hb-empty'); t.type = 'button'; }
    t.dataset.id = item.id;
    const text = el('span', 'hb-text');
    text.append(el('span', 'hb-name', item.name));
    if (!item.url) text.append(el('span', 'hb-sub', 'poner enlace'));
    t.append(icon(item), text);
    return t;
  }

  // Arrastrar para reubicar: mantengo presionado un botón y lo muevo; los demás se acomodan al instante y al soltar
  // se avisa el nuevo orden (on.reorder(ids)). Un clic sin mover sigue abriendo el enlace. Esc cancela. Se enlaza una sola vez por nodo.
  const DRAG_PX = 6;
  function sortable(node, on) {
    if (node._hbSort) { node._hbSort.on = on; return; }
    const st = (node._hbSort = { on });
    let drag = null, suppress = false;
    const ids = () => [...node.querySelectorAll('.hb-tile')].map((t) => t.dataset.id);

    // Tras arrastrar, el clic que llega al soltar no debe abrir el enlace ni el editor.
    node.addEventListener('click', (e) => { if (suppress) { e.preventDefault(); e.stopPropagation(); suppress = false; } }, true);
    node.addEventListener('dragstart', (e) => e.preventDefault());

    function finish(commit) {
      if (!drag) return;
      const d = drag; drag = null;
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', cancel);
      document.removeEventListener('keydown', key);
      if (!d.on) return;
      if (d.ghost) d.ghost.remove();
      d.tile.classList.remove('hb-lifted');
      document.body.classList.remove('hb-dragging');
      suppress = true; setTimeout(() => { suppress = false; }, 0);
      const now = ids();
      if (commit && now.join() !== d.before.join()) { if (st.on && st.on.reorder) st.on.reorder(now); return; }
      // Cancelado o sin cambio: se devuelve cada botón a su lugar.
      d.before.forEach((id) => { const t = [...node.querySelectorAll('.hb-tile')].find((x) => x.dataset.id === id); if (t) node.append(t); });
    }
    const up = () => finish(true);
    const cancel = () => finish(false);
    const key = (e) => { if (e.key === 'Escape') finish(false); };

    function start(e) {
      const r = drag.tile.getBoundingClientRect();
      drag.on = true; drag.dx = e.clientX - r.left; drag.dy = e.clientY - r.top;
      const g = drag.tile.cloneNode(true);
      g.classList.add('hb-ghost'); g.removeAttribute('href'); g.removeAttribute('id');
      g.style.width = r.width + 'px'; g.style.height = r.height + 'px';
      (node.parentElement || document.body).append(g);
      drag.ghost = g;
      drag.tile.classList.add('hb-lifted');
      document.body.classList.add('hb-dragging');
    }

    function move(e) {
      if (!drag) return;
      if (!drag.on) {
        if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < DRAG_PX) return;
        start(e);
      }
      drag.ghost.style.left = (e.clientX - drag.dx) + 'px';
      drag.ghost.style.top = (e.clientY - drag.dy) + 'px';
      const under = document.elementFromPoint ? document.elementFromPoint(e.clientX, e.clientY) : null;
      const t = under && under.closest && under.closest('.hb-tile');
      if (t && t !== drag.tile && node.contains(t)) {
        const kids = [...node.children];
        node.insertBefore(drag.tile, kids.indexOf(t) > kids.indexOf(drag.tile) ? t.nextSibling : t);
      }
    }

    node.addEventListener('pointerdown', (e) => {
      if (drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const t = e.target.closest && e.target.closest('.hb-tile');
      if (!t || !node.contains(t)) return;
      drag = { tile: t, x: e.clientX, y: e.clientY, on: false, before: ids() };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
      document.addEventListener('pointercancel', cancel);
      document.addEventListener('keydown', key);
    });
  }

  // Rejilla de la vista normal. on = { empty(id) (clic en un acceso sin URL), reorder(ids) (lo arrastré a otro lugar) }.
  function grid(node, items, on) {
    node.textContent = '';
    if (!items.length) { node.append(el('p', 'muted hb-none', 'Sin accesos. Toca Editar para agregar uno.')); return; }
    items.forEach((it) => {
      const t = tile(it);
      if (!it.url && on && on.empty) t.addEventListener('click', () => on.empty(it.id));
      node.append(t);
    });
    if (on && on.reorder) sortable(node, on);
  }

  // ---- Modo Editar ----

  const factory = (id) => C.HUB_DEFAULTS.find((d) => d.id === id) || null;
  const rowOf = (node, id) => [...node.querySelectorAll('.hb-row')].find((r) => r.dataset.id === id) || null;

  // Vista previa de una fila: la tarjetita se rehace con el borrador.
  function preview(node, item) {
    const row = rowOf(node, item.id);
    const old = row && row.querySelector('.hb-prev .hb-tile');
    if (old) old.replaceWith(tile(item, { preview: true }));
  }

  // Botón "Usar <dominio>": solo en accesos de fábrica con la URL vacía.
  function use(node, item) {
    const row = rowOf(node, item.id), b = row && row.querySelector('.hb-use');
    if (b) b.hidden = !!String(item.url || '').trim();
  }

  // "Quitar ícono": solo aparece si el acceso tiene un ícono propio.
  function own(node, item) {
    const r = rowOf(node, item.id), b = r && r.querySelector('.hb-icon-rm');
    if (b) b.hidden = !item.icon;
  }

  // Imagen que trae un evento de pegado (captura o copia), o null si solo es texto.
  function clipImage(e) {
    const cd = e && e.clipboardData;
    if (!cd) return null;
    const viaItems = [...(cd.items || [])].filter((i) => i.kind === 'file' && i.type.startsWith('image/')).map((i) => i.getAsFile());
    return [...(cd.files || []), ...viaItems].find((f) => f && f.type.startsWith('image/')) || null;
  }

  // Id del acceso cuya fila tiene el foco ('' si el foco no está en ninguna).
  function focusedId(node) {
    const a = document.activeElement, r = a && a.closest && a.closest('.hb-row');
    return r && node.contains(r) ? r.dataset.id : '';
  }

  // Marca los campos con error: errors = { [id]: { name?, url? } } (lo calcula core.hub.hubCheck).
  function mark(node, errors) {
    node.querySelectorAll('.hb-row').forEach((row) => {
      const id = row.dataset.id, e = errors[id] || {};
      [['name', 'hb-f-name-'], ['url', 'hb-f-url-']].forEach(([k, pre]) => {
        const inp = row.querySelector('#' + pre + id);
        inp.classList.toggle('hb-bad', !!e[k]);
        if (e[k]) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid');
      });
      row.querySelector('.hb-err').textContent = [e.name, e.url].filter(Boolean).join(' ');
    });
  }

  // Pone el cursor en un campo (url o name) de una fila.
  function focus(node, id, field) {
    const inp = node.querySelector('#hb-f-' + (field || 'url') + '-' + id);
    if (inp) { inp.focus(); if (inp.scrollIntoView) inp.scrollIntoView({ block: 'nearest' }); }
  }

  // Una fila de edición.
  function row(it, on) {
    const f = factory(it.id);
    const r = el('div', 'hb-row'); r.dataset.id = it.id;
    const prev = el('div', 'hb-prev'); prev.append(tile(it, { preview: true }));

    const nameF = el('div', 'field'), nameL = el('label', null, 'Nombre'); nameL.htmlFor = 'hb-f-name-' + it.id;
    const name = el('input'); name.type = 'text'; name.id = 'hb-f-name-' + it.id; name.value = it.name; name.autocomplete = 'off'; name.placeholder = 'Nombre';
    name.addEventListener('input', () => on.name(it.id, name.value));
    name.addEventListener('change', () => on.flush(it.id));
    nameF.append(nameL, name);

    const urlF = el('div', 'field'), urlL = el('label', null, 'Dirección (URL)'); urlL.htmlFor = 'hb-f-url-' + it.id;
    const url = el('input'); url.type = 'text'; url.id = 'hb-f-url-' + it.id; url.value = it.url; url.autocomplete = 'off';
    url.placeholder = (f && f.suggest) || 'https://…';
    url.addEventListener('input', () => on.url(it.id, url.value));
    url.addEventListener('change', () => on.flush(it.id));
    urlF.append(urlL, url);

    const err = el('div', 'hb-err'); err.id = 'hb-err-' + it.id; err.setAttribute('role', 'alert');
    const side = el('div', 'hb-side');
    if (f && f.suggest) {
      const b = el('button', 'btn ghost hb-use', 'Usar ' + C.hubDomain(f.suggest)); b.type = 'button';
      b.hidden = !!String(it.url || '').trim();
      b.addEventListener('click', () => on.use(it.id));
      side.append(b);
    }

    // Tres botones pequeños en una línea: subir ícono propio (o pegarlo con Ctrl+V con el foco en esta fila), quitarlo y quitar el acceso.
    // Reordenar se hace arrastrando en la vista normal.
    const ctl = el('div', 'hb-ctl');
    const upLab = el('label', 'hb-ib hb-icon-up'); upLab.innerHTML = PYL.ui.icons.svg('upload', 15); upLab.title = 'Subir ícono (o pega con Ctrl+V)';
    upLab.tabIndex = 0; upLab.setAttribute('role', 'button'); upLab.setAttribute('aria-label', 'Subir ícono de ' + it.name);
    const file = el('input'); file.type = 'file'; file.accept = 'image/*'; file.hidden = true; file.className = 'hb-file';
    file.addEventListener('change', () => { if (file.files[0]) on.icon(it.id, file.files[0]); file.value = ''; });
    upLab.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } });
    upLab.append(file);
    const rmIcon = el('button', 'hb-ib hb-icon-rm'); rmIcon.type = 'button'; rmIcon.innerHTML = PYL.ui.icons.svg('image-off', 15); rmIcon.hidden = !it.icon;
    rmIcon.title = 'Quitar ícono'; rmIcon.setAttribute('aria-label', 'Quitar ícono de ' + it.name);
    rmIcon.addEventListener('click', () => on.iconClear(it.id));
    const del = el('button', 'cd-act del hb-del'); del.type = 'button'; del.innerHTML = PYL.ui.icons.svg('trash', 16); del.setAttribute('aria-label', 'Quitar ' + it.name); del.title = 'Quitar';
    del.addEventListener('click', () => on.del(it.id));
    ctl.append(upLab, rmIcon, del);

    const fields = el('div', 'hb-fields');
    fields.append(nameF, urlF, err, side);
    // Debajo del botón de vista previa, en una sola línea: subir ícono, quitar ícono y la papelera.
    prev.append(ctl);
    r.append(prev, fields);
    return r;
  }

  // Vuelve a pintar solo las filas (la fila Agregar y el pie conservan lo que escribí).
  function rows(node, items, on) {
    const box = node.querySelector('.hb-rows');
    box.textContent = '';
    items.forEach((it) => box.append(row(it, on)));
  }

  // Lista de edición: filas + fila Agregar (#hb-new). on = { name, url, use, icon, iconClear, del, flush, add }.
  function list(node, items, on) {
    node.textContent = '';
    node.append(el('div', 'hb-rows'));

    const add = el('div', 'hb-add');
    const nF = el('div', 'field'), nL = el('label', null, 'Nombre'); nL.htmlFor = 'hb-new-name';
    const n = el('input'); n.type = 'text'; n.id = 'hb-new-name'; n.autocomplete = 'off'; n.placeholder = 'Nombre';
    nF.append(nL, n);
    const uF = el('div', 'field'), uL = el('label', null, 'Dirección (URL)'); uL.htmlFor = 'hb-new-url';
    const u = el('input'); u.type = 'text'; u.id = 'hb-new-url'; u.autocomplete = 'off'; u.placeholder = 'https://…';
    uF.append(uL, u);
    const btn = el('button', 'btn', 'Agregar botón'); btn.type = 'button'; btn.id = 'hb-add';
    const err = el('div', 'hb-err'); err.id = 'hb-err-new'; err.setAttribute('role', 'alert');
    const clearErr = () => { err.textContent = ''; n.classList.remove('hb-bad'); u.classList.remove('hb-bad'); n.removeAttribute('aria-invalid'); u.removeAttribute('aria-invalid'); };
    [n, u].forEach((x) => {
      x.addEventListener('input', clearErr);
      x.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); on.add(); } });
    });
    btn.addEventListener('click', () => on.add());
    add.id = 'hb-new'; add.append(nF, uF, btn, err);

    node.append(add);
    rows(node, items, on);
  }

  // Lo escrito en la fila Agregar.
  const newValues = (node) => ({ name: node.querySelector('#hb-new-name').value, url: node.querySelector('#hb-new-url').value });

  // Errores de la fila Agregar: errors = { name?, url? } (de core.hub.hubAdd).
  function newMark(node, errors) {
    const n = node.querySelector('#hb-new-name'), u = node.querySelector('#hb-new-url');
    [[n, errors.name], [u, errors.url]].forEach(([inp, msg]) => {
      inp.classList.toggle('hb-bad', !!msg);
      if (msg) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid');
    });
    node.querySelector('#hb-err-new').textContent = [errors.name, errors.url].filter(Boolean).join(' ');
    (errors.name ? n : u).focus();
  }

  // Vacía la fila Agregar y deja el cursor en Nombre.
  function newClear(node) {
    const n = node.querySelector('#hb-new-name'), u = node.querySelector('#hb-new-url');
    n.value = ''; u.value = '';
    [n, u].forEach((x) => { x.classList.remove('hb-bad'); x.removeAttribute('aria-invalid'); });
    node.querySelector('#hb-err-new').textContent = '';
    n.focus();
  }

  PYL.ui.hub = { tile, grid, list, rows, preview, use, own, clipImage, focusedId, mark, focus, newValues, newMark, newClear };
})();
