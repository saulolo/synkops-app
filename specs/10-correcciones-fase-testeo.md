# SPEC 10 — Correcciones de la Fase de testeo

> **Estado:** Implementado
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-11-13
> **Objetivo:** Corregir los textos y la regla propia del corte 3 de la Fase de testeo según el criterio de NovaSociety, agregar la regla de "dejó de ser testeo", ampliar la práctica a 11 casos con CPM y tope visibles y mostrar el veredicto al lado de cada fila del mapa de cortes.

## Por qué existe esta spec

Una revisión con el criterio de NovaSociety encontró frases que dicen más de lo que dice Juan:

- **Corte 1 con venta:** "no hace falta mirar más" es falso. El conjunto igual pasa por 30.000 y 40.000, y a los 40.000 se piden 2 o más ventas con CPA dentro del tope.
- **Corte 1 con 0–2 pagos iniciados:** "a nadie le interesa" adelanta un diagnóstico. Juan dice que se apague y se revise la cadena, porque puede ser el video (CPM caro) y no el producto.
- **Regla propia del corte 3:** con 1 venta, o con 2 o más y CPA sobre el tope, la app decía "mantener vigilando". Con 1 venta a los 40.000 el CPA ya es 40.000 o más: está sobre cualquier tope y hasta sobre la zona de apagar. Seguir es gastar con pérdida. Juan solo deja seguir a quien demostró que vende rentable.
- **Paso 5:** "salvo zona de apagado" no aplica al testeo. La excepción de un solo día (0 ventas, 0 pagos iniciados y el doble de la zona de apagar gastado) es una regla de escalado.

- **Mapa de cortes:** en los pasos 2 a 4 la tarjeta del corte ilumina una fila (la del mini-ejemplo) y debajo repite el veredicto en otra tarjeta "Así lo califica el Lab". Es redundante y confunde: parece que la app eligió esa fila. Mejor que cada fila diga su propio veredicto y que el paso no ilumine nada.

También falta una regla del MCP: "Si ya gastó el presupuesto del día con ventas, dejó de ser testeo y se decide como escalando. Las reglas de testeo nunca se aplican a campañas que ya llevan rato vendiendo."

La práctica califica con `testVerdict`. Por eso, al cambiar la regla, cambian solas las respuestas correctas. Faltan casos para tres situaciones que confunden: 1 venta temprana y ninguna más, CPA justo igual al tope, y CPM caro con la cadena funcionando.

## Alcance

**Dentro:**

**Parte 1 · Textos (`core/testing.js`)**

- Corte 1 con venta (`testVerdict` rama `c1-sale`, `TEST_CUTS` y el `p` del paso `corte1`): "Si ya hay venta, sigue al siguiente corte sin tocar."
- Corte 1 con 0–2 pagos iniciados (`testVerdict` rama `c1-off` y `TEST_CUTS`): "Apágalo y revisa la cadena: CPM y CPC."
- Paso 5 (`TEST_CHAIN.note`): "No apago antes de cruzar un corte."
- Frase de escalado, al final del texto `p` de los pasos `arranque` y `corte3`: "Si ya gastó el presupuesto del día con ventas, dejó de ser testeo y se decide como escalando. Las reglas de testeo nunca se aplican a campañas que ya llevan rato vendiendo."

**Parte 2 · Regla propia del corte 3**

- La rama `c3-own` (mismo id) pasa de "mantener vigilando" a **apagar**:
  - `ACTION_OF.own = 'off'`, `LIGHT_OF.own = 'r'` y `FASE_OF.own = 'apagado'`.
  - Veredicto: "NO CUMPLE · APÁGALO".
  - Detalle: "No cumple para gastar el día: lo apago en 40.000 y reviso la cadena. Regla propia: NovaSociety no define este caso. Con 1 venta, el CPA ya es 40.000 o más." El 40.000 sale de `NS_TEST.cuts`.
  - Mapa (`TEST_CUTS`): luz roja, condición abreviada ("1 venta, o 2+ con CPA > tope"), texto abreviado "No cumple: apago y reviso la cadena." (el detalle de `testVerdict` conserva la frase larga con el 40.000; ver Parte 6) Sigue con `own: true` y su marca "Regla propia · NovaSociety no define este caso".
