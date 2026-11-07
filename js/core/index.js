// Entrada para Node (pruebas): carga el núcleo en orden y lo exporta en un solo objeto plano,
// igual al antiguo ENGINE. El navegador no usa este archivo: index.html carga cada script.
['parse', 'dates', 'format', 'dropi', 'meta', 'pnl', 'diagnostics', 'insights', 'excel', 'search', 'landing', 'ads', 'quick'].forEach((f) => require(`./${f}.js`));

module.exports = Object.assign({}, ...Object.values(globalThis.PYL.core));
