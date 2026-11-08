# SPEC 06 — Módulo Testeo y pestaña Escalado

> **Estado:** Implementando
> **Depende de:** SPEC 02, SPEC 05
> **Fecha:** 2026-11-08
> **Objetivo:** Renombrar el módulo "Escalado" a "Testeo" (con sub-pestañas "Lectura real", deshabilitada y marcada "pronto", y "Fase de testeo") y mover Surfing Scaling a una pestaña nueva "Escalado" que por ahora solo muestra su tarjeta "Pronto".

## Por qué existe esta spec

Lo que hizo la SPEC 05 es la fase de testeo, no el escalado. Después de pautar, el paso lógico es testear; escalar viene después, cuando un conjunto pasa el testeo. Los nombres deben seguir ese orden.

El módulo Testeo va a tener dos partes:

- **Fase de testeo:** lo que ya existe (paso a paso + simulacro con casos inventados). No cambia su contenido.
- **Lectura real:** subir el archivo real de las campañas y que la app lea las métricas para decidir, como el paso 3 "Testear" del Lab de NovaSociety (página "Los testeos · ¿Cuál sigue y cuál apago?": por día lee gasto, pagos iniciados y compras, y califica con los cortes 20, 30 y 40 mil). **En esta spec solo se anuncia con una sub-pestaña deshabilitada "pronto" (como TikTok Ads en Desarrollo).** Su implementación va en otra spec.

Surfing Scaling sale de Testeo y queda en su propia pestaña "Escalado", que hoy solo anuncia lo que vendrá.

Hoy el código de Testeo vive en `js/modules/scaling/` ("escalado" en inglés). Si la pestaña nueva se llama Escalado, ese nombre le pertenece. Por eso el código de Testeo pasa a `testing` y `scaling` queda para Escalado.

## Alcance

**Dentro:**

- **Renombrar el código de Testeo** (refactor, sin cambiar lo que hace):
  - Carpeta `js/modules/scaling/` → `js/modules/testing/` (`core/testing.js`, `ui/testing.js`, `app/testing.js`).
  - Namespaces `PYL.core.scaling`, `PYL.ui.scaling` → `PYL.core.testing`, `PYL.ui.testing`.
  - Estado `app.state.scaling` → `app.state.testing`.
  - `css/modules/scaling.css` → `css/modules/testing.css`, en el mismo lugar de la cascada.
  - Prefijo de ids y clases `#es-` / `.es-` → `#ts-` / `.ts-` (libre hoy).
  - Persistencia `services.storage.scaling` (`pyl-scaling`) → `services.storage.testing` (`pyl-testing`), con migración del valor guardado.
  - `SCALING_PARTS` → `TESTING_PARTS`, `scalingPart` → `testingPart`. Los demás nombres (`TEST_*`, `test*`, `practice*`, `cpaZones`, `CPA_ZONES`) no cambian.
