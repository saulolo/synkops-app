// Inicio: saludo según la hora y frase del día (SPEC 18). Solo reglas puras: sin DOM ni red.
// Las frases salen de core.homeQuotes (lista local): dos por día, una de 00:00 a 11:59 y otra de 12:00 a 23:59.
// Nombres con prefijo home/HOME_ para no chocar al aplanar en js/index.js (hm ya es de Métricas).
(() => {
  const core = globalThis.PYL.core;

  const HOME_NAME = 'Saúl';
  const HOME_EPOCH = [2026, 0, 1]; // día 0 de la rotación (fecha local)
  const HOME_SEED = 18; // semilla de la baraja; cada vuelta completa usa HOME_SEED + vuelta
  const HOME_SLOTS = ['Frase de la mañana:', 'FRASE DE HOY']; // etiqueta de cada media jornada

  // 05–11 días, 12–18 tardes, 19–04 noches.
  const homeGreeting = (hour) => {
    if (hour >= 5 && hour < 12) return 'Buenos días';
    if (hour >= 12 && hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const homeHello = (hour) => `${homeGreeting(hour)}, ${HOME_NAME}`;

  // Media jornada: 0 = 00:00–11:59 (mañana), 1 = 12:00–23:59 (tarde; la noche ve la de la tarde).
  const homeSlot = (hour) => (hour < 12 ? 0 : 1);

  // Días entre HOME_EPOCH y la fecha local de `date` (negativo antes). Por UTC de las cifras locales: sin saltos de horario.
  const homeDay = (date) => {
    const [y, m, d] = HOME_EPOCH;
    return Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(y, m, d)) / 864e5);
  };

  // Generador con semilla (mulberry32): mismo número de partida → misma secuencia.
  const rng = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // Permutación de 0..n-1 barajada con semilla (Fisher-Yates).
  const homeOrder = (n, seed) => {
    const next = rng(seed);
    const p = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    return p;
  };

  // Frase para la fecha y hora de `date`: { slot, label, text, author }, o null sin frases.
  // Cada media jornada toma la siguiente de la baraja: ninguna se repite hasta usarlas todas; luego otra baraja.
  const homePick = (quotes, date) => {
    const n = quotes ? quotes.length : 0;
    if (!n) return null;
    const slot = homeSlot(date.getHours());
    const k = homeDay(date) * 2 + slot;
    const turn = Math.floor(k / n);
    const pos = k - turn * n;
    const q = quotes[homeOrder(n, HOME_SEED + turn)[pos]];
    return { slot, label: HOME_SLOTS[slot], text: q.text, author: q.author };
  };

  core.home = { HOME_NAME, HOME_EPOCH, HOME_SEED, HOME_SLOTS, homeGreeting, homeHello, homeSlot, homeDay, homeOrder, homePick };
})();
