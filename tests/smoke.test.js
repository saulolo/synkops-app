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

  // 1a. SPEC 17: favicon propio (pulso dorado) en img/favicon.svg.
  {
    const ico = document.querySelector('head link[rel="icon"]');
    assert.ok(ico && ico.getAttribute('href') === 'img/favicon.svg' && ico.getAttribute('type') === 'image/svg+xml', 'El <head> trae el favicon');
    assert.ok(require('fs').existsSync(path.join(__dirname, '..', 'img', 'favicon.svg')), 'El archivo del favicon existe');
    // SPEC 20: la marca (logo, «Synkops» y lema) salió de la barra; bajo el título «Synkops» de Inicio va un pulso subrayado.
    assert.ok(!document.querySelector('.brand-mark') && !document.querySelector('.brand'), 'Ya no existe la marca de la barra (.brand ni .brand-mark)');
    assert.deepStrictEqual([...document.querySelector('header.top .top-in').children].map((n) => n.id || n.className), ['ck-root', 'top-row'], 'La barra: reloj y la fila del contenido');
    assert.deepStrictEqual([...document.querySelector('.top-in > .top-row').children].map((n) => n.id || n.className), ['pillProd', 'theme-pick', 'tabs'], 'La fila: píldora del producto activo, tema y pestañas (mide lo mismo que las pestañas)');
    const h1 = document.querySelector('#v-dash .hero h1');
    const pulse = h1.querySelector('svg.hero-pulse');
    assert.ok(pulse && pulse.getAttribute('aria-hidden') === 'true' && h1.lastElementChild === pulse && h1.firstChild.nodeType === 3, 'El pulso subrayado va dentro del <h1> del hero, después del texto');
    assert.strictEqual(h1.textContent.trim(), 'Synkops', 'El título se sigue leyendo «Synkops»');
    const d = pulse.querySelector('.hp-base').getAttribute('d');
    assert.ok(d && pulse.querySelector('.hp-run').getAttribute('d') === d, 'Dos trazos del mismo pulso: base y luz que corre');
    assert.strictEqual(pulse.querySelector('.hp-run').getAttribute('pathLength'), '100');
    assert.deepStrictEqual([...pulse.querySelectorAll('stop')].map((s) => s.getAttribute('style')), ['stop-color:var(--b)', 'stop-color:var(--b2)'], 'Degradado del acento del tema');
  }

  // 1b. SPEC 14: services.storage.hub (clave pyl-hub). Sin localStorage (file://) no lanza: load da null y save da false.
  assert.strictEqual(PYL.services.storage.hub.load(), null, 'hub.load sin localStorage');
  assert.strictEqual(PYL.services.storage.hub.save({ v: 1, items: [] }), false, 'hub.save sin localStorage avisa con false');
  // 1b'. SPEC 19: services.storage.tasks (clave pyl-tasks), mismo contrato que hub.
  assert.strictEqual(PYL.services.storage.tasks.load(), null, 'tasks.load sin localStorage');
  assert.strictEqual(PYL.services.storage.tasks.save({ v: 1, note: { days: {} }, collapsed: false }), false, 'tasks.save sin localStorage avisa con false');
  assert.strictEqual(PYL.services.storage.tasks.corrupt('x'), false, 'tasks.corrupt sin localStorage no lanza');

  // 1c. SPEC 20: reloj de pared en el margen izquierdo de la barra (paso 2: la esfera).
  {
    const ck = document.getElementById('ck-root');
    assert.ok(ck && ck.parentElement === document.querySelector('header.top .top-in'), '#ck-root dentro de header.top .top-in');
    assert.ok(ck.classList.contains('ck-rail') && ck.getAttribute('role') === 'img', '.ck-rail con role="img"');
    assert.strictEqual(ck, ck.parentElement.firstElementChild, 'Es el primer hijo de la barra');
    const face = document.getElementById('ck-face');
    assert.ok(face && face.tagName.toLowerCase() === 'svg' && face.getAttribute('viewBox') === '0 0 100 100' && face.getAttribute('aria-hidden') === 'true', 'Esfera SVG 0 0 100 100, oculta al lector');
    assert.strictEqual(face.querySelectorAll('.ck-tick').length, 8, '8 rayitas de hora');
    assert.deepStrictEqual([...face.querySelectorAll('.ck-num')].map((n) => n.textContent), ['12', '3', '6', '9'], 'Números 12, 3, 6 y 9');
    for (const c of ['ck-h', 'ck-m', 'ck-s']) assert.strictEqual(face.querySelectorAll('.' + c).length, 1, 'Aguja .' + c);
    const text = ck.querySelector('.ck-text');
    assert.ok(text && text.getAttribute('aria-hidden') === 'true' && text.contains(document.getElementById('ck-day')) && text.contains(document.getElementById('ck-date')), 'Texto con #ck-day y #ck-date, oculto al lector');
    assert.strictEqual(typeof PYL.app.clock.tick, 'function', 'app.clock.tick publicado para las pruebas');
    // Paso 3: al cargar ya pintó, y con la hora simulada (viernes 20 nov 2026, 10:42:30) marca justo eso.
    assert.ok(document.getElementById('ck-day').textContent && document.getElementById('ck-date').textContent && ck.getAttribute('aria-label'), 'Al cargar ya pintó día, fecha y aria-label');
    PYL.app.clock.tick(new window.Date(2026, 10, 20, 10, 42, 30));
    assert.strictEqual(document.getElementById('ck-day').textContent, 'Viernes');
    assert.strictEqual(document.getElementById('ck-date').textContent, '20 nov');
    assert.strictEqual(ck.getAttribute('aria-label'), 'Viernes, 20 nov · 10:42 a. m.');
    assert.strictEqual(ck.getAttribute('title'), 'Viernes, 20 nov · 10:42 a. m.');
    assert.deepStrictEqual(['ck-h', 'ck-m', 'ck-s'].map((c) => face.querySelector('.' + c).getAttribute('transform')), ['rotate(321.25 50 50)', 'rotate(255 50 50)', 'rotate(180 50 50)'], 'Agujas giradas desde el centro');
    // Los textos solo se reescriben si cambian: el mismo minuto deja el mismo nodo de texto.
    const dayText = document.getElementById('ck-day').firstChild;
    PYL.app.clock.tick(new window.Date(2026, 10, 20, 10, 42, 50));
    assert.strictEqual(document.getElementById('ck-day').firstChild, dayText, 'Mismo día: no reescribe el texto');
    assert.strictEqual(face.querySelector('.ck-s').getAttribute('transform'), 'rotate(300 50 50)', 'El segundero sí se mueve');
    // Medianoche: cambian día y fecha solos.
    PYL.app.clock.tick(new window.Date(2026, 10, 21, 0, 0, 5));
    assert.deepStrictEqual([document.getElementById('ck-day').textContent, document.getElementById('ck-date').textContent, ck.getAttribute('aria-label')], ['Sábado', '21 nov', 'Sábado, 21 nov · 12:00 a. m.'], 'Pasada la medianoche');
    PYL.app.clock.tick(new window.Date());
  }

  // 1d. SPEC 19: Mis tareas · tarjeta y ubicación (paso 6).
  {
    const rail = document.getElementById('tk-rail'), tk = document.getElementById('tk-root');
    const C = PYL.core.tasks, hoy = C.tkDayKey(new window.Date());
    assert.ok(rail && rail.tagName === 'ASIDE' && rail.getAttribute('aria-label') === 'Mis tareas', 'Columna <aside id="tk-rail" aria-label="Mis tareas">');
    assert.ok(rail.parentElement.id === 'v-dash' && tk.parentElement === rail, '#tk-root dentro de #tk-rail, en Inicio');
    assert.ok(tk.classList.contains('card') && tk.classList.contains('mt') && tk.classList.contains('tk'), 'Tarjeta .card.mt.tk');
    assert.strictEqual(rail.nextElementSibling && rail.nextElementSibling.id, 'hb-rail', 'Justo antes del Centro de mando');
    assert.ok(document.querySelector('#v-dash .hero').compareDocumentPosition(rail) & window.Node.DOCUMENT_POSITION_FOLLOWING, 'Después del hero');
    // Título «Mis tareas» arriba de todo, con el h2 de tarjeta de la app.
    // Cabecera arriba de todo: título «Mis tareas» y el engranaje en el extremo derecho. Sin fecha ni Colapsar (siempre expandida).
    const tkTop = tk.firstElementChild;
    const tkH2 = tkTop.firstElementChild;
    assert.ok(tkTop.classList.contains('tk-top') && tkH2.tagName === 'H2' && tkH2.id === 'tk-title' && tkH2.textContent === 'Mis tareas', 'Título «Mis tareas» arriba de todo');
    assert.ok(tkH2.nextElementSibling.contains(document.getElementById('tk-gear')), 'Engranaje a la derecha del título, al extremo');
    assert.ok(!document.getElementById('tk-date') && !document.getElementById('tk-collapse'), 'Sin fecha ni Colapsar');
    assert.deepStrictEqual([...tk.querySelectorAll('.tk-top button:not(.tk-mi)')].map((b) => b.id), ['tk-gear'], 'Sin Siempre encima, Fijar, Minimizar ni Cerrar');
    // Fila de días: «+», Ayer/Hoy/Mañana con su día y Hoy activa; reloj apagado.
    const tabs = [...tk.querySelectorAll('#tk-tabs .tk-tab')];
    assert.deepStrictEqual(tabs.map((t) => t.textContent), ['Ayer', 'Hoy', 'Mañana']);
    assert.deepStrictEqual(tabs.map((t) => t.dataset.day), [C.tkAddDays(hoy, -1), hoy, C.tkAddDays(hoy, 1)], 'Cada pestaña lleva su día');
    assert.deepStrictEqual(tabs.map((t) => [t.classList.contains('is-on'), t.getAttribute('aria-pressed')]), [[false, 'false'], [true, 'true'], [false, 'false']], 'Al cargar la pestaña activa es Hoy');
    assert.ok(document.getElementById('tk-new') && !document.getElementById('tk-history').classList.contains('is-on'), '«+» y reloj apagado');
    // Progreso vacío, lista vacía y pie inerte.
    assert.strictEqual(document.getElementById('tk-count').textContent, '0 de 0 hechas');
    assert.ok(document.getElementById('tk-all').hidden, 'Doble check oculto sin tareas');
    assert.strictEqual(document.querySelectorAll('#tk-list .tk-task').length, 0, 'Lista vacía');
    const foot = [...tk.querySelectorAll('#tk-foot button')];
    assert.deepStrictEqual(foot.map((b) => b.title), ['Negrita', 'Cursiva', 'Subrayado', 'Tachado', 'Lista con viñetas', 'Adjuntar imagen'], 'Pie de formato');
    assert.ok(foot.every((b) => b.getAttribute('aria-disabled') === 'true'), 'Pie inerte (aria-disabled)');
    // Estado inicial.
    const T = PYL.app.state.tasks;
    assert.deepStrictEqual(JSON.parse(JSON.stringify(T)), { note: { days: {} }, day: hoy, adding: false, menu: null, about: false }, 'app.state.tasks arranca vacío en Hoy');
  }

  // 1c. SPEC 18: tarjeta de Inicio (saludo, frase, Synkops, eyebrow, slogan, descripción y dos botones).
  {
    const hero = document.querySelector('#v-dash .hero');
    const txt = (n) => n.textContent.replace(/\s+/g, ' ').trim();
    const hijos = (n) => [...n.children].map((c) => c.id || c.tagName.toLowerCase() + '.' + (c.getAttribute('class') || '').split(' ').pop());
    assert.deepStrictEqual(hijos(hero), ['div.home-band', 'div.', 'svg.hero-art'], 'Franja de ancho completo arriba, luego texto e ilustración');
    assert.deepStrictEqual(hijos(hero.querySelector('.home-band')), ['home-hello', 'home-quote'], 'Saludo y, seguida, la frase');
    assert.deepStrictEqual(hijos(hero.children[1]), ['h1.', 'div.hero-eyebrow', 'p.hero-slogan', 'p.lead', 'div.mt'], 'Orden del texto de la tarjeta');
    assert.ok(!document.getElementById('home-hello').textContent.includes('👋'), 'El saludo va sin emoji');
    assert.strictEqual(document.querySelector('#home-hello .home-name').textContent, 'Saúl', 'El nombre va en su propio renglón, debajo del saludo');
    assert.ok(/^(Buenos días|Buenas tardes|Buenas noches),$/.test(document.querySelector('#home-hello .home-greet').textContent));
    assert.ok(/^(Buenos días|Buenas tardes|Buenas noches), Saúl$/.test(txt(document.getElementById('home-hello'))), 'Saludo según la hora');
    assert.strictEqual(txt(hero.querySelector('h1')), 'Synkops');
    assert.strictEqual(txt(hero.querySelector('.hero-eyebrow')), 'Mi copiloto de ecommerce');
    assert.ok(hero.querySelector('.hero-eyebrow svg'), 'El eyebrow conserva el ícono');
    assert.strictEqual(txt(hero.querySelector('.hero-slogan')), 'Cada peso medido, cada paso conectado');
    assert.ok(hero.querySelector('.hero-slogan').classList.contains('grad'), 'El slogan va con degradado');
    assert.strictEqual(txt(hero.querySelector('.lead')), 'Synkops es el centro de mando de mi ecommerce, donde todo mi negocio vive en un solo lugar. Desde encontrar y costear un producto hasta lanzarlo, testearlo y escalarlo, con el método NovaSociety y mi experiencia propia.');
    const botones = [...hero.querySelectorAll('.row.mt button')];
    assert.deepStrictEqual(botones.map((b) => [txt(b), b.dataset.go, b.className]), [
      ['Empezar por buscar producto', 'buscar', 'btn big'], ['Costear producto', 'costeo', 'btn ghost big']], 'Dos botones nuevos');
    assert.ok(botones.every((b) => b.querySelector('svg')), 'Cada botón trae su ícono');
    for (const b of botones) {
      b.click();
      assert.deepStrictEqual([...document.querySelectorAll('.view.on')].map((v) => v.id), ['v-' + b.dataset.go], `${txt(b)} abre su pestaña`);
    }
    document.querySelector('#tabs [data-v="dash"]').click();
    for (const viejo of ['Mi copiloto de pauta', 'Lectura de campañas', 'Empezar por el costeo', 'Evaluar un conjunto']) {
      assert.ok(!document.body.textContent.includes(viejo), 'Ya no existe: ' + viejo);
    }
  }

  // 2. Las 11 pestañas abren su vista y marcan aria-current.
  const tabs = [...document.querySelectorAll('#tabs button')];
  assert.strictEqual(tabs.length, 11, 'Debe haber 11 pestañas');
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

  // 8c. Logística (SPEC 13): pestaña después de Escalado, encabezado y sub-pestañas.
  assert.deepStrictEqual(tabs.map((b) => b.dataset.v).slice(6, 9), ['escalado', 'logistica', 'escalera'], 'Logística va justo después de Escalado');
  assert.strictEqual(tabs.find((b) => b.dataset.v === 'logistica').textContent, 'Logística');
  assert.strictEqual(text('#v-logistica h1'), 'Logística');
  assert.strictEqual(text('#lg-card-guia h2'), 'Confirmación de Guia', 'Título de la tarjeta');
  assert.ok(text('#v-logistica .eyebrow').includes('Después de la venta · hablo con mis clientes'), 'Eyebrow de Logística');
  assert.ok(text('#v-logistica .lead').includes('seguimiento') && text('#v-logistica .lead').includes('mensajes a clientes'), 'Lead de Logística');
  const lgPartes = [...document.querySelectorAll('#lg-parts [data-part]')];
  assert.deepStrictEqual(lgPartes.map((b) => b.dataset.part), ['msgs', 'track']);
  assert.deepStrictEqual(lgPartes.map((b) => b.textContent), ['💬 Plantillas de mensajes', '📦 Seguimiento de pedidos · pronto']);
  assert.deepStrictEqual(lgPartes.map((b) => b.disabled), [false, true], 'Seguimiento está deshabilitado');
  assert.strictEqual(lgPartes[0].getAttribute('aria-pressed'), 'true');
  assert.ok(!document.querySelector('#lg-msgs').hidden, 'Plantillas de mensajes abre al cargar');
  { // Contenedor «Mensajes a Clientes» (SPEC 15, Parte 11): dentro de #lg-msgs y con todas las tarjetas; deja lugar a otros grupos hermanos.
    const g = document.querySelector('#lg-group-clientes');
    assert.ok(g && g.tagName === 'SECTION' && g.parentElement === document.querySelector('#lg-msgs') && g.closest('#v-logistica'), 'El grupo vive en #lg-msgs');
    assert.strictEqual(g.querySelector('#lg-group-clientes-h').textContent, 'Mensajes a Clientes', 'Título del contenedor');
    assert.strictEqual(g.getAttribute('aria-labelledby'), 'lg-group-clientes-h');
    assert.ok(g.querySelector('#lg-cards') && g.querySelectorAll('#lg-cards > .lg-card').length === 12, 'Las 12 tarjetas están dentro');
    assert.strictEqual(document.querySelectorAll('#lg-cards').length, 1);
    assert.deepStrictEqual([...document.querySelectorAll('#lg-msgs > *')].map((n) => n.id), ['lg-group-clientes', 'lg-group-proveedores'], 'Clientes y, debajo, Proveedores');
    assert.ok(!document.querySelector('#lg-parts + #lg-cards'), '#lg-cards ya no cuelga directo de la pestaña');
  }
  { // Contenedor «Mensajes a Proveedores» (SPEC 16, Parte 1): debajo de Clientes, mismo estilo; las tarjetas se reparten por `group`.
    const msgs = document.querySelector('#lg-msgs'), g = document.querySelector('#lg-group-proveedores');
    assert.ok(g && g.tagName === 'SECTION' && g.parentElement === msgs && g.classList.contains('card') && g.classList.contains('lg-group'), 'Es un <section class="card lg-group"> dentro de #lg-msgs');
    assert.strictEqual(g.previousElementSibling.id, 'lg-group-clientes', 'Va debajo de Clientes');
    assert.strictEqual(g.querySelector('#lg-group-proveedores-h').textContent, 'Mensajes a Proveedores');
    assert.strictEqual(g.getAttribute('aria-labelledby'), 'lg-group-proveedores-h');
    assert.strictEqual(document.querySelectorAll('#lg-cards-prov').length, 1);
    assert.ok(g.querySelector('#lg-cards-prov.lg-cards'), 'Su rejilla es .lg-cards');
    assert.deepStrictEqual([...document.querySelectorAll('#lg-cards-prov > *')].map((n) => n.id), ['lg-card-valida', 'lg-card-privatiza'], 'Validación y Privatización, en ese orden');
    assert.ok(![...document.querySelectorAll('#lg-cards > *')].some((n) => /valida|privatiza/.test(n.id)), 'Las de proveedores no van en #lg-cards');
    assert.strictEqual(document.querySelectorAll('#lg-cards > .lg-card').length, 12, 'Clientes sigue con 12');
    assert.deepStrictEqual([...document.querySelectorAll('#lg-cards-prov .lg-card')].map((c) => c.querySelector('.lg-toggle').getAttribute('aria-expanded')), ['false', 'false'], 'Contraídas al abrir');
    assert.deepStrictEqual([...document.querySelectorAll('#lg-cards-prov .lg-stage')].map((n) => [n.dataset.stage, n.textContent]), [['validar', 'Validar'], ['privatizar', 'Privatizar']]);
  }
  lgPartes[1].click();
  assert.strictEqual(PYL.app.state.logistics.part, 'msgs', 'Un clic en Seguimiento no lo abre');
  assert.ok(!document.querySelector('#lg-msgs').hidden && document.querySelector('#lg-parts [aria-pressed="true"]').dataset.part === 'msgs');

  // 8d. Logística · formulario y prellenado desde Desarrollo (SPEC 13, paso 3).
  {
    const $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
    const lgS = PYL.app.state.logistics, landing = PYL.app.state.landing;
    assert.deepStrictEqual($$('#lg-cards .lg-card').map((c) => [c.id, c.querySelector('h2').textContent]), [['lg-card-pedido', 'Confirmación de Pedidos'], ['lg-card-reconfirma', 'Reconfirmación de Pedido'], ['lg-card-tercero', 'Tercer Intento'], ['lg-card-confirmado', 'Pedido Confirmado'], ['lg-card-guia', 'Confirmación de Guia'], ['lg-card-infografia', 'Envío de Infografía'], ['lg-card-anticipo', 'Solicitud de Anticipo'], ['lg-card-reintento', 'Reintento de Entrega'], ['lg-card-flete', 'Flete Especial'], ['lg-card-enruta', 'Recordatorio En Ruta'], ['lg-card-entregado', 'Pedido Entregado'], ['lg-card-oficina', 'Reclamar en Oficina']], 'Una tarjeta por plantilla, en el orden de LG_TEMPLATES (SPEC 15, Parte 10)');
    assert.ok(!$('#lg-tpls') && !$$('#lg-cards [data-tpl]').some((n) => n.tagName === 'BUTTON'), 'Ya no hay selector de plantilla: cada plantilla es su tarjeta');
    const ids = $$('#lg-cards [id]').map((n) => n.id);
    assert.strictEqual(new Set(ids).size, ids.length, 'Ids únicos entre las tarjetas');
    const campos = ['name', 'product', 'guide', 'carrier', 'price', 'address'];
    assert.deepStrictEqual($$('#lg-guia-form input').map((i) => i.id), campos.map((k) => 'lg-guia-f-' + k), '6 campos en orden, Transportadora después de la guía (el tiempo de entrega es fijo)');
    assert.deepStrictEqual($$('#lg-guia-form label').map((l) => l.textContent), ['Nombre del destinatario', 'Producto', 'Número de guía', 'Transportadora', 'Precio', 'Dirección de entrega']);
    assert.ok(!$('#lg-guia-f-days'), 'No hay campo de tiempo de entrega');
    assert.deepStrictEqual($$('#lg-guia-form input').map((i) => i.placeholder), ['Ej: Pablo', 'Ej: Omegaxl joint support', 'Ej: 074102602224', 'Ej: ENVIA', 'Ej: $ 97.400', 'Ej: Cra 67 # 25 - 34 Itagui - Calatrava'], 'Cada campo muestra un ejemplo');
    assert.ok(campos.every((k) => $('#lg-guia-err-' + k)), 'Cada campo trae su aviso');
    assert.ok(['name', 'product', 'guide', 'carrier', 'price', 'address'].every((k) => $('#lg-guia-f-' + k).value === ''), 'El resto arranca vacío');
    const escribe = (k, v) => { const i = $('#lg-guia-f-' + k); i.value = v; i.dispatchEvent(new window.Event('input', { bubbles: true })); };
    const abre = () => { tab('dash').click(); tab('logistica').click(); };
    // Abrir la pestaña llena Producto y Precio vacíos con los de Desarrollo.
    landing.prod = { name: 'Omegaxl joint support', price: 97400 };
    abre();
    assert.strictEqual($('#lg-guia-f-product').value, 'Omegaxl joint support');
    assert.strictEqual($('#lg-guia-f-price').value, '$ 97.400');
    assert.ok(lgS.cards.guia.form.product === 'Omegaxl joint support' && lgS.cards.guia.form.price === '$ 97.400', 'El estado también lo trae');
    // No pisa lo que ya escribí.
    escribe('product', 'Mi producto'); escribe('price', '50000');
    landing.prod = { name: 'Otro de Desarrollo', price: 12000 };
    abre();
    assert.strictEqual($('#lg-guia-f-product').value, 'Mi producto', 'Producto escrito no se pisa');
    assert.strictEqual($('#lg-guia-f-price').value, '50000', 'Precio escrito no se pisa');
    // El precio acepta 97400, 97.400 y $ 97.400, y se formatea al salir del campo.
    for (const t of ['97400', '97.400', '$ 97.400']) {
      escribe('price', t); $('#lg-guia-f-price').dispatchEvent(new window.Event('blur'));
      assert.strictEqual($('#lg-guia-f-price').value, '$ 97.400', 'Formatea ' + t);
    }
    escribe('price', 'abc'); $('#lg-guia-f-price').dispatchEvent(new window.Event('blur'));
    assert.strictEqual($('#lg-guia-f-price').value, 'abc', 'Un precio inválido no se reescribe');
    // Traer de Desarrollo sí los pisa.
    $('#lg-guia-import').click();
    assert.strictEqual($('#lg-guia-f-product').value, 'Otro de Desarrollo');
    assert.strictEqual($('#lg-guia-f-price').value, '$ 12.000');
    // Sin nombre en Desarrollo: avisa y no cambia nada.
    landing.prod = {};
    escribe('product', 'Lo mío');
    $('#toast').textContent = '';
    $('#lg-guia-import').click();
    assert.ok(/Desarrollo/.test($('#toast').textContent) && $('#lg-guia-f-product').value === 'Lo mío' && $('#lg-guia-f-price').value === '$ 12.000', 'Sin producto en Desarrollo avisa y no cambia');
    // Todos editables.
    assert.ok($$('#lg-guia-form input').every((i) => !i.readOnly && !i.disabled), 'Todos los campos se editan');
    // Nada se guarda: no hay almacenamiento propio.
    assert.ok(!PYL.services.storage.logistics, 'Sin persistencia');
    // Dejar el formulario como estaba para el resto de las pruebas.
    for (const k of ['name', 'product', 'guide', 'price', 'address']) escribe(k, '');
  }

  // 8f. Logística · Confirmación de Pedidos (SPEC 13): su propia tarjeta, a la izquierda de Guia, con 7 campos y su mensaje.
  {
    const $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
    const L = PYL.core.logistics, lgS = PYL.app.state.logistics, landing = PYL.app.state.landing;
    const P = (s) => '#lg-pedido-' + s, G = (s) => '#lg-guia-' + s;
    const escribe = (sel, v) => { const i = $(sel); i.value = v; i.dispatchEvent(new window.Event('input', { bubbles: true })); };
    const abre = () => { tab('dash').click(); tab('logistica').click(); };
    const card = $('#lg-card-pedido');
    assert.ok(card && card === $('#lg-cards').firstElementChild && card.nextElementSibling === $('#lg-card-reconfirma'), 'La tarjeta de Pedidos va primero, a la izquierda de Reconfirmación de Pedido');
    assert.strictEqual($('#lg-card-pedido h2').textContent, 'Confirmación de Pedidos');
    const campos = ['name', 'product', 'address', 'city', 'dept', 'phone', 'total'];
    assert.deepStrictEqual($$('#lg-pedido-form input').map((i) => i.id), campos.map((k) => 'lg-pedido-f-' + k), '7 campos en orden');
    assert.deepStrictEqual($$('#lg-pedido-form label').map((l) => l.textContent), ['Nombre de cliente', 'Producto', 'Dirección de entrega', 'Ciudad / Municipio', 'Departamento', 'Teléfono de contacto', 'Total a pagar (COD - contraentrega)']);
    assert.deepStrictEqual($$('#lg-pedido-form input').map((i) => i.placeholder), ['Ej: Eugenia', 'Ej: Omegaxl joint support', 'Ej: Colombia 20# 19 .30 - barrio Capri', 'Ej: PASTO', 'Ej: NARIÑO', 'Ej: 3214566677', 'Ej: $ 97.400']);
    assert.ok(campos.every((k) => $(P('err-' + k))), 'Cada campo trae su aviso');
    assert.deepStrictEqual($$('#lg-card-pedido .lg-acts button').map((b) => b.id), ['lg-pedido-gen', 'lg-pedido-clear', 'lg-pedido-copy'], 'Sus propios botones');
    assert.ok($$('#lg-card-pedido [data-ic]').every((b) => b.querySelector('.lg-ic svg')), 'Con sus íconos');
    // Producto viene de Desarrollo; el total no.
    escribe(P('f-product'), '');
    landing.prod = { name: 'Omegaxl joint support', price: 97400 };
    abre();
    assert.strictEqual($(P('f-product')).value, 'Omegaxl joint support');
    assert.strictEqual($(P('f-total')).value, '', 'El total no se trae de Desarrollo');
    // Generar con campos vacíos marca los que faltan, solo en su tarjeta.
    $(P('gen')).click();
    // Teléfono (SPEC 15, Parte 10): solo `+57 311 7624068` o `311 7624068`; se reescribe sin espacios al salir y el mensaje lo muestra igual.
    {
      const tel = $(P('f-phone'));
      escribe(P('f-phone'), '311-762-4068'); tel.dispatchEvent(new window.Event('blur'));
      assert.strictEqual(tel.value, '311-762-4068', 'Un teléfono inválido no se reescribe');
      $(P('gen')).click();
      assert.ok(tel.classList.contains('lg-bad') && $(P('err-phone')).textContent === 'Teléfono inválido: usa 311 7624068 o +57 311 7624068', 'Avisa las formas válidas');
      for (const t of ['+57 311 7624068', '311 7624068']) {
        escribe(P('f-phone'), t); tel.dispatchEvent(new window.Event('blur'));
        assert.strictEqual(tel.value, '3117624068', 'Al salir queda sin espacios: ' + t);
      }
      escribe(P('f-phone'), ''); $(P('gen')).click(); // vuelve al estado de «todo vacío» para lo que sigue
    }
    for (const k of ['name', 'address', 'city', 'dept', 'phone', 'total']) assert.ok($(P('f-' + k)).classList.contains('lg-bad') && /^Escribe /.test($(P('err-' + k)).textContent), k + ' marcado');
    assert.ok(!$(P('f-product')).classList.contains('lg-bad') && $(P('out')).value === '', 'Producto no se marca y no hay mensaje');
    assert.strictEqual($$('#lg-guia-form .lg-bad').length, 0, 'La tarjeta de Guia no se toca');
    escribe(P('f-total'), 'abc'); $(P('gen')).click();
    assert.strictEqual($(P('err-total')).textContent, 'Total mayor a 0');
    // Con todo lleno: el mensaje de la plantilla.
    escribe(P('f-name'), 'Eugenia'); escribe(P('f-address'), 'Colombia 20# 19 .30 - barrio Capri'); escribe(P('f-city'), 'PASTO'); escribe(P('f-dept'), 'nariño'); escribe(P('f-phone'), '3214566677'); // el departamento va en minúscula: el mensaje lo pone en mayúsculas
    escribe(P('f-total'), '97400'); $(P('f-total')).dispatchEvent(new window.Event('blur'));
    assert.strictEqual($(P('f-total')).value, '$ 97.400', 'El total se formatea al salir del campo');
    $(P('gen')).click();
    const esperado = L.lgMessage('pedido', { name: 'Eugenia', product: 'Omegaxl joint support', address: 'Colombia 20# 19 .30 - barrio Capri', city: 'PASTO', dept: 'NARIÑO', phone: '3214566677', total: 97400 });
    assert.strictEqual($(P('out')).value, esperado, 'Mensaje generado');
    assert.ok($(P('out')).value.includes('*Departamento:* NARIÑO') && $(P('f-dept')).value === 'nariño', 'El departamento sale en mayúsculas en el mensaje y el campo no se toca');
    assert.ok($(P('out')).value.includes('🛍️🤍\n\n🚚 Por favor'), 'Línea en blanco antes del último párrafo');
    assert.ok($(P('out')).value.startsWith('¡Hola Eugenia! 🌟') && $(P('out')).value.includes('*Total a Pagar:* $97.400') && $(P('out')).value.includes('🍃*VidanovaStore®*'), 'Saludo, total y tienda');
    assert.strictEqual(lgS.cards.pedido.last, esperado);
    assert.strictEqual($(G('out')).value, '', 'El mensaje de Guia no cambia');
    // Editar después no cambia el mensaje hasta volver a generar.
    escribe(P('f-city'), 'CALI');
    assert.strictEqual($(P('out')).value, esperado, 'No se actualiza en vivo');
    // Las dos tarjetas son independientes: lo escrito en una no pasa a la otra.
    escribe(G('f-name'), 'Pablo');
    assert.strictEqual($(P('f-name')).value, 'Eugenia', 'El nombre de Guia no toca el de Pedidos');
    assert.deepStrictEqual([lgS.cards.guia.form.name, lgS.cards.pedido.form.name], ['Pablo', 'Eugenia']);
    escribe(G('f-name'), '');
    // «Traer de Desarrollo» de esta tarjeta solo toca su producto.
    escribe(P('f-product'), 'Lo mío');
    landing.prod = { name: 'Otro de Desarrollo', price: 12000 };
    $(P('import')).click();
    assert.strictEqual($(P('f-product')).value, 'Otro de Desarrollo');
    assert.strictEqual($(P('f-total')).value, '$ 97.400', 'El total no se toca');
    landing.prod = {};
    $('#toast').textContent = '';
    escribe(P('f-product'), 'Lo mío'); $(P('import')).click();
    assert.ok(/Desarrollo/.test($('#toast').textContent) && $(P('f-product')).value === 'Lo mío', 'Sin producto en Desarrollo avisa y no cambia');
    // Limpiar: vacía los datos del cliente y el mensaje, y deja el producto.
    $(P('clear')).click();
    assert.ok(['name', 'address', 'city', 'dept', 'phone', 'total'].every((k) => $(P('f-' + k)).value === ''), 'Vacía los datos del cliente');
    assert.strictEqual($(P('f-product')).value, 'Lo mío', 'Deja el producto');
    assert.ok($(P('out')).value === '' && lgS.cards.pedido.last === '' && $$('#lg-pedido-form .lg-bad').length === 0, 'Vacía el mensaje y los errores');
    // Dejar todo como estaba para lo siguiente: las dos tarjetas con el formulario vacío.
    landing.prod = {};
    for (const k of campos) escribe(P('f-' + k), '');
    for (const k of ['name', 'product', 'guide', 'price', 'address']) escribe(G('f-' + k), '');
  }

  // 8g. Logística · Pedido Confirmado (SPEC 13): mensaje fijo con un check de obsequio.
  {
    const $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
    const L = PYL.core.logistics, lgS = PYL.app.state.logistics;
    const P = (s) => '#lg-confirmado-' + s;
    const card = $('#lg-card-confirmado');
    assert.ok(card && card.previousElementSibling === $('#lg-card-tercero') && card.nextElementSibling === $('#lg-card-guia'), 'Va entre Tercer Intento y Guia');
    assert.strictEqual(card.querySelector('h2').textContent, 'Pedido Confirmado');
    assert.deepStrictEqual($$('#lg-confirmado-form input').map((i) => [i.id, i.type]), [['lg-confirmado-f-gift', 'checkbox']], 'Solo el check, sin campos de ingreso');
    assert.ok($(P('f-gift')).checked && /Incluye obsequio/.test($(P('form')).textContent), 'Check "Incluye obsequio" marcado por defecto');
    assert.ok(!$(P('import')), 'Sin «Traer de Desarrollo»: no trae nada de Desarrollo');
    assert.deepStrictEqual($$('#lg-card-confirmado .lg-acts button').map((b) => b.id), ['lg-confirmado-gen', 'lg-confirmado-clear', 'lg-confirmado-copy']);
    // Con obsequio.
    $(P('gen')).click();
    assert.strictEqual($(P('out')).value, L.lgMessage('confirmado', { gift: true }));
    assert.ok($(P('out')).value.startsWith('Gracias por confirmar. Tu paquete ya va rumbo a empaque. 📦') && $(P('out')).value.includes('*obsequio* adjunto ✨'), 'Trae el párrafo del obsequio');
    assert.strictEqual($$('#lg-confirmado-form .lg-bad').length, 0);
    // Desmarcar no cambia el mensaje hasta volver a generar; sin obsequio no va esa parte.
    $(P('f-gift')).checked = false; $(P('f-gift')).dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.strictEqual(lgS.cards.confirmado.form.gift, false);
    assert.ok($(P('out')).value.includes('obsequio'), 'No se actualiza en vivo');
    $(P('gen')).click();
    assert.strictEqual($(P('out')).value, L.lgMessage('confirmado', { gift: false }));
    assert.ok(!$(P('out')).value.includes('obsequio') && $(P('out')).value.endsWith('¡Quedamos muy atentos a tu entrega!'), 'Sin obsequio');
    // Es independiente de las otras tarjetas.
    assert.ok($('#lg-pedido-out').value === '' && $('#lg-guia-out').value === '', 'No toca los otros mensajes');
    // Limpiar vacía el mensaje; el check queda como estaba.
    $(P('clear')).click();
    assert.ok($(P('out')).value === '' && lgS.cards.confirmado.last === '' && $(P('f-gift')).checked === false, 'Limpiar vacía el mensaje y deja el check');
    // Dejar como estaba: obsequio marcado y sin mensaje.
    $(P('f-gift')).checked = true; $(P('f-gift')).dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.strictEqual(lgS.cards.confirmado.form.gift, true);
  }

  // 8j. Logística · Tercer Intento (SPEC 13): tarjeta propia a la derecha de la pila Pedidos + Segundo Intento.
  {
    const $ = (q) => document.querySelector(q);
    const L = PYL.core.logistics, lgS = PYL.app.state.logistics;
    const P = (s) => '#lg-tercero-' + s;
    const card = $('#lg-card-tercero');
    assert.ok(card.previousElementSibling === $('#lg-card-reconfirma') && card.nextElementSibling === $('#lg-card-confirmado'), 'A la derecha de Reconfirmación de Pedido');
    assert.strictEqual(card.querySelector('h2').textContent, 'Tercer Intento');
    const escribe = (k, v) => { const i = $(P('f-' + k)); i.value = v; i.dispatchEvent(new window.Event('input', { bubbles: true })); };
    $(P('f-product')).value = ''; $(P('f-product')).dispatchEvent(new window.Event('input', { bubbles: true })); // Desarrollo pudo prellenarlo
    $(P('gen')).click();
    assert.ok(['name', 'product', 'city'].every((k) => $(P('f-' + k)).classList.contains('lg-bad')) && $(P('out')).value === '', 'Sin datos no genera');
    escribe('name', 'Eugenia'); escribe('product', 'Crema Despigmentante'); escribe('city', 'Pasto'); $(P('gen')).click();
    assert.strictEqual($(P('out')).value, L.lgMessage('tercero', { name: 'Eugenia', product: 'Crema Despigmentante', city: 'Pasto' }));
    assert.ok($(P('out')).value.includes("'CONFIRMO'") && $(P('out')).value.includes('en Pasto'));
    $(P('clear')).click();
    assert.ok($(P('f-name')).value === '' && $(P('out')).value === '' && lgS.cards.tercero.last === '', 'Limpiar vacía');
  }

  // 8k. Logística · Solicitud de Anticipo (SPEC 13): a la derecha de Tercer Intento.
  {
    const $ = (q) => document.querySelector(q);
    const L = PYL.core.logistics;
    const P = (s) => '#lg-anticipo-' + s;
    const card = $('#lg-card-anticipo');
    assert.ok(card.previousElementSibling === $('#lg-card-infografia') && card.nextElementSibling === $('#lg-card-reintento') && card.querySelector('h2').textContent === 'Solicitud de Anticipo', 'A la derecha de Guia');
    const escribe = (k, v) => { const i = $(P('f-' + k)); i.value = v; i.dispatchEvent(new window.Event('input', { bubbles: true })); };
    escribe('name', ''); escribe('product', ''); escribe('advance', '');
    $(P('gen')).click();
    assert.ok(['name', 'product', 'advance'].every((k) => $(P('f-' + k)).classList.contains('lg-bad')) && $(P('out')).value === '', 'Sin datos no genera');
    escribe('name', 'Eugenia'); escribe('product', 'Crema Despigmentante'); escribe('advance', '20000'); $(P('gen')).click();
    assert.strictEqual($(P('out')).value, L.lgMessage('anticipo', { name: 'Eugenia', product: 'Crema Despigmentante', advance: 20000 }));
    assert.ok($(P('out')).value.includes('$20.000'));
    $(P('clear')).click();
    assert.ok($(P('f-name')).value === '' && $(P('out')).value === '', 'Limpiar vacía');
  }

  // 8h1. Logística · «Traer de Desarrollo» (SPEC 15, Parte 10): vive dentro del título, justo después del botón de la flecha, para
  // quedar pegado a ella (el estilo lo coloca a su izquierda); solo lo traen las tarjetas con un campo de Desarrollo.
  {
    const $$ = (q) => [...document.querySelectorAll(q)];
    const con = $$('#lg-cards .lg-card').filter((c) => c.querySelector('.lg-import'));
    assert.deepStrictEqual(con.map((c) => c.dataset.tpl), ['pedido', 'tercero', 'guia', 'infografia', 'anticipo', 'reintento', 'flete', 'enruta', 'oficina'].filter((k) => con.some((c) => c.dataset.tpl === k)), 'Las tarjetas con producto de Desarrollo');
    assert.ok(con.length >= 5, 'Hay tarjetas con el botón');
    for (const c of con) {
      const h2 = c.querySelector('h2'), imp = c.querySelector('.lg-import'), tg = c.querySelector('.lg-toggle');
      assert.ok(imp.parentElement === h2 && tg.parentElement === h2 && tg.nextElementSibling === imp, c.dataset.tpl + ': el botón va dentro del título, tras el de la flecha');
      assert.strictEqual(h2.textContent, tg.textContent, c.dataset.tpl + ': el título sigue siendo solo el nombre');
    }
    assert.ok($$('#lg-cards .lg-card').filter((c) => !c.querySelector('.lg-import')).every((c) => !c.querySelector('h2 .lg-import')), 'Sin botón donde no hay campo de Desarrollo');
  }

  // 8h1b. Logística · todas las tarjetas (SPEC 15, Parte 10): sin saltos de fila, en orden, y «Generar mensaje» arriba de «Limpiar» y «Copiar».
  {
    const $$ = (q) => [...document.querySelectorAll(q)];
    assert.deepStrictEqual($$('#lg-cards > *').map((c) => c.id), ['pedido', 'reconfirma', 'tercero', 'confirmado', 'guia', 'infografia', 'anticipo', 'reintento', 'flete', 'enruta', 'entregado', 'oficina'].map((k) => 'lg-card-' + k), 'Once tarjetas, sin saltos de línea');
    for (const c of $$('#lg-cards .lg-card')) {
      const k = c.dataset.tpl;
      assert.deepStrictEqual([...c.querySelectorAll('.lg-acts button')].map((b) => b.id), ['gen', 'clear', 'copy'].map((a) => 'lg-' + k + '-' + a), k + ': Generar arriba, Limpiar y Copiar debajo');
      assert.ok(c.querySelector('.lg-acts button').classList.contains('lg-gen') && !c.querySelector('.lg-acts button').classList.contains('ghost'), k + ': Generar es el botón destacado');
    }
  }

  // 8h1c. Logística · chip de etapa en el título (SPEC 15, Parte 11): antes del nombre, fuera del <h2>.
  {
    const $$ = (q) => [...document.querySelectorAll(q)];
    const L = PYL.core.logistics;
    for (const c of $$('#lg-cards .lg-card')) {
      const tpl = L.lgTemplate(c.dataset.tpl), chip = c.querySelector('.lg-head > .lg-stage');
      assert.ok(chip && chip === c.querySelector('.lg-head').firstElementChild && chip.nextElementSibling === c.querySelector('h2'), tpl.k + ': el chip va antes del título');
      assert.strictEqual(chip.textContent, L.LG_STAGES[tpl.stage], tpl.k + ': texto de la etapa');
      assert.strictEqual(chip.dataset.stage, tpl.stage);
      assert.strictEqual(c.querySelector('h2').textContent, tpl.title, tpl.k + ': el título sigue siendo solo el nombre');
    }
    assert.deepStrictEqual([...new Set($$('#lg-cards .lg-stage').map((n) => n.dataset.stage))].sort(), ['cobro', 'confirmar', 'entrega', 'envio']);
  }

  // 8h1e. Logística · Mensajes a Proveedores (SPEC 16, Partes 2, 3, 5 y 6): «Traer de Mi candidato», ID solo números, Generar/Copiar/Limpiar.
  {
    const $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
    const tab = (v) => $('[data-v="' + v + '"]');
    const draft = PYL.app.state.search.draft, landing = PYL.app.state.landing, lgS = PYL.app.state.logistics;
    const antes = { name: draft.name, dropi: draft.dropi, suppliers: draft.suppliers }, prod = landing.prod;
    const escribe = (k, f, t) => { const i = $('#lg-' + k + '-f-' + f); i.value = t; i.dispatchEvent(new window.Event('input', { bubbles: true })); };
    const valores = (k) => ['supplier', 'product', 'dropi'].map((f) => $('#lg-' + k + '-f-' + f).value);
    const abre = () => { tab('dash').click(); tab('logistica').click(); };
    // Botón: «Traer de Mi candidato» en las dos nuevas; «Traer de Desarrollo» en las demás.
    for (const k of ['valida', 'privatiza']) {
      const b = $('#lg-' + k + '-import');
      assert.ok(b && b.classList.contains('lg-import') && b.closest('h2'), k + ': botón dentro del título');
      assert.ok(/Traer de Mi candidato/.test(b.title) && b.getAttribute('aria-label') === 'Traer de Mi candidato', k + ': título y aria-label');
    }
    assert.ok(/Traer de Desarrollo/.test($('#lg-guia-import').title) && $('#lg-guia-import').getAttribute('aria-label') === 'Traer de Desarrollo', 'Las demás siguen con Desarrollo');
    // Un solo proveedor: trae los tres campos.
    landing.prod = { name: 'De Desarrollo' };
    draft.name = ' Crema Arbutina '; draft.dropi = '2234277'; draft.suppliers = [{ name: 'Botania', created: '' }];
    $('#toast').textContent = '';
    $('#lg-valida-import').click();
    assert.deepStrictEqual(valores('valida'), ['Botania', 'Crema Arbutina', '2234277'], 'Con un proveedor llena los tres');
    assert.ok(/Traje «Crema Arbutina» de Mi candidato\./.test($('#toast').textContent) && !/a mano/.test($('#toast').textContent), 'Aviso sin pedir proveedor');
    assert.deepStrictEqual(valores('privatiza'), ['', '', ''], 'La otra tarjeta no cambia');
    // Dos proveedores: producto e ID sí; el proveedor se queda como estaba y el aviso lo pide.
    draft.name = 'Faja Térmica'; draft.dropi = '999'; draft.suppliers = [{ name: 'Botania' }, { name: 'Nibresma' }];
    escribe('valida', 'supplier', 'Escrito a mano');
    $('#toast').textContent = '';
    $('#lg-valida-import').click();
    assert.deepStrictEqual(valores('valida'), ['Escrito a mano', 'Faja Térmica', '999'], 'Con dos no toca el proveedor');
    assert.ok(/Escribe el proveedor a mano: Mi candidato no tiene uno solo\./.test($('#toast').textContent), 'El aviso pide el proveedor');
    // Un dato vacío en Mi candidato no borra lo escrito.
    draft.dropi = ''; draft.suppliers = [];
    escribe('valida', 'dropi', '12345');
    $('#lg-valida-import').click();
    assert.strictEqual($('#lg-valida-f-dropi').value, '12345', 'Dato vacío no borra');
    // Sin nombre: avisa y no cambia nada.
    draft.name = '   ';
    const previo = valores('valida');
    $('#toast').textContent = '';
    $('#lg-valida-import').click();
    assert.ok(/Mi candidato no tiene producto/.test($('#toast').textContent) && JSON.stringify(valores('valida')) === JSON.stringify(previo), 'Sin nombre avisa y no cambia');
    // ID solo números.
    escribe('valida', 'supplier', 'Botania'); escribe('valida', 'product', 'Crema Arbutina');
    for (const t of ['22.34277', 'ID2234277']) {
      escribe('valida', 'dropi', t); $('#lg-valida-gen').click();
      assert.strictEqual($('#lg-valida-err-dropi').textContent, 'ID inválido: solo números', 'Rechaza ' + t);
      assert.strictEqual($('#lg-valida-out').value, '', 'No arma el mensaje');
    }
    escribe('valida', 'dropi', ''); $('#lg-valida-gen').click();
    assert.strictEqual($('#lg-valida-err-dropi').textContent, 'Escribe id dropi');
    // Generar, Copiar y Limpiar (valida).
    escribe('valida', 'dropi', ' 2234277 '); $('#lg-valida-gen').click();
    assert.strictEqual($('#lg-valida-err-dropi').textContent, '', 'Sin error');
    const msg = lgS.cards.valida.last;
    assert.ok(msg.startsWith('Hola, buen día equipo de Botania.') && msg.includes('*Crema Arbutina* con ID: *2234277*.') && msg.includes('🍃*VidanovaStore®*'), 'Mensaje de Validación');
    assert.strictEqual($('#lg-valida-out').value, msg, 'Se ve en la tarjeta');
    $('#lg-valida-clear').click();
    assert.strictEqual(lgS.cards.valida.last, '', 'Limpiar borra el mensaje');
    assert.deepStrictEqual(valores('valida'), ['Botania', 'Crema Arbutina', ' 2234277 '], 'Limpiar no vacía los campos from');
    // Privatización con los mismos datos.
    escribe('privatiza', 'supplier', 'Botania'); escribe('privatiza', 'product', 'Crema Arbutina'); escribe('privatiza', 'dropi', '2234277');
    $('#lg-privatiza-gen').click();
    const m2 = lgS.cards.privatiza.last;
    assert.ok(m2.includes('(ID: 2234277)') && m2.includes('*privatización*') && !m2.includes('pedidos diarios'), 'Mensaje de Privatización');
    // Al abrir la pestaña: los vacíos de estas tarjetas se llenan de Mi candidato (no de Desarrollo); los escritos no se pisan.
    draft.name = 'Del candidato'; draft.dropi = '777'; draft.suppliers = [{ name: 'Uno' }];
    landing.prod = { name: 'De Desarrollo' };
    for (const f of ['supplier', 'product', 'dropi']) escribe('valida', f, '');
    escribe('privatiza', 'supplier', 'Ya escrito'); escribe('privatiza', 'product', ''); escribe('privatiza', 'dropi', '');
    abre();
    assert.deepStrictEqual(valores('valida'), ['Uno', 'Del candidato', '777'], 'Prellena de Mi candidato (no de Desarrollo)');
    assert.deepStrictEqual(valores('privatiza'), ['Ya escrito', 'Del candidato', '777'], 'No pisa lo escrito');
    assert.ok($$('#lg-cards-prov input').every((i) => !i.readOnly && !i.disabled), 'Campos editables');
    draft.name = antes.name; draft.dropi = antes.dropi; draft.suppliers = antes.suppliers; landing.prod = prod;
  }

  // 8h1d. Logística · Envío de Infografía (SPEC 15, Parte 12): justo después de Confirmación de Guia, solo con el producto de Desarrollo.
  {
    const $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
    const L = PYL.core.logistics, lgS = PYL.app.state.logistics, landing = PYL.app.state.landing;
    const P = (s) => '#lg-infografia-' + s;
    const card = $('#lg-card-infografia');
    assert.ok(card.previousElementSibling === $('#lg-card-guia') && card.nextElementSibling === $('#lg-card-anticipo'), 'Va justo después de Confirmación de Guia');
    assert.strictEqual(card.querySelector('h2').textContent, 'Envío de Infografía');
    assert.deepStrictEqual($$('#lg-infografia-form input').map((i) => [i.id, i.placeholder]), [['lg-infografia-f-product', 'Ej: Crema Arbutina']], 'Solo el producto');
    assert.ok($(P('import')), 'Con «Traer de Desarrollo»');
    const i = $(P('f-product')); i.value = ''; i.dispatchEvent(new window.Event('input', { bubbles: true }));
    $(P('gen')).click();
    assert.ok(i.classList.contains('lg-bad') && $(P('out')).value === '', 'Sin producto no genera');
    const previo = landing.prod;
    landing.prod = { name: 'Crema Arbutina', price: 50000 };
    $(P('import')).click();
    landing.prod = previo;
    assert.strictEqual(i.value, 'Crema Arbutina', 'Trae el producto');
    $(P('gen')).click();
    assert.strictEqual($(P('out')).value, L.lgMessage('infografia', { product: 'Crema Arbutina' }));
    assert.ok($(P('out')).value.includes('*infografía visual*') && $(P('out')).value.includes('*Crema Arbutina*'), 'Con negritas');
    $(P('clear')).click();
    assert.ok(i.value === 'Crema Arbutina' && $(P('out')).value === '' && lgS.cards.infografia.last === '', 'Limpiar vacía el mensaje y deja el producto');
  }

  // 8h2. Logística · Reconfirmación de Pedido (SPEC 15): justo a la derecha de Confirmación de Pedidos, solo con el nombre.
  {
    const $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
    const L = PYL.core.logistics, lgS = PYL.app.state.logistics;
    const P = (s) => '#lg-reconfirma-' + s;
    const card = $('#lg-card-reconfirma');
    assert.ok(card.previousElementSibling === $('#lg-card-pedido') && card.nextElementSibling === $('#lg-card-tercero'), 'Justo a la derecha de Pedidos');
    assert.strictEqual(card.querySelector('h2').textContent, 'Reconfirmación de Pedido');
    assert.deepStrictEqual($$('#lg-reconfirma-form input').map((i) => [i.id, i.placeholder]), [['lg-reconfirma-f-name', 'Ej: Eugenia']], 'Solo el nombre');
    assert.ok(!$(P('import')), 'Sin «Traer de Desarrollo»');
    assert.deepStrictEqual($$('#lg-card-reconfirma .lg-acts button').map((b) => b.id), ['lg-reconfirma-gen', 'lg-reconfirma-clear', 'lg-reconfirma-copy']);
    $(P('gen')).click();
    assert.ok($(P('f-name')).classList.contains('lg-bad') && $(P('out')).value === '', 'Sin nombre no genera');
    const i = $(P('f-name')); i.value = 'Eugenia'; i.dispatchEvent(new window.Event('input', { bubbles: true }));
    $(P('gen')).click();
    assert.strictEqual($(P('out')).value, L.lgMessage('reconfirma', { name: 'Eugenia' }));
    assert.ok($(P('out')).value.startsWith('¡Hola Eugenia! 👋 Te escribíamos de la tienda 🍃*VidanovaStore®* nuevamente.'));
    assert.ok($('#lg-tercero-out').value === '' && $('#lg-pedido-out').value === '', 'No toca los otros mensajes');
    $(P('clear')).click();
    assert.ok($(P('f-name')).value === '' && $(P('out')).value === '' && lgS.cards.reconfirma.last === '', 'Limpiar vacía el nombre y el mensaje');
  }

  // 8h3. Logística · Reintento de Entrega (SPEC 15): nombre y producto; «Traer de Desarrollo» pisa solo el producto.
  {
    const $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
    const L = PYL.core.logistics, lgS = PYL.app.state.logistics, landing = PYL.app.state.landing;
    const P = (s) => '#lg-reintento-' + s;
    const escribe = (k, v) => { const i = $(P('f-' + k)); i.value = v; i.dispatchEvent(new window.Event('input', { bubbles: true })); };
    const card = $('#lg-card-reintento');
    assert.ok(card.previousElementSibling === $('#lg-card-anticipo') && card.nextElementSibling === $('#lg-card-flete'), 'Va después de Solicitud de Anticipo');
    assert.strictEqual(card.querySelector('h2').textContent, 'Reintento de Entrega');
    assert.deepStrictEqual($$('#lg-reintento-form input').map((i) => [i.id, i.placeholder]), [['lg-reintento-f-name', 'Ej: Rafael'], ['lg-reintento-f-product', 'Ej: Crema Despigmentante Coreana']]);
    assert.ok($(P('import')), 'Con «Traer de Desarrollo»');
    assert.deepStrictEqual($$('#lg-card-reintento .lg-acts button').map((b) => b.id), ['lg-reintento-gen', 'lg-reintento-clear', 'lg-reintento-copy']);
    escribe('product', ''); $(P('gen')).click();
    assert.ok($(P('f-name')).classList.contains('lg-bad') && $(P('f-product')).classList.contains('lg-bad') && $(P('out')).value === '', 'Sin datos no genera');
    const previo = landing.prod;
    landing.prod = { name: 'Crema Despigmentante Coreana', price: 50000 };
    escribe('name', 'Rafael');
    $(P('import')).click();
    assert.strictEqual($(P('f-product')).value, 'Crema Despigmentante Coreana', 'Trae el producto');
    assert.strictEqual($(P('f-name')).value, 'Rafael', 'No pisa el nombre');
    landing.prod = previo;
    $(P('gen')).click();
    assert.strictEqual($(P('out')).value, L.lgMessage('reintento', { name: 'Rafael', product: 'Crema Despigmentante Coreana' }));
    assert.ok($(P('out')).value.includes('*Crema Despigmentante Coreana*') && $(P('out')).value.includes('ubicarl@') && $(P('out')).value.includes('atent@'), 'Producto en negrita y con arroba');
    assert.ok($('#lg-anticipo-out').value === '' && $('#lg-pedido-out').value === '', 'No toca los otros mensajes');
    $(P('clear')).click();
    assert.ok($(P('f-name')).value === '' && $(P('f-product')).value === 'Crema Despigmentante Coreana' && $(P('out')).value === '' && lgS.cards.reintento.last === '', 'Limpiar vacía el nombre y el mensaje; deja el producto');
  }

  // 8h4. Logística · Flete Especial (SPEC 15): 5 campos (2 de dinero), producto de Desarrollo y las cuentas fijas.
  {
    const $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
    const L = PYL.core.logistics, lgS = PYL.app.state.logistics, landing = PYL.app.state.landing;
    const P = (s) => '#lg-flete-' + s;
    const escribe = (k, v) => { const i = $(P('f-' + k)); i.value = v; i.dispatchEvent(new window.Event('input', { bubbles: true })); };
    const card = $('#lg-card-flete');
    assert.ok(card.previousElementSibling === $('#lg-card-reintento') && card.nextElementSibling === $('#lg-card-enruta'), 'Va después de Reintento de Entrega');
    assert.strictEqual(card.querySelector('h2').textContent, 'Flete Especial');
    assert.deepStrictEqual($$('#lg-flete-form input').map((i) => [i.id, i.placeholder]), [['lg-flete-f-name', 'Ej: Rafael'], ['lg-flete-f-city', 'Ej: Vaupés'], ['lg-flete-f-shipping', 'Ej: $ 50.000'], ['lg-flete-f-product', 'Ej: Crema arbutina'], ['lg-flete-f-advance', 'Ej: $ 20.000']]);
    assert.ok($(P('import')), 'Con «Traer de Desarrollo»');
    escribe('product', ''); $(P('gen')).click();
    assert.ok(['name', 'city', 'shipping', 'product', 'advance'].every((k) => $(P('f-' + k)).classList.contains('lg-bad')) && $(P('out')).value === '', 'Sin datos no genera');
    escribe('shipping', '0'); escribe('advance', 'abc'); $(P('gen')).click();
    assert.strictEqual($(P('err-shipping')).textContent, 'Flete mayor a 0');
    assert.strictEqual($(P('err-advance')).textContent, 'Anticipo mayor a 0');
    for (const t of ['50000', '50.000', '$ 50.000']) {
      escribe('shipping', t); $(P('f-shipping')).dispatchEvent(new window.Event('blur'));
      assert.strictEqual($(P('f-shipping')).value, '$ 50.000', 'Formatea ' + t);
    }
    const previo = landing.prod;
    landing.prod = { name: 'Crema arbutina', price: 50000 };
    $(P('import')).click();
    landing.prod = previo;
    assert.strictEqual($(P('f-product')).value, 'Crema arbutina', 'Trae el producto');
    escribe('name', 'Rafael'); escribe('city', 'Vaupés'); escribe('advance', '20000'); $(P('f-advance')).dispatchEvent(new window.Event('blur'));
    $(P('gen')).click();
    assert.strictEqual($(P('out')).value, L.lgMessage('flete', { name: 'Rafael', city: 'Vaupés', shipping: 50000, product: 'Crema arbutina', advance: 20000 }));
    assert.ok($(P('out')).value.includes('$50.000') && $(P('out')).value.includes('$20.000') && $(P('out')).value.includes('3182110955') && $(P('out')).value.includes('23015881151'), 'Montos sin espacio y las dos cuentas');
    assert.ok($(P('out')).value.includes('🍃*VidanovaStore®*'), 'Con la marca');
    $(P('clear')).click();
    assert.ok(['name', 'city', 'shipping', 'advance'].every((k) => $(P('f-' + k)).value === '') && $(P('f-product')).value === 'Crema arbutina' && $(P('out')).value === '' && lgS.cards.flete.last === '', 'Limpiar vacía lo del pedido y deja el producto');
  }

  // 8h5. Logística · Recordatorio En Ruta (SPEC 15): nombre y producto de Desarrollo.
  {
    const $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
    const L = PYL.core.logistics, lgS = PYL.app.state.logistics, landing = PYL.app.state.landing;
    const P = (s) => '#lg-enruta-' + s;
    const escribe = (k, v) => { const i = $(P('f-' + k)); i.value = v; i.dispatchEvent(new window.Event('input', { bubbles: true })); };
    const card = $('#lg-card-enruta');
    assert.ok(card.previousElementSibling === $('#lg-card-flete') && card.nextElementSibling === $('#lg-card-entregado'), 'Va después de Flete Especial');
    assert.strictEqual(card.querySelector('h2').textContent, 'Recordatorio En Ruta');
    assert.deepStrictEqual($$('#lg-enruta-form input').map((i) => [i.id, i.placeholder]), [['lg-enruta-f-name', 'Ej: Beatriz'], ['lg-enruta-f-product', 'Ej: Crema Arbutina']]);
    assert.ok($(P('import')), 'Con «Traer de Desarrollo»');
    escribe('product', ''); $(P('gen')).click();
    assert.ok($(P('f-name')).classList.contains('lg-bad') && $(P('f-product')).classList.contains('lg-bad') && $(P('out')).value === '', 'Sin datos no genera');
    const previo = landing.prod;
    landing.prod = { name: 'Crema Arbutina', price: 50000 };
    $(P('import')).click();
    landing.prod = previo;
    assert.strictEqual($(P('f-product')).value, 'Crema Arbutina', 'Trae el producto');
    escribe('name', 'Beatriz'); $(P('gen')).click();
    assert.strictEqual($(P('out')).value, L.lgMessage('enruta', { name: 'Beatriz', product: 'Crema Arbutina' }));
    assert.ok($(P('out')).value.startsWith('Hola, Beatriz, *tu pedido Crema Arbutina ya se encuentra en ruta de entrega*.'));
    $(P('clear')).click();
    assert.ok($(P('f-name')).value === '' && $(P('f-product')).value === 'Crema Arbutina' && $(P('out')).value === '' && lgS.cards.enruta.last === '', 'Limpiar vacía el nombre y el mensaje; deja el producto');
  }

  // 8h6. Logística · Pedido Entregado (SPEC 15): primera tarjeta real con casilla «Incluye manual» y título condicional.
  {
    const $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
    const L = PYL.core.logistics, lgS = PYL.app.state.logistics;
    const P = (s) => '#lg-entregado-' + s;
    const escribe = (k, v) => { const i = $(P('f-' + k)); i.value = v; i.dispatchEvent(new window.Event('input', { bubbles: true })); };
    const marca = (v) => { const c = $(P('f-manual')); c.checked = v; c.dispatchEvent(new window.Event('change', { bubbles: true })); };
    const celda = () => $(P('f-manualTitle')).closest('.lg-cell');
    const card = $('#lg-card-entregado');
    assert.ok(card.previousElementSibling === $('#lg-card-enruta') && card.nextElementSibling === $('#lg-card-oficina'), 'Va después de Recordatorio En Ruta');
    assert.strictEqual(card.querySelector('h2').textContent, 'Pedido Entregado');
    assert.deepStrictEqual($$('#lg-entregado-form input').map((i) => i.id), ['lg-entregado-f-name', 'lg-entregado-f-manual', 'lg-entregado-f-manualTitle']);
    assert.ok(!$(P('import')), 'Sin «Traer de Desarrollo»');
    assert.ok($(P('f-manual')).checked && !celda().hidden && $(P('f-manualTitle')).placeholder === 'Ej: Manual de Bienestar Articular', 'Casilla marcada y título visible al abrir');
    escribe('name', 'Beatriz'); $(P('gen')).click();
    assert.ok($(P('f-manualTitle')).classList.contains('lg-bad') && $(P('out')).value === '', 'Marcada y con el título vacío: error y sin mensaje');
    escribe('manualTitle', 'Manual de Bienestar Articular'); $(P('gen')).click();
    assert.strictEqual($(P('out')).value, L.lgMessage('entregado', { name: 'Beatriz', manual: true, manualTitle: 'Manual de Bienestar Articular' }));
    assert.ok($(P('out')).value.includes('📄 Tu guía adjunta: *Manual de Bienestar Articular*') && $(P('out')).value.includes('💡'), 'Con manual');
    marca(false);
    assert.ok(celda().hidden && $(P('f-manualTitle')).value === 'Manual de Bienestar Articular', 'Desmarcada: el título se oculta y se conserva');
    $(P('gen')).click();
    assert.strictEqual($(P('out')).value, L.lgMessage('entregado', { name: 'Beatriz', manual: false }));
    assert.ok(!$(P('out')).value.includes('📄') && !$(P('out')).value.includes('💡') && $(P('out')).value.includes('https://vidanovastore.com/products'), 'Sin manual: se quita el bloque');
    marca(true); $(P('clear')).click();
    assert.ok($(P('f-name')).value === '' && $(P('out')).value === '' && lgS.cards.entregado.last === '', 'Limpiar vacía el nombre y el mensaje');
    assert.ok($(P('f-manual')).checked && $(P('f-manualTitle')).value === 'Manual de Bienestar Articular' && !celda().hidden, 'Limpiar deja la casilla y el título');
    marca(false); $(P('clear')).click();
    assert.ok(!$(P('f-manual')).checked && celda().hidden && $(P('f-manualTitle')).value === 'Manual de Bienestar Articular', 'Limpiar respeta la casilla desmarcada');
    marca(true); $(P('f-manualTitle')).value = ''; escribe('manualTitle', '');
  }

  // 8h7. Logística · Reclamar en Oficina (SPEC 15): producto de Desarrollo y manual condicional, sin nombre de cliente.
  {
    const $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
    const L = PYL.core.logistics, lgS = PYL.app.state.logistics, landing = PYL.app.state.landing;
    const P = (s) => '#lg-oficina-' + s;
    const escribe = (k, v) => { const i = $(P('f-' + k)); i.value = v; i.dispatchEvent(new window.Event('input', { bubbles: true })); };
    const marca = (v) => { const c = $(P('f-manual')); c.checked = v; c.dispatchEvent(new window.Event('change', { bubbles: true })); };
    const celda = () => $(P('f-manualTitle')).closest('.lg-cell');
    const card = $('#lg-card-oficina');
    assert.ok(card.previousElementSibling === $('#lg-card-entregado') && !card.nextElementSibling, 'Es la última tarjeta');
    assert.strictEqual(card.querySelector('h2').textContent, 'Reclamar en Oficina');
    assert.deepStrictEqual($$('#lg-oficina-form input').map((i) => i.id), ['lg-oficina-f-product', 'lg-oficina-f-manual', 'lg-oficina-f-manualTitle'], 'Sin nombre de cliente');
    assert.ok($(P('import')) && $(P('f-manual')).checked && !celda().hidden, 'Con «Traer de Desarrollo»; casilla marcada y título visible');
    escribe('product', ''); $(P('gen')).click();
    assert.ok($(P('f-product')).classList.contains('lg-bad') && $(P('f-manualTitle')).classList.contains('lg-bad') && $(P('out')).value === '', 'Sin datos no genera');
    const previo = landing.prod;
    landing.prod = { name: 'Crema Arbutina', price: 50000 };
    $(P('import')).click();
    landing.prod = previo;
    assert.strictEqual($(P('f-product')).value, 'Crema Arbutina', 'Trae el producto');
    escribe('manualTitle', 'Manual de Bienestar Articular'); $(P('gen')).click();
    assert.strictEqual($(P('out')).value, L.lgMessage('oficina', { product: 'Crema Arbutina', manual: true, manualTitle: 'Manual de Bienestar Articular' }));
    assert.ok($(P('out')).value.endsWith('para enviarle el Manual de Bienestar Articular.') && !$(P('out')).value.includes('*Manual'), 'Con manual, sin negrita');
    marca(false); $(P('gen')).click();
    assert.ok(celda().hidden && $(P('out')).value.endsWith('cuando lo obtenga.') && !$(P('out')).value.includes('Manual'), 'Sin manual');
    marca(true); $(P('clear')).click();
    assert.ok($(P('f-product')).value === 'Crema Arbutina' && $(P('out')).value === '' && lgS.cards.oficina.last === '', 'Limpiar vacía el mensaje y deja el producto');
    assert.ok($(P('f-manual')).checked && $(P('f-manualTitle')).value === 'Manual de Bienestar Articular' && !celda().hidden, 'Limpiar deja la casilla y el título');
  }

  // 8i. Logística · tarjetas contraídas: se abren y se cierran tocando su nombre (SPEC 13).
  {
    const $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
    const lgS = PYL.app.state.logistics;
    const claves = ['pedido', 'reconfirma', 'guia', 'confirmado', 'tercero', 'anticipo', 'reintento', 'flete', 'enruta', 'entregado', 'oficina'];
    const abierta = (k) => $('#lg-card-' + k).classList.contains('open');
    // Todas empiezan contraídas: solo se ve el nombre.
    for (const k of claves) {
      const t = $('#lg-' + k + '-toggle'), body = $('#lg-' + k + '-body');
      assert.ok(t && t.tagName === 'BUTTON' && t.closest('h2') && t.textContent === $('#lg-card-' + k + ' h2').textContent, k + ': el nombre es un botón dentro del título');
      assert.ok(t.getAttribute('aria-expanded') === 'false' && t.getAttribute('aria-controls') === 'lg-' + k + '-body', k + ': aria-expanded=false');
      assert.ok(body.hidden && !abierta(k) && lgS.cards[k].open === false, k + ': contraída');
      assert.ok(t.querySelector('.lg-chev svg'), k + ': con su flecha');
      assert.ok(body.querySelector('.lg-form') && body.querySelector('textarea') && body.querySelector('.lg-acts'), k + ': el formulario, el mensaje y los botones están dentro del cuerpo');
    }
    // Un clic en el nombre la abre; otro la cierra.
    $('#lg-pedido-toggle').click();
    assert.ok(abierta('pedido') && !$('#lg-pedido-body').hidden && $('#lg-pedido-toggle').getAttribute('aria-expanded') === 'true' && lgS.cards.pedido.open === true, 'Se abre');
    assert.ok(claves.filter((k) => k !== 'pedido').every((k) => !abierta(k) && $('#lg-' + k + '-body').hidden), 'Las demás siguen contraídas');
    // Son independientes: se pueden tener varias abiertas.
    $('#lg-reconfirma-toggle').click();
    assert.ok(abierta('pedido') && abierta('reconfirma') && !abierta('guia') && !abierta('confirmado'), 'Varias abiertas a la vez');
    $('#lg-pedido-toggle').click();
    assert.ok(!abierta('pedido') && $('#lg-pedido-body').hidden && $('#lg-pedido-toggle').getAttribute('aria-expanded') === 'false', 'Se vuelve a cerrar');
    // Contraer no borra lo escrito ni el mensaje.
    const i = $('#lg-reconfirma-f-name'); i.value = 'Eugenia'; i.dispatchEvent(new window.Event('input', { bubbles: true }));
    $('#lg-reconfirma-gen').click();
    const msg = $('#lg-reconfirma-out').value;
    $('#lg-reconfirma-toggle').click(); $('#lg-reconfirma-toggle').click();
    assert.ok(i.value === 'Eugenia' && $('#lg-reconfirma-out').value === msg && msg !== '', 'Cerrar y abrir conserva lo escrito y el mensaje');
    // Dejar todas contraídas para lo siguiente.
    $('#lg-reconfirma-clear').click();
    $('#lg-reconfirma-toggle').click();
    assert.ok(claves.every((k) => !abierta(k)), 'Todas contraídas');
    assert.ok(!PYL.services.storage.logistics, 'Qué tarjetas están abiertas no se guarda');
  }

  // 8j. Logística · campo condicional (`when`) y campo que se conserva (`keep`) (SPEC 15). Se siembra una plantilla de prueba y se
  // vuelve a ejecutar app/logistics.js para que pinte su tarjeta; al final se quita y se restaura la pantalla.
  {
    const $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
    const fs = require('fs');
    const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'logistics', 'app', 'logistics.js'), 'utf8');
    const L = PYL.core.logistics;
    L.LG_TEMPLATES.push({ k: 'prueba', title: 'Prueba', fields: [
      { k: 'name', label: 'Nombre de cliente', type: 'text', ph: 'Ej: Ana' },
      { k: 'manual', label: 'Incluye manual', type: 'check', def: true, keep: true },
      { k: 'manualTitle', label: 'Título del manual', type: 'text', when: 'manual', keep: true, ph: 'Ej: Manual X' },
    ] });
    window.eval(src);
    const lgS = PYL.app.state.logistics;
    const escribe = (sel, v) => { const i = $(sel); i.value = v; i.dispatchEvent(new window.Event('input', { bubbles: true })); };
    const marca = (v) => { const c = $('#lg-prueba-f-manual'); c.checked = v; c.dispatchEvent(new window.Event('change', { bubbles: true })); };
    const celda = () => $('#lg-prueba-f-manualTitle').closest('.lg-cell');
    assert.ok($('#lg-card-prueba') && $('#lg-prueba-f-manual').checked && !celda().hidden, 'Con la casilla marcada el campo condicional se ve');
    escribe('#lg-prueba-f-manualTitle', 'Manual X');
    marca(false);
    assert.ok(celda().hidden && lgS.cards.prueba.form.manual === false, 'Desmarcada: el campo se oculta');
    assert.strictEqual($('#lg-prueba-f-manualTitle').value, 'Manual X', 'Lo escrito no se pierde');
    marca(true);
    assert.ok(!celda().hidden && $('#lg-prueba-f-manualTitle').value === 'Manual X' && lgS.cards.prueba.form.manualTitle === 'Manual X', 'Al volver a marcarla reaparece con lo escrito');
    // Marcada y con el título vacío, «Generar mensaje» marca el campo y no arma nada.
    escribe('#lg-prueba-f-manualTitle', ''); escribe('#lg-prueba-f-name', 'Ana');
    $('#lg-prueba-gen').click();
    assert.ok($('#lg-prueba-f-manualTitle').classList.contains('lg-bad') && /^Escribe /.test($('#lg-prueba-err-manualTitle').textContent) && $('#lg-prueba-out').value === '', 'Marcada: el título es obligatorio');
    // Desmarcada, el título no se exige (aquí solo falta el nombre).
    marca(false); escribe('#lg-prueba-f-name', '');
    $('#lg-prueba-gen').click();
    assert.ok($('#lg-prueba-f-name').classList.contains('lg-bad') && !$('#lg-prueba-f-manualTitle').classList.contains('lg-bad') && $('#lg-prueba-err-manualTitle').textContent === '', 'Desmarcada: el título no se exige');
    // «Limpiar» vacía el nombre pero conserva la casilla y el título (keep).
    marca(true); escribe('#lg-prueba-f-manualTitle', 'Manual X'); escribe('#lg-prueba-f-name', 'Ana');
    $('#lg-prueba-clear').click();
    assert.ok($('#lg-prueba-f-name').value === '' && $('#lg-prueba-f-manual').checked && $('#lg-prueba-f-manualTitle').value === 'Manual X' && !celda().hidden, 'Limpiar conserva la casilla y el título');
    // Se quita la plantilla de prueba y se restaura la pantalla real.
    L.LG_TEMPLATES.pop();
    window.eval(src);
    assert.ok(!$('#lg-card-prueba') && $$('#lg-cards .lg-card').length === 12, 'Plantilla de prueba retirada');
    assert.ok(!PYL.services.storage.logistics, 'Sin persistencia');
  }

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

  // 7b. Centro de mando (SPEC 14, paso 3): tarjeta entre el hero y la cadena; 9 accesos de fábrica sin URL; con URL es un enlace.
  {
    const dash = document.querySelector('#v-dash'), kids = [...dash.children];
    const iHb = kids.findIndex((k) => k.id === 'hb-rail'), iHero = kids.findIndex((k) => k.classList.contains('hero'));
    const iChain = kids.findIndex((k) => /La cadena que decide todo/.test(k.textContent) && k.id !== 'hb-rail');
    // SPEC 19: entre el hero y el Centro de mando va Mis tareas (#tk-rail).
    assert.ok(iHero >= 0 && kids[iHero + 1].id === 'tk-rail' && iHb === iHero + 2 && iChain > iHb, 'Bajo el hero: Mis tareas, luego el Centro de mando y después la cadena');
    assert.strictEqual(document.querySelectorAll('#hb-root').length, 1, '#hb-root único');
    assert.strictEqual(document.querySelector('#hb-root').parentElement.id, 'hb-rail', 'La tarjeta va dentro del aside #hb-rail');
    const tiles = [...document.querySelectorAll('#hb-grid .hb-tile')];
    assert.deepStrictEqual(tiles.map((t) => t.dataset.id), ['tiktok', 'meta', 'adlib', 'dropi', 'dropkiller', 'kalodata', 'skool', 'chatgpt', 'claude'], 'Los 9 de fábrica, en orden');
    assert.ok(tiles.every((t) => t.tagName === 'BUTTON' && t.classList.contains('hb-empty') && /poner enlace/.test(t.textContent)), 'Todos botones punteados con "poner enlace"');
    assert.deepStrictEqual(tiles.slice(0, 2).map((t) => t.querySelector('.hb-name').textContent + '/' + t.querySelector('.hb-ini').textContent), ['TikTok Ads/TT', 'Meta Ads/M']);
    assert.strictEqual(PYL.app.state.hub.items.length, 9);
    assert.strictEqual(PYL.app.state.hub.editing, false);
    const a = PYL.ui.hub.tile({ id: 'x', name: 'Skool', ini: 'S', url: 'https://www.skool.com/', icon: null });
    assert.ok(a.tagName === 'A' && a.getAttribute('href') === 'https://www.skool.com/' && a.target === '_blank' && a.rel === 'noopener noreferrer', 'Con URL: enlace a pestaña nueva');
    assert.ok(!/poner enlace/.test(a.textContent) && !a.classList.contains('hb-empty'), 'Con URL no dice "poner enlace"');
    assert.ok(a.querySelector('img.hb-fav') && a.querySelector('img.hb-fav').src.includes('google.com/s2/favicons?domain=skool.com&sz=64'), 'Favicon de Google s2');
    const own = PYL.ui.hub.tile({ id: 'y', name: 'Mío', ini: 'M', url: 'https://x.co', icon: 'data:image/png;base64,AA' });
    assert.ok(own.querySelector('img') && !own.querySelector('img.hb-fav') && own.querySelector('img').src.startsWith('data:image/'), 'Con ícono propio no pide favicon');
    const g = document.createElement('div'); PYL.ui.hub.grid(g, [], {});
    assert.strictEqual(g.textContent, 'Sin accesos. Toca Editar para agregar uno.');
  }

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

  // 8e. Logística · Generar, Copiar y Limpiar (SPEC 13, paso 4). Async: espera al portapapeles.
  const lgTest = async () => {
    const $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
    const escribe = (k, v) => { const i = $('#lg-guia-f-' + k); i.value = v; i.dispatchEvent(new window.Event('input', { bubbles: true })); };
    let copiado = null;
    Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { copiado = t; } } });
    tab('logistica').click();
    assert.ok($('#lg-guia-out').readOnly && $('#lg-guia-out').value === '', 'Mensaje de solo lectura y vacío al cargar');
    assert.deepStrictEqual($$('#lg-card-guia .lg-acts button').map((b) => b.id), ['lg-guia-gen', 'lg-guia-clear', 'lg-guia-copy'], 'Botones en .lg-acts');
    assert.ok($('#lg-head, .lg-head #lg-guia-import'), 'Traer de Desarrollo es un ícono junto al título');
    assert.deepStrictEqual($$('#lg-guia-clear, #lg-guia-copy, #lg-guia-gen').map((b) => b.textContent).sort(), ['Generar mensaje', 'Copiar mensaje', 'Limpiar'].sort());
    assert.ok($$('#lg-guia-import, #lg-guia-clear, #lg-guia-copy, #lg-guia-gen').every((b) => b.querySelector('.lg-ic svg') && b.querySelectorAll('.lg-ic').length === 1), 'Cada botón trae su ícono dibujado (SVG), sin emojis');
    assert.strictEqual($('#lg-guia-import').textContent, '', 'Traer de Desarrollo es solo ícono');
    // Copiar sin mensaje avisa y no copia.
    $('#toast').textContent = '';
    $('#lg-guia-copy').click();
    await new Promise((ok) => setTimeout(ok, 20));
    assert.ok(/Primero toca/.test($('#toast').textContent) && copiado === null, 'Copiar sin mensaje avisa y no copia');
    // Generar con campos vacíos los marca, avisa y no arma nada.
    $('#toast').textContent = '';
    $('#lg-guia-gen').click();
    for (const k of ['name', 'product', 'guide', 'carrier', 'price', 'address']) {
      assert.ok($('#lg-guia-f-' + k).classList.contains('lg-bad') && $('#lg-guia-f-' + k).getAttribute('aria-invalid') === 'true', k + ' marcado');
      assert.ok(/^Escribe /.test($('#lg-guia-err-' + k).textContent), 'aviso de ' + k);
    }
    assert.strictEqual($('#lg-guia-err-carrier').textContent, 'Escribe transportadora');
    assert.ok(/Corrige/.test($('#toast').textContent) && $('#lg-guia-out').value === '', 'Avisa y no genera');
    // Precio inválido.
    escribe('price', 'abc'); $('#lg-guia-gen').click();
    assert.strictEqual($('#lg-guia-err-price').textContent, 'Precio mayor a 0');
    // Con todo lleno: el mensaje es el de la plantilla.
    escribe('name', 'Pablo'); escribe('product', 'Omegaxl joint support'); escribe('guide', '074102602224'); escribe('carrier', 'envia');
    escribe('price', '97400'); $('#lg-guia-f-price').dispatchEvent(new window.Event('blur')); // sale formateado: $ 97.400
    escribe('address', 'Cra 67 # 25 - 34 Itagui - Calatrava');
    $('#lg-guia-gen').click();
    const L = PYL.core.logistics;
    const esperado = L.lgMessage('guia', { name: 'Pablo', product: 'Omegaxl joint support', guide: '074102602224', carrier: 'envia', price: 97400, address: 'Cra 67 # 25 - 34 Itagui - Calatrava' });
    assert.strictEqual($('#lg-guia-out').value, esperado, 'Mensaje generado');
    assert.ok($('#lg-guia-out').value.includes('🚚 *Número de Guía*: 074102602224\n🚛 *Transportadora*: ENVIA\n🔗 *Rastreo*'), 'Transportadora en mayúsculas, bajo la guía');
    assert.strictEqual($('#lg-guia-f-carrier').value, 'envia', 'El campo conserva lo escrito');
    assert.ok($('#lg-guia-out').value.includes('*2 a 4 días hábiles*'), 'Tiempo de entrega fijo');
    assert.ok($('#lg-guia-out').value.includes('🍃*VidanovaStore®*') && $('#lg-guia-out').value.includes('*$97.400*'), 'Tienda y precio sin espacio');
    assert.ok($$('#lg-guia-form .lg-bad').length === 0 && $$('.lg-err').every((e) => e.textContent === ''), 'Sin errores tras generar');
    assert.strictEqual(PYL.app.state.logistics.cards.guia.last, esperado);
    // Editar después no cambia el mensaje hasta volver a generar.
    escribe('name', 'Ana');
    assert.strictEqual($('#lg-guia-out').value, esperado, 'No se actualiza en vivo');
    $('#lg-guia-gen').click();
    assert.ok($('#lg-guia-out').value.startsWith('*CONFIRMACIÓN GUIA*\n¡Hola, Ana!'), 'Al volver a generar sí cambia');
    // Un intento inválido deja el mensaje anterior.
    const previo = $('#lg-guia-out').value;
    escribe('guide', ''); $('#lg-guia-gen').click();
    assert.strictEqual($('#lg-guia-out').value, previo, 'El mensaje anterior se queda');
    assert.ok($('#lg-guia-f-guide').classList.contains('lg-bad'));
    escribe('guide', '074102602224');
    // Copiar copia el mensaje y avisa.
    $('#toast').textContent = '';
    $('#lg-guia-copy').click();
    await new Promise((ok) => setTimeout(ok, 20));
    assert.strictEqual(copiado, previo, 'Copia el mensaje');
    assert.ok($('#toast').classList.contains('show') && /copiado/i.test($('#toast').textContent), 'Avisa en #toast');
    // Limpiar: vacía nombre, guía, dirección y mensaje; deja producto, precio y tiempo.
    $('#lg-guia-gen').click();
    $('#lg-guia-clear').click();
    assert.ok(['name', 'guide', 'carrier', 'address'].every((k) => $('#lg-guia-f-' + k).value === ''), 'Vacía nombre, guía, transportadora y dirección');
    assert.deepStrictEqual([$('#lg-guia-f-product').value, $('#lg-guia-f-price').value], ['Omegaxl joint support', '$ 97.400'], 'Deja producto y precio');
    assert.ok($('#lg-guia-out').value === '' && PYL.app.state.logistics.cards.guia.last === '' && $$('#lg-guia-form .lg-bad').length === 0, 'Vacía el mensaje y los errores');
    assert.strictEqual(PYL.app.state.logistics.cards.guia.form.name, '', 'El estado también');
    // El precio formateado también genera.
    escribe('name', 'Pablo'); escribe('guide', 'G1'); escribe('carrier', 'Envia'); escribe('address', 'Calle 1');
    $('#lg-guia-gen').click();
    assert.ok($('#lg-guia-out').value.includes('*$97.400*'), 'El precio "$ 97.400" del campo genera bien');
    // La tarjeta de Pedidos copia su propio mensaje (no el de Guia).
    const escribeP = (k, v) => { const i = $('#lg-pedido-f-' + k); i.value = v; i.dispatchEvent(new window.Event('input', { bubbles: true })); };
    $('#toast').textContent = '';
    $('#lg-pedido-copy').click();
    await new Promise((ok) => setTimeout(ok, 20));
    assert.ok(/Primero toca/.test($('#toast').textContent), 'Copiar sin mensaje en Pedidos avisa');
    // Mensajes a Proveedores (SPEC 16): Copiar manda el mensaje de su tarjeta (los campos quedaron prellenados de Mi candidato).
    for (const [f, v] of [['supplier', 'Botania'], ['product', 'Crema Arbutina'], ['dropi', '2234277']]) { const i = $('#lg-valida-f-' + f); i.value = v; i.dispatchEvent(new window.Event('input', { bubbles: true })); }
    $('#lg-valida-gen').click();
    $('#toast').textContent = ''; copiado = null;
    $('#lg-valida-copy').click();
    await new Promise((ok) => setTimeout(ok, 20));
    assert.ok(copiado && copiado === PYL.app.state.logistics.cards.valida.last && copiado.startsWith('Hola, buen día equipo de'), 'Validación copia su propio mensaje');
    assert.ok(/Mensaje copiado/.test($('#toast').textContent), 'Avisa que copió');
    for (const [k, v] of Object.entries({ name: 'Eugenia', product: 'Omegaxl joint support', address: 'Calle 1', city: 'PASTO', dept: 'NARIÑO', phone: '3214566677', total: '97400' })) escribeP(k, v);
    $('#lg-pedido-gen').click();
    $('#lg-pedido-copy').click();
    await new Promise((ok) => setTimeout(ok, 20));
    assert.strictEqual(copiado, $('#lg-pedido-out').value, 'Copia el mensaje de Pedidos');
    assert.ok(copiado.startsWith('¡Hola Eugenia! 🌟') && copiado !== $('#lg-guia-out').value, 'No es el de Guia');
    for (const k of ['name', 'product', 'address', 'city', 'dept', 'phone', 'total']) escribeP(k, '');
    $('#lg-pedido-clear').click();
    // Pedido Confirmado copia su propio mensaje.
    $('#lg-confirmado-gen').click();
    $('#lg-confirmado-copy').click();
    await new Promise((ok) => setTimeout(ok, 20));
    assert.strictEqual(copiado, $('#lg-confirmado-out').value, 'Copia el mensaje de Pedido Confirmado');
    assert.ok(copiado.startsWith('Gracias por confirmar.'), 'Es el de Pedido Confirmado');
    $('#lg-confirmado-clear').click();
    // Dejar el formulario vacío para el resto de las pruebas.
    for (const k of ['name', 'product', 'guide', 'price', 'address']) escribe(k, '');
    $('#lg-guia-clear').click();
  };

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

  // 11. SPEC 12: atajos flotantes de Testeo (Cadena que decide y Métricas duras).
  const chTest = async () => {
    const $ = (q) => document.querySelector(q);
    const esc = () => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const abierto = (id) => !$(id).hidden;
    assert.ok($('#v-testeo #ch-root #ch-c-btn') && $('#v-testeo #ch-root #ch-d-btn'), 'Los dos botones van dentro de #v-testeo');
    assert.ok(!$('#v-buscar #ch-c-btn') && !$('#v-desarrollo #ch-d-btn') && !$('#v-metricas #ch-root') && !$('#v-escalado #ch-root'), 'Solo en Testeo');
    for (const id of ['ch-root', 'ch-c-btn', 'ch-c-panel', 'ch-c-x', 'ch-d-btn', 'ch-d-panel', 'ch-d-x']) assert.strictEqual(document.querySelectorAll('[id="' + id + '"]').length, 1, '#' + id + ' único');
    assert.ok($('#ch-c-btn svg') && $('#ch-d-btn svg'), 'Los botones llevan ícono SVG');
    const ids = [...document.querySelectorAll('[id^="ch-"]')].map((n) => n.id);
    assert.ok(ids.length >= 14 && new Set(ids).size === ids.length, 'Todos los ids #ch- son únicos: ' + ids.join(', '));
    assert.ok(![...document.querySelectorAll('[id]')].some((n, i, all) => all.filter((m) => m.id === n.id).length > 1), 'Ningún id repetido en la página');
    assert.deepStrictEqual([$('#ch-c-btn').title, $('#ch-d-btn').title], ['Cadena que decide', 'Métricas duras'], 'Títulos');
    assert.ok($('#ch-c-panel').hidden && $('#ch-d-panel').hidden, 'Los paneles empiezan cerrados');
    assert.strictEqual(PYL.app.state.cheat.open, null);
    // Cada botón abre su panel y cierra el otro.
    $('#ch-c-btn').click();
    assert.ok(abierto('#ch-c-panel') && !abierto('#ch-d-panel') && $('#ch-c-btn').getAttribute('aria-expanded') === 'true' && PYL.app.state.cheat.open === 'chain', 'Cadena abre');
    $('#ch-d-btn').click();
    assert.ok(abierto('#ch-d-panel') && !abierto('#ch-c-panel') && $('#ch-c-btn').getAttribute('aria-expanded') === 'false' && $('#ch-d-btn').getAttribute('aria-expanded') === 'true' && PYL.app.state.cheat.open === 'hard', 'Métricas duras abre y cierra Cadena');
    // Volver a tocar el botón, ✕ y Esc cierran.
    $('#ch-d-btn').click();
    assert.ok(!abierto('#ch-d-panel') && PYL.app.state.cheat.open === null, 'El botón cierra');
    $('#ch-c-btn').click(); $('#ch-c-x').click();
    assert.ok(!abierto('#ch-c-panel'), '✕ cierra Cadena');
    $('#ch-d-btn').click(); $('#ch-d-x').click();
    assert.ok(!abierto('#ch-d-panel'), '✕ cierra Métricas duras');
    $('#ch-c-btn').click(); esc();
    assert.ok(!abierto('#ch-c-panel'), 'Esc cierra');
    // Esc no cierra si hay un diálogo encima.
    $('#ch-d-btn').click(); $('#modal').classList.add('show'); esc();
    assert.ok(abierto('#ch-d-panel'), 'Esc no cierra con un diálogo encima');
    $('#modal').classList.remove('show'); esc();
    assert.ok(!abierto('#ch-d-panel'));
    // Abrir uno cierra dk, qk y ap; abrir esos cierra el de Testeo.
    for (const [btn, panel] of [['#dk-btn', '#dk-panel'], ['#qk-btn', '#qk-panel'], ['#ap-btn', '#ap-panel']]) {
      $(btn).click();
      assert.ok(abierto(panel), panel + ' abre');
      $('#ch-c-btn').click();
      assert.ok(!abierto(panel) && abierto('#ch-c-panel'), 'Cadena cierra ' + panel);
      $('#ch-d-btn').click(); $(btn).click();
      assert.ok(abierto(panel) && !abierto('#ch-d-panel') && PYL.app.state.cheat.open === null, panel + ' cierra el panel de Testeo');
      $(btn).click();
    }
    // Salir de la pestaña cierra el panel abierto.
    $('#ch-d-btn').click();
    document.dispatchEvent(new window.CustomEvent('nav:vista', { detail: { v: 'testeo' } }));
    assert.ok(abierto('#ch-d-panel'), 'nav:vista a testeo no cierra');
    document.dispatchEvent(new window.CustomEvent('nav:vista', { detail: { v: 'metricas' } }));
    assert.ok(!abierto('#ch-d-panel') && PYL.app.state.cheat.open === null, 'nav:vista a otra pestaña cierra');
  };

  // 12. SPEC 12, panel Cadena que decide.
  const chCadenaTest = () => {
    const $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
    const C = PYL.core.cheat, M = PYL.core.metrics, T = PYL.core.testing;
    const disparar = (q, tipo) => $(q).dispatchEvent(new window.Event(tipo, { bubbles: false }));
    const marcado = () => $$('#ch-c-chain [data-k]').filter((b) => b.classList.contains('on')).map((b) => b.dataset.k);
    $('#ch-c-btn').click();
    // Estructura: 2 grupos con rótulo y 4 eslabones "Paso N".
    assert.deepStrictEqual($$('#ch-c-chain [data-k]').map((b) => b.dataset.k), ['cpm', 'cpc', 'cppi', 'cpa'], 'Cuatro eslabones en orden');
    assert.ok($$('#ch-c-chain [data-k]').every((b) => b.tagName === 'BUTTON'), 'Los eslabones son botones');
    assert.deepStrictEqual($$('#ch-c-chain [data-k]').map((b) => b.textContent.slice(0, 6)), ['Paso 1', 'Paso 2', 'Paso 3', 'Paso 4'], 'Paso 1 a Paso 4');
    const lados = $$('#ch-c-chain .ch-side');
    assert.deepStrictEqual(lados.map((s) => s.querySelector('.ch-side-t').textContent), ['Métricas antes del clic', 'Métricas después del clic'], 'Rótulos de los grupos');
    assert.deepStrictEqual(lados.map((s) => [...s.querySelectorAll('[data-k]')].map((b) => b.dataset.k)), [['cpm', 'cpc'], ['cppi', 'cpa']], 'CPM y CPC antes; CPPI y CPA después');
    assert.ok(/El primero que se rompe es mi problema/.test($('#ch-c-panel').textContent), 'Línea de cabecera');
    // Al abrir: CPM marcado y su resumen en la zona.
    assert.deepStrictEqual(marcado(), ['cpm'], 'Al abrir está marcado CPM');
    assert.strictEqual($('#ch-c-chain [data-k="cpm"]').getAttribute('aria-pressed'), 'true');
    assert.strictEqual($('#ch-c-chain [data-k="cpc"]').getAttribute('aria-pressed'), 'false');
    const zona = () => $('#ch-c-zone').textContent;
    const cpm = C.chChain().find((e) => e.k === 'cpm');
    assert.ok(zona().includes(cpm.full) && zona().includes(cpm.simple) && zona().includes(cpm.lim.meta) && zona().includes(cpm.lim.tiktok), 'Resumen de CPM: nombre, qué mide y límites');
    assert.ok(zona().includes('Si falla') && zona().includes('Creativos nuevos'), 'CPM trae Si falla → Solución');
    // "¿Qué falla y cómo lo arreglo?" condensado, de cada eslabón (viene de chChain().help).
    const causas = () => $$('#ch-c-zone .ch-cause').map((c) => c.querySelector('b').textContent);
    assert.ok(zona().includes('¿Qué falla y cómo lo arreglo?') && zona().includes('Mientras el CPM esté roto'), 'CPM trae la tabla y su pie');
    assert.deepStrictEqual(causas(), [...cpm.help.rows].map((r) => r.cause), 'Causas de CPM');
    assert.ok(zona().includes('Gancho débil') && zona().includes('Se nota') && zona().includes('Solución'), 'Cada causa dice cómo se nota y la solución');
    for (const e of C.chChain()) {
      $('#ch-c-chain [data-k="' + e.k + '"]').click();
      assert.deepStrictEqual(causas(), [...e.help.rows].map((r) => r.cause), 'Causas de ' + e.k);
      assert.strictEqual($$('#ch-c-zone .ch-cause').length, { cpm: 4, cpc: 2, cppi: 4, cpa: 6 }[e.k], 'Cantidad de causas de ' + e.k);
      assert.ok($('#ch-c-zone .ch-z-foot').textContent.length > 0, 'Pie de ' + e.k);
    }
    assert.ok(zona().includes('Día sin nada') && zona().includes('$ ' + M.copText(2 * M.GENERIC_CPA.apaga)), 'CPA: día sin nada con el doble de apaga');
    $('#ch-c-chain [data-k="cpm"]').click();
    // Pasar el mouse o enfocar no cambia nada; solo el click marca y cambia la zona.
    const antes = zona();
    disparar('#ch-c-chain [data-k="cppi"]', 'mouseenter'); disparar('#ch-c-chain [data-k="cppi"]', 'focus');
    assert.deepStrictEqual(marcado(), ['cpm'], 'mouseenter y focus no marcan');
    assert.strictEqual(zona(), antes, 'La zona no cambia');
    $('#ch-c-chain [data-k="cppi"]').click();
    assert.deepStrictEqual(marcado(), ['cppi'], 'click marca CPPI');
    assert.ok(zona().includes('Buen CPPI y sin ventas') && zona().includes(M.HARD_METRICS.find((r) => r.k === 'cppi').means.full), 'Zona de CPPI');
    $('#ch-c-chain [data-k="cpc"]').click();
    assert.deepStrictEqual(marcado(), ['cpc'], 'click marca CPC');
    assert.ok(zona().includes('CPM sano y CPC caro'));
    $('#ch-c-chain [data-k="cpa"]').click();
    assert.deepStrictEqual(marcado(), ['cpa'], 'click marca CPA');
    assert.ok(zona().includes(C.CH_CPA_READ.fix[0]) && zona().includes('$ ' + M.copText(M.GENERIC_CPA.tope)), 'CPA muestra su lectura propia con el tope genérico');
    // Las lecturas de CPM, CPC y CPPI son las de TEST_CHAIN.reads.
    for (const r of T.TEST_CHAIN.reads) {
      $('#ch-c-chain [data-k="' + r.k + '"]').click();
      assert.ok(zona().includes(r.fix[0]) && r.when.filter((s) => typeof s === 'string').every((s) => zona().includes(s)), 'Lectura de ' + r.k);
    }
    // El mouse encima no cambia lo marcado; el botón no se rehace al marcar.
    const btn = $('#ch-c-chain [data-k="cpc"]');
    disparar('#ch-c-chain [data-k="cpc"]', 'mouseenter'); disparar('#ch-c-chain [data-k="cpc"]', 'mouseleave');
    assert.deepStrictEqual(marcado(), ['cppi'], 'El mouse encima no cambia lo marcado');
    assert.strictEqual($('#ch-c-chain [data-k="cpc"]'), btn, 'No se rehacen los botones');
    // Al volver a abrir, vuelve a CPM.
    $('#ch-c-x').click(); $('#ch-c-btn').click();
    assert.deepStrictEqual(marcado(), ['cpm'], 'Al reabrir vuelve a CPM');
    assert.strictEqual(PYL.app.state.cheat.chainSel, 'cpm');
    $('#ch-c-x').click();
  };

  // 13. SPEC 12, panel Métricas duras.
  const chDurasTest = () => {
    const $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
    const C = PYL.core.cheat, M = PYL.core.metrics, ST = PYL.app.state;
    const disparar = (q, tipo) => $(q).dispatchEvent(new window.Event(tipo, { bubbles: false }));
    const marcado = () => $$('#ch-d-rows [data-k]').filter((b) => b.classList.contains('on')).map((b) => b.dataset.k);
    const fila = (k) => $('#ch-d-rows [data-k="' + k + '"]').textContent;
    const zona = () => $('#ch-d-zone').textContent;
    const cambiar = (p) => { const r = $('#ch-d-plat-' + p); r.checked = true; r.dispatchEvent(new window.Event('change', { bubbles: true })); };
    const simPlat = ST.testing.sim.plat;
    // Con el Simulador en TikTok, el panel abre en TikTok.
    ST.testing.sim.plat = 'tiktok';
    $('#ch-d-btn').click();
    assert.ok($('#ch-d-plat-tiktok').checked && !$('#ch-d-plat-meta').checked, 'Abre con la plataforma del Simulador (TikTok)');
    assert.deepStrictEqual($$('#ch-d-plat input').map((r) => r.name), ['ch-plat', 'ch-plat'], 'Radios con name ch-plat');
    // 5 filas en el orden de HARD_METRICS, con nombre, límite y pregunta.
    assert.deepStrictEqual($$('#ch-d-rows [data-k]').map((b) => b.dataset.k), ['ctr', 'cpc', 'cpm', 'cppi', 'cpa'], 'Cinco filas en orden');
    assert.ok($$('#ch-d-rows [data-k]').every((b) => b.tagName === 'BUTTON'), 'Las filas son botones');
    for (const h of M.HARD_METRICS) assert.ok(fila(h.k).includes(h.name) && fila(h.k).includes(h.view.tiktok.main) && fila(h.k).includes(h.question), 'Fila ' + h.k + ' en TikTok');
    assert.ok(fila('cpm').includes('≤ 6.000') && fila('ctr').includes('> 0,5 %'), 'Límites de TikTok');
    // Cambiar a Meta repinta, no toca el Simulador.
    const btnCpm = $('#ch-d-rows [data-k="cpm"]');
    cambiar('meta');
    assert.ok(fila('cpm').includes('≤ 20.000') && fila('ctr').includes('> 2 %'), 'Límites de Meta');
    assert.strictEqual(ST.testing.sim.plat, 'tiktok', 'Cambiar la plataforma del panel no cambia el Simulador');
    assert.strictEqual(ST.cheat.plat, 'meta');
    assert.strictEqual($('#ch-d-rows [data-k="cpm"]'), btnCpm, 'No se rehacen las filas');
    // Al abrir, marcada la primera fila (CTR).
    $('#ch-d-x').click(); $('#ch-d-btn').click();
    assert.ok($('#ch-d-plat-tiktok').checked, 'Al reabrir vuelve a tomar la del Simulador');
    assert.deepStrictEqual(marcado(), ['ctr'], 'Al abrir está marcada la primera fila');
    assert.strictEqual($('#ch-d-rows [data-k="ctr"]').getAttribute('aria-pressed'), 'true');
    // CTR: sin advertencia en TikTok, con ⚠ en amarillo en Meta.
    assert.ok(zona().includes('Límite máximo permitido') && zona().includes('0,5 %') && zona().includes('No se mira'), 'Zona del CTR en TikTok: límite y nota');
    assert.ok(!$('#ch-d-zone .hm-warn'), 'El CTR de TikTok no trae advertencia');
    cambiar('meta');
    assert.ok($('#ch-d-zone .hm-warn') && $('#ch-d-zone .hm-warn').textContent.includes('⚠') && $('#ch-d-zone .hm-warn').textContent.includes(M.CTR_UNIQUE_WARN), 'El CTR de Meta trae ⚠ CTR_UNIQUE_WARN');
    // Rango ideal en CPM (Meta).
    disparar('#ch-d-rows [data-k="cpm"]', 'mouseenter'); disparar('#ch-d-rows [data-k="cpm"]', 'focus');
    assert.deepStrictEqual(marcado(), ['ctr'], 'mouseenter y focus no marcan');
    $('#ch-d-rows [data-k="cpm"]').click();
    assert.deepStrictEqual(marcado(), ['cpm'], 'click marca CPM');
    assert.ok(zona().includes('Límite máximo permitido') && zona().includes('$ 20.000') && zona().includes('Rango ideal') && zona().includes('$ 5.000') && !$('#ch-d-zone .hm-warn'), 'Zona de CPM: límite y rango ideal');
    // Diagnóstico y palanca con sus rótulos, de la fila.
    const cpm = M.HARD_METRICS.find((r) => r.k === 'cpm');
    assert.ok(zona().includes(M.FAIL_HEAD[0]) && zona().includes(M.FAIL_HEAD[1]) && zona().includes('Diagnóstico si falla') && zona().includes('Palanca de solución'), 'Rótulos de diagnóstico y palanca');
    assert.strictEqual($$('#ch-d-zone .ch-z-diag li').length, cpm.diag.length, 'Todos los diagnósticos');
    assert.strictEqual($$('#ch-d-zone .ch-z-lever li').length, cpm.lever.length, 'Todas las palancas');
    assert.ok(zona().includes('creativos nuevos') && $('#ch-d-zone .ch-z-diag b'), 'Los segmentos { b } van en negrita');
    // focus y click.
    disparar('#ch-d-rows [data-k="cppi"]', 'focus');
    assert.deepStrictEqual(marcado(), ['cpm'], 'focus no cambia lo marcado');
    $('#ch-d-rows [data-k="cppi"]').click();
    assert.deepStrictEqual(marcado(), ['cppi'], 'click marca CPPI');
    $('#ch-d-rows [data-k="cpc"]').click();
    assert.deepStrictEqual(marcado(), ['cpc'], 'click marca CPC');
    // CPA: zonas genéricas (escala, tope, apaga).
    $('#ch-d-rows [data-k="cpa"]').click();
    const z = M.GENERIC_CPA;
    assert.ok(['12.000', '15.000', '20.000'].every((n) => zona().includes(n)) && zona().includes(M.copText(z.escala)) && /Escala/.test(zona()) && /Tope/.test(zona()) && /Apaga/.test(zona()), 'CPA: escala 12.000, tope 15.000 y apaga 20.000');
    // La plataforma del panel no se guarda ni cambia el Simulador.
    assert.strictEqual(ST.testing.sim.plat, 'tiktok');
    ST.testing.sim.plat = simPlat;
    $('#ch-d-x').click();
    // Un valor raro del Simulador cae en Meta.
    ST.testing.sim.plat = 'otra'; $('#ch-d-btn').click();
    assert.ok($('#ch-d-plat-meta').checked, 'Una plataforma desconocida cae en Meta');
    ST.testing.sim.plat = simPlat; $('#ch-d-x').click();
  };

  // 8f. Centro de mando · modo Editar, validación, Listo y Cancelar (SPEC 14, paso 4). Async: usa un localStorage simulado.
  const hubTest = async () => {
    delete store['pyl-hub'];
    const d = await fresca(), W = d.window, D = W.document, P = W.PYL;
    const $ = (q) => D.querySelector(q), $$ = (q) => [...D.querySelectorAll(q)];
    const tipea = (el, v) => { el.value = v; el.dispatchEvent(new W.Event('input', { bubbles: true })); el.dispatchEvent(new W.Event('change', { bubbles: true })); };
    const H = P.app.state.hub;
    // Sin clave: los 9 de fábrica.
    assert.strictEqual(H.items.length, 9, 'Sin pyl-hub arranca con los 9');
    // Editar: una fila por acceso, botón "Listo", "Cancelar" visible, rejilla oculta.
    assert.ok($('#hb-cancel').hidden && $('#hb-list').hidden && $('#hb-edit').textContent === 'Editar', 'Al inicio: sin Cancelar ni lista');
    $('#hb-edit').click();
    assert.strictEqual($$('#hb-list .hb-row').length, 9, 'Editar muestra 9 filas');
    assert.ok($('#hb-edit').textContent === 'Listo' && !$('#hb-cancel').hidden && $('#hb-grid').hidden && !$('#hb-list').hidden, 'Listo + Cancelar, rejilla oculta');
    assert.strictEqual(H.editing, true);
    // "Usar ads.tiktok.com" solo en accesos de fábrica con URL vacía; pone la URL sugerida y se oculta.
    const use = $('#hb-list .hb-row[data-id="tiktok"] .hb-use');
    assert.strictEqual(use.textContent, 'Usar ads.tiktok.com');
    assert.ok($$('#hb-list .hb-use').length === 9 && $$('#hb-list .hb-use').every((b) => !b.hidden), 'Los 9 de fábrica ofrecen su dominio');
    use.click();
    assert.strictEqual($('#hb-f-url-tiktok').value, 'https://ads.tiktok.com/');
    assert.ok(use.hidden, 'Con URL el botón se oculta');
    tipea($('#hb-f-url-tiktok'), '');
    assert.ok(!use.hidden, 'Con la URL vacía vuelve a aparecer');
    // Sin línea de ayuda: ni la de TikTok ni la de Meta.
    assert.strictEqual($$('#hb-list .hb-hint').length, 0, 'Ya no hay textos de ayuda');
    assert.ok(!/aadvid|act=/.test($('#hb-list').textContent), 'Sin el texto de la cuenta publicitaria');
    // URL inválida: .hb-bad, aria-invalid, mensaje; "Listo" no guarda ni contrae.
    tipea($('#hb-f-url-meta'), 'x.co');
    assert.ok($('#hb-f-url-meta').classList.contains('hb-bad') && $('#hb-f-url-meta').getAttribute('aria-invalid') === 'true', 'x.co se marca');
    assert.ok(/http/.test($('#hb-err-meta').textContent), 'Mensaje de error de la URL');
    $('#toast').textContent = '';
    $('#hb-edit').click();
    assert.ok(H.editing && !$('#hb-list').hidden && /rojo/.test($('#toast').textContent), 'Con error no contrae y avisa');
    assert.strictEqual(store['pyl-hub'], undefined, 'Nada se guarda con errores');
    assert.strictEqual(D.activeElement && D.activeElement.id, 'hb-f-url-meta', 'El cursor va al primer campo con error');
    // Nombre vacío también es error.
    tipea($('#hb-f-url-meta'), '');
    tipea($('#hb-f-name-dropi'), '  ');
    assert.ok($('#hb-f-name-dropi').classList.contains('hb-bad'), 'Nombre vacío se marca');
    tipea($('#hb-f-name-dropi'), 'Dropi');
    assert.ok($$('#hb-list .hb-bad').length === 0 && $$('#hb-list .hb-err').every((e) => e.textContent === ''), 'Se limpian los errores al corregir');
    // Renombrar recalcula las iniciales en la vista previa.
    tipea($('#hb-f-name-claude'), 'Mi gran tienda');
    assert.strictEqual($('#hb-list .hb-row[data-id="claude"] .hb-ini').textContent, 'MGT', 'La vista previa recalcula las iniciales');
    // Nada en pyl-hub hasta "Listo"; Cancelar descarta el borrador sin preguntar.
    tipea($('#hb-f-url-skool'), 'https://www.skool.com/');
    assert.strictEqual(store['pyl-hub'], undefined, 'Nada cambia en pyl-hub antes de Listo');
    $('#hb-cancel').click();
    assert.ok(!H.editing && $('#hb-list').hidden && !$('#hb-grid').hidden && $('#hb-list').children.length === 0, 'Cancelar contrae');
    assert.ok(H.items.every((x) => x.url === '') && H.items.find((x) => x.id === 'claude').name === 'Claude', 'Cancelar descarta los cambios');
    assert.strictEqual($('#hb-grid .hb-tile[data-id="skool"]').tagName, 'BUTTON');
    // Clic en un acceso sin URL abre Editar con el cursor en su URL.
    $('#hb-grid .hb-tile[data-id="dropkiller"]').click();
    assert.ok(H.editing && $$('#hb-list .hb-row').length === 9, 'Clic en acceso sin URL abre Editar');
    assert.strictEqual(D.activeElement && D.activeElement.id, 'hb-f-url-dropkiller', 'Cursor en su URL');
    // "Listo" válido: guarda (v 1), contrae y repinta la rejilla.
    tipea($('#hb-f-url-skool'), ' https://www.skool.com/grupo ');
    tipea($('#hb-f-name-claude'), ' Claude Code ');
    $('#hb-edit').click();
    assert.ok(!H.editing && $('#hb-list').hidden && $('#hb-edit').textContent === 'Editar' && $('#hb-cancel').hidden, 'Listo contrae');
    const g = JSON.parse(store['pyl-hub']);
    assert.ok(g.v === 1 && g.items.length === 9, 'Guarda { v: 1, items }');
    assert.strictEqual(g.items.find((x) => x.id === 'skool').url, 'https://www.skool.com/grupo', 'Guarda la URL recortada');
    assert.strictEqual(g.items.find((x) => x.id === 'claude').name, 'Claude Code');
    const sk = $('#hb-grid .hb-tile[data-id="skool"]');
    assert.ok(sk.tagName === 'A' && sk.target === '_blank' && sk.getAttribute('href') === 'https://www.skool.com/grupo', 'Skool ahora es un enlace');
    W.close();
    // Recargar: conserva lo guardado.
    const d2 = await fresca();
    assert.strictEqual(d2.window.document.querySelector('#hb-grid .hb-tile[data-id="skool"]').getAttribute('href'), 'https://www.skool.com/grupo', 'Tras recargar conserva la URL');
    d2.window.close();
    // Guardado roto o de otra versión: los 9 de fábrica, sin errores en consola.
    for (const raro of ['{roto', JSON.stringify({ v: 9, items: [{ id: 'a', name: 'A' }] })]) {
      store['pyl-hub'] = raro;
      const d3 = await fresca();
      assert.strictEqual(d3.window.document.querySelectorAll('#hb-grid .hb-tile').length, 9, 'Guardado roto: 9 de fábrica');
      d3.window.close();
    }
    delete store['pyl-hub'];
  };

  // 8g. Centro de mando · orden, quitar y agregar (SPEC 14, paso 5). Async: los diálogos son promesas.
  const hubTest2 = async () => {
    delete store['pyl-hub'];
    const d = await fresca(), W = d.window, D = W.document, P = W.PYL;
    const $ = (q) => D.querySelector(q), $$ = (q) => [...D.querySelectorAll(q)];
    const tick = () => new Promise((ok) => setTimeout(ok, 0));
    const tipea = (el, v) => { el.value = v; el.dispatchEvent(new W.Event('input', { bubbles: true })); el.dispatchEvent(new W.Event('change', { bubbles: true })); };
    const ids = () => $$('#hb-list .hb-row').map((r) => r.dataset.id);
    const H = P.app.state.hub;
    $('#hb-edit').click();
    // Sin colores: las filas ya no traen selector.
    assert.strictEqual($$('#hb-list .hb-sw, #hb-list .hb-colors').length, 0, 'No hay selector de color');
    // Reordenar se hace arrastrando en la vista normal: las filas ya no traen ↑ ni ↓.
    assert.strictEqual($$('#hb-list .hb-up, #hb-list .hb-down, #hb-list .hb-mv').length, 0, 'Sin botones ↑ ↓');
    // Quitar una fila rehace la lista pero conserva lo escrito en las otras filas y en la fila Agregar.
    tipea($('#hb-f-name-dropi'), 'Dropi Pro');
    $('#hb-new-name').value = 'Pendiente';
    // Quitar: pregunta antes; Cancelar no quita, Quitar sí.
    $('#hb-list .hb-row[data-id="kalodata"] .hb-del').click();
    await tick();
    assert.ok($('#modal').classList.contains('show') && /Quitar «Kalodata» del Centro de mando\?/.test($('#modal-p').textContent), 'Pregunta con el nombre');
    $('#modal [data-r="cancel"]').click(); await tick();
    assert.ok(ids().includes('kalodata'), 'Cancelar la pregunta no quita nada');
    $('#hb-list .hb-row[data-id="kalodata"] .hb-del').click(); await tick();
    $('#modal [data-r="del"]').click(); await tick();
    assert.ok(!ids().includes('kalodata') && ids().length === 8, 'Quitar saca la fila');
    assert.strictEqual($('#hb-f-name-dropi').value, 'Dropi Pro', 'Quitar no pierde nombres editados');
    assert.strictEqual($('#hb-new-name').value, 'Pendiente', 'Quitar no vacía la fila Agregar');
    $('#hb-new-name').value = '';
    assert.ok(H.items.some((x) => x.id === 'kalodata'), 'Lo guardado no cambia hasta Listo');
    // Agregar: los dos campos son obligatorios y la URL va con http(s)://.
    $('#hb-add').click();
    assert.ok(/nombre/i.test($('#hb-err-new').textContent) && $('#hb-new-name').classList.contains('hb-bad') && ids().length === 8, 'Sin nada: avisa y no agrega');
    tipea($('#hb-new-name'), 'Mi tienda');
    assert.strictEqual($('#hb-err-new').textContent, '', 'Escribir limpia el aviso');
    $('#hb-add').click();
    assert.ok(/dirección/i.test($('#hb-err-new').textContent) && ids().length === 8, 'Sin URL: avisa y no agrega');
    tipea($('#hb-new-url'), 'mitienda.co');
    $('#hb-add').click();
    assert.ok($('#hb-new-url').classList.contains('hb-bad') && ids().length === 8, 'URL sin http(s) no agrega');
    tipea($('#hb-new-url'), 'https://mitienda.co');
    $('#hb-add').click();
    assert.strictEqual(ids().length, 9, 'Con datos agrega');
    const nuevo = $$('#hb-list .hb-row').pop();
    assert.ok(/^u/.test(nuevo.dataset.id) && nuevo.querySelector('input[type=text]').value === 'Mi tienda', 'El nuevo queda al final con su nombre');
    assert.ok(!nuevo.querySelector('.hb-use'), 'Sin "Usar dominio"');
    assert.ok($('#hb-new-name').value === '' && $('#hb-new-url').value === '' && $('#hb-err-new').textContent === '', 'Los campos se vacían');
    assert.strictEqual(D.activeElement && D.activeElement.id, 'hb-new-name', 'El cursor vuelve a Nombre');
    // Enter en la fila Agregar también agrega.
    tipea($('#hb-new-name'), 'Otra'); tipea($('#hb-new-url'), 'https://otra.co');
    $('#hb-new-url').dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    assert.strictEqual(ids().length, 10, 'Enter agrega');
    // Dos altas seguidas no repiten id.
    assert.strictEqual(new Set(ids()).size, 10, 'Ids únicos');
    // Cancelar descarta todo el borrador (orden, quitados, agregados y textos): al volver a Editar están los 9 de fábrica.
    tipea($('#hb-f-url-tiktok'), 'https://ads.tiktok.com/x');
    $('#hb-cancel').click(); $('#hb-edit').click();
    assert.deepStrictEqual(ids(), ['tiktok', 'meta', 'adlib', 'dropi', 'dropkiller', 'kalodata', 'skool', 'chatgpt', 'claude'], 'Cancelar descarta los cambios del borrador');
    assert.ok($$('#hb-list input[id^="hb-f-url-"]').every((i) => i.value === ''), 'Sin URL');
    assert.ok(!$('#hb-reset'), 'Ya no existe Restaurar botones');
    assert.strictEqual(store['pyl-hub'], undefined, 'Nada se guardó en todo el recorrido');
    // Listo guarda lo hecho: quitar y agregar.
    $('#hb-list .hb-row[data-id="chatgpt"] .hb-del').click(); await tick();
    $('#modal [data-r="del"]').click(); await tick();
    tipea($('#hb-new-name'), 'Mi tienda'); tipea($('#hb-new-url'), 'https://mitienda.co'); $('#hb-add').click();
    $('#hb-edit').click();
    const g = JSON.parse(store['pyl-hub']);
    assert.deepStrictEqual(g.items.map((x) => x.id).slice(0, 8), ['tiktok', 'meta', 'adlib', 'dropi', 'dropkiller', 'kalodata', 'skool', 'claude'], 'Guarda el orden (sin ChatGPT)');
    assert.strictEqual(g.items.length, 9);
    assert.strictEqual(g.items[8].name, 'Mi tienda');
    // Lista vacía: mensaje en la rejilla.
    $('#hb-edit').click();
    for (const id of ids()) { $(`#hb-list .hb-row[data-id="${id}"] .hb-del`).click(); await tick(); $('#modal [data-r="del"]').click(); await tick(); }
    assert.strictEqual(ids().length, 0);
    $('#hb-edit').click();
    assert.strictEqual($('#hb-grid').textContent, 'Sin accesos. Toca Editar para agregar uno.', 'Lista vacía');
    W.close();
    delete store['pyl-hub'];
  };

  // 8h. Centro de mando · ícono propio: archivo, Ctrl+V en la fila enfocada y quitar (SPEC 14, paso 6). jsdom no carga imágenes: imageDataURL se simula.
  const hubTest3 = async () => {
    delete store['pyl-hub'];
    const d = await fresca(), W = d.window, D = W.document, P = W.PYL;
    const $ = (q) => D.querySelector(q), $$ = (q) => [...D.querySelectorAll(q)];
    const tick = () => new Promise((ok) => setTimeout(ok, 0));
    const medidas = [];
    P.services.files.imageDataURL = async (f, max, q, type) => { medidas.push(max + ':' + type); if (f.name === 'malo.png') throw new Error('x'); return 'data:image/jpeg;base64,' + f.name; };
    const H = P.app.state.hub;
    const row = (id) => $(`#hb-list .hb-row[data-id="${id}"]`);
    const pega = (files, texto) => {
      const ev = new W.Event('paste', { bubbles: true, cancelable: true });
      ev.clipboardData = { files, items: [], getData: () => texto || '' };
      D.activeElement.dispatchEvent(ev);
      return ev;
    };
    const png = (name) => new W.File(['x'], name, { type: 'image/png' });
    // Con el modo Editar cerrado, pegar no hace nada.
    assert.strictEqual(pega([png('a.png')]).defaultPrevented, false, 'Sin Editar no se escucha el pegado');
    $('#hb-edit').click();
    // Subir por archivo: se reduce a 128 px y la vista previa usa el ícono propio.
    assert.ok(row('dropi').querySelector('.hb-icon-up') && row('dropi').querySelector('.hb-icon-rm').hidden, 'Subir ícono visible, Quitar oculto');
    const inp = row('dropi').querySelector('.hb-file');
    Object.defineProperty(inp, 'files', { configurable: true, value: [png('dropi.png')] });
    inp.dispatchEvent(new W.Event('change', { bubbles: true }));
    await tick();
    assert.deepStrictEqual(medidas, ['128:image/png'], 'imageDataURL a 128 px y en PNG (conserva la transparencia)');
    assert.strictEqual(H.draft.find((x) => x.id === 'dropi').icon, 'data:image/jpeg;base64,dropi.png', 'El borrador guarda el ícono');
    assert.ok(!row('dropi').querySelector('.hb-icon-rm').hidden, 'Aparece Quitar ícono');
    const pi = row('dropi').querySelector('.hb-ico img');
    assert.ok(pi && pi.src.startsWith('data:image/jpeg') && !row('dropi').querySelector('img.hb-fav'), 'La vista previa muestra el ícono propio (sin favicon)');
    // Aunque tenga URL (favicon), manda el ícono propio.
    const url = $('#hb-f-url-dropi'); url.value = 'https://app.dropi.co/'; url.dispatchEvent(new W.Event('input', { bubbles: true })); url.dispatchEvent(new W.Event('change', { bubbles: true }));
    assert.ok(row('dropi').querySelector('.hb-ico img') && !row('dropi').querySelector('img.hb-fav'), 'Con ícono propio no se pide el favicon');
    // Ctrl+V: solo aplica a la fila que tiene el foco.
    $('#hb-f-name-meta').focus();
    const ev = pega([png('meta.png')]);
    assert.ok(ev.defaultPrevented, 'La imagen pegada se atiende');
    await tick();
    assert.strictEqual(H.draft.find((x) => x.id === 'meta').icon, 'data:image/jpeg;base64,meta.png', 'Pegado en la fila enfocada');
    assert.ok(H.draft.filter((x) => x.icon).map((x) => x.id).sort().join() === 'dropi,meta', 'Ninguna otra fila cambió');
    // Sin fila enfocada: no hace nada.
    D.activeElement.blur(); $('#hb-edit').focus();
    const sin = pega([png('x.png')]);
    assert.strictEqual(sin.defaultPrevented, false, 'Sin fila enfocada no se atiende');
    // Solo texto: sigue su curso normal.
    $('#hb-f-name-meta').focus();
    assert.strictEqual(pega([], 'hola').defaultPrevented, false, 'Un pegado de texto no se intercepta');
    // Imagen que no se puede leer: avisa y no cambia.
    $('#toast').textContent = '';
    pega([png('malo.png')]); await tick();
    assert.ok(/imagen/.test($('#toast').textContent) && H.draft.find((x) => x.id === 'meta').icon === 'data:image/jpeg;base64,meta.png', 'Imagen inválida: avisa');
    // Quitar ícono.
    row('meta').querySelector('.hb-icon-rm').click();
    assert.strictEqual(H.draft.find((x) => x.id === 'meta').icon, null, 'Quitar ícono');
    assert.ok(row('meta').querySelector('.hb-icon-rm').hidden && !row('meta').querySelector('.hb-ico img'), 'Vuelve a iniciales (meta no tiene URL)');
    // Listo guarda el ícono; recargar lo conserva; el ícono propio sobrevive a que se rehagan las filas (al agregar un botón).
    $('#hb-new-name').value = 'Otro'; $('#hb-new-url').value = 'https://otro.co'; $('#hb-add').click();
    assert.ok(row('dropi').querySelector('.hb-ico img'), 'Rehacer las filas conserva el ícono');
    $('#hb-edit').click();
    const g = JSON.parse(store['pyl-hub']);
    assert.strictEqual(g.items.find((x) => x.id === 'dropi').icon, 'data:image/jpeg;base64,dropi.png', 'Listo guarda el ícono propio');
    assert.strictEqual(g.items.find((x) => x.id === 'meta').icon, null);
    assert.strictEqual($('#hb-grid .hb-tile[data-id="dropi"] img').src, 'data:image/jpeg;base64,dropi.png', 'La rejilla muestra el ícono propio');
    // Cerrado Editar, el pegado vuelve a ignorarse.
    D.body.focus();
    assert.strictEqual(pega([png('z.png')]).defaultPrevented, false, 'Cerrado Editar se deja de escuchar');
    W.close();
    const d2 = await fresca();
    assert.ok(d2.window.document.querySelector('#hb-grid .hb-tile[data-id="dropi"] img').src.startsWith('data:image/jpeg'), 'Tras recargar conserva el ícono');
    d2.window.close();
    delete store['pyl-hub'];
  };

  // 8i. Centro de mando · reubicar arrastrando en la vista normal (SPEC 14). Los eventos de puntero se simulan; jsdom no tiene layout.
  const hubTest4 = async () => {
    delete store['pyl-hub'];
    const d = await fresca(), W = d.window, D = W.document, P = W.PYL;
    const $ = (q) => D.querySelector(q);
    const H = P.app.state.hub;
    const orden = () => [...D.querySelectorAll('#hb-grid .hb-tile')].map((t) => t.dataset.id);
    const tile = (id) => $(`#hb-grid .hb-tile[data-id="${id}"]`);
    let sobre = null;
    D.elementFromPoint = () => sobre;
    const ev = (tipo, x, y, objetivo) => {
      const e = new W.MouseEvent(tipo, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
      (objetivo || D).dispatchEvent(e);
      return e;
    };
    // Sin mover (menos de 6 px) es un clic normal: el orden no cambia y no hay copia flotante.
    ev('pointerdown', 10, 10, tile('meta'));
    ev('pointermove', 12, 11);
    assert.ok(!$('.hb-ghost') && !tile('meta').classList.contains('hb-lifted'), 'Con menos de 6 px no empieza el arrastre');
    ev('pointerup', 12, 11);
    assert.strictEqual(store['pyl-hub'], undefined, 'Un toque no guarda nada');
    // Arrastrar Meta sobre Ad Library: queda después de ella, se guarda y la rejilla se repinta.
    ev('pointerdown', 10, 10, tile('meta'));
    ev('pointermove', 40, 10);
    assert.ok($('.hb-ghost') && tile('meta').classList.contains('hb-lifted') && D.body.classList.contains('hb-dragging'), 'Al arrastrar: copia flotante, botón tenue y cursor');
    sobre = tile('adlib');
    ev('pointermove', 60, 12);
    assert.deepStrictEqual(orden().slice(0, 3), ['tiktok', 'adlib', 'meta'], 'Los demás se acomodan al instante');
    ev('pointerup', 60, 12);
    assert.ok(!$('.hb-ghost') && !D.body.classList.contains('hb-dragging'), 'Al soltar se quita la copia');
    assert.deepStrictEqual(orden().slice(0, 3), ['tiktok', 'adlib', 'meta'], 'La rejilla queda en el nuevo orden');
    assert.deepStrictEqual(JSON.parse(store['pyl-hub']).items.map((x) => x.id).slice(0, 3), ['tiktok', 'adlib', 'meta'], 'El orden se guarda al soltar');
    assert.deepStrictEqual([...H.items.map((x) => x.id)], orden(), 'El estado coincide con la rejilla');
    // El clic que llega al soltar no abre el editor.
    tile('meta').dispatchEvent(new W.MouseEvent('click', { bubbles: true, cancelable: true }));
    assert.strictEqual(H.editing, false, 'Tras arrastrar no se abre el editor');
    await new Promise((ok) => setTimeout(ok, 5));
    // Un clic normal después sí abre el editor (la supresión es de una sola vez).
    tile('kalodata').click();
    assert.strictEqual(H.editing, true, 'Un clic normal vuelve a abrir el editor');
    $('#hb-cancel').click();
    // Esc cancela y devuelve el botón a su lugar.
    const antes = orden().join();
    ev('pointerdown', 10, 10, tile('skool'));
    ev('pointermove', 40, 10);
    sobre = tile('tiktok');
    ev('pointermove', 41, 10);
    assert.notStrictEqual(orden().join(), antes, 'En pleno arrastre el orden cambia');
    D.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.strictEqual(orden().join(), antes, 'Esc devuelve todo a su lugar');
    assert.ok(!$('.hb-ghost') && JSON.parse(store['pyl-hub']).items.map((x) => x.id).join() === antes, 'Esc no guarda nada');
    ev('pointerup', 41, 10);
    // Soltar sin haber cambiado el orden no guarda de nuevo.
    store['pyl-hub'] = 'SENTINELA';
    sobre = null;
    ev('pointerdown', 10, 10, tile('claude'));
    ev('pointermove', 40, 10);
    ev('pointerup', 40, 10);
    assert.strictEqual(store['pyl-hub'], 'SENTINELA', 'Sin cambio de orden no se guarda');
    // Con el modo Editar abierto, la rejilla está oculta y no se arrastra (las filas usan ↑ y ↓).
    W.close();
    delete store['pyl-hub'];
  };

  // 8j. Centro de mando · sin espacio para guardar y ids únicos (SPEC 14, criterios de persistencia y calidad).
  const hubTest5 = async () => {
    delete store['pyl-hub'];
    const d = await fresca(), W = d.window, D = W.document, P = W.PYL;
    const $ = (q) => D.querySelector(q);
    const tipea = (el, v) => { el.value = v; el.dispatchEvent(new W.Event('input', { bubbles: true })); el.dispatchEvent(new W.Event('change', { bubbles: true })); };
    const H = P.app.state.hub;
    const real = W.localStorage.setItem;
    const sinEspacio = () => { W.localStorage.setItem = () => { throw new Error('QuotaExceededError'); }; };
    // Ids #hb- únicos con el modo Editar abierto (9 filas).
    $('#hb-edit').click();
    const hbIds = [...D.querySelectorAll('[id^="hb-"]')].map((e) => e.id);
    assert.strictEqual(new Set(hbIds).size, hbIds.length, 'Los ids #hb- son únicos: ' + hbIds.filter((x, i) => hbIds.indexOf(x) !== i));
    // Sin espacio: «Listo» avisa, no contrae, conserva el borrador y no cambia lo guardado.
    sinEspacio();
    tipea($('#hb-f-url-skool'), 'https://www.skool.com/x');
    $('#toast').textContent = '';
    $('#hb-edit').click();
    assert.ok(H.editing && !$('#hb-list').hidden && /poco espacio/.test($('#toast').textContent), 'Sin espacio: avisa y deja Editar abierto');
    assert.strictEqual($('#hb-f-url-skool').value, 'https://www.skool.com/x', 'El borrador no se pierde');
    assert.ok(H.draft.find((x) => x.id === 'skool').url === 'https://www.skool.com/x' && H.items.every((x) => x.url === ''), 'Lo guardado no cambió');
    assert.strictEqual(store['pyl-hub'], undefined, 'No se escribió nada');
    // Con espacio otra vez, el mismo borrador se guarda.
    W.localStorage.setItem = real;
    $('#hb-edit').click();
    assert.ok(!H.editing && JSON.parse(store['pyl-hub']).items.find((x) => x.id === 'skool').url === 'https://www.skool.com/x', 'Con espacio, el borrador conservado se guarda');
    // Arrastrar sin espacio: avisa y deja el orden anterior.
    const tile = (id) => $(`#hb-grid .hb-tile[data-id="${id}"]`);
    const orden = () => [...D.querySelectorAll('#hb-grid .hb-tile')].map((t) => t.dataset.id).join();
    const antes = orden();
    let sobre = null;
    D.elementFromPoint = () => sobre;
    const ev = (tipo, x, y, objetivo) => (objetivo || D).dispatchEvent(new W.MouseEvent(tipo, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
    sinEspacio();
    $('#toast').textContent = '';
    ev('pointerdown', 10, 10, tile('meta'));
    ev('pointermove', 40, 10);
    sobre = tile('adlib');
    ev('pointermove', 60, 12);
    ev('pointerup', 60, 12);
    assert.ok(/orden/.test($('#toast').textContent), 'Arrastrar sin espacio avisa');
    assert.strictEqual(orden(), antes, 'Y deja el orden anterior');
    assert.strictEqual(JSON.parse(store['pyl-hub']).items.map((x) => x.id).join(), antes, 'Sin cambios en lo guardado');
    W.close();
    delete store['pyl-hub'];
  };

  // 8t. Reloj de la barra · bucle de pintado (SPEC 20, paso 5). Página aparte con matchMedia, requestAnimationFrame,
  // document.hidden y Date simulados. Los fotogramas pendientes (también los de otros módulos) se corren a mano.
  const ckPage = (o) => JSDOM.fromFile(path.join(__dirname, '..', 'index.html'), {
    runScripts: 'dangerously', resources: new Loader(), pretendToBeVisual: true, virtualConsole,
    beforeParse(w) {
      const mqs = {};
      w.matchMedia = (q) => (mqs[q] = mqs[q] || { media: q, matches: /1680/.test(q) ? !!o.wide : /reduce/.test(q) ? !!o.reduce : false, ls: [], addEventListener(t, f) { if (t === 'change') this.ls.push(f); }, removeEventListener() {} });
      let n = 0;
      const frames = new Map();
      w.requestAnimationFrame = (f) => { frames.set(++n, f); return n; };
      w.cancelAnimationFrame = (id) => { frames.delete(id); };
      let hidden = !!o.hidden;
      Object.defineProperty(w.document, 'hidden', { configurable: true, get: () => hidden });
      const RealDate = w.Date;
      let fixed = null;
      w.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(fixed == null ? RealDate.now() : fixed); } static now() { return fixed == null ? RealDate.now() : fixed; } };
      w.__ck = {
        at: (ms) => { fixed = ms; },
        frames: () => { const fs = [...frames.values()]; frames.clear(); fs.forEach((f) => f(0)); },
        hide: (v) => { hidden = v; w.document.dispatchEvent(new w.Event('visibilitychange')); },
        media: (q, v) => { const m = mqs[q]; m.matches = v; m.ls.forEach((f) => f({ matches: v, media: q })); },
      };
    },
  }).then((d) => new Promise((ok) => { if (d.window.document.readyState === 'complete') ok(d); else d.window.addEventListener('load', () => ok(d)); }));

  const ckTest = async () => {
    const WIDE = '(min-width: 1680px)';
    const T0 = new Date(2026, 10, 20, 10, 42, 30).getTime();
    const seg = (W) => W.document.querySelector('#ck-face .ck-s').getAttribute('transform');
    const day = (W) => W.document.getElementById('ck-day').textContent;

    // Ancho y visible: cada fotograma pinta la hora real.
    let d = await ckPage({ wide: true });
    let W = d.window, K = W.__ck;
    K.at(T0); K.frames();
    assert.strictEqual(seg(W), 'rotate(180 50 50)', 'Bucle: el fotograma pinta 10:42:30');
    K.at(T0 + 5000); K.frames();
    assert.strictEqual(seg(W), 'rotate(210 50 50)', 'Bucle: 5 s después el segundero avanzó');
    // Pestaña oculta: el bucle se detiene; al volver pinta la hora correcta al instante.
    K.hide(true);
    K.at(T0 + 10000); K.frames();
    assert.strictEqual(seg(W), 'rotate(210 50 50)', 'Oculta: los fotogramas ya no pintan');
    K.hide(false);
    assert.strictEqual(seg(W), 'rotate(240 50 50)', 'Al volver pinta la hora del momento');
    K.at(T0 + 15000); K.frames();
    assert.strictEqual(seg(W), 'rotate(270 50 50)', 'Y el bucle sigue');
    // Pantalla angosta: también se detiene; al ensanchar vuelve.
    K.media(WIDE, false);
    K.at(T0 + 20000); K.frames();
    assert.strictEqual(seg(W), 'rotate(270 50 50)', 'Angosta: no pinta');
    K.media(WIDE, true);
    assert.strictEqual(seg(W), 'rotate(300 50 50)', 'Al ensanchar pinta y reanuda');
    W.document.getElementById('ck-root').click();
    assert.strictEqual(seg(W), 'rotate(300 50 50)', 'El clic no hace nada');
    W.close();

    // Angosta desde el arranque: pinta una vez al cargar y no corre el bucle.
    d = await ckPage({ wide: false });
    W = d.window; K = W.__ck;
    const s0 = seg(W);
    assert.ok(day(W) && s0, 'Angosta: pintó una vez al cargar');
    K.at(T0 + 7000); K.frames();
    assert.strictEqual(seg(W), s0, 'Angosta: sin bucle');
    W.close();

    // Oculta desde el arranque: igual, pinta una vez.
    d = await ckPage({ wide: true, hidden: true });
    W = d.window; K = W.__ck;
    const s1 = seg(W);
    assert.ok(day(W) && s1, 'Oculta: pintó una vez al cargar');
    K.at(T0 + 7000); K.frames();
    assert.strictEqual(seg(W), s1, 'Oculta: sin bucle');
    W.close();

    // Reducir movimiento: sin bucle por fotograma (un temporizador por minuto).
    d = await ckPage({ wide: true, reduce: true });
    W = d.window; K = W.__ck;
    const s2 = seg(W);
    K.at(T0 + 7000); K.frames();
    assert.strictEqual(seg(W), s2, 'Reducir movimiento: los fotogramas no pintan');
    W.close();
  };

  // 8k. Mis tareas · persistencia (SPEC 19, paso 5). Async: usa un localStorage simulado.
  const tkTest1 = async () => {
    delete store['pyl-tasks']; delete store['pyl-tasks-corrupt'];
    const d = await fresca(), W = d.window, P = W.PYL, S = P.services.storage.tasks, C = P.core.tasks;
    const hoy = C.tkDayKey(new W.Date());
    // Sin clave: load da null y tkLoad arranca con la nota vacía (válida, sin copia de respaldo).
    assert.strictEqual(S.load(), null, 'Sin pyl-tasks, load da null');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(C.tkLoad(S.load(), hoy))), { ok: true, note: { days: {} }, collapsed: false }, 'Sin clave arranca vacía');
    // Guardar escribe { v, note, collapsed } y load devuelve el texto tal cual.
    const datos = { v: 1, note: { days: { [hoy]: [] } }, collapsed: true };
    assert.strictEqual(S.save(datos), true);
    assert.strictEqual(store['pyl-tasks'], JSON.stringify(datos), 'Se guarda en pyl-tasks');
    assert.strictEqual(S.load(), JSON.stringify(datos));
    // Texto roto: corrupt lo copia en pyl-tasks-corrupt tal cual.
    assert.strictEqual(S.corrupt('{roto'), true);
    assert.strictEqual(store['pyl-tasks-corrupt'], '{roto', 'El texto crudo queda en pyl-tasks-corrupt');
    // Sin espacio: save da false y lo guardado no cambia.
    const real = W.localStorage.setItem;
    W.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
    assert.strictEqual(S.save({ v: 1, note: { days: {} }, collapsed: false }), false, 'Sin espacio, save da false');
    assert.strictEqual(store['pyl-tasks'], JSON.stringify(datos), 'Y no cambia lo guardado');
    W.localStorage.setItem = real;
    W.close();
    delete store['pyl-tasks']; delete store['pyl-tasks-corrupt'];
  };

  // Mis tareas: página aparte con localStorage simulado y ayudas comunes.
  const tkPage = async () => {
    const d = await fresca(), W = d.window, D = W.document;
    const $ = (q) => D.querySelector(q), $$ = (q) => [...D.querySelectorAll(q)];
    const key = (el, k) => el.dispatchEvent(new W.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    const tipea = (el, v) => { el.value = v; el.dispatchEvent(new W.Event('input', { bubbles: true })); };
    const tick = (ms = 0) => new Promise((ok) => setTimeout(ok, ms));
    const textos = () => $$('#tk-list .tk-task .tk-text').map((t) => t.textContent);
    return { d, W, D, $, $$, key, tipea, tick, textos, S: W.PYL.app.state.tasks, C: W.PYL.core.tasks };
  };

  // 8l. Mis tareas · añadir y listar (SPEC 19, paso 7).
  const tkTest2 = async () => {
    delete store['pyl-tasks'];
    const { W, D, $, $$, key, tipea, tick, textos, S } = await tkPage();
    const add = $('#tk-add'), hour = $('#tk-add-hour'), text = $('#tk-add-text');
    assert.ok(add.hidden && add.nextElementSibling === $('#tk-carry') && $('#tk-list').lastElementChild === $('#tk-carry'), 'Fila de añadir oculta por defecto, tras las tareas y antes de Traer de ayer');
    assert.strictEqual(text.placeholder, 'Añadir nueva tarea…');
    // «+» la abre con el foco en la hora (placeholder = hora actual).
    $('#tk-new').click();
    assert.ok(!add.hidden && S.adding && D.activeElement === hour, '«+» abre #tk-add con foco en la hora');
    assert.strictEqual(hour.placeholder, String(new W.Date().getHours()), 'Placeholder = hora actual');
    // Enter con texto y hora vacía: crea con la hora actual, vacía los campos y deja el foco en la hora.
    const ahora = new W.Date().getHours();
    tipea(text, 'Comprar pan');
    key(text, 'Enter');
    assert.deepStrictEqual(textos(), ['Comprar pan']);
    assert.strictEqual($('#tk-list .tk-task .tk-hour').textContent, String(ahora), 'Badge con la hora actual');
    assert.ok(text.value === '' && hour.value === '' && D.activeElement === hour, 'Campos vacíos y foco en la hora');
    assert.strictEqual($('#tk-count').textContent, '0 de 1 hechas');
    assert.ok(!$('#tk-all').hidden && $('#tk-all').title === 'Marcar todas', 'Con tareas aparece «Marcar todas»');
    // Con hora escrita: va al final.
    tipea(hour, '9'); tipea(text, 'Llamar al banco');
    key(hour, 'Enter');
    assert.deepStrictEqual(textos(), ['Comprar pan', 'Llamar al banco'], 'La nueva va al final');
    assert.deepStrictEqual($$('#tk-list .tk-hour').map((h) => h.textContent), [String(ahora), '9']);
    assert.ok($$('#tk-list .tk-task').every((t) => t.dataset.id && t.querySelector('.tk-row').dataset.id === t.dataset.id), 'Cada fila lleva data-id');
    assert.strictEqual($('#tk-count').textContent, '0 de 2 hechas');
    // Hora inválida: marca el campo y no crea nada.
    tipea(hour, '25'); tipea(text, 'No va');
    key(text, 'Enter');
    assert.ok(hour.classList.contains('is-invalid') && hour.getAttribute('aria-invalid') === 'true', 'Hora 25 marca .is-invalid');
    assert.ok(textos().length === 2 && D.activeElement === hour, 'No crea la tarea y el foco vuelve a la hora');
    tipea(hour, '7');
    assert.ok(!hour.classList.contains('is-invalid') && !hour.hasAttribute('aria-invalid'), 'Al escribir se limpia la marca');
    // Texto vacío no crea nada.
    tipea(text, '   ');
    key(text, 'Enter');
    assert.ok(textos().length === 2 && D.activeElement === text, 'Texto vacío no crea nada');
    // Esc oculta y descarta.
    key(text, 'Escape');
    assert.ok(add.hidden && !S.adding && text.value === '' && hour.value === '', 'Esc oculta y descarta');
    // Perder el foco fuera de la fila también la oculta.
    $('#tk-new').click();
    tipea(text, 'borrador');
    $('#tk-gear').focus();
    await tick();
    assert.ok(add.hidden && !S.adding && text.value === '', 'Perder el foco la oculta y descarta');
    assert.strictEqual(S.note.days[S.day].length, 2);
    W.close();
    delete store['pyl-tasks'];
  };

  // 8m. Mis tareas · marcar, editar y borrar (SPEC 19, paso 8).
  const tkTest3 = async () => {
    delete store['pyl-tasks'];
    const { W, D, $, $$, key, tipea, textos, S } = await tkPage();
    const nueva = (h, t) => { $('#tk-new').click(); tipea($('#tk-add-hour'), h); tipea($('#tk-add-text'), t); key($('#tk-add-text'), 'Enter'); };
    nueva('8', 'Uno'); nueva('9', 'Dos'); nueva('10', 'Tres');
    key($('#tk-add-text'), 'Escape');
    const fila = (i) => $$('#tk-list .tk-task')[i];
    const dbl = (el) => el.dispatchEvent(new W.MouseEvent('dblclick', { bubbles: true, cancelable: true }));
    // Marcar: tacha hora y texto, casilla llena, progreso al día.
    fila(0).querySelector('.tk-check').click();
    assert.ok(fila(0).querySelector('.tk-check').classList.contains('is-on') && fila(0).querySelector('.tk-check').getAttribute('aria-pressed') === 'true', 'Casilla marcada');
    assert.ok(fila(0).querySelector('.tk-text').classList.contains('is-done') && fila(0).querySelector('.tk-hour').classList.contains('is-done'), 'Hecha: texto y hora con .is-done');
    assert.strictEqual($('#tk-count').textContent, '1 de 3 hechas');
    assert.strictEqual(D.querySelector('.tk-ring-fill').style.strokeDashoffset, '67', 'Anillo: 100 − 33 %');
    assert.strictEqual($('#tk-bar').style.width, '33%');
    // Doble check: marca todas y pasa a «Desmarcar todas»; otra vez, desmarca.
    $('#tk-all').click();
    assert.strictEqual($('#tk-count').textContent, '3 de 3 hechas');
    assert.ok($('#tk-all').title === 'Desmarcar todas' && $('#tk-all').classList.contains('is-on'), 'Cambia a «Desmarcar todas» (.is-on)');
    $('#tk-all').click();
    assert.ok($('#tk-count').textContent === '0 de 3 hechas' && $('#tk-all').title === 'Marcar todas', 'Desmarca todo');
    // Doble clic en el texto: Enter guarda (recortado); Esc cancela; vacío conserva.
    dbl(fila(1).querySelector('.tk-text'));
    let inp = fila(1).querySelector('.tk-edit-in');
    assert.ok(inp && D.activeElement === inp && inp.value === 'Dos', 'Doble clic abre el campo con el texto');
    assert.ok(!fila(1).querySelector('.tk-acts'), 'Editando no hay acciones flotantes');
    inp.value = '  Dos bis ';
    key(inp, 'Enter');
    assert.deepStrictEqual(textos(), ['Uno', 'Dos bis', 'Tres'], 'Enter guarda');
    dbl(fila(1).querySelector('.tk-text'));
    inp = fila(1).querySelector('.tk-edit-in'); inp.value = 'Otra cosa';
    key(inp, 'Escape');
    assert.deepStrictEqual(textos(), ['Uno', 'Dos bis', 'Tres'], 'Esc cancela');
    dbl(fila(1).querySelector('.tk-text'));
    inp = fila(1).querySelector('.tk-edit-in'); inp.value = '   ';
    key(inp, 'Enter');
    assert.deepStrictEqual(textos(), ['Uno', 'Dos bis', 'Tres'], 'Vacío conserva el anterior');
    dbl(fila(2).querySelector('.tk-text'));
    inp = fila(2).querySelector('.tk-edit-in'); inp.value = 'Tres por blur';
    inp.blur();
    assert.deepStrictEqual(textos(), ['Uno', 'Dos bis', 'Tres por blur'], 'Perder el foco guarda');
    // Doble clic en la hora: Enter guarda; inválida o vacía conserva; Esc cancela.
    const horas = () => $$('#tk-list .tk-hour').map((h) => h.textContent);
    dbl(fila(0).querySelector('.tk-hour'));
    inp = fila(0).querySelector('.tk-hour-edit');
    assert.ok(inp && D.activeElement === inp && inp.value === '8', 'Doble clic en la hora abre su campo');
    inp.value = '14'; key(inp, 'Enter');
    assert.deepStrictEqual(horas(), ['14', '9', '10']);
    for (const v of ['24', '', 'x']) {
      dbl(fila(0).querySelector('.tk-hour'));
      inp = fila(0).querySelector('.tk-hour-edit'); inp.value = v; key(inp, 'Enter');
      assert.deepStrictEqual(horas(), ['14', '9', '10'], 'Hora inválida o vacía conserva: ' + JSON.stringify(v));
    }
    dbl(fila(0).querySelector('.tk-hour'));
    inp = fila(0).querySelector('.tk-hour-edit'); inp.value = '3'; key(inp, 'Escape');
    assert.deepStrictEqual(horas(), ['14', '9', '10'], 'Esc cancela la hora');
    // Papelera: borra sin preguntar.
    fila(1).querySelector('.tk-del').click();
    assert.deepStrictEqual(textos(), ['Uno', 'Tres por blur'], 'La papelera borra sin preguntar');
    assert.strictEqual($('#tk-count').textContent, '0 de 2 hechas');
    assert.strictEqual(S.note.days[S.day].length, 2);
    W.close();
    delete store['pyl-tasks'];
  };

  // 8n. Mis tareas · subtareas (SPEC 19, paso 9).
  const tkTest4 = async () => {
    delete store['pyl-tasks'];
    const { W, D, $, $$, key, tipea, S } = await tkPage();
    const nueva = (h, t) => { $('#tk-new').click(); tipea($('#tk-add-hour'), h); tipea($('#tk-add-text'), t); key($('#tk-add-text'), 'Enter'); };
    nueva('8', 'Comprar pan'); nueva('9', 'Sin subtareas');
    key($('#tk-add-text'), 'Escape');
    const fila = (i) => $$('#tk-list .tk-task')[i];
    const subs = (i) => [...fila(i).querySelectorAll('.tk-sub-row .tk-sub-text')].map((s) => s.textContent);
    const chip = () => fila(0).querySelector('.tk-sub-toggle');
    assert.ok(!fila(0).querySelector('.tk-sub-toggle') && !fila(0).querySelector('.tk-toggle-subs'), 'Sin subtareas: sin chip ni chevron');
    assert.ok(!fila(0).querySelector('.tk-task-row').classList.contains('has-subs'), 'Sin subtareas la fila no es clicable');
    // «+» de la fila: campo de subtarea; Enter agrega y deja otro vacío; vacío no hace nada; Esc cierra.
    fila(0).querySelector('.tk-task-row .tk-add-sub').click();
    let inp = fila(0).querySelector('.tk-sub-in');
    assert.ok(inp && D.activeElement === inp, '«+» abre el campo de subtarea con foco');
    inp.value = 'Integral'; key(inp, 'Enter');
    inp = fila(0).querySelector('.tk-sub-in');
    assert.ok(inp && inp.value === '' && D.activeElement === inp, 'Enter deja otro campo vacío con foco');
    inp.value = 'Sin sal'; key(inp, 'Enter');
    inp = fila(0).querySelector('.tk-sub-in');
    key(inp, 'Enter');
    assert.deepStrictEqual(subs(0), ['Integral', 'Sin sal'], 'Dos subtareas; Enter vacío no agrega');
    key(fila(0).querySelector('.tk-sub-in'), 'Escape');
    assert.ok(!fila(0).querySelector('.tk-sub-in'), 'Esc cierra el campo');
    // Perder el foco guarda si hay texto.
    fila(0).querySelector('.tk-task-row .tk-add-sub').click();
    inp = fila(0).querySelector('.tk-sub-in'); inp.value = 'Grande'; inp.blur();
    assert.deepStrictEqual(subs(0), ['Integral', 'Sin sal', 'Grande'], 'Perder el foco guarda');
    assert.ok(!fila(0).querySelector('.tk-sub-in'), 'y cierra');
    // El «+» de una subtarea agrega otra a la misma tarea.
    fila(0).querySelector('.tk-sub-row .tk-add-sub').click();
    inp = fila(0).querySelector('.tk-sub-in'); inp.value = 'Extra'; key(inp, 'Enter'); key(fila(0).querySelector('.tk-sub-in'), 'Escape');
    assert.deepStrictEqual(subs(0), ['Integral', 'Sin sal', 'Grande', 'Extra']);
    // Borrar y editar una subtarea.
    fila(0).querySelectorAll('.tk-sub-row')[3].querySelector('.tk-del-sub').click();
    fila(0).querySelectorAll('.tk-sub-row')[2].querySelector('.tk-del-sub').click();
    assert.deepStrictEqual(subs(0), ['Integral', 'Sin sal'], 'Eliminar subtarea');
    fila(0).querySelectorAll('.tk-sub-text')[1].dispatchEvent(new W.MouseEvent('dblclick', { bubbles: true }));
    inp = fila(0).querySelector('.tk-sub-row .tk-edit-in');
    assert.ok(inp && D.activeElement === inp && inp.value === 'Sin sal', 'Doble clic edita la subtarea');
    inp.value = ' Baja en sal '; key(inp, 'Enter');
    assert.deepStrictEqual(subs(0), ['Integral', 'Baja en sal']);
    // Chip 0/2 → 1/2 con relleno proporcional; todas hechas → chip completo.
    assert.strictEqual(chip().textContent, '0/2');
    assert.ok(fila(0).querySelector('.tk-task-row').classList.contains('has-subs'), 'Con subtareas la fila es clicable');
    fila(0).querySelector('.tk-sub-row .tk-check').click();
    assert.ok(chip().textContent === '1/2' && chip().style.getPropertyValue('--sub-progress') === '50%', 'Chip 1/2 relleno al 50 %');
    assert.ok(fila(0).querySelector('.tk-sub-row .tk-check').classList.contains('is-on') && fila(0).querySelector('.tk-sub-text').classList.contains('is-done'), 'Subtarea marcada y tachada');
    assert.ok(!fila(0).querySelector('.tk-task-row > .tk-check').classList.contains('is-on'), 'Marcar subtarea no marca la tarea');
    assert.strictEqual($('#tk-count').textContent, '1 de 4 hechas', 'El progreso cuenta tareas y subtareas');
    fila(0).querySelectorAll('.tk-sub-row .tk-check')[1].click();
    assert.ok(chip().textContent === '2/2' && chip().classList.contains('is-complete'), 'Todas hechas: chip en acento');
    // Marcar la tarea no marca sus subtareas.
    fila(0).querySelectorAll('.tk-sub-row .tk-check')[1].click();
    fila(0).querySelector('.tk-task-row > .tk-check').click();
    assert.strictEqual(chip().textContent, '1/2', 'Marcar la tarea no toca las subtareas');
    // Chip y chevron alternan contraer/expandir.
    chip().click();
    assert.ok(!fila(0).querySelector('.tk-subs') && chip().classList.contains('is-collapsed') && chip().getAttribute('aria-expanded') === 'false', 'Chip contrae');
    fila(0).querySelector('.tk-toggle-subs').click();
    assert.ok(fila(0).querySelector('.tk-subs') && !chip().classList.contains('is-collapsed'), 'Chevron expande');
    // Clic simple en la fila: contrae tras 250 ms (temporizador simulado); doble clic lo cancela.
    const realSet = W.setTimeout, realClear = W.clearTimeout;
    let timers = [];
    W.setTimeout = (fn, ms) => { timers.push({ fn, ms, on: true }); return timers.length; };
    W.clearTimeout = (h) => { if (timers[h - 1]) timers[h - 1].on = false; };
    // Solo cuenta el clic diferido (250 ms); el autoguardado (300 ms) también pasa por aquí y se ignora.
    const correr = () => { const t = timers.filter((x) => x.on && x.ms === 250); timers = []; t.forEach((x) => x.fn()); return t; };
    const clic = (el, detail) => el.dispatchEvent(new W.MouseEvent('click', { bubbles: true, cancelable: true, detail }));
    clic(fila(0).querySelector('.tk-task-row'), 1);
    assert.ok(fila(0).querySelector('.tk-subs'), 'No contrae al instante');
    const ts = correr();
    assert.ok(ts.length === 1 && ts[0].ms === 250, 'Programa el cambio a 250 ms');
    assert.ok(!fila(0).querySelector('.tk-subs'), 'Clic simple contrae');
    clic(fila(0).querySelector('.tk-task-row'), 1); correr();
    assert.ok(fila(0).querySelector('.tk-subs'), 'Otro clic expande');
    // Doble clic (sobre el espacio de la fila): el primer clic programa, el segundo y el dblclick lo cancelan.
    const row = fila(0).querySelector('.tk-task-row');
    clic(row, 1); clic(row, 2); row.dispatchEvent(new W.MouseEvent('dblclick', { bubbles: true }));
    assert.strictEqual(correr().length, 0, 'Doble clic cancela el cambio');
    assert.ok(fila(0).querySelector('.tk-subs'), 'Doble clic no contrae');
    // Clic en un botón de la fila no programa nada; una fila sin subtareas tampoco.
    clic(fila(0).querySelector('.tk-task-row .tk-add-sub svg'), 1);
    key(fila(0).querySelector('.tk-sub-in'), 'Escape');
    assert.strictEqual(timers.filter((x) => x.on && x.ms === 250).length, 0, 'Botón de la fila: nada');
    timers = [];
    clic(fila(1).querySelector('.tk-task-row'), 1);
    assert.strictEqual(correr().length, 0, 'Fila sin subtareas: nada');
    W.setTimeout = realSet; W.clearTimeout = realClear;
    // Contraída, «+ subtarea» expande la tarea.
    chip().click();
    fila(0).querySelector('.tk-task-row .tk-add-sub').click();
    assert.ok(!S.note.days[S.day][0].collapsed && fila(0).querySelector('.tk-sub-in') && fila(0).querySelectorAll('.tk-sub-row').length === 2, 'Añadir subtarea expande');
    key(fila(0).querySelector('.tk-sub-in'), 'Escape');
    // Borrar la tarea se lleva sus subtareas.
    fila(0).querySelector('.tk-del').click();
    assert.ok($$('#tk-list .tk-task').length === 1 && $('#tk-count').textContent === '0 de 1 hechas', 'Borrar la tarea se lleva sus subtareas');
    W.close();
    delete store['pyl-tasks'];
  };

  // Día local hoy + n como 'YYYY-MM-DD' (misma regla que tkDayKey) y una tarea guardada.
  const tkDk = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const tkT = (id, text, extra = {}) => ({ id, hour: 9, text, done: false, subtasks: [], createdAt: '2026-11-01T14:00:00.000Z', ...extra });

  // 8o. Mis tareas · días, historial y traer de ayer (SPEC 19, paso 10).
  const tkTest5 = async () => {
    store['pyl-tasks'] = JSON.stringify({ v: 1, collapsed: false, note: { days: {
      [tkDk(-1)]: [tkT('a', 'Ayer A', { done: true, subtasks: [{ id: 'as', text: 'Sub A', done: true }] })],
      [tkDk(-2)]: [],
      [tkDk(-3)]: [tkT('b', 'Hace 3')],
      [tkDk(-4)]: [tkT('c', 'Hace 4')],
      [tkDk(-7)]: [tkT('v', 'Muy viejo')],
    } } });
    const { W, D, $, $$, key, textos, S, C } = await tkPage();
    // Al cargar se podan los días anteriores a hoy − 5 y los pasados vacíos.
    assert.deepStrictEqual(Object.keys(S.note.days).sort(), [tkDk(-4), tkDk(-3), tkDk(-1)], 'Al cargar: sin hoy − 7 ni el día vacío');
    const tab = (i) => $$('#tk-tabs .tk-tab')[i];
    const on = () => $$('#tk-tabs .tk-tab').map((t) => t.classList.contains('is-on'));
    // Hoy vacío con tareas en un día anterior: aparece «Traer tareas de ayer».
    assert.ok(!$('#tk-carry').hidden && $('#tk-carry').textContent.includes('Sin tareas para hoy') && $('#tk-carry button').textContent === 'Traer tareas de ayer', 'Traer de ayer visible en Hoy vacío');
    // Ayer / Mañana cambian la lista y la pestaña activa.
    tab(0).click();
    assert.ok(S.day === tkDk(-1) && textos().join() === 'Ayer A', 'Ayer: sus tareas');
    assert.deepStrictEqual(on(), [true, false, false]);
    assert.ok($('#tk-carry').hidden, 'Traer de ayer solo en Hoy');
    tab(2).click();
    assert.ok(S.day === tkDk(1) && textos().length === 0, 'Mañana: vacía');
    assert.deepStrictEqual(on(), [false, false, true]);
    tab(1).click();
    assert.ok(S.day === tkDk(0), 'De vuelta a Hoy');
    // Reloj: días anteriores a ayer con tareas, del más reciente al más viejo.
    const hist = $('#tk-history'), menu = $('#tk-history-menu');
    const items = () => $$('#tk-history-menu .tk-mi');
    hist.click();
    assert.ok(!menu.hidden && hist.getAttribute('aria-expanded') === 'true' && S.menu === 'history', 'El reloj abre su menú');
    assert.deepStrictEqual(items().map((b) => b.textContent), [C.tkDateLabel(C.tkDayDate(tkDk(-3))), C.tkDateLabel(C.tkDayDate(tkDk(-4)))], 'Etiqueta larga, del más reciente al más viejo; sin Ayer');
    assert.strictEqual(D.activeElement, items()[0], 'Foco en el primer día');
    key(D.activeElement, 'ArrowDown'); assert.strictEqual(D.activeElement, items()[1], '↓');
    key(D.activeElement, 'ArrowDown'); assert.strictEqual(D.activeElement, items()[0], '↓ da la vuelta');
    key(D.activeElement, 'ArrowUp'); assert.strictEqual(D.activeElement, items()[1], '↑');
    key(D.activeElement, 'Escape');
    assert.ok(menu.hidden && S.menu === null && D.activeElement === hist && hist.getAttribute('aria-expanded') === 'false', 'Esc cierra y devuelve el foco al reloj');
    hist.click(); key(D.activeElement, 'Tab');
    assert.ok(menu.hidden && S.menu === null, 'Tab cierra');
    hist.click();
    D.body.dispatchEvent(new W.MouseEvent('pointerdown', { bubbles: true }));
    assert.ok(menu.hidden && S.menu === null, 'Clic fuera cierra');
    hist.click(); hist.click();
    assert.ok(menu.hidden && S.menu === null, 'El reloj otra vez lo cierra');
    // Elegir un día viejo: lista y fecha de ese día; ninguna pestaña activa y el reloj encendido.
    hist.click(); items()[0].click();
    assert.ok(menu.hidden && S.day === tkDk(-3) && textos().join() === 'Hace 3', 'Elegir un día lo abre');
    assert.ok(on().every((x) => !x) && hist.classList.contains('is-on'), 'Reloj encendido, pestañas apagadas');
    assert.strictEqual(D.activeElement, hist, 'El foco vuelve al reloj');
    hist.click();
    assert.ok(items()[0].classList.contains('is-on') && items()[0].getAttribute('aria-checked') === 'true', 'El día activo va marcado en el menú');
    key(D.activeElement, 'Escape');
    // Traer tareas de ayer: copia sin marcar, ids nuevos, y no vuelve a salir ese día.
    tab(1).click();
    $('#tk-carry button').click();
    const hoy = S.note.days[tkDk(0)];
    assert.deepStrictEqual(textos(), ['Ayer A'], 'Copia las tareas del último día con tareas');
    assert.ok(hoy[0].id !== 'a' && hoy[0].subtasks[0].id !== 'as' && !hoy[0].done && !hoy[0].subtasks[0].done, 'Ids nuevos y todo sin marcar');
    assert.ok(S.note.days[tkDk(-1)][0].done, 'El original no cambia');
    assert.ok($('#tk-carry').hidden && S.note.lastCarryOver === tkDk(0), 'Desaparece y fija lastCarryOver');
    assert.strictEqual($('#tk-count').textContent, '0 de 2 hechas');
    $('#tk-list .tk-del').click();
    assert.ok(textos().length === 0 && $('#tk-carry').hidden, 'Una vez por día: borrar las copias no lo trae de vuelta');
    W.close();
    // Sin días anteriores.
    delete store['pyl-tasks'];
    const p = await tkPage();
    p.$('#tk-history').click();
    assert.ok(p.$$('#tk-history-menu .tk-mi').length === 0 && p.$('#tk-history-menu').textContent === 'Sin días anteriores', '«Sin días anteriores»');
    assert.ok(p.$('#tk-carry').hidden, 'Sin origen no hay Traer de ayer');
    p.W.close();
    delete store['pyl-tasks'];
  };

  // 8p. Mis tareas · autoguardado, datos rotos y medianoche (SPEC 19, paso 11).
  const tkTest6 = async () => {
    delete store['pyl-tasks']; delete store['pyl-tasks-corrupt'];
    let p = await tkPage();
    const nueva = (pg, h, t) => { pg.$('#tk-new').click(); pg.tipea(pg.$('#tk-add-hour'), h); pg.tipea(pg.$('#tk-add-text'), t); pg.key(pg.$('#tk-add-text'), 'Enter'); };
    nueva(p, '8', 'Uno'); nueva(p, '9', 'Dos'); nueva(p, '10', 'Tres');
    p.key(p.$('#tk-add-text'), 'Escape');
    // Autoguardado con retraso de 300 ms.
    assert.strictEqual(store['pyl-tasks'], undefined, 'No guarda al instante');
    await p.tick(350);
    let g = JSON.parse(store['pyl-tasks']);
    assert.deepStrictEqual([g.v, 'collapsed' in g, g.note.days[tkDk(0)].map((t) => t.text)], [1, false, ['Uno', 'Dos', 'Tres']], 'Guarda { v: 1, note } a los 300 ms (sin collapsed)');
    // Un comando sin cambios (hora inválida) no programa guardado.
    store['pyl-tasks'] = 'centinela';
    p.$$('#tk-list .tk-hour')[0].dispatchEvent(new p.W.MouseEvent('dblclick', { bubbles: true }));
    const hi = p.$('#tk-list .tk-hour-edit'); hi.value = '99'; p.key(hi, 'Enter');
    await p.tick(350);
    assert.strictEqual(store['pyl-tasks'], 'centinela', 'Sin cambios no guarda');
    // Subtarea, marca, hora y orden; beforeunload fuerza el guardado pendiente.
    const fila = (pg, i) => pg.$$('#tk-list .tk-task')[i];
    fila(p, 0).querySelector('.tk-add-sub').click();
    const si = fila(p, 0).querySelector('.tk-sub-in'); si.value = 'Sub'; p.key(si, 'Enter'); p.key(fila(p, 0).querySelector('.tk-sub-in'), 'Escape');
    fila(p, 1).querySelector('.tk-check').click();
    p.$$('#tk-list .tk-sub-row .tk-check')[0].click();
    p.W.dispatchEvent(new p.W.Event('beforeunload'));
    g = JSON.parse(store['pyl-tasks']);
    assert.ok(g.note.days[tkDk(0)][1].done && g.note.days[tkDk(0)][0].subtasks[0].done, 'beforeunload guarda lo pendiente al instante');
    p.W.close();
    p.W.close();
    // Recargar: se conservan tareas, subtareas, horas, marcas y orden.
    p = await tkPage();
    assert.deepStrictEqual(p.textos(), ['Uno', 'Dos', 'Tres'], 'Orden y textos tras recargar');
    const t0 = JSON.parse(JSON.stringify(p.S.note.days[tkDk(0)]));
    assert.deepStrictEqual(t0.map((t) => [t.hour, t.done]), [[8, false], [9, true], [10, false]], 'Horas y marcas');
    assert.deepStrictEqual(t0[0].subtasks.map((s) => [s.text, s.done]), [['Sub', true]], 'Subtareas');
    assert.strictEqual(p.S.day, tkDk(0), 'Arranca en Hoy');
    // Sin espacio: avisa en #toast y el estado en pantalla se conserva.
    const real = p.W.localStorage.setItem;
    p.W.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
    p.$('#toast').textContent = '';
    fila(p, 2).querySelector('.tk-del').click();
    p.W.dispatchEvent(new p.W.Event('beforeunload'));
    assert.strictEqual(p.$('#toast').textContent, 'No se pudo guardar: hay muy poco espacio', 'Aviso de espacio');
    assert.deepStrictEqual(p.textos(), ['Uno', 'Dos'], 'El estado en pantalla se conserva');
    assert.strictEqual(JSON.parse(store['pyl-tasks']).note.days[tkDk(0)].length, 3, 'Lo guardado no cambió');
    p.W.localStorage.setItem = real;
    p.W.close();
    // Datos rotos o de otra versión: arranca vacía y el texto crudo queda en pyl-tasks-corrupt.
    for (const roto of ['{roto', JSON.stringify({ v: 2, note: { days: {} }, collapsed: false })]) {
      store['pyl-tasks'] = roto; delete store['pyl-tasks-corrupt'];
      p = await tkPage();
      assert.deepStrictEqual(JSON.parse(JSON.stringify(p.S.note)), { days: {} }, 'Roto arranca vacía: ' + roto);
      assert.strictEqual(store['pyl-tasks-corrupt'], roto, 'El texto queda en pyl-tasks-corrupt');
      assert.strictEqual(store['pyl-tasks'], roto, 'Sin cambios, no pisa lo guardado');
      p.W.close();
    }
    // Medianoche: con el reloj adelantado, el temporizador (o volver a la pestaña) poda y pasa a Hoy.
    store['pyl-tasks'] = JSON.stringify({ v: 1, collapsed: false, note: { days: { [tkDk(-5)]: [tkT('v', 'Hace 5')], [tkDk(-3)]: [tkT('b', 'Hace 3')], [tkDk(0)]: [tkT('h', 'Hoy')] } } });
    delete store['pyl-tasks-corrupt'];
    p = await tkPage();
    const W = p.W, RealDate = W.Date;
    const adelanta = (dias) => { const ms = dias * 864e5; W.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + ms); } static now() { return RealDate.now() + ms; } }; };
    const vuelve = () => p.D.dispatchEvent(new W.Event('visibilitychange'));
    // Captura el temporizador que se reprograma: hasta las próximas 00:00 + 1 s.
    const realSet = W.setTimeout, prog = [];
    W.setTimeout = (fn, ms) => { prog.push(ms); return realSet(fn, ms); };
    adelanta(1);
    vuelve();
    W.setTimeout = realSet;
    const ahora = new W.Date(), media = new RealDate(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1).getTime() - ahora.getTime();
    assert.ok(prog.some((ms) => Math.abs(ms - (media + 1000)) < 2000), 'Temporizador hasta las 00:00 + 1 s');
    assert.strictEqual(p.S.day, tkDk(1), 'Veía el día que terminó: pasa a Hoy');
    assert.deepStrictEqual(p.$$('#tk-tabs .tk-tab').map((t) => t.dataset.day), [tkDk(0), tkDk(1), tkDk(2)], 'Las pestañas avanzan un día');
    assert.ok(p.$$('#tk-tabs .tk-tab')[1].classList.contains('is-on'), 'Hoy activa');
    assert.ok(!(tkDk(-5) in p.S.note.days) && tkDk(-3) in p.S.note.days, 'Poda: se borra el día anterior a hoy − 5');
    await p.tick(350);
    assert.ok(!(tkDk(-5) in JSON.parse(store['pyl-tasks']).note.days), 'La poda se guarda');
    // Veía Mañana: al pasar el día queda en Hoy (Mañana pasa a ser Hoy).
    p.$$('#tk-tabs .tk-tab')[2].click();
    adelanta(2); vuelve();
    assert.ok(p.S.day === tkDk(2) && p.$$('#tk-tabs .tk-tab')[1].classList.contains('is-on'), 'Veía Mañana: pasa a Hoy');
    // Un día del historial se queda.
    p.$('#tk-history').click();
    p.$$('#tk-history-menu .tk-mi').find((b) => b.dataset.day === tkDk(-3)).click();
    adelanta(3); vuelve();
    assert.strictEqual(p.S.day, tkDk(-3), 'Un día del historial no cambia');
    // Sin cambio de día no pasa nada.
    vuelve();
    assert.strictEqual(p.S.day, tkDk(-3));
    W.Date = RealDate;
    W.close();
    delete store['pyl-tasks']; delete store['pyl-tasks-corrupt'];
  };

  // 8q. Mis tareas · arrastrar para reordenar (SPEC 19, paso 12). jsdom no mide: filas de 40 px según su orden.
  const tkTest7 = async () => {
    delete store['pyl-tasks'];
    const { W, D, $, $$, key, tipea, tick, textos, S } = await tkPage();
    const nueva = (h, t) => { $('#tk-new').click(); tipea($('#tk-add-hour'), h); tipea($('#tk-add-text'), t); key($('#tk-add-text'), 'Enter'); };
    nueva('8', 'A'); nueva('9', 'B'); nueva('10', 'C');
    key($('#tk-add-text'), 'Escape');
    const list = $('#tk-list');
    W.HTMLElement.prototype.getBoundingClientRect = function () {
      if (this === list) return { top: 0, bottom: 400, height: 400, left: 0, right: 200, width: 200 };
      const i = [...list.children].filter((n) => n.classList.contains('tk-task')).indexOf(this);
      const top = i < 0 ? 0 : i * 40;
      return { top, bottom: top + 40, height: 40, left: 0, right: 200, width: 200 };
    };
    const ptr = (el, type, y, x = 10) => {
      const e = new W.MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y });
      Object.defineProperty(e, 'pointerId', { value: 1 });
      Object.defineProperty(e, 'isPrimary', { value: true });
      el.dispatchEvent(e);
    };
    const texto = (i) => $$('#tk-list .tk-task')[i].querySelector('.tk-text');
    const orden = () => [...S.note.days[S.day]].map((t) => t.text);
    // Clic sin mover (o menos de 4 px): no reordena.
    ptr(texto(0), 'pointerdown', 20); ptr(D, 'pointermove', 22); ptr(D, 'pointerup', 22);
    assert.ok(!list.classList.contains('is-dragging') && orden().join() === 'A,B,C' && textos().join() === 'A,B,C', 'Clic sin mover no reordena');
    // Desde un botón o una casilla no arranca.
    ptr($$('#tk-list .tk-check')[0], 'pointerdown', 20); ptr(D, 'pointermove', 90);
    assert.ok(!list.classList.contains('is-dragging'), 'Desde la casilla no arrastra');
    ptr(D, 'pointerup', 90);
    // Arrastrar la primera debajo de la segunda: cambia el orden, se guarda y se ignora el clic de soltar.
    const a = $$('#tk-list .tk-task')[0];
    ptr(texto(0), 'pointerdown', 20); ptr(D, 'pointermove', 70);
    assert.ok(list.classList.contains('is-dragging') && a.classList.contains('is-dragging'), 'Pasa a arrastre tras 4 px');
    assert.deepStrictEqual(textos(), ['B', 'A', 'C'], 'El DOM se reordena en vivo');
    assert.ok(/translateY/.test(a.style.transform), 'La fila sigue al puntero (translateY)');
    assert.deepStrictEqual(orden(), ['A', 'B', 'C'], 'La nota no cambia hasta soltar');
    ptr(D, 'pointerup', 70);
    assert.deepStrictEqual(orden(), ['B', 'A', 'C'], 'Al soltar se guarda con tkMove');
    assert.ok(!list.classList.contains('is-dragging') && !a.classList.contains('is-dragging') && a.style.transform === '', 'Limpia clases y transform');
    a.querySelector('.tk-check').click();
    assert.ok(!S.note.days[S.day][1].done, 'El clic de soltar se ignora');
    await tick(0);
    a.querySelector('.tk-check').click();
    assert.ok(S.note.days[S.day][1].done, 'Después, los clics vuelven a funcionar');
    a.querySelector('.tk-check').click();
    await tick(350);
    assert.deepStrictEqual(JSON.parse(store['pyl-tasks']).note.days[S.day].map((t) => t.text), ['B', 'A', 'C'], 'El orden nuevo queda guardado');
    // Esc durante el arrastre devuelve el orden.
    ptr(texto(0), 'pointerdown', 20); ptr(D, 'pointermove', 110);
    assert.deepStrictEqual(textos(), ['A', 'C', 'B'], 'Arrastrando hasta el final');
    key(D.activeElement || D.body, 'Escape');
    assert.ok(!list.classList.contains('is-dragging') && textos().join() === 'B,A,C' && orden().join() === 'B,A,C', 'Esc devuelve el orden');
    ptr(D, 'pointerup', 110);
    assert.deepStrictEqual(orden(), ['B', 'A', 'C'], 'Soltar tras Esc no mueve nada');
    await tick(0);
    // pointercancel también.
    ptr(texto(2), 'pointerdown', 100); ptr(D, 'pointermove', 10);
    assert.deepStrictEqual(textos(), ['C', 'B', 'A']);
    ptr(D, 'pointercancel', 10);
    assert.ok(textos().join() === 'B,A,C' && orden().join() === 'B,A,C', 'pointercancel devuelve el orden');
    await tick(0);
    // Solo con 2 tareas o más.
    $$('#tk-list .tk-del')[0].click(); $$('#tk-list .tk-del')[0].click();
    ptr(texto(0), 'pointerdown', 20); ptr(D, 'pointermove', 90);
    assert.ok(!list.classList.contains('is-dragging'), 'Con una sola tarea no arrastra');
    ptr(D, 'pointerup', 90);
    W.close();
    delete store['pyl-tasks'];
  };

  // 8r. Mis tareas · engranaje y «Acerca de» (SPEC 19, paso 13).
  const tkTest8 = async () => {
    delete store['pyl-tasks'];
    const { W, D, $, $$, key, S } = await tkPage();
    const gear = $('#tk-gear'), menu = $('#tk-gear-menu'), layer = $('#tk-about');
    assert.ok(menu.hidden && layer.hidden && layer.querySelector('[role="dialog"][aria-modal="true"]'), 'Menú y capa ocultos al cargar');
    // El menú tiene un solo ítem; Esc, Tab y clic fuera lo cierran.
    gear.click();
    assert.ok(!menu.hidden && gear.getAttribute('aria-expanded') === 'true' && S.menu === 'gear', 'El engranaje abre su menú');
    assert.deepStrictEqual($$('#tk-gear-menu .tk-mi').map((b) => b.textContent), ['Acerca de Mis tareas'], 'Un solo ítem');
    assert.strictEqual(D.activeElement, $('#tk-gear-menu .tk-mi'), 'Foco en el ítem');
    key(D.activeElement, 'Escape');
    assert.ok(menu.hidden && S.menu === null && D.activeElement === gear, 'Esc cierra y devuelve el foco al engranaje');
    gear.click(); key(D.activeElement, 'Tab');
    assert.ok(menu.hidden, 'Tab cierra');
    gear.click(); D.body.dispatchEvent(new W.MouseEvent('pointerdown', { bubbles: true }));
    assert.ok(menu.hidden, 'Clic fuera cierra');
    // Abrir uno cierra el otro.
    gear.click(); $('#tk-history').click();
    assert.ok(menu.hidden && !$('#tk-history-menu').hidden && S.menu === 'history', 'Un menú abierto a la vez');
    key(D.activeElement, 'Escape');
    // «Acerca de»: título, descripción y 4 viñetas, sin versión ni «Creado por».
    gear.click(); $('#tk-gear-menu .tk-mi').click();
    assert.ok(menu.hidden && !layer.hidden && S.about, '«Acerca de Mis tareas» abre la capa');
    assert.strictEqual(D.activeElement, $('.tk-about-x'), 'Foco en ×');
    assert.strictEqual($('#tk-about-title').textContent, 'Mis tareas');
    assert.strictEqual($('.tk-about-lead').textContent, 'Mis tareas es tu nota adhesiva dentro de Synkops para organizar las tareas del día.');
    assert.deepStrictEqual($$('.tk-about-points li').map((li) => li.textContent), [
      'Cada día tiene sus tareas: Ayer, Hoy, Mañana e historial de los últimos días.',
      'Cada día empieza limpio; con un clic traes las tareas de ayer, sin marcar.',
      'Todo se guarda automáticamente y solo en este navegador: sin cuenta, sin nube y sin internet.',
      'Se conservan los últimos 5 días; los anteriores se borran.',
    ], 'Las 4 viñetas');
    assert.ok(!/Versión|Creado por|Windows|Fija/.test(layer.textContent) && !layer.querySelector('img'), 'Sin versión, ícono, autor ni viñeta de Fijar');
    // Se cierra con Esc, × o clic en el fondo; el foco vuelve al engranaje.
    key(D.activeElement, 'Escape');
    assert.ok(layer.hidden && !S.about && D.activeElement === gear, 'Esc cierra y devuelve el foco al engranaje');
    gear.click(); $('#tk-gear-menu .tk-mi').click(); $('.tk-about-x').click();
    assert.ok(layer.hidden && D.activeElement === gear, '× cierra');
    gear.click(); $('#tk-gear-menu .tk-mi').click();
    $('.tk-about-lead').dispatchEvent(new W.MouseEvent('pointerdown', { bubbles: true }));
    assert.ok(!layer.hidden, 'Clic dentro del panel no cierra');
    layer.dispatchEvent(new W.MouseEvent('pointerdown', { bubbles: true }));
    assert.ok(layer.hidden && D.activeElement === gear, 'Clic en el fondo cierra');
    key(D.activeElement, 'Escape');
    W.close();
    delete store['pyl-tasks'];
  };

  // 8s. Mis tareas · arrastrar subtareas dentro de su tarea (pedido del usuario durante la SPEC 19).
  // jsdom no mide: el bloque de subtareas empieza en 40 px y cada subtarea mide 40 px según su orden.
  const tkTest9 = async () => {
    store['pyl-tasks'] = JSON.stringify({ v: 1, note: { days: { [tkDk(0)]: [
      tkT('a', 'A', { subtasks: [{ id: 'x', text: 'X', done: false }, { id: 'y', text: 'Y', done: false }, { id: 'z', text: 'Z', done: false }] }),
      tkT('b', 'B', { subtasks: [{ id: 'w', text: 'W', done: false }] }),
    ] } } });
    const { W, D, $, $$, key, tick, textos, S } = await tkPage();
    const list = $('#tk-list');
    const sibs = (el, cls) => [...el.parentElement.children].filter((n) => n.classList.contains(cls));
    W.HTMLElement.prototype.getBoundingClientRect = function () {
      const r = (top, h) => ({ top, bottom: top + h, height: h, left: 0, right: 200, width: 200 });
      if (this === list) return r(0, 400);
      if (this.classList.contains('tk-subs')) return r(40, 40 * this.querySelectorAll('.tk-sub-row').length);
      if (this.classList.contains('tk-sub-row')) return r(40 + 40 * sibs(this, 'tk-sub-row').indexOf(this), 40);
      if (this.classList.contains('tk-task')) return r(200 * sibs(this, 'tk-task').indexOf(this), 40);
      return r(0, 0);
    };
    const ptr = (el, type, y) => {
      const e = new W.MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: 10, clientY: y });
      Object.defineProperty(e, 'pointerId', { value: 1 });
      Object.defineProperty(e, 'isPrimary', { value: true });
      el.dispatchEvent(e);
    };
    const tarea = (i) => $$('#tk-list .tk-task')[i];
    const subDom = (i = 0) => [...tarea(i).querySelectorAll('.tk-sub-row .tk-sub-text')].map((n) => n.textContent);
    const subNota = (i = 0) => [...S.note.days[S.day][i].subtasks].map((s) => s.text);
    const subTxt = (i) => tarea(0).querySelectorAll('.tk-sub-row .tk-sub-text')[i];
    // Clic sin mover no reordena.
    ptr(subTxt(0), 'pointerdown', 60); ptr(D, 'pointermove', 62); ptr(D, 'pointerup', 62);
    assert.ok(!list.classList.contains('is-dragging') && subNota().join() === 'X,Y,Z', 'Clic sin mover no reordena la subtarea');
    // Desde la casilla de la subtarea no arranca.
    ptr(tarea(0).querySelector('.tk-sub-row .tk-check'), 'pointerdown', 60); ptr(D, 'pointermove', 140);
    assert.ok(!list.classList.contains('is-dragging'), 'Desde la casilla de la subtarea no arrastra');
    ptr(D, 'pointerup', 140);
    // Arrastrar la primera debajo de la segunda: cambia el orden de sus subtareas, no el de las tareas.
    const x = tarea(0).querySelector('.tk-sub-row');
    ptr(subTxt(0), 'pointerdown', 60); ptr(D, 'pointermove', 110);
    assert.ok(list.classList.contains('is-dragging') && x.classList.contains('is-dragging') && !tarea(0).classList.contains('is-dragging'), 'La subtarea pasa a arrastre tras 4 px (no la tarea)');
    assert.deepStrictEqual(subDom(), ['Y', 'X', 'Z'], 'El DOM de las subtareas se reordena en vivo');
    assert.ok(/translateY/.test(x.style.transform), 'La subtarea sigue al puntero');
    assert.deepStrictEqual(subNota(), ['X', 'Y', 'Z'], 'La nota no cambia hasta soltar');
    ptr(D, 'pointerup', 110);
    assert.deepStrictEqual(subNota(), ['Y', 'X', 'Z'], 'Al soltar se guarda con tkMoveSub');
    assert.deepStrictEqual(textos(), ['A', 'B'], 'Las tareas no cambian de orden');
    assert.deepStrictEqual(subNota(1), ['W'], 'La otra tarea no cambia');
    assert.ok(!list.classList.contains('is-dragging') && !tarea(0).querySelector('.is-dragging'), 'Limpia clases');
    tarea(0).querySelectorAll('.tk-sub-row .tk-check')[1].click();
    assert.ok(!S.note.days[S.day][0].subtasks[1].done, 'El clic de soltar se ignora');
    await tick(0);
    // Hasta el final del bloque.
    ptr(subTxt(0), 'pointerdown', 60); ptr(D, 'pointermove', 400);
    assert.deepStrictEqual(subDom(), ['X', 'Z', 'Y'], 'Puede llegar a la última posición');
    ptr(D, 'pointerup', 400);
    assert.deepStrictEqual(subNota(), ['X', 'Z', 'Y']);
    await tick(0);
    // Esc devuelve el orden (la fila de la tarea no se rehace: se devuelven a mano).
    ptr(subTxt(2), 'pointerdown', 140); ptr(D, 'pointermove', 0);
    assert.deepStrictEqual(subDom(), ['Y', 'X', 'Z'], 'Arrastrando hasta el principio');
    key(D.activeElement || D.body, 'Escape');
    assert.ok(!list.classList.contains('is-dragging') && subDom().join() === 'X,Z,Y' && subNota().join() === 'X,Z,Y', 'Esc devuelve el orden de las subtareas');
    ptr(D, 'pointerup', 0);
    await tick(0);
    // pointercancel también.
    ptr(subTxt(0), 'pointerdown', 60); ptr(D, 'pointermove', 400);
    ptr(D, 'pointercancel', 400);
    assert.ok(subDom().join() === 'X,Z,Y' && subNota().join() === 'X,Z,Y', 'pointercancel devuelve el orden');
    await tick(0);
    // Con una sola subtarea no arrastra.
    ptr(tarea(1).querySelector('.tk-sub-text'), 'pointerdown', 40); ptr(D, 'pointermove', 120);
    assert.ok(!list.classList.contains('is-dragging'), 'Con una sola subtarea no arrastra');
    ptr(D, 'pointerup', 120);
    // Guardado tras recargar.
    await tick(350);
    assert.deepStrictEqual(JSON.parse(store['pyl-tasks']).note.days[S.day][0].subtasks.map((s) => s.text), ['X', 'Z', 'Y'], 'El orden de las subtareas queda guardado');
    // Criterios de calidad: ids únicos con tareas, subtareas y menús pintados; el pie no cambia nada al tocarlo.
    $('#tk-gear').click(); key(D.activeElement, 'Escape');
    assert.ok(![...D.querySelectorAll('[id]')].some((n, i, all) => all.filter((m) => m.id === n.id).length > 1), 'Ningún id repetido en la página con Mis tareas llena');
    const nota = S.note, foco = D.activeElement;
    for (const b of $$('#tk-foot button')) b.click();
    await tick(350);
    assert.ok(S.note === nota && S.menu === null && !S.about && !S.adding, 'Los botones del pie no cambian nada');
    W.close();
    delete store['pyl-tasks'];
  };

  return lgTest().then(dkTest).then(apTest).then(chTest).then(chCadenaTest).then(chDurasTest).then(hubTest).then(hubTest2).then(hubTest3).then(hubTest4).then(hubTest5).then(tkTest1).then(tkTest2).then(tkTest3).then(tkTest4).then(tkTest5).then(tkTest6).then(tkTest7).then(tkTest8).then(tkTest9).then(ckTest).then(fresca).then((d2) => {
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
  }).then(() => {
    // SPEC 17: aunque la última pestaña guardada sea otra (ns_view), la app abre siempre en Inicio.
    store['ns_view'] = JSON.stringify('logistica');
    return fresca();
  }).then((d4) => {
    const doc4 = d4.window.document;
    assert.deepStrictEqual([...doc4.querySelectorAll('.view.on')].map((v) => v.id), ['v-dash'], 'Con ns_view guardado en otra pestaña, abre solo Inicio');
    assert.strictEqual(doc4.querySelector('#tabs [aria-current="page"]').dataset.v, 'dash', 'La pestaña Inicio queda resaltada');
    doc4.querySelector('#tabs [data-v="logistica"]').click();
    assert.deepStrictEqual([...doc4.querySelectorAll('.view.on')].map((v) => v.id), ['v-logistica'], 'Cambiar de pestaña sigue funcionando');
    assert.strictEqual(store['ns_view'], JSON.stringify('logistica'), 'Ya no se guarda la vista: el valor viejo queda tal cual');
    d4.window.close();
  }).then(() => {
    // SPEC 18: frases locales. Inicio muestra la frase de la media jornada, que sale de la lista y trae su etiqueta.
    return fresca();
  }).then((d5) => {
    const W5 = d5.window, doc5 = W5.document;
    const lista = W5.PYL.core.homeQuotes.HOME_QUOTES, esperada = W5.PYL.core.home.homePick(lista, new W5.Date());
    const q5 = doc5.getElementById('home-quote');
    assert.ok(!q5.hidden, 'La frase se ve');
    assert.strictEqual(doc5.getElementById('home-quote-text').textContent, `“${esperada.text}”`);
    assert.strictEqual(doc5.getElementById('home-quote-author').textContent, `— ${esperada.author}`);
    assert.strictEqual(q5.querySelector('.home-quote-label').textContent, esperada.label, 'Etiqueta de la media jornada');
    assert.ok(lista.some((q) => q.text === esperada.text && q.author === esperada.author), 'La frase sale de la lista');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(W5.PYL.app.state.home)), { slot: esperada.slot, text: esperada.text, author: esperada.author });
    W5.close();
  }).then(() => new Promise((ok) => setTimeout(ok, 200))).then(() => {
    // SPEC 18: en la página principal también hay frase (lista local, sin fetch).
    assert.ok(!document.getElementById('home-quote').hidden, 'La frase se ve');
    assert.ok(/^“.+”$/.test(document.getElementById('home-quote-text').textContent), 'Frase entre comillas');
    assert.ok(ladder.classList.contains('grown'), 'La escalera debe terminar crecida');
    // 7. Consola limpia salvo scrollTo.
    const malos = errores.filter((m) => !esperado(m));
    assert.deepStrictEqual(malos, [], 'Errores en consola:\n' + malos.join('\n'));

    console.log(`OK smoke: ${Object.values(actual).flat().length} claves en PYL, ${tabs.length} pestañas, navegación, Inicio (saludo y frase del día), guía Hard Metrics y consola limpia`);
    window.close();
  });
}).catch((e) => { console.error('FALLO smoke:', e.message); process.exit(1); });
