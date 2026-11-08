# SPEC 07 — Fase de escalado (Surfing Scaling)

> **Estado:** Implementado
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-11-08
> **Objetivo:** Convertir la pestaña Escalado en un módulo de estudio igual al de Testeo. Tendrá sub-pestañas "Lectura real" y "Simulador", deshabilitadas, y "Fase de escalado", la única abierta. Dentro de la Fase de escalado, cada método se elige en una tarjeta. El primero es 🏄 Surfing Scaling, explicado paso a paso con herramientas interactivas y un simulacro.

## Por qué existe esta spec

Hoy la pestaña Escalado solo muestra una tarjeta "Pronto". Cuando un conjunto pasa el testeo hay que saber cuándo subir, cuánto subir, cuándo bajar y cuándo apagar. Ese es el método **Surfing Scaling** de NovaSociety. Puede haber más métodos (escalado horizontal, refresco de creativos), así que cada uno se presenta en su propia tarjeta.

## Fuentes y cómo se cruzan

- **MCP de NovaSociety** (`reglas_de_juan`, revisado el 2026-11-08): sección ESCALANDO, zonas de CPA y escalera. Nombres de los umbrales (`sop_en_cop`): `escala` 12.000, `cpaTope` 15.000, `apaga` 20.000, `escalon0` 100.000, `salto` 1,5.
- **Documento del curso** `04-analisis-y-optimizacion-de-metricas.md` (sección 2 "Surfing Scaling" y sección 4 "Reglas de protección anti-pérdida").
- Las frases de los veredictos siguen el criterio del MCP (sección ESCALANDO), dichas en el tono del Lab: directo y corto.

**Regla de cruce (decisión del usuario):** en lo que choca, **manda el MCP**, con dos excepciones donde valen las dos fuentes y se integran:

| Tema | Curso | MCP | Cómo queda en la app |
|---|---|---|---|
| **Cuándo empieza** | Desde el día 2, nunca el día 1 | Cuando el día se gastó entero con ventas | Se integran: el día 1 es testeo. Si a 40K deja gastar el día y lo termina con ventas, el **día 2** sube el primer escalón. Las reglas de testeo nunca se aplican a una campaña que ya lleva tiempo vendiendo |
| **Bajar** | Subida sin ventas: si después de subir gasta 1 CPA (`escala`) sin ventas nuevas, baja 1 nivel. Amanecer rojo: 3 CPA gastados con 0 o 1 venta, baja 2 niveles | CPA de la ventana sobre el tope: baja 1. Día malo hasta +50 %: se sostiene; +50 % o más: baja 1 | Se integran: las reglas del MCP deciden **día a día** con la ventana de 3 días; las del curso son **protecciones durante el día** y llevan la etiqueta "Regla del curso" |
| Escalera | 15 niveles con saltos irregulares | 30 escalones exactos de ×1,2 | Los **15 primeros del MCP** (decisión del usuario): 100.000 → 1.280.000 |
| Frecuencia | Cada ~2 horas o cada 3 ventas | Ventana de los últimos 3 días, un escalón a la vez | MCP |
| Apagar | 2 a 3 días sobre 15.000: pasa a escalado horizontal | 2 días seguidos sobre `apaga`: se apaga (regla dura) | MCP |
| Cierre del día | CPA < 20.000, CPPI < 5.000 y 5 ventas | A 40K, 2 ventas o más con CPA dentro del tope: dejar gastar el día | MCP (ya está en Testeo) |

Lo que solo trae el curso y no choca con el MCP va a tarjetas propias: escalado horizontal y refresco de creativos ("pronto" en esta spec). Los nombres de bloque de la escalera (Testeo y confirmación, Zona de crecimiento, Alto volumen) también salen del curso.

## Alcance

**Dentro:**

