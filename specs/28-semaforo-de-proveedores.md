# SPEC 28 — Semáforo de proveedores y conteo de anunciantes en Buscar producto

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 25
> **Fecha:** 2026-11-25 (ampliada el mismo día con la parte de anunciantes)
> **Objetivo:** Cambiar el criterio de proveedores de Buscar producto a cuatro zonas (1–3 ideal, 4–6 aceptable, 7–10 cuidado, 11+ descarto) y mostrarlo como un semáforo de cuatro colores en la tarjeta del paso 3 del Flujograma DropKiller; y en el paso 6 (Ad Library con filtro Colombia) contar los anunciantes que ya venden el producto, a qué canal mandan, con tres zonas (1–5 poca competencia, 6–8 hay pelea, 9+ mucha competencia).

## Por qué existe esta spec

Hoy `LIMITS.prov = { ideal: 5, max: 10 }` dice «menos de 5, máximo 10». El usuario afinó su criterio: lo ideal es tener máximo 3 proveedores, lo aceptable máximo 6, de 7 a 10 entra con cuidado y analiza bien el producto, y con más de 10 lo descarta porque el producto está muy competido. El paso 3 («Sumar ventas y contar proveedores») solo lo dice en la pregunta de la puerta, en texto plano. Se quiere verlo de un vistazo, con colores.

**Anunciantes (ampliación).** Proveedores y anunciantes son dos conteos distintos: los **proveedores** son quién tiene el producto en la bodega de Dropi (paso 3); los **anunciantes** son las tiendas o personas que ya lo están vendiendo con anuncios en Colombia. El usuario busca el producto por imagen en AdsKiller (paso 5) y después, en la Ad Library de Meta con filtro Colombia (paso 6), revisa los anuncios que salen: cuenta cuántas tiendas o personas distintas lo venden y a qué canal mandan (WhatsApp, tienda Shopify, landing propia…). Eso le dice si lo testea o no: con más de 8 anunciantes hay mucha competencia. Hoy `LIMITS.advertisers = 5` solo dice «ideal menos de 5» y el conteo vive en el paso 5, no en el 6.

Como `LIMITS` es la única fuente de los números de la búsqueda, los dos cambios se aplican en todos los lugares que la usan, no solo en sus pasos.

## Alcance

**Dentro:**

- **Umbrales nuevos** en `LIMITS.prov` (`js/modules/search/core/search.js`): `{ ideal: 3, max: 6, risk: 10 }`.
  - 1–3 = ideal (verde), 4–6 = aceptable (amarillo), 7–10 = cuidado (naranja), 11 o más = descarto (rojo).
  - 10 proveedores es **cuidado**, no descarte.
- **Zonas como datos** en el núcleo: `PROV_ZONES` (4 zonas con rango, tono, nombre y qué hago) y `provZone(n)` → la zona de un número de proveedores.
- **Semáforo en la tarjeta del paso 3** (`FLOW`, clave `sumar`): debajo del texto y antes del «Caso real», un bloque «Proveedores en Dropi» con:
  - Una barra horizontal de 4 segmentos iguales (verde, amarillo, naranja, rojo) con los rangos debajo de cada uno («1 – 3», «4 – 6», «7 – 10», «11 +») y su nombre («Ideal», «Aceptable», «Cuidado», «Descarto»).
  - Debajo, una lista de 4 líneas, cada una con su punto de color, rango en negrita y qué hago.
- **Textos de las zonas** (redacción final; los números salen de `LIMITS.prov`, no se escriben a mano):
  - Ideal · 1 – 3: «Poca competencia: entro con ventaja. Con uno solo es candidato a privatizar.»
  - Aceptable · 4 – 6: «Ya hay competencia, pero todavía hay espacio: lo testeo.»
  - Cuidado · 7 – 10: «Mercado peleado: analizo bien el producto (ventas recientes, anuncios, precio) antes de decidir.»
  - Descarto · 11 +: «Muy competido: gana el que más plata pierde en anuncios. Vuelvo a los filtros.»
