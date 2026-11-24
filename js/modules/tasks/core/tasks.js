// Mis tareas (SPEC 19): núcleo portado de My Sticky Notes (src/core/domain/*). Sin DOM.
// Nombres con prefijo tk/TK_ para no chocar al aplanar en js/index.js.
// DayKey = 'YYYY-MM-DD' en hora local (no UTC).
(() => {
  const core = globalThis.PYL.core;

  const TK_VERSION = 1;
  const TK_HISTORY_DAYS = 5; // días pasados que se conservan como historial
  const TK_ALERT_MAX = 3; // textos que lista el aviso por hora (SPEC 27); el resto va como «…y N más»

  // Tablas propias: Intl en español da «nov.» o días en minúscula según el runtime.
  const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  const pad = (n) => String(n).padStart(2, '0');

  // ---- Días ----

  // Fecha local de `date` como DayKey.
  const tkDayKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  // Medianoche local del día `key`.
  const tkDayDate = (key) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  // Suma `n` días de calendario (negativo resta). Por componentes: inmune al horario de verano.
  const tkAddDays = (key, n) => {
    const date = tkDayDate(key);
    date.setDate(date.getDate() + n);
    return tkDayKey(date);
  };

  // ---- Etiquetas ----

  // «Jueves, 12 nov».
  const tkDateLabel = (date) => `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;

  // «Jue, 12 nov» (día en 3 letras, con tilde). El CSS la pone en mayúsculas.
  const tkShortDate = (date) => `${DAYS[date.getDay()].slice(0, 3)}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;

  // «Hoy», «Mañana», «Ayer» o la etiqueta larga de esa fecha.
  const tkDayLabel = (key, today) => {
    if (key === today) return 'Hoy';
    if (key === tkAddDays(today, 1)) return 'Mañana';
    if (key === tkAddDays(today, -1)) return 'Ayer';
    return tkDateLabel(tkDayDate(key));
  };

  // Días anteriores a hoy con al menos una tarea, del más reciente al más viejo.
  const tkPastDays = (note, today) => Object.keys(note.days)
    .filter((k) => k < today && note.days[k].length > 0)
    .sort()
    .reverse();

  // ---- Hora ----

  // Hora válida de una tarea: entero de 0 a 23.
  const tkIsHour = (v) => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 23;

  // Hora escrita: vacío → undefined (usar la actual); entero 0–23 → ese número; otra cosa → null (inválida).
  const tkParseHour = (text) => {
    const t = String(text == null ? '' : text).trim();
    if (t === '') return undefined;
    if (!/^\d{1,2}$/.test(t)) return null;
    const h = Number(t);
    return tkIsHour(h) ? h : null;
  };

  // ---- Nota ----
  // Las operaciones no mutan: devuelven una nota nueva, o la misma si nada cambió.
  // Los ids y la hora se inyectan (`id`, `now`) para que las pruebas sean deterministas.

  const tkEmpty = () => ({ days: {} });

  // Lista del día `day` (vacía si no existe).
  const tkTasksOf = (note, day) => note.days[day] || [];

  const clean = (text) => String(text == null ? '' : text).trim();

  // Día que contiene la tarea `taskId` (los ids son únicos en toda la nota).
  const findDay = (note, taskId) => Object.keys(note.days).find((d) => note.days[d].some((t) => t.id === taskId));

  const withDay = (note, day, tasks) => ({ ...note, days: { ...note.days, [day]: tasks } });

  // Reemplaza la tarea `taskId` por fn(tarea); si fn la devuelve igual, la nota no cambia.
  const mapTask = (note, taskId, fn) => {
    const day = findDay(note, taskId);
    if (day === undefined) return note;
    const tasks = note.days[day];
    const current = tasks.find((t) => t.id === taskId);
    const updated = fn(current);
    if (updated === current) return note;
    return withDay(note, day, tasks.map((t) => (t.id === taskId ? updated : t)));
  };

  const mapSub = (note, taskId, subId, fn) => mapTask(note, taskId, (task) => {
    if (!task.subtasks.some((s) => s.id === subId)) return task;
    return { ...task, subtasks: task.subtasks.map((s) => (s.id === subId ? fn(s) : s)) };
  });

  // ---- Comandos ----

  // Tarea nueva al final del día. Sin `hour` usa la de `now`; hora inválida o texto vacío no crean nada.
  const tkAdd = (note, day, { hour, text } = {}, id, now) => {
    const t = clean(text);
    if (!t) return note;
    if (hour !== undefined && !tkIsHour(hour)) return note;
    const task = { id, hour: hour === undefined ? now.getHours() : hour, text: t, done: false, subtasks: [], createdAt: now.toISOString() };
    return withDay(note, day, [...tkTasksOf(note, day), task]);
  };

  // Subtarea al final de su tarea. Agregarla expande la tarea para que se vea.
  const tkAddSub = (note, taskId, text, id) => {
    const t = clean(text);
    if (!t) return note;
    return mapTask(note, taskId, (task) => ({
      ...task,
      subtasks: [...task.subtasks, { id, text: t, done: false }],
      ...(task.collapsed ? { collapsed: false } : {}),
    }));
  };

  // Contrae o expande las subtareas. Una tarea sin subtareas no cambia.
  const tkToggleCollapsed = (note, taskId) => mapTask(note, taskId, (task) => (
    task.subtasks.length === 0 ? task : { ...task, collapsed: !task.collapsed }
  ));

  // Marca o desmarca la tarea; no toca sus subtareas.
  const tkToggle = (note, taskId) => mapTask(note, taskId, (task) => ({ ...task, done: !task.done }));

  const tkToggleSub = (note, taskId, subId) => mapSub(note, taskId, subId, (s) => ({ ...s, done: !s.done }));

  // Marca (done = true) o desmarca todas las tareas y subtareas del día.
  const tkSetAll = (note, day, done) => {
    const tasks = tkTasksOf(note, day);
    const changed = tasks.some((t) => t.done !== done || t.subtasks.some((s) => s.done !== done));
    if (!changed) return note;
    return withDay(note, day, tasks.map((t) => ({
      ...t,
      done,
      subtasks: t.subtasks.map((s) => (s.done === done ? s : { ...s, done })),
    })));
  };

  // Texto vacío conserva el anterior.
  const tkEdit = (note, taskId, text) => {
    const t = clean(text);
    if (!t) return note;
    return mapTask(note, taskId, (task) => (task.text === t ? task : { ...task, text: t }));
  };

  const tkEditSub = (note, taskId, subId, text) => {
    const t = clean(text);
    if (!t) return note;
    return mapSub(note, taskId, subId, (s) => (s.text === t ? s : { ...s, text: t }));
  };

  // Hora inválida conserva la anterior.
  const tkSetHour = (note, taskId, hour) => {
    if (!tkIsHour(hour)) return note;
    return mapTask(note, taskId, (task) => (task.hour === hour ? task : { ...task, hour }));
  };

  // Mueve la tarea dentro de su día a la posición `toIndex` (limitada a [0, n − 1]).
  const tkMove = (note, taskId, toIndex) => {
    if (!Number.isInteger(toIndex)) return note;
    const day = findDay(note, taskId);
    if (day === undefined) return note;
    const tasks = note.days[day];
    const from = tasks.findIndex((t) => t.id === taskId);
    const to = Math.min(Math.max(toIndex, 0), tasks.length - 1);
    if (from === to) return note;
    const next = [...tasks];
    const [task] = next.splice(from, 1);
    next.splice(to, 0, task);
    return withDay(note, day, next);
  };

  // Mueve la subtarea dentro de su tarea a la posición `toIndex` (limitada a [0, n − 1]). No cambia de tarea.
  const tkMoveSub = (note, taskId, subId, toIndex) => {
    if (!Number.isInteger(toIndex)) return note;
    return mapTask(note, taskId, (task) => {
      const subs = task.subtasks;
      const from = subs.findIndex((s) => s.id === subId);
      if (from === -1) return task;
      const to = Math.min(Math.max(toIndex, 0), subs.length - 1);
      if (from === to) return task;
      const next = [...subs];
      const [sub] = next.splice(from, 1);
      next.splice(to, 0, sub);
      return { ...task, subtasks: next };
    });
  };

  // Pasa la subtarea a otra tarea del mismo día, en la posición `toIndex` (limitada a [0, m], m = subtareas del destino).
  // Conserva id, texto y done; el destino queda expandido (sin `collapsed`). Misma tarea → usar tkMoveSub.
  // Falta origen, destino o subtarea, índice no entero, misma tarea u otro día → la misma nota.
  const tkMoveSubTo = (note, fromTaskId, subId, toTaskId, toIndex) => {
    if (!Number.isInteger(toIndex) || fromTaskId === toTaskId) return note;
    const day = findDay(note, fromTaskId);
    if (day === undefined || findDay(note, toTaskId) !== day) return note;
    const tasks = note.days[day];
    const from = tasks.find((t) => t.id === fromTaskId);
    const sub = from.subtasks.find((s) => s.id === subId);
    if (!sub) return note;
    const { collapsed, ...to } = tasks.find((t) => t.id === toTaskId);
    const subs = [...to.subtasks];
    subs.splice(Math.min(Math.max(toIndex, 0), subs.length), 0, sub);
    const nextFrom = { ...from, subtasks: from.subtasks.filter((s) => s.id !== subId) };
    const nextTo = { ...to, subtasks: subs };
    return withDay(note, day, tasks.map((t) => (t.id === fromTaskId ? nextFrom : t.id === toTaskId ? nextTo : t)));
  };

  // Borrar una tarea se lleva sus subtareas.
  const tkDelete = (note, taskId) => {
    const day = findDay(note, taskId);
    if (day === undefined) return note;
    return withDay(note, day, note.days[day].filter((t) => t.id !== taskId));
  };

  const tkDeleteSub = (note, taskId, subId) => mapTask(note, taskId, (task) => {
    if (!task.subtasks.some((s) => s.id === subId)) return task;
    return { ...task, subtasks: task.subtasks.filter((s) => s.id !== subId) };
  });

  // ---- Paso de los días y traer de ayer ----

  // Solo poda, no mueve: borra los días anteriores a hoy − TK_HISTORY_DAYS y los días pasados vacíos.
  // Hoy y los futuros no se tocan. Sin cambios devuelve la misma nota. Idempotente.
  const tkRollOver = (note, today) => {
    const oldest = tkAddDays(today, -TK_HISTORY_DAYS);
    const days = {};
    let changed = false;
    for (const day of Object.keys(note.days)) {
      const tasks = note.days[day];
      if (day < today && (tasks.length === 0 || day < oldest)) {
        changed = true;
        continue;
      }
      days[day] = tasks;
    }
    return changed ? { ...note, days } : note;
  };

  // Día más reciente anterior a hoy con al menos una tarea, o null.
  const tkCarrySource = (note, today) => {
    let source = null;
    for (const day of Object.keys(note.days)) {
      if (day < today && note.days[day].length > 0 && (source === null || day > source)) source = day;
    }
    return source;
  };

  // «Traer tareas de ayer» disponible: no se usó hoy, Hoy está vacío y hay día de origen.
  const tkCanCarry = (note, today) => note.lastCarryOver !== today
    && tkTasksOf(note, today).length === 0
    && tkCarrySource(note, today) !== null;

  // Copia (no mueve) las tareas del origen al final de Hoy: ids nuevos, todo sin marcar; fija lastCarryOver.
  const tkCarry = (note, today, newId) => {
    if (!tkCanCarry(note, today)) return note;
    const source = tkCarrySource(note, today);
    const copies = note.days[source].map((task) => ({
      ...task,
      id: newId(),
      done: false,
      subtasks: task.subtasks.map((s) => ({ ...s, id: newId(), done: false })),
    }));
    return { ...withDay(note, today, [...tkTasksOf(note, today), ...copies]), lastCarryOver: today };
  };

  // ---- Lectura ----

  // Cuenta tareas y subtareas: { done, total, percent } con percent entero 0–100 (0 sin elementos).
  const tkProgress = (tasks) => {
    let total = 0;
    let done = 0;
    for (const task of tasks) {
      total += 1;
      if (task.done) done += 1;
      for (const s of task.subtasks) {
        total += 1;
        if (s.done) done += 1;
      }
    }
    return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
  };

  // ---- Aviso por hora (SPEC 27) ----

  // Tareas de `today` sin hacer con hora `hour`, en el orden de la lista. Las subtareas no cuentan.
  const tkDueAlert = (note, today, hour) => tkTasksOf(note, today).filter((t) => !t.done && t.hour === hour);

  // Milisegundos hasta el próximo HH:00:00.000 local (siempre > 0: en punto devuelve 1 h).
  const tkMsToNextHour = (now) => {
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
    return next.getTime() - now.getTime();
  };

  // 'Es hora: 14:00 · A · B · C · …y 2 más'.
  const tkAlertText = (hour, tasks) => {
    const parts = [`Es hora: ${pad(hour)}:00`, ...tasks.slice(0, TK_ALERT_MAX).map((t) => t.text)];
    if (tasks.length > TK_ALERT_MAX) parts.push(`…y ${tasks.length - TK_ALERT_MAX} más`);
    return parts.join(' · ');
  };

  // ---- Guardado ----
  // Reglas del validador original (isNote de validate-stored-data.ts), sin ventana ni migraciones.

  const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
  const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
  const isText = (v) => typeof v === 'string' && v.trim() !== '';

  const isSub = (v) => isObj(v) && typeof v.id === 'string' && isText(v.text) && typeof v.done === 'boolean';

  const isTask = (v) => isObj(v)
    && typeof v.id === 'string'
    && tkIsHour(v.hour)
    && isText(v.text)
    && typeof v.done === 'boolean'
    && typeof v.createdAt === 'string'
    && (v.collapsed === undefined || typeof v.collapsed === 'boolean')
    && Array.isArray(v.subtasks)
    && v.subtasks.every(isSub);

  // Solo la ausencia de lastCarryOver es válida: null u otro valor invalida la nota.
  const isNote = (v) => isObj(v)
    && isObj(v.days)
    && Object.entries(v.days).every(([day, tasks]) => DAY_KEY.test(day) && Array.isArray(tasks) && tasks.every(isTask))
    && (v.lastCarryOver === undefined || (typeof v.lastCarryOver === 'string' && DAY_KEY.test(v.lastCarryOver)));

  // Lee el texto crudo de pyl-tasks → { ok, note, collapsed, alerts }. Sin clave (null) → ok con nota vacía.
  // JSON roto, `v` distinta o cualquier regla rota → ok: false y nota vacía (app guarda el crudo aparte).
  // `alerts` (SPEC 27) es opcional: ausente o no booleano → false, sin invalidar la nota.
  // `today` queda en la firma por paridad con el original (allí migraba v1 a hoy); app aplica tkRollOver después.
  const tkLoad = (raw, today) => {
    const empty = (ok) => ({ ok, note: tkEmpty(), collapsed: false, alerts: false });
    if (raw == null) return empty(true);
    let data;
    try { data = JSON.parse(raw); } catch (e) { return empty(false); }
    if (!isObj(data) || data.v !== TK_VERSION || !isNote(data.note)) return empty(false);
    const { days, lastCarryOver } = data.note;
    const note = lastCarryOver === undefined ? { days } : { days, lastCarryOver };
    return { ok: true, note, collapsed: data.collapsed === true, alerts: data.alerts === true };
  };

  core.tasks = {
    TK_VERSION, TK_HISTORY_DAYS, TK_ALERT_MAX,
    tkDayKey, tkDayDate, tkAddDays, tkDayLabel, tkPastDays,
    tkDateLabel, tkShortDate,
    tkIsHour, tkParseHour,
    tkEmpty, tkTasksOf,
    tkAdd, tkAddSub, tkToggle, tkToggleSub, tkSetAll, tkEdit, tkEditSub, tkSetHour, tkMove, tkMoveSub, tkMoveSubTo, tkDelete, tkDeleteSub, tkToggleCollapsed,
    tkRollOver, tkCarrySource, tkCanCarry, tkCarry,
    tkProgress,
    tkDueAlert, tkMsToNextHour, tkAlertText,
    tkLoad,
  };
})();
