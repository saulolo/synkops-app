// Reloj de pared en el margen izquierdo de la barra superior (SPEC 20). Solo decorativo: sin clic ni guardado.
(() => {
  const PYL = globalThis.PYL;
  const C = PYL.core.clock, U = PYL.ui.clock;
  const root = document.getElementById('ck-root');
  if (!root) return;

  // Pinta el reloj con la hora de `date`. Se publica para las pruebas (con Date simulado).
  // Día y fecha se recalculan en cada pintada: a medianoche cambian solos.
  const tick = (date) => U.paint(root, { angles: C.ckAngles(date), day: C.ckDay(date), date: C.ckDate(date), label: C.ckLabel(date) });

  U.face(root);
  tick(new Date()); // una vez al cargar, aunque esté oculto
  PYL.app.clock = { tick };

  // Bucle: solo con la pestaña visible y la pantalla de 1680 px o más (si no, no se ve: no gasta CPU).
  // Sin matchMedia (jsdom) no hay bucle; sin requestAnimationFrame cae al temporizador por minuto.
  const mm = (q) => (typeof window.matchMedia === 'function' ? window.matchMedia(q) : null);
  const wide = mm('(min-width: 1680px)');
  const calm = mm('(prefers-reduced-motion: reduce)');
  const raf = typeof window.requestAnimationFrame === 'function';
  let frame = 0, timer = 0;

  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    if (timer) clearTimeout(timer);
    frame = 0; timer = 0;
  };
  const loop = () => { tick(new Date()); frame = requestAnimationFrame(loop); };
  // Con «reducir movimiento»: una pintada al empezar cada minuto exacto (sin segundero: lo oculta el CSS).
  const perMinute = () => {
    const now = new Date();
    tick(now);
    timer = setTimeout(perMinute, 60000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 20);
  };
  const sync = () => {
    stop();
    if (document.hidden || !wide || !wide.matches) return;
    if ((calm && calm.matches) || !raf) perMinute(); else loop();
  };
  const watch = (m) => {
    if (!m) return;
    if (typeof m.addEventListener === 'function') m.addEventListener('change', sync);
    else if (typeof m.addListener === 'function') m.addListener(sync);
  };

  document.addEventListener('visibilitychange', sync);
  watch(wide);
  watch(calm);
  sync();
})();
