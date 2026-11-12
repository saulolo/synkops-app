// Utilidades DOM compartidas por todos los componentes de UI.
(() => {
  const ui = (globalThis.PYL.ui ??= {});

  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // Texto con negritas a partir de segmentos: string plano o { b: 'texto en negrita' }.
  const rich = (node, segments) => {
    node.textContent = '';
    segments.forEach((s) => {
      if (typeof s === 'string') node.append(s);
      else if (s.href) { const a = el('a', 'lnk', s.a); a.href = s.href; a.target = '_blank'; a.rel = 'noopener'; node.append(a); }
      else node.append(el('b', null, s.b));
    });
  };

  // Indicador de estado (punto + texto) de las tarjetas KPI. Sin texto queda oculto.
  function chip(id, cls, text) { const c = $(id); c.className = 'chip ' + (cls || ''); c.textContent = text || ''; }

  // Marca el botón activo de un grupo segmentado (.seg).
  function setPressed(group, selector, active) {
    group.querySelectorAll(selector).forEach((x) => { const on = x === active; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
  }

  // Copia texto al portapapeles; si el navegador bloquea la API, usa un textarea temporal. Devuelve true si copió.
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch {
      const ta = el('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch { /* sin portapapeles */ }
      ta.remove(); return ok;
    }
  }

  // Ruta de una pestaña (.b-route, .hm-route): marca con .on y aria-current el enlace de la sección en la que estoy.
  // Empieza en el primero; cambia al tocar un enlace y al desplazar la página (la última sección que ya pasó bajo la barra superior).
  function route(nav) {
    const links = [...nav.querySelectorAll('a[href^="#"]')];
    if (!links.length) return;
    let lock = 0, tick = false;
    const mark = (a) => links.forEach((x) => { const on = x === a; x.classList.toggle('on', on); if (on) x.setAttribute('aria-current', 'true'); else x.removeAttribute('aria-current'); });
    const spy = () => {
      tick = false;
      if (Date.now() < lock || !nav.offsetParent) return;   // recién toqué un enlace, o la pestaña está oculta
      let cur = links[0];
      for (const a of links) { const t = $(a.getAttribute('href')); if (t && t.getBoundingClientRect().top <= 140) cur = a; }
      mark(cur);
    };
    links.forEach((a) => a.addEventListener('click', () => { lock = Date.now() + 900; mark(a); }));
    window.addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(spy); } }, { passive: true });
    mark(links[0]);
  }

  ui.dom = { $, el, rich, chip, setPressed, copy, route };
})();
