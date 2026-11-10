# SPEC 09 — Generador de prompt DropKiller

> **Estado:** Implementado
> **Depende de:** SPEC 00, SPEC 01 (guardado rápido), SPEC 02 (estructura por módulos)
> **Reemplaza a:** SPEC 08 (búsqueda automática)
> **Fecha:** 2026-11-10 (ajustada tras probar el panel, ver Decisiones)
> **Objetivo:** Quitar la "Búsqueda automática" de la SPEC 08 y poner en su lugar un generador de prompt sencillo para el MCP de DropKiller, en un botón flotante "Prompt DropKiller" junto al de Guardado rápido.

## Por qué existe esta spec

La SPEC 08 metía en Buscar producto una tercera estrategia con presets, historial, pegado de JSON y Scorecard. Para el uso real sobra: lo que el usuario necesita es **armar el prompt rápido, copiarlo y pegarlo en Claude**. Los resultados se quedan en Claude.

Esta spec deja Estrategias de búsqueda como estaba (VDO y Por proveedor) y agrega un generador de prompt en un botón flotante, como el del Guardado rápido.

## Alcance

**Dentro:**

**Parte 1 · Quitar la SPEC 08**

La SPEC 08 se implementó en la rama `spec-08-busqueda-automatica` pero **nunca tuvo commit ni llegó a `main`** (decisión del usuario: descartarla). Por eso:

- Antes de crear la rama de esta spec, se descarta el código sin commit de la SPEC 08: tarjeta `auto` de `STRATEGIES`, `#b-st-auto`, `js/modules/search/{core,ui,app}/hunt.js`, estilos `.hu-*`, `busqueda:rapido` y su oyente en `quick`, `services.storage.hunt` (`pyl-auto`), `services.files.readText`, sus pruebas y `tests/fixtures/hunt-respuesta.md`. Se conservan solo `specs/08-busqueda-automatica.md` y este archivo. Lo hace el usuario o el agente con su visto bueno explícito.
- La rama `spec-09-generador-prompt-dropkiller` sale de `main`, donde Estrategias de búsqueda ya tiene solo VDO y Por proveedor y `claves-pyl.json` ya está sin `hunt`.
- `specs/08-busqueda-automatica.md` entra a `main` en estado **Obsoleto**, con una línea que apunta a esta spec. El cambio de estado lo hace el usuario.
- Limpieza única al cargar: si existe `localStorage['pyl-auto']` (quedó de probar la SPEC 08 en el navegador), se borra. Va en `services.storage`.
- `state.search.strat = 'auto'` guardado (también de esa prueba) cae en VDO sin error: `renderStrategy` ya cae en `'vdo'` cuando la clave no está en `STRATEGIES`. Una prueba de humo lo fuerza.

**Parte 2 · Botón flotante "Prompt DropKiller"**

- Módulo nuevo `js/modules/dkprompt/{core,ui,app}/dkprompt.js` (`PYL.core.dkprompt`, `PYL.ui.dkprompt`, `app.state.dkprompt`) y `css/modules/dkprompt.css`. No depende de `search` ni de `quick`: solo usa `shared/` (`ui.dom.copy`, `ui.feedback.toast`).
- Botón redondo `#dk-btn` con el mismo estilo que `.qk-btn` y título "Prompt DropKiller". **Color:** azul fijo `#022fd9` (pedido del usuario), igual en los 7 temas, con el ícono en blanco. **Ícono:** el logo de DropKiller que dio el usuario (hexágono de esquinas redondeadas con dos chevrones hacia arriba adentro), redibujado como SVG en línea (`ICON_DK` en `ui/dkprompt.js`, ~24 px), sin el cuadrado de fondo y con trazo `currentColor`. No se usa archivo de imagen. Solo en Buscar producto, como el Guardado rápido: `#dk-root` va dentro de `#v-buscar`, después de `#qk-root`.
- Posición: "Prompt DropKiller" en la esquina (`right: 20px; bottom: 20px`) y el Guardado rápido sube un puesto (`.qk-btn` a `bottom: 86px`, `.qk-panel` a `bottom: 152px`). El panel de DropKiller abre en `bottom: 86px`. `#v-buscar` pasa de `padding-bottom: 84px` a `150px` para que los dos botones no tapen el final de la pestaña.
- Panel `#dk-panel` (mismo estilo que `.qk-panel`) con:
  - el formulario (tabla de campos abajo),
  - el prompt en un textarea de solo lectura `#dk-prompt`, **vacío** (con un texto de ayuda) hasta tocar "✨ Generar prompt" `#dk-gen`; no se actualiza solo al cambiar un campo, hay que volver a generar,
  - el botón "📋 Copiar prompt" `#dk-copy`, que avisa con `#toast` (si aún no se generó, avisa "Primero toca «Generar prompt»").
