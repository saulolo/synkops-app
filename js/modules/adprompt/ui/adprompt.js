// Prompt buscar anuncios (pestaña Desarrollo): botón flotante verde y panel con el formulario y el prompt armado.
// Recibe datos y callbacks; no guarda estado. on = { toggle(), close(), change(), importar(), photo(file), photoClear(), clear(), generate(), copy() }.
// Reutiliza los estilos del panel de Prompt DropKiller (.dk-*) y el cuadro de imagen del guardado rápido (.qk-photo*).
(() => {
  const PYL = globalThis.PYL;
  const { el } = PYL.ui.dom;

  // Megáfono (anuncio) con una lupa (buscar). currentColor = blanco sobre el verde del botón.
  const ICON_AP = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 9.5v3l3 .7 8.5 3.8V5L5.5 8.8z"/><path d="M6 13.5l1 4.5h2.5l-.8-3.4"/><circle cx="18.5" cy="16.5" r="2.6"/><path d="M20.4 18.4l1.9 1.9"/><path d="M17 6.5l1.8-1.3M17.5 10h2.3"/></svg>';

  const ID = { name: 'name', dias: 'days', visto: 'seen', pais: 'country' };
  const LABEL = { name: 'Nombre del producto', dias: 'Días activos', visto: 'Última vez visto', pais: 'País a excluir' };

  function field(inputs, errs, key, on, opt) {
    const o = opt || {};
    const c = el('div', 'dk-cell' + (o.wide ? ' dk-wide' : ''));
    const head = el('div', 'dk-cell-head');
    const lab = el('label', 'dk-lab', LABEL[key]); lab.htmlFor = 'ap-f-' + ID[key];
    head.append(lab);
    if (o.side) head.append(o.side);
    const x = el('input'); x.type = 'text'; x.id = 'ap-f-' + ID[key]; x.autocomplete = 'off';
    if (o.numeric) x.inputMode = 'numeric';
    x.addEventListener('input', on.change);
    inputs[key] = x;
    c.append(head, x);
    if (o.err) { const e = el('small', 'dk-err'); e.id = 'ap-err-' + ID[key]; e.setAttribute('role', 'alert'); c.append(e); errs[key] = e; }
    return c;
  }

  // Crea el botón flotante y el panel dentro de root (una sola vez).
  function build(root, on) {
    root.textContent = '';
    const inputs = {}, errs = {};
    const TITLE = 'Prompt buscar anuncios';

    const btn = el('button', 'dk-btn ap-btn'); btn.type = 'button'; btn.id = 'ap-btn';
    btn.title = TITLE; btn.setAttribute('aria-label', TITLE);
    btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'ap-panel');
    btn.innerHTML = ICON_AP;
    btn.addEventListener('click', on.toggle);

    const panel = el('div', 'dk-panel ap-panel'); panel.id = 'ap-panel'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', TITLE);

    const head = el('div', 'dk-head');
    const title = el('div', 'dk-title'); title.append(el('b', null, TITLE), el('small', null, 'Armo el prompt, lo copio y lo pego en Claude con la imagen'));
    const x = el('button', 'dk-x', '✕'); x.type = 'button'; x.id = 'ap-x'; x.title = 'Cerrar'; x.setAttribute('aria-label', 'Cerrar');
    x.addEventListener('click', on.close);
    head.append(title, x);

    const imp = el('button', 'btn ghost sm ap-import', '📥 Importar'); imp.type = 'button'; imp.id = 'ap-import';
    imp.title = 'Trae el nombre y la imagen del producto abierto en Mi candidato (Buscar producto)';
    imp.addEventListener('click', on.importar);

    const form = el('div', 'dk-form');

    // Imagen: solo recordatorio de la que se adjunta en Claude (el prompt es texto). Se importa, se pega con Ctrl+V o se elige.
    const cPhoto = el('div', 'dk-cell ap-photo-cell');
    const pHead = el('div', 'dk-cell-head'); pHead.append(el('span', 'dk-lab', 'Imagen'));
    const wrap = el('div', 'qk-photo-wrap ap-photo-wrap');
    const photo = el('label', 'qk-photo'); photo.id = 'ap-photo';
    photo.title = 'Pego la imagen con Ctrl+V o toco para elegir un archivo. Es la que adjunto en Claude junto al prompt.';
    const file = el('input'); file.type = 'file'; file.accept = 'image/*'; file.hidden = true;
    const img = el('img', 'qk-photo-img'); img.alt = ''; img.hidden = true;
    const empty = el('span', 'qk-photo-empty'); empty.append(el('b', null, '🖼'), el('small', null, 'Ctrl+V'));
    photo.append(file, img, empty);
    file.addEventListener('change', () => { if (file.files[0]) on.photo(file.files[0]); file.value = ''; });
    const rm = el('button', 'qk-photo-rm', '✕'); rm.type = 'button'; rm.hidden = true;
    rm.title = 'Quitar imagen'; rm.setAttribute('aria-label', 'Quitar imagen');
    rm.addEventListener('click', on.photoClear);
    wrap.append(photo, rm);
    cPhoto.append(pHead, wrap);

    const top = el('div', 'ap-top dk-wide');
    top.append(field(inputs, errs, 'name', on, { err: true }), cPhoto);
    form.append(top,
      field(inputs, errs, 'dias', on, { numeric: true, err: true }),
      field(inputs, errs, 'visto', on, { numeric: true, err: true }),
      field(inputs, errs, 'pais', on, { wide: true }));

    // Pegar una imagen con el panel abierto, sin importar dónde esté el foco. El texto pegado sigue su curso.
    document.addEventListener('paste', (e) => {
      if (panel.hidden || !e.clipboardData) return;
      const cd = e.clipboardData;
      const viaItems = [...(cd.items || [])].filter((i) => i.kind === 'file' && i.type.startsWith('image/')).map((i) => i.getAsFile());
      const image = [...(cd.files || []), ...viaItems].find((f) => f && f.type.startsWith('image/'));
      if (!image) return;
      e.preventDefault();
      on.photo(image);
    });

    const out = el('div', 'dk-out');
    const lab = el('label', null, 'Prompt'); lab.htmlFor = 'ap-prompt';
    const ta = el('textarea'); ta.id = 'ap-prompt'; ta.readOnly = true; ta.rows = 5;
    ta.placeholder = 'Toca «Generar prompt» para armarlo con estos datos.';
    const gen = el('button', 'btn sm ap-gen', '✨ Generar prompt'); gen.type = 'button'; gen.id = 'ap-gen';
    gen.addEventListener('click', on.generate);
    const copy = el('button', 'btn ghost sm', '📋 Copiar prompt'); copy.type = 'button'; copy.id = 'ap-copy';
    copy.addEventListener('click', on.copy);
    const clear = el('button', 'btn ghost sm', '🧹 Limpiar'); clear.type = 'button'; clear.id = 'ap-clear';
    clear.title = 'Deja el formulario, la imagen y el prompt en blanco';
    clear.addEventListener('click', on.clear);
    // Arriba, sobre el primer campo: Importar | Copiar. Abajo, tras el prompt: Limpiar | Generar.
    const topActs = el('div', 'dk-acts ap-acts'); topActs.append(imp, copy);
    const acts = el('div', 'dk-acts ap-acts'); acts.append(clear, gen);
    out.append(lab, ta, acts);

    panel.append(head, topActs, form, out);
    root.append(panel, btn);
    root._ap = { btn, panel, inputs, errs, ta, img, empty, rm };
  }

  // v = { open, last, errors, ph, photo }: repinta abierto/cerrado, placeholders, marcas de error, imagen y prompt.
  // No toca lo escrito en los campos.
  function render(root, v) {
    const k = root._ap;
    k.btn.setAttribute('aria-expanded', String(!!v.open));
    k.btn.classList.toggle('on', !!v.open);
    k.panel.hidden = !v.open;
    for (const [key, input] of Object.entries(k.inputs)) {
      input.placeholder = v.ph[key];
      const bad = !!v.errors[key];
      input.classList.toggle('dk-bad', bad);
      if (bad) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
      if (k.errs[key]) k.errs[key].textContent = v.errors[key] || '';
    }
    if (v.photo) k.img.src = v.photo; else k.img.removeAttribute('src');
    k.img.hidden = !v.photo; k.empty.hidden = !!v.photo; k.rm.hidden = !v.photo;
    k.ta.value = v.last;
  }

  // Textos escritos en el formulario.
  function read(root) {
    const f = {};
    for (const [key, input] of Object.entries(root._ap.inputs)) f[key] = input.value;
    return f;
  }

  // Escribe valores en los campos (al importar): solo las claves que vengan.
  function fill(root, vals) {
    for (const [key, v] of Object.entries(vals)) if (root._ap.inputs[key]) root._ap.inputs[key].value = v;
  }

  // Vacía todos los campos (botón «Limpiar»).
  function reset(root) {
    for (const input of Object.values(root._ap.inputs)) input.value = '';
  }

  const focus = (root) => root._ap.inputs.name.focus();

  PYL.ui.adprompt = { build, render, read, fill, reset, focus };
})();
