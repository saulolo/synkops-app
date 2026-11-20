# SPEC 18 — Inicio: marca Synkops, saludo y frase del día

> **Estado:** Aprobado
> **Depende de:** SPEC 14, SPEC 17
> **Fecha:** 2026-11-20
> **Objetivo:** Rehacer la tarjeta principal de Inicio para que salude a Saúl según la hora, muestre una frase motivadora distinta en la mañana y en la tarde tomada de una lista local de 864 frases, y presente la app con su nombre, slogan, descripción y dos botones nuevos.

## Por qué existe esta spec

La tarjeta `.hero` de Inicio (`#v-dash`) todavía habla del prototipo original: «Mi copiloto de pauta», «Lectura de campañas · mis métricas antes de gastar» y una descripción que solo nombra el entrenador. La app ya es mucho más (búsqueda, desarrollo, testeo, logística, P&L). Esta es la primera mejora del módulo Inicio: la tarjeta pasa a presentar Synkops y a recibir al usuario cada día.

Cambio de rumbo durante la implementación: la primera versión de esta spec traía la frase de una API (Drivebird + traducción con MyMemory). El usuario la reemplazó por una lista local armada con dos archivos suyos (ver Decisiones). Esta versión describe lo que quedó.

## Alcance

**Dentro:**

- **Saludo** arriba de todo en la tarjeta `.hero`, según la hora local al cargar:
  - 05:00–11:59 → «Buenos días, Saúl»
  - 12:00–18:59 → «Buenas tardes, Saúl»
  - 19:00–04:59 → «Buenas noches, Saúl»
  - El nombre es la constante `HOME_NAME = 'Saúl'` (con tilde). No es editable desde la UI.
  - El saludo se calcula al cargar; no se actualiza en vivo si la página queda abierta.
  - Sin emoji tras el nombre.
  - Dos renglones: «Buenas tardes,» pequeño (`.home-greet`) y el nombre grande debajo (`.home-name`, degradado del acento que brilla en bucle). Entra con un leve deslizamiento hacia arriba.
- **Frase del día, dos por día**, seguida del saludo en la misma línea. Los dos van en una franja `.home-band` que ocupa todo el ancho de la tarjeta (las dos columnas del hero, encima del texto y de la ilustración); si no cabe, la frase baja de renglón.
  - Contenido: etiqueta + «“texto”» + «— Autor».
  - **Media jornada:** de 00:00 a 11:59 sale la frase de la mañana; de 12:00 a 23:59, la de la tarde (de noche se ve la de la tarde).
  - **Etiqueta** (`.home-quote-label`, en mayúsculas por CSS): mañana → «Frase de la mañana:»; tarde → «FRASE DE HOY».
  - **Elección:** cada media jornada toma la siguiente frase de una baraja de toda la lista, mezclada con una semilla fija. Ninguna frase se repite hasta usarlas todas; después se baraja otra vez. Recargar la página el mismo día muestra las mismas dos frases.
  - Sin frases (lista vacía), el bloque de la frase se oculta.
  - Sin red, sin `localStorage` y sin estados de carga ni de error: la frase se calcula al cargar.
- **Lista de frases:** 864 frases únicas con autor (`"Anónimo"` si no se sabe), resultado de unir dos archivos del usuario (365 de libros de mentalidad y finanzas y 500 de personajes célebres; una repetida se descartó).
  - Copia de referencia en `docs/referencia/frases.json` (no la lee la app).
  - La app lee `js/modules/home/core/quotes.js`, que lleva la misma lista como `.js` porque con `file://` el navegador bloquea leer un `.json` local. Para agregar o quitar frases se edita ese archivo.
- **Animación de la frase:** tarjetita con fondo y borde del acento, barra izquierda que late, resplandor suave en bucle y un destello que la cruza cada ~7 s; entra desde la derecha y la frase y el autor aparecen uno tras otro. Con `prefers-reduced-motion` todo queda quieto.
- **Título:** `<h1>` = «Synkops».
- **Eyebrow:** «Mi copiloto de pauta» → «Mi copiloto de ecommerce» (mismo ícono y estilo), justo debajo de «Synkops».
- **Slogan:** debajo del eyebrow, en la línea con degradado (`.grad.grad-line.hero-slogan`, fuera del `<h1>`, mismo tamaño que antes): «Cada peso medido, cada paso conectado».
- **Descripción** (`.lead`), texto exacto del usuario (puede pasar de 3 renglones; aceptado):

  > Synkops es el centro de mando de mi ecommerce, donde todo mi negocio vive en un solo lugar. Desde encontrar y costear un producto hasta lanzarlo, testearlo y escalarlo, con el método NovaSociety y mi experiencia propia.

- **Botones:**
  - Principal (`.btn.big`): «Empezar por buscar producto» → `data-go="buscar"` (abre `#v-buscar`). Ícono: lupa.
  - Secundario (`.btn.ghost.big`): «Costear producto» → `data-go="costeo"` (abre `#v-costeo`). Ícono: la calculadora que antes tenía «Empezar por el costeo».
  - Desaparecen «Empezar por el costeo» y «Evaluar un conjunto».
