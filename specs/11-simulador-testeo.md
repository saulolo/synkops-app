# SPEC 11 — Simulador de testeo

> **Estado:** Aprobado
> **Depende de:** SPEC 03, SPEC 06, SPEC 10
> **Fecha:** 2026-11-13
> **Objetivo:** Habilitar la sub-pestaña Simulador de Testeo con un simulador de un conjunto que deriva pagos iniciados y ventas desde la cadena (CPM, CTR, % a pago iniciado, % de venta), corre el gasto con azar y califica cada corte con `testVerdict`, y llevar allí "Juega con los números" como segundo modo.

## Por qué existe esta spec

Hoy el paso 6 (Practica) tiene dos modos: la práctica de 11 casos y "Juega con los números". En "Juega con los números" escribo a mano los pagos iniciados y las ventas. Así no se ve de dónde salen: no enseña qué eslabón de la cadena los produce ni por qué un CPM caro o un CPC caro terminan en "Apagar".

El simulador cierra ese hueco. Configuro la cadena como la vería en el Administrador de anuncios. La app corre el gasto, hace llegar los pagos iniciados y las ventas con azar (como en Meta: dos corridas iguales pueden dar cortes distintos) y se detiene en cada corte con el veredicto del Lab. Al lado, la cadena con semáforo dice qué eslabón se rompe y cuál es la solución de NovaSociety.

El paso 6 queda solo con la práctica. "Juega con los números" se muda al Simulador como modo "Números a mano".

## Alcance

**Dentro:**

**Parte 1 · Sub-pestaña Simulador**

- `TESTING_PARTS`: la parte `sim` se habilita y su rótulo pasa a `🎛️ Simulador`. Pierde `disabled`.
- Orden sin cambios: `📂 Lectura real · pronto` | `🧪 Fase de testeo` | `🎛️ Simulador`.
- Al entrar a Testeo abre la parte guardada. Por defecto, `test`. Un `sim` guardado ahora abre el Simulador.
- Contenedor nuevo en `index.html`: `<div class="card mt" id="ts-simu" hidden>`, después de `#ts-test` y antes de `#ts-soon`.
- Encabezado del Simulador: título "Simulador de testeo" y una línea "Configuro la cadena y veo qué decide el Lab en cada corte. Es para aprender: no es una campaña real."
- Dos modos (selector `#ts-sx-modes`, `data-mode`): `🔗 Cadena` (`chain`, por defecto) y `🎛️ Números a mano` (`manual`).
- Debajo de los dos modos, el mapa de los 3 cortes (`ui.testing.cuts`) con la rama del veredicto actual iluminada (`.ts-on`).

**Parte 2 · Modo Cadena**

- Entradas (campos `#ts-sx-f-<k>`):
  - Plataforma: interruptor Meta | TikTok (`plat`). Solo cambia los límites del semáforo. `testVerdict` no la usa.
  - Presupuesto diario (`daily`, COP, por defecto `NS_TEST.budget`).
  - CPA tope (`tope`, COP, por defecto `GENERIC_CPA.tope`), con las zonas de `cpaZones` debajo.
  - CPM (`cpm`, COP).
  - CTR (`ctr`, %, clics en el enlace ÷ impresiones). Acepta decimales con coma: `1,5`.
  - % de clics que inician pago (`toPi`, %).
  - % de pagos iniciados que compran (`toSale`, %).
- Derivados que se muestran (no se escriben): CPC = CPM ÷ (1.000 × CTR), impresiones, clics, pagos iniciados, ventas, CPPI y CPA del punto actual.
- **Corrida:** la app genera la corrida completa al tocar ▶ o al cambiar una entrada. La corrida es una lista de puntos cada 1.000 COP de gasto, desde 0 hasta el fin de la corrida.
  - Fin de la corrida: el fin del día en que cae el corte 3. Es `ceil(K3 ÷ daily) × daily`. Con 100.000 diarios es 100.000; con 30.000 (ABO) es 60.000.
  - En cada punto llegan impresiones, clics, pagos iniciados y ventas con azar según las tasas (ver Modelo de datos).
  - La corrida usa una semilla. "🎲 Otra corrida" genera otra semilla con las mismas entradas.
