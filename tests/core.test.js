// Pruebas del núcleo en Node puro, sin dependencias: node tests/core.test.js
// Valores tomados del comportamiento actual (SPEC 00) para detectar roturas al reorganizar (SPEC 02).
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const core = require('../js/index.js');

const casos = [];
const caso = (nombre, fn) => casos.push([nombre, fn]);

caso('exporta todas las funciones del núcleo aplanadas', () => {
  const claves = Object.keys(core).sort().join(',');
  assert.strictEqual(claves, 'ABO_STEPS,ADS,AD_STRATEGIES,AP_DEFAULTS,BASE_FORMULA,BASE_HEAD,BASE_METRICS,BY_PROVIDER,CH_CPA_READ,CH_HELP,CH_SIDES,COST_DEFAULTS,COUNTRIES,CPA_ZONES,CTR_UNIQUE_WARN,DK_DEFAULTS,DK_OPEN_CAT,DK_TOT_TOLERANCE,EXCLUDED,F,FAIL_HEAD,FILTERS,FLOW,GENERIC_CPA,GOALS,HARD_METRICS,HEADERS,HOME_EPOCH,HOME_NAME,HOME_QUOTES,HOME_SEED,HOME_SLOTS,HUB_DEFAULTS,HUB_VERSION,LADDER_BLOCKS,LANDING,LEVELS,LG_ACCOUNTS,LG_BANK,LG_CATALOG,LG_DAYS,LG_NEQUI,LG_PARTS,LG_STAGES,LG_STORE,LG_TEMPLATES,LIMITS,MARGIN,MISTAKES,MSP,NS_TEST,PYRAMID,RESEARCH,SATURATION,SCALE_ACTIONS,SCALE_CASES,SCALE_DAYS,SCALE_FREE,SCALE_GUARDS,SCALE_MAP,SCALE_METHODS,SCALE_PRACTICE,SCALE_RULES,SCALING_PARTS,SCORE_LEVELS,SCORE_MAX,SIM_DEFAULTS,SIM_SCENARIOS,SIM_STEP,STAGES,STATUS,STEPS,STRATEGIES,SURF_HEAD,SURF_STEPS,TESTING_PARTS,TEST_ACTIONS,TEST_BEST_SINCE,TEST_CASES,TEST_CHAIN,TEST_CUTS,TEST_HEAD,TEST_PRACTICE,TEST_RULES,TEST_SCALE_NOTE,TEST_STEPS,TEST_VERSION,TK_HISTORY_DAYS,TK_VERSION,TOOLS,URL_BASE,VALUE,VDO,WINNER,WINNER_GROUPS,actions,addDays,adsView,ageMonths,aggregate,apImport,apPlaceholders,apPrompt,apValues,budgetSteps,buildDropi,buildExport,buildMeta,buildMetrics,buildTemplate,campaignName,cascade,cellVal,chChain,chHard,chPlat,classify,competition,copText,count,cpaZones,cycles,defaultSlug,dkN,dkPlaceholders,dkPrompt,dkValues,evaluate,fill,fmt,fullTitle,funnel,homeDay,homeGreeting,homeHello,homeOrder,homePick,homeSlot,hubAdd,hubCheck,hubClean,hubDefaults,hubDomain,hubFavicon,hubInitials,hubLoad,hubOrder,hubRemove,hubSet,hubUrl,isDropi,isMetrics,key,kpis,lgForm,lgFromCand,lgMessage,lgMoney,lgMoneyText,lgPhone,lgPrefill,lgTemplate,lgValues,list,marginLevel,matchProduct,mspLevel,nf,norm,num,offerTexts,parseCSV,periodLabel,practiceBest,practiceDecide,practiceNew,practiceNext,practiceOrder,practiceShow,practiceView,previous,previousRange,priceFor,prices,products,progress,projectedVsPrevious,projection,quickAdd,quickCheck,quickPrice,quickRemove,roundLike,rowCells,scaleCheck,scaleFree,scaleGuard,scaleLadder,scaleMethod,scalePracticeBest,scalePracticeDecide,scalePracticeNew,scalePracticeNext,scalePracticeOrder,scalePracticeShow,scalePracticeView,scaleVerdict,scaleZone,scalingPart,score,scoreLevel,scoreParts,short,simAt,simBroken,simChain,simCheck,simEnd,simExpect,simLoad,simNum,simRng,simRun,simulate,slugify,stage,stageRange,stats,story,strategy,testBar,testCheck,testDay,testFree,testRange,testVerdict,testingPart,tkAdd,tkAddDays,tkAddSub,tkCanCarry,tkCarry,tkCarrySource,tkDateLabel,tkDayDate,tkDayKey,tkDayLabel,tkDelete,tkDeleteSub,tkEdit,tkEditSub,tkEmpty,tkIsHour,tkLoad,tkMove,tkMoveSub,tkParseHour,tkPastDays,tkProgress,tkRollOver,tkSetAll,tkSetHour,tkShortDate,tkTasksOf,tkToggle,tkToggleCollapsed,tkToggleSub,toISO,todayISO,unitBase,unitCost,unitEconomics,unsaved,verdict,view,weeks,winnerCheck,words,writeRegistro');
});

caso('Costeo: proveedor 30.000 da precio $99.900 y tope $21.617', () => {
  const p = { price: 30000 };
  const precio = core.priceFor(p, undefined);
  assert.strictEqual(precio, 99900);
  assert.strictEqual(Math.round(core.unitCost({ price: 30000, sellPrice: precio }).cpaMax), 21617);
});

caso('Guardado rápido: quickCheck, quickAdd y quickPrice', () => {
  assert.deepStrictEqual(core.quickCheck([], { name: '', dropi: '1' }), { ok: false, msg: 'Falta el nombre del producto.' });
  assert.deepStrictEqual(core.quickCheck([], { name: 'a', dropi: ' ' }), { ok: false, msg: 'Falta el ID Dropi.' });
  assert.deepStrictEqual(core.quickCheck([{ dropi: '7' }], { name: 'a', dropi: ' 7 ' }), { ok: false, msg: 'Ese ID ya está guardado.' });
  assert.deepStrictEqual(core.quickCheck([], { name: 'a', dropi: '7' }), { ok: true });
  const base = [{ id: '1', name: 'x', dropi: '1', createdAt: 1 }];
  const lista = core.quickAdd(base, { name: ' Masajeador ', dropi: ' 9 ', price: 25000, photo: 'data:x' }, 5);
  assert.strictEqual(base.length, 1, 'no debe tocar la lista recibida');
  assert.deepStrictEqual(lista[0], { id: '5', name: 'Masajeador', dropi: '9', createdAt: 5, price: 25000, photo: 'data:x' });
  assert.strictEqual(lista[1], base[0]);
  assert.strictEqual(core.quickPrice('$ 25.000'), 25000);
  assert.strictEqual(core.quickPrice('25000'), 25000);
  assert.strictEqual(core.quickPrice('25.000,50'), 25000);
  assert.strictEqual(core.quickPrice('abc'), null);
  const dos = [{ id: 'a', dropi: '1' }, { id: 'b', dropi: '2' }];
  assert.deepStrictEqual(core.quickRemove(dos, 'a'), [{ id: 'b', dropi: '2' }]);
  assert.strictEqual(dos.length, 2);
  assert.deepStrictEqual(core.quickRemove(dos, 'zz'), dos);
});

caso('P&L: aggregate del CSV de prueba de Dropi', () => {
  const csv = fs.readFileSync(path.join(__dirname, 'fixtures', 'dropi-prueba.csv'), 'utf8');
  const d = core.buildDropi(core.parseCSV(csv));
  assert.strictEqual(d.orders, 6);
  assert.strictEqual(d.noDate, 0);
  const a = core.aggregate(d.lines, [], { prod: '__all', from: null, to: null, adsOverride: 50000, iva: true }, null);
  assert.deepStrictEqual(
    { rec: a.rec, can: a.can, ent: a.ent, dev: a.dev, ruta: a.ruta, fact: a.fact, merc: a.merc, fletes: a.fletes, wallet: a.wallet, util: a.util, ads: a.ads },
    { rec: 6, can: 1, ent: 3, dev: 1, ruta: 1, fact: 349700, merc: 105000, fletes: 78000, wallet: 166700, util: 116700, ads: 50000 },
  );
  assert.strictEqual(a.efect, 0.75);
  assert.strictEqual(Math.round(a.cpa), 16667);
  assert.strictEqual(Math.round(a.cpaMax), 55567);
  // util < 0 <=> cpa > cpaMax (CLAUDE.md): con más inversión que el tope, pierde.
  const peor = core.aggregate(d.lines, [], { prod: '__all', from: null, to: null, adsOverride: 200000, iva: true }, null);
  assert.ok(peor.util < 0 && peor.cpa > peor.cpaMax);
});

caso('Hard Metrics: 5 filas en orden, dirección, destino y números del diagrama', () => {
  const H = core.HARD_METRICS;
  assert.deepStrictEqual(H.map((r) => r.k), ['ctr', 'cpc', 'cpm', 'cppi', 'cpa']);
  assert.deepStrictEqual(H.map((r) => r.dir), ['up', 'down', 'down', 'down', 'down']);
  assert.deepStrictEqual(H.map((r) => r.goal), ['buy', 'buy', 'buy', 'buy', 'profit']);
  assert.deepStrictEqual(H.filter((r) => r.group).map((r) => r.k), ['ctr', 'cpc']);
  // Lo que dice el diagrama (estático): número grande y texto pequeño por plataforma.
  const vista = (k, p) => { const v = H.find((r) => r.k === k).view[p]; return [v.main, v.ref]; };
  // El CTR dice "No se mira" en un aviso al pasar el mouse por su número, no como texto pequeño.
  assert.ok(H.find((r) => r.k === 'ctr').view.meta.tip.p.includes('No se mira') || H.find((r) => r.k === 'ctr').view.meta.tip.p.includes('no decide'));
  // Cada métrica menos el CPA trae su aviso de límite máximo (TikTok y Meta) en ambos lados; el CPA lo arma la UI con los genéricos.
  for (const k of ['ctr', 'cpc', 'cpm', 'cppi']) {
    for (const pl of ['meta', 'tiktok']) assert.strictEqual(H.find((r) => r.k === k).view[pl].tip.h, 'Límite máximo permitido', k + ' ' + pl);
  }
  // Cada métrica trae diagnóstico y palancas (la tabla del aviso de "¿Cómo se logra?").
  for (const r of H) assert.ok(r.diag.length >= 3 && r.lever.length >= 3, r.k + ' con diagnóstico y solución');
  assert.strictEqual(core.FAIL_HEAD.length, 2);
  // La nota del CTR ya no cita el caso de Gotas Focus.
  assert.ok(!H.find((r) => r.k === 'ctr').means.note.includes('Gotas'));
  // Cada métrica explica qué significa: frase simple, comparación y semáforo (3 o 4 señales con rango y significado).
  for (const r of H) {
    assert.ok(r.means.full && r.means.simple && r.means.analogy && r.means.note, r.k + ' con significado');
    assert.ok(r.means.signals.length >= 3 && r.means.signals.every((s) => s.t && s.m && 'gyor'.includes(s.z)), r.k + ' con señales');
  }
  // Cada lado muestra solo el límite de su plataforma.
  assert.deepStrictEqual(H.find((r) => r.k === 'cpm').view.meta.tip.li.map((l) => l[1]), ['$ 20.000', '< $ 5.000']);
  assert.deepStrictEqual(H.find((r) => r.k === 'cpm').view.tiktok.tip.li.map((l) => l[1]), ['$ 6.000', '< $ 5.000']);
  assert.deepStrictEqual([vista('ctr', 'tiktok'), vista('ctr', 'meta')], [['> 0,5 %', null], ['> 2 %', null]]);
  assert.deepStrictEqual([vista('cpc', 'tiktok'), vista('cpc', 'meta')], [['< 800', null], ['< 800', null]]);
  assert.deepStrictEqual([vista('cpm', 'tiktok'), vista('cpm', 'meta')], [['≤ 6.000', null], ['≤ 20.000', null]]);
  assert.deepStrictEqual([vista('cppi', 'tiktok'), vista('cppi', 'meta')], [['< 4.000', null], ['< 4.000', null]]);
  assert.deepStrictEqual([vista('cpa', 'tiktok'), vista('cpa', 'meta')], [['≤ 15.000', null], ['≤ 15.000', null]]);
  assert.strictEqual(core.GOALS.buy, 'Mayor probabilidad de compra');
  assert.strictEqual(core.GOALS.profit, 'Mayor rentabilidad');
});

caso('Hard Metrics: límites numéricos lim en CPM y CPC (SPEC 11)', () => {
  const H = core.HARD_METRICS;
  const lim = (k, p) => H.find((r) => r.k === k).view[p].lim;
  assert.deepStrictEqual(lim('cpm', 'meta'), { max: 20000, ideal: 5000, op: '<=' });
  assert.deepStrictEqual(lim('cpm', 'tiktok'), { max: 6000, ideal: 5000, op: '<=' });
  assert.deepStrictEqual(lim('cpc', 'meta'), { max: 800, ideal: 600, op: '<' });
  assert.deepStrictEqual(lim('cpc', 'tiktok'), { max: 800, ideal: 600, op: '<' });
  // Los textos que se ven salen de lim y no cambian.
  assert.deepStrictEqual(H.find((r) => r.k === 'cpc').view.meta.tip.li.map((l) => l[1]), ['$ 800', '< $ 600']);
  assert.strictEqual(H.find((r) => r.k === 'cpm').view.meta.main, '≤ 20.000');
  assert.strictEqual(H.find((r) => r.k === 'cpc').view.tiktok.main, '< 800');
});

caso('Hard Metrics: CPA genérico', () => {
  assert.deepStrictEqual(core.GENERIC_CPA, { escala: 12000, tope: 15000, apaga: 20000 });
  assert.strictEqual(core.copText(15000), '15.000');
});

caso('Métricas base: 5 fichas, fórmulas, notas y CTR único', () => {
  const B = core.BASE_METRICS;
  const H = core.HARD_METRICS;
  const txt = (segs) => segs.map((s) => (typeof s === 'string' ? s : s.b)).join('');
  assert.deepStrictEqual(B.map((m) => m.name), ['Presupuesto', 'Resultados', 'Impresiones', 'Monto gastado', 'Clics en el enlace']);
  // Nombre largo del reporte solo donde es distinto.
  assert.deepStrictEqual(B.filter((m) => m.csv).map((m) => [m.k, m.csv]), [['presupuesto', 'Presupuesto del conjunto de anuncios'], ['gasto', 'Monto gastado (COP)']]);
  // Fórmula visual: claves que existen y divisores en el orden de la cadena.
  const F = core.BASE_FORMULA;
  assert.ok(B.some((m) => m.k === F.num) && B.some((m) => m.k === F.cap));
  for (const d of F.divs) assert.ok((d.k ? B.some((m) => m.k === d.k) : d.label && d.uses) && H.some((r) => r.k === d.hm), 'divisor ' + (d.k || d.label));
  assert.deepStrictEqual(F.divs.map((d) => d.hm), ['cpm', 'cpc', 'cppi', 'cpa']);
  assert.deepStrictEqual(core.budgetSteps(3), [100000, 120000, 144000]);
  assert.ok(!B.some((m) => /alcance/i.test(m.name)));
  assert.ok(core.BASE_HEAD.title === 'Métricas base' && core.BASE_HEAD.sub);
  for (const m of B) assert.ok(m.def && m.uses.length && m.ns.length, m.k + ' con def, uses y ns');
  for (const m of B) for (const l of m.links) assert.ok(H.some((r) => r.k === l), m.k + ' enlaza ' + l);
  assert.deepStrictEqual(B[0].links, []);
  const ns = (k) => txt(B.find((m) => m.k === k).ns);
  const uses = (k) => B.find((m) => m.k === k).uses.map(txt).join(' | ');
  // Números: salen de NS_TEST, GENERIC_CPA y el CPM de HARD_METRICS.
  assert.ok(ns('presupuesto').includes('100.000') && ns('presupuesto').includes('+20 %') && ns('presupuesto').includes('120.000 → 144.000'));
  assert.deepStrictEqual(core.NS_TEST.cuts, [20000, 30000, 40000]);
  assert.ok(ns('resultados').includes('12.000') && ns('resultados').includes('15.000') && ns('resultados').includes('20.000'));
  assert.ok(ns('impresiones').includes('TikTok $ 6.000') && ns('impresiones').includes('Meta $ 20.000'));
  assert.ok(ns('gasto').includes('20.000, 30.000 y 40.000'));
  assert.ok(ns('clics').includes('el producto no interesa'));
  // Fórmulas.
  assert.ok(uses('resultados').includes('CPA = Monto gastado ÷ Resultados') && uses('resultados').includes('Costo por resultados'));
  assert.ok(uses('impresiones').includes('CPM = Monto gastado ÷ Impresiones × 1.000') && !uses('impresiones').includes('CTR'));
  assert.ok(['CPM', 'CPC', 'CPPI', 'CPA'].every((n) => uses('gasto').includes(n)) && uses('gasto').includes('CPPI = Monto gastado ÷ Pagos iniciados') && uses('gasto').includes('Costo x Checkout'));
  assert.ok(uses('clics').includes('CPC = Monto gastado ÷ Clics en el enlace') && uses('clics').includes('por personas') && uses('clics').includes('No se calcula con impresiones'));
  // Nombre del reporte: solo CTR y CPPI.
  assert.deepStrictEqual(H.filter((r) => r.report).map((r) => [r.k, r.report]), [['ctr', 'CTR único (porcentaje de clics en el enlace)'], ['cppi', 'Costo x Checkout']]);
  // CTR de Meta = CTR único, con el 2 % y la advertencia; TikTok igual.
  const ctr = H.find((r) => r.k === 'ctr');
  assert.deepStrictEqual(ctr.view.meta.tip.li[0].slice(0, 2), ['Meta (CTR único): ', '2 %']);
  assert.deepStrictEqual(ctr.view.tiktok.tip.li[0].slice(0, 2), ['TikTok: ', '0,5 %']);
  assert.ok(ctr.view.meta.tip.p.includes('No se mira'));
  assert.ok(core.CTR_UNIQUE_WARN.includes('Límite por confirmar'));
  assert.strictEqual(ctr.view.meta.tip.warn, core.CTR_UNIQUE_WARN);
  assert.strictEqual(ctr.means.warn, core.CTR_UNIQUE_WARN);
  assert.ok(ctr.means.signals[0].t.includes('2 % (Meta, CTR único)') && ctr.means.unique.includes('por personas'));
  assert.ok(!ctr.view.tiktok.tip.warn);
  // Fórmulas del panel de la "i": todas las métricas; el CTR con Meta (CTR único) y TikTok; una sola fuente con la tabla.
  for (const r of H) assert.ok(Array.isArray(r.means.formula) && r.means.formula.length, r.k + ' con fórmula');
  const f = (k) => H.find((r) => r.k === k).means.formula.map(txt).join(' | ');
  assert.ok(f('ctr').includes('Meta (CTR único): personas que hicieron clic en el enlace ÷ personas que vieron el anuncio × 100') && f('ctr').includes('TikTok: clics ÷ impresiones × 100'));
  assert.strictEqual(f('cpc'), 'Monto gastado ÷ Clics en el enlace');
  assert.strictEqual(f('cpm'), 'Monto gastado ÷ Impresiones × 1.000');
  assert.strictEqual(f('cppi'), 'Monto gastado ÷ Pagos iniciados');
  assert.strictEqual(f('cpa'), 'Monto gastado ÷ Resultados');
  for (const k of ['cpm', 'cpc', 'cpa']) assert.ok(B.some((m) => m.uses.map(txt).join(' ').includes(f(k))), k + ': misma fórmula en la tabla');
  for (const r of H.filter((x) => x.k !== 'ctr')) assert.ok(!r.means.warn && !r.means.unique && !(r.view.meta.tip && r.view.meta.tip.warn), r.k + ' sin advertencia');
});

caso('Escalado: testVerdict cubre cada fila de la tabla de reglas y sus bordes', () => {
  const T = 15000;
  const vd = (spend, pi, sales, tope = T) => core.testVerdict({ spend, pi, sales, tope });
  const txt = (r) => r.detalle.map((s) => (typeof s === 'string' ? s : s.b)).join('');
  const quien = (r) => [r.v, r.toca, r.branch, r.light];
  // Antes del corte 1
  assert.deepStrictEqual(quien(vd(19999, 0, 0)), ['wait', 'Dejar correr', null, null]);
  assert.strictEqual(vd(19999, 0, 0).action, null);
  assert.ok(txt(vd(15000, 0, 0)).includes('Deja correr sin tocar'));
  // Corte 1 (20.000)
  assert.deepStrictEqual(quien(vd(20000, 2, 1)), ['great', 'Seguir sin tocar', 'c1-sale', 'g']);
  assert.strictEqual(vd(20000, 2, 1).veredicto, 'MARAVILLOSO');
  assert.deepStrictEqual(quien(vd(20000, 0, 0)), ['off', 'Apagar', 'c1-off', 'r']);
  assert.deepStrictEqual(quien(vd(20000, 2, 0)), ['off', 'Apagar', 'c1-off', 'r']);
  assert.strictEqual(txt(vd(20000, 2, 0)), 'Apágalo y revisa la cadena: CPM y CPC.');
  assert.strictEqual(txt(vd(20000, 2, 1)), 'Si ya hay venta, sigue al siguiente corte sin tocar.');
  assert.deepStrictEqual(quien(vd(20000, 3, 0)), ['weak', 'Mantener vigilando', 'c1-weak', 'y']);
  assert.deepStrictEqual(quien(vd(20000, 4, 0)), ['weak', 'Mantener vigilando', 'c1-weak', 'y']);
  assert.deepStrictEqual(quien(vd(20000, 5, 0)), ['good', 'Seguir sin tocar', 'c1-good', 'g']);
  // Corte 2 (30.000) sin ventas: bordes 6.000 y 5.000
  assert.strictEqual(vd(30000, 4, 0).branch, 'c2-nosale-off');        // CPPI 7.500
  assert.strictEqual(vd(30000, 5, 0).branch, 'c2-nosale-weak');       // CPPI 6.000 exacto: bastante flojo
  assert.strictEqual(vd(30000, 5, 0).veredicto, 'BASTANTE FLOJO');
  assert.strictEqual(vd(30000, 6, 0).branch, 'c2-nosale-hold');       // CPPI 5.000 exacto
  assert.strictEqual(vd(30000, 0, 0).branch, 'c2-nosale-off');        // sin PI
  assert.strictEqual(vd(30000, 0, 0).cppi, null);
  // Corte 2 con venta
  assert.deepStrictEqual(quien(vd(30000, 9, 2)), ['good', 'Seguir sin tocar', 'c2-sale-good', 'g']); // 3.333
  assert.strictEqual(vd(30000, 9, 2).veredicto, 'BUEN PRONÓSTICO');
  assert.strictEqual(vd(30000, 7, 1).branch, 'c2-sale-hold');         // 4.286
  assert.strictEqual(vd(30000, 6, 1).branch, 'c2-sale-hold');         // 5.000 exacto: se sostiene
  assert.strictEqual(vd(30000, 5, 1).branch, 'c2-sale-weak');         // 6.000
  assert.strictEqual(vd(30000, 5, 1).veredicto, 'FLOJO');
  // Corte 3 (40.000)
  assert.deepStrictEqual(quien(vd(40000, 8, 0)), ['off', 'Apagar', 'c3-off', 'r']);
  assert.ok(txt(vd(40000, 8, 0)).includes('aunque el CPPI sea bueno'));
  assert.deepStrictEqual(quien(vd(40000, 12, 3)), ['spend', 'Dejar gastar el día', 'c3-spend', 'g']);
  assert.strictEqual(vd(40000, 12, 3).fase, 'escalando');
  assert.strictEqual(vd(40000, 12, 3).veredicto, 'DÉJALO GASTAR EL DÍA');
  assert.strictEqual(vd(40000, 12, 3, 12000).branch, 'c3-own');       // CPA 13.333 > tope 12.000
  assert.strictEqual(vd(40000, 10, 2).branch, 'c3-own');              // CPA 20.000 > tope
  assert.strictEqual(vd(40000, 10, 2, 20000).branch, 'c3-spend');     // CPA = tope: pasa
  assert.strictEqual(vd(40000, 7, 1).branch, 'c3-own');
  assert.ok(txt(vd(40000, 7, 1)).includes('Regla propia'));
  // SPEC 10: la regla propia apaga (luz roja)
  for (const r of [vd(40000, 7, 1), vd(40000, 10, 2), vd(40000, 12, 3, 12000)]) {
    assert.deepStrictEqual(quien(r), ['own', 'Apagar', 'c3-own', 'r']);
    assert.strictEqual(r.action, 'off');
    assert.strictEqual(r.veredicto, 'NO CUMPLE · APÁGALO');
    assert.strictEqual(r.fase, 'apagado');
  }
  assert.ok(txt(vd(40000, 7, 1)).includes('lo apago en 40.000 y reviso la cadena') && txt(vd(40000, 7, 1)).includes('NovaSociety no define este caso') && txt(vd(40000, 7, 1)).includes('el CPA ya es 40.000 o más'));
  // Forma del veredicto del Lab
  const r = vd(30000, 5, 0);
  for (const k of ['fase', 'veredicto', 'toca', 'detalle', 'dura', 'senales', 'cut', 'v', 'action', 'light', 'branch', 'step', 'cppi', 'cpa']) assert.ok(k in r, k);
  assert.strictEqual(r.dura, false);
  assert.strictEqual(r.fase, 'testeo');
  assert.strictEqual(vd(20000, 0, 0).fase, 'apagado');
  assert.deepStrictEqual([vd(20000, 5, 0).step, vd(30000, 5, 0).step, vd(40000, 7, 1).step, vd(1000, 0, 0).step], [2, 3, 4, null]);
  assert.deepStrictEqual(r.senales, ['CPPI ', { b: '$ 6.000' }, ' (entre $ 5.000 y $ 6.000)']);
});

