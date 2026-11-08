# SPEC 04 — Métricas base en la pestaña Métricas

> **Estado:** Implementado
> **Depende de:** SPEC 02, SPEC 03
> **Fecha:** 2026-11-07
> **Objetivo:** Agregar a la pestaña Métricas una tarjeta desplegable "Métricas base" (cerrada al cargar) con 5 métricas: Presupuesto, Resultados, Impresiones, Monto gastado y Clics en el enlace, en una tabla glosario: una fila por métrica con nombre, qué es, la Hard Metric que da (con su fórmula) y la nota de NovaSociety. Cada métrica trae su definición, la fórmula que la une con las Hard Metrics y la nota de NovaSociety. También se agrega al CTR y al CPPI el nombre con que salen en el reporte de Meta, y el CTR de Meta pasa a tratarse como CTR único.

## Por qué existe esta spec

La SPEC 03 dejó fuera el "Glosario de otras métricas". Las Hard Metrics (CPM, CPC, CTR, CPPI, CPA) no salen solas: se calculan con los números crudos que muestra el Administrador de anuncios. Esta tarjeta explica esos números y dice en qué Hard Metric se usa cada uno.

Fuentes:

- **Definiciones:** las del usuario, escritas tal cual en la ficha. Solo se corrigen tildes y puntuación.
- **Nombres:** los cortos que muestra el Administrador de anuncios en pantalla ("Presupuesto", "Monto gastado"). Cuando la columna del reporte de conjuntos de anuncios de Meta se llama distinto (CSV de ejemplo `VN-1-Conjuntos-de-anuncios-7-nov-2026---7-nov-2026.csv`), su nombre largo va en letra pequeña debajo: «Presupuesto del conjunto de anuncios», «Monto gastado (COP)». Resultados, Impresiones y Clics en el enlace se llaman igual en los dos lados. El reporte trae además:
  - "CTR único (porcentaje de clics en el enlace)": así sale el CTR.
  - "Pagos iniciados" y "Costo x Checkout": así sale el CPPI.
  - El reporte no trae la columna "Alcance", y por eso Alcance no tiene ficha.
- **Notas de NovaSociety:** salen del MCP (`reglas_de_juan`, COP):
  - Testeo de 100.000 al día y escalón de +20 %.
  - Cortes del testeo en 20.000 / 30.000 / 40.000.
  - Zonas de CPA 12.000 / 15.000 / 20.000.
  - CPM máximo: TikTok 6.000, Meta 20.000.
  - CPC caro con CPM sano: el producto no interesa.
  - El MCP no trae definiciones ni fórmulas: las fórmulas son las de siempre (el gasto dividido por lo que se mide).

Tras el paso 4 el usuario pidió tres mejoras a la tarjeta y entran en esta spec: nombres cortos de pantalla, tarjeta cerrada al cargar con su botón "Abrir" y un diseño más minimalista y visual, sin tarjetas internas. Se probaron una "fórmula visual" (numerador arriba y 4 divisores en columnas) y un "embudo" (capas en trapecio) y al usuario no le gustaron; queda la **tabla glosario**. Los demás cambios estéticos del módulo Métricas siguen fuera.

## Alcance

**Dentro:**