- La ilustración `.hero-art` y el Centro de mando (`#hb-rail`) no cambian.
- Pruebas en `tests/core.test.js` y `tests/smoke.test.js`; `tests/fixtures/claves-pyl.json` al día.

**Fuera de la spec (otras specs):**

- Resto del módulo Inicio (tarjetas debajo del hero, cadena, accesos).
- Nombre editable o varios usuarios.
- Frases traídas de una API o traducidas.
- Botón para pedir otra frase, compartirla o marcar favoritas.
- Que la frase cambie en vivo al pasar del mediodía con la página abierta.
- Actualizar el saludo en vivo al cambiar la hora.
- Editor de frases dentro de la app.

## Modelo de datos

### Módulo nuevo `home`

```text
js/modules/home/core/quotes.js   PYL.core.homeQuotes   (la lista HOME_QUOTES)
js/modules/home/core/home.js     PYL.core.home         (reglas puras: saludo, media jornada, baraja)
js/modules/home/ui/home.js       PYL.ui.home           (pinta saludo y frase)
js/modules/home/app/home.js      PYL.app.home          (arranque y estado)
css/modules/home.css             estilos propios, después de logistics.css y antes de themes.css
docs/referencia/frases.json      copia de referencia de la lista (no se carga)
```

Prefijo `home`/`HOME_` en el núcleo (se aplana en `js/index.js`; `hm` ya es de Métricas). `quotes.js` va antes de `home.js` en `index.html`; en `js/index.js` entra solo `home.js`.

### `core/quotes.js`

```js
HOME_QUOTES = [{ text: '…', author: '…' }, …]   // 864, sin repetidas, text sin comillas externas
```

### `core/home.js`

```js
HOME_NAME = 'Saúl';
HOME_EPOCH = [2026, 0, 1];   // día 0 de la rotación (fecha local)
HOME_SEED = 18;               // semilla de la baraja; cada vuelta usa HOME_SEED + vuelta
HOME_SLOTS = ['Frase de la mañana:', 'FRASE DE HOY'];

homeGreeting(hour)        // 0–23 → 'Buenos días' | 'Buenas tardes' | 'Buenas noches'
homeHello(hour)           // → 'Buenas tardes, Saúl'
homeSlot(hour)            // 0 = 00:00–11:59, 1 = 12:00–23:59
homeDay(date)             // días locales desde HOME_EPOCH (sin saltos de horario)
homeOrder(n, seed)        // permutación 0..n-1 barajada con semilla (mulberry32 + Fisher-Yates)
homePick(quotes, date)    // → { slot, label, text, author } | null sin frases
```

`homePick` calcula `k = homeDay(date) × 2 + slot`, la vuelta `k ÷ n` y la posición `k mod n` en la baraja de esa vuelta.

### Guardado

Ninguno. `app.state.home = { slot, text, author }` (o `{ slot: null, text: '', author: '' }` sin frases). No guarda la hora ni el saludo.

### Ids nuevos

`#home-hello` (saludo), `#home-quote` (contenedor de la frase, con `data-slot` = `manana` | `tarde`), `#home-quote-text`, `#home-quote-author`. Prefijo `#home-`/`.home-`.

### Archivos que cambian

- `index.html`: tarjeta `.hero` de `#v-dash` (saludo, frase, eyebrow, título, slogan, descripción, botones); `<link>` de `home.css`; `<script>` de los 4 archivos del módulo en su capa.
- `css/modules/trainer.css`: eyebrow y slogan del hero.
- `js/index.js`: `modules/home/core/home.js`.
- `tests/core.test.js`, `tests/smoke.test.js`, `tests/fixtures/claves-pyl.json`.
- Tras el merge: `CLAUDE.md` y `README.md`.

## Plan de implementación

1. **Lista de frases.** Unir los dos archivos del usuario sin repetidas en `core/quotes.js` y en `docs/referencia/frases.json`. Comprobar 864 frases únicas, todas con texto y autor.
2. **Núcleo.** `core/home.js` con las funciones puras; agregarlo a `js/index.js`; pruebas en `core.test.js`: horas límite 4, 5, 11, 12, 18, 19 y 23; `homeSlot`; `homeDay` en el día 0, un día después, antes de la época y un año después; `homeOrder` es una permutación y es repetible; `homePick` da una frase en la mañana y otra en la tarde, sin repetir hasta agotar la lista, con la etiqueta de cada media jornada, y `null` sin frases.
3. **Tarjeta nueva.** `index.html`: franja con saludo y frase, eyebrow, `<h1>` Synkops, slogan, descripción y los dos botones. Comprobar que «Empezar por buscar producto» abre Buscar producto y «Costear producto» abre Costeo.
4. **Saludo y frase.** `ui/home.js` + `app/home.js` + `css/modules/home.css`: saludo por hora y frase de la media jornada, al cargar.
5. **Pruebas de UI.** `smoke.test.js`: textos y orden del hero; botones con `data-go` correctos que cambian de vista; saludo según la hora; `#home-quote` muestra la frase y la etiqueta que da `homePick` y sale de la lista. Actualizar `claves-pyl.json`.
6. **Revisión en el navegador.** Los 7 temas, ancho menor de 1280 px (hero apilado), animaciones y `prefers-reduced-motion`. La hace el usuario: jsdom no evalúa CSS.

