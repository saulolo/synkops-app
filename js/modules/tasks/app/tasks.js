// Mis tareas (SPEC 19): estado (app.state.tasks) y conexión con la UI. Solo usa shared/ y su propio núcleo.
(() => {
  const PYL = globalThis.PYL;
  const C = PYL.core.tasks, U = PYL.ui.tasks, store = PYL.services.storage.tasks;

  const root = document.getElementById('tk-root');
  if (!root) return;

  const todayKey = () => C.tkDayKey(new Date());

  // Carga: lo inválido arranca vacío y su texto crudo se guarda aparte (pyl-tasks-corrupt) para no perderlo.
  const raw = store.load();
  const loaded = C.tkLoad(raw, todayKey());
  if (!loaded.ok) store.corrupt(raw);

  const S = (PYL.app.state.tasks = {
    note: C.tkRollOver(loaded.note, todayKey()),
    day: todayKey(),   // día activo; no se guarda: al cargar siempre es Hoy
    adding: false,     // fila de añadir abierta
    menu: null,        // 'gear' | 'history' | null
    about: false,      // capa «Acerca de» abierta
  });

  // Ids únicos en toda la nota. crypto.randomUUID puede faltar en file:// según el navegador: hay respaldo.
  const newId = () => (globalThis.crypto && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));

  // ---- Autoguardado: 300 ms después del último cambio; lo pendiente se fuerza al salir (beforeunload). ----
  const SAVE_DELAY = 300;
  let saveTimer = null, dirty = false;
  const flush = () => {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (!dirty) return;
    dirty = false;
    // Sin espacio: avisa y conserva el estado en pantalla.
    if (!store.save({ v: C.TK_VERSION, note: S.note })) PYL.ui.feedback.toast('No se pudo guardar: hay muy poco espacio', 'error');
  };
  const scheduleSave = () => {
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, SAVE_DELAY);
  };
  window.addEventListener('beforeunload', flush);

  // Aplica un comando del núcleo. Si devuelve la misma nota (nada cambió), ni repinta ni guarda.
  const commit = (next) => {
    if (next === S.note) return false;
    S.note = next;
    render();
    scheduleSave();
    document.dispatchEvent(new CustomEvent('tareas:cambio')); // la franja de Inicio (SPEC 22) repinta
    return true;
  };

  // Acciones de la cabecera (data-act) y de la lista.
  const on = {
    // «+»: muestra la fila de añadir (no crea otra nota).
    newTask() { S.adding = true; list.openAdd(); },
    closeAdd() { S.adding = false; },
    hourNow: () => new Date().getHours(),
    // Hora vacía = la actual; inválida marca el campo; texto vacío no crea nada. La tarea va al final del día activo.
    add(text, hourText) {
      const hour = C.tkParseHour(hourText);
      if (hour === null) return 'hour';
      const now = new Date();
      return commit(C.tkAdd(S.note, S.day, { hour, text }, newId(), now)) ? true : 'text';
    },
    // Marcar no toca las subtareas.
    toggle(id) { commit(C.tkToggle(S.note, id)); },
    // Doble check: data-done = lo que hará («true» = marcar todas). Afecta tareas y subtareas del día.
    all(btn) { commit(C.tkSetAll(S.note, S.day, btn.dataset.done === 'true')); },
    // Texto vacío conserva el anterior; hora vacía o inválida, también.
    edit(id, text) { commit(C.tkEdit(S.note, id, text)); },
    setHour(id, text) {
      const hour = C.tkParseHour(text);
      if (typeof hour === 'number') commit(C.tkSetHour(S.note, id, hour));
    },
    // Borrar no pregunta (como el original) y se lleva sus subtareas.
    del(id) { commit(C.tkDelete(S.note, id)); },
    // Subtareas: añadir (expande la tarea), marcar, editar, borrar; contraer/expandir la tarea.
    addSub(id, text) { commit(C.tkAddSub(S.note, id, text, newId())); },
    toggleSub(id, sub) { commit(C.tkToggleSub(S.note, id, sub)); },
    editSub(id, sub, text) { commit(C.tkEditSub(S.note, id, sub, text)); },
    delSub(id, sub) { commit(C.tkDeleteSub(S.note, id, sub)); },
    collapse(id) { commit(C.tkToggleCollapsed(S.note, id)); },

    // Pestañas Ayer/Hoy/Mañana.
    day(btn) { selectDay(btn.dataset.day); },
    // Reloj: menú con los días anteriores a ayer que tienen tareas (Ayer ya tiene su pestaña).
    history() { if (S.menu === 'history') closeMenu(false); else openMenu('history'); },
    pickDay(btn) { closeMenu(true); selectDay(btn.dataset.day); },
    // Copia (no mueve) las tareas del último día con tareas a Hoy, sin marcar.
    carry() { commit(C.tkCarry(S.note, todayKey(), newId)); },
    // Engranaje (extremo derecho de la fila del título): menú con «Acerca de Mis tareas».
    gear() { if (S.menu === 'gear') closeMenu(false); else openMenu('gear'); },
    about() { closeMenu(false); setAbout(true); },
    aboutClose() { setAbout(false); },
  };

  // «Acerca de»: se cierra con ×, Esc o clic en el fondo; el foco vuelve al engranaje.
  const onAboutKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setAbout(false); } };
  function setAbout(open) {
    if (S.about === open) return;
    S.about = open;
    U.about(root, open);
    if (open) document.addEventListener('keydown', onAboutKey, true);
    else document.removeEventListener('keydown', onAboutKey, true);
  }

  U.shell(root, on);
  const list = U.createList(root.querySelector('#tk-list'), on);
  root.querySelector('#tk-about').addEventListener('pointerdown', (e) => { if (e.target === e.currentTarget) setAbout(false); });

  function selectDay(day) {
    if (!day || day === S.day) return;
    S.day = day;
    render();
  }

  // ---- Menús: uno abierto a la vez; se cierran con Esc, Tab o clic fuera. ↑/↓ recorren los ítems. ----
  const onOutside = (e) => { if (S.menu && !U.menuHas(root, S.menu, e.target)) closeMenu(false); };
  const onMenuKey = (e) => {
    if (!S.menu) return;
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); }
    else if (e.key === 'Tab') closeMenu(false);
    else if (e.key === 'ArrowDown') { e.preventDefault(); U.menuMove(root, S.menu, 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); U.menuMove(root, S.menu, -1); }
  };
  function openMenu(which) {
    if (S.menu) closeMenu(false);
    if (which === 'history') {
      const today = todayKey(), yesterday = C.tkAddDays(today, -1);
      const items = C.tkPastDays(S.note, today).filter((d) => d !== yesterday).map((d) => ({ day: d, label: C.tkDayLabel(d, today) }));
      U.historyItems(root, items, S.day);
    }
    S.menu = which;
    U.menuShow(root, which, true);
    document.addEventListener('pointerdown', onOutside, true);
    document.addEventListener('keydown', onMenuKey, true);
  }
  // focusBtn: el foco vuelve al botón del menú (Esc o al elegir un ítem).
  function closeMenu(focusBtn) {
    if (!S.menu) return;
    const which = S.menu;
    S.menu = null;
    document.removeEventListener('pointerdown', onOutside, true);
    document.removeEventListener('keydown', onMenuKey, true);
    U.menuShow(root, which, false, focusBtn);
  }

  // ---- Reordenar arrastrando (eventos de puntero, como el original; no HTML5 drag and drop: rompería el doble clic) ----
  // La fila sigue al puntero con translateY; el DOM se reordena en vivo y las demás se deslizan (FLIP).
  // Las subtareas se arrastran igual, dentro de su tarea. Mientras se arrastra, el repintado de la lista espera;
  // al soltar se guarda con tkMove o tkMoveSub.
  const listEl = root.querySelector('#tk-list');
  const DRAG_THRESHOLD = 4, EDGE_ZONE = 36, MAX_SCROLL_STEP = 14;
  let drag = null, suppressClick = false;
  const taskNodes = () => [...listEl.children].filter((n) => n.classList.contains('tk-task'));
  const raf = (fn) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : null);

  // Dos clases de arrastre con el mismo comportamiento: una tarea entre las tareas del día, o una subtarea entre las
  // subtareas de su tarea (no cambia de tarea). box = contenedor donde se reordena; items() = filas que se reordenan.
  const subNodes = (box) => [...box.children].filter((n) => n.classList.contains('tk-sub-row'));

  const onPress = (e) => {
    if (drag || e.button !== 0 || e.isPrimary === false) return;
    const t = e.target;
    // Botones, casillas y campos no arrastran.
    if (t.closest('button, input, textarea')) return;
    const subRow = t.closest('.tk-sub-row');
    const wrap = t.closest('.tk-task');
    if (!wrap || wrap.parentElement !== listEl) return;
    const base = { id: wrap.dataset.id, pointerId: e.pointerId, downX: e.clientX, downY: e.clientY, clientY: e.clientY, grab: 0, active: false, raf: null, stale: false };
    if (subRow) {
      // Subtarea: con 2 o más en su tarea.
      const box = subRow.parentElement;
      if (subNodes(box).length < 2) return;
      drag = { ...base, sub: subRow.dataset.sub, node: subRow, box, items: () => subNodes(box) };
    } else if (t.closest('.tk-task-row')) {
      // Tarea: con 2 o más en el día.
      if (C.tkTasksOf(S.note, S.day).length < 2) return;
      drag = { ...base, sub: null, node: wrap, box: listEl, items: taskNodes };
    } else return;
    document.addEventListener('pointermove', onDragMove);
    document.addEventListener('pointerup', onDragUp);
    document.addEventListener('pointercancel', onDragCancel);
    document.addEventListener('keydown', onDragKey, true);
  };
  const onDragMove = (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    drag.clientY = e.clientY;
    if (!drag.active) {
      if (Math.hypot(e.clientX - drag.downX, e.clientY - drag.downY) < DRAG_THRESHOLD) return;
      if (!startDrag()) return;
    }
    updateDrag();
  };
  const onDragUp = (e) => { if (drag && e.pointerId === drag.pointerId) endDrag(true); };
  const onDragCancel = (e) => { if (drag && e.pointerId === drag.pointerId) endDrag(false); };
  const onDragKey = (e) => {
    if (e.key !== 'Escape' || !drag || !drag.active) return;
    e.preventDefault(); e.stopPropagation();
    endDrag(false);
  };

  function startDrag() {
    if (!drag.node.isConnected) { endDrag(false); return false; }
    drag.active = true;
    drag.order = drag.items(); // orden al empezar, para devolverlo si se cancela
    drag.grab = drag.downY - drag.node.getBoundingClientRect().top;
    // La captura empieza ahora: antes desviaría el clic y el doble clic.
    try { listEl.setPointerCapture(drag.pointerId); } catch { /* sin captura siguen los eventos del documento */ }
    const sel = window.getSelection && window.getSelection();
    if (sel) sel.removeAllRanges();
    listEl.classList.add('is-dragging');
    drag.node.classList.add('is-dragging');
    drag.raf = raf(autoScroll);
    return true;
  }

  // Pone la fila bajo el puntero y la mueve en el DOM al hueco que le toca. Se queda dentro de la parte visible de la lista
  // y, si es una subtarea, dentro del bloque de subtareas de su tarea.
  function updateDrag() {
    if (!drag || !drag.active) return;
    const { node, items } = drag;
    node.style.transform = '';
    const list = listEl.getBoundingClientRect();
    const own = drag.box.getBoundingClientRect();
    const height = node.getBoundingClientRect().height;
    // Puede salirse media fila de su bloque: así su centro pasa el de la primera o la última y llega a esas posiciones.
    const lo = Math.max(list.top, own.top - height / 2), hi = Math.min(list.bottom, own.bottom + height / 2);
    const top = Math.min(Math.max(drag.clientY - drag.grab, lo), Math.max(lo, hi - height));
    const center = top + height / 2;
    const others = items().filter((n) => n !== node);
    const index = others.filter((n) => { const r = n.getBoundingClientRect(); return r.top + r.height / 2 < center; }).length;
    if (index !== items().indexOf(node)) {
      const before = others.map((n) => n.getBoundingClientRect().top);
      if (others[index]) drag.box.insertBefore(node, others[index]);
      else others[others.length - 1].after(node);
      // FLIP: las demás arrancan donde estaban y se deslizan a su sitio nuevo.
      const moved = [];
      others.forEach((n, i) => {
        n.style.transition = 'none';
        n.style.transform = '';
        const delta = before[i] - n.getBoundingClientRect().top;
        if (delta !== 0) { n.style.transform = `translateY(${delta}px)`; moved.push(n); }
      });
      void listEl.offsetHeight;
      for (const n of moved) { n.style.transition = 'transform 140ms ease'; n.style.transform = ''; }
    }
    node.style.transform = `translateY(${top - node.getBoundingClientRect().top}px)`;
  }

  // Cerca del borde de la lista (franjas de 36 px) la desplaza sola, hasta 14 px por fotograma.
  function autoScroll() {
    if (!drag || !drag.active) return;
    const box = listEl.getBoundingClientRect(), y = drag.clientY;
    let step = 0;
    if (y < box.top + EDGE_ZONE) step = -Math.min(1, (box.top + EDGE_ZONE - y) / EDGE_ZONE) * MAX_SCROLL_STEP;
    else if (y > box.bottom - EDGE_ZONE) step = Math.min(1, (y - (box.bottom - EDGE_ZONE)) / EDGE_ZONE) * MAX_SCROLL_STEP;
    if (step !== 0) {
      const prev = listEl.scrollTop;
      listEl.scrollTop += Math.sign(step) * Math.ceil(Math.abs(step));
      if (listEl.scrollTop !== prev) updateDrag();
    }
    drag.raf = raf(autoScroll);
  }

  // commit = guarda el orden nuevo; si no, el repintado devuelve las filas al orden de la nota.
  function endDrag(save) {
    const st = drag;
    if (!st) return;
    drag = null;
    document.removeEventListener('pointermove', onDragMove);
    document.removeEventListener('pointerup', onDragUp);
    document.removeEventListener('pointercancel', onDragCancel);
    document.removeEventListener('keydown', onDragKey, true);
    if (st.raf !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(st.raf);
    if (!st.active) return; // solo fue un clic: sigue su curso
    const to = st.items().indexOf(st.node);
    // El clic que sigue a soltar no marca, no edita ni contrae.
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    try { listEl.releasePointerCapture(st.pointerId); } catch { /* ya liberada */ }
    listEl.classList.remove('is-dragging');
    for (const n of st.items()) { n.classList.remove('is-dragging'); n.style.transform = ''; n.style.transition = ''; }
    // Si no se guarda (cancelado, sin cambio o la lista cambió mientras tanto), el repintado devuelve el orden de la nota.
    // commit con la misma posición devuelve false (tkMove/tkMoveSub dan la misma nota).
    const next = !save || st.stale ? S.note : st.sub ? C.tkMoveSub(S.note, st.id, st.sub, to) : C.tkMove(S.note, st.id, to);
    if (commit(next)) return;
    // La fila de la tarea no cambió y la lista reusa su nodo: las subtareas se devuelven a mano a su orden.
    if (st.sub) { const add = st.box.querySelector('.tk-sub-add'); for (const n of st.order) st.box.insertBefore(n, add); }
    render();
  }

  listEl.addEventListener('pointerdown', onPress);
  listEl.addEventListener('lostpointercapture', () => { if (drag && drag.active) endDrag(false); });
  listEl.addEventListener('click', (e) => {
    if (!suppressClick) return;
    suppressClick = false;
    e.stopImmediatePropagation(); e.preventDefault();
  }, true);

  function render() {
    const today = todayKey();
    const tasks = C.tkTasksOf(S.note, S.day);
    U.days(root, { days: [C.tkAddDays(today, -1), today, C.tkAddDays(today, 1)], active: S.day });
    U.progress(root, C.tkProgress(tasks));
    // Con un arrastre en curso la lista no se toca (destruiría la fila arrastrada): al soltar se repinta.
    // Si la tarea arrastrada desapareció (otro día, borrada), se cancela.
    if (drag && drag.active) {
      if (tasks.some((t) => t.id === drag.id)) { drag.stale = true; return; }
      endDrag(false);
      return;
    }
    list.render(tasks);
    // Solo en Hoy, con Hoy vacío, sin haberlo usado hoy y con un día anterior con tareas.
    list.carry(S.day === today && C.tkCanCarry(S.note, today));
  }

  // La columna lateral se pega a la altura donde empieza el contenido (alto de la barra superior + padding de <main>),
  // igual que el Centro de mando (app/hub.js#syncTop), pero con su propia variable: el módulo no depende de hub.
  const top = document.querySelector('header.top');
  const syncTop = () => {
    const main = document.querySelector('main.main');
    const h = top ? top.offsetHeight : 0;
    if (!h) return;
    const pad = main ? parseFloat(getComputedStyle(main).paddingTop) || 0 : 0;
    document.documentElement.style.setProperty('--tk-top', (h + pad) + 'px');
  };
  window.addEventListener('resize', syncTop);
  document.addEventListener('nav:vista', syncTop);
  if (top && typeof ResizeObserver === 'function') new ResizeObserver(syncTop).observe(top);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncTop);
  syncTop();

  // ---- Paso de los días: a las 00:00 (+ 1 s) y al volver a la pestaña (el temporizador falla si el equipo se suspende). ----
  let currentDay = todayKey();
  let midnightTimer = null;
  // Si cambió el día: poda con tkRollOver y, si veía el día que terminó o Mañana, pasa a Hoy (un día del historial se queda).
  const checkDay = () => {
    const previous = currentDay;
    currentDay = todayKey();
    if (currentDay === previous) return;
    if (S.day === previous || S.day === C.tkAddDays(previous, 1)) S.day = currentDay;
    const rolled = C.tkRollOver(S.note, currentDay);
    if (rolled !== S.note) { S.note = rolled; scheduleSave(); document.dispatchEvent(new CustomEvent('tareas:cambio')); }
    render(); // etiquetas y pestañas al día aunque la poda no cambie nada
  };
  // Milisegundos hasta las próximas 00:00 locales (se recalcula en cada disparo: horario de verano).
  const msToMidnight = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
  };
  const scheduleMidnight = () => {
    clearTimeout(midnightTimer);
    // Si el temporizador se adelanta, checkDay no ve cambio de día y se vuelve a programar.
    midnightTimer = setTimeout(() => { checkDay(); scheduleMidnight(); }, msToMidnight() + 1000);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    checkDay();
    scheduleMidnight();
  });
  scheduleMidnight();

  render();
})();
