# SPEC 05 — Módulo Escalado: Fase de testeo

> **Estado:** Implementado
> **Depende de:** SPEC 02, SPEC 04
> **Fecha:** 2026-11-08
> **Objetivo:** Crear la pestaña "Escalado" (después de Métricas), un módulo informativo para aprender la metodología de NovaSociety, con un primer apartado "Fase de testeo" en forma de paso a paso guiado que termina en un simulacro interactivo de los cortes de 20K / 30K / 40K.

## Por qué existe esta spec

La parte del testeo cuesta seguirla en frío: hay que decidir en cada corte de gasto si se apaga, se mantiene o se deja gastar, y las reglas cambian según pagos iniciados, ventas y CPPI. Este módulo la enseña paso a paso y la vuelve interactiva para interiorizarla.

**Es un módulo de aprendizaje, no de análisis.** No lee campañas reales ni datos del usuario. Un módulo dinámico con las métricas reales de las campañas que estén corriendo vendrá aparte, en otra spec.

Es un **módulo nuevo** (`js/modules/scaling/`), no un apartado de Métricas. Se crea desde cero: la pestaña Escalera y el Simulador del entrenador (`trainer.js`) no se miran ni se tocan; se revisan en otra spec.

Fuentes:

- **Reglas:** el MCP de NovaSociety (`reglas_de_juan`, COP) manda. Es la misma regla de la infografía "Protocolo de testeo" del usuario.
- **Cómo lo analiza el Lab de NovaSociety** (revisado con `reglas_de_juan`, `listar_productos` y `ver_producto`):
  - Página "Los testeos · ¿Cuál sigue y cuál apago?": califica cada campaña del reporte con los puntos críticos 20, 30 y 40 mil de gasto, **con 100.000 al día**. Por día lee gasto, pagos iniciados y compras.
  - Nombres de los umbrales (`sop_en_cop`): `cortes` [20000, 30000, 40000], `piMinimo` 3, `piBien` 5, `cppiBueno` 4000, `cppiFlojo` 5000, `cppiApaga` 6000, `presupuestoTesteo` 100000.
  - El **tope** es el CPA máximo del costeo de cada producto. Las zonas salen de él: escala = tope × 0,8 y apaga = tope × 4/3. Ejemplos del Lab: tope 20.617 → escala 16.494, apaga 27.489; tope 32.617 → escala 26.094, apaga 43.489 (redondeo normal a peso; el Lab usa topes con decimales). Con el tope genérico 15.000 dan 12.000 y 20.000 (`GENERIC_CPA`). Los cortes del testeo no cambian con el tope.
  - El veredicto de cada producto tiene la forma `{ fase, veredicto, toca, detalle, dura, senales }`. Fases: idea → testeo → escalando → apagado. `dura` marca una regla que no se discute.
  - Frases del Lab que se usan tal cual: "apágalo, a nadie le interesa (revisa el CPM y el CPC)", "flojo, se mantiene", "si ya hay venta, maravilloso", "bastante flojo", "buen pronóstico", "apágalo, aunque el CPPI sea bueno (entonces es el formulario o la oferta)", "déjalo gastar el día entero".
  - Ningún dato de productos del usuario entra al código: los ejemplos son inventados.
- **Material del usuario que no entra:** la matriz "Surfing Scaling" (0 PI apaga en 20K, 🎯 candidato con CPA < 15.000 o CPPI < 3.000, Surfing Scaling con CPA < 12.000 en 40K, cierre del día con CPA < 20.000 + CPPI < 5.000) choca con el MCP y queda fuera. Las notas de escalado (+20 % cada 1–2 horas, máximo 3 veces al día, nunca bajar más de 20 %) y los niveles N1–N15 son de la fase de escalado: van en la spec de Surfing Scaling, contrastadas con el MCP.
- **El MCP no nombra "Surfing Scaling".** Sí trae las reglas de "Escalando" (+20 % por escalón, ventana de 3 días, regla dura de apagado), que se usarán en esa spec.

Reglas del testeo según el MCP (por conjunto, con su **gasto acumulado**, no por horas ni días):

