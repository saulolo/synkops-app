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
  function limitTip(plat, limit, ideal, note) {
    const li = [[plat + ': ', limit, '', '']];
    if (ideal) li.push(['Rango ideal: ', ideal, 'ok', '']);
    return { h: 'Límite máximo permitido', p: note || null, li, cls: 'hm-tip' };
  }
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
      k: 'ctr', name: 'CTR', tag: 'Clics',
      question: '¿El anuncio despierta curiosidad?',
      how: ['Buen creativo + ', { b: 'interés en el producto' }], group: 'curiosidad',
      dir: 'up', goal: 'buy',
      view: {
        meta: { main: '> 2 %', ref: null, tip: limitTip('Meta', '2 %', null, NO_SE_MIRA) },
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
      view: { meta: { main: '< 800', ref: null, tip: limitTip('Meta', '$ 800', '< $ 600') }, tiktok: { main: '< 800', ref: null, tip: limitTip('TikTok', '$ 800', '< $ 600') } },
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
      view: { meta: { main: '≤ 20.000', ref: null, tip: limitTip('Meta', '$ 20.000', '< $ 5.000') }, tiktok: { main: '≤ 6.000', ref: null, tip: limitTip('TikTok', '$ 6.000', '< $ 5.000') } },
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
      k: 'cppi', name: 'CPPI', tag: 'Interés + Web',
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


  // Qué significa cada métrica, en palabras simples (popover del botón "i" junto a cada métrica).
  //   full = nombre completo · simple = qué mide en una frase · analogy = comparación cotidiana
  //   signals = semáforo: z ('g' verde | 'y' amarillo | 'o' naranja | 'r' rojo), t = el rango, m = qué significa
  //   note = lo que hay que tener presente (criterio de NovaSociety). Cifras en COP; las de TikTok y Meta, donde difieren, van dichas.
  const MEANS = {
    ctr: {
      full: 'Click-Through Rate · tasa de clics',
      simple: 'De cada 100 personas que ven tu anuncio, cuántas tocan el enlace.',
      analogy: 'Es una vitrina: de todos los que pasan frente al local, cuántos se detienen a mirar.',
      signals: [
        { z: 'g', t: 'Más de 0,5 % (TikTok) · 2 % (Meta)', m: 'El anuncio llama la atención.' },
        { z: 'y', t: 'Justo en el límite', m: 'Pasa casi desapercibido; mira el CPM y el CPC antes de decidir.' },
        { z: 'r', t: 'Por debajo del límite', m: 'Casi nadie se interesa: el creativo es flojo.' },
      ],
      note: 'NovaSociety no decide con el CTR: un CTR alto no garantiza ventas. Se confirma en el CPM y el CPC.',
    },
    cpc: {
      full: 'Costo por clic',
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

  core.metrics = { FAIL_HEAD, GENERIC_CPA, GOALS, HARD_METRICS, copText: money };
})();