- La práctica y "Juega con los números" toman la regla nueva solas, porque los dos usan `testVerdict`.

**Parte 3 · "Dejó de ser testeo" en Juega con los números**

- Si el gasto es mayor o igual al presupuesto del día y a 40.000, y el corte 3 da "Dejar gastar el día" (2 o más ventas y CPA igual o menor al tope), `testFree` no devuelve veredicto de testeo.
- En su lugar, la tarjeta muestra el aviso con la frase de escalado y "pasa a la pestaña Escalado".
- En ese caso no se ilumina ninguna rama del mapa.
- Antes de 40.000, o sin cumplir el corte 3, manda el testeo como hoy. Con ABO (30.000 diarios), un conjunto con 1 venta a los 30.000 sigue en testeo.

**Parte 4 · Práctica con 11 casos**

- Cada caso trae su `cpm` y puede traer su `tope`; sin `tope`, usa `TEST_PRACTICE.tope` (15.000).
- La tarjeta de la práctica muestra siempre, en los 11 casos, dos datos más: **CPM** y **Tope**. El CPM es informativo: `testVerdict` no lo usa.
- Tres casos nuevos (ver Modelo de datos):
  - `c9`: 2 ventas a los 40.000 con CPA igual al tope (tope 20.000) da "Dejar gastar el día", porque la regla es "igual o menor".
  - `c10`: 1 venta en el corte 1 y ninguna más hasta 40.000. Empieza maravilloso y a los 40.000 no cumple.
  - `c11`: CPM caro (sobre 20.000) con CPPI barato y ventas. No se apaga, porque la cadena sigue funcionando después del CPM.
- Un caso puede traer `note` (segmentos). Esa nota sale en la retroalimentación después de decidir. Hoy solo la trae `c11`: "El CPM está caro, pero la cadena sigue funcionando: los pagos iniciados y las ventas mandan."
- Los 8 casos actuales no cambian sus números, salvo el `cpm` que se les agrega.

**Parte 5 · Mejor puntaje**

- El mejor puntaje guardado se calculó con la regla vieja. Se reinicia una sola vez al cargar.
- `pyl-testing` guarda una marca de versión `v: 2`. Si lo guardado no trae `v: 2`, `best` queda en `null` y se guarda con `v: 2`.
- Los pasos hechos, el paso abierto, el modo y los números de "Juega con los números" se conservan.

**Parte 6 · Veredicto al lado de cada fila del mapa de cortes (`core/testing.js`, `ui/testing.js`)**