| Corte | Condición | Veredicto (frase del Lab / MCP) |
|---|---|---|
| 20.000 | 1 venta o más | Si ya hay venta, maravilloso |
| 20.000 | 0, 1 o 2 pagos iniciados | Apágalo, a nadie le interesa (revisa el CPM y el CPC) |
| 20.000 | 3 o 4 pagos iniciados | Flojo, se mantiene |
| 20.000 | 5 pagos iniciados o más | Bien |
| 30.000 sin ventas | CPPI > 6.000 | Apágalo |
| 30.000 sin ventas | 5.000 < CPPI ≤ 6.000 | Bastante flojo |
| 30.000 sin ventas | CPPI ≤ 5.000 | Se sostiene |
| 30.000 con venta | CPPI < 4.000 | Buen pronóstico |
| 30.000 con venta | 4.000 ≤ CPPI ≤ 5.000 | Se sostiene |
| 30.000 con venta | CPPI > 5.000 | Flojo |
| 40.000 | 0 ventas | Apágalo, aunque el CPPI sea bueno (entonces es el formulario o la oferta) |
| 40.000 | 2 ventas o más y CPA ≤ tope ("varias ventas rentables") | Déjalo gastar el día entero: pasa a escalado |
| 40.000 | 1 venta, o 2+ ventas con CPA > tope | **Regla propia** (el MCP no la da): mantener vigilando |

## Alcance

**Dentro:**

- **Pestaña nueva "Escalado"** en la barra superior, después de "Métricas" (`data-v="escalado"`, vista `#v-escalado`).
  - Encabezado: eyebrow, título "Escalado", un lead que dice que es para aprender la metodología (no lee campañas reales) y la etiqueta "Criterio NovaSociety".
  - **Sub-pestañas** `#es-parts`, como las de Desarrollo: "🧪 Fase de testeo" (`data-part="test"`) y "🏄 Surfing Scaling" (`data-part="surf"`). Se recuerda la elegida.
  - "Surfing Scaling" muestra solo una tarjeta "Pronto" (`#es-soon`) con lo que vendrá: escalado vertical +20 %, niveles y refresco de campañas.
- **Apartado Fase de testeo** (`#es-test`): **paso a paso guiado**, con el mismo formato de la guía de Meta Ads: lista de pasos a la izquierda (`#es-steps`), detalle del paso activo a la derecha (`#es-step`) y barra de avance arriba (`#es-prog`). Cada paso se marca como hecho; el avance se guarda.
- **Los 6 pasos** (`TEST_STEPS`):
  1. **Arranque.** Cómo empieza el testeo según el Lab: 100.000 al día. La **barra de gasto acumulado** (`.es-bar`): "El testeo se mide por gasto acumulado, no por horas ni días", con marcas en 20K, 30K, 40K y el fin del día en 100.000; los tres cortes caen el mismo día. Nota: con la guía ABO de Meta Ads (4 conjuntos × 30.000) cada conjunto se califica con su propio gasto acumulado, y el corte de 40K le llega el día 2. Regla: dejar correr sin tocar hasta 20.000.
  2. **Corte 1 · 20.000.** Qué se mira (pagos iniciados) y el semáforo rojo / amarillo / verde con sus reglas. Un mini-ejemplo resuelto (números de un caso y su veredicto).
  3. **Corte 2 · 30.000.** Qué se mira (CPPI = gasto ÷ pagos iniciados) y el semáforo partido en "Sin ventas" y "Con venta". Mini-ejemplo resuelto.
  4. **Corte 3 · 40.000.** Qué se mira (ventas y CPA contra el tope) y el semáforo. La rama sin regla del MCP lleva la marca "Regla propia". Mini-ejemplo resuelto. Si deja gastar el día, pasa a escalado (apartado "Surfing Scaling", hoy "Pronto").
     - **Caja "¿De dónde sale el tope?"** (`.es-tope`): "El tope es el CPA máximo de tu costeo". Muestra el genérico 15.000 y sus zonas: escala 12.000 (tope × 0,8) y apaga 20.000 (tope × 4/3), con un ejemplo de tope distinto (20.617 → 16.494 / 27.489). Las zonas se usan al escalar; en el testeo solo cuenta el tope.
  5. **Si se apagó: la cadena.** CPM → CPC → CPPI → CPA y "No se mira el CTR". Tres lecturas con la solución del MCP:
     - CPM caro (> 20.000 en Meta, > 6.000 en TikTok): creativos nuevos, con el hook en los primeros tres segundos.
     - CPM sano y CPC caro: el producto no interesa.
     - Buen CPPI y sin ventas: el problema es la página, la oferta o el formulario; mejorar la confianza y quitar la fricción.
     - Nota final: no apagar antes de cruzar un corte, salvo zona de apagado.
  6. **Practica.** El **simulacro** (`#es-sim`), con dos modos: "🎯 Práctica" y "🎛️ Juega con los números" (`#es-modes`). Se recuerda el modo abierto.
