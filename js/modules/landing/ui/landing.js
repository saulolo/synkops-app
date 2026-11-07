// Pestaña Desarrollo: pasos para montar la landing en Shopify (lista a la izquierda, detalle del paso a la derecha),
// con casillas, prompts para copiar y herramientas (título, precios, Dropify y ofertas de Releasit).
// Recibe datos y callbacks.
// Lo que se deriva del estado se pinta en nodos [data-o] / [data-c] que `outputs` actualiza sin repintar los campos.
(() => {
  const PYL = globalThis.PYL;
  const { el, rich } = PYL.ui.dom;
  const fmt = (v) => PYL.core.format.fmt(v, 'cop');

  const seg = (tag, cls, segments) => { const n = el(tag, cls); rich(n, segments); return n; };
  const out = (k, cls) => { const s = el('span', cls || null); s.dataset.o = k; return s; };
  const counter = (k) => { const s = el('span', 'ld-count'); s.dataset.c = k; return s; };
  const button = (cls, text, onClick) => { const b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', onClick); return b; };

  // Al copiar, el mismo botón avisa: pasa a ✓ en verde un momento y vuelve (sin mensaje flotante).
  // onCopy(texto, etiqueta) devuelve true si copió; si falla, quien copia avisa con el toast de error.
  function copyFeedback(b, get, label, onCopy, doneText) {
    const idle = b.textContent;
    b.addEventListener('click', async () => {
      if (!(await onCopy(get(), label))) return;
      clearTimeout(b._t);
      b.textContent = doneText; b.classList.add('copied');
      b._t = setTimeout(() => { b.textContent = idle; b.classList.remove('copied'); }, 1400);
    });
    return b;
  }

  // Botón copiar: copia el valor crudo del nodo (precio sin puntos) o su texto.
  const copyBtn = (node, label, onCopy) =>
    copyFeedback(button('btn ghost sm ld-copy', '📋 Copiar'), () => node.dataset.raw || node.textContent, label, onCopy, '✓ Copiado');

  // Fila "etiqueta · valor · copiar".
  function valRow(label, k, onCopy, hint) {
    const r = el('div', 'ld-val'), v = out(k, 'ld-v'), tx = el('div');
    tx.append(el('small', null, label), v);
    if (hint) tx.append(el('em', null, hint));
    r.append(tx, copyBtn(v, label, onCopy));
    return r;
  }

  // Campo de texto de una herramienta: avisa cada cambio con on.field(k, valor).
  function input(k, label, value, on, opt = {}) {
    const f = el('div', 'field'), id = 'd-t-' + k;
    const top = el('div', 'row between'), lb = el('label', null, label); lb.htmlFor = id;
    top.append(lb); if (opt.count) top.append(counter(opt.count));
    const x = el(opt.area ? 'textarea' : 'input'); x.id = id; x.value = value || '';
    if (!opt.area) x.type = 'text';
    if (opt.ph) x.placeholder = opt.ph;
    if (opt.cls) x.className = opt.cls;
    x.addEventListener('input', () => on.field(k, x.value));
    f.append(top, x);
    if (opt.hint) f.append(el('span', 'hint', opt.hint));
    return f;
  }

  // ---------- Lista de pasos ----------
  function stepList(node, steps, prog, active, onSelect) {
    node.textContent = '';
    steps.forEach((s, i) => {
      const p = prog.steps[i];
      const li = el('li', 'fl-item' + (p.complete ? ' done' : '') + (i === active ? ' on' : ''));
      const b = button('fl-node', null, () => onSelect(i)); b.setAttribute('aria-pressed', String(i === active));
      b.append(el('span', 'fl-n', p.complete ? '✓' : String(i + 1)));
      const tx = el('span', 'fl-tx'); tx.append(el('b', null, s.t), el('small', null, `${p.done}/${p.total} · ${s.where}`));
      b.append(tx);
      li.append(b); node.append(li);
    });
  }

  function progress(node, prog, onReset) {
    node.textContent = '';
    const bar = el('div', 'b-bar'), fill = el('i');
    fill.style.width = (prog.total ? (prog.done / prog.total) * 100 : 0) + '%';
    bar.append(fill);
    node.append(bar, el('span', 'small', `${prog.stepsDone} de ${prog.steps.length} pasos · ${prog.done} de ${prog.total} casillas`));
    if (prog.done) {
      const r = button('btn ghost sm', 'Empezar otro producto', onReset);
      r.title = 'Desmarca todas las casillas y borra el producto';
      node.append(r);
    }
  }

  // ---------- Herramientas de cada paso ----------
  const TOOLS = {
    prep: (on) => {
      const w = el('div', 'ld-tool');
      w.append(el('h4', null, 'Lo que tengo del producto'));
      [['Nombre', 'name'], ['ID de Dropi', 'dropi'], ['Precio del proveedor', 'cost'], ['Precio de venta', 'price']].forEach(([l, k]) => {
        const r = el('div', 'ld-have'); r.dataset.have = k;
        r.append(el('i'), el('span', null, l), out(k, 'ld-v'));
        w.append(r);
      });
      w.append(button('btn ghost sm mt-s', 'Traer de mi candidato', on.pull));
      return w;
    },
    title: (on, st) => {
      const w = el('div', 'ld-tool');
      w.append(el('h4', null, 'Arma el título'));
      w.append(input('sub', 'Subtítulo que elegí (de las 5 opciones)', st.sub, on, { count: 'sub', ph: 'Ej. Más Energía y Mejor Beneficio Diario' }));
      const pv = el('div', 'ld-preview mt-s'), top = el('div', 'row between'), t = out('title', 'ld-title');
      top.append(el('small', null, 'Título del producto'), counter('titleCount'));
      pv.append(top, t);
      const r = el('div', 'row mt-s'); r.append(copyBtn(t, 'Título', on.copy)); pv.append(r);
      w.append(pv);
      return w;
    },
    prices: (on) => {
      const w = el('div', 'ld-tool');
      w.append(el('h4', null, 'Precios para Shopify'));
      w.append(seg('p', 'note ny ld-need', ['Pongo el ', { b: 'precio de venta' }, ' arriba, en "Producto que estoy montando", o lo traigo del candidato.']));
      w.append(valRow('Precio', 'price', on.copy), valRow('Precio de comparación', 'compare', on.copy, 'el doble, redondeado hacia arriba'));
      return w;
    },
    dropify: (on) => {
      const w = el('div', 'ld-tool');
      w.append(el('h4', null, 'Lo que pego en Dropify'));
      w.append(valRow('ID de Dropi', 'dropi', on.copy), valRow('Determinar precio', 'price', on.copy));
      return w;
    },
    offer: (on, st) => {
      const w = el('div', 'ld-tool');
      w.append(el('h4', null, 'Ofertas de cantidad'));
      const f = el('div', 'ld-fields');
      f.append(
        input('unit', 'Cómo llamo cada unidad', st.unit, on, { ph: 'Frascos' }),
        input('gift', 'Regalo', st.gift, on, { ph: 'Cuaderno de Enfoque' }),
        input('warranty', 'Días de garantía', st.warranty, on, { ph: '30' }),
      );
      w.append(f, seg('p', 'note ny ld-need mt-s', ['Pongo el ', { b: 'precio de venta' }, ' arriba para ver el precio de cada oferta.']));
      const list = el('div', 'ld-offers');
      PYL.core.landing.LANDING.offers.forEach((o, i) => {
        const c = el('div', 'ld-offer' + (o.preselect ? ' ld-offer-hot' : ''));
        const hd = el('div', 'row between');
        hd.append(el('span', 'tag ' + (o.preselect ? 'tg' : 'tn'), `Oferta ${i + 1} · ${o.qty} ${o.qty === 1 ? 'unidad' : 'unidades'}`));
        const pr = el('div', 'ld-offer-p ld-price'); pr.append(out('os' + i, 'ld-strike'), out('ot' + i, 'ld-big'));
        hd.append(pr);
        c.append(hd, valRow('Título', 'on' + i, on.copy));
        const fx = el('dl', 'ld-fx');
        [['Cantidad', String(o.qty)], ['Tipo de descuento', o.pct ? 'Porcentaje' : 'Sin descuento'], ['Valor del descuento', o.pct ? String(o.pct) : '—']]
          .concat(o.preselect ? [['Preseleccionar esta oferta', 'Activado']] : [])
          .forEach(([k, v]) => fx.append(el('dt', null, k), el('dd', null, v)));
        const lb = el('div', 'ld-val'), tx = el('div'), tag = out('ol' + i, 'ld-label');
        tx.append(el('small', null, 'Texto de la etiqueta'), tag);
        lb.append(tx, copyBtn(tag, 'Texto de la etiqueta', on.copy));
        c.append(fx, lb);
        list.append(c);
      });
      w.append(list);
      return w;
    },
  };

  // Tabla "campo → valor" tal como aparecen en la plataforma (s.fields: [campo, valor, valor a copiar si es otro]).
  // Copiar va en cada valor, o solo en los campos de `only` (s.copyOnly) si el resto se escribe o elige en la plataforma.
  function fieldTable(fields, onCopy, only) {
    const w = el('div', 'ld-tool mt-s');
    w.append(el('h4', null, 'Lo que pongo en cada campo'));
    const dl = el('dl', 'ld-fx ld-fields-map');
    fields.forEach(([k, v, raw]) => {
      const dd = el('dd');
      dd.append(el('span', null, v));
      if (!only || only.includes(k)) {
        const b = copyFeedback(button('ld-mini', '📋'), () => String(raw ?? v), k, onCopy, '✓');
        b.title = 'Copiar'; b.setAttribute('aria-label', 'Copiar ' + k);
        dd.append(b);
      }
      dl.append(el('dt', null, k), dd);
    });
    w.append(dl);
    return w;
  }

  // ---------- Detalle del paso activo ----------
  // ctx: { done, key, fill, st, v, tools?, levels?, last? }. tools = herramientas extra (las de otra guía, ej. Meta Ads);
  // levels = nombres de s.level; last = { label, view } del botón del último paso (por defecto, ir al Costeo).
  function stepDetail(node, s, i, total, ctx, on) {
    node.textContent = '';
    const tools = { ...TOOLS, ...(ctx.tools || {}) }, last = ctx.last || { label: 'Ir al Costeo →', view: 'costeo' };
    const box = el('div', 'fl-detail pop');
    const top = el('div', 'row between');
    top.append(el('span', 'tag tb', `Paso ${i + 1} de ${total}`), el('span', 'small', s.where));
    box.append(top, el('h3', 'mt-s fl-h', s.t));
    if (s.level && ctx.levels) box.append(el('span', 'tag tv', 'Nivel: ' + ctx.levels[s.level]));
    if (s.src) box.append(el('span', 'tag tv', s.src));
    if (s.p) box.append(seg('p', 'fl-p', s.p));
    if (s.warn) box.append(seg('div', 'note ny mt-s', ['⚠️ ', ...s.warn]));
    if (s.fields) box.append(fieldTable(s.fields, on.copy, s.copyOnly));

    const list = el(s.ordered ? 'ol' : 'ul', 'ld-checks mt-s');
    s.items.forEach((it) => {
      const k = ctx.key(s, it), done = !!ctx.done[k];
      const li = el('li'), b = button('ld-check' + (done ? ' on' : ''), null, () => on.toggle(k));
      b.setAttribute('aria-pressed', String(done));
      b.append(el('i', null, done ? '✓' : ''), seg('span', null, it.t));
      li.append(b);
      // Desplegable opcional bajo la casilla: it.more = { t, groups: [[título, [valores]]] }.
      if (it.more) {
        const d = el('details', 'acc ld-more'), bd = el('div', 'bd');
        d.append(el('summary', null, it.more.t));
        it.more.groups.forEach(([h, vals]) => bd.append(seg('p', null, [{ b: h + ': ' }, vals.join(', ')])));
        d.append(bd);
        li.append(d);
      }
      list.append(li);
    });
    box.append(list);
    if (s.items.some((it) => ctx.done[ctx.key(s, it)])) {
      const r = el('div', 'row mt-s'); r.append(button('btn ghost sm', 'Desmarcar todo este paso', on.clearStep)); box.append(r);
    }

    if (s.prompts) {
      const ps = el('div', 'ld-prompts mt');
      ps.append(el('h4', null, 'Prompts para la IA'));
      s.prompts.forEach((p) => {
        const c = el('div', 'ld-prompt'), t = el('p', null, ctx.fill(p.text));
        const hd = el('div', 'row between'); hd.append(el('b', null, p.t), copyBtn(t, p.t, on.copy));
        c.append(hd, t);
        if (p.tip) c.append(seg('div', 'ld-prompt-tip', ['💡 ', ...p.tip]));
        ps.append(c);
      });
      box.append(ps);
    }
    (s.tool || []).forEach((k) => { const t = tools[k](on, ctx.st, ctx.v); t.classList.add('mt'); box.append(t); });
    if (s.tip) box.append(seg('div', 'note nn mt', ['💡 ', ...s.tip]));

    const nav = el('div', 'row mt');
    if (i > 0) nav.append(button('btn ghost sm', '← Anterior', on.prev));
    nav.append(i < total - 1 ? button('btn sm', 'Siguiente paso →', on.next) : button('btn sm', last.label, () => on.go(last.view)));
    box.append(nav);
    node.append(box);
  }

  // Pinta los valores derivados (v = core.landing.view) en los nodos [data-o], [data-c], [data-have] y .ld-need.
  function outputs(root, v) {
    const p = v.prices;
    const O = {
      name: [v.name || 'Falta'], dropi: [v.dropi || 'Falta'],
      cost: [v.cost ? fmt(v.cost) : 'Falta', v.cost], price: [p ? fmt(p.price) : 'Falta', p && p.price],
      compare: [p ? fmt(p.compare) : '—', p && p.compare],
      title: [v.title || 'Nombre: subtítulo'],
    };
    v.offers.forEach((o, i) => { O['on' + i] = [o.title]; O['ol' + i] = [o.label]; });
    (p ? p.offers : []).forEach((o, i) => {
      O['os' + i] = [o.strike ? fmt(o.strike) : ''];
      O['ot' + i] = [fmt(o.total)];
    });
    root.querySelectorAll('[data-o]').forEach((n) => {
      const [t, raw] = O[n.dataset.o] || ['']; n.textContent = t;
      if (raw != null) n.dataset.raw = String(raw); else delete n.dataset.raw;
    });
    const tone = (c) => (c.over ? 'bad' : c.ok ? 'ok' : '');
    const C = {
      sub: [`${v.sub.words} palabras · menos de ${v.sub.max}`, v.sub.words ? (v.sub.ok ? 'ok' : 'bad') : ''],
      titleCount: [`${v.titleCount.len}/${v.titleCount.max}`, tone(v.titleCount)],
    };
    root.querySelectorAll('[data-c]').forEach((n) => { const [t, tn] = C[n.dataset.c]; n.textContent = t; n.className = 'ld-count' + (tn ? ' ' + tn : ''); });
    const has = { name: !!v.name, dropi: !!v.dropi, cost: !!v.cost, price: !!p };
    root.querySelectorAll('[data-have]').forEach((n) => n.classList.toggle('ok', has[n.dataset.have]));
    root.querySelectorAll('.ld-need').forEach((n) => { n.hidden = !!p; });
    root.querySelectorAll('.ld-val').forEach((n) => { if (n.querySelector('[data-o="price"],[data-o="compare"]')) n.classList.toggle('off', !p); });
    root.querySelectorAll('.ld-price').forEach((n) => { n.hidden = !p; });
  }

  PYL.ui.landing = { stepList, stepDetail, progress, outputs, valRow, input, copyBtn, copyFeedback, out, button, seg };
})();
