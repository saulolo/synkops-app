// Diagnósticos frente a los benchmarks NovaSociety. Devuelven datos, no DOM:
//   rows: [{ name, desc, value, bench, level: 'ok'|'warn'|'bad'|'', text }]
//   conclusion: segmentos de texto; un string es texto plano y { b } va en negrita.
(() => {
  const core = globalThis.PYL.core;
  const { nf, fmt } = core.format;

  const NO_DATA = 'Sin datos suficientes en este filtro.';
  // Cortes de margen neto usados en todo el tablero: ±2% es equilibrio, 15% el mínimo sano y 20% el ideal.
  const MARGIN = { even: 0.02, low: 0.1, healthy: 0.15, ideal: 0.2 }; // low: piso del amarillo del evaluador de productos
  const b = (text) => ({ b: text });
  const row = (name, desc, value, bench, dx) => ({ name, desc, value, bench, level: dx ? dx[0] : '', text: dx ? dx[1] : NO_DATA });

  // Embudo logístico. "Despachados" aquí = entregados + devueltos (en ruta aún no cuenta).
  function funnel(a, producto) {
    const cerr = a.ent + a.dev;
    const canR = a.rec ? a.can / a.rec : null;
    const entR = cerr ? a.ent / cerr : null;
    const devR = cerr ? a.dev / cerr : null;
    const globR = a.rec ? a.ent / a.rec : null;
    const pct = (v) => fmt(v, 'pct');
    const pts = (v) => nf(Math.abs(v) * 100, { maximumFractionDigits: 1 }) + ' pts';

    const rows = [
      row('Tasa de cancelación', 'Filtro en WhatsApp · cancelados / recibidos', pct(canR), '~15% a 20%',
        canR == null ? null
          : canR > 0.3 ? ['bad', 'Alerta: fuga excesiva de clientes en WhatsApp.']
          : canR > 0.25 ? ['warn', 'En el límite: sobre el rango ideal. Revisa el guion de confirmación.']
          : canR >= 0.15 ? ['ok', 'Saludable: buen filtro preventivo de pedidos falsos/duplicados.']
          : canR >= 0.1 ? ['warn', 'Ligeramente bajo el rango ideal: confirma con más rigor.']
          : ['warn', 'Alerta: podría estar despachando pedidos sin confirmar.']),
      row('Efectividad de entrega', 'Entregados / (entregados + devueltos)', pct(entR), '70% a 75%+',
        entR == null ? null
          : entR >= 0.7 ? ['ok', 'Excelente: transporte en rango saludable de la industria.']
          : ['bad', 'Bajo: problemas de entrega con transportadoras o direcciones incompletas.']),
      row('Tasa de devolución', 'Devueltos / (entregados + devueltos)', pct(devR), 'Máximo 25%',
        devR == null ? null
          : devR <= 0.25 ? ['ok', 'En control.']
          : ['warn', 'Alerta: fuga en fletes dobles. Revisa exclusión de zonas rojas.']),
      row('Efectividad operativa global', 'Regla 20/20/60 · entregados / recibidos', pct(globR), '~60% (Meta Reina)',
        globR == null ? null
          : globR >= 0.6 ? ['ok', `Meta Reina alcanzada: ${pts(globR - 0.6)} sobre el 60%.`]
          : [globR >= 0.5 ? 'warn' : 'bad', `A ${pts(0.6 - globR)} de la Meta Reina del 60%.` + (a.ruta ? ` ${nf(a.ruta)} pedidos en ruta aún pueden sumar.` : '')]),
    ];

    if (entR == null) return { rows, conclusion: ['Aún no hay pedidos entregados ni devueltos en este filtro para emitir un diagnóstico.'] };
    const okE = entR >= 0.7, okD = devR <= 0.25;
    const conclusion = [
      producto === 'Consolidado' ? 'Mi operación consolidada ' : `Mi operación con ${producto} `,
      okE ? 'superó' : 'quedó bajo', ' el benchmark de transportadora (', b(pct(entR)), ')',
      okE === okD ? ' y ' : ', pero ',
      okD ? 'las devoluciones están en control (' : 'las devoluciones (', b(pct(devR)),
      okD ? ').' : ') absorbieron parte del margen neto.', ' ',
      !okE || !okD ? 'Priorizar confirmación de dirección y exclusión de zonas rojas.'
        : canR > 0.3 ? 'Priorizar recuperación de clientes en WhatsApp.'
        : canR < 0.1 ? 'Reforzar la confirmación antes de despachar.'
        : globR < 0.6 ? 'Cerrar los pedidos en ruta para acercarte a la Meta Reina del 60%.'
        : 'Mantener el filtro actual: la operación está en rango Nova.',
    ];
    return { rows, conclusion };
  }

  // Cascada P&L: % de cada barra sobre lo cobrado (Ads sobre la Wallet) y conclusión según el escenario.
  function cascade(a) {
    const fact = a.fact, has = fact > 0;
    const retM = has ? (fact - a.merc) / fact : null;
    const flR = has ? a.fletes / fact : null;
    const walR = has ? a.wallet / fact : null;
    const adsR = has ? a.ads / fact : null;
    // Wallet ≤ 0 con gasto en Ads: la pauta consume más del 100% por definición.
    const adsW = a.wallet > 0 ? a.ads / a.wallet : a.ads > 0 ? Infinity : null;
    const P = (v) => (v === Infinity ? 'Wallet ≤ 0' : fmt(v, 'pct'));

    const rows = [
      row('Retención tras Mercancía', '% de lo cobrado que queda tras pagar a bodega', P(retM), '≥ 70%',
        retM == null ? null : retM >= 0.7 ? ['ok', 'Costo de producto sano frente al ticket.'] : ['warn', 'La mercancía pesa demasiado: negocia costo o sube el ticket con combos.']),
      row('Impacto de Fletes', 'Entregas + devoluciones sobre lo cobrado', P(flR), '≤ 25%',
        flR == null ? null : flR <= 0.25 ? ['ok', 'Fletes controlados.'] : flR < 0.35 ? ['warn', 'Fletes en zona de alerta: revisa devoluciones y zonas rojas.'] : ['bad', 'Fuga crítica en fletes: las devoluciones están drenando la operación.']),
      row('Eficiencia de Wallet Dropi', '% de lo cobrado que llega a la billetera antes de Ads', P(walR), '≥ 45%',
        walR == null ? null : walR >= 0.45 ? ['ok', 'Buena caja disponible para pautar.'] : ['warn', 'Poca caja antes de Ads: cualquier CPA alto se come la ganancia.']),
      row('Presión de Meta Ads', '% de la Wallet que consumió la publicidad', P(adsW), '≤ 60%',
        adsW == null ? null : adsW <= 0.6 ? ['ok', 'Pauta eficiente frente a la Wallet.'] : adsW < 1 ? ['warn', 'La pauta se lleva la mayor parte de la Wallet: margen estrecho.'] : ['bad', 'La pauta superó la Wallet: cada venta pierde dinero.']),
    ];

    if (!has) return { rows, conclusion: ['Sin facturación cobrada en este filtro: no hay cascada que diagnosticar.'] };
    const m = a.margen, flBad = flR >= 0.35, adsBad = adsW != null && adsW >= 1;
    let conclusion;
    // El equilibrio va primero: un margen de ±2% se lee como tablas aunque la utilidad tenga signo.
    if (Math.abs(m) <= MARGIN.even) {
      conclusion = ['⚖️ ', b('Punto de Equilibrio:'), ' la barra de Meta Ads absorbió prácticamente el 100% de lo generado en la Wallet (',
        b(P(adsW)), ' de la Wallet, margen ', b(fmt(m, 'pct')), '). El producto financió su aprendizaje a costo cero. Para pasarlo a verde: subir el ticket promedio vendiendo combos o reducir el CPA.'];
    } else if (a.util > 0 && m >= MARGIN.healthy) {
      conclusion = ['🚀 ', b('Producto Ganador:'), ' excelente salud financiera. Mi retención en Wallet (', b(P(walR)),
        ') superó ampliamente la inversión en Ads (', b(P(adsR)), '), logrando que la barra de Utilidad cierre con un margen neto del ', b(P(m)),
        '. La combinación de fletes controlados y un CPA eficiente blindaron mi ganancia.'];
    } else if (a.util > 0) {
      const flHi = flR > 0.25, adsHi = adsW > 0.6;
      const cuello = flHi && adsHi ? ['El cuello de botella es doble: fletes (', b(P(flR)), ' de lo cobrado) y CPA (Ads se lleva ', b(P(adsW)), ' de la Wallet). Ataca ambos']
        : flHi ? ['El cuello de botella son los fletes (', b(P(flR)), ' de lo cobrado): baja devoluciones y excluye zonas rojas']
        : adsHi ? ['El cuello de botella es el CPA: Ads consume ', b(P(adsW)), ' de la Wallet. Optimiza creativos y segmentación']
        : ['El cuello de botella es la mercancía (', b(P(1 - retM)), ' del ticket): negocia costo o sube el ticket con combos'];
      conclusion = ['🟡 ', b('Producto Rentable pero en Zona Límite:'), ' el producto deja ganancia (', b(fmt(a.util, 'cop')), '), pero el margen (', b(P(m)), ') es estrecho. ', ...cuello, ' para poder escalarlo con seguridad.'];
    } else {
      const causa = flBad && adsBad ? ['Doble pinza: pauta costosa (Ads consumió ', b(P(adsW)), ' de la Wallet) y fletes altos (', b(P(flR)), ' de lo cobrado). Hay que corregir ambos frentes a la vez.']
        : flBad ? ['Causa raíz: fuga en fletes de devolución. Los fletes se llevaron ', b(P(flR)), ' de lo cobrado. Prioriza confirmación de dirección y exclusión de zonas rojas.']
        : adsBad ? ['Causa raíz: CPA publicitario insostenible frente al ticket cobrado. Ads consumió ', b(P(adsW)), ' de la Wallet.']
        : ['Ninguna barra cruzó su límite crítico, pero la suma pesa: mercancía ', b(P(1 - retM)), ', fletes ', b(P(flR)), ' y Ads ', b(P(adsW)), ' de la Wallet. Recorta el mayor de ellos.'];
      conclusion = ['🔻 ', b('Producto en Pérdida:'), ' la Utilidad cierra en ', b(fmt(a.util, 'cop')), ' (margen ', b(P(m)), '). ', ...causa];
    }
    return { rows, conclusion };
  }

  // Historia ejecutiva: une las 5 tarjetas KPI en un párrafo según el escenario del filtro.
  function story(a, producto) {
    const quien = producto === 'Consolidado' ? 'mi operación consolidada' : producto;
    if (!a.fact || !a.ent) return ['Aún no hay pedidos entregados y cobrados en este filtro para contar la historia del periodo.'];
    if (!a.ads) return ['Sin gasto en Meta Ads cargado: sube la facturación de Meta o ingresa la inversión para conectar ROAS y CPA con la utilidad.'];
    const pct = (v) => fmt(v, 'pct'), x = (v) => fmt(v, 'x'), cop = (v) => fmt(v, 'cop');
    const sem = a.efect >= 0.7 ? ' 🟢' : ' 🔴';
    const m = a.margen;

    // El equilibrio va primero: un margen de ±2% se lee como tablas aunque la utilidad tenga signo.
    if (Math.abs(m) <= MARGIN.even) {
      return ['⚖️ ', b('Operación en Punto de Equilibrio:'), ' mi negocio financió su aprendizaje a costo cero (', b(cop(a.util) + ' COP'),
        '). El ROAS real (', b(x(a.roas)), ') igualó prácticamente el equilibrio de ', b(x(a.roasEq)),
        '. La pauta cubrió los costos pero no dejó ganancia libre. Palanca clave: vender combos para subir el ticket promedio o reducir devoluciones.'];
    }
    // Ganancia con margen bajo la meta: mismo corte de 15% que el veredicto "Zona límite".
    if (a.util > 0 && m < MARGIN.healthy) {
      const palanca = a.efect < 0.7
        ? 'subir la efectividad de entrega: cada devolución menos ahorra dos fletes y reparte la misma pauta en más entregas.'
        : 'bajar el CPA o subir el ticket promedio con combos.';
      return ['🟡 ', b(`Rentable pero en zona límite con ${quien}:`), ' mi transportadora entregó al ', b(pct(a.efect)), sem,
        ' y cada entrega me costó ', b(cop(a.cpa)), ' en publicidad, por debajo del máximo de ', b(cop(a.cpaMax)),
        '. Mi ROAS real (', b(x(a.roas)), ') superó el equilibrio de ', b(x(a.roasEq)), ', pero el margen neto quedó en ', b(pct(m)),
        ' (meta Nova: 15% a 20%), con una utilidad de ', b('+' + cop(a.util) + ' COP'), '. Hay ganancia, pero poca holgura para escalar. Palanca clave: ', palanca];
    }
    if (a.util > 0) {
      return ['🚀 ', b(`Excelente rendimiento con ${quien}:`), ' mi transportadora cumplió con una efectividad de ', b(pct(a.efect)), sem,
        ', mientras que conseguir cada entrega me costó solo ', b(cop(a.cpa)), ', por debajo del margen máximo de ', b(cop(a.cpaMax)),
        ' que permitía la oferta. Gracias a esto, mi ROAS real (', b(x(a.roas)), ') superó con éxito el equilibrio de ', b(x(a.roasEq)),
        ', logrando un margen neto del ', b(pct(m)), ' y una utilidad libre en mi bolsillo de ', b('+' + cop(a.util) + ' COP'), '.'];
    }

    // En pérdida el CPA siempre supera al máximo (Ads > Wallet); la causa distingue si las devoluciones también pesan.
    const devR = a.dev / (a.ent + a.dev), devBad = devR > 0.25;
    const causa = a.wallet <= 0
      ? (devBad ? ['fletes de devolución: con ', b(pct(devR)), ' de devoluciones la Wallet quedó en negativo aun antes de pautar.']
        : ['mercancía y fletes superan lo cobrado: la Wallet quedó en negativo aun antes de pautar.'])
      : devBad ? ['ambos: pauta costosa y fletes de devolución (', b(pct(devR)), ' de devoluciones, sobre el máximo de 25%).']
      : ['pauta costosa: el CPA superó el máximo sostenible; las devoluciones (', b(pct(devR)), ') están en control.'];
    const cpaMax = a.cpaMax > 0 ? ['superando el margen de ', b(cop(a.cpaMax)), ' que dejaba el producto']
      : ['cuando el producto no dejaba margen para publicidad (', b(cop(a.cpaMax)), ')'];
    return ['🔻 Mi transportadora entregó al ', b(pct(a.efect)), sem, ', pero conseguir cada entrega me costó ', b(cop(a.cpa)), ', ', ...cpaMax,
      '. Por eso mi ROAS real (', b(x(a.roas)), ...(a.roasEq > 0 ? [') no alcanzó el equilibrio de ', b(x(a.roasEq))] : [') no tenía equilibrio posible con la Wallet en negativo']),
      ', provocando un margen negativo del ', b(pct(m)), ' y un resultado final de ', b('-' + cop(Math.abs(a.util)) + ' COP'), '. ',
      b('Causa principal:'), ' ', ...causa];
  }

  // Veredicto de una línea para encabezado y tabla de productos. Mismos cortes que la historia ejecutiva.
  function verdict(util, fact) {
    if (!fact) return { level: '', label: 'Sin cobros' };
    const m = util / fact;
    if (Math.abs(m) <= MARGIN.even) return { level: 'warn', label: '⚖️ Equilibrio' };
    if (util < 0) return { level: 'bad', label: '🔻 En pérdida' };
    return m >= MARGIN.healthy ? { level: 'ok', label: '🚀 Ganador' } : { level: 'warn', label: '🟡 Zona límite' };
  }

  // Semáforo de las 5 tarjetas KPI: { util, margen, efect, roas, cpa } con { level, text } o null sin datos.
  function kpis(a) {
    const r = (level, text) => ({ level, text });
    let roas = null, cpa = null;
    if (!a.ads) roas = r('warn', 'Sin gasto Ads cargado');
    else if (a.roas != null && a.roasEq != null && a.roasEq > 0) {
      const h = a.roas / a.roasEq - 1;
      roas = h >= 0.15 ? r('ok', 'Con holgura') : h >= 0 ? r('warn', 'En el límite') : r('bad', 'Bajo equilibrio');
    } else roas = r('bad', 'Wallet negativa');
    if (a.cpa != null && a.cpaMax != null && a.cpaMax > 0 && a.ads) {
      const h = 1 - a.cpa / a.cpaMax;
      cpa = h >= 0.15 ? r('ok', 'Con holgura') : h >= 0 ? r('warn', 'En el límite') : r('bad', 'Sobre el máximo');
    }
    return {
      util: a.util > 0 ? r('ok', 'Positiva') : r('bad', 'Pérdida'),
      margen: a.margen == null ? null
        : a.margen >= MARGIN.ideal ? r('ok', 'Ideal (≥ 20%)')
        : a.margen >= MARGIN.healthy ? r('ok', 'Sano (15% a 20%)')
        : a.margen > MARGIN.even ? r('warn', 'Bajo meta de 15%')
        : a.margen >= -MARGIN.even ? r('warn', 'Equilibrio')
        : r('bad', 'Negativo'),
      efect: a.efect == null ? null : a.efect >= 0.7 ? r('ok', 'Sobre meta de 70%') : r(a.efect >= 0.6 ? 'warn' : 'bad', 'Bajo meta de 70%'),
      roas, cpa,
    };
  }

  core.diagnostics = { MARGIN, funnel, cascade, story, verdict, kpis };
})();
