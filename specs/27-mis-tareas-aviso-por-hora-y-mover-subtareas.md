# SPEC 27 — Mis tareas: aviso sonoro por hora y mover subtareas entre tareas

> **Estado:** Aprobado
> **Depende de:** SPEC 19, SPEC 23, SPEC 24
> **Fecha:** 2026-11-24
> **Objetivo:** Portar a Mis tareas los dos cambios nuevos de My Sticky Notes: un aviso sonoro a cada hora en punto con tareas pendientes de hoy, que se enciende con un interruptor en el renglón del progreso, y soltar una subtarea arrastrada en otra tarea del mismo día.

## Por qué existe esta spec

Mis tareas (SPEC 19, 2026-11-20) es un port de My Sticky Notes (`C:\Personal-Dev\Proyectos_Personales\My_Sticky_Notes\my-sticky-notes-frontend`) hasta su SPEC 09. Después, My Sticky Notes sumó dos specs:

- **SPEC 10 (2026-11-23), orden manual de subtareas:** Synkops ya reordena subtareas dentro de su tarea (agregado a pedido en la SPEC 19). Lo nuevo es que una subtarea también puede **pasar a otra tarea del mismo día**.
- **SPEC 11 (2026-11-24), aviso sonoro por hora:** a cada `HH:00`, si hoy hay una tarea pendiente con hora `HH`, suena un mp3 propio y sale un aviso. Un interruptor con campana lo enciende o apaga (apagado por defecto).

El usuario trabaja en una tarea y pierde la noción del tiempo: quiere que al llegar la hora de la siguiente suene algo que le recuerde cambiar. Como en la SPEC 19, solo se lee My Sticky Notes para portar: las dos apps siguen independientes.

## Alcance

**Dentro:**

### A. Aviso sonoro por hora (Sticky SPEC 11)

- **Regla:** se evalúa a cada hora en punto (`HH:00`, hora local). Avisa si en el día de **hoy** (`tkDayKey(new Date())`) hay al menos una tarea con `done: false` y `hour === HH`. Las subtareas no cuentan (no tienen hora). Varias tareas a la misma hora dan **un solo** aviso. Mira las tareas de hoy sin importar la pestaña de día abierta (Ayer, Mañana, historial) ni la pestaña de Synkops que esté a la vista. El orden manual no influye.
- **Qué hace el aviso:**
  - Reproduce `sounds/tarea.mp3` una vez (copia de `src/renderer/assets/sounds/task-alert.mp3` de My Sticky Notes).
  - Muestra el `#toast` de la app (`ui.feedback.toast`, 5 s) con `Es hora: 14:00 · <texto 1> · <texto 2> · <texto 3>` y, si hay más de 3, `· …y N más`. Hora siempre con dos dígitos (`09:00`).
  - No cambia de pestaña ni de día, ni enfoca nada.
- **Avisos perdidos:** no se recuperan. Al disparar se comprueba que la hora local siga siendo la programada (Chrome retrasa los temporizadores de pestañas en segundo plano y el PC puede suspenderse): despierta 14:10 → avisa de las 14; despierta 15:02 → nada de las 14. Al cargar la página no avisa de horas ya pasadas.
- **Temporizador encadenado** en `app/tasks.js`, igual que el de medianoche: `setTimeout(msUntilNextHour(now))`, se reprograma tras cada disparo (nunca `setInterval`). Corre con la pestaña oculta. En `visibilitychange` (al volver a la pestaña) se reprograma desde la hora actual, sin avisar.
- **Interruptor** en el renglón del progreso `.tk-prog`, a la izquierda (donde estaba el anillo; el doble check `#tk-all` queda a la derecha): switch píldora `#tk-alert` y, a su derecha, el ícono `bell` de 14 px (existe en `PYL.ui.icons`) (pista neutra y botón blanco; encendido = pista en `--b`, botón a la derecha; transición 150 ms, sin transición con `prefers-reduced-motion`).
  - `<button type="button" role="switch" aria-checked>`, `aria-label` y `title`: «Activar aviso por hora» (apagado) / «Desactivar aviso por hora» (encendido). Clic, Espacio y Enter; foco visible como los demás botones de la tarjeta.
  - Siempre visible, en todas las pestañas de día, aunque el día no tenga tareas.
  - **Vista previa:** al encenderlo suena el mp3 una vez (sin `#toast`). Al apagarlo no suena nada.
  - Cabe en la columna de 210 px (el renglón ya no lleva «N de M hechas» ni el anillo: ver C).