- **Avance:**
  - Botón ▶ "Correr" llena el gasto de a 1.000 COP por tic (cada 120 ms).
  - En cada corte (`NS_TEST.cuts`) y al fin del día se pausa y muestra el veredicto de ese punto. "Continuar ▶" sigue.
  - Botón ⏸ pausa. Botón ⏮ vuelve a 0 con la misma semilla.
  - Deslizador de gasto `#ts-sx-spend` (paso 1.000): muevo el punto a mano dentro de la corrida. Muestra el estado de ese punto.
  - Con `prefers-reduced-motion`, ▶ salta directo de corte en corte, sin tics.
- **Al apagar:** si un corte da `action: 'off'`, la corrida se detiene ahí. El deslizador no pasa de ese punto. Sale la tarjeta "Apagado en el corte N" con el veredicto, el detalle y qué revisar (lectura de `TEST_CHAIN.reads` del eslabón roto).
- **Dejó de ser testeo:** al fin del día, si el corte 3 dio `c3-spend` y el gasto llegó al presupuesto del día, sale el aviso de `TEST_SCALE_NOTE` + "Pasa a la pestaña Escalado" (igual que hoy en "Juega con los números"), sin rama iluminada.
- **Cadena con semáforo** (`#ts-sx-chain`): CPM → CTR → CPC → CPPI → CPA, cada uno con su valor en el punto actual y su luz:
  - CPM: verde si ≤ `max` de la plataforma, rojo si supera. Marca "ideal" si está bajo `ideal`.
  - CTR: sin luz. Lleva la marca "No decide" (criterio NovaSociety).
  - CPC: verde si < `max` de la plataforma, rojo si no. Marca "ideal" bajo `ideal`.
  - CPPI: luces de `TEST_RULES`: verde bajo `cppiBueno`, amarillo hasta `cppiApaga`, rojo sobre `cppiApaga`. Sin pagos iniciados: "—" y sin luz.
  - CPA: verde ≤ tope, amarillo ≤ zona apaga, rojo sobre apaga. Sin ventas: "—" y sin luz.
  - Eslabón roto = el primero en rojo entre CPM, CPC y CPPI. Si ninguno está en rojo, hay pagos iniciados y 0 ventas pasado el corte 3, el eslabón es la página (lectura `cppi`). Bajo la cadena sale su lectura "Si… / Solución…" de `TEST_CHAIN.reads`. Sin eslabón roto no sale lectura.
- **Historial de cortes** (`#ts-sx-hist`): fila 20K · 30K · 40K · Fin del día. Cada celda muestra el veredicto que dio la corrida al pasar por ahí (icono de `TEST_ACTIONS` + acción + PI/ventas). Las celdas aún no alcanzadas quedan en "—". Las que quedan después de un apagado dicen "Apagado".
- **Escenarios** (`#ts-sx-scen`, botones `data-scen`): cargan entradas de `SIM_SCENARIOS` en las entradas de la cadena (no cambian presupuesto ni tope) y generan una corrida nueva:
  - `cpm` "💸 CPM caro": cae en apagar en el corte 1 por pocos pagos iniciados.
  - `cpc` "😐 Producto no interesa": CPM sano, CTR bajo, CPC caro. Apaga en el corte 1.
  - `page` "🧱 Página no convierte": CPM y CPC sanos, buen CPPI, 0 % de venta. Apaga en el corte 3.
  - `win` "🏆 Ganador": cadena sana. Deja gastar el día.
  - Los valores esperados (sin azar) de cada escenario deben caer en su rama: las pruebas lo exigen con `simExpect`.

**Parte 3 · Modo Números a mano**

- Es el "Juega con los números" de hoy, movido sin cambiar su lógica: `testFree`, `testBar`, `testCheck` y la UI `free`/`freeOut`.
- Conserva sus ids `#ts-f-*`, `#ts-f-spend-r`, `#ts-zones`, `#ts-free-bar` y `#ts-free-out`. Ahora viven dentro de `#ts-simu`.
- Ilumina la rama en el mapa del Simulador (no en el del paso 6).

**Parte 4 · Paso 6 Practica**

- Se quita el selector de modos `#ts-modes` y el modo "Juega con los números" del paso.
- El bloque `sim` del paso 6 muestra directo la práctica de 11 casos en `#ts-mode` (mismo id, para no romper `paintPractice`).
- Al final del bloque, un botón `#ts-to-sim` "Juega en el Simulador →" que abre la sub-pestaña `sim`.
- El mapa del paso 6 se sigue iluminando con la práctica.

