// Prompt buscar anuncios (pestaña Desarrollo): arma el texto para buscar en el MCP de DropKiller
// los anuncios que ya corren de un producto. Valida el formulario y rellena lo vacío con los valores por defecto. Sin DOM.
// Los nombres llevan el prefijo ap/AP_ para no chocar al aplanar js/index.js.
(() => {
  const core = globalThis.PYL.core;

  const AP_DEFAULTS = { dias: 7, visto: 7, pais: 'Colombia' };

  const ERR_NAME = 'Escribe el nombre del producto', ERR_DAYS = 'Escribe un número entero de días (mínimo 1)';

  const clean = (v) => String(v == null ? '' : v).trim();
  const daysText = (n) => `${n} ${n === 1 ? 'día' : 'días'}`;

  // Textos de los placeholders (= valores por defecto).
  const apPlaceholders = () => ({
    name: 'Nombre del producto',
    dias: `Mínimo ${daysText(AP_DEFAULTS.dias)}`,
    visto: `Últimos ${daysText(AP_DEFAULTS.visto)}`,
    pais: AP_DEFAULTS.pais,
  });

  // form = textos del formulario ('' = vacío → defecto, salvo el nombre, que es obligatorio).
  // Devuelve { ok, values, errors }; errors = { campo: mensaje }.
  const apValues = (form) => {
    const f = form || {}, values = {}, errors = {};
    values.name = clean(f.name);
    if (!values.name) errors.name = ERR_NAME;
    for (const k of ['dias', 'visto']) {
      const t = clean(f[k]);
      if (!t) { values[k] = AP_DEFAULTS[k]; continue; }
      if (/^\d+$/.test(t) && Number(t) >= 1) values[k] = Number(t); else errors[k] = ERR_DAYS;
    }
    values.pais = clean(f.pais) || AP_DEFAULTS.pais;
    return { ok: Object.keys(errors).length === 0, values, errors };
  };

  // Nombre y foto del candidato abierto en Buscar producto (draft). Sin nombre no hay nada que importar: null.
  const apImport = (draft) => {
    const d = draft || {}, name = clean(d.name);
    return name ? { name, photo: d.photo || '' } : null;
  };

  // Plantilla del prompt. values sale de apValues. "buscar USA, España, LATAM" va fijo.
  const apPrompt = (v) => `Ejecuta el MCP de DropKiller para el producto: ${v.name}. Usa la imagen adjunta como referencia visual.
Filtros obligatorios:

Días activos: Mínimo ${daysText(v.dias)} (indica rentabilidad).

Última vez visto: Últimos ${daysText(v.visto)} (anuncio vivo).

País: EXCLUIR ${v.pais} (buscar USA, España, LATAM).

Entregable:

Lista los 3 mejores anuncios encontrados.

Resume el ángulo de venta exacto de cada uno (Hook visual, Dolor atacado y Oferta).

Indica si dirigen a Landing Page o WhatsApp.`;

  core.adprompt = { AP_DEFAULTS, apPlaceholders, apValues, apImport, apPrompt };
})();