caso('Escalado: testCheck, testDay, testRange y zonas del tope', () => {
  const ok = { spend: 25000, pi: 2, sales: 0, tope: 15000, daily: 100000 };
  assert.strictEqual(core.testCheck(ok), null);
  assert.strictEqual(core.testCheck({ ...ok, pi: 1, sales: 2 }), 'Las ventas no pueden ser más que los pagos iniciados');
  assert.ok(core.testCheck({ ...ok, spend: -1 }));
  assert.ok(core.testCheck({ ...ok, tope: 0 }));
  assert.ok(core.testCheck({ ...ok, daily: NaN }));
  assert.strictEqual(core.testDay(40000, 100000), 1);
  assert.strictEqual(core.testDay(40000, 30000), 2);
  assert.strictEqual(core.testDay(0, 100000), 1);
  assert.strictEqual(core.testRange(100000), 140000);
  assert.deepStrictEqual(core.cpaZones(core.GENERIC_CPA.tope), core.GENERIC_CPA);
  assert.deepStrictEqual(core.cpaZones(20617), { escala: 16494, tope: 20617, apaga: 27489 });
  assert.deepStrictEqual(core.cpaZones(32617), { escala: 26094, tope: 32617, apaga: 43489 });
  // Una sola fuente de los números
  assert.deepStrictEqual(core.NS_TEST.cuts, [20000, 30000, 40000]);
  assert.strictEqual(core.NS_TEST.budget, 100000);
  assert.deepStrictEqual(core.TEST_PRACTICE, { daily: core.NS_TEST.budget, tope: core.GENERIC_CPA.tope });
  assert.deepStrictEqual(core.TEST_ACTIONS.map((a) => a.k), ['off', 'watch', 'go', 'spend']);
  assert.strictEqual(core.TEST_VERSION, 3);
  assert.strictEqual(core.TEST_BEST_SINCE, 2, 'El mejor puntaje solo se reinicia si lo guardado es anterior a v: 2');
});

caso('Escalado: los 11 casos del banco dan las respuestas de la spec', () => {
  const esperado = {
    c1: ['off'], c2: ['off'], c3: ['watch', 'off'], c4: ['go', 'watch', 'off'],
    c5: ['go', 'go', 'spend'], c6: ['watch', 'watch', 'off'], c7: ['go', 'watch', 'off'], c8: ['go', 'watch', 'spend'],
    c9: ['go', 'go', 'spend'], c10: ['go', 'watch', 'off'], c11: ['go', 'go', 'spend'],
  };
  assert.strictEqual(core.TEST_CASES.length, 11);
  const cpms = { c1: 18500, c2: 24000, c3: 16000, c4: 12500, c5: 11000, c6: 14000, c7: 15500, c8: 13000, c9: 12000, c10: 17000, c11: 26000 };
  for (const c of core.TEST_CASES) {
    assert.strictEqual(c.cpm, cpms[c.id], c.id + ' cpm');
    assert.ok(c.tope === undefined || c.id === 'c9', 'solo c9 trae tope');
    const res = c.at.map((p) => core.testVerdict({ ...p, tope: c.tope ?? core.TEST_PRACTICE.tope }));
    assert.deepStrictEqual(res.map((r) => r.action), esperado[c.id], c.id);
    res.forEach((r, i) => assert.strictEqual(r.cut, i + 1, c.id + ' corte ' + (i + 1)));
    // Los números acumulados no bajan de un corte a otro
    c.at.forEach((p, i) => { if (i) assert.ok(p.pi >= c.at[i - 1].pi && p.sales >= c.at[i - 1].sales, c.id + ' acumulado'); });
  }
  const rama = (id, i) => core.testVerdict({ ...core.TEST_CASES.find((c) => c.id === id).at[i], tope: 15000 }).branch;
  assert.strictEqual(rama('c7', 1), 'c2-nosale-weak');
  assert.strictEqual(rama('c8', 1), 'c2-sale-weak');
  assert.strictEqual(rama('c6', 2), 'c3-own');
  assert.strictEqual(rama('c7', 2), 'c3-own');
  assert.strictEqual(rama('c5', 0), 'c1-sale');
  // c9: CPA 20.000 = tope 20.000 (igual o menor) → Dejar gastar; con el tope fijo de 15.000 no cumpliría
  const c9 = core.TEST_CASES.find((c) => c.id === 'c9');
  assert.strictEqual(c9.tope, 20000);
  assert.strictEqual(core.testVerdict({ ...c9.at[2], tope: c9.tope }).cpa, 20000);
  assert.strictEqual(core.testVerdict({ ...c9.at[2], tope: 15000 }).branch, 'c3-own');
  // c10: empieza maravilloso y a los 40.000 no cumple (regla propia)
  assert.deepStrictEqual(['c10'].map((id) => [0, 1, 2].map((i) => rama(id, i))), [['c1-sale', 'c2-sale-hold', 'c3-own']]);
  // c11: CPM 26.000 (caro) con cadena funcionando: nunca apaga y trae su nota
  const c11 = core.TEST_CASES.find((c) => c.id === 'c11');
  assert.ok(c11.cpm > 20000 && c11.note.join('').includes('la cadena sigue funcionando'));
  assert.ok(core.TEST_CASES.filter((c) => c.id !== 'c11').every((c) => !c.note));
  // practiceView trae cpm, tope y note del caso
  let rv = core.practiceShow(core.practiceNew(['c9']));
  assert.deepStrictEqual([core.practiceView(rv).cpm, core.practiceView(rv).tope, core.practiceView(rv).note], [12000, 20000, undefined]);
  rv = core.practiceShow(core.practiceNew(['c1']));
  assert.strictEqual(core.practiceView(rv).tope, core.TEST_PRACTICE.tope);
  assert.deepStrictEqual(core.practiceView(core.practiceNew(['c11'])).note, c11.note);
  // c9 con el tope propio: la respuesta correcta en el corte 3 es Dejar gastar
  rv = core.practiceNew(['c9']); rv.cut = 2; rv = core.practiceDecide(core.practiceShow(rv), 'spend');
  assert.strictEqual(rv.last.ok, true);
});

caso('Escalado: 6 pasos en orden, tarjetas de corte y ramas que testVerdict devuelve', () => {
  const S = core.TEST_STEPS, txt = (a) => a.map((s) => (typeof s === 'string' ? s : s.b)).join('');
  const tc = (id) => core.TEST_CUTS.flatMap((c) => c.branches).find((b) => b.id === id);
  assert.deepStrictEqual(S.map((s) => s.t), ['Arranque', 'Corte 1 · 20.000', 'Corte 2 · 30.000', 'Corte 3 · 40.000', 'La cadena y qué no hacer', 'Practica']);
  assert.deepStrictEqual(S.map((s) => s.k), ['arranque', 'corte1', 'corte2', 'corte3', 'cadena', 'practica']);
  for (const s of S) assert.ok(s.where && s.p && s.items.length === 1 && s.items[0].k === 'ok' && s.tool.length, s.k + ' con formato de paso');
  // Pasos 2–4: corte y mini-ejemplo que califica testVerdict (sin respuesta escrita).
  assert.deepStrictEqual(S.slice(1, 4).map((s) => s.cut), [1, 2, 3]);
  for (const s of S.slice(1, 4)) {
    assert.ok(s.example && !('veredicto' in s.example), s.k + ' ejemplo sin veredicto escrito');
    const r = core.testVerdict({ ...s.example, tope: core.TEST_PRACTICE.tope });
    assert.strictEqual(r.cut, s.cut, s.k + ' el ejemplo cae en su corte');
    assert.strictEqual(r.step, S.indexOf(s) + 1, s.k + ' el paso que explica el corte');
  }
  // Paso 1: 100.000 al día, marcas 20K / 30K / 40K y fin del día; nota ABO con el día 2.
  assert.ok(txt(S[0].p).includes('$ 100.000 al día') && txt(S[0].p).includes('gasto acumulado'));
  assert.deepStrictEqual(S[0].bar.marks.map((m) => m.label), ['20K', '30K', '40K', '100K']);
  assert.strictEqual(S[0].bar.marks[3].end, 'Fin del día');
  assert.ok(S[0].tip[0].includes('4 conjuntos × $ 30.000') && S[0].tip[0].includes('el día 2'));
  // Paso 4: caja del tope con el genérico y el ejemplo 20.617.
  assert.deepStrictEqual(S[3].tope.examples, [core.GENERIC_CPA.tope, 20617]);
  assert.ok(S[3].tool.includes('tope'));
  // Paso 6: mapa + simulacro.
  assert.deepStrictEqual(S[5].tool, ['cuts', 'sim']);
  // Mapa de los 3 cortes: cada rama es una que testVerdict devuelve, y testVerdict no devuelve ninguna fuera del mapa.
  assert.deepStrictEqual(core.TEST_CUTS.map((c) => c.cut), [1, 2, 3]);
  const ids = core.TEST_CUTS.flatMap((c) => c.branches.map((b) => b.id)).sort();
  const alcanzadas = new Set();
  for (const spend of [5000, 20000, 30000, 40000]) for (let pi = 0; pi <= 14; pi++) for (let sales = 0; sales <= Math.min(pi, 4); sales++) for (const tope of [12000, 15000]) alcanzadas.add(core.testVerdict({ spend, pi, sales, tope }).branch);
  alcanzadas.delete(null);
  assert.deepStrictEqual([...alcanzadas].sort(), ids, 'ramas del mapa = ramas de testVerdict');
  // SPEC 10 · cada rama del mapa trae el veredicto que devuelve testVerdict para esa rama
  const alcance = new Map();
  for (const spend of [20000, 30000, 40000]) for (let pi = 0; pi <= 14; pi++) for (let sales = 0; sales <= Math.min(pi, 4); sales++) for (const tope of [12000, 15000]) { const r = core.testVerdict({ spend, pi, sales, tope }); alcance.set(r.branch, r); }
  for (const b of core.TEST_CUTS.flatMap((c) => c.branches)) {
    const r = alcance.get(b.id);
    assert.deepStrictEqual(b.verdict, { action: r.action, toca: r.toca, veredicto: r.veredicto }, b.id + ' veredicto = testVerdict');
    assert.strictEqual(b.v, r.v, b.id + ' v');
  }
  assert.deepStrictEqual(core.TEST_CUTS[0].branches.map((b) => b.verdict.veredicto), ['MARAVILLOSO', 'APÁGALO', 'FLOJO', 'BIEN']);
  assert.deepStrictEqual(core.TEST_CUTS[0].branches.map((b) => txt(b.cond).endsWith('0 ventas')), [false, true, true, true]);
  assert.deepStrictEqual(core.TEST_CUTS[0].branches.map((b) => b.badge), ['MARAVILLOSO', 'Apagar', 'Mantener vigilando', 'Seguir sin tocar']);
  assert.ok(core.TEST_CUTS.flatMap((c) => c.branches).filter((b) => !b.own).every((b) => b.badge === (b.v === 'great' ? b.verdict.veredicto : b.verdict.toca)), 'badge = acción, salvo great y la regla propia');
  assert.deepStrictEqual([tc('c3-own').badge, tc('c3-own').badgeIcon, tc('c3-own').verdict.action], ['Preguntar', '❓', 'off'], 'Regla propia: etiqueta Preguntar; la acción sigue siendo apagar');
  assert.strictEqual(txt(core.TEST_CUTS[0].branches[2].cond), '3 o 4 pagos iniciados · 0 ventas');
  // Semáforo y marca de Regla propia.
  assert.deepStrictEqual(core.TEST_CUTS.flatMap((c) => c.branches).filter((b) => b.own).map((b) => b.id), ['c3-own']);
  assert.strictEqual(tc('c3-own').light, 'r');
  assert.deepStrictEqual(tc('c3-own').cond, ['1 venta, o 2+ con CPA > tope']);
  assert.strictEqual(txt(tc('c3-own').t), 'No cumple: apago y reviso la cadena.');
  assert.deepStrictEqual([tc('c3-spend').cond, txt(tc('c3-spend').t)], [['2 o más ventas y CPA ≤ tope'], 'Déjalo gastar: pasa a escalado.']);
  assert.deepStrictEqual(core.TEST_CUTS[1].branches.map((b) => b.group), ['Sin ventas', 'Sin ventas', 'Sin ventas', 'Con venta', 'Con venta', 'Con venta']);
  // Cadena: CPM → CPC → CPPI → CPA, "No se mira el CTR" y las 3 lecturas con el CPM de HARD_METRICS.
  assert.deepStrictEqual(core.TEST_CHAIN.flow, ['CPM', 'CPC', 'CPPI', 'CPA']);
  assert.ok(!('ctr' in core.TEST_CHAIN) && !('note' in core.TEST_CHAIN), 'ctr y note los absorben las reglas');
  const D = core.TEST_CHAIN.donts;
  assert.deepStrictEqual(D.map((d) => d.b), ['No apagues antes de un corte.', 'No toques el anuncio mientras está en testeo.', 'No decidas por el CTR.']);
  assert.ok(txt(D[0].p).includes('Con $ 8.000 gastados') && txt(D[0].p).includes('todavía no dicen nada'));   // 8.000 = corte 1 × 0,4
  assert.ok(txt(D[1].p).includes('el texto, el público o el presupuesto'));
  assert.ok(txt(D[2].p).includes('CPM → CPC → CPPI → CPA'));
  assert.ok(D.every((d) => d.icon === '⛔'));
  assert.ok(core.TEST_CHAIN.reads.every((r) => !('icon' in r)), 'las lecturas no llevan emoji');
  assert.strictEqual(S[4].where, 'Qué revisar y qué no hacer');
  assert.strictEqual(core.TEST_CHAIN.reads.length, 3);
  assert.ok(txt(core.TEST_CHAIN.reads[0].when).includes('$ 20.000') && txt(core.TEST_CHAIN.reads[0].when).includes('$ 6.000'));
  assert.ok(txt(core.TEST_CHAIN.reads[2].fix).includes('la página, la oferta o el formulario'));
  // SPEC 10 · textos corregidos
  assert.strictEqual(txt(tc('c1-sale').t), 'Si ya hay venta, sigue al siguiente corte sin tocar.');
  assert.strictEqual(txt(tc('c1-off').t), 'Apágalo y revisa la cadena: CPM y CPC.');
  assert.ok(!txt(S[1].p).includes('no hace falta mirar más'));
  assert.ok(txt(S[1].p).includes('sigue al siguiente corte'));
  const ESCALA = 'Si ya gastó el presupuesto del día con ventas, dejó de ser testeo y se decide como escalando. Las reglas de testeo nunca se aplican a campañas que ya llevan rato vendiendo.';
  assert.ok(txt(S[0].p).endsWith(ESCALA) && txt(S[3].p).endsWith(ESCALA), 'frase de escalado en arranque y corte3');
  assert.ok(!JSON.stringify(core.TEST_CHAIN).includes('zona de apagado'));
  assert.ok(core.TEST_HEAD.h === 'Fase de testeo' && core.TEST_HEAD.sub.includes('20.000, 30.000 y 40.000'));
});

caso('Testeo: partes en orden, Lectura real deshabilitada con su tarjeta Pronto y frase del paso 4', () => {
  assert.deepStrictEqual(core.TESTING_PARTS.map((p) => p.k), ['real', 'test', 'sim']);
  assert.strictEqual(core.TESTING_PARTS[2].t, '🎛️ Simulador');
  assert.ok(!core.TESTING_PARTS[2].disabled && core.TESTING_PARTS[0].disabled, 'Simulador habilitado; Lectura real sigue pronto');
  assert.strictEqual(core.testingPart('sim').k, 'sim', 'Un sim guardado abre el Simulador');
  assert.ok(core.TESTING_PARTS[0].disabled && core.TESTING_PARTS[0].soon && !core.TESTING_PARTS[1].disabled, 'Solo Lectura real está deshabilitada');
  assert.strictEqual(core.testingPart('surf').k, 'test', 'Un valor viejo cae en test');
  assert.strictEqual(core.testingPart('real').k, 'test', 'Una parte deshabilitada cae en la primera abierta');
  assert.strictEqual(core.testingPart('test').k, 'test');
  const sn = core.TESTING_PARTS[0].soon, txt = (a) => a.map((x) => (typeof x === 'string' ? x : x.b)).join('');
  assert.strictEqual(sn.items.length, 4);
  assert.ok(txt(sn.items[1]).includes(core.NS_TEST.cuts.map(core.copText).join(', ').replace(/, ([^,]*)$/, ' y $1')), 'Cortes desde NS_TEST');
  assert.ok(txt(sn.items[2]).includes(core.TEST_ACTIONS.map((a) => a.t.toLowerCase())[0]), 'Decisiones desde TEST_ACTIONS');
  const p4 = JSON.stringify(core.TEST_STEPS[3]);
  assert.ok(p4.includes('pasa a escalado (pestaña Escalado).') && !p4.includes('Pronto') && !p4.includes('Surfing Scaling'), 'Frase del paso 4');
});

// ---------- Escalado · Surfing Scaling (SPEC 07) ----------
const sv = (days, level = 3, tope = 15000) => core.scaleVerdict({ days, level, tope });
const dd = (spend, sales, pi = sales + 3) => ({ spend, sales, pi });
// Tres días con el mismo gasto y las ventas dadas.
const tres = (spend, s) => s.map((n) => dd(spend, n));

caso('Escalado: la escalera de 15 escalones es la del MCP y se calcula desde NS_TEST', () => {
  assert.deepStrictEqual(core.scaleLadder(15), [100000, 120000, 144000, 173000, 207000, 249000, 299000, 358000, 430000, 516000, 619000, 743000, 892000, 1070000, 1280000]);
  assert.strictEqual(core.scaleLadder()[0], core.NS_TEST.budget);
  assert.strictEqual(core.scaleLadder(3).length, 3);
  assert.deepStrictEqual(core.LADDER_BLOCKS.map((b) => [b.from, b.to, b.t]), [[0, 4, 'Testeo y confirmación'], [5, 9, 'Zona de crecimiento'], [10, 14, 'Alto volumen']]);
  assert.strictEqual(core.SCALE_RULES.levels, 15);
});

caso('Escalado: scaleVerdict, zonas de la ventana y sus bordes (tope 15.000: escala 12.000, apaga 20.000)', () => {
  // CPA igual en los 3 días: el gasto y las ventas dan el CPA justo.
  const w = (spend, sales) => sv(tres(spend, [sales, sales, sales]));
  assert.strictEqual(w(120000, 11).branch, 'zone-up');          // 10.909 < escala
  assert.strictEqual(w(120000, 10).branch, 'zone-hold');        // justo en escala: ya no sube
  assert.strictEqual(w(150000, 10).branch, 'zone-hold');        // justo en el tope: se sostiene
  assert.strictEqual(w(150001, 10).branch, 'zone-down');        // apenas sobre el tope
  assert.strictEqual(w(200000, 10).branch, 'zone-down');        // justo en apaga: todavía baja
  const off = w(200001, 10);                                    // sobre apaga en los 3 días: regla dura (ver abajo)
  assert.strictEqual(off.branch, 'off-hard');
  // Ventana sobre apaga sin que los dos últimos días lo estén: zona de apagar, baja y no apaga.
  const zoff = sv([dd(300000, 10), dd(300000, 10), dd(150000, 10)]);
  assert.deepStrictEqual([zoff.branch, zoff.action, zoff.dura], ['zone-off', 'down', false]);
  assert.ok(JSON.stringify(zoff.detalle).includes('nada se apaga por un solo día'));
  // Forma del Lab.
  const up = w(120000, 11);
  assert.deepStrictEqual([up.fase, up.action, up.light, up.source, up.toca, up.zone], ['escalando', 'up', 'g', 'lab', 'Subir un escalón', 'up']);
  assert.deepStrictEqual([up.from, up.to, up.budget], [3, 4, 207000]);
  assert.ok(Math.abs(up.cpaWin - 120000 / 11) < 1e-9);
  assert.ok(Array.isArray(up.detalle) && Array.isArray(up.senales));
  // Con menos días (día 2) usa los que hay; con más de 3 solo cuentan los últimos 3.
  assert.strictEqual(sv([dd(120000, 11)]).branch, 'zone-up');
  assert.strictEqual(sv([dd(900000, 1), ...tres(120000, [11, 11, 11])]).branch, 'zone-up');
  // El tope cambia las zonas: con tope 20.000 un CPA de 15.000 ya sube (escala = 16.000).
  assert.strictEqual(sv(tres(150000, [10, 10, 10]), 3, 20000).branch, 'zone-up');
});

caso('Escalado: día flojo (ayer justo en ×1,5), regla dura y excepción de un solo día', () => {
  // Venían a 12.000 (120.000 con 10 ventas); ayer a 17.999 → flojo; a 18.000 (×1,5 exacto) → baja.
  const flojo = (spendAyer, salesAyer) => sv([dd(120000, 10), dd(120000, 10), dd(spendAyer, salesAyer)]);
  assert.strictEqual(flojo(179990, 10).branch, 'flojo-hold');
  assert.strictEqual(flojo(179990, 10).action, 'hold');
  const exacto = flojo(180000, 10);
  assert.deepStrictEqual([exacto.branch, exacto.action, exacto.to], ['flojo-down', 'down', 2]);
  assert.strictEqual(flojo(180001, 10).branch, 'flojo-down');
  // Ayer sin ventas pero con gasto (y con pagos iniciados): baja, no apaga.
  assert.strictEqual(flojo(100000, 0).branch, 'flojo-down');
  // Si los días anteriores ya eran malos, no hay día flojo: manda la zona de la ventana.
  assert.strictEqual(sv([dd(160000, 10), dd(160000, 10), dd(160000, 10)]).branch, 'zone-down');
  // Ayer más barato o igual que los anteriores no es día flojo.
  assert.strictEqual(sv([dd(130000, 10), dd(130000, 10), dd(120000, 10)]).branch, 'zone-hold');
  // Regla dura: dos días seguidos sobre apaga (o sin ventas con gasto).
  const dura = sv([dd(120000, 10), dd(200001, 10), dd(200001, 10)]);
  assert.deepStrictEqual([dura.branch, dura.action, dura.dura, dura.to, dura.budget, dura.light], ['off-hard', 'off', true, null, 0, 'r']);
  assert.notStrictEqual(sv([dd(120000, 10), dd(200000, 10), dd(200001, 10)]).branch, 'off-hard', 'justo en apaga no cuenta como sobre apaga');
  assert.strictEqual(sv([dd(100000, 0), dd(100000, 0)]).branch, 'off-hard');
  assert.notStrictEqual(sv([dd(200001, 10), dd(120000, 10), dd(200001, 10)]).branch, 'off-hard', 'dos días sobre apaga pero no seguidos');
  // Excepción de un solo día: 0 ventas, 0 pagos iniciados y el doble de apaga (40.000) gastado.
  const uno = sv([dd(120000, 10), dd(120000, 10), dd(40000, 0, 0)]);
  assert.deepStrictEqual([uno.branch, uno.dura, uno.action], ['off-single', true, 'off']);
  assert.notStrictEqual(sv([dd(120000, 10), dd(120000, 10), dd(39999, 0, 0)]).branch, 'off-single');
  assert.notStrictEqual(sv([dd(120000, 10), dd(120000, 10), dd(40000, 0, 1)]).branch, 'off-single', 'con un pago iniciado no aplica');
});

