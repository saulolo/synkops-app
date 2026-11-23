# SPEC 23 — Mis tareas: chevron de subtareas sin contador

> **Estado:** Implementado
> **Depende de:** SPEC 19
> **Fecha:** 2026-11-23
> **Objetivo:** En las filas de Mis tareas con subtareas, reemplazar el chip «chevron + hechas/total» por un chevron solo, para ganar espacio para el texto de la tarea.

## Por qué existe esta spec

La tarjeta Mis tareas es angosta (210 px en la columna desde 1680 px) y el chip `.tk-sub-toggle` con «1/2» y su relleno le quita ancho al texto de la tarea. Además hay dos chevrons que hacen lo mismo: el del chip y el de las acciones flotantes (`.tk-toggle-subs`). El usuario pidió dejar solo el chevron para desplegar, sin contador.

## Alcance

**Dentro:**

- `.tk-sub-toggle` (en `ui/tasks.js#subChip`) pasa a ser un botón compacto **solo con el chevron**: sin el `<span>` «hechas/total», sin el estilo `--sub-progress` ni el relleno proporcional.
- Solo aparece si la tarea tiene subtareas (como hoy). Sin subtareas no hay chevron.
- Conserva: `aria-expanded`, la clase `.is-collapsed` (chevron girado −90°) y el clic que contrae/expande (`on.collapse(id)`).
- **Señal de completado:** con todas las subtareas hechas lleva `.is-complete` y el chevron se pinta en acento (`--b`); si no, color neutro (`--muted`, `--ink` en hover).
- `aria-label` y `title` siguen diciendo «Contraer/Expandir subtareas (N de M hechas)»: el número no se ve, pero lo leen el tooltip y el lector de pantalla.
- Se quita el chevron de las acciones flotantes (`.tk-toggle-subs` en `acts()`), para no repetir. Las acciones flotantes quedan «+ subtarea» y papelera.
- CSS en `css/modules/tasks.css`: `.tk-sub-toggle` sin padding de chip ni `background-image`/`background-size`, tamaño de botón de ícono (~20×20 px, redondo); se borran las reglas de `.tk-toggle-subs` y su mención en el bloque de `prefers-reduced-motion`.
- `app/tasks.js`/`ui/tasks.js`: el selector del clic (`.tk-sub-toggle, .tk-toggle-subs`) queda solo con `.tk-sub-toggle`.
- Pruebas en `tests/smoke.test.js` (bloque de subtareas de Mis tareas) actualizadas.
- `CLAUDE.md` (sección Mis tareas → Lista) actualizado: chevron `.tk-sub-toggle` sin «hechas/total» ni `--sub-progress`; acciones flotantes sin chevron.

**Fuera de la spec:**

- Cambios al núcleo (`core/tasks.js`) o al guardado `pyl-tasks`: no cambia ningún dato.
- El contador del día (`#tk-count`, anillo, barra `#tk-bar`) y el anillo de la franja de Inicio: se quedan igual.
- Clic simple en la fila para contraer (250 ms) y arrastre de subtareas: sin cambios.
- Otros ajustes de espacio de la tarjeta (tamaño de letra, badge de hora, acciones).

## Modelo de datos

Sin datos nuevos ni cambios de estructura. `task.collapsed` y `subtasks[].done` siguen igual.

## Plan de implementación

1. **UI** (`js/modules/tasks/ui/tasks.js`): `subChip` devuelve `<button class="tk-sub-toggle[ is-collapsed][ is-complete]" type="button" aria-expanded aria-label title>${ICON.chevronDown(12)}</button>` sin `<span>` ni `style`. `acts()` deja de recibir/pintar el chevron `.tk-toggle-subs`; ajustar sus llamadas. El delegado de clic usa solo `.tk-sub-toggle`. Actualizar el comentario de `subChip`.
2. **CSS** (`css/modules/tasks.css`): `.tk-sub-toggle` como botón de ícono redondo de 20 px, fondo transparente, `--muted`; hover con `--tk-hover` e `--ink`; `.is-complete` con color `--b`; conservar foco visible y giro de `.is-collapsed`. Borrar las reglas `.tk-toggle-subs` y quitarla del bloque `prefers-reduced-motion`.
3. **Pruebas** (`tests/smoke.test.js`): reemplazar las aserciones de texto «0/2», «1/2», «2/2» y `--sub-progress` por: el chip no tiene texto, no tiene `--sub-progress`, `aria-label` contiene «1 de 2 hechas», `.is-complete` solo con todas hechas; no existe `.tk-toggle-subs`; el chip contrae y expande (dos clics). Correr `node tests/core.test.js` y `smoke.test.js`.
4. **Docs**: actualizar `CLAUDE.md` (Mis tareas → Lista) y `README.md` si menciona el chip.

## Criterios de aceptación

- [x] Una tarea sin subtareas no muestra `.tk-sub-toggle`.
- [x] Una tarea con subtareas muestra `.tk-sub-toggle` cuyo `textContent` está vacío (solo el SVG del chevron).
- [x] `.tk-sub-toggle` no lleva `style` con `--sub-progress`.
- [x] Con 1 de 2 subtareas hechas, `aria-label` y `title` dicen «Contraer subtareas (1 de 2 hechas)» y no hay `.is-complete`.
- [x] Con 2 de 2 hechas, el chevron lleva `.is-complete`.
- [x] Clic en el chevron contrae (sin `.tk-subs`, `.is-collapsed`, `aria-expanded="false"`); otro clic expande.
- [x] Ninguna fila tiene `.tk-toggle-subs`; las acciones flotantes son «+ subtarea» y papelera.
- [x] `#tk-count` sigue contando tareas y subtareas («1 de 4 hechas»).
- [x] `node tests/core.test.js` y `smoke.test.js` pasan, consola limpia.
- [x] En el navegador (revisa el usuario): el chevron se ve compacto, en acento al completar, gira al contraer, y el texto de la tarea gana el ancho del contador; 7 temas sin choques.

## Decisiones

- **Se queda el chevron del chip, no el flotante:** siempre visible, así se ve que la tarea tiene subtareas sin pasar el mouse. El flotante se quita por duplicado. *(Elegido por el usuario.)*
- **Señal de completado por color, sin relleno ni número:** mínima señal de avance sin gastar ancho. Descartados: chevron neutro siempre y relleno proporcional. *(Elegido por el usuario.)*
- **El «N de M hechas» queda en `aria-label`/`title`:** no ocupa espacio y no se pierde para lector de pantalla ni tooltip. *(Elegido por el usuario.)*
- **No se toca el núcleo:** es un cambio solo de `ui` y CSS.

## Riesgos

- **Área de clic más chica:** el chevron solo es más fácil de fallar que el chip. Mitigación: botón de 20×20 px; el clic simple en la fila también contrae.
- **Pruebas que leen `.tk-toggle-subs`** (bloque de subtareas y quizá el arrastre) fallarán hasta actualizarlas: buscar todas las menciones en `smoke.test.js`.
