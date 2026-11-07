// Libro "Utilidad Consolidado Global": 20 columnas del Registro, plantilla y escritura de filas.
// Recibe ExcelJS como parámetro para no depender del global del navegador.
(() => {
  const core = globalThis.PYL.core;
  const { norm, cellVal } = core.parse;

  const COP_FMT = '"$"#,##0;[Red]\\-"$"#,##0';
  const FMT = ['@', '@', '@', COP_FMT, '#,##0', COP_FMT, '0.0%', '#,##0', '#,##0', '#,##0', '#,##0', '#,##0', '#,##0', '0.0%', COP_FMT, COP_FMT, COP_FMT, COP_FMT, COP_FMT, '0.0%'];
  const HEADERS = ['Fecha / Periodo', 'Producto', 'Campaña / Ángulo', 'Inversión Ads COP', 'Compras Ads', 'CPA Meta COP ƒ', 'CTR Único %',
    'Pedidos Recibidos', 'Pedidos Cancelados', 'Pedidos Despachados ƒ', 'Pedidos Entregados', 'Pedidos Devueltos', 'Pedidos en Ruta',
    '% Efectividad Entrega ƒ', 'Facturación Cobrada COP', 'Costo Mercancía COP', 'Costo Fletes Total COP',
    'Ganancia Wallet Dropi COP ƒ', 'Utilidad Neta Real COP ƒ', 'Margen Neto Real % ƒ'];

  // Fórmulas por índice de columna (0 = A), iguales a las del consolidado original.
  const FORMULAS = {
    5: (r) => `IF(E${r}>0,D${r}/E${r},"")`,
    9: (r) => `IF(H${r}="","",H${r}-I${r})`,
    13: (r) => `IF((K${r}+L${r})>0,K${r}/(K${r}+L${r}),"")`,
    17: (r) => `IF(O${r}="","",O${r}-P${r}-Q${r})`,
    18: (r) => `IF(R${r}="","",R${r}-D${r})`,
    19: (r) => `IF(N(O${r})>0,S${r}/O${r},"")`,
  };

  // x: { periodo, producto, campana, compras, ctr }  (ctr como fracción: 0.058 = 5,8%)
  function rowCells(a, x, r) {
    const R = Math.round;
    const ads = R(a.ads), fact = R(a.fact), merc = R(a.merc), fl = R(a.fletes);
    const wallet = fact - merc - fl, util = wallet - ads;
    const F = (i, result) => ({ formula: FORMULAS[i](r), result: result == null ? '' : result });
    return [
      x.periodo, x.producto, x.campana || 'General', ads,
      x.compras == null ? null : x.compras,
      F(5, x.compras > 0 ? ads / x.compras : null),
      x.ctr == null ? null : x.ctr,
      a.rec, a.can, F(9, a.rec - a.can),
      a.ent, a.dev, a.ruta,
      F(13, a.ent + a.dev > 0 ? a.ent / (a.ent + a.dev) : null),
      fact, merc, fl,
      F(17, wallet), F(18, util), F(19, fact > 0 ? util / fact : null),
    ];
  }

  const txt = (c) => { const v = cellVal(c); return v == null ? '' : String(v); };

  // Escribe la fila en la hoja Registro del consolidado (workbook de ExcelJS ya cargado).
  // onDuplicate: 'ask' (devuelve {dup}) | 'overwrite' | 'append'
  function writeRegistro(wb, a, x, onDuplicate) {
    const ws = wb.getWorksheet('Registro') || wb.worksheets[0];
    let hr = 0;
    for (let r = 1; r <= 15 && !hr; r++) if (norm(txt(ws.getCell(r, 1))) === 'FECHA / PERIODO') hr = r;
    if (!hr) throw new Error('No encontré el encabezado "Fecha / Periodo" en la hoja Registro.');
    const first = hr + 1, last = Math.max(ws.rowCount, first);
    const isEmpty = (r) => [1, 2, 4, 8, 15].every((c) => txt(ws.getCell(r, c)).trim() === '');
    let target = 0, dup = 0;
    for (let r = first; r <= last; r++) {
      if (isEmpty(r)) { if (!target) target = r; continue; }
      target = 0;
      if (norm(txt(ws.getCell(r, 1))) === norm(x.periodo) && norm(txt(ws.getCell(r, 2))) === norm(x.producto)
        && norm(txt(ws.getCell(r, 3))) === norm(x.campana || 'General')) dup = r;
    }
    if (dup && onDuplicate === 'ask') return { dup };
    if (dup && onDuplicate === 'overwrite') target = dup;
    if (!target) target = last + 1;
    const row = ws.getRow(target), tmpl = ws.getRow(first);
    rowCells(a, x, target).forEach((v, i) => {
      const cell = row.getCell(i + 1);
      if (!Object.keys(cell.style || {}).length) cell.style = JSON.parse(JSON.stringify(tmpl.getCell(i + 1).style || {}));
      cell.value = v;
      if (i > 2) cell.numFmt = FMT[i];
    });
    row.commit();
    wb.calcProperties = Object.assign({}, wb.calcProperties, { fullCalcOnLoad: true });
    return { row: target, overwritten: target === dup };
  }

  // Libro vacío con la estructura del consolidado: título, grupos y encabezados en la fila 3.
  // Réplica del consolidado original: filas 4-203 con fórmulas precargadas, formato
  // condicional, validación de números ≥ 0 y hoja "Fórmulas" de referencia.
  const LAST_ROW = 203;
  function buildTemplate(ExcelJS) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'P&L COD';
    const ws = wb.addWorksheet('Registro', { views: [{ state: 'frozen', xSplit: 3, ySplit: 3 }] });
    const solid = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
    ws.getCell('A1').value = 'Utilidad Consolidado Global';
    ws.getCell('A1').font = { bold: true, size: 15, color: { argb: 'FF0F172A' } };
    // [rango del grupo, título, color fuerte, color suave del encabezado]
    const GROUPS = [
      ['A', 'C', 'GENERAL', 'FF334155', 'FFF1F5F9'],
      ['D', 'G', 'PUBLICIDAD · Meta Ads', 'FF4F46E5', 'FFEEF2FF'],
      ['H', 'N', 'LOGÍSTICA COD · Dropi', 'FF0E7490', 'FFECFEFF'],
      ['O', 'T', 'FINANZAS REALES · P&L de bolsillo', 'FF047857', 'FFECFDF5'],
    ];
    const col = (L) => L.charCodeAt(0) - 64;
    GROUPS.forEach(([a, b, label, strong, soft]) => {
      ws.mergeCells(`${a}2:${b}2`);
      const g = ws.getCell(`${a}2`);
      g.value = label; g.fill = solid(strong);
      g.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }; g.alignment = { horizontal: 'center', vertical: 'middle' };
      for (let i = col(a); i <= col(b); i++) {
        const c = ws.getRow(3).getCell(i);
        c.value = HEADERS[i - 1]; c.fill = solid(soft);
        c.font = { bold: true, size: 9, color: { argb: strong } };
        c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      }
    });
    ws.getRow(3).height = 42;
    [16, 18, 13, 15, 10, 13, 10, 13, 13, 11, 10, 13, 9, 11, 15, 14, 13, 15, 13, 11].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

    for (let r = 4; r <= LAST_ROW; r++) {
      const row = ws.getRow(r);
      HEADERS.forEach((h, i) => {
        const c = row.getCell(i + 1);
        if (i > 2) c.numFmt = FMT[i];
        if (FORMULAS[i]) c.value = { formula: FORMULAS[i](r), result: '' };
      });
    }

    const rng = (a, b) => `${a}4:${b}${LAST_ROW}`;
    const GOOD = ['FF065F46', 'FFD1FAE5'], MID = ['FF92400E', 'FFFEF3C7'], BAD = ['FF991B1B', 'FFFEE2E2'];
    const style = ([font, fill], bold = true) => ({
      font: font ? { bold, color: { argb: font } } : undefined,
      fill: fill ? { type: 'pattern', pattern: 'solid', bgColor: { argb: fill } } : undefined,
    });
    let prio = 1;
    const rule = (formula, st, stop) => ({ type: 'expression', formulae: [formula], style: st, priority: prio++, stopIfTrue: !!stop });
    const traffic = (L, good, mid) => ws.addConditionalFormatting({ ref: rng(L, L), rules: [
      rule(`AND(ISNUMBER(${L}4),${L}4>=${good})`, style(GOOD), true),
      rule(`AND(ISNUMBER(${L}4),${L}4>=${mid})`, style(MID), true),
      rule(`ISNUMBER(${L}4)`, style(BAD)),
    ] });
    const sign = (L) => ws.addConditionalFormatting({ ref: rng(L, L), rules: [
      rule(`AND(ISNUMBER(${L}4),${L}4<0)`, style(BAD)),
      rule(`AND(ISNUMBER(${L}4),${L}4>0)`, style(['FF047857', null])),
    ] });
    traffic('N', 0.7, 0.6);   // efectividad de entrega
    traffic('T', 0.2, 0);     // margen neto
    traffic('G', 0.02, 0.01); // CTR único
    sign('R'); sign('S');     // wallet y utilidad
    // Entregados + Devueltos + En ruta debe cuadrar con Despachados.
    ws.addConditionalFormatting({ ref: rng('J', 'M'), rules: [rule('AND($H4<>"",($K4+$L4+$M4)<>$J4)', { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFE4E6' } } })] });
    // Cancelación sobre 20% de lo recibido.
    ws.addConditionalFormatting({ ref: rng('I', 'I'), rules: [rule('AND(N($H4)>0,$I4/$H4>0.2)', style(MID))] });

    const dv = { type: 'decimal', operator: 'greaterThanOrEqual', allowBlank: true, formulae: [0], showErrorMessage: true, errorTitle: 'Valor inválido', error: 'Solo números ≥ 0' };
    ['D', 'E', 'G', 'H', 'I', 'K', 'L', 'M', 'O', 'P', 'Q'].forEach((L) => {
      if (ws.dataValidations && ws.dataValidations.add) ws.dataValidations.add(rng(L, L), dv);
      else for (let r = 4; r <= LAST_ROW; r++) ws.getCell(`${L}${r}`).dataValidation = dv;
    });

    const fx = wb.addWorksheet('Fórmulas');
    [
      ['Columna', 'Métrica', 'Fórmula Excel/Sheets (inglés)', 'Fórmula Excel/Sheets (español, sep. ;)'],
      ['F', 'CPA Meta COP', '=IFERROR(D4/E4,"")', '=SI.ERROR(D4/E4;"")'],
      ['J', 'Pedidos Despachados', '=H4-I4', '=H4-I4'],
      ['N', '% Efectividad Entrega', '=IFERROR(K4/(K4+L4),"")', '=SI.ERROR(K4/(K4+L4);"")'],
      ['R', 'Ganancia Wallet Dropi', '=O4-P4-Q4', '=O4-P4-Q4'],
      ['S', 'Utilidad Neta Real', '=R4-D4', '=R4-D4'],
      ['T', 'Margen Neto Real %', '=IFERROR(S4/O4,"")', '=SI.ERROR(S4/O4;"")'],
      ['—', 'ROAS real (extra)', '=IFERROR(O4/D4,"")', '=SI.ERROR(O4/D4;"")'],
      ['—', 'CPA real por entrega (extra)', '=IFERROR(D4/K4,"")', '=SI.ERROR(D4/K4;"")'],
      ['—', 'ROAS de equilibrio (extra)', '=IFERROR(O4/R4,"")', '=SI.ERROR(O4/R4;"")'],
      [],
      ['Nota', `Celdas con ƒ son fórmulas: no escribir encima. Filas 4-${LAST_ROW} ya traen fórmulas.`],
      ['Nota', 'Celdas rosadas en J:M = no cuadra Entregados + Devueltos + En ruta con Despachados.'],
    ].forEach((vals) => fx.addRow(vals));
    fx.getRow(1).font = { bold: true, color: { argb: 'FF0F172A' } };
    [9, 28, 34, 38].forEach((w, i) => { fx.getColumn(i + 1).width = w; });

    wb.calcProperties = { fullCalcOnLoad: true };
    return wb;
  }

  // Libro nuevo con la fila del filtro actual.
  function buildExport(ExcelJS, a, x) {
    const wb = buildTemplate(ExcelJS);
    writeRegistro(wb, a, x, 'append');
    return wb;
  }

  core.excel = { HEADERS, rowCells, writeRegistro, buildTemplate, buildExport };
})();