- **Puerta del paso 3** (`gate.q`): «¿Total entre 100 y 3.000 y máximo 6 proveedores (hasta 10 con cuidado)?». El `no` sigue igual («Descarto y vuelvo a los filtros.»).
- **Coherencia en el resto de Buscar producto** (todo sale de `LIMITS.prov`):
  - Ficha VDO «Demanda» (`VDO`, `k: 'D'`): «Máximo 3 proveedores (aceptable hasta 6; de 7 a 10, con cuidado). Con uno solo es candidato a privatizar.»
  - Evaluador de Mi candidato (`evaluate`, fila `prov`): 1–6 verde, 7–10 amarillo, 11+ rojo. Textos: 1 → «Uno solo: candidato a privatizar.»; 2–3 → «N: pocos, ideal.»; 4–6 → «N: aceptable (ideal hasta 3).»; 7–10 → «N: cuidado, analízalo bien (ideal hasta 3).»; 11+ → «N: muy competido (máx. 10).».
  - Prompts y fichas de La Caza que usan `LIMITS.prov.max`: pasan a decir 6 solos (la prueba de la SPEC 25 ya lee el número de `LIMITS`).
  - Error común «Ignorar la saturación» (`MISTAKES`): «Con más de 10 proveedores gana el que más plata está dispuesto a perder en anuncios.» (número de `LIMITS.prov.risk`).
- **UI** (`js/modules/search/ui/search.js`): `flowStep` pinta el semáforo cuando el paso trae `zones`. Nueva función interna para la barra; estilos `.fl-zones*` en `css/modules/search.css` con los tokens `--g`, `--y`, `--o`, `--r` y sus `-ink`/`-bg` (sin colores fijos, se ve en los 7 temas).
- **Accesibilidad:** la barra es decorativa (`aria-hidden`); la lista de 4 líneas lleva el texto completo. El color nunca es la única pista: cada zona dice su nombre.
- **Pruebas** en `tests/core.test.js` (zonas, `provZone`, evaluador, textos con los números de `LIMITS`) y `tests/smoke.test.js` (el paso 3 pinta 4 segmentos y 4 líneas; los otros pasos no). `CLAUDE.md` y `README.md`.

**Dentro (ampliación: anunciantes):**

- **Umbral nuevo** `LIMITS.advertisers = { ideal: 5, max: 8 }` (antes el número `5` = «menos de 5»): 1–5 poca competencia, 6–8 hay pelea, 9 o más mucha competencia. **5 pasa a ser ideal** (antes «menos de 5»).
- **Paso 6 del flujograma** (`FLOW`, clave `radar`, «Store Radar y Ad Library»; redacción final, números de `LIMITS`, `{ b }` = negrita):
  - `p`: «Busco tiendas de afuera que ya lo escalan y los ángulos que usan, y cuento quién lo vende ya en Colombia.»
  - La viñeta actual del Ad Library pasa a ser dos:
    - «Ad Library afuera: copys, página y días activos (más de 7).»
    - «Ad Library con **filtro Colombia**: busco el producto y reviso los anuncios que salen. Cuento **anunciantes** (tiendas o personas distintas), no anuncios, y anoto a dónde mandan: **WhatsApp, tienda Shopify, landing propia** u otra. Lo anoto en "Mi candidato" (Anunciantes en mi mercado).»
  - Viñeta nueva, después de esa: «**Hasta 5** anunciantes: poca competencia. **De 6 a 8**: hay pelea, entro solo con un ángulo distinto. **Más de 8**: mucha competencia, no lo testeo.»
  - Las viñetas de Store Radar, «Abro la tienda…» y Rayos X y el «Caso real» no cambian.
  - Puerta nueva (`gate`): `q` «¿8 anunciantes o menos en Colombia?», `no` «Mucha competencia: no lo testeo y vuelvo a los filtros.».
- **Paso 5 AdsKiller** (`k: 'ads'`): se queda con la búsqueda por imagen afuera. Su última viñeta («Luego filtro solo mi país y cuento anunciantes… ideal menos de 5») cambia a: «Los anunciantes de Colombia los cuento en el paso 6, en la Ad Library con filtro Colombia.» Su puerta no cambia.
- **Coherencia** (todo sale de `LIMITS.advertisers`):
  - Ficha VDO «Oferta» (`VDO`, `k: 'O'`): «Máximo **5 anunciantes activos** (anunciantes, no anuncios; de 6 a 8 hay pelea, más de 8 es mucha competencia). Miro si mandan a landing o a WhatsApp.»
  - El Espía (`ESPIA`, entrada B): la ficha «Veo las tiendas que lo mueven» dice «Hasta **5 anunciantes activos** es señal de que no está saturado.» y el número grande pasa de `< 5` a `≤ 5`.
  - Evaluador de Mi candidato (`evaluate`, fila `advertisers`): 1–5 verde «N: poca competencia.»; 6–8 amarillo «N: hay pelea; entro con un ángulo distinto.»; 9+ rojo «N: mucha competencia (máx. 8).». 0 anunciantes sigue en verde «0: poca competencia.».
