// Centro de mando (Inicio): accesos directos a las herramientas que uso. Valida y ordena la lista; sin DOM.
// Nombres con prefijo hub/HUB_ para no chocar al aplanar en js/index.js.
(() => {
  const core = globalThis.PYL.core;

  const HUB_VERSION = 1;

  const HUB_DEFAULTS = [
    { id: 'tiktok', name: 'TikTok Ads', ini: 'TT', suggest: 'https://ads.tiktok.com/' },
    { id: 'meta', name: 'Meta Ads', ini: 'M', suggest: 'https://adsmanager.facebook.com/' },
    { id: 'adlib', name: 'Ad Library', ini: 'AL', suggest: 'https://www.facebook.com/ads/library/' },
    { id: 'dropi', name: 'Dropi', ini: 'D', suggest: 'https://app.dropi.co/' },
    { id: 'dropkiller', name: 'Dropkiller', ini: 'DK', suggest: 'https://dropkiller.com/' },
    { id: 'kalodata', name: 'Kalodata', ini: 'K', suggest: 'https://www.kalodata.com/' },
    { id: 'skool', name: 'Skool', ini: 'S', suggest: 'https://www.skool.com/' },
    { id: 'chatgpt', name: 'ChatGPT', ini: 'GPT', suggest: 'https://chatgpt.com/' },
    { id: 'claude', name: 'Claude', ini: 'C', suggest: 'https://claude.ai/' },
  ];

  const clean = (v) => String(v == null ? '' : v).trim();

  // 1 a 3 letras en mayúscula: varias palabras = primera letra de cada una (máx. 3); una palabra = su primera letra.
  const hubInitials = (name) => {
    const words = clean(name).split(/\s+/).filter(Boolean);
    return words.slice(0, 3).map((w) => Array.from(w)[0].toUpperCase()).join('');
  };

  // Texto de URL → { ok, url, err }. Vacío es válido (queda "poner enlace"); solo http:// o https://, sin espacios dentro.
  const hubUrl = (text) => {
    const url = clean(text);
    if (!url) return { ok: true, url: '', err: null };
    if (/\s/.test(url) || !/^https?:\/\/\S+$/i.test(url)) return { ok: false, url, err: 'La dirección debe empezar con http:// o https://' };
    return { ok: true, url, err: null };
  };

  // Dominio sin "www." (ads.tiktok.com), o '' si no hay URL válida.
  const hubDomain = (url) => {
    if (!hubUrl(url).url || !hubUrl(url).ok) return '';
    try { return new URL(clean(url)).hostname.replace(/^www\./i, ''); } catch (e) { return ''; }
  };

  const hubFavicon = (url) => {
    const d = hubDomain(url);
    return d ? 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(d) + '&sz=64' : null;
  };

  const hubDefaults = () => HUB_DEFAULTS.map((d) => ({ id: d.id, name: d.name, ini: d.ini, url: '', icon: null }));

  // Lo guardado (texto JSON u objeto ya leído) → lista validada. Sin clave, JSON roto o versión distinta: los de fábrica.
  const hubLoad = (raw) => {
    let data = raw;
    if (typeof raw === 'string') { try { data = JSON.parse(raw); } catch (e) { return hubDefaults(); } }
    if (!data || typeof data !== 'object' || data.v !== HUB_VERSION || !Array.isArray(data.items)) return hubDefaults();
    const seen = new Set();
    const items = [];
    for (const it of data.items) {
      if (!it || typeof it !== 'object') continue;
      const id = clean(it.id), name = clean(it.name);
      if (!id || !name || seen.has(id)) continue;
      seen.add(id);
      const u = hubUrl(it.url);
      items.push({
        id, name,
        ini: clean(it.ini) || hubInitials(name),
        url: u.ok ? u.url : '',
        icon: typeof it.icon === 'string' && it.icon.startsWith('data:image/') ? it.icon : null,
      });
    }
    return items;
  };

  // Valida toda la lista: { ok, errors: { [id]: { name?, url? } } }.
  const hubCheck = (items) => {
    const errors = {};
    for (const it of items || []) {
      const e = {};
      if (!clean(it.name)) e.name = 'Falta el nombre.';
      const u = hubUrl(it.url);
      if (!u.ok) e.url = u.err;
      if (e.name || e.url) errors[it.id] = e;
    }
    return { ok: Object.keys(errors).length === 0, errors };
  };

  // Lista lista para guardar: recorta nombre y URL y rellena iniciales vacías. Se llama después de hubCheck. No toca la lista recibida.
  const hubClean = (items) => (items || []).map((x) => {
    const name = clean(x.name);
    return { ...x, name, ini: clean(x.ini) || hubInitials(name), url: hubUrl(x.url).url };
  });

  // Acceso nuevo al final (sin ícono propio). Nombre y URL obligatorios. No toca la lista recibida.
  const hubAdd = (items, entry, now) => {
    const name = clean(entry && entry.name);
    const u = hubUrl(entry && entry.url);
    const errors = {};
    if (!name) errors.name = 'Falta el nombre.';
    if (!u.ok) errors.url = u.err;
    else if (!u.url) errors.url = 'Falta la dirección.';
    if (errors.name || errors.url) return { ok: false, items: items || [], errors };
    // 'u' + hora en base 36; si ya existe (dos altas en el mismo instante) sube un número hasta que sea único.
    let stamp = now == null ? Date.now() : now;
    while ((items || []).some((x) => x.id === 'u' + stamp.toString(36))) stamp++;
    const id = 'u' + stamp.toString(36);
    const item = { id, name, ini: hubInitials(name), url: u.url, icon: null };
    return { ok: true, items: [...(items || []), item], errors: {} };
  };

  // Lista en el orden de `ids`. Ids desconocidos se ignoran y los que falten quedan al final, en su orden. No toca la recibida.
  const hubOrder = (items, ids) => {
    const list = items || [];
    const out = [];
    (ids || []).forEach((id) => { const it = list.find((x) => x.id === id); if (it && !out.includes(it)) out.push(it); });
    return [...out, ...list.filter((x) => !out.includes(x))];
  };

  const hubRemove = (items, id) => (items || []).filter((x) => x.id !== id);

  // Cambia campos de un acceso. Si cambia el nombre, recalcula las iniciales (si el nombre queda vacío conserva las anteriores).
  const hubSet = (items, id, patch) => (items || []).map((x) => {
    if (x.id !== id) return x;
    const next = { ...x, ...patch };
    if (patch && 'name' in patch && hubInitials(patch.name)) next.ini = hubInitials(patch.name);
    return next;
  });

  core.hub = { HUB_VERSION, HUB_DEFAULTS, hubDefaults, hubLoad, hubInitials, hubUrl, hubDomain, hubFavicon, hubCheck, hubClean, hubAdd, hubOrder, hubRemove, hubSet };
})();