- **Mapa de los 3 cortes** (`.es-cuts`): las tres tarjetas de semáforo de los pasos 2–4 juntas. Se ve en el paso 6, encima del simulacro, y el simulacro ilumina la rama del caso (`.es-on`). En los pasos 2–4 cada uno muestra solo su tarjeta.
- **Modo práctica** (carrera con decisiones):
  - Banco fijo de 8 casos de ejemplo (`TEST_CASES`), en orden al azar en cada ronda. Cada caso es un conjunto inventado con sus números en cada corte.
  - Botón "Avanzar": la barra del caso se llena animada hasta el siguiente corte y aparecen gasto, pagos iniciados, ventas, CPPI y CPA del caso.
  - Cuatro botones de decisión: 🛑 Apagar · ⚠️ Mantener vigilando · ✅ Seguir sin tocar · 🚀 Dejar gastar el día.
  - Al elegir, la app dice si acerté y por qué (veredicto MCP y su explicación), ilumina la rama en el mapa y ofrece "Ver el paso" (lleva al paso del corte). Si la respuesta correcta es Apagar o Dejar gastar el día, el caso termina; si no, sigue al siguiente corte.
  - Al final de la ronda: aciertos / decisiones, el mejor puntaje guardado y el botón "Otra ronda".
  - Los casos usan presupuesto de 100.000 y tope de 15.000. No traen la respuesta escrita: la calcula `testVerdict`.
  - Los mini-ejemplos de los pasos y la explicación de cada decisión dicen "Así lo califica el Lab de NovaSociety" y usan sus frases.
- **Modo "Juega con los números"** (explorar "¿qué pasa si…?", no analizar campañas reales):
  - Campos: presupuesto diario (100.000), gasto acumulado (deslizador y número), pagos iniciados, ventas y CPA tope (15.000). Todos editables.
  - Al cambiar cualquier campo: corte alcanzado, día del testeo, CPPI y CPA calculados, semáforo con el veredicto y su explicación. La barra y el mapa se iluminan igual que en la práctica.
  - Bajo el tope se ven sus zonas calculadas: escala y apaga.
  - Antes de 20.000: "Deja correr sin tocar: todavía no llega al corte 1".
  - Ventas > pagos iniciados: aviso "Las ventas no pueden ser más que los pagos iniciados" y sin veredicto.
- Datos en `core`, pintado en `ui`, estado en `app`, persistencia en `services.storage.scaling`. Estilos en `css/modules/scaling.css`.
- Pruebas en `tests/core.test.js` y `tests/smoke.test.js`.
- Actualizar `CLAUDE.md` y `README.md` después del merge.

**Fuera (para specs futuras):**

- **Leer métricas reales** de campañas que estén corriendo (Meta, TikTok, CSV o MCP). Va en un módulo dinámico aparte.
- **Surfing Scaling** (escalado vertical +20 %, ventana de 3 días, regla dura) y sus choques con las notas del usuario (cada 1–2 horas, máximo 3 veces al día).
- Niveles N1–N15 y sus rangos de presupuesto.
- Refresco de campañas (rotación 1–2 semanas, 4–5 anuncios nuevos por semana).
- Los umbrales de la matriz del usuario que no están en el MCP (🎯 candidato, CPA < 12.000 para escalar, cierre del día con CPA < 20.000 + CPPI < 5.000).
- Revisar, mover o borrar las pestañas Simulador y Escalera del entrenador.
- Varios conjuntos a la vez en el simulacro (apagar unos y dejar otros).
- Tomar el CPA tope del Costeo o de un producto real.
- Historial de rondas de práctica.
- TikTok como plataforma propia del testeo (Smart). La cadena sí cita su CPM.

## Modelo de datos

### `js/modules/scaling/core/scaling.js` → `PYL.core.scaling`

