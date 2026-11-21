# SPEC 20 — Reloj de pared en el margen izquierdo de la barra superior

> **Estado:** Implementado
> **Depende de:** SPEC 17, SPEC 19
> **Fecha:** 2026-11-20
> **Objetivo:** Llenar el margen izquierdo vacío de la barra superior, en pantallas de 1680 px o más, con un reloj analógico de pared que sigue el tema y muestra al lado el día y la fecha. Durante la implementación se sumó, a pedido del usuario: la marca sale de la barra (la píldora del producto activo y el tema se reacomodan sobre las pestañas) y el título «Synkops» de Inicio crece y lleva un pulso subrayado.

## Por qué existe esta spec

La barra superior (`header.top` → `.top-in`) mide como máximo 1240 px y se centra. En pantalla ancha quedan dos franjas vacías a los lados que cubren sus dos filas (marca y pestañas). Desde 1680 px, justo debajo de la franja izquierda vive la columna de Mis tareas (`#tk-rail`, SPEC 19). El usuario quiere algo visual en esa franja izquierda: un reloj circular de pared. De paso se resuelve el pendiente de la SPEC 19 de mostrar la fecha del día en otra parte.

Al ver el reloj, el usuario pidió además que la marca de la barra («Synkops · Mi operación en sincronía» y su logo animado) dejara de repetirse: el nombre de la app ya está en la tarjeta principal de Inicio, que pasa a ser el lugar de la marca (título más grande y el pulso como subrayado).

## Alcance

**Dentro:**

- Módulo nuevo `clock` (`js/modules/clock/{core,ui,app}`) con estilos en `css/modules/clock.css`. Prefijo de ids y clases `#ck-`/`.ck-`. Solo usa `shared/`.
- Bloque `<div class="ck-rail" id="ck-root" role="img">` dentro de `.top-in`, en el margen izquierdo de la barra.
- Solo se ve **desde 1680 px** (el mismo corte de Mis tareas y el Centro de mando). Por debajo, `display:none`.
- Se ve **en todas las pestañas** (la barra es global).
- Posición: absoluto respecto a `.top-in` (que pasa a `position:relative`), alto completo de la barra, ancho 210 px, alineado con la columna de Mis tareas (borde derecho 14 px a la izquierda del borde del contenido, como `.tk-rail`). Reloj y texto centrados en vertical.
- **Reloj analógico** SVG (`viewBox="0 0 100 100"`), de unos 84 px de diámetro:
  - Esfera circular con fondo de tarjeta (`--card`) y borde suave (`--line-2`), sombra leve.
  - 12 rayitas de hora; las de 12, 3, 6 y 9 se reemplazan por los números `12`, `3`, `6` y `9` en el color del acento (`--b`).
  - Aguja de horas y de minutos en color de texto (`--ink`), puntas redondas.
  - Segundero fino en el acento (`--b`) que gira **continuo** (sin saltos).
  - Punto central en el acento.
- **Texto al lado** (a la derecha del reloj): `#ck-day` con el día completo («Viernes», el CSS lo pone en mayúsculas) y `#ck-date` con la fecha corta («20 nov»). No hay hora en números.
- Sigue el tema: solo tokens (`--card`, `--line-2`, `--ink`, `--soft`, `--b`), se ve bien en los 7 temas sin reglas en `themes.css`.
- Accesibilidad: `#ck-root` lleva `role="img"` y `aria-label` (y `title`) con la fecha y la hora completas: «Viernes, 20 nov · 10:42 a. m.». Se actualiza cada minuto. El SVG y el texto van con `aria-hidden="true"`.
- Solo decorativo: no hace nada al hacer clic.
- `prefers-reduced-motion`: el segundero se oculta y las agujas de hora y minuto se actualizan una vez por minuto (sin giro continuo).
- Rendimiento: el bucle de pintado (`requestAnimationFrame`) solo corre con la pestaña del navegador visible (`document.hidden === false`) y la pantalla de 1680 px o más (`matchMedia('(min-width: 1680px)')`). Escucha `visibilitychange` y el `change` del `matchMedia` para pausar o reanudar. Al cargar pinta una vez aunque esté oculto.
- Medianoche: día y fecha se recalculan en cada pintada y solo se reescriben si cambian.

**Dentro, agregado a pedido del usuario durante la implementación:**

