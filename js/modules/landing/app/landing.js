// Pestaña Desarrollo (landing en Shopify): estado (app.state.landing), persistencia y conexión con la UI.
// El producto que monto se puede traer de Mi candidato (Buscar producto); si no tiene precio de venta,
// uso el precio sugerido del costeo (core.search.priceFor, margen por defecto de NovaSociety).
(() => {
  const PYL = globalThis.PYL;
  const { $ } = PYL.ui.dom;
  const C = PYL.core.landing, U = PYL.ui.landing;
  const store = PYL.services.storage.landing, toast = PYL.ui.feedback.toast;

  const saved = store.load() || {};
  const S = (PYL.app.state.landing = {
    active: saved.active || 0,   // paso abierto
    done: saved.done || {},      // casillas marcadas { 'paso.casilla': true }
    prod: saved.prod || {},      // { name, dropi, cost, price }
    sub: saved.sub || '',        // subtítulo del título
    // Para títulos y etiquetas de Releasit; vacía, la garantía vuelve a la de siempre.
    unit: saved.unit || '', gift: saved.gift || '', warranty: saved.warranty || String(C.LANDING.warranty),
  });

  // Avisa a la guía de Meta Ads (modules/ads/app/ads.js), que usa el nombre y el precio del producto.
  const persist = () => {
    if (!store.save(S)) toast('No pude guardar en el navegador.', 'error');
    document.dispatchEvent(new CustomEvent('landing:prod'));
  };
  const root = $('#d-shop');
  const MONEY = ['cost', 'price'];
  const field = (k) => $('#d-f-' + k);
  const money = (v) => (v ? Number(v).toLocaleString('es-CO') : '');

  function fillProduct() {
    ['name', 'dropi'].forEach((k) => { field(k).value = S.prod[k] || ''; });
    MONEY.forEach((k) => { field(k).value = money(S.prod[k]); });
  }

  // Repinta solo lo derivado (contadores, precios, vistas previas): no toca los campos que estoy escribiendo.
  const refresh = () => U.outputs(root, C.view(S));

  function render() {
    const total = C.STEPS.length, i = Math.min(S.active, total - 1), prog = C.progress(S.done), v = C.view(S);
    const select = (j) => { S.active = j; persist(); render(); };
    U.progress($('#d-prog'), prog, reset);
    U.stepList($('#d-steps'), C.STEPS, prog, i, select);
    U.stepDetail($('#d-step'), C.STEPS[i], i, total, { done: S.done, key: C.key, fill: (t) => C.fill(t, { producto: S.prod.name, precio: S.prod.price }), st: S, v }, {
      toggle: (k) => { S.done[k] = !S.done[k]; persist(); render(); },
      clearStep: () => { C.STEPS[i].items.forEach((it) => { delete S.done[C.key(C.STEPS[i], it)]; }); persist(); render(); },
      field: (k, val) => { S[k] = val; persist(); refresh(); },
      // El botón muestra ✓ al copiar; solo el error va como mensaje.
      copy: async (text) => { const ok = await PYL.ui.dom.copy(text); if (!ok) toast('No pude copiar: lo selecciono y copio a mano.', 'error'); return ok; },
      pull: () => pull(true),
      prev: () => select(i - 1),
      next: () => select(i + 1),
      go: (view) => $(`#tabs [data-v="${view}"]`).click(),
    });
    refresh();
  }

  // Trae nombre, ID de Dropi y precios de Mi candidato. `loud` = lo pidió con el botón (avisa si no hay nada).
  function pull(loud) {
    const d = (PYL.app.state.search && PYL.app.state.search.draft) || {};
    if (!d.name && !d.price) { if (loud) toast('Mi candidato está vacío: lo lleno en Buscar producto o escribo los datos aquí.', 'error'); return; }
    const sell = Number(d.sellPrice) || (d.price ? PYL.core.search.priceFor(d) : null);
    S.prod = { ...S.prod, name: d.name || S.prod.name || '', dropi: d.dropi || S.prod.dropi || '', cost: Number(d.price) || S.prod.cost || null, price: sell || S.prod.price || null };
    persist(); fillProduct(); render();
    if (loud) toast(Number(d.sellPrice) ? `Traje ${d.name || 'el producto'} de mi candidato.` : `Traje ${d.name || 'el producto'}; como no tenía precio de venta, puse el sugerido del costeo.`, 'ok');
  }

  async function reset() {
    const r = await PYL.ui.feedback.ask('Empezar otro producto', 'Desmarco todas las casillas y borro el producto.', [{ r: 'ok', label: 'Empezar de cero' }]);
    if (r !== 'ok') return;
    Object.assign(S, { active: 0, done: {}, prod: {}, sub: '', unit: '', gift: '', warranty: String(C.LANDING.warranty) });
    persist(); fillProduct(); render();
  }

  // ---------- Arranque ----------
  ['name', 'dropi'].forEach((k) => field(k).addEventListener('input', (e) => { S.prod[k] = e.target.value; persist(); refresh(); }));
  MONEY.forEach((k) => {
    const x = field(k);
    x.addEventListener('input', () => { S.prod[k] = Number(x.value.replace(/\D/g, '')) || null; persist(); refresh(); });
    x.addEventListener('change', () => { x.value = money(S.prod[k]); });
  });
  $('#d-pull').addEventListener('click', () => pull(true));
  // Al abrir la pestaña sin producto, lo traigo de Mi candidato.
  document.querySelectorAll('[data-v="desarrollo"],[data-go="desarrollo"]').forEach((b) => b.addEventListener('click', () => { if (!S.prod.name) pull(false); }));

  fillProduct();
  render();
})();