- Cada rama de `TEST_CUTS` (las 13) muestra, después de su frase, una etiqueta con forma de botón del color de la fila (rojo, amarillo o verde): `<icono> <Acción>`. Ejemplo: "3 o 4 pagos iniciados → Flojo, se mantiene. [⚠️ Mantener vigilando]". Excepción: la rama `c1-sale` dice `✅ MARAVILLOSO`, porque "Seguir sin tocar" no la distingue de "Bien". El veredicto completo ("FLOJO", "APÁGALO"…) no se repite en la etiqueta: ya lo dice la frase.
- La acción y el veredicto no se escriben dos veces: salen de la misma fuente que usa `testVerdict` (un mapa rama → veredicto, y `ACTION_OF`/`TOCA`/`TEST_ACTIONS` para la acción y el icono). `TEST_CUTS` agrega por rama `v` (clave interna), `verdict: { action, toca, veredicto }` y `badge` (el texto de la etiqueta: `toca`, o `veredicto` si `v` es `great`).
- Las pruebas exigen que `verdict` y la acción de cada rama sean iguales a lo que devuelve `testVerdict` para esa rama.
- La frase de `c1-sale` pasa a "Si ya hay venta, sigue al siguiente corte sin tocar." (una sola constante para el veredicto, el mapa y el paso 2).
- Corte 1, filas sin venta: la condición agrega "· 0 ventas" (apagar, flojo y bien; `c1-sale` ya dice "1 venta o más").
- Se aplica a los 3 cortes y vale en los pasos 2 a 4 y en el mapa del paso 6 (mismo componente).
- Corte 3: cada fila debe caber en una sola línea, como las de los cortes 1 y 2 (con su etiqueta). Se abrevian sus textos sin perder el sentido: `c3-spend` dice "2 o más ventas y CPA ≤ tope → Déjalo gastar: pasa a escalado." y `c3-own` dice "1 venta, o 2+ con CPA > tope → No cumple: apago y reviso la cadena." (+ etiqueta y marca de regla propia). El detalle de `testVerdict` no cambia.
- En los pasos 2 a 4 se quita la tarjeta del mini-ejemplo (`ui.testing.example`) y no se ilumina ninguna fila. El dato `example` de cada paso se queda: las pruebas lo usan para comprobar que el paso cae en su corte.
- En el paso 6 el mapa se sigue iluminando con la práctica y con "Juega con los números" (sin cambios).

**Parte 7 · Paso 5: la cadena y lo que no se hace (`core/testing.js`, `ui/testing.js`)**

- El paso 5 se renombra a "La cadena y qué no hacer" (`where`: "Qué revisar y qué no hacer"; misma clave `cadena` y misma casilla, con su texto ampliado).
- Se agrega un bloque "Lo que no hago" con 3 reglas (`TEST_CHAIN.donts`), cada una con una frase en negrita y su razón:
  1. **No apagues antes de un corte.** Con 8.000 gastados los números todavía no dicen nada. (El 8.000 sale de `NS_TEST.cuts[0] × 0,4`: no se escribe a mano.)
  2. **No toques el anuncio mientras está en testeo.** Si cambias el texto, el público o el presupuesto, la lectura se daña.
  3. **No decidas por el CTR.** Decide la cadena: CPM → CPC → CPPI → CPA.
- Reemplazan a `TEST_CHAIN.note` ("No apago antes de cruzar un corte.") y a `TEST_CHAIN.ctr` ("No se mira el CTR…"), que quedaban redundantes.
- Las 3 lecturas de la cadena (`TEST_CHAIN.reads`) ganan vistosidad: borde y fondo de acento, y etiquetas de color "SI" y "SOLUCIÓN". El texto de las lecturas no cambia. Las reglas del bloque "Lo que no hago" van en tarjetas con ⛔ y acento rojo.

**Pruebas y documentación**

- Actualizar `tests/core.test.js` y `tests/smoke.test.js` (frases nuevas, `c3-own` = `off`, 11 casos).
- Regenerar `tests/fixtures/claves-pyl.json` si cambia alguna clave de `PYL.*`.
- Después del merge, actualizar `CLAUDE.md` y `README.md`.

**Fuera (otras specs):**

- Lectura real (subir el reporte de Meta) y el Simulador de Testeo.
- Escalado real (Surfing Scaling) y la regla de apagar en un solo día, que es de escalado.
- Que el CPM entre en `testVerdict` o en "Juega con los números".
- Cambiar los umbrales de `TEST_RULES`, los cortes de `NS_TEST` o las zonas de `cpaZones`.
- Cambiar la cantidad de pasos o sus casillas.
- Cambiar la frase corta de las filas o los textos de los veredictos.
- Preguntarle a Juan por el caso de la regla propia: lo hace el usuario fuera de la app. Si él lo define distinto, se ajusta en otra spec.

## Modelo de datos

### `TEST_CASES` (`core/testing.js`)

