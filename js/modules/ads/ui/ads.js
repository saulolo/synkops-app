// Desarrollo → Meta Ads: mapa de la campaña (1 campaña → 4 conjuntos → 4 anuncios) y herramientas de cada paso.
// Los pasos se pintan con ui.landing (stepList, stepDetail, progress): aquí solo va lo propio de Meta.
// Recibe datos y callbacks. Lo derivado se pinta en nodos [data-o] que `outputs` actualiza sin repintar los campos.
(() => {
  const PYL = globalThis.PYL;
  const { el } = PYL.ui.dom;
  const L = PYL.ui.landing;
  const { button, out, valRow, input, seg } = L;
  const fmt = (v) => PYL.core.format.fmt(v, 'cop');

  // ---------- Mapa de la campaña ----------
  // Solo informativo: se dibuja el conjunto 1 con su anuncio; los otros son copias, y el bloque "Duplico" muestra cuáles ya hice.
  // copies[n] = ya dupliqué el conjunto n; onCopy(texto, etiqueta) copia el nombre de la campaña.
  function map(node, A, copies, onCopy) {
    node.textContent = '';
    const box = (cls, kids) => { const d = el('div', 'ma-node ' + cls); d.append(...kids); return d; };
    const name = out('cname', 'ma-name');
    const camp = el('div', 'ma-camp-w');
    const cp = L.copyFeedback(button('btn ghost sm ld-copy ma-camp-copy', '📋 Copiar'), () => name.textContent, 'Nombre de la campaña', onCopy, '✓ Copiado');
    camp.append(box('ma-camp', [el('span', 'ma-k', '📁 Campaña'), name, el('small', null, 'Ventas · Subasta · ABO')]), cp);

    const sets = el('div', 'ma-sets');
    const col = el('div', 'ma-col ma-stack');
    col.append(
      box('ma-set', [el('span', 'ma-k', '▦ Conjunto 1'), el('small', null, `${fmt(A.daily)} al día`)]),
      box('ma-ad', [el('span', 'ma-k', '▭ Anuncio 1'), el('small', null, '🎬 Video 1')]),
    );
    const n = A.sets - 1, made = Object.values(copies).filter(Boolean).length;
    const dup = box('ma-dupbox', [
      el('span', 'ma-k', `⧉ Lo duplico ${n} veces`),
      el('small', null, 'Mismo presupuesto, calendario y textos. Solo cambio el nombre y el video.'),
    ]);
    const chips = el('span', 'ma-chips');
    for (let k = 2; k <= A.sets; k++) {
      const c = el('i', copies[k] ? 'ok' : null, copies[k] ? `✓ ${k}` : String(k));
      c.title = `Conjunto ${k} · anuncio ${k} · video ${k}`;
      chips.append(c);
    }
    dup.append(chips, el('small', 'ma-made', `${made} de ${n} copias hechas`));
    sets.append(col, el('span', 'ma-arrow', '→'), dup);
    const sum = el('div', 'ma-sum');
    [[`${A.sets} × ${fmt(A.daily)}`, `${fmt(A.daily * A.sets)} al día`], ['Al publicar', `${1 + A.sets * 2} elementos`], ['Arranca', 'mañana · ' + A.startHour + ':00 a. m.']]
      .forEach(([k, v]) => { const d = el('div'); d.append(el('small', null, k), el('b', null, v)); sum.append(d); });
    node.append(camp, sets, sum);
  }

  // ---------- Herramientas de los pasos (se suman a las de ui.landing en stepDetail) ----------
  const TOOLS = {
    // URL de la product page: la parte fija se muestra; solo se edita y se copia el identificador (primer nombre del producto).
    url: (on, st, v) => {
      const w = el('div', 'ld-tool');
      w.append(el('h4', null, 'URL de la product page'));
      w.append(seg('p', 'note ny ma-need', ['Pongo el ', { b: 'nombre del producto' }, ' arriba, en "Producto que estoy montando".']));
      const f = input('slug', 'URL del producto', v.slug, on, { ph: v.slugAuto || 'magnesium', hint: 'Copiar trae solo esta última parte.' });
      const x = f.querySelector('input'), r = el('div', 'ma-url'), g = el('div', 'ma-slug'), val = out('slug', 'ma-hide');
      x.replaceWith(r);
      g.append(el('span', 'ma-base', PYL.core.ads.URL_BASE), x);
      r.append(g, L.copyBtn(val, 'URL de la product page', on.copy), val);
      w.append(f);
      return w;
    },
    name: (on) => {
      const w = el('div', 'ld-tool');
      w.append(el('h4', null, 'Nombre de la campaña'));
      w.append(seg('p', 'note ny ma-need', ['Pongo el ', { b: 'nombre del producto' }, ' arriba, en "Producto que estoy montando".']));
      w.append(valRow('Nombre de la campaña', 'cname', on.copy, 'día y mes de mañana (cuando arranca) - primer nombre del producto en mayúsculas'));
      return w;
    },
    abo: () => {
      const w = el('div', 'ld-tool');
      w.append(el('h4', null, 'CBO vs. ABO'));
      const g = el('div', 'ma-vs');
      [
        ['CBO', 'El presupuesto le acompaña', 'Pongo un presupuesto para toda la campaña y Meta lo reparte: le da más a los anuncios que van mejor.', false],
        ['ABO', 'Presupuesto del conjunto de anuncios', 'Yo decido cuánto recibe cada conjunto, sin importar sus resultados. Así cada video tiene un testeo justo.', true],
      ].forEach(([k, label, txt, mine]) => {
        const c = el('div', 'ma-opt' + (mine ? ' on' : ''));
        const hd = el('div', 'row between'); hd.append(el('b', null, k), el('span', 'tag ' + (mine ? 'tg' : 'tn'), mine ? '✓ La que uso' : 'No la uso'));
        c.append(hd, el('small', null, '"' + label + '"'), el('p', null, txt));
        g.append(c);
      });
      w.append(g);
      return w;
    },
    start: (on) => {
      const w = el('div', 'ld-tool');
      w.append(el('h4', null, 'Presupuesto y calendario'));
      w.append(valRow('Presupuesto diario', 'daily', on.copy, 'por conjunto'));
      return w;
    },
    dup: (on, st) => {
      const w = el('div', 'ld-tool');
      w.append(el('h4', null, 'Así queda cada conjunto'));
      const g = el('div', 'ma-dupgrid'), A = PYL.core.ads.ADS;
      for (let n = 1; n <= A.sets; n++) {
        const ok = n === 1 || st.done['dup.s' + n];
        const c = el('div', 'ma-card' + (ok ? ' ok' : ''));
        c.append(el('b', null, ok ? '✓' : String(n)), el('span', null, `Conjunto ${n}`), el('span', null, `Anuncio ${n}`), el('span', null, `🎬 Video ${n}`));
        g.append(c);
      }
      w.append(g);
      return w;
    },
    publish: () => {
      const w = el('div', 'ld-tool');
      const A = PYL.core.ads.ADS, total = 1 + A.sets * 2;
      w.append(el('h4', null, `¿Por qué dice "(${total})"?`));
      const r = el('div', 'ma-count');
      [['1', 'campaña'], [String(A.sets), 'conjuntos'], [String(A.sets), 'anuncios']].forEach(([n, t], i) => {
        if (i) r.append(el('span', 'ma-op', '+'));
        const d = el('div'); d.append(el('b', null, n), el('small', null, t)); r.append(d);
      });
      r.append(el('span', 'ma-op', '='));
      const d = el('div', 'tot'); d.append(el('b', null, String(total)), el('small', null, 'para publicar')); r.append(d);
      w.append(r, seg('p', 'small mt-s', ['Si el número no da ', { b: String(total) }, ', me faltó un conjunto o un anuncio.']));
      return w;
    },
  };

  // Pinta lo derivado (v = core.ads.adsView) en los nodos [data-o] de la guía de Meta.
  function outputs(root, v) {
    const O = {
      cname: [v.name], daily: [fmt(v.daily), v.daily], slug: [v.slug, v.slug],
    };
    root.querySelectorAll('[data-o]').forEach((n) => {
      const [t, raw] = O[n.dataset.o] || ['']; n.textContent = t;
      if (raw != null) n.dataset.raw = String(raw); else delete n.dataset.raw;
    });
    root.querySelectorAll('.ma-url .ld-copy').forEach((b) => { b.disabled = !v.slug; });
    root.querySelectorAll('.ma-need').forEach((n) => { n.hidden = !!v.product; });
  }

  // Estrategia sin paso a paso todavía (ej. CBO): qué es y volver a la que sí está lista.
  function soon(node, s, ready, onPick) {
    node.textContent = '';
    const w = el('div', 'ma-soon');
    w.append(el('span', 'ma-soon-ic', s.icon), el('span', 'tag tn', 'Pronto'), el('h3', 'st-h mt-s', s.h), el('p', 'muted', s.d));
    w.append(seg('p', 'small', ['Cuando documente sus pasos, quedan aquí con el mismo formato: mapa, casillas y ', { b: 'qué pongo en cada campo' }, '.']));
    if (ready) w.append(button('btn sm mt-s', `Ver el paso a paso ${ready.k.toUpperCase()} →`, () => onPick(ready.k)));
    node.append(w);
  }

  PYL.ui.ads = { map, outputs, soon, TOOLS };
})();