**Parte 5 · Límites numéricos en `HARD_METRICS` (`core/metrics.js`)**

- Cada `view[plat]` de CPM y CPC gana `lim: { max, ideal, op }` numérico. `op` es `'<='` (CPM) o `'<'` (CPC).
  - CPM Meta `{ max: 20000, ideal: 5000, op: '<=' }`, CPM TikTok `{ max: 6000, ideal: 5000, op: '<=' }`.
  - CPC Meta y TikTok `{ max: 800, ideal: 600, op: '<' }`.
- Los textos de `main` y de `limitTip` de esas filas se arman desde `lim`. El texto que se ve no cambia (las pruebas actuales lo vigilan).
- `cpmMax` de `core/testing.js` (cadena del paso 5) lee `lim.max` en vez del texto de `tip.li`.

**Parte 6 · Guardado**

- `pyl-testing` pasa a `{ v: 3, part, test, best, free, sim }`.
- `sim = { mode, plat, daily, tope, cpm, ctr, toPi, toSale }`. La corrida, la semilla y el punto actual no se guardan.
- Se deja de guardar `mode` (el modo del paso 6 ya no existe). Un `mode` guardado se ignora.
- `TEST_VERSION` sube a 3. El reinicio del mejor puntaje solo ocurre si lo guardado no trae `v` o trae `v < 2`. Con `v: 2` el mejor puntaje se conserva.
- Las entradas inválidas o faltantes al cargar caen en `SIM_DEFAULTS`.

**Pruebas y documentación**

- `tests/core.test.js`: azar con semilla reproducible, `simExpect`, `simRun`, escenarios, semáforo, eslabón roto, historial, validación, `lim` de `HARD_METRICS`.
- `tests/smoke.test.js`: sub-pestaña habilitada, modos, escenarios, deslizador, apagado, paso 6 sin `#ts-modes`, `#ts-to-sim`, "Números a mano" con sus ids. Se mueven las pruebas actuales de `#ts-modes`/`#ts-free-out` al Simulador.
- Regenerar `tests/fixtures/claves-pyl.json`.
- Después del merge, actualizar `CLAUDE.md` y `README.md`.

**Fuera (otras specs):**

- Lectura real (subir el reporte de Meta).
- Varios conjuntos a la vez (4 conjuntos ABO en paralelo).
- Seguir la corrida después de apagar ("ver qué habría pasado").
- Que el CPM, el CTR o la plataforma entren en `testVerdict`.
- Escalado dentro del simulador (días 2+ con Surfing Scaling).
- Guardar corridas o un historial de corridas.
- Cambiar umbrales de `TEST_RULES`, cortes de `NS_TEST`, zonas de `cpaZones` o la práctica de 11 casos.

## Modelo de datos

### Archivos nuevos

- `js/modules/testing/core/simulator.js` → `PYL.core.simulator` (nombres con prefijo `sim`/`SIM_` para no chocar al aplanar en `js/index.js`). Va después de `core/testing.js` en `index.html` y en `js/index.js`.
- `js/modules/testing/ui/simulator.js` → `PYL.ui.simulator`. Va después de `ui/testing.js`. Recibe `free`/`freeOut` movidos desde `ui/testing.js` (se publican aquí; `ui.testing` deja de exportarlos).
- El estado y la conexión siguen en `js/modules/testing/app/testing.js`.

### `core/simulator.js`

```js
const SIM_DEFAULTS = { mode: 'chain', plat: 'meta', daily: NS_TEST.budget, tope: GENERIC_CPA.tope,
  cpm: 12000, ctr: 2, toPi: 20, toSale: 30 };       // ctr, toPi, toSale en % (2 = 2 %)
const SIM_STEP = 1000;                               // COP por punto de la corrida
const SIM_SCENARIOS = [
  { k: 'cpm',  t: '💸 CPM caro',             v: { cpm: 30000, ctr: 2,   toPi: 20, toSale: 30 } },
  { k: 'cpc',  t: '😐 Producto no interesa', v: { cpm: 12000, ctr: 0.6, toPi: 20, toSale: 30 } },
  { k: 'page', t: '🧱 Página no convierte',  v: { cpm: 12000, ctr: 2,   toPi: 20, toSale: 0 } },
  { k: 'win',  t: '🏆 Ganador',              v: { cpm: 12000, ctr: 2,   toPi: 20, toSale: 30 } },
];
```

