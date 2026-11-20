// Logística (SPEC 13): plantillas de mensajes a clientes. Arma el texto desde datos del pedido y valida el formulario. Sin DOM.
// Los nombres llevan el prefijo lg/LG_ para no chocar al aplanar js/index.js.
(() => {
  const core = globalThis.PYL.core;

  const LG_STORE = '🍃VidanovaStore®';
  const LG_DAYS = '2 a 4'; // tiempo de entrega (días hábiles): fijo, no es un campo
  const LG_CATALOG = 'https://vidanovastore.com/products'; // catálogo fijo (Pedido Entregado)
  const LG_NEQUI = '3182110955'; // cuentas fijas (Solicitud de Anticipo, Flete Especial)
  const LG_BANK = '23015881151'; // Ahorros - Bancolombia
  // Etapa del pedido de cada plantilla (chip sobre el título de su tarjeta): clave → texto.
  const LG_STAGES = { confirmar: 'Confirmar', cobro: 'Cobro', envio: 'Envío', entrega: 'Entrega', validar: 'Validar', privatizar: 'Privatizar' };

  // Bloque de cuentas de Solicitud de Anticipo y Flete Especial: cada cuenta con su ícono, su nombre y su número en líneas aparte.
  const LG_ACCOUNTS = `📱 *Nequi/Daviplata*
${LG_NEQUI}

🏦 *Ahorros - Bancolombia*
${LG_BANK}`;

  const LG_PARTS = [
    { k: 'msgs', label: '💬 Plantillas de mensajes' },
    { k: 'track', label: '📦 Seguimiento de pedidos · pronto', disabled: true },
  ];

  // Una plantilla = clave, rótulo y campos. `ph` = ejemplo que se ve en el campo vacío. `from` = dato de landing.prod que lo prellena; `def` = valor por defecto.
  // Plantilla nueva: sumar su entrada aquí y su texto en `TEXT`.
  // Una plantilla = una tarjeta aparte en la pestaña: clave, título de la tarjeta y campos. El orden es el de las tarjetas, de izquierda
  // a derecha; la primera es también la de respaldo en lgTemplate. `ph` = ejemplo que se ve en el campo vacío. `from` = dato de
  // landing.prod que lo prellena; `def` = valor por defecto; `type: 'check'` = casilla (true/false); `errMoney` = aviso de un campo de dinero inválido; `stage` = etapa del pedido (clave de LG_STAGES) que se ve como chip sobre el título; `type: 'phone'` = celular de Colombia (ver lgPhone), con `errPhone` como aviso;
  // `when: '<k de una casilla>'` = el campo solo existe (se muestra, se exige y entra en values) con esa casilla marcada;
  // `keep: true` = «Limpiar» no lo vacía (datos del producto, no del pedido).
  // Plantilla nueva: sumar su entrada aquí y su texto en `TEXT`; la tarjeta aparece sola.
  const LG_TEMPLATES = [
    { k: 'pedido', stage: 'confirmar', title: 'Confirmación de Pedidos',
      fields: [
        { k: 'name', label: 'Nombre de cliente', type: 'text', ph: 'Ej: Eugenia' },
        { k: 'product', label: 'Producto', type: 'text', from: 'name', ph: 'Ej: Omegaxl joint support' },
        { k: 'address', label: 'Dirección de entrega', type: 'text', ph: 'Ej: Colombia 20# 19 .30 - barrio Capri' },
        { k: 'city', label: 'Ciudad / Municipio', type: 'text', ph: 'Ej: PASTO' },
        { k: 'dept', label: 'Departamento', type: 'text', ph: 'Ej: NARIÑO' },
        { k: 'phone', label: 'Teléfono de contacto', type: 'phone', ph: 'Ej: 3214566677', errPhone: 'Teléfono inválido: usa 311 7624068 o +57 311 7624068' },
        { k: 'total', label: 'Total a pagar (COD - contraentrega)', type: 'money', ph: 'Ej: $ 97.400', errMoney: 'Total mayor a 0' },
      ] },
    // Reconfirmación: segundo mensaje de confirmación del pedido, para cuando el cliente no contestó el primero. Va a la derecha de
    // Confirmación de Pedidos.
    { k: 'reconfirma', stage: 'confirmar', title: 'Reconfirmación de Pedido', sub: 'Para cuando el cliente no contestó el primer mensaje de confirmación: reconfirmo los datos y el envío gratis.',
      fields: [
        { k: 'name', label: 'Nombre de cliente', type: 'text', ph: 'Ej: Eugenia' },
      ] },
    // Tercer intento: llamada sin respuesta; avisa que el sistema cancelará la orden. Va a la derecha de Reconfirmación de Pedido.
    { k: 'tercero', stage: 'confirmar', title: 'Tercer Intento', sub: 'Para cuando no contesta ni la llamada ni el mensaje: avisa que la orden se cancelará.',
      fields: [
        { k: 'name', label: 'Nombre de cliente', type: 'text', ph: 'Ej: Eugenia' },
        { k: 'product', label: 'Producto', type: 'text', from: 'name', ph: 'Ej: Crema Despigmentante' },
        { k: 'city', label: 'Ciudad / Municipio', type: 'text', ph: 'Ej: Pasto' },
      ] },
    // Mensaje fijo: no pide datos, solo si el pedido lleva obsequio (casilla `check`). `sub` = texto bajo el título.
    { k: 'confirmado', stage: 'confirmar', title: 'Pedido Confirmado', sub: 'Mensaje fijo para cuando el cliente confirma el pedido. Marco si lleva obsequio.',
      fields: [
        { k: 'gift', label: 'Incluye obsequio', type: 'check', def: true },
      ] },
    { k: 'guia', stage: 'envio', title: 'Confirmación de Guia',
      fields: [
        { k: 'name', label: 'Nombre del destinatario', type: 'text', ph: 'Ej: Pablo' },
        { k: 'product', label: 'Producto', type: 'text', from: 'name', ph: 'Ej: Omegaxl joint support' },
        { k: 'guide', label: 'Número de guía', type: 'text', ph: 'Ej: 074102602224' },
        { k: 'carrier', label: 'Transportadora', type: 'text', ph: 'Ej: ENVIA' },
        { k: 'price', label: 'Precio', type: 'money', from: 'price', ph: 'Ej: $ 97.400' },
        { k: 'address', label: 'Dirección de entrega', type: 'text', ph: 'Ej: Cra 67 # 25 - 34 Itagui - Calatrava' },
      ] },
    // Infografía: se manda la infografía con el paso a paso de uso (la imagen se adjunta aparte en WhatsApp). Sin nombre de cliente.
    { k: 'infografia', stage: 'envio', title: 'Envío de Infografía', sub: 'Para mandar la infografía con el paso a paso de uso del producto (la imagen se adjunta aparte).',
      fields: [
        { k: 'product', label: 'Producto', type: 'text', from: 'name', ph: 'Ej: Crema Arbutina' },
      ] },
    // Anticipo: cuando la huella digital del cliente muestra muchas devoluciones (más del 70 %). El mensaje explica el motivo (historial de
    // devoluciones en la red logística) y recuerda adjuntar la gráfica oficial.
    { k: 'anticipo', stage: 'cobro', title: 'Solicitud de Anticipo', sub: 'Para clientes con historial alto de devoluciones: pido un anticipo (adjunto la gráfica oficial).',
      fields: [
        { k: 'name', label: 'Nombre de cliente', type: 'text', ph: 'Ej: Eugenia' },
        { k: 'product', label: 'Producto', type: 'text', from: 'name', ph: 'Ej: Crema Despigmentante' },
        { k: 'advance', label: 'Valor del anticipo', type: 'money', ph: 'Ej: $ 20.000', errMoney: 'Anticipo mayor a 0' },
      ] },
    // Reintento de entrega: el repartidor no encontró al cliente y el pedido sale otra vez en ruta.
    { k: 'reintento', stage: 'envio', title: 'Reintento de Entrega', sub: 'Para cuando el repartidor no encontró al cliente y el pedido sale otra vez en ruta.',
      fields: [
        { k: 'name', label: 'Nombre de cliente', type: 'text', ph: 'Ej: Rafael' },
        { k: 'product', label: 'Producto', type: 'text', from: 'name', ph: 'Ej: Crema Despigmentante Coreana' },
      ] },
    // Flete especial: zona lejana donde el flete se sale del presupuesto; se pide un anticipo para despachar. Las cuentas (LG_NEQUI, LG_BANK)
    // van fijas en el texto; la captura de la transportadora se adjunta aparte en WhatsApp.
    { k: 'flete', stage: 'cobro', title: 'Flete Especial', sub: 'Para zonas lejanas donde el flete se sale del presupuesto: pido un anticipo (adjunto la captura de la transportadora).',
      fields: [
        { k: 'name', label: 'Nombre de cliente', type: 'text', ph: 'Ej: Rafael' },
        { k: 'city', label: 'Ciudad', type: 'text', ph: 'Ej: Vaupés' },
        { k: 'shipping', label: 'Precio del flete', type: 'money', ph: 'Ej: $ 50.000', errMoney: 'Flete mayor a 0' },
        { k: 'product', label: 'Producto', type: 'text', from: 'name', ph: 'Ej: Crema arbutina' },
        { k: 'advance', label: 'Valor del anticipo', type: 'money', ph: 'Ej: $ 20.000', errMoney: 'Anticipo mayor a 0' },
      ] },
    // Recordatorio en ruta: el pedido ya va en camino; el cliente debe estar pendiente o dejar el dinero listo.
    { k: 'enruta', stage: 'envio', title: 'Recordatorio En Ruta', sub: 'Para avisar que el pedido ya va en ruta y que el cliente esté pendiente o deje el dinero listo.',
      fields: [
        { k: 'name', label: 'Nombre de cliente', type: 'text', ph: 'Ej: Beatriz' },
        { k: 'product', label: 'Producto', type: 'text', from: 'name', ph: 'Ej: Crema Arbutina' },
      ] },
    // Pedido entregado: agradecimiento; invita a ver el catálogo (LG_CATALOG) y, si lleva manual de regalo, lo recuerda. La casilla y el
    // título del manual son del producto (`keep`); el título solo existe con la casilla marcada (`when`).
    { k: 'entregado', stage: 'entrega', title: 'Pedido Entregado', sub: 'Para agradecer cuando el pedido ya llegó: invito a ver el catálogo y recuerdo el manual de regalo.',
      fields: [
        { k: 'name', label: 'Nombre de cliente', type: 'text', ph: 'Ej: Beatriz' },
        { k: 'manual', label: 'Incluye manual', type: 'check', def: true, keep: true },
        { k: 'manualTitle', label: 'Título del manual', type: 'text', when: 'manual', keep: true, ph: 'Ej: Manual de Bienestar Articular' },
      ] },
    // Reclamar en oficina: el pedido está en la oficina de la transportadora para que el cliente lo reclame. Sin nombre de cliente.
    { k: 'oficina', stage: 'envio', title: 'Reclamar en Oficina', sub: 'Para avisar que el pedido está en la oficina de la transportadora y que el cliente lo reclame.',
      fields: [
        { k: 'product', label: 'Producto', type: 'text', from: 'name', ph: 'Ej: Crema Arbutina' },
        { k: 'manual', label: 'Incluye manual', type: 'check', def: true, keep: true },
        { k: 'manualTitle', label: 'Título del manual', type: 'text', when: 'manual', keep: true, ph: 'Ej: Manual de Bienestar Articular' },
      ] },
    // Mensajes a proveedores (SPEC 16): `group: 'prov'` = contenedor «Mensajes a Proveedores»; `src: 'cand'` = sus `from` salen de
    // Mi candidato (ver lgFromCand: 'name' → producto, 'dropi' → ID, 'supplier' → proveedor); `type: 'digits'` = solo números (`errDigits`).
    // Validación: antes de pautar en serio, confirmo con el proveedor stock real, hora de corte y restock.
    { k: 'valida', group: 'prov', src: 'cand', stage: 'validar', title: 'Validación de Producto', sub: 'Antes de escalar la pauta: valido con el proveedor stock, hora de corte y restock.',
      fields: [
        { k: 'supplier', label: 'Proveedor', type: 'text', from: 'supplier', ph: 'Ej: Botania' },
        { k: 'product', label: 'Producto', type: 'text', from: 'name', ph: 'Ej: Crema Arbutina' },
        { k: 'dropi', label: 'ID Dropi', type: 'digits', from: 'dropi', ph: 'Ej: 2234277', errDigits: 'ID inválido: solo números' },
      ] },
    // Privatización: cuando el producto funciona, le pido al proveedor que lo privatice para mi tienda. Mismos campos que Validación.
    { k: 'privatiza', group: 'prov', src: 'cand', stage: 'privatizar', title: 'Solicitud de Privatización', sub: 'Cuando el producto funciona: le pido al proveedor que lo privatice para mi tienda.',
      fields: [
        { k: 'supplier', label: 'Proveedor', type: 'text', from: 'supplier', ph: 'Ej: Botania' },
        { k: 'product', label: 'Producto', type: 'text', from: 'name', ph: 'Ej: Crema Arbutina' },
        { k: 'dropi', label: 'ID Dropi', type: 'digits', from: 'dropi', ph: 'Ej: 2234277', errDigits: 'ID inválido: solo números' },
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

  // Celular de Colombia: `+57 311 7624068`, `311 7624068` (y esas mismas sin espacios) → '3117624068'. Cualquier otra forma → null.
  const lgPhone = (text) => {
    const m = /^(?:\+57 ?)?(3\d{2}) ?(\d{7})$/.exec(clean(text));
    return m ? m[1] + m[2] : null;
  };

  const miles = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const peso = (n) => '$' + miles(n);          // en el mensaje: $97.400
  const lgMoneyText = (n) => '$ ' + miles(n);  // en el campo: $ 97.400

  // form = textos del formulario. Devuelve { ok, values, errors }; errors = { campo: mensaje }.
  const lgValues = (tpl, form) => {
    const f = form || {}, values = {}, errors = {};
    for (const fl of tpl.fields) {
      if (fl.when && !f[fl.when]) continue; // campo condicional: solo existe con su casilla marcada
      if (fl.type === 'check') { values[fl.k] = !!f[fl.k]; continue; } // casilla: nunca da error
      const t = clean(f[fl.k]);
      if (fl.type === 'money') {
        const n = lgMoney(t);
        if (n != null) values[fl.k] = n; else errors[fl.k] = t ? (fl.errMoney || ERR_MONEY) : `Escribe ${fl.label.toLowerCase()}`;
        continue;
      }
      if (fl.type === 'digits' && t) { // solo dígitos: se conserva tal cual (sin puntos ni formato)
        if (/^\d+$/.test(t)) values[fl.k] = t; else errors[fl.k] = fl.errDigits || 'Solo números';
        continue;
      }
      if (fl.type === 'phone' && t) {
        const p = lgPhone(t);
        if (p) values[fl.k] = p; else errors[fl.k] = fl.errPhone || 'Teléfono inválido';
        continue;
      }
      if (!t) errors[fl.k] = `Escribe ${fl.label.toLowerCase()}`; else values[fl.k] = t;
    }
    return { ok: Object.keys(errors).length === 0, values, errors };
  };

  // Producto y precio de "Producto que estoy montando" (landing.prod). Faltantes: '' / null.
  // Valores iniciales del formulario de una plantilla: el `def` de cada campo; sin él, '' (o false en una casilla).
  const lgForm = (tpl) => Object.fromEntries(tpl.fields.map((f) => [f.k, f.def != null ? f.def : (f.type === 'check' ? false : '')]));

  const lgPrefill = (prod) => {
    const p = prod || {};
    return { product: clean(p.name), price: Number(p.price) > 0 ? Number(p.price) : null };
  };

  // Datos de Mi candidato (search.draft) para las plantillas con `src: 'cand'`. El proveedor solo sale si hay exactamente uno con nombre.
  const lgFromCand = (draft) => {
    const d = draft || {};
    const names = (Array.isArray(d.suppliers) ? d.suppliers : []).map((s) => clean(s && s.name)).filter(Boolean);
    return { product: clean(d.name), dropi: clean(d.dropi), supplier: names.length === 1 ? names[0] : '' };
  };

  const STORE_BOLD =LG_STORE.replace('🍃', '🍃*') + '*'; // 🍃*VidanovaStore®*

  // Texto de cada plantilla: recibe los valores ya validados (price = número).
  const TEXT = {
    privatiza: (v) => `Hola, buen día equipo de ${v.supplier}. Les saluda Saul de la tienda ${STORE_BOLD} (Comunidad NovaProject).

Venimos trabajando con su producto *${v.product}* (ID: ${v.dropi}) y los resultados de la pauta han sido muy buenos. Es un producto en el que creemos y queremos apostarle fuerte.

Por eso quisiera proponerles la *privatización* del producto para nuestra tienda. A cambio, nos comprometemos a:
✅ Invertir en pauta publicitaria constante para mover volumen.
✅ Cuidar la imagen del producto con una página y unos creativos de calidad.

Quedo atento a su respuesta. ¡Muchas gracias por su apoyo! 🤝`,

    valida: (v) => `Hola, buen día equipo de ${v.supplier}. Les saluda Saul de la tienda ${STORE_BOLD} (Comunidad NovaProject).
Estamos por iniciar pauta publicitaria escalada para su producto *${v.product}* con ID: *${v.dropi}*.

Quisiera validar con ustedes rápidamente 3 puntos operativos:
1. ¿Tienen stock físico real en bodega para despachos inmediatos?
2. ¿Cuál es su hora de corte para despachar el mismo día las guías generadas?
3. ¿Tienen proyección de restock continuo para este producto en caso de escalar a 15-20 pedidos diarios?

Quedo atento para coordinar y empezar a meterle volumen. Muchas gracias.`,

    anticipo: (v) => `Hola, ${v.name} 👋

Recibimos tu pedido de *${v.product}* en ${STORE_BOLD} y queremos que te llegue sin contratiempos 📦

Debido a nuestras políticas de seguridad y a un historial de altas devoluciones registradas con tu número en la red logística nacional (te compartimos la gráfica oficial adjunta), por protocolo de la bodega no podemos arriesgar el despacho sin un pequeño anticipo de *${peso(v.advance)}* 🔒

Ese valor *se descuenta del total* que pagarás contra entrega: no es un costo adicional, solo la garantía de que tu pedido salga hoy mismo 🚚

Puedes realizar el abono a cualquiera de nuestras dos cuentas:

${LG_ACCOUNTS}

Apenas nos envíes el comprobante por este chat, programamos tu despacho 🤍`,

    reconfirma: (v) => `¡Hola ${v.name}! 👋 Te escribíamos de la tienda ${STORE_BOLD} nuevamente.

Te contactamos brevemente para confirmar los datos y asegurarnos de que tu *Envío Gratis* salga hoy mismo hacia tu dirección. 📦

Recuerda que con nosotros *no arriesgas nada ni pagas por adelantado*: el pago es 100% en efectivo únicamente cuando el repartidor de la transportadora te entregue el paquete en la puerta de tu casa. 💵🤝

¿Nos confirmas por favor con un simple "SÍ" o un "OK" si todo está correcto para proceder con el despacho? ¡Quedamos atentos! ✨`,

    reintento: (v) => `¡Saludos, ${v.name}! ☀️

Te escribimos de la tienda ${STORE_BOLD}.

Queremos informarle que su *${v.product}* ya salió nuevamente en ruta de reparto para ser entregada hoy en la dirección confirmada. 🚚📦

Tuvimos un intento de entrega anterior donde no fue posible ubicarl@, por lo que le pedimos el favor de *dejar encargado a alguien con el dinero en efectivo* o estar muy atent@ a su celular por si el repartidor de la transportadora se comunica.

Cualquier novedad, quedamos muy atentos por este medio. ¡Que tenga un excelente día! 😊`,

    flete: (v) => `¡Hola, ${v.name}! Te saludamos de ${STORE_BOLD}

Te comparto la captura de la transportadora: al ser una zona aérea especial hacia ${v.city}, el flete nos sale en ${peso(v.shipping)}, por lo que lastimosamente nos es imposible enviarlo con flete gratis total. 🥺

Queremos que no te quedes sin tu *${v.product}*, nosotros asumimos la mayor parte del envío si tú nos apoyas con un anticipo de ${peso(v.advance)} parte del flete, y el producto lo pagas en efectivo al recibir en tu casa. 🚚✨

${LG_ACCOUNTS}

¿Te gustaría transferir el flete para despacharte de una vez, o prefieres que cancelemos la orden? ¡Lo que tú decidas lo entendemos con el mayor gusto! 🤍`,

    enruta: (v) => `Hola, ${v.name}, *tu pedido ${v.product} ya se encuentra en ruta de entrega*.

📦 Al ser un servicio *contra entrega*, recuerda estar pendiente de la llegada del repartidor o dejar el dinero listo con un conocido para asegurar una entrega rápida.

¡Agradecemos mucho tu colaboración! ✨`,

    entregado: (v) => `¡Hola, ${v.name}! 👋 Espero que estés teniendo un excelente día.

Te escribimos desde ${STORE_BOLD} porque vimos que ya recibiste tu pedido. ¡Nos alegra mucho que ya esté contigo! Queremos que le saques el mayor provecho desde hoy.
¡Gracias de corazón por confiar en nosotros! 🤍

${v.manual ? `Como un detalle especial por tu compra, te comparto este manual exclusivo que preparamos para ti:
📄 Tu guía adjunta: *${v.manualTitle}*. (Una guía valorada por especialistas, exclusiva para ti).
💡 Un consejo clave: Échale un vistazo antes de empezar a usar tu producto; ahí tienes las pautas exactas para ver los mejores resultados paso a paso.

` : ''}Si más adelante quieres pedir algo nuevo para ti o recomendárselo a alguien, puedes ver todo nuestro catálogo aquí:
🔗 ${LG_CATALOG}

Cualquier duda que tengas sobre cómo usarlo, escríbeme por aquí, me llamo Saul y con gusto te ayudo. ¡Que lo disfrutes mucho! ✨

Equipo ${LG_STORE.replace('🍃', '🍃 *')}*`,

    oficina: (v) => `Saludos desde ${STORE_BOLD}, le informamos que su pedido de *${v.product}* ya se encuentra en la oficina para ser reclamado.
Por favor, nos informe cuando lo obtenga${v.manual ? ` para enviarle el ${v.manualTitle}` : ''}.`,

    infografia: (v) => `¡Hola! 👋 Te saludamos de ${STORE_BOLD}.

Para que le saques el máximo provecho a tu producto y veas resultados más rápido, te compartimos esta *infografía visual* con el paso a paso exacto para aplicar tu *${v.product}* en tu rutina. 🌙✨

¡Guárdala en tu celular para tenerla a la mano! Cualquier duda con el uso, con gusto te asesoramos por aquí. 😊`,

    tercero: (v) => `Hola, ${v.name}. Intentamos comunicarnos contigo por llamada para autorizar el despacho de tu *${v.product}* con Envío Gratis. 📦

Por políticas de seguridad y alta demanda, si no recibimos tu confirmación el sistema cancelará tu orden automáticamente y cederemos la unidad a otro cliente.

Si aún deseas recibirla en ${v.city} y pagar contra entrega, por favor respóndenos a este mensaje con un 'CONFIRMO'. Quedamos atentos.`,

    confirmado: (v) => `Gracias por confirmar. Tu paquete ya va rumbo a empaque. 📦

${v.gift ? 'Como agradecimiento, en cuanto recibas tu producto, avísanos por aquí para enviarte el *obsequio* adjunto ✨\n\n' : ''}¡Quedamos muy atentos a tu entrega!`,

    pedido: (v) => `¡Hola ${v.name}! 🌟

Acabamos de recibir tu compra del producto -- *${v.product}* -- en nuestra tienda ${STORE_BOLD}

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

Te confirmamos que tu pedido de la *${v.product}* ya fue empacado y entregado a la transportadora. 📦✨

🚚 *Número de Guía*: ${v.guide}
🚛 *Transportadora*: ${String(v.carrier || '').toLocaleUpperCase('es-CO')}
🔗 *Rastreo*: Puedes consultar el estado de tu paquete directamente en la página web de la transportadora con ese número de guía.

El tiempo estimado de entrega es de *${LG_DAYS} días hábiles*.
💵 Recuerda tener listos los *${peso(v.price)}* en efectivo para cuando el repartidor llegue a tu dirección (${v.address}).

¡Cualquier duda que tengas durante el camino, nos puedes escribir por aquí! Que tengas un excelente día. 😊`,
  };

  const lgMessage = (k, values) => TEXT[lgTemplate(k).k](values || {});

  core.logistics = { LG_STORE, LG_DAYS, LG_CATALOG, LG_NEQUI, LG_BANK, LG_ACCOUNTS, LG_STAGES, LG_PARTS, LG_TEMPLATES, lgTemplate, lgMoney, lgMoneyText, lgPhone, lgForm, lgValues, lgPrefill, lgFromCand, lgMessage };
})();
