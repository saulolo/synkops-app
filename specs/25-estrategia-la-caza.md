# SPEC 25 — Estrategias «La Caza» y «El Espía» en Buscar producto

> **Estado:** Aprobado
> **Depende de:** SPEC 09, SPEC 24
> **Fecha:** 2026-11-24
> **Objetivo:** Agregar «La Caza» (tercera) y «El Espía» (cuarta) como estrategias de búsqueda en Buscar producto. La Caza explica de forma interactiva sus dos puertas y sus tres métodos (A, B, C); El Espía explica sus dos entradas (por tienda y por producto) y lo que muestra de cada tienda. Cada método trae un prompt fijo para usar con el MCP de DropKiller.
> **Ampliación (2026-11-24):** El Espía se sumó a esta spec después de aprobada y con La Caza ya implementada (pasos 1 a 4); sus pasos son el 5 al 8 y las docs pasaron al 9.

## Por qué existe esta spec

El Laboratorio de NovaSociety tiene un apartado «La caza»: con DropKiller conectado, busca lo que ya se vende y lo pasa por dos puertas (que esté en Dropi del país y que la competencia, sumando todos los ID, vaya por debajo del techo). «Lo que a mano es una tarde, aquí son dos minutos.» Tiene tres formas de cazar: A «Se vende afuera pero no aquí», B «Vende aquí, bajo el techo» y C «Explota en TikTok Shop». La app hoy solo tiene las estrategias VDO y por proveedor; el usuario quiere la tercera, informativa, con el mismo estilo.

El MCP del Laboratorio (`novasociety`) **no expone La caza** (solo `reglas_de_juan`, `resumen_laboratorio`, productos y cuaderno; sin recursos). El detalle de cada método lo redacta esta spec a partir de la descripción del usuario y de lo que hacen de verdad las herramientas del MCP de DropKiller (`find_winning_products`, `search_products`, `semantic_search_products`, `search_tiktok_products`). Queda marcado como provisional (ver Decisiones).

## Alcance

**Dentro:**

- **Tercera tarjeta en `#b-strats`:** `STRATEGIES` suma `{ k: 'caza', t: 'La Caza', icon: 'crosshair', d: 'Parto de lo que ya se vende y lo paso por dos puertas: Dropi de mi país y bajo el techo.' }`. Se pinta con el `strategyTabs` que ya existe. El subtítulo de la tarjeta «Estrategias de búsqueda» pasa de «Dos caminos…» a «Tres caminos para encontrar un producto. Elijo uno y lo sigo paso a paso.»
- **Panel nuevo** `<div class="st-panel" id="b-st-caza" hidden>` en `index.html`, después de `#b-st-prov`, con `<h3 class="st-h">La Caza</h3>`, una línea `muted b-sub` y el contenedor `<div class="cz mt" id="b-caza">`. Al hacer clic en la tarjeta «La Caza» se oculta el panel abierto y se muestra este, igual que VDO y por proveedor.
- **Contenido del panel** (pintado por `ui.search.caza`), de arriba abajo:
  1. **Frase de entrada** (`.cz-lead`): «Con DropKiller conectado, la caza busca lo que ya se vende y lo pasa por dos puertas. Lo que a mano es una tarde, aquí son dos minutos.»
  2. **Las dos puertas** (`.cz-gates`): diagrama horizontal «Lo que ya se vende» → Puerta 1 → Puerta 2 → «Candidato», con una luz que recorre la línea en bucle (CSS, quieta con `prefers-reduced-motion`). Cada puerta es una tarjeta con ícono, título y regla:
     - Puerta 1 `package` «Está en Dropi de mi país»: que exista en Dropi Colombia **con stock** (mínimo `LIMITS.stock` unidades). Si no está, no lo puedo vender (enlaza con la característica `dropi` de `WINNER`).
     - Puerta 2 `wall` «Bajo el techo»: sumando **todos los ID** del producto en Dropi Colombia, ventas totales ≤ `LIMITS.total.ideal` (límite `LIMITS.total.max`), ventas de 7 días ≤ `LIMITS.v7.max` y como máximo `LIMITS.prov.max` proveedores.
     - Bajo 720 px el diagrama se apila en vertical.
  3. **Selector de método** (`.cz-methods`, `role="group"`): tres botones `.cz-node[data-m]` con letra en círculo (A, B, C), ícono, título y una línea: A `globe` «Se vende afuera pero no aquí», B `signal-low` «Vende aquí, bajo el techo», C `rocket` «Explota en TikTok Shop». El elegido lleva `.on` y `aria-pressed="true"`. Por defecto, A.
  4. **Detalle del método elegido** (`.cz-det.pop`, con la animación de entrada `pop` que ya usa la estrategia por proveedor):
     - Etiqueta `Método X de 3` y «Dónde» (`where`).
     - Título con ícono y párrafo «Qué es» (`p`).
     - **Ruta** (`.cz-route`): pasos numerados en fila (en columna en angosto), cada uno con ícono, título y texto. El último paso de A y C es una **bifurcación** (`.cz-fork`) con dos salidas de color: verde «Está en Dropi → Puerta 2 (el techo)» y amarillo «No está en Dropi → Desarrollo con laboratorio aliado (Goldbox)»; el aliado sale de `BY_PROVIDER.allies`.
     - **Qué miro** (`.cz-checks`): fichas grandes con el número (como `.ps-rule`): cifra, unidad y texto, salidas de `LIMITS`.
     - **Prompt** (`.cz-prompt`): bloque de texto fijo del método (solo lectura, `<pre>` o `<p>` con `white-space: pre-wrap`) y botón «Copiar prompt» (`.btn sm`, ícono `copy`) que copia con `ui.dom.copy` y avisa en `#toast` («Prompt copiado» / «No se pudo copiar»).
     - Acciones: `← Método anterior` / `Siguiente método →`. Sin botón «Anotarlo en Mi candidato» (se quitó a pedido del usuario).
