# SPEC 14 — Centro de mando en Inicio

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-11-17
> **Objetivo:** Agregar a Inicio la tarjeta "Centro de mando": una columna vertical de botones pequeños (favicon o ícono propio + nombre) en el margen derecho de la pantalla, hacia las herramientas que más uso. Abren su URL en pestaña nueva y los edito, agrego, ordeno y borro desde un modo Editar.

## Por qué existe esta spec

Opero el negocio saltando entre TikTok Ads, Meta Ads, Dropi, DropKiller, Kalodata, Skool, ChatGPT y Claude. Hoy busco cada enlace en los marcadores del navegador. Synkops es la página que abro primero: si los accesos viven en Inicio, a un lado y siempre a la vista, llego a cualquier herramienta con un clic y con la URL exacta de mi cuenta (la del administrador con mi `aadvid` o mi `act=`).

## Alcance

**Dentro:**

**Parte 1 · Módulo y tarjeta**

- Módulo nuevo `js/modules/hub/{core,ui,app}/hub.js` (`PYL.core.hub`, `PYL.ui.hub`, `app.state.hub`) y `css/modules/hub.css`.
- Tarjeta `<div class="card mt hb" id="hb-root">` dentro de `<aside class="hb-rail" id="hb-rail">`, en `#v-dash` justo debajo del hero y antes de "La cadena que decide todo" en el HTML. Dónde se ve depende del ancho (Parte 2).
- Cabecera de la tarjeta: solo el título "Centro de mando" (con la barrita de acento de las pestañas del entrenador). El botón `#hb-edit` "Editar" (estilo `.btn ghost`, mayúsculas espaciadas) va **al pie de la tarjeta**: en la columna lateral queda anclado al fondo de la columna alargada y ocupa todo su ancho; en el flujo va debajo del último botón.
- Prefijo de ids `#hb-` y de clases `.hb-`.

**Parte 2 · Vista normal (columna vertical)**

- **Pantalla ancha (`min-width: 1680px`):** la tarjeta vive en el **margen derecho** de la pantalla, fuera de la columna de contenido: una columna vertical alargada de 210 px, tan alta como la pantalla (`.hb-rail`, posición absoluta a la derecha de `#v-dash`) con **dos botones por fila**: el ícono arriba y el nombre debajo, en letra pequeña. La tarjeta me acompaña al bajar (`position: sticky`, justo a la altura donde empieza el contenido, medida con el alto de la barra superior más el margen de `<main>`, para que su borde superior quede alineado con la tarjeta de arriba). El título "Centro de mando" ocupa toda la línea y el botón "Editar" va anclado al fondo de la columna, a todo su ancho. Título, "Editar" y botones son pequeños.
- **Pantalla más angosta:** no hay margen libre a los lados, así que la tarjeta queda en el flujo, bajo el hero, con los mismos botones pequeños en una rejilla (`#hb-grid`, `repeat(auto-fill, minmax(170px, 1fr))`).
- Cada acceso es un botón pequeño (`.hb-tile`, `data-id`): ícono de 30 px (radio 8 px) y el nombre, con la línea "poner enlace" debajo si no tiene URL. En la columna lateral van dos por fila, con el nombre bajo el ícono; en la rejilla del flujo, el ícono va a la izquierda y el nombre a la derecha.
- **Con URL:** el botón es un `<a href target="_blank" rel="noopener noreferrer">`. Clic abre la URL en pestaña nueva.
- **Sin URL:** el botón es un `<button>` con borde punteado y la línea "poner enlace" bajo el nombre. Clic abre el modo Editar y pone el foco en el campo URL de ese acceso.
- **Reubicar arrastrando (vista normal):** mantengo presionado un botón y lo muevo (a partir de 6 px); una copia sigue al cursor, el botón levantado queda tenue en su lugar y los demás se acomodan al instante. Al soltar, el nuevo orden se guarda en `pyl-hub` sin pasar por Editar. Un clic sin mover sigue abriendo el enlace (o el editor, si no tiene URL); tras arrastrar, el clic de soltar se ignora. Esc cancela y devuelve todo a su lugar. Si no hay espacio para guardar, avisa en `#toast` y deja el orden anterior. Con el modo Editar abierto no se arrastra.
- Hover/focus: se eleva un poco (1 px) y el borde toma el color de acento (`var(--b)`), sin animar con `prefers-reduced-motion`.
- **Ícono, en este orden de prioridad:**
  1. Ícono propio (imagen PNG o JPG subida por mí, Parte 4): llena el cuadro de 30 px sin fondo de color y con `object-fit: contain`.
  2. Favicon del sitio: `https://www.google.com/s2/favicons?domain=<dominio>&sz=64`, sin fondo propio: se ve solo la imagen sobre el fondo oscuro de la tarjeta.
  3. Iniciales (`TT`, `M`, `AL`, `DK`…) sobre un fondo oscuro fijo: mientras no hay URL ni ícono propio, o si el favicon no carga.
