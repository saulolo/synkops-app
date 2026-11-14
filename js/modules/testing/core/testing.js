// Escalado · Fase de testeo: reglas de los cortes 20K / 30K / 40K (MCP de NovaSociety, reglas_de_juan, COP).
// Módulo informativo: enseña la metodología; no lee campañas reales. Sin DOM: los textos son segmentos
// (un string es texto plano, { b } va en negrita) que PYL.ui.dom.rich pinta.
// Reutiliza: cortes y presupuesto ← metrics.NS_TEST, tope genérico ← metrics.GENERIC_CPA.
(() => {
  const core = globalThis.PYL.core;
  const { NS_TEST, GENERIC_CPA, copText } = core.metrics;
  const money = (v) => '$ ' + copText(v);
  const orList = (a) => a.join(', ').replace(/, ([^,]*)$/, ' o $1');

  // Umbrales con los nombres del Lab (sop_en_cop).
  const TEST_RULES = {
    piMinimo: 3, piBien: 5,                            // corte 20K: 0–2 apaga, 3–4 flojo, 5+ bien
    cppiBueno: 4000, cppiFlojo: 5000, cppiApaga: 6000, // corte 30K
    ventasGastar: 2,                                   // corte 40K: 2+ ventas y CPA ≤ tope
  };

  // Zonas del CPA a partir del tope (CPA máximo del costeo), como el Lab.
  const CPA_ZONES = { escala: 0.8, apaga: 4 / 3 };
  const cpaZones = (tope) => ({ escala: Math.round(tope * CPA_ZONES.escala), tope, apaga: Math.round(tope * CPA_ZONES.apaga) });

  // Las cuatro decisiones de la práctica. Cada veredicto cae en una.
  const TEST_ACTIONS = [
    { k: 'off', t: 'Apagar', icon: '🛑' },
    { k: 'watch', t: 'Mantener vigilando', icon: '⚠️' },
    { k: 'go', t: 'Seguir sin tocar', icon: '✅' },
    { k: 'spend', t: 'Dejar gastar el día', icon: '🚀' },
  ];
  const TOCA = { off: 'Apagar', watch: 'Mantener vigilando', go: 'Seguir sin tocar', spend: 'Dejar gastar el día' };
  const ACTION_OF = { off: 'off', weak: 'watch', hold: 'watch', own: 'off', good: 'go', great: 'go', spend: 'spend' };
  const LIGHT_OF = { off: 'r', weak: 'y', hold: 'y', own: 'r', good: 'g', great: 'g', spend: 'g' };
  const FASE_OF = { off: 'apagado', own: 'apagado', spend: 'escalando' };
  const STEP_OF = [null, 2, 3, 4];

  // Rama → { v (clave interna), veredicto }. Una sola fuente: la usan testVerdict y las tarjetas de TEST_CUTS.
  const BRANCH = {
    'c1-sale': { v: 'great', veredicto: 'MARAVILLOSO' },
    'c1-off': { v: 'off', veredicto: 'APÁGALO' },
    'c1-weak': { v: 'weak', veredicto: 'FLOJO' },
    'c1-good': { v: 'good', veredicto: 'BIEN' },
    'c2-nosale-off': { v: 'off', veredicto: 'APÁGALO' },
    'c2-nosale-weak': { v: 'weak', veredicto: 'BASTANTE FLOJO' },
    'c2-nosale-hold': { v: 'hold', veredicto: 'SE SOSTIENE' },
    'c2-sale-good': { v: 'good', veredicto: 'BUEN PRONÓSTICO' },
    'c2-sale-hold': { v: 'hold', veredicto: 'SE SOSTIENE' },
    'c2-sale-weak': { v: 'weak', veredicto: 'FLOJO' },
    'c3-off': { v: 'off', veredicto: 'APÁGALO' },
    'c3-spend': { v: 'spend', veredicto: 'DÉJALO GASTAR EL DÍA' },
    'c3-own': { v: 'own', veredicto: 'NO CUMPLE · APÁGALO' },
  };
  const C1_SALE = 'Si ya hay venta, sigue al siguiente corte sin tocar.';
  const div = (a, b) => (b > 0 ? a / b : null);
  const R = TEST_RULES;

  // Decide un conjunto con su gasto acumulado. Devuelve datos, no HTML.
  // testVerdict({ spend, pi, sales, tope }) → { fase, veredicto, toca, detalle, dura, senales, cut, v, action, light, branch, step, cppi, cpa }
  function testVerdict({ spend, pi, sales, tope }) {
    const cut = NS_TEST.cuts.filter((c) => spend >= c).length;
    const cppi = div(spend, pi), cpa = div(spend, sales);
    let v = 'wait', veredicto = 'DEJA CORRER', branch = null, detalle, senales;
    const [c1, c2, c3] = NS_TEST.cuts;
    const piTxt = (extra) => ['Pagos iniciados ', { b: String(pi) }, extra];
    const cppiTxt = (extra) => ['CPPI ', { b: cppi === null ? '—' : money(cppi) }, extra];

    if (cut === 0) {
      detalle = ['Deja correr sin tocar: todavía no llega al corte 1 (', { b: money(c1) }, ').'];
      senales = ['Gasto ', { b: money(spend) }, ' de ', money(c1)];
    } else if (cut === 1) {
      if (sales >= 1) { ({ v, veredicto } = BRANCH['c1-sale']); branch = 'c1-sale'; detalle = [C1_SALE]; senales = ['Ventas ', { b: String(sales) }]; }
      else if (pi < R.piMinimo) { ({ v, veredicto } = BRANCH['c1-off']); branch = 'c1-off'; detalle = ['Apágalo y revisa la cadena: CPM y CPC.']; senales = piTxt(' (apaga con menos de ' + R.piMinimo + ')'); }
      else if (pi < R.piBien) { ({ v, veredicto } = BRANCH['c1-weak']); branch = 'c1-weak'; detalle = ['Flojo, se mantiene.']; senales = piTxt(' (flojo de ' + R.piMinimo + ' a ' + (R.piBien - 1) + ')'); }
      else { ({ v, veredicto } = BRANCH['c1-good']); branch = 'c1-good'; detalle = ['Bien.']; senales = piTxt(' (bien desde ' + R.piBien + ')'); }
    } else if (cut === 2) {
      if (sales === 0) {
        if (cppi === null || cppi > R.cppiApaga) { ({ v, veredicto } = BRANCH['c2-nosale-off']); branch = 'c2-nosale-off'; detalle = ['Apágalo.']; senales = cppiTxt(' (apaga sobre ' + money(R.cppiApaga) + ')'); }
        else if (cppi > R.cppiFlojo) { ({ v, veredicto } = BRANCH['c2-nosale-weak']); branch = 'c2-nosale-weak'; detalle = ['Bastante flojo.']; senales = cppiTxt(' (entre ' + money(R.cppiFlojo) + ' y ' + money(R.cppiApaga) + ')'); }
        else { ({ v, veredicto } = BRANCH['c2-nosale-hold']); branch = 'c2-nosale-hold'; detalle = ['Se sostiene.']; senales = cppiTxt(' (hasta ' + money(R.cppiFlojo) + ')'); }
      } else if (cppi < R.cppiBueno) { ({ v, veredicto } = BRANCH['c2-sale-good']); branch = 'c2-sale-good'; detalle = ['Buen pronóstico.']; senales = cppiTxt(' (bueno bajo ' + money(R.cppiBueno) + ')'); }
      else if (cppi <= R.cppiFlojo) { ({ v, veredicto } = BRANCH['c2-sale-hold']); branch = 'c2-sale-hold'; detalle = ['Se sostiene.']; senales = cppiTxt(' (entre ' + money(R.cppiBueno) + ' y ' + money(R.cppiFlojo) + ')'); }
      else { ({ v, veredicto } = BRANCH['c2-sale-weak']); branch = 'c2-sale-weak'; detalle = ['Flojo.']; senales = cppiTxt(' (flojo sobre ' + money(R.cppiFlojo) + ')'); }
    } else {
      if (sales === 0) { ({ v, veredicto } = BRANCH['c3-off']); branch = 'c3-off'; detalle = ['Apágalo, aunque el CPPI sea bueno (entonces es el formulario o la oferta).']; senales = ['Ventas ', { b: '0' }, ' con ' + money(c3) + ' gastados']; }
      else if (sales >= R.ventasGastar && cpa <= tope) { ({ v, veredicto } = BRANCH['c3-spend']); branch = 'c3-spend'; detalle = ['Déjalo gastar el día entero: varias ventas rentables, pasa a escalado.']; senales = ['Ventas ', { b: String(sales) }, ' · CPA ', { b: money(cpa) }, ' (tope ' + money(tope) + ')']; }
      else { ({ v, veredicto } = BRANCH['c3-own']); branch = 'c3-own'; detalle = ['No cumple para gastar el día: lo apago en ' + copText(c3) + ' y reviso la cadena. Regla propia: NovaSociety no define este caso. Con 1 venta, el CPA ya es ' + copText(c3) + ' o más.']; senales = ['Ventas ', { b: String(sales) }, ' · CPA ', { b: money(cpa) }, ' (tope ' + money(tope) + ')']; }
    }

    const action = v === 'wait' ? null : ACTION_OF[v];
    return {
      fase: FASE_OF[v] || 'testeo', veredicto, toca: action ? TOCA[action] : 'Dejar correr', detalle, dura: false, senales,
      cut, v, action, light: v === 'wait' ? null : LIGHT_OF[v], branch, step: STEP_OF[cut], cppi, cpa,
    };
  }

  // Validación de los campos: null si todo bien, o el aviso.
  function testCheck({ spend, pi, sales, tope, daily }) {
    const nums = [spend, pi, sales, tope, daily];
    if (nums.some((n) => !Number.isFinite(n) || n < 0)) return 'Los números no pueden ser negativos ni quedar vacíos';
    if (sales > pi) return 'Las ventas no pueden ser más que los pagos iniciados';
    if (!(daily > 0)) return 'El presupuesto diario debe ser mayor que 0';
    if (!(tope > 0)) return 'El CPA tope debe ser mayor que 0';
    return null;
  }

  // Día del testeo en que está un gasto acumulado (1, 2, …).
  const testDay = (spend, daily) => Math.max(1, Math.ceil(spend / daily));
  // Máximo del deslizador de gasto: último corte + un día de presupuesto.
  const testRange = (daily) => NS_TEST.cuts[NS_TEST.cuts.length - 1] + daily;

  // Banco de práctica: números acumulados en cada corte; la respuesta la calcula testVerdict.
  // cpm: informativo (testVerdict no lo usa). tope: opcional; sin él, TEST_PRACTICE.tope. note: frase que sale tras decidir.
  // Presupuesto 100.000 y tope genérico: los tres cortes caen el día 1. Ejemplos inventados.
  const at = (spend, pi, sales) => ({ spend, pi, sales });
  const [K1, K2, K3] = NS_TEST.cuts;
  const TEST_CASES = [
    { id: 'c1', name: 'Conjunto 1', cpm: 18500, at: [at(K1, 1, 0)] },
    { id: 'c2', name: 'Conjunto 2', cpm: 24000, at: [at(K1, 0, 0)] },
    { id: 'c3', name: 'Conjunto 3', cpm: 16000, at: [at(K1, 3, 0), at(K2, 4, 0)] },
    { id: 'c4', name: 'Conjunto 4', cpm: 12500, at: [at(K1, 5, 0), at(K2, 6, 0), at(K3, 8, 0)] },
    { id: 'c5', name: 'Conjunto 5', cpm: 11000, at: [at(K1, 2, 1), at(K2, 9, 2), at(K3, 12, 3)] },
    { id: 'c6', name: 'Conjunto 6', cpm: 14000, at: [at(K1, 4, 0), at(K2, 7, 1), at(K3, 10, 2)] },
    { id: 'c7', name: 'Conjunto 7', cpm: 15500, at: [at(K1, 5, 0), at(K2, 5, 0), at(K3, 7, 1)] },
    { id: 'c8', name: 'Conjunto 8', cpm: 13000, at: [at(K1, 5, 1), at(K2, 5, 1), at(K3, 9, 3)] },
    { id: 'c9', name: 'Conjunto 9', cpm: 12000, tope: 20000, at: [at(K1, 5, 0), at(K2, 8, 1), at(K3, 10, 2)] },
    { id: 'c10', name: 'Conjunto 10', cpm: 17000, at: [at(K1, 3, 1), at(K2, 6, 1), at(K3, 8, 1)] },
    { id: 'c11', name: 'Conjunto 11', cpm: 26000, at: [at(K1, 5, 1), at(K2, 9, 2), at(K3, 12, 3)],
      note: ['El CPM está caro, pero la cadena sigue funcionando: los pagos iniciados y las ventas mandan.'] },
  ];
  // Versión de lo guardado en pyl-testing. v2: cambió la regla de c3-own y el mejor puntaje de antes ya no vale (TEST_BEST_SINCE).
  // v3 (SPEC 11): se guardan las entradas del Simulador (sim) y se deja de guardar el modo del paso 6; el mejor puntaje se conserva.
  const TEST_VERSION = 3;
  const TEST_BEST_SINCE = 2; // el mejor puntaje solo se reinicia si lo guardado no trae v o trae una menor
  // Tope y presupuesto con que se corre la práctica.
  const TEST_PRACTICE = { daily: NS_TEST.budget, tope: GENERIC_CPA.tope };

  // Sub-pestañas de Testeo. Una parte con `disabled` se ve pero no se puede abrir (como TikTok Ads en Desarrollo);
  // su `soon` es la tarjeta "Pronto" que mostrará mientras tanto. Un valor guardado de una parte así cae en la primera abierta.
  const TESTING_PARTS = [
    { k: 'real', t: '📂 Lectura real · pronto', disabled: true, soon: {
      icon: '📂', h: 'Lectura real',
      d: 'Subo el reporte de mis campañas y la app me dice qué hacer con cada conjunto. Esta parte llega en otra entrega.',
      items: [
        ['Subo mi reporte de Meta (el archivo del Administrador de anuncios).'],
        ['Califica cada conjunto con los cortes ', { b: NS_TEST.cuts.map(copText).join(', ').replace(/, ([^,]*)$/, ' y $1') }, ', igual que la Fase de testeo.'],
        ['Decisión por conjunto: ' + orList(TEST_ACTIONS.map((a) => a.t.toLowerCase())) + ', con la frase del Lab.'],
        ['Si se apaga, qué revisar: el CPM, el CPC o la página, la oferta y el formulario.'],
      ],
    } },
    { k: 'test', t: '🧪 Fase de testeo' },
    { k: 'sim', t: '🎛️ Simulador' },
  ];
  const testingPart = (k) => TESTING_PARTS.find((p) => p.k === k && !p.disabled) || TESTING_PARTS.find((p) => !p.disabled);

  // ---------- Paso a paso ----------
  const upTo = (n) => Array.from({ length: n }, (_, i) => i); // 0..n-1
  const R_ = TEST_RULES, ADS = core.ads.ADS;
  const cpmMax = (plat) => '$ ' + core.metrics.copText(core.metrics.HARD_METRICS.find((r) => r.k === 'cpm').view[plat].lim.max);

  const TEST_HEAD = { h: 'Fase de testeo', sub: 'Aprendo qué hacer en cada corte de gasto: ' + NS_TEST.cuts.map(copText).join(', ').replace(/, ([^,]*)$/, ' y $1') + '. Así lo califica el Lab de NovaSociety.' };

  // Tarjetas del mapa de los 3 cortes. branch.id = el que devuelve testVerdict (para iluminarla).
  const TEST_CUTS = [
    { cut: 1, head: 'Corte 1 · ' + copText(K1), look: 'Pagos iniciados', branches: [
      { id: 'c1-sale', light: 'g', cond: ['1 venta o más'], t: [C1_SALE] },
      { id: 'c1-off', light: 'r', cond: [orList(upTo(R_.piMinimo)) + ' pagos iniciados · 0 ventas'], t: ['Apágalo y revisa la cadena: CPM y CPC.'] },
      { id: 'c1-weak', light: 'y', cond: [R_.piMinimo + ' o ' + (R_.piBien - 1) + ' pagos iniciados · 0 ventas'], t: ['Flojo, se mantiene.'] },
      { id: 'c1-good', light: 'g', cond: [R_.piBien + ' pagos iniciados o más · 0 ventas'], t: ['Bien.'] },
    ] },
    { cut: 2, head: 'Corte 2 · ' + copText(K2), look: 'CPPI = gasto ÷ pagos iniciados', branches: [
      { id: 'c2-nosale-off', group: 'Sin ventas', light: 'r', cond: ['CPPI sobre ' + money(R_.cppiApaga)], t: ['Apágalo.'] },
      { id: 'c2-nosale-weak', group: 'Sin ventas', light: 'y', cond: ['CPPI entre ' + money(R_.cppiFlojo) + ' y ' + money(R_.cppiApaga)], t: ['Bastante flojo.'] },
      { id: 'c2-nosale-hold', group: 'Sin ventas', light: 'y', cond: ['CPPI de ' + money(R_.cppiFlojo) + ' o menos'], t: ['Se sostiene.'] },
      { id: 'c2-sale-good', group: 'Con venta', light: 'g', cond: ['CPPI bajo ' + money(R_.cppiBueno)], t: ['Buen pronóstico.'] },
      { id: 'c2-sale-hold', group: 'Con venta', light: 'y', cond: ['CPPI de ' + money(R_.cppiBueno) + ' a ' + money(R_.cppiFlojo)], t: ['Se sostiene.'] },
      { id: 'c2-sale-weak', group: 'Con venta', light: 'y', cond: ['CPPI sobre ' + money(R_.cppiFlojo)], t: ['Flojo.'] },
    ] },
    { cut: 3, head: 'Corte 3 · ' + copText(K3), look: 'Ventas y CPA contra el tope', branches: [
      { id: 'c3-off', light: 'r', cond: ['0 ventas'], t: ['Apágalo, aunque el CPPI sea bueno (entonces es el formulario o la oferta).'] },
      { id: 'c3-spend', light: 'g', cond: [R_.ventasGastar + ' o más ventas y CPA ≤ tope'], t: ['Déjalo gastar: pasa a escalado.'] },
      { id: 'c3-own', light: 'r', own: true, cond: ['1 venta, o ' + R_.ventasGastar + '+ con CPA > tope'], t: ['No cumple: apago y reviso la cadena.'] },
    ] },
  ];

  // Cada rama lleva su veredicto (el mismo que devuelve testVerdict, de BRANCH): la UI lo muestra al lado de la fila.
  for (const c of TEST_CUTS) for (const b of c.branches) {
    const x = BRANCH[b.id], action = ACTION_OF[x.v];
    b.v = x.v; b.verdict = { action, toca: TOCA[action], veredicto: x.veredicto };
    b.badge = x.v === 'great' ? x.veredicto : TOCA[action]; // texto de la etiqueta: la acción, salvo MARAVILLOSO
    if (b.own) { b.badge = 'Preguntar'; b.badgeIcon = '❓'; b.tip = { h: 'Regla propia', p: 'NovaSociety no define este caso. Con 1 venta a ' + copText(K3) + ' el CPA ya es ' + copText(K3) + ' o más: seguir es gastar con pérdida. Queda por aclarar.' }; } // regla propia: queda por aclarar con NovaSociety, no se presenta como acción
  }

  // Si se apagó: la cadena que se revisa. Las soluciones son las del MCP (reglas_de_juan).
  const TEST_CHAIN = {
    flow: ['CPM', 'CPC', 'CPPI', 'CPA'],
    // Lo que no se hace durante el testeo. El 8.000 del ejemplo sale del corte 1 (K1 × 0,4), no se escribe a mano.
    donts: [
      { icon: '⛔', b: 'No apagues antes de un corte.', p: [' Con ', money(Math.round(K1 * 0.4)), ' gastados los números todavía no dicen nada.'] },
      { icon: '⛔', b: 'No toques el anuncio mientras está en testeo.', p: [' Si cambias el texto, el público o el presupuesto, la lectura se daña.'] },
      { icon: '⛔', b: 'No decidas por el CTR.', p: [' Decide la cadena: CPM → CPC → CPPI → CPA.'] },
    ],
    reads: [
      { k: 'cpm', when: ['CPM caro (más de ', { b: cpmMax('meta') }, ' en Meta o ', { b: cpmMax('tiktok') }, ' en TikTok)'], fix: ['Creativos nuevos, con el hook en los primeros tres segundos.'] },
      { k: 'cpc', when: ['CPM sano y CPC caro'], fix: ['El producto no interesa: la gente no quiere ver más información de tu producto ni comprarlo.'] },
      { k: 'cppi', when: ['Buen CPPI y sin ventas'], fix: ['El problema está en la página, la oferta o el formulario. Mejora la confianza de la página, la oferta y el formulario, y quita la fricción.'] },
    ],
  };

  const ex = (spend, pi, sales) => ({ spend, pi, sales });
  // Regla del MCP: pasado el presupuesto del día con ventas, ya no es testeo.
  const TEST_SCALE_NOTE = 'Si ya gastó el presupuesto del día con ventas, dejó de ser testeo y se decide como escalando. Las reglas de testeo nunca se aplican a campañas que ya llevan rato vendiendo.';
  // Los 6 pasos, con el formato de la guía de Meta Ads (k, t, where, p, items, tip…) más:
  //   cut → tarjeta del corte · example → mini-ejemplo que califica testVerdict · tool → bloques propios de ui.testing
  // Cada paso tiene una sola casilla ("ok"): marcarla es dar el paso por hecho.
  const OK = (t) => [{ k: 'ok', t }];
  const TEST_STEPS = [
    { k: 'arranque', t: 'Arranque', where: 'Antes de pautar',
      p: ['Según el Lab, el testeo arranca con ', { b: money(NS_TEST.budget) + ' al día' }, '. ', { b: 'El testeo se mide por gasto acumulado, no por horas ni días' }, ': los tres cortes caen el mismo día. Dejo correr sin tocar hasta ', { b: money(K1) }, '.', ' ' + TEST_SCALE_NOTE],
      items: OK(['Entendí que cada corte se lee por gasto acumulado y que no toco nada hasta ', { b: money(K1) }, '.']),
      tool: ['bar'],
      bar: { max: NS_TEST.budget, marks: [...NS_TEST.cuts.map((at) => ({ at, label: at / 1000 + 'K' })), { at: NS_TEST.budget, label: NS_TEST.budget / 1000 + 'K', end: 'Fin del día' }] },
      tip: ['Con la guía ABO de Meta Ads (' + ADS.sets + ' conjuntos × ' + money(ADS.daily) + ') cada conjunto se califica con su propio gasto acumulado, y el corte de ' + copText(K3) + ' le llega el día ' + testDay(K3, ADS.daily) + '.'] },
    { k: 'corte1', t: 'Corte 1 · ' + copText(K1), where: 'Gasto acumulado ' + copText(K1), cut: 1, example: ex(K1, 4, 0), tool: ['cut'],
      p: ['Con ', { b: money(K1) }, ' gastados miro los ', { b: 'pagos iniciados' }, '. ' + C1_SALE],
      items: OK(['Sé qué hacer según los pagos iniciados en el corte 1.']) },
    { k: 'corte2', t: 'Corte 2 · ' + copText(K2), where: 'Gasto acumulado ' + copText(K2), cut: 2, example: ex(K2, 5, 0), tool: ['cut'],
      p: ['Con ', { b: money(K2) }, ' gastados miro el ', { b: 'CPPI' }, ' (gasto ÷ pagos iniciados) y si ya hay venta. Cambian los límites: con venta se exige un CPPI más bajo.'],
      items: OK(['Sé qué hacer según el CPPI, con y sin ventas, en el corte 2.']) },
    { k: 'corte3', t: 'Corte 3 · ' + copText(K3), where: 'Gasto acumulado ' + copText(K3), cut: 3, example: ex(K3, 12, 3), tool: ['cut', 'tope'],
      p: ['Con ', { b: money(K3) }, ' gastados miro las ', { b: 'ventas' }, ' y el ', { b: 'CPA' }, ' (gasto ÷ ventas) contra el tope. Si deja gastar el día, pasa a escalado (pestaña Escalado). ' + TEST_SCALE_NOTE],
      items: OK(['Sé qué hacer según las ventas y el CPA en el corte 3.']),
      tope: { examples: [GENERIC_CPA.tope, 20617] } },
    { k: 'cadena', t: 'La cadena y qué no hacer', where: 'Qué revisar y qué no hacer', tool: ['chain'],
      p: ['Cuando apago un conjunto, reviso la cadena en orden: ', { b: 'CPM → CPC → CPPI → CPA' }, '. Según dónde se rompe, cambia la solución.'],
      items: OK(['Sé qué revisar según dónde se rompe la cadena y qué no hago durante el testeo.']) },
    { k: 'practica', t: 'Practica', where: 'Simulacro', tool: ['cuts', 'sim'],
      p: ['Pongo a prueba lo aprendido con casos inventados: no es una campaña real.'],
      items: OK(['Hice una ronda de práctica.']) },
  ];

  // Barra del simulacro: cortes y fin del día. Si el fin del día cae justo en un corte, comparten marca.
  function testBar(daily) {
    const marks = NS_TEST.cuts.map((at) => ({ at, label: at / 1000 + 'K' }));
    const end = marks.find((m) => m.at === daily);
    if (end) end.end = 'Fin del día'; else marks.push({ at: daily, label: daily / 1000 + 'K', end: 'Fin del día' });
    return { max: testRange(daily), marks };
  }

  // "Juega con los números": todo lo que se muestra para { daily, spend, pi, sales, tope }.
  // Con un dato inválido no hay veredicto (verdict = null) y err dice por qué; con scaling = true tampoco (ya no es testeo); día, CPPI, CPA y zonas salen cuando se pueden.
  function testFree(st) {
    const { spend, pi, sales, tope, daily } = st, err = testCheck(st), ok = Number.isFinite(spend) && spend >= 0;
    const vt = err ? null : testVerdict(st);
    // Dejó de ser testeo: ya gastó el día y el corte 3 dio "Dejar gastar el día" (2+ ventas con CPA dentro del tope).
    const scaling = !!vt && spend >= daily && vt.branch === 'c3-spend';
    return {
      err, scaling, verdict: scaling ? null : vt,
      day: ok && daily > 0 ? testDay(spend, daily) : null,
      cppi: ok && pi > 0 ? spend / pi : null, cpa: ok && sales > 0 ? spend / sales : null,
      zones: tope > 0 ? cpaZones(tope) : null, bar: daily > 0 ? testBar(daily) : null,
    };
  }

  // ---------- Práctica: una ronda por los 11 casos ----------
  // run = { order: [id de caso], i: caso actual, cut: índice del corte dentro del caso, shown: ya avanzó hasta ese corte,
  //         hits, total, last: { chosen, correct, ok } | null }. Son funciones puras: devuelven un run nuevo.
  function practiceOrder(rnd = Math.random) {
    const a = TEST_CASES.map((c) => c.id);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const practiceNew = (order = practiceOrder()) => ({ order, i: 0, cut: 0, shown: false, hits: 0, total: 0, last: null });
  const practiceOver = (run) => run.i >= run.order.length;
  const caseOf = (run) => TEST_CASES.find((c) => c.id === run.order[run.i]);
  const topeOf = (c) => c.tope ?? TEST_PRACTICE.tope;
  const pointVerdict = (c, k) => testVerdict({ ...c.at[k], tope: topeOf(c) });
  // Un caso termina cuando la respuesta correcta es apagar o dejar gastar, o cuando no hay más cortes.
  const caseEnds = (run) => !!run.last && (run.last.correct === 'off' || run.last.correct === 'spend' || run.cut >= caseOf(run).at.length - 1);

  // "Avanzar": llega al corte y se ven sus números.
  const practiceShow = (run) => (run.shown || practiceOver(run) ? run : { ...run, shown: true });
  // Una decisión (off | watch | go | spend): suma el acierto y guarda cuál era la correcta.
  function practiceDecide(run, action) {
    if (!run.shown || run.last || practiceOver(run)) return run;
    const correct = pointVerdict(caseOf(run), run.cut).action, ok = action === correct;
    return { ...run, hits: run.hits + (ok ? 1 : 0), total: run.total + 1, last: { chosen: action, correct, ok } };
  }
  // Después de decidir: el siguiente corte del caso o el siguiente caso.
  function practiceNext(run) {
    if (!run.last) return run;
    return caseEnds(run) ? { ...run, i: run.i + 1, cut: 0, shown: false, last: null } : { ...run, cut: run.cut + 1, shown: false, last: null };
  }
  const practiceBest = (best, run) => (run.total ? Math.max(best == null ? 0 : best, Math.round((run.hits / run.total) * 100)) : best);

  // Lo que pinta la UI. El veredicto va siempre, pero la UI solo lo muestra cuando ya hay decisión (last).
  function practiceView(run) {
    const score = { hits: run.hits, total: run.total, pct: run.total ? Math.round((run.hits / run.total) * 100) : 0 };
    if (practiceOver(run)) return { over: true, score };
    const c = caseOf(run), p = c.at[run.cut], verdict = pointVerdict(c, run.cut), act = (k) => TEST_ACTIONS.find((x) => x.k === k);
    return {
      over: false, score, n: run.i + 1, of: run.order.length, name: c.name, cpm: c.cpm, tope: topeOf(c), note: c.note, cutN: verdict.cut, shown: run.shown,
      bar: testBar(TEST_PRACTICE.daily), from: run.cut ? c.at[run.cut - 1].spend : 0, to: p.spend,
      point: { ...p, cppi: verdict.cppi, cpa: verdict.cpa }, verdict,
      last: run.last && { ok: run.last.ok, chosen: act(run.last.chosen), correct: act(run.last.correct) },
      ends: caseEnds(run), lastCase: run.i === run.order.length - 1,
    };
  }

  core.testing = { TEST_CHAIN, TEST_CUTS, TEST_HEAD, TEST_STEPS, TESTING_PARTS, testingPart, CPA_ZONES, TEST_ACTIONS, TEST_BEST_SINCE, TEST_CASES, TEST_SCALE_NOTE, TEST_VERSION, TEST_PRACTICE, TEST_RULES, cpaZones, testCheck, testDay, practiceBest, practiceDecide, practiceNew, practiceNext, practiceOrder, practiceShow, practiceView, testBar, testFree, testRange, testVerdict };
})();
