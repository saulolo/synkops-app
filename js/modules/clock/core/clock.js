// Reloj de pared de la barra superior (SPEC 20). Solo reglas puras: sin DOM.
// Nombres con prefijo ck/CK_ para no chocar al aplanar en js/index.js.
// Días y meses copiados de modules/tasks/core/tasks.js a propósito: clock no depende de tasks.
(() => {
  const core = globalThis.PYL.core;

  const CK_DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const CK_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  // Ángulo de cada aguja en grados: 0 = las 12, sentido horario. El segundero suma milisegundos (giro continuo).
  const ckAngles = (date) => {
    const hh = date.getHours();
    const mm = date.getMinutes();
    const ss = date.getSeconds();
    const ms = date.getMilliseconds();
    return {
      h: (hh % 12) * 30 + mm * 0.5 + ss / 120,
      m: mm * 6 + ss * 0.1,
      s: ss * 6 + ms * 0.006,
    };
  };

  const ckDay = (date) => CK_DAYS[date.getDay()];

  const ckDate = (date) => `${date.getDate()} ${CK_MONTHS[date.getMonth()]}`;

  // 12 horas: '10:42 a. m.', '3:05 p. m.', '12:05 a. m.'.
  const ckTime = (date) => {
    const hh = date.getHours();
    const h12 = hh % 12 || 12;
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${h12}:${mm} ${hh < 12 ? 'a. m.' : 'p. m.'}`;
  };

  const ckLabel = (date) => `${ckDay(date)}, ${ckDate(date)} · ${ckTime(date)}`;

  core.clock = { CK_DAYS, CK_MONTHS, ckAngles, ckDay, ckDate, ckTime, ckLabel };
})();