caso('Escalado: escalón base y escalón 15', () => {
  const bueno = tres(100000, [11, 11, 11]);
  const malo = tres(150001, [10, 10, 10]);
  // N15 (índice 14): subir se sostiene con la nota; la rama sigue siendo zone-up.
  const n15 = sv(bueno, 14);
  assert.deepStrictEqual([n15.branch, n15.action, n15.from, n15.to, n15.budget], ['zone-up', 'hold', 14, 14, 1280000]);
  assert.ok(JSON.stringify(n15.detalle).includes('Último escalón'));
  assert.strictEqual(sv(bueno, 13).to, 14);
  // N1 (índice 0): bajar se queda en N1 con la nota; bajar dos desde N2 también queda en N1.
  const n1 = sv(malo, 0);
  assert.deepStrictEqual([n1.action, n1.from, n1.to, n1.budget], ['down', 0, 0, 100000]);
  assert.ok(JSON.stringify(n1.detalle).includes('escalón base'));
  const d2 = core.scaleGuard({ kind: 'dawn', spend: 36000, sales: 0, level: 1, tope: 15000 });
  assert.deepStrictEqual([d2.action, d2.to, d2.budget], ['down2', 0, 100000]);
  assert.strictEqual(core.scaleGuard({ kind: 'dawn', spend: 36000, sales: 0, level: 6, tope: 15000 }).to, 4);
  // Apagar no tiene escalón nuevo.
  assert.strictEqual(sv([dd(100000, 0), dd(100000, 0)], 5).to, null);
});

caso('Escalado: scaleGuard (curso) en sus bordes: 1 CPA = 12.000 y 3 CPA = 36.000', () => {
  const g = (kind, spend, sales, level = 4) => core.scaleGuard({ kind, spend, sales, level, tope: 15000 });
  assert.deepStrictEqual([g('raise', 11999, 0).branch, g('raise', 12000, 0).branch, g('raise', 12000, 1).branch], ['raise-hold', 'raise-down', 'raise-hold']);
  assert.deepStrictEqual([g('dawn', 35999, 0).branch, g('dawn', 36000, 1).branch, g('dawn', 36000, 0).branch, g('dawn', 36000, 2).branch], ['dawn-hold', 'dawn-down2', 'dawn-down2', 'dawn-hold']);
  const r = g('raise', 12000, 0);
  assert.deepStrictEqual([r.source, r.fase, r.action, r.from, r.to, r.budget, r.dura, r.cpaWin, r.zone], ['curso', 'escalando', 'down', 4, 3, 173000, false, null, null]);
  assert.strictEqual(g('dawn', 36000, 1).to, 2);
  // Los montos salen de escala (zonas del tope): con tope 20.000, escala = 16.000.
  assert.strictEqual(core.scaleGuard({ kind: 'raise', spend: 15999, sales: 0, level: 4, tope: 20000 }).branch, 'raise-hold');
  assert.strictEqual(core.scaleGuard({ kind: 'raise', spend: 16000, sales: 0, level: 4, tope: 20000 }).branch, 'raise-down');
  assert.deepStrictEqual(core.SCALE_GUARDS.map((x) => [x.k, x.amount]), [['raise', 12000], ['dawn', 36000]]);
  // Las reglas del curso llevan source 'curso'; las del MCP 'lab'.
  assert.ok(core.SCALE_MAP.filter((m) => m.source === 'curso').every((m) => /^(raise|dawn)-/.test(m.id)));
  assert.ok(core.SCALE_MAP.filter((m) => m.source === 'lab').every((m) => !/^(raise|dawn)-/.test(m.id)));
});

caso('Escalado: SCALE_MAP = exactamente las ramas que devuelven scaleVerdict y scaleGuard', () => {
  const alcanzadas = new Set();
  const ventas = [0, 4, 6, 8, 10, 11, 12];
  const dias = [];
  for (const spend of [40000, 39999, 100000, 120000, 150000, 160000, 200000, 210000]) for (const sales of ventas) for (const pi of [0, sales]) dias.push(dd(spend, sales, pi));
  const ayeres = [dd(120000, 10), dd(180000, 10), dd(180001, 10), dd(100000, 0), dd(40000, 0, 0), dd(200001, 10), dd(120000, 12)];
  for (const a of dias) for (const b of dias) for (const c of ayeres) {
    for (const tope of [12000, 15000]) {
      alcanzadas.add(sv([a, b, c], 3, tope).branch);
      alcanzadas.add(sv([b, c], 3, tope).branch);
    }
  }
  for (const kind of ['raise', 'dawn']) for (const spend of [0, 11999, 12000, 35999, 36000]) for (const sales of [0, 1, 2]) alcanzadas.add(core.scaleGuard({ kind, spend, sales, level: 3, tope: 15000 }).branch);
  const ids = core.SCALE_MAP.map((m) => m.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'ids únicos');
  assert.deepStrictEqual([...alcanzadas].sort(), [...ids].sort(), 'ramas del mapa = ramas de las funciones');
  // La regla dura va marcada "dura" en el mapa.
  assert.deepStrictEqual(core.SCALE_MAP.filter((m) => m.dura).map((m) => m.id), ['off-hard', 'off-single']);
  assert.ok(core.SCALE_MAP.every((m) => ['g', 'y', 'r'].includes(m.light) && m.cond.length && m.t.length));
});

caso('Escalado: scaleCheck y scaleFree (Juega con los números)', () => {
  const ok = core.SCALE_FREE();
  assert.strictEqual(core.scaleCheck(ok), null);
  assert.strictEqual(ok.tope, core.GENERIC_CPA.tope);
  assert.strictEqual(ok.days.length, 3);
  const con = (o) => ({ ...core.SCALE_FREE(), ...o });
  const masVentas = con({ days: [dd(100000, 5, 4), dd(100000, 5, 6), dd(100000, 5, 6)] });
  assert.strictEqual(core.scaleCheck(masVentas), 'El día 1 tiene más ventas que pagos iniciados');
  const f = core.scaleFree(masVentas);
  assert.strictEqual(f.verdict, null);
  assert.ok(f.err);
  assert.deepStrictEqual(f.cpas.map((c) => Math.round(c)), [20000, 20000, 20000]);
  assert.ok(core.scaleCheck(con({ level: 15 })) && core.scaleCheck(con({ level: -1 })) && core.scaleCheck(con({ level: 1.5 })));
  assert.ok(core.scaleCheck(con({ tope: 0 })));
  assert.ok(core.scaleCheck(con({ days: [dd(NaN, 1, 1)] })));
  assert.ok(core.scaleCheck(con({ days: [] })));
  // Con datos buenos: CPA por día, CPA de la ventana = gasto total ÷ ventas totales, zona, veredicto y presupuesto.
  const buenos = con({ level: 2, days: [dd(120000, 10, 12), dd(120000, 8, 9), dd(144000, 9, 11)] });
  const r = core.scaleFree(buenos);
  assert.strictEqual(r.err, null);
  assert.deepStrictEqual(r.cpas, [12000, 15000, 16000]);
  assert.ok(Math.abs(r.cpaWin - 384000 / 27) < 1e-9);
  assert.strictEqual(r.zone, 'hold');
  assert.deepStrictEqual(r.zones, { escala: 12000, tope: 15000, apaga: 20000 });
  assert.strictEqual(r.budget, 144000);
  assert.strictEqual(r.verdict.branch, 'flojo-hold');
  assert.strictEqual(core.scaleZone(0, 0, r.zones), null);
  assert.strictEqual(core.scaleZone(1, 0, r.zones), 'off');
});

caso('Escalado: sub-pestañas, métodos y 7 pasos de Surfing Scaling', () => {
  assert.deepStrictEqual(core.SCALING_PARTS.map((p) => [p.k, !!p.disabled]), [['real', true], ['scale', false], ['sim', true]]);
  assert.deepStrictEqual(core.SCALING_PARTS.map((p) => p.t), ['📂 Lectura real · pronto', '📈 Fase de escalado', '⚠️ Simulador · revisar']);
  assert.ok(core.SCALING_PARTS[0].soon.h && core.SCALING_PARTS[0].soon.items.length);
  assert.strictEqual(core.scalingPart('real').k, 'scale');
  assert.strictEqual(core.scalingPart('sim').k, 'scale');
  assert.strictEqual(core.scalingPart('x').k, 'scale');
  assert.deepStrictEqual(core.SCALE_METHODS.map((m) => [m.k, m.icon, !!m.steps, !!m.soon]), [['surf', '🏄', true, false], ['horiz', '🔀', false, true], ['refresh', '🔄', false, true]]);
  assert.ok(core.SCALE_METHODS[0].d.includes('+20 %'), 'el +20 % sale de NS_TEST.step');
  assert.strictEqual(core.scaleMethod('refresh').k, 'surf', 'Un método sin pasos no se abre');
  assert.strictEqual(core.scaleMethod('x').k, 'surf');
  assert.strictEqual(core.scaleMethod('surf').k, 'surf');
  const S = core.SURF_STEPS, txt = (a) => JSON.stringify(a);
  assert.deepStrictEqual(S.map((s) => s.k), ['empieza', 'zonas', 'escalera', 'ventana', 'reglas', 'proteccion', 'practica']);
  assert.deepStrictEqual(S.map((s) => s.tool), [['start'], ['zones'], ['ladder'], ['window'], ['rules'], ['guard'], ['map', 'sim']]);
  assert.ok(S.every((s) => s.items.length === 1 && s.items[0].k === 'ok' && s.p.length && s.where));
  // Paso 1: el día 1 es testeo y el primer escalón es el día 2; las dos fuentes con su etiqueta.
  assert.deepStrictEqual(S[0].start.timeline.map((t) => t.day.split(' ·')[0]), ['Día 1', 'Corte 40.000', 'Fin del día', 'Día 2']);
  assert.ok(txt(S[0].start.timeline[3].t).includes('$ 100.000') && txt(S[0].start.timeline[3].t).includes('$ 120.000'));
  assert.deepStrictEqual(S[0].start.sources.map((s) => s.tag), ['Lab', 'Regla del curso']);
  assert.ok(txt(S[0].start.sources[1].t).includes('Nunca el día 1'));
  // Paso 2: tope genérico y uno de costeo (el mismo ejemplo de Testeo).
  assert.deepStrictEqual(S[1].zones.examples, [15000, 20617]);
  assert.deepStrictEqual(core.cpaZones(S[1].zones.examples[0]), { escala: 12000, tope: 15000, apaga: 20000 });
  // Paso 4: la frase del curso y 3 días de ejemplo.
  assert.ok(txt(S[3].tip).includes('Ayer solo prende la alerta') && txt(S[3].tip).includes('pesa el CPA'));
  assert.strictEqual(S[3].window.days.length, 3);
  assert.strictEqual(S[3].window.tope, core.GENERIC_CPA.tope);
});

caso('Escalado: práctica, cada caso tiene respuesta y la califica scaleVerdict/scaleGuard', () => {
  const ids = core.SCALE_CASES.map((c) => c.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  assert.deepStrictEqual(core.SCALE_ACTIONS.map((a) => [a.k, a.icon]), [['up', '⬆️'], ['hold', '='], ['down', '⬇️'], ['down2', '⏬'], ['off', '🛑']]);
  assert.strictEqual(core.SCALE_PRACTICE.tope, core.GENERIC_CPA.tope);
  const respuesta = (c) => (c.kind === 'guard'
    ? core.scaleGuard({ kind: c.guard, spend: c.spend, sales: c.sales, level: c.level, tope: 15000 })
    : sv(c.days, c.level)).action;
  for (const c of core.SCALE_CASES) assert.ok(core.SCALE_ACTIONS.some((a) => a.k === respuesta(c)), c.id + ' tiene respuesta');
  // El banco usa las cinco decisiones del simulacro.
  assert.deepStrictEqual([...new Set(core.SCALE_CASES.map(respuesta))].sort(), ['down', 'down2', 'hold', 'off', 'up']);
  // Orden al azar: con rnd fijo es una permutación de los casos.
  const orden = core.scalePracticeOrder(() => 0.3);
  assert.deepStrictEqual([...orden].sort(), [...ids].sort());
  // Una ronda completa contestando siempre bien: 100 %.
  let r = core.scalePracticeNew(ids);
  assert.strictEqual(core.scalePracticeDecide(r, 'up'), r, 'no se decide antes de ver el caso');
  for (const c of core.SCALE_CASES) {
    r = core.scalePracticeShow(r);
    const v = core.scalePracticeView(r);
    assert.strictEqual(v.name, c.name);
    assert.strictEqual(v.level, c.level);
    assert.strictEqual(!!v.days, c.kind === 'day');
    assert.strictEqual(core.scalePracticeNext(r), r, '"Siguiente" sin decidir no hace nada');
    r = core.scalePracticeDecide(r, respuesta(c));
    assert.strictEqual(core.scalePracticeDecide(r, 'off'), r, 'no se decide dos veces');
    assert.strictEqual(core.scalePracticeView(r).last.ok, true);
    r = core.scalePracticeNext(r);
  }
  assert.strictEqual(core.scalePracticeView(r).over, true);
  assert.deepStrictEqual(core.scalePracticeView(r).score, { hits: ids.length, total: ids.length, pct: 100 });
  // Un error: la correcta sale del veredicto; el mejor puntaje solo sube.
  let e = core.scalePracticeShow(core.scalePracticeNew(['s5']));
  e = core.scalePracticeDecide(e, 'up');
  assert.deepStrictEqual(e.last, { chosen: 'up', correct: 'off', ok: false });
  const ve = core.scalePracticeView(e);
  assert.deepStrictEqual([ve.last.chosen.t, ve.last.correct.t, ve.verdict.branch, ve.lastCase], ['Subir un escalón', 'Apagar', 'off-hard', true]);
  assert.strictEqual(core.scalePracticeBest(100, r), 100);
  assert.strictEqual(core.scalePracticeBest(50, e), 50);
  assert.strictEqual(core.scalePracticeBest(null, core.scalePracticeNew(ids)), null);
  assert.strictEqual(core.scalePracticeBest(null, r), 100);
});

caso('Escalado: ningún número a mano (todo sale de NS_TEST, GENERIC_CPA y cpaZones) y SCALING_SOON desaparece', () => {
  assert.strictEqual(core.scaleLadder(2)[1], core.NS_TEST.budget * (1 + core.NS_TEST.step));
  assert.deepStrictEqual(core.cpaZones(core.GENERIC_CPA.tope), { escala: core.GENERIC_CPA.escala, tope: core.GENERIC_CPA.tope, apaga: core.GENERIC_CPA.apaga });
  assert.strictEqual(core.SCALING_SOON, undefined);
  assert.strictEqual(core.SCALE_GUARDS[0].amount, core.GENERIC_CPA.escala * core.SCALE_RULES.raiseCpa);
  assert.strictEqual(core.SCALE_GUARDS[1].amount, core.GENERIC_CPA.escala * core.SCALE_RULES.dawnCpa);
});

caso('Escalado: testFree (Juega con los números) y barra del simulacro', () => {
  const free = (o) => core.testFree({ daily: 100000, spend: 0, pi: 0, sales: 0, tope: 15000, ...o });
  const frase = (r) => r.verdict.detalle.map((s) => (typeof s === 'string' ? s : s.b)).join('');
  // Gasto 25.000, 2 PI, 0 ventas → apagar en el corte 1, rama c1-off.
  let r = free({ spend: 25000, pi: 2 });
  assert.deepStrictEqual([r.verdict.action, r.verdict.cut, r.verdict.branch], ['off', 1, 'c1-off']);
  assert.ok(frase(r).startsWith('Apágalo y revisa la cadena'));
  // Gasto 30.000, 5 PI, 0 ventas → bastante flojo (CPPI 6.000).
  r = free({ spend: 30000, pi: 5 });
  assert.deepStrictEqual([r.verdict.veredicto, r.verdict.action, r.cppi], ['BASTANTE FLOJO', 'watch', 6000]);
  // Día del testeo según el presupuesto.
  assert.strictEqual(free({ spend: 40000, pi: 8, sales: 3, daily: 30000 }).day, 2);
  assert.strictEqual(free({ spend: 40000, pi: 8, sales: 3 }).day, 1);
  // Gasto 40.000, 3 ventas: tope 15.000 → dejar gastar; tope 12.000 → mantener con Regla propia.
  r = free({ spend: 40000, pi: 12, sales: 3 });
  assert.deepStrictEqual([r.verdict.action, r.verdict.branch], ['spend', 'c3-spend']);
  assert.ok(Math.abs(r.cpa - 13333.33) < 0.01);
  r = free({ spend: 40000, pi: 12, sales: 3, tope: 12000 });
  assert.deepStrictEqual([r.verdict.action, r.verdict.branch], ['off', 'c3-own']);
  assert.ok(frase(r).includes('Regla propia'));
  // Antes del corte 1: deja correr.
  r = free({ spend: 15000 });
  assert.deepStrictEqual([r.verdict.v, r.verdict.action, r.verdict.branch], ['wait', null, null]);
  assert.ok(frase(r).includes('Deja correr sin tocar') && frase(r).includes('todavía no llega al corte 1'));
  // Ventas > PI: aviso y sin veredicto; CPPI y CPA salen null ("—") si no se pueden calcular.
  r = free({ spend: 30000, pi: 1, sales: 2 });
  assert.deepStrictEqual([r.err, r.verdict], ['Las ventas no pueden ser más que los pagos iniciados', null]);
  r = free({ spend: 10000 });
  assert.deepStrictEqual([r.cppi, r.cpa], [null, null]);
  // SPEC 10: "dejó de ser testeo" (gasto >= presupuesto del día y >= 40.000, y el corte 3 da Dejar gastar el día)
  r = free({ daily: 30000, spend: 40000, pi: 10, sales: 2, tope: 20000 });
  assert.deepStrictEqual([r.scaling, r.verdict, r.err], [true, null, null]);
  assert.strictEqual(r.day, 2); assert.strictEqual(r.cpa, 20000); assert.strictEqual(r.cppi, 4000); assert.ok(r.zones);
  assert.ok(core.TEST_SCALE_NOTE.includes('dejó de ser testeo'));
  r = free({ daily: 100000, spend: 40000, pi: 10, sales: 2, tope: 20000 });
  assert.deepStrictEqual([r.scaling, r.verdict.action, r.verdict.branch], [false, 'spend', 'c3-spend']);   // aún no gastó el día
  r = free({ daily: 30000, spend: 30000, pi: 6, sales: 1, tope: 20000 });
  assert.deepStrictEqual([r.scaling, r.verdict.cut, r.verdict.branch], [false, 2, 'c2-sale-hold']);        // corte 2 sigue en testeo
  r = free({ daily: 30000, spend: 40000, pi: 7, sales: 1, tope: 20000 });
  assert.deepStrictEqual([r.scaling, r.verdict.branch], [false, 'c3-own']);
  r = free({ daily: 30000, spend: 40000, pi: 12, sales: 3, tope: 12000 });
  assert.deepStrictEqual([r.scaling, r.verdict.branch], [false, 'c3-own']);                                // CPA sobre el tope: no escala
  r = free({ daily: 30000, spend: 40000, pi: 1, sales: 2, tope: 20000 });
  assert.deepStrictEqual([r.scaling, r.verdict, !!r.err], [false, null, true]);
  // Zonas bajo el tope.
  assert.deepStrictEqual(free({ tope: 32617 }).zones, { escala: 26094, tope: 32617, apaga: 43489 });
  assert.deepStrictEqual(free({}).zones, core.GENERIC_CPA);
  assert.strictEqual(free({ tope: 0 }).zones, null);
  // Barra: cortes + fin del día; si el día termina en un corte comparten marca.
  assert.deepStrictEqual(core.testBar(100000), { max: 140000, marks: [{ at: 20000, label: '20K' }, { at: 30000, label: '30K' }, { at: 40000, label: '40K' }, { at: 100000, label: '100K', end: 'Fin del día' }] });
  assert.deepStrictEqual(core.testBar(30000).marks.map((m) => [m.at, m.end || null]), [[20000, null], [30000, 'Fin del día'], [40000, null]]);
});

caso('Escalado: la ronda de práctica (orden, decisiones, fin de caso y puntaje)', () => {
  const ids = core.TEST_CASES.map((c) => c.id);
  // Orden al azar: siempre los 11 casos, cada uno una vez; con otro azar cambia.
  const o1 = core.practiceOrder(), o2 = core.practiceOrder(() => 0);
  assert.deepStrictEqual([...o1].sort(), [...ids].sort());
  assert.deepStrictEqual([...o2].sort(), [...ids].sort());
  assert.notDeepStrictEqual(o2, ids);
  // Una ronda acertando todo: 28 decisiones (1+1+2+3+3+3+3+3+3+3+3), 100 %.
  const jugar = (order, elegir) => {
    let r = core.practiceNew(order), decisiones = [];
    while (r.i < r.order.length) {
      r = core.practiceShow(r);
      const v = core.practiceView(r), k = elegir(v, decisiones.length);
      r = core.practiceDecide(r, k);
      decisiones.push([v.name, v.cutN, v.verdict.action, k]);
      r = core.practiceNext(r);
    }
    return { r, decisiones };
  };
  let g = jugar(ids, (v) => v.verdict.action);
  assert.deepStrictEqual([g.r.hits, g.r.total, core.practiceBest(null, g.r)], [28, 28, 100]);
  // Cada caso termina en Apagar / Dejar gastar o en su último corte; los demás siguen al siguiente corte.
  const porCaso = {};
  for (const [n, cut, correcta] of g.decisiones) (porCaso[n] ??= []).push([cut, correcta]);
  assert.deepStrictEqual(porCaso['Conjunto 1'], [[1, 'off']]);
  assert.deepStrictEqual(porCaso['Conjunto 3'], [[1, 'watch'], [2, 'off']]);
  assert.deepStrictEqual(porCaso['Conjunto 4'], [[1, 'go'], [2, 'watch'], [3, 'off']]);
  assert.deepStrictEqual(porCaso['Conjunto 5'], [[1, 'go'], [2, 'go'], [3, 'spend']]);
  assert.deepStrictEqual(porCaso['Conjunto 6'], [[1, 'watch'], [2, 'watch'], [3, 'off']]);
  // Una decisión equivocada cuenta como fallo y guarda la correcta.
  g = jugar(ids, (v, i) => (i === 0 ? 'go' : v.verdict.action));
  assert.deepStrictEqual([g.r.hits, g.r.total, core.practiceBest(null, g.r)], [27, 28, 96]);
  let r = core.practiceShow(core.practiceNew(ids));
  r = core.practiceDecide(r, 'go');
  assert.deepStrictEqual(r.last, { chosen: 'go', correct: 'off', ok: false });
  const v = core.practiceView(r);
  assert.deepStrictEqual([v.last.ok, v.last.chosen.icon, v.last.correct.t, v.ends, v.verdict.step, v.verdict.branch], [false, '✅', 'Apagar', true, 2, 'c1-off']);
  // Reglas: no se decide antes de avanzar ni dos veces; "Siguiente" sin decidir no hace nada.
  const nuevo = core.practiceNew(ids);
  assert.strictEqual(core.practiceDecide(nuevo, 'off'), nuevo);
  assert.strictEqual(core.practiceNext(core.practiceShow(nuevo)).cut, 0);
  assert.strictEqual(core.practiceDecide(r, 'off'), r);
  // Antes de avanzar la barra queda en el corte anterior; al avanzar llega al corte.
  r = core.practiceNew(['c4']);
  assert.deepStrictEqual([core.practiceView(r).from, core.practiceView(r).to, core.practiceView(r).cutN], [0, 20000, 1]);
  r = core.practiceNext(core.practiceDecide(core.practiceShow(r), 'go'));
  assert.deepStrictEqual([core.practiceView(r).from, core.practiceView(r).to, core.practiceView(r).cutN, core.practiceView(r).shown], [20000, 30000, 2, false]);
  // Fin de la ronda y mejor puntaje: solo sube.
  assert.strictEqual(core.practiceView(g.r).over, true);
  assert.deepStrictEqual(core.practiceView(g.r).score, { hits: 27, total: 28, pct: 96 });
  assert.strictEqual(core.practiceBest(100, g.r), 100);
  assert.strictEqual(core.practiceBest(50, g.r), 96);
  assert.strictEqual(core.practiceBest(null, core.practiceNew(ids)), null);
  assert.strictEqual(core.practiceView(core.practiceNew(ids)).lastCase, false);
});

caso('Prompt DropKiller: formulario vacío usa todos los valores por defecto', () => {
  const r = core.dkValues({ recDias: 7, meses: 3 });
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.errors, {});
  const t = core.dkPrompt(r.values);
  for (const x of ['mínimo de 100 y máximo de 2.000', 'entre 10 y 100 ventas en los últimos 7 días', 'Creados de 3 meses para acá',
    'mínimo 80 unidades, sin máximo', 'Máximo 3 proveedores', 'entre 0 y 5 veces', 'Ventas (Totales/7 días)',
    'TODAS (puede ser cualquier nicho; prioriza Salud, Belleza y bienestar), PERO cumple el perfil del punto 8']) assert.ok(t.includes(x), 'Falta: ' + x);
  assert.ok(!t.includes('{{'), 'No quedan variables sin reemplazar');
});

