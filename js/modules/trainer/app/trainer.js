// Entrenador de métricas: pestañas Inicio, Costeo, Hard Metrics, Escalera y Creativos.
// La navegación entre pestañas está en js/app/nav.js.
// Fase 1: es el código del prototipo (docs/referencia/novasociety-metricas-v2.html) sin cambios de lógica;
// solo se renombraron #verdict → #t-verdict y #c-cpa → #c-cpa-esp para no chocar con el tablero.
(function(){
"use strict";

/* ===================== Helpers ===================== */
var $ = function(s, r){ return (r || document).querySelector(s); };
var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var fmt = function(n){ return (typeof n === "number" && isFinite(n)) ? Math.round(n).toLocaleString("es-CO") : "—"; };
var money = function(n){ return (typeof n === "number" && isFinite(n)) ? "$" + fmt(n) : "—"; };
var val = function(id){ var el = document.getElementById(id); var v = parseFloat(el ? el.value : ""); return isNaN(v) ? 0 : v; };
var store = {
  get: function(k, d){ try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch(e){ return d; } },
  set: function(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
};
var toastT;
function toast(msg){
  var t = $("#toast"); t.textContent = msg; t.classList.add("on");
  clearTimeout(toastT); toastT = setTimeout(function(){ t.classList.remove("on"); }, 2600);
}
function countUp(el, to, prefix){
  prefix = prefix || "";
  if(!isFinite(to)){ el.textContent = "—"; return; }
  var from = parseFloat(el.getAttribute("data-n") || "0"), start = null, dur = 650;
  el.setAttribute("data-n", to);
  function step(ts){
    if(start === null){ start = ts; }
    var p = Math.min(1, (ts - start) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = prefix + fmt(from + (to - from) * e);
    if(p < 1){ requestAnimationFrame(step); }
  }
  requestAnimationFrame(step);
}

/* ===================== Estado global ===================== */
var GENERIC = { name: "Genérico de NovaSociety (sin costeo)", tope: 15000, escala: 12000, apaga: 20000, generic: true };
var S = store.get("ns_prod", GENERIC);
if(S.generic){ S = GENERIC; } // un genérico guardado antes toma el nombre actual
var PLAT = { meta: { name: "Meta Ads", cpm: 20000 }, tiktok: { name: "TikTok Ads", cpm: 6000 } };
var ESCALERA = [100000,120000,144000,173000,207000,249000,299000,358000,430000,516000,619000,743000,892000,1070000,1280000];

function renderPill(){
  $("#pillProd").innerHTML =
    '<span class="soft">Activo:</span> <b>' + S.name + '</b>' +
    '<span class="z"><span style="background:var(--g-bg);color:var(--g-ink)">&lt;' + fmt(S.escala) + '</span>' +
    '<span style="background:var(--y-bg);color:var(--y-ink)">' + fmt(S.tope) + '</span>' +
    '<span style="background:var(--r-bg);color:var(--r-ink)">&gt;' + fmt(S.apaga) + '</span></span>';
}
function setProduct(p){
  S = p; store.set("ns_prod", S);
  renderPill(); renderLevel(); runPanel(); wiz(0); chain(chainK);
}

/* ===================== Navegación ===================== */
// La navegación vive en js/app/nav.js; aquí solo se reacciona a la pestaña que se abre.
document.addEventListener("nav:vista", function(e){ if(e.detail.v === "escalera"){ growLadder(); } });

/* ===================== Cadena (dashboard) ===================== */
// Desplegable "¿Qué falla y cómo lo arreglo?": regla de NovaSociety arriba y, debajo, cómo la aterrizo
// (causa · cómo lo noto · solución). Las soluciones de la tabla siempre caen dentro de la regla.
function chainHelp(rule, rows, foot){
  return "<details class='chain-help'><summary>¿Qué falla y cómo lo arreglo?</summary>" +
    "<p><span class='tag tv'>Criterio NovaSociety</span> " + rule + "</p>" +
    "<div class='chain-help-tbl'><table><thead><tr><th>Causa</th><th>Cómo lo noto</th><th>Solución</th></tr></thead><tbody>" +
    rows.map(function(r){ return "<tr><td><b>" + r[0] + "</b></td><td>" + r[1] + "</td><td>" + r[2] + "</td></tr>"; }).join("") +
    "</tbody></table></div>" + (foot ? "<p class='small'>" + foot + "</p>" : "") + "</details>";
}
// Resalta cifras (sobre todo plata) dentro de los textos de la cadena.
function N(x){ return "<span class='num'>" + x + "</span>"; }
var CHAIN = {
  cpm: "<b>CPM · costo por mil impresiones.</b> Máximo sano: " + N("$20.000") + " en Meta, " + N("$6.000") + " en TikTok. Si sale caro, el creativo no engancha: creativos nuevos con el gancho en los primeros tres segundos." +
    chainHelp("CPM caro = el creativo no engancha. La solución son creativos nuevos, con el gancho en los primeros tres segundos.", [
      ["Gancho débil", "El CPM sale caro desde el primer día; la gente pasa de largo.", "Creativo nuevo que abra con el problema o el resultado en los primeros 3 s: movimiento y texto grande en pantalla."],
      ["Creativo cansado", "Venía sano y el CPM sube día a día con el mismo anuncio.", "Lanzar el reemplazo que tengo en el pipeline de Creativos, con un gancho distinto."],
      ["Contenido que la plataforma castiga", "CPM de 3 a 8 veces el máximo con promesas de \"milagro\", bata blanca o síntomas de enfermedad.", "Creativo nuevo sin promesas exageradas: mostrar el uso real del producto."],
      ["No parece contenido nativo", "Video horizontal o con cara de comercial de TV.", "Creativo nuevo vertical 9:16, estilo de alguien usándolo, gancho en los primeros 3 s."]
    ], "Mientras el CPM esté roto, no juzgo el CPC ni el CPPI: son consecuencia."),
  cpc: "<b>CPC · costo por clic.</b> Se lee solo con el CPM sano. Si con CPM sano el CPC sale caro, el producto no interesa: la gente no quiere ver más información ni comprarlo. (Mi ideal: menos de " + N("$800") + " por clic en Meta y TikTok.)" +
    chainHelp("CPM sano + CPC caro = el producto no interesa: la gente no quiere ver más información ni comprarlo.", [
      ["El producto no genera deseo", "El anuncio se muestra barato (CPM sano), pero casi nadie hace clic.", "No es el creativo: otro video no lo arregla. Dejo que los cortes de " + N("20K") + " / " + N("30K") + " / " + N("40K") + " decidan y pruebo otro producto."],
      ["Producto muy visto", "Lo mismo aparece en muchas tiendas y anuncios; la gente ya lo conoce.", "Igual: el producto no interesa. Paso a otro producto con menos competencia."]
    ], "Primero confirmo que el CPM esté sano; si no, el problema es del creativo (paso 1)."),
  cppi: "<b>CPPI · costo por pago iniciado (costo por checkout).</b> Bueno por debajo de " + N("$4.000") + "; flojo cerca de " + N("$5.000") + "; por encima de " + N("$6.000") + " sin ventas, se apaga. CPPI bueno sin ventas = problema de página, oferta o formulario." +
    chainHelp("CPPI bueno y sin ventas = el problema está en la página, la oferta o el formulario. La solución es mejorar la confianza de la página, la oferta y el formulario, que no exista fricción.", [
      ["Página lenta", "Tarda más de 3 s en abrir en el celular; muchas visitas se van sin bajar.", "Quitar fricción: comprimir imágenes y GIF, quitar apps pesadas de Shopify, video liviano."],
      ["Página sin confianza", "Entran, miran y salen. No hay reseñas ni se ve el pago contra entrega.", "Más confianza: reseñas con fotos reales, sello \"Pagas al recibir\", garantía visible, WhatsApp de contacto."],
      ["Oferta débil", "Llegan al formulario, pero la oferta no los convence de terminar.", "Refinar la oferta: combos 2×/3×, bono o regalo, envío gratis, garantía de devolución."],
      ["Formulario con fricción", "Inician el pago pero no terminan.", "Simplificar el formulario (Releasit): pocos campos, botón claro, sin pasos extra ni costos sorpresa."]
    ], "Con CPPI por encima de " + N("$6.000") + " sin ventas no se arregla: se apaga en el corte de " + N("30K") + "."),
  // Función: las zonas cambian con el producto activo del costeo.
  cpa: function(){
    return "<b>CPA · costo por venta (métrica reina).</b> El número final. Su techo sale del costeo: escala por debajo del " + N("80%") + " del tope, sostiene hasta el tope, apaga por encima del " + N("133%") + ". " +
      "Con " + S.name + ": escala por debajo de " + N(money(S.escala)) + ", tope " + N(money(S.tope)) + ", apaga por encima de " + N(money(S.apaga)) + "." +
      chainHelp("Decide el CPA de los últimos 3 días, no un solo día; las ventas del día no pesan, pesa el CPA. Por debajo de la zona de escala se sube; hasta el tope se sostiene; por encima se baja; por encima de la zona de apagar es zona de apagar.", [
        ["CPA en zona de escala", "CPA de la ventana por debajo de " + N(money(S.escala)) + ".", "Subo un escalón: " + N("+20%") + " de presupuesto. Uno a la vez."],
        ["CPA entre escala y tope", "CPA de la ventana entre " + N(money(S.escala)) + " y " + N(money(S.tope)) + ".", "Sostengo el presupuesto."],
        ["CPA sobre el tope", "CPA de la ventana por encima de " + N(money(S.tope)) + ".", "Bajo un escalón (" + N("−20%") + ") y recorro la cadena: CPM, CPC y CPPI, para ver qué eslabón se rompió."],
        ["Un día malo después de días buenos", "Ayer salió más caro que los días anteriores, que venían bien.", "Hasta " + N("50%") + " más caro: sostengo, fue un día flojo. " + N("50%") + " o más: bajo un escalón."],
        ["Dos días en zona de apagar", "Dos días seguidos con CPA por encima de " + N(money(S.apaga)) + ".", "Apago. Es regla dura."],
        ["Día sin nada", "Cero ventas, cero pagos iniciados y " + N(money(2 * S.apaga)) + " gastados en el día.", "Apago. Es la única excepción que apaga por un solo día."]
      ], "Nada se apaga por un solo día malo, salvo el día sin nada.");
  }
};
var chainK = "cpm";
var chainOpen = false; // al empezar, el desplegable va contraído; al tocar un paso se abre
function chain(k, open){
  chainK = k;
  if(open !== undefined){ chainOpen = open; }
  var info = typeof CHAIN[k] === "function" ? CHAIN[k]() : CHAIN[k];
  $$(".chain-info").forEach(function(n){ // Inicio y Métricas muestran la misma cadena
    n.innerHTML = info;
    var d = n.querySelector("details"); if(d){ d.open = chainOpen; }
  });
  $$(".funnel-node").forEach(function(n){
    var r = n.querySelector("rect");
    var on = n.dataset.k === k;
    r.setAttribute("stroke", on ? "#6378FF" : "#2E3B50");
    r.setAttribute("fill", on ? "#18213A" : "#131B27");
  });
}
$$(".funnel-node").forEach(function(n){
  n.addEventListener("click", function(){ chain(n.dataset.k, true); });
  n.addEventListener("keydown", function(e){ if(e.key === "Enter" || e.key === " "){ e.preventDefault(); chain(n.dataset.k, true); } });
});
chain("cpm");

/* ===================== Costeo ===================== */
// Campos con barra (.cs): el número se escribe con puntos de miles (es-CO) y la barra lo sigue.
var cnum = function(id){ var v = parseFloat(String($("#" + id).value).replace(/[^\d,]/g, "").replace(",", ".")); return isNaN(v) ? 0 : v; };
function csSync(box, fromRange){
  var r = box.querySelector("input[type=range]"), t = box.querySelector(".cs-val input");
  if(fromRange){ t.value = fmt(+r.value); }
  else {
    var v = cnum(t.id);
    if(v > +r.max){ r.max = v; } // si escribo más que el tope de la barra, la barra se estira
    r.value = v;
  }
  r.style.setProperty("--p", ((r.value - r.min) / (r.max - r.min) * 100) + "%");
}
$$("#v-costeo .cs").forEach(function(box){
  var r = box.querySelector("input[type=range]"), t = box.querySelector(".cs-val input");
  csSync(box, false); t.value = fmt(cnum(t.id));
  r.addEventListener("input", function(){ csSync(box, true); costeo(); });
  t.addEventListener("input", function(){ csSync(box, false); });
  t.addEventListener("change", function(){ t.value = fmt(cnum(t.id)); });
});

// ¿A cuánto lo vendo? (columna derecha): el precio sale del margen que quiero con modules/search/core/search.js#priceFor
// (mismo cálculo y redondeo de NovaSociety), más el CPA máximo (con la zona de mi CPA) y lo que me queda por pedido entregado.
var lastPrice = null;
function costSide(o){
  lastPrice = o ? o.P : null;
  $("#c-to-cand").disabled = !o;
  $("#c-r1").textContent = o ? money(o.P) : "—";
  $("#c-r1-s").textContent = o ? "para ganar el " + fmt(o.mar) + "% por pedido" : "";
  var ok = o && o.tope > 0, z = !ok ? "" : o.cpa < o.esc ? "g" : o.cpa <= o.tope ? "y" : "r";
  var zt = { g: "en zona de escala", y: "dentro del tope", r: "por encima del tope" };
  $("#c-r2").textContent = ok ? money(o.tope) : "—";
  $("#c-r2-dot").className = "cres-dot " + z;
  $("#c-r2-s").textContent = ok ? "con " + money(o.cpa) + " de CPA voy " + zt[z] : "con este precio no hay tope";
  $("#c-r3").textContent = o ? money(o.ganEnt) : "—";
  $("#c-r3").style.color = o && o.ganEnt < 0 ? "var(--r-ink)" : "";
  $("#c-r3-s").textContent = o ? Math.round(o.e * 100) + " de cada 100 pedidos pagan · margen real " + (o.P > 0 ? Math.round(o.ganEnt / o.P * 100) : 0) + "%" : "";
}

var lastCost = null;
function costeo(){
  var C = cnum("c-prov"), F = cnum("c-flete"), cpa = cnum("c-cpa-esp");
  var dev = cnum("c-dev"), canc = cnum("c-canc"), mar = cnum("c-margen-q");
  var e = (100 - dev - canc) / 100, d = (100 - dev) / 100;
  var kp = $("#c-kpis"), zone = $("#c-zone"), msg = $("#c-msg");
  resetState();
  if(e <= 0){
    kp.innerHTML = ""; zone.innerHTML = ""; costSide(null); costPie(null);
    msg.innerHTML = '<div class="note nr">Devoluciones y cancelaciones juntas tienen que sumar menos de 100%.</div>';
    lastCost = null; return;
  }
  var P = PYL.core.search.priceFor({ price: C, flete: F, cpa: cpa, devRate: dev, cancelRate: canc }, mar);
  if(P == null){
    kp.innerHTML = ""; zone.innerHTML = ""; costSide(null); costPie(null);
    msg.innerHTML = '<div class="note nr">El margen que quiero tiene que ser menor que 100%.</div>';
    lastCost = null; return;
  }
  var ingreso = e * P, prod = e * C, flete = (e / d) * F;
  var tope = ingreso - prod - flete;
  var esc = tope * 0.8, apa = tope * 4 / 3;
  var gan = tope - cpa, ganEnt = gan / e;
  lastCost = { name: $("#c-name").value.trim() || "Mi producto", tope: tope, escala: esc, apaga: apa };
  costSide({ P: P, mar: mar, tope: tope, esc: esc, cpa: cpa, ganEnt: ganEnt, e: e });

  if(!kp.children.length){
    kp.innerHTML =
      '<div class="kpi" style="--glow:rgba(var(--b-rgb),.35)"><div class="l">CPA máximo</div><div class="v" id="k1">0</div><div class="s">Punto de equilibrio por pedido</div></div>' +
      '<div class="kpi" style="--glow:rgba(34,197,94,.35)"><div class="l">Escala por debajo de</div><div class="v" id="k2" style="color:var(--g-ink)">0</div><div class="s">80% del tope</div></div>' +
      '<div class="kpi" style="--glow:rgba(234,179,8,.35)"><div class="l">Sostiene hasta</div><div class="v" id="k3" style="color:var(--y-ink)">0</div><div class="s">El tope</div></div>' +
      '<div class="kpi" style="--glow:rgba(239,68,68,.35)"><div class="l">Apaga por encima de</div><div class="v" id="k4" style="color:var(--r-ink)">0</div><div class="s">133% del tope</div></div>' +
      '<div class="kpi" style="--glow:rgba(34,211,238,.35)"><div class="l">Ganancia por entregado</div><div class="v" id="k5">0</div><div class="s">Con el CPA que espero</div></div>';
  }
  countUp($("#k1"), tope, "$"); countUp($("#k2"), esc, "$"); countUp($("#k3"), tope, "$"); countUp($("#k4"), apa, "$"); countUp($("#k5"), ganEnt, "$");
  $("#k5").style.color = ganEnt > 0 ? "var(--g-ink)" : "var(--r-ink)";

  if(tope <= 0){
    zone.innerHTML = "";
    msg.innerHTML = '<div class="note nr"><b>No da:</b> pierdo plata aunque la publicidad fuera gratis. Sube el precio o consigue mejor costo de proveedor o flete.</div>';
  } else {
    var max = apa * 1.25, pos = Math.max(1, Math.min(99, cpa / max * 100));
    zone.innerHTML =
      '<div class="zbar"><div class="zg" style="flex:' + esc + '">Escala</div><div class="zy" style="flex:' + (tope - esc) + '">Sostiene</div><div class="zo" style="flex:' + (apa - tope) + '">Baja</div><div class="zr" style="flex:' + (max - apa) + '">Apaga</div></div>' +
      '<div class="zmark" style="left:' + pos + '%"><span>Mi CPA ' + money(cpa) + '</span></div>' +
      '<div class="zlabels"><span>$0</span><span>' + money(esc) + '</span><span>' + money(tope) + '</span><span>' + money(apa) + '</span><span>+</span></div>';
    var pct = tope / P * 100;
    msg.innerHTML = (gan > 0
      ? '<div class="note ng">Con un CPA de <b>' + money(cpa) + '</b> me quedan <b>' + money(gan) + '</b> por pedido que entra, o sea <b>' + money(ganEnt) + '</b> por pedido entregado (' + (P > 0 ? Math.round(ganEnt / P * 100) : 0) + '% del precio).</div>'
      : '<div class="note nr">Con un CPA de <b>' + money(cpa) + '</b> pierdo <b>' + money(-gan) + '</b> por cada pedido. Mi CPA tiene que bajar del tope.</div>') +
      (pct < 25 ? '<div class="note ny mt-s">Mi CPA máximo es apenas el ' + pct.toFixed(0) + '% del precio: poco margen de error en pauta.</div>' : '');
  }

  var u = PYL.core.search.unitCost({ price: C, sellPrice: P, flete: F, cpa: cpa, devRate: dev, cancelRate: canc });
  costPie(u);
  costSteps({ u: u, F: F, cpa: cpa, dev: dev, canc: canc, mar: mar, tope: tope, esc: esc, apa: apa });
}
// "¿Cómo se calcula?": llena los pasos con los números del costeo en vivo (los mismos de core.search, validados con NovaSociety).
function costSteps(o){
  var u = o.u, pct = function(x){ return Math.round(x * 100) + "%"; };
  var v = {
    canc: fmt(o.canc), dev: fmt(o.dev), ef: fmt(100 - o.dev - o.canc), desp: pct(u.entDesp),
    prov: money(u.costo), fleteF: "(" + money(o.F) + " ÷ " + pct(u.entDesp) + ")", fleteC: money(u.fleteC),
    cpaF: "(CPA " + money(o.cpa) + " ÷ " + pct(u.entEfec) + ")", cpaC: money(u.cpaC), costoT: money(u.costoT),
    costoT2: money(u.costoT), mar: fmt(o.mar) + "%", raw: money(u.costoT / (1 - o.mar / 100)), precio: money(u.venta),
    marReal: pct(u.utilidad / u.venta),
    precio2: money(u.venta), prov2: money(u.costo), fleteC2: money(u.fleteC), ef2: pct(u.entEfec), tope: money(o.tope),
    esc: money(o.esc), tope2: money(o.tope), apa: money(o.apa)
  };
  $$("#v-costeo [data-cx]").forEach(function(n){ n.textContent = v[n.dataset.cx]; });
}
// Dona "¿Qué me queda de cada pedido entregado?": el precio repartido en proveedor, flete costeado, publicidad
// costeada y lo que me queda (core.search.unitCost, los montos de NovaSociety). Los segmentos se crean una vez
// y solo cambia su largo, para que la dona se mueva al mover los campos. Si pierdo, la dona reparte los costos.
// Colores: "Me queda" en el acento del tema; los costos en tres grises del mismo tema (más claro = primero en la leyenda).
var PIE = [
  { k: "net", c: "var(--b)" },
  { k: "costo", c: "color-mix(in srgb, var(--ink) 62%, var(--card))" },
  { k: "fleteC", c: "color-mix(in srgb, var(--ink) 42%, var(--card))" },
  { k: "cpaC", c: "color-mix(in srgb, var(--ink) 25%, var(--card))" }
];
function costPie(u){
  var segs = $("#c-pie-segs"), leg = $("#c-pie-leg"), wrap = $("#v-costeo .cpie");
  var pct = function(x){ return Math.round(x * 100) + "%"; };
  if(!u){ segs.innerHTML = ""; leg.innerHTML = ""; $("#c-pie-v").textContent = "—"; $("#c-pie-s").textContent = ""; return; }
  var loss = u.utilidad < 0, info = {
    net: { n: loss ? "Pierdo" : "Me queda", s: "margen real " + (u.venta ? pct(u.utilidad / u.venta) : "—"), v: u.utilidad },
    costo: { n: "Proveedor", s: "costo del producto", v: u.costo },
    fleteC: { n: "Flete", s: money(cnum("c-flete")) + " ÷ " + pct(u.entDesp) + " que llega (incluye devoluciones)", v: u.fleteC },
    cpaC: { n: "Publicidad", s: "CPA " + money(cnum("c-cpa-esp")) + " ÷ " + pct(u.entEfec) + " que paga", v: u.cpaC }
  };
  var r = 80, circ = 2 * Math.PI * r, gap = 2, total = Math.max(u.venta, u.costoT, 1), acc = 0;
  if(!segs.children.length){
    segs.innerHTML = PIE.map(function(p){
      return '<circle class="cpie-seg cpie-' + p.k + '" cx="100" cy="100" r="80" style="stroke:' + p.c + '"><title></title></circle>';
    }).join("");
    // Leyenda: costos primero y "Me queda" al final, como resultado.
    leg.innerHTML = PIE.slice(1).concat(PIE[0]).map(function(p){
      return '<div class="cpie-row' + (p.k === "net" ? " net" : "") + '" data-k="' + p.k + '"><i style="background:' + p.c + '"></i>' +
        '<div><b></b><small></small></div><div class="v"><b></b><small></small></div></div>';
    }).join("");
  }
  PIE.forEach(function(p, i){
    var d = info[p.k], len = Math.max(0, d.v) / total * circ, seg = segs.children[i];
    seg.style.strokeDasharray = Math.max(0, len - gap) + " " + (circ - Math.max(0, len - gap));
    seg.style.strokeDashoffset = -acc;
    seg.querySelector("title").textContent = d.n + ": " + money(d.v) + " (" + pct(d.v / u.venta) + " del precio)";
    acc += len;
    var row = leg.querySelector('[data-k="' + p.k + '"]');
    row.querySelector("div b").textContent = d.n;
    row.querySelector("div small").textContent = d.s;
    row.querySelector(".v b").textContent = money(d.v);
    row.querySelector(".v small").textContent = u.venta ? pct(d.v / u.venta) : "";
  });
  wrap.classList.toggle("neg", loss);
  $("#c-pie-l").textContent = loss ? "Pierdo" : "Me queda";
  $("#c-pie-v").textContent = money(u.utilidad);
  $("#c-pie-s").textContent = "de " + money(u.venta);
}
["c-name","c-prov","c-flete","c-cpa-esp","c-dev","c-canc","c-margen-q"].forEach(function(id){ $("#" + id).addEventListener("input", costeo); });
// Valores de "Restablecer": devoluciones, cancelaciones, CPA y margen son los que NovaSociety usa si no se dice otro;
// el flete no tiene sugerido en NovaSociety (es obligatorio): 20.000 es de ejemplo (el de las Gotas Focus del prototipo,
// COST_DEFAULTS) y la página lo dice así. El proveedor no se toca.
function costDefaults(){
  var D = PYL.core.search.COST_DEFAULTS;
  return { "c-flete": D.flete, "c-dev": D.devRate, "c-canc": D.cancelRate, "c-cpa-esp": D.cpa, "c-margen-q": D.margin };
}
// El botón solo se activa cuando muevo alguna de esas barras.
function resetState(){
  var D = costDefaults();
  $("#c-reset").disabled = Object.keys(D).every(function(id){ return cnum(id) === D[id]; });
}
// Devuelve el "Véndelo a" a Buscar producto (js/modules/search/app/search.js escucha el evento y llena Precio de venta).
$("#c-to-cand").addEventListener("click", function(){
  if(lastPrice){ document.dispatchEvent(new CustomEvent("costeo:precio", { detail: { price: lastPrice } })); }
});
$("#c-reset").addEventListener("click", function(){
  var D = costDefaults();
  Object.keys(D).forEach(function(id){ var t = $("#" + id); t.value = fmt(D[id]); csSync(t.closest(".cs"), false); });
  costeo(); toast("Volví a los valores que sugiere NovaSociety");
});
$("#c-apply").addEventListener("click", function(){
  costeo();
  if(lastCost && lastCost.tope > 0){ setProduct(lastCost); toast("Listo: " + lastCost.name + " es el producto activo en toda la app"); }
  else { toast("Con estos números no hay tope: revisa el costeo"); }
});
$("#c-generic").addEventListener("click", function(){ setProduct(GENERIC); toast("Volví al genérico de NovaSociety: 12.000 / 15.000 / 20.000"); });

/* ===================== Módulo 3 · Escalera ===================== */
var selLv = store.get("ns_lv2", 1);
function short(b){ return b >= 1000000 ? (b / 1000000).toFixed(2).replace(".", ",") + "M" : Math.round(b / 1000) + "K"; }
function buildLadder(){
  var max = ESCALERA[ESCALERA.length - 1], html = "";
  ESCALERA.forEach(function(b, i){
    var h = 10 + (b / max) * 78, hue = 190 + i * 5;
    html += '<button class="step" data-i="' + i + '" aria-pressed="' + (i === selLv) + '" aria-label="Escalón ' + (i + 1) + ': ' + money(b) + ' diarios">' +
      '<span class="barbox"><span class="amt">' + short(b) + '</span>' +
      '<span class="bar" style="height:' + h + '%;transition-delay:' + (i * 45) + 'ms;background:linear-gradient(180deg,hsla(' + hue + ',85%,62%,.6),hsla(' + hue + ',85%,62%,.14))"></span></span>' +
      '<span class="lv">E' + (i + 1) + '</span></button>';
  });
  $("#ladder").innerHTML = html;
  $$("#ladder .step").forEach(function(s){
    s.addEventListener("click", function(){
      selLv = parseInt(s.dataset.i, 10); store.set("ns_lv2", selLv);
      renderLevel();
    });
  });
  var opts = "";
  ESCALERA.forEach(function(b, i){ opts += '<option value="' + i + '">Escalón ' + (i + 1) + ' · ' + money(b) + '</option>'; });
  $("#l-nivel").innerHTML = opts;
}
function growLadder(){
  var l = $("#ladder"); l.classList.remove("grown");
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ l.classList.add("grown"); }); });
}
function renderLevel(){
  var i = selLv, b = ESCALERA[i];
  var prev = i > 0 ? ESCALERA[i - 1] : null, next = i < ESCALERA.length - 1 ? ESCALERA[i + 1] : 1540000;
  $("#lvDetail").innerHTML =
    '<div class="row between"><div><div class="small" style="font-weight:800;letter-spacing:.06em;text-transform:uppercase">Escalón ' + (i + 1) + ' de 15</div><div style="font-size:30px;font-weight:900;letter-spacing:-.02em">' + money(b) + '<span class="soft" style="font-size:14px;font-weight:600"> / día</span></div></div>' +
    (prev ? '<span class="tag tc">+20% sobre ' + money(prev) + '</span>' : '<span class="tag tc">Escalón base</span>') + '</div>' +
    '<h3 class="mt">Para subir a ' + money(next) + '</h3>' +
    '<div class="req"><span class="n" style="background:var(--g-bg);color:var(--g-ink)">1</span><div>El CPA de la <b>ventana de los últimos 3 días</b> tiene que estar por debajo de la zona de escala: <b>' + money(S.escala) + '</b>.</div></div>' +
    '<div class="req"><span class="n" style="background:var(--g-bg);color:var(--g-ink)">2</span><div>Se sube <b>un escalón a la vez</b>: +20% de presupuesto.</div></div>' +
    '<div class="req"><span class="n" style="background:var(--g-bg);color:var(--g-ink)">3</span><div>Las ventas del día no pesan; <b>pesa el CPA</b>. Un día bueno solo no basta.</div></div>' +
    '<h3 class="mt">Reglas de protección</h3>' +
    '<div class="req"><span class="n" style="background:var(--y-bg);color:var(--y-ink)">=</span><div>CPA de la ventana entre ' + money(S.escala) + ' y el tope (' + money(S.tope) + '): <b>se sostiene</b> en ' + money(b) + '.</div></div>' +
    '<div class="req"><span class="n" style="background:var(--o-bg);color:var(--o-ink)">↓</span><div>CPA de la ventana por encima del tope: <b>se baja un escalón</b>' + (prev ? ', a ' + money(prev) : '') + '.</div></div>' +
    '<div class="req"><span class="n" style="background:var(--y-bg);color:var(--y-ink)">~</span><div>Venían bien y ayer fue <b>hasta 50% más caro</b>: se sostiene, fue un día flojo. <b>50% o más caro</b>: se devuelve el 20%' + (prev ? ' (vuelvo a ' + money(prev) + ')' : '') + '.</div></div>' +
    '<div class="req"><span class="n" style="background:var(--r-bg);color:var(--r-ink)">!</span><div><b>Regla dura:</b> dos días seguidos por encima de la zona de apagar (' + money(S.apaga) + '): se apaga.</div></div>' +
    '<div class="req"><span class="n" style="background:var(--r-bg);color:var(--r-ink)">0</span><div><b>Única excepción de un día:</b> cero ventas, cero pagos iniciados y ' + money(2 * S.apaga) + ' gastados (el doble de la zona de apagar): se apaga.</div></div>' +
    '<button class="btn ghost sm mt" id="useLv">Usar este escalón en el panel</button>';
  $("#useLv").addEventListener("click", function(){ $("#l-nivel").value = i; runPanel(); toast("Escalón " + (i + 1) + " cargado en el panel"); });
  $$("#ladder .step").forEach(function(x){ x.setAttribute("aria-pressed", parseInt(x.dataset.i, 10) === i); });
  $("#escNote").innerHTML = '<b>Zonas en uso: ' + S.name + '.</b> Escala por debajo de ' + money(S.escala) + ' · sostiene hasta ' + money(S.tope) + ' · apaga por encima de ' + money(S.apaga) + '. ' + (S.generic ? 'Son los números genéricos de NovaSociety; costea mi producto en la pestaña Costeo para usar los míos.' : 'Salen del costeo de mi producto.');
}
function runPanel(){
  var lv = parseInt($("#l-nivel").value || "0", 10);
  var g = [val("l-g1"), val("l-g2"), val("l-g3")], v = [val("l-v1"), val("l-v2"), val("l-v3")], pi3 = val("l-pi3");
  var cpaDay = g.map(function(x, k){ return v[k] > 0 ? x / v[k] : Infinity; });
  var vT = v[0] + v[1] + v[2], cpaWin = vT > 0 ? (g[0] + g[1] + g[2]) / vT : Infinity;
  var vP = v[0] + v[1], cpaPrev = vP > 0 ? (g[0] + g[1]) / vP : Infinity;
  var cur = ESCALERA[lv], up = lv < ESCALERA.length - 1 ? ESCALERA[lv + 1] : 1540000, down = lv > 0 ? ESCALERA[lv - 1] : null;
  var cls, txt, pct = isFinite(cpaPrev) && isFinite(cpaDay[2]) ? (cpaDay[2] / cpaPrev - 1) * 100 : null;
  var venianBien = cpaPrev <= S.tope, ayerPeor = cpaDay[2] > cpaPrev;

  if(v[2] === 0 && pi3 === 0 && g[2] >= 2 * S.apaga){
    cls = "nr"; txt = "🛑 <b>APAGA.</b> Ayer: cero ventas, cero pagos iniciados y " + money(g[2]) + " gastados, el doble de la zona de apagar (" + money(2 * S.apaga) + ").";
  } else if(cpaDay[1] > S.apaga && cpaDay[2] > S.apaga){
    cls = "nr"; txt = "🛑 <b>APAGA.</b> Regla dura: dos días seguidos por encima de la zona de apagar (anteayer " + money(cpaDay[1]) + ", ayer " + money(cpaDay[2]) + ").";
  } else if(venianBien && ayerPeor && pct !== null && pct >= 50){
    cls = "ny"; txt = "↓ <b>BAJA UN ESCALÓN" + (down ? " a " + money(down) : "") + ".</b> Venían bien (" + money(cpaPrev) + ") y ayer fue " + Math.round(pct) + "% más caro: se devuelve el 20%.";
  } else if(venianBien && ayerPeor && cpaWin >= S.escala){
    cls = "ny"; txt = "= <b>SOSTÉN " + money(cur) + ".</b> Ayer fue " + (pct !== null ? Math.round(pct) + "% " : "") + "más caro, menos del 50%: fue un día flojo.";
  } else if(cpaWin < S.escala){
    cls = "ng"; txt = "🚀 <b>SUBE UN ESCALÓN: " + money(up) + ".</b> CPA de la ventana " + money(cpaWin) + ", por debajo de la zona de escala (" + money(S.escala) + ")." + (venianBien && ayerPeor ? " Ojo: ayer fue algo más caro, pero menos del 50%." : "");
  } else if(cpaWin <= S.tope){
    cls = "ny"; txt = "= <b>SOSTÉN " + money(cur) + ".</b> CPA de la ventana " + money(cpaWin) + ", entre la zona de escala y el tope (" + money(S.tope) + ").";
  } else if(cpaWin <= S.apaga){
    cls = "ny"; txt = "↓ <b>BAJA UN ESCALÓN" + (down ? " a " + money(down) : " (ya estoy en el escalón base)") + ".</b> CPA de la ventana " + money(cpaWin) + ", por encima del tope (" + money(S.tope) + ").";
  } else {
    cls = "nr"; txt = "⚠️ <b>ZONA DE APAGAR.</b> CPA de la ventana " + money(cpaWin) + ". Nada se apaga por un solo día: baja un escalón" + (down ? " (" + money(down) + ")" : "") + " y si mañana vuelve a quedar en zona de apagar, son dos días seguidos y se apaga.";
  }
  $("#lOut").className = "note mt " + cls; $("#lOut").innerHTML = txt;
  $("#lKpis").innerHTML =
    '<div class="kpi"><div class="l">CPA hace 3 días</div><div class="v" style="font-size:19px">' + money(cpaDay[0]) + '</div></div>' +
    '<div class="kpi"><div class="l">CPA anteayer</div><div class="v" style="font-size:19px">' + money(cpaDay[1]) + '</div></div>' +
    '<div class="kpi"><div class="l">CPA ayer</div><div class="v" style="font-size:19px">' + money(cpaDay[2]) + '</div></div>' +
    '<div class="kpi" style="--glow:rgba(var(--b-rgb),.4)"><div class="l">CPA ventana</div><div class="v" style="font-size:19px">' + money(cpaWin) + '</div><div class="s">Este decide</div></div>';
}
["l-nivel","l-g1","l-v1","l-g2","l-v2","l-g3","l-v3","l-pi3"].forEach(function(id){ $("#" + id).addEventListener("input", runPanel); $("#" + id).addEventListener("change", runPanel); });