```js
// at(spend, pi, sales): números acumulados en cada corte. cpm: informativo. tope: opcional (sin él, TEST_PRACTICE.tope).
{ id: 'c1', name: 'Conjunto 1', cpm: 18500, at: [...] },   // los 8 actuales ganan su cpm
// …
{ id: 'c9',  name: 'Conjunto 9',  cpm: 12000, tope: 20000, at: [at(K1, 5, 0), at(K2, 8, 1), at(K3, 10, 2)] },
{ id: 'c10', name: 'Conjunto 10', cpm: 17000,              at: [at(K1, 3, 1), at(K2, 6, 1), at(K3, 8, 1)] },
{ id: 'c11', name: 'Conjunto 11', cpm: 26000,              at: [at(K1, 5, 1), at(K2, 9, 2), at(K3, 12, 3)],
  note: ['El CPM está caro, pero la cadena sigue funcionando: los pagos iniciados y las ventas mandan.'] },
```

CPM de los 8 casos actuales: c1 18.500, c2 24.000, c3 16.000, c4 12.500, c5 11.000, c6 14.000, c7 15.500, c8 13.000.

Respuestas esperadas (las calcula `testVerdict`, no se escriben en los casos):

| Caso | Corte 1 | Corte 2 | Corte 3 |
|---|---|---|---|
| c1 | off | — | — |
| c2 | off | — | — |
| c3 | watch | off | — |
| c4 | go | watch | off |
| c5 | go | go | spend |
| c6 | watch | watch | **off** (antes watch) |
| c7 | go | watch | **off** (antes watch) |
| c8 | go | watch | spend |
| c9 | go | go | spend (CPA 20.000 = tope 20.000) |
| c10 | go | watch | off (`c3-own`) |
| c11 | go | go | spend |

### Otros cambios

- `pointVerdict(c, k)` usa `c.tope ?? TEST_PRACTICE.tope`.
- `practiceView` agrega `cpm`, `tope` y `note` del caso.
- `testFree` agrega `scaling: true` y `verdict: null` en el caso de la Parte 3. Con `scaling`, `err` sigue en `null`. Día, CPPI, CPA y zonas se siguen mostrando.
- `TEST_VERSION = 2` en `core/testing.js`, exportado en `core.testing` (nombre único al aplanar `js/index.js`).
- `pyl-testing`: `{ v: 2, part, test, mode, best, free }`.

## Plan de implementación

Pruebas primero en cada paso: se escriben, fallan y luego se hace el código.

1. **Textos.** Pruebas en Node:
   - frases nuevas de `c1-sale` y `c1-off` en `testVerdict` y `TEST_CUTS`;
   - `p` de `corte1` sin "no hace falta mirar más";
   - `TEST_CHAIN.note` sin "zona de apagado";
   - frase de escalado en `arranque` y `corte3`.

   Después, los cambios en `core/testing.js`. Ajustar las pruebas de humo que buscan "a nadie le interesa".
2. **Regla propia `c3-own` = apagar.** Pruebas en Node:
   - `vd(40000, 7, 1)` y `vd(40000, 10, 2)` dan `branch: 'c3-own'`, `action: 'off'`, `light: 'r'`, "NO CUMPLE · APÁGALO";
   - la rama del mapa es roja y sigue con `own: true`;
   - `c6` y `c7` terminan en `off`.

   Después, el cambio en `ACTION_OF`, `LIGHT_OF`, `FASE_OF`, veredicto, detalle y `TEST_CUTS`.
3. **"Dejó de ser testeo" en modo libre.** Pruebas en Node:
   - presupuesto 30.000, gasto 40.000, 2 ventas, tope 20.000 da `scaling: true` y `verdict: null`;
   - presupuesto 100.000, gasto 40.000, 2 ventas da veredicto `spend` (aún no gastó el día);
   - presupuesto 30.000, gasto 30.000, 1 venta da veredicto de testeo (corte 2);
   - presupuesto 30.000, gasto 40.000, 1 venta da `c3-own`.

   Prueba de humo: el aviso sale en `#ts-free-out` y no hay `.ts-on` en el mapa. Después, `testFree` y `ui.testing.freeOut`.