- **Tarjeta `#hm-base`** en `#v-metricas`, entre el diagrama `#hm-map` y la tarjeta "Soft Metrics" `#hm-soft`.
  - Es un `<details>` **cerrado al cargar**, con el mismo botón que las tarjetas desplegables de Buscar producto: "Abrir +" cerrada y "Cerrar –" abierta, y el borde de acento mientras está cerrada. No se guarda si quedó abierta: al recargar vuelve cerrada.
  - Cabecera (el `<summary>`): título "Métricas base" con barrita de acento y el subtítulo "Los números crudos del Administrador de anuncios: con ellos se calculan las Hard Metrics".
  - **Diseño "tabla glosario"**, minimalista y sin tarjetas internas: una `<table>` limpia, sin bordes pesados (solo líneas finas entre filas), con 4 columnas: **Métrica · Qué es · Da · NovaSociety**.
    - **Filas, en este orden:** Presupuesto, Monto gastado, Impresiones, Clics en el enlace, Resultados (primero lo que se gasta y luego las métricas en el orden de la cadena).
    - **Métrica:** sin íconos (el usuario pidió quitarlos); el nombre corto y, si es distinto, el nombre del reporte en letra pequeña.
    - **Qué es:** la definición.
    - **Da:** Presupuesto "Tope diario"; Monto gastado "Numerador"; Impresiones, Clics en el enlace y Resultados su Hard Metric como chip con el color de acento (CPM con "× 1.000", CPC, CPA). Debajo, en letra pequeña, las fórmulas de `uses` (en Clics en el enlace también el CTR único).
    - **NovaSociety:** la nota del método.
    - **Pie de la tabla:** una línea para Pagos iniciados, que no tiene fila propia: "Pagos iniciados → chip CPPI · CPPI = Monto gastado ÷ Pagos iniciados (en el reporte: «Costo x Checkout»)".
  - En pantallas angostas (≤ 760 px) la cabecera de la tabla se oculta y cada fila se apila (nombre arriba; luego qué es, da y nota, cada uno con su rótulo pequeño). Sin scroll horizontal.
  - Sin interacción dentro de la tarjeta: nada se abre con clic, no hay aviso al pasar el mouse ni botón "i". Solo se abre y se cierra la tarjeta.
- **Cada métrica** muestra:
  - El nombre corto de pantalla y, si la columna del reporte se llama distinto, el nombre largo en letra pequeña (`csv`).
  - La definición.
  - Las fórmulas que la unen con las Hard Metrics, con el nombre de la Hard Metric en negrita.
  - **NovaSociety:** la nota del método.
- **Contenido de las métricas:**

| Métrica | Se usa en | NovaSociety |
|---|---|---|
| Presupuesto («Presupuesto del conjunto de anuncios») | Es el tope de lo que el conjunto puede gastar al día | Testeo: 100.000 al día. Al escalar sube un escalón de +20 % (100.000 → 120.000 → 144.000). Si el CPA se dispara, se devuelve el 20 % |
| Resultados | **CPA** = Monto gastado ÷ Resultados (en el reporte: "Costo por resultados") | Zonas del CPA: escala bajo 12.000, tope 15.000, apaga sobre 20.000 |
| Impresiones | **CPM** = Monto gastado ÷ Impresiones × 1.000 | CPM máximo: TikTok 6.000, Meta 20.000 |
| Monto gastado («Monto gastado (COP)») | Es el numerador de **CPM**, **CPC**, **CPPI** y **CPA**. **CPPI** = Monto gastado ÷ Pagos iniciados (en el reporte: "Costo x Checkout") | Los cortes del testeo se miden con el gasto acumulado: 20.000, 30.000 y 40.000 |
| Clics en el enlace | **CPC** = Monto gastado ÷ Clics en el enlace. **CTR único** (en el reporte: "CTR único (porcentaje de clics en el enlace)"): Meta lo calcula por personas, como las personas que hicieron clic en el enlace sobre las personas que vieron el anuncio. No se calcula con impresiones | CPC caro con CPM sano: el producto no interesa |

- **Nombre del reporte en las Hard Metrics.** En el panel de la "i" (`.hm-pop`) del CTR y del CPPI se agrega la línea "En el reporte de Meta: …":
  - CTR: «CTR único (porcentaje de clics en el enlace)».
  - CPPI: «Costo x Checkout».
  - El nombre de la métrica en el diagrama sigue siendo "CTR" y "CPPI" en los dos lados.
- **El CTR de Meta es el CTR único.** Los límites no cambian: Meta > 2 % y TikTok > 0,5 %. Lo que cambia es qué se mide en cada lado:
  - **Aviso del número de Meta:** la línea del límite dice "Meta (CTR único): 2 %". La nota "No se mira…" se queda.
  - **Aviso del número de TikTok:** no cambia ("TikTok: 0,5 %"). TikTok no tiene CTR único: su CTR es clics ÷ impresiones.
  - **Panel de la "i" del CTR:**
    - La señal verde dice "Más de 0,5 % (TikTok) · 2 % (Meta, CTR único)".
    - Debajo de la frase simple, la línea "En el reporte de Meta: «CTR único (porcentaje de clics en el enlace)»".
    - La explicación "Meta lo cuenta por personas: las que hicieron clic sobre las que vieron el anuncio. TikTok lo cuenta con impresiones".
  - **Advertencia "por confirmar":** el aviso del número de Meta y el panel de la "i" del CTR muestran una línea con ⚠ y el texto "Límite por confirmar: el 2 % viene del CTR clásico (clics ÷ impresiones). Falta investigar cuál es el límite para el CTR único." Usa los colores de alerta (`--y`) para que se distinga del resto. Se quita cuando se confirme el número.
  - Los demás avisos y números del diagrama no cambian.
