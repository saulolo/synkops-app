// Entrada para Node (pruebas): carga el núcleo en orden y lo exporta en un solo objeto plano,
// igual al antiguo ENGINE. El navegador no usa este archivo: index.html carga cada script.
// El orden es el de los <script> de core en index.html.
[
  'shared/core/parse', 'shared/core/dates', 'shared/core/format',
  'modules/pnl/core/dropi', 'modules/pnl/core/meta', 'modules/pnl/core/pnl', 'modules/pnl/core/diagnostics',
  'modules/pnl/core/insights', 'modules/pnl/core/excel',
  'modules/search/core/search', 'modules/landing/core/landing', 'modules/ads/core/ads', 'modules/quick/core/quick', 'modules/dkprompt/core/dkprompt', 'modules/adprompt/core/adprompt',
  'modules/metrics/core/metrics', 'modules/testing/core/testing', 'modules/testing/core/simulator', 'modules/scaling/core/scaling', 'modules/cheat/core/cheat',
].forEach((f) => require(`./${f}.js`));

module.exports = Object.assign({}, ...Object.values(globalThis.PYL.core));
