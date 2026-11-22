// Franja de indicadores de Inicio (SPEC 22). Solo reglas puras: sin DOM ni localStorage.
// Nombres con prefijo ix/IX_ para no chocar al aplanar en js/index.js.
// Usa pnl (diagnostics.MARGIN), metrics (NS_TEST.cuts), metawatch (mwCut) y tasks (tkProgress, tkDayKey...),
// que cargan antes; se leen al llamar.
(() => {
  const core = globalThis.PYL.core;

  const IX_VERSION = 1;
  const IX_DAYS = 5; // ventana de Pulso de tareas: hoy y los 4 días anteriores
  const IX_FUNNEL = ['evaluando', 'testeo', 'activo', 'ganador']; // orden del embudo (descartado va aparte)
  const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
  const isNumOrNull = (v) => v === null || isNum(v);
  const isDay = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

  // «20 nov» desde 'YYYY-MM-DD' o desde un Date.
  const shortDay = (v) => {
    const d = typeof v === 'string' ? core.tasks.tkDayDate(v) : v;
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  };

  // Valida el texto crudo de pyl-pnl-snap → foto o null (roto, otra versión o campos raros).
  const ixLoad = (raw) => {
    let d;
    try { d = JSON.parse(raw); } catch { return null; }
    if (!d || typeof d !== 'object' || Array.isArray(d) || d.v !== IX_VERSION) return null;
    if (!isNum(d.at) || typeof d.prod !== 'string' || !d.prod) return null;
    if (!(d.from === null || isDay(d.from)) || !(d.to === null || isDay(d.to))) return null;
    if (!isNum(d.util) || !isNum(d.fact)) return null;
    if (!isNumOrNull(d.margen) || !isNumOrNull(d.roas) || !isNumOrNull(d.efect)) return null;
    if (d.roasEq !== undefined && !isNumOrNull(d.roasEq)) return null; // opcional: las fotos sin él siguen siendo válidas
    return { v: IX_VERSION, at: d.at, prod: d.prod, from: d.from, to: d.to, util: d.util, fact: d.fact, margen: d.margen, roas: d.roas, roasEq: d.roasEq === undefined ? null : d.roasEq, efect: d.efect };
  };

  // Mini P&L. El medidor va de 0 a MARGIN.ideal; la marca de «sano» queda en healthy / ideal.
  const ixPnl = (snap) => {
    if (!snap) return null;
    const M = core.diagnostics.MARGIN;
    const m = snap.margen;
    const level = m == null ? null : m >= M.healthy ? 'g' : m >= M.even ? 'y' : 'r';
    // Semáforo de ROAS y efectividad con las mismas reglas de las tarjetas KPI del tablero (diagnostics.kpis).
    const k = core.diagnostics.kpis({ ads: snap.roas == null ? 0 : 1, roas: snap.roas, roasEq: snap.roasEq, util: snap.util, margen: snap.margen, efect: snap.efect });
    const tone = { ok: 'g', warn: 'y', bad: 'r' };
    const roasLevel = snap.roas == null || snap.roasEq == null ? null : tone[k.roas.level];
    const efectLevel = snap.efect == null ? null : tone[k.efect.level];
    const range = snap.from && snap.to ? `${shortDay(snap.from)} – ${shortDay(snap.to)}` : 'Todo el periodo';
    return {
      util: snap.util,
      tone: snap.util >= 0 ? 'g' : 'r',
      margen: m,
      level,
      marginFill: m == null ? 0 : Math.max(0, Math.min(1, m / M.ideal)),
      marginMark: M.healthy / M.ideal,
      roas: snap.roas,
      roasLevel,
      efect: snap.efect,
      efectLevel,
      label: `${snap.prod} · ${range} · dato del ${shortDay(new Date(snap.at))}`,
      at: snap.at,
    };
  };

  // Embudo de la bitácora de Buscar producto: Evaluando → En testeo → Activo → Ganador y descartados aparte.
  const ixFunnel = (log, statuses) => {
    if (!Array.isArray(log) || log.length === 0) return null;
    const count = (k) => log.filter((p) => p && p.status === k).length;
    const rows = IX_FUNNEL.map((k) => {
      const s = statuses.find((x) => x.k === k);
      return { k, t: s ? s.t : k, icon: s ? s.icon : '', n: count(k), pct: 0 };
    });
    const max = Math.max(...rows.map((r) => r.n));
    rows.forEach((r) => { r.pct = max ? Math.round((r.n / max) * 100) : 0; });
    return { rows, dropped: count('descartado'), total: log.length };
  };

  // Testeo: mejor puntaje de práctica + corte más alto de un conjunto ACTIVO de Meta.
  // cut = índice de NS_TEST.cuts (−1 = ninguno); set = «C2» del conjunto que lo alcanzó.
  const ixTesting = (best, rows) => {
    const act = (Array.isArray(rows) ? rows : []).filter((r) => r && r.active);
    let cut = -1;
    let set = '';
    for (const r of act) {
      const c = core.metawatch.mwCut(r.spend);
      if (c > cut) { cut = c; set = r.short; }
    }
    return { best: isNum(best) ? best : null, cut, set, active: act.length };
  };

  // Pulso de tareas: conteo de hoy (tareas y subtareas), 5 días y racha.
  const ixTasks = (note, today) => {
    const T = core.tasks;
    const days = [];
    for (let i = IX_DAYS - 1; i >= 0; i--) {
      const key = T.tkAddDays(today, -i);
      const p = T.tkProgress(T.tkTasksOf(note, key));
      days.push({ key, done: p.done, total: p.total, fill: p.total ? p.done / p.total : 0 });
    }
    const met = (d) => d.total > 0 && d.done === d.total;
    let i = days.length - 1;
    if (!met(days[i])) i -= 1; // hoy a medias: se cuenta desde ayer
    let streak = 0;
    for (; i >= 0 && met(days[i]); i--) streak += 1;
    const t = days[days.length - 1];
    return { done: t.done, total: t.total, days, streak };
  };

  core.indicators = { IX_VERSION, ixLoad, ixPnl, ixFunnel, ixTesting, ixTasks };
})();