- Datos en `core`, pintado en `ui` y arranque en `app`, dentro del módulo `metrics` que ya existe. Estilos en `css/modules/metrics.css`.
- **Ajustes de la pestaña** (pedidos con la tabla ya aprobada):
  - El título de la pestaña pasa de "Métricas: cómo leer mi campaña" a **"Lectura de métricas"**, sin dos puntos, como los demás ("Búsqueda de productos", "Calculadora de costeo").
  - La cabecera de la tarjeta del diagrama dice **"Métricas duras"** en vez de "Hard Metrics". El subtítulo de Métricas base dice "métricas duras". La tarjeta "Soft Metrics" pasa a **"Métricas blandas"** (título y ruta).
  - **Ruta** `.hm-route` bajo el encabezado, igual a la de Buscar producto: 1 Métricas duras `#hm-map` → 2 Métricas base `#hm-base` → 3 Métricas blandas `#hm-soft` → 4 La cadena que decide todo `#hm-cadena` → botón 5 "Simulador →" (`data-go="sim"`, la pestaña que sigue). El enlace a Métricas base la abre si está cerrada. Estilos propios `.hm-route` copiados de `.b-route` (deuda: llevarlos a `base.css`).
  - **Fórmula en el panel de la "i"** de cada métrica (`means.formula`, bloque `.hm-pop-formula` bajo la frase simple). Nombres de las columnas del reporte de Meta; el MCP de NovaSociety no trae fórmulas:
    - CTR: Meta (CTR único) = personas que hicieron clic en el enlace ÷ personas que vieron el anuncio × 100; TikTok = clics ÷ impresiones × 100.
    - CPC = Monto gastado ÷ Clics en el enlace · CPM = Monto gastado ÷ Impresiones × 1.000 · CPPI = Monto gastado ÷ Pagos iniciados · CPA = Monto gastado ÷ Resultados.
    - Las fórmulas viven una sola vez (`FORMULA` en `core/metrics.js`) y las usan el panel y la tabla de Métricas base.
- Pruebas en `tests/core.test.js` y `tests/smoke.test.js`.
- Actualizar `CLAUDE.md` y `README.md` después del merge.

**Fuera (para specs futuras):**

- Los demás cambios estéticos del módulo Métricas (diagrama de Hard Metrics, cadena, Soft Metrics).
- Guardar si la tarjeta Métricas base quedó abierta.
- Alcance y Frecuencia como fichas.
- Definición y nota propias de "Pagos iniciados" (en la tabla es solo la línea del pie, junto al CPPI).
- El nombre del reporte en CPM, CPC y CPA ("CPM (costo por mil impresiones) (COP)", "CPC (costo por clic en el enlace) (COP)", "Costo por resultados").
- Cambiar los números de los límites del CTR. Se quedan en > 2 % (Meta, CTR único) y > 0,5 % (TikTok) hasta que los datos propios digan otra cosa.
- Métricas blandas (la tarjeta `#hm-soft` sigue con "Pronto").
- Calcular métricas con datos reales del usuario o leer el CSV de Meta en esta pestaña.
- Partir `trainer.js` (Fase 2) y quitar el `GENERIC` duplicado.

## Modelo de datos

No hay persistencia nueva, claves de `localStorage` ni estado nuevo en `app.state.hardMetrics`: la tarjeta no tiene nada que elegir.

### `js/modules/metrics/core/metrics.js` → `PYL.core.metrics` (se agrega)

