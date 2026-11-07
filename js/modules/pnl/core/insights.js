// Lecturas derivadas del P&L: periodo anterior, tendencia semanal, proyección de pedidos en ruta y simulador.
(() => {
  const core = globalThis.PYL.core;
  const { addDays } = core.dates;
  const { aggregate } = core.pnl;

  const days = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 864e5) + 1;

  // Rango de igual duración que termina el día antes de `from`. Null si el filtro no tiene fechas.
  function previousRange(from, to) {
    if (!from || !to) return null;
    const n = days(from, to);
    return { from: addDays(from, -n), to: addDays(from, -1) };
  }

  // P&L del periodo anterior con la inversión automática (la manual solo vale para el periodo actual).
  // Null si en ese rango no hubo nada cobrado: no hay base de comparación.
  function previous(lines, meta, f, mx) {
    const r = previousRange(f.from, f.to);
    if (!r) return null;
    const a = aggregate(lines, meta, { ...f, ...r, adsOverride: null }, mx);
    return a.fact > 0 ? { ...r, a } : null;
  }

  // Semanas de lunes a domingo recortadas al filtro. partial: la semana no cae completa en el rango.
  function weeks(lines, meta, f, mx) {
    if (!f.from || !f.to) return [];
    const out = [];
    const dow = (d) => (new Date(d + 'T00:00:00Z').getUTCDay() + 6) % 7;
    for (let s = addDays(f.from, -dow(f.from)); s <= f.to; s = addDays(s, 7)) {
      const e = addDays(s, 6);
      const from = s < f.from ? f.from : s, to = e > f.to ? f.to : e;
      out.push({ from, to, partial: from !== s || to !== e, a: aggregate(lines, meta, { ...f, from, to, adsOverride: null }, mx) });
    }
    return out;
  }

  // Utilidad proyectada (con pedidos en ruta) del periodo actual frente a la del anterior: la utilidad real
  // de un periodo reciente se ve más baja solo porque aún no cobró todo. Null si no hay en ruta o no hay anterior.
  function projectedVsPrevious(a, prev) {
    const now = projection(a);
    if (!now || !prev) return null;
    const before = projection(prev.a)?.util ?? prev.a.util;
    return { ruta: now.ruta, now: now.util, before, diff: now.util - before };
  }

  // Pedidos en ruta: si cierran con la efectividad actual, cada entrega suma lo que hoy deja a la
  // Wallet por entrega (cpaMax, que ya descuenta las devoluciones). La pauta ya está pagada.
  function projection(a) {
    if (!a.ruta || a.efect == null || a.cpaMax == null) return null;
    const ent = a.ruta * a.efect;
    const extra = ent * a.cpaMax;
    return { ruta: a.ruta, efect: a.efect, ent, extra, util: a.util + extra };
  }

  // Valores por pedido cerrado que alimentan el simulador. Sin devoluciones, cada devolución se
  // estima como dos fletes de entrega (ida + retorno).
  function unitBase(a) {
    if (!a.ent) return null;
    return {
      cerrados: a.ent + a.dev,
      efect: a.efect,
      ticket: a.fact / a.ent,
      merc: a.merc / a.ent,
      ads: a.ads,
      fEnt: a.fEnt / a.ent,
      fDev: a.dev ? (a.fDevIda + a.fRet) / a.dev : (2 * a.fEnt) / a.ent,
    };
  }

  // Recalcula el P&L con los mismos pedidos cerrados y otras palancas. La inversión en Ads es total:
  // si sube la efectividad, el mismo presupuesto se reparte en más entregas y el CPA baja.
  // Con los valores de unitBase reproduce la utilidad real del filtro.
  function simulate(base, p) {
    const ent = base.cerrados * p.efect, dev = base.cerrados - ent;
    const fact = ent * p.ticket, merc = ent * p.merc, fletes = ent * base.fEnt + dev * base.fDev;
    const wallet = fact - merc - fletes, ads = p.ads, util = wallet - ads;
    const div = (x, y) => (y ? x / y : null);
    return {
      ent, dev, fact, wallet, ads, util,
      margen: div(util, fact), roas: div(fact, ads), roasEq: div(fact, wallet), cpa: div(ads, ent), cpaMax: div(wallet, ent),
      // CPA máximo para cerrar con margen de 15% (piso de la meta Nova).
      cpaMeta: div(wallet - 0.15 * fact, ent),
    };
  }

  // Reparto del ticket por pedido entregado: [{ key, name, total, per, pct }] (pct sobre el ticket).
  function unitEconomics(a) {
    if (!a.ent) return [];
    const ticket = a.fact / a.ent;
    return [
      ['ticket', 'Ticket promedio cobrado', a.fact],
      ['merc', 'Mercancía', a.merc],
      ['fEnt', 'Fletes de entregas', a.fEnt],
      ['fDev', 'Fletes de devoluciones (ida + retorno)', a.fDevIda + a.fRet],
      ['cpa', 'Margen Máximo para Publicidad (CPA Sostenible)', a.wallet],
      ['ads', `Meta Ads (${a.withIva ? 'con' : 'sin'} IVA)`, a.ads],
      ['util', 'Utilidad', a.util],
    ].map(([key, name, total]) => ({ key, name, total, per: total / a.ent, pct: ticket ? total / a.ent / ticket : null }));
  }

  // Plan de acción priorizado. gain: utilidad extra estimada con el simulador (null si no se puede estimar).
  // products: [{ label, a }] de cada producto (sin el consolidado), con la inversión automática.
  function actions(a, products) {
    const { fmt } = core.format;
    const pct = (v) => fmt(v, 'pct'), cop = (v) => fmt(v, 'cop');
    const out = [];
    const push = (title, detail, gain, urgent) => out.push({ title, detail, gain: gain == null || !isFinite(gain) ? null : gain, urgent: !!urgent });
    const base = unitBase(a);
    const gain = (p) => simulate(base, { ...base, ...p }).util - a.util;

    if (!a.ads) push('Cargar la inversión de Meta Ads', 'Sin el gasto en publicidad, la utilidad, el ROAS y el CPA del informe están incompletos. Carga la facturación de Meta o escribe la inversión manual.', null, true);
    if (base && a.ads) {
      const devR = a.dev / (a.ent + a.dev);
      if (a.efect < 0.7) {
        push(`Subir la efectividad de entrega de ${pct(a.efect)} a 70%`,
          `Hoy se devuelve el ${pct(devR)} de lo que cierra ciclo (máximo sano: 25%) y cada devolución paga flete de ida y de retorno. Confirma dirección y disponibilidad por WhatsApp antes de despachar, excluye ciudades o zonas con alta devolución y haz seguimiento diario a las novedades de la transportadora.`,
          gain({ efect: 0.7 }));
      }
      const now = simulate(base, base);
      if (now.cpaMeta > 0 && a.cpa > now.cpaMeta) {
        push(`Bajar el CPA de ${cop(a.cpa)} a ${cop(now.cpaMeta)} por entrega`,
          `Con ese CPA el periodo cerraría con margen del 15%. Pausa anuncios y conjuntos cuyo costo por entrega supere ${cop(a.cpaMax)} (el máximo sostenible), renueva creativos y concentra el presupuesto en los que mejor convierten.`,
          gain({ ads: now.cpaMeta * a.ent }));
      } else if (now.cpaMeta <= 0) {
        push('Corregir la estructura de costos antes de invertir más en pauta',
          `Aun con publicidad gratis el producto no llegaría a un margen del 15%: mercancía y fletes se llevan ${pct((a.merc + a.fletes) / a.fact)} de lo cobrado. Sube el ticket con combos o negocia el costo del producto.`, null, true);
      }
      if (a.margen < 0.2) {
        push('Subir el ticket promedio 10% (combos, upsell o precio)',
          'Calculado sin subir el costo de mercancía: en un combo, descuenta el costo del producto adicional antes de decidir.', gain({ ticket: base.ticket * 1.1 }));
        push('Negociar un 10% menos en el costo del producto',
          `Hoy la mercancía es el ${pct(a.merc / a.fact)} de lo cobrado. Pide precio por volumen al proveedor o compara bodegas en Dropi.`, gain({ merc: base.merc * 0.9 }));
      }
    }
    if (a.rec && a.can / a.rec > 0.3) {
      push('Recuperar clientes en la confirmación por WhatsApp',
        `Se cancela el ${pct(a.can / a.rec)} de los pedidos (rango sano: 15% a 25%). Revisa el guion de confirmación y los tiempos de respuesta.`, null);
    }
    const p = projection(a);
    if (p && p.extra > 0) {
      push(`Dar seguimiento a los ${p.ruta} pedidos en ruta`,
        `Si cierran con la efectividad actual suman ≈${Math.round(p.ent)} entregas. Llama o escribe a los clientes con novedad para evitar devoluciones.`, p.extra);
    }
    if (products.length > 1) {
      products.forEach(({ label, a: pa }) => {
        const u = pa.wallet - pa.adsAuto;
        if (u < 0) push(`Revisar o pausar ${label}`,
          `Perdió ${cop(u)} (margen ${pct(pa.fact ? u / pa.fact : null)}, efectividad ${pct(pa.efect)}). Si no mejora su CPA o su entrega, pausar su pauta evitaría esa pérdida.`, -u, true);
      });
    }
    if (a.mUnassigned > 0) push('Asignar las campañas sin producto', `${cop(a.mUnassigned)} de gasto en campañas no tiene producto asignado y no aparece en el análisis por producto.`, null);
    if (!out.length && a.margen >= 0.2) {
      push('Escalar con cuidado', `La operación está en rango sano. Sube el presupuesto en pasos de 20% vigilando que el CPA no pase de ${cop(a.cpaMax)} ni la efectividad baje de 70%.`, null);
    }

    // Primero lo que más plata mueve; lo que no se puede estimar va después, lo urgente antes.
    const score = (x) => (x.gain != null ? x.gain : x.urgent ? 1e15 : -1e15);
    out.sort((x, y) => score(y) - score(x));
    out.forEach((x) => { x.priority = x.urgent || (x.gain != null && a.fact && x.gain >= 0.05 * a.fact) ? 'Alta' : 'Media'; });
    return out;
  }

  core.insights = { previousRange, previous, weeks, projection, projectedVsPrevious, unitBase, simulate, unitEconomics, actions };
})();