Valores esperados (sin azar) con presupuesto 100.000 y tope 15.000:

| Escenario | CPC | PI a 20K | Rama esperada |
|---|---|---|---|
| `cpm` | 1.500 | 2,7 | `c1-off` |
| `cpc` | 2.000 | 2 | `c1-off` |
| `page` | 600 | 6,7 (CPPI 3.000) | `c3-off` |
| `win` | 600 | 6,7; a 40K 13,3 PI y 4 ventas (CPA 10.000) | `c3-spend` |

Funciones (puras, sin DOM):

- `simRng(seed)` → generador de números en [0, 1) reproducible (mulberry32).
- `simCheck(inputs)` → `null` o `{ campo: aviso }`. `daily`, `tope`, `cpm` > 0. `ctr` > 0 y ≤ 100. `toPi` y `toSale` entre 0 y 100.
- `simNum(text)` → número desde texto es-CO (`'1,5'` → 1.5, `'20.000'` → 20000), o `NaN`.
- `simEnd(daily)` → `ceil(K3 ÷ daily) × daily`.
- `simExpect(inputs, spend)` → `{ impr, clicks, pi, sales, cpc }` esperados (sin redondear) para un gasto.
- `simRun(inputs, seed)` → `{ seed, end, points: [{ spend, impr, clicks, pi, sales }], cuts: [{ at, verdict }], offAt }`.
  - Cada tramo de 1.000 COP suma `impr = 1.000 ÷ CPM × 1.000` impresiones esperadas. Las impresiones se acumulan sin redondear.
  - Clics nuevos del tramo: cada impresión nueva entera es clic con probabilidad `ctr/100`. Pagos iniciados nuevos: cada clic nuevo, con probabilidad `toPi/100`. Ventas nuevas: cada pago iniciado nuevo, con probabilidad `toSale/100`.
  - `cuts`: el `testVerdict` de cada corte y del fin del día, con `tope`.
  - `offAt`: gasto del primer corte con `action: 'off'`, o `null`. Los puntos después de `offAt` no se generan.
- `simAt(run, spend, inputs)` → lo que pinta la UI en un gasto: punto, `verdict` (`testVerdict` del punto), `scaling` (misma regla que `testFree`), `chain`, `broken`, `hist`.
- `simChain(point, inputs)` → `[{ k, value, light, ideal?, note? }]` para `cpm`, `ctr`, `cpc`, `cppi`, `cpa` (reglas de la Parte 2; límites de `HARD_METRICS[k].view[plat].lim`, `TEST_RULES` y `cpaZones`).
- `simBroken(chain, point)` → `'cpm' | 'cpc' | 'cppi' | null` (clave de `TEST_CHAIN.reads`).

### Estado (`app.state.testing`)

```js
{ part, test, best, free, run,       // como hoy, sin `mode`
  sim: { mode, plat, daily, tope, cpm, ctr, toPi, toSale },   // se guarda
  simRun: { seed, run, spend, playing } }                     // no se guarda
```

### `pyl-testing`

```js
{ v: 3, part, test, best, free, sim }
```

### Ids nuevos (prefijo `#ts-sx-`)

`#ts-simu`, `#ts-sx-modes`, `#ts-sx-panel`, `#ts-sx-f-plat`, `#ts-sx-f-daily`, `#ts-sx-f-tope`, `#ts-sx-f-cpm`, `#ts-sx-f-ctr`, `#ts-sx-f-toPi`, `#ts-sx-f-toSale`, `#ts-sx-err-<k>`, `#ts-sx-scen`, `#ts-sx-play`, `#ts-sx-reset`, `#ts-sx-again`, `#ts-sx-spend`, `#ts-sx-out`, `#ts-sx-chain`, `#ts-sx-hist`, `#ts-sx-cuts`, y en el paso 6 `#ts-to-sim`. `#ts-sim` (bloque del paso 6) se conserva.

## Plan de implementación

Pruebas primero en cada paso: se escriben, fallan y luego se hace el código.

