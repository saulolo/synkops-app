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
  assert.strictEqual(claves, 'ABO_STEPS,ADS,AD_STRATEGIES,BASE_FORMULA,BASE_HEAD,BASE_METRICS,BY_PROVIDER,COST_DEFAULTS,COUNTRIES,CTR_UNIQUE_WARN,EXCLUDED,F,FAIL_HEAD,FILTERS,FLOW,GENERIC_CPA,GOALS,HARD_METRICS,HEADERS,LANDING,LEVELS,LIMITS,MARGIN,MISTAKES,MSP,NS_TEST,PYRAMID,RESEARCH,SATURATION,SCORE_LEVELS,SCORE_MAX,STAGES,STATUS,STEPS,STRATEGIES,TOOLS,URL_BASE,VALUE,VDO,WINNER,WINNER_GROUPS,actions,addDays,adsView,ageMonths,aggregate,budgetSteps,buildDropi,buildExport,buildMeta,buildMetrics,buildTemplate,campaignName,cascade,cellVal,classify,competition,copText,count,cycles,defaultSlug,evaluate,fill,fmt,fullTitle,funnel,isDropi,isMetrics,key,kpis,list,marginLevel,matchProduct,mspLevel,nf,norm,num,offerTexts,parseCSV,periodLabel,previous,previousRange,priceFor,prices,products,progress,projectedVsPrevious,projection,quickAdd,quickCheck,quickPrice,roundLike,rowCells,score,scoreLevel,scoreParts,short,simulate,slugify,stage,stageRange,stats,story,strategy,toISO,todayISO,unitBase,unitCost,unitEconomics,unsaved,verdict,view,weeks,winnerCheck,words,writeRegistro');
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

let fallos = 0;
for (const [nombre, fn] of casos) {
  try { fn(); console.log('OK   ' + nombre); } catch (e) { fallos++; console.error('FALLO ' + nombre + '\n  ' + e.message); }
}
if (fallos) { console.error(`${fallos} prueba(s) fallaron`); process.exit(1); }
console.log(`OK core: ${casos.length} pruebas`);