caso('Prompt DropKiller: 30 días, 6 meses y categoría escrita', () => {
  const t = core.dkPrompt(core.dkValues({ recDias: 30, meses: 6, categoria: '  Hogar  ' }).values);
  assert.ok(t.includes('entre 100 y 500 ventas en los últimos 30 días') && t.includes('Ventas (Totales/30 días)'));
  assert.ok(t.includes('Creados de 6 meses para acá'));
  assert.ok(t.includes('7. Categoría: Hogar.') && !t.includes('PERO cumple'));
  // Vacía o igual al placeholder: abierta.
  for (const c of ['', '  ', core.DK_DEFAULTS.categoria]) assert.ok(core.dkPrompt(core.dkValues({ recDias: 7, meses: 3, categoria: c }).values).includes('PERO cumple el perfil del punto 8'));
  // Lo escrito gana al defecto, y el defecto de Ventas recientes sigue a la ventana.
  const v = core.dkValues({ recDias: 30, meses: 3, totMax: '1.500', recMin: '120' }).values;
  assert.strictEqual(v.totMax, 1500); assert.strictEqual(v.recMin, 120); assert.strictEqual(v.recMax, 500);
});

caso('Prompt DropKiller: validación (negativos, decimales, texto y mín. > máx.)', () => {
  const e = (f) => core.dkValues({ recDias: 7, meses: 3, ...f });
  assert.strictEqual(e({ totMin: '-5' }).ok, false);
  assert.deepStrictEqual(e({ totMin: '-5' }).errors, { totMin: 'No puede ser negativo' });
  assert.deepStrictEqual(e({ stockMax: '1.5' }).errors, { stockMax: 'Escribe un número entero' });
  assert.deepStrictEqual(e({ provMax: 'abc' }).errors, { provMax: 'Escribe un número entero' });
  assert.deepStrictEqual(e({ restMin: '9', restMax: '2' }).errors, { restMin: 'El mínimo es mayor que el máximo', restMax: 'El mínimo es mayor que el máximo' });
  // Un mínimo escrito mayor que el máximo por defecto también falla.
  assert.deepStrictEqual(Object.keys(e({ totMin: '5000' }).errors).sort(), ['totMax', 'totMin']);
  assert.strictEqual(e({ totMin: '0', restMin: '0' }).ok, true);
  // Stock: sin máximo no hay par que validar; con máximo escrito sí.
  assert.strictEqual(e({ stockMin: '999' }).ok, true);
  assert.deepStrictEqual(Object.keys(e({ stockMin: '999', stockMax: '100' }).errors).sort(), ['stockMax', 'stockMin']);
  assert.ok(core.dkPrompt(e({ stockMax: '150' }).values).includes('mínimo 80 y máximo 150 unidades'));
});

caso('Prompt DropKiller: dkN y placeholders', () => {
  assert.strictEqual(core.dkN(2000), '2.000');
  assert.strictEqual(core.dkN(100), '100');
  assert.strictEqual(core.dkN(1234567), '1.234.567');
  const p7 = core.dkPlaceholders(7), p30 = core.dkPlaceholders(30);
  assert.deepStrictEqual([p7.totMin, p7.totMax, p7.recMin, p7.recMax, p7.stockMin, p7.stockMax, p7.provMax, p7.restMin, p7.restMax],
    ['100', '2.000', '10', '100', '80', 'Sin máximo', '3', '0', '5']);
  assert.deepStrictEqual([p30.recMin, p30.recMax], ['100', '500']);
  assert.strictEqual(p7.categoria, 'Todos (Salud, Belleza y bienestar primero)');
  assert.strictEqual(core.DK_TOT_TOLERANCE, 3000);
});

caso('Prompt buscar anuncios: defectos, valores escritos y plantilla', () => {
  const r = core.apValues({ name: '  Faja Térmica  ' });
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.values, { name: 'Faja Térmica', dias: 7, visto: 7, pais: 'Colombia' });
  const t = core.apPrompt(r.values);
  for (const x of ['para el producto: Faja Térmica. Usa la imagen adjunta', 'Días activos: Mínimo 7 días (indica rentabilidad).',
    'Última vez visto: Últimos 7 días (anuncio vivo).', 'País: EXCLUIR Colombia (buscar USA, España, LATAM).',
    'Lista los 3 mejores anuncios encontrados.', 'Indica si dirigen a Landing Page o WhatsApp.']) assert.ok(t.includes(x), 'Falta: ' + x);
  const t2 = core.apPrompt(core.apValues({ name: 'X', dias: '14', visto: '1', pais: ' México ' }).values);
  assert.ok(t2.includes('Mínimo 14 días') && t2.includes('Últimos 1 día (') && t2.includes('EXCLUIR México (buscar USA, España, LATAM)'));
  assert.deepStrictEqual(core.apPlaceholders(), { name: 'Nombre del producto', dias: 'Mínimo 7 días', visto: 'Últimos 7 días', pais: 'Colombia' });
});

caso('Prompt buscar anuncios: validación e importar de Mi candidato', () => {
  assert.deepStrictEqual(core.apValues({}).errors, { name: 'Escribe el nombre del producto' });
  for (const bad of ['0', '-3', '1.5', 'abc']) assert.deepStrictEqual(Object.keys(core.apValues({ name: 'X', dias: bad, visto: bad }).errors), ['dias', 'visto'], bad);
  assert.strictEqual(core.apImport(null), null);
  assert.strictEqual(core.apImport({ name: '  ', photo: 'data:x' }), null);
  assert.deepStrictEqual(core.apImport({ name: ' Faja ', photo: 'data:x', dropi: '1' }), { name: 'Faja', photo: 'data:x' });
  assert.deepStrictEqual(core.apImport({ name: 'Faja' }), { name: 'Faja', photo: '' });
});

caso('Simulador: azar con semilla, simNum, simCheck, simEnd y simExpect (SPEC 11)', () => {
  const near = (a, b) => assert.ok(Math.abs(a - b) < 0.01, a + ' ≈ ' + b);
  // Misma semilla = misma secuencia; otra semilla, otra.
  const seq = (s) => { const r = core.simRng(s); return [r(), r(), r(), r()]; };
  assert.deepStrictEqual(seq(7), seq(7));
  assert.notDeepStrictEqual(seq(7), seq(8));
  assert.ok(seq(7).every((x) => x >= 0 && x < 1));
  // Números es-CO.
  assert.strictEqual(core.simNum('1,5'), 1.5);
  assert.strictEqual(core.simNum('20.000'), 20000);
  assert.strictEqual(core.simNum('$ 15.000'), 15000);
  assert.strictEqual(core.simNum('2'), 2);
  assert.ok(Number.isNaN(core.simNum('')) && Number.isNaN(core.simNum('abc')) && Number.isNaN(core.simNum('1,2,3')));
  // Validación.
  const D = core.SIM_DEFAULTS;
  assert.strictEqual(core.simCheck(D), null);
  assert.deepStrictEqual(Object.keys(core.simCheck({ ...D, cpm: 0 })), ['cpm']);
  assert.deepStrictEqual(Object.keys(core.simCheck({ ...D, ctr: 101 })), ['ctr']);
  assert.deepStrictEqual(Object.keys(core.simCheck({ ...D, ctr: 0 })), ['ctr']);
  assert.strictEqual(core.simCheck({ ...D, toSale: 0, toPi: 100, ctr: 100 }), null);
  assert.deepStrictEqual(Object.keys(core.simCheck({ ...D, daily: NaN, tope: -1, toPi: 120 })).sort(), ['daily', 'toPi', 'tope']);
  // Defectos: salen de NovaSociety.
  assert.strictEqual(D.daily, core.NS_TEST.budget);
  assert.strictEqual(D.tope, core.GENERIC_CPA.tope);
  // Fin de la corrida: fin del día en que cae el corte 3.
  assert.strictEqual(core.simEnd(100000), 100000);
  assert.strictEqual(core.simEnd(30000), 60000);
  // Valores esperados del escenario "win" (cpm 12.000, ctr 2, 20 %, 30 %).
  const win = { ...D, ...core.SIM_SCENARIOS.find((s) => s.k === 'win').v };
  const e = core.simExpect(win, 40000);
  near(e.pi, 13.33); near(e.sales, 4); near(e.cpc, 600);
  near(core.simExpect(win, 20000).pi, 6.67);
  // Escenarios: CPC y PI a 20K de la tabla de la spec.
  const sc = (k) => ({ ...D, ...core.SIM_SCENARIOS.find((s) => s.k === k).v });
  near(core.simExpect(sc('cpm'), 20000).cpc, 1500); near(core.simExpect(sc('cpm'), 20000).pi, 2.67);
  near(core.simExpect(sc('cpc'), 20000).cpc, 2000); near(core.simExpect(sc('cpc'), 20000).pi, 2);
  near(core.simExpect(sc('page'), 20000).cpc, 600); near(core.simExpect(sc('page'), 20000).pi, 6.67);
  assert.deepStrictEqual(core.SIM_SCENARIOS.map((s) => s.k), ['cpm', 'cpc', 'page', 'win']);
});

caso('Simulador: simLoad valida lo guardado y cae en SIM_DEFAULTS (SPEC 11)', () => {
  const D = core.SIM_DEFAULTS;
  assert.deepStrictEqual(core.simLoad(undefined), D);
  assert.deepStrictEqual(core.simLoad(null), D);
  assert.deepStrictEqual(core.simLoad('x'), D);
  assert.deepStrictEqual(core.simLoad({}), D);
  const ok = { mode: 'manual', plat: 'tiktok', daily: 30000, tope: 18000, cpm: 9000, ctr: 1.5, toPi: 25, toSale: 0 };
  assert.deepStrictEqual(core.simLoad(ok), ok, 'Lo válido se conserva (toSale 0 es válido)');
  // Inválido o faltante: ese campo cae en su defecto; los demás se conservan.
  const l = core.simLoad({ mode: 'otro', plat: 'x', daily: 0, tope: '15000', cpm: null, ctr: 101, toPi: -1, toSale: NaN });
  assert.deepStrictEqual(l, D);
  assert.deepStrictEqual(core.simLoad({ ...ok, ctr: 0, cpm: 'x' }), { ...ok, ctr: D.ctr, cpm: D.cpm });
  assert.strictEqual(core.simCheck(core.simLoad({ daily: -5, ctr: 500 })), null, 'Lo cargado siempre pasa simCheck');
});

caso('Simulador: simRun (puntos, azar con semilla, apagado y cortes) y simAt (SPEC 11)', () => {
  const D = core.SIM_DEFAULTS;
  const rico = { ...D, cpm: 5000, ctr: 10, toPi: 50, toSale: 50 };   // sobra de todo: pasa los 3 cortes
  const last = (r) => r.points[r.points.length - 1];
  // Misma semilla = misma corrida; otra semilla, otra.
  assert.deepStrictEqual(core.simRun(D, 11), core.simRun(D, 11));
  assert.notDeepStrictEqual(core.simRun(D, 11).points, core.simRun(D, 12).points);
  // Puntos cada 1.000 de 0 a end; los contadores nunca bajan.
  const r = core.simRun(rico, 3);
  assert.strictEqual(r.seed, 3);
  assert.strictEqual(r.end, 100000);
  assert.strictEqual(r.offAt, null);
  assert.deepStrictEqual(r.points.map((p) => p.spend), Array.from({ length: 101 }, (_, k) => k * 1000));
  assert.deepStrictEqual(r.points[0], { spend: 0, impr: 0, clicks: 0, pi: 0, sales: 0 });
  for (let k = 1; k < r.points.length; k++) {
    const a = r.points[k - 1], b = r.points[k];
    assert.ok(b.impr > a.impr && b.clicks >= a.clicks && b.pi >= a.pi && b.sales >= a.sales);
    assert.ok(b.clicks <= Math.floor(b.impr) && b.pi <= b.clicks && b.sales <= b.pi);
  }
  // Impresiones: spend ÷ CPM × 1.000, sin redondear.
  assert.ok(Math.abs(r.points[40].impr - 40000 / 5000 * 1000) < 1e-6);
  // Presupuesto 30.000 (ABO): la corrida llega a 60.000.
  assert.strictEqual(core.simRun({ ...rico, daily: 30000 }, 3).end, 60000);
  // Cortes: 20K, 30K, 40K y fin del día; cada uno es el testVerdict de ese punto.
  assert.deepStrictEqual(r.cuts.map((c) => c.at), [20000, 30000, 40000, 100000]);
  assert.deepStrictEqual(r.cuts.map((c) => !!c.end), [false, false, false, true]);
  for (const c of r.cuts) {
    const p = r.points.find((q) => q.spend === c.at);
    assert.deepStrictEqual(c.verdict, core.testVerdict({ spend: c.at, pi: p.pi, sales: p.sales, tope: rico.tope }));
  }
  assert.strictEqual(r.cuts[2].verdict.branch, 'c3-spend');
  // Sin ventas posibles: nunca hay ventas y apaga en el corte 3 (el CPPI es bueno).
  const sinVentas = core.simRun({ ...rico, toSale: 0 }, 5);
  assert.ok(sinVentas.points.every((p) => p.sales === 0));
  assert.strictEqual(sinVentas.offAt, 40000);
  assert.strictEqual(last(sinVentas).spend, 40000);
  assert.strictEqual(sinVentas.cuts[2].verdict.branch, 'c3-off');
  // Sin pagos iniciados: apaga en el corte 1 y no hay puntos ni cortes después.
  const off1 = core.simRun({ ...rico, toPi: 0 }, 5);
  assert.strictEqual(off1.offAt, 20000);
  assert.strictEqual(last(off1).spend, 20000);
  assert.strictEqual(off1.cuts.length, 1);
  assert.strictEqual(off1.cuts[0].verdict.branch, 'c1-off');

  // simAt: punto, veredicto, aviso de escalado e historial.
  const a40 = core.simAt(r, 40000, rico);
  assert.strictEqual(a40.point.spend, 40000);
  assert.strictEqual(a40.verdict.branch, 'c3-spend');
  assert.strictEqual(a40.scaling, false);                       // todavía no gastó el día
  const aEnd = core.simAt(r, 100000, rico);
  assert.strictEqual(aEnd.scaling, true);
  assert.strictEqual(core.simAt(r, 0, rico).verdict.branch, null);
  assert.strictEqual(core.simAt(r, 15500, rico).point.spend, 15000);   // cae en el punto de abajo
  assert.strictEqual(core.simAt(r, 999999, rico).point.spend, 100000); // no pasa del final
  assert.strictEqual(core.simAt(off1, 90000, { ...rico, toPi: 0 }).point.spend, 20000); // ni del apagado
  // Historial: 20K · 30K · 40K · Fin del día.
  const h = (run, spend, i) => core.simAt(run, spend, i).hist;
  assert.deepStrictEqual(h(r, 25000, rico).map((x) => x.label), ['20K', '30K', '40K', 'Fin del día']);
  assert.deepStrictEqual(h(r, 25000, rico).map((x) => x.state), ['done', 'pending', 'pending', 'pending']);
  assert.strictEqual(h(r, 25000, rico)[0].verdict.branch, r.cuts[0].verdict.branch);
  assert.deepStrictEqual(h(r, 100000, rico).map((x) => x.state), ['done', 'done', 'done', 'done']);
  // Cada celda alcanzada trae los pagos iniciados y las ventas del punto donde se calificó.
  h(r, 100000, rico).forEach((x) => { const q = r.points.find((p) => p.spend === x.at); assert.deepStrictEqual([x.pi, x.sales], [q.pi, q.sales]); });
  assert.ok(h(r, 25000, rico)[1].pi === undefined, 'Las celdas pendientes no traen números');
  const o = { ...rico, toPi: 0 };
  assert.deepStrictEqual(h(off1, 10000, o).map((x) => x.state), ['pending', 'pending', 'pending', 'pending']);
  assert.deepStrictEqual(h(off1, 20000, o).map((x) => x.state), ['done', 'stopped', 'stopped', 'stopped']);
});

caso('Simulador: cadena con semáforo, eslabón roto y escenarios (SPEC 11)', () => {
  const D = core.SIM_DEFAULTS;
  const pt = (spend, pi, sales) => ({ spend, impr: 1, clicks: 1, pi, sales });
  const luz = (chain, k) => chain.find((c) => c.k === k).light;
  const cad = (over, p) => core.simChain(p || pt(40000, 10, 3), { ...D, ...over });
  assert.deepStrictEqual(cad({}).map((c) => c.k), ['cpm', 'ctr', 'cpc', 'cppi', 'cpa']);
  // CPM: Meta ≤ 20.000 verde, 20.001 rojo; TikTok ≤ 6.000, 7.000 rojo; la plataforma solo cambia la luz.
  assert.strictEqual(luz(cad({ cpm: 20000 }), 'cpm'), 'g');
  assert.strictEqual(luz(cad({ cpm: 20001 }), 'cpm'), 'r');
  assert.strictEqual(luz(cad({ cpm: 12000 }), 'cpm'), 'g');
  assert.strictEqual(luz(cad({ cpm: 12000, plat: 'tiktok' }), 'cpm'), 'r');
  assert.strictEqual(luz(cad({ cpm: 7000, plat: 'tiktok' }), 'cpm'), 'r');
  assert.strictEqual(luz(cad({ cpm: 6000, plat: 'tiktok' }), 'cpm'), 'g');
  // "ideal" bajo el rango ideal.
  assert.strictEqual(cad({ cpm: 4999 }).find((c) => c.k === 'cpm').ideal, true);
  assert.ok(!cad({ cpm: 5000 }).find((c) => c.k === 'cpm').ideal);
  // CPC = CPM ÷ (10 × CTR): 800 rojo (< 800), 799 verde.
  assert.strictEqual(cad({ cpm: 16000, ctr: 2 }).find((c) => c.k === 'cpc').value, 800);
  assert.strictEqual(luz(cad({ cpm: 16000, ctr: 2 }), 'cpc'), 'r');
  assert.strictEqual(luz(cad({ cpm: 15980, ctr: 2 }), 'cpc'), 'g');
  assert.strictEqual(cad({ cpm: 11980, ctr: 2 }).find((c) => c.k === 'cpc').ideal, true);
  assert.strictEqual(cad({ cpm: 12000, ctr: 2 }).find((c) => c.k === 'cpc').ideal, false);   // 600 no es < 600
  // CTR: sin luz y "No decide".
  const ctr = cad({ ctr: 1.5 }).find((c) => c.k === 'ctr');
  assert.strictEqual(ctr.value, 1.5); assert.strictEqual(ctr.light, null); assert.strictEqual(ctr.note, 'No decide');
  // CPPI: TEST_RULES (4.000 / 6.000); sin pagos iniciados, sin valor ni luz.
  const R = core.TEST_RULES;
  assert.strictEqual(luz(cad({}, pt(R.cppiBueno * 5, 5, 0)), 'cppi'), 'y');       // = cppiBueno: ya no es verde
  assert.strictEqual(luz(cad({}, pt(R.cppiBueno * 5 - 5, 5, 0)), 'cppi'), 'g');
  assert.strictEqual(luz(cad({}, pt(R.cppiApaga * 5, 5, 0)), 'cppi'), 'y');        // = cppiApaga: amarillo
  assert.strictEqual(luz(cad({}, pt(R.cppiApaga * 5 + 5, 5, 0)), 'cppi'), 'r');
  const sinPi = cad({}, pt(20000, 0, 0)).find((c) => c.k === 'cppi');
  assert.strictEqual(sinPi.value, null); assert.strictEqual(sinPi.light, null);
  // CPA: ≤ tope verde, ≤ apaga amarillo, sobre apaga rojo; sin ventas, sin luz.
  const z = core.cpaZones(D.tope);
  assert.strictEqual(luz(cad({}, pt(D.tope * 2, 10, 2)), 'cpa'), 'g');
  assert.strictEqual(luz(cad({}, pt(z.apaga * 2, 10, 2)), 'cpa'), 'y');
  assert.strictEqual(luz(cad({}, pt(z.apaga * 2 + 2, 10, 2)), 'cpa'), 'r');
  const sinVta = cad({}, pt(40000, 10, 0)).find((c) => c.k === 'cpa');
  assert.strictEqual(sinVta.value, null); assert.strictEqual(sinVta.light, null);

  // Escenarios: los valores esperados (sin azar) caen en su rama.
  const sc = (k) => ({ ...D, ...core.SIM_SCENARIOS.find((s) => s.k === k).v });
  const esperado = (k, spend) => {
    const i = sc(k), e = core.simExpect(i, spend);
    return { i, p: { spend, impr: e.impr, clicks: e.clicks, pi: e.pi, sales: e.sales } };
  };
  const rama = (k, spend, round) => {
    const { i, p } = esperado(k, spend);
    const q = round ? { ...p, pi: Math.floor(p.pi), sales: Math.floor(p.sales) } : p;
    return core.testVerdict({ spend, pi: q.pi, sales: q.sales, tope: i.tope }).branch;
  };
  assert.strictEqual(rama('cpm', 20000, true), 'c1-off');
  assert.strictEqual(rama('cpc', 20000, true), 'c1-off');
  assert.strictEqual(rama('page', 40000, true), 'c3-off');
  assert.strictEqual(rama('win', 40000, true), 'c3-spend');
  // Eslabón roto: cpm, cpc y cppi (la página); ninguno en "win".
  const roto = (k, spend) => { const { i, p } = esperado(k, spend); return core.simBroken(core.simChain(p, i), p); };
  assert.strictEqual(roto('cpm', 20000), 'cpm');
  assert.strictEqual(roto('cpc', 20000), 'cpc');
  assert.strictEqual(roto('page', 40000), 'cppi');
  assert.strictEqual(roto('win', 40000), null);
  // La página solo se acusa pasado el corte 3 y con pagos iniciados; antes no hay eslabón.
  assert.strictEqual(roto('page', 30000), null);
  const sinPagos = core.simChain(pt(40000, 0, 0), D);
  assert.strictEqual(core.simBroken(sinPagos, pt(40000, 0, 0)), null);
  // Cada eslabón roto tiene su lectura en TEST_CHAIN.reads.
  for (const k of ['cpm', 'cpc', 'cppi']) assert.ok(core.TEST_CHAIN.reads.some((r) => r.k === k));
  // simAt trae cadena y eslabón.
  const run = core.simRun({ ...D, cpm: 30000 }, 4), a = core.simAt(run, 20000, { ...D, cpm: 30000 });
  assert.deepStrictEqual(a.chain.map((c) => c.k), ['cpm', 'ctr', 'cpc', 'cppi', 'cpa']);
  assert.strictEqual(a.broken, 'cpm');
  // Los límites no están escritos a mano en el simulador.
  const src = require('fs').readFileSync(require('path').join(__dirname, '../js/modules/testing/core/simulator.js'), 'utf8');
  for (const n of ['20000', '6000', '800', '4000', '5000', '15000']) assert.ok(!new RegExp('\\b' + n + '\\b').test(src.replace(/\/\/.*$/gm, '')), 'sin ' + n + ' a mano');
});

// ---- SPEC 12: atajos flotantes de Testeo (core/cheat.js) ----
caso('cheat: chChain da 4 eslabones en orden con paso y grupo', () => {
  const c = core.chChain();
  assert.deepStrictEqual(c.map((x) => x.k), ['cpm', 'cpc', 'cppi', 'cpa']);
  assert.deepStrictEqual(c.map((x) => x.step), [1, 2, 3, 4]);
  assert.deepStrictEqual(c.map((x) => x.side), ['antes', 'antes', 'despues', 'despues']);
  assert.deepStrictEqual(core.CH_SIDES.map((s) => s.k), ['antes', 'despues']);
});

caso('cheat: chChain toma textos y límites de HARD_METRICS y TEST_CHAIN', () => {
  for (const e of core.chChain()) {
    const h = core.HARD_METRICS.find((r) => r.k === e.k);
    assert.strictEqual(e.name, h.name);
    assert.strictEqual(e.full, h.means.full);
    assert.strictEqual(e.simple, h.means.simple);
    assert.strictEqual(e.lim.meta, h.view.meta.main);
    assert.strictEqual(e.lim.tiktok, h.view.tiktok.main);
    if (e.k !== 'cpa') {
      const r = core.TEST_CHAIN.reads.find((x) => x.k === e.k);
      assert.deepStrictEqual(e.read, { when: r.when, fix: r.fix });
    }
  }
});

caso('cheat: la lectura del CPA dice el tope de GENERIC_CPA', () => {
  const cpa = core.chChain().find((e) => e.k === 'cpa');
  assert.deepStrictEqual(cpa.read.when[1], { b: '$ ' + core.copText(core.GENERIC_CPA.tope) });
  assert.deepStrictEqual(cpa.read, { when: core.CH_CPA_READ.when, fix: core.CH_CPA_READ.fix });
});

