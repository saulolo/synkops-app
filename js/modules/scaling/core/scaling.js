// Escalado · Surfing Scaling: reglas de subir, sostener, bajar y apagar (MCP de NovaSociety, reglas_de_juan, COP, sección ESCALANDO)
// más dos protecciones del curso. Módulo informativo: enseña la metodología; no lee campañas reales.
// Sin DOM: los textos son segmentos (un string es texto plano, { b } va en negrita) que PYL.ui.dom.rich pinta.
// Reutiliza: presupuesto base y +20 % ← metrics.NS_TEST, tope genérico ← metrics.GENERIC_CPA, zonas ← testing.cpaZones.
// Donde choca el curso con el MCP manda el MCP (SPEC 07); las reglas del curso llevan source: 'curso'.
(() => {
  const core = globalThis.PYL.core;
  const { NS_TEST, GENERIC_CPA, copText } = core.metrics;
  const { cpaZones, TEST_RULES, TEST_STEPS } = core.testing;
  const money = (v) => '$ ' + copText(v);
  const stepPct = Math.round(NS_TEST.step * 100);

  // Umbrales con los nombres del Lab (sop_en_cop) más los del curso.
  const SCALE_RULES = {
    window: 3,        // días de la ventana (MCP)
    salto: 1.5,       // ayer ≥ 1,5 × los días anteriores = día malo de verdad (MCP)
    offDays: 2,       // días seguidos sobre `apaga` = se apaga (regla dura, MCP)
    offDouble: 2,     // excepción de un solo día: 0 ventas, 0 PI y offDouble × apaga gastado (MCP)
    levels: 15,       // escalones que se muestran (decisión del usuario: los 15 primeros del MCP)
    raiseCpa: 1,      // curso · subida sin ventas: 1 CPA (escala) gastado sin ventas → baja 1
    dawnCpa: 3,       // curso · amanecer rojo: 3 CPA gastados…
    dawnSales: 1,     // …con 0 o 1 venta → baja 2
  };
  const R = SCALE_RULES;

  // Escalera: NS_TEST.budget × (1 + step)^n redondeado a 3 cifras significativas = la del MCP.
  const scaleLadder = (n = R.levels) => Array.from({ length: n }, (_, i) => Number((NS_TEST.budget * Math.pow(1 + NS_TEST.step, i)).toPrecision(3)));
  const LADDER = scaleLadder(R.levels);
  // Bloques de la escalera (nombres del curso). from/to = índices de escalón (0 = N1).
  const LADDER_BLOCKS = [
    { from: 0, to: 4, t: 'Testeo y confirmación' },
    { from: 5, to: 9, t: 'Zona de crecimiento' },
    { from: 10, to: 14, t: 'Alto volumen' },
  ];

  // Las cinco decisiones. Cada veredicto cae en una.
  const SCALE_ACTIONS = [
    { k: 'up', t: 'Subir un escalón', icon: '⬆️' },
    { k: 'hold', t: 'Sostener', icon: '=' },
    { k: 'down', t: 'Bajar un escalón', icon: '⬇️' },
    { k: 'down2', t: 'Bajar dos escalones', icon: '⏬' },
    { k: 'off', t: 'Apagar', icon: '🛑' },
  ];
  const LIGHT_OF = { up: 'g', hold: 'y', down: 'r', down2: 'r', off: 'r' };
  const actionOf = (k) => SCALE_ACTIONS.find((a) => a.k === k);

  const cpaOf = (spend, sales) => (sales > 0 ? spend / sales : null);
  const sum = (a, k) => a.reduce((t, d) => t + d[k], 0);

  // Zona de un gasto con sus ventas: 'up' (sube) | 'hold' (sostiene) | 'down' (baja) | 'off' (zona de apagar) | null (sin gasto).
  // Se compara sin redondear: justo en `escala` ya no sube; justo en `tope` se sostiene; justo en `apaga` baja.
  function scaleZone(spend, sales, zones) {
    if (!(spend > 0)) return null;
    if (!(sales > 0)) return 'off';
    const cpa = spend / sales;
    if (cpa < zones.escala) return 'up';
    if (cpa <= zones.tope) return 'hold';
    if (cpa <= zones.apaga) return 'down';
    return 'off';
  }

  // Mueve el escalón. En N1 "bajar" se queda; en N15 "subir" se sostiene (la acción cambia a hold).
  function move(level, action) {
    const last = R.levels - 1;
    let to = level, note = null, act = action;
    if (act === 'up') {
      if (level >= last) { act = 'hold'; note = 'Último escalón de la escalera (N' + R.levels + '): se sostiene.'; }
      else to = level + 1;
    } else if (act === 'down' || act === 'down2') {
      const n = act === 'down' ? 1 : 2;
      to = Math.max(0, level - n);
      if (level === 0) note = 'Ya estoy en el escalón base (N1): el presupuesto se queda igual.';
      else if (level - n < 0) note = 'Quedo en el escalón base (N1).';
    } else if (act === 'off') {
      return { act, from: level, to: null, budget: 0, note };
    }
    return { act, from: level, to, budget: LADDER[to], note };
  }

  // Forma del veredicto del Lab más lo propio de escalado.
  function build(action, o) {
    const m = move(o.level, action);
    const detalle = m.note ? [...o.detalle, ' ', m.note] : o.detalle;
    return {
      fase: 'escalando', veredicto: o.veredicto, toca: actionOf(m.act).t, detalle, dura: !!o.dura, senales: o.senales,
      action: m.act, light: LIGHT_OF[m.act], branch: o.branch, source: o.source || 'lab',
      cpa: o.cpa ?? null, cpaWin: o.cpaWin ?? null, zone: o.zone ?? null, from: m.from, to: m.to, budget: m.budget,
    };
  }

  // Un día "malo de verdad" ayer: lo dice el MCP como ≥ salto × el CPA de antes (+50 % o más).
  const salto = Math.round((R.salto - 1) * 100);

  // Decisión del día con la ventana de los últimos 3 días (MCP). Devuelve datos, no HTML.
  // scaleVerdict({ days: [{ spend, sales, pi }…] (del más viejo a ayer), level (0 = N1), tope })
  //   → { fase, veredicto, toca, detalle, dura, senales, action, light, branch, source, cpa, cpaWin, zone, from, to, budget }
  function scaleVerdict({ days, level, tope }) {
    const z = cpaZones(tope);
    const w = days.slice(-R.window), y = w[w.length - 1], prior = w.slice(0, -1);
    const spendW = sum(w, 'spend'), salesW = sum(w, 'sales'), cpaWin = cpaOf(spendW, salesW), cpa = cpaOf(y.spend, y.sales);
    const base = { level, cpa, cpaWin, tope };
    const winTxt = ['CPA de la ventana ', { b: cpaWin === null ? '—' : money(cpaWin) }];
    // Un día pasa de la zona de apagar si gastó y sus ventas lo dejan sobre `apaga` (o no vendió nada).
    const over = (d) => d.spend > 0 && (d.sales === 0 || d.spend / d.sales > z.apaga);

    // 1. Regla dura: dos días seguidos sobre `apaga`.
    if (w.length >= R.offDays && w.slice(-R.offDays).every(over)) {
      return build('off', { ...base, branch: 'off-hard', zone: 'off', dura: true, veredicto: 'REGLA DURA: APÁGALO',
        detalle: [{ b: R.offDays + ' días seguidos' }, ' sobre la zona de apagar (', money(z.apaga), '): se apaga.'],
        senales: ['Ayer ', { b: cpa === null ? 'sin ventas' : money(cpa) }, ' y el día anterior también sobre ', money(z.apaga)] });
    }
    // 2. Excepción de un solo día: 0 ventas, 0 pagos iniciados y el doble de `apaga` gastado.
    if (y.sales === 0 && y.pi === 0 && y.spend >= R.offDouble * z.apaga) {
      return build('off', { ...base, branch: 'off-single', zone: 'off', dura: true, veredicto: 'APÁGALO',
        detalle: ['Cero ventas, cero pagos iniciados y el doble de la zona de apagar gastado: se apaga sin esperar al segundo día.'],
        senales: ['Ayer gastó ', { b: money(y.spend) }, ' (apaga ×' + R.offDouble + ' = ' + money(R.offDouble * z.apaga) + ')'] });
    }
    // 3. Día flojo: los días anteriores venían bien (CPA conjunto ≤ tope) y ayer salió más caro.
    const spendP = sum(prior, 'spend'), salesP = sum(prior, 'sales'), cpaP = cpaOf(spendP, salesP);
    if (cpaP !== null && cpaP <= tope && y.spend > 0 && (y.sales === 0 || cpa > cpaP)) {
      const sen = ['Ayer ', { b: cpa === null ? 'sin ventas' : money(cpa) }, ' contra ', { b: money(cpaP) }, ' de los días anteriores'];
      if (cpa !== null && cpa < R.salto * cpaP) {
        return build('hold', { ...base, branch: 'flojo-hold', zone: scaleZone(spendW, salesW, z), veredicto: 'FUE UN DÍA FLOJO',
          detalle: ['Venían bien y ayer salió más caro, pero menos de ' + salto + ' %: fue un día flojo. Se sostiene.'], senales: sen });
      }
      return build('down', { ...base, branch: 'flojo-down', zone: scaleZone(spendW, salesW, z), veredicto: 'AYER SE DISPARÓ',
        detalle: ['Ayer salió ' + salto + ' % o más caro que los días anteriores' + ': se devuelve el ' + stepPct + ' % (baja un escalón).'], senales: sen });
    }
    // 4. Zona de la ventana: CPA = gasto total ÷ ventas totales.
    const zone = scaleZone(spendW, salesW, z);
    if (zone === 'up') {
      return build('up', { ...base, branch: 'zone-up', zone, veredicto: 'SUBE',
        detalle: ['El CPA de la ventana está bajo la zona de escala: sube un escalón (+' + stepPct + ' %).'], senales: [...winTxt, ' (escala bajo ' + money(z.escala) + ')'] });
    }
    if (zone === 'down') {
      return build('down', { ...base, branch: 'zone-down', zone, veredicto: 'BAJA UN ESCALÓN',
        detalle: ['El CPA de la ventana pasó el tope: baja un escalón.'], senales: [...winTxt, ' (tope ' + money(z.tope) + ')'] });
    }
    if (zone === 'off') {
      return build('down', { ...base, branch: 'zone-off', zone, veredicto: 'ZONA DE APAGAR',
        detalle: ['Zona de apagar: nada se apaga por un solo día; si mañana vuelve a quedar aquí, son dos días seguidos y se apaga. Hoy baja un escalón.'],
        senales: [...winTxt, ' (apaga sobre ' + money(z.apaga) + ')'] });
    }
    return build('hold', { ...base, branch: 'zone-hold', zone, veredicto: 'SE SOSTIENE',
      detalle: ['El CPA de la ventana está dentro del tope: se sostiene.'], senales: [...winTxt, ' (entre ' + money(z.escala) + ' y ' + money(z.tope) + ')'] });
  }

  // Protección durante el día (curso). Se mira con el gasto y las ventas desde que subió o desde que amaneció.
  // scaleGuard({ kind: 'raise' | 'dawn', spend, sales, level, tope }) → igual que scaleVerdict, con source: 'curso'.
  function scaleGuard({ kind, spend, sales, level, tope }) {
    const z = cpaZones(tope), cpa = cpaOf(spend, sales);
    const base = { level, cpa, cpaWin: null, zone: null, source: 'curso' };
    if (kind === 'raise') {
      const lim = R.raiseCpa * z.escala;
      const sen = ['Gastó ', { b: money(spend) }, ' con ', { b: String(sales) }, ' ventas nuevas (límite ' + money(lim) + ')'];
      return spend >= lim && sales === 0
        ? build('down', { ...base, branch: 'raise-down', veredicto: 'BAJA UN ESCALÓN', senales: sen,
          detalle: ['Después de subir gastó ' + R.raiseCpa + ' CPA (', money(lim), ') sin ventas nuevas: baja un escalón.'] })
        : build('hold', { ...base, branch: 'raise-hold', veredicto: 'SE SOSTIENE', senales: sen,
          detalle: ['Todavía no gasta ' + R.raiseCpa + ' CPA (', money(lim), ') sin ventas nuevas: se sostiene.'] });
    }
    const lim = R.dawnCpa * z.escala;
    const sen = ['Gastó ', { b: money(spend) }, ' con ', { b: String(sales) }, ' ventas (límite ' + money(lim) + ')'];
    return spend >= lim && sales <= R.dawnSales
      ? build('down2', { ...base, branch: 'dawn-down2', veredicto: 'BAJA DOS ESCALONES', senales: sen,
        detalle: ['Amanecer rojo: gastó ' + R.dawnCpa + ' CPA (', money(lim), ') con ' + R.dawnSales + ' venta o ninguna: baja dos escalones.'] })
      : build('hold', { ...base, branch: 'dawn-hold', veredicto: 'SE SOSTIENE', senales: sen,
        detalle: ['Todavía no hay amanecer rojo (', R.dawnCpa + ' CPA gastados con ' + R.dawnSales + ' venta o ninguna): se sostiene.'] });
  }

  // Validación de los datos de scaleVerdict: null si todo bien, o el aviso.
  function scaleCheck({ days, level, tope }) {
    if (!Array.isArray(days) || !days.length) return 'Faltan los días de la ventana';
    for (let i = 0; i < days.length; i++) {
      const d = days[i], n = [d.spend, d.sales, d.pi];
      if (n.some((v) => !Number.isFinite(v) || v < 0)) return 'Los números no pueden ser negativos ni quedar vacíos';
      if (d.sales > d.pi) return 'El día ' + (i + 1) + ' tiene más ventas que pagos iniciados';
    }
    if (!Number.isInteger(level) || level < 0 || level > R.levels - 1) return 'El escalón va de N1 a N' + R.levels;
    if (!(tope > 0)) return 'El CPA tope debe ser mayor que 0';
    return null;
  }

  // Valores con los que arranca "Juega con los números": escalón N1, tope genérico y 3 días de ejemplo.
  const SCALE_FREE = () => ({
    level: 0, tope: GENERIC_CPA.tope,
    days: [{ spend: LADDER[0], sales: 10, pi: 14 }, { spend: LADDER[0], sales: 9, pi: 13 }, { spend: LADDER[0], sales: 8, pi: 12 }],
  });

  // "Juega con los números": todo lo que se muestra. Con un dato inválido no hay veredicto (verdict = null) y err dice por qué.
  function scaleFree(st) {
    const { days, level, tope } = st, err = scaleCheck(st), zones = tope > 0 ? cpaZones(tope) : null;
    const okDays = Array.isArray(days) && days.every((d) => Number.isFinite(d.spend) && Number.isFinite(d.sales) && d.spend >= 0 && d.sales >= 0);
    const win = okDays ? days.slice(-R.window) : [];
    const spendW = sum(win, 'spend'), salesW = sum(win, 'sales');
    return {
      err, verdict: err ? null : scaleVerdict(st), zones,
      cpas: okDays ? days.map((d) => cpaOf(d.spend, d.sales)) : [],
      cpaWin: okDays ? cpaOf(spendW, salesW) : null,
      zone: okDays && zones ? scaleZone(spendW, salesW, zones) : null,
      budget: Number.isInteger(level) && level >= 0 && level < R.levels ? LADDER[level] : null,
    };
  }

  // ---------- Mapa de ramas (paso 5 y 6) ----------
  // Cada id es uno que devuelven scaleVerdict o scaleGuard (las pruebas lo exigen). source: 'lab' = MCP · 'curso'.
  const Zc = cpaZones(GENERIC_CPA.tope);
  const pe = (v) => money(v);
  const SCALE_MAP = [
    { id: 'zone-up', source: 'lab', light: 'g', group: 'Zona de la ventana', cond: ['CPA de la ventana bajo ' + pe(Zc.escala) + ' (escala)'], t: ['Sube un escalón (+' + stepPct + ' %).'] },
    { id: 'zone-hold', source: 'lab', light: 'y', group: 'Zona de la ventana', cond: ['CPA de la ventana de ' + pe(Zc.escala) + ' hasta ' + pe(Zc.tope) + ' (tope)'], t: ['Se sostiene.'] },
    { id: 'zone-down', source: 'lab', light: 'r', group: 'Zona de la ventana', cond: ['CPA de la ventana sobre ' + pe(Zc.tope) + ' y hasta ' + pe(Zc.apaga)], t: ['Baja un escalón.'] },
    { id: 'zone-off', source: 'lab', light: 'r', group: 'Zona de la ventana', cond: ['CPA de la ventana sobre ' + pe(Zc.apaga) + ' (zona de apagar)'], t: ['Baja un escalón. Nada se apaga por un solo día: si mañana vuelve a quedar aquí, se apaga.'] },
    { id: 'flojo-hold', source: 'lab', light: 'y', group: 'Día malo', cond: ['Los días anteriores venían bien y ayer salió más caro, pero menos de ' + salto + ' %'], t: ['Fue un día flojo: se sostiene.'] },
    { id: 'flojo-down', source: 'lab', light: 'r', group: 'Día malo', cond: ['Los días anteriores venían bien y ayer salió ' + salto + ' % o más caro'], t: ['Se devuelve el ' + stepPct + ' %: baja un escalón.'] },
    { id: 'off-hard', source: 'lab', light: 'r', dura: true, group: 'Regla dura', cond: [R.offDays + ' días seguidos sobre ' + pe(Zc.apaga)], t: ['Se apaga.'] },
    { id: 'off-single', source: 'lab', light: 'r', dura: true, group: 'Regla dura', cond: ['En un solo día: 0 ventas, 0 pagos iniciados y ' + pe(R.offDouble * Zc.apaga) + ' gastados (el doble de apaga)'], t: ['Se apaga sin esperar al segundo día.'] },
    { id: 'raise-down', source: 'curso', light: 'r', group: 'Subida sin ventas', cond: ['Después de subir, gasta ' + pe(R.raiseCpa * Zc.escala) + ' (' + R.raiseCpa + ' CPA) sin ventas nuevas'], t: ['Baja un escalón.'] },
    { id: 'raise-hold', source: 'curso', light: 'y', group: 'Subida sin ventas', cond: ['Gasta menos de ' + pe(R.raiseCpa * Zc.escala) + ' o ya hay ventas nuevas'], t: ['Se sostiene.'] },
    { id: 'dawn-down2', source: 'curso', light: 'r', group: 'Amanecer rojo', cond: ['Gasta ' + pe(R.dawnCpa * Zc.escala) + ' (' + R.dawnCpa + ' CPA) con ' + R.dawnSales + ' venta o ninguna'], t: ['Baja dos escalones.'] },
    { id: 'dawn-hold', source: 'curso', light: 'y', group: 'Amanecer rojo', cond: ['Gasta menos de ' + pe(R.dawnCpa * Zc.escala) + ' o ya tiene más de ' + R.dawnSales + ' venta'], t: ['Se sostiene.'] },
  ];

  // Las dos protecciones del curso (paso 6). Los montos salen de `escala`.
  const SCALE_GUARDS = [
    { k: 'raise', t: 'Subida sin ventas', amount: R.raiseCpa * Zc.escala, mult: R.raiseCpa, kind: 'raise',
      p: ['Subo el presupuesto y, si el conjunto gasta ', { b: R.raiseCpa + ' CPA (' + money(R.raiseCpa * Zc.escala) + ')' }, ' sin ventas nuevas, ', { b: 'bajo un escalón' }, '.'] },
    { k: 'dawn', t: 'Amanecer rojo', amount: R.dawnCpa * Zc.escala, mult: R.dawnCpa, kind: 'dawn',
      p: ['Si el día amanece mal y el conjunto ya gastó ', { b: R.dawnCpa + ' CPA (' + money(R.dawnCpa * Zc.escala) + ')' }, ' con ' + R.dawnSales + ' venta o ninguna, ', { b: 'bajo dos escalones' }, '.'] },
  ];

  // Nombres de las 3 columnas de la ventana (del más viejo a ayer).
  const SCALE_DAYS = ['Hace 3 días', 'Anteayer', 'Ayer'];

  // ---------- Sub-pestañas y métodos ----------
  // Una parte con `disabled` se ve pero no se abre; su `soon` es la tarjeta "Pronto" que mostrará mientras tanto.
  const SCALING_PARTS = [
    { k: 'real', t: '📂 Lectura real · pronto', disabled: true, soon: {
      icon: '📂', h: 'Lectura real',
      d: 'Subo el reporte de mis campañas y la app me dice qué hacer con cada conjunto al escalar. Esta parte llega en otra entrega.',
      items: [
        ['Subo mi reporte de Meta (el archivo del Administrador de anuncios).'],
        ['Mira la ventana de ', { b: R.window + ' días' }, ' de cada conjunto y su CPA contra las zonas.'],
        ['Decisión por conjunto: ' + SCALE_ACTIONS.map((a) => a.t.toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' o $1') + ', con la frase del Lab.'],
        ['Avisa en qué escalón de la escalera está cada uno.'],
      ],
    } },
    { k: 'scale', t: '📈 Fase de escalado' },
    { k: 'sim', t: '⚠️ Simulador · revisar', disabled: true },
  ];
  const scalingPart = (k) => SCALING_PARTS.find((p) => p.k === k && !p.disabled) || SCALING_PARTS.find((p) => !p.disabled);

  // ---------- Paso a paso: Surfing Scaling ----------
  const SURF_HEAD = { h: 'Surfing Scaling', sub: 'Aprendo cuándo subir, cuándo sostener, cuándo bajar y cuándo apagar un conjunto que ya pasó el testeo, protegiendo el capital. Así lo decide el Lab de NovaSociety.' };

  const OK = (t) => [{ k: 'ok', t }];
  const Ldr = (i) => money(LADDER[i]);
  const cutsText = NS_TEST.cuts.map(copText).join(', ').replace(/, ([^,]*)$/, ' y $1');
  const costeoTope = TEST_STEPS.find((s) => s.k === 'corte3').tope.examples[1]; // el tope de un costeo, el mismo ejemplo de Testeo
  const day = (spend, sales, pi) => ({ spend, sales, pi });

  const SURF_STEPS = [
    { k: 'empieza', t: 'Cuándo empieza', where: 'Día 1 → día 2', tool: ['start'],
      p: ['El día 1 es ', { b: 'testeo' }, '. El escalado empieza cuando el día se gastó entero con ventas: ese día termina y ', { b: 'el día 2 sube el primer escalón' }, '.'],
      items: OK(['Entendí que el día 1 es testeo y que el escalado empieza el día 2.']),
      start: {
        timeline: [
          { k: 'd1', day: 'Día 1 · testeo', t: ['Cortes por gasto acumulado: ' + cutsText + '. Mandan las reglas de testeo.'] },
          { k: 'keep', day: 'Corte ' + copText(NS_TEST.cuts[2]), t: ['Con ' + TEST_RULES.ventasGastar + ' ventas o más y el CPA dentro del tope, ', { b: 'déjalo gastar el día entero' }, '.'] },
          { k: 'end', day: 'Fin del día', t: ['El día se gastó entero y cerró con ventas.'] },
          { k: 'd2', day: 'Día 2 · primer escalón', t: ['Sube de ', { b: Ldr(0) }, ' a ', { b: Ldr(1) }, ' (+' + stepPct + ' %).'] },
        ],
        sources: [
          { tag: 'Lab', t: ['Se escala cuando el día se gastó entero con ventas.'] },
          { tag: 'Regla del curso', t: ['Nunca el día 1: el escalado empieza el día 2.'] },
        ],
      },
      tip: ['Las reglas de testeo nunca se aplican a un conjunto que ya lleva rato vendiendo: desde el día 2 se decide como escalando.'] },
    { k: 'zonas', t: 'Zonas de CPA', where: 'Subir, sostener, bajar, apagar', tool: ['zones'],
      p: ['El tope es el ', { b: 'CPA máximo del costeo' }, ': lo que puedo pagar por venta sin perder. A partir de él salen 4 zonas: ', { b: 'sube' }, ', ', { b: 'sostiene' }, ', ', { b: 'baja' }, ' y ', { b: 'apaga' }, '.'],
      items: OK(['Sé en qué zona cae un CPA y qué toca en cada una.']),
      zones: { examples: [GENERIC_CPA.tope, costeoTope] } },
    { k: 'escalera', t: 'La escalera', where: R.levels + ' escalones', tool: ['ladder'],
      p: ['Cada escalón es ', { b: '+' + stepPct + ' %' }, ' sobre el anterior, empezando en ', { b: money(NS_TEST.budget) }, '. Se muestran los primeros ', { b: String(R.levels) }, ' (hasta ' + Ldr(R.levels - 1) + '), siempre ', { b: 'un escalón a la vez' }, '.'],
      items: OK(['Sé cuánto es un escalón y que subo o bajo de a uno.']) },
    { k: 'ventana', t: 'La ventana de 3 días', where: 'Se decide con 3 días', tool: ['window'],
      p: ['No decido por un solo día: miro los últimos ', { b: R.window + ' días' }, '. El CPA de la ventana es el ', { b: 'gasto total ÷ ventas totales' }, ' de esos días.'],
      items: OK(['Sé calcular el CPA de la ventana y ubicarlo en las zonas.']),
      window: { tope: GENERIC_CPA.tope, days: [day(LADDER[1], 10, 14), day(LADDER[1], 8, 12), day(LADDER[2], 9, 13)] },
      tip: ['Ayer solo prende la alerta; decide la ventana. Las ventas del día no pesan, pesa el CPA.'] },
    { k: 'reglas', t: 'Día malo y regla dura', where: 'Qué no apago por un mal día', tool: ['rules'],
      p: ['Un día malo después de días buenos no apaga: si ayer salió hasta ', { b: salto + ' %' }, ' más caro, se sostiene; si salió ', { b: salto + ' % o más' }, ', baja un escalón. Lo que sí apaga es la ', { b: 'regla dura' }, ': ', { b: R.offDays + ' días seguidos' }, ' sobre la zona de apagar.'],
      items: OK(['Sé distinguir un día flojo de la regla dura.']) },
    { k: 'proteccion', t: 'Protección durante el día', where: 'Reglas del curso', tool: ['guard'],
      p: ['Mientras corre el día hay dos protecciones que vienen del ', { b: 'curso' }, ' (no del Lab): ', { b: 'Subida sin ventas' }, ' y ', { b: 'Amanecer rojo' }, '. Las reglas por día de arriba siguen mandando.'],
      items: OK(['Sé cuándo bajar durante el día con las dos reglas del curso.']) },
    { k: 'practica', t: 'Practica', where: 'Simulacro', tool: ['map', 'sim'],
      p: ['Pongo a prueba lo aprendido con casos inventados: no es una campaña real.'],
      items: OK(['Hice una ronda de práctica.']) },
  ];

  // Métodos de escalado. Uno sin `steps` muestra su tarjeta "Pronto" (`soon`); al documentarlo se le ponen `steps` y aparece solo.
  const SCALE_METHODS = [
    { k: 'surf', icon: '🏄', t: 'Surfing Scaling', d: 'Escalado vertical: +' + stepPct + ' % por escalón, protegiendo el capital', steps: SURF_STEPS },
    { k: 'horiz', icon: '🔀', t: 'Escalado horizontal', d: 'Plan B: revivir o ampliar cuando el vertical se agota', soon: {
      icon: '🔀', h: 'Escalado horizontal',
      d: 'Cuando subir el presupuesto ya no funciona, se amplía por otro lado. Esta parte llega en otra entrega.',
      items: [['Plan B cuando el escalado vertical se agota.'], ['Revivir conjuntos o abrir nuevos para llegar a más gente.']],
    } },
    { k: 'refresh', icon: '🔄', t: 'Refresco de creativos', d: '4 a 5 anuncios nuevos por semana contra la fatiga', soon: {
      icon: '🔄', h: 'Refresco de creativos',
      d: 'Los anuncios se cansan: hay que renovarlos para sostener el CPA. Esta parte llega en otra entrega.',
      items: [['Cuántos anuncios nuevos entran por semana y cuándo.'], ['Cómo reconocer la fatiga antes de que suba el CPA.']],
    } },
  ];
  const scaleMethod = (k) => SCALE_METHODS.find((m) => m.k === k && m.steps) || SCALE_METHODS.find((m) => m.steps);

  // ---------- Práctica: una ronda por los casos ----------
  // Casos inventados con tope genérico. La respuesta la calcula scaleVerdict (kind 'day') o scaleGuard (kind 'guard'): no está escrita.
  const SCALE_PRACTICE = { tope: GENERIC_CPA.tope };
  const dayCase = (id, name, level, days) => ({ id, name, kind: 'day', level, days });
  const guardCase = (id, name, level, guard, spend, sales) => ({ id, name, kind: 'guard', level, guard, spend, sales });
  // Cada día gasta el presupuesto de su escalón; las ventas dan el CPA (pagos iniciados = ventas + 3).
  const spent = (level, sales) => sales.map((n) => day(LADDER[level], n, n + 3));
  const SCALE_CASES = [
    dayCase('s1', 'Conjunto 1', 1, spent(1, [11, 11, 12])),
    dayCase('s2', 'Conjunto 2', 3, spent(3, [12, 12, 12])),
    dayCase('s3', 'Conjunto 3', 5, spent(5, [15, 15, 15])),
    dayCase('s4', 'Conjunto 4', 4, spent(4, [10, 10, 11])),
    dayCase('s5', 'Conjunto 5', 6, spent(6, [20, 14, 14])),
    dayCase('s6', 'Conjunto 6', 2, [...spent(2, [12, 12]), day(R.offDouble * Zc.apaga, 0, 0)]),
    dayCase('s7', 'Conjunto 7', 3, spent(3, [12, 12, 9])),
    dayCase('s8', 'Conjunto 8', 3, spent(3, [14, 14, 9])),
    guardCase('s9', 'Conjunto 9', 4, 'raise', R.raiseCpa * Zc.escala, 0),
    guardCase('s10', 'Conjunto 10', 4, 'raise', R.raiseCpa * Zc.escala - 1, 0),
    guardCase('s11', 'Conjunto 11', 6, 'dawn', R.dawnCpa * Zc.escala, R.dawnSales),
    guardCase('s12', 'Conjunto 12', 6, 'dawn', R.dawnCpa * Zc.escala, R.dawnSales + 1),
  ];

  // Veredicto de un caso (la respuesta correcta sale de aquí).
  const caseVerdict = (c) => (c.kind === 'guard'
    ? scaleGuard({ kind: c.guard, spend: c.spend, sales: c.sales, level: c.level, tope: SCALE_PRACTICE.tope })
    : scaleVerdict({ days: c.days, level: c.level, tope: SCALE_PRACTICE.tope }));

  // run = { order: [id de caso], i: caso actual, shown: ya se ve el caso, hits, total, last: { chosen, correct, ok } | null }.
  // Son funciones puras: devuelven un run nuevo.
  function scalePracticeOrder(rnd = Math.random) {
    const a = SCALE_CASES.map((c) => c.id);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const scalePracticeNew = (order = scalePracticeOrder()) => ({ order, i: 0, shown: false, hits: 0, total: 0, last: null });
  const practiceOver = (run) => run.i >= run.order.length;
  const caseOf = (run) => SCALE_CASES.find((c) => c.id === run.order[run.i]);

  // "Ver el caso": muestra sus números.
  const scalePracticeShow = (run) => (run.shown || practiceOver(run) ? run : { ...run, shown: true });
  // Una decisión (up | hold | down | down2 | off): suma el acierto y guarda cuál era la correcta.
  function scalePracticeDecide(run, action) {
    if (!run.shown || run.last || practiceOver(run)) return run;
    const correct = caseVerdict(caseOf(run)).action, ok = action === correct;
    return { ...run, hits: run.hits + (ok ? 1 : 0), total: run.total + 1, last: { chosen: action, correct, ok } };
  }
  // Después de decidir: el siguiente caso.
  const scalePracticeNext = (run) => (run.last ? { ...run, i: run.i + 1, shown: false, last: null } : run);
  const scalePracticeBest = (best, run) => (run.total ? Math.max(best == null ? 0 : best, Math.round((run.hits / run.total) * 100)) : best);

  // Lo que pinta la UI. El veredicto va siempre, pero la UI solo lo muestra cuando ya hay decisión (last).
  function scalePracticeView(run) {
    const score = { hits: run.hits, total: run.total, pct: run.total ? Math.round((run.hits / run.total) * 100) : 0 };
    if (practiceOver(run)) return { over: true, score };
    const c = caseOf(run), verdict = caseVerdict(c), z = cpaZones(SCALE_PRACTICE.tope);
    return {
      over: false, score, n: run.i + 1, of: run.order.length, name: c.name, kind: c.kind, shown: run.shown,
      level: c.level, budget: LADDER[c.level], zones: z, tope: SCALE_PRACTICE.tope,
      days: c.kind === 'day' ? c.days.map((d) => ({ ...d, cpa: cpaOf(d.spend, d.sales) })) : null,
      guard: c.kind === 'guard' ? { kind: c.guard, spend: c.spend, sales: c.sales, cpa: cpaOf(c.spend, c.sales) } : null,
      verdict,
      last: run.last && { ok: run.last.ok, chosen: actionOf(run.last.chosen), correct: actionOf(run.last.correct) },
      lastCase: run.i === run.order.length - 1,
    };
  }

  core.scaling = {
    LADDER_BLOCKS, SCALE_ACTIONS, SCALE_CASES, SCALE_DAYS, SCALE_FREE, SCALE_GUARDS, SCALE_MAP, SCALE_METHODS, SCALE_PRACTICE, SCALE_RULES, SCALING_PARTS, SURF_HEAD, SURF_STEPS,
    scaleCheck, scaleFree, scaleGuard, scaleLadder, scaleMethod, scalePracticeBest, scalePracticeDecide, scalePracticeNew, scalePracticeNext,
    scalePracticeOrder, scalePracticeShow, scalePracticeView, scaleVerdict, scaleZone, scalingPart,
  };
})();
