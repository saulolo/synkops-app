# SPEC 19 — Mis tareas en Inicio

> **Estado:** Implementado
> **Depende de:** SPEC 14, SPEC 18
> **Fecha:** 2026-11-20
> **Objetivo:** Agregar a Inicio la tarjeta "Mis tareas": una columna en el margen izquierdo, espejo del Centro de mando, que porta a JavaScript vanilla la app My Sticky Notes (tareas por día con hora, subtareas, progreso, historial de 5 días y "Traer tareas de ayer"), guardada en `localStorage`.

## Por qué existe esta spec

Tengo mis tareas del día en otra app de escritorio, My Sticky Notes (Electron + TypeScript, `C:\Personal-Dev\Proyectos_Personales\My_Sticky_Notes\my-sticky-notes-frontend`). Synkops es la página que abro primero. Si las tareas viven en Inicio, a la izquierda, y el Centro de mando a la derecha, Inicio queda como mi tablero del día.

My Sticky Notes no usa framework de UI: es TypeScript vanilla sobre DOM. El núcleo (`src/core/domain/*`) es puro y se porta casi 1:1 quitando los tipos. La UI (`src/renderer/ui/*`) se porta al patrón de capas de Synkops. Todo lo que es de la ventana de Electron se queda afuera.

Las dos apps son **independientes**: las tareas de Synkops se guardan en su propia clave y no se leen ni se importan las de My Sticky Notes.

## Alcance

**Dentro:**

**Parte 1 · Módulo y ubicación**

- Módulo nuevo `js/modules/tasks/{core,ui,app}/tasks.js` (`PYL.core.tasks`, `PYL.ui.tasks`, `app.state.tasks`) y `css/modules/tasks.css` (después de `home.css`, antes de `themes.css`).
- Prefijo de ids `#tk-` y de clases `.tk-`. Nombres del núcleo con prefijo `tk`/`TK_` para no chocar al aplanar en `js/index.js`.
- Tarjeta `<div class="card mt tk" id="tk-root">` dentro de `<aside class="tk-rail" id="tk-rail" aria-label="Mis tareas">`, en `#v-dash` justo antes de `#hb-rail` en el HTML.
- **Pantalla ancha (`min-width: 1680px`):** espejo exacto del Centro de mando, en el margen **izquierdo**: `.tk-rail` absoluta con `right: calc(100% + 14px)`, `top: 0`, `bottom: 0`, `width: 210px`. La tarjeta es `position: sticky` con `top: var(--tk-top)` y alto `calc(100vh - var(--tk-top) - 20px)`. La lista hace scroll adentro; cabecera, progreso y pie quedan fijos.
- `--tk-top` lo mide `app/tasks.js` igual que `app/hub.js#syncTop` (alto de `header.top` + padding superior de `main.main`), en `resize`, `nav:vista`, al cargar las fuentes y con `ResizeObserver`. El módulo no lee `--hb-top`: no depende de `hub`.
- **Pantalla más angosta:** la tarjeta queda en el flujo, bajo el hero y antes del Centro de mando, a todo el ancho, con alto máximo de 520 px y la lista con scroll.
- La tarjeta usa los tokens de Synkops (sigue los 7 temas). Formas y medidas se copian de la nota original, reducidas donde 210 px no alcanzan.

**Parte 2 · Cabecera**