- **Barra sin marca:** sale todo `.brand` de `header.top` (el logo animado `.brand-mark` de la SPEC 17, «Synkops» y «Mi operación en sincronía») con sus estilos de `base.css` (`.brand`, `.brand-mark`, `bm-beat`, `bm-run`). El nombre queda en el título de Inicio y en `<title>`; el favicon no cambia.
  - Píldora, tema y pestañas van en un contenedor nuevo `<div class="top-row">` dentro de `.top-in` (que deja de ser flex y queda como caja con ancho máximo y padding). `.top-row` es una rejilla `1fr auto 1fr` con `width:fit-content` y `max-width:100%`: mide lo mismo que las pestañas.
  - La píldora del producto activo (`#pillProd`, «Activo: … · zonas de CPA») va centrada arriba (columna 2), el tema (`.theme-pick`) a ras del borde derecho de las pestañas (columna 3, `justify-self:end`) y las pestañas (`#tabs`) abajo, a lo ancho de las tres columnas, con `min-width:0` para que sigan deslizándose en pantallas angostas.
  - Ubicación explícita en la rejilla: cuando la píldora se oculta (menos de 900 px) el tema no se corre.
  - El reloj (`#ck-root`, absoluto sobre `.top-in`) queda fuera de `.top-row`, primer hijo de `.top-in`: su alineación con Mis tareas no depende de la fila.
- **Título de Inicio con pulso subrayado:** el `<h1>` «Synkops» de la tarjeta principal (`#v-dash .hero`) crece de 38 a 56 px (`letter-spacing:-.035em`; bajo 900 px, de 30 a 42 px) y lleva debajo una línea tipo electrocardiograma.
  - Dentro del `<h1>`, después del texto: `<svg class="hero-pulse" aria-hidden="true">` (`viewBox="0 0 200 18"`, `preserveAspectRatio="none"`, trazos con `vector-effect:non-scaling-stroke`). El título se sigue leyendo «Synkops». `.hero h1` pasa a `inline-flex` en columna: la línea mide lo mismo que la palabra (también bajo 900 px), 16 px de alto y 6 px de separación.
  - Trazo: línea plana con un pico de pulso en el primer tercio, en el degradado del acento (`--b` → `--b2`, `linearGradient#home-pulse-g` con `stop-color` por estilo; el `stroke` va como atributo del SVG y no en el CSS, porque una `url(#…)` en una hoja externa puede no resolverse con `file://`).
  - Dos trazos: `.hp-base` tenue (40 %) y `.hp-run` (`pathLength="100"`, `stroke-dasharray:16 100`) que la recorre de izquierda a derecha cada 2,4 s con brillo `rgba(var(--b-rgb),.85)`; 1,2 s con el cursor sobre el título. Con `prefers-reduced-motion` no hay luz y la línea queda al 80 %.
  - Estilos en `trainer.css`, junto a `.hero h1`.

**Fuera de la spec (otras specs):**

- Algo en el margen derecho de la barra (encima del Centro de mando).
- Mostrar el reloj por debajo de 1680 px o en versión compacta.
- Hora digital, alarmas, cronómetro, zona horaria distinta a la del PC.
- Clic en el reloj (abrir Inicio u otra acción).
- Progreso de Mis tareas o frase del día en la barra.
- Sonido de tic-tac.
- Mover `tkShortDate` de Mis tareas a `shared/` (el reloj tiene sus propios nombres de días y meses).

## Modelo de datos

No hay estado guardado ni persistencia. No toca `localStorage`.

### `core/clock.js` (`PYL.core.clock`, prefijo `ck`/`CK_` para no chocar al aplanar en `js/index.js`)

```js
CK_DAYS    // ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
CK_MONTHS  // ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

ckAngles(date) // → { h, m, s } en grados, 0 = las 12, sentido horario
//   h = (horas % 12) * 30 + minutos * 0.5 + segundos / 120
//   m = minutos * 6 + segundos * 0.1
//   s = segundos * 6 + milisegundos * 0.006
ckDay(date)    // → 'Viernes'
ckDate(date)   // → '20 nov'
ckTime(date)   // → '10:42 a. m.' · '3:05 p. m.' · '12:05 a. m.' (12 horas, minutos con dos dígitos)
ckLabel(date)  // → 'Viernes, 20 nov · 10:42 a. m.'
```

Mismos nombres de días y meses que `DAYS`/`MONTHS` de `js/modules/tasks/core/tasks.js`, copiados a propósito para que `clock` no dependa de `tasks`.

### `ui/clock.js` (`PYL.ui.clock`)

- `face(node)`: arma dentro de `node` el SVG de la esfera (rayitas, números, agujas `.ck-h`, `.ck-m`, `.ck-s` y el punto central) y el texto (`#ck-day`, `#ck-date`). No guarda estado.
- `paint(node, { angles, day, date, label })`: pone `transform="rotate(<g> 50 50)"` en cada aguja y escribe los textos y el `aria-label`/`title` solo si cambiaron.