caso('cheat: cada eslabón trae su tabla "¿Qué falla y cómo lo arreglo?" condensada', () => {
  const txt = (segs) => segs.map((s) => (typeof s === 'string' ? s : s.b)).join('');
  const c = core.chChain(), money = (v) => '$ ' + core.copText(v);
  assert.deepStrictEqual(c.map((e) => e.help.rows.length), [4, 2, 4, 6], 'Filas de CPM, CPC, CPPI y CPA');
  for (const e of c) {
    assert.ok(txt(e.help.foot).length > 0, 'Pie de ' + e.k);
    for (const r of e.help.rows) assert.ok(typeof r.cause === 'string' && r.cause && txt(r.how) && txt(r.fix), 'Fila completa de ' + e.k + ': ' + r.cause);
  }
  const rows = (k) => c.find((e) => e.k === k).help.rows;
  assert.ok(txt(c[0].help.foot).includes('Mientras el CPM esté roto'));
  assert.ok(rows('cpm').some((r) => r.cause === 'Gancho débil'));
  // Los números salen de las fuentes: cortes, límites del CPPI, zonas del CPA, escalón y ventana.
  assert.ok(txt(rows('cpc')[0].fix).includes(core.NS_TEST.cuts.map((n) => n / 1000 + 'K').join(' / ')));
  assert.ok(txt(c.find((e) => e.k === 'cppi').help.foot).includes(money(core.TEST_RULES.cppiApaga)) && txt(c.find((e) => e.k === 'cppi').help.foot).includes(core.NS_TEST.cuts[1] / 1000 + 'K'));
  const z = core.GENERIC_CPA, cpa = rows('cpa');
  assert.ok(txt(cpa[0].how).includes(money(z.escala)) && txt(cpa[0].fix).includes('+' + core.NS_TEST.step * 100 + ' %'));
  assert.ok(txt(cpa[1].how).includes(money(z.escala)) && txt(cpa[1].how).includes(money(z.tope)));
  assert.ok(txt(cpa[2].how).includes(money(z.tope)) && txt(cpa[2].fix).includes('−' + core.NS_TEST.step * 100 + ' %'));
  assert.ok(txt(cpa[3].fix).includes(Math.round((core.SCALE_RULES.salto - 1) * 100) + ' %'));
  assert.ok(txt(cpa[4].how).includes(money(z.apaga)) && txt(cpa[4].how).includes(String(core.SCALE_RULES.offDays)));
  assert.ok(txt(cpa[5].how).includes(money(core.SCALE_RULES.offDouble * z.apaga)));
});

caso('cheat: chHard da 5 filas en el orden de HARD_METRICS', () => {
  for (const p of ['meta', 'tiktok']) {
    const rows = core.chHard(p);
    assert.deepStrictEqual(rows.map((r) => r.k), core.HARD_METRICS.map((r) => r.k));
    assert.deepStrictEqual(rows.map((r) => r.k), ['ctr', 'cpc', 'cpm', 'cppi', 'cpa']);
    rows.forEach((r) => {
      const h = core.HARD_METRICS.find((x) => x.k === r.k);
      assert.strictEqual(r.main, h.view[p].main);
      assert.strictEqual(r.question, h.question);
      assert.strictEqual(r.diag, h.diag);
      assert.strictEqual(r.lever, h.lever);
    });
  }
});

caso('cheat: chHard cambia el límite según la plataforma', () => {
  const lim = (p, k) => core.chHard(p).find((r) => r.k === k).main;
  assert.strictEqual(lim('meta', 'cpm'), '≤ 20.000');
  assert.strictEqual(lim('tiktok', 'cpm'), '≤ 6.000');
  assert.strictEqual(lim('meta', 'ctr'), '> 2 %');
  assert.strictEqual(lim('tiktok', 'ctr'), '> 0,5 %');
});

caso('cheat: warn solo en el CTR de Meta y zones solo en el CPA', () => {
  const meta = core.chHard('meta'), tik = core.chHard('tiktok');
  assert.strictEqual(meta.find((r) => r.k === 'ctr').warn, core.CTR_UNIQUE_WARN);
  assert.strictEqual(tik.find((r) => r.k === 'ctr').warn, null);
  assert.deepStrictEqual(meta.filter((r) => r.warn).map((r) => r.k), ['ctr']);
  assert.deepStrictEqual(meta.filter((r) => r.zones).map((r) => r.k), ['cpa']);
  assert.deepStrictEqual(meta.find((r) => r.k === 'cpa').zones, core.GENERIC_CPA);
  assert.strictEqual(meta.find((r) => r.k === 'cpa').tip, null);
  assert.strictEqual(meta.find((r) => r.k === 'cpm').tip, core.HARD_METRICS.find((r) => r.k === 'cpm').view.meta.tip);
});

caso('cheat: chPlat solo acepta meta o tiktok', () => {
  assert.strictEqual(chPlatOf('tiktok'), 'tiktok');
  assert.strictEqual(chPlatOf('meta'), 'meta');
  for (const x of ['x', '', null, undefined, 'TikTok']) assert.strictEqual(chPlatOf(x), 'meta');
  function chPlatOf(v) { return core.chPlat(v); }
});

caso('cheat: el núcleo no escribe números de métricas a mano', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '../js/modules/cheat/core/cheat.js'), 'utf8');
  for (const n of ['20000', '6000', '800', '4000', '5000', '12000', '15000']) assert.ok(!new RegExp('\\b' + n + '\\b').test(src.replace(/\/\/.*$/gm, '')), 'sin ' + n + ' a mano');
});

caso('logistics: lgTemplate cae en la primera con una clave desconocida', () => {
  assert.deepStrictEqual(core.LG_TEMPLATES.map((t) => t.k), ['pedido', 'reconfirma', 'tercero', 'confirmado', 'guia', 'infografia', 'anticipo', 'reintento', 'flete', 'enruta', 'entregado', 'oficina', 'valida', 'privatiza'], 'Una tarjeta por plantilla; sin Segundo Intento (SPEC 15, Parte 10)');
  assert.deepStrictEqual(core.LG_TEMPLATES.map((t) => t.title), ['Confirmación de Pedidos', 'Reconfirmación de Pedido', 'Tercer Intento', 'Pedido Confirmado', 'Confirmación de Guia', 'Envío de Infografía', 'Solicitud de Anticipo', 'Reintento de Entrega', 'Flete Especial', 'Recordatorio En Ruta', 'Pedido Entregado', 'Reclamar en Oficina', 'Validación de Producto', 'Solicitud de Privatización']);
  assert.deepStrictEqual(core.LG_TEMPLATES.filter((t) => t.newRow).map((t) => t.k), [], 'Las tarjetas fluyen por ancho: sin saltos de fila');
  assert.strictEqual(core.lgTemplate('guia').k, 'guia');
  assert.strictEqual(core.lgTemplate('x').k, 'pedido');
  assert.strictEqual(core.lgTemplate().k, 'pedido');
  assert.deepStrictEqual(core.lgTemplate('guia').fields.map((f) => f.k), ['name', 'product', 'guide', 'carrier', 'price', 'address']);
  assert.strictEqual(core.LG_DAYS, '2 a 4', 'El tiempo de entrega es fijo');
  assert.deepStrictEqual(core.lgTemplate('guia').fields.map((f) => f.ph), ['Ej: Pablo', 'Ej: Omegaxl joint support', 'Ej: 074102602224', 'Ej: ENVIA', 'Ej: $ 97.400', 'Ej: Cra 67 # 25 - 34 Itagui - Calatrava'], 'Cada campo trae su ejemplo');
  assert.deepStrictEqual(core.LG_PARTS.map((p) => [p.k, !!p.disabled]), [['msgs', false], ['track', true]]);
});

caso('logistics: lgMoney lee pesos o devuelve null', () => {
  for (const t of ['97.400', '$ 97.400', '97400', ' $97.400 ']) assert.strictEqual(core.lgMoney(t), 97400, t);
  for (const t of ['', '0', 'abc', null, undefined, '-5']) assert.strictEqual(core.lgMoney(t), null, String(t));
});

caso('logistics: lgMoneyText formatea el precio del campo', () => {
  assert.strictEqual(core.lgMoneyText(97400), '$ 97.400');
  assert.strictEqual(core.lgMoneyText(1234567), '$ 1.234.567');
  assert.strictEqual(core.lgMoney(core.lgMoneyText(97400)), 97400);
});

caso('logistics: lgValues marca cada campo vacío y el precio inválido', () => {
  const tpl = core.lgTemplate('guia');
  const vacio = core.lgValues(tpl, {});
  assert.strictEqual(vacio.ok, false);
  assert.deepStrictEqual(Object.keys(vacio.errors).sort(), ['address', 'carrier', 'guide', 'name', 'price', 'product']);
  assert.ok(/^Escribe /.test(vacio.errors.name));
  assert.strictEqual(vacio.errors.carrier, 'Escribe transportadora');
  assert.strictEqual(core.lgValues(tpl, { carrier: '   ' }).errors.carrier, 'Escribe transportadora', 'Solo espacios cuenta como vacío');
  const base = { name: ' Pablo ', product: 'Omegaxl joint support', guide: ' 074102602224 ', carrier: ' envia ', price: '$ 97.400', address: 'Cra 67 # 25 - 34 Itagui - Calatrava' };
  const ok = core.lgValues(tpl, base);
  assert.strictEqual(ok.ok, true);
  assert.deepStrictEqual(ok.errors, {});
  assert.strictEqual(ok.values.name, 'Pablo');
  assert.strictEqual(ok.values.guide, '074102602224');
  assert.strictEqual(ok.values.carrier, 'envia', 'El valor no se pasa a mayúsculas: eso lo hace el mensaje');
  assert.strictEqual(ok.values.price, 97400);
  const malo = core.lgValues(tpl, { ...base, price: 'abc' });
  assert.strictEqual(malo.ok, false);
  assert.strictEqual(malo.errors.price, 'Precio mayor a 0');
  assert.deepStrictEqual(Object.keys(core.lgValues(tpl, { ...base, price: '0' }).errors), ['price']);
});

caso('logistics: lgPrefill toma nombre y precio de landing.prod', () => {
  assert.deepStrictEqual(core.lgPrefill({ name: 'Omegaxl joint support', price: 97400 }), { product: 'Omegaxl joint support', price: 97400 });
  assert.deepStrictEqual(core.lgPrefill({}), { product: '', price: null });
  assert.deepStrictEqual(core.lgPrefill(null), { product: '', price: null });
});

const PEDIDO = { name: 'Eugenia', product: 'Omegaxl joint support', address: 'Colombia 20# 19 .30 - barrio Capri', city: 'PASTO', dept: 'NARIÑO', phone: '3214566677', total: 97400 };

caso('logistics: Confirmación de Pedidos pide sus 7 campos con ejemplo', () => {
  const f = core.lgTemplate('pedido').fields;
  assert.deepStrictEqual(f.map((x) => x.k), ['name', 'product', 'address', 'city', 'dept', 'phone', 'total']);
  assert.deepStrictEqual(f.map((x) => x.label), ['Nombre de cliente', 'Producto', 'Dirección de entrega', 'Ciudad / Municipio', 'Departamento', 'Teléfono de contacto', 'Total a pagar (COD - contraentrega)']);
  assert.deepStrictEqual(f.map((x) => x.ph), ['Ej: Eugenia', 'Ej: Omegaxl joint support', 'Ej: Colombia 20# 19 .30 - barrio Capri', 'Ej: PASTO', 'Ej: NARIÑO', 'Ej: 3214566677', 'Ej: $ 97.400']);
  assert.deepStrictEqual(f.filter((x) => x.from).map((x) => [x.k, x.from]), [['product', 'name']], 'Solo el producto viene de Desarrollo');
  assert.strictEqual(f.find((x) => x.k === 'total').type, 'money');
});

caso('logistics: lgValues de Confirmación de Pedidos', () => {
  const tpl = core.lgTemplate('pedido');
  const vacio = core.lgValues(tpl, {});
  assert.deepStrictEqual(Object.keys(vacio.errors).sort(), ['address', 'city', 'dept', 'name', 'phone', 'product', 'total']);
  const base = { name: ' Eugenia ', product: 'Omegaxl joint support', address: 'Colombia 20# 19 .30 - barrio Capri', city: 'PASTO', dept: 'NARIÑO', phone: ' 3214566677 ', total: '$ 97.400' };
  const ok = core.lgValues(tpl, base);
  assert.strictEqual(ok.ok, true);
  assert.deepStrictEqual(ok.values, PEDIDO, 'Recorta espacios y lee el total en pesos');
  assert.strictEqual(core.lgValues(tpl, { ...base, total: 'abc' }).errors.total, 'Total mayor a 0');
  assert.strictEqual(core.lgValues(tpl, { ...base, total: '0' }).errors.total, 'Total mayor a 0');
  assert.strictEqual(core.lgValues(core.lgTemplate('guia'), { price: 'abc' }).errors.price, 'Precio mayor a 0', 'Confirmación guía sigue con su aviso');
});

caso('logistics: lgMessage de Confirmación de Pedidos es el de la spec', () => {
  const esperado = [
    '¡Hola Eugenia! 🌟',
    '',
    'Acabamos de recibir tu compra del producto -- *Omegaxl joint support* -- en nuestra tienda 🍃*VidanovaStore®*',
    '',
    'El cual será entregado en:',
    '',
    '*Dirección:* Colombia 20# 19 .30 - barrio Capri',
    '*Ciudad:* PASTO',
    '*Departamento:* NARIÑO',
    '*Teléfono:* 3214566677',
    '*Total a Pagar:* $97.400',
    '',
    'El *envío* es totalmente *Gratis* y el pago es *Contra Entrega* para tu seguridad 🛍️🤍',
    '',
    '🚚 Por favor *confírmanos* si tus datos son correctos para despachar tu pedido *ahora* 🤍',
  ].join('\n');
  assert.strictEqual(core.lgMessage('pedido', PEDIDO), esperado);
  assert.ok(core.lgMessage('pedido', { ...PEDIDO, total: 1234567 }).includes('*Total a Pagar:* $1.234.567'));
  for (const d of ['nariño', 'Nariño', 'narino', 'NARIÑO']) assert.ok(core.lgMessage('pedido', { ...PEDIDO, dept: d }).includes('*Departamento:* ' + d.toUpperCase()), 'El departamento siempre en mayúsculas: ' + d);
  assert.ok(core.lgMessage('pedido', { ...PEDIDO, city: 'cali' }).includes('*Ciudad:* cali'), 'La ciudad se deja como se escribe');
  assert.notStrictEqual(core.lgMessage('pedido', PEDIDO), core.lgMessage('guia', PEDIDO), 'No es la misma plantilla que Confirmación guía');
});

const CONFIRMADO_CON = [
  'Gracias por confirmar. Tu paquete ya va rumbo a empaque. 📦',
  '',
  'Como agradecimiento, en cuanto recibas tu producto, avísanos por aquí para enviarte el *obsequio* adjunto ✨',
  '',
  '¡Quedamos muy atentos a tu entrega!',
].join('\n');
const CONFIRMADO_SIN = [
  'Gracias por confirmar. Tu paquete ya va rumbo a empaque. 📦',
  '',
  '¡Quedamos muy atentos a tu entrega!',
].join('\n');

caso('logistics: Pedido Confirmado es un mensaje fijo con un solo check de obsequio', () => {
  const tpl = core.lgTemplate('confirmado');
  assert.deepStrictEqual(tpl.fields.map((f) => [f.k, f.type, f.label]), [['gift', 'check', 'Incluye obsequio']], 'Sin campos de ingreso: solo el check');
  assert.deepStrictEqual(core.lgForm(tpl), { gift: true }, 'El obsequio viene marcado por defecto');
  assert.deepStrictEqual(core.lgForm(core.lgTemplate('guia')), { name: '', product: '', guide: '', carrier: '', price: '', address: '' }, 'Los campos de texto arrancan vacíos');
  assert.deepStrictEqual(core.lgValues(tpl, { gift: true }), { ok: true, values: { gift: true }, errors: {} });
  assert.deepStrictEqual(core.lgValues(tpl, { gift: false }), { ok: true, values: { gift: false }, errors: {} }, 'Nunca da error');
  assert.strictEqual(core.lgValues(tpl, {}).ok, true);
  assert.strictEqual(core.lgMessage('confirmado', { gift: true }), CONFIRMADO_CON, 'Con obsequio');
  assert.strictEqual(core.lgMessage('confirmado', { gift: false }), CONFIRMADO_SIN, 'Sin obsequio no va el párrafo del obsequio');
  assert.ok(!core.lgMessage('confirmado', { gift: false }).includes('obsequio'));
});

caso('logistics: Tercer Intento avisa que la orden se cancelará sin confirmación', () => {
  const tpl = core.lgTemplate('tercero');
  assert.deepStrictEqual(tpl.fields.map((f) => [f.k, f.label, f.from || null, f.ph]), [['name', 'Nombre de cliente', null, 'Ej: Eugenia'], ['product', 'Producto', 'name', 'Ej: Crema Despigmentante'], ['city', 'Ciudad / Municipio', null, 'Ej: Pasto']]);
  assert.deepStrictEqual(Object.keys(core.lgValues(tpl, {}).errors).sort(), ['city', 'name', 'product']);
  const esperado = [
    'Hola, Eugenia. Intentamos comunicarnos contigo por llamada para autorizar el despacho de tu *Crema Despigmentante* con Envío Gratis. 📦',
    '',
    'Por políticas de seguridad y alta demanda, si no recibimos tu confirmación el sistema cancelará tu orden automáticamente y cederemos la unidad a otro cliente.',
    '',
    "Si aún deseas recibirla en Pasto y pagar contra entrega, por favor respóndenos a este mensaje con un 'CONFIRMO'. Quedamos atentos.",
  ].join('\n');
  assert.strictEqual(core.lgMessage('tercero', { name: 'Eugenia', product: 'Crema Despigmentante', city: 'Pasto' }), esperado);
});

caso('logistics: Solicitud de Anticipo explica el historial de devoluciones y pide el anticipo', () => {
  const tpl = core.lgTemplate('anticipo');
  assert.deepStrictEqual(tpl.fields.map((f) => [f.k, f.type, f.from || null, f.ph]), [['name', 'text', null, 'Ej: Eugenia'], ['product', 'text', 'name', 'Ej: Crema Despigmentante'], ['advance', 'money', null, 'Ej: $ 20.000']]);
  assert.deepStrictEqual(Object.keys(core.lgValues(tpl, {}).errors).sort(), ['advance', 'name', 'product']);
  const r = core.lgValues(tpl, { name: 'Eugenia', product: 'Crema Despigmentante', advance: '$ 20.000' });
  assert.ok(r.ok && r.values.advance === 20000);
  const m = core.lgMessage('anticipo', r.values);
  assert.ok(m.includes('Eugenia') && m.includes('Crema Despigmentante') && m.includes('$20.000') && m.includes('se descuenta del total'));
  assert.ok(m.includes('historial de altas devoluciones') && m.includes('red logística nacional') && m.includes('gráfica oficial adjunta') && m.includes('protocolo de la bodega'), 'Da el motivo y remite a la gráfica');
  assert.ok(m.includes('📱 *Nequi/Daviplata*\n3182110955\n\n🏦 *Ahorros - Bancolombia*\n23015881151') && m.includes('comprobante'), 'Trae las cuentas para el abono');
  assert.ok(!m.includes('undefined'));
});

caso('logistics: Reconfirmación de Pedido', () => {
  const tpl = core.lgTemplate('reconfirma');
  assert.strictEqual(tpl.k, 'reconfirma');
  assert.deepStrictEqual(tpl.fields.map((f) => [f.k, f.type, f.from || null, f.ph]), [['name', 'text', null, 'Ej: Eugenia']], 'Solo el nombre y sin «Traer de Desarrollo»');
  assert.deepStrictEqual(core.lgValues(tpl, {}).errors, { name: 'Escribe nombre de cliente' });
  const r = core.lgValues(tpl, { name: ' Eugenia ' });
  assert.ok(r.ok && r.values.name === 'Eugenia');
  const esperado = [
    '¡Hola Eugenia! 👋 Te escribíamos de la tienda 🍃*VidanovaStore®* nuevamente.',
    '',
    'Te contactamos brevemente para confirmar los datos y asegurarnos de que tu *Envío Gratis* salga hoy mismo hacia tu dirección. 📦',
    '',
    'Recuerda que con nosotros *no arriesgas nada ni pagas por adelantado*: el pago es 100% en efectivo únicamente cuando el repartidor de la transportadora te entregue el paquete en la puerta de tu casa. 💵🤝',
    '',
    '¿Nos confirmas por favor con un simple "SÍ" o un "OK" si todo está correcto para proceder con el despacho? ¡Quedamos atentos! ✨',
  ].join('\n');
  assert.strictEqual(core.lgMessage('reconfirma', r.values), esperado);
});

caso('logistics: Reintento de Entrega', () => {
  const tpl = core.lgTemplate('reintento');
  assert.strictEqual(tpl.k, 'reintento');
  assert.deepStrictEqual(tpl.fields.map((f) => [f.k, f.type, f.from || null, f.ph]), [['name', 'text', null, 'Ej: Rafael'], ['product', 'text', 'name', 'Ej: Crema Despigmentante Coreana']]);
  assert.deepStrictEqual(core.lgValues(tpl, {}).errors, { name: 'Escribe nombre de cliente', product: 'Escribe producto' });
  assert.deepStrictEqual(Object.keys(core.lgValues(tpl, { name: 'Rafael' }).errors), ['product']);
  const r = core.lgValues(tpl, { name: 'Rafael', product: 'Crema Despigmentante Coreana' });
  assert.ok(r.ok);
  const esperado = [
    '¡Saludos, Rafael! ☀️',
    '',
    'Te escribimos de la tienda 🍃*VidanovaStore®*.',
    '',
    'Queremos informarle que su *Crema Despigmentante Coreana* ya salió nuevamente en ruta de reparto para ser entregada hoy en la dirección confirmada. 🚚📦',
    '',
    'Tuvimos un intento de entrega anterior donde no fue posible ubicarl@, por lo que le pedimos el favor de *dejar encargado a alguien con el dinero en efectivo* o estar muy atent@ a su celular por si el repartidor de la transportadora se comunica.',
    '',
    'Cualquier novedad, quedamos muy atentos por este medio. ¡Que tenga un excelente día! 😊',
  ].join('\n');
  assert.strictEqual(core.lgMessage('reintento', r.values), esperado);
});

caso('logistics: Flete Especial', () => {
  const tpl = core.lgTemplate('flete');
  assert.strictEqual(tpl.k, 'flete');
  assert.deepStrictEqual(tpl.fields.map((f) => [f.k, f.type, f.from || null, f.ph]), [
    ['name', 'text', null, 'Ej: Rafael'], ['city', 'text', null, 'Ej: Vaupés'], ['shipping', 'money', null, 'Ej: $ 50.000'],
    ['product', 'text', 'name', 'Ej: Crema arbutina'], ['advance', 'money', null, 'Ej: $ 20.000']]);
  assert.deepStrictEqual(Object.keys(core.lgValues(tpl, {}).errors).sort(), ['advance', 'city', 'name', 'product', 'shipping']);
  const mal = core.lgValues(tpl, { name: 'Rafael', city: 'Vaupés', product: 'Crema arbutina', shipping: '0', advance: 'abc' }).errors;
  assert.deepStrictEqual(mal, { shipping: 'Flete mayor a 0', advance: 'Anticipo mayor a 0' });
  for (const t of ['50000', '50.000', '$ 50.000']) assert.strictEqual(core.lgValues(tpl, { name: 'R', city: 'C', product: 'P', shipping: t, advance: '20000' }).values.shipping, 50000, t);
  const r = core.lgValues(tpl, { name: 'Rafael', city: 'Vaupés', shipping: '$ 50.000', product: 'Crema arbutina', advance: '$ 20.000' });
  assert.ok(r.ok);
  const esperado = [
    '¡Hola, Rafael! Te saludamos de 🍃*VidanovaStore®*',
    '',
    'Te comparto la captura de la transportadora: al ser una zona aérea especial hacia Vaupés, el flete nos sale en $50.000, por lo que lastimosamente nos es imposible enviarlo con flete gratis total. 🥺',
    '',
    'Queremos que no te quedes sin tu *Crema arbutina*, nosotros asumimos la mayor parte del envío si tú nos apoyas con un anticipo de $20.000 parte del flete, y el producto lo pagas en efectivo al recibir en tu casa. 🚚✨',
    '',
    '📱 *Nequi/Daviplata*',
    '3182110955',
    '',
    '🏦 *Ahorros - Bancolombia*',
    '23015881151',
    '',
    '¿Te gustaría transferir el flete para despacharte de una vez, o prefieres que cancelemos la orden? ¡Lo que tú decidas lo entendemos con el mayor gusto! 🤍',
  ].join('\n');
  assert.strictEqual(core.lgMessage('flete', r.values), esperado);
});