var WIZ = [
  { q: "Ayer: ¿cero ventas, cero pagos iniciados y gastó el doble de la zona de apagar ({2A})?", yes: { c: "nr", t: "🛑 <b>APAGA.</b> Es la única excepción en la que se apaga por un solo día." }, no: 1 },
  { q: "¿Es el segundo día seguido con CPA por encima de la zona de apagar ({A})?", yes: { c: "nr", t: "🛑 <b>APAGA.</b> Regla dura: dos días seguidos en zona de apagar." }, no: 2 },
  { q: "¿Venías bien y ayer fue 50% o más caro que los días anteriores?", yes: { c: "ny", t: "↓ <b>BAJA UN ESCALÓN:</b> se devuelve el 20%. No apagues." }, no: 3 },
  { q: "¿El CPA de la ventana de 3 días está por encima del tope ({T})?", yes: { c: "ny", t: "↓ <b>BAJA UN ESCALÓN (−20%).</b> Está por encima del tope, pero no son dos días seguidos en zona de apagar." }, no: { c: "ng", t: "= <b>SOSTÉN.</b> Fue un día flojo, no la tendencia. Recorre la cadena: si el CPM subió por encima del máximo, toca creativos nuevos con el gancho en los primeros tres segundos." } }
];
function wizText(s){ return s.replace("{2A}", money(2 * S.apaga)).replace("{A}", money(S.apaga)).replace("{T}", money(S.tope)); }
function wiz(i){
  var w = WIZ[i];
  $("#wiz").innerHTML = '<div class="wiz-step">Pregunta ' + (i + 1) + ' de ' + WIZ.length + '</div><div class="wiz-q">' + wizText(w.q) + '</div><div class="row"><button class="btn sm" id="wy">Sí</button><button class="btn ghost sm" id="wn">No</button></div>';
  $("#wy").addEventListener("click", function(){ endWiz(w.yes); });
  $("#wn").addEventListener("click", function(){ if(typeof w.no === "number"){ wiz(w.no); } else { endWiz(w.no); } });
}
function endWiz(r){
  $("#wiz").innerHTML = '<div class="wiz-step">Resultado</div><div class="note ' + r.c + ' pop">' + r.t + '</div><div><button class="btn ghost sm" id="wr">Empezar otra vez</button></div>';
  $("#wr").addEventListener("click", function(){ wiz(0); });
}