- **Tarjetas laterales destacadas:** Mis tareas y el Centro de mando llevan la clase compartida `.card-side` (`base.css`): destacan por relieve, sin color de acento: borde gris más visible, fondo un tono más claro, brillo de 1 px arriba y sombra más honda (más marcados al pasar el cursor); salen de `--ink`/`--card-2` y sirven en todos los temas. El panel flotante «Editar» del Centro de mando conserva su sombra fuerte (`hub.css`). (Cambio pedido por el usuario durante la implementación, 2026-11-20.)
- **Cabecera** (una sola fila, arriba de todo): título `<h2 id="tk-title">Mis tareas</h2>` con el estilo de título de tarjeta de la app (barrita de acento de `base.css`; en la columna de pantalla ancha, 14,5 px con barrita de 4×16, igual que el Centro de mando) y el engranaje "Configuración" en el extremo derecho de la fila. (Cambio pedido por el usuario durante la implementación, 2026-11-20.)
- **Sin fecha en la tarjeta:** la fecha corta del día activo (`tkShortDate`, `Vie, 20 nov`) se quitó de la cabecera para mostrarla en otra parte (otra spec). `tkShortDate` se queda en el núcleo. (Cambio pedido por el usuario durante la implementación, 2026-11-20.)
- **Engranaje:** abre un menú con un solo ítem, "Acerca de Mis tareas". El menú se cierra con Esc, Tab o clic fuera.
- **Acerca de** (`#tk-about`): capa dentro de la tarjeta, con título "Mis tareas", descripción y viñetas. Sin versión, sin ícono y sin tarjeta "Creado por". Se cierra con ×, Esc o clic en el fondo; el foco vuelve al engranaje. Texto:
  - Descripción: «Mis tareas es tu nota adhesiva dentro de Synkops para organizar las tareas del día.»
  - «Cada día tiene sus tareas: Ayer, Hoy, Mañana e historial de los últimos días.»
  - «Cada día empieza limpio; con un clic traes las tareas de ayer, sin marcar.»
  - «Todo se guarda automáticamente y solo en este navegador: sin cuenta, sin nube y sin internet.»
  - «Se conservan los últimos 5 días; los anteriores se borran.»
- **Sin Colapsar/Expandir:** la tarjeta siempre está expandida; no hay botón, estado ni campo guardado. (Cambio pedido por el usuario durante la implementación, 2026-11-20.)
- **No existen** "Siempre encima" (capas), "Fijar" (pin), Minimizar ni Cerrar.

**Parte 3 · Fila de días**

- Rejilla `1fr auto 1fr`: "+" a la izquierda, pestañas en el centro y reloj a la derecha.
- **"+" ("Nueva tarea"):** muestra la fila de añadir (Parte 6). No crea otra nota.
- **Pestañas Ayer / Hoy / Mañana** (`data-day`): la activa lleva `.is-on` (fondo teñido y color de acento `var(--b)`).
- **Reloj "Días anteriores":** menú con los días anteriores a ayer que tienen tareas, del más reciente al más viejo, con etiqueta larga (`tkDateLabel` → `Miércoles, 11 nov`). Sin días: "Sin días anteriores". Navegación con ↑/↓; Esc y Tab cierran. Si el día activo no es ninguna pestaña, el reloj queda en `.is-on`.
- El día activo **no se guarda**: al cargar siempre es Hoy.

**Parte 4 · Progreso**

- Anillo SVG de 14 px (`r=5.5`, `pathLength=100`, trazo 2,5, rotado −90°, `stroke-dashoffset = 100 − %`, transición 0,3 s). Es medidor, no spinner.
- Texto `N de M hechas` (`tabular-nums`, color `--muted`).
- Botón doble check: "Marcar todas" si faltan, "Desmarcar todas" si están todas (en ese modo `.is-on`). Oculto con 0 tareas. Afecta tareas y subtareas del día.
- Barra de 3 px debajo.
- **El conteo incluye tareas y subtareas.** El porcentaje se redondea. Marcar una tarea no marca sus subtareas.

**Parte 5 · Lista de tareas**

