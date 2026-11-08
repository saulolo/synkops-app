// Navegación entre pestañas de toda la app (antes vivía dentro de trainer.js).
// Abre la vista, recuerda la última en localStorage (ns_view) y avisa con el evento nav:vista
// (document, detail = { v }) para que cada módulo reaccione al abrirse su pestaña.
// Se carga después de trainer.js y antes de main.js, así la vista inicial se abre en el mismo punto que antes.
(function(){
"use strict";

var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var store = {
  get: function(k, d){ try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch(e){ return d; } },
  set: function(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
};

function go(v){
  $$(".view").forEach(function(s){ s.classList.toggle("on", s.id === "v-" + v); });
  $$("#tabs button").forEach(function(b){ if(b.dataset.v === v){ b.setAttribute("aria-current", "page"); } else { b.removeAttribute("aria-current"); } });
  store.set("ns_view", v);
  window.scrollTo({ top: 0, behavior: "smooth" });
  document.dispatchEvent(new CustomEvent("nav:vista", { detail: { v: v } }));
  if(v === "pyl"){ window.dispatchEvent(new Event("resize")); } // el tablero mide sus gráficas al hacerse visible
}
$$("#tabs button").forEach(function(b){ b.addEventListener("click", function(){ go(b.dataset.v); }); });
$$("[data-go]").forEach(function(b){ b.addEventListener("click", function(){ go(b.dataset.go); }); });

var vista0 = store.get("ns_view", "dash");
if(!document.getElementById("v-" + vista0)){ vista0 = "dash"; } // una vista que ya no existe (ej. "sim") abre Inicio
go(vista0);
})();
