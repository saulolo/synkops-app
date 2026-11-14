# SPEC 12 — Atajos flotantes en Testeo

> **Estado:** Aprobado
> **Depende de:** SPEC 03, SPEC 09, SPEC 11
> **Fecha:** 2026-11-13
> **Objetivo:** Agregar a la pestaña Testeo dos botones flotantes, "Cadena que decide" y "Métricas duras", que abren un resumen de consulta de la cadena CPM → CPC → CPPI → CPA y de las 5 métricas duras (con interruptor Meta | TikTok), con el detalle de cada una al hacer clic.

## Por qué existe esta spec

Mientras leo los cortes del testeo o juego en el Simulador, necesito tener a la mano dos cosas que viven en la pestaña Métricas: la cadena que decide todo y los límites de las métricas duras. Hoy tengo que cambiar de pestaña y perder lo que estaba mirando. Buscar producto y Desarrollo ya tienen botones flotantes con atajos (SPEC 01, SPEC 09 y Prompt buscar anuncios); Testeo sigue el mismo patrón.

## Alcance

**Dentro:**

**Parte 1 · Módulo y botones**

- Módulo nuevo `js/modules/cheat/{core,ui,app}/cheat.js` (`PYL.core.cheat`, `PYL.ui.cheat`, `app.state.cheat`) y `css/modules/cheat.css`.
- Contenedor `<div class="ch" id="ch-root"></div>` al final de `#v-testeo`. Los botones solo existen en la pestaña Testeo y se ven en las tres sub-pestañas (Lectura real, Fase de testeo, Simulador).
- Dos botones redondos con el estilo de `.qk-btn` (degradado del tema, siguen los 7 temas):
  - `#ch-c-btn` "Cadena que decide": abajo en la esquina (`right: 20px; bottom: 20px`). Ícono SVG en línea de eslabones (`ICON_CHAIN`, `currentColor`).
  - `#ch-d-btn` "Métricas duras": un puesto encima (`bottom: 86px`). Ícono SVG en línea de barras (`ICON_HARD`, `currentColor`).
- Cada botón abre su panel (`#ch-c-panel`, `#ch-d-panel`) con el estilo de `.qk-panel` y el título de los paneles flotantes (`.qk-head`/`.qk-title`, color `var(--b)`).
  - El panel de Cadena abre en `bottom: 86px`; el de Métricas duras en `bottom: 152px`.
- Se cierra con ✕ (`#ch-c-x`, `#ch-d-x`), con Esc (si no hay un diálogo encima) y al volver a tocar su botón.
- Abrir un panel cierra el otro. Los dos se coordinan con el evento `flotante:abierto` (`detail.id = 'chc' | 'chd'`), igual que `dk`, `qk` y `ap`.
- Al salir de la pestaña (evento `nav:vista` con otra vista) se cierra el panel abierto.
- `#v-testeo` gana `padding-bottom: 150px` para que los botones no tapen el final de la pestaña.
- No guarda nada entre sesiones.

**Parte 2 · Panel "Cadena que decide"**

- Cabecera: título "La cadena que decide todo", etiqueta "Criterio NovaSociety" y la línea "El primero que se rompe es mi problema; lo que viene después es consecuencia."
- La cadena como en la imagen de Métricas, en HTML (no se copia el SVG de `#hm-cadena`):
  - Dos grupos con su rótulo: "Métricas antes del clic" (CPM, CPC) y "Métricas después del clic" (CPPI, CPA), separados por una raya punteada.
  - 4 eslabones (`#ch-c-chain [data-k]`, `button`): "Paso N" arriba y el nombre grande abajo, unidos por una línea.
- **Zona de detalle** `#ch-c-zone` (dentro del panel, bajo la cadena):
  - Solo el clic (`click`: mouse, Tab + Enter o toque) marca un eslabón (`.on`, `aria-pressed="true"`) y pinta su resumen en la zona. Pasar el mouse o enfocar no cambia nada (decisión del usuario, 2026-11-13).
  - Al abrir el panel está marcado el paso 1 (CPM). Lo marcado se mantiene hasta que se hace clic en otro.
  - Resumen de cada eslabón:
    - nombre completo y qué mide (`HARD_METRICS[k].means.full` y `.simple`);
    - límite en Meta y en TikTok (`HARD_METRICS[k].view.meta.main` y `.view.tiktok.main`);
    - "Si falla → Solución": para CPM, CPC y CPPI la lectura de `TEST_CHAIN.reads` (`when` y `fix`); para CPA un texto propio de `core/cheat.js` (ver Modelo de datos).
