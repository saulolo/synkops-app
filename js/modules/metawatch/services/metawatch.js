// Lectura de la Marketing API de Meta (SPEC 21): primera conexión directa de Synkops.
// Solo GET de lectura. El token va en el encabezado Authorization, nunca en la URL:
// Chrome imprime en consola la URL de cada petición fallida y el token quedaría a la vista.
// Cada función devuelve una promesa con el `data` de la respuesta o rechaza con core.metawatch.mwError.
(() => {
  const services = globalThis.PYL.services;
  const C = globalThis.PYL.core.metawatch;
  const store = services.storage.meta;
  const BASE = 'https://graph.facebook.com/' + C.MW_API + '/';

  const get = async (token, path, params) => {
    const url = BASE + path + '?' + new URLSearchParams({ limit: '100', ...params });
    let r;
    try {
      r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    } catch (e) {
      throw C.mwError(null, 0);
    }
    let j = null;
    try { j = await r.json(); } catch (e) { j = null; }
    if (!r.ok || !j || j.error || !Array.isArray(j.data)) throw C.mwError(j || {}, r.status);
    return j.data;
  };

  const accounts = (token) => get(token, 'me/adaccounts', { fields: 'id,name,currency,account_status' });
  const campaigns = (token, account) => get(token, account + '/campaigns', { fields: 'id,name,effective_status', effective_status: '["ACTIVE"]' });
  const adsets = (token, campaign) => get(token, campaign + '/adsets', { fields: 'id,name,effective_status,created_time' });
  const insights = (token, campaign) => get(token, campaign + '/insights', { level: 'adset', date_preset: 'maximum', fields: 'adset_id,adset_name,spend,impressions,actions' });

  services.metawatch = { accounts, campaigns, adsets, insights, load: store.load, save: store.save, clear: store.clear };
})();