- El favicon se da por no encontrado si la imagen falla (`error`) o si llega con `naturalWidth < 32` (Google devuelve un globo genérico de 16 px cuando el sitio no tiene ícono). En ese caso se ven las iniciales.

**Parte 3 · Botones de fábrica**

Al primer uso (sin `pyl-hub`) la tarjeta trae 9 accesos **sin URL** (`HUB_DEFAULTS`, en este orden):

| `id` | Nombre | Iniciales | URL sugerida (`suggest`) |
| --- | --- | --- | --- |
| `tiktok` | TikTok Ads | TT | `https://ads.tiktok.com/` |
| `meta` | Meta Ads | M | `https://adsmanager.facebook.com/` |
| `adlib` | Ad Library | AL | `https://www.facebook.com/ads/library/` |
| `dropi` | Dropi | D | `https://app.dropi.co/` |
| `dropkiller` | Dropkiller | DK | `https://dropkiller.com/` |
| `kalodata` | Kalodata | K | `https://www.kalodata.com/` |
| `skool` | Skool | S | `https://www.skool.com/` |
| `chatgpt` | ChatGPT | GPT | `https://chatgpt.com/` |
| `claude` | Claude | C | `https://claude.ai/` |

- La URL sugerida **no se usa sola**: en Editar, si el campo URL está vacío, aparece el botón "Usar <dominio>" (ej. "Usar ads.tiktok.com") que la pone en el campo.

**Parte 4 · Modo Editar**

- "Editar" abre la lista `#hb-list` y oculta la columna de botones. El botón, que sigue al pie de la tarjeta, cambia a "Listo" y aparece `#hb-cancel` "Cancelar" a su izquierda; en el panel flotante quedan fijos al pie aunque la lista se desplace. En pantalla ancha, como el margen no da para los campos, la tarjeta se abre como **panel flotante a la derecha** (`.hb-editing`: `position: fixed`, hasta 340 px de ancho, con scroll si es alto). La lista de edición es compacta en todas las pantallas: a la izquierda va el botón de vista previa (ícono arriba y nombre debajo) y, debajo de él, tres botones pequeños en una sola línea (subir ícono, quitar ícono y la papelera), cada uno con su aviso al pasar el mouse (el de subir dice "Subir ícono (o pega con Ctrl+V)"); a su derecha, los campos (Nombre, URL y ayuda) uno debajo del otro; campos de 28 px de alto, de esquinas redondeadas y sin etiqueta visible (el texto de ayuda "Nombre" y la URL sugerida van dentro del campo; la etiqueta queda para lectores de pantalla), letra y botones pequeños. La fila Agregar también apila sus campos y su botón; al terminar vuelve a la columna. En pantalla angosta se expande en el mismo lugar.
- Se edita un **borrador** (copia de lo guardado): nada se guarda hasta "Listo".
- **Una fila por acceso** (`.hb-row`, `data-id`): a la izquierda el botón en vista previa (se actualiza en vivo con el borrador); a la derecha:
  - Nombre `#hb-f-name-<id>`: obligatorio. Al cambiarlo, las iniciales se recalculan (`hubInitials`).
  - URL `#hb-f-url-<id>`: vacía se permite (queda "poner enlace"); si no está vacía debe empezar con `http://` o `https://`. No se completa el esquema solo. Error en `#hb-err-<id>` (`aria-invalid`, `.hb-bad`).
  - Botón "Usar <dominio>" (si trae `suggest` y la URL está vacía).
  - Ícono propio: botón pequeño "Subir ícono" (archivo PNG o JPG; el aviso al pasar el mouse dice "Subir ícono (o pega con Ctrl+V)") o pegar con Ctrl+V mientras el foco está en esa fila; se reduce a 128 px con `services.files.imageDataURL(file, 128, 0.85, tipo)`, donde `tipo` es `image/jpeg` para un JPG y `image/png` para el resto, así un PNG con fondo transparente conserva la transparencia (el cuarto parámetro `type` de `imageDataURL` es opcional y por defecto sigue siendo JPEG). "Quitar ícono" aparece si hay uno y vuelve al favicon/iniciales.
  - Eliminar: papelera (`.hb-del`, la misma de la bitácora `.cd-act.del`). Pregunta antes ("¿Quitar «TikTok Ads» del Centro de mando?").
