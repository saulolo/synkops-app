// Tooltip flotante único (#tip): versión compacta para cifras y versión ancha con explicación.
(() => {
  const PYL = globalThis.PYL;
  const { $, el } = PYL.ui.dom;

  // Centrado sobre el cursor y sin salirse del ancho de la ventana.
  function place(t, ev) {
    const tw = t.offsetWidth, th = t.offsetHeight;
    t.style.left = Math.min(Math.max(8, ev.pageX - tw / 2), document.documentElement.clientWidth - tw - 8) + 'px';
    // Arriba del cursor; si no cabe (aviso alto), abajo.
    const up = ev.pageY - th - 14;
    t.style.top = (up < window.scrollY + 8 ? ev.pageY + 18 : up) + 'px';
  }

  // lines: [título, valor, detalle]; las vacías se omiten.
  function show(ev, lines) {
    const t = $('#tip'); t.textContent = ''; t.className = 'tip';
    lines.filter(Boolean).forEach((l, i) => t.appendChild(el('div', i === 1 ? '' : 't', l)));
    t.style.display = 'block';
    place(t, ev);
  }

  // tip: { h, p?, li?, table?, cls? } con li: [antes, palabra resaltada, clase, después] y
  // table: { head: [col1, col2], rows: [{ k, cells: [[viñetas…], [viñetas…]] }], on: k } (cada celda es una lista de viñetas; on = fila resaltada).
  // Solo se reconstruye al cambiar de concepto, para no reiniciar la animación con cada movimiento.
  function showInfo(ev, tip) {
    const t = $('#tip');
    const key = tip.h + '|' + (tip.p || '') + '|' + JSON.stringify(tip.li || '') + '|' + (tip.table ? tip.table.on : ''); // avisos con el mismo título pero distinto contenido
    if (t.dataset.k !== key || t.style.display !== 'block') {
      t.textContent = ''; t.className = 'tip wide' + (tip.table ? ' tbl' : '') + (tip.cls ? ' ' + tip.cls : ''); // cls: estilo propio de un módulo t.dataset.k = key;
      if (!tip.table) t.append(el('div', 'h', tip.h)); // el aviso con tabla va sin título
      if (tip.p) t.append(el('p', null, tip.p));
      if (tip.li) {
        const ul = el('ul');
        tip.li.forEach(([pre, word, cls, post]) => { const l = el('li', null, pre); l.append(el('b', cls, word), post); ul.appendChild(l); });
        t.appendChild(ul);
      }
      if (tip.table) t.appendChild(tableNode(tip.table));
      t.style.display = 'block';
    }
    place(t, ev);
  }

  // Tabla de un aviso: encabezado y una fila por métrica; las celdas son listas de viñetas (string o { b }).
  function tableNode(tb) {
    const table = el('table'), thead = el('thead'), hr = el('tr');
    tb.head.forEach((h) => hr.appendChild(el('th', null, h)));
    thead.appendChild(hr); table.appendChild(thead);
    const tbody = el('tbody');
    tb.rows.forEach((r) => {
      const tr = el('tr', r.k === tb.on ? 'on' : null);
      r.cells.forEach((items) => {
        const td = el('td'), ul = el('ul');
        items.forEach((seg) => { const li = el('li'); PYL.ui.dom.rich(li, Array.isArray(seg) ? seg : [seg]); ul.appendChild(li); });
        td.appendChild(ul); tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    return table;
  }

  function hide() { $('#tip').style.display = 'none'; }

  // Conecta un nodo .info a su explicación: tooltip al pasar el mouse o al enfocarlo con el teclado.
  function attach(node, name, tip) {
    node.tabIndex = 0;
    node.setAttribute('aria-label', tip.p ? `${name}. ${tip.p}` : name);
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
