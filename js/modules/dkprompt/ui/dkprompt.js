// Prompt DropKiller (pestaña Buscar producto): botón flotante y panel con el formulario de filtros y el prompt armado.
// Recibe datos y callbacks; no guarda estado. on = { toggle(), close(), change(), generate(), copy() }.
(() => {
  const PYL = globalThis.PYL;
  const { el } = PYL.ui.dom;

  // Logo de DropKiller (hexágono de esquinas redondeadas con dos chevrones hacia arriba), sin el cuadrado de fondo.
  // currentColor = texto sobre el acento del botón, así sigue los temas.
  const ICON_DK = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12,2.5 20.5,7.25 20.5,16.75 12,21.5 3.5,16.75 3.5,7.25"/><path d="M8.5 11.5L12 8.5l3.5 3"/><path d="M8.5 15.5l3.5-3 3.5 3"/></svg>';

  // Id de cada campo y grupo (mensaje de error) al que pertenece.
  const ID = { totMin: 'tot-min', totMax: 'tot-max', recMin: 'rec-min', recMax: 'rec-max', stockMin: 'stock-min', stockMax: 'stock-max', provMax: 'prov-max', restMin: 'rest-min', restMax: 'rest-max', categoria: 'cat' };
  const GROUP = { totMin: 'tot', totMax: 'tot', recMin: 'rec', recMax: 'rec', stockMin: 'stock', stockMax: 'stock', provMax: 'prov', restMin: 'rest', restMax: 'rest' };

  function num(inputs, key, label, on) {
    const x = el('input'); x.type = 'text'; x.id = 'dk-f-' + ID[key]; x.inputMode = 'numeric'; x.autocomplete = 'off';
    x.setAttribute('aria-label', label); x.addEventListener('input', on.change);
    inputs[key] = x;
    return x;
  }

  // Selector de dos opciones (tipo interruptor): opts = [[valor, texto, id]]; radioMap[valor] = input. cls = variante.
  function seg(name, opts, on, radioMap, cls) {
    const box = el('div', 'dk-seg' + (cls ? ' ' + cls : '')); box.setAttribute('role', 'radiogroup');
    opts.forEach(([v, text, id]) => {
      const lab = el('label', 'dk-radio');
      const r = el('input'); r.type = 'radio'; r.name = name; r.id = id; r.value = String(v); r.addEventListener('change', on.change);
      radioMap[v] = r;
      lab.append(r, el('span', null, text));
      box.append(lab);
    });
    return box;
  }

  // Una celda de la cuadrícula: etiqueta (y algo a su derecha: aviso o selector) arriba, el control debajo
  // y el mensaje de error del grupo (si lo lleva). opt = { group, side, hint, wide }.
  function cell(label, control, opt) {
    const o = opt || {};
    const c = el('div', 'dk-cell' + (o.wide ? ' dk-wide' : ''));
    const head = el('div', 'dk-cell-head');
    head.append(el('span', 'dk-lab', label));
    if (o.hint) { const h = el('small', 'dk-hint', o.hint[0]); h.title = o.hint[1]; head.append(h); }
    if (o.side) head.append(o.side);
    c.append(head, control);
    if (o.group) { const e = el('small', 'dk-err'); e.id = 'dk-err-' + o.group; e.setAttribute('role', 'alert'); c.append(e); c._err = e; }
    return c;
  }

  const pair = (inputs, lo, hi, label, on) => {
    const p = el('div', 'dk-pair');
    p.append(num(inputs, lo, label + ': mínimo', on), el('span', 'dk-sep', '–'), num(inputs, hi, label + ': máximo', on));
    return p;
  };

  // Crea el botón flotante y el panel dentro de root (una sola vez).
  function build(root, on) {
    root.textContent = '';
    const inputs = {}, recR = {}, ageR = {}, errs = {};

    const btn = el('button', 'dk-btn'); btn.type = 'button'; btn.id = 'dk-btn';
    btn.title = 'Prompt DropKiller'; btn.setAttribute('aria-label', btn.title);
    btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'dk-panel');
    btn.innerHTML = ICON_DK;
    btn.addEventListener('click', on.toggle);

    const panel = el('div', 'dk-panel'); panel.id = 'dk-panel'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Prompt DropKiller');

    const head = el('div', 'dk-head');
    const title = el('div', 'dk-title'); title.append(el('b', null, 'Prompt DropKiller'), el('small', null, 'Armo el prompt, lo copio y lo pego en Claude'));
    const x = el('button', 'dk-x', '✕'); x.type = 'button'; x.id = 'dk-x'; x.title = 'Cerrar'; x.setAttribute('aria-label', 'Cerrar');
    x.addEventListener('click', on.close);
    head.append(title, x);

    const form = el('div', 'dk-form');
    const cells = [];
    const add = (c, g) => { if (g) errs[g] = c._err; cells.push(c); };

    const tol = PYL.core.dkprompt.dkN(PYL.core.dkprompt.DK_TOT_TOLERANCE);
    const cTot = cell('Ventas totales', pair(inputs, 'totMin', 'totMax', 'Ventas totales', on),
      { group: 'tot', hint: ['Tolero hasta ' + tol, 'Tolero un máximo de ' + tol + ' ventas totales.'] });
    const prov = el('div', 'dk-pair'); prov.append(el('span', 'dk-sep', 'Máx.'), num(inputs, 'provMax', 'Proveedores: máximo', on));
    const cProv = cell('Proveedores', prov, { group: 'prov' });
    const cRec = cell('Ventas recientes', pair(inputs, 'recMin', 'recMax', 'Ventas recientes', on),
      { group: 'rec', side: seg('dk-rec', [[7, '7 días', 'dk-f-rec-7'], [30, '30 días', 'dk-f-rec-30']], on, recR, 'dk-seg-sm') });
    const cAge = cell('Fecha de creación', seg('dk-age', [[3, 'Últimos 3 meses', 'dk-f-age-3'], [6, 'Últimos 6 meses', 'dk-f-age-6']], on, ageR));
    const cStock = cell('Stock', pair(inputs, 'stockMin', 'stockMax', 'Stock', on), { group: 'stock' });
    const cRest = cell('Veces restockeado', pair(inputs, 'restMin', 'restMax', 'Veces restockeado', on), { group: 'rest' });
    const cat = el('input'); cat.type = 'text'; cat.id = 'dk-f-cat'; cat.autocomplete = 'off'; cat.setAttribute('aria-label', 'Categoría'); cat.addEventListener('input', on.change);
    inputs.categoria = cat;
    const cCat = cell('Categoría', cat, { wide: true });
    add(cTot, 'tot'); add(cProv, 'prov'); add(cRec, 'rec'); add(cAge); add(cStock, 'stock'); add(cRest, 'rest'); add(cCat);
    form.append(...cells);

    const out = el('div', 'dk-out');
    const lab = el('label', null, 'Prompt'); lab.htmlFor = 'dk-prompt';
    const ta = el('textarea'); ta.id = 'dk-prompt'; ta.readOnly = true; ta.rows = 5;
    ta.placeholder = 'Toca «Generar prompt» para armarlo con estos filtros.';
    const gen = el('button', 'btn sm dk-gen', '✨ Generar prompt'); gen.type = 'button'; gen.id = 'dk-gen';
    gen.addEventListener('click', on.generate);
    const copy = el('button', 'btn ghost sm dk-copy', '📋 Copiar prompt'); copy.type = 'button'; copy.id = 'dk-copy';
    copy.addEventListener('click', on.copy);
    const acts = el('div', 'dk-acts'); acts.append(gen, copy);
    out.append(lab, ta, acts);

    panel.append(head, form, out);
    root.append(panel, btn);
    root._dk = { btn, panel, inputs, recR, ageR, errs, ta };
  }

  // v = { open, last, errors, recDias, meses, ph }: repinta abierto/cerrado, placeholders, marcas de error y prompt.
  // No toca lo escrito en los campos.
  function render(root, v) {
    const k = root._dk;
    k.btn.setAttribute('aria-expanded', String(!!v.open));
    k.btn.classList.toggle('on', !!v.open);
    k.panel.hidden = !v.open;
    k.recR[v.recDias].checked = true; k.ageR[v.meses].checked = true;
    for (const [key, input] of Object.entries(k.inputs)) {
      input.placeholder = v.ph[key];
      const bad = !!v.errors[key];
      input.classList.toggle('dk-bad', bad);
      if (bad) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    }
    for (const [g, e] of Object.entries(k.errs)) {
      const msgs = Object.keys(v.errors).filter((key) => GROUP[key] === g).map((key) => v.errors[key]);
      e.textContent = msgs[0] || '';
    }
    k.ta.value = v.last;
  }

  // Textos escritos en el formulario + ventana y meses elegidos.
  function read(root) {
    const k = root._dk, f = {};
    for (const [key, input] of Object.entries(k.inputs)) f[key] = input.value;
    f.recDias = k.recR[30].checked ? 30 : 7;
    f.meses = k.ageR[6].checked ? 6 : 3;
    return f;
  }

  const focus = (root) => root._dk.inputs.totMin.focus();

  PYL.ui.dkprompt = { build, render, read, focus };
})();
