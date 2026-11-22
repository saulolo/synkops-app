// Persistencia en el navegador: asignaciones campaña → producto, búsqueda de productos, guardado rápido y Mis tareas y la foto del P&L (localStorage)
// y el acceso al archivo consolidado (IndexedDB, porque localStorage no guarda handles).
(() => {
  const services = (globalThis.PYL.services ??= {});

  const MAP_KEY = 'pyl-cod-campaign-map';
  const campaignMap = {
    load: () => { try { return JSON.parse(localStorage.getItem(MAP_KEY) || '{}'); } catch { return {}; } },
    save: (m) => { try { localStorage.setItem(MAP_KEY, JSON.stringify(m)); } catch { /* sin almacenamiento */ } },
  };

  // Pestaña Buscar producto: pasos hechos, rasgos marcados, candidato en edición y bitácora.
  const SEARCH_KEY = 'pyl-search';
  const search = {
    load: () => { try { return JSON.parse(localStorage.getItem(SEARCH_KEY) || 'null'); } catch { return null; } },
    // false si no cupo (las fotos pesan): quien llama avisa al usuario.
    save: (s) => { try { localStorage.setItem(SEARCH_KEY, JSON.stringify(s)); return true; } catch { return false; } },
  };

  // Pestaña Desarrollo: producto que estoy montando, casillas marcadas y textos de SEO.
  const LANDING_KEY = 'pyl-landing';
  const landing = {
    load: () => { try { return JSON.parse(localStorage.getItem(LANDING_KEY) || 'null'); } catch { return null; } },
    save: (s) => { try { localStorage.setItem(LANDING_KEY, JSON.stringify(s)); return true; } catch { return false; } },
  };

  // Desarrollo → Meta Ads: sub-pestaña abierta, paso abierto, casillas y URL de la product page.
  const ADS_KEY = 'pyl-ads';
  const ads = {
    load: () => { try { return JSON.parse(localStorage.getItem(ADS_KEY) || 'null'); } catch { return null; } },
    save: (s) => { try { localStorage.setItem(ADS_KEY, JSON.stringify(s)); return true; } catch { return false; } },
  };

  // Testeo: sub-pestaña, paso y pasos hechos, modo del simulacro, mejor puntaje y números de "Juega con los números".
  // La ronda de práctica en curso no se guarda. Migración única: antes la clave era pyl-scaling.
  const TESTING_KEY = 'pyl-testing', OLD_TESTING_KEY = 'pyl-scaling';
  const testing = {
    load: () => {
      try {
        if (localStorage.getItem(TESTING_KEY) === null) {
          const old = localStorage.getItem(OLD_TESTING_KEY);
          if (old !== null) { localStorage.setItem(TESTING_KEY, old); localStorage.removeItem(OLD_TESTING_KEY); }
        }
        return JSON.parse(localStorage.getItem(TESTING_KEY) || 'null');
      } catch { return null; }
    },
    save: (s) => { try { localStorage.setItem(TESTING_KEY, JSON.stringify(s)); return true; } catch { return false; } },
  };

  // Escalado: sub-pestaña, método, paso y pasos hechos de cada método, modo del simulacro, mejor puntaje y números de
  // "Juega con los números". La ronda de práctica en curso no se guarda. Clave propia: pyl-scaling la usa la migración de Testeo.
  const SCALING_KEY = 'pyl-escalado';
  const scaling = {
    load: () => { try { return JSON.parse(localStorage.getItem(SCALING_KEY) || 'null'); } catch { return null; } },
    save: (s) => { try { localStorage.setItem(SCALING_KEY, JSON.stringify(s)); return true; } catch { return false; } },
  };

  // Buscar producto → guardado rápido: libreta de productos al vuelo (nombre, ID Dropi, foto).
  // Clave propia para que "Limpiar" libere de verdad el espacio de las fotos.
  const QUICK_KEY = 'pyl-quick';
  const quick = {
    load: () => { try { return JSON.parse(localStorage.getItem(QUICK_KEY) || 'null'); } catch { return null; } },
    // false si no cupo (las fotos pesan): quien llama avisa al usuario.
    save: (s) => { try { localStorage.setItem(QUICK_KEY, JSON.stringify(s)); return true; } catch { return false; } },
  };

  // Inicio → Centro de mando: accesos directos (nombre, URL, color, ícono propio). Clave propia: los íconos pesan.
  // load devuelve el texto guardado tal cual (o null): quien lo valida es core.hub.hubLoad.
  const HUB_KEY = 'pyl-hub';
  const hub = {
    load: () => { try { return localStorage.getItem(HUB_KEY); } catch { return null; } },
    // false si no cupo (los íconos pesan): quien llama avisa y deja abierto el modo Editar.
    save: (s) => { try { localStorage.setItem(HUB_KEY, JSON.stringify(s)); return true; } catch { return false; } },
  };

  // Inicio → Mis tareas (SPEC 19): nota de tareas por día y estado colapsado. Clave propia.
  // load devuelve el texto guardado tal cual (o null): quien lo valida es core.tasks.tkLoad.
  // corrupt guarda aparte el texto que no pasó la validación, para no perderlo (equivale al note.corrupt-<ts>.json del original).
  const TASKS_KEY = 'pyl-tasks', TASKS_CORRUPT_KEY = 'pyl-tasks-corrupt';
  const tasks = {
    load: () => { try { return localStorage.getItem(TASKS_KEY); } catch { return null; } },
    // false si no cupo: quien llama avisa y conserva el estado en pantalla.
    save: (s) => { try { localStorage.setItem(TASKS_KEY, JSON.stringify(s)); return true; } catch { return false; } },
    corrupt: (raw) => { try { localStorage.setItem(TASKS_CORRUPT_KEY, String(raw)); return true; } catch { return false; } },
  };

  // Barra → cortes de testeo en vivo (SPEC 21): token de Meta, cuenta, campaña y alertas. Clave propia.
  // load devuelve el texto guardado tal cual (o null): quien lo valida es core.metawatch.mwLoad.
  const META_KEY = 'pyl-meta';
  const meta = {
    load: () => { try { return localStorage.getItem(META_KEY); } catch { return null; } },
    save: (s) => { try { localStorage.setItem(META_KEY, JSON.stringify(s)); return true; } catch { return false; } },
    clear: () => { try { localStorage.removeItem(META_KEY); return true; } catch { return false; } },
  };

  // Inicio → Mini P&L (SPEC 22): foto de los números clave del último cálculo del Tablero P&L. Clave propia.
  // load devuelve el texto guardado tal cual (o null): quien lo valida es core.indicators.ixLoad.
  const PNL_SNAP_KEY = 'pyl-pnl-snap';
  const pnlSnap = {
    load: () => { try { return localStorage.getItem(PNL_SNAP_KEY); } catch { return null; } },
    // false si no cupo: quien llama sigue sin avisar (la foto es opcional).
    save: (s) => { try { localStorage.setItem(PNL_SNAP_KEY, JSON.stringify(s)); return true; } catch { return false; } },
    clear: () => { try { localStorage.removeItem(PNL_SNAP_KEY); return true; } catch { return false; } },
  };

  // Limpieza única: la SPEC 08 (búsqueda automática, descartada) guardaba en pyl-auto; ya nadie la lee.
  try { localStorage.removeItem('pyl-auto'); } catch { /* sin almacenamiento */ }

  // Almacén clave-valor mínimo; cualquier fallo devuelve null en vez de lanzar.
  const idb = (() => {
    const open = () => new Promise((res, rej) => {
      const r = indexedDB.open('pyl-cod', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    const tx = async (mode, fn) => {
      try {
        const db = await open();
        return await new Promise((res) => { const t = db.transaction('kv', mode); const req = fn(t.objectStore('kv')); t.oncomplete = () => res(req && req.result); t.onerror = () => res(null); });
      } catch { return null; }
    };
    return { get: (k) => tx('readonly', (s) => s.get(k)), set: (k, v) => tx('readwrite', (s) => s.put(v, k)) };
  })();

  services.storage = { campaignMap, search, landing, ads, testing, scaling, quick, hub, tasks, meta, pnlSnap, idb };
})();