- **Sin semáforo de colores** para anunciantes: solo texto y puerta.
- **Pruebas** en `core.test.js` (umbral, textos del paso 5 y 6, VDO, El Espía, evaluador en 0, 5, 6, 8, 9) y `smoke.test.js` (el paso 6 muestra la viñeta de Colombia y la puerta; no trae `.fl-zones`).

**Dentro (ampliación: título de la sección):**

- La sección «Flujograma DropKiller» de Buscar producto pasa a llamarse **«Búsqueda con DropKiller»**: título de la tarjeta (`<h2>` de `#b-sec-flow`) y enlace 1 de la ruta `.b-route` en `index.html`. Ids, claves y nombres internos (`FLOW`, `#b-flow`, `fl-*`) no cambian.

**Fuera de la spec:**

- El prompt DropKiller (`dkprompt`): su `provMax` por defecto ya es 3 y es un filtro editable, no usa `LIMITS`.
- La estrategia por proveedor (`LIMITS.byProv`): no usa los umbrales de proveedores ni de anunciantes.
- Los prompts fijos de El Espía y La Caza: no se tocan (no escriben el número de anunciantes).
- Mover una aguja en el semáforo del paso 3 con el número de proveedores de Mi candidato (la tarjeta es una guía fija).
- Un cuarto color (naranja) en el evaluador de Mi candidato: sigue con verde/amarillo/rojo.
- Semáforo de colores (`.fl-zones`) para anunciantes.
- Un campo nuevo en Mi candidato para el canal de los anunciantes (WhatsApp, Shopify…): solo se anota a mano.
- Cambiar otros umbrales de `LIMITS` (ventas, stock, días activos del anuncio).
- Llevar el semáforo a otros pasos del flujograma.

## Modelo de datos

No hay nada guardado nuevo: ni claves de `localStorage` ni versión nueva de `pyl-search`.

```js
// js/modules/search/core/search.js
LIMITS.prov = { ideal: 3, max: 6, risk: 10 };   // antes { ideal: 5, max: 10 }

// Zonas en orden; `to: null` = sin tope. Los rangos salen de LIMITS.prov.
PROV_ZONES = [
  { k: 'ideal',  tone: 'g', t: 'Ideal',     from: 1,                    to: LIMITS.prov.ideal, d: [/* segmentos */] },
  { k: 'ok',     tone: 'y', t: 'Aceptable', from: LIMITS.prov.ideal + 1, to: LIMITS.prov.max,   d: [/* … */] },
  { k: 'risk',   tone: 'o', t: 'Cuidado',   from: LIMITS.prov.max + 1,   to: LIMITS.prov.risk,  d: [/* … */] },
  { k: 'out',    tone: 'r', t: 'Descarto',  from: LIMITS.prov.risk + 1,  to: null,              d: [/* … */] },
];

provZone(n)   // n entero ≥ 1 → la zona de PROV_ZONES; 0, negativo, no numérico o null → null

// Paso 3 del flujograma
FLOW[k='sumar'].zones = PROV_ZONES;   // flowStep pinta el semáforo solo si el paso trae `zones`

// Anunciantes en Colombia (ampliación)
LIMITS.advertisers = { ideal: 5, max: 8 };   // antes 5 (= «menos de 5»); 1–5 poca, 6–8 pelea, 9+ mucha competencia

// Paso 6 del flujograma: p y list nuevos, y gate nuevo
FLOW[k='radar'].gate = { q: '¿8 anunciantes o menos en Colombia?', no: 'Mucha competencia: no lo testeo y vuelvo a los filtros.' };
```

`LIMITS.advertisers` pasa de número a objeto: todo lugar que lo usaba como número (`VDO`, `ESPIA`, paso 5 y `evaluate`) se cambia a `.ideal`/`.max`; no queda ningún `LIMITS.advertisers` suelto.

`d` son segmentos (`string` y `{ b }`), como el resto de textos de la búsqueda. `PROV_ZONES` y `provZone` se exportan en `PYL.core.search` y aparecen aplanados en `js/index.js` (nombres únicos). Si cambian las claves de `PYL.*`, se actualiza `tests/fixtures/claves-pyl.json`.