- **Audio:** `<audio id="tk-audio" src="sounds/tarea.mp3" preload="auto">` en `index.html`, junto a `#tk-root`. Mismo trato que `#mw-audio` de Cortes: si el `<audio>` dispara `error` (falta el mp3) no se vuelve a intentar; un `play()` rechazado (Chrome bloquea el sonido si no hubo ningún clic desde que cargó la página) se ignora. El `#toast` sale igual aunque no suene.
- **Núcleo** (`core/tasks.js`, puro, reloj y día inyectados): `tkDueAlert(note, today, hour)`, `tkMsToNextHour(now)`, `tkAlertText(hour, tasks)` y la constante `TK_ALERT_MAX` (3).
- **Guardado:** campo opcional `alerts` en `pyl-tasks`: `{ v: 1, note, alerts: true }`. Ausente o no booleano → `false`. Sin subir `TK_VERSION`.

### B. Mover una subtarea a otra tarea del mismo día (Sticky SPEC 10)

- El arrastre de subtareas de `app/tasks.js` (eventos de puntero, umbral 4 px, FLIP, autoscroll, Esc/`pointercancel`/`lostpointercapture` cancelan) deja de estar limitado a su tarea:
  - Mientras el puntero esté dentro del grupo de su tarea, se reordena entre sus hermanas como hoy (la fila puede salirse media fila para llegar a los extremos).
  - Sobre las subtareas visibles de **otra tarea** del día, el hueco aparece entre ellas.
  - Sobre la fila de una tarea **sin subtareas o contraída**, la subtarea pasa a ser su última subtarea y esa tarea queda expandida.
  - Mientras se arrastra, la fila se pinta dentro del grupo destino (el DOM se reordena en vivo).
- Solo entre tareas del día visible (Ayer, Hoy, Mañana o un día del historial). No cruza días ni se convierte en tarea.
- Conserva `id`, `text` y `done`. Los chevrons `.tk-sub-toggle` de origen y destino se recalculan (incluido `.is-complete` y el «N de M hechas» de `aria-label`/`title`). Si la tarea origen se queda sin subtareas, pierde el chevron.
- **Cuándo se levanta una subtarea:** con 2 o más subtareas en su tarea (como hoy) **o** si el día tiene 2 o más tareas (aunque sea la única subtarea). Con una sola subtarea en un día de una sola tarea no se levanta.
- Al soltar se guarda en una sola operación (`tkMoveSubTo`); Esc o cancelar devuelven todo a su sitio, también la subtarea que ya se pintó en otro grupo y la expansión temporal de la tarea destino. Soltar en el mismo sitio no guarda.
- Sin cambios: arrastrar la fila de una tarea sigue llevándose sus subtareas; soltar no dispara el clic que contrae/expande (250 ms) ni marca nada; check, papelera y doble clic para editar no inician arrastre.

### C. Renglón del progreso sin contador ni anillo (agregado durante la implementación, a pedido del usuario)

- Se quitan de `.tk-prog` el texto «N de M hechas» (`#tk-count`) y el anillo de progreso (`svg.tk-ring`): la franja de Inicio ya muestra el «Pulso de tareas» (SPEC 22), más completo.
- Se quedan la barra de progreso `#tk-bar` (debajo del renglón, avanza con lo hecho del día visible), el switch `#tk-alert` a la izquierda del renglón y el doble check `#tk-all` a la derecha.
- `ui.tasks.progress` deja de pintar el texto y el anillo; `core.tkProgress` no cambia (lo usan la barra, `#tk-all` y la franja de Inicio).

### Común

- Pruebas en `tests/core.test.js` y `tests/smoke.test.js`.
- `CLAUDE.md` (Mis tareas: interruptor, aviso, `tkMoveSubTo`, campo `alerts`, `#tk-alert`, `#tk-audio`, `sounds/tarea.mp3`) y `README.md`.

**Fuera de la spec:**