- Se cierra con ✕ `#dk-x`, con Esc (si no hay un diálogo encima) y al volver a tocar el botón. **Al cerrar, el cuadro del prompt queda limpio**; los filtros escritos se conservan mientras no se recargue la página. Abrir un panel flotante cierra el otro (evento `flotante:abierto`, ver Decisiones).
- No guarda nada entre sesiones: al recargar, el formulario vuelve a estar vacío.
- **Distribución:** cuadrícula de 2 columnas, cada celda con la etiqueta arriba y el control (32 px) debajo; filas: Ventas totales | Proveedores · Ventas recientes | Fecha de creación · Stock | Veces restockeado · Categoría (ancho completo). 7/30 días y 3/6 meses son interruptores de dos opciones (radios ocultos con la elegida en azul). Bajo 480 px de ancho todo se apila en una columna.
- Ids con prefijo `#dk-`, clases `.dk-`.

**Fuera (otras specs):**

- Guardar los valores o tener presets.
- Pegar la respuesta de Claude en la app, historial o Scorecard (era la SPEC 08).
- Llamar a DropKiller desde la app o programar la búsqueda con `/schedule`.
- Cambiar el país (`CO`), la plataforma (`DROPI`) o la cantidad de resultados (5): van fijos en la plantilla.
- Llevar los estilos de los botones flotantes a `base.css` (deuda anotada en Decisiones).

## Campos del formulario

El placeholder de cada campo es también su valor por defecto: si el campo queda vacío, el prompt usa ese valor.

| Campo | Ids | Tipo | Placeholder / defecto |
|---|---|---|---|
| Ventas totales | `#dk-f-tot-min`, `#dk-f-tot-max` | mín. / máx. | 100 / 2.000 (aviso en la etiqueta: «Tolero hasta 3.000», con el texto completo al pasar el mouse; es solo informativo, no cambia el filtro) |
| Ventas recientes: ventana | `#dk-f-rec-7`, `#dk-f-rec-30` (`name="dk-rec"`) | radio | 7 días |
| Ventas recientes | `#dk-f-rec-min`, `#dk-f-rec-max` | mín. / máx. | 7 días → 10 / 100 · 30 días → 100 / 500 (cambian con el radio) |
| Fecha de creación | `#dk-f-age-3`, `#dk-f-age-6` (`name="dk-age"`) | radio | últimos 3 meses |
| Stock | `#dk-f-stock-min`, `#dk-f-stock-max` | mín. / máx. | 80 / 100 |
| Proveedores | `#dk-f-prov-max` | máx. | 3 |
| Categoría | `#dk-f-cat` | texto | Todos (Salud, Belleza y bienestar primero) |
| Veces restockeado | `#dk-f-rest-min`, `#dk-f-rest-max` | mín. / máx. | 0 / 5 |

- **Validación:** números enteros ≥ 0 (se acepta `2.000` como miles es-CO; `1.5` es error) y mín. ≤ máx. en cada par. Los campos se marcan al escribir (`.dk-bad` + `aria-invalid="true"` + mensaje corto bajo el par, `#dk-err-<grupo>`). Si algo falla al tocar "Generar prompt", avisa en `#toast` y el prompt se queda como estaba.
- Cambiar la ventana de 7 a 30 días cambia los placeholders de Ventas recientes. Lo que ya está escrito no se toca.
- Los números del prompt se escriben con separador de miles es-CO ("2.000"). Se usa un formateador propio porque `toLocaleString('es-CO')` deja "2000" en números de 4 cifras.

## Plantilla del prompt

Se reemplazan las `{{variables}}`; el resto va literal.