- **"¿Qué falla y cómo lo arreglo?" condensado** (decisión del usuario, 2026-11-13): bajo el resumen, la zona trae la tabla de causas del eslabón marcado, más corta que la del Entrenador (CPM 4 causas, CPC 2, CPPI 4, CPA 6). Cada causa es una tarjeta: nombre, "Se nota" y "Solución"; al pie, la frase de la regla (`CH_HELP` en `core/cheat.js`). El panel de Cadena es más ancho (520 px) y solo se desplaza la zona de detalle; la cadena queda fija arriba.
- Sin la tarjeta de Inicio ni el párrafo largo: no se toca `trainer.js` (la tabla condensada se redacta en `core/cheat.js`).

**Parte 3 · Panel "Métricas duras"**

- Cabecera: título "Métricas duras", etiqueta "Criterio NovaSociety" e interruptor `#ch-d-plat` Meta | TikTok (dos opciones, radios ocultos con la elegida en el color del tema, como los de Prompt DropKiller).
- Tabla `#ch-d-rows` con las 5 filas en el orden del diagrama (`HARD_METRICS`: CTR, CPC, CPM, CPPI, CPA). Cada fila (`[data-k]`, `button`) muestra:
  - nombre (`name`),
  - límite de la plataforma elegida (`view[plat].main`),
  - pregunta (`question`).
- **Zona de detalle** `#ch-d-zone` (dentro del panel, bajo la tabla), con el mismo comportamiento que la de Cadena (solo `click`; al abrir, la primera fila):
  - "Límite máximo permitido" de esa plataforma y, si lo hay, el rango ideal (`view[plat].tip.li`); la nota `tip.p` si existe (CTR: "No se mira…");
  - en CTR de Meta, la advertencia ⚠ `CTR_UNIQUE_WARN` en amarillo (`.hm-warn`);
  - en CPA (no tiene `tip`): las zonas genéricas de `GENERIC_CPA` (escala, tope, apaga);
  - "Diagnóstico si falla" y "Palanca de solución" de la fila (`diag`, `lever`, con `FAIL_HEAD` como rótulos), pintados con `ui.dom.rich`.
- **Plataforma:** al abrir el panel, el interruptor toma la plataforma del Simulador (`app.state.testing.sim.plat`). Cambiarla en el panel repinta la tabla y la zona, pero no cambia el Simulador ni se guarda. Al cerrar y volver a abrir, vuelve a tomar la del Simulador.

**Pruebas y documentación**

- `tests/core.test.js`: datos de `core/cheat.js` armados desde sus fuentes (ver Criterios).
- `tests/smoke.test.js`: botones solo en `#v-testeo`, abrir/cerrar, exclusión entre paneles (también con `dk`/`qk`/`ap` si estuvieran abiertos), zona de detalle con `click` (`mouseenter` y `focus` no cambian nada), interruptor de plataforma, plataforma tomada del Simulador, cierre con `nav:vista`.
- Agregar `core/cheat.js` a `js/index.js` y regenerar `tests/fixtures/claves-pyl.json`.
- Después del merge, actualizar `CLAUDE.md` y `README.md`.

**Fuera (otras specs):**

- Copiar el párrafo largo de la cadena de `trainer.js` o sacar su tabla completa a un `core` compartido: es parte de la Fase 2 del entrenador. La versión condensada de la tabla sí va en el panel (`CH_HELP`) y queda duplicada con la del Entrenador hasta esa Fase 2.
- El panel "i" completo de cada métrica (semáforo, analogía, fórmula) y las flechas del diagrama.
- Métricas base y métricas blandas en un panel flotante.
- Mostrar en los paneles los valores del punto actual del Simulador (la cadena con semáforo ya está en el Simulador).
- Botones flotantes en otras pestañas (Métricas, Escalado).
- Llevar los estilos de los botones flotantes a `base.css` como `.fab`/`.fab-panel` (deuda anotada desde la SPEC 09).
- Guardar la plataforma del panel o el panel abierto.

## Modelo de datos

### Archivos nuevos

