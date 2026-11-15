// Logística (SPEC 13): estado (app.state.logistics) y conexión con la UI. Nada se guarda entre sesiones.
(() => {
  const PYL = globalThis.PYL;
  const { $, copy } = PYL.ui.dom;
  const C = PYL.core.logistics, U = PYL.ui.logistics, toast = PYL.ui.feedback.toast;

  const S = (PYL.app.state.logistics = {
    part: C.LG_PARTS[0].k,   // sub-pestaña abierta (siempre arranca en 'msgs')
    tpl: C.LG_TEMPLATES[0].k, // plantilla elegida
    form: Object.fromEntries(C.LG_TEMPLATES.flatMap((t) => t.fields).map((f) => [f.k, f.def || ''])),
    last: '',                // último mensaje generado
  });

  let errs = {}; // errores de la última validación (se borran al cambiar de plantilla)

  const FORM = () => $('#lg-form');

  // Producto y precio de Desarrollo ("Producto que estoy montando"), ya como texto de campo.
  const fromDev = () => {
    const p = C.lgPrefill(PYL.app.state.landing.prod);
    return { product: p.product, price: p.price == null ? '' : C.lgMoneyText(p.price) };
  };

  // Escribe en el estado y en el campo.
  const put = (k, text) => { S.form[k] = text; U.setField(FORM(), k, text); };

  // Al abrir la pestaña: Producto y Precio solo si están vacíos.
  function prefill() {
    const d = fromDev();
    for (const k of ['product', 'price']) if (!S.form[k].trim() && d[k]) put(k, d[k]);
  }

  // Botón «Traer de Desarrollo»: pisa Producto y Precio. Sin nombre en Desarrollo no cambia nada.
  function importar() {
    const d = fromDev();
    if (!d.product) { toast('Desarrollo no tiene producto: llena «Producto que estoy montando» o escribe los datos aquí.', 'error'); return; }
    put('product', d.product);
    if (d.price) put('price', d.price);
    toast('Traje «' + d.product + '» de Desarrollo.', 'ok');
  }

  const on = {
    change: (k, text) => { S.form[k] = text; },
    // Al salir del campo de dinero se muestra formateado ($ 97.400); un texto inválido se deja para que se corrija.
    blur: (k) => {
      const f = C.lgTemplate(S.tpl).fields.find((x) => x.k === k);
      if (!f || f.type !== 'money') return;
      const n = C.lgMoney(S.form[k]);
      if (n != null) put(k, C.lgMoneyText(n));
    },
  };

  function renderForm() {
    U.form(FORM(), C.lgTemplate(S.tpl), S.form, on);
    U.errors(FORM(), errs);
  }

  // «Generar mensaje»: valida; con errores marca los campos y deja el mensaje anterior.
  function generate() {
    const tpl = C.lgTemplate(S.tpl), r = C.lgValues(tpl, S.form);
    errs = r.errors;
    U.errors(FORM(), errs);
    if (!r.ok) { toast('Corrige los campos marcados en rojo.', 'error'); return; }
    S.last = C.lgMessage(tpl.k, r.values);
    U.message($('#lg-out'), S.last);
  }

  async function copyMessage() {
    if (!S.last) { toast('Primero toca «Generar mensaje».', 'error'); return; }
    if (await copy(S.last)) toast('Mensaje copiado. Pégalo en WhatsApp.', 'ok');
    else toast('No pude copiar. Selecciona el texto y usa Ctrl+C.', 'error');
  }

  // «Limpiar»: vacía los datos propios de cada pedido (los que no vienen de Desarrollo ni traen valor por defecto) y el mensaje.
  function clear() {
    for (const f of C.lgTemplate(S.tpl).fields) if (!f.from && f.def == null) S.form[f.k] = '';
    S.last = ''; errs = {};
    render();
  }

  function pickTemplate(k) {
    if (k === S.tpl) return;
    S.tpl = k; S.last = ''; errs = {};
    render();
  }

  function render() {
    const open = C.LG_PARTS.find((p) => p.k === S.part && !p.disabled) || C.LG_PARTS.find((p) => !p.disabled);
    S.part = open.k;
    U.parts($('#lg-parts'), C.LG_PARTS, S.part, (k) => { S.part = k; render(); });
    $('#lg-msgs').hidden = S.part !== 'msgs';
    U.templates($('#lg-tpls'), C.LG_TEMPLATES, C.lgTemplate(S.tpl).k, pickTemplate);
    $('#lg-tpls').hidden = C.LG_TEMPLATES.length < 2; // con una sola plantilla no hay nada que elegir
    renderForm();
    U.message($('#lg-out'), S.last);
  }

  $('#lg-import').addEventListener('click', importar);
  $('#lg-gen').addEventListener('click', generate);
  $('#lg-copy').addEventListener('click', copyMessage);
  $('#lg-clear').addEventListener('click', clear);
  document.addEventListener('nav:vista', (e) => { if (e.detail.v === 'logistica') prefill(); });

  U.icons($('#v-logistica'));
  render();
})();
