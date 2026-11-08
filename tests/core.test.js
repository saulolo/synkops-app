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
  assert.strictEqual(claves, 'ABO_STEPS,ADS,AD_STRATEGIES,BASE_FORMULA,BASE_HEAD,BASE_METRICS,BY_PROVIDER,COST_DEFAULTS,COUNTRIES,CPA_ZONES,CTR_UNIQUE_WARN,EXCLUDED,F,FAIL_HEAD,FILTERS,FLOW,GENERIC_CPA,GOALS,HARD_METRICS,HEADERS,LANDING,LEVELS,LIMITS,MARGIN,MISTAKES,MSP,NS_TEST,PYRAMID,RESEARCH,SATURATION,SCALING_PARTS,SCORE_LEVELS,SCORE_MAX,STAGES,STATUS,STEPS,STRATEGIES,TEST_ACTIONS,TEST_CASES,TEST_CHAIN,TEST_CUTS,TEST_HEAD,TEST_PRACTICE,TEST_RULES,TEST_STEPS,TOOLS,URL_BASE,VALUE,VDO,WINNER,WINNER_GROUPS,actions,addDays,adsView,ageMonths,aggregate,budgetSteps,buildDropi,buildExport,buildMeta,buildMetrics,buildTemplate,campaignName,cascade,cellVal,classify,competition,copText,count,cpaZones,cycles,defaultSlug,evaluate,fill,fmt,fullTitle,funnel,isDropi,isMetrics,key,kpis,list,marginLevel,matchProduct,mspLevel,nf,norm,num,offerTexts,parseCSV,periodLabel,practiceBest,practiceDecide,practiceNew,practiceNext,practiceOrder,practiceShow,practiceView,previous,previousRange,priceFor,prices,products,progress,projectedVsPrevious,projection,quickAdd,quickCheck,quickPrice,roundLike,rowCells,scalingPart,score,scoreLevel,scoreParts,short,simulate,slugify,stage,stageRange,stats,story,strategy,testBar,testCheck,testDay,testFree,testRange,testVerdict,toISO,todayISO,unitBase,unitCost,unitEconomics,unsaved,verdict,view,weeks,winnerCheck,words,writeRegistro');
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

let fallos = 0;
for (const [nombre, fn] of casos) {
  try { fn(); console.log('OK   ' + nombre); } catch (e) { fallos++; console.error('FALLO ' + nombre + '\n  ' + e.message); }
}
if (fallos) { console.error(`${fallos} prueba(s) fallaron`); process.exit(1); }
console.log(`OK core: ${casos.length} pruebas`);