- **Pestaña "Testeo"** (lo visible):
  - Botón de la barra superior "Testeo", en el mismo lugar (después de Métricas), con `data-v="testeo"` y vista `#v-testeo`.
  - Encabezado nuevo: eyebrow "Después de pautar · decido qué sigue y qué apago", título "Testeo", lead "El testeo es la primera prueba de un anuncio: con un presupuesto limitado, miro pagos iniciados y ventas en cada corte y decido qué conjunto se apaga y cuál sigue." y la etiqueta "Criterio NovaSociety".
  - Sub-pestañas `#ts-parts` (`aria-label` "Parte del testeo"): "📂 Lectura real · pronto" a la izquierda (`data-part="real"`) y "🧪 Fase de testeo" a la derecha (`data-part="test"`). Se recuerda la elegida.
  - Tercera sub-pestaña "⚠️ Simulador · revisar" (`data-part="sim"`), **deshabilitada** igual que Lectura real (se ve apagada, no se abre). El **módulo Simulador del entrenador se elimina por completo** (decisión del usuario: lo que sale de aquí se borra del todo): `#v-sim`, el botón `data-v="sim"`, su código en `trainer.js` (presets, `updTrack`, `evaluate`, historial `ns_hist`), sus estilos (`.track`, `.sema`, `.verdict`, `.pop`, `.hist*`, `.rules-mini`, `.rm*` y sus reglas de `themes.css`) y sus pruebas. La sub-pestaña queda como marcador con aviso "revisar", sin contenido. Los accesos que iban a `sim` (Inicio "Evaluar un conjunto", la ruta de Métricas, que ahora dice "Testeo →", y el último paso de la guía de Meta Ads) van a Testeo. Una vista guardada que ya no existe abre Inicio (`nav.js`).
  - "Lectura real" está **deshabilitada** (`disabled`, `title="Pronto"`, opacidad .5 con la misma regla de `#v-desarrollo .seg button:disabled`, en `testing.css`): se ve pero no se puede abrir, como "TikTok Ads · pronto". Nunca queda guardada como parte abierta.
  - Sus datos (`soon`) quedan en `TESTING_PARTS` para cuando se active; la tarjeta `#ts-soon` queda lista pero oculta. Contenido de esa tarjeta, con el mismo formato de la de Surfing Scaling:
    - Título "📂 Lectura real" y la frase "Subo el reporte de mis campañas y la app me dice qué hacer con cada conjunto. Esta parte llega en otra entrega."
    - "Subo mi reporte de Meta (el archivo del Administrador de anuncios)."
    - "Califica cada conjunto con los cortes 20.000, 30.000 y 40.000, igual que la Fase de testeo." (cortes desde `NS_TEST.cuts`).
    - "Decisión por conjunto: apagar, mantener vigilando, seguir sin tocar o dejar gastar el día, con la frase del Lab." (nombres desde `TEST_ACTIONS`).
    - "Si se apaga, qué revisar: el CPM, el CPC o la página, la oferta y el formulario."
  - Paso 4 (Corte 3 · 40.000): la frase "pasa a escalado (apartado Surfing Scaling, hoy «Pronto»)" cambia a "pasa a escalado (pestaña Escalado, hoy «Pronto»)".
- **Pestaña nueva "Escalado"** (módulo `js/modules/scaling/`, ahora para escalar):
  - Botón "Escalado" justo después de "Testeo" (`data-v="escalado"`, vista `#v-escalado`).
  - Encabezado: eyebrow "Después de testear · aprendo a escalar", título "Escalado", lead "Cuando un conjunto pasa el testeo, se escala. Aquí aprenderé cómo, con la metodología de NovaSociety." y la etiqueta "Criterio NovaSociety".
  - Una sola tarjeta "Pronto" (`#es-soon`) con el contenido de la tarjeta actual de Surfing Scaling: título "🏄 Surfing Scaling", "+20 % de presupuesto por escalón" (desde `NS_TEST.step`), niveles de presupuesto y refresco de campañas.
  - Sin sub-pestañas, sin estado y sin guardado.
- Pruebas actualizadas en `tests/core.test.js` y `tests/smoke.test.js`; `tests/fixtures/claves-pyl.json` regenerado.
- Actualizar `CLAUDE.md` y `README.md` después del merge.

**Fuera (para specs futuras):**

- Implementar "Lectura real": subir el archivo, leer las métricas y calificar cada conjunto.
- Implementar Surfing Scaling (+20 % por escalón, ventana de 3 días, regla dura, niveles N1–N15, refresco).
- Sub-pestañas dentro de Escalado.
- Cambiar el contenido de la Fase de testeo (pasos, reglas, casos, simulacro).
- Rehacer el Simulador dentro de Testeo (hoy solo queda su sub-pestaña apagada) y mover o borrar la pestaña Escalera del entrenador.
- Llevar la tarjeta "Pronto" a `shared/` para que la usen otros módulos.

## Modelo de datos

### `js/modules/testing/core/testing.js` → `PYL.core.testing`

Mismo contenido que el `core/scaling.js` actual, con estos cambios:

```js
// Sub-pestañas de Testeo. Una parte con `disabled` se ve pero no se abre; su `soon` es la tarjeta "Pronto" que mostrará.
const TESTING_PARTS = [
  { k: 'real', t: '📂 Lectura real · pronto', disabled: true, soon: {
    icon: '📂', h: 'Lectura real',
    d: 'Subo el reporte de mis campañas y la app me dice qué hacer con cada conjunto. Esta parte llega en otra entrega.',
    items: [ /* reporte de Meta · cortes (NS_TEST.cuts) · decisión (TEST_ACTIONS) · qué revisar si se apaga */ ],
  } },
  { k: 'test', t: '🧪 Fase de testeo' },
  { k: 'sim', t: '⚠️ Simulador · revisar', disabled: true },  // el módulo Simulador se eliminó; queda el marcador
];
// Un valor guardado de una parte deshabilitada ('real') o viejo ('surf') cae en la primera abierta: 'test'.
const testingPart = (k) => TESTING_PARTS.find((p) => p.k === k && !p.disabled) || TESTING_PARTS.find((p) => !p.disabled);
```

