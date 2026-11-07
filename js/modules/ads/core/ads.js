// Desarrollo → Meta Ads: guía paso a paso para crear la campaña en el Administrador de anuncios, por estrategia
// (AD_STRATEGIES: ABO lista; CBO pendiente). ABO: 1 campaña → 4 conjuntos → 1 anuncio (1 video) por conjunto.
// Contenido de los pasos y ayudas. Sin DOM.
// Mismo formato de pasos que modules/landing/core/landing.js (t, where, p, items, prompts, tool, warn, tip) más:
//   level  = nivel del Administrador donde se hace el paso ('camp' | 'set' | 'ad' | 'all');
//   fields = [campo, valor] tal como aparecen en Meta.
// Nada sensible aquí (correos, contraseñas, NIT): solo nombres de los activos.
(() => {
  const core = globalThis.PYL.core;

  // Única fuente de los números y nombres de la campaña.
  const ADS = {
    sets: 4,                 // conjuntos por campaña (1 anuncio y 1 video en cada uno)
    daily: 30000,            // presupuesto diario por conjunto, en COP (Meta puede gastar un poco más)
    startHour: 5,            // hora de inicio: 5:00 a. m. del día siguiente
    copies: 3,               // textos principales, títulos y descripciones por anuncio
    pixel: 'PIXEL VN',
    page: 'VidanovaStore',
    ig: 'VidanovaStoreOficial',
    store: 'vidanovastore.com',
  };

  // Ciudades que excluyo en Audiencia → Lugares, por departamento y escritas tal como salen en Meta.
  const EXCLUDED = [
    ['Antioquia', ['Amagá', 'Amalfi', 'Santa Fe de Antioquia', 'Caicedo', 'Ciudad Bolívar (Antioquia)', 'Guatapé', 'San Andrés de Cuerquia', 'Santa Fe De Antioquia', 'Santuario', 'Tarso']],
    ['Arauca', ['Arauca', 'Arauquita', 'Cravo', 'Tame', 'Valparaíso']],
    ['Caquetá', ['Albania (Caquetá)', 'Belén', 'Belén Del Andaquí', 'Belén De Los Andaquíes', 'Morelia (Caquetá)', 'Puerto Rico (Caquetá)', 'Puerto Solano', 'San José del Fragua', 'San Vicente De Caguán', 'San Vicente del Caguán', 'Solano', 'Valparaíso']],
    ['Chocó', ['Bahía Solano']],
    ['Huila', ['Isnos', 'San José De Isnos']],
    ['Magdalena', ['Nueva Granada (Magdalena)']],
    ['Meta', ['Guamal']],
    ['Norte de Santander', ['San José De Cúcuta']],
    ['Putumayo', ['La Hormiga', 'Puerto Asís', 'Puerto Guzmán', 'Villagarzón']],
    ['Risaralda', ['Morelia', 'Caldas']],
    ['San Andrés y Providencia', ['San Andrés (San Andrés y Providencia)', 'Providencia']],
    ['Santander', ['Carcasí']],
    ['Sucre', ['El Francés', 'El Islote', 'El Roble']],
    ['Tolima', ['Venadillo']],
    ['Casanare', ['El Yopal', 'Valparaíso', 'Villanueva (Casanare)', 'Yopalito', 'Yopal']],
    ['Cundinamarca', ['Chipaque', 'Cogua', 'Fómeque', 'Pacho', 'Quebradanegra', 'Quito']],
    ['Boyacá', ['Jericó', 'Nobsa']],
  ];

  const LEVELS = { camp: 'Campaña', set: 'Conjunto de anuncios', ad: 'Anuncio', all: 'Toda la campaña' };
  const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const money = (v) => '$' + Number(v).toLocaleString('es-CO');
  // Ofertas de Releasit tal como están en la landing (modules/landing/core/landing.js): "2 unidades con 20% de descuento y 3 con 30%".
  const OFFERS = core.landing.LANDING.offers.filter((o) => o.pct)
    .map((o, i) => (i ? `${o.qty} con ${o.pct}%` : `${o.qty} unidades con ${o.pct}% de descuento`)).join(' y ');

  // Estrategia ABO: los pasos tal como los hago en el Administrador.
  const ABO_STEPS = [
    { k: 'prep', t: 'Antes de empezar', where: 'Desarrollo → Landing en Shopify', level: null,
      p: ['Solo creo la campaña cuando la página ya está publicada y tengo los creativos listos.'],
      items: [
        { k: 'landing', t: ['La ', { b: 'landing en Shopify' }, ' está lista y pasé la revisión final (pedido de prueba incluido).'] },
        { k: 'videos', t: ['Tengo los ', { b: `${ADS.sets} videos` }, ': UGC propios o descargados de TikTok Shop, DropKiller, Kalodata, etc.'] },
        { k: 'url', t: ['Tengo la ', { b: 'URL de la product page' }, ' (no la del home).'] },
      ],
      tool: ['url'] },

    { k: 'camp', t: 'Campaña: tipo, nombre y ABO', where: 'Meta Ads → Todas las herramientas → Administrador de anuncios', level: 'camp',
      p: ['El Administrador de anuncios es donde veo todas las métricas y manejo las campañas. Primero el tipo y el objetivo; al darle Siguiente, el nombre y la estrategia de presupuesto.'],
      fields: [['Elige un tipo de compra', 'Subasta'], ['Elige un objetivo de campaña', 'Ventas'], ['Nombre de la campaña', 'DÍA MES - PRODUCTO'], ['Estrategia de presupuesto', 'Presupuesto del conjunto de anuncios (ABO)'], ['Compartir parte de mi presupuesto con otros conjuntos de anuncios', 'Desactivado']],
      ordered: true,
      items: [
        { k: 'side', t: ['En Meta Ads abro el ', { b: 'panel lateral' }, ' y entro a ', { b: 'Todas las herramientas' }, '.'] },
        { k: 'admin', t: ['Doy clic en ', { b: 'Administrador de anuncios' }, '.'] },
        { k: 'create', t: ['Le doy al botón ', { b: 'Crear' }, '.'] },
        { k: 'buy', t: [{ b: 'Elige un tipo de compra' }, ': ', { b: 'Subasta' }, '.'] },
        { k: 'obj', t: [{ b: 'Elige un objetivo de campaña' }, ': ', { b: 'Ventas' }, ' y le doy a Siguiente.'] },
        { k: 'name', t: [{ b: 'Nombre de la campaña' }, ' con el formato ', { b: 'día mes - primer nombre del producto' }, ', con la fecha de ', { b: 'mañana' }, ' (el día que arranca; ej. creada el 02 NOV → 03 NOV - MAGNESIUM).'] },
        { k: 'abo', t: ['En ', { b: 'Presupuesto → Estrategia de presupuesto' }, ' marco ', { b: 'Presupuesto del conjunto de anuncios' }, ' (ABO).'] },
        { k: 'share', t: ['Dejo ', { b: 'desactivado' }, ' ', { b: '"Compartir parte de mi presupuesto con otros conjuntos de anuncios"' }, ': en testeo cada conjunto gasta solo su presupuesto.'] },
      ],
      tool: ['name', 'abo'] },

    { k: 'conv', t: 'Conjunto 1: conversión', where: 'Panel izquierdo → conjunto de anuncios', level: 'set',
      p: ['Paso al conjunto de anuncios en el panel izquierdo. Armo el conjunto 1 completo y después lo duplico.'],
      fields: [['Nombre del conjunto de anuncios', '1'], ['Ubicación de la conversión', 'Sitio web'], ['Objetivo de rendimiento', 'Maximizar el número de conversiones'], ['Conjunto de datos', ADS.pixel], ['Evento de conversión', 'Compra']],
      ordered: true,
      items: [
        { k: 'name', t: [{ b: 'Nombre del conjunto de anuncios' }, ': ', { b: '1' }, '.'] },
        { k: 'where', t: [{ b: 'Ubicación de la conversión' }, ': ', { b: 'Sitio web' }, '.'] },
        { k: 'goal', t: [{ b: 'Objetivo de rendimiento' }, ': ', { b: 'Maximizar el número de conversiones' }, '.'] },
        { k: 'pixel', t: [{ b: 'Conjunto de datos' }, ': mi pixel, ', { b: ADS.pixel }, '.'] },
        { k: 'event', t: [{ b: 'Evento de conversión' }, ': ', { b: 'Compra' }, '.'] },
      ],
      tip: ['Si mi pixel no aparece en "Conjunto de datos", está mal conectado a la tienda: sin pixel, Meta no sabe quién compra.'] },

    { k: 'budget', t: 'Conjunto 1: presupuesto y audiencia', where: 'Presupuesto y calendario · Audiencia', level: 'set',
      copyOnly: ['Presupuesto'],
      fields: [['Estrategia de presupuesto', 'Presupuesto diario'], ['Presupuesto', money(ADS.daily), ADS.daily], ['Fecha de inicio', 'Mañana'], ['Hora', `${ADS.startHour}:00 a. m.`], ['Lugares', 'Con las ciudades excluidas']],
      ordered: true,
      items: [
        { k: 'daily', t: [{ b: 'Estrategia de presupuesto' }, ': ', { b: 'Presupuesto diario' }, ' de ', { b: money(ADS.daily) }, '.'] },
        { k: 'date', t: [{ b: 'Fecha de inicio' }, ': el ', { b: 'día siguiente' }, ' a la creación.'] },
        { k: 'hour', t: [{ b: 'Hora' }, ': ', { b: `${ADS.startHour}:00 a. m.` }, '.'] },
        { k: 'places', t: ['En ', { b: 'Audiencia → Lugares' }, ' reviso que estén las ', { b: 'ciudades que excluyo' }, ', para que Meta no me traiga clientes de allá.'],
          more: { t: 'Ver ciudades que excluyo', groups: EXCLUDED } },
        { k: 'next', t: ['Le doy a ', { b: 'Siguiente' }, ' para pasar al anuncio.'] },
      ],
      tool: ['start'],
      tip: [`Testeo con ${money(ADS.daily)} por conjunto al día. Meta puede gastar un poco más, y según las métricas le voy inyectando presupuesto. Los cortes de 20K, 30K y 40K de NovaSociety se leen por conjunto con su gasto acumulado: los evalúo en el `, { b: 'Simulador' }, '.'] },

    { k: 'ad', t: 'Anuncio 1: identidad, videos y textos', where: 'Nivel de anuncio', level: 'ad',
      p: [`Subo los ${ADS.sets} videos de una vez: así ya quedan en la biblioteca para los otros conjuntos. Le doy a Meta ${ADS.copies} opciones de cada texto para que use la que mejor funcione.`],
      warn: ['Nada de contenido generado por IA de Meta: solo las mejoras del propio video.'],
      copyOnly: ['Nombre del anuncio'],
      fields: [['Nombre del anuncio', '1'], ['Página de Facebook', ADS.page], ['Cuenta de Instagram', ADS.ig], ['Destino principal', 'Sitio web'], ['URL del sitio web', 'La de la product page'], ['Texto principal', `${ADS.copies} copies (Añadir opción de texto)`], ['Título', `${ADS.copies} títulos`], ['Descripción', `${ADS.copies} descripciones`], ['Llamada a la acción', 'Comprar']],
      ordered: true,
      items: [
        { k: 'name', t: [{ b: 'Nombre del anuncio' }, ': ', { b: '1' }, ' (el mismo número de su conjunto).'] },
        { k: 'fb', t: [{ b: 'Identidad → Página de Facebook' }, ': ', { b: ADS.page }, '.'] },
        { k: 'ig', t: [{ b: 'Cuenta de Instagram' }, ': ', { b: ADS.ig }, '.'] },
        { k: 'dest', t: [{ b: 'Destino principal' }, ': ', { b: 'Sitio web' }, '.'] },
        { k: 'url', t: [{ b: 'URL del sitio web' }, ': la de la ', { b: 'product page' }, ', nunca el home.'] },
        { k: 'conf', t: ['En ', { b: 'Contenido del anuncio' }, ' le doy a ', { b: 'Configurar contenido → Anuncio con video' }, '.'] },
        { k: 'up', t: ['Con el botón ', { b: 'Subir' }, ' cargo los ', { b: `${ADS.sets} videos` }, '.'] },
        { k: 'pick', t: ['Selecciono ', { b: 'solo el video 1' }, ' (no deja elegir todos a la vez) y le doy a ', { b: 'Siguiente' }, '.'] },
        { k: 'ai', t: [{ b: 'Desactivo' }, ' todo el contenido y las sugerencias de IA de Meta.'] },
        { k: 'fx', t: ['Solo dejo las ', { b: 'mejoras del video' }, ': retoques, mejoras en el texto y en el llamado a la acción. Nada más.'] },
        { k: 'close', t: ['Cierro ese apartado.'] },
        { k: 'gen', t: ['Genero los textos con el prompt de abajo.'] },
        { k: 'copy', t: [{ b: 'Texto principal' }, ': pego el copy 1 y con ', { b: '"Añadir opción de texto"' }, ' pego el 2 y el 3.'] },
        { k: 'title', t: [{ b: 'Título' }, ': los 3 títulos (', { b: '"Añadir opción de título"' }, ').'] },
        { k: 'desc', t: [{ b: 'Descripción' }, ': las 3 descripciones (', { b: '"Añadir opción de descripción"' }, ').'] },
        { k: 'cta', t: [{ b: 'Llamada a la acción' }, ': ', { b: 'Comprar' }, '.'] },
      ],
      prompts: [
        { k: 'copies', t: `Copies para Meta (${ADS.copies} textos, títulos y descripciones)`, text: `Actúa como un copywriter experto en anuncios de Meta (Facebook e Instagram) para e-commerce en Colombia con pago contra entrega.\nProducto: {producto}\nPrecio: {precio}\nPágina del producto: [pega aquí los beneficios y el modo de uso que escribió la skill]\nOferta: pago contra entrega, envío a toda Colombia, ${OFFERS} [ajusta si hay regalo o garantía]\n\nPrimero define tú el cliente ideal con lo que sabes del producto: quién lo compra y qué problema quiere resolver, en 2 líneas. Escribe todos los textos pensando en esa persona.\n\nDespués escríbeme ${ADS.copies} textos principales, cada uno con un ángulo distinto:\n1. Dolor: abre con el problema del día a día, en palabras del cliente.\n2. Resultado: abre con cómo se siente la vida con el producto.\n3. Oferta y confianza: abre con la oferta y el pago contra entrega.\n\nReglas de cada texto:\n- La primera línea es el gancho: tiene que enganchar antes del "Ver más" (máximo 125 caracteres).\n- Luego 3 beneficios cortos, uno por línea, cada uno con un emoji.\n- Cierra con "Paga al recibir" y "Envío a toda Colombia" y un llamado a comprar.\n- Usa emojis sin saturar, sobre todo al principio de las frases, para llamar la atención.\n- Español de Colombia, tuteando, frases cortas y simples.\n- Cumple las políticas de Meta: no prometas curar ni tratar enfermedades, no uses antes/después del cuerpo y no le digas a la persona lo que tiene (nada de "¿Sufres de…?"). Solo lo que dice la etiqueta.\n- No inventes cifras, reseñas ni estudios.\n\nDespués dame ${ADS.copies} títulos (máximo 40 caracteres, con urgencia u oferta, ej. ENVÍO GRATIS SOLO HOY) y ${ADS.copies} descripciones (máximo 30 caracteres, un dato de confianza real, ej. Paga al recibir).\nEntrégalo en bloques separados (Cliente ideal, Texto 1, Texto 2, Texto 3, Títulos, Descripciones) para copiarlos directo.`,
          tip: ['Lo lanzo en el mismo chat donde armé la página: así la IA ya conoce el producto. Reviso que ', { b: 'no prometa curar' }, ' nada: eso dispara el CPM o hace que rechacen el anuncio.'] },
      ] },

    { k: 'dup', t: `Duplicar a ${ADS.sets} conjuntos`, where: 'Panel izquierdo → conjunto 1 → Duplicar', level: 'all',
      p: [`El conjunto 1 ya está completo. Lo duplico ${ADS.sets - 1} veces: cada copia queda con el mismo presupuesto, calendario y textos. Solo cambio el nombre y el video.`],
      items: [2, 3, 4].map((n) => ({ k: 's' + n, t: [`"1 - Copia" → conjunto `, { b: String(n) }, ', anuncio ', { b: String(n) }, ' y ', { b: `video ${n}` }, ' (Siguiente, Siguiente, igual que en el anuncio 1).'] })),
      tool: ['dup'],
      tip: ['Si se me pasa cambiar el video, dos conjuntos prueban el mismo creativo y pierdo un testeo.'] },

    { k: 'pub', t: 'Publicar', where: 'Arriba a la izquierda → Cerrar · Arriba a la derecha → Revisar y publicar', level: 'all',
      warn: ['No le doy al botón verde ', { b: '"Publicar"' }, ' que sale abajo.'],
      ordered: true,
      items: [
        { k: 'close', t: ['Cierro todo desde ', { b: 'arriba a la izquierda' }, ' y en la ventanita le doy a ', { b: 'Cerrar' }, ': la campaña queda como ', { b: 'borrador' }, '.'] },
        { k: 'review', t: ['Arriba a la derecha le doy a ', { b: `"Revisar y publicar (${1 + ADS.sets * 2})"` }, '.'] },
        { k: 'pub', t: ['En la ventana que sale, ahí sí: ', { b: 'Publicar' }, '.'] },
        { k: 'sched', t: ['La campaña queda ', { b: 'programada' }, ' para mañana a las ', { b: `${ADS.startHour}:00 a. m.` }] },
        { k: 'mail', t: ['Minutos después me llega un ', { b: 'correo' }, ' que dice si Meta aprobó o rechazó los anuncios.'] },
      ],
      tool: ['publish'],
      tip: ['Desde mañana leo cada conjunto con los cortes de NovaSociety en el Simulador: la cadena es CPM → CPC → CPPI → CPA. CPM máximo en Meta: ', { b: '$20.000' }, '.'] },
  ];

  // Nombre de la campaña: "03 NOV - MAGNESIUM" (día y mes de mañana, cuando arranca, + primer nombre del producto en mayúsculas).
  function campaignName(product, date = new Date()) {
    const t = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    const d = String(t.getDate()).padStart(2, '0') + ' ' + MONTHS[t.getMonth()];
    return d + ' - ' + ((product || '').trim().split(/\s+/)[0].toUpperCase() || 'PRODUCTO');
  }

  // Parte fija de la URL de la product page: solo cambia lo que va después (el identificador de URL de Shopify).
  const URL_BASE = `https://${ADS.store}/products/`;

  // Identificador limpio: sin tildes, en minúsculas y sin lo demás de la URL si pegaron la dirección completa.
  function slugify(text) {
    return String(text || '').trim()
      .replace(/^.*\/products\//i, '').replace(/[?#/].*$/, '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  // Identificador por defecto: el primer nombre del producto ("Magnesium Complex" → magnesium).
  const defaultSlug = (product) => slugify((product || '').trim().split(/\s+/)[0]);

  // Lo que se deriva para pintar: nombre, fecha, presupuesto total, elementos a publicar y la URL.
  // st.slug = identificador escrito a mano; vacío → el primer nombre del producto.
  function adsView(st, product, date = new Date()) {
    const name = (product || '').trim();
    const auto = defaultSlug(name), slug = slugify(st.slug) || auto;
    return {
      product: name, name: campaignName(name, date),
      daily: ADS.daily, total: ADS.daily * ADS.sets, sets: ADS.sets, items: 1 + ADS.sets * 2,
      slug, slugAuto: auto,
    };
  }

  // Estrategias para montar la campaña (selector de la sub-pestaña). steps = null → "pronto": aún no está documentada.
  // map = muestra el mapa 1 campaña → conjunto 1 → duplicados (propio de ABO).
  const AD_STRATEGIES = [
    { k: 'abo', t: 'ABO · presupuesto por conjunto', icon: '🧪', map: true, steps: ABO_STEPS,
      d: `Yo decido cuánto recibe cada conjunto. 1 campaña → ${ADS.sets} conjuntos → 1 anuncio con su video en cada uno.`,
      h: 'Campaña de testeo ABO', sub: `${ADS.sets} conjuntos con ${money(ADS.daily)} al día cada uno. Toco un paso para ver qué pongo en cada campo.` },
    { k: 'cbo', t: 'CBO · presupuesto de campaña', icon: '⚖️', map: false, steps: null,
      d: 'Pongo un presupuesto para toda la campaña y Meta se lo da a los anuncios que mejor van.',
      h: 'Campaña CBO', sub: 'El paso a paso de esta estrategia todavía no está documentado.' },
  ];
  const strategy = (k) => AD_STRATEGIES.find((s) => s.k === k) || AD_STRATEGIES[0];

  core.ads = { ADS, EXCLUDED, LEVELS, ABO_STEPS, AD_STRATEGIES, URL_BASE, strategy, campaignName, slugify, defaultSlug, adsView };
})();
