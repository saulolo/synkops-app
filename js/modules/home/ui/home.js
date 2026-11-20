// Inicio (SPEC 18): pinta el saludo y la frase del día en la tarjeta .hero. Recibe datos por parámetro; no guarda estado.
(() => {
  const PYL = globalThis.PYL;

  // Dos renglones: «Buenas tardes,» pequeño y el nombre grande debajo (el espacio deja el texto como «Buenas tardes, Saúl»).
  const hello = (node, greeting, name) => {
    const { el } = PYL.ui.dom;
    node.replaceChildren(el('span', 'home-greet', `${greeting},`), ' ', el('span', 'home-name', name));
  };

  // root = #home-quote; q = { slot, label, text, author } (core.home.homePick). Sin frase (null), el bloque se oculta.
  const quote = (root, q) => {
    root.hidden = !q;
    if (!q) return;
    root.dataset.slot = q.slot === 0 ? 'manana' : 'tarde';
    root.querySelector('.home-quote-label').textContent = q.label;
    root.querySelector('#home-quote-text').textContent = `“${q.text}”`;
    root.querySelector('#home-quote-author').textContent = `— ${q.author}`;
  };

  PYL.ui.home = { hello, quote };
})();