- `js/modules/cheat/core/cheat.js` → `PYL.core.cheat`. Sin DOM. Nombres con prefijo `ch`/`CH_` para no chocar al aplanar en `js/index.js`. Va después de `scaling/core/scaling.js` (usa `SCALE_RULES`) en `index.html` y en `js/index.js`.
- `js/modules/cheat/ui/cheat.js` → `PYL.ui.cheat`. Va después de `testing/ui/simulator.js`. Recibe datos y callbacks; no muta estado.
- `js/modules/cheat/app/cheat.js` → `app.state.cheat`. Va después de `testing/app/testing.js` (lee `app.state.testing.sim.plat`).
- `css/modules/cheat.css`: `<link>` después de `testing.css` y antes de `themes.css`. Reutiliza `.qk-btn`, `.qk-panel`, `.qk-head`, `.qk-title` (de `quick.css`) y el interruptor `.dk-*` (de `dkprompt.css`); solo trae lo propio (`bottom` de cada botón y panel, cadena, tabla, zona) y `#v-testeo{padding-bottom:150px}`. Solo tokens del tema.

### `core/cheat.js`

```js
// Cadena: orden, paso y grupo. Los textos salen de HARD_METRICS y TEST_CHAIN.reads.
const CH_SIDES = [
  { k: 'antes',   t: 'Métricas antes del clic' },
  { k: 'despues', t: 'Métricas después del clic' },
];
const CH_CPA_READ = {                       // CPA no está en TEST_CHAIN.reads
  k: 'cpa',
  when: ['CPA sobre el tope (', { b: '$ 15.000' }, ' genérico)'],   // el número sale de GENERIC_CPA.tope
  fix: ['Sube en la cadena: el primer eslabón roto (CPM, CPC o CPPI) es el problema.'],
};
```

Funciones (puras):

- `chChain()` → `[{ k, step, side, name, full, simple, lim: { meta, tiktok }, read: { when, fix }, help: { rows: [{ cause, how, fix }], foot } }]` (`help` = `CH_HELP[k]`) para `cpm`, `cpc`, `cppi`, `cpa` (orden de `TEST_CHAIN.flow`; `cpm`/`cpc` en `antes`, `cppi`/`cpa` en `despues`).
- `chHard(plat)` → `[{ k, name, main, question, tip, warn, zones, diag, lever }]` en el orden de `HARD_METRICS`. `tip` = `view[plat].tip` o `null`; `warn` = `tip.warn` o `null`; `zones` = `GENERIC_CPA` solo en `cpa`, si no `null`.
- `chPlat(plat)` → `'meta' | 'tiktok'` (cualquier otro valor cae en `'meta'`).

Ningún número ni límite se escribe a mano: salen de `HARD_METRICS`, `GENERIC_CPA` y `TEST_CHAIN` (vía `metrics.copText`).

### Estado (`app.state.cheat`, no se guarda)

```js
{ open: null,        // null | 'chain' | 'hard'
  chainSel: 'cpm',   // eslabón marcado en Cadena
  hardSel: 'ctr',    // fila marcada en Métricas duras
  plat: 'meta' }     // plataforma del panel; se toma de testing.sim.plat al abrir
```

### Ids y clases (prefijo `#ch-`/`.ch-`)

`#ch-root`, `#ch-c-btn`, `#ch-c-panel`, `#ch-c-x`, `#ch-c-chain`, `#ch-c-zone`, `#ch-d-btn`, `#ch-d-panel`, `#ch-d-x`, `#ch-d-plat` (radios `#ch-d-plat-meta`, `#ch-d-plat-tiktok`, `name="ch-plat"`), `#ch-d-rows`, `#ch-d-zone`.

### Dependencias

`cheat` usa `metrics` (`HARD_METRICS`, `GENERIC_CPA`, `NS_TEST`, `CTR_UNIQUE_WARN`, `FAIL_HEAD`, `copText`), `testing` (`TEST_CHAIN`, `TEST_RULES`, `app.state.testing.sim.plat`), `scaling` (`SCALE_RULES`) y `shared/` (`ui.dom.rich`). Ninguno de ellos usa `cheat`. Evento `flotante:abierto` con `id: 'chc' | 'chd'`.

## Plan de implementación

Pruebas primero en cada paso: se escriben, fallan y luego se hace el código.