## Plan de implementación

1. **Núcleo:** cambiar `LIMITS.prov`, agregar `PROV_ZONES` y `provZone` y exportarlos. Pruebas en `core.test.js`: rangos contiguos sin huecos (1–3, 4–6, 7–10, 11+), `provZone` en los bordes (1, 3, 4, 6, 7, 10, 11, 0, `null`). Lista de claves aplanadas.
2. **Textos que leen `LIMITS.prov`:** puerta del paso 3, ficha VDO «Demanda», evaluador de Mi candidato (colores y frases) y `MISTAKES`. Ajustar las pruebas del evaluador y revisar que la de La Caza siga pasando.
3. **Semáforo en el paso 3:** `FLOW` `sumar` con `zones`; `ui.search.flowStep` pinta barra y lista; estilos `.fl-zones*` en `search.css`. Prueba en `smoke.test.js`.
4. **Anunciantes:** `LIMITS.advertisers = { ideal: 5, max: 8 }`; paso 6 (`p`, viñetas del Ad Library y puerta), última viñeta del paso 5, ficha VDO «Oferta», ficha y número de El Espía y fila `advertisers` del evaluador. Pruebas en `core.test.js` y `smoke.test.js`.
5. **Título y documentación:** la sección pasa a «Búsqueda con DropKiller» (`<h2>` y enlace de la ruta en `index.html`; prueba en `smoke.test.js`). Documentación: `CLAUDE.md` (Buscar producto: nombre de la sección, semáforo del paso 3, conteo de anunciantes del paso 6 y umbrales) y `README.md`.

## Criterios de aceptación

- [x] `LIMITS.prov` vale `{ ideal: 3, max: 6, risk: 10 }`.
- [x] `provZone(1)`, `provZone(3)` → `ideal`; `provZone(4)`, `provZone(6)` → `ok`; `provZone(7)`, `provZone(10)` → `risk`; `provZone(11)`, `provZone(40)` → `out`; `provZone(0)` y `provZone(null)` → `null`.
- [x] Las 4 zonas de `PROV_ZONES` son contiguas (cada `from` = `to` anterior + 1) y la última tiene `to: null`.
- [x] La tarjeta del paso 3 del Flujograma DropKiller muestra la barra de 4 segmentos con «1 – 3», «4 – 6», «7 – 10», «11 +» y «Ideal», «Aceptable», «Cuidado», «Descarto».
- [x] Debajo de la barra hay 4 líneas con punto de color, rango y el texto de su zona.
- [x] Ningún otro paso del flujograma muestra el semáforo.
- [x] La puerta del paso 3 dice «máximo 6 proveedores (hasta 10 con cuidado)».
- [x] En Mi candidato, 6 proveedores sale en verde, 7 y 10 en amarillo, 11 en rojo; 1 dice «candidato a privatizar».
- [x] La ficha VDO «Demanda» y el error «Ignorar la saturación» muestran 3, 6 y 10 sin números escritos a mano.
- [x] Los prompts de La Caza dicen «6 proveedores».
- [x] `LIMITS.advertisers` vale `{ ideal: 5, max: 8 }` y no queda ningún uso de `LIMITS.advertisers` como número.
- [x] El paso 6 dice que cuenta anunciantes (no anuncios) en la Ad Library con filtro Colombia, que anota a dónde mandan (WhatsApp, tienda Shopify, landing propia) y las tres lecturas (hasta 5, de 6 a 8, más de 8).
- [x] El paso 6 tiene la puerta «¿8 anunciantes o menos en Colombia?» con «Mucha competencia: no lo testeo y vuelvo a los filtros.».
- [x] El paso 5 ya no cuenta anunciantes: remite al paso 6.
- [x] En Mi candidato, 0 y 5 anunciantes salen en verde, 6 y 8 en amarillo, 9 en rojo «mucha competencia (máx. 8)».
- [x] La ficha VDO «Oferta» y El Espía dicen 5 (y la VDO, 6 a 8 y más de 8) sin números escritos a mano.
- [x] El paso 6 no muestra semáforo de colores.
- [x] La sección se llama «Búsqueda con DropKiller» en el título de la tarjeta y en el enlace 1 de la ruta; no queda «Flujograma DropKiller» visible.
- [x] `node tests/core.test.js` y `smoke.test.js` pasan, sin emojis visibles nuevos fuera de las zonas permitidas.
- [x] (Navegador) El semáforo se lee en los 7 temas y en pantalla angosta (< 520 px) los rangos no se montan.

