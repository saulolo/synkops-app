// Tema de colores: <html data-theme>. Se carga en <head> para aplicarlo antes de pintar
// y se recuerda en este navegador. Por defecto, oscuro. Los colores de cada tema viven al final de base.css.
(() => {
  const app = ((globalThis.PYL ??= {}).app ??= {});
  const KEY = 'pyl-theme';
  const root = document.documentElement;

  // bg/accent solo pintan la muestra del menú.
  const THEMES = [
    { id: 'dark', name: 'Dark', note: 'Azul y cian, el de siempre', bg: '#080B10', accent: '#6378FF' },
    { id: 'light', name: 'Light', note: 'Fondo blanco, para el día', bg: '#F4F6FA', accent: '#4F5FE8' },
    { id: 'gold', name: 'Gold', note: 'Negro y amarillo NovaSociety', bg: '#070707', accent: '#F5C451' },
    { id: 'ember', name: 'Ember', note: 'Negro con naranja encendido', bg: '#0A0A0A', accent: '#F97316' },
    { id: 'idea', name: 'IntelliJ Dark', note: 'Grises planos de la IDE', bg: '#1E1F22', accent: '#3574F0' },
    { id: 'idea-gold', name: 'IntelliJ Gold', note: 'Grises de la IDE con dorado', bg: '#1E1F22', accent: '#F5C451' },
    { id: 'nebula', name: 'Nebula', note: 'Violeta y fucsia de noche', bg: '#0B0915', accent: '#8B5CF6' },
  ];
  const byId = (id) => THEMES.find((t) => t.id === id);

  function swatch(node, t) {
    node.style.setProperty('--s-bg', t.bg);
    node.style.setProperty('--s-a', t.accent);
  }

  function apply(id) {
    const t = byId(id) || THEMES[0];
    root.dataset.theme = t.id;
    const name = document.getElementById('theme-name');
    if (!name) return;
    name.textContent = t.name;
    const tb = document.getElementById('theme-btn');
    if (tb) tb.title = 'Tema: ' + t.name + ' (clic para cambiar)';
    swatch(document.getElementById('theme-sw'), t);
    document.querySelectorAll('#theme-menu [data-id]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === t.id)));
  }

  function set(id) {
    apply(id);
    try { localStorage.setItem(KEY, root.dataset.theme); } catch { /* sin almacenamiento */ }
  }

  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch { /* sin almacenamiento */ }
  apply(saved);

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('theme-btn');
    const menu = document.getElementById('theme-menu');

    THEMES.forEach((t) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.setAttribute('role', 'menuitemradio');
      item.dataset.id = t.id;
      const sw = document.createElement('span');
      sw.className = 'theme-sw';
      swatch(sw, t);
      const txt = document.createElement('span');
      const b = document.createElement('b');
      b.textContent = t.name;
      const small = document.createElement('small');
      small.textContent = t.note;
      txt.append(b, small);
      item.append(sw, txt);
      menu.append(item);
    });

    const open = (on) => {
      menu.hidden = !on;
      btn.setAttribute('aria-expanded', String(on));
      if (on) menu.querySelector('[aria-checked="true"]')?.focus();
    };

    btn.addEventListener('click', () => open(menu.hidden));
    menu.addEventListener('click', (e) => {
      const item = e.target.closest('[data-id]');
      if (!item) return;
      set(item.dataset.id);
      open(false);
      btn.focus();
    });
    // Flechas para moverse entre temas; Escape o clic afuera cierran.
    menu.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const items = [...menu.querySelectorAll('[data-id]')];
      const i = items.indexOf(document.activeElement);
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menu.hidden) { open(false); btn.focus(); }
    });
    document.addEventListener('click', (e) => {
      if (!menu.hidden && !e.target.closest('.theme-pick')) open(false);
    });

    apply(root.dataset.theme);
  });

  app.theme = { set, get: () => root.dataset.theme, list: () => THEMES.map((t) => t.id) };
})();
