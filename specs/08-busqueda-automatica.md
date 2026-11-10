# SPEC 08 — Búsqueda automática con DropKiller

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-11-10
> **Objetivo:** Agregar a Buscar producto una tercera estrategia, "🤖 Búsqueda automática", que arma con presets editables el prompt para el MCP de DropKiller (y su instrucción diaria para `/schedule`), recibe el JSON que devuelve Claude y lo muestra como un Scorecard re-chequeado, con historial y envío a Mi candidato o al Guardado rápido.

## Por qué existe esta spec

Hoy la búsqueda de "diamantes en bruto" se hace con una tarea programada de Claude Code escrita a mano. Los filtros viven en un texto suelto y los resultados quedan en el chat, lejos de la bitácora y del costeo.

La app corre en `file://`, sin servidor ni conexiones directas. El MCP de DropKiller solo existe dentro de Claude. Por eso el puente es **copiar y pegar** (decisión del usuario):

1. La app arma el prompt con los campos del preset.
2. El usuario lo pega en Claude (búsqueda manual) o crea la rutina diaria con `/schedule`.
3. Claude responde el Scorecard en tabla y, al final, un bloque ` ```json ` con un esquema fijo.
4. El usuario pega la respuesta en la app. La app la valida, re-chequea los filtros duros y pinta la tabla.

### Lo que puede hacer el MCP (revisado el 2026-11-10)

- `search_products` filtra por `countryCode`, `platformType`, `createdAfter`, `minSold7d`/`maxSold7d`, `minStock`, `minTotalSold`, `maxPrice`, `categories`, `status`.
- No filtra por **máximo de ventas totales** ni por **cantidad de proveedores**. El prompt le pide a Claude agrupar el mismo producto entre proveedores, sumar las ventas totales y descartar después. La app lo vuelve a revisar con los números del JSON.
- `find_winning_products` no acepta fecha de creación ni ventas totales: el prompt pide usar `search_products`.

## Alcance

**Dentro:**

- **Tercera estrategia** en `STRATEGIES` (`core/search.js`): `{ k: 'auto', t: 'Búsqueda automática', icon: '🤖', d: 'Le pido a DropKiller los productos que cumplen mi preset y los reviso aquí.' }`. Panel `#b-st-auto`, después de `#b-st-prov`. `state.search.strat` acepta `'auto'`.
- **Presets** guardables (prefijo `#hu-`):
  - Preset de fábrica "💎 Diamantes en bruto" con los números del prompt del usuario: ventas totales 100–2.000 (suma de proveedores), 10–100 en 7 días, creado en los últimos 3 meses, stock mínimo 80, máximo 2 proveedores, 5 resultados, país `CO`, plataforma `DROPI`.
  - Elegir preset, "Guardar como…" (nombre nuevo), "Guardar" (sobrescribe el elegido) y "Borrar". El preset de fábrica no se borra; "Restaurar" lo devuelve a sus números.
- **Campos editables** (`#hu-f-*`): ventas totales mín./máx., ventas 7 días mín./máx., meses de creación, stock mínimo, proveedores máx., cantidad de resultados, país, plataforma, precio máximo (opcional), categorías (opcional, separadas por coma), perfil psicológico (texto libre) y exclusiones (una por línea).
- **Prompt** (`#hu-prompt`, solo lectura, se actualiza en vivo) y botón "📋 Copiar prompt". Lleva las reglas del usuario, la "Regla del sistema" (no relajar filtros ni inventar datos) y el esquema JSON de salida.
- **Instrucción programada** (`#hu-sched`): campo hora `#hu-time` (por defecto `08:00`, zona `America/Bogota`, todos los días), botón "📋 Copiar instrucción para /schedule" y 3 pasos cortos: abrir Claude Code, pegar la instrucción, pegar aquí el JSON de cada día.
- **Interruptor de la programada** (`#hu-active`, dentro de `#hu-sched`): "Programada: Activa / Pausada". Va por preset (`preset.active`, por defecto `true`) y guarda la fecha del último cambio (`preset.activeAt`) en `pyl-auto`. El selector de presets muestra ⏸ en los pausados. Al pasarlo a Pausada, la app avisa: "Pausa también la rutina en Claude Code con /schedule; la app no puede apagarla sola". Con Pausada, "Copiar instrucción para /schedule" queda desactivado. El campo `active` queda en el modelo para que una spec futura (puente local) lo lea antes de ejecutar.
- **Pegar resultado** (`#hu-paste` + "Cargar resultados"): acepta la respuesta completa de Claude o solo el JSON. También acepta subir un archivo `.json` con el mismo esquema (`#hu-file`; lo usará el puente local en una spec futura). Si falla, dice por qué (sin bloque JSON, esquema distinto, producto sin nombre o sin ID Dropi) y no guarda nada.
- **Scorecard** (`#hu-table`): Producto (con miniatura si trae `image`), Precio, Stock, Ventas (Totales / 7 días), Proveedores, Proveedor, Nicho, Competencia en Dropi y una columna Estado:
  - ✓ cumple el preset, o ⚠ en rojo con las reglas que rompe (re-chequeo en `core`).
  - "Visto el AAAA-MM-DD" si el mismo ID Dropi salió en una búsqueda anterior.
  - El "por qué" de Claude (`why`) como texto pequeño bajo el nombre.