- Fila de tarea (`.tk-row`, `data-id`): casilla de 18 px · badge de hora (`.tk-hour`, el número 0–23) · texto · chip de subtareas · acciones flotantes.
- Hecha: texto tachado y hora y texto con opacidad .5. La casilla marcada se llena de `var(--b)` con el check en `var(--on-b)`.
- **Chip de subtareas** (`.tk-sub-toggle`, solo con subtareas): chevron + `hechas/total` (`0/2`). Fondo rellenado en proporción (`--sub-progress: X%`, acento al 22 %); todas hechas → chip entero en acento. Colapsada → chevron girado −90°.
- **Acciones** (`.tk-acts`): absolutas a la derecha, visibles con hover o `focus-within`. Chevron contraer/expandir (solo con subtareas), "+" "Añadir subtarea" y papelera "Eliminar tarea". **Borrar no pregunta** (igual que el original) y se lleva sus subtareas.
- **Clic simple** en una fila con subtareas alterna contraer/expandir con 250 ms de retraso (un doble clic lo cancela). No actúa sobre botones, campos ni justo después de soltar un arrastre. Esas filas tienen cursor pointer y se elevan 1 px en hover.
- **Subtareas** (`.tk-subs`): sangría con línea izquierda (`margin-left 18px`, `padding-left 12px`, borde `var(--line)`). Casilla de 16 px, texto de 13 px, acciones "+" (añade otra subtarea a la misma tarea) y eliminar. Añadir una subtarea expande la tarea.
- **Edición con doble clic:** en el texto de tarea o subtarea aparece un `<input>` de texto plano; en la hora, un `<input>` de hora. Enter o perder el foco guardan; Esc cancela. Texto vacío conserva el anterior. Hora inválida o vacía conserva la anterior.
- **Nueva subtarea:** input en la tarea; Enter la agrega y deja otro input vacío para la siguiente (vacío no hace nada); Esc cierra; perder el foco guarda si hay texto y cierra.
- **Reordenar arrastrando** (eventos de puntero, como el original): presiono la fila (no un botón ni un campo) y arranca tras 4 px; con 2 tareas o más. La fila sigue al puntero (`translateY`), las demás se deslizan (FLIP, `transform 140ms ease`) y la lista hace autoscroll en franjas de 36 px (hasta 14 px por fotograma). Esc o `pointercancel` devuelven el orden. Al soltar se guarda (`tkMove`) y se ignora el clic de soltar. La fila arrastrada lleva sombra y anillo de 1 px en acento. Mientras se arrastra, el repintado espera.
- **Las subtareas también se arrastran**, con el mismo comportamiento, dentro de su tarea (no cambian de tarea) y con 2 subtareas o más; al soltar se guarda con `tkMoveSub`. Sin atajos de teclado para reordenar. (Cambio pedido por el usuario durante la implementación, 2026-11-20; el original solo arrastraba tareas.)
- **No existen** Tab para sangrar, Backspace para borrar ni atajos globales.

**Parte 6 · Añadir tarea**

- Fila `#tk-add` oculta por defecto: "+" con borde punteado · campo de hora `#tk-add-hour` (placeholder = hora actual) · campo `#tk-add-text` "Añadir nueva tarea…" · etiqueta "Enter" (se oculta si no cabe en 210 px).
- Al abrir, el foco va a la hora. Enter crea la tarea, vacía los campos y devuelve el foco a la hora.
- Hora vacía = hora actual. Hora inválida marca el campo (`.is-invalid`, `aria-invalid`, borde `var(--r)`) y no crea nada. Texto vacío no crea nada.
- Esc o perder el foco fuera de la fila la ocultan y descartan lo escrito.
- La tarea nueva va al final de la lista del día activo.

**Parte 7 · Traer tareas de ayer y paso de los días**

- **Traer tareas de ayer** (`#tk-carry`): solo en Hoy, con Hoy vacío, si `lastCarryOver` no es hoy y existe un día anterior con tareas. Muestra «Sin tareas para hoy» y el botón «Traer tareas de ayer».
- El origen es el día más reciente anterior a hoy con tareas. **Copia, no mueve:** ids nuevos y todo sin marcar; conserva hora, texto, `createdAt` y `collapsed`. Luego `lastCarryOver = hoy`.
- **Paso de los días** (`tkRollOver`): al cargar y a las 00:00 (temporizador hasta medianoche + 1 s, que se rearma). No mueve tareas: borra los días anteriores a hoy − 5 y los días pasados vacíos. A medianoche, si veía el día que terminó o Mañana, la vista pasa a Hoy.

**Parte 8 · Pie de formato (inerte)**

- Botones Negrita, Cursiva, Subrayado, Tachado, divisor, Lista con viñetas y Adjuntar imagen, compactos (~24 px) en una sola línea.
- **No hacen nada**, igual que en el original. Llevan `title` con su nombre y `aria-disabled="true"`.

**Parte 9 · Persistencia**

- `services.storage.tasks` con clave propia `pyl-tasks` = `{ v: 1, note }`.
- Autoguardado con retraso de 300 ms tras cada cambio; se fuerza el guardado pendiente en `beforeunload`. Un comando que no cambia nada (misma referencia) no guarda ni repinta.
- Al cargar, `tkLoad(raw, today)` valida (Modelo de datos). Inválido → nota vacía, el texto crudo se copia una vez en `pyl-tasks-corrupt` y no se pierde.
- Si `localStorage` falla al guardar, avisa en `#toast` («No se pudo guardar: hay muy poco espacio») y el estado en pantalla se conserva.

