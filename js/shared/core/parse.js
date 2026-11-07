// Lectura de datos crudos: texto normalizado, números con formato local, CSV y celdas de ExcelJS.
// Capa core: sin DOM, también corre en Node.
(() => {
  const PYL = (globalThis.PYL ??= {});
  const core = (PYL.core ??= {});

  // Mayúsculas, sin tildes y con espacios colapsados: base para comparar encabezados y estados.
  const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

  // Números: Dropi usa coma decimal ("18295,1"); Meta usa punto de mil ("100.000 COP").
  function num(v, commaDecimal) {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    let s = String(v).replace(/[^\d,.-]/g, '');
    if (!s || s === '-') return 0;
    const c = s.lastIndexOf(','), d = s.lastIndexOf('.');
    if (c > -1 && d > -1) s = c > d ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (c > -1) s = !commaDecimal && /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.slice(0, c).replace(/,/g, '') + '.' + s.slice(c + 1);
    else if (d > -1 && /^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    const out = parseFloat(s);
    return isFinite(out) ? out : 0;
  }

  // CSV con separador autodetectado (; , o tabulador) y comillas dobles.
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const head = text.split(/\r?\n/, 5).join('\n');
    const delim = [';', ',', '\t'].map((dl) => [dl, head.split(dl).length]).sort((a, b) => b[1] - a[1])[0][0];
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch;
      } else if (ch === '"') q = true;
      else if (ch === delim) { row.push(f); f = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(f); rows.push(row); row = []; f = '';
      } else f += ch;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
  }

  // Valor plano de una celda de ExcelJS.
  function cellVal(cell) {
    const v = cell.value;
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      if (v.richText) return v.richText.map((t) => t.text).join('');
      if ('result' in v) return v.result;
      if ('text' in v) return v.text;
      if (v.error) return null;
    }
    return v;
  }

  core.parse = { norm, num, parseCSV, cellVal };
})();