4. **Práctica con CPM, tope y 11 casos.** Pruebas en Node:
   - 11 casos, con la tabla de respuestas de arriba;
   - `c9` usa tope 20.000;
   - `practiceView` trae `cpm`, `tope` y `note`.

   Prueba de humo: la tarjeta muestra "CPM" y "Tope"; la nota de `c11` sale tras decidir; la ronda pasa por los 11 casos. Después, `TEST_CASES`, `pointVerdict`, `practiceView` y `ui.testing.practice`/`feedback`.
5. **Reinicio del mejor puntaje.** `TEST_VERSION` y la lectura en `app/testing.js`: sin `v: 2`, `best = null` y se guarda con `v: 2`. Revisión en el navegador con un `pyl-testing` viejo, porque jsdom con `file://` no tiene `localStorage`.
6. **Veredicto en el mapa de cortes.** Pruebas en Node:
   - cada rama de `TEST_CUTS` trae `verdict` igual al de `testVerdict` (acción y veredicto);
   - el corte 1 dice "0 ventas" en apagar, flojo y bien.

   Prueba de humo: cada fila del mapa muestra su etiqueta (`.ts-vd`); en los pasos 2–4 no hay `.ts-ex` ni `.ts-on`; en el paso 6 el mapa sigue iluminando la rama de la práctica. Después, `TEST_CUTS` y `ui.testing.cut`/`TOOLS.cut`, y estilos en `css/modules/testing.css` (solo tokens).
7. **Paso 5: cadena y lo que no se hace.** Pruebas en Node: `TEST_CHAIN.donts` con las 3 reglas (el 8.000 sale de `NS_TEST`), `reads` sin emojis, título nuevo del paso; humo: el paso 5 muestra las 3 tarjetas "no" y las 3 lecturas con sus etiquetas. Después, `TEST_CHAIN`, `TEST_STEPS` y `ui.testing.chain`, y estilos en `css/modules/testing.css` (solo tokens).
8. **Documentación.** Después del merge, actualizar `CLAUDE.md` y `README.md`:
   - regla `c3-own` = apagar;
   - aviso "dejó de ser testeo";
   - 11 casos con CPM y tope;
   - `v: 2` en `pyl-testing`.

## Criterios de aceptación

**Textos**
- [x] Corte 1 con venta dice "Si ya hay venta, sigue al siguiente corte sin tocar." en el veredicto, el mapa y el paso 2.
- [x] El paso 2 ya no dice "no hace falta mirar más".
- [x] Corte 1 con 0–2 pagos iniciados dice "Apágalo y revisa la cadena: CPM y CPC." en el veredicto y el mapa. "a nadie le interesa" no aparece en el código (grep).
- [x] El paso 5 dice "No apago antes de cruzar un corte." sin "zona de apagado".
- [x] Los pasos 1 y 4 traen la frase "Si ya gastó el presupuesto del día con ventas, dejó de ser testeo…".

**Regla propia**
- [x] A los 40.000 con 1 venta, o con 2 o más y CPA sobre el tope, la respuesta es "Apagar", con veredicto "NO CUMPLE · APÁGALO" y luz roja.
- [x] Esa rama del mapa es roja, dice "No cumple: apago y reviso la cadena." y sigue marcada como regla propia (tooltip en "Preguntar").
- [x] El detalle explica que con 1 venta el CPA ya es 40.000 o más.
- [x] En la práctica, elegir "Mantener vigilando" en ese caso cuenta como fallo.

**Modo libre**
- [x] Con presupuesto 30.000, gasto 40.000, 2 ventas y tope 20.000, sale el aviso "dejó de ser testeo" sin veredicto de testeo y sin rama iluminada.
- [x] Con presupuesto 100.000 y gasto 40.000 con 2 ventas dentro del tope, sigue saliendo "Dejar gastar el día".
- [x] Con presupuesto 30.000, gasto 30.000 y 1 venta, sigue calificando el corte 2.