- **Acciones por producto:** "→ Mi candidato" y "→ Guardado rápido", más el botón de copiar ID (`ui.candidate.copyBtn`).
- **Historial** (`#hu-hist`): cada pegado es una búsqueda (fecha, preset, productos). Selector de búsquedas (fecha · preset · N productos), últimas 30, y "Borrar búsqueda" (pregunta antes).
- Núcleo `js/modules/search/core/hunt.js`, UI `js/modules/search/ui/hunt.js`, app `js/modules/search/app/hunt.js`, estilos en `css/modules/search.css`.
- Guardado en `services.storage.hunt`, clave propia **`pyl-auto`**.
- Pruebas en `tests/core.test.js` y `tests/smoke.test.js`; regenerar `tests/fixtures/claves-pyl.json`.

**Fuera (otras specs):**

- Llamar al MCP o a la API de DropKiller desde la app (sin servidor ni conexiones directas).
- Que la app cree o ejecute la rutina: solo arma el texto.
- Frecuencia cada N horas o varias horas al día.
- Acciones "Abrir en DropKiller" y "Descartar" (el usuario no las eligió).
- Pasar la foto de DropKiller a Mi candidato.
- Usar DropKiller dentro de la estrategia VDO o Por proveedor.
- Unificar los números del preset con `LIMITS` (son distintos a propósito, ver Decisiones).

## Modelo de datos

### `js/modules/search/core/hunt.js` → `PYL.core.hunt`

Sin DOM. Todos los nombres llevan el prefijo `hunt`/`HUNT_` para no chocar al aplanar `js/index.js`.

```js
const HUNT_FACTORY = {
  id: 'diamantes', name: '💎 Diamantes en bruto', factory: true,
  country: 'CO', platform: 'DROPI',
  total: { min: 100, max: 2000 },   // ventas totales, suma de todos los proveedores
  v7: { min: 10, max: 100 },        // ventas de los últimos 7 días
  months: 3,                        // creado en los últimos N meses
  stock: 80,                        // stock mínimo
  provMax: 2,                       // proveedores máx. en el país y plataforma
  top: 5,                           // cuántos resultados pedir
  maxPrice: null, categories: [],   // opcionales
  profile: 'Resuelve un dolor absoluto o urgente, o tiene un efecto WOW extremo (alta percepción de valor). Categoría abierta.',
  exclude: ['Commodities', 'Accesorios genéricos de celular', 'Ropa básica', 'Lo que se compra fácil en un supermercado local'],
  active: true, activeAt: null,     // programada activa / pausada y fecha del último cambio
};

const HUNT_SCHEMA = 'synkops-hunt-v1';
const HUNT_KEEP = 30;               // búsquedas que guarda el historial
```

Funciones:

- `huntPrompt(preset, today)` → string. Traduce el preset a los filtros de `search_products` (`createdAfter` = `today` menos `months` meses, `minSold7d`, `maxSold7d`, `minStock`, `minTotalSold`, `maxPrice`, `categories`, `status: 'ACTIVE'`). Pide agrupar entre proveedores y descartar por `total.max` y `provMax`. Termina con el formato de salida: tabla Scorecard y bloque JSON. Nombra los campos del MCP:
  - `dropi` = `externalId`.
  - Agrupar el mismo producto entre proveedores por `familyId`: buscar con `q` por el nombre y comparar `familyId`. Sumar `totalSoldUnits` de toda la familia y contar sus proveedores.
  - Excluir los productos con `suspectedSalesAdjustment: true`.
  - `cost` = `salePrice`, `suggested` = `suggestedPrice`, `image` = `imageUrl`, `created` = `createdAt`.
