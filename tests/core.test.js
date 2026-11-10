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
  assert.strictEqual(claves, 'ABO_STEPS,ADS,AD_STRATEGIES,BASE_FORMULA,BASE_HEAD,BASE_METRICS,BY_PROVIDER,COST_DEFAULTS,COUNTRIES,CPA_ZONES,CTR_UNIQUE_WARN,DK_DEFAULTS,DK_OPEN_CAT,DK_TOT_TOLERANCE,EXCLUDED,F,FAIL_HEAD,FILTERS,FLOW,GENERIC_CPA,GOALS,HARD_METRICS,HEADERS,LADDER_BLOCKS,LANDING,LEVELS,LIMITS,MARGIN,MISTAKES,MSP,NS_TEST,PYRAMID,RESEARCH,SATURATION,SCALE_ACTIONS,SCALE_CASES,SCALE_DAYS,SCALE_FREE,SCALE_GUARDS,SCALE_MAP,SCALE_METHODS,SCALE_PRACTICE,SCALE_RULES,SCALING_PARTS,SCORE_LEVELS,SCORE_MAX,STAGES,STATUS,STEPS,STRATEGIES,SURF_HEAD,SURF_STEPS,TESTING_PARTS,TEST_ACTIONS,TEST_CASES,TEST_CHAIN,TEST_CUTS,TEST_HEAD,TEST_PRACTICE,TEST_RULES,TEST_STEPS,TOOLS,URL_BASE,VALUE,VDO,WINNER,WINNER_GROUPS,actions,addDays,adsView,ageMonths,aggregate,budgetSteps,buildDropi,buildExport,buildMeta,buildMetrics,buildTemplate,campaignName,cascade,cellVal,classify,competition,copText,count,cpaZones,cycles,defaultSlug,dkN,dkPlaceholders,dkPrompt,dkValues,evaluate,fill,fmt,fullTitle,funnel,isDropi,isMetrics,key,kpis,list,marginLevel,matchProduct,mspLevel,nf,norm,num,offerTexts,parseCSV,periodLabel,practiceBest,practiceDecide,practiceNew,practiceNext,practiceOrder,practiceShow,practiceView,previous,previousRange,priceFor,prices,products,progress,projectedVsPrevious,projection,quickAdd,quickCheck,quickPrice,roundLike,rowCells,scaleCheck,scaleFree,scaleGuard,scaleLadder,scaleMethod,scalePracticeBest,scalePracticeDecide,scalePracticeNew,scalePracticeNext,scalePracticeOrder,scalePracticeShow,scalePracticeView,scaleVerdict,scaleZone,scalingPart,score,scoreLevel,scoreParts,short,simulate,slugify,stage,stageRange,stats,story,strategy,testBar,testCheck,testDay,testFree,testRange,testVerdict,testingPart,toISO,todayISO,unitBase,unitCost,unitEconomics,unsaved,verdict,view,weeks,winnerCheck,words,writeRegistro');
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
  assert.ok(txt(vd(20000, 2, 0)).startsWith('Apágalo, a nadie le interesa'));
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
});

