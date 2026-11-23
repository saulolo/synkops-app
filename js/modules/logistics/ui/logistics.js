// Logística (SPEC 13): pintado de las sub-pestañas y de una tarjeta por plantilla (formulario, mensaje y botones).
// Recibe datos y callbacks; no toca el estado de la app.
(() => {
  const PYL = globalThis.PYL;
  const { el } = PYL.ui.dom;

  // Sub-pestañas: un botón por parte, la abierta con aria-pressed; una parte `disabled` se ve apagada y no se abre.
  function parts(node, list, current, onPick) {
    node.textContent = '';
    for (const p of list) {
      const b = el('button');
      if (p.icon) b.append(PYL.ui.icons.el(p.icon, 15)); // ícono del set propio (SPEC 24)
      b.append(p.label);
      b.type = 'button';
      if (p.disabled) { b.disabled = true; b.title = 'Pronto'; }
      b.dataset.part = p.k;
      b.setAttribute('aria-pressed', String(p.k === current));
      b.addEventListener('click', () => onPick(p.k));
      node.append(b);
    }
  }

  // Íconos de dos tonos del set propio (SPEC 24, js/shared/ui/icons.js); su animación al pasar el mouse vive en base.css.
  const ICON_OF = { import: 'download', clear: 'broom', copy: 'copy', gen: 'sparkles' };
  const withIcon = (b, k) => { b.prepend(PYL.ui.icons.el(ICON_OF[k], 18, 'ic-solo')); return b; }; // .btn ya pone gap

  // Abre o contrae una tarjeta (solo pinta; el estado lo lleva app).
  function open(node, isOpen) {
    node.classList.toggle('open', !!isOpen);
    node.querySelector('.lg-toggle').setAttribute('aria-expanded', String(!!isOpen));
    node.querySelector('.lg-body').hidden = !isOpen;
  }

  // Una tarjeta por plantilla: título con el botón «Traer de Desarrollo» (o «de Mi candidato»), un campo por `field`, el mensaje y los botones.
  // Los ids llevan la clave de la plantilla (#lg-<k>-f-<campo>, #lg-<k>-err-<campo>, #lg-<k>-out, #lg-<k>-gen…) para que
  // dos tarjetas no repitan ids. values = textos actuales del formulario.
  // on = { toggle(), change(k, text), blur(k), importar(), generate(), copy(), clear() }. Nace contraída (ver `open`).
  function card(tpl, values, on) {
    const id = (s) => 'lg-' + tpl.k + '-' + s;
    const c = el('section', 'card lg-card');
    c.id = 'lg-card-' + tpl.k;
    c.dataset.tpl = tpl.k;

    // El nombre es el botón que abre y cierra la tarjeta; el resto (subtítulo, formulario y mensaje) va en el cuerpo.
    const head = el('div', 'lg-head');
    if (tpl.stage) { const st = el('span', 'lg-stage', PYL.core.logistics.LG_STAGES[tpl.stage] || tpl.stage); st.dataset.stage = tpl.stage; head.append(st); } // chip de etapa sobre el nombre
    const h = el('h2');
    const tg = el('button', 'lg-toggle'); tg.type = 'button'; tg.id = id('toggle');
    tg.setAttribute('aria-expanded', 'false'); tg.setAttribute('aria-controls', id('body'));
    const chev = el('span', 'lg-chev'); chev.innerHTML = PYL.ui.icons.svg('chevron-down', 16);
    tg.append(el('span', 'lg-name', tpl.title), chev);
    tg.addEventListener('click', on.toggle);
    h.append(tg);
    head.append(h);
    if (tpl.fields.some((f) => f.from)) { // «Traer de Desarrollo» (o «de Mi candidato» si `src: 'cand'`) solo si la plantilla trae algo de ahí; va dentro del título para pegarse a la flecha
      const imp = el('button', 'btn ghost sm lg-import'); imp.type = 'button'; imp.id = id('import'); withIcon(imp, 'import');
      const cand = tpl.src === 'cand';
      imp.title = cand ? 'Traer de Mi candidato: pone el proveedor (si hay uno solo), el producto y el ID Dropi de Mi candidato' : 'Traer de Desarrollo: pone el producto de «Producto que estoy montando»';
      imp.setAttribute('aria-label', cand ? 'Traer de Mi candidato' : 'Traer de Desarrollo');
      imp.addEventListener('click', on.importar);
      h.append(imp);
    }

    const form = el('div', 'lg-form'); form.id = id('form');
    for (const f of tpl.fields) {
      if (f.type === 'check') { // casilla: una sola línea, sin etiqueta aparte ni aviso
        const lab = el('label', 'lg-check');
        const x = el('input'); x.type = 'checkbox'; x.id = id('f-' + f.k); x.dataset.k = f.k; x.checked = !!values[f.k];
        x.addEventListener('change', () => on.change(f.k, x.checked));
        lab.append(x, el('span', null, f.label));
        form.append(lab);
        continue;
      }
      const cell = el('div', 'lg-cell');
      if (f.when) { cell.dataset.when = f.when; cell.hidden = !values[f.when]; } // campo condicional: solo se ve con su casilla marcada
      const lab = el('label', 'lg-lab', f.label); lab.htmlFor = id('f-' + f.k);
      const x = el('input'); x.type = 'text'; x.id = id('f-' + f.k); x.dataset.k = f.k; x.autocomplete = 'off'; x.placeholder = f.ph || '';
      if (f.type === 'money' || f.type === 'phone') x.inputMode = f.type === 'phone' ? 'tel' : 'numeric';
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
      const b = el('button', 'btn sm ' + cls, text); b.type = 'button'; b.id = id(k); withIcon(b, k);
      if (title) b.title = title;
      b.addEventListener('click', fn);
      return b;
    };
    // «Generar mensaje» arriba (a todo el ancho, destacado); «Limpiar» y «Copiar» debajo, en una fila.
    acts.append(
      btn('lg-gen', 'gen', 'Generar mensaje', on.generate),
      btn('ghost lg-clear', 'clear', 'Limpiar', on.clear, 'Vacía los datos de este pedido y el mensaje; deja el producto'),
      btn('ghost lg-copy', 'copy', 'Copiar mensaje', on.copy));
    out.append(lab, ta, acts);

    const body = el('div', 'lg-body'); body.id = id('body'); body.hidden = true;
    body.append(el('p', 'muted b-sub', tpl.sub || 'Armo el mensaje con los datos del pedido y lo copio para pegarlo en WhatsApp.'), form, out);
    c.append(head, body);
    return c;
  }

  // Salto de línea entre filas de tarjetas.
  function rowBreak() { return el('div', 'lg-break'); }

  // Pone `node` justo debajo de `above`, en su misma columna (la crea la primera vez, en el lugar de `above`).
  function stack(above, node) {
    let col = above.parentElement;
    if (!col.classList.contains('lg-col')) {
      col = el('div', 'lg-col');
      above.replaceWith(col);
      col.append(above);
    }
    col.append(node);
  }

  // Escribe un valor en su campo (al prellenar, importar o dar formato).
  function setField(node, k, text) {
    const x = node.querySelector('input[data-k="' + k + '"]');
    if (!x) return;
    if (x.type === 'checkbox') x.checked = !!text; else x.value = text;
  }

  // Muestra u oculta los campos condicionales (`when`) según su casilla; lo escrito en ellos no se toca.
  function showWhen(node, form) {
    for (const c of node.querySelectorAll('[data-when]')) c.hidden = !form[c.dataset.when];
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

  PYL.ui.logistics = { parts, card, open, stack, rowBreak, setField, showWhen, errors, message };
})();
