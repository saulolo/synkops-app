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

  // 2. Las 9 pestañas abren su vista y marcan aria-current.
  const tabs = [...document.querySelectorAll('#tabs button')];
  assert.strictEqual(tabs.length, 9, 'Debe haber 9 pestañas');
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
  assert.ok(tipNode.textContent.includes('Meta: 2 %') && !tipNode.textContent.includes('TikTok'), 'El CTR de Meta muestra solo el límite de Meta');
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
  assert.ok(orden.indexOf('hm-map') < orden.indexOf('cadena-decide'), 'Orden: diagrama y debajo la cadena que decide todo');
  assert.ok(text('#hm-soft h2') === 'Soft Metrics' && text('#hm-soft .tag') === 'Pronto', 'Soft Metrics queda reservado como pronto');
  assert.strictEqual(document.querySelector('#hm-soft').previousElementSibling.id, 'hm-map', 'Va justo debajo del diagrama de Hard Metrics');
  assert.ok(document.querySelector('#hm-soft').nextElementSibling.querySelector('.chain-info'), 'Y la cadena que decide todo queda después');
  assert.strictEqual(document.querySelector('#hm-chain'), null, 'Ya no existe la tarjeta del efecto de desencadenamiento');
  assert.strictEqual(document.querySelectorAll('[data-plat], #mtBody, [data-test]').length, 0, 'Ya no existe la tabla vieja ni el probador "Mi dato"');

  return new Promise((ok) => setTimeout(ok, 200)).then(() => {
    assert.ok(ladder.classList.contains('grown'), 'La escalera debe terminar crecida');
    // 7. Consola limpia salvo scrollTo.
    const malos = errores.filter((m) => !esperado(m));
    assert.deepStrictEqual(malos, [], 'Errores en consola:\n' + malos.join('\n'));

    console.log(`OK smoke: ${Object.values(actual).flat().length} claves en PYL, ${tabs.length} pestañas, navegación, guía Hard Metrics y consola limpia`);
    window.close();
  });
}).catch((e) => { console.error('FALLO smoke:', e.message); process.exit(1); });