```text
Ejecuta una búsqueda en el catálogo de Dropi Colombia utilizando el MCP de DropKiller. Necesito encontrar diamantes en bruto bajo el método VDO.
Aplica estrictamente esta lógica de filtrado en tu búsqueda:

1. Ventas Totales: Rango mínimo de {{totMin}} y máximo de {{totMax}} ventas. (Importante: Suma las ventas totales de los proveedores que lo tengan para asegurar que el global no pase de {{totMax}}).
2. Tracción reciente: Debe tener movimiento actual (entre {{recMin}} y {{recMax}} ventas en los últimos {{recDias}} días).
3. Fecha de creación: Creados de {{meses}} meses para acá.
4. Stock: Buen inventario (mínimo {{stockMin}} y máximo {{stockMax}} unidades).
5. Proveedores: Máximo {{provMax}} proveedores en todo Dropi Colombia (ideal para mi estrategia de exclusividad).
6. Veces restockeado: entre {{restMin}} y {{restMax}} veces.
7. Categoría: {{categoria}}.
8. Perfil Psicológico del Producto (Innegociable): el producto debe resolver un "Dolor Absoluto/Urgente" o tener un "Efecto WOW extremo" (alta percepción de valor). Excluye categóricamente commodities, accesorios genéricos de celular, ropa básica o productos que el cliente pueda comprar fácilmente en un supermercado local.

Notas para el MCP: usa search_products (CO, DROPI, ACTIVE). No hay filtro directo para el máximo de ventas totales, la cantidad de proveedores ni las veces restockeado: agrupa el mismo producto entre proveedores (familia), suma las ventas totales, cuenta proveedores y detecta restocks en get_product_history (subidas de stock entre días). Descarta productos con suspectedSalesAdjustment: true.

FORMATO DE SALIDA:
Tráeme los 5 mejores resultados que cumplan ESTRICTAMENTE esto.
(Regla del Sistema: Si la base de datos solo tiene 2 o 3 productos que cumplan el 100% de estos filtros, entrégame solo esos. NO relajes los filtros ni inventes datos solo para llegar a 5).
Devuélveme el Scorecard Ejecutivo en formato de tabla con: Producto, Precio, Stock, Ventas (Totales/{{recDias}} días), Cantidad de Proveedores, Proveedor, Nicho, Competencia en Dropi y link del producto en Dropi.
```

- `{{categoria}}`: si el campo está vacío o dice exactamente el placeholder, el punto 7 dice `TODAS (puede ser cualquier nicho; prioriza Salud, Belleza y bienestar), PERO cumple el perfil del punto 8`. Si no, el texto escrito, sin espacios a los lados.
- Las notas para el MCP no repiten nombres de parámetros ni de campos (el esquema de las herramientas ya se los da a Claude): solo lo que no es filtro directo y cómo calcularlo. No se usa `familyId` porque ese nombre de campo no se pudo verificar.

## Modelo de datos

### `js/modules/dkprompt/core/dkprompt.js` → `PYL.core.dkprompt`

Sin DOM. Todos los nombres llevan el prefijo `dk`/`DK_` para no chocar al aplanar `js/index.js`.

```js
const DK_DEFAULTS = {
  totMin: 100, totMax: 2000,
  recDias: 7,
  rec: { 7: { min: 10, max: 100 }, 30: { min: 100, max: 500 } },
  meses: 3,                 // 3 | 6
  stockMin: 80, stockMax: 100,
  provMax: 3,
  restMin: 0, restMax: 5,
  categoria: 'Todos (Salud, Belleza y bienestar primero)',
};
const DK_OPEN_CAT = 'TODAS (puede ser cualquier nicho; prioriza Salud, Belleza y bienestar), PERO cumple el perfil del punto 8';
const DK_TOT_TOLERANCE = 3000;   // solo para el aviso del formulario
```

Funciones:

- `dkN(n)` → número con miles es-CO (`2000` → `"2.000"`).
- `dkPlaceholders(recDias)` → `{ totMin, totMax, recMin, recMax, stockMin, stockMax, provMax, restMin, restMax, categoria }` como texto, para los placeholders.
- `dkValues(form)` → `{ ok, values, errors }`. `form` trae los textos del formulario (`''` = vacío → defecto) más `recDias` y `meses`. `errors` = `{ campo: mensaje }` ("Escribe un número entero", "No puede ser negativo", "El mínimo es mayor que el máximo"; el error de par se marca en los dos campos). Acepta `2.000` como 2000.
- `dkPrompt(values)` → string de la plantilla.

### Estado

```js
app.state.dkprompt = {
  open: false,            // panel abierto
  form: { … },            // textos del formulario + recDias + meses
  last: '',               // prompt generado: vacío hasta «Generar prompt» y al cerrar el panel
};
```

No se guarda en `localStorage`.

### Eventos