```js
// Cabecera de la tarjeta.
const BASE_HEAD = {
  title: 'Métricas base',
  sub: 'Los números crudos del Administrador de anuncios: con ellos se calculan las Hard Metrics',
};

// Números de NovaSociety que citan las fichas (COP, MCP reglas_de_juan).
// Las zonas del CPA salen de GENERIC_CPA (no se repiten aquí).
const NS_TEST = { budget: 100000, cuts: [20000, 30000, 40000], step: 0.2 };

// Una entrada por métrica, en este orden: presupuesto, resultados, impresiones, gasto, clics.
const BASE_METRICS = [
  {
    k: 'impresiones',          // 'presupuesto' | 'resultados' | 'impresiones' | 'gasto' | 'clics'
    name: 'Impresiones',       // nombre corto, como en la pantalla del Administrador de anuncios
    // csv: 'Presupuesto del conjunto de anuncios',   // solo si la columna del reporte se llama distinto (presupuesto, gasto)
    def: 'Número de veces que tus anuncios se mostraron en pantalla…',   // texto del usuario
    uses: [                    // fórmulas; segmentos para PYL.ui.dom.rich
      [{ b: 'CPM' }, ' = Monto gastado ÷ Impresiones × 1.000'],
    ],
    links: ['cpm'],            // claves de HARD_METRICS que usa
    ns: ['CPM máximo: TikTok ', { b: '$ 6.000' }, ', Meta ', { b: '$ 20.000' }],
  },
  // presupuesto, resultados, gasto, clics ...
];

// Cómo se arma la tabla: el tope (cap) y el numerador (num) primero, luego las métricas que dan Hard Metric (divs),
// en el orden de la cadena. Cada una apunta a una clave de BASE_METRICS (k) o es solo una etiqueta (label) y da una Hard Metric (hm).
const BASE_FORMULA = {
  num: 'gasto',
  divs: [
    { k: 'impresiones', hm: 'cpm', factor: '× 1.000' },
    { k: 'clics', hm: 'cpc' },
    { label: 'Pagos iniciados', hm: 'cppi' },
    { k: 'resultados', hm: 'cpa' },
  ],
  cap: 'presupuesto',
};

// Escalones del presupuesto: [100000, 120000, 144000] con NS_TEST (budget y step). La UI no calcula.
function budgetSteps(n) { /* n escalones desde NS_TEST.budget, cada uno × (1 + NS_TEST.step) */ }
```

### En `HARD_METRICS` (se agrega a dos filas)

```js
// Fila ctr:  report: 'CTR único (porcentaje de clics en el enlace)'
// Fila cppi: report: 'Costo x Checkout'
// Las demás filas no traen `report` (fuera de esta spec).

// Fila ctr, lado Meta: el aviso pasa a limitTip('Meta (CTR único)', '2 %', null, NO_SE_MIRA).
// Fila ctr, MEANS: la señal verde nombra "CTR único" en Meta y se agrega
//   unique: 'Meta lo cuenta por personas: las que hicieron clic sobre las que vieron el anuncio. TikTok lo cuenta con impresiones.'

// Advertencia de límite sin confirmar (una sola fuente; la usan el aviso de Meta y la "i" del CTR).
// Cuando se confirme el número, se borra y se actualiza el 2 %.
const CTR_UNIQUE_WARN = 'Límite por confirmar: el 2 % viene del CTR clásico (clics ÷ impresiones). Falta investigar cuál es el límite para el CTR único.';
```

Convenciones:

- Los textos son segmentos (`string`, `{ b }`) y se pintan con `PYL.ui.dom.rich`. Nada de HTML en `core`.
- Los números de las notas se arman con `copText` y con `GENERIC_CPA`, `NS_TEST` y el `view` del CPM de `HARD_METRICS`: un número no se escribe dos veces.
- `links` solo tiene claves que existen en `HARD_METRICS`. Presupuesto lleva `links: []`.
- Las 5 fichas tienen `ns`.
- `BASE_FORMULA` usa solo claves que existen en `BASE_METRICS` (`k`) y en `HARD_METRICS` (`hm`).
- Los nombres nuevos (`BASE_HEAD`, `NS_TEST`, `BASE_METRICS`, `BASE_FORMULA`, `budgetSteps`, `CTR_UNIQUE_WARN`) no pueden existir en otro `core`, para que no se pisen al aplanarlos en `js/index.js`. Se revisa al implementar.