/* ===================== Módulo 4 · Creativos ===================== */
var STAGES = [
  { k: "idea", n: "Ideas", c: "#9AA6B8" }, { k: "guion", n: "Guion", c: "#22D3EE" }, { k: "prod", n: "Producción", c: "#A78BFA" },
  { k: "test", n: "En testeo", c: "#EAB308" }, { k: "win", n: "Ganador", c: "#22C55E" }, { k: "out", n: "Retirado", c: "#EF4444" }
];
var DEF_CARDS = [
  { id: 1, t: "Unboxing del cubomundo con gancho de sonido magnético", s: "idea", d: Date.now() },
  { id: 2, t: "Niño armando una casa en 15 s (time-lapse)", s: "guion", d: Date.now() },
  { id: 3, t: "Comparación: bloques normales vs. magnéticos", s: "prod", d: Date.now() }
];
var cards = store.get("ns_cards", DEF_CARDS);
function isoWeek(d){
  var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  var day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  var y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return t.getUTCFullYear() + "-S" + Math.ceil((((t - y) / 86400000) + 1) / 7);
}
var WK = isoWeek(new Date());
var weekly = store.get("ns_week", {});
function saveCards(){ store.set("ns_cards", cards); }
function renderKanban(){
  var html = "";
  STAGES.forEach(function(st, si){
    var list = cards.filter(function(c){ return c.s === st.k; });
    html += '<div class="col"><div class="col-h"><span style="width:9px;height:9px;border-radius:50%;background:' + st.c + '"></span>' + st.n + '<span class="cnt">' + list.length + '</span></div>';
    list.forEach(function(c){
      var days = Math.floor((Date.now() - c.d) / 86400000);
      html += '<div class="kc"><div>' + c.t.replace(/</g, "&lt;") + '</div><div class="meta">' + (days === 0 ? "Hoy" : "Hace " + days + " día" + (days === 1 ? "" : "s")) + (st.k === "win" && days >= 7 ? ' · <span style="color:var(--y-ink)">prepara el reemplazo</span>' : "") + '</div><div class="acts">' +
        (si > 0 ? '<button data-mv="-1" data-id="' + c.id + '" aria-label="Mover atrás"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>' : "") +
        (si < STAGES.length - 1 ? '<button data-mv="1" data-id="' + c.id + '" aria-label="Mover adelante"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>' : "") +
        '<button class="del" data-del="' + c.id + '" aria-label="Eliminar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button></div></div>';
    });
    if(!list.length){ html += '<div class="small" style="padding:6px 2px">Vacío</div>'; }
    html += '</div>';
  });
  $("#kanban").innerHTML = html;
  $$("[data-mv]").forEach(function(b){
    b.addEventListener("click", function(){
      var c = cards.filter(function(x){ return x.id === +b.dataset.id; })[0];
      var idx = STAGES.map(function(s){ return s.k; }).indexOf(c.s), ni = idx + parseInt(b.dataset.mv, 10);
      c.s = STAGES[ni].k; c.d = Date.now();
      if(c.s === "test" && parseInt(b.dataset.mv, 10) === 1){ bumpWeek(1); toast("A testeo: +1 para mi meta semanal"); }
      if(c.s === "win"){ toast("Ganador. Empieza ya a preparar su reemplazo"); }
      saveCards(); renderKanban();
    });
  });
  $$("[data-del]").forEach(function(b){
    b.addEventListener("click", function(){ cards = cards.filter(function(x){ return x.id !== +b.dataset.del; }); saveCards(); renderKanban(); });
  });
}
$("#k-add").addEventListener("click", addCard);
$("#k-new").addEventListener("keydown", function(e){ if(e.key === "Enter"){ addCard(); } });
function addCard(){
  var t = $("#k-new").value.trim(); if(!t){ $("#k-new").focus(); return; }
  cards.push({ id: Date.now(), t: t, s: "idea", d: Date.now() }); $("#k-new").value = ""; saveCards(); renderKanban(); toast("Idea agregada al pipeline");
}
function bumpWeek(n){ weekly[WK] = Math.max(0, (weekly[WK] || 0) + n); store.set("ns_week", weekly); renderRing(); }
function renderRing(){
  var n = weekly[WK] || 0, circ = 389.6, p = Math.min(1, n / 5);
  $("#ringProg").style.strokeDashoffset = circ * (1 - p);
  $("#ringProg").setAttribute("stroke", n >= 4 ? "#22C55E" : n >= 2 ? "#EAB308" : "#EF4444");
  $("#ringNum").textContent = n;
  $("#weekLbl").textContent = "Semana " + WK.split("-S")[1];
  $("#ringMsg").textContent = n >= 4 ? "Cadencia al día: tengo reemplazo si el CPM se dispara." : n >= 2 ? "Voy a medias: me faltan " + (4 - n) + "–" + (5 - n) + " anuncios para mi meta." : "Sin reemplazo: si el CPM de mi ganador se dispara, no tengo creativo nuevo listo.";
}
$("#r-plus").addEventListener("click", function(){ bumpWeek(1); });
$("#r-minus").addEventListener("click", function(){ bumpWeek(-1); });

