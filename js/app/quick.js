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
    photo: '',                                            // imagen del formulario aún sin guardar (no se guarda)
  });

  const root = $('#qk-root');
  const render = () => U.render(root, S);

  const persist = () => {
    if (store.save({ items: S.items })) return true;
    toast('No pude guardar en el navegador (¿se llenó con las fotos?). Lo tengo mientras no cierre la página: uso "Limpiar" para liberar espacio.', 'error');
    return false;
  };

  const setOpen = (open) => { S.open = open; render(); if (open) U.focus(root); };

  function save() {
    const form = U.read(root);
    const entry = { name: form.name, dropi: form.dropi, price: C.quickPrice(form.price), photo: S.photo };
    const chk = C.quickCheck(S.items, entry);
    if (!chk.ok) { toast(chk.msg, 'error'); U.focus(root); return; }
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
    S.items = []; persist(); render();
    toast('Guardado rápido limpio.', 'ok');
  }

  // Manda una copia del producto a Mi candidato (lo recibe app/search.js). El producto sigue en la lista.
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
    photo,
    photoClear: () => { S.photo = ''; render(); },
    clear,
    send,
  });
  render();

  // Esc cierra el panel (salvo que haya un diálogo abierto encima).
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && S.open && !$('#modal').classList.contains('show')) setOpen(false);
  });
})();
