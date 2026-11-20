// Inicio (SPEC 18): saludo según la hora y frase de la media jornada (lista local core.homeQuotes).
// Los dos se calculan al cargar y no se actualizan en vivo. No usa red ni localStorage.
(() => {
  const PYL = globalThis.PYL;
  const C = PYL.core.home, U = PYL.ui.home;
  const helloNode = document.getElementById('home-hello');
  const quoteNode = document.getElementById('home-quote');
  if (!helloNode || !quoteNode) return;

  const now = new Date();
  U.hello(helloNode, C.homeGreeting(now.getHours()), C.HOME_NAME);

  const q = C.homePick(PYL.core.homeQuotes.HOME_QUOTES, now);
  PYL.app.state.home = q ? { slot: q.slot, text: q.text, author: q.author } : { slot: null, text: '', author: '' };
  U.quote(quoteNode, q);
})();
