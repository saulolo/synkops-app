// Cortes de testeo en vivo en la barra (SPEC 21). Solo reglas puras: sin DOM ni red.
// Nombres con prefijo mw/MW_ para no chocar al aplanar en js/index.js.
// Usa metrics (NS_TEST.cuts) y testing (testVerdict), que cargan antes; se leen al llamar.
(() => {
  const core = globalThis.PYL.core;

  const MW_VERSION = 1;
  // Versión vigente de la Graph API (paso 1 de la SPEC 21: sin versión, Meta responde el error 2635).
  const MW_API = 'v27.0';
  const MW_EVERY = 15 * 60 * 1000;
  // En orden de prioridad. En la cuenta real los tres tipos de cada lista traen el mismo total:
  // se toma solo el primero presente para no contar doble.
  const MW_PI_TYPES = ['offsite_conversion.fb_pixel_initiate_checkout', 'initiate_checkout', 'omni_initiated_checkout'];
  const MW_SALE_TYPES = ['offsite_conversion.fb_pixel_purchase', 'purchase', 'omni_purchase'];

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const mwAction = (actions, types) => {
    if (!Array.isArray(actions)) return 0;
    for (const t of types) {
      const a = actions.find((x) => x && x.action_type === t);
      if (a) return num(a.value);
    }
    return 0;
  };

  const mwRow = (insight, adset) => {
    const ins = insight || {};
    return {
      id: String(adset.id),
      name: String(adset.name || ''),
      short: '',
      active: adset.effective_status === 'ACTIVE',
      spend: num(ins.spend),
      impressions: num(ins.impressions),
      pi: mwAction(ins.actions, MW_PI_TYPES),
      sales: mwAction(ins.actions, MW_SALE_TYPES),
      created: String(adset.created_time || ''),
    };
  };

  const when = (s) => {
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : Infinity;
  };

  // Una fila por conjunto de la campaña; los insights sin conjunto se ignoran.
  const mwRows = (insights, adsets) => {
    const byId = new Map((insights || []).map((i) => [String(i.adset_id), i]));
    return (adsets || [])
      .map((s) => mwRow(byId.get(String(s.id)), s))
      .sort((a, b) => when(a.created) - when(b.created) || (a.created < b.created ? -1 : a.created > b.created ? 1 : 0) || (a.id < b.id ? -1 : 1))
      .map((r, i) => ({ ...r, short: 'C' + (i + 1) }));
  };

  // Índice del último corte alcanzado en NS_TEST.cuts; -1 si ninguno.
  const mwCut = (spend) => core.metrics.NS_TEST.cuts.filter((c) => spend >= c).length - 1;

  // seen/rung: { id: índice de corte }. quiet = al elegir campaña: late lo ya pasado sin sonar.
  // Los conjuntos apagados no laten ni suenan.
  const mwAlerts = (rows, seen, rung, quiet = false) => {
    const pulse = [], ring = [], next = { ...(rung || {}) };
    for (const r of rows || []) {
      if (!r.active) continue;
      const c = mwCut(r.spend);
      if (c < 0) continue;
      if (c > ((seen || {})[r.id] ?? -1)) pulse.push(r.id);
      if (c > (next[r.id] ?? -1)) {
        if (!quiet) ring.push(r.id);
        next[r.id] = c;
      }
    }
    return { pulse, ring, rung: next };
  };

  const mwVerdict = (row, tope, currency) => {
    if (currency !== 'COP' || mwCut(row.spend) < 0) return null;
    return core.testing.testVerdict({ spend: row.spend, pi: row.pi, sales: row.sales, tope });
  };

  const MW_LIMIT_CODES = [4, 17, 613];
  const mwError = (json, status) => {
    const e = json && json.error;
    if (!json && !status) return { k: 'net', text: 'Sin conexión' };
    if (e && e.code === 190) return { k: 'token', text: 'Token inválido: vuelve a conectar' };
    if (e && MW_LIMIT_CODES.includes(e.code)) return { k: 'limit', text: 'Meta pidió esperar' };
    const msg = e && e.message ? String(e.message).slice(0, 120) : 'error ' + (status || 'desconocido');
    return { k: 'other', text: 'Meta: ' + msg };
  };

  const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
  const isStr = (v) => typeof v === 'string';
  const okCuts = (m) => isObj(m) && Object.values(m).every((n) => Number.isInteger(n) && n >= -1 && n <= 2);
  const okRow = (r) => isObj(r) && isStr(r.id) && ['spend', 'pi', 'sales'].every((k) => Number.isFinite(r[k]));

  // Estado guardado en pyl-meta → estado válido o null (roto, otra versión o sin token).
  const mwLoad = (raw) => {
    let d;
    try { d = JSON.parse(raw); } catch (e) { return null; }
    if (!isObj(d) || d.v !== MW_VERSION || !isStr(d.token) || !d.token) return null;
    const s = { v: MW_VERSION, token: d.token, account: null, campaign: null, sound: true, seen: {}, rung: {}, last: null };
    if (d.account != null) {
      if (!isObj(d.account) || !['id', 'name', 'currency'].every((k) => isStr(d.account[k]))) return null;
      s.account = d.account;
    }
    if (d.campaign != null) {
      if (!isObj(d.campaign) || !['id', 'name'].every((k) => isStr(d.campaign[k]))) return null;
      s.campaign = d.campaign;
    }
    if (d.sound !== undefined) {
      if (typeof d.sound !== 'boolean') return null;
      s.sound = d.sound;
    }
    for (const k of ['seen', 'rung']) {
      if (d[k] === undefined) continue;
      if (!okCuts(d[k])) return null;
      s[k] = d[k];
    }
    if (d.last != null) {
      if (!isObj(d.last) || !Number.isFinite(d.last.at) || !Array.isArray(d.last.rows) || !d.last.rows.every(okRow)) return null;
      s.last = d.last;
    }
    return s;
  };

  // Totales de la campaña para las tarjetas del teléfono de Inicio: CPM de Meta con su semáforo (límite de
  // HARD_METRICS) y CPA contra el tope (zonas de cpaZones). Suma todos los conjuntos, también los apagados.
  // Luz 'g'/'y'/'r' o null si falta dato (sin impresiones no hay CPM; sin ventas no hay CPA).
  const mwTotals = (rows, tope) => {
    let spend = 0, impressions = 0, sales = 0;
    for (const r of rows || []) {
      spend += num(r.spend);
      impressions += num(r.impressions);
      sales += num(r.sales);
    }
    const lim = core.metrics.HARD_METRICS.find((r) => r.k === 'cpm').view.meta.lim;
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : null;
    const cpmLight = cpm === null ? null : (lim.op === '<=' ? cpm <= lim.max : cpm < lim.max) ? 'g' : 'r';
    const cpa = sales > 0 ? spend / sales : null;
    const z = tope > 0 ? core.testing.cpaZones(tope) : null;
    const cpaLight = cpa === null || !z ? null : cpa <= z.tope ? 'g' : cpa <= z.apaga ? 'y' : 'r';
    // Estimado si se entregan todos los pedidos: cada entrega deja el tope (precio − proveedor − flete) antes de publicidad.
    const income = z ? sales * z.tope : null;
    return {
      spend, impressions, sales, cpm, cpmLight, cpa, cpaLight, tope: z ? z.tope : null,
      income, result: income === null ? null : income - spend,
      cpaFill: cpa !== null && z ? Math.min(cpa / z.apaga, 1) : 0,
      topeAt: z ? z.tope / z.apaga : null,
    };
  };

  // Foto del producto activo para el teléfono de Inicio: la del candidato (o bitácora) cuyo nombre coincide con el
  // del producto, sin importar mayúsculas, tildes ni espacios. Solo imágenes embebidas (data:image/); si no hay: ''.
  const flat = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/\s+/).filter(Boolean).join(' ');
  const mwPhoto = (name, items) => {
    const n = flat(name);
    if (!n) return '';
    const hit = (items || []).find((p) => p && typeof p.photo === 'string' && p.photo.startsWith('data:image/') && flat(p.name) === n);
    return hit ? hit.photo : '';
  };

  // 31250 → '31K'. Hacia abajo: 19.999 no se ve como 20K antes del corte.
  const mwK = (n) => Math.floor(num(n) / 1000) + 'K';

  core.metawatch = { MW_VERSION, MW_API, MW_EVERY, MW_PI_TYPES, MW_SALE_TYPES, mwAction, mwRow, mwRows, mwCut, mwAlerts, mwVerdict, mwError, mwLoad, mwK, mwTotals, mwPhoto };
})();