1. **Límites numéricos.** Pruebas en Node: `lim` de CPM y CPC por plataforma; los textos `main` y `tip` no cambian; `cpmMax` del paso 5 sigue dando "$ 20.000" y "$ 6.000". Después, `lim` en `core/metrics.js` y `cpmMax` en `core/testing.js`.
2. **Núcleo del simulador: azar y valores esperados.** Crear `core/simulator.js` con `SIM_DEFAULTS`, `SIM_STEP`, `simRng`, `simNum`, `simCheck`, `simEnd`, `simExpect`. Agregarlo a `index.html` y `js/index.js`. Pruebas: misma semilla = misma secuencia; `simNum('1,5')` = 1.5; `simEnd(30000)` = 60.000; `simExpect` del escenario `win` a 40K da 13,3 PI y 4 ventas.
3. **Corrida.** `simRun` y `simAt`. Pruebas: misma semilla = misma corrida; los puntos van de 0 a `end` cada 1.000; con `toSale: 0` nunca hay ventas; con un caso que apaga en el corte 1, `offAt` = 20.000 y no hay puntos después; `cuts` coincide con `testVerdict` de cada punto; `scaling` al fin del día con `c3-spend`.
4. **Semáforo, eslabón roto y escenarios.** `simChain`, `simBroken`, `SIM_SCENARIOS`. Pruebas: CPM 20.000 en Meta verde y 20.001 rojo; CPC 800 rojo y 799 verde; CPM 7.000 rojo en TikTok; CTR sin luz; cada escenario cae en su rama con `simExpect`; `simBroken` da `cpm`, `cpc` y `cppi` en los escenarios `cpm`, `cpc` y `page`, y `null` en `win`.
5. **Sub-pestaña y modo Números a mano.** Habilitar `sim` en `TESTING_PARTS`, `#ts-simu` en `index.html`, `ui/simulator.js` con el encabezado y el selector de modos, y mover `free`/`freeOut` desde `ui/testing.js`. En `app/testing.js`, pintar el Simulador cuando `part === 'sim'` y conectar "Números a mano" con su mapa. Humo: la parte `sim` ya no está deshabilitada; las pruebas actuales de `#ts-free-out` pasan dentro de `#ts-simu`.
6. **Paso 6 solo con práctica.** Quitar `#ts-modes` y el modo libre del bloque `sim` de `ui.testing.TOOLS`; agregar `#ts-to-sim`. Quitar `mode` del estado. Humo: no hay `#ts-modes`; la práctica sigue en `#ts-mode`; `#ts-to-sim` abre el Simulador.
7. **Modo Cadena: entradas, corrida y deslizador.** UI de entradas con errores por campo, derivados, deslizador `#ts-sx-spend`, salida `#ts-sx-out` y mapa `#ts-sx-cuts` iluminado. Humo: cambiar una entrada rehace la corrida; mover el deslizador cambia PI y ventas; un error marca el campo con `aria-invalid` y no hay veredicto.
8. **Modo Cadena: cadena, historial y escenarios.** `#ts-sx-chain`, `#ts-sx-hist` y `#ts-sx-scen`. Humo: el escenario `cpm` muestra CPM en rojo, la lectura "Creativos nuevos…", el historial con "Apagar" en 20K y "Apagado" en las siguientes.
9. **Modo Cadena: ▶, pausas y "Otra corrida".** Tics de 120 ms, pausa en cada corte y al fin del día, ⏸, ⏮, 🎲, y salto de corte en corte con `prefers-reduced-motion`. Humo (con temporizadores falsos de jsdom o llamando al tic): ▶ se detiene en 20.000 y "Continuar ▶" sigue a 30.000.
10. **Guardado.** `TEST_VERSION = 3`, `sim` en `persist`, lectura con `SIM_DEFAULTS`, reinicio del mejor puntaje solo sin `v` o con `v < 2`. Revisión en el navegador con un `pyl-testing` `v: 2` (el mejor puntaje se conserva) y con uno sin `v` (se reinicia).
11. **Estilos.** `css/modules/testing.css` (solo tokens): entradas en cuadrícula, cadena con luces, historial, escenarios, controles de corrida. Revisión en el navegador en los 7 temas y en pantalla angosta.
12. **Documentación.** Después del merge, `CLAUDE.md` y `README.md`: sub-pestaña Simulador, archivos nuevos, `pyl-testing` v3, paso 6 sin modos, `lim` en `HARD_METRICS`.