### `js/modules/metrics/ui/metrics.js` → `PYL.ui.metrics`

- Nueva `base(node, head, rows, formula)`: pinta en el `<details>` `node` el `<summary>` (cabecera) y la tabla glosario (filas en el orden de `formula`; la que es solo `label`, Pagos iniciados, va en el pie). No cambia el estado ni abre la tarjeta.
- En el panel de la "i", si la fila trae `report`, se pinta la línea "En el reporte de Meta: «…»" debajo de la frase simple. Si `means` trae `unique`, se pinta debajo de esa línea. Si trae `warn`, se pinta una línea con ⚠ en color de alerta (`.hm-warn`). El aviso del número de Meta del CTR lleva la misma línea.

### `js/modules/metrics/app/metrics.js`

- `render()` también llama a `U.base($('#hm-base'), C.BASE_HEAD, C.BASE_METRICS, C.BASE_FORMULA)` una vez al cargar. `budgetSteps` la usa el núcleo para la nota del Presupuesto.

### HTML y CSS

- `index.html`: `<details class="card mt hm-base" id="hm-base"></details>` (sin `open`) entre `#hm-map` y `#hm-soft`.
- Clases con prefijo `.hm-base` (`.hm-base-table`, `.hm-base-row`, `.hm-base-name`, `.hm-base-csv`, `.hm-base-def`, `.hm-base-gives`, `.hm-base-chip`, `.hm-base-use`, `.hm-base-ns`, `.hm-base-foot`) y `.hm-pop-report` en `css/modules/metrics.css`. Colores solo con tokens, para que funcionen los 7 temas.
- El botón "Abrir + / Cerrar –" se escribe con reglas propias `.hm-base > summary` en `metrics.css`, con el mismo aspecto que `.b-sec > summary` de `search.css`: el módulo `metrics` no usa nada de `search`. Es una copia de estilo; queda anotada para moverla a `base.css` como desplegable común en una spec futura.

## Plan de implementación

1. **Núcleo.** Agregar `BASE_HEAD`, `NS_TEST` y `BASE_METRICS` a `core/metrics.js` y exportarlos. Agregar `report` a las filas `ctr` y `cppi` de `HARD_METRICS`. Pruebas en `tests/core.test.js`:
   - Hay 5 fichas en el orden de la tarjeta, sin Alcance.
   - Cada ficha tiene `def`, `uses` y `ns`.
   - Los `links` existen en `HARD_METRICS`.
   - Las notas citan los mismos números que `GENERIC_CPA` y `NS_TEST`.
   - `ctr.report` y `cppi.report` tienen los nombres del reporte.
   - El aviso del CTR de Meta dice "CTR único" y conserva el 2 %. El de TikTok sigue igual.
   - `CTR_UNIQUE_WARN` existe y lo usan el aviso de Meta y `means.warn` del CTR. Ninguna otra métrica lo trae.
2. **Tarjeta.** Escribir `ui.metrics.base`, poner `#hm-base` en `index.html` y conectarlo en `render()` de `app/metrics.js`. Agregar los estilos `.hm-base*` (cuadrícula de 3, 2 y 1 por fila) en `metrics.css`.
3. **Nombre del reporte y CTR único.** Pintar `report`, `unique` y `warn` en el panel `.hm-pop` y darles estilo con `.hm-pop-report` y `.hm-warn`. Cambiar el aviso del CTR de Meta (con la advertencia) y la señal verde del CTR.
4. **Humo.** En `tests/smoke.test.js`, revisar:
   - `#hm-base` está entre `#hm-map` y `#hm-soft`.
   - Tiene 5 fichas con sus nombres en orden, cada una con nota de NovaSociety (el paso 5 lo cambia a la fórmula visual).
   - La "i" del CTR y la del CPPI muestran el nombre del reporte, y la del CPM no.
   - Regenerar `tests/fixtures/claves-pyl.json` con `node tests/smoke.test.js --claves`.