- `huntSetActive(preset, active, now)` → preset nuevo con `active` y `activeAt` (fecha `aaaa-mm-dd` de `now`). No toca el recibido.
- `huntPresetLabel(preset)` → nombre del preset para el selector, con ` ⏸` si está pausado (`active === false`).
- `huntSchedule(preset, time, today)` → string para `/schedule`: "Crea una rutina diaria a las 08:00 (America/Bogota) con este prompt: …". La fecha de creación se escribe como "creados en los últimos N meses contados desde el día de la ejecución", no como fecha fija.
- `huntParse(text)` → `{ ok: true, data }` o `{ ok: false, error }`. Toma el último bloque ` ```json ` (o el texto entero si es JSON) y valida el esquema.
- `huntCheck(product, preset, today)` → arreglo de reglas rotas `[{ k, msg }]` (vacío = cumple). Revisa `total`, `v7`, `stock`, `providers` y `created`. Un dato que falta en el JSON cuenta como regla rota ("sin dato").
- `huntSave(history, data, now)` → historial nuevo con la búsqueda al principio y como mucho `HUNT_KEEP`.
- `huntSeen(history, dropi, beforeId)` → fecha de la primera búsqueda anterior donde salió ese ID, o `null`.
- `huntPresetCheck(preset)` → errores del formulario (mín. > máx., números negativos, nombre vacío).

### JSON que devuelve Claude

```json
{
  "schema": "synkops-hunt-v1",
  "date": "2026-11-10",
  "preset": "💎 Diamantes en bruto",
  "products": [
    {
      "name": "…", "dropi": "123456",
      "cost": 25000, "suggested": 59900,
      "stock": 140, "total": 820, "v7": 35,
      "providers": 1, "provider": "…",
      "niche": "…", "competition": "Baja: 1 proveedor y 3 anunciantes",
      "created": "2026-09-02",
      "image": "https://…", "why": "…"
    }
  ]
}
```

- `name` y `dropi` son obligatorios. `cost` = precio proveedor en Dropi (la columna "Precio"). `suggested`, `image` y `why` son opcionales.
- `products: []` es válido: la búsqueda se guarda con "Ningún producto cumple el preset hoy".

### Estado y persistencia

```js
app.state.hunt = {
  presets: [HUNT_FACTORY /* , …guardados */],
  sel: 'diamantes',      // preset elegido
  draft: { … },          // campos del formulario (sin guardar en el preset)
  time: '08:00',
  history: [ { id, date, preset, products: [ … ] } ],  // más nueva primero
  view: null,            // id de la búsqueda que se ve (null = la más nueva)
};
```

`services.storage.hunt` (clave `pyl-auto`) guarda todo.

### Eventos

- "→ Mi candidato" dispara `rapido:candidato` con `{ name, dropi, price: cost }`. `app/search.js` ya lo escucha: pregunta si se pierde algo (`core.search.unsaved`) y no toca la bitácora.
- "→ Guardado rápido" dispara el evento nuevo `busqueda:rapido` con `{ name, dropi, price: cost }`. `modules/quick/app/quick.js` lo escucha, usa `quickAdd` y avisa con `#toast` si el ID ya estaba.

### HTML y orden de carga

- `#b-st-auto` dentro de Estrategias de búsqueda, con `#hu-presets`, `#hu-form`, `#hu-prompt`, `#hu-sched`, `#hu-time`, `#hu-active`, `#hu-paste`, `#hu-file`, `#hu-hist`, `#hu-table`.
- Scripts: `core/hunt.js` después de `core/search.js`; `ui/hunt.js` después de `ui/candidate.js`; `app/hunt.js` después de `app/search.js`. `core/hunt.js` también va en `js/index.js`.
- Dependencias: `hunt` solo usa `shared/` y `search` (`ui.candidate.copyBtn`, `ui.search.strategyTabs`). Habla con `quick` por evento, sin depender de su orden de carga.