- **Fila Agregar** al final (`#hb-new`): Nombre `#hb-new-name` + URL `#hb-new-url` + botón `#hb-add` "Agregar botón". Los dos son obligatorios; la URL con la misma regla `http(s)://`. Error en `#hb-err-new`. El acceso nuevo entra al final del borrador sin ícono propio, los campos se vacían y el cursor vuelve a Nombre. Enter en cualquiera de los dos campos también agrega.
- **Listo:** valida todo el borrador (`hubCheck`). Con errores, marca las filas, avisa en `#toast` y no guarda ni contrae. Sin errores, guarda en `pyl-hub`, contrae y repinta la rejilla.
- **Cancelar:** descarta el borrador, contrae y repinta lo guardado. No pregunta. Es también la forma de volver a los 9 de fábrica mientras no se haya guardado nada.
- Esc no cierra el modo Editar (para no perder cambios por accidente).
- Salir de Inicio con el modo Editar abierto no borra el borrador; recargar la página sí.
- Lista vacía (borré todo): la rejilla muestra "Sin accesos. Toca Editar para agregar uno."

**Parte 5 · Persistencia**

- `services.storage.hub` con clave propia `pyl-hub` = `{ v: 1, items: [...] }`.
- Al cargar, `hubLoad(raw)` valida: sin clave, JSON roto o `v` distinta → los 9 de fábrica; un ítem sin `id` o sin `name` se descarta (también uno con `id` repetido); una `url` inválida se vacía; un `icon` que no empieza con `data:image/` se descarta; cualquier otro campo (como un `color` de una versión anterior) se ignora.
- Si `localStorage` falla al guardar (lleno por las imágenes), avisa en `#toast` ("No se pudo guardar: hay muy poco espacio") y deja el modo Editar abierto.

**Fuera (para otras specs):**

- Abrir en la app de escritorio (protocolo `claude://`) y la nota de enlaces en el celular.
- Carpetas o grupos de accesos.
- Sincronizar entre equipos o exportar/importar la lista.
- Elegir el color de cada botón y "Restaurar botones" (se quitaron: el ícono propio y el favicon se bastan, y "Agregar botón" cubre lo demás).
- Favicon de otro servicio (DuckDuckGo, `/favicon.ico`) o descargar y guardar el favicon.
- Mover el Centro de mando a otras pestañas o a un botón flotante.

## Modelo de datos

```js
// core/hub.js (PYL.core.hub; prefijo hub/HUB_ para no chocar al aplanar en js/index.js)
HUB_VERSION = 1;
HUB_DEFAULTS = [ { id: 'tiktok', name: 'TikTok Ads', ini: 'TT',
                   suggest: 'https://ads.tiktok.com/' }, … ];

// Ítem guardado
{ id: 'tiktok', name: 'TikTok Ads', ini: 'TT', url: '', icon: null }
// id de un acceso nuevo: 'u' + Date.now().toString(36)
// icon: data URL (data:image/png o jpeg) del ícono propio o null

// localStorage 'pyl-hub'
{ v: 1, items: [ /* ítems en el orden de la rejilla */ ] }

// app.state.hub
{ items: [...], editing: false, draft: null /* copia de items mientras edito */ }
```

Funciones de `core/hub.js` (sin DOM):

