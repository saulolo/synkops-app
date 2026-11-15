// Logística (SPEC 13): estado (app.state.logistics) y conexión con la UI. Nada se guarda entre sesiones.
// Cada plantilla de LG_TEMPLATES es una tarjeta aparte, con su propio formulario y mensaje.
(() => {
  const PYL = globalThis.PYL;
  const { $, copy } = PYL.ui.dom;
  const C = PYL.core.logistics, U = PYL.ui.logistics, toast = PYL.ui.feedback.toast;

  const S = (PYL.app.state.logistics = {
    part: C.LG_PARTS[0].k, // sub-pestaña abierta (siempre arranca en 'msgs')
    // Una entrada por plantilla: lo escrito en su formulario y el último mensaje que generó.
    cards: Object.fromEntries(C.LG_TEMPLATES.map((t) => [t.k, { form: Object.fromEntries(t.fields.map((f) => [f.k, f.def || ''])), last: '' }])),
  });

  const nodes = {}; // tarjeta pintada de cada plantilla
  const errs = Object.fromEntries(C.LG_TEMPLATES.map((t) => [t.k, {}])); // errores de la última validación de cada una

  // Producto y precio de Desarrollo ("Producto que estoy montando"), ya como texto de campo.
  const fromDev = () => {
    const p = C.lgPrefill(PYL.app.state.landing.prod);
    return { product: p.product, price: p.price == null ? '' : C.lgMoneyText(p.price) };
  };

  // Escribe en el estado y en el campo de esa tarjeta.
  const put = (tpl, k, text) => { S.cards[tpl.k].form[k] = text; U.setField(nodes[tpl.k], k, text); };

  // Repinta la tarjeta con su estado (campos, errores y mensaje).
  function paint(tpl) {
    const st = S.cards[tpl.k];
    for (const f of tpl.fields) U.setField(nodes[tpl.k], f.k, st.form[f.k]);
    U.errors(nodes[tpl.k], errs[tpl.k]);
    U.message(nodes[tpl.k], st.last);
  }

  // Al abrir la pestaña: los campos que vienen de Desarrollo (`from`) se llenan solo si están vacíos.
  function prefill() {
    const d = fromDev();
    for (const tpl of C.LG_TEMPLATES) for (const f of tpl.fields) if (f.from && !S.cards[tpl.k].form[f.k].trim() && d[f.k]) put(tpl, f.k, d[f.k]);
  }

  // Botón «Traer de Desarrollo» de una tarjeta: pisa sus campos `from`. Sin nombre en Desarrollo no cambia nada.
  function importar(tpl) {
    const d = fromDev();
    if (!d.product) { toast('Desarrollo no tiene producto: llena «Producto que estoy montando» o escribe los datos aquí.', 'error'); return; }
    for (const f of tpl.fields) if (f.from && d[f.k]) put(tpl, f.k, d[f.k]);
    toast('Traje «' + d.product + '» de Desarrollo.', 'ok');
  }

  // «Generar mensaje»: valida; con errores marca los campos y deja el mensaje anterior.
  function generate(tpl) {
    const st = S.cards[tpl.k], r = C.lgValues(tpl, st.form);
    errs[tpl.k] = r.errors;
    U.errors(nodes[tpl.k], r.errors);
    if (!r.ok) { toast('Corrige los campos marcados en rojo.', 'error'); return; }
    st.last = C.lgMessage(tpl.k, r.values);
    U.message(nodes[tpl.k], st.last);
  }

  async function copyMessage(tpl) {
    const st = S.cards[tpl.k];
    if (!st.last) { toast('Primero toca «Generar mensaje».', 'error'); return; }
    if (await copy(st.last)) toast('Mensaje copiado. Pégalo en WhatsApp.', 'ok');
    else toast('No pude copiar. Selecciona el texto y usa Ctrl+C.', 'error');
  }

  // «Limpiar»: vacía los datos propios de cada pedido (los que no vienen de Desarrollo ni traen valor por defecto) y el mensaje.
  function clear(tpl) {
    for (const f of tpl.fields) if (!f.from && f.def == null) S.cards[tpl.k].form[f.k] = '';
    S.cards[tpl.k].last = ''; errs[tpl.k] = {};
    paint(tpl);
  }

  const handlers = (tpl) => ({
    change: (k, text) => { S.cards[tpl.k].form[k] = text; },
    // Al salir del campo de dinero se muestra formateado ($ 97.400); un texto inválido se deja para que se corrija.
    blur: (k) => {
      const f = tpl.fields.find((x) => x.k === k);
      if (!f || f.type !== 'money') return;
      const n = C.lgMoney(S.cards[tpl.k].form[k]);
      if (n != null) put(tpl, k, C.lgMoneyText(n));
    },
    importar: () => importar(tpl),
    generate: () => generate(tpl),
    copy: () => copyMessage(tpl),
    clear: () => clear(tpl),
  });

  function render() {
    const open = C.LG_PARTS.find((p) => p.k === S.part && !p.disabled) || C.LG_PARTS.find((p) => !p.disabled);
    S.part = open.k;
    U.parts($('#lg-parts'), C.LG_PARTS, S.part, (k) => { S.part = k; render(); });
    $('#lg-cards').hidden = S.part !== 'msgs';
  }

  // Las tarjetas se arman una sola vez, de izquierda a derecha en el orden de LG_TEMPLATES.
  const root = $('#lg-cards');
  root.textContent = '';
  for (const tpl of C.LG_TEMPLATES) {
    nodes[tpl.k] = U.card(tpl, S.cards[tpl.k].form, handlers(tpl));
    root.append(nodes[tpl.k]);
  }

  document.addEventListener('nav:vista', (e) => { if (e.detail.v === 'logistica') prefill(); });

  render();
})();
