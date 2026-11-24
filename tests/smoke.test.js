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
    assert.deepStrictEqual([...document.querySelector('header.top .top-in').children].map((n) => n.id || n.className), ['ck-root', 'top-row', 'mw-root', 'mw-audio'], 'La barra: reloj, la fila del contenido y los cortes de testeo (SPEC 21)');
    assert.deepStrictEqual([...document.querySelector('.top-in > .top-row').children].map((n) => n.id || n.className), ['pillProd', 'mw-sum', 'theme-pick', 'tabs'], 'La fila: píldora del producto activo, estimado de la campaña, tema y pestañas (mide lo mismo que las pestañas)');
    const h1 = document.querySelector('#v-dash .hero h1');
    const pulse = h1.querySelector('svg.hero-pulse');
    assert.ok(pulse && pulse.getAttribute('aria-hidden') === 'true' && h1.lastElementChild === pulse && h1.firstChild.nodeType === 3, 'El pulso subrayado va dentro del <h1> del hero, después del texto');
    assert.strictEqual(h1.textContent.trim(), 'Synkops', 'El título se sigue leyendo «Synkops»');
    const d = pulse.querySelector('.hp-base').getAttribute('d');
    assert.ok(d && pulse.querySelector('.hp-run').getAttribute('d') === d, 'Dos trazos del mismo pulso: base y luz que corre');
    assert.strictEqual(pulse.querySelector('.hp-run').getAttribute('pathLength'), '100');
    assert.deepStrictEqual([...pulse.querySelectorAll('stop')].map((s) => s.getAttribute('style')), ['stop-color:var(--b)', 'stop-color:var(--b2)'], 'Degradado del acento del tema');
  }

  // 1a'. SPEC 24: íconos propios (PYL.ui.icons).
  {
    const ic = PYL.ui.icons;
    assert.ok(Array.isArray(ic.NAMES) && ic.NAMES.length > 60, 'icons.NAMES trae el conjunto');
    assert.strictEqual(new Set(ic.NAMES).size, ic.NAMES.length, 'Sin nombres repetidos');
    for (const n of ic.NAMES) {
      assert.ok(/^[a-z]+(-[a-z]+)*$/.test(n), 'Nombre kebab-case: ' + n);
      const box = document.createElement('div');
      box.innerHTML = ic.svg(n);
      const s = box.firstElementChild;
      assert.ok(s && s.tagName.toLowerCase() === 'svg' && box.children.length === 1, 'svg() da un <svg>: ' + n);
      assert.strictEqual(s.getAttribute('viewBox'), '0 0 24 24', n);
      assert.strictEqual(s.getAttribute('stroke'), 'currentColor', n);
      assert.strictEqual(s.getAttribute('stroke-width'), '1.8', n);
      assert.strictEqual(s.getAttribute('aria-hidden'), 'true', n);
      assert.strictEqual(s.getAttribute('focusable'), 'false', n);
      assert.ok(s.classList.contains('ic-svg') && s.children.length > 0, 'Clase ic-svg y dibujo: ' + n);
      assert.ok(!s.querySelector('[stroke-width]'), 'Trazo fijo, sin grosores propios: ' + n);
    }
    assert.strictEqual(ic.svg('no-existe'), '', 'Nombre desconocido → ""');
    assert.strictEqual(ic.svg('toString'), '', 'Nombre heredado de Object → ""');
    assert.ok(ic.svg('trash', 20).includes('width="20"'), 'Tamaño por parámetro');
    const sp = ic.el('target', 14, 'x-cls');
    assert.ok(sp.tagName === 'SPAN' && sp.className === 'ic x-cls' && sp.getAttribute('aria-hidden') === 'true' && sp.querySelector('svg.ic-svg[width="14"]'), 'el() da <span class="ic"> con el svg');
    assert.strictEqual(ic.el('target').className, 'ic', 'el() sin clase extra');
    assert.deepStrictEqual(['g', 'y', 'r', 'n', 'zz'].map((t) => ic.dot(t).dataset.tone), ['g', 'y', 'r', 'n', 'n'], 'dot(tone): tono desconocido → n');
    assert.ok(ic.dot('g').className === 'ic-dot' && !ic.dot('g').querySelector('svg'), 'dot() es un punto CSS, no un SVG');
    const root = document.createElement('div');
    root.innerHTML = '<span class="ic" data-ic="broom"></span><button data-ic="copy">Copiar</button><span class="ic" data-ic="bell" data-ic-size="20"></span>';
    ic.hydrate(root); ic.hydrate(root);
    assert.strictEqual(root.querySelectorAll('[data-ic="broom"] svg').length, 1, 'hydrate es idempotente');
    assert.ok(root.querySelector('[data-ic="bell"] svg[width="20"]'), 'hydrate respeta data-ic-size');
    assert.ok(!root.querySelector('button svg'), 'hydrate no toca un [data-ic] con contenido');
    assert.ok([...document.querySelectorAll('[data-ic]')].every((n) => n.childNodes.length), 'Al arrancar no queda ningún [data-ic] vacío');
    // Paso 3: HTML estático con íconos del set; el tooltip pinta tip.icon y la línea warn con alert.
    assert.ok(document.querySelector('#b-new > .ic svg.ic-broom') && document.querySelector('#b-new').textContent.trim() === 'Limpiar formulario', 'Limpiar formulario con escoba y sin emoji');
    assert.ok(document.querySelector('#story-copy svg.ic-clipboard') && document.querySelector('#story-report svg.ic-file') && document.querySelector('#btn-report .ico svg.ic-file'), 'Botones del resumen e informe con su ícono');
    const ev = { clientX: 10, clientY: 10 };
    PYL.ui.tooltip.showInfo(ev, { icon: 'coins', h: 'Título de prueba', p: 'x', warn: 'Ojo' });
    const tipN = document.querySelector('#tip');
    assert.ok(tipN.querySelector('.h > .ic svg.ic-coins') && tipN.querySelector('.h').textContent === 'Título de prueba', 'tip.icon va antes del título');
    assert.ok(tipN.querySelector('.hm-warn > .ic svg.ic-alert') && tipN.querySelector('.hm-warn').textContent === 'Ojo', 'warn con el ícono alert, sin ⚠');
    PYL.ui.tooltip.hide();
    const T = PYL.ui.summary.TIPS;
    assert.ok(Object.values(T).every((t) => ic.NAMES.includes(t.icon) && t.emoji && !/\p{Extended_Pictographic}/u.test(t.h)), 'TIPS del P&L: icon del set, h sin emoji y emoji aparte para el informe PDF');
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

  // 1c'. SPEC 21: cortes de testeo en el margen derecho de la barra (paso 4: sin conexión).
  {
    const root = document.getElementById('mw-root'), btn = root && root.querySelector('.mw-btn'), panel = document.getElementById('mw-panel');
    assert.ok(root && root.parentElement === document.querySelector('header.top .top-in') && root.classList.contains('mw-rail'), '#mw-root.mw-rail dentro de header.top .top-in');
    assert.ok(btn && btn.tagName === 'BUTTON' && btn.getAttribute('aria-controls') === 'mw-panel' && btn.getAttribute('aria-expanded') === 'false', 'El bloque es un botón que controla #mw-panel');
    assert.ok(btn.querySelector('.mw-head') && /CORTES/.test(btn.querySelector('.mw-head').textContent), 'Cabecera CORTES');
    assert.ok(/Conectar Meta/.test(btn.textContent), 'Sin token dice «Conectar Meta»');
    assert.strictEqual(btn.getAttribute('aria-label'), 'Cortes de testeo: conectar Meta', 'aria-label sin token');
    const audio = document.getElementById('mw-audio');
    assert.ok(audio && audio.tagName === 'AUDIO' && audio.getAttribute('src') === 'sounds/corte.mp3' && audio.getAttribute('preload') === 'auto', '<audio id="mw-audio" src="sounds/corte.mp3">');
    assert.ok(panel && panel.hidden && panel.getAttribute('role') === 'dialog' && panel.getAttribute('aria-labelledby'), 'Panel diálogo, cerrado al cargar');
    assert.ok(document.getElementById(panel.getAttribute('aria-labelledby')), 'El título del panel existe');
    assert.strictEqual(typeof PYL.app.metawatch.refresh, 'function');
    assert.strictEqual(typeof PYL.app.metawatch.tick, 'function');
    assert.strictEqual(typeof PYL.ui.metawatch.rail, 'function');
    assert.strictEqual(typeof PYL.ui.metawatch.panel, 'function');
    // Clic abre el panel con el token (sin guía: se quitó a pedido del usuario).
    btn.click();
    assert.ok(!panel.hidden && btn.getAttribute('aria-expanded') === 'true', 'El clic abre el panel');
    const tok = document.getElementById('mw-token');
    assert.ok(tok && tok.type === 'password' && document.getElementById('mw-connect'), 'Campo de token (password) y botón Conectar');
    assert.strictEqual(document.activeElement, tok, 'El foco va al campo del token');
    assert.ok(!document.getElementById('mw-guide') && !/Cómo sacar el token/.test(panel.textContent), 'Sin guía en el panel');
    assert.ok(document.getElementById('mw-x'), 'Botón ✕');
    // Esc cierra y el foco vuelve al bloque.
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.ok(panel.hidden && btn.getAttribute('aria-expanded') === 'false', 'Esc cierra');
    assert.strictEqual(document.activeElement, btn, 'El foco vuelve al bloque');
    // ✕ cierra.
    btn.click(); document.getElementById('mw-x').click();
    assert.ok(panel.hidden && document.activeElement === btn, '✕ cierra y devuelve el foco');
    // Clic fuera cierra; clic dentro del panel no.
    btn.click();
    panel.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }));
    assert.ok(!panel.hidden, 'Clic dentro del panel no cierra');
    document.body.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }));
    assert.ok(panel.hidden, 'Clic fuera cierra');
    // Un segundo clic en el bloque con el panel abierto lo cierra.
    btn.click(); btn.click();
    assert.ok(panel.hidden, 'El bloque alterna el panel');
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
    // SPEC 27: sin «N de M hechas» ni anillo; queda la barra.
    assert.ok(!document.getElementById('tk-count') && !document.querySelector('#tk-root .tk-ring'), 'Sin contador ni anillo en el renglón del progreso');
    assert.strictEqual(document.getElementById('tk-bar').style.width, '0%', 'Barra vacía');
    assert.ok(document.getElementById('tk-all').hidden, 'Doble check oculto sin tareas');
    assert.strictEqual(document.querySelectorAll('#tk-list .tk-task').length, 0, 'Lista vacía');
    const foot = [...tk.querySelectorAll('#tk-foot button')];
    assert.deepStrictEqual(foot.map((b) => b.title), ['Negrita', 'Cursiva', 'Subrayado', 'Tachado', 'Lista con viñetas', 'Adjuntar imagen'], 'Pie de formato');
    assert.ok(foot.every((b) => b.getAttribute('aria-disabled') === 'true'), 'Pie inerte (aria-disabled)');
    // Estado inicial.
    const T = PYL.app.state.tasks;
    assert.deepStrictEqual(JSON.parse(JSON.stringify(T)), { note: { days: {} }, day: hoy, adding: false, menu: null, about: false, alerts: false }, 'app.state.tasks arranca vacío en Hoy');
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
  const reporte = (k) => { info(k, 'l').click(); const pop = document.querySelector('.hm-pop'); const r = { t: text('.hm-pop .hm-pop-report'), unique: !!pop.querySelector('.hm-pop-unique'), warn: text('.hm-pop .hm-warn'), warnIc: !!pop.querySelector('.hm-warn .ic svg.ic-alert') }; info(k, 'l').click(); return r; };
  assert.strictEqual(reporte('ctr').t, 'En el reporte de Meta: «CTR único (porcentaje de clics en el enlace)»', 'La i del CTR dice el nombre del reporte');
  assert.strictEqual(reporte('cppi').t, 'En el reporte de Meta: «Costo x Checkout»', 'La i del CPPI dice el nombre del reporte');
  for (const k of ['cpm', 'cpc', 'cpa']) assert.deepStrictEqual(reporte(k), { t: '', unique: false, warn: '', warnIc: false }, 'La i de ' + k + ' no trae la línea del reporte');
  // Fórmula en el panel de la "i" de cada métrica.
  const formula = (k) => { info(k, 'l').click(); const t = text('.hm-pop .hm-pop-formula'); info(k, 'l').click(); return t; };
  assert.ok(formula('ctr').includes('Meta (CTR único)') && formula('ctr').includes('TikTok: clics ÷ impresiones × 100'), 'La i del CTR trae su fórmula por plataforma');
  assert.ok(formula('cpc').includes('Monto gastado ÷ Clics en el enlace') && formula('cpm').includes('× 1.000') && formula('cppi').includes('Pagos iniciados') && formula('cpa').includes('Resultados'), 'Cada i trae su fórmula');
  const ctrPop = reporte('ctr');
  assert.ok(ctrPop.unique && ctrPop.warnIc && ctrPop.warn.includes('Límite por confirmar'), 'La i del CTR explica el CTR único y trae la advertencia');
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
  assert.deepStrictEqual(partes.map((b) => b.textContent), ['Lectura real · pronto', 'Fase de testeo', 'Simulador'], 'Sin Surfing Scaling; Simulador habilitado');
  assert.deepStrictEqual(partes.map((b) => b.querySelector('svg').classList[1]), ['ic-folder-open', 'ic-flask', 'ic-sliders'], 'Sub-pestañas con su ícono del set');
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
  assert.deepStrictEqual(esPartes.map((b) => b.textContent), ['Lectura real · pronto', 'Fase de escalado', 'Simulador · revisar']);
  assert.deepStrictEqual(esPartes.map((b) => b.disabled), [true, false, true], 'Solo la Fase de escalado está abierta');
  assert.ok(esPartes[1].getAttribute('aria-pressed') === 'true' && !document.querySelector('#es-scale').hidden && document.querySelector('#es-real-soon').hidden, 'Abre en Fase de escalado');
  esPartes[0].click(); esPartes[2].click();
  assert.strictEqual(PYL.app.state.scaling.part, 'scale', 'Las partes apagadas no se abren');
  // Métodos: 3 tarjetas; Surfing Scaling abierto; los otros dos "pronto" abren su tarjeta.
  const metodos = [...document.querySelectorAll('#es-methods .st-tab')];
  assert.deepStrictEqual(metodos.map((b) => b.querySelector('b').textContent), ['Surfing Scaling', 'Escalado horizontal · pronto', 'Refresco de creativos · pronto']);
  assert.deepStrictEqual(metodos.map((b) => b.querySelector('.st-ic svg').classList[1]), ['ic-wave', 'ic-shuffle', 'ic-refresh']);
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
  assert.ok(document.querySelector('#es-fb .es-fb-h svg.ic-x-circle') && text('#es-fb').includes('Elegiste Sostener') && text('#es-fb').includes('tocaba Subir un escalón'), 'Fallo: dice cuál era');
  assert.ok(document.querySelector('#es-mode [data-action="up"]').classList.contains('es-right') && document.querySelector('#es-mode [data-action="hold"]').classList.contains('es-wrong'), 'Marca la correcta y la elegida');
  assert.ok([...document.querySelectorAll('#es-mode .es-dec')].every((b) => b.disabled), 'No se decide dos veces');
  assert.strictEqual(document.querySelector('#es-step .es-on').dataset.branch, 'zone-up', 'Se ilumina la rama del caso');
  assert.ok(text('#es-fb').includes('Así lo califica el Lab') && text('#es-fb').includes('Pasa de N2') && text('#es-fb').includes('a N3 · $ 144.000') && document.querySelector('#es-fb .es-zbar-pin'), 'Veredicto, escalón nuevo y CPA en la barra');
  assert.ok(text('#es-mode').includes('Aciertos 0 de 1 decisiones'));
  document.querySelector('#es-next').click();
  assert.ok(text('#es-mode').includes('Caso 2 de 3 · Conjunto 5') && !document.querySelector('#es-fb') && !document.querySelector('#es-step .es-on'), 'Caso 2 sin veredicto');
  document.querySelector('#es-mode [data-action="off"]').click();
  assert.ok(document.querySelector('#es-fb .es-fb-h svg.ic-check-circle') && text('#es-fb').includes('REGLA DURA') && text('#es-fb').includes('Se apaga el conjunto') && document.querySelector('#es-step .es-on').dataset.branch === 'off-hard', 'Regla dura');
  document.querySelector('#es-next').click();
  assert.ok(text('#es-mode').includes('Conjunto 9') && !document.querySelector('#es-mode .es-day') && text('#es-mode').includes('Acabas de subir'), 'Caso de protección: un momento del día');
  document.querySelector('#es-mode [data-action="down"]').click();
  assert.ok(document.querySelector('#es-fb .es-fb-h svg.ic-check-circle') && text('#es-fb').includes('regla del curso') && text('#es-fb .tag') === 'Regla del curso' && document.querySelector('#es-step .es-on').dataset.branch === 'raise-down', 'Protección del curso');
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
  assert.deepStrictEqual(lgPartes.map((b) => b.textContent), ['Plantillas de mensajes', 'Seguimiento de pedidos · pronto']);
  assert.deepStrictEqual(lgPartes.map((b) => b.querySelector('svg').classList[1]), ['ic-message', 'ic-package'], 'Sub-pestañas con su ícono del set');
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
    assert.ok($$('#lg-pedido-gen, #lg-pedido-clear, #lg-pedido-copy').every((b) => b.querySelector('.ic svg.ic-svg')), 'Con sus íconos del set propio');
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
  assert.deepStrictEqual([...document.querySelectorAll('#ts-step .ts-br .ts-vd')].map((n) => n.querySelector('svg').classList[1] + ' ' + n.textContent), ['ic-check-circle MARAVILLOSO', 'ic-stop Apagar', 'ic-alert Mantener vigilando', 'ic-check-circle Seguir sin tocar'], 'Cada fila del corte 1 muestra su veredicto');
  assert.ok(text('#ts-step').includes('3 o 4 pagos iniciados · 0 ventas'), 'Corte 1: 0 ventas');
  paso(2);
  assert.deepStrictEqual([...document.querySelectorAll('#ts-step .ts-grp-h')].map((n) => n.textContent), ['Sin ventas', 'Con venta']);
  assert.ok(!document.querySelector('#ts-step .ts-on') && document.querySelectorAll('#ts-step .ts-br .ts-vd').length === 6, 'Corte 2: veredicto en sus 6 filas y sin fila iluminada');
  paso(3);
  assert.ok(text('#ts-step .ts-own') === 'Preguntar' && document.querySelector('#ts-step .ts-own svg.ic-help') && !document.querySelector('#ts-step .tag.ts-own') && document.querySelectorAll('#ts-step .ts-cut .ts-br').length === 3, 'Corte 3 con Regla propia');
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
    assert.strictEqual(play().textContent + '|' + play().dataset.ic, 'Correr|play', 'Antes de correr dice Correr con el ícono play');
    play().click();
    assert.ok(TS.simRun.playing && periodo === 120 && play().textContent === 'Pausa' && play().dataset.ic === 'pause', 'Corre con tics de 120 ms y el botón pasa a Pausa');
    tic(); tic();
    assert.strictEqual(TS.simRun.spend, 2000, 'Cada tic suma 1.000');
    play().click();
    assert.ok(!TS.simRun.playing && limpiados === 1 && play().textContent === 'Continuar' && play().dataset.ic === 'play', '⏸ pausa a mitad');
    play().click();
    for (let n = 0; n < 18; n++) tic();
    assert.ok(TS.simRun.spend === 20000 && !TS.simRun.playing, 'Se pausa en el corte 1 (20.000)');
    assert.ok(text('#ts-sx-out').includes('Así lo califica el Lab') && play().textContent === 'Continuar' && celdas()[0] !== '—', 'y muestra el veredicto de ese punto');
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
    assert.ok(TS.simRun.spend === 0 && TS.simRun.seed === semilla && play().textContent === 'Correr', '⏮ vuelve a 0 con la misma semilla');
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
    // SPEC 19: entre el hero y el Centro de mando va Mis tareas (#tk-rail); SPEC 22: la franja #ix-root va justo bajo el hero.
    assert.ok(iHero >= 0 && kids[iHero + 1].id === 'ix-root' && kids[iHero + 2].id === 'tk-rail' && iHb === iHero + 3 && iChain > iHb, 'Bajo el hero: Mis tareas, luego el Centro de mando y después la cadena');
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
    assert.ok($$('#lg-guia-import, #lg-guia-clear, #lg-guia-copy, #lg-guia-gen').every((b) => b.querySelector('.ic svg.ic-svg') && b.querySelectorAll('.ic').length === 1), 'Cada botón trae su ícono dibujado (SVG), sin emojis');
    assert.deepStrictEqual(['import', 'clear', 'copy', 'gen'].map((k) => $('#lg-guia-' + k + ' svg').classList[1]), ['ic-download', 'ic-broom', 'ic-copy', 'ic-sparkles'], 'Íconos de dos tonos del set: descargar, escoba, copiar y chispas');
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
    assert.ok($('#ch-d-zone .hm-warn') && $('#ch-d-zone .hm-warn .ic svg.ic-alert') && $('#ch-d-zone .hm-warn').textContent.includes(M.CTR_UNIQUE_WARN), 'El CTR de Meta trae ⚠ CTR_UNIQUE_WARN');
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

  // 8m. SPEC 21: servicio de Meta (paso 3). fetch simulado: URL, encabezado del token y errores traducidos.
  const mwTest1 = async () => {
    const S = PYL.services.metawatch, TK = 'EAAtokenSecreto123';
    let calls = [], next = [];
    const resp = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => { if (body === undefined) throw new SyntaxError('no json'); return body; } });
    window.fetch = async (url, opts) => {
      calls.push({ url, auth: opts && opts.headers && opts.headers.Authorization });
      const n = next.shift();
      if (n instanceof Error) throw n;
      return n;
    };
    const last = () => { const c = calls[calls.length - 1]; const u = new URL(c.url); return { c, u, p: Object.fromEntries(u.searchParams) }; };
    const noToken = () => calls.forEach((c) => assert.ok(!c.url.includes(TK), 'El token nunca va en la URL'));

    next.push(resp(200, { data: [{ id: 'act_1', name: 'VN-1', currency: 'COP', account_status: 1 }] }));
    assert.deepStrictEqual(JSON.parse(JSON.stringify(await S.accounts(TK))), [{ id: 'act_1', name: 'VN-1', currency: 'COP', account_status: 1 }], 'accounts devuelve data');
    let { c, u, p } = last();
    assert.strictEqual(u.origin + u.pathname, 'https://graph.facebook.com/v27.0/me/adaccounts');
    assert.strictEqual(p.fields, 'id,name,currency,account_status');
    assert.strictEqual(c.auth, 'Bearer ' + TK, 'Token en el encabezado Authorization');

    next.push(resp(200, { data: [] }));
    await S.campaigns(TK, 'act_1');
    ({ u, p } = last());
    assert.strictEqual(u.pathname, '/v27.0/act_1/campaigns');
    assert.deepStrictEqual([p.fields, p.effective_status], ['id,name,effective_status', '["ACTIVE"]']);

    next.push(resp(200, { data: [] }));
    await S.adsets(TK, '120');
    ({ u, p } = last());
    assert.deepStrictEqual([u.pathname, p.fields], ['/v27.0/120/adsets', 'id,name,effective_status,created_time']);

    next.push(resp(200, { data: [] }));
    await S.insights(TK, '120');
    ({ u, p } = last());
    assert.deepStrictEqual([u.pathname, p.level, p.date_preset, p.fields], ['/v27.0/120/insights', 'adset', 'maximum', 'adset_id,adset_name,spend,impressions,actions']);
    noToken();

    const falla = async (r, k, msg) => {
      next.push(r);
      const e = await S.accounts(TK).then(() => null, (x) => x);
      assert.ok(e && e.k === k, msg + ' → ' + JSON.stringify(e));
      assert.ok(!JSON.stringify(e).includes(TK), msg + ': el error no trae el token');
    };
    await falla(resp(400, { error: { code: 190, type: 'OAuthException', message: 'Error validating access token' } }), 'token', 'Token revocado');
    await falla(resp(400, { error: { code: 17, message: 'User request limit reached' } }), 'limit', 'Límite de consultas');
    await falla(new TypeError('Failed to fetch'), 'net', 'Sin red');
    await falla(resp(500), 'other', 'Respuesta sin JSON');
    await falla(resp(200, { nada: 1 }), 'other', '200 sin data');
    noToken();

    // Sin localStorage (file:// en jsdom): load da null, save false y clear no lanza.
    assert.strictEqual(S.load(), null);
    assert.strictEqual(S.save({ v: 1, token: 'x' }), false);
    assert.doesNotThrow(() => S.clear());
    delete window.fetch;
  };

  // 8n. SPEC 21: conectar y elegir campaña (paso 5). fetch simulado por ruta.
  const MW_TK = 'EAAtokenBueno999';
  const mwSets = [
    { id: 's3', name: 'Plant · video 3', effective_status: 'ACTIVE', created_time: '2026-11-19T05:02:00-0500' },
    { id: 's1', name: 'Plant · video 1', effective_status: 'ACTIVE', created_time: '2026-11-19T05:00:00-0500' },
    { id: 's4', name: 'Plant · video 4', effective_status: 'PAUSED', created_time: '2026-11-19T05:03:00-0500' },
    { id: 's2', name: 'Plant · video 2', effective_status: 'ACTIVE', created_time: '2026-11-19T05:01:00-0500' },
  ];
  const mwIns = (id, spend, pi = 0, sales = 0) => ({ adset_id: id, spend: String(spend), actions: [
    { action_type: 'offsite_conversion.fb_pixel_initiate_checkout', value: String(pi) },
    { action_type: 'offsite_conversion.fb_pixel_purchase', value: String(sales) },
  ] });
  // Respuestas por ruta; se pueden cambiar entre ciclos. err190 = el token deja de servir.
  const mwFake = { ins: [mwIns('s1', 31250, 6, 1), mwIns('s2', 12000, 2), mwIns('s3', 18000, 1), mwIns('s4', 22000, 3)], err: null, calls: 0 };
  const mwFetch = async (url, opts) => {
    mwFake.calls++;
    const u = new URL(url), p = u.pathname.replace('/v27.0/', '');
    const ok = (data) => ({ ok: true, status: 200, json: async () => ({ data }) });
    const bad = (code) => ({ ok: false, status: 400, json: async () => ({ error: { code, message: 'x' } }) });
    if (mwFake.err === 'net') throw new TypeError('Failed to fetch');
    if (mwFake.err) return bad(mwFake.err);
    if (opts.headers.Authorization !== 'Bearer ' + MW_TK) return bad(190);
    if (p === 'me/adaccounts') return ok([{ id: 'act_1', name: 'VN-1', currency: 'COP', account_status: 1 }]);
    if (p === 'act_1/campaigns' && mwFake.noCamp) return ok([]);
    if (p === 'act_1/campaigns') return ok([{ id: '120', name: 'TEST 21/11 Plant', effective_status: 'ACTIVE' }, { id: '121', name: 'TEST 22/11 Omega', effective_status: 'ACTIVE' }]);
    if (p === '120/adsets') return ok(mwSets);
    if (p === '120/insights') return ok(mwFake.ins);
    if (p === '121/adsets' || p === '121/insights') return ok([]);
    return bad(100);
  };
  const mwWait = () => new Promise((ok) => setTimeout(ok, 30));
  const mwTest2 = async () => {
    const $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
    const btn = $('#mw-root .mw-btn');
    window.fetch = mwFetch;
    const conecta = async (t) => { $('#mw-token').value = t; $('#mw-connect').click(); await mwWait(); };
    btn.click();
    // Token inválido al conectar: avisa y no guarda nada.
    await conecta('malo');
    assert.strictEqual($('#mw-status').textContent, 'Token inválido: vuelve a conectar');
    assert.ok(!$('#mw-status').hidden && $('#mw-token'), 'Sigue el campo del token');
    assert.strictEqual(PYL.app.state.metawatch.saved, null, 'No guarda un token inválido');
    // Token bueno: lista cuentas (una sola → queda elegida) y campañas activas.
    await conecta(MW_TK);
    assert.ok(!$('#mw-token'), 'Conectado: ya no pide token');
    assert.ok($('#mw-status').hidden, 'Sin error');
    assert.deepStrictEqual($$('#mw-account option').map((o) => [o.value, o.textContent]), [['', 'Elige una cuenta'], ['act_1', 'VN-1 · COP']]);
    assert.strictEqual($('#mw-account').value, 'act_1', 'Una sola cuenta: queda elegida');
    assert.deepStrictEqual($$('#mw-campaign option').map((o) => o.value), ['', '120', '121'], 'Campañas activas de la cuenta');
    assert.ok(/Elige una campaña/.test(btn.textContent), 'Sin campaña: «Elige una campaña»');
    // Elegir la campaña ABO: 4 filas C1…C4 por orden de creación, con su gasto.
    $('#mw-campaign').value = '120';
    $('#mw-campaign').dispatchEvent(new window.Event('change', { bubbles: true }));
    await mwWait();
    assert.ok(/TEST 21\/11 Plant/.test(btn.querySelector('.mw-head').textContent), 'Cabecera con la campaña');
    assert.ok(!btn.querySelector('.mw-time'), 'La card ya no muestra la hora del último dato');
    const sets = [...btn.querySelectorAll('.mw-set')];
    assert.deepStrictEqual(sets.map((s) => [s.dataset.id, s.querySelector('.mw-short').textContent, s.querySelector('.mw-k').textContent]),
      [['s1', 'C1', '31K'], ['s2', 'C2', '12K'], ['s3', 'C3', '18K'], ['s4', 'C4', '22K']]);
    assert.strictEqual(sets[0].title, 'Plant · video 1', 'Nombre completo en title');
    assert.strictEqual(sets[0].querySelectorAll('.mw-mark').length, 3, 'Marcas en 20K, 30K y 40K');
    assert.deepStrictEqual(sets[0].querySelector('.mw-bar') && [...sets[0].querySelectorAll('.mw-mark')].map((m) => m.style.left), ['50%', '75%', '100%']);
    assert.ok(sets[3].classList.contains('mw-off-set') && sets[3].querySelector('.mw-tag').textContent === 'OFF' && !sets[3].querySelector('.mw-bar'), 'Pausado: atenuado con OFF');
    assert.strictEqual($$('#mw-rows .mw-prow').length, 4, 'El panel lista los 4 conjuntos');
    // Campaña sin conjuntos.
    $('#mw-campaign').value = '121';
    $('#mw-campaign').dispatchEvent(new window.Event('change', { bubbles: true }));
    await mwWait();
    assert.ok(/La campaña no tiene conjuntos activos/.test(btn.textContent));
    $('#mw-campaign').value = '120';
    $('#mw-campaign').dispatchEvent(new window.Event('change', { bubbles: true }));
    await mwWait();
    // Actualizar trae datos nuevos.
    mwFake.ins = [mwIns('s1', 33000, 6, 1), mwIns('s2', 12000, 2), mwIns('s3', 18000, 1), mwIns('s4', 22000, 3)];
    $('#mw-refresh').click();
    await mwWait();
    assert.strictEqual(btn.querySelector('.mw-set[data-id="s1"] .mw-k').textContent, '33K', 'Actualizar repinta');
    // Sin red: conserva los datos y avisa con la hora.
    mwFake.err = 'net';
    await PYL.app.metawatch.refresh();
    assert.ok(/^Sin conexión · último dato \d{1,2}:\d{2}$/.test(btn.querySelector('.mw-msg').textContent), 'Sin red: aviso con la hora');
    assert.strictEqual(btn.querySelectorAll('.mw-set').length, 4, 'Sin red: muestra los últimos datos');
    // Límite de consultas.
    mwFake.err = 17;
    await PYL.app.metawatch.refresh();
    assert.strictEqual(btn.querySelector('.mw-msg').textContent, 'Meta pidió esperar');
    // Token revocado.
    mwFake.err = 190;
    await PYL.app.metawatch.refresh();
    assert.strictEqual(btn.querySelector('.mw-msg').textContent, 'Token inválido: vuelve a conectar', 'Token revocado en el bloque');
    assert.ok($('#mw-token'), 'Pide el token otra vez');
    mwFake.err = null;
    await conecta(MW_TK);
    assert.ok(!btn.querySelector('.mw-msg') && $('#mw-campaign').value === '120', 'Reconectar conserva cuenta y campaña');
    // El token no queda en el HTML ni en las etiquetas.
    assert.ok(!document.documentElement.outerHTML.includes(MW_TK) && !btn.getAttribute('aria-label').includes(MW_TK), 'El token no aparece en el HTML');
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  };

  // 8o. SPEC 21: cortes, veredicto y alerta (paso 6). Sigue conectado a la campaña 120 de mwTest2.
  // setTimeout de la página y audio.play simulados; las esperas de la prueba usan el setTimeout de Node.
  const mwTest3 = async () => {
    const $ = (q) => document.querySelector(q);
    const btn = $('#mw-root .mw-btn'), audio = $('#mw-audio'), W = PYL.app.metawatch;
    const realST = window.setTimeout, timers = [];
    window.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
    let plays = 0;
    audio.play = () => { plays++; return Promise.resolve(); };
    const cycle = async () => {
      const t = timers.filter((x) => x.ms === PYL.core.metawatch.MW_EVERY).pop();
      assert.ok(t, 'Hay un ciclo programado a 15 min');
      timers.length = 0;
      t.fn();
      await mwWait();
    };
    const set = (id) => btn.querySelector(`.mw-set[data-id="${id}"]`);
    const prow = (id) => $(`#mw-rows .mw-prow[data-id="${id}"]`);
    assert.strictEqual(typeof PYL.app.trainer.product, 'function', 'trainer publica product()');
    assert.ok(PYL.app.trainer.product().tope > 0, 'product() trae el tope');

    await W.refresh();
    assert.ok(set('s1').classList.contains('mw-alert') && set('s1').dataset.cut === '1', 'Al elegir la campaña, C1 (33K) late en el corte 2 sin sonar');
    assert.strictEqual(plays, 0, 'Elegir campaña no suena');
    // Ciclo de 15 min: C3 pasa de 18.000 a 21.000 → late y suena una vez.
    mwFake.ins = [mwIns('s1', 33000, 6, 1), mwIns('s2', 12000, 2), mwIns('s3', 21000, 4), mwIns('s4', 22000, 3)];
    await cycle();
    assert.ok(set('s3').classList.contains('mw-alert') && set('s3').dataset.cut === '0', 'C3 late en el corte 1');
    assert.strictEqual(plays, 1, 'Suena una vez');
    assert.ok(/C3 llegó a 20\.000, revisar/.test(btn.getAttribute('aria-label')), 'aria-label avisa: ' + btn.getAttribute('aria-label'));
    assert.ok(!set('s4').classList.contains('mw-alert'), 'El pausado no late aunque pase un corte');
    // Segundo ciclo, mismo corte → no vuelve a sonar.
    mwFake.ins = [mwIns('s1', 33000, 6, 1), mwIns('s2', 12000, 2), mwIns('s3', 24000, 5), mwIns('s4', 22000, 3)];
    await cycle();
    assert.strictEqual(plays, 1, 'No vuelve a sonar el mismo corte');
    assert.ok(set('s3').classList.contains('mw-alert'), 'Sigue latiendo hasta Revisado');
    // Revisado quita el latido y se guarda.
    btn.click();
    assert.ok(prow('s3').querySelector('.mw-seen'), 'Botón Revisado en la fila que late');
    assert.ok(!prow('s2').querySelector('.mw-seen'), 'Sin Revisado en la fila que no late');
    prow('s3').querySelector('.mw-seen').click();
    assert.ok(!set('s3').classList.contains('mw-alert') && !prow('s3').querySelector('.mw-seen'), 'Revisado quita el latido');
    assert.strictEqual(PYL.app.state.metawatch.saved.seen.s3, 0, 'seen guarda el corte revisado');
    // Siguiente corte → late y suena otra vez.
    mwFake.ins = [mwIns('s1', 33000, 6, 1), mwIns('s2', 12000, 2), mwIns('s3', 30500, 6), mwIns('s4', 22000, 3)];
    await cycle();
    assert.ok(set('s3').classList.contains('mw-alert') && set('s3').dataset.cut === '1' && plays === 2, 'El corte 2 late y suena');
    // Veredicto de testVerdict con el tope del producto activo (genérico = 15.000).
    const T = PYL.core.testing;
    const v1 = T.testVerdict({ spend: 33000, pi: 6, sales: 1, tope: 15000 });
    assert.strictEqual(prow('s1').querySelector('.mw-verdict').textContent, v1.veredicto, 'Veredicto de testVerdict');
    assert.ok(prow('s1').querySelector('.mw-verdict').classList.contains('mw-l-' + v1.light), 'Color de la luz');
    const cells = (id) => Object.fromEntries([...prow(id).querySelectorAll('dt')].map((d) => [d.textContent, d.nextElementSibling.textContent]));
    assert.deepStrictEqual(cells('s1'), { Gasto: '$ 33.000', PI: '6', Ventas: '1', CPPI: '$ 5.500', Corte: 'Corte 2 · 30.000' });
    assert.ok(!prow('s2').querySelector('.mw-verdict') && cells('s2').Corte === 'Antes del corte 1', 'Antes del corte 1: sin veredicto');
    assert.strictEqual(cells('s4').CPPI, '$ 7.333', 'CPPI redondeado');
    // Producto activo con otro tope.
    const prod = PYL.app.trainer.product;
    PYL.app.trainer.product = () => ({ name: 'Plant Power Max', tope: 25000, escala: 20000, apaga: 33000 });
    await W.refresh();
    assert.strictEqual(prow('s1').querySelector('.mw-verdict').textContent, T.testVerdict({ spend: 33000, pi: 6, sales: 1, tope: 25000 }).veredicto, 'Usa el tope del producto');
    assert.ok(/Plant/.test(btn.querySelector('.mw-head').textContent) && !/TEST 21/.test(btn.querySelector('.mw-head').textContent), 'Cabecera con el primer nombre del producto');
    PYL.app.trainer.product = prod;
    // Cuenta en otra moneda: sin veredicto y con aviso.
    const acc = PYL.app.state.metawatch.saved.account;
    acc.currency = 'USD';
    await W.refresh();
    assert.ok(!$('#mw-rows .mw-verdict'), 'USD: sin veredicto');
    assert.strictEqual($('#mw-panel .mw-note').textContent, 'Cortes en COP: esta cuenta usa USD');
    assert.ok(cells('s1').PI === '6' && cells('s1').Gasto, 'USD: sigue mostrando gasto y PI');
    acc.currency = 'COP';
    await W.refresh();
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    window.setTimeout = realST;
    delete audio.play;
  };

  // 8p. SPEC 21: sonido, Desconectar, cuenta sin campañas, audio que falta y recarga (paso 8).
  const mwTest4 = async () => {
    const $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
    const btn = $('#mw-root .mw-btn'), audio = $('#mw-audio'), W = PYL.app.metawatch, st = PYL.app.state.metawatch;
    let plays = 0;
    audio.play = () => { plays++; return Promise.reject(new Error('NotAllowedError')); }; // el navegador bloquea: no debe ensuciar la consola
    btn.click();
    // 🔔/🔕
    const snd = $('#mw-sound');
    assert.ok(snd && snd.getAttribute('aria-pressed') === 'true' && snd.querySelector('svg.ic-bell') && snd.textContent === 'Sonido', 'Sonido encendido por defecto');
    snd.click();
    assert.ok($('#mw-sound').getAttribute('aria-pressed') === 'false' && $('#mw-sound svg.ic-bell-off') && $('#mw-sound').textContent === 'Sin sonido' && st.saved.sound === false, '🔕 apaga y se guarda');
    mwFake.ins = [mwIns('s1', 41000, 8, 2), mwIns('s2', 12000, 2), mwIns('s3', 30500, 6), mwIns('s4', 22000, 3)];
    await W.refresh();
    assert.ok(btn.querySelector('.mw-set[data-id="s1"]').classList.contains('mw-alert'), 'Con 🔕 late igual');
    assert.strictEqual(plays, 0, 'Con 🔕 no suena');
    $('#mw-sound').click();
    assert.strictEqual(st.saved.sound, true, '🔔 vuelve a encender');
    mwFake.ins = [mwIns('s1', 41000, 8, 2), mwIns('s2', 20500, 3), mwIns('s3', 30500, 6), mwIns('s4', 22000, 3)];
    await W.refresh();
    await mwWait();
    assert.strictEqual(plays, 1, 'Suena aunque el navegador rechace play (sin error en consola)');
    // Si el archivo no carga (evento error del <audio>), ya no intenta sonar.
    audio.dispatchEvent(new window.Event('error'));
    mwFake.ins = [mwIns('s1', 41000, 8, 2), mwIns('s2', 30500, 3), mwIns('s3', 30500, 6), mwIns('s4', 22000, 3)];
    await W.refresh();
    assert.strictEqual(plays, 1, 'Sin archivo no intenta sonar');
    // Desconectar pregunta; Cancelar no borra nada.
    let cleared = 0;
    const realClear = PYL.services.metawatch.clear;
    PYL.services.metawatch.clear = () => { cleared++; return realClear(); };
    $('#mw-off').click();
    await mwWait();
    assert.ok($('#modal').classList.contains('show') && /Desconectar Meta/.test($('#modal-h').textContent), 'Pregunta antes de desconectar');
    $('#modal [data-r="cancel"]').click();
    await mwWait();
    assert.ok(st.saved && cleared === 0, 'Cancelar no borra');
    $('#mw-off').click();
    await mwWait();
    $('#modal [data-r="off"]').click();
    await mwWait();
    assert.strictEqual(cleared, 1, 'Borra pyl-meta');
    assert.strictEqual(st.saved, null, 'Sin conexión en memoria');
    assert.ok(/Conectar Meta/.test(btn.textContent) && !btn.querySelector('.mw-set'), 'El bloque vuelve a «Conectar Meta»');
    PYL.services.metawatch.clear = realClear;
    // Cuenta sin campañas activas.
    mwFake.noCamp = true;
    if ($('#mw-panel').hidden) btn.click();
    $('#mw-token').value = MW_TK; $('#mw-connect').click();
    await mwWait();
    assert.deepStrictEqual($$('#mw-campaign option').map((o) => o.textContent), ['No hay campañas activas'], 'Lista vacía: lo dice');
    assert.ok($('#mw-campaign').disabled, 'Sin campañas: lista deshabilitada');
    assert.strictEqual(btn.querySelector('.mw-msg').textContent, 'No hay campañas activas', 'El bloque también');
    mwFake.noCamp = false;
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    delete audio.play;
    delete window.fetch;
    // Recarga: pyl-meta guardado → muestra los últimos datos; lo revisado no late y lo que ya sonó no suena.
    store['pyl-meta'] = JSON.stringify({
      v: 1, token: MW_TK, account: { id: 'act_1', name: 'VN-1', currency: 'COP' }, campaign: { id: '120', name: 'TEST 21/11 Plant' },
      sound: false, seen: { s1: 1 }, rung: { s1: 1, s3: 0 },
      last: { at: Date.now(), rows: [
        { id: 's1', name: 'Plant · video 1', short: 'C1', active: true, spend: 33000, pi: 6, sales: 1, created: '' },
        { id: 's3', name: 'Plant · video 3', short: 'C2', active: true, spend: 21000, pi: 4, sales: 0, created: '' },
      ] },
    });
    const d = await fresca();
    await new Promise((ok) => setTimeout(ok, 60));
    const b2 = d.window.document.querySelector('#mw-root .mw-btn');
    assert.ok(!b2.querySelector('.mw-set[data-id="s1"]').classList.contains('mw-alert'), 'Recarga: lo revisado no late');
    assert.ok(b2.querySelector('.mw-set[data-id="s3"]').classList.contains('mw-alert'), 'Recarga: lo no revisado sigue latiendo');
    assert.ok(/^Sin conexión · último dato/.test(b2.querySelector('.mw-msg').textContent), 'Sin fetch: muestra los últimos datos con aviso');
    assert.strictEqual(d.window.PYL.app.state.metawatch.saved.sound, false, 'Recarga: 🔕 se conserva');
    assert.ok(!d.window.document.documentElement.outerHTML.includes(MW_TK), 'El token no aparece en el HTML tras recargar');
    d.window.close();
    delete store['pyl-meta'];
  };

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
    assert.deepStrictEqual(JSON.parse(JSON.stringify(C.tkLoad(S.load(), hoy))), { ok: true, note: { days: {} }, collapsed: false, alerts: false }, 'Sin clave arranca vacía');
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
    assert.strictEqual($('#tk-bar').style.width, '0%');
    assert.ok(!$('#tk-all').hidden && $('#tk-all').title === 'Marcar todas', 'Con tareas aparece «Marcar todas»');
    // Con hora escrita: va al final.
    tipea(hour, '9'); tipea(text, 'Llamar al banco');
    key(hour, 'Enter');
    assert.deepStrictEqual(textos(), ['Comprar pan', 'Llamar al banco'], 'La nueva va al final');
    assert.deepStrictEqual($$('#tk-list .tk-hour').map((h) => h.textContent), [String(ahora), '9']);
    assert.ok($$('#tk-list .tk-task').every((t) => t.dataset.id && t.querySelector('.tk-row').dataset.id === t.dataset.id), 'Cada fila lleva data-id');
    assert.strictEqual($('#tk-bar').style.width, '0%');
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
    assert.strictEqual($('#tk-bar').style.width, '33%');
    assert.strictEqual($('#tk-bar').style.width, '33%');
    // Doble check: marca todas y pasa a «Desmarcar todas»; otra vez, desmarca.
    $('#tk-all').click();
    assert.strictEqual($('#tk-bar').style.width, '100%');
    assert.ok($('#tk-all').title === 'Desmarcar todas' && $('#tk-all').classList.contains('is-on'), 'Cambia a «Desmarcar todas» (.is-on)');
    $('#tk-all').click();
    assert.ok($('#tk-bar').style.width === '0%' && $('#tk-all').title === 'Marcar todas', 'Desmarca todo');
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
    assert.strictEqual($('#tk-bar').style.width, '0%');
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
    // Chevron sin contador: «N de M hechas» solo en aria-label/title; todas hechas → .is-complete.
    assert.ok(chip().textContent === '' && chip().querySelector('svg'), 'Chevron sin texto, solo el SVG');
    assert.ok(!chip().hasAttribute('style') && chip().style.getPropertyValue('--sub-progress') === '', 'Chevron sin --sub-progress');
    assert.ok(chip().getAttribute('aria-label').includes('0 de 2 hechas') && !chip().classList.contains('is-complete'), 'Chevron 0 de 2');
    assert.ok(!$$('#tk-list .tk-toggle-subs').length, 'Sin chevron en las acciones flotantes');
    assert.deepStrictEqual([...fila(0).querySelectorAll('.tk-task-row > .tk-acts > button')].map((b) => b.getAttribute('aria-label')), ['Añadir subtarea', 'Eliminar tarea'], 'Acciones flotantes: + subtarea y papelera');
    assert.ok(fila(0).querySelector('.tk-task-row').classList.contains('has-subs'), 'Con subtareas la fila es clicable');
    fila(0).querySelector('.tk-sub-row .tk-check').click();
    assert.ok(chip().getAttribute('aria-label') === 'Contraer subtareas (1 de 2 hechas)' && chip().getAttribute('title') === 'Contraer subtareas (1 de 2 hechas)', 'aria-label y title: 1 de 2 hechas');
    assert.ok(!chip().classList.contains('is-complete') && chip().textContent === '', 'Con 1 de 2 sin .is-complete ni texto');
    assert.ok(fila(0).querySelector('.tk-sub-row .tk-check').classList.contains('is-on') && fila(0).querySelector('.tk-sub-text').classList.contains('is-done'), 'Subtarea marcada y tachada');
    assert.ok(!fila(0).querySelector('.tk-task-row > .tk-check').classList.contains('is-on'), 'Marcar subtarea no marca la tarea');
    assert.strictEqual($('#tk-bar').style.width, '25%', 'El progreso cuenta tareas y subtareas');
    fila(0).querySelectorAll('.tk-sub-row .tk-check')[1].click();
    assert.ok(chip().getAttribute('aria-label').includes('2 de 2 hechas') && chip().classList.contains('is-complete'), 'Todas hechas: chevron en acento');
    // Marcar la tarea no marca sus subtareas.
    fila(0).querySelectorAll('.tk-sub-row .tk-check')[1].click();
    fila(0).querySelector('.tk-task-row > .tk-check').click();
    assert.ok(chip().getAttribute('aria-label').includes('1 de 2 hechas'), 'Marcar la tarea no toca las subtareas');
    // El chevron alterna contraer/expandir.
    chip().click();
    assert.ok(!fila(0).querySelector('.tk-subs') && chip().classList.contains('is-collapsed') && chip().getAttribute('aria-expanded') === 'false', 'Chevron contrae');
    assert.ok(chip().getAttribute('aria-label').startsWith('Expandir subtareas'), 'Contraído dice Expandir');
    chip().click();
    assert.ok(fila(0).querySelector('.tk-subs') && !chip().classList.contains('is-collapsed') && chip().getAttribute('aria-expanded') === 'true', 'Chevron expande');
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
    assert.ok($$('#tk-list .tk-task').length === 1 && $('#tk-bar').style.width === '0%', 'Borrar la tarea se lleva sus subtareas');
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
    assert.strictEqual($('#tk-bar').style.width, '0%');
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
    // SPEC 27: la única subtarea de una tarea se levanta porque el día tiene 2 tareas (puede pasar a otra); Esc la devuelve.
    ptr(tarea(1).querySelector('.tk-sub-text'), 'pointerdown', 40); ptr(D, 'pointermove', 120);
    assert.ok(list.classList.contains('is-dragging'), 'Con una sola subtarea y 2 tareas en el día, se levanta');
    key(D.activeElement || D.body, 'Escape');
    ptr(D, 'pointerup', 120);
    assert.ok(subDom(1).join() === 'W' && subDom().join() === 'X,Z,Y' && subNota(1).join() === 'W', 'Esc la devuelve a su tarea');
    await tick(0);
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

  // 8s2. Mis tareas · switch del aviso por hora y su sonido (SPEC 27, paso 2). Audio simulado y localStorage simulado.
  const tkTest10 = async () => {
    delete store['pyl-tasks'];
    let p = await tkPage();
    let { W, D, $, $$, tick, S } = p;
    const sw = () => $('#tk-alert');
    const estado = () => [sw().getAttribute('aria-checked'), sw().title, sw().getAttribute('aria-label')];
    const OFF = ['false', 'Activar aviso por hora', 'Activar aviso por hora'], ON = ['true', 'Desactivar aviso por hora', 'Desactivar aviso por hora'];
    // Audio junto a #tk-root.
    const audio = $('#tk-audio');
    assert.ok(audio && audio.tagName === 'AUDIO' && audio.getAttribute('src') === 'sounds/tarea.mp3' && audio.getAttribute('preload') === 'auto', '<audio id="tk-audio" src="sounds/tarea.mp3" preload="auto">');
    assert.ok(audio.parentElement === $('#tk-rail') && audio.previousElementSibling === $('#tk-root'), '#tk-audio va junto a #tk-root');
    // Switch: botón nativo (Enter y Espacio los da el navegador), a la izquierda del renglón del progreso (donde estaba el anillo).
    assert.ok(sw().tagName === 'BUTTON' && sw().type === 'button' && sw().getAttribute('role') === 'switch', '<button type="button" role="switch">');
    assert.ok(sw().parentElement === $('.tk-prog') && $('.tk-prog').firstElementChild === sw() && $('.tk-prog').lastElementChild === $('#tk-all'), 'En .tk-prog: switch a la izquierda, #tk-all a la derecha');
    assert.ok(sw().querySelector('svg.ic-bell') && sw().querySelector('.tk-sw .tk-sw-knob'), 'Campana y píldora');
    assert.deepStrictEqual(estado(), OFF, 'Apagado por defecto');
    assert.strictEqual(S.alerts, false);
    // Visible en Ayer, Hoy y Mañana con el día vacío (el historial se prueba en tkTest11, con un día abierto).
    for (const tab of $$('#tk-tabs .tk-tab')) { tab.click(); assert.ok(!sw().hidden && sw().isConnected && $('.tk-prog').firstElementChild === sw(), 'Visible con el día vacío en ' + tab.textContent); }
    $$('#tk-tabs .tk-tab')[1].click();
    // Clic: enciende, suena una vez sin #toast; apagar no suena.
    let plays = 0;
    audio.play = () => { plays++; return Promise.reject(new Error('NotAllowedError')); }; // bloqueado: no ensucia la consola
    $('#toast').textContent = '';
    sw().click();
    assert.deepStrictEqual(estado(), ON, 'Clic enciende');
    assert.ok(S.alerts === true && sw().classList.contains('is-on'));
    assert.strictEqual(plays, 1, 'Encender suena una vez (vista previa)');
    assert.strictEqual($('#toast').textContent, '', 'La vista previa no saca #toast');
    sw().click();
    assert.deepStrictEqual(estado(), OFF, 'Clic apaga');
    assert.strictEqual(plays, 1, 'Apagar no suena');
    // Guarda alerts con el guardado de 300 ms.
    sw().click();
    assert.strictEqual(store['pyl-tasks'], undefined, 'No guarda al instante');
    await tick(350);
    assert.strictEqual(JSON.parse(store['pyl-tasks']).alerts, true, 'pyl-tasks guarda alerts: true');
    // Si el mp3 falta (error del <audio>), no vuelve a intentar y no lanza.
    audio.dispatchEvent(new W.Event('error'));
    sw().click(); sw().click();
    assert.strictEqual(plays, 2, 'Con error del audio no se vuelve a intentar');
    assert.deepStrictEqual(estado(), ON, 'El switch sigue funcionando');
    await tick(350);
    W.close();
    // Recargar con alerts: true arranca encendido.
    p = await tkPage();
    assert.deepStrictEqual([p.$('#tk-alert').getAttribute('aria-checked'), p.S.alerts], ['true', true], 'Recargar conserva el switch encendido');
    p.W.close();
    // Sin alerts o con un valor no booleano: arranca apagado sin perder las tareas.
    for (const a of [undefined, 'sí']) {
      store['pyl-tasks'] = JSON.stringify({ v: 1, note: { days: { [tkDk(0)]: [tkT('a', 'Uno')] } }, ...(a === undefined ? {} : { alerts: a }) });
      p = await tkPage();
      assert.deepStrictEqual([p.$('#tk-alert').getAttribute('aria-checked'), p.S.alerts, p.textos()], ['false', false, ['Uno']], 'alerts ' + JSON.stringify(a) + ' → apagado y conserva las tareas');
      p.W.close();
    }
    delete store['pyl-tasks'];
  };

  // 8s3. Mis tareas · aviso por hora (SPEC 27, paso 3). Date y setTimeout simulados; audio simulado.
  const tkTest11 = async () => {
    const ahora = new Date().getHours();
    const T = (id, text, hour, done = false, extra = {}) => tkT(id, text, { hour, done, ...extra });
    // Al cargar no avisa de la hora en curso aunque haya una tarea pendiente a esa hora.
    store['pyl-tasks'] = JSON.stringify({ v: 1, alerts: true, note: { days: { [tkDk(0)]: [T('n', 'Ahora', ahora)] } } });
    let p = await tkPage();
    assert.ok(!/Es hora/.test(p.$('#toast').textContent), 'Al cargar no hay aviso de horas ya pasadas');
    p.W.close();
    store['pyl-tasks'] = JSON.stringify({ v: 1, alerts: true, note: { days: {
      [tkDk(0)]: [
        T('a', 'Pan', 14), T('h', 'Hecha', 14, true), T('o', 'Otra', 15, false, { subtasks: [{ id: 's', text: 'Sub', done: false }] }),
        ...['A', 'B', 'C', 'D', 'E'].map((t) => T('c' + t, t, 16)),
      ],
      [tkDk(1)]: [T('m', 'Mañana', 14), T('m2', 'Mañana 17', 17)],
      [tkDk(-1)]: [T('y', 'Ayer', 17)],
      [tkDk(-3)]: [T('v', 'Viejo', 9)],
    } } });
    p = await tkPage();
    const { W, D, $, $$, S } = p;
    const RealDate = W.Date, realSet = W.setTimeout;
    const hoy = new RealDate();
    const pon = (h, m = 0, sec = 0) => {
      const fixed = new RealDate(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), h, m, sec).getTime();
      W.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(fixed); } static now() { return fixed; } };
    };
    // Solo el temporizador del aviso se captura; los demás (guardado, toast, medianoche) corren normal.
    let prog = [];
    W.setTimeout = (fn, ms, ...r) => { if (fn && fn.name === 'fireAlert') { prog.push({ fn, ms }); return 0; } return realSet(fn, ms, ...r); };
    const vuelve = () => D.dispatchEvent(new W.Event('visibilitychange'));
    const dispara = () => { const t = prog[prog.length - 1]; prog = []; t.fn(); };
    let plays = 0;
    $('#tk-audio').play = () => { plays++; return Promise.resolve(); };
    const limpia = () => { $('#toast').textContent = ''; };
    // Programa con tkMsToNextHour al volver a la pestaña, sin avisar.
    pon(13, 30); limpia(); vuelve();
    assert.deepStrictEqual([prog.length, prog[0].ms, plays, $('#toast').textContent], [1, 1800000, 0, ''], 'visibilitychange reprograma a la próxima hora en punto sin avisar');
    // 14:00: suena una vez y #toast con la pendiente de hoy (sin la hecha ni la de mañana).
    pon(14, 0); dispara();
    assert.strictEqual(plays, 1, 'A las 14:00 suena una vez');
    assert.strictEqual($('#toast').textContent, 'Es hora: 14:00 · Pan', '#toast con solo las pendientes de hoy');
    assert.deepStrictEqual([prog.length, prog[0].ms], [1, 3600000], 'Tras disparar se reprograma a la siguiente hora en punto');
    // 15:00: la tarea con subtareas avisa por su hora; las subtareas no cuentan.
    limpia(); pon(15, 0); dispara();
    assert.deepStrictEqual([plays, $('#toast').textContent], [2, 'Es hora: 15:00 · Otra'], 'Solo la tarea, no la subtarea');
    // 16:00: cinco a la misma hora → un solo sonido y 3 textos + «…y 2 más».
    limpia(); pon(16, 0); dispara();
    assert.deepStrictEqual([plays, $('#toast').textContent], [3, 'Es hora: 16:00 · A · B · C · …y 2 más'], 'Varias a la misma hora: un solo aviso');
    // 17:00: solo hay tareas de ayer y mañana a esa hora → nada.
    limpia(); pon(17, 0); dispara();
    assert.deepStrictEqual([plays, $('#toast').textContent], [3, ''], 'Tareas de otros días no avisan');
    // Con la pestaña de día en Mañana (y en Ayer) avisa por las de hoy; no cambia de día ni mueve el foco.
    for (const i of [2, 0]) {
      $$('#tk-tabs .tk-tab')[i].click();
      const dia = S.day, foco = D.activeElement;
      limpia(); pon(13, 59); vuelve(); pon(14, 10); dispara();
      assert.strictEqual($('#toast').textContent, 'Es hora: 14:00 · Pan', 'Despierta 14:10: avisa de las 14 con la pestaña en ' + $$('#tk-tabs .tk-tab')[i].textContent);
      assert.ok(S.day === dia && D.activeElement === foco, 'No cambia de día ni de foco');
    }
    // Con un día del historial abierto, también.
    $('#tk-history').click();
    $$('#tk-history-menu .tk-mi').find((b) => b.dataset.day === tkDk(-3)).click();
    assert.strictEqual(S.day, tkDk(-3), 'Día del historial abierto');
    assert.ok(!$('#tk-alert').hidden && $('.tk-prog').firstElementChild === $('#tk-alert'), 'El switch sigue a la izquierda con un día del historial abierto');
    limpia(); pon(13, 59); vuelve(); pon(14, 0); dispara();
    assert.ok($('#toast').textContent === 'Es hora: 14:00 · Pan' && S.day === tkDk(-3), 'Con el historial abierto avisa por las de hoy y no cambia de día');
    $$('#tk-tabs .tk-tab')[1].click();
    // Disparo tarde (15:02 de un temporizador de las 14): nada, y reprograma a las 16:00.
    const antes = plays;
    limpia(); pon(13, 59); vuelve(); pon(15, 2); dispara();
    assert.deepStrictEqual([plays, $('#toast').textContent], [antes, ''], 'Disparo con la hora ya cambiada no avisa');
    assert.strictEqual(prog[0].ms, 58 * 60000, 'Reprograma desde la hora actual');
    // Temporizador adelantado (13:59:59): no avisa y reprograma a las 14:00 en punto.
    limpia(); pon(13, 59); vuelve(); pon(13, 59, 59); dispara();
    assert.deepStrictEqual([plays, $('#toast').textContent, prog[0].ms], [antes, '', 1000], 'Adelantado: nada y vuelve a programar');
    // Sin el mp3 (error del audio): no suena pero el #toast sale igual.
    $('#tk-audio').dispatchEvent(new W.Event('error'));
    limpia(); pon(14, 0); dispara();
    assert.deepStrictEqual([plays, $('#toast').textContent], [antes, 'Es hora: 14:00 · Pan'], 'Sin mp3: sin sonido y con #toast');
    // Switch apagado: nada.
    $('#tk-alert').click();
    assert.strictEqual(S.alerts, false);
    limpia(); pon(13, 59); vuelve(); pon(14, 0); dispara();
    assert.deepStrictEqual([plays, $('#toast').textContent], [antes, ''], 'Con el switch apagado no suena ni sale #toast');
    W.setTimeout = realSet; W.Date = RealDate;
    W.close();
    delete store['pyl-tasks'];
  };

  // 8s4. Mis tareas · pasar una subtarea a otra tarea del mismo día (SPEC 27, paso 4).
  // jsdom no mide: geometría simulada en el orden del DOM (fila de tarea 40 px, cada subtarea 40 px debajo de su tarea).
  const tkTest12 = async () => {
    const sub = (id, text, done = false) => ({ id, text, done });
    store['pyl-tasks'] = JSON.stringify({ v: 1, note: { days: {
      [tkDk(0)]: [
        tkT('a', 'A', { subtasks: [sub('x', 'X'), sub('y', 'Y', true)] }),
        tkT('b', 'B', { subtasks: [sub('w', 'W')] }),
        tkT('c', 'C'),
        tkT('d', 'D', { collapsed: true, subtasks: [sub('v', 'V')] }),
      ],
      [tkDk(1)]: [tkT('m', 'Mañana', { subtasks: [sub('n', 'N')] })],
    } } });
    const { W, D, $, $$, key, tick, S } = await tkPage();
    const list = $('#tk-list');
    const tareas = () => [...list.children].filter((n) => n.classList.contains('tk-task'));
    W.HTMLElement.prototype.getBoundingClientRect = function () {
      const r = (top, h) => ({ top, bottom: top + h, height: h, left: 0, right: 200, width: 200 });
      if (this === list) return r(0, 1000);
      let y = 0;
      const m = new Map();
      for (const w of tareas()) {
        const top = y;
        m.set(w.querySelector('.tk-task-row'), r(y, 40)); y += 40;
        for (const s of [...w.children].filter((n) => n.classList.contains('tk-subs'))) {
          const st = y;
          for (const row of s.querySelectorAll('.tk-sub-row')) { m.set(row, r(y, 40)); y += 40; }
          m.set(s, r(st, y - st));
        }
        m.set(w, r(top, y - top));
      }
      return m.get(this) || r(0, 0);
    };
    const ptr = (el, type, y) => {
      const e = new W.MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: 10, clientY: y });
      Object.defineProperty(e, 'pointerId', { value: 1 });
      Object.defineProperty(e, 'isPrimary', { value: true });
      el.dispatchEvent(e);
    };
    const T = (id) => tareas().find((w) => w.dataset.id === id);
    const subDom = (id) => [...T(id).querySelectorAll('.tk-sub-row .tk-sub-text')].map((n) => n.textContent);
    const subTxt = (id, text) => [...T(id).querySelectorAll('.tk-sub-row .tk-sub-text')].find((n) => n.textContent === text);
    const nota = (id) => JSON.parse(JSON.stringify(S.note.days[S.day].find((t) => t.id === id)));
    const subNota = (id) => nota(id).subtasks.map((s) => s.text);
    const chev = (id) => T(id).querySelector('.tk-task-row > .tk-sub-toggle');
    // Layout: A 0–40 (X 40–80, Y 80–120) · B 120–160 (W 160–200) · C 200–240 · D 240–280 (contraída).
    // 1. X sobre las subtareas de B: queda después de W; se pinta en vivo dentro de B.
    const x = subTxt('a', 'X').closest('.tk-sub-row');
    ptr(subTxt('a', 'X'), 'pointerdown', 60); ptr(D, 'pointermove', 190);
    assert.ok(list.classList.contains('is-dragging') && x.classList.contains('is-dragging'), 'La subtarea se levanta');
    assert.deepStrictEqual([subDom('a'), subDom('b')], [['Y'], ['W', 'X']], 'Se pinta en vivo en el grupo destino');
    assert.ok(T('b').classList.contains('is-drop'), 'La tarea destino se resalta');
    assert.deepStrictEqual([subNota('a'), subNota('b')], [['X', 'Y'], ['W']], 'La nota no cambia hasta soltar');
    ptr(D, 'pointerup', 190);
    assert.deepStrictEqual([subNota('a'), subNota('b')], [['Y'], ['W', 'X']], 'Al soltar pasa a B (tkMoveSubTo)');
    assert.ok(!list.querySelector('.is-drop, .is-dragging, .tk-subs-tmp'), 'Limpia clases y bloques temporales');
    assert.strictEqual(chev('b').getAttribute('aria-label'), 'Contraer subtareas (0 de 2 hechas)', 'Chevron del destino al día');
    assert.ok(chev('a').getAttribute('aria-label') === 'Contraer subtareas (1 de 1 hechas)' && chev('a').classList.contains('is-complete'), 'Chevron del origen al día');
    await tick(0);
    // 2. Y (única subtarea de A; el día tiene 4 tareas) entre W y X; conserva done; A pierde el chevron.
    // Layout: A 0–40 (Y 40–80) · B 80–120 (W 120–160, X 160–200) · C · D.
    ptr(subTxt('a', 'Y'), 'pointerdown', 60); ptr(D, 'pointermove', 160);
    assert.deepStrictEqual(subDom('b'), ['W', 'Y', 'X'], 'Hueco entre las subtareas de otra tarea');
    ptr(D, 'pointerup', 160);
    assert.deepStrictEqual([subNota('a'), subNota('b')], [[], ['W', 'Y', 'X']], 'Queda entre ellas');
    assert.deepStrictEqual(nota('b').subtasks[1], { id: 'y', text: 'Y', done: true }, 'Conserva id, texto y done');
    assert.ok(!chev('a') && !T('a').querySelector('.tk-subs'), 'La tarea origen sin subtareas pierde el chevron');
    assert.ok(!chev('b').classList.contains('is-complete') && chev('b').getAttribute('aria-label') === 'Contraer subtareas (1 de 3 hechas)');
    await tick(0);
    // 3. X sobre la fila de C (sin subtareas): pasa a ser su última subtarea.
    // Layout: A 0–40 · B 40–80 (W 80–120, Y 120–160, X 160–200) · C 200–240 · D 240–280.
    ptr(subTxt('b', 'X'), 'pointerdown', 180); ptr(D, 'pointermove', 225);
    assert.ok(T('c').querySelector('.tk-subs-tmp') && subDom('c').join() === 'X' && T('c').classList.contains('is-drop'), 'Bloque temporal en C');
    ptr(D, 'pointerup', 225);
    assert.deepStrictEqual([subNota('b'), subNota('c')], [['W', 'Y'], ['X']], 'Pasa a C');
    assert.ok(chev('c') && !chev('c').classList.contains('is-collapsed'), 'C con chevron, expandida');
    await tick(0);
    // 4. W sobre la fila de D (contraída): queda como su última subtarea y D queda expandida.
    // Layout: A 0–40 · B 40–80 (W 80–120, Y 120–160) · C 160–200 (X 200–240) · D 240–280.
    ptr(subTxt('b', 'W'), 'pointerdown', 100); ptr(D, 'pointermove', 260);
    assert.strictEqual(subDom('d').join(), 'W', 'Se pinta en un bloque temporal de D');
    ptr(D, 'pointerup', 260);
    assert.deepStrictEqual([subNota('b'), subNota('d'), 'collapsed' in nota('d')], [['Y'], ['V', 'W'], false], 'D: al final y expandida');
    assert.deepStrictEqual([subDom('d'), chev('d').classList.contains('is-collapsed')], [['V', 'W'], false], 'D se ve expandida');
    await tick(0);
    // 5. Esc devuelve todo: la fila pintada en otro grupo y la expansión temporal de una tarea contraída; no guarda.
    $$('#tk-list .tk-task')[3].querySelector('.tk-sub-toggle').click(); // contrae D
    await tick(300);
    assert.ok(nota('d').collapsed && !T('d').querySelector('.tk-subs'), 'D contraída');
    await tick(350);
    const guardado = store['pyl-tasks'];
    // Layout: A 0–40 · B 40–80 (Y 80–120) · C 120–160 (X 160–200) · D 200–240.
    ptr(subTxt('b', 'Y'), 'pointerdown', 100); ptr(D, 'pointermove', 195);
    assert.deepStrictEqual([subDom('b'), subDom('c')], [[], ['X', 'Y']], 'Pintada en C');
    ptr(D, 'pointermove', 225);
    assert.ok(T('d').querySelector('.tk-subs-tmp') && subDom('c').join() === 'X', 'Pasa al bloque temporal de D y sale de C');
    key(D.activeElement || D.body, 'Escape');
    ptr(D, 'pointerup', 225);
    assert.deepStrictEqual([subDom('b'), subDom('c'), subDom('d')], [['Y'], ['X'], []], 'Esc devuelve la subtarea a su tarea');
    assert.ok(!T('d').querySelector('.tk-subs') && chev('d').classList.contains('is-collapsed'), 'D vuelve a estar contraída, sin bloque temporal');
    assert.ok(!list.querySelector('.is-drop, .is-dragging'), 'Sin clases de arrastre');
    assert.deepStrictEqual([subNota('b'), subNota('c'), subNota('d')], [['Y'], ['X'], ['V', 'W']], 'La nota no cambia');
    await tick(350);
    assert.strictEqual(store['pyl-tasks'], guardado, 'Esc no guarda');
    // 6. Soltar de vuelta en su sitio no guarda.
    ptr(subTxt('b', 'Y'), 'pointerdown', 100); ptr(D, 'pointermove', 195); ptr(D, 'pointermove', 70);
    assert.deepStrictEqual([subDom('b'), subDom('c')], [['Y'], ['X']], 'De vuelta en su grupo');
    ptr(D, 'pointerup', 70);
    await tick(350);
    assert.strictEqual(store['pyl-tasks'], guardado, 'Soltar en el mismo sitio no guarda');
    // 7. Lo movido queda guardado; mañana no cambia (no cruza días).
    const g = JSON.parse(guardado).note.days;
    assert.deepStrictEqual(g[tkDk(0)].map((t) => [t.id, t.subtasks.map((s) => s.id)]), [['a', []], ['b', ['y']], ['c', ['x']], ['d', ['v', 'w']]], 'Guardado');
    assert.deepStrictEqual(g[tkDk(1)][0].subtasks.map((s) => s.id), ['n'], 'Otro día intacto');
    // 8. Arrastrar una tarea sigue llevándose sus subtareas.
    ptr(T('c').querySelector('.tk-text'), 'pointerdown', 140); ptr(D, 'pointermove', 260);
    assert.deepStrictEqual(tareas().map((w) => w.dataset.id), ['a', 'b', 'd', 'c'], 'La tarea se mueve');
    ptr(D, 'pointerup', 260);
    assert.deepStrictEqual(subNota('c'), ['X'], 'Con sus subtareas');
    W.close();
    // 9. Un día de una sola tarea con una sola subtarea: no se levanta.
    store['pyl-tasks'] = JSON.stringify({ v: 1, note: { days: { [tkDk(0)]: [tkT('a', 'A', { subtasks: [sub('x', 'X')] })] } } });
    const p = await tkPage();
    const s0 = p.$('#tk-list .tk-sub-text');
    const ev = (el, type, y) => { const e = new p.W.MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: 10, clientY: y }); Object.defineProperty(e, 'pointerId', { value: 1 }); el.dispatchEvent(e); };
    ev(s0, 'pointerdown', 60); ev(p.D, 'pointermove', 200);
    assert.ok(!p.$('#tk-list').classList.contains('is-dragging'), 'Una tarea con una subtarea: no se levanta');
    ev(p.D, 'pointerup', 200);
    p.W.close();
    delete store['pyl-tasks'];
  };

  // 8u. Inicio · franja de indicadores (SPEC 22, paso 8). Página aparte con localStorage simulado.
  const IX_KEYS = ['pyl-pnl-snap', 'pyl-search', 'pyl-testing', 'pyl-tasks', 'pyl-meta'];
  const ixConClaves = async (claves, fn) => {
    const guardado = {};
    IX_KEYS.forEach((k) => { if (k in store) guardado[k] = store[k]; delete store[k]; });
    Object.assign(store, claves);
    try { await fn(); } finally { IX_KEYS.forEach((k) => delete store[k]); Object.assign(store, guardado); }
  };
  const ixCards = (D) => [...D.querySelectorAll('#ix-root .ix-card')];

  const ixTest1 = () => ixConClaves({}, async () => {
    const d = await fresca(), W = d.window, D = W.document;
    const kids = [...D.querySelector('#v-dash').children];
    const iHero = kids.findIndex((k) => k.classList.contains('hero'));
    assert.strictEqual(kids[iHero + 1].id, 'ix-root', 'La franja va justo bajo la tarjeta principal');
    assert.strictEqual(kids[iHero + 1].tagName, 'SECTION');
    assert.strictEqual(kids[iHero + 1].getAttribute('aria-label'), 'Indicadores');
    assert.strictEqual(D.querySelectorAll('[id^="ix-"]').length, 1, 'Un solo id #ix- en la página');
    const cards = ixCards(D);
    assert.deepStrictEqual(cards.map((c) => c.dataset.k), ['pnl', 'funnel', 'testing', 'tasks'], 'Cuatro tarjetas, en orden');
    assert.ok(cards.every((c) => c.tagName === 'BUTTON' && c.type === 'button' && c.classList.contains('card-side') && c.classList.contains('ix-empty')), 'Botones, .card-side y todas atenuadas');
    assert.deepStrictEqual(cards.map((c) => c.querySelector('.ix-invite').textContent), ['Sube tus reportes en el Tablero P&L', 'Guarda tu primer candidato', 'Practica en Testeo o conecta Meta', 'Anota tu primera tarea']);
    assert.deepStrictEqual(cards.map((c) => c.querySelector('.ix-title').textContent), ['Mini P&L', 'Embudo de productos', 'Testeo', 'Pulso de tareas']);
    assert.ok(cards.every((c) => /: /.test(c.getAttribute('aria-label'))), 'Cada tarjeta tiene aria-label');
    // Foto rota o de otra versión: Mini P&L queda vacía sin errores.
    for (const raw of ['{roto', JSON.stringify({ v: 2, at: 1, prod: 'Todos', from: null, to: null, util: 1, fact: 1, margen: null, roas: null, efect: null })]) {
      store['pyl-pnl-snap'] = raw;
      W.PYL.app.indicators.paint();
      assert.ok(D.querySelector('#ix-root [data-k="pnl"]').classList.contains('ix-empty'), 'Foto inválida = vacía');
    }
    W.close();
  });

  const ixTest2 = () => {
    const snap = (o = {}) => ({ v: 1, at: new Date(2026, 10, 20, 9).getTime(), prod: 'Todos', from: '2026-11-01', to: '2026-11-20', util: 1250000, fact: 6400000, margen: 0.195, roas: 3.4, roasEq: 2.1, efect: 0.72, ...o });
    return ixConClaves({
      'pyl-pnl-snap': JSON.stringify(snap()),
      'pyl-search': JSON.stringify({ log: [{ id: 'a', status: 'evaluando' }, { id: 'b', status: 'evaluando' }, { id: 'c', status: 'testeo' }, { id: 'd', status: 'ganador' }, { id: 'e', status: 'descartado' }] }),
      'pyl-testing': JSON.stringify({ v: 3, part: 'test', best: 70 }),
    }, async () => {
      const d = await fresca(), W = d.window, D = W.document, P = W.PYL;
      const card = (k) => D.querySelector(`#ix-root [data-k="${k}"]`);
      const txt = (k) => card(k).textContent;
      P.app.indicators.paint(); // la primera pintada cuenta de 0 a su valor: se repinta sin animar para leer los valores finales
      // Mini P&L
      assert.ok(!card('pnl').classList.contains('ix-empty'));
      assert.ok(/1\.250\.000/.test(txt('pnl')) && /19,5/.test(txt('pnl')) && /3,40x/.test(txt('pnl')) && /72,0/.test(txt('pnl')), 'Utilidad, margen, ROAS y efectividad: ' + txt('pnl'));
      assert.ok(/Todos · 1 nov – 20 nov · dato del 20 nov/.test(txt('pnl')), 'Producto, periodo y fecha del dato');
      assert.ok(card('pnl').querySelector('.ix-big').classList.contains('ix-t-g') && card('pnl').querySelector('.ix-track .ix-g'), 'Utilidad y margen sanos en verde');
      assert.ok(card('pnl').querySelector('.ix-mark'), 'Marca en MARGIN.healthy');
      const chips = () => [...card('pnl').querySelectorAll('.ix-chip')].map((c) => c.classList.contains('ix-g') ? 'g' : c.classList.contains('ix-y') ? 'y' : c.classList.contains('ix-r') ? 'r' : '-');
      assert.deepStrictEqual(chips(), ['g', 'g'], 'ROAS y efectividad sanos en verde');
      assert.ok(card('pnl').classList.contains('ix-tone-g'), 'La tarjeta toma el tono de la utilidad');
      const pintaSnap = (o) => { store['pyl-pnl-snap'] = JSON.stringify(snap(o)); P.app.indicators.paint(); };
      pintaSnap({ util: -50000, margen: -0.03 });
      assert.ok(card('pnl').querySelector('.ix-big').classList.contains('ix-t-r') && card('pnl').querySelector('.ix-track .ix-r'), 'Utilidad negativa y margen bajo en rojo');
      assert.ok(card('pnl').classList.contains('ix-tone-r'), 'Con pérdida la tarjeta se tiñe de rojo');
      pintaSnap({ roas: 1.5, efect: 0.5 });
      assert.deepStrictEqual(chips(), ['r', 'r'], 'ROAS bajo equilibrio y efectividad baja en rojo');
      pintaSnap({ roas: 2.2, efect: 0.65 });
      assert.deepStrictEqual(chips(), ['y', 'y'], 'En el límite en amarillo');
      pintaSnap({ margen: 0.12 });
      assert.ok(card('pnl').querySelector('.ix-track .ix-y'), 'Margen entre equilibrio y sano en amarillo');
      // Embudo
      assert.deepStrictEqual([...card('funnel').querySelectorAll('.ix-row')].map((r) => r.dataset.k + ':' + r.querySelector('.ix-row-n').textContent), ['evaluando:2', 'testeo:1', 'activo:0', 'ganador:1']);
      assert.ok(/1 descartado/.test(txt('funnel')) && /5 en la bitácora/.test(txt('funnel')));
      assert.deepStrictEqual([...card('funnel').querySelectorAll('.ix-row')].map((r) => r.dataset.tone), ['y', 'o', 'g', 'b'], 'Cada etapa con su color de semáforo');
      assert.ok(card('funnel').querySelector('.ix-chip.ix-r'), 'Los descartados van en un chip rojo');
      P.app.state.search.log.pop(); // borrar un producto y volver a Inicio cambia el número
      D.querySelector('#tabs [data-v="buscar"]').click();
      D.querySelector('#tabs [data-v="dash"]').click();
      assert.ok(/0 descartados/.test(txt('funnel')) && /4 en la bitácora/.test(txt('funnel')), 'Volver a Inicio relee la bitácora');
      assert.ok(!card('funnel').querySelector('.ix-chip.ix-r'), 'Sin descartados el chip no es rojo');
      P.app.indicators.paint(); // al volver a Inicio la animación cuenta de 0: se repinta sin animar
      // Testeo: sin Meta solo el puntaje; con Meta, el corte más alto de un conjunto activo (el OFF no cuenta).
      assert.ok(/70/.test(txt('testing')) && /Meta sin dato de cortes/.test(txt('testing')) && !/Corte/.test(txt('testing')), 'Sin Meta: solo puntaje: ' + txt('testing'));
      P.app.state.metawatch.rows = [
        { id: '1', name: 'a', short: 'C1', active: true, spend: 22000, pi: 3, sales: 0, created: '' },
        { id: '2', name: 'b', short: 'C2', active: true, spend: 31000, pi: 5, sales: 1, created: '' },
        { id: '3', name: 'c', short: 'C3', active: false, spend: 45000, pi: 9, sales: 2, created: '' },
      ];
      D.dispatchEvent(new W.CustomEvent('meta:dato'));
      assert.ok(/Corte 30K · C2/.test(txt('testing')) && /2 conjuntos activos/.test(txt('testing')), 'Corte 30K · C2, el OFF no cuenta: ' + txt('testing'));
      const pasos = [...card('testing').querySelectorAll('.ix-step')];
      assert.deepStrictEqual(pasos.map((x) => x.querySelector('.ix-step-l').textContent), ['20K', '30K', '40K'], 'Escalera con los 3 cortes');
      assert.deepStrictEqual(pasos.map((x) => x.classList.contains('ix-on')), [true, true, false], 'Alcanzados: 20K y 30K');
      assert.deepStrictEqual(pasos.map((x) => x.classList.contains('ix-cur')), [false, true, false], 'El actual es 30K');
      assert.strictEqual(card('testing').querySelector('.ix-rail .ix-fill').style.getPropertyValue('--ix-v'), '0.5', 'El riel llega a la mitad');
      assert.ok(!D.querySelector('#ix-root').classList.contains('ix-play'), 'Un repintado por dato no anima');
      // Sin puntaje ni corte, vacía.
      P.app.state.testing.best = null; P.app.state.metawatch.rows = [];
      D.dispatchEvent(new W.CustomEvent('meta:dato'));
      assert.ok(card('testing').classList.contains('ix-empty'), 'Sin puntaje ni Meta: vacía');
      // Pulso de tareas: se actualiza al marcar una tarea con Inicio abierto.
      assert.ok(card('tasks').classList.contains('ix-empty'));
      const nueva = (t) => {
        D.querySelector('#tk-new').click();
        const h = D.querySelector('#tk-add-hour'), x = D.querySelector('#tk-add-text');
        h.value = '9'; h.dispatchEvent(new W.Event('input', { bubbles: true }));
        x.value = t; x.dispatchEvent(new W.Event('input', { bubbles: true }));
        x.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      };
      nueva('Uno'); nueva('Dos');
      D.querySelector('#tk-add-text').dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      assert.ok(/0 de 2 hechas hoy/.test(txt('tasks')) && /^0%/.test(card('tasks').querySelector('.ix-ring-c').textContent) && /2 por hacer/.test(txt('tasks')), 'Tareas nuevas repintan la franja: ' + txt('tasks'));
      assert.ok(!card('tasks').querySelector('.ix-days') && !/Racha/.test(txt('tasks')), 'Solo el avance de hoy: sin barras de días ni racha');
      assert.strictEqual(card('tasks').querySelector('.ix-ring-fill').style.strokeDashoffset, '100', 'Anillo vacío con 0 %');
      D.querySelector('#tk-list .tk-task .tk-check').click();
      assert.ok(/1 de 2 hechas hoy/.test(txt('tasks')) && /^50%/.test(card('tasks').querySelector('.ix-ring-c').textContent), 'Marcar una tarea actualiza sin recargar');
      assert.strictEqual(card('tasks').querySelector('.ix-ring-fill').style.strokeDashoffset, '50', 'Anillo a la mitad');
      assert.strictEqual(D.querySelector('#tk-bar').style.width, '50%', 'Igual que la barra de Mis tareas');
      D.querySelector('#tk-all').click();
      assert.ok(/2 de 2 hechas hoy/.test(txt('tasks')) && /^100%/.test(card('tasks').querySelector('.ix-ring-c').textContent) && card('tasks').querySelector('.ix-ring-fill.ix-done') && /Todo hecho/.test(txt('tasks')), 'Todo hecho: 100 % y anillo en verde');
      // Clic: cada tarjeta abre su pestaña; la de tareas baja a Mis tareas y enfoca «+».
      const vista = () => [...D.querySelectorAll('.view.on')].map((v) => v.id).join();
      for (const [k, v] of [['pnl', 'v-pyl'], ['funnel', 'v-buscar'], ['testing', 'v-testeo']]) {
        D.querySelector('#tabs [data-v="dash"]').click();
        card(k).click();
        assert.strictEqual(vista(), v, `La tarjeta ${k} abre ${v}`);
      }
      D.querySelector('#tabs [data-v="dash"]').click();
      let bajo = 0;
      D.querySelector('#tk-root').scrollIntoView = () => { bajo += 1; };
      card('tasks').click();
      assert.strictEqual(vista(), 'v-dash', 'Pulso de tareas se queda en Inicio');
      assert.strictEqual(bajo, 1, 'Baja a #tk-root');
      assert.strictEqual(D.activeElement.id, 'tk-new', 'Enfoca #tk-new');
      // Animación: al volver a Inicio se repite; sin animación con reduced motion.
      D.querySelector('#tabs [data-v="buscar"]').click();
      assert.strictEqual(P.app.state.indicators.played, false, 'Al salir de Inicio se rearma');
      D.querySelector('#tabs [data-v="dash"]').click();
      assert.ok(D.querySelector('#ix-root').classList.contains('ix-play') && P.app.state.indicators.played, 'Al volver, anima otra vez');
      W.matchMedia = () => ({ matches: true });
      P.app.indicators.paint(true);
      assert.ok(!D.querySelector('#ix-root').classList.contains('ix-play'), 'Con prefers-reduced-motion no hay animación');
      assert.ok(/1\.250\.000/.test(txt('pnl')), 'Y el valor aparece final');
      W.close();
    });
  };

  // SPEC 25: estrategia La Caza (página aparte con localStorage simulado, como los rastros de la SPEC 08).
  const czTest = async () => {
    const previo = store['pyl-search'];
    store['pyl-search'] = JSON.stringify({ strat: 'caza', cazaMethod: 'zz' });
    const d = await fresca(), W = d.window, doc = W.document, S = W.PYL.app.state.search, C = W.PYL.core.search;
    const $ = (q) => doc.querySelector(q), $$ = (q) => [...doc.querySelectorAll(q)];
    assert.strictEqual($$('#b-strats .st-tab').length, 4, 'Estrategias muestra 4 tarjetas');
    assert.ok(/Cuatro caminos/.test($('#b-sec-strat .b-sub').textContent), 'Subtítulo «Cuatro caminos…»');
    assert.strictEqual(S.strat, 'caza', "strat: 'caza' guardado abre La Caza");
    assert.ok(!$('#b-st-caza').hidden && $('#b-st-vdo').hidden && $('#b-st-prov').hidden, 'Solo se ve #b-st-caza');
    assert.strictEqual(S.cazaMethod, 'a', "cazaMethod 'zz' cae en A");
    assert.strictEqual($$('#b-caza .cz-gate').length, 2, '2 puertas');
    assert.strictEqual($$('#b-caza .cz-node').length, 3, '3 nodos');
    assert.strictEqual($('#b-caza .cz-node.on').dataset.m, 'a');
    assert.ok(/Se vende afuera pero no aquí/.test($('#b-caza .cz-det h3').textContent) && $('#b-caza .cz-fork'), 'Detalle de A con bifurcación');
    assert.ok($('#b-caza .cz-out.g') && $('#b-caza .cz-out.y') && /Goldbox/.test($('#b-caza .cz-out.y').textContent), 'Salidas verde y amarilla con el aliado');
    // Cambiar a B y a C.
    $('#b-caza .cz-node[data-m="b"]').click();
    assert.strictEqual(S.cazaMethod, 'b');
    assert.ok(/Vende aquí, bajo el techo/.test($('#b-caza .cz-det h3').textContent) && !$('#b-caza .cz-fork'), 'B sin bifurcación');
    assert.strictEqual($('#b-caza .cz-node[data-m="b"]').getAttribute('aria-pressed'), 'true');
    assert.strictEqual(JSON.parse(store['pyl-search']).cazaMethod, 'b', 'Se guarda cazaMethod');
    $('#b-caza .cz-node[data-m="c"]').click();
    assert.strictEqual(S.cazaMethod, 'c');
    assert.ok(/Explota en TikTok Shop/.test($('#b-caza .cz-det h3').textContent) && $('#b-caza .cz-fork'), 'C con bifurcación');
    assert.deepStrictEqual($$('#b-caza .cz-det .row.mt button').map((b) => b.textContent), ['← Método anterior'], 'Acciones de C');
    // Copiar prompt.
    let copiado = null;
    Object.defineProperty(W.navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { copiado = t; } } });
    $('#toast').textContent = '';
    $('#cz-copy').click();
    await new Promise((ok) => setTimeout(ok, 20));
    assert.strictEqual(copiado, C.cazaMethod('c').prompt, 'Copia el prompt del método abierto');
    assert.ok(/Prompt copiado/.test($('#toast').textContent), 'Avisa en #toast');
    // Cambiar de estrategia oculta La Caza y la tarjeta queda marcada.
    $$('#b-strats .st-tab')[0].click();
    assert.ok($('#b-st-caza').hidden && !$('#b-st-vdo').hidden, 'VDO oculta La Caza');
    $$('#b-strats .st-tab')[2].click();
    assert.ok(!$('#b-st-caza').hidden && $$('#b-strats .st-tab')[2].getAttribute('aria-pressed') === 'true', 'La tercera tarjeta abre La Caza');
    W.close();
    store['pyl-search'] = previo;
  };

  // SPEC 25: estrategia El Espía (página aparte con localStorage simulado, como La Caza).
  const spyTest = async () => {
    const previo = store['pyl-search'];
    store['pyl-search'] = JSON.stringify({ strat: 'espia', espiaMode: 'zz' });
    const d = await fresca(), W = d.window, doc = W.document, S = W.PYL.app.state.search, C = W.PYL.core.search;
    const $ = (q) => doc.querySelector(q), $$ = (q) => [...doc.querySelectorAll(q)];
    assert.strictEqual($$('#b-strats .st-tab').length, 4, 'Estrategias muestra 4 tarjetas');
    assert.strictEqual(S.strat, 'espia', "strat: 'espia' guardado abre El Espía");
    assert.ok(!$('#b-st-espia').hidden && $('#b-st-vdo').hidden && $('#b-st-prov').hidden && $('#b-st-caza').hidden, 'Solo se ve #b-st-espia');
    assert.strictEqual($$('#b-strats .st-tab')[3].getAttribute('aria-pressed'), 'true', 'La cuarta tarjeta queda marcada');
    assert.strictEqual(S.espiaMode, 'a', "espiaMode 'zz' cae en A");
    assert.deepStrictEqual($$('#b-espia .sp-tile').map((t) => t.dataset.k), ['top', 'ads', 'apps', 'theme', 'pixels'], '5 fichas de la pantalla');
    assert.strictEqual($$('#b-espia .sp-node').length, 2, '2 entradas');
    assert.strictEqual($('#b-espia .sp-node.on').dataset.m, 'a');
    assert.ok(/Espío una tienda/.test($('#b-espia .sp-det h3').textContent) && $$('#b-espia .sp-st').length === 4, 'Detalle de A con 4 pasos');
    assert.ok($('#b-espia .sp-pt').textContent.includes('[DOMINIO O ENLACE DE LA TIENDA]'), 'Prompt de A con su marcador');
    // Cambiar a B.
    $('#b-espia .sp-node[data-m="b"]').click();
    assert.strictEqual(S.espiaMode, 'b');
    assert.ok(/Sigo un producto/.test($('#b-espia .sp-det h3').textContent), 'Detalle de B');
    assert.strictEqual($('#b-espia .sp-node[data-m="b"]').getAttribute('aria-pressed'), 'true');
    assert.strictEqual(JSON.parse(store['pyl-search']).espiaMode, 'b', 'Se guarda espiaMode');
    assert.deepStrictEqual($$('#b-espia .sp-det .row.mt button').map((b) => b.textContent), ['← Entrada anterior'], 'Acciones de B');
    // Copiar prompt.
    let copiado = null;
    Object.defineProperty(W.navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { copiado = t; } } });
    $('#toast').textContent = '';
    $('#sp-copy').click();
    await new Promise((ok) => setTimeout(ok, 20));
    assert.strictEqual(copiado, C.espiaMode('b').prompt, 'Copia el prompt de la entrada abierta');
    assert.ok(/Prompt copiado/.test($('#toast').textContent), 'Avisa en #toast');
    // Siguiente / anterior y cambio de estrategia.
    $('#b-espia .sp-det .row.mt button').click();
    assert.strictEqual(S.espiaMode, 'a', '← Entrada anterior vuelve a A');
    $$('#b-strats .st-tab')[2].click();
    assert.ok(!$('#b-st-caza').hidden && $('#b-st-espia').hidden, 'La Caza oculta El Espía');
    $$('#b-strats .st-tab')[3].click();
    assert.ok(!$('#b-st-espia').hidden && $('#b-st-caza').hidden, 'La cuarta tarjeta vuelve a abrir El Espía');
    W.close();
    store['pyl-search'] = previo;
  };

  // SPEC 26: Guardado rápido · editar un producto (página aparte con localStorage simulado).
  const qkTest = async () => {
    const previo = store['pyl-quick'];
    const semilla = () => [
      { id: '300', name: 'Tercero', dropi: '33', createdAt: 300 },
      { id: '200', name: 'Segundo', dropi: '22', createdAt: 200, price: 25000, photo: 'data:image/png;base64,AAAA' },
      { id: '100', name: 'Primero', dropi: '11', createdAt: 100, price: 9900 },
    ];
    store['pyl-quick'] = JSON.stringify({ items: semilla() });
    const d = await fresca(), W = d.window, doc = W.document, S = W.PYL.app.state.quick;
    const $ = (q) => doc.querySelector(q), $$ = (q) => [...doc.querySelectorAll(q)];
    const tick = () => new Promise((ok) => setTimeout(ok, 20));
    W.Element.prototype.scrollIntoView = () => {}; // Mi candidato lo usa al recibir el envío; jsdom no lo trae
    const escribe = (q, v) => { const i = $(q); i.value = v; i.dispatchEvent(new W.Event('input', { bubbles: true })); };
    const guardado = () => JSON.parse(store['pyl-quick']).items;
    const lapiz = (id) => $(`#qk-list .qk-row[data-id="${id}"] .qk-edit`);
    const vacio = () => $('#qk-name').value === '' && $('#qk-dropi').value === '' && $('#qk-price').value === '';
    const normal = () => $('#qk-save').textContent === 'Guardar' && $('#qk-cancel').hidden && !$('.qk-row.is-editing') && S.editing === null && S.photo === '';
    const esc = () => doc.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    $('#qk-btn').click();

    // Lápiz en cada fila, justo antes de enviar.
    assert.strictEqual($$('#qk-list .qk-row').length, 3);
    for (const r of $$('#qk-list .qk-row')) {
      const e = r.querySelector('.qk-edit');
      assert.ok(e && e.nextElementSibling === r.querySelector('.qk-send') && e.querySelector('svg.ic-edit') && !e.querySelector('.ic'), 'Lápiz antes de enviar, sin .ic');
      assert.strictEqual(e.getAttribute('aria-label'), 'Editar ' + r.querySelector('.qk-name').textContent);
      assert.strictEqual(e.title, 'Editar');
      assert.strictEqual(e.getAttribute('aria-pressed'), 'false');
    }
    assert.ok(normal() && vacio(), 'Fuera de edición: Guardar y Cancelar oculto');

    // Tocar el lápiz carga los campos.
    lapiz('200').click();
    assert.strictEqual($('#qk-name').value, 'Segundo');
    assert.strictEqual($('#qk-dropi').value, '22');
    assert.strictEqual($('#qk-price').value.replace(/\s/g, ' '), '$ 25.000');
    assert.ok(!$('#qk-photo .qk-photo-img').hidden && $('#qk-photo .qk-photo-img').src.startsWith('data:image/png'), 'Muestra su imagen');
    assert.strictEqual(doc.activeElement, $('#qk-name'), 'Foco en Nombre');
    assert.strictEqual($('#qk-save').textContent, 'Actualizar');
    assert.ok(!$('#qk-cancel').hidden && $('#qk-cancel').textContent === 'Cancelar');
    assert.deepStrictEqual($$('.qk-row.is-editing').map((r) => r.dataset.id), ['200']);
    assert.strictEqual(lapiz('200').getAttribute('aria-pressed'), 'true');
    assert.strictEqual(S.editing, '200');

    // Actualizar: mismo id, createdAt y posición; la lista no crece; sin error por su propio ID.
    escribe('#qk-name', ' Segundo editado ');
    $('#qk-save').click(); await tick();
    let g = guardado();
    assert.deepStrictEqual(g.map((x) => x.id), ['300', '200', '100'], 'Misma posición y tamaño');
    assert.deepStrictEqual(g[1], { id: '200', name: 'Segundo editado', dropi: '22', createdAt: 200, price: 25000, photo: 'data:image/png;base64,AAAA' });
    assert.ok(/Actualicé "Segundo editado" en el guardado rápido\./.test($('#toast').textContent), 'Avisa en #toast');
    assert.ok(normal() && vacio(), 'Tras actualizar el formulario queda vacío y en modo normal');
    assert.strictEqual($('#qk-list .qk-row[data-id="200"] .qk-name').textContent, 'Segundo editado');

    // ID de otro producto: error y sigue en edición, sin tocar nada.
    lapiz('200').click();
    escribe('#qk-dropi', '11');
    $('#toast').textContent = '';
    $('#qk-save').click(); await tick();
    assert.ok(/Ese ID ya está guardado\./.test($('#toast').textContent), 'ID de otro producto rechazado');
    assert.strictEqual(S.editing, '200');
    assert.strictEqual($('#qk-save').textContent, 'Actualizar');
    assert.strictEqual(guardado()[1].dropi, '22', 'No se tocó el producto');
    // Nombre vacío también falla y sigue en edición.
    escribe('#qk-dropi', '22'); escribe('#qk-name', '');
    $('#toast').textContent = '';
    $('#qk-save').click(); await tick();
    assert.ok(/Falta el nombre/.test($('#toast').textContent) && S.editing === '200');
    // Enter en un campo actualiza.
    escribe('#qk-name', 'Con Enter');
    $('#qk-dropi').dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await tick();
    assert.strictEqual(guardado()[1].name, 'Con Enter', 'Enter actualiza');
    assert.ok(normal());

    // Vaciar precio y quitar imagen deja el producto sin price ni photo.
    lapiz('200').click();
    escribe('#qk-price', '');
    $('#qk-root .qk-photo-rm').click();
    assert.ok($('#qk-photo .qk-photo-img').hidden, 'La imagen se quita igual que al crear');
    $('#qk-save').click(); await tick();
    assert.deepStrictEqual(guardado()[1], { id: '200', name: 'Con Enter', dropi: '22', createdAt: 200 }, 'Sin price ni photo');

    // Cancelar.
    lapiz('100').click();
    escribe('#qk-name', 'Cambiado a medias');
    $('#qk-cancel').click();
    assert.ok(normal() && vacio(), 'Cancelar vacía y sale de edición');
    assert.strictEqual(guardado()[2].name, 'Primero', 'Cancelar no cambia el producto');
    assert.ok($('#qk-photo .qk-photo-img').hidden);

    // Cambiar de producto sin preguntar.
    lapiz('100').click();
    escribe('#qk-name', 'Sin actualizar');
    lapiz('300').click();
    assert.ok(!$('#modal').classList.contains('show'), 'No pregunta');
    assert.strictEqual($('#qk-name').value, 'Tercero');
    assert.strictEqual(S.editing, '300');
    assert.deepStrictEqual($$('.qk-row.is-editing').map((r) => r.dataset.id), ['300']);
    assert.strictEqual(guardado()[2].name, 'Primero', 'Lo escrito y no actualizado se pierde');
    // El mismo lápiz lo vuelve a cargar.
    escribe('#qk-name', 'Otra cosa');
    lapiz('300').click();
    assert.strictEqual($('#qk-name').value, 'Tercero', 'Tocar el lápiz del mismo producto lo recarga');

    // Esc cierra el panel y cancela.
    esc();
    assert.ok($('#qk-panel').hidden && normal() && vacio(), 'Esc cancela la edición');
    $('#qk-btn').click();
    assert.ok(!$('#qk-panel').hidden && normal() && vacio(), 'Al reabrir está en modo normal');
    // ✕ también.
    lapiz('300').click(); $('#qk-panel .qk-x').click();
    assert.ok($('#qk-panel').hidden && normal() && vacio(), '✕ cancela la edición');
    // El botón flotante y abrir otro flotante también.
    $('#qk-btn').click(); lapiz('300').click(); $('#qk-btn').click();
    assert.ok($('#qk-panel').hidden && normal() && vacio(), 'El botón flotante cancela la edición');
    $('#qk-btn').click(); lapiz('300').click(); $('#dk-btn').click();
    assert.ok($('#qk-panel').hidden && normal() && vacio(), 'Abrir otro flotante cancela la edición');
    $('#dk-btn').click();
    $('#qk-btn').click();

    // Eliminar el producto en edición.
    lapiz('100').click();
    $('#qk-list .qk-row[data-id="100"] .qk-del').click(); await tick();
    $('#modal [data-r="del"]').click(); await tick();
    assert.ok(normal() && vacio(), 'Eliminar el producto en edición sale del modo');
    assert.deepStrictEqual(guardado().map((x) => x.id), ['300', '200']);
    // Eliminar otro no cancela la edición.
    lapiz('300').click();
    $('#qk-list .qk-row[data-id="200"] .qk-del').click(); await tick();
    $('#modal [data-r="del"]').click(); await tick();
    assert.strictEqual(S.editing, '300', 'Borrar otro producto no cancela');
    assert.strictEqual($('#qk-name').value, 'Tercero');

    // Enviar a Mi candidato en edición manda lo guardado, no lo escrito.
    escribe('#qk-name', 'Escrito sin guardar');
    let enviado = null;
    doc.addEventListener('rapido:candidato', (e) => { enviado = e.detail; });
    $('#qk-list .qk-row[data-id="300"] .qk-send').click();
    assert.deepStrictEqual({ name: enviado.name, dropi: enviado.dropi }, { name: 'Tercero', dropi: '33' }, 'Envía los datos guardados');
    assert.ok($('#qk-panel').hidden && normal() && vacio(), 'Enviar cierra el panel y cancela la edición');

    // Limpiar sale del modo edición.
    $('#qk-btn').click();
    lapiz('300').click();
    $('#qk-clear').click(); await tick();
    $('#modal [data-r="clear"]').click(); await tick();
    assert.ok(normal() && vacio() && S.items.length === 0, 'Limpiar sale de edición con el formulario vacío');

    W.close();
    store['pyl-quick'] = previo;
    if (previo === undefined) delete store['pyl-quick'];
  };

  return lgTest().then(dkTest).then(apTest).then(chTest).then(chCadenaTest).then(chDurasTest).then(hubTest).then(hubTest2).then(hubTest3).then(hubTest4).then(hubTest5).then(tkTest1).then(tkTest2).then(tkTest3).then(tkTest4).then(tkTest5).then(tkTest6).then(tkTest7).then(tkTest8).then(tkTest9).then(tkTest10).then(tkTest11).then(tkTest12).then(ckTest).then(mwTest1).then(mwTest2).then(mwTest3).then(mwTest4).then(ixTest1).then(ixTest2).then(czTest).then(spyTest).then(qkTest).then(fresca).then((d2) => {
    const doc2 = d2.window.document;
    assert.deepStrictEqual([...doc2.querySelectorAll('#b-strats .st-tab')].map((b) => b.textContent.length > 0), [true, true, true, true], 'Estrategias muestra 4 tarjetas');
    assert.deepStrictEqual([...d2.window.PYL.core.search.STRATEGIES.map((x) => x.k)], ['vdo', 'prov', 'caza', 'espia'], 'STRATEGIES = vdo, prov, caza y espia');
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
  }).then(() => fresca()).then((d6) => {
    // SPEC 24: barrido. Ningún emoji visible fuera de las zonas permitidas (contenido que sale de la app:
    // mensajes de Logística, narrativa y veredicto del P&L, informe PDF, prompts). Los símbolos tipográficos se quedan.
    const W6 = d6.window, doc6 = W6.document;
    const PERMITIDOS = new Set(['®', '©', '™', '↔', '↕', '↖', '↗', '↘', '↙', '▶', '◀']);
    const FUERA = 'script, style, textarea, #report, [id^="story"], #verdict, .lg-out, .ld-prompt > p, #dk-prompt, #ap-prompt';
    const hallados = new Map(); // texto → dónde apareció primero
    let pasadas = 0;
    const barre = (donde) => {
      pasadas++;
      const tw = doc6.createTreeWalker(doc6.body, W6.NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()) {
        if (n.parentElement && n.parentElement.closest(FUERA)) continue;
        const t = n.data.trim().slice(0, 70);
        if (!hallados.has(t) && (n.data.match(/\p{Extended_Pictographic}/gu) || []).some((ch) => !PERMITIDOS.has(ch))) hallados.set(t, donde);
      }
    };
    // Recorre los botones de navegación interna de la vista (sub-pestañas, pasos, estrategias, fases, modos) uno a uno.
    const INTERNOS = '[id$="-parts"] button:not([disabled]), [id$="-steps"] button, #b-strats button, #ma-strats button, .ps-node, [data-bview], #ts-sx-modes button, #es-modes button';
    for (const t of [...doc6.querySelectorAll('#tabs button')]) {
      t.click(); barre(t.dataset.v);
      const vista = doc6.getElementById('v-' + t.dataset.v);
      for (let i = 0; i < 80; i++) {
        const bs = [...vista.querySelectorAll(INTERNOS)];
        if (i >= bs.length) break;
        bs[i].click(); barre(t.dataset.v + ' › ' + (bs[i].dataset.part || bs[i].dataset.mode || bs[i].dataset.bview || bs[i].textContent.trim().slice(0, 30)));
      }
    }
    // Paneles flotantes, Cortes de testeo, Mis tareas (Acerca de) y el modo Editar del Centro de mando.
    doc6.querySelector('#tabs [data-v="buscar"]').click();
    for (const q of ['#qk-btn', '#dk-btn']) { const b = doc6.querySelector(q); if (b) { b.click(); barre(q); b.click(); } }
    doc6.querySelector('#tabs [data-v="desarrollo"]').click();
    { const b = doc6.querySelector('#ap-btn'); if (b) { b.click(); barre('#ap-btn'); b.click(); } }
    doc6.querySelector('#tabs [data-v="dash"]').click();
    for (const q of ['#mw-root .mw-btn', '#tk-gear', '#hb-edit']) { const b = doc6.querySelector(q); if (b) { b.click(); barre(q); } }
    assert.ok(pasadas >= 40, 'El barrido recorrió pestañas, pasos y paneles (' + pasadas + ')');
    const lista = [...hallados].map(([t, donde]) => donde + ': «' + t + '»');
    assert.deepStrictEqual(lista, [], 'Emojis fuera de las zonas permitidas:\n' + lista.join('\n'));
    W6.close();
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