## Decisiones

- **Sí:** aplicar los nuevos umbrales en toda la app (cambiar `LIMITS.prov`). `LIMITS` es la única fuente; dejar 5/10 en el evaluador y 3/6/10 en el paso 3 daría dos criterios distintos.
- **No:** cambiarlo solo en la tarjeta del paso 3.
- **Sí:** 10 proveedores es «cuidado» (7–10); se descarta desde 11. Decisión del usuario.
- **No:** 10 = descarte (era la recomendación; el usuario la cambió).
- **Sí:** barra de 4 zonas con lista debajo. Se lee de un vistazo y la lista da el qué hago.
- **No:** 4 filas con punto solas, ni 4 chips en fila (opciones mostradas y no elegidas).
- **Sí:** evaluador de Mi candidato con 1–6 verde, 7–10 amarillo, 11+ rojo. Aceptable sigue siendo «entro»; no se agrega naranja al evaluador.
- **No:** 1–3 verde y 4–10 amarillo en el evaluador.
- **Sí:** las zonas como datos en `core` (`PROV_ZONES`) y la UI solo pinta. Regla del proyecto: los textos dinámicos devuelven datos.
- **Sí:** `dkprompt` queda fuera: es un filtro editable con su propio defecto (3), no una regla.
- **Sí:** sin aguja ni lectura del candidato en la tarjeta: el flujograma es una guía fija.
- **Sí:** proveedores (bodega de Dropi, paso 3) y anunciantes (quién lo pauta en Colombia, paso 6) son conteos distintos con umbrales propios. Confirmado con el usuario.
- **Sí:** el conteo de anunciantes de Colombia va en el paso 6 «Store Radar y Ad Library»; el paso 5 AdsKiller se queda con la búsqueda por imagen afuera. El usuario lo nombró «paso 8», pero el Ad Library es el paso 6 (el 8 es Costear).
- **No:** dejarlo en el paso 5, repartirlo en los pasos 5 y 6, ni crear un paso nuevo.
- **Sí:** anunciantes en tres zonas 1–5 / 6–8 / 9+ (`{ ideal: 5, max: 8 }`); 5 pasa a ser ideal.
- **No:** un solo corte en 8, ni mantener «menos de 5» con solo un aviso en 8.
- **Sí:** solo texto y puerta en el paso 6, sin semáforo de colores.
- **No:** reutilizar `.fl-zones` con zonas de anunciantes.
- **Sí:** la sección pasa a «Búsqueda con DropKiller» (propuesta del usuario); solo cambia el texto visible, no ids ni nombres internos.
- **No:** «Ruta DropKiller», «Paso a paso DropKiller» ni «Validación con DropKiller» (opciones mostradas y no elegidas).
- **Sí:** el canal al que mandan los anuncios (WhatsApp, Shopify, landing propia) se anota a mano; la app no lo califica ni lo guarda.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Productos ya anotados en la bitácora con 7–10 proveedores pasan de verde/amarillo a amarillo (y 4–5 de amarillo a verde) | Es el criterio nuevo; el evaluador se recalcula al abrir el producto. Nada guardado cambia. |
| Pruebas existentes con los números 5/10 escritos | Se ajustan en los pasos 1 y 2; las de La Caza ya leen `LIMITS`. |
| El naranja `--o` no se distingue bien del amarillo en algún tema | Cada zona dice su nombre; se revisa en los 7 temas en el navegador. |
| `LIMITS.advertisers` pasa de número a objeto: un uso olvidado pinta «[object Object]» o compara mal | Se buscan todos los usos (`VDO`, `ESPIA`, paso 5, `evaluate`) y una prueba revisa que ningún texto de `core` diga `[object Object]`. |
| Productos de la bitácora con 5 anunciantes pasan de amarillo a verde, y 9+ de amarillo a rojo | Es el criterio nuevo; nada guardado cambia. |

## Qué **no** entra en esta spec

- Cambios en el prompt DropKiller.
- Aguja con el número de proveedores del candidato en el semáforo.
- Naranja en el evaluador de Mi candidato.
- Otros umbrales de `LIMITS` (salvo proveedores y anunciantes).
- Semáforos en otros pasos del flujograma (tampoco para anunciantes).
- Campo para el canal de los anunciantes en Mi candidato.
