// Búsqueda de productos (módulo 4 de NovaSociety + método VDO de DropKiller).
// Umbrales, contenido del flujograma y evaluación de un candidato. Sin DOM: la UI pinta lo que devuelve.
// Los textos son segmentos: string = texto plano, { b } = negrita.
(() => {
  const core = globalThis.PYL.core;
  const n = (v) => Number(v).toLocaleString('es-CO');

  // Única fuente de los números de la búsqueda. Ventas = sumando todos los proveedores del producto.
  const LIMITS = {
    total: { min: 100, ideal: 2000, max: 3000 }, // ventas totales: validación 100–2.000; 3.000 es el límite
    v7: { min: 10, max: 100 },                   // ventas de los últimos 7 días
    v30: { min: 100, max: 500 },                 // ventas de los últimos 30 días
    prov: { ideal: 5, max: 10 },                 // proveedores en Dropi
    advertisers: 5,                              // menos de 5 anunciantes activos
    adDays: 7,                                   // anuncio activo más de 7 días = rentable
    stock: 80,                                   // stock mínimo del proveedor
    restock: 5,                                  // veces restockeado, máximo
    creatives: 6,                                // creativos mínimos para testear
    months: '3 a 6',                             // fecha de creación: últimos meses
    maxMonths: 6,
    // Estrategia por proveedor: ventas máximas del producto (solo ese proveedor) y cuántos analizo.
    byProv: { v7: 50, v30: 500, analyze: { min: 15, max: 20 } },
  };

  // Ciclo de vida por ventas totales (hasta = inclusive). Sin huecos entre etapas.
  const STAGES = [
    { k: 'nuevo', name: 'Nuevo', upTo: LIMITS.total.min - 1, tone: 'y', risk: 'Alto: faltan datos',
      act: ['Todavía no hay datos. Lo guardo y lo vuelvo a mirar en unos días.'] },
    { k: 'validacion', name: 'Validación', upTo: LIMITS.total.ideal, tone: 'g', risk: 'Bajo: datos sólidos',
      act: [{ b: 'Zona ideal para testear.' }, ' Aquí hay que ser veloz: entro antes de que alguien lo escale.'] },
    { k: 'escalado', name: 'Escalado', upTo: 6000, tone: 'o', risk: 'Ya hay un competidor fuerte',
      act: ['Alguien ya lo está escalando y el proveedor tuvo que reabastecer. ', { b: 'No lo testeo' }, ` (solo hasta ${n(LIMITS.total.max)} si las ventas de 7 días siguen subiendo y hay pocos proveedores).`] },
    { k: 'saturado', name: 'Saturado', upTo: 15000, tone: 'r', risk: 'Muy alto: monopolios',
      act: ['Demasiados vendiéndolo: gana el que más plata quema en anuncios. ', { b: 'No lo testeo.' }] },
    { k: 'quemado', name: 'Quemado', upTo: Infinity, tone: 'r', risk: 'Extremo',
      act: ['Final del ciclo. ', { b: 'No lo testeo:' }, ' busco otro producto.'] },
  ];

  const stage = (total) => (total == null || !isFinite(total) || total < 0 ? null : STAGES.find((s) => total <= s.upTo));

  // Rango "desde–hasta" de cada etapa, para las etiquetas de la barra.
  const stageRange = (s) => {
    const i = STAGES.indexOf(s), from = i === 0 ? 0 : STAGES[i - 1].upTo + 1;
    return s.upTo === Infinity ? `+${n(from - 1)}` : `${n(from)} – ${n(s.upTo)}`;
  };

  // Pirámide del producto ganador (versión completa e interactiva). Arriba = menor responsabilidad.
  // Cada parte: p = viñetas; yes/no = ejemplo que sí / que no; ex = ejemplo de la oferta.
  const PYRAMID = [
    { k: 'pag', pct: 20, t: 'Landing', level: 'Menor responsabilidad', groups: [{ t: 'Landing', items: [
      { k: 'dolores', t: 'Dolores', p: ['La página arranca por el problema que le arde al cliente, dicho con sus palabras.'] },
      { k: 'friccion', t: 'Anti-fricción', p: ['Formulario corto y pago contra entrega.', [{ b: 'Que no exista fricción' }, ': nada que lo haga dudar o salirse.']] },
      { k: 'imagenes', t: 'Buenas imágenes', p: ['Fotos claras del producto en uso, mostrando el resultado.'] },
      { k: 'testimonios', t: 'Testimonios', p: ['Reales y de gente parecida al cliente: bajan la desconfianza.'] },
    ] }] },
    { k: 'cre', pct: 30, t: 'Creativos', level: 'Media responsabilidad', groups: [{ t: 'Creativos', items: [
      { k: 'luz', t: 'Iluminación', p: ['El producto se ve bien: luz clara, nada oscuro ni borroso.'] },
      { k: 'edicion', t: 'Edición', p: ['Dinámica: cortes rápidos, textos en pantalla y buen ritmo.'] },
      { k: 'hook', t: 'Buen hook', p: [['El gancho va en los ', { b: 'primeros 3 segundos' }, ': frena el scroll.'], 'Si el CPM sale caro, la solución son creativos nuevos con mejor hook.'] },
      { k: 'guion', t: 'Guión', p: ['Persuasivo: problema → solución → prueba → oferta.'] },
      { k: 'validacion', t: 'Validación', p: ['Antes de grabar miro qué ya funciona:', [{ b: 'Kalodata' }, ' → ventas.'], [{ b: 'TikTok' }, ' → interacción.']] },
    ] }] },
    { k: 'pro', pct: 50, t: 'Producto y oferta', level: 'Mayor responsabilidad', groups: [
      { t: 'Producto', numbered: true, items: [
        { k: 'msp', t: 'MSP', p: ['Que resuelva un problema que la gente sufre de verdad.'],
          yes: { t: 'Cápsulas para la ciática', li: ['Dolor que no deja dormir ni caminar', 'Ya lo sufre: no hay que convencerlo', 'Está buscando solución activamente'] },
          no: { t: 'Espátula de cocina', li: ['Nadie pierde el sueño por voltear un huevo', 'Es comodidad, no dolor', 'Compra planeada, nunca por impulso'] } },
        { k: 'valor', t: 'Percepción de valor', p: ['Que se vea caro y valga lo que cobro.'],
          yes: { t: 'Cepillo secador', li: ['Se ve aparato: tiene peso y volumen', 'Reemplaza secador, cepillo y plancha', 'La caja comunica precio alto'] },
          no: { t: 'Frasco de sérum', li: ['Frasco pequeño se lee como poco producto', 'Hay que explicar por qué vale lo que vale', 'Sin volumen visual no hay valor percibido'] } },
        { k: 'competencia', t: 'Competencia', p: [['Sumo las ventas de ', { b: 'todos los ID' }, ' del producto, no de un solo proveedor.'], ['Ventas 7 días: máximo ', { b: n(LIMITS.v7.max) }, '. Ventas totales: ', { b: `${n(LIMITS.total.min)} – ${n(LIMITS.total.ideal)}` }, '.']],
          yes: { t: 'Sopladora larga y aspirado doble', li: ['12 ventas en 7 días', '32 en 30 días', '57 totales: nadie lo está escalando'] },
          no: { t: 'Revitalizador Viresta', li: ['726 ventas en 7 días', '4.966 en 30 días', '13.119 totales: masificado'] } },
        { k: 'wow', t: 'Efecto WOW', p: ['Que sorprenda y dé ganas de comentarlo.'],
          yes: { t: 'Pistola de pintura', li: ['Antes y después visible en 10 segundos', 'Reemplaza brocha y rodillo por completo', 'Da ganas de mostrárselo a alguien'] },
          no: { t: 'Juego de cuchillos', li: ['Todo el mundo ya tiene uno', 'No hay nada que demostrar', 'No sorprende: no genera comentario'] } },
      ] },
      { t: 'Oferta', items: [
        { k: 'descuento', t: 'Descuento', p: ['El precio tachado ancla cuánto vale de verdad', '50% se entiende sin calcular nada', 'Da la razón para comprar hoy'], ex: 'Descuento del 50%: pague 1 lleve 2 a $99.900' },
        { k: 'urgencia', t: 'Urgencia', p: ['Mata el "lo pienso y después vuelvo"', 'Convierte interés en decisión'], ex: '¡Promoción por tiempo limitado! Últimas unidades disponibles al precio de hoy' },
        { k: 'obsequio', t: 'Obsequio', p: ['Valor percibido alto a costo casi cero', 'Digital: no toca el margen', 'El valor del bono infla el precio total de la oferta'], ex: 'Bono gratis por WhatsApp: guía PDF "7 alimentos que potencian tu colágeno"' },
        { k: '2x1', t: '2x1', p: [['Sube el ticket (', { b: 'AOV' }, ') sin subir el CPA'], 'El cliente siente que ganó, no que gastó', 'Un solo envío para dos unidades: más margen'], ex: 'Pague 1 lleve 2 a $99.900 + envío gratis' },
      ] },
    ] },
  ];

  // Estrategia VDO: las tres reglas antes de encender una campaña.
  const VDO = [
    { k: 'V', t: 'Validación', rule: [`Entre `, { b: `${n(LIMITS.total.min)} y ${n(LIMITS.total.ideal)} ventas totales` }, ', sumando todos los proveedores.'],
      avoid: `Más de ${n(LIMITS.total.ideal)}: ya está en escalado y alguien lo domina.` },
    { k: 'D', t: 'Demanda', rule: ['Menos de ', { b: `${LIMITS.prov.ideal} proveedores` }, ` (máximo ${LIMITS.prov.max}, y ya es mucho). Con uno solo es candidato a privatizar.`],
      avoid: 'Decenas de proveedores: cientos de dropshippers vendiendo lo mismo.' },
    { k: 'O', t: 'Oferta', rule: ['Menos de ', { b: `${LIMITS.advertisers} anunciantes activos` }, ' (anunciantes, no anuncios). Miro si mandan a landing o a WhatsApp.'],
      avoid: 'Copiar el mismo ángulo: creo ángulos para públicos distintos.' },
  ];

  // Estrategias de búsqueda: dos caminos para llegar a un candidato. La VDO arranca por las ventas
  // en validación; la de proveedor arranca por el catálogo de proveedores confiables.
  const STRATEGIES = [
    { k: 'vdo', t: 'Estrategia VDO', icon: '🎯', d: 'Parto de productos que ya están en validación y reviso que no estén saturados.' },
    { k: 'prov', t: 'Estrategia por proveedor', icon: '🏭', d: 'Parto de proveedores confiables y busco productos que casi nadie está vendiendo.' },
  ];

  // Estrategia por proveedor: 4 fases. out = lo que me queda al terminar la fase (embudo).
  const BP = LIMITS.byProv;
  const FASTMOSS = 'https://www.fastmoss.com/es';
  const BY_PROVIDER = {
    suppliers: [
      { t: 'Botania' }, { t: 'Nibresma' }, { t: 'Bodega de Belleza Int' },
    ],
    allies: [{ t: 'Goldbox' }],
    steps: [
      { k: 'filtrar', icon: '🏭', t: 'Filtrar por proveedor', where: 'DropKiller → Productos → Proveedor', out: 'Un proveedor',
        p: ['Entro a ', { b: 'DropKiller' }, ', en la sección de ', { b: 'Productos' }, ', y escribo uno de estos proveedores. Veo todo su catálogo.'] },
      { k: 'analizar', icon: '🔎', t: 'Analizar productos', where: 'Catálogo del proveedor en DropKiller', out: `${BP.analyze.min} a ${BP.analyze.max} productos`,
        p: ['Busco productos ', { b: 'de interés' }, ' que casi nadie está vendiendo todavía. Me quedo con una lista corta.'],
        rules: [
          { big: '0', unit: 'ventas', t: 'Sin ventas, pero de interés', d: ['Productos que ', { b: 'nadie ha empezado a vender' }, ' y que me llaman la atención.'] },
          { big: `< ${n(BP.v7)}`, unit: 'en 7 días', t: 'Cuando voy a testear', d: ['Menos de ', { b: `${n(BP.v7)} ventas` }, ' en los últimos 7 días.'] },
          { big: `< ${n(BP.v30)}`, unit: 'en 30 días', t: 'Cuando voy a testear', d: ['Y menos de ', { b: `${n(BP.v30)} ventas` }, ' en los últimos 30 días.'] },
        ],
        note: ['Analizo de ', { b: `${BP.analyze.min} a ${BP.analyze.max} productos` }, ' antes de pasar a validar.'] },
      { k: 'validar', icon: '🌎', t: 'Validar en otros países', where: 'FastMoss · TikTok Shop en más de 20 países', out: 'Los validados afuera',
        p: ['De mi lista, miro cuáles ', { b: 'ya se venden en otros países' }, ' (Estados Unidos, México, Reino Unido…). En ', { a: 'FastMoss', href: FASTMOSS }, ' veo sus ventas, creativos, contenido y métricas.'],
        link: { t: 'Abrir FastMoss ↗', href: FASTMOSS },
        chain: [
          { k: 'pais', icon: '📍', t: 'Seleccionar país objetivo', d: ['Configuro el panel de FastMoss con el ', { b: 'país específico' }, ' que quiero mirar.'] },
          { k: 'demanda', icon: '📈', t: 'Analizar volumen de ventas', d: ['Busco el producto o la categoría. ¿La ', { b: 'curva de ventas está subiendo' }, '? ¿El precio de allá contra mi costo deja margen?'] },
          { k: 'saturacion', icon: '🏪', t: 'Estudiar competencia local', d: ['¿Cuántas tiendas lo venden? ', { b: 'Ventas altas y pocos competidores' }, ' = ventana de oportunidad.'] },
          { k: 'marketing', icon: '🎬', t: 'Revisar anuncios y creadores', d: ['Miro los ', { b: 'videos y anuncios populares' }, ' de ese mercado: me dan la pauta para replicar o mejorar mis creativos.'] },
        ] },
      { k: 'testear', icon: '🧪', t: 'Testear', where: 'DropKiller → buscar por nombre', out: 'Mi candidato',
        p: ['Con el producto validado, vuelvo a ', { b: 'DropKiller' }, ' y lo busco ', { b: 'por nombre' }, '.'],
        list: [
          ['Cuento ', { b: 'cuántos proveedores' }, ' lo tienen.'],
          ['Cuento ', { b: 'cuántos anuncios' }, ' tiene.'],
          ['Busco ', { b: 'creativos' }, ' y su ', { b: 'product page' }, '.'],
          ['Lo anoto en ', { b: 'Mi candidato' }, ' y paso por el ', { b: 'Costeo' }, ' antes de testear con los cortes 20K / 30K / 40K.'],
        ] },
    ],
  };

  // Producto ganador: lo primero que reviso de un candidato. must = sin esto no lo puedo vender.
  const WINNER_GROUPS = [
    { k: 'car', t: 'Características de un producto ganador' },
    { k: 'asp', t: 'Aspectos importantes' },
  ];
  const WINNER = [
    { k: 'valor', group: 'car', icon: '💎', t: 'Alta percepción de valor',
      d: ['Que no sea un producto que la gente ', { b: 'consiga muy barato' }, ' en cualquier lado. Se ve caro y vale lo que cobro.'] },
    { k: 'wow', group: 'car', icon: '🤩', t: 'Efecto wow',
      d: ['Que sea ', { b: 'llamativo' }, ': frena el scroll y dan ganas de verlo funcionar.'] },
    { k: 'problema', group: 'car', icon: '🩹', t: 'Resuelve un problema',
      d: ['Le quita un dolor real a la gente. Por ejemplo, los nichos de ', { b: 'belleza, salud y bienestar' }, '.'] },
    { k: 'validado', group: 'asp', icon: '✅', t: 'Producto validado', must: true,
      d: ['Que ', { b: 'ya se esté vendiendo' }, ', sea en USA, Colombia u otro país.'] },
    { k: 'dropi', group: 'asp', icon: '📦', t: 'Está en Dropi y con stock', must: true,
      d: ['Si no está en Dropi ', { b: 'no lo puedo vender' }, '. Más adelante puedo desarrollar marca propia con un laboratorio.'] },
    { k: 'creativos', group: 'asp', icon: '🎬', t: 'Disponibilidad creativa',
      d: ['Que haya ', { b: 'videos en internet' }, ' que pueda bajar y personalizar para mi tienda y pautarlo.'] },
  ];

  // Cuántas cumple y qué veredicto da. traits = { k: true }. tone: 'g' | 'y' | 'r'.
  function winnerCheck(traits) {
    const t = traits || {}, ok = (x) => !!t[x.k];
    const missing = WINNER.filter((x) => !ok(x)), mustMissing = missing.filter((x) => x.must);
    const done = WINNER.length - missing.length, total = WINNER.length;
    const names = (list) => list.map((x) => x.t.toLowerCase()).join(', ');
    let v;
    if (!done) v = { tone: null, title: 'Marco lo que cumple mi producto', text: ['Toco cada tarjeta que mi candidato cumpla. Si pasa este filtro, sigo con la ', { b: 'Estrategia VDO' }, '.'] };
    else if (mustMissing.length) v = { tone: 'r', title: 'Así no lo puedo vender', text: ['Le falta: ', { b: names(mustMissing) }, '. Sin eso no hay producto: busco otro o confirmo primero.'] };
    else if (!missing.length) v = { tone: 'g', title: 'Pinta a producto ganador', text: ['Cumple las ', { b: `${total} características` }, '. Sigo con la Estrategia VDO y los números de DropKiller.'] };
    else if (done >= total - 2) v = { tone: 'y', title: 'Casi: le falta poco', text: ['Le falta: ', { b: names(missing) }, '. Lo sigo mirando, pero sé dónde está débil.'] };
    else v = { tone: 'r', title: 'Mejor busco otro', text: ['Solo cumple ', { b: `${done} de ${total}` }, '. Un producto así me hace quemar plata en el testeo.'] };
    return { done, total, missing: missing.map((x) => x.k), mustMissing: mustMissing.map((x) => x.k), ...v };
  }

  // Flujograma de DropKiller. `gate` = decisión antes de pasar al siguiente paso.
  const FLOW = [
    { k: 'filtros', t: 'Filtros avanzados', where: 'DropKiller → Productos → Filtros avanzados',
      p: ['Busco productos en ', { b: 'etapa de validación' }, '. Configuro esto y guardo el filtro para usarlo siempre:'],
      filters: [
        ['Ventas totales', `${n(LIMITS.total.min)} – ${n(LIMITS.total.ideal)} (máx. ${n(LIMITS.total.max)})`, 'Que esté en validación.'],
        ['Ventas 7 días', `${LIMITS.v7.min} – ${LIMITS.v7.max}`, 'Movimiento reciente sin masificación.'],
        ['Ventas 30 días', `${LIMITS.v30.min} – ${LIMITS.v30.max}`, 'Se mueve pero nadie lo ha escalado.'],
        ['Fecha de creación', `Últimos ${LIMITS.months} meses`, 'Fuera productos muertos o viejos.'],
        ['Veces restockeado', `0 – ${LIMITS.restock}`, 'Si se restockea mucho, ya lo están escalando.'],
        ['Stock', `Mínimo ${LIMITS.stock}`, 'Que no se agote justo cuando pauto.'],
        ['Plataforma / país', 'Dropi / Colombia', 'La bodega donde voy a operar.'],
      ] },
    { k: 'similares', t: 'Buscar similares', where: 'Clic en la imagen del producto → Buscar similares',
      p: ['Las ventas que muestra son ', { b: 'solo de ese proveedor' }, '. Con "Buscar similares" (o buscando por nombre) rastreo todo Dropi y veo quién más lo tiene.'],
      example: ['Ácido glicólico: buenas ventas, pero solo lo tenían 2 proveedores y menos de 3.000 ventas totales. Mercado abierto.'] },
    { k: 'sumar', t: 'Sumar ventas y contar proveedores', where: 'Resultado de Buscar similares',
      p: ['Sumo las ventas de ', { b: 'todos' }, ' los proveedores y los cuento. Con eso sé si de verdad está en validación o ya está saturado. Lo anoto en "Mi candidato", más abajo.'],
      example: ['Detector de fugas: 300 ventas y un solo proveedor en Colombia. Validado y sin competencia.'],
      gate: { q: `¿Total entre ${n(LIMITS.total.min)} y ${n(LIMITS.total.max)} y máximo ${LIMITS.prov.max} proveedores?`, no: 'Descarto y vuelvo a los filtros.' } },
    { k: 'ia', t: 'IA de saturación', where: 'DropKiller → Productos seguidos → abrir el producto',
      p: ['La IA calcula el porcentaje de saturación:'],
      list: [[{ b: 'Verde:' }, ' todavía hay espacio.'], [{ b: 'Amarillo:' }, ' hay pelea, pero entro.'], [{ b: 'Rojo:' }, ' ya es tarde, lo evito.']],
      gate: { q: '¿Verde o amarillo?', no: 'Rojo: descarto.' } },
    { k: 'ads', t: 'AdsKiller', where: 'DropKiller → AdsKiller',
      p: ['Biblioteca de anuncios solo de e-commerce. Busco el producto ', { b: 'por imagen' }, ' (captura del módulo de productos) y ', { b: 'excluyo Colombia' }, ' para ver cómo lo pautan afuera.'],
      list: [['Estado: ', { b: 'activo' }], ['Días activos: ', { b: `más de ${LIMITS.adDays}` }, ' (en cualquier país). Si sigue activo, se vende bien. Anoto el del anuncio más viejo.'], ['Duplicados: mínimo 2 o 3 (funnel hacking). Miro qué otros productos pauta ese anunciante.'], ['Luego filtro solo mi país y cuento ', { b: 'anunciantes' }, `, no anuncios (tiendas distintas): ideal menos de ${LIMITS.advertisers}.`]],
      example: ['Pack Detox: tienda en España escalando con 110 anuncios solo de imágenes. No siempre hace falta video.'],
      gate: { q: `¿Hay anuncios activos hace más de ${LIMITS.adDays} días?`, no: 'Todavía no demuestra que es rentable: lo guardo para después.' } },
    { k: 'radar', t: 'Store Radar y Ad Library', where: 'DropKiller → Store Radar · Biblioteca de anuncios de Meta',
      p: ['Busco tiendas de afuera que ya lo escalan y los ángulos que usan.'],
      list: [['Store Radar: oculto Colombia, ', { b: 'anuncios activos mínimo 50' }, ', ', { b: 'productos 1 a 30' }, '. Miro USA, UK y España.'], ['Abro la tienda: tema, apps, anuncios que escala y fecha de creación.'], ['Ad Library: copys, página y días activos (más de 7). ¿Mandan a landing o a WhatsApp?'], ['Extensión Rayos X sobre una tienda Shopify: best-sellers y todos sus anuncios, aunque los escondan en varias fanpages.']],
      example: ['Cura Natural: tienda en México con 1 producto y 167 anuncios activos. No existía en Colombia.'] },
    { k: 'dropi', t: 'Validar en Dropi', where: 'Dropi → buscar el producto',
      p: ['Antes de gastar un peso confirmo la bodega:'],
      list: [['Stock ', { b: `mínimo ${LIMITS.stock}` }, ' unidades.'], ['Proveedor confiable (verificado) y el ID más barato entre los similares.'], [{ b: `Mínimo ${LIMITS.creatives} creativos` }, ' listos para el testeo.']],
      gate: { q: `¿Stock de ${LIMITS.stock} o más y proveedor confiable?`, no: 'Busco otro proveedor del mismo producto o descarto.' } },
    { k: 'costear', t: 'Costear', where: 'Pestaña Costeo de esta app',
      p: ['Paso costo y precio al costeo. Si el ', { b: 'CPA máximo' }, ' no da, no hay producto, por bueno que se vea. Si da, pasa a testeo con los cortes 20K / 30K / 40K.'],
      gate: { q: '¿El CPA máximo deja margen?', no: 'Subo el precio, armo oferta (2x1) o descarto.' } },
  ];

  // Otras herramientas, en el orden en que las uso.
  const TOOLS = [
    { k: 'kalodata', t: 'Kalodata', d: ['Ventas de TikTok Shop (sobre todo USA). Busco productos con tracción allá y ', { b: 'vírgenes aquí' }, ' (menos de 100 ventas al día en LATAM).'] },
    { k: 'tuwinner', t: 'TuWinner', d: ['Lo más vendido en Colombia. Descarto los monstruos y busco los que, en 7 días, tienen ', { b: 'menos de 100' }, ' ventas.'] },
    { k: 'adlib', t: 'Biblioteca de anuncios de Meta', d: ['Qué está corriendo la competencia, sus copys y páginas. Filtro ', { b: 'más de 7 días activos' }, '.'] },
    { k: 'tiktok', t: 'TikTok Shop', d: ['Filtro por categoría (ej. salud): poco competido y muy vendido en USA, y confirmo que haya proveedor local.'] },
    { k: 'proveedor', t: 'Dropi por proveedor', d: ['Busco directo en proveedores grandes (ej. Goldbox). Con Goldbox, al llegar a unas ', { b: '5 ventas diarias' }, ', negocio descuento y privatizar stock.'] },
  ];

  // Investigación del problema, antes o junto a DropKiller.
  const RESEARCH = [
    { k: 'reddit', t: 'Dolor en Reddit', d: 'Subreddits del nicho, orden "Top del año". Saco los dolores repetidos y las palabras literales que usa la gente (qué probó y por qué falló).' },
    { k: 'amazon', t: 'Demanda en Amazon', d: 'Best Sellers del nicho (en incógnito, ubicación USA). Reseñas de 1 estrella: lo que la competencia hace mal. De 5: el ángulo emocional que compra.' },
    { k: 'trends', t: 'Tendencia', d: 'Google Trends y Glimpse a 5 años y 12 meses: estable o subiendo. Evito productos muertos o de temporada.' },
    { k: 'dif', t: 'Diferenciación', d: '¿Lo puedo ofrecer mejor, con mejor oferta o con otro ángulo?' },
  ];

  const MISTAKES = [
    ['Elegir por intuición', 'Me enamoro del producto sin datos de demanda.'],
    ['Copiar a ciegas', 'Lanzo lo "bonito" de TikTok sin saber si vende o ya está quemado.'],
    ['Testear a ciegas', 'Un testeo cuesta de 10 a 30 USD y al novato le toma unos 10 pegar un ganador: 100 a 300 USD perdidos por no usar los datos.'],
    ['Ignorar la saturación', 'Con 15 proveedores o más gana el que más plata está dispuesto a perder en anuncios.'],
    ['Márgenes ajustados', 'No contar fletes, devoluciones y CPA. Por eso siempre paso por el Costeo.'],
    ['No leer reseñas', 'No investigar los dolores en Reddit y Amazon.'],
  ];

  // ---------- Evaluador de candidatos (formulario "Mi candidato" y bitácora) ----------
  // Mismo modelo de datos que guarda NovaSociety (Laboratorio) para un producto:
  // MSP (NovaSociety lo guarda de 1 a 5; aquí en 3 niveles), percepción de valor, países validados, ventas 7/30/total y costeo con devoluciones y cancelaciones.
  const COUNTRIES = [
    { k: 'CO', t: 'Colombia' }, { k: 'MX', t: 'México' }, { k: 'PE', t: 'Perú' }, { k: 'CL', t: 'Chile' },
    { k: 'EC', t: 'Ecuador' }, { k: 'AR', t: 'Argentina' }, { k: 'ES', t: 'España' }, { k: 'GT', t: 'Guatemala' },
    { k: 'PA', t: 'Panamá' }, { k: 'PY', t: 'Paraguay' }, { k: 'CR', t: 'Costa Rica' }, { k: 'US', t: 'USA' },
  ];
  const STATUS = [
    { k: 'evaluando', t: 'Evaluando', icon: '🔍', tone: 'n' },
    { k: 'testeo', t: 'En testeo', icon: '🧪', tone: 'b' },
    { k: 'activo', t: 'Activo', icon: '🚀', tone: 'g' },
    { k: 'descartado', t: 'Descartado', icon: '❌', tone: 'r' },
    { k: 'ganador', t: 'Ganador', icon: '🏆', tone: 'y' },
  ];
  // MSP en 3 niveles. Equivalencia con la escala 1–5 de NovaSociety: bajo = 1–2, medio = 3, alto = 4–5.
  const MSP = [{ k: 'bajo', t: 'Bajo', icon: '🔸' }, { k: 'medio', t: 'Medio', icon: '🔶' }, { k: 'alto', t: 'Alto', icon: '🔥' }];
  // Acepta el nivel o un número 1–5 (productos guardados antes del cambio).
  const mspLevel = (v) => { const x = Number(v); if (v === '' || v == null) return null; if (!isFinite(x)) return MSP.some((m) => m.k === v) ? v : null; return x >= 4 ? 'alto' : x === 3 ? 'medio' : x >= 1 ? 'bajo' : null; };
  const VALUE = [{ k: 'baja', t: 'Baja', icon: '🍃' }, { k: 'media', t: 'Media', icon: '💰' }, { k: 'alta', t: 'Alta', icon: '💎' }];
  const SATURATION = [{ k: 'g', t: 'Verde', tone: 'g' }, { k: 'y', t: 'Amarillo', tone: 'y' }, { k: 'r', t: 'Rojo', tone: 'r' }];
  // Costos por defecto = costeo genérico de NovaSociety: 25% devoluciones y 25% cancelaciones
  // (50% de entrega efectiva y 75% sobre despachado, los mismos de la pestaña Costeo).
  // Margen 13% = el que NovaSociety usa para sugerir precio si no se dice otro.
  const COST_DEFAULTS = { flete: 20000, cpa: 15000, devRate: 25, cancelRate: 25, margin: 13 };

  const num = (v) => (v === '' || v == null || !isFinite(Number(v)) ? null : Number(v));
  const or = (v, d) => { const x = num(v); return x == null ? d : x; };

  // Utilidad por entrega. Da lo mismo que el costeo de NovaSociety (Laboratorio) y la pestaña Costeo:
  // flete costeado = flete ÷ entrega sobre despachado; CPA costeado = CPA ÷ entrega efectiva;
  // CPA de equilibrio (= CPA máximo del costeo) = (venta − proveedor − flete costeado) × entrega efectiva.
  function costParts(p) {
    const costo = num(p.price) || 0;
    const flete = or(p.flete, COST_DEFAULTS.flete), cpa = or(p.cpa, COST_DEFAULTS.cpa);
    const dev = or(p.devRate, COST_DEFAULTS.devRate) / 100, canc = or(p.cancelRate, COST_DEFAULTS.cancelRate) / 100;
    const entDesp = Math.max(0.01, 1 - dev), entEfec = Math.max(0.01, 1 - canc - dev);
    const fleteC = flete / entDesp, cpaC = cpa / entEfec;
    return { costo, entDesp, entEfec, fleteC, cpaC, costoT: costo + fleteC + cpaC };
  }

  function unitCost(p) {
    const costo = num(p.price), venta = num(p.sellPrice);
    if (!costo && !venta) return null;
    const { entDesp, entEfec, fleteC, cpaC, costoT } = costParts(p);
    const utilidad = (venta || 0) - costoT;
    return {
      costo: costo || 0, venta: venta || 0, fleteC, cpaC, costoT, utilidad, entDesp, entEfec,
      margen: venta ? utilidad / venta : null,
      precioComp: venta ? venta * 2 : null,
      cpaMax: venta ? (venta - (costo || 0) - fleteC) * entEfec : null,
      complete: !!(costo && venta),
    };
  }

  // Precio sugerido para ganar `margin` % por entrega, como lo calcula NovaSociety (costear sin precio):
  // costo total ÷ (1 − margen), redondeado hacia arriba al siguiente precio terminado en 4.900 o 9.900.
  const roundPrice = (raw) => Math.ceil((raw + 100) / 5000) * 5000 - 100;
  function priceFor(p, margin) {
    const m = or(margin, COST_DEFAULTS.margin) / 100;
    if (m < 0 || m >= 1) return null;
    return roundPrice(costParts(p).costoT / (1 - m));
  }

  // Color del margen: rojo menos de 10%, amarillo de 10% a 15%, verde desde 15% (mínimo sano) e ideal desde 20%.
  // Los cortes son MARGIN del tablero (modules/pnl/core/diagnostics.js).
  function marginLevel(m) {
    const M = core.diagnostics.MARGIN;
    if (m == null) return null;
    if (m >= M.ideal) return { tone: 'g', t: 'Ideal' };
    if (m >= M.healthy) return { tone: 'g', t: 'Sano' };
    if (m >= M.low) return { tone: 'y', t: 'Bajo la meta de 15%' };
    return { tone: 'r', t: m < 0 ? 'En pérdida' : 'Muy bajo' };
  }

  // Competencia por ventas de 7 días en mi mercado, con la regla de la app (10 a 100).
  function competition(sales7) {
    const v = num(sales7);
    if (!v) return null;
    if (v < LIMITS.v7.min) return { tone: 'y', t: 'Casi no se mueve', d: `menos de ${LIMITS.v7.min} ventas en 7 días` };
    if (v <= LIMITS.v7.max) return { tone: 'g', t: 'Poco competido', d: `entre ${LIMITS.v7.min} y ${LIMITS.v7.max} ventas en 7 días` };
    return { tone: 'r', t: 'Masificado', d: `más de ${LIMITS.v7.max} ventas en 7 días` };
  }

  // Mi score /8 con los datos de NovaSociety: MSP (alto 3, medio 1), valor (hasta 2), competencia (2) y validado en algún país (1).
  // No es el puntaje del radar de NovaSociety: el MCP no expone sus criterios ni su fórmula.
  const SCORE_MAX = 8;
  function scoreParts(p) {
    const msp = mspLevel(p.msp), comp = competition(p.sales7);
    return [
      { k: 'msp', t: 'MSP', max: 3, pts: msp === 'alto' ? 3 : msp === 'medio' ? 1 : 0 },
      { k: 'val', t: 'Valor', max: 2, pts: p.val === 'alta' ? 2 : p.val === 'media' ? 1 : 0 },
      { k: 'comp', t: 'Competencia', max: 2, pts: comp && comp.tone === 'g' ? 2 : 0 },
      { k: 'validated', t: 'Validado', max: 1, pts: (p.validated || []).length ? 1 : 0 },
    ];
  }
  const score = (p) => scoreParts(p).reduce((a, x) => a + x.pts, 0);
  const SCORE_LEVELS = [
    { k: 'alto', min: 7, tone: 'g', icon: '🔥', t: 'Alto potencial' },
    { k: 'bueno', min: 5, tone: 'b', icon: '✅', t: 'Buen potencial' },
    { k: 'bajo', min: 3, tone: 'o', icon: '⚠️', t: 'Potencial bajo' },
    { k: 'sin', min: 0, tone: 'r', icon: '❌', t: 'Sin potencial' },
  ];
  const scoreLevel = (s) => SCORE_LEVELS.find((l) => s >= l.min);

  // Meses desde la fecha de creación más antigua entre los proveedores (null sin fechas).
  function ageMonths(suppliers, now) {
    const t = (suppliers || []).map((s) => Date.parse(s && s.created)).filter(isFinite);
    return t.length ? (now - Math.min(...t)) / (30.44 * 86400000) : null;
  }

  // Evalúa los datos de DropKiller de un candidato contra el método VDO. tone: 'g' | 'y' | 'r'.
  function evaluate(c, now) {
    const L = LIMITS, out = [];
    const add = (k, label, tone, text) => out.push({ k, label, tone, text });
    const total = num(c.salesTotal), v7 = num(c.sales7), prov = num(c.prov), adv = num(c.advertisers),
      days = num(c.adDays), stock = num(c.stock), age = ageMonths(c.suppliers, now == null ? Date.now() : now);

    const st = stage(total);
    if (st) {
      const edge = st.k === 'escalado' && total <= L.total.max; // entre 2.001 y 3.000: el límite
      add('total', 'Ventas totales', edge ? 'y' : st.k === 'nuevo' ? 'y' : st.k === 'validacion' ? 'g' : 'r',
        edge ? [`${n(total)}: límite máximo. Solo entro si las de 7 días siguen subiendo.`] : [`${n(total)}: etapa `, { b: st.name.toLowerCase() }, '.']);
    }
    const comp = competition(v7);
    if (comp) add('v7', 'Ventas 7 días', comp.tone, [`${n(v7)}: `, { b: comp.t.toLowerCase() }, '.']);
    if (prov != null) add('prov', 'Proveedores', prov <= L.prov.ideal ? 'g' : prov <= L.prov.max ? 'y' : 'r',
      prov === 1 ? ['Uno solo: ', { b: 'candidato a privatizar.' }] : prov <= L.prov.ideal ? [`${prov}: pocos, bien.`] : prov <= L.prov.max ? [`${prov}: ya son muchos (ideal menos de ${L.prov.ideal}).`] : [`${prov}: saturado (máx. ${L.prov.max}).`]);
    if (adv != null) add('advertisers', 'Anunciantes en mi mercado', adv < L.advertisers ? 'g' : 'y',
      adv < L.advertisers ? [`${adv}: poca competencia.`] : [`${adv}: hay pelea; entro con un ángulo distinto.`]);
    if (days != null) add('adDays', 'Anuncio activo', days > L.adDays ? 'g' : 'y',
      days > L.adDays ? [`${days} días: es rentable.`] : [`${days} días: todavía no demuestra que es rentable.`]);
    if (c.ia) add('ia', 'IA de saturación', c.ia, { g: ['Verde: hay espacio.'], y: ['Amarillo: hay pelea, pero entro.'], r: ['Rojo: ya es tarde.'] }[c.ia]);
    if (stock != null) add('stock', 'Stock', stock >= L.stock ? 'g' : 'r',
      stock >= L.stock ? [`${n(stock)} unidades: alcanza.`] : [`${n(stock)}: se puede agotar cuando pauto (mín. ${L.stock}).`]);
    if (age != null) add('age', 'Fecha de creación', age <= L.maxMonths ? 'g' : 'y',
      age <= L.maxMonths ? [`${Math.max(0, Math.round(age))} meses: producto reciente.`] : [`${Math.round(age)} meses: es viejo (filtro: últimos ${L.months}). Reviso que no esté muerto.`]);
    const u = unitCost(c);
    if (u && u.complete) {
      const ml = marginLevel(u.margen);
      add('margin', 'Margen', ml.tone, [`${Math.round(u.margen * 100)}% por entrega: `, { b: ml.t.toLowerCase() }, '.']);
    }

    let verdict;
    const red = out.filter((x) => x.tone === 'r'), yellow = out.filter((x) => x.tone === 'y');
    if (red.length) verdict = { tone: 'r', title: 'Lo descarto', text: ['Falla en ', { b: red.map((x) => x.label.toLowerCase()).join(', ') }, '.'] };
    else if (total == null || prov == null) verdict = { tone: null, title: 'Faltan datos', text: ['Mínimo necesito las ', { b: 'ventas totales sumadas' }, ' y los ', { b: 'proveedores' }, '.'] };
    else if (yellow.length) verdict = { tone: 'y', title: 'Con dudas', text: ['Reviso ', { b: yellow.map((x) => x.label.toLowerCase()).join(', ') }, ' antes de testear.'] };
    else verdict = { tone: 'g', title: 'Lo testeo', text: ['Cumple el método VDO. Confirmo en el ', { b: 'Costeo' }, ' y testeo con los cortes 20K / 30K / 40K.'] };
    return { stage: st, checks: out, verdict };
  }

  // Filtros de la bitácora.
  const FILTERS = [
    { k: 'todos', t: 'Todos', test: () => true },
    { k: 'alto', t: 'Alto potencial', icon: '🔥', test: (p) => score(p) >= 7 },
    { k: 'poco', t: 'Poco competidos', icon: '🟢', test: (p) => { const c = competition(p.sales7); return !!c && c.tone === 'g'; } },
    { k: 'testeo', t: 'En testeo', icon: '🧪', test: (p) => p.status === 'testeo' },
    { k: 'ganador', t: 'Ganadores', icon: '🏆', test: (p) => p.status === 'ganador' },
    { k: 'activo', t: 'Activos', icon: '🚀', test: (p) => p.status === 'activo' },
  ];

  // Lista filtrada, buscada y ordenada. sort: 'score-desc' | 'score-asc' | 'comp-asc' | 'comp-desc' | null.
  function list(products, opts) {
    const o = opts || {}, f = FILTERS.find((x) => x.k === o.filter) || FILTERS[0], q = (o.q || '').trim().toLowerCase();
    const r = products.filter((p) => f.test(p) && (!q || (p.name || '').toLowerCase().includes(q) || String(p.dropi || '').toLowerCase().includes(q)));
    const s7 = (p) => num(p.sales7) || 0;
    if (o.sort === 'score-desc') r.sort((a, b) => score(b) - score(a));
    else if (o.sort === 'score-asc') r.sort((a, b) => score(a) - score(b));
    else if (o.sort === 'comp-asc') r.sort((a, b) => s7(a) - s7(b));
    else if (o.sort === 'comp-desc') r.sort((a, b) => s7(b) - s7(a));
    return r;
  }

  // Estadísticas de la bitácora: KPIs y distribuciones [{ t, n, tone }].
  function stats(products) {
    const total = products.length, scores = products.map(score);
    const high = scores.filter((s) => s >= 7).length;
    const utils = products.map(unitCost).filter((u) => u && u.complete).map((u) => u.utilidad);
    const winners = products.filter((p) => p.status === 'ganador').length;
    const byStatus = STATUS.map((s) => ({ t: s.t, icon: s.icon, tone: s.tone, n: products.filter((p) => p.status === s.k).length }));
    const noStatus = products.filter((p) => !p.status).length;
    if (noStatus) byStatus.push({ t: 'Sin estado', icon: '⚪', tone: 'n', n: noStatus });
    const mk = {};
    products.forEach((p) => { if (p.market) mk[p.market] = (mk[p.market] || 0) + 1; });
    return {
      total, high, winners, withCost: utils.length,
      highRate: total ? high / total : null,
      winnersRate: total ? winners / total : null,
      avgUtil: utils.length ? utils.reduce((a, b) => a + b, 0) / utils.length : null,
      byScore: SCORE_LEVELS.map((l) => ({ icon: l.icon, t: `${l.t} (${l.min === 0 ? '0–2' : l.min + '–' + (l.min === 7 ? 8 : l.min + 1)})`, tone: l.tone, n: scores.filter((s) => scoreLevel(s).k === l.k).length })).filter((x) => x.n),
      byStatus: byStatus.filter((s) => s.n),
      byMarket: Object.entries(mk).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, c]) => ({ code: k, t: (COUNTRIES.find((x) => x.k === k) || { t: k }).t, n: c, tone: 'b' })),
      byComp: [['g', 'Poco competido', '🟢'], ['y', 'Casi no se mueve', '🟡'], ['r', 'Masificado', '🔴']]
        .map(([tone, t, icon]) => ({ t, tone, icon, n: products.filter((p) => { const c = competition(p.sales7); return c && c.tone === tone; }).length }))
        .filter((c) => c.n),
    };
  }

  // ¿Limpiar el formulario borra algo que no está en la bitácora? Compara el borrador con su versión
  // guardada (saved = producto de la bitácora o null), ignorando campos vacíos, id y fecha.
  function clean(p) {
    const out = {};
    Object.keys(p || {}).sort().forEach((k) => {
      if (k === 'id' || k === 'updatedAt') return;
      let v = k === 'msp' ? mspLevel(p[k]) : p[k];
      if (Array.isArray(v)) v = v.filter((x) => x && (typeof x !== 'object' || Object.values(x).some((y) => y !== '' && y != null)));
      else if (v && typeof v === 'object') v = Object.fromEntries(Object.entries(v).filter(([, y]) => y));
      if (v === '' || v == null || v === false || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Object.keys(v).length)) return;
      out[k] = v;
    });
    return out;
  }
  const unsaved = (draft, saved) => {
    const d = clean(draft);
    return Object.keys(d).length > 0 && JSON.stringify(d) !== JSON.stringify(clean(saved));
  };

  core.search = {
    LIMITS, STAGES, stage, stageRange, PYRAMID, VDO, STRATEGIES, BY_PROVIDER, WINNER, WINNER_GROUPS, winnerCheck, FLOW, TOOLS, RESEARCH, MISTAKES,
    COUNTRIES, STATUS, MSP, mspLevel, VALUE, SATURATION, COST_DEFAULTS, SCORE_MAX, SCORE_LEVELS, FILTERS,
    unitCost, priceFor, marginLevel, competition, ageMonths, scoreParts, score, scoreLevel, evaluate, list, stats, unsaved,
  };
})();
