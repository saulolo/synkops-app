// Guardado rápido (pestaña Buscar producto): botón flotante con numerito y panel pequeño para anotar
// productos al vuelo (nombre, ID Dropi, imagen). Recibe datos y callbacks; no guarda estado.
// on = { toggle(), close(), save(), photo(file), photoClear(), clear(), copy(text), send(id), del(id) }.
(() => {
  const PYL = globalThis.PYL;
  const { el } = PYL.ui.dom;
  const { copyBtn } = PYL.ui.candidate;

  const ICON_BOLT = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>';

  const ICON_SEND = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>';

  // Misma papelera de la bitácora (modules/search/ui/candidate.js).
  const ICON_DEL = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';

  function field(id, label, ph) {
    const box = el('div', 'field');
    const lab = el('label', null, label); lab.htmlFor = id;
    const x = el('input'); x.type = 'text'; x.id = id; x.placeholder = ph; x.autocomplete = 'off';
    box.append(lab, x);
    return { box, x };
  }

  // Crea el botón flotante y el panel dentro de root (una sola vez).
  function build(root, on) {
    root.textContent = '';

    const btn = el('button', 'qk-btn'); btn.type = 'button'; btn.id = 'qk-btn';
    btn.title = 'Guardado rápido de productos'; btn.setAttribute('aria-label', btn.title);
    btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'qk-panel');
    btn.innerHTML = ICON_BOLT;
    const count = el('span', 'qk-count'); count.id = 'qk-count'; count.hidden = true;
    btn.append(count);
    btn.addEventListener('click', on.toggle);

    const panel = el('div', 'qk-panel'); panel.id = 'qk-panel'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Guardado rápido de productos');

    const head = el('div', 'qk-head');
    const title = el('div', 'qk-title'); title.append(el('b', null, 'Guardado rápido'), el('small', null, 'Solo para anotar; luego lo envío a Mi candidato'));
    const x = el('button', 'qk-x', '✕'); x.type = 'button'; x.title = 'Cerrar'; x.setAttribute('aria-label', 'Cerrar');
    x.addEventListener('click', on.close);
    head.append(title, x);

    const form = el('div', 'qk-form');
    const fn = field('qk-name', 'Nombre', 'Ej. Masajeador cervical');
    const fd = field('qk-dropi', 'ID Dropi', 'Ej. 1863859');
    // Precio proveedor: escribo 25000 o 25.000 y se ve como $ 25.000 (solo se ven los dígitos; el monto lo lee modules/quick/app/quick.js).
    const fp = field('qk-price', 'Precio proveedor', '$ 0');
    fp.x.inputMode = 'numeric';
    fp.x.addEventListener('input', () => {
      const digits = fp.x.value.replace(/,\d{1,2}$/, '').replace(/\D/g, '');
      fp.x.value = digits ? PYL.core.format.fmt(Number(digits), 'cop') : '';
    });
    [fn.x, fd.x, fp.x].forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); on.save(); } }));

    // Imagen: cuadro pequeño en la misma fila. Se pega con Ctrl+V o se toca para elegir un archivo.
    const photoBox = el('div', 'field');
    photoBox.append(el('label', null, 'Imagen'));
    const wrap = el('div', 'qk-photo-wrap');
    const photo = el('label', 'qk-photo'); photo.id = 'qk-photo';
    photo.title = 'Pego la imagen con Ctrl+V o toco para elegir un archivo';
    const file = el('input'); file.type = 'file'; file.accept = 'image/*'; file.hidden = true;
    const img = el('img', 'qk-photo-img'); img.alt = ''; img.hidden = true;
    const empty = el('span', 'qk-photo-empty'); empty.append(el('b', null, '🖼'), el('small', null, 'Ctrl+V'));
    photo.append(file, img, empty);
    file.addEventListener('change', () => { if (file.files[0]) on.photo(file.files[0]); file.value = ''; });
    const rm = el('button', 'qk-photo-rm', '✕'); rm.type = 'button'; rm.hidden = true;
    rm.title = 'Quitar imagen'; rm.setAttribute('aria-label', 'Quitar imagen');
    rm.addEventListener('click', on.photoClear);
    wrap.append(photo, rm);
    photoBox.append(wrap);

    const save = el('button', 'btn sm qk-save', 'Guardar'); save.type = 'button'; save.id = 'qk-save';
    save.addEventListener('click', on.save);
    form.append(fn.box, fd.box, fp.box, photoBox, save);

    // Pegar una imagen (captura o copia) con el panel abierto, sin importar dónde esté el foco:
    // el pegado llega al elemento enfocado, y al pasar el cursor por la imagen no hay foco en el panel.
    // El texto pegado sigue su curso normal.
    document.addEventListener('paste', (e) => {
      if (panel.hidden || !e.clipboardData) return;
      const cd = e.clipboardData;
      const viaItems = [...(cd.items || [])].filter((i) => i.kind === 'file' && i.type.startsWith('image/')).map((i) => i.getAsFile());
      const image = [...(cd.files || []), ...viaItems].find((f) => f && f.type.startsWith('image/'));
      if (!image) return;
      e.preventDefault();
      on.photo(image);
    });

    const bar = el('div', 'qk-bar');
    bar.append(el('b', null, 'Guardados'));
    const clear = el('button', 'btn ghost sm', '🧹 Limpiar'); clear.type = 'button'; clear.id = 'qk-clear';
    clear.title = 'Borra todos los productos guardados aquí';
    clear.addEventListener('click', on.clear);
    bar.append(clear);

    const list = el('div', 'qk-list'); list.id = 'qk-list';

    panel.append(head, form, bar, list);
    root.append(panel, btn);
    root._qk = { on, btn, count, panel, name: fn.x, dropi: fd.x, price: fp.x, img, empty, rm, clear, list };
  }

  function row(it, on) {
    const r = el('div', 'qk-row');
    if (it.photo) { const im = el('img', 'qk-thumb'); im.src = it.photo; im.alt = ''; r.append(im); }
    else r.append(el('span', 'qk-thumb qk-thumb-empty', '📦'));

    const info = el('div', 'qk-info');
    const nl = el('div', 'qk-line'); nl.append(el('span', 'qk-name', it.name), copyBtn(() => it.name, 'Nombre del producto', 'inline'));
    const dl = el('div', 'qk-line qk-id'); dl.append(el('span', null, 'ID ' + it.dropi), copyBtn(() => it.dropi, 'ID Dropi', 'inline'));
    if (it.price) dl.append(el('span', 'qk-price', PYL.core.format.fmt(it.price, 'cop')));
    info.append(nl, dl);

    // Ícono a la derecha de cada producto: lo manda a Mi candidato.
    const send = el('button', 'qk-send'); send.type = 'button'; send.innerHTML = ICON_SEND;
    send.title = 'Enviar a Mi candidato'; send.setAttribute('aria-label', 'Enviar ' + it.name + ' a Mi candidato');
    send.addEventListener('click', () => on.send(it.id));

    // Papelera: quita solo este producto de la lista (mismo botón que la bitácora, `.cd-act.del` de search.css).
    const del = el('button', 'cd-act del qk-del'); del.type = 'button'; del.innerHTML = ICON_DEL;
    del.title = 'Eliminar del guardado rápido'; del.setAttribute('aria-label', 'Eliminar ' + it.name + ' del guardado rápido');
    del.addEventListener('click', () => on.del(it.id));

    r.append(info, send, del);
    return r;
  }

  // v = { open, items, photo }: repinta botón, numerito, panel, vista previa de la imagen y lista.
  function render(root, v) {
    const k = root._qk;
    k.btn.setAttribute('aria-expanded', String(!!v.open));
    k.btn.classList.toggle('on', !!v.open);
    k.panel.hidden = !v.open;

    const n = v.items.length;
    k.count.textContent = String(n); k.count.hidden = n === 0;
    k.clear.disabled = n === 0;

    k.img.hidden = !v.photo; k.img.src = v.photo || '';
    k.empty.hidden = !!v.photo; k.rm.hidden = !v.photo;

    k.list.textContent = '';
    if (!n) k.list.append(el('p', 'qk-none', 'Aún no hay productos guardados.'));
    else v.items.forEach((it) => k.list.append(row(it, k.on)));
  }

  // Valores escritos en el formulario (el precio sale como texto; modules/quick/app/quick.js lo convierte con core.quick.quickPrice).
  const read = (root) => ({ name: root._qk.name.value, dropi: root._qk.dropi.value, price: root._qk.price.value });

  // Vacía nombre, ID y precio, y deja el cursor en Nombre para el siguiente.
  function reset(root) {
    const k = root._qk; k.name.value = ''; k.dropi.value = ''; k.price.value = ''; k.name.focus();
  }

  const focus = (root) => root._qk.name.focus();

  PYL.ui.quick = { build, render, read, reset, focus };
})();