**Práctica**
- [x] La ronda tiene 11 casos en orden al azar.
- [x] Cada caso muestra CPM y Tope.
- [x] `c9` (CPA 20.000 con tope 20.000) da "Dejar gastar el día".
- [x] `c10` empieza con "Seguir sin tocar" y termina en "Apagar" a los 40.000.
- [x] `c11` (CPM 26.000) no se apaga en ningún corte y muestra su nota tras decidir.
- [x] Al cargar un `pyl-testing` sin `v: 2`, el mejor puntaje queda en "—" y los pasos hechos se conservan (revisado en el navegador).

**Mapa de cortes**
- [x] Cada fila de los 3 cortes muestra al lado una etiqueta de botón del color de la fila con su acción (`<icono> <Acción>`; `✅ MARAVILLOSO` en `c1-sale`), coherente con `testVerdict`.
- [x] Las filas del corte 1 sin venta dicen "0 ventas".
- [x] En los pasos 2 a 4 ya no está la tarjeta del ejemplo ni se ilumina ninguna fila.
- [x] En el paso 6 el mapa se sigue iluminando con la práctica y con "Juega con los números".
- [x] Las filas del corte 3 caben en una sola línea en pantalla ancha (paso 4), con su etiqueta (revisado en el navegador).
- [x] Se ve bien en los 7 temas y en pantallas angostas (la etiqueta no desborda la fila; revisado en el navegador).

**Paso 5**
- [x] El paso se llama "La cadena y qué no hacer" y trae las 3 reglas de "Lo que no hago", con el 8.000 calculado desde `NS_TEST`.
- [x] Ya no aparecen `TEST_CHAIN.note` ni `TEST_CHAIN.ctr` (sus frases las absorben las reglas 1 y 3).
- [x] Las 3 lecturas y las 3 reglas se ven con más vida (acento y etiquetas de color) en los 7 temas y en pantallas angostas (revisado en el navegador).

**Calidad**
- [x] Ningún corte ni umbral se escribe a mano en los textos: salen de `NS_TEST`, `TEST_RULES` y `GENERIC_CPA`. Excepción: los números propios de cada caso.
- [x] Pasan `node tests/core.test.js`, `tests/smoke.test.js` y `node --check` de cada archivo tocado.
- [x] La consola queda limpia y `claves-pyl.json` coincide con `--claves`.
- [x] Se ve bien en los 7 temas y en pantallas angostas: los 7 datos de la tarjeta de práctica no se desbordan (revisado en el navegador).

## Decisiones

- **Sí:** `c3-own` pasa a apagar, con luz roja y veredicto "NO CUMPLE · APÁGALO" (decisión del usuario). **No:** luz amarilla. La acción es apagar y el color debe decirlo.
- **Sí:** se conserva el id `c3-own` y la marca de regla propia. NovaSociety no define el caso, y la recomendación sale de su propia regla de los 40.000. **No:** presentarla como regla de Juan.
- **Sí:** la frase de escalado va en los pasos 1 y 4 (decisión del usuario).
- **Sí:** en "Juega con los números", el aviso "dejó de ser testeo" sale solo con gasto ≥ presupuesto del día y ≥ 40.000, con 2 o más ventas y CPA ≤ tope (decisión del usuario). **No:** la lectura al pie de la letra (gasto ≥ presupuesto con ventas). Con ABO de 30.000 sacaría del testeo a un conjunto con 1 venta antes del corte de 40.000.
- **Sí:** 3 casos nuevos, banco de 11, con CPM y tope visibles en todos (decisión del usuario). **No:** mostrarlos solo en los casos que los necesitan, porque delatarían la respuesta.
- **Sí:** el CPM es solo informativo en la práctica. **No:** meterlo en `testVerdict`. En el testeo de Juan deciden los pagos iniciados, el CPPI y las ventas; el CPM es para revisar la cadena después de apagar.
- **Sí:** un `tope` por caso, solo para `c9`. Con el tope fijo de 15.000 no hay forma de que 2 ventas a los 40.000 den un CPA igual al tope.
- **Sí:** la nota de `c11` en la retroalimentación. Sin ella, el caso no enseña por qué el CPM caro no apaga.
- **Sí:** reiniciar una vez el mejor puntaje con la marca `v: 2` (decisión del usuario). **No:** conservarlo, porque se calculó con la regla vieja.
- **No:** casos para "CPPI 6.000 exacto sin ventas" y "muchos pagos iniciados y 0 ventas a 40.000". Ya los cubren `c7` (corte 2) y `c4` (corte 3).
- **No:** el producto real que se usó como ejemplo en la revisión (tope 24.617, zona de apagar 32.822). Los casos de la práctica son inventados.

