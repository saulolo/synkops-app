// Navegación entre pestañas de toda la app (antes vivía dentro de trainer.js).
// Abre la vista y avisa con el evento nav:vista
// (document, detail = { v }) para que cada módulo reaccione al abrirse su pestaña.
// Se carga después de trainer.js y antes de main.js, así la vista inicial se abre en el mismo punto que antes.
// La app arranca siempre en Inicio (SPEC 17): ya no se recuerda la última pestaña (ns_view).
(function(){
"use strict";

var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

function go(v){
  $$(".view").forEach(function(s){ s.classList.toggle("on", s.id === "v-" + v); });
  $$("#tabs button").forEach(function(b){ if(b.dataset.v === v){ b.setAttribute("aria-current", "page"); } else { b.removeAttribute("aria-current"); } });
  window.scrollTo({ top: 0, behavior: "smooth" });
  document.dispatchEvent(new CustomEvent("nav:vista", { detail: { v: v } }));
  if(v === "pyl"){ window.dispatchEvent(new Event("resize")); } // el tablero mide sus gráficas al hacerse visible
}
$$("#tabs button").forEach(function(b){ b.addEventListener("click", function(){ go(b.dataset.v); }); });
$$("[data-go]").forEach(function(b){ b.addEventListener("click", function(){ go(b.dataset.go); }); });

go("dash");
})();