1. **Núcleo.** Pruebas en Node: `chChain()` da 4 eslabones en orden CPM, CPC, CPPI, CPA con su paso 1–4 y su grupo; `lim.meta`/`lim.tiktok` iguales a `view.*.main` de `HARD_METRICS`; `read` de CPM, CPC y CPPI igual a `TEST_CHAIN.reads`; el CPA dice el tope de `GENERIC_CPA`. `chHard('meta')` y `chHard('tiktok')` dan 5 filas en el orden de `HARD_METRICS`; CPM dice "≤ 20.000" en Meta y "≤ 6.000" en TikTok; CTR de Meta trae `warn` y el de TikTok no; solo CPA trae `zones`. `chPlat('x')` = `'meta'`. Luego `core/cheat.js`, su `<script>` y su línea en `js/index.js`.
2. **Botones y paneles vacíos.** Humo: `#ch-c-btn` y `#ch-d-btn` existen solo dentro de `#v-testeo`; cada uno abre su panel; ✕, Esc y el botón cierran; abrir uno cierra el otro y cierra `#dk-panel`/`#qk-panel`/`#ap-panel`; `nav:vista` a otra pestaña cierra. Luego `ui/cheat.js` (`build`, íconos), `app/cheat.js`, `#ch-root` en `index.html`, `cheat.css` (botones, paneles, `padding-bottom`).
3. **Panel Cadena.** Humo: 4 eslabones con "Paso 1…4" y los dos rótulos; al abrir, CPM marcado y su resumen en `#ch-c-zone`; `click` en CPPI pinta "Buen CPPI y sin ventas" (`mouseenter` y `focus` no cambian nada); el CPA muestra su lectura propia. Luego la cadena y la zona en `ui/cheat.js` y sus estilos.
4. **Panel Métricas duras.** Humo: 5 filas con nombre, límite y pregunta; con `testing.sim.plat = 'tiktok'` el panel abre en TikTok y CPM dice "≤ 6.000"; cambiar a Meta dice "≤ 20.000" y no cambia `testing.sim.plat`; la zona del CTR en Meta trae la advertencia ⚠ y en TikTok no; la zona del CPA trae escala, tope y apaga; la zona trae "Diagnóstico si falla" y "Palanca de solución". Luego tabla, interruptor y zona en `ui/cheat.js` y sus estilos.
5. **Revisión visual.** En el navegador: 7 temas, pantalla angosta (los paneles no se salen de la pantalla ni tapan el otro botón), las tres sub-pestañas y el Simulador corriendo con un panel abierto.
6. **Documentación.** Después del merge, `CLAUDE.md` y `README.md`: módulo `cheat`, sus ids, dependencias, evento `flotante:abierto` con `chc`/`chd`, orden de `<script>` y `<link>`.

## Criterios de aceptación

**Botones**
- [x] Los botones "Cadena que decide" y "Métricas duras" salen solo en la pestaña Testeo, en sus tres sub-pestañas.
- [x] "Cadena que decide" queda en la esquina inferior derecha y "Métricas duras" justo encima.
- [x] Los dos siguen el degradado del tema y se ven bien en los 7 temas (revisado en el navegador).
- [x] Abrir un panel cierra el otro y cualquier panel de `dk`, `qk` o `ap`.
- [x] ✕, Esc y volver a tocar el botón cierran el panel; cambiar de pestaña también.
- [x] Al recargar no queda ningún panel abierto (no se guarda nada).

**Panel Cadena**
- [x] Muestra CPM, CPC, CPPI y CPA como "Paso 1" a "Paso 4", con "Métricas antes del clic" sobre CPM y CPC y "Métricas después del clic" sobre CPPI y CPA.
- [x] Al abrir, CPM está marcado y su resumen se ve en la zona de detalle.
- [x] Hacer clic (o Tab + Enter, o tocar) en un eslabón lo marca y cambia la zona; pasar el mouse no la cambia.
- [x] El resumen trae nombre completo, qué mide, límite en Meta y en TikTok, y "Si falla → Solución".
- [x] Las lecturas de CPM, CPC y CPPI son las mismas de `TEST_CHAIN.reads`; el CPA dice el tope de `GENERIC_CPA`.
- [x] Cada eslabón muestra su "¿Qué falla y cómo lo arreglo?" condensado (CPM 4 causas, CPC 2, CPPI 4, CPA 6) con "Se nota", "Solución" y el pie de la regla; los números salen de `NS_TEST`, `TEST_RULES`, `GENERIC_CPA` y `SCALE_RULES`.

**Panel Métricas duras**
- [x] Muestra CTR, CPC, CPM, CPPI y CPA con nombre, límite y pregunta, en ese orden.
- [x] El interruptor Meta | TikTok cambia los límites (CPM "≤ 20.000" ↔ "≤ 6.000"; CTR "> 2 %" ↔ "> 0,5 %").
- [x] Al abrir, la plataforma es la del Simulador; cambiarla en el panel no cambia el Simulador.
- [x] Hacer clic (o Tab + Enter, o tocar) en una fila muestra en la zona su límite, rango ideal, diagnóstico y palanca.
- [x] El CTR de Meta muestra la advertencia ⚠ en amarillo; el de TikTok no.
- [x] El CPA muestra las zonas escala 12.000, tope 15.000 y apaga 20.000 (de `GENERIC_CPA`).