**Parte 10 · Pruebas**

- Port de las pruebas del núcleo de My Sticky Notes (`tests/domain/*`: `note-operations`, `carry-over`, `day`, `roll-over`, `date-label`, y la validación adaptada a `tkLoad`) a `tests/core.test.js`, sin Vitest. Las de Electron (`tests/main/*`) y las del store no aplican.
- Humo en `tests/smoke.test.js` para la tarjeta y los flujos de UI.
- `tests/fixtures/claves-pyl.json` al día.

**Fuera (para otras specs):**

- Texto enriquecido e imágenes (el pie sigue inerte).
- Importar o leer `note.json` de My Sticky Notes, o sincronizar con ella.
- Exportar o importar las tareas.
- Siempre encima, Fijar, Minimizar, Cerrar, redimensionar con asas y guardar posición/tamaño.
- Varias notas.
- Elegir color de acento propio (manda el tema).
- Reordenar subtareas o reordenar con teclado.
- Recordatorios o notificaciones por hora.
- Mis tareas fuera de Inicio.

## Modelo de datos

```js
// core/tasks.js (PYL.core.tasks; prefijo tk/TK_)
TK_VERSION = 1;
TK_HISTORY_DAYS = 5;

// Subtarea
{ id: 's…', text: 'POO', done: false }            // text no vacío, recortado

// Tarea
{ id: 't…', hour: 8, text: 'Study Java', done: true,
  subtasks: [ /* Subtarea */ ], collapsed: false,  // collapsed ausente = expandida
  createdAt: '2026-11-20T13:05:00.000Z' }

// Nota (una sola)
{ days: { '2026-11-20': [ /* Tarea, en orden manual */ ] },
  lastCarryOver: '2026-11-20' }                     // opcional

// localStorage 'pyl-tasks'
{ v: 1, note: { /* Nota */ } }

// app.state.tasks
{ note, day: '2026-11-20' /* día activo, no se guarda */,
  adding: false, menu: null /* 'gear' | 'history' | null */, about: false }
```

Convenciones:

- `DayKey` = `YYYY-MM-DD` en hora **local** (no UTC).
- `hour` = entero 0–23.
- Los `id` son únicos en toda la nota. El núcleo recibe la función que genera ids (`newId`); `app` usa `crypto.randomUUID()` si existe y si no `Date.now().toString(36)` + aleatorio.
- Las operaciones no mutan: devuelven una nota nueva, o **la misma** si nada cambió.

Funciones de `core/tasks.js` (sin DOM; equivalencia con el original entre paréntesis):

- Días: `tkDayKey(date)`, `tkDayDate(key)`, `tkAddDays(key, n)`, `tkDayLabel(key, today)` (Ayer/Hoy/Mañana o etiqueta larga), `tkPastDays(note, today)` (`pastDays`).
- Etiquetas: `tkDateLabel(date)` (`Miércoles, 11 nov`), `tkShortDate(date)` (`Vie, 20 nov`).
- Hora: `tkIsHour(v)`, `tkParseHour(text)` → número, `undefined` (vacío) o `null` (inválida).
- Nota: `tkEmpty()`, `tkTasksOf(note, day)`.
- Comandos: `tkAdd(note, day, { hour, text }, id, now)`, `tkAddSub(note, taskId, text, id)`, `tkToggle`, `tkToggleSub`, `tkSetAll(note, day, done)`, `tkEdit`, `tkEditSub`, `tkSetHour`, `tkMove(note, taskId, toIndex)`, `tkMoveSub(note, taskId, subId, toIndex)`, `tkDelete`, `tkDeleteSub`, `tkToggleCollapsed`.
- Días: `tkRollOver(note, today)`, `tkCarrySource(note, today)`, `tkCanCarry(note, today)`, `tkCarry(note, today, newId)`.
- Lectura: `tkProgress(tasks)` → `{ done, total, percent }`.
- Guardado: `tkLoad(raw, today)` → `{ ok, note, collapsed }`. Reglas del validador original (`isNote`): texto no vacío, `hour` válida, `done` booleano, `subtasks` arreglo, `lastCarryOver` ausente o `YYYY-MM-DD` (un `null` invalida), clave de día con formato válido. `v` distinta, JSON roto o cualquier regla rota → `ok: false` y nota vacía. `collapsed` no booleano → `false` (se conserva para datos viejos; `app` ya no lo usa). Tras cargar, `app` aplica `tkRollOver`.

