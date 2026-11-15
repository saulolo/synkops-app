// Logística (SPEC 13): plantillas de mensajes a clientes. Arma el texto desde datos del pedido y valida el formulario. Sin DOM.
// Los nombres llevan el prefijo lg/LG_ para no chocar al aplanar js/index.js.
(() => {
  const core = globalThis.PYL.core;

  const LG_STORE = '🍃VidanovaStore';
  const LG_DAYS = '2 a 4'; // tiempo de entrega (días hábiles): fijo, no es un campo

  const LG_PARTS = [
    { k: 'msgs', label: '💬 Mensajes a clientes' },
    { k: 'track', label: '📦 Seguimiento de pedidos · pronto', disabled: true },
  ];

  // Una plantilla = clave, rótulo y campos. `ph` = ejemplo que se ve en el campo vacío. `from` = dato de landing.prod que lo prellena; `def` = valor por defecto.
  // Plantilla nueva: sumar su entrada aquí y su texto en `TEXT`.
  // Una plantilla = una tarjeta aparte en la pestaña: clave, título de la tarjeta y campos. El orden es el de las tarjetas, de izquierda
  // a derecha; la primera es también la de respaldo en lgTemplate. `ph` = ejemplo que se ve en el campo vacío. `from` = dato de
  // landing.prod que lo prellena; `def` = valor por defecto; `errMoney` = aviso de un campo de dinero inválido.
  // Plantilla nueva: sumar su entrada aquí y su texto en `TEXT`; la tarjeta aparece sola.
  const LG_TEMPLATES = [
    { k: 'guia', title: 'Confirmación de Guia',
      fields: [
        { k: 'name', label: 'Nombre del destinatario', type: 'text', ph: 'Ej: Pablo' },
        { k: 'product', label: 'Producto', type: 'text', from: 'name', ph: 'Ej: Omegaxl joint support' },
        { k: 'guide', label: 'Número de guía', type: 'text', ph: 'Ej: 074102602224' },
        { k: 'price', label: 'Precio', type: 'money', from: 'price', ph: 'Ej: $ 97.400' },
        { k: 'address', label: 'Dirección de entrega', type: 'text', ph: 'Ej: Cra 67 # 25 - 34 Itagui - Calatrava' },
      ] },
    { k: 'pedido', title: 'Confirmación de Pedidos',
      fields: [
        { k: 'name', label: 'Nombre de cliente', type: 'text', ph: 'Ej: Eugenia' },
        { k: 'product', label: 'Producto', type: 'text', from: 'name', ph: 'Ej: Omegaxl joint support' },
        { k: 'address', label: 'Dirección de entrega', type: 'text', ph: 'Ej: Colombia 20# 19 .30 - barrio Capri' },
        { k: 'city', label: 'Ciudad / Municipio', type: 'text', ph: 'Ej: PASTO' },
        { k: 'dept', label: 'Departamento', type: 'text', ph: 'Ej: NARIÑO' },
        { k: 'phone', label: 'Teléfono de contacto', type: 'text', ph: 'Ej: 3214566677' },
        { k: 'total', label: 'Total a pagar (COD - contraentrega)', type: 'money', ph: 'Ej: $ 97.400', errMoney: 'Total mayor a 0' },
      ] },
  ];

  const ERR_MONEY = 'Precio mayor a 0';
  const clean = (v) => String(v == null ? '' : v).trim();

  const lgTemplate = (k) => LG_TEMPLATES.find((t) => t.k === k) || LG_TEMPLATES[0];

  // '97.400', '$ 97.400', '97400' → 97400. Vacío, 0, negativo o con letras → null.
  const lgMoney = (text) => {
    const t = clean(text).replace(/^\$\s*/, '');
    if (!/^\d+(\.\d{3})*$/.test(t)) return null;
    const n = Number(t.replace(/\./g, ''));
    return n > 0 ? n : null;
  };

  const miles = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const peso = (n) => '$' + miles(n);          // en el mensaje: $97.400
  const lgMoneyText = (n) => '$ ' + miles(n);  // en el campo: $ 97.400

  // form = textos del formulario. Devuelve { ok, values, errors }; errors = { campo: mensaje }.
  const lgValues = (tpl, form) => {
    const f = form || {}, values = {}, errors = {};
    for (const fl of tpl.fields) {
      const t = clean(f[fl.k]);
      if (fl.type === 'money') {
        const n = lgMoney(t);
        if (n != null) values[fl.k] = n; else errors[fl.k] = t ? (fl.errMoney || ERR_MONEY) : `Escribe ${fl.label.toLowerCase()}`;
        continue;
      }
      if (!t) errors[fl.k] = `Escribe ${fl.label.toLowerCase()}`; else values[fl.k] = t;
    }
    return { ok: Object.keys(errors).length === 0, values, errors };
  };

  // Producto y precio de "Producto que estoy montando" (landing.prod). Faltantes: '' / null.
  const lgPrefill = (prod) => {
    const p = prod || {};
    return { product: clean(p.name), price: Number(p.price) > 0 ? Number(p.price) : null };
  };

  const STORE_BOLD = LG_STORE.replace('🍃', '🍃*') + '*'; // 🍃*VidanovaStore*

  // Texto de cada plantilla: recibe los valores ya validados (price = número).
  const TEXT = {
    pedido: (v) => `¡Hola ${v.name}! 🌟

Acabamos de recibir tu compra del producto -- ${v.product} -- en nuestra tienda ${STORE_BOLD}

El cual será entregado en:

*Dirección:* ${v.address}
*Ciudad:* ${v.city}
*Departamento:* ${String(v.dept).toUpperCase()}
*Teléfono:* ${v.phone}
*Total a Pagar:* ${peso(v.total)}

El *envío* es totalmente *Gratis* y el pago es *Contra Entrega* para tu seguridad 🛍️🤍

🚚 Por favor *confírmanos* si tus datos son correctos para despachar tu pedido *ahora* 🤍`,

    guia: (v) => `*CONFIRMACIÓN GUIA*
¡Hola, ${v.name}! 👋 Te saludamos nuevamente de ${STORE_BOLD}.

Te confirmamos que tu pedido de la ${v.product} ya fue empacado y entregado a la transportadora. 📦✨

🚚 *Número de Guía*: ${v.guide}
🔗 *Rastreo*: Puedes consultar el estado de tu paquete directamente en la página web de la transportadora con ese número de guía.

El tiempo estimado de entrega es de *${LG_DAYS} días hábiles*.
💵 Recuerda tener listos los *${peso(v.price)}* en efectivo para cuando el repartidor llegue a tu dirección (${v.address}).

¡Cualquier duda que tengas durante el camino, nos puedes escribir por aquí! Que tengas un excelente día. 😊`,
  };

  const lgMessage = (k, values) => TEXT[lgTemplate(k).k](values || {});

  core.logistics = { LG_STORE, LG_DAYS, LG_PARTS, LG_TEMPLATES, lgTemplate, lgMoney, lgMoneyText, lgValues, lgPrefill, lgMessage };
})();