5. **Mejoras pedidas tras el paso 4.**
   - **Núcleo:** nombres cortos ("Presupuesto", "Monto gastado") con `csv` en esas dos; `BASE_FORMULA` y `budgetSteps`, exportados. Pruebas en `tests/core.test.js`: nombres y `csv`, que `BASE_FORMULA` use claves que existen, el orden de los divisores (CPM, CPC, CPPI, CPA) y que `budgetSteps(3)` dé 100.000, 120.000 y 144.000.
   - **Tarjeta:** `#hm-base` pasa a `<details>` cerrado; `ui.metrics.base` pinta el `<summary>` y la tabla glosario; estilos nuevos en `metrics.css` (se quitan `.hm-base-grid`, `.hm-base-card`, `.hm-base-uses` y `.hm-base-ns`).
   - **Humo:** en `tests/smoke.test.js`, la tarjeta empieza cerrada, el `<summary>` dice "Métricas base", la tabla tiene 5 filas en orden (Presupuesto, Monto gastado, Impresiones, Clics en el enlace, Resultados) con sus chips CPM, CPC y CPA, el pie con Pagos iniciados y el CPPI, y los nombres largos del reporte salen bajo Presupuesto y Monto gastado.
5b. **Ajustes de la pestaña:** título "Lectura de métricas", "Métricas duras", ruta `.hm-route` con `#hm-cadena` y fórmulas en `means.formula` (fuente `FORMULA`). Pruebas: fórmulas en `core.test.js`; título, ruta (y que abra Métricas base) y fórmula en la "i" en `smoke.test.js`.
6. **Documentación.** Después del merge, actualizar `CLAUDE.md` y `README.md` con la tarjeta desplegable `#hm-base`, `BASE_METRICS`, `BASE_FORMULA`, `NS_TEST`, `budgetSteps`, `ui.metrics.base` y el campo `report`. Quitar "Glosario de otras métricas" de lo pendiente.

## Criterios de aceptación

**Tarjeta**

- [x] En `#v-metricas` el orden es `#hm-map` → `#hm-base` → `#hm-soft` → "La cadena que decide todo".
- [x] La tarjeta tiene el título "Métricas base" con barrita de acento y su subtítulo.
- [x] Al cargar la página la tarjeta está cerrada y muestra el botón "Abrir +"; al abrirla dice "Cerrar –". Al recargar vuelve cerrada.
- [x] Por dentro no hay tarjetas internas: una tabla glosario con las columnas Métrica, Qué es, Da y NovaSociety, y 5 filas en orden (Presupuesto, Monto gastado, Impresiones, Clics en el enlace, Resultados), sin íconos. Impresiones, Clics en el enlace y Resultados muestran su chip CPM, CPC y CPA. El pie dice Pagos iniciados → CPPI con «Costo x Checkout». No hay Alcance.
- [x] Los nombres son los cortos: "Presupuesto" y "Monto gastado", con «Presupuesto del conjunto de anuncios» y «Monto gastado (COP)» en letra pequeña debajo. Resultados, Impresiones y Clics en el enlace no llevan nombre largo.
- [x] Cada métrica muestra su nombre y su definición (Pagos iniciados va solo en el pie).
- [x] Resultados muestra "CPA = Monto gastado ÷ Resultados" y el nombre "Costo por resultados".
- [x] Impresiones muestra la fórmula del CPM y no la del CTR.
- [x] Monto gastado nombra CPM, CPC, CPPI y CPA, y muestra "CPPI = Monto gastado ÷ Pagos iniciados" con el nombre "Costo x Checkout".
- [x] Clics en el enlace muestra la fórmula del CPC. Explica que el "CTR único (porcentaje de clics en el enlace)" se calcula por personas y no con impresiones.
- [x] Las 5 métricas muestran la nota "NovaSociety".
- [x] Las notas dicen:
  - 100.000 al día y +20 % por escalón.
  - 12.000 / 15.000 / 20.000.
  - TikTok 6.000 y Meta 20.000.
  - 20.000 / 30.000 / 40.000.
  - "el producto no interesa".
- [x] Dentro de la tarjeta no hay aviso al pasar el mouse, botón "i" ni comportamiento al hacer clic: solo se abre y se cierra la tarjeta.

**Hard Metrics**