- Notificación del sistema (Notification API): en `file://` Chrome la niega.
- Minutos en la hora de las tareas, avisos antes de la hora, repetir o posponer.
- Avisos de otros días o de subtareas.
- Elegir sonido o volumen desde la app.
- Recuperar avisos perdidos.
- Cambiar a Hoy o abrir Inicio al avisar.
- Evitar que suene dos veces con dos pestañas de Synkops abiertas.
- Mover subtareas entre días, convertir subtarea ↔ tarea, reordenar con teclado.
- Leer, importar o sincronizar las tareas o el `note.json` de My Sticky Notes.

## Modelo de datos

### Guardado `pyl-tasks`

```json
{ "v": 1, "note": { "days": { "2026-11-24": [ … ] }, "lastCarryOver": "2026-11-24" }, "alerts": true }
```

- `alerts` opcional: ausente o no booleano → `false`. No invalida el archivo (mismo trato que el `collapsed` viejo).
- `tkLoad(raw, today)` → `{ ok, note, collapsed, alerts }`.
- `TK_VERSION` sigue en 1.

### Núcleo `js/modules/tasks/core/tasks.js` (`PYL.core.tasks`)

- `TK_ALERT_MAX = 3`.
- `tkDueAlert(note, today, hour)` → tareas de `today` con `done: false` y `hour === hour`, en el orden de la lista; `[]` si no hay.
- `tkMsToNextHour(now)` → milisegundos hasta el próximo `HH:00:00.000` local (siempre > 0; a `14:00:00.000` devuelve 1 h).
- `tkAlertText(hour, tasks)` → `'Es hora: 14:00 · A · B · C · …y 2 más'`.
- `tkMoveSubTo(note, fromTaskId, subId, toTaskId, toIndex)` → quita la subtarea de `fromTaskId` y la inserta en `toTaskId` en `toIndex` (limitado a `[0, m]`, `m` = subtareas del destino); el destino queda con `collapsed` fuera (expandido). Devuelve **la misma nota** si falta la tarea origen, la destino o la subtarea, si `toIndex` no es entero, si `fromTaskId === toTaskId` (para eso está `tkMoveSub`) o si están en días distintos. No muta la nota original ni toca otras tareas.

### Estado `app.state.tasks`

Se suma `alerts` (booleano, se guarda). El temporizador del aviso vive en el cierre de `app/tasks.js` (no en el estado), como `midnightTimer`.

### Archivos

- `sounds/tarea.mp3` (nuevo, copia del de My Sticky Notes).
- `index.html`: `<audio id="tk-audio">`.
- `js/modules/tasks/core/tasks.js`, `ui/tasks.js` (`progress` pinta el switch; o una función `alertSwitch(root, on)`), `app/tasks.js` (switch, audio, temporizador, arrastre entre tareas).
- `css/modules/tasks.css` (switch, grupo destino del arrastre, renglón del progreso sin contador ni anillo).
- `tests/core.test.js`, `tests/smoke.test.js`, `tests/fixtures/claves-pyl.json` si cambian las claves de `PYL.*`.
- `CLAUDE.md`, `README.md`.

## Plan de implementación

