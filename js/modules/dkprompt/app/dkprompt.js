// Prompt DropKiller (Buscar producto): estado (app.state.dkprompt) y conexión con la UI.
// No guarda nada entre sesiones: al recargar el formulario vuelve vacío. Solo usa shared/.
(() => {
  const PYL = globalThis.PYL;
  const { $, copy } = PYL.ui.dom;
  const C = PYL.core.dkprompt, U = PYL.ui.dkprompt, toast = PYL.ui.feedback.toast;

  const root = $('#dk-root');

  const S = (PYL.app.state.dkprompt = {
    open: false,                                                           // panel abierto
    form: { recDias: C.DK_DEFAULTS.recDias, meses: C.DK_DEFAULTS.meses },  // textos del formulario + ventana + meses
    last: '',                                                              // prompt generado (vacío hasta tocar «Generar prompt»)
  });
  let errors = {};

  const render = () => U.render(root, { open: S.open, last: S.last, errors, recDias: S.form.recDias, meses: S.form.meses, ph: C.dkPlaceholders(S.form.recDias) });

  // Lee el formulario y marca los campos inválidos; el prompt no cambia hasta tocar «Generar prompt».
  function change() {
    S.form = U.read(root);
    errors = C.dkValues(S.form).errors;
    render();
  }

  // Arma el prompt con el formulario; si algo es inválido deja el anterior y avisa.
  function generate() {
    change();
    const r = C.dkValues(S.form);
    if (!r.ok) { toast('Corrige los campos marcados en rojo.', 'error'); return; }
    S.last = C.dkPrompt(r.values);
    render();
  }

  const setOpen = (open) => {
    S.open = open;
    if (!open) S.last = ''; // al cerrar, el cuadro del prompt queda limpio
    render();
    if (open) { document.dispatchEvent(new CustomEvent('flotante:abierto', { detail: { id: 'dk' } })); U.focus(root); }
  };

  async function copyPrompt() {
    if (!S.last) { toast('Primero toca «Generar prompt».', 'error'); return; }
    if (await copy(S.last)) toast('Prompt copiado. Pégalo en Claude.', 'ok');
    else toast('No pude copiar. Selecciona el texto y usa Ctrl+C.', 'error');
  }

  U.build(root, { toggle: () => setOpen(!S.open), close: () => setOpen(false), change, generate, copy: copyPrompt });
  change();

  // Abrir otro botón flotante cierra este panel.
  document.addEventListener('flotante:abierto', (e) => { if (e.detail && e.detail.id !== 'dk' && S.open) setOpen(false); });

  // Esc cierra el panel (salvo que haya un diálogo abierto encima).
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && S.open && !$('#modal').classList.contains('show')) setOpen(false);
  });
})();
