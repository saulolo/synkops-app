// Formato de cifras en es-CO. fmt() devuelve '—' para valores nulos o no finitos.
(() => {
  const core = globalThis.PYL.core;

  const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const nf = (v, o) => v.toLocaleString('es-CO', o);
  const F = {
    cop: (v) => COP.format(v),
    pct: (v) => nf(v * 100, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%',
    x: (v) => nf(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'x',
  };
  const fmt = (v, k) => (v == null || !isFinite(v) ? '—' : F[k](v));

  // Montos compactos para etiquetas: "$1,26 M", "$745 mil".
  const short = (v) => {
    const a = Math.abs(v), s = v < 0 ? '−' : '';
    if (a >= 1e6) return s + '$' + nf(a / 1e6, { maximumFractionDigits: 2 }) + ' M';
    if (a >= 1e3) return s + '$' + nf(Math.round(a / 1e3)) + ' mil';
    return s + '$' + nf(Math.round(a));
  };

  core.format = { nf, F, fmt, short };
})();