`ui/tasks.js` pinta cabecera, fila de días, progreso, lista, fila de añadir, traer de ayer, pie, menús y Acerca de; recibe datos y callbacks. `app/tasks.js` maneja `app.state.tasks`, el autoguardado, el temporizador de medianoche, el arrastre, la medición de `--tk-top` y los menús.

## Plan de implementación

1. **Núcleo: días, etiquetas y hora.** Pruebas portadas de `day` y `date-label` más `tkParseHour`. Luego `core/tasks.js` con esas funciones, su `<script>` en `index.html` y su línea en `js/index.js`.
2. **Núcleo: comandos.** Pruebas portadas de `note-operations` (agregar, subtareas, marcar, marcar todas, editar, hora, mover en los bordes, borrar, misma referencia sin cambios) y `tkProgress`. Luego los comandos.
3. **Núcleo: paso de días y traer de ayer.** Pruebas portadas de `roll-over` y `carry-over`. Luego `tkRollOver`, `tkCarrySource`, `tkCanCarry`, `tkCarry`.
4. **Núcleo: carga.** Pruebas de `tkLoad` (sin clave, JSON roto, `v` distinta, tarea sin texto, hora 24, `lastCarryOver: null`, `collapsed` raro). Luego `tkLoad`.
5. **Persistencia.** `services.storage.tasks` (`load`/`save` de `pyl-tasks`, copia a `pyl-tasks-corrupt`, error de cuota). Humo: sin clave arranca vacía.
6. **Tarjeta y ubicación.** Humo: `#tk-root` dentro de `#tk-rail`, antes de `#hb-rail`; cabecera con fecha de hoy y pestaña Hoy activa. Luego HTML, `ui.tasks` (cabecera, días, progreso, lista vacía, pie inerte), `app/tasks.js` (estado, `--tk-top`) y `tasks.css` (columna izquierda desde 1680 px, flujo debajo).
7. **Añadir y listar.** Humo: "+" abre `#tk-add`; Enter con texto agrega al final y deja el foco en la hora; hora `25` marca `.is-invalid`; Esc oculta. Progreso `0 de 1 hechas`.
8. **Marcar, editar y borrar.** Humo: marcar tacha y actualiza progreso; doble check marca todas y cambia a "Desmarcar todas"; doble clic edita texto y hora (Enter guarda, Esc cancela); papelera borra.
9. **Subtareas.** Humo: "+" de la fila agrega subtareas en cadena; chip `0/2` → `1/2`; clic simple contrae tras 250 ms (temporizador simulado); doble clic no contrae.
10. **Días e historial.** Humo: Ayer/Mañana cambian la fecha de la cabecera y la lista; reloj con días viejos y "Sin días anteriores"; "Traer tareas de ayer" copia sin marcar y desaparece.
11. **Medianoche y autoguardado.** Temporizador hasta 00:00 + 1 s con `tkRollOver` y regreso a Hoy; guardado con retraso de 300 ms y en `beforeunload`.
12. **Arrastre.** Eventos de puntero, FLIP, autoscroll, Esc. Humo simulando punteros: arrastrar la primera tarea debajo de la segunda cambia el orden; clic sin mover no reordena; Esc devuelve el orden.
13. **Engranaje y Acerca de.** Humo: el menú abre "Acerca de Mis tareas"; Esc cierra y devuelve el foco al engranaje.
14. **Revisión visual.** En el navegador: 7 temas, columna izquierda alineada con el hero y con el Centro de mando, pantalla angosta, scroll de la lista, menús dentro de 210 px.
15. **Documentación.** Después del merge, `CLAUDE.md` y `README.md`: Mis tareas en Inicio, módulo `tasks`, ids `#tk-`, clave `pyl-tasks`, orden de `<script>` y `<link>`.

## Criterios de aceptación

**Ubicación**