- **Los tres métodos** (texto provisional redactado por esta spec):
  - **A · Se vende afuera pero no aquí** (`where`: «DropKiller → Productos, otro país»). Productos que ya venden en otros países de Dropi (México, Chile, Ecuador, Perú, Guatemala…) y en Colombia todavía no. Ruta: 1 `pin` Elijo un país de afuera → 2 `trend-up` Miro lo que más vende allá en 7 días (con stock y activo) → 3 `search` Lo busco en Dropi Colombia por nombre o por foto, sumando todos los ID → 4 bifurcación (está con ventas bajo el techo → candidato; no está → laboratorio aliado). Qué miro: ventas afuera en 7 días ≥ `LIMITS.v7.min`; en Colombia ventas totales < `LIMITS.total.min` (casi nadie lo vende aquí).
  - **B · Vende aquí, bajo el techo** (`where`: «DropKiller → Productos, Colombia · Dropi»). Productos que ya se venden en Colombia, pero en pocas cantidades: hay demanda y poca competencia. Ruta: 1 `trend-up` Lo que se está moviendo en Dropi Colombia (7 días o en tendencia) → 2 `search` Sumo las ventas de todos los ID del mismo producto → 3 `wall` Lo paso por el techo → 4 `check-circle` Candidato. Qué miro: ventas de 7 días entre `LIMITS.v7.min` y `LIMITS.v7.max`, totales entre `LIMITS.total.min` y `LIMITS.total.ideal`, proveedores ≤ `LIMITS.prov.max`, stock ≥ `LIMITS.stock`.
  - **C · Explota en TikTok Shop** (`where`: «DropKiller → TikTok Shop (EE. UU.)»). Lo más vendido en TikTok Shop de Estados Unidos y cómo está en Dropi Colombia. Ruta: 1 `rocket` Lo más vendido en TikTok Shop → 2 `search` Lo busco en Dropi Colombia por nombre o por foto → 3 bifurcación: no está → va a desarrollo con laboratorio aliado; está → pasa por mi techo (Puerta 2). Qué miro: volumen de ventas en TikTok Shop (lo que más vende, no un número fijo) y, si está en Dropi, el mismo techo de B.
