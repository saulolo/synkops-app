// Avisos sobre los datos cargados: archivos faltantes, controles de IVA, obsequios, divisas.
(() => {
  const PYL = globalThis.PYL;
  const { $, el } = PYL.ui.dom;
  const { nf, F, fmt } = PYL.core.format;
  const { periodLabel } = PYL.core.dates;

  // Avisos como datos: [{ text, kind }] con kind '' | 'info' | 'error'.
  // a: agregado del filtro (null si no hay datos); data: { dropi, meta, metaInfo, metrics }.
  function list(a, data) {
    const { dropi, meta, metaInfo, metrics } = data;
    const out = [];
    const add = (text, kind) => out.push({ text, kind: kind || '' });
    if (typeof ExcelJS === 'undefined') add('No cargó la librería de Excel (¿sin internet?). Abre la app con conexión para leer .xlsx y guardar.', 'error');
    if (!dropi || !a) return out;
    if (!meta && !metrics) add('Sin archivos de Meta: la inversión es $0 salvo que escribas la "Inversión Ads manual". Utilidad, ROAS y CPA quedan incompletos.');
    else if (!meta) add('Sin facturación de Meta: la inversión sale de las métricas de campañas (× 1,19 con IVA) y no se puede filtrar por fecha de cargo.');
    if (!metrics) add('Sin reporte de métricas: Compras Ads y CTR se escriben a mano.', 'info');
    if (a.ivaCheck) add(`Control IVA: facturación ${F.cop(a.ivaCheck.bill)} frente a gasto en campañas ${F.cop(a.ivaCheck.spend)} en el periodo de las métricas (+${fmt(a.ivaCheck.pct, 'pct')}). Vista ${a.withIva ? 'con IVA: cargos de tarjeta' : 'sin IVA: cargos ÷ 1,19'}.`, 'info');
    if (a.metricsWider && a.buys != null) add(`Compras y CTR son los totales de las campañas del reporte de métricas (${periodLabel(metrics.from, metrics.to)}): ese archivo no trae desglose diario. Para que sigan el filtro de fechas, expórtalo con desglose por Día.`, 'info');
    if (dropi.gifts) add(`${nf(dropi.gifts)} líneas de obsequio (${dropi.giftNames.join(', ')}) se suman al producto principal de su orden.`, 'info');
    if (a.mUnassigned > 0) add(`${F.cop(a.mUnassigned)} de gasto en campañas sin producto asignado: entra en el consolidado pero en ningún producto. Asígnalo en la tabla "Campañas Meta".`);
    if (dropi.noDate) add(`${dropi.noDate} líneas de Dropi sin FECHA válida quedan fuera del cálculo.`);
    if (metaInfo?.otherCur.length) add(`Meta trae divisas distintas a COP (${metaInfo.otherCur.join(', ')}). No se convierten.`, 'error');
    if (metaInfo?.skipped) add(`${metaInfo.skipped} cobros de Meta fallidos o reembolsados se omitieron.`, 'info');
    if (metaInfo?.prepaid) {
      const m = metaInfo, tot = meta.reduce((s, r) => s + r.amt, 0);
      const check = m.billed == null ? '' : Math.abs(m.billed - tot) < 1 ? ' Cuadra con el "Importe total facturado".' : ` Ojo: el "Importe total facturado" dice ${F.cop(m.billed)}.`;
      add(`Meta: gasto real ${F.cop(tot)} en ${nf(meta.length)} cargos. Se excluyen ${nf(m.depositsN)} recargas de saldo con tarjeta (${F.cop(m.depositsTotal)}).${check}`, 'info');
    }
    return out;
  }

  function render(a, data) {
    const box = $('#notices'); box.textContent = '';
    list(a, data).forEach((n) => box.appendChild(el('div', 'notice ' + n.kind, n.text)));
  }

  PYL.ui.notices = { list, render };
})();