function culpa(){
  var p = $("#q-plat").value, cpm = val("q-cpm"), max = PLAT[p].cpm;
  var cpcCaro = $("#q-cpc").value === "si", cppiOk = $("#q-cppi").value === "si", h;
  if(cpm > max){
    h = '<div class="note nr pop"><b>Sí, es el creativo.</b> CPM de ' + money(cpm) + ' contra un máximo de ' + money(max) + ' en ' + PLAT[p].name + '. Creativos nuevos, con el gancho en los primeros tres segundos. Lo que viene después en la cadena es consecuencia: no lo juzgues todavía.</div>';
  } else if(cpcCaro){
    h = '<div class="note ny pop"><b>No es el creativo: es el producto.</b> El CPM está sano (' + money(cpm) + ') pero el CPC sale caro: la gente no quiere ver más información ni comprarlo. Otro video no lo arregla.</div>';
  } else if(cppiOk){
    h = '<div class="note nb pop"><b>No es el creativo: es la página, la oferta o el formulario.</b> El tráfico llega bien y la gente inicia el pago, pero no compra. Mejora la confianza y quita fricción.</div>';
  } else {
    h = '<div class="note ng pop"><b>El creativo está haciendo su trabajo.</b> CPM sano (' + money(cpm) + '). Sigue leyendo la cadena con los cortes del módulo 2.</div>';
  }
  $("#qOut").innerHTML = h;
}
["q-plat","q-cpm","q-cpc","q-cppi"].forEach(function(id){ $("#" + id).addEventListener("input", culpa); $("#" + id).addEventListener("change", culpa); });

/* ===================== Init ===================== */
renderPill();
costeo();
buildLadder();
renderLevel();
$("#l-nivel").value = 1;
runPanel();
wiz(0);
renderKanban();
renderRing();
culpa();
})();
