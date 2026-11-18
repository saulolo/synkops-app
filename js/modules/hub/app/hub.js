// Centro de mando (Inicio): estado (app.state.hub) y conexión con la UI. Solo usa shared/ y su propio núcleo.
(() => {
  const PYL = globalThis.PYL;
  const { $ } = PYL.ui.dom;
  const C = PYL.core.hub, U = PYL.ui.hub, store = PYL.services.storage.hub, toast = PYL.ui.feedback.toast;

  const root = $('#hb-root');
  if (!root) return;
  const gridEl = $('#hb-grid'), listEl = $('#hb-list'), editBtn = $('#hb-edit'), cancelBtn = $('#hb-cancel');

  const S = (PYL.app.state.hub = {
    items: C.hubLoad(store.load()), // lo guardado (sin clave o dañado: los 9 de fábrica)
    editing: false,                 // modo Editar abierto
    draft: null,                    // copia de items mientras edito; nada se guarda hasta «Listo»
  });

  // La vista previa de cada fila se rehace con un pequeño retraso (y al soltar el campo): así no se pide un
  // favicon por cada letra que escribo en la URL.
  const timers = {};
  const drawPreview = (id) => {
    clearTimeout(timers[id]); delete timers[id];
    const it = S.draft && S.draft.find((x) => x.id === id);
    if (it) U.preview(listEl, it);
  };
  const later = (id) => { clearTimeout(timers[id]); timers[id] = setTimeout(() => drawPreview(id), 250); };
  const flushAll = () => Object.keys(timers).forEach(drawPreview);

  // Reubicar arrastrando: el nuevo orden se guarda al soltar, sin pasar por Editar.
  const reorder = (ids) => {
    const next = C.hubOrder(S.items, ids);
    if (next.some((x, i) => x !== S.items[i])) {
      if (!store.save({ v: C.HUB_VERSION, items: next })) { toast('No se pudo guardar el orden: hay muy poco espacio.', 'error'); renderGrid(); return; }
      S.items = next;
    }
    renderGrid();
  };

  const renderGrid = () => U.grid(gridEl, S.items, { empty: (id) => open(id), reorder });
  const renderMode = () => {
    gridEl.hidden = S.editing; listEl.hidden = !S.editing; cancelBtn.hidden = !S.editing;
    editBtn.textContent = S.editing ? 'Listo' : 'Editar';
    root.classList.toggle('hb-editing', S.editing);
    editBtn.classList.toggle('hb-done', S.editing);
  };

  // Errores del borrador completo (las reglas viven en el núcleo).
  const check = () => { const r = C.hubCheck(S.draft); U.mark(listEl, r.errors); return r; };

  // Repinta las filas del borrador y vuelve a marcar los errores.
  const redraw = () => {
    Object.keys(timers).forEach((id) => { clearTimeout(timers[id]); delete timers[id]; });
    U.rows(listEl, S.draft, on); check();
  };

  const on = {
    name(id, text) { S.draft = C.hubSet(S.draft, id, { name: text }); check(); later(id); },
    url(id, text) { S.draft = C.hubSet(S.draft, id, { url: text }); check(); U.use(listEl, S.draft.find((x) => x.id === id)); later(id); },
    use(id) {
      const f = C.HUB_DEFAULTS.find((d) => d.id === id);
      if (!f) return;
      listEl.querySelector('#hb-f-url-' + id).value = f.suggest;
      on.url(id, f.suggest); drawPreview(id);
      U.focus(listEl, id, 'url');
    },
    // Ícono propio: se reduce a 128 px; PNG (o WebP/GIF) conserva la transparencia y JPG sigue JPG. Con ícono propio no se pide el favicon.
    async icon(id, file) {
      let data;
      try { data = await PYL.services.files.imageDataURL(file, 128, 0.85, file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png'); } catch { toast('No pude leer esa imagen.', 'error'); return; }
      if (!S.editing || !S.draft.some((x) => x.id === id)) return;
      S.draft = C.hubSet(S.draft, id, { icon: data });
      drawPreview(id); U.own(listEl, S.draft.find((x) => x.id === id));
    },
    iconClear(id) {
      S.draft = C.hubSet(S.draft, id, { icon: null });
      drawPreview(id); U.own(listEl, S.draft.find((x) => x.id === id));
    },
    // Quitar rehace las filas (la fila Agregar conserva lo escrito).
    async del(id) {
      const it = S.draft.find((x) => x.id === id);
      if (!it) return;
      const r = await PYL.ui.feedback.ask('Quitar acceso', `¿Quitar «${it.name.trim() || 'este acceso'}» del Centro de mando?`, [{ r: 'del', label: 'Quitar' }]);
      if (r !== 'del' || !S.editing) return;
      S.draft = C.hubRemove(S.draft, id);
      redraw();
    },
    // Agrega al final del borrador con los dos campos de la fila Agregar (los dos son obligatorios).
    add() {
      const r = C.hubAdd(S.draft, U.newValues(listEl));
      if (!r.ok) { U.newMark(listEl, r.errors); return; }
      S.draft = r.items;
      redraw(); U.newClear(listEl);
    },
    flush: drawPreview,
  };

  // Ctrl+V: la imagen pegada va a la fila que tiene el foco; sin fila enfocada o sin imagen no hace nada.
  // Solo se escucha con el modo Editar abierto.
  const onPaste = (e) => {
    const id = U.focusedId(listEl), img = id && U.clipImage(e);
    if (!img) return;
    e.preventDefault();
    on.icon(id, img);
  };

  // Abre el modo Editar con una copia de lo guardado; focusId = acceso cuya URL recibe el cursor.
  function open(focusId) {
    if (!S.editing) {
      S.editing = true; S.draft = S.items.map((x) => ({ ...x }));
      U.list(listEl, S.draft, on);
      document.addEventListener('paste', onPaste);
      renderMode();
    }
    if (focusId) U.focus(listEl, focusId, 'url');
  }

  function close() {
    Object.keys(timers).forEach((id) => { clearTimeout(timers[id]); delete timers[id]; });
    S.editing = false; S.draft = null;
    document.removeEventListener('paste', onPaste);
    listEl.textContent = '';
    renderGrid(); renderMode();
  }

  // «Listo»: valida todo el borrador; con errores marca las filas y no guarda ni contrae.
  function done() {
    flushAll();
    const r = check();
    if (!r.ok) {
      toast('Corrige los campos marcados en rojo.', 'error');
      const first = S.draft.find((x) => r.errors[x.id]);
      if (first) U.focus(listEl, first.id, r.errors[first.id].name ? 'name' : 'url');
      return;
    }
    const items = C.hubClean(S.draft);
    if (!store.save({ v: C.HUB_VERSION, items })) { toast('No se pudo guardar: hay muy poco espacio.', 'error'); return; }
    S.items = items;
    close();
  }

  editBtn.addEventListener('click', () => (S.editing ? done() : open()));
  cancelBtn.addEventListener('click', close);

  // La columna lateral se pega a la misma altura donde empieza el contenido (alto de la barra superior + margen de <main>),
  // así queda alineada con la tarjeta de arriba sea cual sea el alto de la barra. Sin medida (sin layout) vale el CSS por defecto.
  const top = document.querySelector('header.top');
  const syncTop = () => {
    const main = document.querySelector('main.main');
    const h = top ? top.offsetHeight : 0;
    if (!h) return;
    const pad = main ? parseFloat(getComputedStyle(main).paddingTop) || 0 : 0;
    document.documentElement.style.setProperty('--hb-top', (h + pad) + 'px');
  };
  window.addEventListener('resize', syncTop);
  document.addEventListener('nav:vista', syncTop);
  if (top && typeof ResizeObserver === 'function') new ResizeObserver(syncTop).observe(top);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncTop);
  syncTop();

  renderGrid(); renderMode();
})();