```js
// Números del MCP (reglas_de_juan, COP). Lo que ya existe se reutiliza:
//   cortes y presupuesto ← PYL.core.metrics.NS_TEST (cuts 20000/30000/40000, budget 100000)
//   tope genérico        ← PYL.core.metrics.GENERIC_CPA.tope (15000)
//   nota ABO             ← PYL.core.ads.ADS.daily (30000) y ADS.sets (4)
// Nombres de los umbrales iguales a los del Lab (sop_en_cop).
const TEST_RULES = {
  piMinimo: 3, piBien: 5,                         // corte 20K: 0–2 apaga, 3–4 flojo, 5+ bien
  cppiBueno: 4000, cppiFlojo: 5000, cppiApaga: 6000, // corte 30K
  ventasGastar: 2,                                // corte 40K: 2+ ventas y CPA ≤ tope
};

// Zonas del CPA a partir del tope (CPA máximo del costeo), como el Lab.
const CPA_ZONES = { escala: 0.8, apaga: 4 / 3 };
// cpaZones(tope) → { escala, tope, apaga } redondeados a peso. cpaZones(15000) = GENERIC_CPA.

// Las cuatro decisiones de la práctica. Cada veredicto cae en una.
const TEST_ACTIONS = [
  { k: 'off',   t: 'Apagar',               icon: '🛑' },
  { k: 'watch', t: 'Mantener vigilando',   icon: '⚠️' },
  { k: 'go',    t: 'Seguir sin tocar',     icon: '✅' },
  { k: 'spend', t: 'Dejar gastar el día',  icon: '🚀' },
];

// Veredicto de un conjunto. Devuelve datos, no HTML.
// Misma forma que el veredicto del Lab ({ fase, veredicto, toca, detalle, dura, senales }) más lo que pinta la UI.
// testVerdict({ spend, pi, sales, tope }) →
//   { fase: 'testeo' | 'escalando' | 'apagado',   // 'escalando' cuando deja gastar el día; 'apagado' cuando se apaga
//     veredicto: 'APÁGALO' | 'FLOJO' | 'BASTANTE FLOJO' | 'SE SOSTIENE' | 'BIEN' | 'BUEN PRONÓSTICO' | 'MARAVILLOSO' | 'DÉJALO GASTAR EL DÍA' | 'DEJA CORRER',
//     toca: 'Apagar' | 'Mantener vigilando' | 'Seguir sin tocar' | 'Dejar gastar el día' | 'Dejar correr',
//     detalle: [segmentos],    // la frase del Lab
//     dura: false,             // en el testeo ninguna regla es dura
//     senales: [segmentos],    // los números que la deciden: "CPPI $ 6.000 (apaga sobre $ 6.000)", …
//     cut: 0|1|2|3,            // 0 = antes de 20K
//     v: 'wait'|'off'|'weak'|'hold'|'good'|'great'|'spend'|'own',
//     action: 'off'|'watch'|'go'|'spend'|null,   // null en 'wait'
//     light: 'r'|'y'|'g'|null,
//     branch: 'c1-off' | 'c2-nosale-weak' | 'c3-own' | …,  // rama a iluminar en el mapa
//     step: 2|3|4|null,        // paso de TEST_STEPS que explica el corte ("Ver el paso")
//     cppi, cpa }              // null si el divisor es 0
// detalle y senales son segmentos para PYL.ui.dom.rich.
// Mapeo: off→off · weak, hold, own→watch · good, great→go · spend→spend.

// testCheck({ spend, pi, sales, tope, daily }) → null | 'Las ventas no pueden ser más que los pagos iniciados' | …
// testDay(spend, daily) → número de día del testeo (1, 2, …).
// testRange(daily) → máximo del deslizador = último corte + daily.

// Los 6 pasos. Mismo formato que los pasos de la guía de Meta Ads (k, t, p, tip…) más:
//   cut: 1|2|3     → el paso muestra la tarjeta de ese corte del mapa
//   example: { spend, pi, sales }  → mini-ejemplo resuelto con testVerdict (pasos 2–4)
//   tool: 'bar' | 'chain' | 'sim'  → bloque propio que pinta ui.scaling
const TEST_STEPS = [ /* arranque, corte1, corte2, corte3, cadena, practica */ ];

// Tarjetas del mapa: TEST_CUTS = [{ cut: 1, head, branches: [{ id: 'c1-off', light: 'r', t: […], own? }] }, …]
// Cadena: TEST_CHAIN. Cabecera y sub-pestañas: TEST_HEAD, SCALING_PARTS.

// Banco de práctica: números en cada corte; la respuesta la calcula testVerdict.
const TEST_CASES = [
  { id: 'c1', name: 'Conjunto 1', at: [{ spend: 20000, pi: 1, sales: 0 }] },
  // … 8 casos (tabla abajo)
];
```

Banco de casos (respuesta esperada = la que da `testVerdict`; presupuesto 100.000, tope 15.000; los tres cortes caen el día 1):

| Caso | 20K | 30K | 40K |
|---|---|---|---|
| 1 | 1 PI, 0 ventas → Apagar | — | — |
| 2 | 0 PI → Apagar | — | — |
| 3 | 3 PI → Mantener | 4 PI, 0 ventas (CPPI 7.500) → Apagar | — |
| 4 | 5 PI → Seguir | 6 PI, 0 ventas (CPPI 5.000) → Mantener | 0 ventas → Apagar (oferta o formulario) |
| 5 | 2 PI, 1 venta → Seguir (maravilloso) | 9 PI, 2 ventas (CPPI 3.333) → Seguir | 3 ventas (CPA 13.333) → Dejar gastar el día |
| 6 | 4 PI → Mantener | 7 PI, 1 venta (CPPI 4.286) → Mantener | 2 ventas (CPA 20.000 > tope) → Mantener (regla propia) |
| 7 | 5 PI → Seguir | 5 PI, 0 ventas (CPPI 6.000) → Mantener (bastante flojo) | 1 venta → Mantener (regla propia) |
| 8 | 6 PI, 1 venta → Seguir | 5 PI, 1 venta (CPPI 6.000) → Mantener (flojo) | 3 ventas (CPA 13.333) → Dejar gastar el día |

