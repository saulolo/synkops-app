// Botones de periodos rápidos bajo los filtros. El activo coincide con producto y fechas del filtro.
(() => {
  const PYL = globalThis.PYL;
  const { $, el } = PYL.ui.dom;

  // list: [{ label, prod, from, to }]; f: filtro actual; onPick(preset).
  function draw(list, f, onPick) {
    const box = $('#presets'); box.textContent = '';
    list.forEach((p) => {
      const b = el('button', p.prod === f.prod && p.from === f.from && p.to === f.to ? 'on' : '', p.label);
      b.type = 'button';
      b.addEventListener('click', () => onPick(p));
      box.appendChild(b);
    });
  }

  PYL.ui.presets = { draw };
})();
