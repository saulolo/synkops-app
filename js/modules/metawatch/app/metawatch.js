// Cortes de testeo en vivo en el margen derecho de la barra (SPEC 21).
// Estado en app.state.metawatch; lo guardado (pyl-meta) pasa por services.metawatch.
// El token solo vive en `saved.token` y en el encabezado de cada consulta: nunca se pinta ni se imprime.
(() => {
  const PYL = globalThis.PYL;
  const C = PYL.core.metawatch, U = PYL.ui.metawatch, S = PYL.services.metawatch, M = PYL.core.metrics;
  const root = document.getElementById('mw-root');
  if (!root) return;
  const btn = root.querySelector('.mw-btn');
  const panelNode = document.getElementById('mw-panel');

  const saved0 = C.mwLoad(S.load());
  const st = (PYL.app.state.metawatch = {
    saved: saved0, // { v, token, account, campaign, sound, seen, rung, last } o null
    accounts: [],
    campaigns: [],
    campLoaded: false, // ya llegó la lista de campañas de la cuenta (vacía = no hay activas)
    rows: saved0 && saved0.last ? saved0.last.rows : [],
    pulse: [], // ids de los conjuntos que laten
    status: null, // { k, text } del último error o null
    open: false,
    busy: false,
  });

  const fresh = (token) => ({ v: C.MW_VERSION, token, account: null, campaign: null, sound: true, seen: {}, rung: {}, last: null });
  const persist = () => { if (st.saved) S.save(st.saved); };
  const asError = (e) => (e && e.k ? e : { k: 'other', text: 'Algo falló al leer Meta' });
  const hhmm = (at) => { const d = new Date(at); return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const money = (v) => '$ ' + M.copText(Math.round(v));
  const CUTS = M.NS_TEST.cuts, TOP = CUTS[CUTS.length - 1];
  const EMPTY = 'La campaña no tiene conjuntos activos';
  const NO_CAMPAIGNS = 'No hay campañas activas';
  const noCampaigns = () => !!(st.saved && st.saved.account && st.campLoaded && !st.campaigns.length);

  // ---- Vistas ----
  const message = () => {
    const s = st.status, sv = st.saved;
    if (!sv) return 'Conectar Meta';
    if (s && s.k === 'net') return sv.last ? 'Sin conexión · último dato ' + hhmm(sv.last.at) : 'Sin conexión';
    if (s) return s.text;
    if (!sv.campaign) return noCampaigns() ? NO_CAMPAIGNS : 'Elige una campaña';
    if (!sv.last) return st.busy ? 'Leyendo Meta…' : '';
    if (!st.rows.length) return EMPTY;
    return '';
  };

  // Producto activo de la píldora (trainer.js carga después: se lee al pintar). Genérico = sin producto.
  const product = () => {
    const t = PYL.app.trainer;
    const p = t && typeof t.product === 'function' ? t.product() : null;
    return p && !p.generic && p.name ? p : null;
  };
  const tope = () => {
    const p = product();
    return p && p.tope > 0 ? p.tope : M.GENERIC_CPA.tope;
  };
  const pulsing = (r) => r.active && st.pulse.includes(r.id);

  const railView = () => {
    const sv = st.saved, msg = message();
    const tokenBad = st.status && st.status.k === 'token';
    const rows = !sv || tokenBad ? [] : st.rows.map((r) => ({
      id: r.id, short: r.short, name: r.name, active: r.active, k: C.mwK(r.spend),
      fill: Math.min(r.spend / TOP, 1), alert: pulsing(r) ? C.mwCut(r.spend) : null,
    }));
    const said = rows.map((r) => r.alert != null ? r.short + ' llegó a ' + M.copText(CUTS[r.alert]) + ', revisar' : r.short + ' ' + (r.active ? r.k : 'apagado'));
    const list = [...said.filter((t) => /revisar$/.test(t)), ...said.filter((t) => !/revisar$/.test(t))].join(', ');
    const label = 'Cortes de testeo: ' + (msg ? msg.charAt(0).toLowerCase() + msg.slice(1) : '') + (msg && list ? '. ' : '') + list;
    const p = product();
    return {
      head: 'CORTES',
      sub: p ? p.name.trim().split(/\s+/)[0] : sv && sv.campaign ? sv.campaign.name : '',
      time: sv && sv.last && !tokenBad ? '↻ ' + hhmm(sv.last.at) : '',
      msg, rows, marks: CUTS.map((c) => c / TOP), label,
    };
  };

  const panelView = () => {
    const sv = st.saved;
    return {
      connected: !!sv,
      needToken: !sv || (st.status && st.status.k === 'token'),
      busy: st.busy,
      status: !st.status ? '' : st.status.k === 'net' ? message() : st.status.text,
      accounts: st.accounts.map((a) => ({ id: a.id, label: a.name + ' · ' + a.currency })),
      account: sv && sv.account ? sv.account.id : '',
      campaigns: st.campaigns.map((c) => ({ id: c.id, label: c.name })),
      campaign: sv && sv.campaign ? sv.campaign.id : '',
      noCampaigns: noCampaigns() && !(sv && sv.campaign) ? NO_CAMPAIGNS : '',
      sound: !!(sv && sv.sound),
      empty: sv && sv.campaign && sv.last && !st.rows.length ? EMPTY : '',
      note: sv && sv.account && sv.account.currency !== 'COP' ? 'Cortes en COP: esta cuenta usa ' + sv.account.currency : '',
      rows: sv ? st.rows.map(rowView) : [],
    };
  };

  const rowView = (r) => {
    const sv = st.saved, cut = C.mwCut(r.spend);
    const v = C.mwVerdict(r, tope(), sv.account ? sv.account.currency : '');
    return {
      id: r.id, short: r.short, name: r.name, active: r.active, pulse: pulsing(r),
      cells: [
        ['Gasto', money(r.spend)],
        ['PI', String(r.pi)],
        ['Ventas', String(r.sales)],
        ['CPPI', r.pi > 0 ? money(r.spend / r.pi) : '—'],
        ['Corte', cut < 0 ? 'Antes del corte 1' : 'Corte ' + (cut + 1) + ' · ' + M.copText(CUTS[cut])],
      ],
      verdict: v ? { text: v.veredicto, light: v.light } : null,
    };
  };

  const on = {
    close: () => close(),
    connect: (token) => connect(token),
    account: (id) => setAccount(id),
    campaign: (id) => setCampaign(id),
    refresh: () => refresh(),
    seen: (id) => markSeen(id),
    sound: () => toggleSound(),
    off: () => disconnect(),
  };

  // 🔔/🔕: se guarda en pyl-meta.
  function toggleSound() {
    if (!st.saved) return;
    st.saved.sound = !st.saved.sound;
    persist();
    paint();
  }

  // «Desconectar»: pregunta y borra pyl-meta entero (token, cuenta, campaña, alertas y último dato).
  async function disconnect() {
    const r = await PYL.ui.feedback.ask('Desconectar Meta', 'Borro el token, la cuenta, la campaña y las alertas guardadas. Para volver tendrás que pegar el token otra vez.', [{ r: 'off', label: 'Desconectar' }]);
    if (r !== 'off') return;
    S.clear();
    seq++; listSeq++; // descarta consultas en vuelo
    st.saved = null;
    st.accounts = [];
    st.campaigns = [];
    st.campLoaded = false;
    st.rows = [];
    st.pulse = [];
    st.status = null;
    st.busy = false;
    schedule();
    paint();
  }

  // «Revisado»: guarda el corte en que va el conjunto; deja de latir hasta el siguiente.
  function markSeen(id) {
    const sv = st.saved, r = st.rows.find((x) => x.id === id);
    if (!sv || !r) return;
    sv.seen = { ...sv.seen, [id]: C.mwCut(r.spend) };
    st.pulse = st.pulse.filter((x) => x !== id);
    persist();
    paint();
    const back = panelNode.querySelector('.mw-seen') || panelNode.querySelector('#mw-refresh');
    if (back && st.open) back.focus();
  }

  // Sonido del corte: si el archivo falta o el navegador lo bloquea, no suena y no pasa nada.
  // Si el archivo no carga (falta sounds/corte.mp3), el <audio> dispara error y no se vuelve a intentar.
  const audio = document.getElementById('mw-audio');
  let audioBad = false;
  if (audio) audio.addEventListener('error', () => { audioBad = true; });
  const ring = () => {
    if (!audio || audioBad || audio.error || !st.saved || !st.saved.sound) return;
    try {
      audio.currentTime = 0;
      const p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) { /* sin audio */ }
  };

  const paint = () => {
    U.rail(btn, railView());
    U.panel(panelNode, panelView(), on); // también cerrado: aria-labelledby apunta a su título
  };

  // ---- Abrir y cerrar el panel ----
  const open = () => {
    st.open = true;
    panelNode.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    const first = panelNode.querySelector('#mw-token') || panelNode.querySelector('select, button:not(#mw-x)') || panelNode.querySelector('#mw-x');
    if (first) first.focus();
  };
  function close() {
    if (!st.open) return;
    st.open = false;
    panelNode.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    btn.focus();
  }

  btn.addEventListener('click', () => (st.open ? close() : open()));
  document.addEventListener('keydown', (e) => { if (st.open && e.key === 'Escape') close(); });
  document.addEventListener('pointerdown', (e) => { if (st.open && !root.contains(e.target)) close(); });

  // ---- Conexión, cuenta y campaña ----
  const resetCampaign = () => {
    st.saved.seen = {};
    st.saved.rung = {};
    st.saved.last = null;
    st.rows = [];
    st.pulse = [];
  };

  let listSeq = 0;
  const loadCampaigns = async () => {
    const sv = st.saved, my = ++listSeq;
    st.campaigns = [];
    st.campLoaded = false;
    if (!sv || !sv.account) return;
    try {
      const list = await S.campaigns(sv.token, sv.account.id);
      if (my === listSeq) { st.campaigns = list; st.campLoaded = true; }
    } catch (e) {
      if (my === listSeq) st.status = asError(e);
    }
  };

  async function connect(token) {
    if (!token) { st.status = { k: 'other', text: 'Pega el token' }; paint(); return; }
    st.busy = true;
    paint();
    try {
      const accounts = await S.accounts(token);
      if (st.saved) st.saved.token = token; else st.saved = fresh(token);
      st.accounts = accounts;
      st.status = null;
      const sv = st.saved;
      if (sv.account && !accounts.some((a) => a.id === sv.account.id)) { sv.account = null; sv.campaign = null; resetCampaign(); }
      if (!sv.account && accounts.length === 1) {
        const a = accounts[0];
        sv.account = { id: a.id, name: a.name, currency: a.currency };
      }
      persist();
      await loadCampaigns();
    } catch (e) {
      st.status = asError(e);
    }
    st.busy = false;
    paint();
    if (st.saved && st.saved.campaign && !st.status) await refresh();
  }

  async function setAccount(id) {
    const sv = st.saved;
    if (!sv) return;
    const a = st.accounts.find((x) => x.id === id);
    sv.account = a ? { id: a.id, name: a.name, currency: a.currency } : null;
    sv.campaign = null;
    resetCampaign();
    st.status = null;
    persist();
    schedule();
    paint();
    await loadCampaigns();
    paint();
  }

  async function setCampaign(id) {
    const sv = st.saved;
    if (!sv) return;
    const c = st.campaigns.find((x) => x.id === id);
    sv.campaign = c ? { id: c.id, name: c.name } : null;
    resetCampaign();
    st.status = null;
    persist();
    paint();
    if (sv.campaign) await refresh(true); else schedule();
  }

  // ---- Consulta de la campaña ----
  // quiet = true al elegir campaña: lo ya pasado late sin sonar.
  // Ciclo de MW_EVERY (15 min): se reprograma tras cada consulta. Sigue con la pestaña en segundo
  // plano y con la pantalla angosta, para que el sonido avise aunque no se mire la app.
  let timer = 0;
  const schedule = () => {
    clearTimeout(timer);
    timer = st.saved && st.saved.campaign ? setTimeout(() => tick(), C.MW_EVERY) : 0;
  };

  let seq = 0;
  async function refresh(quiet = false) {
    const sv = st.saved;
    if (!sv || !sv.campaign) { schedule(); return; }
    const my = ++seq, id = sv.campaign.id;
    let rang = false;
    st.busy = true;
    paint();
    try {
      const [sets, ins] = await Promise.all([S.adsets(sv.token, id), S.insights(sv.token, id)]);
      if (my !== seq) return;
      const rows = C.mwRows(ins, sets);
      const a = C.mwAlerts(rows, sv.seen, sv.rung, quiet);
      sv.rung = a.rung;
      st.pulse = a.pulse;
      st.rows = rows;
      sv.last = { at: Date.now(), rows };
      st.status = null;
      rang = a.ring.length > 0;
      persist();
    } catch (e) {
      if (my !== seq) return;
      st.status = asError(e);
    }
    st.busy = false;
    paint();
    if (rang) ring();
    schedule();
  }
  const tick = () => refresh();

  // ---- Arranque ----
  // Con datos guardados, lo que ya pasó y no se revisó sigue latiendo (sin sonar: rung ya lo tiene).
  if (st.saved && st.rows.length) st.pulse = C.mwAlerts(st.rows, st.saved.seen, st.saved.rung, true).pulse;
  paint();
  PYL.app.metawatch = { refresh, tick };

  if (st.saved) {
    (async () => {
      const sv = st.saved;
      try {
        st.accounts = await S.accounts(sv.token);
      } catch (e) {
        st.status = asError(e);
        paint();
        return;
      }
      await loadCampaigns();
      paint();
      await refresh();
    })();
  }
})();