## Criterios de aceptación

**Sub-pestaña**
- [x] `🎛️ Simulador` se puede abrir y queda tercera, después de `🧪 Fase de testeo`.
- [x] Tiene dos modos: `🔗 Cadena` (abre por defecto) y `🎛️ Números a mano`.
- [x] Un `part: 'sim'` guardado abre el Simulador al recargar (revisado en el navegador). _(pendiente de revisar en el navegador; en jsdom con `localStorage` simulado pasa)_

**Modo Cadena**
- [x] CPC, PI, ventas, CPPI y CPA salen calculados; no hay campo para escribirlos.
- [x] Con la misma semilla, la corrida da los mismos números; "🎲 Otra corrida" puede dar otros.
- [x] ▶ llena el gasto y se pausa en 20.000, 30.000, 40.000 y al fin del día con el veredicto de `testVerdict`.
- [x] El deslizador muestra el estado del punto elegido y no pasa del punto de apagado.
- [x] Si un corte da "Apagar", la corrida se detiene y sale qué revisar. _(con CPM o CPC rotos sale su lectura «Si… / Solución…»; con ambos sanos sale el detalle «Apágalo y revisa la cadena»)_
- [x] Al fin del día con `c3-spend` sale el aviso "dejó de ser testeo… Pasa a la pestaña Escalado" sin rama iluminada.
- [x] La cadena muestra CPM, CTR, CPC, CPPI y CPA con su luz; el CTR dice "No decide" y no tiene luz.
- [x] Al cambiar Meta por TikTok, un CPM de 12.000 pasa de verde a rojo.
- [x] El historial muestra el veredicto de cada corte alcanzado, "—" en los no alcanzados y "Apagado" tras apagar.
- [x] Los 4 escenarios cargan sus valores y, en valores esperados, caen en `c1-off`, `c1-off`, `c3-off` y `c3-spend`.
- [x] Un CTR de `1,5` se acepta; un % sobre 100 o un CPM en 0 marca el campo y no da veredicto.
- [x] El mapa de los 3 cortes ilumina la rama del veredicto del punto actual. _(descartado: el mapa se quitó del Simulador a pedido del usuario; la tarjeta del veredicto lleva la rama en `data-branch`)_
- [x] Con `prefers-reduced-motion`, ▶ salta de corte en corte sin animar (revisado en el navegador). _(pendiente de revisar en el navegador; en jsdom con `matchMedia` simulado pasa)_

**Modo Números a mano**
- [x] Funciona igual que el "Juega con los números" de antes (mismos veredictos, aviso de escalado, zonas y barra) y conserva sus ids.
- [x] Ilumina la rama en el mapa del Simulador. _(descartado: sin mapa en el Simulador)_

**Paso 6**
- [x] No hay `#ts-modes`; el paso muestra directo la práctica de 11 casos.
- [x] `#ts-to-sim` "Juega en el Simulador →" abre la sub-pestaña Simulador. _(el rótulo pasó a «Simulador →» a pedido del usuario)_
- [x] La práctica sigue iluminando el mapa del paso 6.

**Límites y guardado**
- [x] `HARD_METRICS` trae `lim` numérico en CPM y CPC; los textos del diagrama de Métricas no cambian.
- [x] Ningún límite ni umbral se escribe a mano en `core/simulator.js`: salen de `HARD_METRICS`, `TEST_RULES`, `NS_TEST`, `GENERIC_CPA` y `cpaZones`. Excepción: los valores de `SIM_DEFAULTS` y `SIM_SCENARIOS`.
- [x] `pyl-testing` guarda `{ v: 3, part, test, best, free, sim }` y no guarda la corrida.
- [x] Un `pyl-testing` con `v: 2` conserva el mejor puntaje; uno sin `v` lo reinicia (revisado en el navegador). _(pendiente de revisar en el navegador; en jsdom con `localStorage` simulado pasa)_

**Calidad**
- [x] Pasan `node tests/core.test.js`, `tests/smoke.test.js` y `node --check` de cada archivo tocado.
- [x] La consola queda limpia y `claves-pyl.json` coincide con `--claves`.
- [x] Ningún nombre nuevo choca al aplanar `js/index.js`.
- [x] Se ve bien en los 7 temas y en pantalla angosta (revisado en el navegador). _(pendiente de revisar en el navegador)_

