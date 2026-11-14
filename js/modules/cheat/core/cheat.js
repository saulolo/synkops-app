// Atajos flotantes de Testeo (SPEC 12): datos de los paneles "Cadena que decide" y "Métricas duras".
// Sin DOM. Todo sale de metrics (HARD_METRICS, GENERIC_CPA, CTR_UNIQUE_WARN, NS_TEST), testing (TEST_CHAIN, TEST_RULES) y scaling
// (SCALE_RULES): ningún número ni límite de métricas se repite aquí. Los textos son segmentos (un string es texto plano, { b } va en negrita).
// Nombres con prefijo ch/CH_ para no chocar al aplanar en js/index.js.
(() => {
  const core = globalThis.PYL.core;
  const { HARD_METRICS, GENERIC_CPA, NS_TEST, copText } = core.metrics;
  const { TEST_CHAIN, TEST_RULES } = core.testing;
  const { SCALE_RULES } = core.scaling;

  // Los dos grupos de la cadena.
  const CH_SIDES = [
    { k: 'antes', t: 'Métricas antes del clic' },
    { k: 'despues', t: 'Métricas después del clic' },
  ];
  // Qué grupo tiene cada eslabón.
  const SIDE_OF = { cpm: 'antes', cpc: 'antes', cppi: 'despues', cpa: 'despues' };

  // TEST_CHAIN.reads no trae el CPA (en el testeo se lee con los cortes): lectura propia. El tope sale de GENERIC_CPA.
  const CH_CPA_READ = {
    k: 'cpa',
    when: ['CPA sobre el tope (', { b: '$ ' + copText(GENERIC_CPA.tope) }, ' genérico)'],
    fix: ['Sube en la cadena: el primer eslabón roto (CPM, CPC o CPPI) es el problema.'],
  };

  // ¿Qué falla y cómo lo arreglo? por eslabón: versión condensada de la tabla de la cadena del Entrenador (causa · cómo lo noto · solución).
  // Los números salen de las fuentes: cortes (NS_TEST), CPPI (TEST_RULES), zonas del CPA (GENERIC_CPA), escalón y ventana (NS_TEST, SCALE_RULES).
  const m = (v) => '$ ' + copText(v);
  const pct = (x) => Math.round(x * 100) + ' %';
  const cutK = NS_TEST.cuts.map((n) => n / 1000 + 'K');
  const row = (cause, how, fix) => ({ cause, how: [].concat(how), fix: [].concat(fix) });
  const CH_HELP = {
    cpm: {
      rows: [
        row('Gancho débil', 'Caro desde el primer día; la gente pasa de largo.', 'Creativo nuevo que abra con el problema o el resultado en los primeros 3 s.'),
        row('Creativo cansado', 'Venía sano y sube día a día con el mismo anuncio.', 'Lanzar el reemplazo con otro gancho.'),
        row('Contenido que la plataforma castiga', 'CPM de 3 a 8 veces el máximo con promesas de "milagro", bata blanca o síntomas de enfermedad.', 'Creativo nuevo sin promesas exageradas: mostrar el uso real.'),
        row('No parece contenido nativo', 'Video horizontal o con cara de comercial de TV.', 'Creativo nuevo vertical 9:16, estilo de alguien usándolo.'),
      ],
      foot: ['Mientras el CPM esté roto, no juzgo el CPC ni el CPPI: son consecuencia.'],
    },
    cpc: {
      rows: [
        row('El producto no genera deseo', 'CPM sano, pero casi nadie hace clic.', ['No es el creativo: otro video no lo arregla. Dejo decidir los cortes de ', { b: cutK.join(' / ') }, ' y pruebo otro producto.']),
        row('Producto muy visto', 'Aparece en muchas tiendas y anuncios; la gente ya lo conoce.', 'Paso a otro producto con menos competencia.'),
      ],
      foot: ['Primero confirmo que el CPM esté sano; si no, el problema es del creativo (paso 1).'],
    },
    cppi: {
      rows: [
        row('Página lenta', 'Tarda más de 3 s en abrir en el celular; muchas visitas se van.', 'Comprimir imágenes y GIF, quitar apps pesadas de Shopify, video liviano.'),
        row('Página sin confianza', 'Entran, miran y salen: no hay reseñas ni se ve el pago contra entrega.', 'Reseñas con fotos reales, sello "Pagas al recibir", garantía visible, WhatsApp de contacto.'),
        row('Oferta débil', 'Llegan al formulario, pero la oferta no convence de terminar.', 'Combos 2×/3×, bono o regalo, envío gratis, garantía de devolución.'),
        row('Formulario con fricción', 'Inician el pago pero no terminan.', 'Releasit: pocos campos, botón claro, sin pasos extra ni costos sorpresa.'),
      ],
      foot: ['Con CPPI sobre ', { b: m(TEST_RULES.cppiApaga) }, ' sin ventas no se arregla: se apaga en el corte de ', { b: cutK[1] }, '.'],
    },
    cpa: {
      rows: [
        row('Zona de escala', ['CPA de la ventana bajo ', { b: m(GENERIC_CPA.escala) }, '.'], ['Subo un escalón: ', { b: '+' + pct(NS_TEST.step) }, ' de presupuesto. Uno a la vez.']),
        row('Entre escala y tope', ['CPA de la ventana entre ', { b: m(GENERIC_CPA.escala) }, ' y ', { b: m(GENERIC_CPA.tope) }, '.'], 'Sostengo el presupuesto.'),
        row('Sobre el tope', ['CPA de la ventana sobre ', { b: m(GENERIC_CPA.tope) }, '.'], ['Bajo un escalón (', { b: '−' + pct(NS_TEST.step) }, ') y recorro la cadena: CPM, CPC y CPPI.']),
        row('Un día malo después de días buenos', 'Ayer salió más caro que los días anteriores, que venían bien.', ['Hasta ', { b: pct(SCALE_RULES.salto - 1) }, ' más caro: sostengo, fue un día flojo. ', { b: pct(SCALE_RULES.salto - 1) + ' o más' }, ': bajo un escalón.']),
        row('Zona de apagar', [{ b: SCALE_RULES.offDays + ' días seguidos' }, ' con CPA sobre ', { b: m(GENERIC_CPA.apaga) }, '.'], 'Apago. Es regla dura.'),
        row('Día sin nada', ['Cero ventas, cero pagos iniciados y ', { b: m(SCALE_RULES.offDouble * GENERIC_CPA.apaga) }, ' gastados en el día.'], 'Apago: es la única excepción que apaga por un solo día.'),
      ],
      foot: ['Decide la ventana de los últimos ', { b: SCALE_RULES.window + ' días' }, ', no un solo día. Nada se apaga por un día malo, salvo el día sin nada.'],
    },
  };

  const metric = (k) => HARD_METRICS.find((r) => r.k === k);

  // 'meta' | 'tiktok' (cualquier otro valor cae en 'meta').
  const chPlat = (p) => (p === 'tiktok' ? 'tiktok' : 'meta');

  // Cadena en el orden de TEST_CHAIN.flow: [{ k, step, side, name, full, simple, lim: { meta, tiktok }, read: { when, fix }, help: { rows, foot } }].
  function chChain() {
    return TEST_CHAIN.flow.map((n, i) => {
      const k = n.toLowerCase(), h = metric(k), r = k === 'cpa' ? CH_CPA_READ : TEST_CHAIN.reads.find((x) => x.k === k);
      return {
        k, step: i + 1, side: SIDE_OF[k], name: h.name, full: h.means.full, simple: h.means.simple,
        lim: { meta: h.view.meta.main, tiktok: h.view.tiktok.main },
        read: { when: r.when, fix: r.fix }, help: CH_HELP[k],
      };
    });
  }

  // Las 5 métricas duras en el orden de HARD_METRICS, con lo de la plataforma elegida.
  //   tip = aviso del límite (límite máximo y rango ideal) o null · warn = advertencia ⚠ o null · zones = GENERIC_CPA solo en el CPA
  function chHard(plat) {
    const p = chPlat(plat);
    return HARD_METRICS.map((h) => {
      const tip = h.view[p].tip || null;
      return {
        k: h.k, name: h.name, main: h.view[p].main, question: h.question,
        tip, warn: (tip && tip.warn) || null, zones: h.k === 'cpa' ? GENERIC_CPA : null,
        diag: h.diag, lever: h.lever,
      };
    });
  }

  core.cheat = { CH_CPA_READ, CH_HELP, CH_SIDES, chChain, chHard, chPlat };
})();