- `hubDefaults()` → copia de los 9 de fábrica con `url: ''` e `icon: null`.
- `hubLoad(raw)` → `items` validados (reglas de la Parte 5); `raw` es el texto guardado o un objeto ya leído.
- `hubInitials(name)` → 1 a 3 letras en mayúscula: varias palabras = primera letra de cada una (máx. 3); una palabra = su primera letra (`'TikTok Ads'` → `TA`; los de fábrica conservan su `ini` y solo se recalcula al renombrar).
- `hubUrl(text)` → `{ ok, url, err }`: recorta espacios; vacío = `ok` con `url: ''`; sin `http(s)://` o con espacios dentro = error.
- `hubDomain(url)` → dominio sin `www.` (`ads.tiktok.com`) o `''`.
- `hubFavicon(url)` → URL de Google s2 con `sz=64`, o `null` sin URL.
- `hubCheck(items)` → `{ ok, errors: { [id]: { name?, url? } } }`.
- `hubClean(items)` → lista lista para guardar: recorta `name` y `url` y rellena `ini` vacía (se llama después de `hubCheck`).
- `hubAdd(items, { name, url }, now?)` → `{ ok, items, errors }`; el `id` nuevo se vuelve único si ya existe.
- `hubOrder(items, ids)` (el orden de `ids`; los desconocidos se ignoran y los que falten quedan al final), `hubRemove(items, id)`, `hubSet(items, id, patch)` → arreglo nuevo (no mutan).

`ui/hub.js` pinta la rejilla (`grid`), la lista de edición (`list`) y el botón (`tile`), recibe datos y callbacks. `app/hub.js` maneja `app.state.hub`, el borrador, el pegado con Ctrl+V (escucha en `document` solo con el modo Editar abierto), los diálogos de confirmación y el guardado.

## Plan de implementación

1. **Núcleo.** Pruebas en Node: `hubInitials` (`'TikTok Ads'`→`TA`, `'Dropi'`→`D`, `'Mi gran tienda nueva'`→`MGT`); `hubUrl` con `''`, `'https://x.co'`, `'x.co'`, `'https://a b'`; `hubDomain`; `hubFavicon`; `hubLoad` con `null`, JSON roto, `v` distinta, ítem sin nombre, color raro e ícono no `data:image/`; `hubCheck`; `hubClean`; `hubAdd` sin nombre o sin URL (y dos altas en el mismo instante); `hubMove` en los bordes; `hubRemove`. Luego `core/hub.js`, su `<script>` y su línea en `js/index.js`.
2. **Persistencia.** `services.storage.hub` (`load`/`save` de `pyl-hub`, captura el error de cuota). Humo: sin clave arranca con los 9.
3. **Columna de botones.** Humo: `#hb-root` va dentro de `#hb-rail`, que está entre el hero y la tarjeta de la cadena; 9 botones en el orden de `HUB_DEFAULTS`, todas `button` con "poner enlace"; un ítem con URL es `<a target="_blank" rel="noopener noreferrer">`. Luego la tarjeta en `index.html`, `ui.hub.grid/tile`, `app/hub.js` y `hub.css` (ícono con favicon/iniciales y detección `naturalWidth < 32`; columna en el margen derecho con `@media (min-width: 1680px)`).
4. **Editar: campos y validación.** Humo: "Editar" muestra `#hb-list` con 9 filas y cambia a "Listo"; clic en un acceso sin URL abre Editar con foco en su URL; "Usar ads.tiktok.com" llena el campo; URL `x.co` marca `.hb-bad` y "Listo" no contrae; "Cancelar" vuelve a lo guardado; "Listo" válido guarda y repinta.
5. **Editar: orden, borrar y agregar.** Humo: la papelera quita la fila (las filas no traen ↑ ni ↓: se reordena arrastrando) (confirmación simulada); "Agregar botón" sin URL avisa y con datos agrega al final; Cancelar vuelve a los 9 de fábrica.
5b. **Reubicar arrastrando.** Pruebas en Node de `hubOrder`. Humo: arrastrar un botón sobre otro cambia el orden y lo guarda; un clic sin mover sigue abriendo el editor; tras arrastrar no se abre; Esc cancela.
6. **Ícono propio.** "Subir ícono" (archivo) y Ctrl+V en la fila enfocada con `imageDataURL(file, 128, 0.85, tipo)` (PNG conserva la transparencia); "Quitar ícono". Revisión en el navegador (jsdom no carga imágenes).
7. **Revisión visual.** En el navegador: 7 temas, columna a la derecha en pantalla ancha, panel de edición, pantalla angosta (tarjeta en el flujo), favicons reales de los 9 sitios, sitio sin favicon cae en iniciales, sin internet caen las iniciales.
8. **Documentación.** Después del merge, `CLAUDE.md` y `README.md`: Centro de mando en Inicio, módulo `hub`, ids `#hb-`, clave `pyl-hub`, orden de `<script>` y `<link>` (`hub.css` antes de `themes.css`).