1. **Núcleo del aviso.** `TK_ALERT_MAX`, `tkDueAlert`, `tkMsToNextHour`, `tkAlertText` y `alerts` en `tkLoad`. Pruebas en `core.test.js`: solo hoy, solo pendientes, varias a la misma hora, otra hora, día sin tareas, orden de la lista; `tkMsToNextHour` a `13:59:59.999` (1 ms), `14:00:00.000` (1 h) y a mitad de hora; texto con 1, 3 y 5 tareas (`…y 2 más`), hora `9` → `09:00`; `tkLoad` con `alerts: true`, ausente y `"sí"` (→ `false`, `ok: true`). La app no cambia de aspecto.
2. **Switch y sonido.** Copiar el mp3 a `sounds/tarea.mp3`, `<audio id="tk-audio">`, switch `#tk-alert` en `.tk-prog`, estilos, cableado en `app/tasks.js` (leer `alerts`, guardar al cambiar con el guardado de 300 ms, vista previa al encender, error del audio). Humo: el switch existe con el día vacío y en las tres pestañas; clic alterna `aria-checked`, `title` y `aria-label`; Espacio y Enter también; encender llama `play()` (audio simulado) y apagar no; `pyl-tasks` guarda `alerts` (con `localStorage` simulado); recargar con `alerts: true` arranca encendido.
3. **Aviso por hora.** Temporizador encadenado con `tkMsToNextHour`, comprobación de la hora al disparar, `visibilitychange`. Humo con `Date` y `setTimeout` simulados: a las `14:00` con el switch encendido y una tarea pendiente de hoy a las 14 → `play()` y `#toast` con «Es hora: 14:00 · …»; tarea hecha, tarea de mañana o switch apagado → nada; disparo a las `15:02` de un temporizador de las 14 → nada; al cargar a las `14:30` no avisa; con la pestaña de día en Mañana avisa por las de hoy; tras disparar se reprograma.
4. **Mover subtarea a otra tarea.** `tkMoveSubTo` con pruebas de núcleo (destino al principio, en medio y al final, `toIndex` fuera de rango, destino contraído queda expandido, conserva `done`, origen queda sin subtareas, misma tarea, otro día, ids inexistentes → misma nota, no muta). Después el arrastre en `app/tasks.js`: destino bajo el puntero, pintado en vivo en el grupo destino, regla de cuándo se levanta, cancelación que devuelve el DOM y la expansión, guardado con `tkMoveSubTo`. Humo con punteros simulados: pasar a una tarea con subtareas, a una sin subtareas y a una contraída (queda expandida); la única subtarea de una tarea pasa si el día tiene 2 tareas y no se levanta con una sola tarea; Esc devuelve todo y no guarda; chevrons de origen y destino al día; el reordenamiento dentro de la tarea y el arrastre de tareas siguen pasando sus pruebas.
5. **Renglón del progreso sin contador ni anillo.** Quitar `#tk-count` y `svg.tk-ring` del esqueleto, de `ui.tasks.progress` y sus estilos; `#tk-alert` queda a la izquierda y `#tk-all` a la derecha. Ajustar las pruebas de humo que leían `#tk-count` para que lean la barra (`#tk-bar`) o el estado, y probar que ya no existen.
6. **Cierre.** `node tests/core.test.js` y `smoke.test.js` (consola limpia), `claves-pyl.json` si hace falta, `CLAUDE.md` y `README.md`.

## Criterios de aceptación

**Aviso por hora**

- [x] A las `HH:00`, con el switch encendido y una tarea de hoy no hecha con hora `HH`, se llama `play()` del `#tk-audio` una vez y el `#toast` dice `Es hora: HH:00 · <texto>`.
- [x] Con 5 tareas pendientes a la misma hora suena una sola vez y el `#toast` lista 3 textos más `…y 2 más`.
- [x] Tareas hechas, tareas de otros días y subtareas no producen aviso.
- [x] Con la pestaña de día en Ayer, Mañana o el historial, el aviso por las tareas de hoy sale igual.
- [x] Con el switch apagado no suena nada ni sale `#toast`.
- [x] Al cargar la página no hay aviso de horas ya pasadas.
- [x] Un disparo que llega cuando la hora local ya cambió no avisa.
- [x] Tras cada disparo el temporizador se reprograma para la siguiente hora en punto.
- [x] El switch `#tk-alert` aparece a la izquierda del renglón del progreso en las tres pestañas de día y en el historial, también con el día vacío.
- [x] Encender el switch reproduce el mp3 una vez sin `#toast`; apagarlo no.
- [x] El switch responde a clic, Espacio y Enter; `aria-checked`, `title` y `aria-label` cambian según el estado. *(Clic y atributos verificados en jsdom; Espacio y Enter los da el `<button>` nativo y jsdom no los simula: revisar en el navegador.)*
- [x] `pyl-tasks` guarda `alerts`; al recargar el switch conserva su estado; un `pyl-tasks` sin `alerts` (o con un valor no booleano) arranca apagado sin perder las tareas.
- [x] Sin `sounds/tarea.mp3`, la página no lanza errores y el `#toast` del aviso sale igual.

**Mover subtareas**