Convenciones:

- `core` no toca el DOM. Los textos son segmentos (`string`, `{ b }`) para `PYL.ui.dom.rich`.
- Ningún número del MCP se escribe dos veces: cortes, presupuesto y tope vienen de `PYL.core.metrics`; los 30.000 y los 4 conjuntos de la nota ABO de `PYL.core.ads`; el CPM máximo de la cadena sale de `HARD_METRICS`. Las zonas se calculan con `cpaZones`.
- Los mini-ejemplos de los pasos 2–4 no traen el veredicto escrito: lo calcula `testVerdict`.
- Los límites siguen al MCP al pie de la letra: CPPI exactamente 6.000 sin ventas es "bastante flojo" (apaga solo por encima); exactamente 5.000 con venta "se sostiene".
- Nombres nuevos únicos entre todos los `core` (se aplanan en `js/index.js`): `TEST_RULES`, `TEST_ACTIONS`, `TEST_CASES`, `TEST_HEAD`, `TEST_STEPS`, `TEST_CUTS`, `TEST_CHAIN`, `SCALING_PARTS`, `CPA_ZONES`, `testVerdict`, `testCheck`, `testDay`, `testRange`, `cpaZones`. Se revisa con grep al implementar.

### Estado: `app.state.scaling` (en `js/modules/scaling/app/scaling.js`)

```js
app.state.scaling = {
  part: 'test',            // 'test' | 'surf'                    (se guarda)
  test: { active: 0, done: [] },  // paso abierto y pasos hechos, como state.ads.plans[k] (se guarda)
  mode: 'practice',        // 'practice' | 'free'                (se guarda)
  best: null,              // mejor % de aciertos de una ronda, 0–100 (se guarda)
  free: { daily: 100000, spend: 0, pi: 0, sales: 0, tope: 15000 },  // (se guarda)
  run: { order: [], i: 0, cut: 0, hits: 0, total: 0, last: null },  // ronda en curso (no se guarda)
};
```

### Persistencia

- `services.storage.scaling` con clave propia **`pyl-scaling`**: `{ part, test, mode, best, free }`. La ronda en curso no se guarda: al recargar empieza una nueva.
- Si la clave falta o viene rota, se usan los valores por defecto.

### HTML, UI y CSS

- `index.html`: botón `<button data-v="escalado">Escalado</button>` después de Métricas y `<section class="view" id="v-escalado">` después de `#v-metricas`. Script tags en su capa: `modules/scaling/core/scaling.js` después de `metrics` core; `ui` y `app` igual.
- `js/index.js`: agregar `'modules/scaling/core/scaling'` después de `metrics`.
- **Paso a paso:** reutiliza `PYL.ui.landing.stepList`, `stepDetail` y `progress`, como la guía de Meta Ads. Los bloques propios (barra, tarjeta de corte con mini-ejemplo, cadena, simulacro) entran por `ctx.tools`. El último paso no lleva botón a otra pestaña (`ctx.last`).
- `PYL.ui.scaling`: `parts`, `bar`, `cut`, `cuts`, `chain`, `practice`, `free`. Reciben datos y callbacks; no tocan estado. Las sub-pestañas siguen el patrón de `#d-parts`.
- Prefijo `#es-` / `.es-` para ids y clases (libre hoy).
- `css/modules/scaling.css` después de `metrics.css` y antes de `themes.css`. Colores solo con tokens (`--b`, `--y`, `--r`, `--g`…) para los 7 temas. Agregar `#v-escalado` a la regla de títulos de tarjeta de `base.css`.
- La barra se anima con `transition` de ancho; con `prefers-reduced-motion` salta sin animar.

### Dependencias

- `scaling` usa `shared/`, `metrics` (`NS_TEST`, `GENERIC_CPA`, `HARD_METRICS`), `ads` (`ADS.daily`, `ADS.sets`) y `landing` (`ui.landing.stepList/stepDetail/progress`). Todos cargan antes.

## Plan de implementación