### `app/clock.js` (`PYL.app.clock`)

- `tick(date)`: calcula con el núcleo y llama a `ui.clock.paint`. Se publica para las pruebas (con `Date` simulado).
- Arranque: `face`, un `tick(new Date())` y el bucle `requestAnimationFrame` según visibilidad, ancho y `prefers-reduced-motion` (con reducción: un `setTimeout` al siguiente minuto exacto en vez del bucle).

### Ids y clases nuevos

- `#ck-root`, `#ck-face`, `#ck-day`, `#ck-date`; `.ck-rail`, `.ck-face`, `.ck-dial`, `.ck-h`, `.ck-m`, `.ck-s`, `.ck-pin`, `.ck-tick`, `.ck-num`, `.ck-text`, `.ck-day`, `.ck-date`.
- Barra y título: `.top-row`; `.hero-pulse`, `.hp-base`, `.hp-run`, `#home-pulse-g` (degradado del pulso).
- Ya no existen: `.brand`, `.brand-mark`, `.bm-base`, `.bm-run` y los `@keyframes` `bm-beat`/`bm-run`.

### Archivos que cambian

- Nuevos: `js/modules/clock/core/clock.js`, `js/modules/clock/ui/clock.js`, `js/modules/clock/app/clock.js`, `css/modules/clock.css`.
- `index.html`: el `<div id="ck-root">` dentro de `.top-in` (primer hijo); `<script>` de cada capa en su lugar (después de los de `tasks`); `<link>` de `clock.css` después de `tasks.css` y antes de `themes.css`.
- `css/base.css`: `.top-in{position:relative}` (y deja de ser flex), `.top-row` y su rejilla; se borran `.brand` y `.brand-mark`.
- `js/index.js`: agregar `core/clock.js` a la lista (mismo orden que los `<script>`).
- `tests/core.test.js`, `tests/smoke.test.js`, `tests/fixtures/claves-pyl.json` (claves nuevas `PYL.core.clock`, `PYL.ui.clock`, `PYL.app.clock`).
- Barra y título: `index.html` (sale `.brand`; píldora, tema y pestañas dentro de `.top-row`; `svg.hero-pulse` en el `<h1>` del hero), `css/modules/trainer.css` (título de 56/42 px y pulso subrayado) y la prueba `1a` de `tests/smoke.test.js`.
- Después del merge: `CLAUDE.md` y `README.md`. En `CLAUDE.md` además: quitar la descripción del logo de la barra (SPEC 17), describir `.top-row` y el pulso subrayado, y corregir el comando de `--claves` (redirigir directo a `tests/fixtures/claves-pyl.json` vacía el archivo antes de que la prueba lo lea: generar en un temporal y copiar).

## Plan de implementación

Pruebas primero: se escriben, fallan y luego se hace el código.

1. **Núcleo.** Pruebas en Node de `ckAngles` (3:00:00 → `{ h: 90, m: 0, s: 0 }`; 12:00:00 → `{ h: 0, m: 0, s: 0 }`; 10:42:30 → `{ h: 321.25, m: 255, s: 180 }`; 23:59:59 → `h` 359.99…), `ckDay`, `ckDate`, `ckTime` (10:42 → `10:42 a. m.`, 15:05 → `3:05 p. m.`, 00:05 → `12:05 a. m.`, 12:00 → `12:00 p. m.`) y `ckLabel`. Luego `core/clock.js` y su línea en `js/index.js`.
2. **Esfera.** Prueba de humo (jsdom): `#ck-root` está dentro de `header.top .top-in`, con `role="img"`; el SVG trae 8 rayitas (`.ck-tick`), los números `12`, `3`, `6`, `9` (`.ck-num`) y las tres agujas. Luego `ui/clock.js`, `app/clock.js` (solo `face` y un `tick`), el `<div>` y los `<script>` en `index.html`, y `claves-pyl.json`.
3. **Pintado con hora simulada.** Prueba de humo con `Date` simulado en viernes 20 nov 2026 10:42:30: `#ck-day` = `Viernes`, `#ck-date` = `20 nov`, `aria-label` = `Viernes, 20 nov · 10:42 a. m.` y las agujas con `rotate(321.25 50 50)`, `rotate(255 50 50)` y `rotate(180 50 50)`. Luego `paint` y `tick`.
4. **Estilos.** `css/modules/clock.css` (posición en el margen, corte de 1680 px, colores por tokens, mayúsculas del día, segundero oculto con `prefers-reduced-motion`) y `.top-in{position:relative}` en `base.css`. Revisión visual en el navegador.
5. **Bucle.** `requestAnimationFrame` con pausa por `visibilitychange` y `matchMedia`; `setTimeout` por minuto con reducción de movimiento. Prueba de humo (`ckTest`): página aparte con `matchMedia`, `requestAnimationFrame`, `document.hidden` y `Date` simulados; cada fotograma pinta la hora real, se detiene con la pestaña oculta o la pantalla angosta y al volver pinta la hora del momento; arrancar angosto u oculto pinta una vez y no corre el bucle; con reducción de movimiento los fotogramas no pintan; el clic no hace nada. Consola limpia.
6. **Barra sin marca y título de Inicio** (agregado durante la implementación). Prueba de humo: no existen `.brand` ni `.brand-mark`; la barra trae el reloj y `.top-row`, y esta, en orden, píldora del producto activo, tema y pestañas; el `<h1>` del hero trae `svg.hero-pulse` después del texto, con `aria-hidden`, dos trazos iguales (`.hp-base` y `.hp-run` con `pathLength="100"`) y el degradado `--b` → `--b2`; su texto sigue siendo «Synkops». Luego `index.html` y los estilos. Revisión visual en el navegador.
7. **Documentación.** Después del merge, `CLAUDE.md` y `README.md`.

