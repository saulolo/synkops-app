// Mis tareas (SPEC 19): pinta la tarjeta de Inicio. Port de src/renderer/ui/* de My Sticky Notes.
// Recibe datos y callbacks por parámetro; nunca modifica estado. Los clics llegan por delegación:
// un botón con data-act="x" llama a on.x(botón, evento) si existe.
(() => {
  const PYL = globalThis.PYL;

  // Íconos del set propio (SPEC 24, js/shared/ui/icons.js).
  const I = (name, size) => PYL.ui.icons.svg(name, size);

  // Pie de formato: inerte, como en el original (texto enriquecido e imágenes irían en otra spec).
  const tool = (label, icon) => `<button class="tk-ib tk-tb" type="button" aria-label="${label}" title="${label}" aria-disabled="true">${icon}</button>`;

  // Esqueleto fijo de la tarjeta (solo textos constantes: lo dinámico va con textContent).
  const SHELL = `
    <header class="tk-top">
      <h2 class="tk-title" id="tk-title">Mis tareas</h2>
      <div class="tk-wrap">
        <button class="tk-ib" type="button" id="tk-gear" data-act="gear" aria-label="Configuración" title="Configuración" aria-haspopup="menu" aria-expanded="false">${I('settings', 15)}</button>
        <div class="tk-menu" id="tk-gear-menu" role="menu" aria-label="Configuración" hidden>
          <button class="tk-mi" type="button" role="menuitem" data-act="about">Acerca de Mis tareas</button>
        </div>
      </div>
    </header>
    <div class="tk-days">
      <button class="tk-ib" type="button" id="tk-new" data-act="newTask" aria-label="Nueva tarea" title="Nueva tarea">${I('plus', 16)}</button>
      <div class="tk-tabs" id="tk-tabs" role="group" aria-label="Día">
        <button class="tk-tab" type="button" data-act="day" aria-pressed="false">Ayer</button>
        <button class="tk-tab" type="button" data-act="day" aria-pressed="false">Hoy</button>
        <button class="tk-tab" type="button" data-act="day" aria-pressed="false">Mañana</button>
      </div>
      <div class="tk-wrap tk-wrap-end">
        <button class="tk-ib" type="button" id="tk-history" data-act="history" aria-label="Días anteriores" title="Días anteriores" aria-haspopup="menu" aria-expanded="false">${I('history', 15)}</button>
        <div class="tk-menu tk-menu-end" id="tk-history-menu" role="menu" aria-label="Días anteriores" hidden></div>
      </div>
    </div>
    <div class="tk-prog">
      <button class="tk-alert" type="button" id="tk-alert" data-act="alert" role="switch" aria-checked="false"><span class="tk-sw" aria-hidden="true"><span class="tk-sw-knob"></span></span>${I('bell', 14)}</button>
      <button class="tk-ib tk-sm" type="button" id="tk-all" data-act="all">${I('check-check', 14)}</button>
    </div>
    <div class="tk-bar"><div class="tk-bar-fill" id="tk-bar"></div></div>
    <div class="tk-list" id="tk-list"></div>
    <footer class="tk-foot" id="tk-foot">
      ${tool('Negrita', I('bold', 14))}${tool('Cursiva', I('italic', 14))}${tool('Subrayado', I('underline', 14))}${tool('Tachado', I('strike', 14))}
      <span class="tk-divider" aria-hidden="true"></span>
      ${tool('Lista con viñetas', I('list', 14))}${tool('Adjuntar imagen', I('image', 14))}
    </footer>
    <div class="tk-about-layer" id="tk-about" hidden>
      <div class="tk-about" role="dialog" aria-modal="true" aria-labelledby="tk-about-title">
        <button class="tk-ib tk-about-x" type="button" data-act="aboutClose" aria-label="Cerrar" title="Cerrar">${I('close', 15)}</button>
        <h2 class="tk-about-name" id="tk-about-title">Mis tareas</h2>
        <p class="tk-about-lead">Mis tareas es tu nota adhesiva dentro de Synkops para organizar las tareas del día.</p>
        <ul class="tk-about-points">
          <li>Cada día tiene sus tareas: Ayer, Hoy, Mañana e historial de los últimos días.</li>
          <li>Cada día empieza limpio; con un clic traes las tareas de ayer, sin marcar.</li>
          <li>Todo se guarda automáticamente y solo en este navegador: sin cuenta, sin nube y sin internet.</li>
          <li>Se conservan los últimos 5 días; los anteriores se borran.</li>
        </ul>
      </div>
    </div>`;

  const q = (root, sel) => root.querySelector(sel);

  // Arma la tarjeta dentro de root (#tk-root) y conecta los clics con on.<data-act>.
  const shell = (root, on) => {
    root.innerHTML = SHELL;
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || !root.contains(b) || b.getAttribute('aria-disabled') === 'true') return;
      const fn = on[b.dataset.act];
      if (fn) fn(b, e);
    });
  };

  // Pestañas Ayer/Hoy/Mañana (days = [ayer, hoy, mañana]). Si el activo no es ninguna, el reloj queda encendido.
  const days = (root, { days: keys, active }) => {
    [...q(root, '#tk-tabs').children].forEach((tab, i) => {
      tab.dataset.day = keys[i];
      const on = keys[i] === active;
      tab.classList.toggle('is-on', on);
      tab.setAttribute('aria-pressed', String(on));
    });
    q(root, '#tk-history').classList.toggle('is-on', !keys.includes(active));
  };

  // Doble check (marcar o desmarcar todas; oculto sin tareas) y barra. Sin «N de M hechas» ni anillo (SPEC 27):
  // el Pulso de tareas de Inicio ya lo muestra.
  const progress = (root, { done, total, percent }) => {
    const all = q(root, '#tk-all');
    const markAll = done < total;
    const label = markAll ? 'Marcar todas' : 'Desmarcar todas';
    all.title = label;
    all.setAttribute('aria-label', label);
    all.dataset.done = String(markAll);
    all.classList.toggle('is-on', !markAll);
    all.hidden = total === 0;
    q(root, '#tk-bar').style.width = `${percent}%`;
  };

  // Switch del aviso por hora (SPEC 27): estado en aria-checked; etiqueta y title dicen lo que hará el clic.
  const alertSwitch = (root, on) => {
    const sw = q(root, '#tk-alert');
    const label = on ? 'Desactivar aviso por hora' : 'Activar aviso por hora';
    sw.setAttribute('aria-checked', String(on));
    sw.setAttribute('aria-label', label);
    sw.title = label;
    sw.classList.toggle('is-on', on);
  };

  // ---- Menús (engranaje y días anteriores) ----
  // El estado (cuál está abierto) lo lleva app; aquí solo se pinta, se enfoca y se navega.
  const MENU = { history: ['#tk-history', '#tk-history-menu'], gear: ['#tk-gear', '#tk-gear-menu'] };
  const menuItems = (root, which) => [...q(root, MENU[which][1]).querySelectorAll('.tk-mi')];

  // Días anteriores a ayer con tareas (items = [{ day, label }]); sin días, «Sin días anteriores».
  const historyItems = (root, items, active) => {
    const menu = q(root, '#tk-history-menu');
    menu.replaceChildren();
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'tk-menu-empty';
      empty.textContent = 'Sin días anteriores';
      menu.append(empty);
    }
    for (const { day, label } of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tk-mi';
      b.setAttribute('role', 'menuitemradio');
      b.dataset.act = 'pickDay';
      b.dataset.day = day;
      b.textContent = label;
      b.classList.toggle('is-on', day === active);
      b.setAttribute('aria-checked', String(day === active));
      menu.append(b);
    }
  };

  // Abre o cierra el menú `which`; al abrir, el foco va al primer ítem (o al botón si no hay); focusBtn devuelve el foco al botón.
  const menuShow = (root, which, open, focusBtn) => {
    const [btnSel, menuSel] = MENU[which];
    const btn = q(root, btnSel), menu = q(root, menuSel);
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) { const first = menuItems(root, which)[0]; if (first) first.focus(); } else if (focusBtn) btn.focus();
  };

  // ↑/↓ entre los ítems del menú, en círculo.
  const menuMove = (root, which, delta) => {
    const items = menuItems(root, which);
    if (!items.length) return;
    const i = items.indexOf(document.activeElement);
    items[(i + delta + items.length) % items.length].focus();
  };

  // ¿El nodo está dentro del menú `which` o de su botón?
  const menuHas = (root, which, n) => MENU[which].some((sel) => q(root, sel).contains(n));

  // Capa «Acerca de»: al abrir, el foco va a ×; al cerrar, vuelve al engranaje.
  const about = (root, open) => {
    const layer = q(root, '#tk-about');
    if (layer.hidden === !open) return;
    layer.hidden = !open;
    if (open) { q(root, '.tk-about').scrollTop = 0; q(root, '.tk-about-x').focus(); } else q(root, '#tk-gear').focus();
  };

  // ---- Lista ----

  const node = (html) => {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  // Chevron de subtareas (sin contador): «N de M hechas» solo en aria-label/title; en acento con todas hechas.
  const subChip = (task) => {
    const total = task.subtasks.length;
    if (!total) return '';
    const done = task.subtasks.filter((s) => s.done).length;
    const collapsed = task.collapsed === true;
    const label = `${collapsed ? 'Expandir' : 'Contraer'} subtareas (${done} de ${total} hechas)`;
    const cls = `tk-sub-toggle${collapsed ? ' is-collapsed' : ''}${done === total ? ' is-complete' : ''}`;
    return `<button class="${cls}" type="button" aria-expanded="${!collapsed}" aria-label="${label}" title="${label}">${I('chevron-down', 12)}</button>`;
  };

  // Acciones flotantes: añadir subtarea y eliminar (contraer/expandir va en el chevron de la fila).
  const acts = (del, delLabel) => `<span class="tk-acts">`
      + `<button class="tk-ib tk-sm tk-add-sub" type="button" aria-label="Añadir subtarea" title="Añadir subtarea">${I('plus', 14)}</button>`
      + `<button class="tk-ib tk-sm ${del}" type="button" aria-label="${delLabel}" title="${delLabel}">${I('trash', 14)}</button></span>`;

  const check = (done, sm) => `<button class="tk-check${sm ? ' tk-check-sm' : ''}${done ? ' is-on' : ''}" type="button" aria-label="${sm ? 'Marcar subtarea' : 'Marcar tarea'}" aria-pressed="${done}">${done ? I('check', sm ? 10 : 12) : ''}</button>`;

  const subRow = (task, sub, edit) => {
    const editing = edit.sub && edit.sub.id === task.id && edit.sub.sub === sub.id;
    const row = node(`<div class="tk-row tk-sub-row">${check(sub.done, true)}<span class="tk-sub-text${sub.done ? ' is-done' : ''}"></span>${editing ? '' : acts('tk-del-sub', 'Eliminar subtarea')}</div>`);
    row.dataset.sub = sub.id;
    const text = row.querySelector('.tk-sub-text');
    if (editing) text.replaceWith(editInput('tk-edit-in tk-sub-text', sub.text, 'Editar texto', edit.finishSub));
    else text.textContent = sub.text;
    return row;
  };

  // Campo de nueva subtarea: Enter la agrega y deja otro vacío para la siguiente (vacío no hace nada);
  // Esc cierra; perder el foco guarda si hay texto y cierra. on = { save(texto), close(guardar, texto) }.
  const subInput = (handlers) => {
    const row = node('<div class="tk-row tk-sub-add"><input class="tk-sub-in" aria-label="Nueva subtarea" placeholder="Nueva subtarea…" autocomplete="off"></div>');
    const input = row.firstElementChild;
    let settled = false;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!input.value.trim()) return;
        settled = true;
        handlers.save(input.value);
      } else if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        settled = true;
        handlers.close(false, '');
      }
    });
    input.addEventListener('blur', () => {
      if (settled) return;
      settled = true;
      handlers.close(true, input.value);
    });
    return row;
  };

  // Campo que reemplaza al texto o a la hora al editar (doble clic). Enter o perder el foco guardan; Esc cancela.
  // finish(save, valor) lo atiende la lista: repinta sin el campo y, si save, avisa a app con el valor crudo.
  const editInput = (cls, value, label, finish, hour) => {
    const input = node(`<input class="${cls}" aria-label="${label}" autocomplete="off"${hour ? ' inputmode="numeric" maxlength="2"' : ''}>`);
    input.value = value;
    let settled = false; // el blur que provoca cerrar con Enter/Esc no vuelve a guardar
    const done = (save) => { if (settled) return; settled = true; finish(save, input.value); };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); done(true); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); }
    });
    input.addEventListener('blur', () => done(true));
    return input;
  };

  // edit = { text, hour, sub, adding, finish* } (estado de edición de la vista): text/hour/adding = id de tarea o null;
  // sub = { id, sub } de la subtarea que se edita, o null.
  const taskRow = (task, edit) => {
    const done = task.done ? ' is-done' : '';
    const has = task.subtasks.length > 0;
    const editing = edit.text === task.id;
    const wrap = node(`<div class="tk-task"><div class="tk-row tk-task-row${has ? ' has-subs' : ''}">${check(task.done, false)}<span class="tk-hour${done}"></span><span class="tk-text${done}"></span>${subChip(task)}${editing ? '' : acts('tk-del', 'Eliminar tarea')}</div></div>`);
    wrap.dataset.id = task.id;
    wrap.firstElementChild.dataset.id = task.id;
    const hourEl = wrap.querySelector('.tk-hour');
    if (edit.hour === task.id) hourEl.replaceWith(editInput('tk-hour-edit', String(task.hour), 'Editar hora (0 a 23)', edit.finishHour, true));
    else hourEl.textContent = String(task.hour);
    const textEl = wrap.querySelector('.tk-text');
    if (editing) textEl.replaceWith(editInput('tk-edit-in tk-text', task.text, 'Editar texto', edit.finishText));
    else textEl.textContent = task.text;
    const adding = edit.adding === task.id;
    const show = has && !task.collapsed;
    if (show || adding) {
      const block = node('<div class="tk-subs"></div>');
      if (show) block.append(...task.subtasks.map((s) => subRow(task, s, edit)));
      if (adding) block.append(subInput(edit.subHandlers));
      wrap.append(block);
    }
    return wrap;
  };

  // Fila para añadir tareas (#tk-add): oculta por defecto; la abre el «+». La hora y el texto llegan crudos a
  // on.add(texto, hora), que responde 'hour' (hora inválida), 'text' (texto vacío) o true (creada).
  const addRow = (on) => {
    const row = node(`<div class="tk-add" id="tk-add" hidden>
      <button class="tk-add-btn" type="button" aria-label="Añadir tarea">${I('plus', 12)}</button>
      <input class="tk-hour-in" id="tk-add-hour" aria-label="Hora de la tarea (0 a 23)" title="Hora (0–23). Vacío = hora actual" inputmode="numeric" maxlength="2" autocomplete="off">
      <input class="tk-add-in" id="tk-add-text" aria-label="Nueva tarea" placeholder="Añadir nueva tarea…" autocomplete="off">
      <span class="tk-kbd">Enter</span>
    </div>`);
    const hour = row.querySelector('#tk-add-hour'), text = row.querySelector('#tk-add-text');
    const placeholder = () => { hour.placeholder = String(on.hourNow()); };
    const invalid = (bad) => { hour.classList.toggle('is-invalid', bad); if (bad) hour.setAttribute('aria-invalid', 'true'); else hour.removeAttribute('aria-invalid'); };

    const submit = () => {
      const r = on.add(text.value, hour.value);
      if (r === 'hour') { invalid(true); hour.focus(); hour.select(); return; }
      if (r !== true) { text.focus(); return; }
      text.value = ''; hour.value = '';
      placeholder();
      hour.focus(); // el cursor queda al inicio de la próxima tarea: su hora
    };
    const close = () => {
      text.value = ''; hour.value = '';
      invalid(false);
      if (!row.hidden) { row.hidden = true; on.closeAdd(); }
    };

    row.querySelector('.tk-add-btn').addEventListener('click', submit);
    for (const f of [hour, text]) {
      f.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); submit(); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      });
    }
    // Perder el foco fuera de la fila la oculta y descarta lo escrito (se mira tras el cambio de foco).
    row.addEventListener('focusout', () => setTimeout(() => { if (!row.hidden && !row.contains(document.activeElement)) close(); }, 0));
    hour.addEventListener('input', () => invalid(false));
    row.addEventListener('focusin', placeholder);
    row.addEventListener('click', (e) => { if (e.target === row) text.focus(); });

    return {
      el: row,
      open() { row.hidden = false; placeholder(); if (row.scrollIntoView) row.scrollIntoView({ block: 'nearest' }); hour.focus(); },
      close,
    };
  };

  // Vista de la lista (#tk-list): filas de tareas en orden manual y, al final, la fila de añadir.
  // Cada fila se rehace solo si cambió (clave = JSON de la tarea), así un repintado no destruye la que tiene el foco.
  const createList = (listEl, on) => {
    const add = addRow(on);
    // «Traer tareas de ayer»: después de la fila de añadir. Lo muestra o lo oculta app (carry(visible)).
    const carryEl = node(`<div class="tk-carry" id="tk-carry" hidden>
      <p class="tk-carry-text">Sin tareas para hoy</p>
      <button class="tk-carry-btn" type="button" data-act="carry">Traer tareas de ayer</button>
    </div>`);
    listEl.replaceChildren(add.el, carryEl);
    const cache = new Map();
    let last = [];

    // Estado de edición de la vista (no es estado de la app: solo qué campo está abierto).
    const edit = {
      text: null, hour: null, sub: null, adding: null,
      finishText(save, value) { const id = edit.text; edit.text = null; render(last); if (save) on.edit(id, value); },
      finishHour(save, value) { const id = edit.hour; edit.hour = null; render(last); if (save) on.setHour(id, value); },
      finishSub(save, value) { const s = edit.sub; edit.sub = null; render(last); if (save) on.editSub(s.id, s.sub, value); },
      subHandlers: {
        // Guarda y deja abierto un campo vacío para la siguiente subtarea.
        save(value) { on.addSub(edit.adding, value); focusIn('.tk-sub-in'); },
        close(save, value) { const id = edit.adding; edit.adding = null; render(last); if (save && value.trim()) on.addSub(id, value); },
      },
    };
    const focusIn = (sel) => { const i = listEl.querySelector(sel); if (i) { i.focus(); i.select(); } };

    const render = (tasks) => {
      last = tasks;
      const has = (id) => tasks.some((t) => t.id === id);
      if (edit.text && !has(edit.text)) edit.text = null;
      if (edit.hour && !has(edit.hour)) edit.hour = null;
      if (edit.adding && !has(edit.adding)) edit.adding = null;
      if (edit.sub && !has(edit.sub.id)) edit.sub = null;
      const nodes = tasks.map((t) => {
        const key = JSON.stringify([t, edit.text === t.id, edit.hour === t.id, edit.adding === t.id, edit.sub && edit.sub.id === t.id ? edit.sub.sub : null]);
        const c = cache.get(t.id);
        if (c && c.key === key) return c.node;
        const n = taskRow(t, edit);
        cache.set(t.id, { key, node: n });
        return n;
      });
      const keep = new Set(nodes);
      for (const id of [...cache.keys()]) if (!tasks.some((t) => t.id === id)) cache.delete(id);
      for (const child of [...listEl.children]) if (child.classList.contains('tk-task') && !keep.has(child)) child.remove();
      // Coloca los nodos en orden sin mover los que ya están en su sitio; la fila de añadir queda después.
      let ref = listEl.firstElementChild;
      for (const n of nodes) {
        if (n === ref) ref = ref.nextElementSibling;
        else listEl.insertBefore(n, ref);
      }
    };

    // Clic simple en una fila con subtareas = contraer/expandir, con retraso para que un doble clic lo cancele.
    const ROW_CLICK_DELAY = 250;
    let pending = null;
    const cancelPending = () => { if (pending !== null) { clearTimeout(pending); pending = null; } };
    const taskOf = (id) => last.find((t) => t.id === id);

    // Clics en las filas. Borrar no pregunta (como el original).
    listEl.addEventListener('click', (e) => {
      const t = e.target;
      const wrap = t.closest('.tk-task');
      const id = wrap && wrap.dataset.id;
      if (!id) return;
      const subRowEl = t.closest('.tk-sub-row');
      const sub = subRowEl && subRowEl.dataset.sub;
      if (t.closest('.tk-task-row > .tk-check')) on.toggle(id);
      else if (t.closest('.tk-sub-row > .tk-check') && sub) on.toggleSub(id, sub);
      else if (t.closest('.tk-sub-toggle')) on.collapse(id);
      else if (t.closest('.tk-add-sub')) {
        // Si estaban contraídas, se expanden para ver dónde cae la nueva subtarea.
        const task = taskOf(id);
        if (task && task.collapsed) on.collapse(id);
        edit.adding = id;
        render(last);
        focusIn('.tk-sub-in');
      } else if (t.closest('.tk-del')) on.del(id);
      else if (t.closest('.tk-del-sub') && sub) on.delSub(id, sub);
      else if (t.closest('.tk-task-row') && !t.closest('button, input')) {
        cancelPending();
        if (e.detail > 1) return; // el segundo clic de un doble clic lo atiende dblclick
        const task = taskOf(id);
        if (!task || !task.subtasks.length) return;
        pending = setTimeout(() => { pending = null; on.collapse(id); }, ROW_CLICK_DELAY);
      }
    });

    // Doble clic en el texto o en la hora de una tarea, o en el texto de una subtarea: editarlo.
    listEl.addEventListener('dblclick', (e) => {
      cancelPending();
      const t = e.target;
      const wrap = t.closest('.tk-task');
      const id = wrap && wrap.dataset.id;
      if (!id) return;
      if (t.closest('.tk-sub-row > .tk-sub-text')) { edit.sub = { id, sub: t.closest('.tk-sub-row').dataset.sub }; render(last); focusIn('.tk-edit-in'); }
      else if (t.closest('.tk-task-row > .tk-text')) { edit.text = id; render(last); focusIn('.tk-edit-in'); }
      else if (t.closest('.tk-task-row > .tk-hour')) { edit.hour = id; render(last); focusIn('.tk-hour-edit'); }
    });

    return { render, openAdd: add.open, closeAdd: add.close, carry: (visible) => { carryEl.hidden = !visible; } };
  };

  PYL.ui.tasks = { shell, days, progress, alertSwitch, historyItems, menuShow, menuMove, menuHas, about, createList };
})();
