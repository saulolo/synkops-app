// Logística (SPEC 13): pintado de las sub-pestañas y de una tarjeta por plantilla (formulario, mensaje y botones).
// Recibe datos y callbacks; no toca el estado de la app.
(() => {
  const PYL = globalThis.PYL;
  const { el } = PYL.ui.dom;

  // Sub-pestañas: un botón por parte, la abierta con aria-pressed; una parte `disabled` se ve apagada y no se abre.
  function parts(node, list, current, onPick) {
    node.textContent = '';
    for (const p of list) {
      const b = el('button', null, p.label);
      b.type = 'button';
      if (p.disabled) { b.disabled = true; b.title = 'Pronto'; }
      b.dataset.part = p.k;
      b.setAttribute('aria-pressed', String(p.k === current));
      b.addEventListener('click', () => onPick(p.k));
      node.append(b);
    }
  }

  // Íconos dibujados a mano, de dos tonos: trazo + relleno suave (currentColor, así toman el color del botón en cualquier tema).
  // Las clases marcan las partes que se animan al pasar el mouse (ver logistics.css): lg-i-fill = relleno suave,
  // lg-i-a / lg-i-b = partes que se mueven, lg-i-d = destellos que aparecen.
  const svg = (body) => '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  const ICONS = {
    // Bandeja con una flecha que baja: traer datos.
    import: svg('<path class="lg-i-fill" d="M3.8 14.6l1.5 4.1a2 2 0 0 0 1.9 1.3h9.6a2 2 0 0 0 1.9-1.3l1.5-4.1h-4.7l-1 1.7h-5.9l-1-1.7z"/><g class="lg-i-a"><path d="M12 3.4v9.2"/><path d="M8.1 9l3.9 3.9L15.9 9"/></g>'),
    // Escoba que barre: limpiar. Al pasar el mouse se mueve de lado a lado y suelta polvo.
    clear: svg('<g class="lg-i-a lg-i-sweep"><path d="M20 3.8l-7.6 7.6"/><path class="lg-i-fill" d="M9.6 9.6l4.8 4.8c-1.9 2.2-4.8 4.3-9.9 4.6.4-5.2 2.6-8 5.1-9.4z"/><path d="M7.2 14.4l2.3 2.3M10 12.2l2.2 2.2"/></g><circle class="lg-i-d" cx="19.6" cy="17.6" r=".9" fill="currentColor"/><circle class="lg-i-d lg-i-d2" cx="16.6" cy="20.2" r=".7" fill="currentColor"/>'),
    // Dos hojas: copiar. Al pasar el mouse se separan.
    copy: svg('<g class="lg-i-b"><path d="M5.4 15.4A2.4 2.4 0 0 1 4 13.2V6.6A2.6 2.6 0 0 1 6.6 4h6.6a2.4 2.4 0 0 1 2.1 1.3"/></g><g class="lg-i-a"><rect class="lg-i-fill" x="9" y="9" width="11" height="11.5" rx="2.6"/><path d="M12.1 14.1h5.1M12.1 17.1h3.1"/></g>'),
    // Varita con chispas: generar. Al pasar el mouse las chispas brillan.
    gen: svg('<path class="lg-i-fill lg-i-a" d="M10 4.2l1.7 4.6 4.6 1.7-4.6 1.7L10 16.8l-1.7-4.6L3.7 10.5l4.6-1.7z"/><path class="lg-i-b" d="M18.2 14.4l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8z"/><path class="lg-i-d" d="M18.6 3.2v3.2M17 4.8h3.2"/>'),
  };

  // Pone el ícono al inicio de cada botón con data-ic. Idempotente.
  function icons(root) {
    for (const b of root.querySelectorAll('[data-ic]')) {
      if (b.querySelector('.lg-ic')) continue;
      const s = el('span', 'lg-ic');
      s.innerHTML = ICONS[b.dataset.ic] || '';
      b.prepend(s);
    }
  }

  // Una tarjeta por plantilla: título con el botón «Traer de Desarrollo», un campo por `field`, el mensaje y los botones.
  // Los ids llevan la clave de la plantilla (#lg-<k>-f-<campo>, #lg-<k>-err-<campo>, #lg-<k>-out, #lg-<k>-gen…) para que
  // dos tarjetas no repitan ids. values = textos actuales del formulario.
  // on = { change(k, text), blur(k), importar(), generate(), copy(), clear() }.
  function card(tpl, values, on) {
    const id = (s) => 'lg-' + tpl.k + '-' + s;
    const c = el('section', 'card lg-card');
    c.id = 'lg-card-' + tpl.k;
    c.dataset.tpl = tpl.k;

    const head = el('div', 'lg-head');
    const imp = el('button', 'btn ghost sm lg-import'); imp.type = 'button'; imp.id = id('import'); imp.dataset.ic = 'import';
    imp.title = 'Traer de Desarrollo: pone el producto de «Producto que estoy montando»'; imp.setAttribute('aria-label', 'Traer de Desarrollo');
    imp.addEventListener('click', on.importar);
    head.append(el('h2', null, tpl.title), imp);

    const form = el('div', 'lg-form'); form.id = id('form');
    for (const f of tpl.fields) {
      const cell = el('div', 'lg-cell');
      const lab = el('label', 'lg-lab', f.label); lab.htmlFor = id('f-' + f.k);
      const x = el('input'); x.type = 'text'; x.id = id('f-' + f.k); x.dataset.k = f.k; x.autocomplete = 'off'; x.placeholder = f.ph || '';
      if (f.type === 'money') x.inputMode = 'numeric';
      x.value = values[f.k] || '';
      x.addEventListener('input', () => on.change(f.k, x.value));
      x.addEventListener('blur', () => on.blur(f.k));
      const err = el('small', 'lg-err'); err.id = id('err-' + f.k); err.dataset.err = f.k; err.setAttribute('role', 'alert');
      cell.append(lab, x, err);
      form.append(cell);
    }

    const out = el('div', 'lg-out');
    const lab = el('label', null, 'Mensaje'); lab.htmlFor = id('out');
    const ta = el('textarea'); ta.id = id('out'); ta.readOnly = true; ta.rows = 14;
    ta.placeholder = 'Toca «Generar mensaje» para armarlo con estos datos.';
    const acts = el('div', 'lg-acts');
    const btn = (cls, k, text, fn, title) => {
      const b = el('button', 'btn sm ' + cls, text); b.type = 'button'; b.id = id(k); b.dataset.ic = k;
      if (title) b.title = title;
      b.addEventListener('click', fn);
      return b;
    };
    acts.append(
      btn('ghost lg-clear', 'clear', 'Limpiar', on.clear, 'Vacía los datos de este pedido y el mensaje; deja el producto'),
      btn('ghost lg-copy', 'copy', 'Copiar mensaje', on.copy),
      btn('lg-gen', 'gen', 'Generar mensaje', on.generate));
    out.append(lab, ta, acts);

    c.append(head, el('p', 'muted b-sub', 'Armo el mensaje con los datos del pedido y lo copio para pegarlo en WhatsApp.'), form, out);
    icons(c);
    return c;
  }

  // Escribe un valor en su campo (al prellenar, importar o dar formato).
  function setField(node, k, text) {
    const x = node.querySelector('input[data-k="' + k + '"]');
    if (x) x.value = text;
  }

  // Marca los campos con error ({ campo: mensaje }) y limpia el resto.
  function errors(node, errs) {
    for (const x of node.querySelectorAll('input[data-k]')) {
      const bad = !!errs[x.dataset.k];
      x.classList.toggle('lg-bad', bad);
      if (bad) x.setAttribute('aria-invalid', 'true'); else x.removeAttribute('aria-invalid');
    }
    for (const e of node.querySelectorAll('[data-err]')) e.textContent = errs[e.dataset.err] || '';
  }

  // Muestra el mensaje generado ('' = vacío) en el cuadro de solo lectura de la tarjeta.
  function message(node, text) { node.querySelector('textarea').value = text; }

  PYL.ui.logistics = { parts, card, setField, errors, message, icons };
})();