- **Prompts fijos** (uno por método, texto en `core`, sin campos): piden al MCP de DropKiller ejecutar el método en Colombia con plataforma `DROPI`, devolver 5 resultados en tabla (nombre, ventas 7 días, ventas totales sumando todos los ID, proveedores, stock, enlace de DropKiller) y decir por cuál puerta pasa o se cae cada uno. Los números del prompt salen de `LIMITS` (nada escrito a mano). Igual que el Prompt DropKiller: no nombran parámetros del MCP ni `familyId`; solo dicen qué buscar y cómo sumar.
- **Estado y guardado:** `app.state.search.cazaMethod` (`'a' | 'b' | 'c'`, por defecto `'a'`), guardado con el resto en `services.storage.search` (`pyl-search`), igual que `provStep`. Un valor desconocido cae en `'a'`. `strat` acepta `'caza'`.
- **Íconos:** se agrega `crosshair` (mira de caza) a `js/shared/ui/icons.js`. Los demás (`package`, `wall`, `globe`, `signal-low`, `rocket`, `pin`, `trend-up`, `search`, `check-circle`, `copy`) ya existen.
- **Estilos** en `css/modules/search.css` con prefijo `.cz-` (solo tokens: `--b`, `--b-rgb`, `--g`, `--y`, `--line`, `--card`…). Efectos: luz viajera en las puertas, hover con elevación de 1 px y halo del acento en `.cz-node`, entrada escalonada de los pasos de la ruta al cambiar de método; todo quieto con `prefers-reduced-motion`. Sin reglas en `themes.css` (no hay colores fijos).
- **Pruebas** (ver criterios), `claves-pyl.json` si cambian las claves, `CLAUDE.md` y `README.md`.

### El Espía (cuarta estrategia)

El Laboratorio de NovaSociety tiene un apartado «El Espía». Con el DropKiller del usuario: muestra los anuncios ganadores en su país de un producto seleccionado y las tiendas que lo están moviendo. Se pega el dominio o cualquier enlace de una tienda y sale todo en una pantalla: sus **productos top**, sus **anuncios**, sus **apps**, su **tema** y sus **píxeles**. También se ven sus anuncios por nombre de producto, sus tiendas y cómo fue construida cada una; sirve para ver qué venden las tiendas top. El MCP del Laboratorio **tampoco expone El Espía** (se revisó: `cuaderno` vacío, `reglas_de_juan` solo trae reglas de campañas, sin recursos). El texto sale de la descripción del usuario y de las herramientas reales de DropKiller (`store_tech_report`, `search_stores`, `list_store_products`, `list_store_ads`, `list_store_apps`, `search_ads`); es provisional, igual que La Caza.

**Dentro (El Espía):**

- **Cuarta tarjeta en `#b-strats`:** `STRATEGIES` suma `{ k: 'espia', t: 'El Espía', icon: 'eye', d: 'Pego la tienda de un competidor y veo lo que vende, cómo anuncia y con qué está construida.' }`. El subtítulo pasa a «Cuatro caminos para encontrar un producto. Elijo uno y lo sigo paso a paso.» Con cuatro tarjetas la rejilla vuelve a 2 columnas (se quita la regla `#b-strats{grid-template-columns:repeat(3,1fr)}` de La Caza).
- **Panel nuevo** `<div class="st-panel" id="b-st-espia" hidden>` después de `#b-st-caza`, con `<h3 class="st-h">El Espía</h3>`, una línea `muted b-sub` y `<div class="sp mt" id="b-espia">`. Un clic en la tarjeta oculta el panel abierto y muestra este.
- **Contenido** (lo pinta `ui.search.espia`), de arriba abajo:
  1. **Frase de entrada** (`.sp-lead`): «Con DropKiller conectado, el espía muestra los anuncios ganadores de mi país de un producto y las tiendas que lo están moviendo.»
  2. **La pantalla** (`.sp-screen`): una maqueta de la «sola pantalla» con las cinco cosas que sale de una tienda, en fichas (`.sp-tile`, ícono + nombre + una línea): Productos top (`trophy`), Anuncios (`megaphone`), Apps (`gem`), Tema (`store`) y Píxeles (`target`). Una luz recorre las fichas en bucle (CSS, quieta con `prefers-reduced-motion`). Debajo del diagrama, «Pego el dominio o cualquier enlace de la tienda» con la flecha de entrada. Bajo 720 px las fichas se apilan.
  3. **Selector de entrada** (`.sp-modes`, `role="group"`): dos botones `.sp-node[data-m]` con letra (A, B), ícono, título y una línea: A `store` «Espío una tienda» y B `search` «Sigo un producto». El elegido lleva `.on` y `aria-pressed="true"`. Por defecto, A.
  4. **Detalle de la entrada elegida** (`.sp-det`, con entrada animada):
     - Etiqueta `Entrada X de 2` y «Dónde» (`where`); título con ícono y párrafo «Qué es».
     - **Ruta** (`.sp-route`): pasos numerados con ícono, título y texto. Sin bifurcación.
     - **Qué veo** (`.sp-checks`): fichas con cifra (`.ps-rule`). A: una por cosa de la pantalla (productos top, anuncios, apps, tema, píxeles) con «para qué me sirve». B: anuncios ganadores (activos desde `LIMITS.adDays` días), tiendas que lo mueven y cómo fue construida cada una.
     - **Qué hago con lo que veo** (`.sp-use`): una lista corta de lecturas (qué vende la tienda top, qué ángulo usan los anuncios más viejos, qué app o tema copiar).
     - **Prompt** (`.sp-prompt`) con «Copiar prompt» (`.btn sm`, ícono `copy`, `ui.dom.copy` + aviso en `#toast`).
     - Acciones: `← Entrada anterior` / `Siguiente entrada →`.
