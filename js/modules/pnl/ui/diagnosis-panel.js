// Paneles desplegables de diagnóstico (embudo y cascada): tabla con semáforo y conclusión.
(() => {
  const PYL = globalThis.PYL;
  const { $, el, rich } = PYL.ui.dom;

  // diag: { rows, conclusion } de PYL.core.diagnostics.
  function render(tableSel, conclSel, diag) {
    const tb = $(tableSel + ' tbody'); tb.textContent = '';
    diag.rows.forEach((r) => {
      const tr = el('tr');
      const c1 = el('td', null, r.name); c1.appendChild(el('small', null, r.desc));
      const c2 = el('td'); c2.append(el('span', 'dot ' + r.level), r.value);
      tr.append(c1, c2, el('td', 'muted', r.bench), el('td', 'dx', r.text));
      tb.appendChild(tr);
    });
    rich($(conclSel), diag.conclusion);
  }

  // Cada .diag-btn abre o cierra el panel que indica su aria-controls.
  function bindToggles() {
    document.querySelectorAll('.diag-btn').forEach((btn) => btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      document.getElementById(btn.getAttribute('aria-controls')).classList.toggle('open', open);
    }));
  }

  PYL.ui.diagnosisPanel = { render, bindToggles };
})();