### `js/modules/scaling/core/scaling.js` → `PYL.core.scaling` (nuevo, para Escalado)

```js
// Encabezado y tarjeta "Pronto" de Escalado. El +20 % sale de NS_TEST.step.
const SCALING_SOON = {
  icon: '🏄', h: 'Surfing Scaling',
  d: 'Cuando un conjunto pasa el testeo, se escala. Esta parte llega en otra entrega.',
  items: [ /* +20 % por escalón · niveles de presupuesto · refresco de campañas */ ],
};
```

### Estado y persistencia

```js
app.state.testing = {
  part: 'test',   // 'test' (única abierta; 'real' y 'sim' están deshabilitadas)
  test, mode, best, free, run,       // igual que hoy en app.state.scaling
};
```

- `services.storage.testing` con clave **`pyl-testing`**: `{ part, test, mode, best, free }`, igual que hoy.
- **Migración (una sola vez):** si `pyl-testing` no existe y `pyl-scaling` sí, se copia su valor a `pyl-testing` y se borra `pyl-scaling`. Así no se pierden pasos hechos, mejor puntaje ni números de "Juega con los números".
- Escalado no guarda nada: no hay `services.storage.scaling` ni `app.state.scaling`.

### HTML, UI y CSS

- `index.html`:
  - Barra: `<button data-v="testeo">Testeo</button>` y después `<button data-v="escalado">Escalado</button>`. Quedan 10 pestañas con Escalado (el Simulador sale de la barra: 11 − 1).
  - `<section class="view" id="v-testeo">` con los ids `#ts-*` (hoy `#es-*`) y, justo después, `<section class="view" id="v-escalado">` con el encabezado y `#es-soon`.
  - Scripts en su capa: `modules/testing/core/testing.js` y `modules/scaling/core/scaling.js` después de `metrics` core (testing antes de scaling); `ui/testing.js`; `app/testing.js` y después `app/scaling.js`.
  - `<link>` a `css/modules/testing.css` en el lugar de `scaling.css`. Escalado no tiene CSS propio: usa las clases de la tarjeta "Pronto".
- `js/index.js`: `'modules/testing/core/testing'` y `'modules/scaling/core/scaling'` en el lugar del `scaling` actual.
- `css/base.css`: la regla de títulos de tarjeta pasa de `#v-escalado` a `#v-testeo, #v-escalado`.
- `PYL.ui.testing`: mismo contenido que el `ui/scaling.js` actual (`parts`, `soon`, `bar`, `cut`, `cuts`, `chain`, `practice`, `free`…) con el prefijo `.ts-` / `#ts-`.
- `js/modules/scaling/app/scaling.js`: pinta la tarjeta con `PYL.ui.testing.soon($('#es-soon'), C.SCALING_SOON)`.

### Dependencias

- `testing` usa `shared/`, `metrics`, `ads` y `landing` (las mismas que hoy `scaling`).
- `scaling` (Escalado) usa `metrics` (`NS_TEST.step`) y `testing` (`ui.testing.soon`). Ambos cargan antes.

Convenciones:

- Nombres únicos al aplanar `js/index.js`: `TESTING_PARTS`, `testingPart` y `SCALING_SOON` son nuevos; `SCALING_PARTS` y `scalingPart` desaparecen. Se revisa con grep.
- Ningún número se escribe a mano: cortes desde `NS_TEST.cuts`, escalón desde `NS_TEST.step`.

## Plan de implementación

