// Prueba de humo: abre index.html en jsdom, revisa que cada capa publique lo esperado,
// recorre las pestañas y vigila la consola. jsdom no está en el repo:
//   npm i jsdom@26 en una carpeta fuera del repo y
//   NODE_PATH=<esa carpeta>/node_modules node tests/smoke.test.js
// Con --claves imprime las claves de PYL.* (para regenerar BASE_KEYS).
'use strict';
const path = require('path');
const assert = require('assert');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');

// Claves que publica cada capa de PYL. Línea base tomada antes de reorganizar carpetas (SPEC 02).
const BASE_KEYS = require('./fixtures/claves-pyl.json');

// El CDN de ExcelJS no se carga: en jsdom no hay red y las pruebas no leen .xlsx.
class Loader extends ResourceLoader {
  fetch(url, opts) { return /^https?:/.test(url) ? Promise.resolve(Buffer.from('')) : super.fetch(url, opts); }
}

const errores = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('error', (...a) => errores.push(a.map(String).join(' ')));
virtualConsole.on('jsdomError', (e) => errores.push(String((e && e.message) || e)));

// jsdom no implementa window.scrollTo: ese aviso es esperado (CLAUDE.md).
const esperado = (msg) => /scrollTo/.test(msg);

JSDOM.fromFile(path.join(__dirname, '..', 'index.html'), {
  runScripts: 'dangerously', resources: new Loader(), pretendToBeVisual: true, virtualConsole,
}).then((dom) => new Promise((ok) => {
  // Los <script> externos cargan después de que fromFile responde: esperar a 'load'.
  if (dom.window.document.readyState === 'complete') ok(dom); else dom.window.addEventListener('load', () => ok(dom));
})).then((dom) => {
  const { window } = dom;
  const { document } = window;
  const PYL = window.PYL;
  const keys = (o) => Object.keys(o || {}).sort();
  const actual = { core: keys(PYL.core), services: keys(PYL.services), ui: keys(PYL.ui), app: keys(PYL.app) };

  if (process.argv.includes('--claves')) { console.log(JSON.stringify(actual, null, 2)); process.exit(0); }

  // 1. Cada capa publica las mismas claves de la línea base.
  for (const capa of Object.keys(BASE_KEYS)) {
    assert.deepStrictEqual(actual[capa], BASE_KEYS[capa], `Claves de PYL.${capa} distintas de la línea base`);
  }

  // 2. Las 10 pestañas abren su vista y marcan aria-current.
  const tabs = [...document.querySelectorAll('#tabs button')];
  assert.strictEqual(tabs.length, 10, 'Debe haber 10 pestañas');
  for (const b of tabs) {
    b.click();
    const on = [...document.querySelectorAll('.view.on')].map((v) => v.id);
    assert.deepStrictEqual(on, ['v-' + b.dataset.v], `La pestaña ${b.dataset.v} no abrió solo su vista`);
    assert.strictEqual(b.getAttribute('aria-current'), 'page', `${b.dataset.v} sin aria-current`);
  }

  // 3. Eventos de navegación: nav:vista en cada clic, resize al abrir el tablero P&L, escalera que crece.
  const vistas = [];
  document.addEventListener('nav:vista', (e) => vistas.push(e.detail.v));
  let resizes = 0;
  window.addEventListener('resize', () => resizes++);
  const tab = (v) => tabs.find((b) => b.dataset.v === v);
  tab('escalera').click();
  tab('pyl').click();
  assert.deepStrictEqual(vistas, ['escalera', 'pyl'], 'nav:vista debe llevar la vista abierta');
  assert.strictEqual(resizes, 1, 'Abrir el tablero P&L debe disparar un resize');
  tab('dash').click();
  assert.strictEqual(resizes, 1, 'Solo el tablero P&L dispara resize');

  // 4. [data-go] también navega.
  const go = document.querySelector('[data-go]');
  go.click();
  assert.deepStrictEqual([...document.querySelectorAll('.view.on')].map((v) => v.id), ['v-' + go.dataset.go]);

  // 5. Escalera: abrirla quita .grown y lo vuelve a poner en dos requestAnimationFrame.
  const ladder = document.querySelector('#ladder');
  ladder.classList.add('grown');
  tab('escalera').click();
  assert.ok(!ladder.classList.contains('grown'), 'growLadder debe reiniciar la animación al abrir Escalera');

  // 6. Hard Metrics (SPEC 03): diagrama de 5 filas, ficha por métrica, CPA del producto activo, cadena y nada de la tabla vieja.
  //    En jsdom no hay layout: las flechas no se miden (drawArrows devuelve false) y aquí solo se revisan nodos y textos.
  const text = (sel) => (document.querySelector(sel) || {}).textContent || '';
  tab('metricas').click();
  const hmRows = [...document.querySelectorAll('#hm-map .hm-row')].map((r) => r.dataset.k);
  assert.deepStrictEqual(hmRows, ['ctr', 'cpc', 'cpm', 'cppi', 'cpa'], 'El diagrama debe tener las 5 métricas en orden');
  assert.strictEqual(document.querySelectorAll('#hm-map .hm-node').length, 10, 'Cada métrica tiene un botón por lado');
  assert.strictEqual(document.querySelector('#hm-detail'), null, 'Ya no existe la ficha de abajo');
  assert.strictEqual(text('#hm-map .m-cpm .hm-side.r .hm-main'), '≤ 20.000', 'CPM Meta ≤ 20.000');
  assert.strictEqual(text('#hm-map .m-cpm .hm-side.l .hm-main'), '≤ 6.000', 'CPM TikTok ≤ 6.000');
  assert.strictEqual(text('#hm-map .m-cpa .hm-side.l .hm-main'), '≤ 15.000', 'CPA del diagrama: 15.000 fijo');
  assert.strictEqual(document.querySelectorAll('#hm-map .m-cpa .hm-ref').length, 0, 'CPA sin texto pequeño');
  assert.strictEqual(text('#hm-map .m-ctr .hm-side.r .hm-main'), '> 2 %', 'CTR Meta: > 2 % grande');
  assert.strictEqual(document.querySelectorAll('#hm-map .m-ctr .hm-ref').length, 0, 'CTR ya no lleva texto pequeño');
  const tipNode = document.querySelector('#tip');
  document.querySelector('#hm-map .m-ctr .hm-side.l .hm-main').dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true }));
  assert.ok(tipNode.textContent.includes('No se mira'), 'Pasar el mouse por el CTR muestra "No se mira"');
  document.querySelector('#hm-map .m-ctr .hm-side.r .hm-main').dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true }));
  assert.ok(tipNode.textContent.includes('No se mira'), 'También en Meta');
  assert.ok(tipNode.textContent.includes('Meta (CTR único): 2 %') && !tipNode.textContent.includes('TikTok'), 'El CTR de Meta muestra solo el límite de Meta');
  document.querySelector('#hm-map .m-cppi .hm-side.l .hm-main').dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true }));
  assert.ok(tipNode.textContent.includes('$ 4.000 COP') && tipNode.textContent.includes('< $ 3.000'), 'El CPPI muestra límite e ideal');
  assert.strictEqual(document.querySelectorAll('#hm-map .m-cpm .hm-ref').length, 0, 'CPM sin texto pequeño');
  // Expandir: el botón y un clic en un espacio vacío alternan la clase hm-wide; un clic en un botón no.
  const mapa = document.querySelector('#hm-map');
  assert.ok(!mapa.classList.contains('hm-wide'), 'Empieza contraído');
  mapa.querySelector('.hm-expand').click();
  assert.ok(mapa.classList.contains('hm-wide') && mapa.querySelector('.hm-expand-txt').textContent === 'Contraer', 'El botón expande');
  mapa.querySelector('.hm-title').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.ok(!mapa.classList.contains('hm-wide'), 'Un clic en un espacio vacío contrae');
  mapa.querySelector('.hm-title').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.ok(mapa.classList.contains('hm-wide'), 'Y lo expande');
  mapa.querySelector('.m-cpm .hm-how').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.ok(mapa.classList.contains('hm-wide'), 'Un clic en un elemento con aviso no cambia el ancho');
  mapa.querySelector('.hm-expand').click();
  // Botón "i": abre el popover de significado; otro clic o Esc lo cierra; elegir otra métrica lo cambia.
  assert.strictEqual(document.querySelectorAll('#hm-map .hm-info').length, 10, 'Una i por botón de métrica');
  const info = (k, s) => document.querySelector(`#hm-map .m-${k} .hm-side.${s} .hm-info`);
  info('cppi', 'l').click();
  assert.strictEqual(document.querySelectorAll('.hm-pop').length, 1, 'La i abre un popover');
  assert.ok(document.querySelector('.hm-pop .hm-pop-name').textContent === 'CPPI' && document.querySelectorAll('.hm-pop .hm-pop-sig').length === 4, 'Popover del CPPI con sus 4 señales');
  assert.strictEqual(info('cppi', 'l').getAttribute('aria-expanded'), 'true');
  info('cpc', 'r').click();
  assert.strictEqual(document.querySelectorAll('.hm-pop').length, 1, 'Solo un popover a la vez');
  assert.strictEqual(document.querySelector('.hm-pop .hm-pop-name').textContent, 'CPC');
  info('cpc', 'r').click();
  assert.strictEqual(document.querySelectorAll('.hm-pop').length, 0, 'Otro clic en la misma i lo cierra');
  info('ctr', 'l').click();
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.strictEqual(document.querySelectorAll('.hm-pop').length, 0, 'Esc lo cierra');
  assert.strictEqual(document.querySelectorAll('#hm-map [aria-pressed="true"]').length, 0, 'Abrir la i no elige la métrica');
  // Nombre del reporte de Meta en la "i": CTR y CPPI sí; CPM, CPC y CPA no. El CTR trae además "por personas" y la advertencia.
  const reporte = (k) => { info(k, 'l').click(); const pop = document.querySelector('.hm-pop'); const r = { t: text('.hm-pop .hm-pop-report'), unique: !!pop.querySelector('.hm-pop-unique'), warn: text('.hm-pop .hm-warn') }; info(k, 'l').click(); return r; };
  assert.strictEqual(reporte('ctr').t, 'En el reporte de Meta: «CTR único (porcentaje de clics en el enlace)»', 'La i del CTR dice el nombre del reporte');
  assert.strictEqual(reporte('cppi').t, 'En el reporte de Meta: «Costo x Checkout»', 'La i del CPPI dice el nombre del reporte');
  for (const k of ['cpm', 'cpc', 'cpa']) assert.deepStrictEqual(reporte(k), { t: '', unique: false, warn: '' }, 'La i de ' + k + ' no trae la línea del reporte');
  // Fórmula en el panel de la "i" de cada métrica.
  const formula = (k) => { info(k, 'l').click(); const t = text('.hm-pop .hm-pop-formula'); info(k, 'l').click(); return t; };
  assert.ok(formula('ctr').includes('Meta (CTR único)') && formula('ctr').includes('TikTok: clics ÷ impresiones × 100'), 'La i del CTR trae su fórmula por plataforma');
  assert.ok(formula('cpc').includes('Monto gastado ÷ Clics en el enlace') && formula('cpm').includes('× 1.000') && formula('cppi').includes('Pagos iniciados') && formula('cpa').includes('Resultados'), 'Cada i trae su fórmula');
  const ctrPop = reporte('ctr');
  assert.ok(ctrPop.unique && ctrPop.warn.includes('⚠') && ctrPop.warn.includes('Límite por confirmar'), 'La i del CTR explica el CTR único y trae la advertencia');
  assert.strictEqual(reporte('cppi').warn, '', 'Solo el CTR trae advertencia');
  // El aviso del número de Meta del CTR trae la advertencia; el de TikTok no.
  document.querySelector('#hm-map .m-ctr .hm-side.r .hm-main').dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true }));
  assert.ok(tipNode.querySelector('.hm-warn') && tipNode.textContent.includes('Límite por confirmar'), 'El aviso del CTR de Meta trae la advertencia');
  document.querySelector('#hm-map .m-ctr .hm-side.l .hm-main').dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true }));
  assert.ok(!tipNode.querySelector('.hm-warn') && tipNode.textContent.includes('TikTok: 0,5 %'), 'El de TikTok no trae advertencia');
  document.querySelector('#hm-map .m-cpm .hm-how').dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true }));
  assert.strictEqual(tipNode.querySelectorAll('tbody tr').length, 1, 'La tabla trae solo la métrica de la fila');
  assert.strictEqual(tipNode.querySelectorAll('thead th').length, 2, 'La tabla tiene 2 columnas');
  assert.strictEqual(tipNode.querySelector('.h'), null, 'El aviso con tabla va sin título');
  document.querySelector('#hm-map .m-cpa .hm-how').dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true }));
  assert.ok(tipNode.textContent.includes('Falla acumulada en la cadena'), 'Con el diagnóstico del CPA');
  document.querySelector('#hm-map .m-cpm .hm-how').dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true }));
  assert.ok(tipNode.textContent.includes('hook en los primeros 3 segundos'), 'Trae la solución de NovaSociety');
  assert.strictEqual(document.querySelectorAll('#hm-map .m-cpm .hm-side.l .hm-ref').length, 0, 'CPM TikTok sin "curso"');
  document.querySelector('#hm-map .hm-cap.l .info').dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true }));
  assert.ok(tipNode.textContent.includes('Quiero que esta métrica sea lo más ( ) posible'), 'La frase sale al pasar el mouse por "Rangos"');
  assert.ok(!text('#hm-map').includes('Quiero que esta métrica'), 'La frase ya no está escrita en el diagrama');  assert.strictEqual(text('#hm-map .m-cpc .hm-side.l .hm-main'), '< 800', 'CPC: 800 grande');
  assert.strictEqual(document.querySelectorAll('#hm-map .m-cpc .hm-ref, #hm-map .m-cppi .hm-ref').length, 0, 'CPC y CPPI sin texto pequeño');
  assert.strictEqual(text('#hm-map .m-cppi .hm-side.r .hm-main'), '< 4.000', 'CPPI: 4.000 grande');
  assert.strictEqual(document.querySelectorAll('#hm-map .hm-cap-r').length, 2, '"Rangos" sobre los números, una por lado');
  assert.ok(!text('#hm-map .hm-colhead').includes('Rangos'), '"Rangos" ya no va dentro del encabezado de la plataforma');
  document.querySelector('#hm-map .m-cpm .hm-node').click();
  assert.strictEqual(document.querySelectorAll('#hm-map [aria-pressed="true"]').length, 2, 'Elegir CPM marca sus dos botones');
  assert.strictEqual(text('#hm-map .m-cpa .hm-side.r .hm-main'), '≤ 15.000', 'El diagrama es fijo');
  // La tarjeta "La cadena que decide todo" también está en Métricas, debajo del diagrama y antes de la cadena antes/después del clic.
  const cadenas = [...document.querySelectorAll('.chain-info')];
  assert.strictEqual(cadenas.length, 2, 'La cadena está en Inicio y en Métricas');
  assert.ok(cadenas.every((c) => c.textContent.includes('CPM · costo por mil impresiones')), 'Las dos muestran el mismo contenido');
  const nodos = [...document.querySelectorAll('#v-metricas .funnel-node')];
  assert.strictEqual(nodos.length, 4, 'Los 4 eslabones en Métricas');
  nodos[3].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.ok(cadenas.every((c) => c.textContent.includes('CPA · costo por venta')), 'Elegir un eslabón cambia las dos copias');
  // Antes/después del clic: títulos y raya en las dos tarjetas; el desplegable empieza contraído y se abre al tocar un paso.
  assert.strictEqual([...document.querySelectorAll('.chain-split text')].filter((t) => t.textContent === 'MÉTRICAS ANTES DEL CLIC').length, 2);
  assert.strictEqual([...document.querySelectorAll('.chain-split text')].filter((t) => t.textContent === 'MÉTRICAS DESPUÉS DEL CLIC').length, 2);
  assert.strictEqual(document.querySelectorAll('.chain-split-line').length, 2, 'Una raya por tarjeta');
  nodos[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.ok(cadenas.every((c) => c.querySelector('details').open), 'Al tocar un paso su desplegable se abre');
  assert.strictEqual(document.querySelectorAll('[id="flow"], [id="fpath"], [id="flow2"], [id="fpath2"]').length, 4, 'ids únicos del gradiente y del trayecto');
  const orden = [...document.querySelectorAll('#v-metricas > *')].map((n) => n.id || (n.querySelector('.chain-info') ? 'cadena-decide' : n.className));
  assert.ok(orden.indexOf('hm-route') < orden.indexOf('hm-map') && orden.indexOf('hm-map') < orden.indexOf('hm-cadena'), 'Orden: ruta, diagrama y debajo la cadena que decide todo');
  assert.ok(text('#hm-soft h2') === 'Métricas blandas' && text('#hm-soft .tag') === 'Pronto', 'Métricas blandas queda reservado como pronto');
  assert.strictEqual(document.querySelector('#hm-soft').previousElementSibling.id, 'hm-base', 'Métricas blandas va justo debajo de Métricas base');
  // Encabezado de la pestaña y ruta (como la de Buscar producto).
  assert.strictEqual(text('#v-metricas .head h1'), 'Lectura de métricas', 'Título de la pestaña sin dos puntos');
  assert.strictEqual(text('#hm-map .hm-intro h2'), 'Métricas duras', 'La tarjeta del diagrama dice Métricas duras');
  const ruta = [...document.querySelectorAll('#v-metricas .hm-route a, #v-metricas .hm-route button')];
  assert.deepStrictEqual(ruta.map((n) => n.textContent), ['1Métricas duras', '2Métricas base', '3Métricas blandas', '4La cadena que decide todo', '5Testeo →'], 'Ruta de la pestaña');
  for (const a of ruta.filter((n) => n.tagName === 'A')) assert.ok(document.querySelector(a.getAttribute('href')), 'La ruta apunta a una tarjeta que existe: ' + a.getAttribute('href'));
  // Métricas base: <details> cerrado al cargar, con la tabla glosario (Métrica · Qué es · Da · NovaSociety).
  const baseCard = document.querySelector('#hm-base');
  assert.ok(baseCard.tagName === 'DETAILS' && !baseCard.open, 'Métricas base empieza cerrada');
  assert.strictEqual(text('#hm-base > summary h2'), 'Métricas base', 'El botón de la tarjeta dice Métricas base');
  assert.deepStrictEqual([...document.querySelectorAll('#hm-base thead th')].map((n) => n.textContent), ['Métrica', 'Qué es', 'Da', 'NovaSociety'], 'Columnas de la tabla');
  const filas = [...document.querySelectorAll('#hm-base tbody .hm-base-row')];
  assert.deepStrictEqual(filas.map((f) => f.querySelector('.hm-base-name b').textContent), ['Presupuesto', 'Monto gastado', 'Impresiones', 'Clics en el enlace', 'Resultados'], '5 filas en orden');
  assert.strictEqual(document.querySelectorAll('#hm-base .hm-base-ico').length, 0, 'Sin íconos');
  assert.ok(filas.every((f) => f.querySelector('.hm-base-def').textContent && f.querySelector('.hm-base-ns').textContent), 'Cada fila con definición y nota NovaSociety');
  assert.deepStrictEqual(filas.map((f) => (f.querySelector('.hm-base-chip') || {}).textContent || f.querySelector('.hm-base-gives').textContent), ['Tope diario', 'Numerador', 'CPM', 'CPC', 'CPA'], 'Lo que da cada métrica');
  assert.deepStrictEqual([...document.querySelectorAll('#hm-base .hm-base-csv')].map((n) => n.closest('[data-k]').dataset.k + ' ' + n.textContent), ['presupuesto «Presupuesto del conjunto de anuncios»', 'gasto «Monto gastado (COP)»'], 'Nombre largo del reporte solo en Presupuesto y Monto gastado');
  assert.ok(text('#hm-base .hm-base-foot').includes('Pagos iniciados') && text('#hm-base .hm-base-foot .hm-base-chip') === 'CPPI' && text('#hm-base .hm-base-foot').includes('Costo x Checkout'), 'El pie dice Pagos iniciados → CPPI');
  assert.ok(text('#hm-base .m-presupuesto').includes('144.000'), 'Escalones del presupuesto en la nota');
  assert.strictEqual(document.querySelectorAll('#hm-base .hm-info, #hm-base button, #hm-base [tabindex]').length, 0, 'Dentro de la tarjeta no hay "i", botones ni avisos');
  // La ruta abre Métricas base; después se cierra para no afectar lo demás.
  ruta[1].click();
  assert.ok(baseCard.open, 'El enlace de la ruta abre Métricas base');
  baseCard.open = false;
  assert.ok(text('#hm-base').includes('CPPI = Monto gastado ÷ Pagos iniciados') && text('#hm-base .m-clics').includes('No se calcula con impresiones'), 'Fórmulas visibles');
  assert.strictEqual(document.querySelector('#hm-base').previousElementSibling.id, 'hm-map', 'Métricas base va justo debajo del diagrama de Hard Metrics');
  assert.ok(document.querySelector('#hm-soft').nextElementSibling.querySelector('.chain-info'), 'Y la cadena que decide todo queda después');
  assert.strictEqual(document.querySelector('#hm-chain'), null, 'Ya no existe la tarjeta del efecto de desencadenamiento');
  assert.strictEqual(document.querySelectorAll('[data-plat], #mtBody, [data-test]').length, 0, 'Ya no existe la tabla vieja ni el probador "Mi dato"');

  // 8. Testeo (SPEC 06): pestaña después de Métricas, sub-pestañas y tarjeta "Pronto".
  assert.deepStrictEqual(tabs.map((b) => b.dataset.v).slice(4, 6), ['metricas', 'testeo'], 'Testeo va justo después de Métricas');
  const partes = [...document.querySelectorAll('#ts-parts [data-part]')];
  assert.deepStrictEqual(partes.map((b) => b.dataset.part), ['real', 'test', 'sim'], 'Lectura real, Fase de testeo y Simulador');
  assert.deepStrictEqual(partes.map((b) => b.textContent), ['📂 Lectura real · pronto', '🧪 Fase de testeo', '🎛️ Simulador'], 'Sin Surfing Scaling; Simulador habilitado');
  assert.ok(partes[0].disabled && !partes[1].disabled, 'Lectura real se ve pero no se puede abrir');
  assert.ok(partes[1].getAttribute('aria-pressed') === 'true' && !document.querySelector('#ts-test').hidden && document.querySelector('#ts-soon').hidden, 'Abre en Fase de testeo');
  partes[0].click();
  assert.ok(!document.querySelector('#ts-test').hidden && document.querySelector('#ts-soon').hidden && PYL.app.state.testing.part === 'test', 'Lectura real no se abre');
  // Simulador (SPEC 11): el módulo viejo se eliminó; la sub-pestaña nueva abre su propia tarjeta.
  assert.ok(!document.querySelector('#v-sim') && !document.querySelector('#tabs [data-v="sim"]') && !document.querySelector('#s-eval, #ts-simulador, #hist, #t-verdict'), 'Ya no hay Simulador en la página');
  assert.ok(!partes[2].disabled, 'El Simulador se puede abrir');
  partes[2].click();
  assert.ok(PYL.app.state.testing.part === 'sim' && !document.querySelector('#ts-simu').hidden && document.querySelector('#ts-test').hidden && document.querySelector('#ts-soon').hidden, 'Simulador abre su tarjeta');
  assert.strictEqual(document.querySelector('#ts-parts [aria-pressed="true"]').dataset.part, 'sim');
  assert.strictEqual(text('#ts-simu h3'), 'Simulador de testeo');
  assert.deepStrictEqual([...document.querySelectorAll('#ts-sx-modes [data-mode]')].map((b) => b.dataset.mode), ['chain', 'manual'], 'Dos modos');
  assert.strictEqual(document.querySelector('#ts-sx-modes [data-mode="chain"]').getAttribute('aria-pressed'), 'true', 'Cadena abre por defecto');
  assert.ok(!document.querySelector('#ts-simu .ts-cuts') && !document.querySelector('#ts-sx-cuts'), 'El Simulador no lleva el mapa de los 3 cortes');
  assert.ok(!document.querySelector('#ts-step .ts-cut') && !document.querySelector('#ts-sim'), 'El paso a paso no se duplica en el DOM mientras se ve el Simulador');
  document.querySelector('#ts-parts [data-part="test"]').click();
  assert.ok(PYL.app.state.testing.part === 'test' && !document.querySelector('#ts-test').hidden && document.querySelector('#ts-simu').hidden && !document.querySelector('#ts-sx-modes'), 'Volver a la Fase de testeo');
  assert.strictEqual(text('#v-testeo h1'), 'Testeo');
  assert.ok(text('#v-testeo .lead').includes('primera prueba de un anuncio') && text('#v-testeo .eyebrow').includes('Después de pautar'), 'Encabezado de Testeo');
  assert.strictEqual(PYL.app.state.testing.part, 'test');
  // 8b. Escalado (SPEC 07): pestaña después de Testeo, 3 sub-pestañas, métodos y Surfing Scaling en 7 pasos.
  assert.deepStrictEqual(tabs.map((b) => b.dataset.v).slice(4, 7), ['metricas', 'testeo', 'escalado'], 'Escalado va justo después de Testeo');
  assert.strictEqual(text('#v-escalado h1'), 'Escalado');
  assert.ok(text('#v-escalado .eyebrow').includes('Después de testear') && text('#v-escalado .lead').includes('se escala'), 'Encabezado de Escalado');
  const esPartes = [...document.querySelectorAll('#es-parts [data-part]')];
  assert.strictEqual(document.querySelector('#es-parts').getAttribute('aria-label'), 'Parte del escalado');
  assert.deepStrictEqual(esPartes.map((b) => b.dataset.part), ['real', 'scale', 'sim'], 'Lectura real, Fase de escalado y Simulador');
  assert.deepStrictEqual(esPartes.map((b) => b.textContent), ['📂 Lectura real · pronto', '📈 Fase de escalado', '⚠️ Simulador · revisar']);
  assert.deepStrictEqual(esPartes.map((b) => b.disabled), [true, false, true], 'Solo la Fase de escalado está abierta');
  assert.ok(esPartes[1].getAttribute('aria-pressed') === 'true' && !document.querySelector('#es-scale').hidden && document.querySelector('#es-real-soon').hidden, 'Abre en Fase de escalado');
  esPartes[0].click(); esPartes[2].click();
  assert.strictEqual(PYL.app.state.scaling.part, 'scale', 'Las partes apagadas no se abren');
  // Métodos: 3 tarjetas; Surfing Scaling abierto; los otros dos "pronto" abren su tarjeta.
  const metodos = [...document.querySelectorAll('#es-methods .st-tab')];
  assert.deepStrictEqual(metodos.map((b) => b.querySelector('b').textContent), ['Surfing Scaling', 'Escalado horizontal · pronto', 'Refresco de creativos · pronto']);
  assert.deepStrictEqual(metodos.map((b) => b.querySelector('.st-ic').textContent), ['🏄', '🔀', '🔄']);
  assert.ok(text('#es-methods .st-tab small').includes('+20 % por escalón'), 'El +20 % sale de NS_TEST.step');
  assert.ok(metodos[0].getAttribute('aria-pressed') === 'true' && !document.querySelector('#es-surf').hidden && document.querySelector('#es-soon').hidden, 'Surfing Scaling abierto');
  assert.deepStrictEqual(metodos.map((b) => b.disabled), [false, true, true], 'Los métodos "pronto" están deshabilitados');
  metodos[1].click(); metodos[2].click();
  assert.ok(!document.querySelector('#es-surf').hidden && document.querySelector('#es-soon').hidden && PYL.app.state.scaling.method === 'surf', 'Un método "pronto" no se abre');
  // Siete pasos con avance.
  const esPaso = (i) => document.querySelectorAll('#es-steps .fl-node')[i].click();
  assert.strictEqual(text('#es-h'), 'Surfing Scaling');
  assert.deepStrictEqual([...document.querySelectorAll('#es-steps .fl-tx b')].map((n) => n.textContent), ['Cuándo empieza', 'Zonas de CPA', 'La escalera', 'La ventana de 3 días', 'Día malo y regla dura', 'Protección durante el día', 'Practica']);
  assert.ok(text('#es-step').includes('Paso 1 de 7') && text('#es-prog').includes('0 de 7 pasos hechos'), 'Abre en el paso 1 de 7');
  // Paso 1: línea de tiempo y las dos fuentes.
  assert.deepStrictEqual([...document.querySelectorAll('#es-step .es-node b')].map((n) => n.textContent), ['Día 1 · testeo', 'Corte 40.000', 'Fin del día', 'Día 2 · primer escalón']);
  assert.deepStrictEqual([...document.querySelectorAll('#es-step .es-source .tag')].map((n) => n.textContent), ['Lab', 'Regla del curso']);
  assert.ok(text('#es-step .es-source[data-source="curso"]').includes('Nunca el día 1'), 'La regla del curso dice "nunca el día 1"');
  document.querySelectorAll('#es-step .es-node')[3].click();
  assert.ok(text('#es-step .es-line-note').includes('$ 100.000') && text('#es-step .es-line-note').includes('$ 120.000') && document.querySelector('#es-step .es-step.on').dataset.k === 'd2', 'El día 2 sube de 100.000 a 120.000');
  // Paso 2: zonas con tope editable.
  esPaso(1);
  assert.ok(text('#es-step').includes('Paso 2 de 7'), 'Paso 2');
  assert.deepStrictEqual([...document.querySelectorAll('#es-zones .es-z')].map((n) => n.textContent), ['Sube', 'Sostiene', 'Baja', 'Apaga'], 'Cuatro zonas');
  assert.ok(text('#es-zones').includes('$ 12.000') && text('#es-zones').includes('$ 15.000') && text('#es-zones').includes('$ 20.000'), 'Zonas del tope genérico');
  const esTope = document.querySelector('#es-f-tope');
  esTope.value = '32617'; esTope.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.ok(text('#es-zones').includes('$ 26.094') && text('#es-zones').includes('$ 43.489'), 'Las zonas cambian con el tope');
  document.querySelector('#es-step [data-tope="20617"]').click();
  assert.ok(esTope.value === '20617' && text('#es-zones').includes('$ 16.494'), 'El botón del costeo pone su tope');
  esTope.value = '0'; esTope.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.ok(text('#es-zones').includes('mayor que 0') && !document.querySelector('#es-zones .es-z'), 'Tope 0 avisa');
  // Paso 3: escalera de 15 escalones en 3 bloques, clicable.
  esPaso(2);
  assert.strictEqual(document.querySelectorAll('#es-step .es-ls').length, 15, 'Quince escalones');
  assert.deepStrictEqual([...document.querySelectorAll('#es-step .es-lb-h')].map((n) => n.textContent), ['Testeo y confirmación', 'Zona de crecimiento', 'Alto volumen']);
  assert.deepStrictEqual([...document.querySelectorAll('#es-step .es-lb')].map((b) => b.querySelectorAll('.es-ls').length), [5, 5, 5], 'Cinco por bloque');
  assert.ok(text('#es-ld').includes('N1 · $ 100.000') && text('#es-ld').includes('Escalón base'), 'Arranca en N1');
  document.querySelectorAll('#es-step .es-ls')[5].click();
  assert.ok(text('#es-ld').includes('N6 · $ 249.000') && text('#es-ld').includes('+20 % sobre N5') && text('#es-ld').includes('$ 207.000') && text('#es-ld').includes('Zona de crecimiento'), 'N6 muestra el +20 %');
  document.querySelectorAll('#es-step .es-ls')[14].click();
  assert.ok(text('#es-ld').includes('N15 · $ 1.280.000') && text('#es-ld').includes('Alto volumen'), 'N15');
  assert.strictEqual(document.querySelectorAll('#es-step .es-ls[aria-pressed="true"]').length, 1, 'Un escalón elegido');
  // Paso 4: ventana de 3 días.
  esPaso(3);
  assert.deepStrictEqual([...document.querySelectorAll('#es-step .es-day > b:first-child')].map((n) => n.textContent), ['Hace 3 días', 'Anteayer', 'Ayer']);
  assert.ok(text('#es-step .es-win').includes('$ 384.000') && text('#es-step .es-win').includes('27 ventas') && text('#es-step .es-win').includes('$ 14.222'), 'CPA de la ventana = gasto total ÷ ventas totales');
  assert.ok(document.querySelector('#es-step .es-zbar-pin') && text('#es-step').includes('Ayer solo prende la alerta') && text('#es-step').includes('pesa el CPA'), 'CPA sobre la barra y el mensaje');
  // Paso 5: ramas del MCP, la regla dura marcada.
  esPaso(4);
  assert.deepStrictEqual([...document.querySelectorAll('#es-step .es-br')].map((n) => n.dataset.branch), ['off-hard', 'off-single', 'flojo-hold', 'flojo-down', 'zone-up', 'zone-hold', 'zone-down', 'zone-off'], 'Las 8 salidas del día');
  assert.deepStrictEqual([...document.querySelectorAll('#es-step .es-br')].filter((n) => n.querySelector('.es-dura')).map((n) => n.dataset.branch), ['off-hard', 'off-single'], 'Regla dura marcada');
  assert.strictEqual(document.querySelectorAll('#es-step .es-src').length, 0, 'Ninguna del curso en este paso');
  // Paso 6: protecciones del curso.
  esPaso(5);
  assert.deepStrictEqual([...document.querySelectorAll('#es-step .es-guard h5')].map((n) => n.textContent), ['Subida sin ventas', 'Amanecer rojo']);
  assert.ok([...document.querySelectorAll('#es-step .es-guard')].every((g) => g.querySelector('.tag').textContent === 'Regla del curso'), 'Etiqueta Regla del curso');
  assert.ok(text('#es-step .es-guard[data-guard="raise"]').includes('$ 12.000') && text('#es-step .es-guard[data-guard="dawn"]').includes('$ 36.000'), 'Montos desde escala: 12.000 y 36.000');
  assert.deepStrictEqual([...document.querySelectorAll('#es-step .es-br')].map((n) => n.dataset.branch), ['raise-down', 'raise-hold', 'dawn-down2', 'dawn-hold']);
  // Paso 7: mapa completo y lugar del simulacro; el último paso no lleva botón a otra pestaña.
  esPaso(6);
  assert.ok(text('#es-step').includes('Paso 7 de 7') && document.querySelectorAll('#es-step .es-br').length === 12 && document.querySelector('#es-step #es-sim'), 'Paso 7: mapa de 12 ramas y simulacro');
  assert.deepStrictEqual([...document.querySelectorAll('#es-step .fl-detail .row.mt button')].map((b) => b.textContent), ['← Anterior'], 'El último paso solo tiene "← Anterior"');
  // Simulacro (paso 7): dos modos, práctica por rondas y "Juega con los números".
  assert.deepStrictEqual([...document.querySelectorAll('#es-modes [data-mode]')].map((b) => b.dataset.mode), ['practice', 'free'], 'Dos modos');
  assert.strictEqual(document.querySelector('#es-modes [data-mode="practice"]').getAttribute('aria-pressed'), 'true', 'Abre en Práctica');
  assert.strictEqual(document.querySelectorAll('#es-mode .es-dec').length, 5, 'Cinco decisiones');
  assert.deepStrictEqual([...document.querySelectorAll('#es-mode .es-dec')].map((b) => b.dataset.action), ['up', 'hold', 'down', 'down2', 'off']);
  assert.ok(text('#es-mode').includes('Aciertos 0 de 0 decisiones') && text('#es-mode').includes('Escalón actual'), 'Muestra el caso con su escalón');
  // Una ronda de 3 casos conocidos: s1 (sube), s5 (regla dura) y s9 (protección del curso).
  const esModo = (k) => document.querySelector('#es-modes [data-mode="' + k + '"]').click();
  esModo('free');
  PYL.app.state.scaling.run = PYL.core.scaling.scalePracticeNew(['s1', 's5', 's9']);
  esModo('practice');
  assert.ok(text('#es-mode').includes('Caso 1 de 3 · Conjunto 1') && text('#es-mode').includes('N2 · $ 120.000') && document.querySelectorAll('#es-mode .es-day').length === 3, 'Caso 1: escalón y 3 días');
  assert.ok(!document.querySelector('#es-fb') && !document.querySelector('#es-step .es-on'), 'Antes de decidir no hay veredicto ni rama iluminada');
  document.querySelector('#es-mode [data-action="hold"]').click();
  assert.ok(text('#es-fb').includes('❌') && text('#es-fb').includes('Elegiste = Sostener') && text('#es-fb').includes('tocaba ⬆️ Subir un escalón'), 'Fallo: dice cuál era');
  assert.ok(document.querySelector('#es-mode [data-action="up"]').classList.contains('es-right') && document.querySelector('#es-mode [data-action="hold"]').classList.contains('es-wrong'), 'Marca la correcta y la elegida');
  assert.ok([...document.querySelectorAll('#es-mode .es-dec')].every((b) => b.disabled), 'No se decide dos veces');
  assert.strictEqual(document.querySelector('#es-step .es-on').dataset.branch, 'zone-up', 'Se ilumina la rama del caso');
  assert.ok(text('#es-fb').includes('Así lo califica el Lab') && text('#es-fb').includes('Pasa de N2') && text('#es-fb').includes('a N3 · $ 144.000') && document.querySelector('#es-fb .es-zbar-pin'), 'Veredicto, escalón nuevo y CPA en la barra');
  assert.ok(text('#es-mode').includes('Aciertos 0 de 1 decisiones'));
  document.querySelector('#es-next').click();
  assert.ok(text('#es-mode').includes('Caso 2 de 3 · Conjunto 5') && !document.querySelector('#es-fb') && !document.querySelector('#es-step .es-on'), 'Caso 2 sin veredicto');
  document.querySelector('#es-mode [data-action="off"]').click();
  assert.ok(text('#es-fb').includes('✅') && text('#es-fb').includes('REGLA DURA') && text('#es-fb').includes('Se apaga el conjunto') && document.querySelector('#es-step .es-on').dataset.branch === 'off-hard', 'Regla dura');
  document.querySelector('#es-next').click();
  assert.ok(text('#es-mode').includes('Conjunto 9') && !document.querySelector('#es-mode .es-day') && text('#es-mode').includes('Acabas de subir'), 'Caso de protección: un momento del día');
  document.querySelector('#es-mode [data-action="down"]').click();
  assert.ok(text('#es-fb').includes('✅') && text('#es-fb').includes('regla del curso') && text('#es-fb .tag') === 'Regla del curso' && document.querySelector('#es-step .es-on').dataset.branch === 'raise-down', 'Protección del curso');
  assert.strictEqual(text('#es-next'), 'Ver el resultado →', 'El último caso lleva al resultado');
  document.querySelector('#es-next').click();
  assert.ok(text('#es-end').includes('2 de 3 decisiones acertadas (67 %)') && text('#es-end').includes('Mejor puntaje: 67 %'), 'Fin de ronda');
  assert.strictEqual(PYL.app.state.scaling.best, 67, 'Se guarda el mejor puntaje');
  assert.ok(!document.querySelector('#es-step .es-on'), 'Sin rama iluminada al terminar');
  document.querySelector('#es-again').click();
  assert.ok(!document.querySelector('#es-end') && document.querySelectorAll('#es-mode .es-dec').length === 5 && text('#es-mode').includes('Aciertos 0 de 0'), 'Otra ronda');
  // Juega con los números.
  esModo('free');
  assert.strictEqual(PYL.app.state.scaling.mode, 'free', 'Se recuerda el modo');
  assert.ok(!document.querySelector('#es-mode .es-dec') && document.querySelector('#es-free-out'), 'Modo libre');
  const esPoner = (id, v) => { const x = document.querySelector('#es-f-' + id); x.value = v; x.dispatchEvent(new window.Event(x.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); };
  assert.deepStrictEqual(['level', 'tope', 'd0-spend', 'd0-sales', 'd2-pi'].map((id) => document.querySelector('#es-f-' + id).value), ['0', '15000', '100000', '10', '12'], 'Arranca en N1 con el tope genérico y 3 días');
  assert.ok(text('#es-zones').includes('$ 12.000') && text('#es-zones').includes('$ 15.000') && text('#es-zones').includes('$ 20.000'), 'Zonas del tope genérico');
  assert.deepStrictEqual([...document.querySelectorAll('#es-mode [data-cpa]')].map((n) => n.textContent), ['CPA $ 10.000', 'CPA $ 11.111', 'CPA $ 12.500'], 'CPA de cada día');
  assert.ok(text('#es-free-out').includes('FUE UN DÍA FLOJO') && text('#es-free-out').includes('Escalón nuevoSostener'.slice(0, 13)) && document.querySelector('#es-step .es-on').dataset.branch === 'flojo-hold', 'Día flojo y rama iluminada');
  assert.ok(text('#es-free-out').includes('CPA de la ventana$ 11.111') && text('#es-free-out').includes('ZonaSube') && document.querySelector('#es-free-out .es-zbar-pin'), 'CPA de la ventana, zona y barra');
  esPoner('d2-spend', '80000');
  assert.ok(text('#es-free-out').includes('SUBE') && document.querySelector('#es-step .es-on').dataset.branch === 'zone-up' && text('#es-free-out').includes('Escalón nuevo$ 120.000'), 'Ayer más barato: sube a N2');
  esPoner('level', '14');
  assert.ok(text('#es-free-out').includes('Último escalón') && text('#es-free-out').includes('Escalón actual$ 1.280.000') && PYL.app.state.scaling.free.level === 14, 'En N15 subir se sostiene');
  esPoner('level', '0');
  esPoner('d0-spend', '300000'); esPoner('d1-spend', '300000');
  assert.ok(text('#es-free-out').includes('REGLA DURA') === false && document.querySelector('#es-step .es-on'), 'Sin regla dura si ayer es barato');
  esPoner('d1-spend', '250000'); esPoner('d2-spend', '250000');
  assert.ok(text('#es-free-out').includes('REGLA DURA: APÁGALO') && text('#es-free-out').includes('Escalón nuevoApagado') && document.querySelector('#es-step .es-on').dataset.branch === 'off-hard', 'Dos días seguidos sobre apaga: se apaga');
  esPoner('tope', '32617');
  assert.ok(text('#es-zones').includes('$ 26.094') && text('#es-zones').includes('$ 43.489') && PYL.app.state.scaling.free.tope === 32617, 'Las zonas siguen el tope');
  esPoner('tope', '15000');
  esPoner('d2-sales', '50');
  assert.ok(text('#es-free-out').includes('El día 3 tiene más ventas que pagos iniciados') && !document.querySelector('#es-step .es-on') && !text('#es-free-out').includes('Así lo califica'), 'Más ventas que pagos iniciados: aviso y sin veredicto');
  assert.ok(text('#es-free-out').includes('CPA de la ventana') && document.querySelector('#es-mode [data-cpa="2"]').textContent.startsWith('CPA'), 'Los CPA se siguen mostrando');
  esPoner('d2-pi', '60');
  assert.ok(!text('#es-free-out').includes('más ventas que pagos') && document.querySelector('#es-free-out .es-ex'), 'Al corregirlo vuelve el veredicto');
  esModo('practice');
  assert.ok(!document.querySelector('#es-free-out') && PYL.app.state.scaling.mode === 'practice', 'Volver a Práctica');
  // Avance: una casilla por paso y "Empezar de nuevo".
  assert.strictEqual(document.querySelectorAll('#es-steps .fl-item.done').length, 0);
  document.querySelector('#es-step .ld-check').click();
  assert.strictEqual(document.querySelectorAll('#es-steps .fl-item.done').length, 1, 'Un paso hecho');
  assert.ok(text('#es-prog').includes('1 de 7 pasos hechos') && document.querySelector('#es-prog .b-bar i').style.width.startsWith('14.2'), 'La barra avanza');
  assert.deepStrictEqual([...PYL.app.state.scaling.plans.surf.done], ['practica']);
  assert.ok(document.querySelector('#es-prog button'), 'Con un paso hecho aparece "Empezar de nuevo"');
  document.querySelector('#es-step .ld-check').click();
  assert.strictEqual(document.querySelectorAll('#es-steps .fl-item.done').length, 0, 'Desmarcar lo devuelve');
  assert.ok(!document.querySelector('#es-prog button'), 'Sin pasos hechos no hay "Empezar de nuevo"');
  esPaso(0);
  assert.deepStrictEqual(Object.keys(PYL.app.state.scaling).sort(), ['best', 'free', 'method', 'mode', 'part', 'plans', 'run'], 'Estado de Escalado');
  // Ids #es- únicos y ninguno de Testeo repetido.
  const esIds = [...document.querySelectorAll('[id^="es-"]')].map((n) => n.id);
  assert.deepStrictEqual(esIds.filter((id, i) => esIds.indexOf(id) !== i), [], 'Ids #es- repetidos');
  assert.ok(['es-parts', 'es-scale', 'es-methods', 'es-surf', 'es-h', 'es-sub', 'es-prog', 'es-steps', 'es-step', 'es-soon', 'es-real-soon'].every((id) => esIds.includes(id)), 'Ids de la estructura');
  const ids = [...document.querySelectorAll('[id]')].map((n) => n.id), repetidos = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepStrictEqual(repetidos, [], 'Ids repetidos: ' + repetidos.join(', '));

  // 9. Escalado · Fase de testeo: 6 pasos, cada uno con su bloque, y el avance.
  const paso = (i) => document.querySelectorAll('#ts-steps .fl-node')[i].click();
  assert.strictEqual(document.querySelectorAll('#ts-steps .fl-item').length, 6, 'Seis pasos en la lista');
  assert.deepStrictEqual([...document.querySelectorAll('#ts-steps .fl-tx b')].map((n) => n.textContent), ['Arranque', 'Corte 1 · 20.000', 'Corte 2 · 30.000', 'Corte 3 · 40.000', 'La cadena y qué no hacer', 'Practica']);
  assert.ok(text('#ts-step').includes('Paso 1 de 6') && text('#ts-step').includes('100.000 al día'), 'Abre en el paso 1');
  assert.deepStrictEqual([...document.querySelectorAll('#ts-step .ts-bar-mark small')].map((n) => n.textContent.replace('Fin del día', '')), ['20K', '30K', '40K', '100K'], 'Barra con las marcas');
  assert.ok(text('#ts-step').includes('el corte de 40.000 le llega el día 2'), 'Nota ABO');
  paso(1);
  assert.ok(text('#ts-step').includes('Paso 2 de 6') && document.querySelectorAll('#ts-step .ts-cut').length === 1, 'El paso 2 muestra solo su tarjeta');
  assert.ok(!document.querySelector('#ts-step .ts-ex') && !document.querySelector('#ts-step .ts-on'), 'Sin tarjeta de ejemplo ni fila iluminada en los pasos 2 a 4');
  assert.deepStrictEqual([...document.querySelectorAll('#ts-step .ts-br .ts-vd')].map((n) => n.textContent), ['✅ MARAVILLOSO', '🛑 Apagar', '⚠️ Mantener vigilando', '✅ Seguir sin tocar'], 'Cada fila del corte 1 muestra su veredicto');
  assert.ok(text('#ts-step').includes('3 o 4 pagos iniciados · 0 ventas'), 'Corte 1: 0 ventas');
  paso(2);
  assert.deepStrictEqual([...document.querySelectorAll('#ts-step .ts-grp-h')].map((n) => n.textContent), ['Sin ventas', 'Con venta']);
  assert.ok(!document.querySelector('#ts-step .ts-on') && document.querySelectorAll('#ts-step .ts-br .ts-vd').length === 6, 'Corte 2: veredicto en sus 6 filas y sin fila iluminada');
  paso(3);
  assert.ok(text('#ts-step .ts-own') === '❓ Preguntar' && !document.querySelector('#ts-step .tag.ts-own') && document.querySelectorAll('#ts-step .ts-cut .ts-br').length === 3, 'Corte 3 con Regla propia');
  { // La aclaración de la regla propia sale como tooltip al pasar el mouse por "Preguntar".
    const ow = document.querySelector('#ts-step .ts-own');
    ow.dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true }));
    assert.ok(text('#tip').includes('Regla propia') && text('#tip').includes('NovaSociety no define este caso'), 'Tooltip de la regla propia');
    ow.dispatchEvent(new window.MouseEvent('mouseleave', { bubbles: true }));
  }
  const topeTxt = text('#ts-step .ts-tope');
  assert.ok(topeTxt.includes('El tope es el CPA máximo de tu costeo') && ['$ 12.000', '$ 20.000', '$ 16.494', '$ 27.489'].every((n) => topeTxt.includes(n)), 'Caja del tope');
  paso(4);
  assert.ok(text('#ts-step .ts-flow').replace(/s/g, '') === 'CPM→CPC→CPPI→CPA' && text('#ts-step').includes('No decidas por el CTR'), 'Cadena y CTR');
  assert.strictEqual(document.querySelectorAll('#ts-step .ts-read').length, 3, 'Tres lecturas');
  assert.deepStrictEqual([...document.querySelectorAll('#ts-step .ts-dont')].map((n) => n.querySelector('b').textContent), ['No apagues antes de un corte.', 'No toques el anuncio mientras está en testeo.', 'No decidas por el CTR.'], 'Tres reglas de lo que no hago');
  assert.strictEqual(document.querySelectorAll('#ts-step .ts-read .ts-pill').length, 6, 'Cada lectura trae sus etiquetas Si y Solución');
  paso(5);
  assert.strictEqual(document.querySelectorAll('#ts-step .ts-cuts .ts-cut').length, 3, 'El paso 6 muestra el mapa de los 3 cortes');
  assert.ok(document.querySelector('#ts-step #ts-sim'), 'y el lugar del simulacro');
  assert.deepStrictEqual([...document.querySelectorAll('#ts-step .fl-detail .row.mt button')].map((b) => b.textContent), ['← Anterior'], 'El último paso no lleva botón a otra pestaña');
  // Avance: marcar el paso lo da por hecho y mueve la barra; desmarcar lo devuelve.
  assert.strictEqual(document.querySelectorAll('#ts-steps .fl-item.done').length, 0);
  document.querySelector('#ts-step .ld-check').click();
  assert.strictEqual(document.querySelectorAll('#ts-steps .fl-item.done').length, 1, 'Un paso hecho');
  assert.ok(text('#ts-prog').includes('1 de 6 pasos hechos') && document.querySelector('#ts-prog .b-bar i').style.width.startsWith('16.6'), 'La barra de avance se mueve');
  assert.deepStrictEqual([...PYL.app.state.testing.test.done], ['practica']);
  document.querySelector('#ts-step .ld-check').click();
  assert.strictEqual(document.querySelectorAll('#ts-steps .fl-item.done').length, 0, 'Desmarcar lo devuelve');
  assert.ok(!document.querySelector('#ts-prog button'), 'Sin pasos hechos no hay "Empezar de nuevo"');
  paso(0);

  // 10. Paso 6 solo con la práctica (SPEC 11): sin selector de modos y con botón al Simulador.
  paso(5);
  assert.ok(!document.querySelector('#ts-modes') && !document.querySelector('#ts-free-out') && !document.querySelector('#ts-f-spend'), 'El paso 6 ya no tiene modos ni números a mano');
  assert.ok(document.querySelector('#ts-sim #ts-mode') && document.querySelector('#ts-adv'), 'Muestra directo la práctica de 11 casos en #ts-mode');
  assert.strictEqual(text('#ts-to-sim'), 'Simulador →');
  document.querySelector('#ts-to-sim').click();
  assert.ok(PYL.app.state.testing.part === 'sim' && !document.querySelector('#ts-simu').hidden && document.querySelector('#ts-test').hidden, '#ts-to-sim abre el Simulador');
  document.querySelector('#ts-parts [data-part="test"]').click();
  paso(0);

  // 10a. Simulador · modo Cadena (SPEC 11): entradas, corrida, deslizador y salida.
  {
    const TS = PYL.app.state.testing, SCc = PYL.core.simulator;
    TS.simRun.seed = 1; TS.simRun.run = null;   // semilla fija: con los defectos y azar libre, ~1 de cada 4 corridas se apaga sola
    document.querySelector('#ts-parts [data-part="sim"]').click();
    const campo = (k) => document.querySelector('#ts-sx-f-' + k);
    const escribir = (k, v) => { const x = campo(k); x.value = v; x.dispatchEvent(new window.Event('input', { bubbles: true })); };
    const luz = () => [...document.querySelectorAll('#ts-simu .ts-ex[data-branch]')].map((n) => n.dataset.branch);
    assert.deepStrictEqual(['daily', 'tope', 'cpm', 'ctr', 'toPi', 'toSale'].map((k) => campo(k).value), ['100000', '15000', '12000', '2', '20', '30'], 'Entradas con sus defectos');
    assert.strictEqual(document.querySelector('#ts-sx-f-plat [data-plat="meta"]').getAttribute('aria-pressed'), 'true', 'Meta por defecto');
    assert.ok(text('#ts-sx-panel').includes('$ 12.000') && text('#ts-sx-panel').includes('$ 20.000'), 'Zonas del tope bajo el campo');
    // No hay campos para CPC, PI, ventas, CPPI ni CPA: salen calculados.
    assert.ok(!['cpc', 'pi', 'sales', 'cppi', 'cpa'].some((k) => document.querySelector('#ts-sx-f-' + k)), 'Los derivados no se escriben');
    assert.ok(TS.simRun.run && TS.simRun.run.points.length === 101 && TS.simRun.spend === 0, 'La corrida se genera al abrir');
    const derivado = (n) => [...document.querySelectorAll('#ts-sx-derived .ts-stat')].find((s) => s.querySelector('small').textContent === n).querySelector('b').textContent;
    assert.strictEqual(derivado('CPC'), '$ 600', 'CPC = CPM ÷ (1.000 × CTR)');
    // Deslizador: mueve el punto y muestra su estado.
    const sl = document.querySelector('#ts-sx-spend');
    assert.strictEqual(sl.max, '100000', 'El deslizador llega al fin del día');
    sl.value = '40000'; sl.dispatchEvent(new window.Event('input', { bubbles: true }));
    const p40 = SCc.simAt(TS.simRun.run, 40000, TS.sim);
    assert.strictEqual(TS.simRun.spend, 40000);
    assert.strictEqual(derivado('Pagos iniciados'), String(p40.point.pi));
    assert.strictEqual(derivado('Ventas'), String(p40.point.sales));
    assert.strictEqual(derivado('Impresiones'), PYL.core.metrics.copText(Math.floor(p40.point.impr)));
    assert.ok(text('#ts-sx-out').includes(p40.verdict.veredicto) && text('#ts-sx-out').includes('Así lo califica el Lab'), 'Veredicto del punto');
    assert.deepStrictEqual(luz(), [p40.verdict.branch], 'La tarjeta lleva la rama del veredicto del punto');
    // Misma semilla = mismos números al volver a abrir el modo.
    const antes = JSON.stringify(TS.simRun.run.points);
    document.querySelector('#ts-sx-modes [data-mode="manual"]').click();
    document.querySelector('#ts-sx-modes [data-mode="chain"]').click();
    assert.strictEqual(JSON.stringify(TS.simRun.run.points), antes, 'La corrida no cambia al cambiar de modo');
    // Entradas: CTR con coma, plataforma, errores por campo.
    escribir('ctr', '1,5');
    assert.strictEqual(TS.sim.ctr, 1.5, 'CTR con coma');
    assert.ok(campo('ctr').getAttribute('aria-invalid') !== 'true' && text('#ts-sx-err-ctr') === '');
    assert.strictEqual(derivado('CPC'), '$ 800', 'CPC con CTR 1,5 = 12.000 ÷ 15');
    document.querySelector('#ts-sx-f-plat [data-plat="tiktok"]').click();
    assert.strictEqual(TS.sim.plat, 'tiktok');
    assert.strictEqual(document.querySelector('#ts-sx-f-plat [data-plat="tiktok"]').getAttribute('aria-pressed'), 'true');
    escribir('ctr', '2');
    escribir('ctr', '101');
    assert.strictEqual(campo('ctr').getAttribute('aria-invalid'), 'true', 'CTR sobre 100 marca el campo');
    assert.ok(text('#ts-sx-err-ctr') !== '' && !document.querySelector('#ts-sx-out .ts-ex') && !luz().length, 'Sin veredicto con un campo malo');
    escribir('ctr', '2');
    escribir('cpm', '0');
    assert.strictEqual(campo('cpm').getAttribute('aria-invalid'), 'true', 'CPM en 0 marca el campo');
    assert.ok(!document.querySelector('#ts-sx-out .ts-ex') && !luz().length);
    escribir('cpm', '12000');
    assert.ok(campo('cpm').getAttribute('aria-invalid') !== 'true' && !!document.querySelector('#ts-sx-out'), 'Corregir el campo quita la marca');
    // Apagar: sin pagos iniciados, la corrida se detiene en el corte 1.
    document.querySelector('#ts-sx-f-plat [data-plat="meta"]').click();
    escribir('toPi', '0');
    assert.strictEqual(document.querySelector('#ts-sx-spend').max, '20000', 'El deslizador no pasa del punto de apagado');
    const sl2 = document.querySelector('#ts-sx-spend'); sl2.value = '90000'; sl2.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.strictEqual(TS.simRun.spend, 20000, 'El gasto se queda en el apagado');
    assert.ok(text('#ts-sx-out').includes('Apagado en el corte 1') && text('#ts-sx-out').includes('Apágalo y revisa la cadena'), 'Apagado en el corte 1');
    assert.ok(!document.querySelector('#ts-sx-out .ts-read'), 'Con CPM y CPC sanos no hay eslabón roto que leer');
    assert.deepStrictEqual(luz(), ['c1-off']);
    escribir('cpm', '30000');
    assert.ok(text('#ts-sx-out').includes('Apagado en el corte 1') && text('#ts-sx-out').includes('Creativos nuevos'), 'Con CPM caro sale qué revisar');
    // Fin del día con c3-spend: aviso de escalado, sin rama iluminada.
    escribir('toPi', '50'); escribir('ctr', '10'); escribir('toSale', '50'); escribir('cpm', '5000');
    const sl3 = document.querySelector('#ts-sx-spend'); sl3.value = '100000'; sl3.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.ok(text('#ts-sx-out').includes('dejó de ser testeo') && text('#ts-sx-out').includes('pestaña Escalado') && !luz().length, 'Aviso de escalado al fin del día');
    // Escenarios, cadena con semáforo e historial (semilla fija vía Math.random: el escenario carga una corrida nueva).
    const conSemilla = (s, fn) => { const real = window.Math.random; window.Math.random = () => (s + 0.5) / 2147483647; try { fn(); } finally { window.Math.random = real; } };
    const mover = (n) => { const r = document.querySelector('#ts-sx-spend'); r.value = String(n); r.dispatchEvent(new window.Event('input', { bubbles: true })); };
    const celdas = () => [...document.querySelectorAll('#ts-sx-hist [data-hist]')].map((c) => c.querySelector('.ts-h-t').textContent);
    assert.deepStrictEqual([...document.querySelectorAll('#ts-sx-scen [data-scen]')].map((b) => b.dataset.scen), ['cpm', 'cpc', 'page', 'win'], 'Cuatro escenarios');
    conSemilla(4, () => document.querySelector('#ts-sx-scen [data-scen="cpm"]').click());
    assert.deepStrictEqual(['cpm', 'ctr', 'toPi', 'toSale'].map((k) => TS.sim[k]), [30000, 2, 20, 30], 'El escenario carga la cadena');
    assert.deepStrictEqual(['daily', 'tope'].map((k) => TS.sim[k]), [100000, 15000], 'y no toca presupuesto ni tope');
    assert.strictEqual(TS.simRun.seed, 4, 'Genera una corrida nueva');
    assert.strictEqual(TS.simRun.spend, 0, 'que parte en 0');
    assert.deepStrictEqual([...document.querySelectorAll('#ts-sx-chain [data-link]')].map((n) => n.dataset.link), ['cpm', 'ctr', 'cpc', 'cppi', 'cpa'], 'Cadena CPM → CTR → CPC → CPPI → CPA');
    const eslabon = (k) => document.querySelector('#ts-sx-chain [data-link="' + k + '"]');
    assert.ok(eslabon('cpm').classList.contains('ts-r'), 'El CPM caro sale en rojo');
    assert.ok(text('#ts-sx-chain').includes('Creativos nuevos') && document.querySelectorAll('#ts-sx-chain .ts-read').length === 1, 'y su lectura Si… / Solución…');
    assert.ok(text('#ts-sx-chain [data-link="ctr"]').includes('No decide') && !/ts-[gyr]\b/.test(eslabon('ctr').className), 'El CTR no decide y no tiene luz');
    assert.deepStrictEqual(celdas(), ['—', '—', '—', '—'], 'Historial vacío al empezar');
    mover(20000);
    assert.ok(celdas()[0].includes('Apagar') && celdas()[1] === 'Apagado' && celdas()[2] === 'Apagado' && celdas()[3] === 'Apagado', 'Apagar en 20K y Apagado después');
    assert.deepStrictEqual([...document.querySelectorAll('#ts-sx-hist [data-hist]')].map((c) => c.dataset.hist), ['20000', '30000', '40000', 'end'], 'Columnas 20K · 30K · 40K · Fin del día');
    assert.ok(/\d+ PI/.test(celdas()[0]) && celdas()[0].includes('ventas'), 'La celda trae PI y ventas');
    conSemilla(1, () => document.querySelector('#ts-sx-scen [data-scen="win"]').click());
    assert.ok(!document.querySelector('#ts-sx-chain .ts-read'), 'En el escenario ganador no hay eslabón roto');
    assert.ok(eslabon('cpm').classList.contains('ts-g') && eslabon('cpc').classList.contains('ts-g'), 'CPM y CPC en verde');
    mover(100000);
    assert.ok(celdas().every((t) => t !== '—' && t !== 'Apagado'), 'Todas las celdas alcanzadas');
    assert.ok(celdas()[2].includes('Dejar gastar el día'), 'Corte 3 deja gastar el día');
    // El mismo CPM en TikTok sale rojo.
    document.querySelector('#ts-sx-f-plat [data-plat="tiktok"]').click();
    assert.ok(eslabon('cpm').classList.contains('ts-r'), 'CPM de 12.000 en TikTok es rojo');
    document.querySelector('#ts-sx-f-plat [data-plat="meta"]').click();
    conSemilla(1, () => document.querySelector('#ts-sx-scen [data-scen="page"]').click());
    mover(40000);
    assert.ok(eslabon('cppi').classList.contains('ts-g') && document.querySelector('#ts-sx-chain .ts-read').dataset.read === 'cppi', 'La página no convierte: buen CPPI y la lectura de la página');
    escribir('ctr', '101');
    assert.ok(!document.querySelector('#ts-sx-chain [data-link]') && celdas().length === 0, 'Con un campo malo no hay cadena ni historial');
    assert.ok(document.querySelector('#ts-sx-play').disabled, 'Sin números válidos no se puede correr');
    escribir('ctr', '2');

    // ▶ con tics de 120 ms (el temporizador se captura para llamarlo a mano).
    const play = () => document.querySelector('#ts-sx-play');
    const reales = { si: window.setInterval, ci: window.clearInterval, mm: window.matchMedia };
    let tic = null, limpiados = 0, periodo = null;
    window.setInterval = (f, ms) => { tic = f; periodo = ms; return 7; };
    window.clearInterval = () => { limpiados++; tic = null; };
    window.matchMedia = () => ({ matches: false });
    conSemilla(1, () => document.querySelector('#ts-sx-scen [data-scen="win"]').click());
    assert.strictEqual(play().textContent, '▶ Correr', 'Antes de correr dice Correr');
    play().click();
    assert.ok(TS.simRun.playing && periodo === 120 && play().textContent === '⏸ Pausa', 'Corre con tics de 120 ms y el botón pasa a Pausa');
    tic(); tic();
    assert.strictEqual(TS.simRun.spend, 2000, 'Cada tic suma 1.000');
    play().click();
    assert.ok(!TS.simRun.playing && limpiados === 1 && play().textContent === 'Continuar ▶', '⏸ pausa a mitad');
    play().click();
    for (let n = 0; n < 18; n++) tic();
    assert.ok(TS.simRun.spend === 20000 && !TS.simRun.playing, 'Se pausa en el corte 1 (20.000)');
    assert.ok(text('#ts-sx-out').includes('Así lo califica el Lab') && play().textContent === 'Continuar ▶' && celdas()[0] !== '—', 'y muestra el veredicto de ese punto');
    play().click();
    for (let n = 0; n < 10; n++) tic();
    assert.ok(TS.simRun.spend === 30000 && !TS.simRun.playing, '"Continuar ▶" sigue hasta el corte 2 (30.000)');
    // Cambiar de modo, de entrada o de parte detiene la corrida.
    play().click();
    assert.ok(TS.simRun.playing);
    document.querySelector('#ts-sx-modes [data-mode="manual"]').click();
    assert.ok(!TS.simRun.playing, 'Cambiar de modo detiene la corrida');
    document.querySelector('#ts-sx-modes [data-mode="chain"]').click();
    play().click();
    escribir('cpm', '12000');
    assert.ok(!TS.simRun.playing, 'Cambiar una entrada detiene la corrida');
    play().click();
    document.querySelector('#ts-parts [data-part="test"]').click();
    assert.ok(!TS.simRun.playing, 'Cambiar de parte detiene la corrida');
    document.querySelector('#ts-parts [data-part="sim"]').click();
    play().click();
    document.dispatchEvent(new window.CustomEvent('nav:vista', { detail: { v: 'metricas' } }));
    assert.ok(!TS.simRun.playing, 'Salir de la pestaña detiene la corrida');
    // ⏮ vuelve a 0 con la misma semilla; 🎲 otra semilla con las mismas entradas.
    const semilla = TS.simRun.seed, entradas = JSON.stringify(TS.sim);
    document.querySelector('#ts-sx-reset').click();
    assert.ok(TS.simRun.spend === 0 && TS.simRun.seed === semilla && play().textContent === '▶ Correr', '⏮ vuelve a 0 con la misma semilla');
    conSemilla(9, () => document.querySelector('#ts-sx-again').click());
    assert.ok(TS.simRun.seed === 9 && TS.simRun.spend === 0 && JSON.stringify(TS.sim) === entradas, '🎲 cambia la semilla y deja las entradas');
    // Con prefers-reduced-motion, ▶ salta de corte en corte sin tics.
    window.matchMedia = () => ({ matches: true });
    tic = null;
    play().click();
    assert.ok(!TS.simRun.playing && tic === null && TS.simRun.spend === 20000, 'Salta directo al corte 1 sin animar');
    play().click(); assert.strictEqual(TS.simRun.spend, 30000);
    play().click(); assert.strictEqual(TS.simRun.spend, 40000);
    play().click(); assert.strictEqual(TS.simRun.spend, 100000, 'y al fin del día');
    assert.ok(play().disabled, 'Al final no se puede seguir');
    // Apagar: ▶ se detiene en el corte que apaga y no sigue.
    window.matchMedia = () => ({ matches: false });
    conSemilla(4, () => document.querySelector('#ts-sx-scen [data-scen="cpm"]').click());
    play().click();
    for (let n = 0; n < 20; n++) if (tic) tic();
    assert.ok(TS.simRun.spend === 20000 && !TS.simRun.playing && play().disabled && text('#ts-sx-out').includes('Apagado en el corte 1'), 'Al apagar la corrida se detiene y no continúa');
    Object.assign(window, { setInterval: reales.si, clearInterval: reales.ci, matchMedia: reales.mm });
    document.querySelector('#ts-parts [data-part="test"]').click();
    paso(0);
  }

  // 10b. Simulador · Números a mano (SPEC 11): lo mismo que "Juega con los números", ahora dentro del Simulador.
  Object.assign(PYL.app.state.testing.free, { daily: 100000, spend: 0, pi: 0, sales: 0, tope: 15000 });
  document.querySelector('#ts-parts [data-part="sim"]').click();
  document.querySelector('#ts-sx-modes [data-mode="manual"]').click();
  assert.strictEqual(document.querySelector('#ts-sx-modes [data-mode="manual"]').getAttribute('aria-pressed'), 'true');
  assert.strictEqual(PYL.app.state.testing.sim.mode, 'manual', 'Se cambia de modo');
  assert.strictEqual(document.querySelectorAll('#ts-simu #ts-f-spend-r, #ts-simu #ts-zones, #ts-simu #ts-free-bar, #ts-simu #ts-free-out').length, 4, 'Números a mano conserva sus ids dentro del Simulador');
  assert.deepStrictEqual(['daily', 'tope'].map((k) => document.querySelector('#ts-f-' + k).value), ['100000', '15000'], 'Arranca con 100.000 y tope 15.000');
  assert.ok(text('#ts-zones').includes('$ 12.000') && text('#ts-zones').includes('$ 20.000'), 'Zonas del tope genérico');
  const ponerSx = (id, v) => { const x = document.querySelector('#ts-f-' + id); x.value = v; x.dispatchEvent(new window.Event('input', { bubbles: true })); };
  const lit = () => [...document.querySelectorAll('#ts-simu .ts-ex[data-branch]')].map((n) => n.dataset.branch);
  ponerSx('spend', '15000');
  assert.ok(text('#ts-free-out').includes('Deja correr sin tocar') && !lit().length, 'Antes del corte 1');
  ponerSx('spend', '25000'); ponerSx('pi', '2');
  assert.ok(text('#ts-free-out').includes('Apagar') && text('#ts-free-out').includes('Apágalo y revisa la cadena'), 'Apagar en el corte 1');
  assert.deepStrictEqual(lit(), ['c1-off'], 'La tarjeta del veredicto lleva la rama');
  ponerSx('spend', '30000'); ponerSx('pi', '5');
  assert.deepStrictEqual(lit(), ['c2-nosale-weak'], 'Bastante flojo con CPPI 6.000');
  ponerSx('spend', '40000'); ponerSx('pi', '12'); ponerSx('sales', '3');
  assert.ok(text('#ts-free-out').includes('Dejar gastar el día'), 'Dejar gastar con tope 15.000');
  ponerSx('tope', '12000');
  assert.ok(text('#ts-free-out').includes('Regla propia') && lit()[0] === 'c3-own', 'Regla propia con tope 12.000');
  ponerSx('tope', '20000'); ponerSx('pi', '10'); ponerSx('sales', '2'); ponerSx('daily', '30000');
  assert.ok(text('#ts-free-out').includes('dejó de ser testeo') && text('#ts-free-out').includes('pestaña Escalado') && !lit().length, 'Aviso dejó de ser testeo, sin tarjeta de veredicto');
  ponerSx('sales', '3'); ponerSx('pi', '1');
  assert.ok(text('#ts-free-out').includes('Las ventas no pueden ser más que los pagos iniciados') && !lit().length, 'Aviso y sin veredicto');
  document.querySelector('#ts-sx-modes [data-mode="chain"]').click();
  assert.ok(!document.querySelector('#ts-free-out') && !!document.querySelector('#ts-sx-spend'), 'Volver a Cadena quita los campos de Números a mano y deja los de la cadena');
  document.querySelector('#ts-parts [data-part="test"]').click();
  paso(0);

  // 11. Escalado · Práctica (paso 6).
  paso(5);
  assert.strictEqual(document.querySelectorAll('#ts-step .ts-cuts .ts-vd').length, 13, 'El mapa del paso 6 muestra el veredicto en las 13 ramas');
  const run = () => PYL.app.state.testing.run, vista = () => PYL.core.testing.practiceView(run());
  assert.ok(document.querySelector('#ts-adv') && text('#ts-adv') === 'Empecemos →' && document.querySelector('#ts-adv').classList.contains('ts-go') && !document.querySelector('#ts-to-sim').classList.contains('ghost') && !document.querySelector('.ts-dec'), 'Antes de avanzar solo está "Avanzar"');
  assert.strictEqual(document.querySelector('#ts-mode .ts-bar-fill').dataset.spend, '0', 'La barra parte en 0');
  document.querySelector('#ts-adv').click();
  assert.strictEqual(document.querySelectorAll('#ts-mode .ts-dec').length, 4, 'Cuatro botones de decisión');
  assert.deepStrictEqual([...document.querySelectorAll('#ts-mode .ts-dec b')].map((b) => b.textContent), ['Apagar', 'Mantener vigilando', 'Seguir sin tocar', 'Dejar gastar el día']);
  assert.ok(['Gasto', 'Pagos iniciados', 'Ventas', 'CPPI', 'CPA', 'CPM', 'Tope'].every((n) => text('#ts-mode .ts-stats').includes(n)), 'Se ven los números del caso');
  assert.strictEqual(document.querySelector('#ts-mode .ts-bar-fill').dataset.spend, String(vista().to), 'La barra llega al corte');
  assert.ok(!document.querySelector('#ts-fb') && !document.querySelector('#ts-step .ts-on'), 'Sin decisión no hay explicación ni rama iluminada');
  // Decisión equivocada: fallo, la correcta, explicación y rama iluminada; "Ver el paso" abre el paso del corte.
  const v0 = vista(), mala = ['off', 'watch', 'go', 'spend'].find((k) => k !== v0.verdict.action);
  document.querySelector('#ts-mode .ts-dec[data-action="' + mala + '"]').click();
  assert.ok(text('#ts-fb').includes('No era esa') && text('#ts-fb').includes('Así lo califica el Lab de NovaSociety') && text('#ts-fb').includes(v0.verdict.veredicto), 'Fallo con explicación');
  assert.strictEqual(document.querySelectorAll('#ts-mode .ts-wrong').length, 1);
  assert.strictEqual(document.querySelector('#ts-mode .ts-right').dataset.action, v0.verdict.action, 'Marca la correcta');
  assert.strictEqual(document.querySelector('#ts-step .ts-on').dataset.branch, v0.verdict.branch, 'Se ilumina la rama');
  assert.ok([...document.querySelectorAll('#ts-mode .ts-dec')].every((b) => b.disabled), 'Ya no se puede decidir de nuevo');
  document.querySelector('#ts-see').click();
  assert.ok(text('#ts-step').includes('Paso ' + v0.verdict.step + ' de 6'), '"Ver el paso" abre el paso del corte');
  paso(5);
  assert.ok(document.querySelector('#ts-fb'), 'Al volver, la ronda sigue donde estaba');
  // Resto de la ronda acertando: termina con 27 de 28 (96 %); el mejor puntaje queda guardado.
  let guarda = 0, notaVista = false;
  while (!document.querySelector('#ts-end') && guarda++ < 100) {
    if (document.querySelector('#ts-adv')) document.querySelector('#ts-adv').click();
    else if (document.querySelector('#ts-fb')) {
      if (vista().note) { notaVista = true; assert.ok(text('#ts-fb').includes('la cadena sigue funcionando'), 'La nota del caso sale tras decidir'); }
      else assert.ok(!text('#ts-fb').includes('la cadena sigue funcionando'), 'Sin nota en los demás casos');
      document.querySelector('#ts-next').click();
    }
    else document.querySelector('#ts-mode .ts-dec[data-action="' + vista().verdict.action + '"]').click();
  }
  assert.ok(notaVista, 'La nota de c11 salió en algún momento');
  assert.ok(text('#ts-end').includes('27 de 28 decisiones acertadas') && text('#ts-end').includes('(96 %)') && text('#ts-end').includes('Mejor puntaje: 96 %'), 'Fin de la ronda');
  assert.strictEqual(PYL.app.state.testing.best, 96, 'El mejor puntaje queda en el estado');
  document.querySelector('#ts-again').click();
  assert.ok(document.querySelector('#ts-adv') && !document.querySelector('#ts-end') && run().total === 0, 'Otra ronda empieza de cero');
  assert.strictEqual(PYL.app.state.testing.best, 96, 'El mejor puntaje se mantiene');
  assert.deepStrictEqual([...run().order].sort(), [...PYL.core.testing.TEST_CASES.map((c) => c.id)].sort(), 'La ronda pasa por los 11 casos');
  paso(0);

  // 8. Rastros de la SPEC 08 (SPEC 09): Estrategias solo VDO y Por proveedor, 'auto' guardado cae en VDO y pyl-auto se borra.
  // En jsdom con file:// no hay localStorage: se arma otra página con uno simulado.
  const store = { 'pyl-search': JSON.stringify({ strat: 'auto' }), 'pyl-auto': '{"hist":[]}',
    'pyl-testing': JSON.stringify({ part: 'test', test: { active: 3, done: ['arranque', 'corte1'] }, mode: 'free', best: 80, free: { daily: 30000, spend: 25000, pi: 4, sales: 1, tope: 18000 } }) };
  const fresca = () => JSDOM.fromFile(path.join(__dirname, '..', 'index.html'), {
    runScripts: 'dangerously', resources: new Loader(), pretendToBeVisual: true, virtualConsole,
    beforeParse(w) {
      Object.defineProperty(w, 'localStorage', { configurable: true, value: {
        getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; },
      } });
    },
  }).then((d) => new Promise((ok) => { if (d.window.document.readyState === 'complete') ok(d); else d.window.addEventListener('load', () => ok(d)); }));

  // 9. Prompt DropKiller (SPEC 09): botón flotante y panel en Buscar producto.
  const dkTest = async () => {
    let copiado = null;
    Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { copiado = t; } } });
    const $ = (q) => document.querySelector(q);
    const poner = (id, v) => { const x = $(id); x.value = v; x.dispatchEvent(new window.Event('input', { bubbles: true })); };
    assert.ok($('#v-buscar #dk-btn') && $('#qk-root').nextElementSibling === $('#dk-root'), '#dk-root va dentro de #v-buscar, justo después de #qk-root');
    assert.ok(!$('#v-desarrollo #dk-btn') && document.querySelectorAll('[id="dk-btn"]').length === 1, 'Un solo botón, solo en Buscar producto');
    assert.ok($('#dk-btn svg') && $('#dk-btn').title === 'Prompt DropKiller', 'El botón lleva el ícono SVG y su título');
    assert.ok($('#dk-panel').hidden, 'El panel empieza cerrado');
    $('#dk-btn').click();
    assert.ok(!$('#dk-panel').hidden && $('#dk-btn').getAttribute('aria-expanded') === 'true', 'El botón abre el panel');
    assert.ok($('#dk-prompt').readOnly && $('#dk-prompt').value === '' && $('#dk-prompt').placeholder.includes('Generar prompt'), 'El prompt empieza vacío');
    $('#dk-copy').click();
    assert.ok(/Primero toca/.test($('#toast').textContent) && copiado === null, 'Copiar sin generar avisa y no copia');
    assert.ok($('#dk-f-tot-max').closest('.dk-cell').querySelector('.dk-hint').textContent.includes('3.000'), 'Aviso de tolerancia de 3.000 ventas totales');
    assert.strictEqual($('#dk-f-cat').placeholder, 'Todos (Salud, Belleza y bienestar primero)', 'Placeholder de Categoría');
    $('#dk-gen').click();
    const base = $('#dk-prompt').value;
    assert.ok(base.includes('máximo de 2.000') && base.includes('últimos 7 días') && base.includes('7. Categoría: TODAS') && base.includes('PERO cumple el perfil del punto 8'), 'Generar arma el prompt con los valores por defecto');
    assert.deepStrictEqual([$('#dk-f-tot-min').placeholder, $('#dk-f-tot-max').placeholder, $('#dk-f-rec-min').placeholder, $('#dk-f-rec-max').placeholder], ['100', '2.000', '10', '100'], 'Placeholders por defecto');
    // Cambiar un campo no cambia el prompt hasta volver a generar.
    poner('#dk-f-tot-max', '1500');
    assert.strictEqual($('#dk-prompt').value, base, 'El prompt no cambia solo');
    $('#dk-gen').click();
    assert.ok($('#dk-prompt').value.includes('máximo de 1.500'), 'Generar usa lo escrito');
    // 30 días: cambian los placeholders de Ventas recientes y el texto; lo escrito no se toca.
    poner('#dk-f-rec-min', '12');
    $('#dk-f-rec-30').click();
    assert.deepStrictEqual([$('#dk-f-rec-min').placeholder, $('#dk-f-rec-max').placeholder], ['100', '500'], 'Placeholders de 30 días');
    assert.strictEqual($('#dk-f-rec-min').value, '12', 'Lo ya escrito no se toca');
    $('#dk-gen').click();
    assert.ok($('#dk-prompt').value.includes('entre 12 y 500 ventas en los últimos 30 días') && $('#dk-prompt').value.includes('Totales/30 días'));
    $('#dk-f-age-6').click(); $('#dk-gen').click();
    assert.ok($('#dk-prompt').value.includes('Creados de 6 meses para acá'), '6 meses');
    // Error: marca el campo, mensaje bajo el par y el prompt no cambia.
    const antes = $('#dk-prompt').value;
    poner('#dk-f-stock-max', '50'); $('#dk-gen').click();
    assert.ok($('#dk-f-stock-min').classList.contains('dk-bad') && $('#dk-f-stock-min').getAttribute('aria-invalid') === 'true' && $('#dk-f-stock-max').classList.contains('dk-bad'), 'Los dos campos del par se marcan');
    assert.ok($('#dk-err-stock').textContent.includes('mínimo es mayor'), 'Mensaje bajo el par');
    assert.strictEqual($('#dk-prompt').value, antes, 'Con error el prompt se queda con el último texto válido');
    poner('#dk-f-stock-max', '');
    assert.strictEqual($('#dk-f-stock-max').placeholder, 'Sin máximo');
    assert.ok(!$('#dk-f-stock-min').classList.contains('dk-bad') && !$('#dk-err-stock').textContent && $('#dk-f-stock-min').getAttribute('aria-invalid') !== 'true', 'Corregir quita la marca');
    // Categoría escrita.
    poner('#dk-f-cat', 'Belleza'); $('#dk-gen').click();
    assert.ok($('#dk-prompt').value.includes('7. Categoría: Belleza.'));
    // Copiar avisa en #toast y copia el texto.
    $('#dk-copy').click();
    await new Promise((ok) => setTimeout(ok, 20));
    assert.strictEqual(copiado, $('#dk-prompt').value, 'Copia el prompt');
    assert.ok($('#toast').classList.contains('show') && /copi/i.test($('#toast').textContent), 'Avisa en #toast');
    // Abrir uno cierra el otro.
    $('#qk-btn').click();
    assert.ok($('#dk-panel').hidden && !$('#qk-panel').hidden, 'Abrir Guardado rápido cierra el de DropKiller');
    $('#dk-btn').click();
    assert.ok(!$('#dk-panel').hidden && $('#qk-panel').hidden, 'Abrir DropKiller cierra el Guardado rápido');
    // Esc, ✕ y volver a tocar el botón cierran.
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.ok($('#dk-panel').hidden, 'Esc cierra');
    assert.strictEqual($('#dk-prompt').value, '', 'Al cerrar, el cuadro del prompt queda limpio');
    $('#dk-btn').click();
    assert.strictEqual($('#dk-prompt').value, '', 'Al reabrir sigue limpio');
    $('#dk-gen').click(); $('#dk-btn').click();
    assert.strictEqual($('#dk-prompt').value, '', 'Cerrar con el botón también limpia'); $('#dk-btn').click(); $('#dk-btn').click();
    $('#dk-btn').click(); $('#dk-x').click();
    assert.ok($('#dk-panel').hidden, '✕ cierra');
    $('#dk-btn').click(); $('#dk-btn').click();
    assert.ok($('#dk-panel').hidden, 'Tocar el botón otra vez cierra');
    assert.strictEqual(PYL.app.state.dkprompt.open, false);
  };

  // 10. Prompt buscar anuncios: botón flotante verde y panel en Desarrollo.
  const apTest = async () => {
    let copiado = null;
    Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { copiado = t; } } });
    const $ = (q) => document.querySelector(q);
    const poner = (id, v) => { const x = $(id); x.value = v; x.dispatchEvent(new window.Event('input', { bubbles: true })); };
    assert.ok($('#v-desarrollo #ap-root #ap-btn') && !$('#v-buscar #ap-btn'), 'El botón va solo en Desarrollo');
    assert.ok($('#ap-btn svg') && $('#ap-btn').title === 'Prompt buscar anuncios' && $('#ap-panel').hidden, 'Ícono, título y panel cerrado');
    $('#ap-btn').click();
    assert.ok(!$('#ap-panel').hidden && $('#ap-btn').getAttribute('aria-expanded') === 'true', 'El botón abre el panel');
    assert.deepStrictEqual([$('#ap-f-days').placeholder, $('#ap-f-seen').placeholder, $('#ap-f-country').placeholder], ['Mínimo 7 días', 'Últimos 7 días', 'Colombia'], 'Placeholders');
    assert.ok(!$('#ap-f-name').classList.contains('dk-bad'), 'El nombre vacío no se marca al abrir');
    // Sin nombre: generar marca el campo y no arma nada.
    $('#ap-gen').click();
    assert.ok($('#ap-f-name').classList.contains('dk-bad') && $('#ap-err-name').textContent.includes('nombre') && $('#ap-prompt').value === '', 'Nombre obligatorio');
    // Importar: sin candidato avisa; con candidato trae nombre e imagen.
    const draft = PYL.app.state.search.draft, antes = { name: draft.name, photo: draft.photo };
    draft.name = ''; delete draft.photo;
    $('#ap-import').click();
    assert.ok(/No hay producto/.test($('#toast').textContent) && $('#ap-f-name').value === '', 'Importar sin candidato avisa');
    draft.name = 'Faja Térmica'; draft.photo = 'data:image/png;base64,AAAA';
    $('#ap-import').click();
    assert.strictEqual($('#ap-f-name').value, 'Faja Térmica', 'Importa el nombre');
    assert.ok(!$('#ap-photo img').hidden && $('#ap-photo img').getAttribute('src') === draft.photo && !$('#ap-f-name').classList.contains('dk-bad'), 'Importa la imagen y quita la marca');
    draft.name = antes.name; if (antes.photo) draft.photo = antes.photo; else delete draft.photo;
    $('#ap-gen').click();
    const base = $('#ap-prompt').value;
    assert.ok(base.includes('producto: Faja Térmica.') && base.includes('Mínimo 7 días') && base.includes('Últimos 7 días') && base.includes('EXCLUIR Colombia (buscar USA, España, LATAM)'), 'Genera con los valores por defecto');
    assert.ok(!base.includes('data:image'), 'El prompt es solo texto');
    // Lo escrito no cambia el prompt hasta volver a generar; un número inválido lo deja como estaba.
    poner('#ap-f-days', '14'); poner('#ap-f-country', 'México');
    assert.strictEqual($('#ap-prompt').value, base, 'El prompt no cambia solo');
    $('#ap-gen').click();
    assert.ok($('#ap-prompt').value.includes('Mínimo 14 días') && $('#ap-prompt').value.includes('EXCLUIR México'), 'Generar usa lo escrito');
    const ok = $('#ap-prompt').value;
    poner('#ap-f-seen', '0'); $('#ap-gen').click();
    assert.ok($('#ap-f-seen').classList.contains('dk-bad') && $('#ap-err-seen').textContent && $('#ap-prompt').value === ok, 'Con error se queda el último prompt válido');
    poner('#ap-f-seen', '');
    $('#ap-copy').click();
    await new Promise((r) => setTimeout(r, 20));
    assert.strictEqual(copiado, ok, 'Copia el prompt');
    // Quitar la imagen, Esc y ✕.
    $('#ap-root .qk-photo-rm').click();
    assert.ok($('#ap-photo img').hidden && PYL.app.state.adprompt.photo === '', 'Quita la imagen');
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.ok($('#ap-panel').hidden && $('#ap-prompt').value === '', 'Esc cierra y limpia el prompt');
    $('#ap-btn').click();
    assert.strictEqual($('#ap-f-name').value, 'Faja Térmica', 'Los campos se conservan');
    $('#dk-btn').click();
    assert.ok($('#ap-panel').hidden && !$('#dk-panel').hidden, 'Abrir otro flotante cierra este');
    // Limpiar deja todo en blanco: campos, imagen, prompt y marcas.
    $('#dk-x').click(); $('#ap-btn').click();
    PYL.app.state.adprompt.photo = 'data:image/png;base64,AAAA';
    poner('#ap-f-seen', '0'); poner('#ap-f-seen', '3'); $('#ap-gen').click();
    assert.ok($('#ap-prompt').value.includes('Últimos 3 días') && !$('#ap-photo img').hidden);
    $('#ap-clear').click();
    assert.deepStrictEqual(['#ap-f-name', '#ap-f-days', '#ap-f-seen', '#ap-f-country', '#ap-prompt'].map((q) => $(q).value), ['', '', '', '', ''], 'Limpiar vacía campos y prompt');
    assert.ok($('#ap-photo img').hidden && PYL.app.state.adprompt.photo === '' && !$('#ap-f-name').classList.contains('dk-bad') && !$('#ap-panel').hidden, 'Limpiar quita la imagen, no marca el nombre y deja el panel abierto');
    $('#ap-x').click();
    assert.ok($('#ap-panel').hidden && PYL.app.state.adprompt.open === false, '✕ cierra');
  };

  return dkTest().then(apTest).then(fresca).then((d2) => {
    const doc2 = d2.window.document;
    assert.deepStrictEqual([...doc2.querySelectorAll('#b-strats .st-tab')].map((b) => b.textContent.length > 0), [true, true], 'Estrategias muestra solo 2 tarjetas');
    assert.deepStrictEqual([...d2.window.PYL.core.search.STRATEGIES.map((x) => x.k)], ['vdo', 'prov'], 'STRATEGIES = vdo y prov');
    assert.ok(!doc2.querySelector('#b-st-auto') && !doc2.querySelector('[id^="hu-"]'), 'No existe #b-st-auto ni #hu-');
    assert.ok(!doc2.querySelector('#b-st-vdo').hidden && doc2.querySelector('#b-st-prov').hidden, "strat 'auto' guardado abre VDO");
    assert.ok(!('pyl-auto' in store), 'Se borra pyl-auto una sola vez al cargar');
    assert.ok('pyl-search' in store, 'No se toca pyl-search');
    // SPEC 10: un pyl-testing sin v: 2 reinicia solo el mejor puntaje y se guarda con v: 2.
    const T2 = d2.window.PYL.app.state.testing, g = JSON.parse(store['pyl-testing']);
    assert.strictEqual(T2.best, null, 'El mejor puntaje viejo se reinicia');
    assert.deepStrictEqual(JSON.parse(JSON.stringify([T2.test.active, T2.test.done, T2.free])), [3, ['arranque', 'corte1'], { daily: 30000, pi: 4, sales: 1, spend: 25000, tope: 18000 }], 'Pasos y números se conservan; el modo guardado se ignora');
    assert.deepStrictEqual([g.v, g.best, g.test.done.length, g.mode], [d2.window.PYL.core.testing.TEST_VERSION, null, 2, undefined], 'Se guarda con la versión actual (3) y best null, sin el modo');
    assert.deepStrictEqual(g.sim, JSON.parse(JSON.stringify(d2.window.PYL.core.simulator.SIM_DEFAULTS)), 'Sin sim guardado se usan los defectos y se guardan');
    assert.ok(!('simRun' in g) && !('run' in g), 'No se guarda la corrida');
    d2.window.close();
  }).then(() => {
    // SPEC 11: un pyl-testing v: 2 conserva el mejor puntaje, ignora el modo viejo, valida sim y se guarda con v: 3.
    store['pyl-testing'] = JSON.stringify({ v: 2, part: 'sim', test: { active: 1, done: [] }, mode: 'free', best: 80,
      free: { daily: 30000, spend: 0, pi: 0, sales: 0, tope: 18000 },
      sim: { mode: 'manual', plat: 'tiktok', daily: 30000, tope: 18000, cpm: 9000, ctr: 1.5, toPi: 25, toSale: 'x' } });
    return fresca();
  }).then((d3) => {
    const W = d3.window, T3 = W.PYL.app.state.testing, doc3 = W.document, g3 = () => JSON.parse(store['pyl-testing']);
    assert.strictEqual(T3.best, 80, 'Con v: 2 el mejor puntaje se conserva');
    assert.strictEqual(g3().v, 3, 'y se guarda con v: 3');
    assert.strictEqual(g3().best, 80);
    assert.strictEqual(T3.part, 'sim', 'Un part: sim guardado abre el Simulador');
    assert.ok(!doc3.querySelector('#ts-simu').hidden && doc3.querySelector('#ts-test').hidden && doc3.querySelector('#ts-parts [aria-pressed=\"true\"]').dataset.part === 'sim', 'y se ve');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(T3.sim)), { mode: 'manual', plat: 'tiktok', daily: 30000, tope: 18000, cpm: 9000, ctr: 1.5, toPi: 25, toSale: W.PYL.core.simulator.SIM_DEFAULTS.toSale }, 'sim se carga y el campo inválido cae en su defecto');
    assert.ok(doc3.querySelector('#ts-free-out') && !doc3.querySelector('#ts-sx-spend'), 'Abre en el modo guardado (Números a mano)');
    // Cambiar de modo y de entrada se guarda; la corrida no.
    doc3.querySelector('#ts-sx-modes [data-mode=\"chain\"]').click();
    assert.strictEqual(g3().sim.mode, 'chain');
    const cpm = doc3.querySelector('#ts-sx-f-cpm'); cpm.value = '15.000'; cpm.dispatchEvent(new W.Event('input', { bubbles: true }));
    assert.strictEqual(g3().sim.cpm, 15000, 'Una entrada nueva se guarda');
    doc3.querySelector('#ts-sx-f-plat [data-plat=\"meta\"]').click();
    assert.strictEqual(g3().sim.plat, 'meta');
    assert.deepStrictEqual(Object.keys(g3()).sort(), ['best', 'free', 'part', 'sim', 'test', 'v'], 'Solo se guardan v, part, test, best, free y sim');
    W.close();
  }).then(() => new Promise((ok) => setTimeout(ok, 200))).then(() => {
    assert.ok(ladder.classList.contains('grown'), 'La escalera debe terminar crecida');
    // 7. Consola limpia salvo scrollTo.
    const malos = errores.filter((m) => !esperado(m));
    assert.deepStrictEqual(malos, [], 'Errores en consola:\n' + malos.join('\n'));

    console.log(`OK smoke: ${Object.values(actual).flat().length} claves en PYL, ${tabs.length} pestañas, navegación, guía Hard Metrics y consola limpia`);
    window.close();
  });
}).catch((e) => { console.error('FALLO smoke:', e.message); process.exit(1); });