1. **Núcleo de reglas.** Crear `core/scaling.js` con `TEST_RULES`, `CPA_ZONES`, `cpaZones`, `TEST_ACTIONS`, `testVerdict`, `testCheck`, `testDay`, `testRange` y `TEST_CASES`. Agregarlo a `js/index.js`. Pruebas en `tests/core.test.js`:
   - Cada fila de la tabla de reglas da su veredicto, con la frase del Lab, incluidos los bordes (CPPI 6.000 y 5.000, 2 PI y 3 PI, gasto 19.999 → `wait`).
   - El veredicto trae `fase`, `veredicto`, `toca`, `detalle`, `dura` (false) y `senales`.
   - Los 8 casos dan las respuestas de la tabla del banco.
   - `testCheck` rechaza ventas > PI.
   - `testDay(40000, 100000)` = 1 y `testDay(40000, 30000)` = 2.
   - `cpaZones(15000)` = `GENERIC_CPA`; `cpaZones(20617)` = escala 16.494, apaga 27.489; `cpaZones(32617)` = 26.094 / 43.489.
   - Los cortes, el presupuesto y el tope coinciden con `NS_TEST` y `GENERIC_CPA`.
2. **Pestaña y sub-pestañas.** Botón y `#v-escalado` en `index.html`, `services.storage.scaling` (`pyl-scaling`), `app/scaling.js` con estado, sub-pestañas y la tarjeta "Pronto" de Surfing Scaling. `scaling.css` enlazado. Humo: 10 pestañas, la sub-pestaña cambia de apartado. Regenerar `claves-pyl.json`.
3. **Paso a paso.** `TEST_HEAD`, `TEST_STEPS`, `TEST_CUTS`, `TEST_CHAIN` en core (pruebas: 6 pasos en orden, pasos 2–4 con `cut` y `example`, ramas del mapa con ids que `testVerdict` devuelve). Pintar con `ui.landing.stepList/stepDetail/progress` y los bloques `ui.scaling.bar/cut/chain`; avance guardado. Humo: 6 pasos, abrir un paso muestra su bloque, marcar hecho mueve la barra de avance.
4. **Juega con los números.** `ui.scaling.cuts` y `ui.scaling.free` en el paso 6; `app` recalcula con `testVerdict` e ilumina barra y mapa. Humo: cambiar gasto/PI/ventas cambia el veredicto y la rama `.es-on`; ventas > PI muestra el aviso.
5. **Práctica.** `ui.scaling.practice`: Avanzar, 4 decisiones, explicación, "Ver el paso", puntaje y "Otra ronda"; mejor puntaje guardado. Humo: una ronda completa acertando todo da 100 %; una decisión equivocada se marca como fallo y muestra la correcta; "Ver el paso" abre el paso del corte.
6. **Documentación.** Después del merge, actualizar `CLAUDE.md` y `README.md` con el módulo `scaling` (informativo), la pestaña Escalado, `pyl-scaling`, el prefijo `#es-` y la dependencia `scaling → metrics, ads, landing`.

## Criterios de aceptación

**Pestaña**

- [x] La barra superior muestra "Escalado" justo después de "Métricas" y abre `#v-escalado`.
- [x] El encabezado dice que el módulo es para aprender la metodología y que no lee campañas reales.
- [x] Hay sub-pestañas "🧪 Fase de testeo" y "🏄 Surfing Scaling"; la segunda muestra solo la tarjeta "Pronto".
- [ ] Al recargar se abren la última sub-pestaña, el último paso, los pasos marcados como hechos y el último modo del simulacro.

**Paso a paso**

- [x] La Fase de testeo muestra 6 pasos en orden: Arranque, Corte 1 · 20.000, Corte 2 · 30.000, Corte 3 · 40.000, Si se apagó: la cadena, Practica. Hay lista, detalle y barra de avance, con el mismo aspecto que la guía de Meta Ads.
- [x] El paso 1 dice 100.000 al día y muestra la barra de gasto acumulado con 20K, 30K, 40K y el fin del día en 100.000; los tres cortes caen el día 1.
- [x] El paso 1 trae la nota ABO: con 4 conjuntos × 30.000 cada conjunto se califica con su gasto y el corte de 40K le llega el día 2.
- [x] Los pasos 2–4 muestran su tarjeta de semáforo con las frases del Lab y un mini-ejemplo resuelto con "Así lo califica el Lab de NovaSociety". La de 30K separa "Sin ventas" y "Con venta"; la rama de 40K sin regla del MCP dice "Regla propia".
- [x] El paso 4 trae la caja "¿De dónde sale el tope?" con 15.000 → escala 12.000 / apaga 20.000 y el ejemplo 20.617 → 16.494 / 27.489.
- [x] El paso 5 muestra CPM → CPC → CPPI → CPA, "No se mira el CTR", las 3 lecturas con su solución del MCP y la nota de no apagar antes de cruzar un corte.
- [x] El paso 6 muestra el mapa de los 3 cortes y el simulacro.

**Juega con los números**

