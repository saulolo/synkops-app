// Hard Metrics: estado (app.state.hardMetrics) y conexión con la UI. No guarda nada: es una guía de consulta.
// Ojo: app.state.metrics ya es de otra cosa (las campañas de Meta del tablero P&L), por eso este estado se llama hardMetrics.
// Escucha:
//   (El diagrama es fijo: una referencia que no cambia con el producto ni con datos reales.)
//   click en la tarjeta  alterna expandido / contraído (solo cambia el ancho y la separación; no cambia datos)
//   nav:vista        { v }                                    al abrir Hard Metrics dibuja las flechas; la primera vez, animadas
//   resize                                                    vuelve a medir y dibujar las flechas
(() => {
  const PYL = globalThis.PYL;
  const { $ } = PYL.ui.dom;
  const C = PYL.core.metrics, U = PYL.ui.metrics;

  const S = (PYL.app.state.hardMetrics = {
    sel: null,         // métrica elegida ('ctr' | 'cpc' | 'cpm' | 'cppi' | 'cpa'); null = ninguna (no se guarda)
    expanded: false,   // el diagrama está expandido (más ancho que las demás tarjetas); no se guarda
    played: false,     // la animación de entrada ya corrió: no se repite al volver a la pestaña
  });

  const PLAY_MS = 1900; // lo que dura la entrada (llave + 5 filas); pasado eso se quita la clase
  let playT = 0;

  const nodes = () => ({ map: $('#hm-map') });
  const visible = (map) => !!map && map.offsetWidth > 0;

  function drawArrows() {
    const { map } = nodes();
    if (!visible(map)) return;
    // La primera vez que se dibujan (con la pestaña a la vista) se animan; después, quietas.
    const first = !S.played;
    if (first) map.classList.add('hm-play');
    if (U.drawArrows(map) && first) {
      S.played = true;
      clearTimeout(playT);
      playT = setTimeout(() => map.classList.remove('hm-play'), PLAY_MS);
    } else if (first) {
      map.classList.remove('hm-play'); // sin con qué medir (celular): todavía no cuenta como vista
    }
  }

  function setExpanded(v) {
    S.expanded = v;
    const { map } = nodes();
    if (map) U.expand(map, v);
    requestAnimationFrame(drawArrows); // al cambiar de ancho hay que medir las flechas otra vez
  }

  function pick(k) {
    S.sel = k;
    const { map } = nodes();
    if (map) U.mark(map, S.sel);
  }

  function render() {
    const { map } = nodes();
    if (map) {
      U.map(map, C.HARD_METRICS, { pick, toggle: () => setExpanded(!S.expanded) });
      U.expand(map, S.expanded);
      U.mark(map, S.sel);
      drawArrows();
    }
  }

  document.addEventListener('nav:vista', (e) => { if (e.detail.v === 'metricas') drawArrows(); });

  let raf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(drawArrows);
  });
  // Las tipografías de Google cargan después: al llegar cambian los anchos y las flechas deben medirse de nuevo.
  document.fonts?.ready.then(() => requestAnimationFrame(drawArrows));

  render();

  // Un clic en un espacio vacío de la tarjeta también expande o contrae (los botones, avisos y la "i" siguen con lo suyo).
  const mapNode = nodes().map;
  if (mapNode) {
    mapNode.addEventListener('click', (e) => {
      if (e.target.closest('button, a, [tabindex]')) return;
      setExpanded(!S.expanded);
    });
  }
})();