- **Las dos entradas** (texto provisional redactado por esta spec):
  - **A · Espío una tienda** (`where`: «DropKiller → Tiendas»). Pego el dominio o cualquier enlace de la tienda y sale todo en una pantalla: productos top, anuncios, apps, tema y píxeles. Ruta: 1 `search` Pego el dominio o un enlace de la tienda → 2 `trophy` Miro sus productos top (lo que más vende) → 3 `megaphone` Miro sus anuncios: los activos hace más de `LIMITS.adDays` días son los que le dan plata → 4 `store` Miro con qué está construida: tema, apps y píxeles.
  - **B · Sigo un producto** (`where`: «DropKiller → Anuncios y Tiendas, mi país»). Parto de un producto que ya elegí: veo sus anuncios ganadores en mi país y las tiendas que lo están moviendo, y de cada tienda cómo fue construida. Ruta: 1 `search` Busco el producto por nombre → 2 `megaphone` Veo sus anuncios ganadores en mi país (activos hace más de `LIMITS.adDays` días) → 3 `store` Veo las tiendas que lo están moviendo (no cuento más de `LIMITS.advertisers` anunciantes activos para verlo sin saturar) → 4 `eye` Espío cada tienda como en la entrada A.
- **Prompts fijos** (uno por entrada, texto en `core`): llevan **un marcador entre corchetes** donde el usuario pega su dato (`[DOMINIO O ENLACE DE LA TIENDA]` en A y `[NOMBRE DEL PRODUCTO]` en B); no hay campos. Piden al MCP de DropKiller hacer el análisis en Colombia y devolver: A, productos top, anuncios (activos y más viejos), apps, tema y píxeles; B, los anuncios ganadores del producto en Colombia (activos hace más de `LIMITS.adDays` días) y las tiendas que lo mueven, con tema y apps de cada una. Con enlaces de DropKiller. Los números salen de `LIMITS`; no nombran parámetros del MCP.
- **Estado y guardado:** `app.state.search.espiaMode` (`'a' | 'b'`, por defecto `'a'`) en `pyl-search`, igual que `cazaMethod`. Valor desconocido cae en `'a'`. `strat` acepta `'espia'`.
- **Íconos:** todos existen (`eye`, `store`, `search`, `trophy`, `megaphone`, `gem`, `target`, `copy`); sin ícono nuevo.
- **Estilos** `.sp-*` en `css/modules/search.css` (solo tokens): luz viajera en la pantalla, hover con elevación y halo en `.sp-node`, entrada escalonada de los pasos; todo quieto con `prefers-reduced-motion`; responsive a 720 px.

**Fuera de la spec:**