## Decisiones

- **Sí:** modelo por cadena: CPM, CTR, % a pago iniciado y % de venta (decisión del usuario). **No:** costos directos (CPM, CPC, CPPI). Permiten combinaciones imposibles, como un CPPI más barato que el CPC.
- **Sí:** un solo conjunto (decisión del usuario). **No:** 4 conjuntos ABO en paralelo: otra spec.
- **Sí:** ▶ con pausas en cada corte y deslizador (decisión del usuario). **No:** solo deslizador, porque no se siente el avance del gasto.
- **Sí:** azar con semilla (decisión del usuario). Es más real y las pruebas siguen siendo reproducibles. **No:** resultado exacto, porque esconde que un conjunto puede caer a un lado u otro del corte.
- **Sí:** `simExpect` sin azar, solo para validar escenarios y para pruebas. No se muestra como modo.
- **Sí:** al apagar la corrida se detiene (decisión del usuario). **No:** "seguir igual para ver qué habría pasado".
- **Sí:** cadena con semáforo, historial, escenarios y plataforma (decisión del usuario).
- **Sí:** la plataforma solo cambia el semáforo. **No:** meterla en `testVerdict`: los cortes del testeo de Juan son los mismos en Meta y TikTok.
- **Sí:** el CTR se muestra sin luz y con "No decide". Juan no mira el CTR; lo pide el modelo para derivar los clics.
- **Sí:** la luz del CPPI sale de `TEST_RULES` (4.000 / 6.000). **No:** el límite de `HARD_METRICS` (< 4.000), para que el semáforo hable igual que el corte 2.
- **Sí:** dos modos en el Simulador: Cadena y Números a mano (decisión del usuario). "Números a mano" es el "Juega con los números" movido sin cambios de lógica.
- **Sí:** el paso 6 queda solo con la práctica y un botón al Simulador (decisión del usuario).
- **Sí:** límites numéricos `lim` en `HARD_METRICS` como única fuente (decisión del usuario). **No:** una constante propia en testing, que duplicaría números.
- **Sí:** guardar solo las entradas en `sim` (decisión del usuario). **No:** guardar la corrida.
- **Sí:** `TEST_VERSION` 3 sin reiniciar el mejor puntaje. La práctica no cambia: el reinicio de la SPEC 10 sigue valiendo solo para lo guardado antes de `v: 2`.
- **Sí:** archivos propios `core/simulator.js` y `ui/simulator.js` dentro del módulo `testing`. `core/testing.js` y `ui/testing.js` ya pasan de 300 líneas. El estado sigue en `app/testing.js` porque comparte `pyl-testing`.
- **Sí:** fin de la corrida = fin del día en que cae el corte 3. Con ABO (30.000 diarios) la corrida llega a 60.000 y muestra que el corte 3 cae el día 2.
- **Sí:** prefijo `#ts-sx-` y contenedor `#ts-simu`. `#ts-sim` ya es el bloque del paso 6 y se conserva.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El azar hace que un escenario no caiga en su rama en una corrida | Los escenarios se validan con `simExpect`; la UI lo explica: "Con azar puede variar; prueba otra corrida" |
| Los tics de ▶ siguen corriendo al salir de la pestaña o del modo | Se detienen en `nav:vista`, al cambiar de parte, de modo o de entrada |
| Cambiar `limitTip` rompe los textos del diagrama de Métricas | El paso 1 fija los textos actuales con pruebas antes de cambiar |
| Mover `free`/`freeOut` rompe las pruebas de humo del paso 6 | Se mueven las pruebas en el paso 5, antes de quitar el modo del paso 6 |
| Muchos puntos en la corrida con presupuestos altos | Un punto cada 1.000 COP; `daily` máximo razonable da pocos cientos de puntos |
| Un nombre `sim*` choca al aplanar `js/index.js` | Grep de cada nombre antes de exportar |

## Lo que **no** está en esta spec

- Lectura real del reporte de Meta.
- Varios conjuntos a la vez.
- Ver qué habría pasado sin apagar.
- CPM, CTR o plataforma dentro de `testVerdict`.
- Escalado dentro del simulador.
- Historial de corridas guardado.
- Cambios a umbrales, cortes, zonas o a la práctica de 11 casos.

Cada una de esas, si llega, va en su propia spec.