- **Sub-pestañas de Escalado** `#es-parts` (`aria-label` "Parte del escalado"), como en Testeo: "📂 Lectura real · pronto" (`real`, deshabilitada, con sus datos `soon`), "📈 Fase de escalado" (`scale`, la única abierta) y "⚠️ Simulador · revisar" (`sim`, deshabilitada). Reutiliza `ui.testing.parts` y `ui.testing.soon`.
- **Selector de métodos** `#es-methods`: tarjetas grandes con ícono, nombre y una línea. Reutiliza `ui.search.strategyTabs`, igual que las estrategias de Meta Ads.
  - 🏄 **Surfing Scaling** · "Escalado vertical: +20 % por escalón, protegiendo el capital". Abierto.
  - 🔀 **Escalado horizontal** · "Plan B: revivir o ampliar cuando el vertical se agota". Pronto (`#es-soon`).
  - 🔄 **Refresco de creativos** · "4 a 5 anuncios nuevos por semana contra la fatiga". Pronto.
  - Un método sin `steps` muestra su tarjeta "Pronto"; cuando se documente, se le ponen `steps` y aparece solo (mismo patrón que CBO en Meta Ads).
- **Paso a paso de Surfing Scaling** (`#es-steps`, `#es-step`, `#es-prog`, con `ui.landing.stepList/stepDetail` y `ui.testing.progress`). Cada paso tiene una sola casilla `ok` y bloques propios (`tool`):
  1. **Cuándo empieza** (`start`): línea de tiempo interactiva. Día 1 = testeo (cortes 20K/30K/40K → "déjalo gastar el día") → fin del día con ventas → **día 2: primer escalón**. Muestra las dos fuentes con su etiqueta: "Lab" y "Regla del curso: nunca el día 1".
  2. **Zonas de CPA** (`zones`): barra de 4 zonas (sube / sostiene / baja / apaga) calculada con `cpaZones(tope)` y un tope editable. Ejemplos: el tope genérico y uno de costeo. Explica que el tope es el CPA máximo del costeo.
  3. **La escalera** (`ladder`): 15 escalones clicables N1–N15, agrupados en 3 bloques. Al tocar uno se ven su presupuesto, el "+20 % sobre …" y el bloque. Animación de subida (sin animación con `prefers-reduced-motion`).
  4. **La ventana de 3 días** (`window`): 3 columnas (anteayer, antier, ayer) con gasto, ventas y CPA; el CPA de la ventana = gasto total ÷ ventas totales, ubicado sobre la barra de zonas. Mensaje: "Ayer solo prende la alerta; decide la ventana. Las ventas del día no pesan, pesa el CPA."
  5. **Día malo y regla dura** (`rules`): mapa de ramas (`SCALE_MAP`) con todas las salidas de `scaleVerdict` y su semáforo: subir, sostener, día flojo, bajar, zona de apagar, regla dura (dos días seguidos sobre `apaga`) y la excepción de un solo día (0 ventas, 0 pagos iniciados y el doble de `apaga` gastado).
  6. **Protección durante el día** (`guard`): las dos reglas del curso, "Subida sin ventas" y "Amanecer rojo", con la etiqueta "Regla del curso". Los montos salen de `escala` (1 CPA = 12.000; 3 CPA = 36.000).
  7. **Practica** (`map`, `sim`): simulacro igual al de Testeo.
     - **Práctica:** banco de casos inventados `SCALE_CASES`, ordenados al azar en cada ronda. Cada caso muestra el escalón actual y 3 días (o un momento del día para las protecciones). Decisiones `SCALE_ACTIONS`: ⬆️ Subir un escalón · = Sostener · ⬇️ Bajar un escalón · ⏬ Bajar dos escalones · 🛑 Apagar. La respuesta la calcula `scaleVerdict`/`scaleGuard`, no se escribe a mano. Al final se ven aciertos / decisiones y el mejor puntaje.
     - **Juega con los números:** escalón, tope y 3 días (gasto, ventas, pagos iniciados) editables. Muestra el CPA de cada día y de la ventana, la zona, el veredicto, el escalón nuevo y su presupuesto. Si un día tiene más ventas que pagos iniciados, sale un aviso y no hay veredicto.
- **Núcleo** `js/modules/scaling/core/scaling.js` (reemplaza a `SCALING_SOON`), sin DOM y probado en Node.
- **UI** `js/modules/scaling/ui/scaling.js` (nuevo: `TOOLS` con `start`, `zones`, `ladder`, `window`, `rules`, `guard`, `practice`, `free`, `light`).
- **Estado** `app.state.scaling` y guardado en `services.storage.scaling` con la clave **`pyl-escalado`** (no `pyl-scaling`: esa clave la usa la migración de Testeo y la copiaría a `pyl-testing`).
- **CSS** `css/modules/scaling.css` (solo tokens), después de `testing.css` y antes de `themes.css`.
- Pruebas en `tests/core.test.js` y `tests/smoke.test.js`; regenerar `tests/fixtures/claves-pyl.json`.
- En el paso 4 de Testeo, la frase "pestaña Escalado, hoy «Pronto»" pasa a "pasa a escalado (pestaña Escalado)".