## Criterios de aceptación

**Vista normal**

- [x] En pantalla ancha (1680 px o más) el Centro de mando es una columna vertical alargada, con dos botones pequeños por fila (ícono arriba, nombre debajo), en el margen derecho, fuera del contenido, y me acompaña al bajar.
- [x] En pantalla más angosta la tarjeta queda bajo el hero y antes de "La cadena que decide todo", con los mismos botones pequeños.
- [x] Al primer uso trae los 9 accesos de la Parte 3, en ese orden, todos con borde punteado y "poner enlace".
- [x] Un acceso con URL abre esa URL en pestaña nueva.
- [x] Clic en un acceso sin URL abre el modo Editar con el cursor en su campo URL.
- [x] Con URL y sin ícono propio se ve el favicon del sitio, sin fondo blanco; si no carga o es el globo genérico de 16 px, se ven las iniciales.
- [x] Con ícono propio (PNG o JPG) se ve ese ícono sin fondo de color, aunque haya favicon; un PNG transparente no se ve con fondo negro.
- [x] Puedo mantener presionado un botón y arrastrarlo a otro lugar de la columna; al soltar se guarda el orden, y un clic normal sigue abriendo el enlace.
- [x] La columna no tapa ni empuja el contenido, y en pantalla angosta no hay desplazamiento horizontal.

**Modo Editar**

- [x] "Editar" abre la lista con una fila por acceso (panel flotante a la derecha en pantalla ancha); el botón dice "Listo" y aparece "Cancelar".
- [x] Puedo cambiar nombre (las iniciales se recalculan) y URL, y la vista previa de la fila cambia en un instante.
- [x] "Usar <dominio>" aparece solo en accesos de fábrica con la URL vacía y pone la URL sugerida.
- [x] Una URL que no empieza con `http://` o `https://` se marca en rojo y "Listo" no guarda ni contrae.
- [x] Puedo subir un ícono propio por archivo o con Ctrl+V en su fila, y quitarlo.
- [x] La papelera pregunta y quita el acceso. Las filas de edición no traen flechas: el orden se cambia arrastrando.
- [x] "Agregar botón" exige nombre y URL válida, y agrega el acceso al final.
- [x] "Cancelar" descarta todos los cambios del borrador.
- [x] Nada cambia en `pyl-hub` hasta tocar "Listo".

**Persistencia**

- [x] Tras "Listo" y recargar, la rejilla conserva nombres, URL, íconos y orden.
- [x] Un `pyl-hub` roto o de otra versión carga los 9 de fábrica sin errores en consola.
- [x] Si no hay espacio para guardar, avisa y no pierde el borrador.

**Calidad**

- [x] `core/hub.js` no toca el DOM; la UI no escribe reglas de validación.
- [x] Ids `#hb-` únicos en la página; ningún nombre `hub*`/`HUB_*` choca al aplanar `js/index.js`.
- [x] Ningún otro módulo cambia de comportamiento (el hero y la cadena de Inicio siguen igual).
- [x] Pasan `node tests/core.test.js`, `tests/smoke.test.js` y `node --check` de cada archivo tocado; consola limpia; `claves-pyl.json` coincide con `--claves`.
- [ ] Se ve bien en los 7 temas y en pantalla angosta (revisado en el navegador).

## Decisiones