- Leer El Espía del Laboratorio por MCP o reemplazar el texto provisional (se cambia en `ESPIA` sin tocar la UI). Llamar a DropKiller desde la app o abrir las tiendas: se copia el prompt y se pega en Claude. Campos editables para el dominio o el producto (otra spec).
- Leer La caza del Laboratorio por MCP o reemplazar el texto provisional por el oficial (cuando el usuario lo tenga, se cambia en `CAZA` sin tocar la UI).
- Ejecutar la caza desde la app (llamar a DropKiller): la app no se conecta a DropKiller; el prompt se pega en Claude.
- Prompts con campos editables (país, categoría, precio máximo): sería un panel como Prompt DropKiller, otra spec.
- Otros países propios distintos de Colombia, otras plataformas distintas de Dropi.
- Tocar los números de `LIMITS` o las estrategias VDO y por proveedor.

## Modelo de datos

En `js/modules/search/core/search.js` (exportado en `PYL.core.search` y aplanado en `js/index.js`; nombre único `CAZA`):

```js
const STRATEGIES = [
  { k: 'vdo', … }, { k: 'prov', … },
  { k: 'caza', t: 'La Caza', icon: 'crosshair', d: 'Parto de lo que ya se vende y lo paso por dos puertas: Dropi de mi país y bajo el techo.' },
];

const CAZA = {
  lead: [ /* segmentos */ ],
  gates: [
    { k: 'dropi', n: 1, icon: 'package', t: 'Está en Dropi de mi país', d: [ /* segmentos con LIMITS.stock */ ] },
    { k: 'techo', n: 2, icon: 'wall',    t: 'Bajo el techo',            d: [ /* LIMITS.total, v7, prov */ ] },
  ],
  ally: BY_PROVIDER.allies[0].t,          // 'Goldbox'
  methods: [
    {
      k: 'a', letter: 'A', icon: 'globe', t: 'Se vende afuera pero no aquí', short: '…',
      where: 'DropKiller → Productos, otro país',
      p: [ /* segmentos */ ],
      route: [
        { icon: 'pin', t: '…', d: [ … ] },
        …,
        { fork: true, t: '¿Está en Dropi Colombia?',
          yes: { t: 'Sí → Puerta 2 (el techo)', d: [ … ] },
          no:  { t: 'No → Desarrollo con laboratorio aliado', d: [ … ] } },
      ],
      checks: [ { big: '≥ 10', unit: 'en 7 días', t: 'Afuera', d: [ … ] }, … ],   // cifras desde LIMITS
      prompt: '…',                          // texto plano, armado con LIMITS al cargar
    },
    { k: 'b', letter: 'B', icon: 'signal-low', … },
    { k: 'c', letter: 'C', icon: 'rocket', … },
  ],
};

const cazaMethod = (k) => CAZA.methods.find((m) => m.k === k) || CAZA.methods[0];
```

- Segmentos con el formato de siempre (`string`, `{ b }`, `{ a, href }`).
- `fork` solo en el último paso de A y C; B no tiene bifurcación.
- `cazaMethod` también se exporta (nombre único al aplanar).

Estado (`js/modules/search/app/search.js`): `S.cazaMethod` (`'a' | 'b' | 'c'`), persistido junto a `strat` y `provStep` en `pyl-search`. Sin versión nueva: un `pyl-search` viejo sin `cazaMethod` cae en `'a'`.

UI (`js/modules/search/ui/search.js`): `caza(node, data, k, on)` con `on = { select(k), copy(text) }`. No muta estado.

**El Espía** (mismo archivo `core/search.js`; nombres únicos `ESPIA` y `espiaMode`):