**Fuera (otras specs):**

- Lectura real (subir el reporte y decidir el escalado de campañas reales) y el Simulador.
- Contenido de Escalado horizontal y Refresco de creativos (needle movers, ciclo de iteración).
- Unificar la Escalera del entrenador con esta (conviven dos versiones; deuda que ya estaba anotada).
- Llevar `cpaZones` o la tarjeta "Pronto" a `shared/`.

## Modelo de datos

### `js/modules/scaling/core/scaling.js` → `PYL.core.scaling`

Reutiliza `metrics.NS_TEST` (presupuesto base y `step` = 0,2), `metrics.GENERIC_CPA` y `testing.cpaZones`. Ningún número se repite a mano.

```js
// Umbrales con los nombres del Lab (sop_en_cop) más los del curso.
const SCALE_RULES = {
  window: 3,        // días de la ventana (MCP)
  salto: 1.5,       // ayer ≥ 1,5 × los días anteriores = día malo de verdad (MCP)
  offDays: 2,       // días seguidos sobre `apaga` = se apaga (regla dura, MCP)
  offDouble: 2,     // excepción de un solo día: 0 ventas, 0 PI y offDouble × apaga gastado (MCP)
  levels: 15,       // escalones que se muestran (decisión del usuario: los 15 primeros del MCP)
  raiseCpa: 1,      // curso · subida sin ventas: 1 CPA (escala) gastado sin ventas → baja 1
  dawnCpa: 3,       // curso · amanecer rojo: 3 CPA gastados…
  dawnSales: 1,     // …con 0 o 1 venta → baja 2
};

// Escalera: NS_TEST.budget × (1 + step)^n redondeado a 3 cifras significativas = la del MCP.
// scaleLadder(15) → [100000, 120000, 144000, 173000, 207000, 249000, 299000, 358000, 430000, 516000, 619000, 743000, 892000, 1070000, 1280000]
const scaleLadder = (n) => …;
const LADDER_BLOCKS = [ { from: 0, to: 4, t: 'Testeo y confirmación' }, { from: 5, to: 9, t: 'Zona de crecimiento' }, { from: 10, to: 14, t: 'Alto volumen' } ]; // curso

const SCALING_PARTS = [ { k: 'real', …, disabled: true, soon: {…} }, { k: 'scale', t: '📈 Fase de escalado' }, { k: 'sim', t: '⚠️ Simulador · revisar', disabled: true } ];
const scalingPart = (k) => …;          // igual que testingPart
const SCALE_METHODS = [ { k: 'surf', icon: '🏄', t: 'Surfing Scaling', d: '…', steps: SURF_STEPS }, { k: 'horiz', …, soon }, { k: 'refresh', …, soon } ];
const SCALE_ACTIONS = [ { k: 'up', … }, { k: 'hold', … }, { k: 'down', … }, { k: 'down2', … }, { k: 'off', … } ];
```

**Decisión del día (MCP):** `scaleVerdict({ days: [{ spend, sales, pi }…], level, tope })`. `days` va del más viejo a ayer. Usa los últimos `window` días; si hay menos (día 2), usa los que haya. Orden de evaluación:

1. **Regla dura:** los dos últimos días con CPA > `apaga` (o sin ventas con gasto) → `off`, `dura: true`.
2. **Excepción de un solo día:** ayer 0 ventas, 0 pagos iniciados y gasto ≥ `offDouble × apaga` → `off`, `dura: true`.
3. **Día flojo:** si los días anteriores venían bien (CPA conjunto ≤ tope) y ayer salió más caro: ayer < `salto ×` CPA anterior → `hold` ("fue un día flojo"); ≥ `salto ×` → `down`.
4. **Zona de la ventana** (CPA = Σ gasto ÷ Σ ventas): `< escala` → `up`; `≤ tope` → `hold`; `≤ apaga` → `down`; `> apaga` → `down` con aviso "zona de apagar: nada se apaga por un solo día; si mañana vuelve a quedar aquí, son dos días seguidos y se apaga".