1. **Renombrar el código de Testeo (sin cambio visible).** `git mv` de `js/modules/scaling/` a `js/modules/testing/` y de `scaling.css` a `testing.css`. Cambiar namespaces, estado, prefijo `#es-`/`.es-` → `#ts-`/`.ts-`, `SCALING_PARTS` → `TESTING_PARTS`, `scalingPart` → `testingPart`, rutas en `index.html` y `js/index.js`. Storage `testing` con clave `pyl-testing` y migración desde `pyl-scaling`. La pestaña sigue diciendo "Escalado". Actualizar pruebas y `claves-pyl.json`. Todo pasa igual que antes.
2. **Pestaña Testeo con sus sub-pestañas.** Botón "Testeo", `data-v="testeo"`, `#v-testeo`, encabezado nuevo y regla de `base.css`. `TESTING_PARTS` con "Lectura real · pronto" (deshabilitada) y "Fase de testeo", en ese orden; quitar Surfing Scaling. Cambiar la frase del paso 4. Pruebas: core (partes en orden `real`, `test`; `testingPart('surf')` y `testingPart('real')` dan `test`; los datos `soon` traen los cortes de `NS_TEST`); humo (sub-pestañas en ese orden, "Lectura real" deshabilitada y al hacer clic no se abre).
3. **Pestaña Escalado nueva.** `core/scaling.js` con `SCALING_SOON`, `app/scaling.js`, botón y `#v-escalado` después de Testeo. Pruebas: core (`SCALING_SOON` dice +20 % desde `NS_TEST.step`); humo (orden Métricas → Testeo → Escalado, Escalado muestra solo `#es-soon`). Regenerar `claves-pyl.json`.
4. **Eliminar el Simulador.** Borrar `#v-sim`, su botón, su código en `trainer.js`, sus estilos y sus pruebas; dejar la sub-pestaña "⚠️ Simulador · revisar" deshabilitada; redirigir los `data-go="sim"` y `view: 'sim'`; `nav.js` cae en Inicio si la vista guardada no existe. Pruebas: 10 pestañas; ya no existe nada del Simulador y su sub-pestaña no se abre.
5. **Documentación.** Después del merge, actualizar `CLAUDE.md` y `README.md`: módulo `testing` (pestaña Testeo, `pyl-testing`, prefijo `#ts-`, migración), módulo `scaling` (pestaña Escalado, solo "Pronto") y las dependencias.

## Criterios de aceptación

**Testeo**

- [x] La barra superior muestra "Testeo" justo después de "Métricas" y abre `#v-testeo`.
- [x] El encabezado dice "Testeo" con el eyebrow y el lead nuevos (descripción general de qué es el testeo).
- [x] Hay tres sub-pestañas: "📂 Lectura real · pronto", "🧪 Fase de testeo" y "⚠️ Simulador · revisar", en ese orden. No aparece "Surfing Scaling".
- [x] "Lectura real" se ve apagada y no se puede seleccionar (como "TikTok Ads · pronto" en Desarrollo); la Fase de testeo abre por defecto.
- [x] Tercera sub-pestaña "⚠️ Simulador · revisar" apagada y no seleccionable; no queda nada del módulo Simulador (vista, botón, código, estilos, `ns_hist`); no hay botón "Simulador" en la barra superior.
- [x] Los accesos que iban al Simulador (Inicio, ruta de Métricas, guía de Meta Ads) abren Testeo; una vista guardada `sim` abre Inicio.
- [x] Los datos de "Lectura real" (`soon`) traen los 4 puntos: reporte de Meta, cortes 20.000 / 30.000 / 40.000, decisión por conjunto y qué revisar si se apaga.
- [x] La Fase de testeo se ve y funciona igual que antes: 6 pasos, mapa, práctica y "Juega con los números".
- [x] El paso 4 dice "pasa a escalado (pestaña Escalado, hoy «Pronto»)".
- [ ] Con datos guardados en `pyl-scaling`, al cargar se conservan los pasos hechos, el paso abierto, el modo, el mejor puntaje y los números; queda `pyl-testing` y ya no existe `pyl-scaling` (revisado en el navegador).
- [x] Si lo guardado tenía la sub-pestaña `surf` o `real`, abre "Fase de testeo".

**Escalado**

- [x] La barra superior muestra "Escalado" justo después de "Testeo" y abre `#v-escalado`.
- [x] El encabezado dice "Escalado" con su eyebrow y lead.
- [x] Solo hay una tarjeta "Pronto" "🏄 Surfing Scaling" con +20 % por escalón, niveles de presupuesto y refresco de campañas. No hay sub-pestañas.