```js
// STRATEGIES suma: { k: 'espia', t: 'El Espía', icon: 'eye', d: '…' }
const ESPIA = {
  lead: [ /* segmentos */ ],
  screen: [                       // las cinco cosas de la pantalla de una tienda
    { k: 'top', icon: 'trophy', t: 'Productos top', d: '…' },
    { k: 'ads', icon: 'megaphone', t: 'Anuncios', d: '…' },
    { k: 'apps', icon: 'gem', t: 'Apps', d: '…' },
    { k: 'theme', icon: 'store', t: 'Tema', d: '…' },
    { k: 'pixels', icon: 'target', t: 'Píxeles', d: '…' },
  ],
  modes: [
    { k: 'a', letter: 'A', icon: 'store', t: 'Espío una tienda', short: '…', where: '…', p: [ … ],
      route: [ { icon, t, d } ],  checks: [ { big, unit, t, d } ],  use: [ [ /* segmentos */ ] ],
      prompt: '…' },            // con [DOMINIO O ENLACE DE LA TIENDA]
    { k: 'b', letter: 'B', icon: 'search', … prompt: '…' },   // con [NOMBRE DEL PRODUCTO]
  ],
};
const espiaMode = (k) => ESPIA.modes.find((m) => m.k === k) || ESPIA.modes[0];
```

Estado: `S.espiaMode` (`'a' | 'b'`) en `pyl-search`; sin versión nueva. UI: `ui.search.espia(node, data, k, on)` con `on = { select(k), copy(text) }`; no muta estado.

## Plan de implementación

1. **Ícono y datos.** Agregar `crosshair` a `icons.js`. En `core/search.js`: tercera entrada de `STRATEGIES`, `CAZA` con puertas, métodos, rutas, fichas y prompts (números desde `LIMITS`), y `cazaMethod`; exportarlos. Pruebas de `core.test.js` (ver criterios). La app sigue igual: la tarjeta aparece pero el panel aún no existe (el `app` cae en VDO hasta el paso 2).
2. **Panel y pintado.** `index.html`: `#b-st-caza` con `#b-caza` y subtítulo «Tres caminos…». `ui.search.caza` pinta frase, puertas, selector, detalle, bifurcación, fichas, prompt y acciones. `app/search.js`: `renderStrategy` muestra/oculta los tres paneles, guarda `cazaMethod`, conecta `copy` (`ui.dom.copy` + `ui.feedback.toast`) y `cand` (el mismo de por proveedor). Actualizar la prueba de `smoke.test.js` que exige 2 tarjetas.
3. **Estilos y efectos.** `.cz-*` en `search.css`: diagrama de puertas con luz viajera, nodos A/B/C, ruta con entrada escalonada, bifurcación verde/amarilla, prompt, responsive (720 px) y `prefers-reduced-motion`.
4. **Pruebas de humo** nuevas en `smoke.test.js`, `claves-pyl.json` si hace falta, `node tests/core.test.js` y `smoke.test.js` (incluido el barrido de emojis).
5. **El Espía · datos.** `core/search.js`: cuarta entrada de `STRATEGIES`, `ESPIA` (pantalla, entradas A y B con ruta, fichas, lecturas y prompts con `LIMITS`) y `espiaMode`; exportarlos; claves de `core.test.js` (`ESPIA`, `espiaMode`) y pruebas de núcleo. Mientras no esté el panel, el `app` cae en VDO.
6. **El Espía · panel y pintado.** `index.html`: `#b-st-espia` con `#b-espia` y subtítulo «Cuatro caminos…». `ui.search.espia`. `app/search.js`: `renderStrategy` maneja los cuatro paneles, guarda `espiaMode` y conecta `copy`. Quitar la regla de 3 columnas de `#b-strats` en `search.css`. Actualizar las pruebas de `smoke.test.js` que exigen 3 tarjetas.
7. **El Espía · estilos.** `.sp-*` en `search.css`: pantalla de fichas con luz viajera, nodos A/B, ruta escalonada, prompt, responsive (720 px) y `prefers-reduced-motion`.
8. **El Espía · pruebas de humo** (`spyTest` en `smoke.test.js`), `claves-pyl.json` si hace falta, ambas suites con el barrido de emojis.
9. **Docs.** `CLAUDE.md` (bloque Buscar producto: tercera y cuarta estrategia, `CAZA`/`ESPIA`, `cazaMethod`/`espiaMode`, ids `#b-st-caza`/`#b-caza`/`#b-st-espia`/`#b-espia`, clases `.cz-`/`.sp-`, textos provisionales) y `README.md`.

## Criterios de aceptación