- `flotante:abierto` en `document` (`detail = { id: 'dk' | 'qk' }`): cada botón flotante lo dispara al abrir su panel y cierra el suyo si el `id` es otro. Así los dos módulos no dependen uno del otro. `quick` agrega el disparo y la escucha del evento y, en `quick.css`, el cambio de `bottom` (y el `max-height` del panel a `100vh - 186px` para que no pase del borde).

### HTML y orden de carga

- `<div class="dk" id="dk-root"></div>` dentro de `#v-buscar`, justo después de `#qk-root`. El contenido lo arma `ui.dkprompt.build`, igual que `#qk-root`.
- Scripts: `dkprompt/core` después de `quick/core`, `dkprompt/ui` después de `quick/ui` y `dkprompt/app` después de `quick/app`. `core/dkprompt.js` también va en `js/index.js`.
- CSS: `<link>` de `css/modules/dkprompt.css` después de `quick.css` y antes de `themes.css`.

## Plan de implementación

Pruebas primero en cada paso: se escriben, fallan y luego se hace el código.

0. **Descartar la SPEC 08** (fuera de la rama nueva): descartar sus cambios sin commit en `spec-08-busqueda-automatica`, conservando `specs/08-…` y `specs/09-…`; volver a `main` y crear `spec-09-generador-prompt-dropkiller`. Comprobar que las pruebas de `main` pasan tal cual.
1. **Rastros de la SPEC 08.** Prueba de humo, primero: Estrategias muestra solo VDO y Por proveedor; con `strat = 'auto'` en el estado abre VDO sin error; no existe ningún `#hu-` ni `#b-st-auto`. Luego la limpieza única de `pyl-auto` en `services.storage` y `specs/08-…` en Obsoleto (lo cambia el usuario).
2. **Núcleo del generador.** Pruebas en Node, primero:
   - formulario vacío → el prompt tiene todos los valores por defecto ("100", "2.000", "entre 10 y 100 ventas en los últimos 7 días", "3 meses", "mínimo 80 y máximo 100", "Máximo 3", "entre 0 y 5", categoría "TODAS (…)" con "PERO cumple el perfil del punto 8");
   - 30 días → "entre 100 y 500 ventas en los últimos 30 días" y "Ventas (Totales/30 días)";
   - 6 meses → "Creados de 6 meses para acá";
   - mín. > máx., negativos y decimales dan error en el campo correcto; `2.000` se acepta;
   - categoría escrita → sale tal cual, sin el "PERO…";
   - `dkN(2000) === '2.000'`.
   Luego `core/dkprompt.js` y su línea en `js/index.js`.
3. **Botón y panel.** Prueba de humo, primero: `#dk-btn` existe dentro de `#v-buscar`, justo después de `#qk-root`; abre `#dk-panel`; `#dk-prompt` empieza vacío y "Copiar" sin generar avisa; "Generar prompt" lo llena y cambiar un campo no lo cambia hasta volver a generar; cambiar a 30 días cambia los placeholders; un error marca el campo y no cambia el prompt; "Copiar prompt" avisa en `#toast`; abrir uno cierra el otro; Esc, ✕ y el botón cierran y dejan el prompt vacío. Luego `ui/dkprompt.js`, `app/dkprompt.js`, `css/modules/dkprompt.css`, `index.html` y las 2 líneas de `quick/app/quick.js`.
4. **Documentación.** Después del merge, actualizar `CLAUDE.md` y `README.md` (quitar lo de la SPEC 08, agregar el módulo `dkprompt` y sus dependencias).

## Criterios de aceptación

**Quitar la SPEC 08**
- [x] Estrategias de búsqueda muestra solo VDO y Por proveedor, igual que antes de la SPEC 08.
- [x] Con `state.search.strat = 'auto'` guardado, abre VDO sin error en consola.
- [x] No queda `hunt`, `#hu-`, `#b-st-auto`, `busqueda:rapido` ni `pyl-auto` en el código (grep), salvo la limpieza única de `pyl-auto`.
- [x] `claves-pyl.json` coincide con `--claves`.
- [x] `specs/08-busqueda-automatica.md` está en Obsoleto y apunta a esta spec.