En el escalón base, "bajar" deja el presupuesto en N1 con la nota "ya estoy en el escalón base". En N15, "subir" se sostiene con la nota "último escalón de la escalera".

**Protección durante el día (curso):** `scaleGuard({ kind: 'raise' | 'dawn', spend, sales, level, tope })`. `raise`: después de subir, gasto ≥ `raiseCpa × escala` sin ventas nuevas → `down`; si no, `hold`. `dawn`: gasto ≥ `dawnCpa × escala` con ventas ≤ `dawnSales` → `down2`; si no, `hold`. Lleva `source: 'curso'`.

Las dos funciones devuelven la forma del Lab (`fase: 'escalando'`, `veredicto`, `toca`, `detalle`, `dura`, `senales`) más `action`, `light`, `branch` (rama del mapa), `source` (`'lab'` | `'curso'`), `cpa`, `cpaWin`, `zone`, `from`/`to` (índices de escalón) y `budget` (presupuesto nuevo). Se compara sin redondear.

Además:
- `scaleCheck`: valida los datos.
- `scaleFree`: devuelve lo que muestra "Juega con los números".
- `SCALE_CASES`, `SCALE_PRACTICE` (tope genérico) y `scalePractice*` (`New/Show/Decide/Next/View/Best`): funciones puras como las de Testeo.
- `SCALE_MAP`: las ramas del paso 5. Las pruebas exigen que sean exactamente las que devuelven `scaleVerdict` y `scaleGuard`.

**Nombres únicos al aplanar `js/index.js`:** todo lleva el prefijo `scale`/`SCALE_`/`SCALING_`/`LADDER_`. Se desaparece `SCALING_SOON`. Se revisa con grep.

### Estado y persistencia

```js
app.state.scaling = {
  part: 'scale',                          // única abierta
  method: 'surf',                         // método elegido
  plans: { surf: { active: 0, done: [] } }, // avance por método
  mode: 'practice', best: null,           // simulacro
  free: { level, tope, days: [{ spend, sales, pi } ×3] },
  run,                                    // ronda en curso (no se guarda)
};
```

`services.storage.scaling` (clave `pyl-escalado`) guarda todo menos `run`.

### HTML

`#v-escalado` cambia `#es-soon` por:
- `#es-parts`
- `#es-scale`, que contiene `#es-methods`, `#es-surf` (con `#es-h`, `#es-sub`, `#es-prog`, `#es-steps`, `#es-step`) y `#es-soon` (tarjeta "Pronto" del método)
- `#es-real-soon` (tarjeta de Lectura real, oculta mientras esté deshabilitada)

El simulacro usa `#es-sim`, `#es-modes`, `#es-mode` y `#es-f-*`. Scripts: `ui/scaling.js` después de `ui/testing.js`; `css/modules/scaling.css` después de `testing.css`.

### Dependencias

`scaling` usa:
- `shared/`
- `metrics`: `NS_TEST`, `GENERIC_CPA`, `copText`
- `testing`: `cpaZones`, `ui.testing.parts/soon/progress/bar`
- `landing`: `ui.landing.stepList/stepDetail`
- `search`: `ui.search.strategyTabs`

Todos cargan antes que `scaling`.

## Plan de implementación

1. **Núcleo.** `core/scaling.js` con `SCALE_RULES`, `scaleLadder`, `LADDER_BLOCKS`, `scaleVerdict`, `scaleGuard`, `SCALE_MAP`, `SCALE_ACTIONS`, `SCALING_PARTS`/`scalingPart`, `SCALE_METHODS`, `SURF_STEPS`, casos, práctica y `scaleFree`. Pruebas en Node:
   - La escalera es igual a la del MCP.
   - Cada rama con sus bordes: CPA justo en `escala`, en `tope` y en `apaga`; ayer justo en ×1,5; regla dura; excepción del doble.
   - Escalón base y escalón 15.
   - `scaleGuard` en sus bordes (12.000 y 36.000).
   - `SCALE_MAP` igual a las ramas que salen de las funciones.
   - Cada caso de práctica tiene respuesta.