- **Sí:** estilo con halo de luz (color de acento del tema) en "Cancelar", "Listo" (el principal, relleno), "Agregar botón", "Usar <dominio>", los botones de ícono y papelera, y los accesos con enlace (halo suave que sube al pasar el mouse). Pedido del usuario, 2026-11-17. "Editar" (antes de editar) no lleva halo: es un botón plano con fondo teñido del acento, para distinguirlo.
- **Sí:** columna vertical de botones pequeños en el margen derecho de la pantalla (pedido del usuario, 2026-11-17: la primera versión, una tarjeta a todo el ancho bajo el hero, no gustó y los botones eran demasiado grandes). Se ve apenas abro la app y me acompaña al bajar, sin tocar el hero ni la cadena.
- **Sí:** en pantalla angosta (menos de 1680 px) la tarjeta queda en el flujo bajo el hero, porque no hay margen libre. La columna lateral necesita unos 235 px a cada lado del contenido.
- **Sí:** en pantalla ancha, Editar abre un panel flotante a la derecha; 210 px no alcanzan para los campos.
- **No:** reemplazar la ilustración del hero ni ponerla al final de Inicio.
- **Sí:** 9 accesos de fábrica sin URL, con URL sugerida a un clic. La URL útil es la de mi cuenta, no la genérica.
- **Sí:** favicon de Google s2 (`sz=64`), con detección del globo genérico por `naturalWidth < 32`. Es el servicio más estable. El dominio de cada acceso viaja a Google: lo acepté (elección del usuario, 2026-11-17).
- **No:** DuckDuckGo ni `/favicon.ico` directo (baja resolución o muchos sitios sin ícono).
- **Sí:** ícono propio por archivo (PNG o JPG) o Ctrl+V, con prioridad sobre el favicon (pedido del usuario: si no encuentra el favicon, lo agrego yo). Se reutiliza `services.files.imageDataURL` de Guardado rápido, a 128 px, con un parámetro nuevo `type` para guardar PNG (conserva la transparencia; por defecto sigue JPEG y los otros módulos no cambian).
- **Sí:** iniciales sobre un fondo oscuro fijo como último respaldo. Funciona sin internet y en `file://`.
- **Sí:** editar en borrador; "Listo" guarda y "Cancelar" descarta.
- **No:** guardar al escribir. Un cambio a medias no debe romper la rejilla.
- **Sí:** URL obligatoria con `http://` o `https://`, sin completar el esquema solo.
- **Sí:** las iniciales siguen la regla literal (`'TikTok Ads'` → `TA`); la primera redacción de la spec decía `TT` y se contradecía con la regla.
- **Sí:** reubicar los botones arrastrándolos en la vista normal, con guardado al soltar (pedido del usuario, 2026-11-17). La primera versión lo descartaba por costo y por ser difícil de probar en jsdom; se hace con eventos de puntero y se prueba simulándolos. Es la única forma de reordenar: se quitaron las flechas ↑/↓ del modo Editar (pedido del usuario, 2026-11-17). A cambio, quien use solo teclado no puede reordenar.
- **No:** elegir el color de cada botón (pedido del usuario, 2026-11-17: subo el ícono en PNG o JPG y el botón se adapta a él). El favicon y el ícono propio se ven sin fondo, sobre el oscuro de la tarjeta.
- **No:** "Restaurar botones" (pedido del usuario, 2026-11-17: con "Agregar botón" basta; Cancelar descarta el borrador).
- **Sí:** clave propia `pyl-hub` con `v: 1`. Las imágenes pesan y así no inflan otra clave.
- **No:** "abrir en la app de escritorio" ni nota del celular: la app se usa en un solo PC y en el navegador.
- **Sí:** módulo propio `hub` que solo usa `shared/`. Inicio es HTML fijo y el entrenador (`trainer.js`) no se toca.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Google s2 responde un globo genérico en vez de error | Se trata `naturalWidth < 32` como "sin favicon" y se muestran las iniciales. |
| Sin internet o Google bloqueado | `error` en la imagen → iniciales. La tarjeta funciona igual. |
| `localStorage` lleno por íconos propios | Íconos a 128 px (pocos KB); al fallar el guardado se avisa y el borrador se conserva. |
| Una URL guardada con `javascript:` | `hubUrl` solo acepta `http://` y `https://`; `hubLoad` vacía cualquier otra. |
| En una pantalla de 1680 px o más la columna se ve pegada al contenido o cortada | Se ajusta el punto de corte (`min-width`) o el ancho de `.hb-rail` en `hub.css`. |
| Un favicon con el logo oscuro casi no se ve sobre el fondo oscuro | Se sube un ícono propio con "Subir ícono" (decisión del usuario: sin fondo blanco). |
| Ctrl+V pega en la fila equivocada | El pegado solo aplica a la fila que tiene el foco; sin fila enfocada no hace nada. |

## Lo que **no** está en esta spec

- Abrir en la app de escritorio y la nota de enlaces en el celular.
- Carpetas o grupos de accesos.
- Sincronizar, exportar o importar la lista.
- Otro servicio de favicons o guardar el favicon descargado.
- Centro de mando fuera de Inicio.
- Columna lateral en pantallas de menos de 1680 px (ahí queda en el flujo).
- Elegir color por botón y "Restaurar botones".

Cada uno, si llega, va en su propia spec.