## Criterios de aceptación

- [x] La tarjeta de Inicio muestra, en este orden: saludo y frase, título «Synkops», eyebrow «Mi copiloto de ecommerce», slogan «Cada peso medido, cada paso conectado», la descripción exacta y los dos botones.
- [x] A las 10:00 el saludo dice «Buenos días, Saúl»; a las 15:00 «Buenas tardes, Saúl»; a las 21:00 y a las 03:00 «Buenas noches, Saúl».
- [x] De 00:00 a 11:59 se ve una frase con la etiqueta «Frase de la mañana:»; de 12:00 a 23:59, otra distinta con «FRASE DE HOY».
- [x] La frase sale entre comillas con «— Autor», y es una de las 864 de la lista.
- [x] Recargar el mismo día muestra las mismas dos frases; ninguna se repite hasta agotar la lista.
- [x] La app no hace ninguna petición de red ni guarda nada para la frase.
- [x] «Empezar por buscar producto» abre la pestaña Buscar producto; «Costear producto» abre Costeo.
- [x] Ya no existen los textos «Mi copiloto de pauta», «Lectura de campañas», «Empezar por el costeo» ni «Evaluar un conjunto».
- [x] `node tests/core.test.js` y `node tests/smoke.test.js` pasan; la consola queda limpia (salvo el `scrollTo` esperado).
- [x] Se ve bien en los 7 temas y bajo 1280 px (el hero apilado), con las animaciones y sin ellas con `prefers-reduced-motion`.

## Decisiones

- **Sí:** lista local de frases, sin red. Cambio pedido por el usuario durante la implementación: pasó dos archivos suyos (365 y 500 frases) para unirlos en uno solo. Funciona sin internet y sin depender de ningún servicio.
- **No** (descartado durante la implementación): frase del día traída de Drivebird `/api/quotes/today` con traducción de MyMemory. Quedaba en inglés traducido a máquina, dependía de dos servicios y de CORS desde `file://`, y necesitaba caché y estados de error. Se quitó `services/home.js` y `services.storage.home`.
- **No:** MotivationalAPI, Positive API, ZenQuotes ni `frasedeldia.azurewebsites.net` (pocas frases, sin frase del día, CORS bloqueado o sin respuesta), evaluadas cuando aún se pensaba en una API.
- **Sí:** dos frases por día, una por media jornada (corte a las 12:00), pedido del usuario. La noche ve la de la tarde.
- **Sí:** elección determinista por fecha (baraja con semilla fija) en vez de `Math.random()`: la misma fecha da las mismas frases y no se repiten hasta usar toda la lista. **No:** azar puro (repetiría frases y cambiaría al recargar).
- **Sí:** etiqueta «FRASE DE HOY» en la tarde, pedido del usuario. La de la mañana se queda «Frase de la mañana:».
- **Sí:** `.js` además del `.json` de referencia: con `file://` el navegador no deja leer archivos locales.
- **Sí:** nombre fijo `HOME_NAME = 'Saúl'`. App personal de un solo usuario.
- **Sí:** saludo según la hora, calculado al cargar.
- **Sí:** descripción larga tal cual la escribió el usuario, aunque pase de 3 renglones.
- **Sí:** prefijo `home`/`#home-`; `hm` ya es de Métricas.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Una frase muy larga rompe la franja | La frase baja de renglón (`flex-wrap`) y el autor no se parte (`white-space: nowrap`); se revisa a mano bajo 1280 px. |
| Editar `quotes.js` mal (coma de más o comilla sin escapar) rompe todo Inicio | Pruebas del núcleo cargan la lista; `node --check js/modules/home/core/quotes.js` tras editar. |
| Se agregan frases repetidas | La copia en `docs/referencia/frases.json` y las pruebas (864 únicas) ayudan a detectarlo. |
| Al agregar o quitar frases cambian las que tocan cada día | Aceptado: la baraja depende del tamaño de la lista. |
| La frase de la mañana queda fija si la página se deja abierta pasado el mediodía | Aceptado (se calcula al cargar); recargar la actualiza. |

## Lo que **no** está en esta spec

- El resto del módulo Inicio.
- Nombre editable o multiusuario.
- Frases por API o traducidas, botón de «otra frase» o favoritas.
- Saludo o frase que cambian en vivo.

Cada uno, si llega, va en su propia spec.
