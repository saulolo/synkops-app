// Pestaña Buscar producto: estado (app.state.search), persistencia y conexión con la UI.
// Mi candidato = formulario del evaluador; la bitácora guarda los productos (con foto) en este navegador.
// "Costear" pasa el candidato a los campos de la pestaña Costeo (trainer.js) y la abre.
(() => {
  const PYL = globalThis.PYL;
  const { $ } = PYL.ui.dom;
  const C = PYL.core.search, U = PYL.ui.search, K = PYL.ui.candidate;
  const store = PYL.services.storage.search, toast = PYL.ui.feedback.toast;

  const saved = store.load() || {};
  const S = (PYL.app.state.search = {
    active: saved.active || 0,      // paso del flujograma abierto
    done: saved.done || {},         // pasos hechos { k: true }
    draft: saved.draft || {},       // candidato en el formulario
    editingId: saved.editingId || null,
    log: (saved.log || []).filter((p) => p && p.id), // bitácora (descarta el formato viejo sin id)
    view: saved.view || 'list',     // 'list' | 'stats'
    filter: saved.filter || 'todos',
    q: '',
    sort: saved.sort || null,
    strat: saved.strat || 'vdo',    // estrategia de búsqueda abierta: 'vdo' | 'prov'
    provStep: saved.provStep || 0,  // fase abierta de la estrategia por proveedor
  });
  if (S.editingId && !S.log.some((p) => p.id === S.editingId)) S.editingId = null;

  const persist = () => {
    if (store.save(S)) return true;
    toast('No pude guardar en el navegador (¿se llenó con las fotos?). Lo tengo mientras no cierre la página: borro productos viejos o les quito la foto.', 'error');
    return false;
  };

  // ---------- Flujograma ----------
  function renderFlow() {
    const total = C.FLOW.length, i = Math.min(S.active, total - 1), s = C.FLOW[i];
    const doneCount = C.FLOW.filter((x) => S.done[x.k]).length;
    const reset = () => { S.done = {}; S.active = 0; persist(); renderFlow(); };
    U.flowList($('#b-flow'), C.FLOW, i, S.done, (j) => { S.active = j; persist(); renderFlow(); });
    U.flowStep($('#b-step'), s, i, total, !!S.done[s.k], {
      toggle: () => { S.done[s.k] = !S.done[s.k]; if (S.done[s.k] && i < total - 1) S.active = i + 1; persist(); renderFlow(); },
      next: () => { S.active = i + 1; persist(); renderFlow(); },
      costeo: () => costear(S.draft),
      reset: doneCount ? reset : null,
    });
    U.progress($('#b-prog'), doneCount, total, reset);
  }

  // ---------- Producto ganador ----------
  // Las marcas van en el candidato (draft.traits): se guardan con él en la bitácora.
  function renderWinner() {
    const t = S.draft.traits || {};
    U.winner($('#b-winner'), C.WINNER, C.WINNER_GROUPS, t, C.winnerCheck(t), (k) => {
      S.draft.traits = { ...(S.draft.traits || {}), [k]: !t[k] };
      persist(); renderWinner();
    });
  }

  // ---------- Pirámide del producto ganador ----------
  // Lo elegido no se guarda: al abrir la página arranca en la base (producto y oferta).
  const pyr = { lvl: 'pro', item: null };
  function renderPyramid() {
    U.pyramidMap($('#b-pyr-map'), C.PYRAMID, pyr, (lvl, item) => { pyr.lvl = lvl; pyr.item = item; renderPyramid(); });
  }

  // ---------- Estrategias de búsqueda ----------
  function renderStrategy() {
    const k = C.STRATEGIES.some((s) => s.k === S.strat) ? S.strat : 'vdo';
    U.strategyTabs($('#b-strats'), C.STRATEGIES, k, (x) => { S.strat = x; persist(); renderStrategy(); });
    $('#b-st-vdo').hidden = k !== 'vdo'; $('#b-st-prov').hidden = k !== 'prov';
    if (k !== 'prov') return;
    const i = Math.min(Math.max(0, S.provStep), C.BY_PROVIDER.steps.length - 1);
    U.byProvider($('#b-prov'), C.BY_PROVIDER, i, {
      select: (j) => { S.provStep = j; persist(); renderStrategy(); },
      cand: () => { $('#b-cand').scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(() => $('#b-f-name').focus({ preventScroll: true }), 350); },
    });
  }

  // ---------- Mi candidato ----------
  function renderLive() {
    const d = S.draft, s = C.score(d), u = C.unitCost(d);
    K.scoreBox($('#b-score'), s, C.SCORE_MAX, C.scoreLevel(s), C.scoreParts(d), !!S.editingId);
    K.cost($('#b-cost'), u, u && u.margen != null ? C.marginLevel(u.margen) : null);
    K.comp($('#b-form'), C.competition(d.sales7));
    const ev = C.evaluate(d);
    U.result($('#b-result'), ev);
    U.stages($('#b-stages'), C.STAGES, ev.stage, C.stageRange);
    const editing = S.log.find((p) => p.id === S.editingId);
    $('#b-cand-title').textContent = editing ? 'Editando: ' + (editing.name || 'Sin nombre') : 'Mi candidato';
    $('#b-del').hidden = $('#b-dup').hidden = !editing;
    $('#b-save').textContent = editing ? 'Guardar cambios' : 'Guardar en bitácora';
  }

  function loadDraft(d, id) {
    if (d.msp !== undefined) d.msp = C.mspLevel(d.msp) || '';
    S.draft = d; S.editingId = id || null; persist();
    K.fill($('#b-form'), S.draft); renderLive(); renderLog(); renderWinner(); mirror(d);
  }

  // "Poner este precio en mi candidato" del Costeo: llega el "Véndelo a" y vuelvo a Buscar producto con él en Precio de venta.
  document.addEventListener('costeo:precio', (e) => {
    S.draft.sellPrice = e.detail.price; persist();
    K.fill($('#b-form'), S.draft); renderLive();
    $('#tabs [data-v="buscar"]').click();
    const f = $('#b-f-sellPrice');
    setTimeout(() => { f.scrollIntoView({ behavior: 'smooth', block: 'center' }); f.focus({ preventScroll: true }); }, 350);
    toast(`Puse ${PYL.core.format.fmt(e.detail.price, 'cop')} como precio de venta de mi candidato.`, 'ok');
  });

  // Nombre y precio proveedor del candidato se copian en vivo a la pestaña Costeo (trainer.js recalcula con `input`).
  const setCost = (id, v) => { const x = $('#' + id); x.value = v; x.dispatchEvent(new Event('input', { bubbles: true })); x.dispatchEvent(new Event('change')); };
  function mirror(d) {
    if (d.name) setCost('c-name', d.name);
    if (d.price) setCost('c-prov', d.price);
  }

  // redraw = repintar las filas de proveedores (al agregar o quitar una).
  function change(k, v, redraw) {
    S.draft[k] = v; persist();
    if (k === 'name' || k === 'price') mirror({ [k]: v });
    if (redraw) K.fill($('#b-form'), S.draft);
    if (Array.isArray(v) || ['status', 'msp', 'val', 'ia'].includes(k)) K.syncChips($('#b-form'), k, v);
    renderLive();
  }

  async function photo(file) {
    try {
      S.draft.photo = await PYL.services.files.imageDataURL(file);
      persist(); K.fill($('#b-form'), S.draft);
    } catch { toast('No pude leer esa imagen.', 'error'); }
  }

  function save() {
    const d = S.draft, name = (d.name || '').trim();
    if (!name) { toast('Pongo al menos el nombre del producto.', 'error'); $('#b-f-name').focus(); return; }
    const p = { ...d, name, id: S.editingId || String(Date.now()), updatedAt: Date.now() };
    const i = S.log.findIndex((x) => x.id === p.id);
    if (i >= 0) S.log[i] = p; else S.log.unshift(p);
    persist(); // si no cupo, queda en la sesión y persist() ya avisó
    toast(i >= 0 ? `Actualicé ${name}.` : `Guardé ${name} en la bitácora.`, 'ok');
    // El producto se queda abierto en el formulario (ahora "Editando"): solo "Limpiar formulario" lo vacía.
    loadDraft({ ...p }, p.id);
  }

  // id = producto de la bitácora (botón de la fila); sin id, el que estoy editando.
  // Si borro el que está abierto en Mi candidato, el formulario queda limpio; si no, no lo toco.
  async function del(id) {
    const p = S.log.find((x) => x.id === (typeof id === 'string' ? id : S.editingId)); if (!p) return;
    const r = await PYL.ui.feedback.ask('Eliminar producto', `¿Elimino "${p.name || 'Sin nombre'}" de la bitácora? No se puede deshacer.`, [{ r: 'del', label: 'Eliminar' }]);
    if (r !== 'del') return;
    S.log = S.log.filter((x) => x.id !== p.id);
    if (p.id === S.editingId) loadDraft({}, null);
    else { persist(); renderLog(); }
    toast(`Eliminé ${p.name || 'el producto'} de la bitácora.`, 'ok');
  }

  function duplicate() {
    const p = S.log.find((x) => x.id === S.editingId); if (!p) return;
    const copy = { ...p, id: String(Date.now()), name: (p.name || 'Sin nombre') + ' (copia)', updatedAt: Date.now() };
    S.log.unshift(copy);
    loadDraft({ ...copy }, copy.id);
    toast('Dupliqué el producto: ahora edito la copia.', 'ok');
  }

  // Deja el formulario vacío y sale de "Editando" para cargar otro producto.
  // Solo pregunta si hay algo que se perdería (no está en la bitácora o tiene cambios sin guardar).
  async function clear() {
    const editing = S.log.find((x) => x.id === S.editingId) || null;
    if (C.unsaved(S.draft, editing)) {
      const r = await PYL.ui.feedback.ask('Limpiar formulario',
        editing ? `"${editing.name || 'Sin nombre'}" tiene cambios sin guardar. ¿Limpio el formulario igual? Lo que está en la bitácora queda como estaba.`
          : 'Lo que escribí no está guardado en la bitácora. ¿Limpio el formulario igual?',
        [{ r: 'clear', label: 'Limpiar' }]);
      if (r !== 'clear') return;
    }
    loadDraft({}, null);
    $('#b-cand').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => $('#b-f-name').focus({ preventScroll: true }), 350);
    toast('Formulario limpio: listo para un producto nuevo.', 'ok');
  }

  // "Enviar a Mi candidato" del guardado rápido (modules/quick/app/quick.js): llegan nombre, ID Dropi, precio proveedor y foto como producto nuevo.
  // Solo pregunta si hay algo que se perdería (mismo criterio que "Limpiar formulario"); no toca la bitácora.
  document.addEventListener('rapido:candidato', async (e) => {
    const { name, dropi, price, photo: pic } = e.detail;
    const editing = S.log.find((x) => x.id === S.editingId) || null;
    if (C.unsaved(S.draft, editing)) {
      const r = await PYL.ui.feedback.ask('Enviar a Mi candidato',
        editing ? `"${editing.name || 'Sin nombre'}" tiene cambios sin guardar. ¿Lo reemplazo con "${name}"? Lo que está en la bitácora queda como estaba.`
          : `Lo que escribí en Mi candidato no está guardado en la bitácora. ¿Lo reemplazo con "${name}"?`,
        [{ r: 'send', label: 'Reemplazar' }]);
      if (r !== 'send') return;
    }
    const d = { name, dropi };
    if (price) d.price = price; // Precio proveedor de Mi candidato
    if (pic) d.photo = pic;
    loadDraft(d, null);
    $('#b-cand').scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast(`Pasé "${name}" a Mi candidato.`, 'ok');
  });

  function open(id) {
    const p = S.log.find((x) => x.id === id); if (!p) return;
    loadDraft(JSON.parse(JSON.stringify(p)), id);
    $('#b-cand').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Lleva el candidato al costeo y abre esa pestaña; el costeo recalcula con el evento input.
  // `change` deja el número con puntos de miles en las barras del costeo.
  function costear(d) {
    const D = C.COST_DEFAULTS, n = (v, def) => (v === '' || v == null ? def : Number(v));
    const set = (id, v) => { if (v === '' || v == null) return; const x = $('#' + id); x.value = v; x.dispatchEvent(new Event('input', { bubbles: true })); x.dispatchEvent(new Event('change')); };
    // El costeo calcula el precio con el margen que quiero, así que no lleva el precio de venta del candidato.
    set('c-name', d.name); set('c-prov', d.price);
    set('c-flete', n(d.flete, D.flete)); set('c-cpa-esp', n(d.cpa, D.cpa));
    set('c-dev', n(d.devRate, D.devRate)); set('c-canc', n(d.cancelRate, D.cancelRate));
    $('#tabs [data-v="costeo"]').click();
    toast(d.name ? `Pasé ${d.name} al costeo con sus costos y % de entrega.` : 'Pasé los costos al costeo.', 'ok');
  }

  // ---------- Bitácora ----------
  function renderLog() {
    const st = C.stats(S.log), poco = S.log.filter(C.FILTERS.find((f) => f.k === 'poco').test).length;
    K.counts($('#b-counts'), st, poco);
    K.setPressed($('#b-views'), 'button', $(`#b-views [data-bview="${S.view}"]`));
    const isList = S.view === 'list';
    $('#b-list').hidden = !isList; $('#b-stats').hidden = isList;
    if (!isList) { K.statsView($('#b-stats'), st); return; }
    K.filters($('#b-filters'), C.FILTERS, S.filter, (k) => { S.filter = k; persist(); renderLog(); });
    const status = Object.fromEntries(C.STATUS.map((s) => [s.k, s])), msp = Object.fromEntries(C.MSP.map((m) => [m.k, m]));
    const rows = C.list(S.log, S).map((p) => {
      const s = C.score(p), u = C.unitCost(p);
      return { p, score: s, level: C.scoreLevel(s), comp: C.competition(p.sales7), util: u, ml: u && u.margen != null ? C.marginLevel(u.margen) : null, status: status[p.status], msp: msp[C.mspLevel(p.msp)] };
    });
    K.table($('#b-log'), rows, S.log.length, S.sort, S.editingId, {
      open, del,
      sort: (col) => { S.sort = S.sort === col + '-desc' ? col + '-asc' : col + '-desc'; persist(); renderLog(); },
    });
  }

  // ---------- Arranque ----------
  K.build($('#b-form'), C, { change, photo, photoClear: () => { delete S.draft.photo; persist(); K.fill($('#b-form'), S.draft); } });
  K.fill($('#b-form'), S.draft);
  mirror(S.draft);
  $('#b-save').addEventListener('click', save);
  $('#b-new').addEventListener('click', clear);
  $('#b-costear').addEventListener('click', () => costear(S.draft));
  $('#b-dup').addEventListener('click', duplicate);
  $('#b-del').addEventListener('click', () => del());
  // Los enlaces de la ruta abren la sección si está contraída.
  PYL.ui.dom.route(document.querySelector('.b-route'));
  document.querySelectorAll('.b-route a[href^="#"]').forEach((a) => a.addEventListener('click', () => { const t = $(a.getAttribute('href')); if (t && t.tagName === 'DETAILS') t.open = true; }));
  $('#b-q').addEventListener('input', (e) => { S.q = e.target.value; renderLog(); });
  $('#b-views').addEventListener('click', (e) => { const b = e.target.closest('[data-bview]'); if (b) { S.view = b.dataset.bview; persist(); renderLog(); } });

  U.vdo($('#b-vdo'), C.VDO);
  U.cards($('#b-tools'), C.TOOLS);
  U.cards($('#b-research'), C.RESEARCH);
  U.mistakes($('#b-mistakes'), C.MISTAKES);
  renderWinner(); renderPyramid(); renderStrategy(); renderFlow(); renderLive(); renderLog();
})();
