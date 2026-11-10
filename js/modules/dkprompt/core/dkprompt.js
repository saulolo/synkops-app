// Generador de prompt para el MCP de DropKiller (método VDO): arma el texto con los filtros del formulario.
// Valida los números y rellena con los valores por defecto lo que quede vacío. Sin DOM.
// Los nombres llevan el prefijo dk/DK_ para no chocar al aplanar js/index.js.
(() => {
  const core = globalThis.PYL.core;

  const DK_DEFAULTS = {
    totMin: 100, totMax: 2000,
    recDias: 7,
    rec: { 7: { min: 10, max: 100 }, 30: { min: 100, max: 500 } },
    meses: 3, // 3 | 6
    stockMin: 80, stockMax: 100,
    provMax: 3,
    restMin: 0, restMax: 5,
    categoria: 'Todos (Salud, Belleza y bienestar primero)',
  };
  const DK_OPEN_CAT = 'TODAS (puede ser cualquier nicho; prioriza Salud, Belleza y bienestar), PERO cumple el perfil del punto 8';
  // Lo máximo de ventas totales que tolero (aviso en el formulario; el filtro por defecto sigue en DK_DEFAULTS.totMax).
  const DK_TOT_TOLERANCE = 3000;

  const ERR_INT = 'Escribe un número entero', ERR_NEG = 'No puede ser negativo', ERR_PAIR = 'El mínimo es mayor que el máximo';

  // Miles es-CO a mano: toLocaleString('es-CO') deja "2000" en números de 4 cifras.
  const dkN = (n) => String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const days = (d) => (Number(d) === 30 ? 30 : 7);
  const monthsOf = (m) => (Number(m) === 6 ? 6 : 3);
  const clean = (v) => String(v == null ? '' : v).trim();

  // Defectos de todos los campos numéricos según la ventana de ventas recientes.
  const defaults = (recDias) => {
    const D = DK_DEFAULTS, r = D.rec[days(recDias)];
    return { totMin: D.totMin, totMax: D.totMax, recMin: r.min, recMax: r.max, stockMin: D.stockMin, stockMax: D.stockMax,
      provMax: D.provMax, restMin: D.restMin, restMax: D.restMax };
  };

  // Textos de los placeholders (= valores por defecto) para la ventana elegida.
  const dkPlaceholders = (recDias) => {
    const out = {};
    for (const [k, v] of Object.entries(defaults(recDias))) out[k] = dkN(v);
    out.categoria = DK_DEFAULTS.categoria;
    return out;
  };

  // Un número escrito: "" = vacío; admite "2.000" (miles es-CO). Devuelve { n } o { err }.
  const parse = (text) => {
    const t = clean(text);
    if (/^\d+$/.test(t)) return { n: Number(t) };
    if (/^\d{1,3}(\.\d{3})+$/.test(t)) return { n: Number(t.replace(/\./g, '')) };
    if (/^-\d+([.,]\d+)?$/.test(t)) return { err: ERR_NEG };
    return { err: ERR_INT };
  };

  // form = textos del formulario ('' = vacío → defecto) + recDias (7|30) y meses (3|6).
  // Devuelve { ok, values, errors }; errors = { campo: mensaje } (un par inválido marca los dos campos).
  const dkValues = (form) => {
    const f = form || {}, dias = days(f.recDias), def = defaults(dias);
    const values = {}, errors = {};
    for (const k of Object.keys(def)) {
      const t = clean(f[k]);
      if (!t) { values[k] = def[k]; continue; }
      const r = parse(t);
      if (r.err) errors[k] = r.err; else values[k] = r.n;
    }
    for (const [lo, hi] of [['totMin', 'totMax'], ['recMin', 'recMax'], ['stockMin', 'stockMax'], ['restMin', 'restMax']]) {
      if (!errors[lo] && !errors[hi] && values[lo] > values[hi]) errors[lo] = errors[hi] = ERR_PAIR;
    }
    const cat = clean(f.categoria);
    values.categoria = !cat || cat === DK_DEFAULTS.categoria ? DK_OPEN_CAT : cat;
    values.recDias = dias;
    values.meses = monthsOf(f.meses);
    return { ok: Object.keys(errors).length === 0, values, errors };
  };

  // Plantilla del prompt (SPEC 09). values sale de dkValues.
  const dkPrompt = (v) => `Ejecuta una búsqueda en el catálogo de Dropi Colombia utilizando el MCP de DropKiller. Necesito encontrar diamantes en bruto bajo el método VDO.
Aplica estrictamente esta lógica de filtrado en tu búsqueda:

1. Ventas Totales: Rango mínimo de ${dkN(v.totMin)} y máximo de ${dkN(v.totMax)} ventas. (Importante: Suma las ventas totales de los proveedores que lo tengan para asegurar que el global no pase de ${dkN(v.totMax)}).
2. Tracción reciente: Debe tener movimiento actual (entre ${dkN(v.recMin)} y ${dkN(v.recMax)} ventas en los últimos ${v.recDias} días).
3. Fecha de creación: Creados de ${v.meses} meses para acá.
4. Stock: Buen inventario (mínimo ${dkN(v.stockMin)} y máximo ${dkN(v.stockMax)} unidades).
5. Proveedores: Máximo ${dkN(v.provMax)} proveedores en todo Dropi Colombia (ideal para mi estrategia de exclusividad).
6. Veces restockeado: entre ${dkN(v.restMin)} y ${dkN(v.restMax)} veces.
7. Categoría: ${v.categoria}.
8. Perfil Psicológico del Producto (Innegociable): el producto debe resolver un "Dolor Absoluto/Urgente" o tener un "Efecto WOW extremo" (alta percepción de valor). Excluye categóricamente commodities, accesorios genéricos de celular, ropa básica o productos que el cliente pueda comprar fácilmente en un supermercado local.

Notas para el MCP: usa search_products (CO, DROPI, ACTIVE). No hay filtro directo para el máximo de ventas totales, la cantidad de proveedores ni las veces restockeado: agrupa el mismo producto entre proveedores (familia), suma las ventas totales, cuenta proveedores y detecta restocks en get_product_history (subidas de stock entre días). Descarta productos con suspectedSalesAdjustment: true.

FORMATO DE SALIDA:
Tráeme los 5 mejores resultados que cumplan ESTRICTAMENTE esto.
(Regla del Sistema: Si la base de datos solo tiene 2 o 3 productos que cumplan el 100% de estos filtros, entrégame solo esos. NO relajes los filtros ni inventes datos solo para llegar a 5).
Devuélveme el Scorecard Ejecutivo en formato de tabla con: Producto, Precio, Stock, Ventas (Totales/${v.recDias} días), Cantidad de Proveedores, Proveedor, Nicho, Competencia en Dropi y link del producto en Dropi.`;

  core.dkprompt = { DK_DEFAULTS, DK_OPEN_CAT, DK_TOT_TOLERANCE, dkN, dkPlaceholders, dkValues, dkPrompt };
})();