## Criterios de aceptación

Verificado el 2026-11-20. Entre paréntesis, cómo se comprobó.

- [x] Con la ventana de 1680 px o más, el margen izquierdo de la barra muestra el reloj circular y, a su derecha, el día en mayúsculas y la fecha corta. (Revisado por el usuario en el navegador; `clock.css`: `display:flex` desde 1680 px, `text-transform:uppercase` en `.ck-day`.)
- [x] Por debajo de 1680 px el reloj no se ve; la barra queda solo con píldora, tema y pestañas. (`clock.css`: `.ck-rail{display:none}` fuera del `@media (min-width:1680px)`; el texto del criterio se ajustó porque la barra cambió a propósito en esta spec.)
- [x] El reloj se ve igual en las 11 pestañas. (Vive en `header.top`, fuera de las vistas `.view` que alterna `nav.js`; la prueba de humo lo exige dentro de `header.top .top-in` y recorre las 11 pestañas.)
- [x] El reloj queda alineado en vertical con la columna de Mis tareas de debajo (mismo ancho de 210 px y mismo borde derecho). (Mismo cálculo que `.tk-rail`: `.top-in` y `main.main` miden 1240 px con 24 px de padding lateral; `right:calc(100% - 24px + 14px)` y `width:210px`. Revisado por el usuario.)
- [x] La esfera trae los números 12, 3, 6 y 9 y rayitas en las otras 8 horas. (Prueba de humo: 8 `.ck-tick` y `.ck-num` = 12, 3, 6, 9.)
- [x] Las agujas marcan la hora del PC; el segundero gira continuo. (Pruebas de `ckAngles` con milisegundos y `ckTest`: cada fotograma pinta `new Date()`. Revisado por el usuario.)
- [x] Con «reducir movimiento» no hay segundero y las agujas cambian una vez por minuto. (Código listo y `ckTest` comprueba que los fotogramas no pintan; **falta verlo en el navegador** con la emulación `prefers-reduced-motion: reduce` de DevTools → Rendering.)
- [x] En los 7 temas los colores salen del tema (esfera de tarjeta, agujas en color de texto, números y segundero en el acento). (`clock.css` solo usa `--card`, `--line-2`, `--soft`, `--ink` y `--b`, más la sombra neutra `rgba(0,0,0,.22)`; ninguna regla en `themes.css`.)
- [x] El `aria-label` de `#ck-root` dice la fecha y la hora completas («Viernes, 20 nov · 10:42 a. m.»). (Prueba de humo con `Date` simulado; también `title`.)
- [x] Al pasar la medianoche con la app abierta, el día y la fecha cambian solos. (Prueba de humo: `tick` a las 00:00:05 del 21 nov da «Sábado», «21 nov».)
- [x] Hacer clic en el reloj no hace nada. (`ckTest`: el clic no cambia nada; `pointer-events:none` en `.ck-rail`; no hay manejadores de clic.)
- [x] Con la pestaña del navegador en segundo plano, el bucle de pintado se detiene y al volver las agujas muestran la hora correcta. (`ckTest` con `document.hidden` y `visibilitychange` simulados.)
- [x] Pasan `node tests/core.test.js`, `tests/smoke.test.js` y `node --check` de los tres archivos de `js/modules/clock/`; consola limpia. (core: 108 pruebas; smoke: 69 claves, 11 pestañas, consola limpia.)
- [x] `tests/fixtures/claves-pyl.json` trae `PYL.core.clock`, `PYL.ui.clock` y `PYL.app.clock`.
- [x] La barra superior ya no muestra la marca (logo, «Synkops» ni «Mi operación en sincronía») y la píldora del producto activo queda centrada sobre las pestañas, con el tema a ras del borde derecho de las pestañas. (Prueba de humo `1a`: sin `.brand` ni `.brand-mark` y orden de `.top-row`. Revisado por el usuario.)
- [x] Bajo el título «Synkops» de la tarjeta principal de Inicio hay una línea de pulso del ancho de la palabra, en el degradado del acento del tema, con una luz que la recorre (más rápida con el cursor sobre el título). (Prueba de humo `1a`: `svg.hero-pulse`, dos trazos y degradado `--b` → `--b2`. Revisado por el usuario.)
- [x] Con «reducir movimiento» el pulso del título queda quieto (sin luz que corre). (Código listo: `.hp-run{display:none}` bajo `prefers-reduced-motion`, más la regla global de `trainer.css` que apaga animaciones; **falta verlo en el navegador** con la misma emulación.)