caso('logistics: Recordatorio En Ruta', () => {
  const tpl = core.lgTemplate('enruta');
  assert.strictEqual(tpl.k, 'enruta');
  assert.deepStrictEqual(tpl.fields.map((f) => [f.k, f.type, f.from || null, f.ph]), [['name', 'text', null, 'Ej: Beatriz'], ['product', 'text', 'name', 'Ej: Crema Arbutina']]);
  assert.deepStrictEqual(core.lgValues(tpl, {}).errors, { name: 'Escribe nombre de cliente', product: 'Escribe producto' });
  const r = core.lgValues(tpl, { name: 'Beatriz', product: 'Crema Arbutina' });
  assert.ok(r.ok);
  const esperado = [
    'Hola, Beatriz, *tu pedido Crema Arbutina ya se encuentra en ruta de entrega*.',
    '',
    '📦 Al ser un servicio *contra entrega*, recuerda estar pendiente de la llegada del repartidor o dejar el dinero listo con un conocido para asegurar una entrega rápida.',
    '',
    '¡Agradecemos mucho tu colaboración! ✨',
  ].join('\n');
  assert.strictEqual(core.lgMessage('enruta', r.values), esperado);
  assert.ok(!core.lgMessage('enruta', r.values).includes('MENSAJE RECORDATORIO'), 'La etiqueta del usuario no va en el mensaje');
});

caso('logistics: Pedido Entregado, con y sin manual', () => {
  const tpl = core.lgTemplate('entregado');
  assert.strictEqual(tpl.k, 'entregado');
  assert.deepStrictEqual(tpl.fields.map((f) => [f.k, f.type, f.when || null, !!f.keep, f.ph || null]), [
    ['name', 'text', null, false, 'Ej: Beatriz'], ['manual', 'check', null, true, null], ['manualTitle', 'text', 'manual', true, 'Ej: Manual de Bienestar Articular']]);
  assert.deepStrictEqual(core.lgForm(tpl), { name: '', manual: true, manualTitle: '' }, 'Con manual marcado de fábrica');
  assert.deepStrictEqual(core.lgValues(tpl, core.lgForm(tpl)).errors, { name: 'Escribe nombre de cliente', manualTitle: 'Escribe título del manual' }, 'Marcada: el título es obligatorio');
  assert.deepStrictEqual(core.lgValues(tpl, { name: 'Beatriz', manual: false, manualTitle: '' }).errors, {}, 'Desmarcada: el título no se exige');
  const abre = [
    '¡Hola, Beatriz! 👋 Espero que estés teniendo un excelente día.',
    '',
    'Te escribimos desde 🍃*VidanovaStore®* porque vimos que ya recibiste tu pedido. ¡Nos alegra mucho que ya esté contigo! Queremos que le saques el mayor provecho desde hoy.',
    '¡Gracias de corazón por confiar en nosotros! 🤍',
    '',
  ];
  const manual = [
    'Como un detalle especial por tu compra, te comparto este manual exclusivo que preparamos para ti:',
    '📄 Tu guía adjunta: *Manual de Bienestar Articular*. (Una guía valorada por especialistas, exclusiva para ti).',
    '💡 Un consejo clave: Échale un vistazo antes de empezar a usar tu producto; ahí tienes las pautas exactas para ver los mejores resultados paso a paso.',
    '',
  ];
  const cierra = [
    'Si más adelante quieres pedir algo nuevo para ti o recomendárselo a alguien, puedes ver todo nuestro catálogo aquí:',
    '🔗 https://vidanovastore.com/products',
    '',
    'Cualquier duda que tengas sobre cómo usarlo, escríbeme por aquí, me llamo Saul y con gusto te ayudo. ¡Que lo disfrutes mucho! ✨',
    '',
    'Equipo 🍃 *VidanovaStore®*',
  ];
  const con = core.lgValues(tpl, { name: 'Beatriz', manual: true, manualTitle: 'Manual de Bienestar Articular' });
  assert.ok(con.ok);
  assert.strictEqual(core.lgMessage('entregado', con.values), [...abre, ...manual, ...cierra].join('\n'), 'Con manual');
  const sin = core.lgValues(tpl, { name: 'Beatriz', manual: false, manualTitle: 'Manual de Bienestar Articular' });
  assert.ok(sin.ok);
  assert.strictEqual(core.lgMessage('entregado', sin.values), [...abre, ...cierra].join('\n'), 'Sin manual: se quita todo el bloque, incluido el consejo');
  assert.ok(core.lgMessage('entregado', sin.values).includes(core.LG_CATALOG), 'El catálogo sale de LG_CATALOG');
});

caso('logistics: Reclamar en Oficina, con y sin manual', () => {
  const tpl = core.lgTemplate('oficina');
  assert.strictEqual(tpl.k, 'oficina');
  assert.deepStrictEqual(tpl.fields.map((f) => [f.k, f.type, f.from || null, f.when || null, !!f.keep, f.ph || null]), [
    ['product', 'text', 'name', null, false, 'Ej: Crema Arbutina'], ['manual', 'check', null, null, true, null], ['manualTitle', 'text', null, 'manual', true, 'Ej: Manual de Bienestar Articular']]);
  assert.deepStrictEqual(core.lgForm(tpl), { product: '', manual: true, manualTitle: '' });
  assert.deepStrictEqual(core.lgValues(tpl, core.lgForm(tpl)).errors, { product: 'Escribe producto', manualTitle: 'Escribe título del manual' });
  assert.deepStrictEqual(core.lgValues(tpl, { product: 'Crema Arbutina', manual: false, manualTitle: '' }).errors, {}, 'Desmarcada: el título no se exige');
  const con = core.lgValues(tpl, { product: 'Crema Arbutina', manual: true, manualTitle: 'Manual de Bienestar Articular' });
  assert.ok(con.ok);
  assert.strictEqual(core.lgMessage('oficina', con.values), 'Saludos desde 🍃*VidanovaStore®*, le informamos que su pedido de *Crema Arbutina* ya se encuentra en la oficina para ser reclamado.\nPor favor, nos informe cuando lo obtenga para enviarle el Manual de Bienestar Articular.');
  const sin = core.lgValues(tpl, { product: 'Crema Arbutina', manual: false, manualTitle: 'Manual de Bienestar Articular' });
  assert.ok(sin.ok);
  assert.strictEqual(core.lgMessage('oficina', sin.values), 'Saludos desde 🍃*VidanovaStore®*, le informamos que su pedido de *Crema Arbutina* ya se encuentra en la oficina para ser reclamado.\nPor favor, nos informe cuando lo obtenga.');
});

caso('logistics: lgPhone acepta solo las formas pedidas y devuelve 10 dígitos', () => {
  for (const t of ['+57 311 7624068', '311 7624068', '3117624068', '+573117624068', '+57 3117624068', ' 311 7624068 ']) assert.strictEqual(core.lgPhone(t), '3117624068', 'Válido: ' + t);
  for (const t of ['', '   ', 'abc', '311-762-4068', '(311) 7624068', '311.7624068', '311 762 4068', '31 17624068', '311762406', '31176240689', '+1 311 7624068', '+57311 762 4068', '++57 311 7624068', '57 311 7624068', '2117624068', '311 7624068 x', '+57  311 7624068']) assert.strictEqual(core.lgPhone(t), null, 'Rechazado: ' + JSON.stringify(t));
  const tpl = core.lgTemplate('pedido');
  assert.strictEqual(tpl.fields.find((f) => f.k === 'phone').type, 'phone');
  const base = { name: 'Eugenia', product: 'Omegaxl joint support', address: 'Calle 1', city: 'PASTO', dept: 'NARIÑO', total: '97400' };
  const bien = core.lgValues(tpl, { ...base, phone: '+57 311 7624068' });
  assert.ok(bien.ok && bien.values.phone === '3117624068', 'Se guarda normalizado');
  assert.ok(core.lgMessage('pedido', bien.values).includes('*Teléfono:* 3117624068'), 'El mensaje lo muestra sin espacios ni +57');
  const mal = core.lgValues(tpl, { ...base, phone: '311-762-4068' });
  assert.deepStrictEqual(mal.errors, { phone: 'Teléfono inválido: usa 311 7624068 o +57 311 7624068' });
  assert.deepStrictEqual(core.lgValues(tpl, { ...base, phone: '' }).errors, { phone: 'Escribe teléfono de contacto' });
});

caso('logistics: campo digits (solo números) en lgValues', () => {
  const tpl = { k: 'prueba', fields: [{ k: 'dropi', label: 'ID Dropi', type: 'digits', ph: 'Ej: 2234277', errDigits: 'ID inválido: solo números' }] };
  assert.deepStrictEqual(core.lgValues(tpl, {}).errors, { dropi: 'Escribe id dropi' }, 'Vacío');
  assert.deepStrictEqual(core.lgValues(tpl, { dropi: '   ' }).errors, { dropi: 'Escribe id dropi' }, 'Solo espacios');
  assert.deepStrictEqual(core.lgValues(tpl, { dropi: '2234277' }), { ok: true, values: { dropi: '2234277' }, errors: {} });
  assert.strictEqual(core.lgValues(tpl, { dropi: ' 2234277 ' }).values.dropi, '2234277', 'Recorta espacios');
  for (const t of ['22.34277', 'ID2234277', '22 34', '-5', '1e3', '2234277x']) assert.deepStrictEqual(core.lgValues(tpl, { dropi: t }).errors, { dropi: 'ID inválido: solo números' }, 'Rechazado: ' + t);
  const sinAviso = { k: 'p2', fields: [{ k: 'dropi', label: 'ID Dropi', type: 'digits' }] };
  assert.strictEqual(core.lgValues(sinAviso, { dropi: 'abc' }).errors.dropi, 'Solo números', 'Aviso por defecto');
  assert.strictEqual(core.lgValues(tpl, { dropi: '0012' }).values.dropi, '0012', 'Se conserva tal cual');
});

caso('logistics: lgFromCand toma producto, ID y proveedor único de Mi candidato', () => {
  assert.deepStrictEqual(core.lgFromCand(null), { product: '', dropi: '', supplier: '' });
  assert.deepStrictEqual(core.lgFromCand({}), { product: '', dropi: '', supplier: '' });
  assert.deepStrictEqual(core.lgFromCand({ name: 'Crema Arbutina', dropi: '2234277', suppliers: [] }), { product: 'Crema Arbutina', dropi: '2234277', supplier: '' }, '0 proveedores');
  assert.deepStrictEqual(core.lgFromCand({ name: ' Crema Arbutina ', dropi: ' 2234277 ', suppliers: [{ name: ' Botania ' }] }), { product: 'Crema Arbutina', dropi: '2234277', supplier: 'Botania' }, '1 proveedor, recortado');
  assert.strictEqual(core.lgFromCand({ name: 'X', suppliers: [{ name: 'Botania' }, { name: 'Nibresma' }] }).supplier, '', '2 proveedores');
  assert.strictEqual(core.lgFromCand({ name: 'X', suppliers: [{ name: 'Botania' }, { name: '   ' }] }).supplier, 'Botania', 'Uno con nombre vacío no cuenta');
  assert.strictEqual(core.lgFromCand({ name: 'X', suppliers: [{ name: '' }, { name: '' }] }).supplier, '', 'Todos vacíos');
  assert.strictEqual(core.lgFromCand({ name: 'X', suppliers: [{ name: 'Botania' }, { name: 'Botania' }] }).supplier, '', 'Dos con nombre, aunque iguales');
  assert.strictEqual(core.lgFromCand({ name: 'X', suppliers: null }).supplier, '', 'suppliers no es arreglo');
  assert.strictEqual(core.lgFromCand({ dropi: 2234277 }).dropi, '2234277', 'ID numérico → texto');
});

caso('logistics: etapas Validar y Privatizar', () => {
  assert.strictEqual(core.LG_STAGES.validar, 'Validar');
  assert.strictEqual(core.LG_STAGES.privatizar, 'Privatizar');
});

caso('logistics: Validación de Producto (proveedores, Mi candidato)', () => {
  const tpl = core.lgTemplate('valida');
  assert.strictEqual(tpl.k, 'valida');
  assert.strictEqual(tpl.group, 'prov');
  assert.strictEqual(tpl.src, 'cand');
  assert.strictEqual(tpl.stage, 'validar');
  assert.strictEqual(tpl.title, 'Validación de Producto');
  assert.strictEqual(tpl.sub, 'Antes de escalar la pauta: valido con el proveedor stock, hora de corte y restock.');
  assert.deepStrictEqual(tpl.fields.map((f) => [f.k, f.type, f.from, f.ph, f.errDigits || null]), [
    ['supplier', 'text', 'supplier', 'Ej: Botania', null],
    ['product', 'text', 'name', 'Ej: Crema Arbutina', null],
    ['dropi', 'digits', 'dropi', 'Ej: 2234277', 'ID inválido: solo números']]);
  assert.deepStrictEqual(core.lgValues(tpl, core.lgForm(tpl)).errors, { supplier: 'Escribe proveedor', product: 'Escribe producto', dropi: 'Escribe id dropi' });
  assert.deepStrictEqual(core.lgValues(tpl, { supplier: 'Botania', product: 'Crema Arbutina', dropi: '22.3' }).errors, { dropi: 'ID inválido: solo números' });
  const r = core.lgValues(tpl, { supplier: ' Botania ', product: 'Crema Arbutina', dropi: ' 2234277 ' });
  assert.ok(r.ok);
  assert.strictEqual(core.lgMessage('valida', r.values), `Hola, buen día equipo de Botania. Les saluda Saul de la tienda 🍃*VidanovaStore®* (Comunidad NovaProject).
Estamos por iniciar pauta publicitaria escalada para su producto *Crema Arbutina* con ID: *2234277*.

Quisiera validar con ustedes rápidamente 3 puntos operativos:
1. ¿Tienen stock físico real en bodega para despachos inmediatos?
2. ¿Cuál es su hora de corte para despachar el mismo día las guías generadas?
3. ¿Tienen proyección de restock continuo para este producto en caso de escalar a 15-20 pedidos diarios?

Quedo atento para coordinar y empezar a meterle volumen. Muchas gracias.`);
  assert.ok(!core.LG_TEMPLATES.filter((t) => t.group !== 'prov').some((t) => t.src), 'Las de clientes no traen src ni group');
});

caso('logistics: Solicitud de Privatización (proveedores, Mi candidato)', () => {
  const tpl = core.lgTemplate('privatiza');
  assert.strictEqual(tpl.k, 'privatiza');
  assert.strictEqual(tpl.group, 'prov');
  assert.strictEqual(tpl.src, 'cand');
  assert.strictEqual(tpl.stage, 'privatizar');
  assert.strictEqual(tpl.title, 'Solicitud de Privatización');
  assert.strictEqual(tpl.sub, 'Cuando el producto funciona: le pido al proveedor que lo privatice para mi tienda.');
  assert.deepStrictEqual(tpl.fields, core.lgTemplate('valida').fields, 'Mismos tres campos que Validación');
  assert.deepStrictEqual(core.lgValues(tpl, core.lgForm(tpl)).errors, { supplier: 'Escribe proveedor', product: 'Escribe producto', dropi: 'Escribe id dropi' });
  assert.deepStrictEqual(core.lgValues(tpl, { supplier: 'Botania', product: 'Crema Arbutina', dropi: 'ID2234277' }).errors, { dropi: 'ID inválido: solo números' });
  const r = core.lgValues(tpl, { supplier: 'Botania', product: 'Crema Arbutina', dropi: '2234277' });
  assert.ok(r.ok);
  const m = core.lgMessage('privatiza', r.values);
  assert.strictEqual(m, `Hola, buen día equipo de Botania. Les saluda Saul de la tienda 🍃*VidanovaStore®* (Comunidad NovaProject).

Venimos trabajando con su producto *Crema Arbutina* (ID: 2234277) y los resultados de la pauta han sido muy buenos. Es un producto en el que creemos y queremos apostarle fuerte.

Por eso quisiera proponerles la *privatización* del producto para nuestra tienda. A cambio, nos comprometemos a:
✅ Invertir en pauta publicitaria constante para mover volumen.
✅ Cuidar la imagen del producto con una página y unos creativos de calidad.

Quedo atento a su respuesta. ¡Muchas gracias por su apoyo! 🤝`);
  assert.ok(!m.includes('pedidos diarios') && !m.includes('condiciones'), 'Sin la línea de pedidos diarios ni la pregunta de condiciones');
});

caso('logistics: ya no existe Segundo Intento (recordatorio)', () => {
  assert.ok(!core.LG_TEMPLATES.some((t) => t.k === 'recordatorio' || t.title === 'Segundo Intento'));
  assert.strictEqual(core.lgTemplate('recordatorio').k, 'pedido', 'Una clave que ya no existe cae en la primera plantilla');
});

caso('logistics: el producto sale en negrita y las cuentas salen de LG_ACCOUNTS', () => {
  assert.strictEqual(core.LG_ACCOUNTS, '📱 *Nequi/Daviplata*\n' + core.LG_NEQUI + '\n\n🏦 *Ahorros - Bancolombia*\n' + core.LG_BANK);
  const P = 'Plant Pwr Calma Panico Polvora Mascotas';
  const casos = {
    pedido: { name: 'Eugenia', product: P, address: 'Calle 1', city: 'PASTO', dept: 'NARIÑO', phone: '3214566677', total: 97400 },
    guia: { name: 'Pablo', product: P, guide: '074102602224', carrier: 'ENVIA', price: 97400, address: 'Calle 1' },
    tercero: { name: 'Eugenia', product: P, city: 'Pasto' },
    anticipo: { name: 'Eugenia', product: P, advance: 20000 },
    reintento: { name: 'Rafael', product: P },
    flete: { name: 'Rafael', city: 'Vaupés', shipping: 50000, product: P, advance: 20000 },
    enruta: { name: 'Beatriz', product: P },
    oficina: { product: P, manual: false },
  };
  for (const [k, v] of Object.entries(casos)) {
    const m = core.lgMessage(k, v);
    assert.ok(m.includes('*' + P + '*') || (k === 'enruta' && m.includes(P)), k + ': producto en negrita');
    assert.ok(!m.includes('**'), k + ': sin asteriscos anidados');
  }
  assert.ok(core.lgMessage('enruta', casos.enruta).includes('*tu pedido ' + P + ' ya se encuentra en ruta de entrega*'), 'enruta lo lleva dentro de su frase en negrita');
  for (const k of ['anticipo', 'flete']) {
    const m = core.lgMessage(k, casos[k]);
    assert.ok(m.includes(core.LG_ACCOUNTS), k + ': trae el bloque de cuentas');
    assert.strictEqual(m.split(core.LG_NEQUI).length - 1, 1, k + ': el Nequi sale una vez');
    assert.strictEqual(m.split(core.LG_BANK).length - 1, 1, k + ': la cuenta de ahorros sale una vez');
  }
});

caso('logistics: cada plantilla trae su etapa para el chip del título', () => {
  assert.deepStrictEqual(core.LG_STAGES, { confirmar: 'Confirmar', cobro: 'Cobro', envio: 'Envío', entrega: 'Entrega', validar: 'Validar', privatizar: 'Privatizar' });
  assert.deepStrictEqual(Object.fromEntries(core.LG_TEMPLATES.map((t) => [t.k, t.stage])), {'pedido': 'confirmar', 'reconfirma': 'confirmar', 'tercero': 'confirmar', 'confirmado': 'confirmar', 'guia': 'envio', 'infografia': 'envio', 'anticipo': 'cobro', 'reintento': 'envio', 'flete': 'cobro', 'enruta': 'envio', 'entregado': 'entrega', 'oficina': 'envio', 'valida': 'validar', 'privatiza': 'privatizar'});
  assert.ok(core.LG_TEMPLATES.every((t) => t.stage in core.LG_STAGES));
});

caso('logistics: Envío de Infografía', () => {
  const tpl = core.lgTemplate('infografia');
  assert.strictEqual(tpl.k, 'infografia');
  assert.deepStrictEqual(tpl.fields.map((f) => [f.k, f.type, f.from || null, f.ph]), [['product', 'text', 'name', 'Ej: Crema Arbutina']], 'Solo el producto, de Desarrollo');
  assert.deepStrictEqual(core.lgValues(tpl, {}).errors, { product: 'Escribe producto' });
  const r = core.lgValues(tpl, { product: ' Crema Arbutina ' });
  assert.ok(r.ok);
  const esperado = [
    '¡Hola! 👋 Te saludamos de 🍃*VidanovaStore®*.',
    '',
    'Para que le saques el máximo provecho a tu producto y veas resultados más rápido, te compartimos esta *infografía visual* con el paso a paso exacto para aplicar tu *Crema Arbutina* en tu rutina. 🌙✨',
    '',
    '¡Guárdala en tu celular para tenerla a la mano! Cualquier duda con el uso, con gusto te asesoramos por aquí. 😊',
  ].join('\n');
  assert.strictEqual(core.lgMessage('infografia', r.values), esperado);
});

caso('logistics: constantes de la tienda y Solicitud de Anticipo con el texto de siempre', () => {
  assert.strictEqual(core.LG_CATALOG, 'https://vidanovastore.com/products');
  assert.strictEqual(core.LG_NEQUI, '3182110955');
  assert.strictEqual(core.LG_BANK, '23015881151');
  const esperado = [
    'Hola, Eugenia 👋',
    '',
    'Recibimos tu pedido de *Crema Despigmentante* en 🍃*VidanovaStore®* y queremos que te llegue sin contratiempos 📦',
    '',
    'Debido a nuestras políticas de seguridad y a un historial de altas devoluciones registradas con tu número en la red logística nacional (te compartimos la gráfica oficial adjunta), por protocolo de la bodega no podemos arriesgar el despacho sin un pequeño anticipo de *$20.000* 🔒',
    '',
    'Ese valor *se descuenta del total* que pagarás contra entrega: no es un costo adicional, solo la garantía de que tu pedido salga hoy mismo 🚚',
    '',
    'Puedes realizar el abono a cualquiera de nuestras dos cuentas:',
    '',
    '📱 *Nequi/Daviplata*',
    '3182110955',
    '',
    '🏦 *Ahorros - Bancolombia*',
    '23015881151',
    '',
    'Apenas nos envíes el comprobante por este chat, programamos tu despacho 🤍',
  ].join('\n');
  assert.strictEqual(core.lgMessage('anticipo', { name: 'Eugenia', product: 'Crema Despigmentante', advance: 20000 }), esperado);
});

caso('logistics: lgValues con campo condicional (when)', () => {
  const tpl = { k: 'prueba', fields: [
    { k: 'name', label: 'Nombre de cliente', type: 'text' },
    { k: 'manual', label: 'Incluye manual', type: 'check', def: true, keep: true },
    { k: 'manualTitle', label: 'Título del manual', type: 'text', when: 'manual', keep: true },
  ] };
  const marcada = core.lgValues(tpl, { name: 'Ana', manual: true, manualTitle: '' });
  assert.ok(!marcada.ok && Object.keys(marcada.errors).join() === 'manualTitle', 'Marcada: el título es obligatorio');
  const conTitulo = core.lgValues(tpl, { name: 'Ana', manual: true, manualTitle: 'Manual X' });
  assert.ok(conTitulo.ok && conTitulo.values.manualTitle === 'Manual X' && conTitulo.values.manual === true);
  const desmarcada = core.lgValues(tpl, { name: 'Ana', manual: false, manualTitle: '' });
  assert.ok(desmarcada.ok && !('manualTitle' in desmarcada.values) && desmarcada.values.manual === false, 'Desmarcada: no da error ni entra en values');
  const conTextoOculto = core.lgValues(tpl, { name: 'Ana', manual: false, manualTitle: 'Manual X' });
  assert.ok(conTextoOculto.ok && !('manualTitle' in conTextoOculto.values), 'Desmarcada: lo escrito no entra en values');
  assert.deepStrictEqual(core.lgForm(tpl), { name: '', manual: true, manualTitle: '' });
});

caso('logistics: lgMessage es idéntico al texto de la spec', () => {
  const esperado = [
    '*CONFIRMACIÓN GUIA*',
    '¡Hola, Pablo! 👋 Te saludamos nuevamente de 🍃*VidanovaStore®*.',
    '',
    'Te confirmamos que tu pedido de la *Omegaxl joint support* ya fue empacado y entregado a la transportadora. 📦✨',
    '',
    '🚚 *Número de Guía*: 074102602224',
    '🚛 *Transportadora*: ENVIA',
    '🔗 *Rastreo*: Puedes consultar el estado de tu paquete directamente en la página web de la transportadora con ese número de guía.',
    '',
    'El tiempo estimado de entrega es de *2 a 4 días hábiles*.',
    '💵 Recuerda tener listos los *$97.400* en efectivo para cuando el repartidor llegue a tu dirección (Cra 67 # 25 - 34 Itagui - Calatrava).',
    '',
    '¡Cualquier duda que tengas durante el camino, nos puedes escribir por aquí! Que tengas un excelente día. 😊',
  ].join('\n');
  const v = { name: 'Pablo', product: 'Omegaxl joint support', guide: '074102602224', carrier: 'envia', price: 97400, address: 'Cra 67 # 25 - 34 Itagui - Calatrava', days: '9 a 9' };
  assert.strictEqual(core.lgMessage('guia', v), esperado, 'Aunque llegue otro days, el mensaje usa el fijo');
  assert.strictEqual(core.lgMessage('x', PEDIDO), core.lgMessage('pedido', PEDIDO), 'Una clave desconocida cae en la primera plantilla');
  for (const c of ['envia', 'Envia', 'ENVIA']) assert.strictEqual(core.lgMessage('guia', { ...v, carrier: c }), esperado, `Transportadora «${c}» sale en mayúsculas`);
  assert.ok(core.lgMessage('guia', { ...v, price: 1234567 }).includes('*$1.234.567*'));
  assert.ok(core.LG_STORE === '🍃VidanovaStore®');
});