**Calidad**
- [x] Ningún número ni límite de métricas se escribe a mano en `cheat`: salen de `HARD_METRICS`, `GENERIC_CPA`, `TEST_CHAIN`, `NS_TEST`, `TEST_RULES` y `SCALE_RULES` (salvo `CH_CPA_READ.fix`, los rótulos de la cadena y los textos de `CH_HELP`, redactados a mano por decisión del usuario).
- [x] `trainer.js` y `metrics` no cambian.
- [x] Ids `#ch-` únicos en la página; ningún nombre `ch*`/`CH_*` choca al aplanar `js/index.js`.
- [x] Pasan `node tests/core.test.js`, `tests/smoke.test.js` y `node --check` de cada archivo tocado; consola limpia; `claves-pyl.json` coincide con `--claves`.
- [x] En pantalla angosta los paneles no se salen de la pantalla ni tapan el otro botón (revisado en el navegador).

## Decisiones

- **Sí:** resumen corto por eslabón armado desde `HARD_METRICS` y `TEST_CHAIN.reads` (decisión del usuario), más la tabla "¿Qué falla y cómo lo arreglo?" condensada y redactada en `core/cheat.js` (decisión del usuario, 2026-11-13). **No:** copia exacta del texto de `trainer.js`: obligaría a sacar `CHAIN` del entrenador a un `core` antes de su Fase 2.
- **Sí:** detalle en una zona fija dentro de cada panel (decisión del usuario). **No:** el tooltip flotante `#tip`: sobre un panel fijo en la esquina se sale de la pantalla o tapa el panel.
- **Sí:** el detalle se cambia solo con clic (decisión del usuario): así la información no salta al pasar el mouse. Con teclado, Tab + Enter dispara el clic y en táctil el toque también. **No:** `mouseenter` ni `focus`.
- **Sí:** filas de Métricas duras con nombre, límite y pregunta (decisión del usuario). **No:** la fila completa del diagrama ("¿Cómo se logra?", flechas): no cabe en un panel flotante.
- **Sí:** la plataforma del panel arranca con la del Simulador y no la cambia (decisión del usuario). **No:** guardarla aparte ni compartirla en las dos direcciones.
- **Sí:** módulo propio `cheat` (decisión del usuario). **No:** meterlo en `testing`: `core/testing.js` y `ui/testing.js` ya pasan de 300 líneas.
- **Sí:** botones con el degradado del tema e íconos SVG propios (decisión del usuario). **No:** colores fijos como DropKiller y Prompt buscar anuncios.
- **Sí:** Cadena abajo en la esquina y Métricas duras encima (decisión del usuario).
- **Sí:** reutilizar las clases `.qk-*` y el interruptor `.dk-*`, como ya hace `adprompt`. **No:** copiar los estilos otra vez; la deuda `.fab`/`.fab-panel` sigue abierta.
- **Sí:** cadena en HTML dentro del panel. **No:** copiar el SVG de `#hm-cadena`: repetiría ids (`flow2`, `fpath2`) y colores fijos que hay que cuidar en `themes.css`.
- **Sí:** CPA con lectura propia en `core/cheat.js`. `TEST_CHAIN.reads` no trae CPA porque en el testeo el CPA se lee con los cortes.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Los paneles tapan los controles del Simulador (▶, deslizador) | Se abren solo al tocar el botón y se cierran con Esc o ✕; `#v-testeo` gana `padding-bottom: 150px` |
| `cheat.css` depende de clases de `quick.css` y `dkprompt.css` | Mismo patrón que `adprompt`; anotado en la deuda `.fab`/`.fab-panel` |
| Cambiar un texto de `HARD_METRICS` o `TEST_CHAIN` cambia los paneles sin aviso | Es lo buscado (una sola fuente); las pruebas del paso 1 comparan con la fuente, no con textos fijos |
| Repintar la zona en cada clic | Solo repinta si cambia el eslabón o la fila marcada |

## Lo que **no** está en esta spec

- Texto largo de la cadena del entrenador y su tabla "¿Qué falla y cómo lo arreglo?".
- Panel "i" completo, flechas del diagrama, métricas base y blandas.
- Valores del punto actual del Simulador dentro de los paneles.
- Botones flotantes en otras pestañas.
- `.fab`/`.fab-panel` en `base.css`.
- Guardar la plataforma o el panel abierto.

Cada una de esas, si llega, va en su propia spec.
