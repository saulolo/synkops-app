// Mensajes al usuario: toast temporal y diálogo modal con botones.
(() => {
  const PYL = globalThis.PYL;
  const { $, el } = PYL.ui.dom;

  let toastT;
  function toast(msg, kind) {
    const t = $('#toast');
    t.textContent = msg; t.className = 'toast show ' + (kind || '');
    clearTimeout(toastT); toastT = setTimeout(() => (t.className = 'toast'), 5000);
  }

  // Diálogo con botones [{r, label, cls}]; resuelve con el r elegido o 'cancel'.
  // El clic en el botón cuenta como gesto del usuario, necesario para abrir los selectores de archivo.
  function ask(title, text, buttons) {
    return new Promise((res) => {
      const m = $('#modal');
      $('#modal-h').textContent = title;
      $('#modal-p').textContent = text;
      const box = $('#modal-actions'); box.textContent = '';
      [{ r: 'cancel', label: 'Cancelar', cls: 'ghost' }, ...buttons].forEach((b) => {
        const btn = el('button', 'btn ' + (b.cls || ''), b.label);
        btn.type = 'button'; btn.dataset.r = b.r;
        box.appendChild(btn);
      });
      m.classList.add('show');
      const on = (e) => {
        const r = e.target.closest('[data-r]');
        if (!r && e.target !== m) return;
        m.classList.remove('show'); m.removeEventListener('click', on);
        res(r ? r.dataset.r : 'cancel');
      };
      m.addEventListener('click', on);
    });
  }

  PYL.ui.feedback = { toast, ask };
})();