- [x] Arranca con presupuesto 100.000 y tope 15.000, editables.
- [x] Bajo el tope se ven escala y apaga; con tope 32.617 dicen 26.094 y 43.489.
- [x] Gasto 25.000, 2 PI, 0 ventas → 🛑 "Apágalo, a nadie le interesa" en corte 1; la rama "0, 1 o 2 PI" se ilumina.
- [x] Gasto 30.000, 5 PI, 0 ventas → ⚠️ "Bastante flojo" (CPPI 6.000).
- [x] Gasto 40.000 con presupuesto 30.000 → día 2; con 100.000 → día 1.
- [x] Gasto 40.000, 3 ventas, tope 15.000 → 🚀 Dejar gastar el día; con tope 12.000 → ⚠️ Mantener vigilando con "Regla propia".
- [x] Gasto 15.000 → "Deja correr sin tocar".
- [x] Ventas > PI → aviso y sin veredicto.
- [x] Muestra día del testeo, CPPI y CPA ("—" si no se pueden calcular).

**Práctica**

- [x] "Avanzar" llena la barra animada hasta el siguiente corte y muestra los números del caso.
- [x] Hay 4 botones de decisión; al elegir se ve acierto o fallo, el veredicto MCP y su explicación, y se ilumina la rama.
- [x] "Ver el paso" abre el paso del corte de esa decisión.
- [x] Un caso termina en Apagar o Dejar gastar el día; si no, sigue al siguiente corte.
- [x] La ronda pasa por los 8 casos en orden al azar y termina con aciertos / decisiones.
- [x] El mejor puntaje se guarda y se ve al recargar.

**Diseño** (revisado en el navegador)

- [x] Se lee bien en los 7 temas y en pantallas angostas (sin scroll horizontal).
- [x] Con `prefers-reduced-motion` la barra no se anima.

**Calidad**

- [x] `PYL.core.scaling` no toca el DOM.
- [x] Ningún número del MCP está escrito dos veces (cortes, presupuesto, tope, conjuntos y CPM vienen de `metrics` y `ads`; zonas de `cpaZones`).
- [x] No hay datos de productos del usuario en el código.
- [x] Pasan `node tests/core.test.js`, `tests/smoke.test.js` y `node --check` de cada archivo tocado.
- [x] `claves-pyl.json` coincide con `--claves` y la consola queda limpia.
- [x] No hay ids repetidos en `index.html`.
- [x] Las pestañas Simulador, Escalera y la guía de Meta Ads no cambian.

## Decisiones