2. **Sub-pestañas, métodos y pasos 1–6.** HTML, `ui/scaling.js` (`start`, `zones`, `ladder`, `window`, `rules`, `guard`), `app/scaling.js` con estado y guardado (`pyl-escalado`), `scaling.css`. Prueba de humo: las sub-pestañas en orden y deshabilitadas; los métodos, con "pronto" que abre la tarjeta; los 7 pasos; la escalera que responde al clic.
3. **Simulacro (paso 7).** Práctica y "Juega con los números"; ilumina la rama del mapa. Prueba de humo: una ronda completa y un aviso cuando hay más ventas que pagos iniciados.
4. **Documentación.** Después del merge, actualizar `CLAUDE.md` y `README.md`.

## Criterios de aceptación

**Estructura**
- [x] Escalado muestra 3 sub-pestañas en este orden: "📂 Lectura real · pronto" (apagada), "📈 Fase de escalado" (abierta) y "⚠️ Simulador · revisar" (apagada).
- [x] La Fase de escalado muestra las tarjetas de método: Surfing Scaling, Escalado horizontal (pronto) y Refresco de creativos (pronto). Se recuerda el método elegido.
- [x] Surfing Scaling tiene 7 pasos con avance, casilla por paso y "Empezar de nuevo".

**Contenido**
- [x] Paso 1: el día 1 es testeo y el escalado empieza el día 2 si el día se gastó entero con ventas. Se ven las dos fuentes.
- [x] Paso 2: las zonas cambian al editar el tope (12.000 / 15.000 / 20.000 con el tope genérico).
- [x] Paso 3: la escalera tiene 15 escalones (100.000 → 1.280.000, los del MCP) en 3 bloques y muestra el +20 % al tocar cada uno.
- [x] Paso 4: el CPA de la ventana = gasto total ÷ ventas totales de los 3 días.
- [x] Paso 5: están todas las ramas del MCP, con la regla dura marcada "dura".
- [x] Paso 6: "Subida sin ventas" y "Amanecer rojo" llevan la etiqueta "Regla del curso" y sus montos salen de `escala`.
- [x] Paso 7: la práctica califica con `scaleVerdict`/`scaleGuard`; "Juega con los números" responde en vivo.

**Calidad**
- [x] Ningún número escrito a mano: presupuesto y +20 % salen de `NS_TEST`, el tope de `GENERIC_CPA`, las zonas de `cpaZones`.
- [x] Ids `#es-` únicos; `pyl-escalado` no choca con la migración de Testeo.
- [x] Pasan `node tests/core.test.js`, `tests/smoke.test.js` y `node --check` de cada archivo tocado; `claves-pyl.json` coincide con `--claves`; la consola queda limpia.
- [x] Se lee bien en los 7 temas y en pantallas angostas (revisado en el navegador).
- [x] La Fase de testeo, Métricas y la Escalera del entrenador no cambian, salvo la frase del paso 4 de Testeo.

## Decisiones

- **Sí:** el MCP manda donde choca con el curso; "Cuándo empieza" y "Bajar" integran las dos fuentes (decisión del usuario).
- **Sí:** escalera de los 15 primeros escalones del MCP, calculada desde `NS_TEST` (decisión del usuario). **No:** los niveles del curso (saltos que no son de 20 %).
- **Sí:** las reglas del curso se ven con la etiqueta "Regla del curso", así se sabe de dónde sale cada una.
- **Sí:** los métodos van en tarjetas y lo que no se ha documentado queda como "pronto". **Supuesto:** Escalado horizontal y Refresco de creativos son métodos aparte (el usuario no lo ha confirmado).
- **Sí:** clave `pyl-escalado`. **No:** `pyl-scaling` (la migración de Testeo la toma como suya).

## Riesgos

| Riesgo | Mitigación |
|---|---|
| "Día flojo" y la zona de la ventana se contradicen | Orden fijo de evaluación con pruebas de cada borde |
| Las protecciones del curso (por horas) se mezclan con la ventana del MCP (por días) | Funciones separadas (`scaleVerdict` / `scaleGuard`) y etiqueta de fuente |
| Un nombre nuevo choca al aplanar `js/index.js` | Prefijos `scale`/`SCALE_` y grep |
| La clave guardada choca con la migración de Testeo | `pyl-escalado` y prueba de que la migración no la toca |
