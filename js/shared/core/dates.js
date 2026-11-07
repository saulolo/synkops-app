// Fechas: todo se maneja como texto ISO 'aaaa-mm-dd', que se compara y ordena como string.
(() => {
  const core = globalThis.PYL.core;
  const { norm } = core.parse;

  const pad = (n) => String(n).padStart(2, '0');
  const MONTHS = { ENE: 1, JAN: 1, FEB: 2, MAR: 3, ABR: 4, APR: 4, MAY: 5, JUN: 6, JUL: 7, AGO: 8, AUG: 8, SEP: 9, SET: 9, OCT: 10, NOV: 11, DIC: 12, DEC: 12 };
  const MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const iso = (y, m, d) => (y > 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${pad(m)}-${pad(d)}` : null);

  // Fechas de Dropi (dd-mm-aaaa), Meta (dd/mm/aaaa, aaaa-mm-dd, "12 oct 2026"), Date o serial de Excel.
  function toISO(v) {
    if (v == null || v === '') return null;
    if (v instanceof Date) return isNaN(v) ? null : iso(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate());
    if (typeof v === 'number') return v > 20000 && v < 80000 ? toISO(new Date(Math.round((v - 25569) * 864e5))) : null;
    const s = String(v).trim();
    let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) return iso(+m[1], +m[2], +m[3]);
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (m) {
      let y = +m[3]; if (y < 100) y += 2000;
      return +m[2] > 12 ? iso(y, +m[1], +m[2]) : iso(y, +m[2], +m[1]);
    }
    const n = norm(s).replace(/\./g, '');
    m = n.match(/(\d{1,2})\s*(?:DE\s+)?([A-Z]{3})[A-Z]*\s*(?:DE\s+)?(\d{4})/);
    if (m && MONTHS[m[2]]) return iso(+m[3], MONTHS[m[2]], +m[1]);
    m = n.match(/([A-Z]{3})[A-Z]*\s+(\d{1,2}),?\s+(\d{4})/);
    if (m && MONTHS[m[1]]) return iso(+m[3], MONTHS[m[1]], +m[2]);
    return null;
  }

  const addDays = (d, n) => new Date(Date.parse(d) + n * 864e5).toISOString().slice(0, 10);

  // Fecha local de hoy (no UTC), para que el ciclo activo termine en el día del usuario.
  const todayISO = () => { const t = new Date(); return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`; };

  // "01 Sep - 30 Sep 2026" o "01 Dic 2025 - 15 Ene 2026".
  function periodLabel(from, to) {
    if (!from || !to) return '';
    const p = (s) => ({ y: +s.slice(0, 4), m: +s.slice(5, 7), d: +s.slice(8, 10) });
    const a = p(from), b = p(to);
    const fmt = (x, y) => `${pad(x.d)} ${MES[x.m - 1]}${y ? ' ' + x.y : ''}`;
    if (from === to) return fmt(a, true);
    return a.y === b.y ? `${fmt(a)} - ${fmt(b)}` : `${fmt(a, true)} - ${fmt(b, true)}`;
  }

  core.dates = { toISO, addDays, todayISO, periodLabel };
})();