- **Sí:** módulo informativo, para aprender la metodología. **No:** leer campañas reales; eso va en un módulo dinámico aparte.
- **Sí:** módulo propio "Escalado" (`js/modules/scaling/`). **No:** apartado dentro de Métricas (idea inicial, descartada por el usuario).
- **Sí:** nombre de carpeta en inglés (`scaling`), como `search`, `landing`, `ads`, `metrics`. La interfaz dice "Escalado".
- **Sí:** crearlo desde cero sin mirar Escalera ni Simulador. **No:** reutilizar ni tocar `trainer.js`; esas pestañas se revisan después.
- **Sí:** el MCP de NovaSociety manda en las reglas. **No:** los umbrales de la matriz del usuario que no están en el MCP (0 PI apaga, 🎯 candidato, CPA < 12.000 en 40K, cierre del día con CPA < 20.000 + CPPI < 5.000).
- **Sí:** a los 40K con 1 venta, o con 2+ ventas y CPA sobre el tope, "Mantener vigilando". Lo eligió el usuario; el MCP no da regla. Se marca "Regla propia" en la app para no hacerlo pasar por NovaSociety.
- **Sí:** los cortes se leen por gasto acumulado (por conjunto o campaña que se califica), no por horas ni días.
- **Sí:** presupuesto 100.000 al día por defecto, como el Lab ("con $ 100.000 al día"); editable al jugar con los números. **No:** 30.000 por defecto (versión anterior de esta spec, sacada de la guía ABO). La guía ABO queda como nota: con 4 × 30.000 el corte de 40K le llega a cada conjunto el día 2.
- **Sí:** el paso a escalado ocurre en el corte de 40K (2+ ventas y CPA ≤ tope). **No:** pasar a escalado con menos presupuesto gastado: saltaría el corte 3.
- **Sí:** tope genérico 15.000, editable al jugar con los números. **No:** leerlo del Costeo (dependencia con `trainer.js`).
- **Sí:** explicar que el tope es el CPA máximo del costeo y mostrar sus zonas (escala × 0,8, apaga × 4/3), como las calcula el Lab. Prepara el apartado Surfing Scaling. Las zonas no deciden nada en el testeo.
- **Sí:** los umbrales llevan los nombres del Lab (`piMinimo`, `piBien`, `cppiBueno`, `cppiFlojo`, `cppiApaga`) y `testVerdict` devuelve la forma del veredicto del Lab (`fase`, `veredicto`, `toca`, `detalle`, `dura`, `senales`). Así el futuro módulo con datos reales reutiliza el mismo núcleo.
- **Sí:** las frases de los veredictos son las del Lab, tal cual. **No:** redactarlas de nuevo.
- **Sí:** casos y ejemplos inventados, con la nota "Así lo califica el Lab". **No:** escribir en el código números de productos del usuario (ej. Motosierra).
- **Sí:** paso a paso guiado con el formato de la guía de Meta Ads (lista, detalle, avance), reutilizando `ui.landing.stepList/stepDetail/progress`. **No:** tarjetas sueltas una debajo de otra (primera versión de esta spec: no se sentía como un paso a paso).
- **Sí:** el simulacro es el último paso ("Practica"), después de aprender los cortes. Cada decisión enlaza al paso que la explica.
- **Sí:** dos modos, práctica y "Juega con los números". **No:** llamarlo "modo libre" ni presentarlo para revisar un conjunto real.
- **Sí:** banco fijo de 8 casos inventados que cubre todas las ramas. **No:** casos generados al azar (pueden salir raros y son difíciles de probar).
- **Sí:** casos y mini-ejemplos no guardan la respuesta: la calcula `testVerdict`, así ejemplos y reglas no se contradicen.
- **Sí:** 4 decisiones agrupadas (Apagar, Mantener vigilando, Seguir sin tocar, Dejar gastar el día). **No:** un botón por veredicto MCP (7 botones abruman a un principiante); el veredicto exacto sale en la explicación.
- **Sí:** avance con botón y animación. **No:** reloj automático.
- **Sí:** sub-pestañas como Desarrollo, para que entren Surfing Scaling y lo demás. **No:** ruta con tarjetas.
- **Sí:** guardar sub-pestaña, avance de los pasos, modo, mejor puntaje y números de "Juega con los números" en `pyl-scaling`. **No:** guardar la ronda en curso ni un historial.
- **Sí:** la cadena diagnóstica se repite aquí con las soluciones del MCP, aunque Métricas tenga su propia versión: en el testeo es la guía de qué revisar al apagar.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| La "Regla propia" de 40K se confunde con criterio NovaSociety | Marca visible "Regla propia" en la tarjeta y en la explicación |
| `ui.landing.stepDetail` está pensado para Shopify y Meta Ads y no acepta bien bloques interactivos | Los bloques entran por `ctx.tools`, como en Meta Ads. Si no alcanza, `ui.scaling` pinta su propio detalle con las mismas clases, sin tocar `landing` |
| `scaling` depende de `metrics`, `ads` y `landing`: si cambian sus constantes o la UI de pasos, cambia el módulo | Es lo buscado (una sola fuente). Las pruebas de core comparan contra esas constantes y el humo revisa los pasos |
| El usuario toma el simulacro como lectura de su campaña | El encabezado y el modo "Juega con los números" dicen que es para aprender; los casos son inventados |
| Un nombre nuevo choca al aplanar `js/index.js` | Grep antes de exportar; prefijo `TEST_` / `test` |
| Los casos con números en el borde (CPPI 6.000, 5.000) enseñan mal si se redondea | `testVerdict` compara sin redondear; pruebas de borde en el paso 1 |
| Con presupuesto distinto de 100.000 los casos de práctica no cambian | La práctica usa siempre 100.000; solo "Juega con los números" se ajusta |
| Enseñar 100.000 al día choca con la guía ABO (4 × 30.000) | Nota visible en el paso 1: cada conjunto se califica con su gasto acumulado, y el corte de 40K le llega el día 2 |
| El Lab cambia frases, nombres o el cálculo de las zonas | Las frases viven en `TEST_CUTS` y en `testVerdict`; las zonas en `CPA_ZONES`. Se revisan contra `reglas_de_juan` |
| jsdom no anima ni mide | Las pruebas revisan clases, textos y puntaje; la animación se revisa en el navegador |
| Dos versiones de reglas conviven (Simulador/Escalera del entrenador y Escalado) | Queda anotado: se revisan en otra spec |

## Lo que **no** está en esta spec

- Leer métricas reales de campañas (módulo dinámico aparte).
- Surfing Scaling (escalado vertical +20 %, ventana de 3 días, horas, regla dura).
- Niveles N1–N15 y refresco de campañas.
- Umbrales de la matriz del usuario que no están en el MCP.
- Cambios a Simulador, Escalera, `trainer.js` o la guía de Meta Ads.
- Varios conjuntos a la vez, historial de rondas, CPA tope del Costeo.
- Testeo propio de TikTok.

Cada una de esas, si llega, va en su propia spec.
