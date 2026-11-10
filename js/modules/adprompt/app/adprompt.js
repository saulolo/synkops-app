// Prompt buscar anuncios (Desarrollo): estado (app.state.adprompt) y conexión con la UI.
// No guarda nada entre sesiones: al recargar el formulario vuelve vacío.
// «Importar» lee el candidato abierto en Buscar producto (app.state.search.draft).
(() => {
  const PYL = globalThis.PYL;
  const { $, copy } = PYL.ui.dom;
  const C = PYL.core.adprompt, U = PYL.ui.adprompt, toast = PYL.ui.feedback.toast;

  const root = $('#ap-root');

  const S = (PYL.app.state.adprompt = {
    open: false, // panel abierto
    form: {},    // textos del formulario
    photo: '',   // imagen de referencia (solo recordatorio: el prompt es texto)
    last: '',    // prompt generado (vacío hasta tocar «Generar prompt»)
  });
  let errors = {};   // solo se muestran los de campos ya tocados o tras «Generar prompt»
  let strict = false; // true tras «Generar prompt»: el nombre vacío ya se marca

  const render = () => U.render(root, { open: S.open, last: S.last, errors, ph: C.apPlaceholders(), photo: S.photo });

  // Lee el formulario y marca los campos inválidos; el prompt no cambia hasta tocar «Generar prompt».
  // El nombre vacío no se marca hasta intentar generar (el formulario empieza vacío).
  function change() {
    S.form = U.read(root);
    errors = C.apValues(S.form).errors;
    if (!strict) delete errors.name;
    render();
  }

  function generate() {
    strict = true;
    change();
    const r = C.apValues(S.form);
    if (!r.ok) { toast('Corrige los campos marcados en rojo.', 'error'); return; }
    S.last = C.apPrompt(r.values);
    render();
  }

  // Trae nombre e imagen de Mi candidato; los filtros escritos no se tocan.
  function importar() {
    const p = C.apImport((PYL.app.state.search || {}).draft);
    if (!p) { toast('No hay producto en Mi candidato (Buscar producto). Escribe el nombre a mano.', 'error'); return; }
    U.fill(root, { name: p.name });
    S.photo = p.photo;
    change();
    toast(`Importé "${p.name}"${p.photo ? ' con su imagen' : ' (sin imagen en Mi candidato)'}.`, 'ok');
  }

  async function photo(file) {
    try { S.photo = await PYL.services.files.imageDataURL(file); render(); }
    catch { toast('No pude leer esa imagen.', 'error'); }
  }

  // Deja todo en blanco: campos, imagen, prompt y marcas de error.
  function clear() {
    U.reset(root);
    S.photo = ''; S.last = ''; strict = false;
    change();
    U.focus(root);
  }

  const setOpen = (open) => {
    S.open = open;
    if (!open) S.last = ''; // al cerrar, el cuadro del prompt queda limpio
    render();
    if (open) { document.dispatchEvent(new CustomEvent('flotante:abierto', { detail: { id: 'ap' } })); U.focus(root); }
  };

  async function copyPrompt() {
    if (!S.last) { toast('Primero toca «Generar prompt».', 'error'); return; }
    if (await copy(S.last)) toast('Prompt copiado. Pégalo en Claude y adjunta la imagen.', 'ok');
    else toast('No pude copiar. Selecciona el texto y usa Ctrl+C.', 'error');
  }

  U.build(root, {
    toggle: () => setOpen(!S.open), close: () => setOpen(false), change, importar,
    photo, photoClear: () => { S.photo = ''; render(); }, clear, generate, copy: copyPrompt,
  });
  change();

  // Abrir otro botón flotante cierra este panel.
  document.addEventListener('flotante:abierto', (e) => { if (e.detail && e.detail.id !== 'ap' && S.open) setOpen(false); });

  // Esc cierra el panel (salvo que haya un diálogo abierto encima).
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && S.open && !$('#modal').classList.contains('show')) setOpen(false);
  });
})();