## Plan de implementación

1. **Núcleo.** `core/hunt.js` con `HUNT_FACTORY`, `huntPrompt`, `huntSchedule`, `huntParse`, `huntCheck`, `huntSave`, `huntSeen` y `huntPresetCheck`. Pruebas en Node:
   - El prompt trae cada número del preset y el esquema.
   - `createdAfter` = 3 meses antes de `today`.
   - `huntParse` con respuesta completa, JSON solo, sin bloque, esquema distinto y producto sin ID.
   - `huntCheck` en cada borde: 100 y 2.000; 10 y 100; stock 80; 2 y 3 proveedores; un dato que falta.
   - `huntSave` corta en 30; `huntSeen` encuentra la fecha anterior.
   - El prompt nombra `externalId`, `familyId`, `totalSoldUnits`, `suspectedSalesAdjustment`, `salePrice`, `suggestedPrice`, `imageUrl` y `createdAt`.
   - `huntSetActive` pone `active` y `activeAt` sin tocar el original; `huntPresetLabel` agrega ⏸ solo si está pausado.
2. **Estrategia y presets.** Tarjeta `auto` en `STRATEGIES`, panel `#b-st-auto`, formulario, presets (guardar, guardar como, borrar, restaurar), prompt en vivo, copiar prompt e instrucción de `/schedule`, interruptor `#hu-active`. `app/hunt.js` con estado y `pyl-auto`. Prueba de humo: la tercera tarjeta abre el panel, cambiar un campo cambia el prompt y pausar muestra el aviso, pone ⏸ en el selector y desactiva el botón de `/schedule`.
3. **Pegar y Scorecard.** Pegar o subir `.json` (`#hu-file`), validar, guardar en historial, selector de búsquedas, tabla con Estado y "Visto el…", borrar búsqueda. Prueba de humo: pegar `tests/fixtures/hunt-respuesta.md` pinta las filas y marca la que rompe el preset; subir un `.json` carga igual.
4. **Acciones.** "→ Mi candidato" (`rapido:candidato`) y "→ Guardado rápido" (`busqueda:rapido` + oyente en `quick/app/quick.js`). Prueba de humo: el candidato recibe nombre, ID y precio proveedor; el Guardado rápido sube su numerito y rechaza el ID repetido.
5. **Documentación.** Después del merge, actualizar `CLAUDE.md` y `README.md`.

## Criterios de aceptación

**Estructura**
- [ ] Estrategias de búsqueda muestra 3 tarjetas: VDO, Por proveedor y Búsqueda automática. Se recuerda la elegida.
- [ ] El preset "💎 Diamantes en bruto" trae 100–2.000 totales, 10–100 en 7 días, 3 meses, stock 80, máx. 2 proveedores, 5 resultados, `CO` y `DROPI`.
- [ ] Guardar como crea un preset nuevo; borrar no se ofrece en el de fábrica; restaurar le devuelve sus números.

**Prompt e instrucción**
- [ ] Cambiar cualquier campo cambia el prompt al instante.
- [ ] "Copiar prompt" y "Copiar instrucción para /schedule" copian el texto y avisan con `#toast`.
- [ ] La instrucción de `/schedule` dice la hora elegida, `America/Bogota`, todos los días, y cuenta los meses desde el día de la ejecución.
- [ ] Pegado el prompt en Claude con el conector DropKiller, la respuesta trae el bloque JSON y la app la carga sin error (revisado a mano una vez).
- [ ] El prompt pide `externalId` como ID Dropi, agrupar por `familyId` sumando `totalSoldUnits`, excluir `suspectedSalesAdjustment: true` y mapear `salePrice`, `suggestedPrice`, `imageUrl` y `createdAt`.

**Programada**
- [ ] `#hu-active` alterna Activa / Pausada por preset y sobrevive a recargar la página, con `activeAt` del último cambio.
- [ ] Al pausar se ve el aviso "Pausa también la rutina en Claude Code con /schedule; la app no puede apagarla sola".
- [ ] Un preset pausado sale con ⏸ en el selector y su "Copiar instrucción para /schedule" está desactivado.