caso('Meta Ads: ciudades excluidas tal como están hoy en Meta (SPEC 17)', () => {
  const TODO = ['Todo el departamento'];
  assert.deepStrictEqual(core.EXCLUDED, [
    ['Amazonas', TODO],
    ['Antioquia', ['Caicedo', 'San Andrés de Cuerquia', 'Tarso']],
    ['Arauca', ['Arauca', 'Arauquita', 'Cravo', 'Tame']],
    ['Caquetá', ['Albania (Caquetá)', 'Belén De Los Andaquíes', 'Morelia (Caquetá)', 'Puerto Rico (Caquetá)', 'Puerto Solano', 'San José del Fragua', 'San Vicente De Caguán', 'Solano']],
    ['Chocó', ['Bahía Solano']],
    ['Guainía', TODO],
    ['Huila', ['Isnos', 'San José De Isnos']],
    ['Magdalena', ['Nueva Granada (Magdalena)']],
    ['Meta', ['Guamal']],
    ['Putumayo', ['La Hormiga', 'Puerto Asís', 'Puerto Guzmán', 'Villagarzón']],
    ['San Andrés y Providencia', ['San Andrés (San Andrés y Providencia)', 'Providencia']],
    ['Santander', ['Carcasí']],
    ['Sucre', ['El Francés', 'El Islote', 'El Roble']],
    ['Tolima', ['Venadillo']],
    ['Vaupés', TODO],
    ['Vichada', TODO],
    ['Casanare', ['Villanueva (Casanare)']],
    ['Cundinamarca', ['Fómeque', 'Quebradanegra', 'Quito']],
    ['Boyacá', ['Jericó']],
  ]);
  const places = core.ABO_STEPS.flatMap((s) => s.items || []).find((it) => it.k === 'places');
  assert.strictEqual(places.more.groups, core.EXCLUDED, 'El desplegable «Ver ciudades que excluyo» usa la lista');
});

caso('Centro de mando: iniciales, URL, dominio y favicon', () => {
  assert.strictEqual(core.hubInitials('TikTok Ads'), 'TA');
  assert.strictEqual(core.hubInitials('Dropi'), 'D');
  assert.strictEqual(core.hubInitials('Mi gran tienda nueva'), 'MGT');
  assert.strictEqual(core.hubInitials('  '), '');
  assert.deepStrictEqual(core.hubUrl(''), { ok: true, url: '', err: null });
  assert.deepStrictEqual(core.hubUrl(' https://x.co '), { ok: true, url: 'https://x.co', err: null });
  assert.strictEqual(core.hubUrl('x.co').ok, false);
  assert.strictEqual(core.hubUrl('https://a b').ok, false);
  assert.strictEqual(core.hubUrl('javascript:alert(1)').ok, false);
  assert.strictEqual(core.hubDomain('https://www.skool.com/x'), 'skool.com');
  assert.strictEqual(core.hubDomain('https://ads.tiktok.com/'), 'ads.tiktok.com');
  assert.strictEqual(core.hubDomain(''), '');
  assert.strictEqual(core.hubDomain('x.co'), '');
  assert.strictEqual(core.hubFavicon('https://ads.tiktok.com/'), 'https://www.google.com/s2/favicons?domain=ads.tiktok.com&sz=64');
  assert.strictEqual(core.hubFavicon(''), null);
});

caso('Centro de mando: hubLoad valida lo guardado', () => {
  const fab = core.hubDefaults();
  assert.strictEqual(fab.length, 9);
  assert.deepStrictEqual(fab.map((x) => x.id), ['tiktok', 'meta', 'adlib', 'dropi', 'dropkiller', 'kalodata', 'skool', 'chatgpt', 'claude']);
  assert.ok(fab.every((x) => x.url === '' && x.icon === null));
  assert.deepStrictEqual(core.hubLoad(null), fab);
  assert.deepStrictEqual(core.hubLoad('{roto'), fab);
  assert.deepStrictEqual(core.hubLoad(JSON.stringify({ v: 2, items: [{ id: 'a', name: 'A' }] })), fab);
  const items = core.hubLoad(JSON.stringify({ v: 1, items: [
    { id: 'a', name: 'Alfa', url: 'https://a.co', icon: 'data:image/png;base64,xx' },
    { id: 'b', name: '', url: '' },
    { name: 'sin id' },
    { id: 'c', name: 'Ce', url: 'javascript:alert(1)', icon: 'http://x/y.png' },
    { id: 'a', name: 'Repetido' },
  ] }));
  assert.deepStrictEqual(items, [
    { id: 'a', name: 'Alfa', ini: 'A', url: 'https://a.co', icon: 'data:image/png;base64,xx' },
    { id: 'c', name: 'Ce', ini: 'C', url: '', icon: null },
  ]);
});

caso('Centro de mando: hubCheck, hubAdd, hubOrder, hubRemove y hubSet', () => {
  const base = [{ id: 'a', name: 'A', ini: 'A', url: '', icon: null }, { id: 'b', name: 'B', ini: 'B', url: '', icon: null }, { id: 'c', name: 'C', ini: 'C', url: '', icon: null }];
  assert.deepStrictEqual(core.hubCheck(base), { ok: true, errors: {} });
  const mal = core.hubSet(core.hubSet(base, 'a', { url: 'x.co' }), 'b', { name: ' ' });
  const r = core.hubCheck(mal);
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.a.url && !r.errors.a.name);
  assert.ok(r.errors.b.name);
  assert.strictEqual(r.errors.c, undefined);
  const sucio = [{ id: 'a', name: '  Alfa ', ini: '', url: ' https://a.co ', icon: null }];
  assert.deepStrictEqual(core.hubClean(sucio), [{ id: 'a', name: 'Alfa', ini: 'A', url: 'https://a.co', icon: null }]);
  assert.strictEqual(sucio[0].name, '  Alfa ', 'hubClean no toca la lista recibida');
  assert.strictEqual(core.hubAdd(base, { name: '', url: 'https://x.co' }).ok, false);
  assert.strictEqual(core.hubAdd(base, { name: 'X', url: '' }).ok, false);
  assert.strictEqual(core.hubAdd(base, { name: 'X', url: 'x.co' }).ok, false);
  const add = core.hubAdd(base, { name: ' Mi Tienda ', url: 'https://x.co' }, 1000);
  assert.strictEqual(add.ok, true);
  assert.strictEqual(base.length, 3, 'no debe tocar la lista recibida');
  assert.deepStrictEqual(add.items[3], { id: 'urs', name: 'Mi Tienda', ini: 'MT', url: 'https://x.co', icon: null });
  const dos = core.hubAdd(core.hubAdd(base, { name: 'X', url: 'https://x.co' }, 7).items, { name: 'Y', url: 'https://y.co' }, 7);
  assert.strictEqual(new Set(dos.items.map((x) => x.id)).size, 5, 'Dos altas en el mismo instante no repiten id');
  assert.deepStrictEqual(core.hubOrder(base, ['c', 'a', 'b']).map((x) => x.id), ['c', 'a', 'b'], 'hubOrder sigue el orden pedido');
  assert.deepStrictEqual(core.hubOrder(base, ['c', 'zz']).map((x) => x.id), ['c', 'a', 'b'], 'hubOrder ignora ids desconocidos y deja al final los que faltan');
  assert.deepStrictEqual(core.hubOrder(base, ['b', 'b']).map((x) => x.id), ['b', 'a', 'c'], 'hubOrder no repite');
  assert.strictEqual(core.hubOrder(base, ['a', 'b', 'c'])[0], base[0], 'hubOrder conserva los mismos objetos');
  assert.deepStrictEqual(core.hubRemove(base, 'b').map((x) => x.id), ['a', 'c']);
  assert.strictEqual(base.length, 3);
  const ren = core.hubSet(base, 'a', { name: 'Mi gran tienda' });
  assert.strictEqual(ren[0].ini, 'MGT');
  assert.strictEqual(base[0].ini, 'A');
});

caso('Inicio: saludo según la hora', () => {
  const h = (hour) => core.homeGreeting(hour);
  assert.strictEqual(h(4), 'Buenas noches');
  assert.strictEqual(h(5), 'Buenos días');
  assert.strictEqual(h(11), 'Buenos días');
  assert.strictEqual(h(12), 'Buenas tardes');
  assert.strictEqual(h(18), 'Buenas tardes');
  assert.strictEqual(h(19), 'Buenas noches');
  assert.strictEqual(h(23), 'Buenas noches');
  assert.strictEqual(h(0), 'Buenas noches');
  assert.strictEqual(core.HOME_NAME, 'Saúl');
  assert.strictEqual(core.homeHello(10), 'Buenos días, Saúl');
  assert.strictEqual(core.homeHello(15), 'Buenas tardes, Saúl');
  assert.strictEqual(core.homeHello(21), 'Buenas noches, Saúl');
  assert.strictEqual(core.homeHello(3), 'Buenas noches, Saúl');
});

caso('Inicio: lista local de frases (HOME_QUOTES)', () => {
  const Q = core.HOME_QUOTES;
  assert.strictEqual(Q.length, 864, '365 + 500 sin la repetida');
  const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  assert.strictEqual(new Set(Q.map((q) => norm(q.text))).size, Q.length, 'Sin frases repetidas');
  for (const q of Q) {
    assert.deepStrictEqual(Object.keys(q).sort(), ['author', 'text'], 'Solo text y author');
    assert.ok(q.text && q.text === q.text.trim() && q.text.length <= 200, 'Texto no vacío, sin espacios sobrantes y de hasta 200 caracteres: ' + q.text);
    assert.ok(q.author && q.author === q.author.trim(), 'Autor presente: ' + q.text);
    assert.ok(!/^["“«]|["”»]$/.test(q.text), 'Sin comillas externas: ' + q.text);
  }
});

caso('Inicio: media jornada, día y baraja', () => {
  assert.strictEqual(core.homeSlot(0), 0);
  assert.strictEqual(core.homeSlot(11), 0);
  assert.strictEqual(core.homeSlot(12), 1);
  assert.strictEqual(core.homeSlot(23), 1);
  assert.strictEqual(core.homeDay(new Date(2026, 0, 1, 23, 59)), 0);
  assert.strictEqual(core.homeDay(new Date(2026, 0, 2, 0, 0)), 1);
  assert.strictEqual(core.homeDay(new Date(2025, 11, 31, 12)), -1);
  assert.strictEqual(core.homeDay(new Date(2027, 0, 1)), 365);
  const p = core.homeOrder(864, 18);
  assert.deepStrictEqual([...p].sort((a, b) => a - b), Array.from({ length: 864 }, (_, i) => i), 'Es una permutación');
  assert.deepStrictEqual(core.homeOrder(864, 18), p, 'Misma semilla, mismo orden');
  assert.notDeepStrictEqual(core.homeOrder(864, 19), p, 'Otra semilla, otro orden');
  assert.notDeepStrictEqual(p.slice(0, 20), Array.from({ length: 20 }, (_, i) => i), 'Barajada, no en orden');
});

caso('Inicio: homePick da una frase en la mañana y otra en la tarde, sin repetir', () => {
  const Q = core.HOME_QUOTES;
  const at = (y, m, d, h) => core.homePick(Q, new Date(y, m, d, h, 30));
  const m1 = at(2026, 10, 20, 0), m2 = at(2026, 10, 20, 11), t1 = at(2026, 10, 20, 12), t2 = at(2026, 10, 20, 23);
  assert.deepStrictEqual(m1, m2, 'Toda la mañana la misma frase');
  assert.deepStrictEqual(t1, t2, 'Toda la tarde (y la noche) la misma frase');
  assert.notStrictEqual(m1.text, t1.text, 'Mañana y tarde distintas');
  assert.strictEqual(m1.slot, 0); assert.strictEqual(m1.label, 'Frase de la mañana:');
  assert.strictEqual(t1.slot, 1); assert.strictEqual(t1.label, 'FRASE DE HOY');
  assert.notStrictEqual(at(2026, 10, 21, 9).text, m1.text, 'Al día siguiente cambia');
  assert.ok(Q.some((q) => q.text === m1.text && q.author === m1.author), 'Sale de la lista');
  // Una vuelta completa (432 días = 864 medias jornadas) usa cada frase una sola vez; luego empieza otra baraja.
  const vistos = new Set();
  for (let d = 0; d < Q.length / 2; d++) for (const h of [8, 15]) vistos.add(core.homePick(Q, new Date(2026, 0, 1 + d, h)).text);
  assert.strictEqual(vistos.size, Q.length, 'Ninguna se repite hasta usarlas todas');
  assert.ok(core.homePick(Q, new Date(2025, 5, 1, 8)), 'Fechas antes del inicio también dan frase');
  assert.strictEqual(core.homePick([], new Date()), null);
  assert.deepStrictEqual(core.homePick([{ text: 'A', author: 'B' }], new Date(2026, 3, 3, 14)), { slot: 1, label: 'FRASE DE HOY', text: 'A', author: 'B' });
});

// ---- Mis tareas (SPEC 19): port de tests/domain/* de My Sticky Notes ----

caso('Mis tareas: tkDayKey formatea la fecha local con ceros', () => {
  assert.strictEqual(core.tkDayKey(new Date(2026, 10, 14)), '2026-11-14');
  assert.strictEqual(core.tkDayKey(new Date(2026, 0, 5)), '2026-01-05');
  assert.strictEqual(core.tkDayKey(new Date(2026, 10, 14, 0, 0)), '2026-11-14', 'Local, no UTC');
  assert.strictEqual(core.tkDayKey(new Date(2026, 10, 14, 23, 59)), '2026-11-14', 'Local, no UTC');
});

caso('Mis tareas: tkDayDate da la medianoche local', () => {
  assert.strictEqual(core.tkDayDate('2026-11-14').getTime(), new Date(2026, 10, 14).getTime());
  assert.strictEqual(core.tkDayKey(core.tkDayDate('2027-01-01')), '2027-01-01');
});

caso('Mis tareas: tkAddDays suma, resta y cruza meses, años y bisiestos', () => {
  assert.strictEqual(core.tkAddDays('2026-11-14', 1), '2026-11-15');
  assert.strictEqual(core.tkAddDays('2026-11-14', -5), '2026-11-09');
  assert.strictEqual(core.tkAddDays('2026-11-14', 0), '2026-11-14');
  assert.strictEqual(core.tkAddDays('2026-11-30', 1), '2026-12-01');
  assert.strictEqual(core.tkAddDays('2026-12-31', 1), '2027-01-01');
  assert.strictEqual(core.tkAddDays('2027-01-01', -1), '2026-12-31');
  assert.strictEqual(core.tkAddDays('2028-02-28', 1), '2028-02-29');
  assert.strictEqual(core.tkAddDays('2027-02-28', 1), '2027-03-01');
});

caso('Mis tareas: tkDayLabel nombra Hoy, Mañana, Ayer y los demás con la etiqueta larga', () => {
  const today = '2026-11-14';
  assert.strictEqual(core.tkDayLabel('2026-11-14', today), 'Hoy');
  assert.strictEqual(core.tkDayLabel('2026-11-15', today), 'Mañana');
  assert.strictEqual(core.tkDayLabel('2026-11-13', today), 'Ayer');
  assert.strictEqual(core.tkDayLabel('2026-11-11', today), 'Miércoles, 11 nov');
  assert.strictEqual(core.tkDayLabel('2026-11-16', today), 'Lunes, 16 nov');
});

caso('Mis tareas: tkPastDays lista días anteriores con tareas, del más reciente al más viejo', () => {
  const t = {};
  const today = '2026-11-14';
  assert.deepStrictEqual(core.tkPastDays({ days: { '2026-11-10': [t], '2026-11-13': [t], '2026-11-12': [t, t] } }, today), ['2026-11-13', '2026-11-12', '2026-11-10']);
  assert.deepStrictEqual(core.tkPastDays({ days: { '2026-11-14': [t], '2026-11-15': [t], '2026-11-13': [], '2026-11-11': [t] } }, today), ['2026-11-11'], 'Sin hoy, mañana ni vacíos');
  assert.deepStrictEqual(core.tkPastDays({ days: { '2026-12-31': [t], '2027-01-01': [t] } }, '2027-01-02'), ['2027-01-01', '2026-12-31'], 'Cruza de año');
  assert.deepStrictEqual(core.tkPastDays({ days: {} }, today), []);
  assert.strictEqual(core.TK_HISTORY_DAYS, 5);
  assert.strictEqual(core.TK_VERSION, 1);
});