- [x] El panel de la "i" del CTR dice "En el reporte de Meta: «CTR único (porcentaje de clics en el enlace)»".
- [x] El panel de la "i" del CPPI dice "En el reporte de Meta: «Costo x Checkout»".
- [x] Los paneles de CPM, CPC y CPA no traen esa línea.
- [x] El aviso del número del CTR de Meta dice "Meta (CTR único): 2 %" y conserva la nota "No se mira…".
- [x] El aviso del número del CTR de Meta y la "i" del CTR muestran la advertencia ⚠ "Límite por confirmar…" en color de alerta.
- [x] El aviso del número del CTR de TikTok sigue diciendo "TikTok: 0,5 %" y no tiene la advertencia.
- [x] La "i" del CTR muestra la señal "2 % (Meta, CTR único)" y explica que Meta lo cuenta por personas y TikTok con impresiones.
- [x] El botón de la métrica sigue diciendo "CTR" en los dos lados. Los números grandes del diagrama no cambian: > 2 % y > 0,5 %.

**Pestaña Métricas**

- [x] El título dice "Lectura de métricas" (sin dos puntos).
- [x] La tarjeta del diagrama dice "Métricas duras".
- [x] Bajo el encabezado hay una ruta igual a la de Buscar producto: Métricas duras, Métricas base, Métricas blandas, La cadena que decide todo y el botón "Simulador →". Cada enlace lleva a su tarjeta; el de Métricas base la abre.
- [x] La tarjeta reservada dice "Métricas blandas" (antes "Soft Metrics").
- [x] El panel de la "i" de cada métrica muestra su fórmula; el del CTR, una para Meta (CTR único) y otra para TikTok.

**Diseño** (revisado en el navegador)

- [x] En PC la tabla se lee de corrido, con columnas alineadas, y la tarjeta mide lo mismo que las demás.
- [x] Se ve minimalista: sin cajas con borde por métrica, con líneas finas y el acento solo en los chips y el botón.
- [x] En pantallas angostas cada fila se apila con sus rótulos, sin scroll horizontal.
- [x] El botón "Abrir + / Cerrar –" se ve igual que el de las tarjetas de Buscar producto.
- [x] Se lee bien en los 7 temas, claros y oscuros.
- [x] Expandir o contraer el diagrama `#hm-map` no mueve ni rompe la tarjeta nueva.

**Calidad**

- [x] `PYL.core.metrics` sigue sin tocar el DOM.
- [x] Ningún número de las notas se escribe dos veces: salen de `GENERIC_CPA`, `NS_TEST` o `HARD_METRICS` (revisado en el código).
- [x] Pasan `node tests/core.test.js`, `tests/smoke.test.js` y `node --check` de cada archivo tocado.
- [x] `claves-pyl.json` coincide con `--claves` y la consola queda limpia.
- [x] No hay ids repetidos en `index.html`.

## Decisiones