- [x] Una subtarea arrastrada sobre las subtareas de otra tarea del mismo día queda entre ellas al soltar.
- [x] Soltada sobre una tarea sin subtareas o contraída, queda como su última subtarea y esa tarea queda expandida.
- [x] Conserva su texto y su `done`; los chevrons de origen y destino reflejan sus nuevas cuentas; la tarea origen sin subtareas pierde el chevron.
- [x] No puede pasar a otro día ni convertirse en tarea.
- [x] La única subtarea de una tarea se levanta si el día tiene 2 o más tareas, y no se levanta si el día tiene una sola.
- [x] Esc durante el arrastre devuelve la subtarea a su tarea y no guarda nada.
- [x] Reordenar dentro de la propia tarea y arrastrar tareas siguen funcionando como antes.
- [x] `tkMoveSubTo` no muta la nota y devuelve la misma nota cuando no cambia nada.

**Renglón del progreso**

- [x] La tarjeta de Mis tareas ya no muestra «N de M hechas» (`#tk-count`) ni el anillo (`.tk-ring`).
- [x] La barra `#tk-bar` sigue avanzando con lo hecho del día visible; `#tk-alert` queda a la izquierda del renglón y `#tk-all` a la derecha.
- [x] El «Pulso de tareas» de la franja de Inicio no cambia.

**General**

- [x] `node tests/core.test.js` y `smoke.test.js` pasan, consola limpia.
- [x] En el navegador (revisa el usuario): el switch cabe en la columna de 210 px sin desbordar y se ve bien en los 7 temas; suena a la hora en punto con la pestaña en segundo plano; el arrastre a otra tarea se siente fluido.

## Decisiones

- **Sí: las dos novedades en una sola spec** (aviso y mover subtareas), con plan en pasos commiteables. *(Elegido por el usuario.)*
- **Sí: sonido + `#toast` de la app.** **No:** Notification API (Chrome la niega en `file://`) ni solo sonido. *(Elegido por el usuario.)*
- **Sí: switch en el renglón del progreso, a la izquierda** (donde estaba el anillo), con el doble check a la derecha. My Sticky Notes lo pone a la derecha; aquí se movió a pedido del usuario al quitar el contador y el anillo, para que el renglón quede ordenado.
- **Sí: quitar «N de M hechas» y el anillo del renglón del progreso; queda solo la barra.** El «Pulso de tareas» de Inicio ya lo muestra más completo. *(Pedido por el usuario durante la implementación, antes del cierre.)* **No:** cabecera junto al engranaje ni dentro de su menú. *(Elegido por el usuario.)*
- **Sí: campo `alerts` en `pyl-tasks` sin subir versión** y copiar el mp3 de My Sticky Notes a `sounds/tarea.mp3`. **No:** clave propia ni reusar `sounds/corte.mp3` (no se distinguiría del aviso de Cortes). *(Elegido por el usuario.)*
- **Sí: `alerts` no booleano → `false`** sin invalidar `pyl-tasks`. My Sticky Notes invalida el archivo; aquí se perderían las tareas por una preferencia (mismo trato que el `collapsed` viejo).
- **Sí: mismas reglas que My Sticky Notes** para el aviso (pendientes de hoy, uno por hora, sin recuperar los perdidos, vista previa al encender, apagado por defecto) y para mover subtareas (mismo día, destino expandido, conserva `done`).
- **Sí: nombres con prefijo `tk`** (`tkDueAlert`, `tkMsToNextHour`, `tkAlertText`, `tkMoveSubTo`) para no chocar al aplanar en `js/index.js`.
- **No: cambiar de pestaña o de día al avisar**: el `#toast` no es clicable y moverse solo interrumpiría lo que se está haciendo.

## Riesgos

- **Chrome retrasa los temporizadores de pestañas ocultas** (hasta ~1 min con el ahorro intensivo): el aviso puede llegar un poco tarde. Mitigación: se comprueba la hora local al disparar y se reprograma con `tkMsToNextHour`, nunca con un intervalo fijo.
- **Chrome bloquea el sonido si no hubo ningún clic desde que se cargó la página:** `play()` rechazado se ignora y el `#toast` sale igual. Se documenta en `README.md`.
- **El switch no cabe en 210 px:** el texto `#tk-count` lleva elipsis; se revisa en el navegador.
- **El arrastre entre tareas rompe el actual** (el nodo de la tarea se reusa entre repintados y la cancelación hoy devuelve las subtareas a mano): repetir las pruebas de humo existentes de arrastre de tareas y subtareas; la cancelación debe devolver también el nodo pintado en otro grupo y la expansión temporal del destino.
- **Dos pestañas de Synkops abiertas suenan dos veces:** queda fuera de esta spec.
