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
  assert.strictEqual(claves, 'ABO_STEPS,ADS,AD_STRATEGIES,BY_PROVIDER,COST_DEFAULTS,COUNTRIES,EXCLUDED,F,FAIL_HEAD,FILTERS,FLOW,GENERIC_CPA,GOALS,HARD_METRICS,HEADERS,LANDING,LEVELS,LIMITS,MARGIN,MISTAKES,MSP,PYRAMID,RESEARCH,SATURATION,SCORE_LEVELS,SCORE_MAX,STAGES,STATUS,STEPS,STRATEGIES,TOOLS,URL_BASE,VALUE,VDO,WINNER,WINNER_GROUPS,actions,addDays,adsView,ageMonths,aggregate,buildDropi,buildExport,buildMeta,buildMetrics,buildTemplate,campaignName,cascade,cellVal,classify,competition,copText,count,cycles,defaultSlug,evaluate,fill,fmt,fullTitle,funnel,isDropi,isMetrics,key,kpis,list,marginLevel,matchProduct,mspLevel,nf,norm,num,offerTexts,parseCSV,periodLabel,previous,previousRange,priceFor,prices,products,progress,projectedVsPrevious,projection,quickAdd,quickCheck,quickPrice,roundLike,rowCells,score,scoreLevel,scoreParts,short,simulate,slugify,stage,stageRange,stats,story,strategy,toISO,todayISO,unitBase,unitCost,unitEconomics,unsaved,verdict,view,weeks,winnerCheck,words,writeRegistro');
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

let fallos = 0;
for (const [nombre, fn] of casos) {
  try { fn(); console.log('OK   ' + nombre); } catch (e) { fallos++; console.error('FALLO ' + nombre + '\n  ' + e.message); }
}
if (fallos) { console.error(`${fallos} prueba(s) fallaron`); process.exit(1); }
console.log(`OK core: ${casos.length} pruebas`);