- [x] `STRATEGIES` tiene 3 entradas en orden `vdo`, `prov`, `caza` (hoy 4, con `espia`); la de `caza` usa el ícono `crosshair`, que está en `icons.NAMES`.
- [x] `CAZA.gates` tiene 2 puertas y `CAZA.methods` 3 métodos con claves `a`, `b`, `c` y letras `A`, `B`, `C`; todo `icon` de `CAZA` está en `icons.NAMES` (lo cubre la prueba «Íconos» de `core.test.js`, que suma `CAZA`).
- [x] Los números que aparecen en puertas, fichas y prompts salen de `LIMITS`: la prueba verifica que cada prompt contenga `LIMITS.total.ideal`, `LIMITS.v7.max` y `LIMITS.prov.max` formateados con `toLocaleString('es-CO')` (B y C) y `LIMITS.v7.min` (A).
- [x] Los métodos A y C terminan en un paso `fork` con salidas `yes` y `no`; el texto de `no` nombra al aliado de `BY_PROVIDER.allies`; B no tiene `fork`.
- [x] Cada método tiene `prompt` no vacío que menciona Colombia y Dropi y pide 5 resultados.
- [x] `cazaMethod('x')` devuelve el método A; `cazaMethod('c')` devuelve C.
- [x] En jsdom: `#b-strats` muestra 3 tarjetas (hoy 4); clic en «La Caza» deja visible solo `#b-st-caza` (`#b-st-vdo` y `#b-st-prov` ocultos) y la tarjeta queda `aria-pressed="true"`.
- [x] Con La Caza abierta se ven 2 `.cz-gate`, 3 `.cz-node` y el detalle del método A; clic en B o C cambia el detalle (título y `aria-pressed`) y `app.state.search.cazaMethod`.
- [x] Los detalles de A y C tienen `.cz-fork`; el de B no.
- [x] «Copiar prompt» llama a `ui.dom.copy` con el texto del prompt del método abierto y muestra el aviso en `#toast` (portapapeles simulado).
- [x] `pyl-search` con `cazaMethod: 'zz'` abre el método A; con `strat: 'caza'` abre La Caza.
- [x] El subtítulo de Estrategias dice «Cuatro caminos…» (con La Caza solo: «Tres caminos…»; vale el final).
- [x] **El Espía:** `STRATEGIES` tiene 4 entradas en orden `vdo`, `prov`, `caza`, `espia`; la de `espia` usa `eye`. `ESPIA.screen` tiene 5 fichas (`top`, `ads`, `apps`, `theme`, `pixels`) y `ESPIA.modes` 2 entradas `a` y `b` con letras `A` y `B`; todo `icon` de `ESPIA` está en `icons.NAMES`.
- [x] Los prompts de A y B no están vacíos, mencionan Colombia y DropKiller; el de A contiene `[DOMINIO O ENLACE DE LA TIENDA]` y el de B `[NOMBRE DEL PRODUCTO]`; ambos contienen `LIMITS.adDays`. `espiaMode('x')` devuelve A y `espiaMode('b')` devuelve B.
- [x] En jsdom: `#b-strats` muestra 4 tarjetas; clic en «El Espía» deja visible solo `#b-st-espia` y la tarjeta queda `aria-pressed="true"`. Con El Espía abierto se ven 5 `.sp-tile`, 2 `.sp-node` y el detalle de A; clic en B cambia el detalle (título y `aria-pressed`) y `app.state.search.espiaMode`. «Copiar prompt» copia el prompt de la entrada abierta y avisa en `#toast`.
- [x] `pyl-search` con `espiaMode: 'zz'` abre A; con `strat: 'espia'` abre El Espía. Las pruebas de La Caza siguen verdes.
- [x] En el navegador (revisa el usuario): rejilla de 2×2 alineada; la luz recorre las fichas de la pantalla; hover con halo en A/B; la ruta entra escalonada; quieto con `prefers-reduced-motion`; 7 temas y bajo 720 px sin scroll horizontal.
- [x] `node tests/core.test.js` y `smoke.test.js` pasan, el barrido sin emojis visibles sigue verde y la consola queda limpia.
- [x] En el navegador (revisa el usuario): la tercera tarjeta se alinea con las otras dos; la luz recorre las puertas; los nodos A/B/C tienen hover con halo; la ruta entra escalonada al cambiar de método; todo quieto con `prefers-reduced-motion`; se ve bien en los 7 temas y bajo 720 px sin scroll horizontal.