caso('Mis tareas: tkDateLabel y tkShortDate', () => {
  assert.strictEqual(core.tkDateLabel(new Date(2026, 10, 12)), 'Jueves, 12 nov');
  assert.strictEqual(core.tkDateLabel(new Date(2026, 0, 4)), 'Domingo, 4 ene');
  assert.strictEqual(core.tkDateLabel(new Date(2026, 8, 30)), 'Miércoles, 30 sep');
  assert.strictEqual(core.tkDateLabel(new Date(2026, 11, 26)), 'Sábado, 26 dic');
  assert.strictEqual(core.tkShortDate(new Date(2026, 10, 12)), 'Jue, 12 nov');
  assert.strictEqual(core.tkShortDate(new Date(2026, 10, 20)), 'Vie, 20 nov');
  const days = [15, 16, 17, 18, 19, 20, 21].map((d) => core.tkShortDate(new Date(2026, 10, d)).split(',')[0]);
  assert.deepStrictEqual(days, ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']);
  assert.strictEqual(core.tkShortDate(new Date(2026, 0, 4)), 'Dom, 4 ene');
  assert.strictEqual(core.tkShortDate(new Date(2026, 8, 30)), 'Mié, 30 sep');
});

caso('Mis tareas: tkIsHour y tkParseHour', () => {
  for (const h of [0, 9, 23]) assert.strictEqual(core.tkIsHour(h), true, String(h));
  for (const h of [-1, 24, 8.5, '8', null, undefined, NaN]) assert.strictEqual(core.tkIsHour(h), false, String(h));
  assert.strictEqual(core.tkParseHour(''), undefined);
  assert.strictEqual(core.tkParseHour('   '), undefined);
  assert.strictEqual(core.tkParseHour('0'), 0);
  assert.strictEqual(core.tkParseHour(' 8 '), 8);
  assert.strictEqual(core.tkParseHour('09'), 9);
  assert.strictEqual(core.tkParseHour('23'), 23);
  for (const s of ['24', '25', '-1', '8.5', 'a', '100', '1e1']) assert.strictEqual(core.tkParseHour(s), null, s);
});

// Comandos (port de note-operations.test.ts). tkAdd recibe { hour, text }, id y now.
const TKD = '2026-11-12';
const tkAt = (hour, minute = 0) => new Date(2026, 10, 12, hour, minute);
const tkT = (note, day = TKD) => core.tkTasksOf(note, day);
const tkProg = (note) => core.tkProgress(tkT(note));
const tkIds = (note, day = TKD) => tkT(note, day).map((t) => t.id);
const tkAdd = (note, text, id, now, hour, day = TKD) => core.tkAdd(note, day, { hour, text }, id, now);
const tkBase = () => {
  let n = core.tkEmpty();
  n = tkAdd(n, 'Comprar pan', 't1', tkAt(13, 40));
  n = tkAdd(n, 'Llamar al banco', 't2', tkAt(9));
  n = core.tkAddSub(n, 't1', 'Integral', 's1');
  return core.tkAddSub(n, 't1', 'Sin sal', 's2');
};
const tkOf = (...ids) => ids.reduce((n, id, i) => tkAdd(n, id, id, tkAt(8 + i)), core.tkEmpty());

caso('Mis tareas: tkEmpty y tkTasksOf', () => {
  assert.deepStrictEqual(core.tkEmpty(), { days: {} });
  assert.deepStrictEqual(core.tkTasksOf(core.tkEmpty(), TKD), []);
});

caso('Mis tareas: tkAdd agrega al final con la hora del reloj o la indicada', () => {
  const n = tkAdd(core.tkEmpty(), 'Comprar pan', 't1', tkAt(13, 40));
  assert.deepStrictEqual(tkT(n), [{ id: 't1', hour: 13, text: 'Comprar pan', done: false, subtasks: [], createdAt: tkAt(13, 40).toISOString() }]);
  assert.deepStrictEqual(tkIds(tkBase()), ['t1', 't2'], 'Orden de inserción');
  assert.strictEqual(tkT(tkAdd(core.tkEmpty(), '  hola  ', 't1', tkAt(8)))[0].text, 'hola', 'Recorta');
  const empty = core.tkEmpty();
  for (const text of ['', '   ', '\t\n']) assert.strictEqual(tkAdd(empty, text, 't1', tkAt(8)), empty, 'Texto vacío: ' + JSON.stringify(text));
  let m = tkAdd(core.tkEmpty(), 'a', 'a', tkAt(0, 5));
  m = tkAdd(m, 'b', 'b', tkAt(23, 59));
  assert.deepStrictEqual(tkT(m).map((t) => t.hour), [0, 23]);
  tkAdd(empty, 'x', 't1', tkAt(8));
  assert.deepStrictEqual(tkT(empty), [], 'No muta');
  assert.strictEqual(tkT(tkAdd(core.tkEmpty(), 'pan', 't1', tkAt(13, 40), 9))[0].hour, 9, 'Hora manual');
  let x = tkAdd(core.tkEmpty(), 'a', 'a', tkAt(12), 0);
  x = tkAdd(x, 'b', 'b', tkAt(12), 23);
  assert.deepStrictEqual(tkT(x).map((t) => t.hour), [0, 23], 'Extremos 0 y 23');
  for (const h of [24, -1, 9.5, NaN, null]) assert.strictEqual(tkAdd(empty, 'x', 't1', tkAt(8), h), empty, 'Hora inválida: ' + h);
});

caso('Mis tareas: tkSetAll marca o desmarca todo el día', () => {
  const all = core.tkSetAll(tkBase(), TKD, true);
  assert.ok(tkT(all).every((t) => t.done && t.subtasks.every((s) => s.done)));
  assert.deepStrictEqual(tkProg(all), { done: 4, total: 4, percent: 100 });
  let mix = core.tkToggle(tkBase(), 't2');
  mix = core.tkToggleSub(mix, 't1', 's1');
  assert.deepStrictEqual(tkProg(core.tkSetAll(mix, TKD, false)), { done: 0, total: 4, percent: 0 });
  const part = core.tkSetAll(core.tkToggle(tkBase(), 't1'), TKD, true);
  assert.deepStrictEqual(tkIds(part), ['t1', 't2']);
  assert.strictEqual(tkProg(part).done, 4);
  const n = tkBase();
  assert.strictEqual(core.tkSetAll(n, TKD, false), n, 'Nada cambia: misma referencia');
  assert.strictEqual(core.tkSetAll(all, TKD, true), all);
  assert.strictEqual(core.tkSetAll(n, '2026-11-13', true), n, 'Día vacío');
  const other = tkAdd(tkBase(), 'Otro', 'x', tkAt(10), undefined, '2026-11-13');
  const next = core.tkSetAll(other, TKD, true);
  assert.strictEqual(tkT(next, '2026-11-13'), tkT(other, '2026-11-13'), 'No toca otros días');
  assert.ok(!tkT(other).some((t) => t.done), 'No muta');
});

caso('Mis tareas: tkMove reordena dentro del día y limita el índice', () => {
  assert.deepStrictEqual(tkIds(core.tkMove(tkOf('a', 'b', 'c', 'd'), 'a', 2)), ['b', 'c', 'a', 'd']);
  assert.deepStrictEqual(tkIds(core.tkMove(tkOf('a', 'b', 'c', 'd'), 'd', 1)), ['a', 'd', 'b', 'c']);
  const n = tkOf('a', 'b', 'c');
  assert.deepStrictEqual(tkIds(core.tkMove(n, 'c', 0)), ['c', 'a', 'b']);
  assert.deepStrictEqual(tkIds(core.tkMove(n, 'a', 2)), ['b', 'c', 'a']);
  assert.deepStrictEqual(tkIds(core.tkMove(n, 'b', 99)), ['a', 'c', 'b']);
  assert.deepStrictEqual(tkIds(core.tkMove(n, 'b', -5)), ['b', 'a', 'c']);
  assert.strictEqual(core.tkMove(n, 'b', 1), n);
  assert.strictEqual(core.tkMove(n, 'c', 99), n);
  assert.strictEqual(core.tkMove(n, 'a', -1), n);
  const two = tkOf('a', 'b');
  assert.strictEqual(core.tkMove(two, 'zzz', 0), two);
  assert.strictEqual(core.tkMove(two, 'a', 0.5), two);
  assert.strictEqual(core.tkMove(two, 'a', NaN), two);
  const one = tkOf('a');
  assert.strictEqual(core.tkMove(one, 'a', 3), one);
  const b = tkBase();
  const before = JSON.stringify(b);
  const moved = core.tkMove(b, 't1', 1);
  assert.strictEqual(JSON.stringify(b), before, 'No muta');
  assert.deepStrictEqual(tkIds(moved), ['t2', 't1']);
  assert.deepStrictEqual(tkT(moved)[1].subtasks.map((s) => s.id), ['s1', 's2'], 'Conserva subtareas');
  let d = tkOf('a', 'b');
  d = tkAdd(d, 'x', 'x', tkAt(8), undefined, '2026-11-13');
  d = tkAdd(d, 'y', 'y', tkAt(9), undefined, '2026-11-13');
  const md = core.tkMove(d, 'a', 1);
  assert.deepStrictEqual(tkIds(md), ['b', 'a']);
  assert.strictEqual(tkT(md, '2026-11-13'), tkT(d, '2026-11-13'), 'Solo su día');
  assert.deepStrictEqual(tkIds(core.tkSetHour(n, 'c', 0)), ['a', 'b', 'c'], 'Cambiar hora no mueve');
  assert.deepStrictEqual(tkIds(core.tkToggle(n, 'a')), ['a', 'b', 'c'], 'Marcar no mueve');
});

caso('Mis tareas: tkMoveSub reordena dentro de su tarea y limita el índice', () => {
  let n = tkOf('a', 'b');
  for (const s of ['x', 'y', 'z']) n = core.tkAddSub(n, 'a', s.toUpperCase(), s);
  n = core.tkAddSub(n, 'b', 'Otra', 'w');
  const subs = (note, id = 'a') => tkT(note).find((t) => t.id === id).subtasks.map((s) => s.id);
  assert.deepStrictEqual(subs(core.tkMoveSub(n, 'a', 'x', 2)), ['y', 'z', 'x']);
  assert.deepStrictEqual(subs(core.tkMoveSub(n, 'a', 'z', 0)), ['z', 'x', 'y']);
  assert.deepStrictEqual(subs(core.tkMoveSub(n, 'a', 'y', 99)), ['x', 'z', 'y'], 'Índice alto → al final');
  assert.deepStrictEqual(subs(core.tkMoveSub(n, 'a', 'y', -5)), ['y', 'x', 'z'], 'Índice negativo → al principio');
  const before = JSON.stringify(n);
  const moved = core.tkMoveSub(n, 'a', 'x', 1);
  assert.strictEqual(JSON.stringify(n), before, 'No muta');
  assert.strictEqual(tkT(moved).find((t) => t.id === 'b'), tkT(n).find((t) => t.id === 'b'), 'Las otras tareas no cambian');
  assert.deepStrictEqual(tkIds(moved), ['a', 'b'], 'No reordena tareas');
  const t = tkT(moved)[0];
  assert.deepStrictEqual(t.subtasks.map((s) => s.text), ['Y', 'X', 'Z'], 'Conserva texto');
  // Sin cambios: misma nota.
  assert.strictEqual(core.tkMoveSub(n, 'a', 'y', 1), n, 'Misma posición');
  assert.strictEqual(core.tkMoveSub(n, 'a', 'z', 99), n, 'Ya al final');
  assert.strictEqual(core.tkMoveSub(n, 'a', 'nope', 0), n, 'Subtarea inexistente');
  assert.strictEqual(core.tkMoveSub(n, 'nope', 'x', 0), n, 'Tarea inexistente');
  assert.strictEqual(core.tkMoveSub(n, 'b', 'x', 0), n, 'Subtarea de otra tarea');
  assert.strictEqual(core.tkMoveSub(n, 'a', 'x', 0.5), n, 'Índice no entero');
  assert.strictEqual(core.tkMoveSub(n, 'b', 'w', 3), n, 'Una sola subtarea');
});

caso('Mis tareas: tkSetHour', () => {
  assert.strictEqual(tkT(core.tkSetHour(tkBase(), 't1', 7))[0].hour, 7);
  const n = tkBase();
  for (const [id, h] of [['t1', 24], ['t1', 2.5], ['t1', 13], ['nope', 5]]) assert.strictEqual(core.tkSetHour(n, id, h), n, `${id} ${h}`);
});

caso('Mis tareas: tkAddSub y tkToggleCollapsed', () => {
  const n = tkBase();
  assert.deepStrictEqual(tkT(n)[0].subtasks, [{ id: 's1', text: 'Integral', done: false }, { id: 's2', text: 'Sin sal', done: false }]);
  assert.strictEqual(core.tkAddSub(n, 't1', '  ', 's9'), n, 'Texto vacío');
  assert.strictEqual(core.tkAddSub(n, 'nope', 'x', 's9'), n, 'Tarea inexistente');
  const c = core.tkToggleCollapsed(n, 't1');
  assert.strictEqual(tkT(c)[0].collapsed, true);
  assert.strictEqual(tkT(core.tkToggleCollapsed(c, 't1'))[0].collapsed, false);
  assert.strictEqual(core.tkToggleCollapsed(n, 't2'), n, 'Sin subtareas no cambia');
  assert.strictEqual(core.tkToggleCollapsed(n, 'nope'), n);
  const e = core.tkAddSub(c, 't1', 'Otra', 's3');
  assert.strictEqual(tkT(e)[0].collapsed, false, 'Añadir subtarea expande');
  assert.strictEqual(tkT(e)[0].subtasks.length, 3);
  assert.deepStrictEqual(tkProg(c), tkProg(n), 'Contraer no cambia el progreso');
});

caso('Mis tareas: tkToggle y tkToggleSub', () => {
  const n = core.tkToggle(tkBase(), 't1');
  assert.strictEqual(tkT(n)[0].done, true);
  assert.ok(tkT(n)[0].subtasks.every((s) => !s.done), 'Marcar la tarea no marca sus subtareas');
  assert.strictEqual(tkT(core.tkToggle(n, 't1'))[0].done, false);
  let s = core.tkToggleSub(tkBase(), 't1', 's1');
  s = core.tkToggleSub(s, 't1', 's2');
  assert.ok(tkT(s)[0].subtasks.every((x) => x.done));
  assert.strictEqual(tkT(s)[0].done, false, 'Todas las subtareas no marcan la tarea');
  const b = tkBase();
  assert.strictEqual(core.tkToggle(b, 'nope'), b);
  assert.strictEqual(core.tkToggleSub(b, 't1', 'nope'), b);
  assert.strictEqual(core.tkToggleSub(b, 'nope', 's1'), b);
});

caso('Mis tareas: tkEdit y tkEditSub', () => {
  assert.strictEqual(tkT(core.tkEdit(tkBase(), 't1', '  Pan y leche '))[0].text, 'Pan y leche');
  assert.strictEqual(tkT(core.tkEditSub(tkBase(), 't1', 's1', ' Centeno '))[0].subtasks[0].text, 'Centeno');
  const n = tkBase();
  assert.strictEqual(core.tkEdit(n, 't1', '   '), n, 'Vacío conserva');
  assert.strictEqual(core.tkEditSub(n, 't1', 's1', ''), n, 'Vacío conserva');
  assert.strictEqual(core.tkEdit(n, 't1', 'Comprar pan'), n, 'Igual: misma referencia');
  assert.strictEqual(tkT(core.tkEdit(tkBase(), 't1', 'Nuevo'))[1].text, 'Llamar al banco');
});

caso('Mis tareas: tkDelete y tkDeleteSub', () => {
  assert.deepStrictEqual(tkIds(core.tkDelete(tkBase(), 't1')), ['t2'], 'Se lleva sus subtareas');
  const d = core.tkDeleteSub(tkBase(), 't1', 's1');
  assert.deepStrictEqual(tkT(d)[0].subtasks.map((s) => s.id), ['s2']);
  assert.strictEqual(tkT(d).length, 2);
  const n = tkBase();
  assert.strictEqual(core.tkDelete(n, 'nope'), n);
  assert.strictEqual(core.tkDeleteSub(n, 't1', 'nope'), n);
});

caso('Mis tareas: tkProgress cuenta tareas y subtareas y redondea', () => {
  assert.deepStrictEqual(tkProg(core.tkEmpty()), { done: 0, total: 0, percent: 0 });
  let n = tkAdd(core.tkEmpty(), 'T', 't', tkAt(8));
  n = core.tkAddSub(n, 't', 'a', 'a');
  n = core.tkAddSub(n, 't', 'b', 'b');
  n = core.tkToggleSub(n, 't', 'a');
  assert.deepStrictEqual(tkProg(n), { done: 1, total: 3, percent: 33 });
  let r = tkOf('a', 'b', 'c');
  r = core.tkToggle(core.tkToggle(r, 'a'), 'b');
  assert.strictEqual(tkProg(r).percent, 67);
  assert.deepStrictEqual(tkProg(core.tkToggle(tkOf('a'), 'a')), { done: 1, total: 1, percent: 100 });
});

caso('Mis tareas: listas por día', () => {
  const D2 = '2026-11-13';
  const two = () => core.tkAddSub(tkAdd(tkAdd(core.tkEmpty(), 'Hoy', 'a', tkAt(8)), 'Mañana', 'b', tkAt(8), undefined, D2), 'b', 'Sub', 'sb');
  assert.deepStrictEqual(tkIds(two()), ['a']);
  assert.deepStrictEqual(tkIds(two(), D2), ['b']);
  let n = core.tkToggle(two(), 'b');
  n = core.tkEdit(n, 'b', 'Otra');
  n = core.tkSetHour(n, 'b', 20);
  n = core.tkToggleSub(n, 'b', 'sb');
  const b = tkT(n, D2)[0];
  assert.deepStrictEqual([b.done, b.text, b.hour, b.subtasks[0].done], [true, 'Otra', 20, true], 'Por id en cualquier día');
  const before = two();
  assert.strictEqual(core.tkToggle(before, 'b').days[TKD], before.days[TKD], 'No toca otro día');
  const del = core.tkDelete(two(), 'b');
  assert.deepStrictEqual(tkT(del, D2), []);
  assert.deepStrictEqual(tkIds(del), ['a']);
  const p = core.tkToggle(two(), 'a');
  assert.deepStrictEqual(core.tkProgress(tkT(p)), { done: 1, total: 1, percent: 100 });
  assert.deepStrictEqual(core.tkProgress(tkT(p, D2)), { done: 0, total: 2, percent: 0 });
});

// Paso de los días y traer de ayer (port de roll-over.test.ts y carry-over.test.ts).
const TKH = '2026-11-14';
const TKY = '2026-11-13';
const tkTask = (id, done = false, subtasks = []) => ({ id, hour: 9, text: `texto ${id}`, done, subtasks, collapsed: true, createdAt: '2026-11-13T09:00:00.000Z' });
const tkNote = (days, lastCarryOver) => (lastCarryOver === undefined ? { days } : { days, lastCarryOver });
const tkCounter = () => { let n = 0; return () => `n${++n}`; };

caso('Mis tareas: tkRollOver solo poda, no mueve', () => {
  const R = core.tkRollOver;
  const b1 = tkNote({ [TKY]: [tkTask('p1'), tkTask('h1', true), tkTask('p2')] });
  const a1 = R(b1, TKH);
  assert.strictEqual(a1, b1, 'Ayer conserva hechas y pendientes');
  assert.deepStrictEqual(tkIds(a1, TKY), ['p1', 'h1', 'p2']);
  assert.strictEqual(a1.days[TKH], undefined, 'Hoy queda como estaba');
  const a2 = R(tkNote({ [TKY]: [tkTask('p')], [TKH]: [tkTask('hoy')] }), TKH);
  assert.deepStrictEqual(tkIds(a2, TKH), ['hoy']);
  assert.deepStrictEqual(tkIds(a2, TKY), ['p']);
  const a3 = R(tkNote({ '2026-11-09': [tkTask('a')], '2026-11-11': [tkTask('b')] }), TKH);
  assert.deepStrictEqual(tkIds(a3, '2026-11-09'), ['a'], 'Pendiente de hace 5 días sigue en su día');
  assert.deepStrictEqual(tkIds(a3, '2026-11-11'), ['b']);
  assert.deepStrictEqual(tkT(a3, TKH), []);
  const orig = tkTask('p', false, [{ id: 's1', text: 'a', done: true }, { id: 's2', text: 'b', done: false }]);
  const b4 = tkNote({ [TKY]: [orig], '2026-11-12': [] });
  const a4 = R(b4, TKH);
  assert.strictEqual(a4.days[TKY], b4.days[TKY], 'Tareas y subtareas intactas');
  const b5 = tkNote({ [TKH]: [tkTask('m')] });
  assert.strictEqual(R(b5, TKH), b5, 'Mañana pasa a Hoy sin copiar');
  const fut = [tkTask('futura')];
  assert.strictEqual(R(tkNote({ '2026-11-15': fut, '2026-11-12': [] }), TKH).days['2026-11-15'], fut, 'Futuros intactos');
  assert.deepStrictEqual(Object.keys(R(tkNote({ '2026-11-08': [tkTask('viejo')], '2026-11-09': [tkTask('limite', true)] }), TKH).days), ['2026-11-09'], 'Borra antes de hoy − 5');
  const a8 = R(tkNote({ '2026-11-12': [], [TKY]: [tkTask('p')], [TKH]: [], '2026-11-15': [] }), TKH);
  assert.deepStrictEqual(Object.keys(a8.days).sort(), [TKY, TKH, '2026-11-15'], 'Borra pasados vacíos, no hoy ni mañana vacíos');
  const b9 = tkNote({ [TKY]: [tkTask('h', true), tkTask('p')], [TKH]: [tkTask('hoy')], '2026-11-15': [] });
  assert.strictEqual(R(b9, TKH), b9, 'Sin nada que podar: misma referencia');
  const e = tkNote({});
  assert.strictEqual(R(e, TKH), e);
  const b10 = tkNote({ '2026-11-01': [tkTask('x', true)], '2026-11-12': [tkTask('a'), tkTask('b', true)], [TKY]: [] });
  const once = R(b10, TKH);
  assert.notStrictEqual(once, b10);
  assert.strictEqual(R(once, TKH), once, 'Idempotente');
  const b11 = tkNote({ [TKY]: [tkTask('p'), tkTask('h', true)], '2026-11-01': [tkTask('v')] });
  const snap = JSON.stringify(b11);
  R(b11, TKH);
  assert.strictEqual(JSON.stringify(b11), snap, 'No muta');
  assert.strictEqual(R(tkNote({ '2026-11-01': [tkTask('x')] }, TKH), TKH).lastCarryOver, TKH, 'Conserva lastCarryOver');
});

caso('Mis tareas: tkCarrySource y tkCanCarry', () => {
  assert.strictEqual(core.tkCarrySource(tkNote({ '2026-11-10': [tkTask('a')], '2026-11-12': [tkTask('b')], [TKH]: [tkTask('c')] }), TKH), '2026-11-12');
  assert.strictEqual(core.tkCarrySource(tkNote({ '2026-11-11': [tkTask('a')], [TKY]: [] }), TKH), '2026-11-11', 'Salta días vacíos');
  assert.strictEqual(core.tkCarrySource(tkNote({ [TKH]: [tkTask('a')], '2026-11-15': [tkTask('b')] }), TKH), null, 'Ignora hoy y futuros');
  assert.strictEqual(core.tkCarrySource(tkNote({}), TKH), null);
  assert.strictEqual(core.tkCarrySource(tkNote({ [TKY]: [] }), TKH), null);
  assert.strictEqual(core.tkCanCarry(tkNote({ [TKY]: [tkTask('a')] }), TKH), true);
  assert.strictEqual(core.tkCanCarry(tkNote({ [TKY]: [tkTask('a')], [TKH]: [] }), TKH), true);
  assert.strictEqual(core.tkCanCarry(tkNote({ [TKY]: [tkTask('a')], [TKH]: [tkTask('b')] }), TKH), false, 'Hoy con tareas');
  assert.strictEqual(core.tkCanCarry(tkNote({ [TKY]: [tkTask('a')] }, TKH), TKH), false, 'Ya se usó hoy');
  assert.strictEqual(core.tkCanCarry(tkNote({ [TKY]: [tkTask('a')] }, TKY), TKH), true, 'Usado otro día');
  assert.strictEqual(core.tkCanCarry(tkNote({ [TKY]: [tkTask('a')] }, '2026-11-20'), TKH), true, 'Reloj atrasado');
  assert.strictEqual(core.tkCanCarry(tkNote({}), TKH), false, 'Sin origen');
});

caso('Mis tareas: tkCarry copia sin marcar, con ids nuevos y una vez por día', () => {
  const subs = [{ id: 's1', text: 'a', done: true }, { id: 's2', text: 'b', done: false }];
  const source = () => tkNote({ [TKY]: [tkTask('p'), tkTask('h', true, subs)] });
  const after = core.tkCarry(source(), TKH, tkCounter());
  const copies = tkT(after, TKH);
  assert.deepStrictEqual(copies.map((t) => t.id), ['n1', 'n2']);
  assert.ok(copies.every((t) => !t.done));
  assert.deepStrictEqual(copies[1].subtasks.map((s) => s.id), ['n3', 'n4']);
  assert.ok(copies[1].subtasks.every((s) => !s.done));
  assert.deepStrictEqual([copies[1].hour, copies[1].text, copies[1].collapsed, copies[1].createdAt], [9, 'texto h', true, '2026-11-13T09:00:00.000Z']);
  assert.deepStrictEqual(copies[1].subtasks.map((s) => s.text), ['a', 'b']);
  assert.deepStrictEqual(core.tkProgress(copies), { done: 0, total: 4, percent: 0 });
  const at = (id, hour) => ({ ...tkTask(id), hour });
  const ord = tkT(core.tkCarry(tkNote({ [TKY]: [at('a', 15), at('b', 8), at('c', 12)] }), TKH, tkCounter()), TKH);
  assert.deepStrictEqual(ord.map((t) => t.hour), [15, 8, 12], 'Orden manual, no por hora');
  const all = Object.values(after.days).flatMap((ts) => ts.flatMap((t) => [t.id, ...t.subtasks.map((s) => s.id)]));
  assert.strictEqual(new Set(all).size, all.length, 'Ids únicos en la nota');
  const before = source();
  const snap = JSON.stringify(before);
  const a2 = core.tkCarry(before, TKH, tkCounter());
  assert.strictEqual(a2.days[TKY], before.days[TKY], 'El origen no cambia');
  assert.strictEqual(a2.lastCarryOver, TKH);
  assert.strictEqual(JSON.stringify(before), snap, 'No muta');
  assert.deepStrictEqual(tkT(core.tkCarry(tkNote({ '2026-11-11': [tkTask('a')], [TKY]: [] }), TKH, tkCounter()), TKH).map((t) => t.text), ['texto a'], 'Ayer vacío: trae del último con tareas');
  let c = core.tkCarry(source(), TKH, tkCounter());
  const o = c.days[TKY];
  c = core.tkDelete(core.tkEdit(core.tkToggle(c, 'n1'), 'n2', 'otro'), 'n1');
  assert.strictEqual(c.days[TKY], o, 'Cambiar una copia no toca el original');
  let d = core.tkCarry(source(), TKH, tkCounter());
  d = core.tkDelete(core.tkDelete(d, 'n1'), 'n2');
  assert.deepStrictEqual(tkT(d, TKH), []);
  assert.strictEqual(core.tkCanCarry(d, TKH), false, 'Una vez por día');
  assert.strictEqual(core.tkCarry(d, TKH, tkCounter()), d);
  const hoy = tkNote({ [TKY]: [tkTask('a')], [TKH]: [tkTask('b')] });
  assert.strictEqual(core.tkCarry(hoy, TKH, tkCounter()), hoy);
  const sin = tkNote({});
  assert.strictEqual(core.tkCarry(sin, TKH, tkCounter()), sin);
});

// Carga de pyl-tasks (validador adaptado de validate-stored-data.test.ts: solo la nota; sin ventana ni migraciones).
const tkRawTask = () => ({ id: 't1', hour: 13, text: 'Comprar pan', done: false, createdAt: '2026-11-12T18:40:00.000Z', subtasks: [{ id: 's1', text: 'Integral', done: true }] });
const tkValid = () => ({ v: 1, note: { days: { [TKH]: [tkRawTask()] } }, collapsed: false });
const tkLoadOf = (data) => core.tkLoad(JSON.stringify(data), TKH);
const tkBad = (data, msg) => assert.deepStrictEqual(tkLoadOf(data), { ok: false, note: { days: {} }, collapsed: false }, msg);
const tkPatch = (patch) => { const d = tkValid(); d.note.days[TKH][0] = { ...d.note.days[TKH][0], ...patch }; return d; };

caso('Mis tareas: tkLoad acepta datos válidos y arranca vacía sin clave', () => {
  assert.deepStrictEqual(core.tkLoad(null, TKH), { ok: true, note: { days: {} }, collapsed: false }, 'Sin clave');
  assert.deepStrictEqual(core.tkLoad(undefined, TKH), { ok: true, note: { days: {} }, collapsed: false });
  const d = tkValid();
  assert.deepStrictEqual(tkLoadOf(d), { ok: true, note: d.note, collapsed: false });
  assert.strictEqual(tkLoadOf({ ...tkValid(), collapsed: true }).collapsed, true);
  for (const c of [undefined, 'yes', 1, null]) {
    const r = tkLoadOf({ ...tkValid(), collapsed: c });
    assert.deepStrictEqual([r.ok, r.collapsed], [true, false], 'collapsed raro → false: ' + c);
  }
  const t = tkValid();
  t.note.title = 'viejo';
  assert.deepStrictEqual(tkLoadOf(t).note, { days: { [TKH]: [tkRawTask()] } }, 'Claves sobrantes de la nota se descartan');
  assert.ok(!('lastCarryOver' in tkLoadOf(tkValid()).note), 'lastCarryOver ausente es válido');
  const l = tkValid();
  l.note = { days: {}, lastCarryOver: TKY };
  assert.deepStrictEqual(tkLoadOf(l).note, { days: {}, lastCarryOver: TKY });
  const e = tkValid();
  e.note = { days: { [TKY]: [] } };
  assert.strictEqual(tkLoadOf(e).ok, true, 'Día vacío es válido');
  for (const c of [true, false]) assert.strictEqual(tkLoadOf(tkPatch({ collapsed: c })).ok, true, 'Tarea con collapsed ' + c);
  const o = [{ ...tkRawTask(), id: 'a', hour: 15 }, { ...tkRawTask(), id: 'b', hour: 8 }];
  const ord = tkValid();
  ord.note.days[TKH] = o;
  assert.deepStrictEqual(tkLoadOf(ord).note.days[TKH].map((x) => x.id), ['a', 'b'], 'Respeta el orden guardado');
});

caso('Mis tareas: tkLoad rechaza datos rotos y devuelve la nota vacía', () => {
  for (const raw of ['{', 'hola', '', 'null', '[]', '"x"', '{}']) {
    assert.deepStrictEqual(core.tkLoad(raw, TKH), { ok: false, note: { days: {} }, collapsed: false }, 'Crudo: ' + JSON.stringify(raw));
  }
  tkBad({ ...tkValid(), v: 2 }, 'v distinta');
  tkBad({ ...tkValid(), v: '1' }, 'v como texto');
  const sinV = tkValid();
  delete sinV.v;
  tkBad(sinV, 'sin v');
  const sinNota = tkValid();
  delete sinNota.note;
  tkBad(sinNota, 'sin nota');
  for (const [name, note] of [['days ausente', {}], ['days array', { days: [] }], ['clave de día mal formada', { days: { '14/11/2026': [] } }], ['lista no array', { days: { [TKH]: null } }]]) {
    tkBad({ ...tkValid(), note }, name);
  }
  for (const value of [null, 20261113, '13/11/2026', '']) {
    tkBad({ ...tkValid(), note: { days: {}, lastCarryOver: value } }, 'lastCarryOver ' + JSON.stringify(value));
  }
  for (const [name, patch] of [
    ['hora 24', { hour: 24 }], ['hora negativa', { hour: -1 }], ['hora decimal', { hour: 9.5 }], ['hora texto', { hour: '13' }],
    ['sin texto', { text: '   ' }], ['texto no string', { text: 5 }], ['done no booleano', { done: 'yes' }], ['id no texto', { id: 7 }],
    ['sin createdAt', { createdAt: undefined }], ['subtareas no array', { subtasks: null }],
    ['subtarea vacía', { subtasks: [{ id: 's', text: '', done: false }] }], ['collapsed raro', { collapsed: 'yes' }],
  ]) tkBad(tkPatch(patch), name);
});

let fallos = 0;
for (const [nombre, fn] of casos) {
  try { fn(); console.log('OK   ' + nombre); } catch (e) { fallos++; console.error('FALLO ' + nombre + '\n  ' + e.message); }
}
if (fallos) { console.error(`${fallos} prueba(s) fallaron`); process.exit(1); }
console.log(`OK core: ${casos.length} pruebas`);