**Calidad**

- [x] No queda `PYL.core.scaling` ni `PYL.ui.scaling` usado por Testeo; no queda `#es-` en Testeo ni `.es-` en `testing.css`.
- [x] `#es-soon` es el único id `#es-` de la página.
- [x] Ningún número se escribe a mano (cortes y escalón desde `NS_TEST`).
- [ ] Se leen bien en los 7 temas y en pantallas angostas (revisado en el navegador).
- [x] Pasan `node tests/core.test.js`, `tests/smoke.test.js` (10 pestañas) y `node --check` de cada archivo tocado.
- [x] `claves-pyl.json` coincide con `--claves` y la consola queda limpia.
- [x] No hay ids repetidos en `index.html`.
- [x] Escalera, Métricas y la guía de Meta Ads no cambian (salvo los accesos al Simulador ya indicados, la limpieza de su código en `trainer.js` y la etiqueta "Criterio NovaSociety" que se agrega al encabezado de Métricas, como en las demás pestañas).

## Decisiones

- **Sí:** el módulo de la SPEC 05 se llama "Testeo": es lo que enseña y el paso que sigue a pautar. **No:** seguir llamándolo "Escalado".
- **Sí:** Surfing Scaling va a una pestaña propia "Escalado", después de Testeo. **No:** dejarla como tercera sub-pestaña de Testeo.
- **Sí:** renombrar también el código (`testing`, `#ts-`, `pyl-testing`) para que `scaling` quede para Escalado. **No:** dejar `scaling` a Testeo; el nombre diría lo contrario de lo que hay adentro. **No:** solo cambiar lo visible, como se hizo con Synkops/PYL: aquí el nombre chocaría con el módulo nuevo.
- **Sí:** migrar `pyl-scaling` a `pyl-testing` una vez y borrar la clave vieja. **No:** empezar de cero; se perdería el avance y el mejor puntaje.
- **Sí:** `data-v="escalado"` y `#v-escalado` pasan a la pestaña nueva. Quien tenga guardada la vista `escalado` (`ns_view`) abre Escalado una vez; es aceptable.
- **Sí:** "Lectura real" solo como sub-pestaña deshabilitada "pronto", a la izquierda (ajuste del usuario tras ver la pantalla; antes era una tarjeta "Pronto"). **No:** implementar la lectura del archivo aquí; es otra spec y debe contrastarse con el MCP de NovaSociety.
- **Sí:** el nombre "📂 Lectura real", elegido por el usuario.
- **Sí:** Escalado con una sola tarjeta "Pronto", sin sub-pestañas ni guardado. **No:** dejar ya la barra de sub-pestañas con una sola parte.
- **Sí:** Escalado reutiliza `ui.testing.soon`. **No:** mover la tarjeta "Pronto" a `shared/` en esta spec (cambio de alcance).
- **Sí:** el refactor se hace primero y sin cambio visible (paso 1), para que las pruebas digan si algo se rompió antes de tocar textos.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Se pierde el avance guardado al cambiar la clave | Migración `pyl-scaling` → `pyl-testing` al cargar; se revisa en el navegador con datos reales |
| Queda un `#es-` / `.es-` viejo en Testeo y choca con Escalado | Grep tras el paso 1; prueba de humo: `#es-soon` es el único `#es-` |
| Un estilo de `testing.css` no cambió de prefijo y algo se ve roto | Grep de `.es-` en `css/`; revisión en el navegador en los 7 temas |
| `git mv` pierde historia o deja el archivo viejo | Commit atómico del paso 1 solo con los movimientos y renombres |
| Un nombre nuevo choca al aplanar `js/index.js` | Grep de `TESTING_PARTS`, `testingPart`, `SCALING_SOON` antes de exportar |
| Las pruebas de humo que cuentan pestañas fallan | Se actualizan en los pasos 3 y 4 |

## Lo que **no** está en esta spec

- Lectura real de métricas (subir archivo, leer, calificar).
- Surfing Scaling y todo lo de escalar.
- Sub-pestañas en Escalado.
- Cambios al contenido de la Fase de testeo.
- Cambios a Simulador, Escalera, `trainer.js`, Métricas o la guía de Meta Ads.
- Tarjeta "Pronto" compartida en `shared/`.

Cada una de esas, si llega, va en su propia spec.