## Decisiones

- **Sí:** reloj analógico de pared (decisión del usuario), por estética.
- **Sí:** números 12, 3, 6 y 9 y rayitas en el resto (decisión del usuario); los 12 números quedan apretados a 84 px.
- **Sí:** segundero continuo (decisión del usuario), no a saltos.
- **Sí:** día y fecha al lado, sin hora digital (decisión del usuario): la hora la dicen las agujas.
- **Sí:** desde 1680 px y en todas las pestañas (decisión del usuario): es el corte en el que hay columna debajo.
- **Sí:** colores del tema (decisión del usuario), no el dorado fijo del favicon.
- **Sí:** solo decorativo, sin clic (decisión del usuario), con `aria-label` para lectores de pantalla.
- **Sí:** módulo nuevo `clock` (decisión del usuario), con sus propios nombres de días y meses para no depender de `tasks`.
- **Sí:** solo el margen izquierdo; el derecho queda fuera.
- **Sí:** el bucle se pausa con la pestaña oculta o la pantalla angosta, para no gastar CPU en algo que no se ve.
- **Sí:** con «reducir movimiento», sin segundero y una actualización por minuto.
- **Sí:** quitar el logo del pulso de la barra y poner un pulso subrayado bajo el título «Synkops» de Inicio (decisión del usuario durante la implementación, agregada a esta spec en vez de abrir otra). Antes se probó el cuadro del logo a 56 px a la derecha y luego a la izquierda del título; no convenció. Opciones descartadas: pulso que sale del nombre hacia la derecha, monograma sin cuadro y pulso de fondo tras las letras.
- **Sí:** título «Synkops» de Inicio más grande, 56 px (decisión del usuario: es el nombre de la app y debe notarse).
- **Sí:** quitar también «Synkops · Mi operación en sincronía» de la barra (decisión del usuario): ya se lee en Inicio.
- **Sí:** píldora del producto activo centrada sobre las pestañas y el tema a ras de su borde derecho (decisión del usuario). Primero se centró sobre todo el ancho de la barra con el tema pegado al borde derecho de `.top-in`; el tema quedaba suelto lejos de las pestañas, por eso la fila mide lo mismo que las pestañas (`.top-row`).
- **No:** centrar la fila entera en la barra: las pestañas siguen alineadas a la izquierda con el contenido, como antes.
- **No:** animar las agujas con CSS (`@keyframes` de 60 s): se desfasa del reloj del PC al dormir el equipo; se pinta con la hora real en cada fotograma.
- **No:** reloj digital, pulso decorativo o progreso de tareas en el margen: el usuario eligió el reloj de pared.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El margen a 1680 px mide 220 px y el bloque de 210 px queda justo | Mismo cálculo que `.tk-rail`, que ya cabe a ese ancho; se revisa en el navegador a 1680 px. |
| jsdom no tiene `requestAnimationFrame` ni `matchMedia` completos | `app/clock.js` revisa que existan antes de usarlos; las pruebas usan `tick(date)` directo. |
| Gasto de CPU por pintar a 60 fps | Bucle pausado con la pestaña oculta o pantalla angosta; `paint` solo reescribe textos si cambian. |

## Lo que **no** está en esta spec

- El margen derecho de la barra.
- El reloj por debajo de 1680 px.
- Hora digital, alarmas, cronómetro o tic-tac.
- Clic en el reloj.

Cada una de esas, si llega, va en su propia spec.