## Decisiones

- **Texto de los métodos redactado aquí, provisional:** el MCP del Laboratorio no expone La caza; se eligió redactarlo con la descripción del usuario y las herramientas reales de DropKiller en lugar de pegar el texto del Laboratorio o leerlo en Chrome. Vive solo en `CAZA` para cambiarlo sin tocar la UI. *(Elegido por el usuario.)* La interfaz no lo presenta como regla de Juan: no lleva la etiqueta «Criterio NovaSociety».
- **El techo = `LIMITS` actuales** (totales ≤ 2.000 ideal / 3.000 límite, 7 días ≤ 100, proveedores ≤ 10, sumando todos los ID). Sin números nuevos. *(Elegido por el usuario.)*
- **Presentación igual que VDO y por proveedor:** tercera tarjeta en el selector y su panel abajo; dentro, selector A/B/C con el detalle debajo (patrón de fases de la estrategia por proveedor). *(Elegido por el usuario.)* Se descartaron acordeón simple y tarjetas que se voltean.
- **Prompt fijo por método con «Copiar prompt»**, sin campos. *(Elegido por el usuario.)* Campos editables quedan para otra spec.
- **«No está en Dropi» en A y C lleva al laboratorio aliado (Goldbox)**, el mismo aliado de la estrategia por proveedor; no se crea otra lista.
- **Método A exige que esté en Dropi Colombia** para ser candidato (Puerta 1); si no está, va al aliado, igual que C. Así los tres métodos respetan las dos puertas.
- **Ícono nuevo `crosshair`** para La Caza (`target` ya es de VDO).
- **`cazaMethod` en `pyl-search` sin subir versión:** mismo trato que `provStep`.
- **Sin botón «Anotarlo en Mi candidato» en La Caza** (se quitó a pedido del usuario tras el paso 4); El Espía tampoco lo lleva.
- **El Espía en la misma spec** (a pedido del usuario), con la misma presentación de La Caza: tarjeta, panel, selector de entradas y prompt fijo con «Copiar prompt». *(Elegido por el usuario.)*
- **Texto de El Espía provisional**, redactado con la descripción del usuario y las herramientas de DropKiller, porque el MCP del Laboratorio no lo expone. Vive solo en `ESPIA`. Sin etiqueta «Criterio NovaSociety».
- **Prompts con marcador entre corchetes** en vez de campos (`[DOMINIO O ENLACE DE LA TIENDA]`, `[NOMBRE DEL PRODUCTO]`): El Espía necesita un dato del usuario y los campos editables siguen fuera de la spec.
- **Prefijo `.sp-`** y no `.es-`, porque `#es-` es de Escalado.
- **Ícono `eye` existente** para El Espía: no se agrega ícono nuevo.
- **Rejilla 2×2** al haber cuatro tarjetas: se quita la regla de 3 columnas de La Caza.

## Riesgos

- **El texto provisional puede no coincidir con el Laboratorio** (sobre todo los umbrales de A y el alcance de C). Mitigación: todo en `CAZA`, una sola fuente; el usuario lo corrige cuando tenga el original.
- **TikTok Shop de DropKiller:** `search_tiktok_products` no filtra por país; el prompt de C pide «TikTok Shop de Estados Unidos» y depende de que DropKiller rastree ese mercado. Si no, el resultado mezcla mercados.
- **La prueba existente de `smoke.test.js` que exige 2 tarjetas** (rastros de la SPEC 08) falla hasta actualizarla en el paso 2.
- **El Espía depende de lo que DropKiller rastree:** `store_tech_report` inspecciona en vivo las tiendas que no rastrea y entonces solo devuelve tema y apps (sin píxeles ni redes). Los anuncios y productos top solo salen de tiendas rastreadas. El prompt lo dice: si falta algo, que lo avise y no lo invente.
- **Ventas sumando todos los ID:** DropKiller no agrupa automáticamente los ID de un mismo producto; el prompt pide buscar por nombre y foto y sumar, y puede dejar ID por fuera.