- **Sí:** el título es "Métricas base", con un subtítulo que explica para qué sirven. **No:** "Otras métricas" (no dice nada) ni "Columnas de Meta Ads" (amarra la tarjeta a Meta).
- **Sí:** las definiciones del usuario van tal cual, solo con tildes y puntuación corregidas.
- **Sí:** cada métrica se llama con el nombre corto de la pantalla del Administrador de anuncios ("Presupuesto", "Monto gastado"), y el nombre largo de la columna del reporte va debajo en letra pequeña, para encontrarla igual en el archivo. **No:** "Importe gastado". (Cambió tras el paso 4: antes el nombre grande era el del CSV.)
- **No:** ficha de Alcance. El reporte del usuario no trae esa columna y el usuario pidió quitarla.
- **Sí:** en las fichas, el CTR es el "CTR único" del reporte, explicado por personas. **No:** la fórmula clásica (clics ÷ impresiones), porque no coincide con lo que muestra el reporte del usuario.
- **Sí:** el CPPI es "Costo x Checkout" en el reporte. Se dice en la ficha de Monto gastado y en la "i" del CPPI. **No:** cambiar el nombre "CPPI" en el diagrama, que sigue siendo el de NovaSociety.
- **Sí:** el CTR de Meta se trata como CTR único (lo que muestra el reporte del usuario) y conserva el límite de 2 %. **No:** subirlo a 2,5 % ni a otra cifra. Ni NovaSociety ni el curso dan un número para el CTR único y no se inventa uno.
- **Sí:** una advertencia visible "Límite por confirmar" en el aviso de Meta y en la "i" del CTR, para investigar luego el límite del CTR único. Es un texto, `CTR_UNIQUE_WARN`: se borra al confirmar el número. **No:** dejarlo solo anotado en la spec, porque en la app pasaría desapercibido.
- **Sí:** el CTR de TikTok queda como clics ÷ impresiones, con > 0,5 %. TikTok no tiene CTR único.
- **Sí:** "CTR único" se dice en el aviso de Meta y en la "i". **No:** cambiar el botón de Meta a "CTR único", para que el diagrama siga igual en los dos lados.
- **Sí:** cada ficha trae la definición, la fórmula y la nota de NovaSociety. Las fórmulas unen la tarjeta con el diagrama de Hard Metrics. **No:** solo la definición.
- **Sí:** tabla glosario: se lee de corrido y cada fila dice qué es la métrica, qué Hard Metric da y qué dice NovaSociety. **No:** cuadrícula de fichas (primera versión, se veía cargada), fórmula visual con columnas ni embudo en trapecios (segunda y tercera versión, no le gustaron al usuario), ecuaciones sueltas, línea con íconos ni chips con panel (piden un clic por métrica).
- **Sí:** la tarjeta va cerrada al cargar, con el botón "Abrir +" de las tarjetas desplegables de Buscar producto, para que no empuje la cadena hacia abajo. **No:** guardar si quedó abierta.
- **Sí:** la tarjeta va entre Hard Metrics y Soft Metrics.
- **Sí:** las notas usan solo lo que da el MCP de NovaSociety. No se inventan reglas.
- **Sí:** los números se reutilizan (`GENERIC_CPA`, el CPM de `HARD_METRICS`) y los del testeo van en una constante nueva, `NS_TEST`. **No:** escribir los números a mano en los textos.
- **No:** guardar estado ni agregar claves a `app.state.hardMetrics`.
- **Sí:** "Lectura de métricas" como título, en el mismo estilo de los demás módulos. **No:** títulos con dos puntos.
- **Sí:** las fórmulas usan los nombres de las columnas del reporte de Meta, porque el MCP de NovaSociety no da fórmulas. El CTR lleva dos: Meta (CTR único, por personas) y TikTok (por impresiones).
- **No:** los demás cambios estéticos del módulo (diagrama, cadena, Soft Metrics). Van en otra spec.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El 2 % de Meta venía del CTR clásico y el CTR único suele salir algo más alto, así que el límite puede quedar fácil de pasar | La advertencia ⚠ lo deja visible en la app. Al investigarlo, se cambia el número en `HARD_METRICS` y se borra `CTR_UNIQUE_WARN` |
| `NS_TEST` repite números que ya están en `trainer.js` (Simulador y Escalera) | Se anota como deuda junto a `GENERIC`. Se unifican al partir `trainer.js` (Fase 2) |
| Un nombre nuevo choca con otro `core` al aplanar en `js/index.js` | Revisar con grep antes de exportar. Las pruebas de `core` fallan si un nombre se pisa |
| Meta cambia el nombre de una columna del reporte | Los nombres viven solo en `BASE_METRICS` y en `report` de `HARD_METRICS` |
| Las definiciones y la explicación del CTR único alargan algunas filas | Las columnas tienen ancho fijo relativo y el texto largo va en letra pequeña. Se revisa en el navegador |
| El botón "Abrir +" queda copiado de `search.css` | Se anota como deuda: moverlo a `base.css` como desplegable común en otra spec |
| El MCP cambia sus umbrales | Cada número vive en una sola constante |

## Lo que **no** está en esta spec

- Los demás cambios estéticos del módulo Métricas.
- Alcance y Frecuencia, y definición propia de Pagos iniciados.
- El nombre del reporte en CPM, CPC y CPA.
- Números nuevos para los límites del CTR.
- Métricas blandas.
- Calculadora o lectura del CSV de Meta en esta pestaña.
- Partir `trainer.js`.

Cada una de esas, si llega, va en su propia spec.