caso('Escalado: los 8 casos del banco dan las respuestas de la spec', () => {
  const esperado = {
    c1: ['off'], c2: ['off'], c3: ['watch', 'off'], c4: ['go', 'watch', 'off'],
    c5: ['go', 'go', 'spend'], c6: ['watch', 'watch', 'watch'], c7: ['go', 'watch', 'watch'], c8: ['go', 'watch', 'spend'],
  };
  assert.strictEqual(core.TEST_CASES.length, 8);
  for (const c of core.TEST_CASES) {
    const res = c.at.map((p) => core.testVerdict({ ...p, tope: core.TEST_PRACTICE.tope }));
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
});

caso('Escalado: 6 pasos en orden, tarjetas de corte y ramas que testVerdict devuelve', () => {
  const S = core.TEST_STEPS, txt = (a) => a.map((s) => (typeof s === 'string' ? s : s.b)).join('');
  assert.deepStrictEqual(S.map((s) => s.t), ['Arranque', 'Corte 1 · 20.000', 'Corte 2 · 30.000', 'Corte 3 · 40.000', 'Si se apagó: la cadena', 'Practica']);
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
  // Semáforo y marca de Regla propia.
  assert.deepStrictEqual(core.TEST_CUTS.flatMap((c) => c.branches).filter((b) => b.own).map((b) => b.id), ['c3-own']);
  assert.deepStrictEqual(core.TEST_CUTS[1].branches.map((b) => b.group), ['Sin ventas', 'Sin ventas', 'Sin ventas', 'Con venta', 'Con venta', 'Con venta']);
  // Cadena: CPM → CPC → CPPI → CPA, "No se mira el CTR" y las 3 lecturas con el CPM de HARD_METRICS.
  assert.deepStrictEqual(core.TEST_CHAIN.flow, ['CPM', 'CPC', 'CPPI', 'CPA']);
  assert.ok(txt(core.TEST_CHAIN.ctr).startsWith('No se mira el CTR'));
  assert.strictEqual(core.TEST_CHAIN.reads.length, 3);
  assert.ok(txt(core.TEST_CHAIN.reads[0].when).includes('$ 20.000') && txt(core.TEST_CHAIN.reads[0].when).includes('$ 6.000'));
  assert.ok(txt(core.TEST_CHAIN.reads[2].fix).includes('la página, la oferta o el formulario'));
  assert.ok(txt(core.TEST_CHAIN.note).includes('No apago antes de cruzar un corte'));
  assert.ok(core.TEST_HEAD.h === 'Fase de testeo' && core.TEST_HEAD.sub.includes('20.000, 30.000 y 40.000'));
});

caso('Testeo: partes en orden, Lectura real deshabilitada con su tarjeta Pronto y frase del paso 4', () => {
  assert.deepStrictEqual(core.TESTING_PARTS.map((p) => p.k), ['real', 'test', 'sim']);
  assert.ok(core.TESTING_PARTS[2].t.includes('revisar') && core.TESTING_PARTS[2].disabled, 'Simulador deshabilitado y con aviso de revisar');
  assert.strictEqual(core.testingPart('sim').k, 'test', 'Una parte deshabilitada cae en test');
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
  assert.ok(frase(r).startsWith('Apágalo, a nadie le interesa'));
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
  assert.deepStrictEqual([r.verdict.action, r.verdict.branch], ['watch', 'c3-own']);
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
  // Orden al azar: siempre los 8 casos, cada uno una vez; con otro azar cambia.
  const o1 = core.practiceOrder(), o2 = core.practiceOrder(() => 0);
  assert.deepStrictEqual([...o1].sort(), [...ids].sort());
  assert.deepStrictEqual([...o2].sort(), [...ids].sort());
  assert.notDeepStrictEqual(o2, ids);
  // Una ronda acertando todo: 19 decisiones (1+1+2+3+3+3+3+3), 100 %.
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
  assert.deepStrictEqual([g.r.hits, g.r.total, core.practiceBest(null, g.r)], [19, 19, 100]);
  // Cada caso termina en Apagar / Dejar gastar o en su último corte; los demás siguen al siguiente corte.
  const porCaso = {};
  for (const [n, cut, correcta] of g.decisiones) (porCaso[n] ??= []).push([cut, correcta]);
  assert.deepStrictEqual(porCaso['Conjunto 1'], [[1, 'off']]);
  assert.deepStrictEqual(porCaso['Conjunto 3'], [[1, 'watch'], [2, 'off']]);
  assert.deepStrictEqual(porCaso['Conjunto 4'], [[1, 'go'], [2, 'watch'], [3, 'off']]);
  assert.deepStrictEqual(porCaso['Conjunto 5'], [[1, 'go'], [2, 'go'], [3, 'spend']]);
  assert.deepStrictEqual(porCaso['Conjunto 6'], [[1, 'watch'], [2, 'watch'], [3, 'watch']]);
  // Una decisión equivocada cuenta como fallo y guarda la correcta.
  g = jugar(ids, (v, i) => (i === 0 ? 'go' : v.verdict.action));
  assert.deepStrictEqual([g.r.hits, g.r.total, core.practiceBest(null, g.r)], [18, 19, 95]);
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
  assert.deepStrictEqual(core.practiceView(g.r).score, { hits: 18, total: 19, pct: 95 });
  assert.strictEqual(core.practiceBest(100, g.r), 100);
  assert.strictEqual(core.practiceBest(50, g.r), 95);
  assert.strictEqual(core.practiceBest(null, core.practiceNew(ids)), null);
  assert.strictEqual(core.practiceView(core.practiceNew(ids)).lastCase, false);
});

caso('Prompt DropKiller: formulario vacío usa todos los valores por defecto', () => {
  const r = core.dkValues({ recDias: 7, meses: 3 });
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.errors, {});
  const t = core.dkPrompt(r.values);
  for (const x of ['mínimo de 100 y máximo de 2.000', 'entre 10 y 100 ventas en los últimos 7 días', 'Creados de 3 meses para acá',
    'mínimo 80 y máximo 100 unidades', 'Máximo 3 proveedores', 'entre 0 y 5 veces', 'Ventas (Totales/7 días)',
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
});

caso('Prompt DropKiller: dkN y placeholders', () => {
  assert.strictEqual(core.dkN(2000), '2.000');
  assert.strictEqual(core.dkN(100), '100');
  assert.strictEqual(core.dkN(1234567), '1.234.567');
  const p7 = core.dkPlaceholders(7), p30 = core.dkPlaceholders(30);
  assert.deepStrictEqual([p7.totMin, p7.totMax, p7.recMin, p7.recMax, p7.stockMin, p7.stockMax, p7.provMax, p7.restMin, p7.restMax],
    ['100', '2.000', '10', '100', '80', '100', '3', '0', '5']);
  assert.deepStrictEqual([p30.recMin, p30.recMax], ['100', '500']);
  assert.strictEqual(p7.categoria, 'Todos (Salud, Belleza y bienestar primero)');
  assert.strictEqual(core.DK_TOT_TOLERANCE, 3000);
});

let fallos = 0;
for (const [nombre, fn] of casos) {
  try { fn(); console.log('OK   ' + nombre); } catch (e) { fallos++; console.error('FALLO ' + nombre + '\n  ' + e.message); }
}
if (fallos) { console.error(`${fallos} prueba(s) fallaron`); process.exit(1); }
console.log(`OK core: ${casos.length} pruebas`);