**Generador**
- [x] El botón "Prompt DropKiller" sale solo en Buscar producto, en la esquina inferior derecha, con el mismo estilo del Guardado rápido, que queda justo encima.
- [x] El ícono es el logo de DropKiller (hexágono con dos chevrones), blanco sobre el botón azul `#022fd9`, y se ve bien en los 7 temas.
- [x] Al abrir, el cuadro del prompt está vacío; con el formulario vacío, "Generar prompt" lo llena con todos los valores por defecto.
- [x] Cambiar un campo no cambia el prompt hasta volver a tocar "Generar prompt".
- [x] Al cerrar el panel, el cuadro del prompt queda limpio.
- [x] Ventas totales muestra el aviso "Tolero hasta 3.000".
- [x] Los campos quedan en la cuadrícula de 2 columnas (Ventas totales | Proveedores, Stock | Veces restockeado) sin barra de desplazamiento en una ventana normal.
- [x] 30 días usa 100 / 500 y dice "30 días" en el punto 2 y en el Scorecard; 6 meses dice "6 meses".
- [x] Los placeholders de Ventas recientes cambian con el radio.
- [x] Un número inválido o mín. > máx. marca el campo; al generar avisa y el prompt no cambia.
- [x] Categoría vacía o igual al placeholder ("Todos (Salud, Belleza y bienestar primero)") → "TODAS (puede ser cualquier nicho; prioriza Salud, Belleza y bienestar), PERO cumple el perfil del punto 8".
- [x] Los números salen con miles es-CO ("2.000").
- [x] "📋 Copiar prompt" copia el texto y avisa con `#toast`; sin generar, avisa que primero hay que generar.
- [x] Al recargar, el formulario vuelve vacío (no se guarda).

**Calidad**
- [x] Guardado rápido y Mi candidato no cambian su comportamiento.
- [x] Ids `#dk-` únicos; `dkprompt` no usa nada de `search` ni de `quick`.
- [x] Pasan `node tests/core.test.js`, `tests/smoke.test.js` y `node --check` de cada archivo tocado; consola limpia.
- [x] Se ve bien en los 7 temas y en pantallas angostas (el panel no se sale de la pantalla y no tapa el otro botón).

## Decisiones

- **Sí:** módulo propio `dkprompt` (pedido del usuario). **No:** meterlo en `search` o `quick`.
- **Sí:** los dos paneles se coordinan con el evento `flotante:abierto`, así no se tapan. **No:** que `dkprompt` lea el estado de `quick`.
- **Sí:** copiar los estilos de `.qk-btn`/`.qk-panel` a `.dk-btn`/`.dk-panel` en `dkprompt.css`. Es deuda: llevarlos a `base.css` como `.fab`/`.fab-panel` en otra spec, como se anotó con `.hm-route`.
- **Sí:** país, plataforma y 5 resultados fijos en la plantilla (es el texto del usuario). **No:** campos para ellos.
- **Sí:** si un campo es inválido, el prompt se queda con el último texto válido. **No:** dejar el prompt vacío o con un mensaje de error.
- **Sí:** borrar `pyl-auto` una vez al cargar, para no dejar datos huérfanos de la SPEC 08.
- **Sí:** el logo de DropKiller redibujado como SVG con `currentColor` (imagen del usuario), en blanco sobre un botón azul `#022fd9` fijo (pedido del usuario al probarlo). **No:** pegar el PNG con su fondo azul, ni seguir el degradado de los temas: el botón de DropKiller se distingue del Guardado rápido.
- **Sí:** el prompt se arma solo al tocar "Generar prompt" y se limpia al cerrar el panel (pedido del usuario). **No:** actualizarlo en vivo. Los filtros sí se conservan al cerrar.
- **Sí:** el aviso "Tolero hasta 3.000" es solo informativo y el filtro por defecto sigue en 2.000. **No:** cambiar el máximo por defecto sin que el usuario lo pida.
- **Sí:** formulario en cuadrícula de 2 columnas con etiqueta arriba y control debajo, y las opciones de dos valores como interruptores (el primer intento, con la etiqueta a la izquierda y pares sueltos con radios en línea, quedó desordenado).
- **Sí:** notas para el MCP sin nombres de parámetros ni de campos (el MCP ya los conoce por su esquema); solo lo que no es filtro directo y cómo calcularlo. **No:** `familyId`/`totalSoldUnits`, no verificados.
- **Sí:** solo en Buscar producto, como el Guardado rápido (decisión del usuario). **No:** en todas las pestañas (la petición pedía las dos cosas y chocaban).
- **Sí:** "Prompt DropKiller" abajo en la esquina y el Guardado rápido sube un puesto (decisión del usuario). **No:** dejar quieto el Guardado y poner el nuevo encima.
- **Sí:** descartar la SPEC 08 sin commit y salir de `main` (decisión del usuario). **No:** commit y merge de la SPEC 08 para quitarla después: dejaría en el historial código que nunca se usó.
