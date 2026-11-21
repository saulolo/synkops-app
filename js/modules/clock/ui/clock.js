// Reloj de pared de la barra superior (SPEC 20): arma la esfera y el texto. No guarda estado.
(() => {
  const PYL = globalThis.PYL;

  const C = 50; // centro del viewBox 0 0 100 100
  const r1 = (n) => Math.round(n * 100) / 100;
  // Punto a `r` del centro en el ángulo `deg` (0 = las 12, sentido horario).
  const at = (deg, r) => {
    const a = (deg * Math.PI) / 180;
    return [r1(C + r * Math.sin(a)), r1(C - r * Math.cos(a))];
  };

  // 12, 3, 6 y 9 llevan número; las otras 8 horas, una rayita.
  const NUMS = { 0: '12', 3: '3', 6: '6', 9: '9' };

  const dial = () => {
    let ticks = '', nums = '';
    for (let i = 0; i < 12; i++) {
      if (NUMS[i]) {
        const [x, y] = at(i * 30, 34);
        nums += `<text class="ck-num" x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central">${NUMS[i]}</text>`;
      } else {
        const [x1, y1] = at(i * 30, 37);
        const [x2, y2] = at(i * 30, 42);
        ticks += `<line class="ck-tick" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
      }
    }
    return '<svg id="ck-face" class="ck-face" viewBox="0 0 100 100" aria-hidden="true" focusable="false">'
      + '<circle class="ck-dial" cx="50" cy="50" r="47"/>'
      + ticks + nums
      + '<line class="ck-h" x1="50" y1="50" x2="50" y2="27"/>'
      + '<line class="ck-m" x1="50" y1="50" x2="50" y2="15"/>'
      + '<line class="ck-s" x1="50" y1="58" x2="50" y2="12"/>'
      + '<circle class="ck-pin" cx="50" cy="50" r="3"/>'
      + '</svg>';
  };

  // Arma dentro de `node` la esfera (rayitas, números, agujas y punto central) y el texto del día y la fecha.
  const face = (node) => {
    node.innerHTML = dial()
      + '<div class="ck-text" aria-hidden="true"><span class="ck-day" id="ck-day"></span><span class="ck-date" id="ck-date"></span></div>';
  };

  // Escribe solo si cambió (el bucle pinta a 60 fps y los textos cambian una vez por minuto).
  const setText = (n, v) => { if (n && n.textContent !== v) n.textContent = v; };
  const setAttr = (n, k, v) => { if (n && n.getAttribute(k) !== v) n.setAttribute(k, v); };
  const rot = (g) => `rotate(${r1(g)} 50 50)`; // dos decimales: sobra para 84 px

  // Gira las agujas y escribe día, fecha y la etiqueta para lectores de pantalla.
  const paint = (node, { angles, day, date, label }) => {
    setAttr(node.querySelector('.ck-h'), 'transform', rot(angles.h));
    setAttr(node.querySelector('.ck-m'), 'transform', rot(angles.m));
    setAttr(node.querySelector('.ck-s'), 'transform', rot(angles.s));
    setText(node.querySelector('#ck-day'), day);
    setText(node.querySelector('#ck-date'), date);
    setAttr(node, 'aria-label', label);
    setAttr(node, 'title', label);
  };

  PYL.ui.clock = { face, paint };
})();
