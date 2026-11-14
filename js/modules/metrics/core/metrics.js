// Hard Metrics: guía de consulta de las 5 métricas duras (CTR, CPC, CPM, CPPI, CPA) en Meta y TikTok.
// Datos y reglas, sin DOM. El criterio de Juan (MCP de NovaSociety, reglas_de_juan) es el que decide;
// la referencia del curso (04-analisis-y-optimizacion-de-metricas.md) completa lo que Juan no dice.
// Los textos de diagnóstico y solución son segmentos: un string es texto plano y { b } va en negrita
// (PYL.ui.dom.rich los pinta). Todo en COP.
(() => {
  const core = globalThis.PYL.core;

  // Valores genéricos de NovaSociety para el CPA (los del producto sin costeo): salen en el aviso del número del CPA.
  const GENERIC_CPA = { escala: 12000, tope: 15000, apaga: 20000 };

  // Destinos de las flechas exteriores del diagrama.
  const GOALS = { buy: 'Mayor probabilidad de compra', profit: 'Mayor rentabilidad' };

  // 15000 → "15.000". Propio (no toLocaleString) para que salga igual en cualquier navegador y en Node.
  const money = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // Aviso que sale al pasar el mouse por el número de una métrica: el límite de cada plataforma y, si lo hay, el rango ideal.
  // li: [antes, resaltado, clase, después] (formato de PYL.ui.tooltip.attach). Los límites son los del diagrama de referencia.
  // warn (opcional): línea de advertencia ⚠ bajo el aviso (límite sin confirmar).
  function limitTip(plat, limit, ideal, note, warn) {
    const li = [[plat + ': ', limit, '', '']];
    if (ideal) li.push(['Rango ideal: ', ideal, 'ok', '']);
    const tip = { h: 'Límite máximo permitido', p: note || null, li, cls: 'hm-tip' };
    if (warn) tip.warn = warn;
    return tip;
  }
  // Vista de CPM y CPC por plataforma: el límite numérico `lim` { max, ideal, op } es la única fuente; el número
  // grande y el aviso se arman de él (SPEC 11: el simulador lee `lim` en vez de leer el texto del aviso).
  const OP_TXT = { '<=': '≤', '<': '<' };
  function limView(plat, lim) {
    return { main: OP_TXT[lim.op] + ' ' + money(lim.max), ref: null, tip: limitTip(plat, '$ ' + money(lim.max), '< $ ' + money(lim.ideal)), lim };
  }
  // Advertencia de límite sin confirmar (una sola fuente: la usan el aviso de Meta y la "i" del CTR).
  // Cuando se confirme el número del CTR único, se borra y se actualiza el 2 %.
  const CTR_UNIQUE_WARN = 'Límite por confirmar: el 2 % viene del CTR clásico (clics ÷ impresiones). Falta investigar cuál es el límite para el CTR único.';
  const NO_SE_MIRA = 'No se mira: el CTR no decide ni para apagar ni para escalar: se lee la cadena CPM → CPC → CPPI → CPA.';

  // Una fila por métrica, en el orden del diagrama (el de la gráfica del curso).
  //   dir   = 'up' (quiero que sea alta) | 'down' (baja)
  //   goal  = a dónde apunta la flecha exterior ('buy' | 'profit')
  //   view  = lo que dice el diagrama (estático, no sigue a los datos reales): por plataforma, el número grande (main)
  //           su texto pequeño (ref; null = ninguno) y, si lo tiene, un aviso al pasar el mouse por el número (tip { h, p })
  //   diag / lever = diagnóstico si falla y palanca de solución (tabla de "¿Cómo se logra?")
  //   means = qué significa la métrica en palabras simples (popover de la "i")
  const HARD_METRICS = [
    {
      k: 'ctr', name: 'CTR', tag: 'Clics', report: 'CTR único (porcentaje de clics en el enlace)',
      question: '¿El anuncio despierta curiosidad?',
      how: ['Buen creativo + ', { b: 'interés en el producto' }], group: 'curiosidad',
      dir: 'up', goal: 'buy',
      view: {
        meta: { main: '> 2 %', ref: null, tip: limitTip('Meta (CTR único)', '2 %', null, NO_SE_MIRA, CTR_UNIQUE_WARN) },
        tiktok: { main: '> 0,5 %', ref: null, tip: limitTip('TikTok', '0,5 %', null, NO_SE_MIRA) },
      },
      diag: [
        'Creativo flojo: falta de curiosidad o nulo interés.',
        'El anuncio no deja claro el beneficio ni a quién le habla.',
        [{ b: 'NovaSociety:' }, ' el CTR no decide; se confirma en CPM y CPC.'],
      ],
      lever: [
        'Optimizar el hook, mejorar el CTA y el ángulo visual.',
        'Probar otro formato: demostración, testimonio o antes/después.',
        'Un solo mensaje por anuncio, claro y directo.',
      ],
    },
    {
      k: 'cpc', name: 'CPC', tag: 'Clics',
      question: '¿Tu producto interesa?',
      how: ['Buen creativo + ', { b: 'interés en el producto' }], group: 'curiosidad',
      dir: 'down', goal: 'buy',
      view: { meta: limView('Meta', { max: 800, ideal: 600, op: '<' }), tiktok: limView('TikTok', { max: 800, ideal: 600, op: '<' }) },
      diag: [
        [{ b: 'NovaSociety:' }, ' el producto no interesa; la gente no quiere ver más información ni comprarlo.'],
        'Creativo que no engancha o audiencia desalineada.',
        'CPM sano + CPC caro = el interés no está.',
      ],
      lever: [
        'Probar nuevos ángulos de dolor y más dinamismo.',
        'Mostrar el problema y el resultado en los primeros segundos.',
        'Si ningún ángulo mejora el CPC, probar otro producto.',
      ],
    },
    {
      k: 'cpm', name: 'CPM', tag: 'Retención',
      question: '¿El video retiene?',
      how: ['Creativo ', { b: 'entretenido' }, ' = ', { b: 'retención' }], group: null,
      dir: 'down', goal: 'buy',
      view: { meta: limView('Meta', { max: 20000, ideal: 5000, op: '<=' }), tiktok: limView('TikTok', { max: 6000, ideal: 5000, op: '<=' }) },
      diag: [
        [{ b: 'NovaSociety:' }, ' el creativo no engancha y el algoritmo penaliza el video.'],
        'Baja retención inicial: se van antes de los 3 segundos.',
        'Creativo repetido o saturado: la gente ya lo vio.',
      ],
      lever: [
        [{ b: 'NovaSociety:' }, ' creativos nuevos, con el hook en los primeros 3 segundos.'],
        'Interrupción visual al inicio y ritmo rápido.',
        'Renovar creativos antes de que se saturen.',
      ],
    },
    {
      k: 'cppi', name: 'CPPI', tag: 'Interés + Web', report: 'Costo x Checkout',
      question: '¿Convence la landing / oferta?',
      how: ['Buena ', { b: 'product page / landing' }, ' + buena ', { b: 'oferta' }], group: null,
      dir: 'down', goal: 'buy',
      view: { meta: { main: '< 4.000', ref: null, tip: limitTip('Meta', '$ 4.000 COP', '< $ 3.000') }, tiktok: { main: '< 4.000', ref: null, tip: limitTip('TikTok', '$ 4.000 COP', '< $ 3.000') } },
      diag: [
        [{ b: 'NovaSociety:' }, ' con buen CPM y CPC, el problema está en la página, la oferta o el formulario.'],
        'Fricción en la product page: poca confianza o carga lenta.',
        'Oferta débil o formulario largo.',
      ],
      lever: [
        [{ b: 'NovaSociety:' }, ' mejorar la confianza de la página, la oferta y el formulario, sin fricción.'],
        'Refinar la oferta: garantías, bonos, packs.',
        'Simplificar el formulario y revisar la velocidad en celular.',
      ],
    },
    {
      k: 'cpa', name: 'CPA', tag: 'Compra',
      question: '¿Convence la oferta?',
      how: ['Haciendo ', { b: 'bien todo lo anterior' }], group: null,
      dir: 'down', goal: 'profit',
      view: { meta: { main: '≤ 15.000', ref: null }, tiktok: { main: '≤ 15.000', ref: null } },
      diag: [
        'Falla acumulada en la cadena del embudo.',
        [{ b: 'NovaSociety:' }, ' con 40.000 gastados y sin ventas se apaga: si el CPPI es bueno, es el formulario o la oferta.'],
        'Pedidos que se cancelan o no se entregan: la venta no llega a caja.',
      ],
      lever: [
        'Subir en la cadena y optimizar la métrica rota.',
        [{ b: 'NovaSociety:' }, ' sobre el tope se baja un escalón (−20 %); dos días seguidos sobre "apaga", se apaga.'],
        'Confirmar los pedidos y cuidar la entrega.',
      ],
    },
  ];


  // Fórmulas de las métricas de costo (nombres de las columnas del reporte de Meta). Una sola fuente: las usan el panel
  // de la "i" (means.formula) y la tabla de Métricas base (uses). El MCP de NovaSociety no trae fórmulas.
  const FORMULA = {
    cpc: 'Monto gastado ÷ Clics en el enlace',
    cpm: 'Monto gastado ÷ Impresiones × 1.000',
    cppi: 'Monto gastado ÷ Pagos iniciados',
    cpa: 'Monto gastado ÷ Resultados',
  };

  // Qué significa cada métrica, en palabras simples (popover del botón "i" junto a cada métrica).
  //   full = nombre completo · simple = qué mide en una frase · analogy = comparación cotidiana
  //   signals = semáforo: z ('g' verde | 'y' amarillo | 'o' naranja | 'r' rojo), t = el rango, m = qué significa
  //   formula = cómo se calcula (líneas de segmentos) · note = lo que hay que tener presente (criterio de NovaSociety). Cifras en COP; las de TikTok y Meta, donde difieren, van dichas.
  const MEANS = {
    ctr: {
      full: 'Click-Through Rate · tasa de clics',
      formula: [
        [{ b: 'Meta (CTR único)' }, ': personas que hicieron clic en el enlace ÷ personas que vieron el anuncio × 100'],
        [{ b: 'TikTok' }, ': clics ÷ impresiones × 100'],
      ],
      simple: 'De cada 100 personas que ven tu anuncio, cuántas tocan el enlace.',
      analogy: 'Es una vitrina: de todos los que pasan frente al local, cuántos se detienen a mirar.',
      signals: [
        { z: 'g', t: 'Más de 0,5 % (TikTok) · 2 % (Meta, CTR único)', m: 'El anuncio llama la atención.' },
        { z: 'y', t: 'Justo en el límite', m: 'Pasa casi desapercibido; mira el CPM y el CPC antes de decidir.' },
        { z: 'r', t: 'Por debajo del límite', m: 'Casi nadie se interesa: el creativo es flojo.' },
      ],
      unique: 'Meta lo cuenta por personas: las que hicieron clic sobre las que vieron el anuncio. TikTok lo cuenta con impresiones.',
      warn: CTR_UNIQUE_WARN,
      note: 'NovaSociety no decide con el CTR: un CTR alto no garantiza ventas. Se confirma en el CPM y el CPC.',
    },
    cpc: {
      full: 'Costo por clic',
      formula: [[FORMULA.cpc]],
      simple: 'Cuánto me cuesta que una persona toque el enlace y llegue a mi tienda.',
      analogy: 'Es lo que pago por cada persona que entra por la puerta de mi local.',
      signals: [
        { z: 'g', t: 'Menos de $ 600', m: 'Ideal: el producto interesa y el tráfico sale barato.' },
        { z: 'y', t: '$ 600 a $ 800', m: 'Aceptable: se sostiene.' },
        { z: 'r', t: 'Más de $ 800', m: 'Caro: la gente no quiere ver más del producto.' },
      ],
      note: 'Se lee junto al CPM: CPM sano + CPC caro = el producto no interesa.',
    },
    cpm: {
      full: 'Costo por mil impresiones',
      formula: [[FORMULA.cpm]],
      simple: 'Cuánto pago para que mi anuncio se muestre mil veces.',
      analogy: 'Es el alquiler de una valla: lo que cuesta que mil personas pasen frente a ella. Si tu video engancha, la plataforma lo muestra más barato.',
      signals: [
        { z: 'g', t: 'Menos de $ 5.000', m: 'Ideal: el creativo engancha y el algoritmo te favorece.' },
        { z: 'y', t: 'Hasta $ 6.000 (TikTok) · $ 20.000 (Meta)', m: 'Sano: dentro del máximo permitido.' },
        { z: 'r', t: 'Por encima del máximo', m: 'Caro: el video no retiene y el algoritmo lo penaliza.' },
      ],
      note: 'Es el primer eslabón de la cadena. Si falla, arréglalo antes de mirar lo demás.',
    },
    cppi: {
      full: 'Costo por pago iniciado',
      formula: [[FORMULA.cppi]],
      simple: 'Cuánto me cuesta que alguien llegue al checkout y empiece a pagar.',
      analogy: 'Es lo que pago por cada cliente que llega a la caja con el producto en la mano.',
      signals: [
        { z: 'g', t: 'Menos de $ 4.000', m: 'Bueno (el ideal es menos de $ 3.000).' },
        { z: 'y', t: '$ 4.000 a $ 5.000', m: 'Se sostiene.' },
        { z: 'o', t: '$ 5.000 a $ 6.000', m: 'Flojo: vigílalo de cerca.' },
        { z: 'r', t: 'Más de $ 6.000', m: 'Se apaga si no hay ventas.' },
      ],
      note: 'Buen CPPI y sin ventas: el problema está en la página, la oferta o el formulario.',
    },
    cpa: {
      full: 'Costo por adquisición (por venta)',
      formula: [[FORMULA.cpa]],
      simple: 'Cuánto gasto en publicidad por cada venta que logro.',
      analogy: 'Es el precio real de conseguir un cliente: si es mayor que lo que me deja el producto, pierdo plata.',
      signals: [
        { z: 'g', t: 'Menos de $ 12.000', m: 'Sube un escalón (+20 % de presupuesto).' },
        { z: 'y', t: '$ 12.000 a $ 15.000', m: 'Se sostiene hasta el tope.' },
        { z: 'o', t: '$ 15.000 a $ 20.000', m: 'Baja un escalón (−20 %).' },
        { z: 'r', t: 'Más de $ 20.000', m: 'Zona de apagar: dos días seguidos y se apaga.' },
      ],
      note: 'Es la métrica reina: dice si el negocio es rentable. Mi tope real sale del costeo de cada producto.',
    },
  };
  HARD_METRICS.forEach((r) => { r.means = MEANS[r.k]; });

  // Encabezado de la tabla de diagnóstico que sale al pasar el mouse por "¿Cómo se logra?".
  const FAIL_HEAD = ['Diagnóstico si falla (fuera de rango)', 'Palanca de solución'];

  // ---- Métricas base: los números crudos del Administrador de anuncios --------------------------------------------

  const BASE_HEAD = {
    title: 'Métricas base',
    sub: 'Los números crudos del Administrador de anuncios: con ellos se calculan las métricas duras',
  };

  // Números de NovaSociety que citan las fichas (COP, MCP reglas_de_juan). Las zonas del CPA salen de GENERIC_CPA.
  // Deuda: estos números también viven en trainer.js (Simulador y Escalera); se unifican al partir trainer.js (Fase 2).
  const NS_TEST = { budget: 100000, cuts: [20000, 30000, 40000], step: 0.2 };

  // Límite máximo del CPM por plataforma, tal como lo dice el aviso del diagrama ("$ 6.000").
  const cpmMax = (plat) => '$ ' + money(HARD_METRICS.find((r) => r.k === 'cpm').view[plat].lim.max);
  const stepPct = Math.round(NS_TEST.step * 100) + ' %';
  // Escalones del presupuesto: n valores desde el del testeo, cada uno +20 % sobre el anterior ([100000, 120000, 144000]).
  function budgetSteps(n) {
    const out = [NS_TEST.budget];
    while (out.length < n) out.push(Math.round(out[out.length - 1] * (1 + NS_TEST.step)));
    return out;
  }
  const steps = budgetSteps(3);
  // La fórmula del CPPI se dice en dos sitios (Monto gastado y el divisor Pagos iniciados): una sola fuente.
  const CPPI_USE = [{ b: 'CPPI' }, ' = ' + FORMULA.cppi + ' (en el reporte: «Costo x Checkout»)'];
  const cutsText = NS_TEST.cuts.map(money).join(', ').replace(/, ([^,]*)$/, ' y $1');

  // Una entrada por métrica. name = nombre corto de la pantalla del Administrador de anuncios;
  // csv = nombre de la columna del reporte de Meta, solo cuando es distinto.
  // Las definiciones son provisionales (basadas en el Administrador de anuncios): el usuario las reemplaza por las suyas.
  //   uses = fórmulas (segmentos) · links = claves de HARD_METRICS que usa · ns = nota de NovaSociety (segmentos)
  const BASE_METRICS = [
    {
      k: 'presupuesto', name: 'Presupuesto', csv: 'Presupuesto del conjunto de anuncios',
      def: 'Cantidad de dinero que estás dispuesto a gastar en el conjunto de anuncios, por día o durante toda su duración.',
      uses: [['Es el tope de lo que el conjunto puede gastar al día']],
      links: [],
      ns: ['Testeo: ', { b: '$ ' + money(NS_TEST.budget) }, ' al día. Al escalar sube un escalón de +' + stepPct + ' (' + steps.map(money).join(' → ') + '). Si el CPA se dispara, se devuelve el ' + stepPct],
    },
    {
      k: 'resultados', name: 'Resultados',
      def: 'Número de ventas que generaron tus anuncios. Como el objetivo de tus campañas es Compras, cada resultado es una venta. Si es 0, la inversión no se convirtió en pedidos.',
      uses: [[{ b: 'CPA' }, ' = ' + FORMULA.cpa + ' (en el reporte: «Costo por resultados»)']],
      links: ['cpa'],
      ns: ['Zonas del CPA: escala bajo ', { b: '$ ' + money(GENERIC_CPA.escala) }, ', tope ', { b: '$ ' + money(GENERIC_CPA.tope) }, ', apaga sobre ', { b: '$ ' + money(GENERIC_CPA.apaga) }],
    },
    {
      k: 'impresiones', name: 'Impresiones',
      def: 'Número de veces que tus anuncios se mostraron en pantalla.',
      uses: [[{ b: 'CPM' }, ' = ' + FORMULA.cpm]],
      links: ['cpm'],
      ns: ['CPM máximo: TikTok ', { b: cpmMax('tiktok') }, ', Meta ', { b: cpmMax('meta') }],
    },
    {
      k: 'gasto', name: 'Monto gastado', csv: 'Monto gastado (COP)',
      def: 'Cantidad estimada de dinero que has gastado en el conjunto de anuncios durante el período.',
      uses: [
        ['Es el numerador de ', { b: 'CPM' }, ', ', { b: 'CPC' }, ', ', { b: 'CPPI' }, ' y ', { b: 'CPA' }],
        CPPI_USE,
      ],
      links: ['cpm', 'cpc', 'cppi', 'cpa'],
      ns: ['Los cortes del testeo se miden con el gasto acumulado: ' + cutsText],
    },
    {
      k: 'clics', name: 'Clics en el enlace',
      def: 'Número de clics en los enlaces del anuncio que llevan a la página de destino.',
      uses: [
        [{ b: 'CPC' }, ' = ' + FORMULA.cpc],
        [{ b: 'CTR único' }, ' (en el reporte: «CTR único (porcentaje de clics en el enlace)»): Meta lo calcula por personas, como las personas que hicieron clic en el enlace sobre las personas que vieron el anuncio. No se calcula con impresiones'],
      ],
      links: ['cpc', 'ctr'],
      ns: ['CPC caro con CPM sano: el producto no interesa'],
    },
  ];

  // Cómo se arma la tabla: el tope (cap) y el numerador (num) primero, luego las métricas que dan Hard Metric (divs),
  // en el orden de la cadena. Cada una apunta a una métrica de BASE_METRICS (k) o es solo una etiqueta (label, con su fórmula en uses) y da una Hard Metric (hm).
  const BASE_FORMULA = {
    num: 'gasto',
    divs: [
      { k: 'impresiones', hm: 'cpm', factor: '× 1.000' },
      { k: 'clics', hm: 'cpc' },
      { label: 'Pagos iniciados', hm: 'cppi', uses: [CPPI_USE] },
      { k: 'resultados', hm: 'cpa' },
    ],
    cap: 'presupuesto',
  };

  core.metrics = { BASE_FORMULA, BASE_HEAD, BASE_METRICS, CTR_UNIQUE_WARN, budgetSteps, FAIL_HEAD, GENERIC_CPA, GOALS, HARD_METRICS, NS_TEST, copText: money };
})();