- [x] En pantalla de 1680 px o más, "Mis tareas" es una columna de 210 px en el margen izquierdo, con el borde superior alineado al hero y al Centro de mando, y me acompaña al bajar.
- [x] Con muchas tareas, la lista hace scroll dentro de la tarjeta y cabecera, progreso y pie no se mueven.
- [x] En pantalla más angosta la tarjeta queda bajo el hero y antes del Centro de mando, sin desplazamiento horizontal.
- [x] La columna no tapa ni empuja el contenido ni el Centro de mando.

**Cabecera y días**

- [x] ~~La cabecera muestra la fecha del día activo en mayúsculas (`VIE, 20 NOV`) y cambia al tocar Ayer o Mañana.~~ Ya no aplica: la fecha se quitó de la tarjeta a pedido del usuario (se mostrará en otra parte, otra spec).
- [x] No hay botones de Siempre encima, Fijar, Minimizar ni Cerrar.
- [x] La cabecera muestra «Mis tareas» con el engranaje en el extremo derecho, sin fecha ni Colapsar; la tarjeta siempre está expandida.
- [x] El engranaje abre "Acerca de Mis tareas" con la descripción y las 4 viñetas, sin versión ni "Creado por"; Esc lo cierra.
- [x] Al cargar, la pestaña activa es Hoy.
- [x] El reloj lista los días anteriores a ayer con tareas, del más reciente al más viejo, o "Sin días anteriores".

**Tareas**

- [x] "+" abre la fila de añadir con foco en la hora; Enter crea la tarea al final con la hora escrita o la actual.
- [x] Una hora fuera de 0–23 marca el campo y no crea la tarea.
- [x] Cada tarea muestra su hora en un badge; marcarla la tacha.
- [x] Doble clic en texto u hora permite editarlos; Esc cancela; texto vacío o hora inválida conservan lo anterior.
- [x] La papelera borra la tarea y sus subtareas sin preguntar.
- [x] Puedo agregar varias subtareas seguidas; el chip muestra `hechas/total` y se rellena en proporción.
- [x] Clic simple en una fila con subtareas las contrae o expande; doble clic no.
- [x] Puedo arrastrar una tarea a otra posición, y una subtarea a otra posición dentro de su tarea; al soltar se guarda; Esc durante el arrastre devuelve el orden.
- [x] El progreso cuenta tareas y subtareas (`N de M hechas`); el doble check marca o desmarca todo el día.
- [x] Los botones del pie no cambian nada al tocarlos.

**Días**

- [x] Con Hoy vacío y tareas en un día anterior, aparece «Traer tareas de ayer»; al tocarlo copia las tareas sin marcar y el botón no vuelve a salir ese día.
- [x] Al cargar se borran los días anteriores a hoy − 5 y los días pasados vacíos.
- [x] A medianoche, con la página abierta, la vista pasa a Hoy si veía el día que terminó o Mañana.

**Persistencia**

- [x] Tras recargar se conservan tareas, subtareas, horas, marcas y orden.
- [x] Un `pyl-tasks` roto o de otra versión arranca vacío sin errores en consola y su texto queda en `pyl-tasks-corrupt`.
- [x] Si no hay espacio para guardar, avisa en `#toast`.
- [x] Las tareas de My Sticky Notes no aparecen ni cambian. (Synkops solo lee y escribe `pyl-tasks` en este navegador; la carpeta de My Sticky Notes solo se leyó para portar el código.)

**Calidad**

- [x] `core/tasks.js` no toca el DOM; la UI no escribe reglas.
- [x] Ids `#tk-` únicos en la página; ningún nombre `tk*`/`TK_*` choca al aplanar `js/index.js`.
- [x] El módulo `tasks` solo usa `shared/`.
- [x] Ningún otro módulo cambia de comportamiento (hero, frase y Centro de mando siguen igual). (Solo se agregó la clase `.card-side` al Centro de mando, cambio visual pedido por el usuario; sus pruebas siguen pasando.)
- [x] Pasan `node tests/core.test.js` (con las pruebas portadas), `tests/smoke.test.js` y `node --check` de cada archivo tocado; consola limpia; `claves-pyl.json` coincide con `--claves`.
- [x] Se ve bien en los 7 temas y en pantalla angosta (revisado en el navegador).

## Decisiones