- **Sí:** el veredicto va al lado de cada fila, en las 13 ramas y en los 3 cortes (decisión del usuario). **No:** solo el corte 1.
- **Sí:** la etiqueta lleva solo la acción (y MARAVILLOSO en `c1-sale`), como botón de color (decisión del usuario). **No:** repetir el veredicto ("· APÁGALO", "· FLOJO"), que ya dice la frase.
- **Sí:** la etiqueta de la regla propia `c3-own` dice "❓ Preguntar", no "Apagar" (decisión del usuario): es una regla de la app, no de NovaSociety, y queda por aclarar. La acción interna sigue siendo apagar (`verdict.action = 'off'`) y la práctica la califica así. **No:** presentarla como acción.
- **Sí:** la marca "Regla propia · NovaSociety no define este caso" sale como tooltip al pasar el mouse por "❓ Preguntar" (decisión del usuario), no como etiqueta aparte en la fila. **No:** dejar la etiqueta, que alarga la fila.
- **Sí:** se conserva la frase corta de cada fila y se le suma la etiqueta con la acción y el veredicto. **No:** reemplazar la frase.
- **Sí:** quitar el ejemplo de los pasos 2–4 y no iluminar nada ahí (decisión del usuario). **No:** dejarlo oculto pero iluminado.
- **Sí:** "0 ventas" en las tres filas del corte 1 sin venta, no solo en "3 o 4 pagos iniciados", para que el criterio sea el mismo en todas.
- **Sí:** el veredicto sale de una sola fuente compartida con `testVerdict`. **No:** escribirlo a mano en `TEST_CUTS`, porque se desalinearía.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Juan maneja distinto el caso de `c3-own` | Queda marcado como regla propia; si él lo define, se cambia en una sola rama de `testVerdict` y su tarjeta del mapa |
| Las pruebas viejas fijan `watch` en `c6`/`c7` y "a nadie le interesa" | Se actualizan en los pasos 1 y 2 antes de cambiar el código |
| La tarjeta de práctica con 7 datos se desborda en pantallas angostas | `.ts-stats` ya se acomoda en filas; revisión en el navegador |
| El aviso de "dejó de ser testeo" tapa un veredicto que el usuario quería ver | Solo sale cuando el corte 3 ya dio "Dejar gastar el día" y el día se gastó; las pruebas fijan los 4 casos borde |
| La etiqueta alarga la fila y desborda en pantallas angostas | La fila ya se acomoda en varias líneas; revisión en el navegador |
| Un nombre nuevo choca al aplanar `js/index.js` | Grep de `TEST_VERSION` antes de exportar |

## Lo que **no** está en esta spec

- Lectura real y Simulador de Testeo.
- Escalado real y la regla de apagar en un solo día.
- El CPM dentro de las reglas del testeo.
- Cambios a umbrales, cortes, zonas, pasos o casillas.

Cada una de esas, si llega, va en su propia spec.
