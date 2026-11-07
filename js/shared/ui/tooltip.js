// Tooltip flotante único (#tip): versión compacta para cifras y versión ancha con explicación.
(() => {
  const PYL = globalThis.PYL;
  const { $, el } = PYL.ui.dom;

  // Centrado sobre el cursor y sin salirse del ancho de la ventana.
  function place(t, ev) {
    const tw = t.offsetWidth, th = t.offsetHeight;
    t.style.left = Math.min(Math.max(8, ev.pageX - tw / 2), document.documentElement.clientWidth - tw - 8) + 'px';
    t.style.top = ev.pageY - th - 14 + 'px';
  }

  // lines: [título, valor, detalle]; las vacías se omiten.
  function show(ev, lines) {
    const t = $('#tip'); t.textContent = ''; t.className = 'tip';
    lines.filter(Boolean).forEach((l, i) => t.appendChild(el('div', i === 1 ? '' : 't', l)));
    t.style.display = 'block';
    place(t, ev);
  }

  // tip: { h, p, li? } con li: [antes, palabra resaltada, clase, después].
  // Solo se reconstruye al cambiar de concepto, para no reiniciar la animación con cada movimiento.
  function showInfo(ev, tip) {
    const t = $('#tip');
    if (t.dataset.k !== tip.h || t.style.display !== 'block') {
      t.textContent = ''; t.className = 'tip wide'; t.dataset.k = tip.h;
      t.append(el('div', 'h', tip.h), el('p', null, tip.p));
      if (tip.li) {
        const ul = el('ul');
        tip.li.forEach(([pre, word, cls, post]) => { const l = el('li', null, pre); l.append(el('b', cls, word), post); ul.appendChild(l); });
        t.appendChild(ul);
      }
      t.style.display = 'block';
    }
    place(t, ev);
  }

  function hide() { $('#tip').style.display = 'none'; }

  // Conecta un nodo .info a su explicación: tooltip al pasar el mouse o al enfocarlo con el teclado.
  function attach(node, name, tip) {
    node.tabIndex = 0;
    node.setAttribute('aria-label', `${name}. ${tip.p}`);
    node.addEventListener('mousemove', (ev) => showInfo(ev, tip));
    node.addEventListener('mouseleave', hide);
    node.addEventListener('blur', hide);
    node.addEventListener('focus', () => { const r = node.getBoundingClientRect(); showInfo({ pageX: r.left + window.scrollX + r.width / 2, pageY: r.top + window.scrollY }, tip); });
  }

  // Nombre del concepto con ícono "i" y su tooltip.
  function infoLabel(name, tip) {
    const lab = el('span', 'info', name);
    lab.appendChild(el('span', 'i', 'i'));
    attach(lab, name, tip);
    return lab;
  }

  PYL.ui.tooltip = { show, showInfo, hide, attach, infoLabel };
})();
