// Guardado rápido (Buscar producto): estado (app.state.quick), persistencia y conexión con la UI.
// Es una libreta de pendientes: guarda nombre, ID Dropi y una imagen pequeña; no calcula nada con ellos.
(() => {
  const PYL = globalThis.PYL;
  const { $ } = PYL.ui.dom;
  const C = PYL.core.quick, U = PYL.ui.quick;
  const store = PYL.services.storage.quick, toast = PYL.ui.feedback.toast;

  const saved = store.load() || {};
  const S = (PYL.app.state.quick = {
    open: false,                                          // panel abierto (no se guarda)
    items: (saved.items || []).filter((p) => p && p.id),  // el más nuevo primero
    photo: '',                                            // imagen del formulario aún sin guardar (en edición arranca con la del producto; no se guarda)
    editing: null,                                        // id del producto que se edita en el formulario (no se guarda)
  });

  const root = $('#qk-root');
  const render = () => U.render(root, S);

  const persist = () => {
    if (store.save({ items: S.items })) return true;
    toast('No pude guardar en el navegador (¿se llenó con las fotos?). Lo tengo mientras no cierre la página: uso "Limpiar" para liberar espacio.', 'error');
    return false;
  };

  // Sale del modo edición sin guardar: vacía el formulario y la imagen. No repinta (quien llama repinta). Sin edición no toca nada.
  function cancelEdit() {
    if (S.editing == null) return;
    S.editing = null; S.photo = ''; U.reset(root);
  }

  const setOpen = (open) => {
    S.open = open;
    if (!open) cancelEdit();
    render();
    if (open) { document.dispatchEvent(new CustomEvent('flotante:abierto', { detail: { id: 'qk' } })); U.focus(root); }
  };

  // Lápiz de una fila: carga ese producto en el formulario (sin preguntar si ya había otro en edición).
  function edit(id) {
    const p = S.items.find((x) => x.id === id);
    if (!p) return;
    S.editing = id; S.photo = p.photo || '';
    render(); U.fill(root, p);
  }

  function save() {
    const form = U.read(root);
    const entry = { name: form.name, dropi: form.dropi, price: C.quickPrice(form.price), photo: S.photo };
    const chk = C.quickCheck(S.items, entry, S.editing == null ? undefined : S.editing);
    if (!chk.ok) { toast(chk.msg, 'error'); U.focus(root); return; }
    if (S.editing != null) {
      S.items = C.quickUpdate(S.items, S.editing, entry);
      S.editing = null; S.photo = '';
      const ok = persist();
      U.reset(root); render();
      if (ok) toast(`Actualicé "${entry.name.trim()}" en el guardado rápido.`, 'ok');
      return;
    }
    S.items = C.quickAdd(S.items, entry, Date.now());
    S.photo = '';
    const ok = persist();
    U.reset(root); render();
    if (ok) toast(`Guardé "${S.items[0].name}" en el guardado rápido.`, 'ok');
  }

  async function photo(file) {
    try { S.photo = await PYL.services.files.imageDataURL(file); render(); }
    catch { toast('No pude leer esa imagen.', 'error'); }
  }

  async function clear() {
    const n = S.items.length;
    if (!n) return;
    const r = await PYL.ui.feedback.ask('Limpiar guardado rápido',
      `¿Borro ${n === 1 ? 'el producto guardado' : `los ${n} productos guardados`} aquí? No se puede deshacer. Lo que ya envié a Mi candidato no se toca.`,
      [{ r: 'clear', label: 'Limpiar' }]);
    if (r !== 'clear') return;
    cancelEdit();
    S.items = []; persist(); render();
    toast('Guardado rápido limpio.', 'ok');
  }

  // Papelera de cada fila: quita solo ese producto (pregunta antes, como la bitácora).
  async function del(id) {
    const p = S.items.find((x) => x.id === id);
    if (!p) return;
    const r = await PYL.ui.feedback.ask('Eliminar producto', `¿Elimino "${p.name}" del guardado rápido? No se puede deshacer.`, [{ r: 'del', label: 'Eliminar' }]);
    if (r !== 'del') return;
    if (S.editing === id) cancelEdit();
    S.items = C.quickRemove(S.items, id); persist(); render();
    toast(`Eliminé "${p.name}" del guardado rápido.`, 'ok');
  }

  // Manda una copia del producto a Mi candidato (lo recibe modules/search/app/search.js). El producto sigue en la lista.
  function send(id) {
    const p = S.items.find((x) => x.id === id);
    if (!p) return;
    const detail = { name: p.name, dropi: p.dropi };
    if (p.price) detail.price = p.price;
    if (p.photo) detail.photo = p.photo;
    setOpen(false);
    document.dispatchEvent(new CustomEvent('rapido:candidato', { detail }));
  }

  U.build(root, {
    toggle: () => setOpen(!S.open),
    close: () => setOpen(false),
    save,
    cancel: () => { cancelEdit(); render(); },
    edit,
    photo,
    photoClear: () => { S.photo = ''; render(); },
    clear,
    send,
    del,
  });
  render();

  // Abrir otro botón flotante cierra este panel.
  document.addEventListener('flotante:abierto', (e) => { if (e.detail && e.detail.id !== 'qk' && S.open) setOpen(false); });

  // Esc cierra el panel (salvo que haya un diálogo abierto encima).
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && S.open && !$('#modal').classList.contains('show')) setOpen(false);
  });
})();