- **Sí:** portar My Sticky Notes casi 1:1. Ya es TypeScript vanilla: el núcleo se copia quitando tipos y la UI se adapta a capas `core/ui/app`.
- **Sí:** espejo exacto del Centro de mando: 210 px en el margen izquierdo desde 1680 px, en el flujo por debajo (elección del usuario, 2026-11-20).
- **Sí:** alto de pantalla con la lista en scroll interno y pie compacto en una línea (elección del usuario, 2026-11-20).
- **Sí:** en pantalla angosta, debajo del hero y antes del Centro de mando, con alto máximo de 520 px. Izquierda primero, como en la pantalla ancha.
- **Sí:** medir `--tk-top` dentro del módulo, con la misma regla que `hub`. Así `tasks` no depende de `hub`.
- **Sí:** colores del tema de Synkops (`--b`, `--on-b`, `--card`, `--line`, `--muted`, `--ink`) en lugar del amarillo fijo `#f5c451` y el gris `#252526` (elección del usuario, 2026-11-20).
- **No:** fuente Inter. La app usa la fuente de Synkops.
- **No:** Siempre encima, Fijar, Minimizar y Cerrar; no hacen nada en el navegador. **Sí:** Colapsar (elección del usuario, 2026-11-20); **después se quitó**: la tarjeta siempre está expandida (usuario, 2026-11-20).
- ~~Guardar el estado colapsado en `pyl-tasks`~~: ya no aplica, se quitó Colapsar (usuario, 2026-11-20).
- **Sí:** engranaje con "Acerca de Mis tareas" adaptado: descripción y viñetas, sin versión ni tarjeta del autor; se quita la viñeta de Fijar/Windows (elección del usuario, 2026-11-20).
- **Sí:** pie de formato inerte, como el original (elección del usuario, 2026-11-20). Texto enriquecido e imágenes irían en otra spec.
- **Sí:** clave propia `pyl-tasks` con `v: 1`. **No:** importar `note.json`: las dos apps son independientes (decisión del usuario, 2026-11-20).
- **Sí:** el número de cada tarea es su hora (0–23), como en el original.
- **Sí:** borrar sin confirmación, como el original.
- **Sí:** ante datos inválidos, arrancar vacío y guardar el texto crudo en `pyl-tasks-corrupt`. Equivale al `note.corrupt-<ts>.json` del original y no se pierde nada.
- **Sí:** el núcleo recibe la función de ids. `crypto.randomUUID` puede faltar en `file://` según el navegador, así que `app` tiene respaldo.
- **Sí:** una sola spec con todo (elección del usuario, 2026-11-20); el plan va en pasos pequeños y cada uno es commiteable.
- **Sí:** portar las pruebas del núcleo (elección del usuario, 2026-11-20). **No:** las de Electron ni las del store (su lógica de guardado pasa a `app`).
- **No:** guardar el día activo. Como el original, siempre abre en Hoy.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| 210 px no alcanzan para "+", tres pestañas y el reloj | Botones de 26 px y pestañas con `padding 0 6px`; si aún no caben, letra de 11,5 px en las pestañas. |
| Las acciones flotantes tapan el texto de la tarea en 210 px | Siguen ocultas hasta hover/foco, con degradado de fondo como el original. |
| Arrastre y scroll interno chocan en pantalla táctil | Se arrastra solo tras 4 px y con captura de puntero; en táctil el scroll sigue funcionando fuera de las filas. |
| El temporizador de medianoche falla si el equipo se suspende | Al volver a la pestaña (`visibilitychange`) se recalcula el día y se aplica `tkRollOver`. |
| Diferencias horarias por usar UTC | `tkDayKey` usa siempre la fecha local, como el original; hay pruebas. |
| `localStorage` lleno por los íconos del Centro de mando | Las tareas pesan poco; si falla, aviso en `#toast` y el estado en pantalla se conserva. |
| Nombres del núcleo chocan al aplanar | Prefijo `tk`/`TK_` en todo. |

## Lo que **no** está en esta spec

- Texto enriquecido e imágenes.
- Importar, exportar o sincronizar con My Sticky Notes.
- Controles de ventana de escritorio y redimensionado.
- Varias notas.
- Color de acento propio.
- Reordenar subtareas o con teclado.
- Recordatorios por hora.
- Mis tareas fuera de Inicio.

Cada uno, si llega, va en su propia spec.