**Resultados**
- [ ] Pegar una respuesta sin JSON válido muestra el motivo y no guarda nada.
- [ ] Subir un archivo `.json` con el esquema carga la búsqueda igual que pegarla; uno inválido dice el motivo y no guarda nada.
- [ ] Un producto con 2.001 ventas totales o 3 proveedores sale con ⚠ y la regla que rompe; uno dentro del preset sale con ✓.
- [ ] Un ID Dropi que salió en una búsqueda anterior muestra "Visto el AAAA-MM-DD".
- [ ] `products: []` se guarda y muestra "Ningún producto cumple el preset hoy".
- [ ] El historial guarda como mucho 30 búsquedas y sobrevive a recargar la página (revisado en el navegador).
- [ ] "→ Mi candidato" llena Nombre, ID Dropi y Precio proveedor y no toca la bitácora.
- [ ] "→ Guardado rápido" agrega el producto y rechaza un ID repetido.

**Calidad**
- [ ] Ids `#hu-` únicos; clave `pyl-auto` propia.
- [ ] Pasan `node tests/core.test.js`, `tests/smoke.test.js` y `node --check` de cada archivo tocado; `claves-pyl.json` coincide con `--claves`; la consola queda limpia.
- [ ] Se lee bien en los 7 temas y en pantallas angostas (la tabla con desplazamiento horizontal propio).
- [ ] VDO, Por proveedor, Mi candidato, Bitácora y Guardado rápido no cambian su comportamiento.

## Decisiones

- **Sí:** copiar y pegar como puente (decisión del usuario). La app sigue sin servidor ni claves. **No:** API directa de DropKiller (rompe "sin conexiones directas" y CORS). **No:** archivo escrito por una tarea local (depende del PC y ensucia el repo).
- **Sí:** la app solo arma la instrucción para Claude Code `/schedule`, diaria a una hora (decisión del usuario). **No:** cada N horas ni varias horas.
- **Sí:** presets guardables con un preset de fábrica con los números del usuario. **No:** tomar los defaults de `LIMITS`: el VDO de la app usa ideal 5 / máx. 10 proveedores y este preset usa máx. 2 (estrategia de exclusividad). Son distintos a propósito.
- **Sí:** la app re-chequea los filtros duros con los números del JSON. Claude a veces relaja filtros aunque se le pida que no.
- **Sí:** un dato que falta cuenta como regla rota. Si no, un producto sin `providers` pasaría como "cumple".
- **Sí:** historial de 30 búsquedas en clave propia `pyl-auto`, así borrarlo no toca la bitácora.
- **Sí:** el código va dentro de `modules/search` (decisión del usuario). Con `quick` habla por el evento `busqueda:rapido`, porque `quick` carga después de `search`. **No:** módulo aparte.
- **Sí:** "→ Mi candidato" reusa `rapido:candidato`. Así hay un solo camino para cargar un producto nuevo en Mi candidato.
- **Sí:** la miniatura se muestra por URL. **No:** pasarla a Mi candidato: la foto se guarda como data URL y una imagen externa no se puede convertir por CORS.
- **Sí:** JSON con claves en inglés cortas (`name`, `dropi`, `cost`), igual que el resto del código; la tabla y el prompt van en español.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El MCP no filtra por ventas totales máximas ni por proveedores | El prompt pide agrupar y descartar; `huntCheck` lo marca en la app |
| Claude no respeta el esquema JSON | Esquema con ejemplo dentro del prompt; `huntParse` dice qué falla y no guarda |
| La rutina de `/schedule` deja de tener el conector o falla | La app no depende de ella: la búsqueda manual sigue igual |
| El historial con miniaturas crece en `localStorage` | Solo se guarda la URL de la imagen, nunca la imagen; tope de 30 búsquedas |
| Un nombre nuevo choca al aplanar `js/index.js` | Prefijos `hunt`/`HUNT_` y grep |
| "Competencia en Dropi" no es un dato del MCP | Es texto de Claude; la app lo muestra tal cual y no lo re-chequea |

## Lo que **no** entra en esta spec

- Llamar a DropKiller desde la app.
- Crear o ejecutar la rutina desde la app.
- Frecuencias distintas a una vez al día.
- "Abrir en DropKiller" y "Descartar".
- Foto de DropKiller en Mi candidato.
- DropKiller dentro de VDO o Por proveedor.

Cada una, si llega, va en su propia spec.
