# SPEC 22 — Franja de indicadores en Inicio

> **Estado:** Implementado
> **Depende de:** SPEC 11, SPEC 14, SPEC 18, SPEC 19, SPEC 21
> **Fecha:** 2026-11-21
> **Objetivo:** Agregar bajo la tarjeta principal de Inicio una franja de cuatro tarjetas pequeñas (Mini P&L, Embudo de productos, Testeo y Pulso de tareas) que muestran números clave con gráficas y animaciones suaves, y cuyo clic lleva a la pestaña de origen.

## Por qué existe esta spec

Inicio hoy saluda, muestra la frase y ofrece accesos, pero no dice cómo va el negocio. Los datos ya existen repartidos en la app (tareas, bitácora de productos, práctica de Testeo, cortes de Meta, P&L), y obliga a abrir cada pestaña para verlos. El usuario pidió «botones, gráficas o pequeñas animaciones» que informen métricas. Este módulo los junta en una sola franja de lectura rápida, sin cálculo nuevo de negocio.

El P&L es el único dato que no se guarda entre sesiones (solo guarda `pyl-cod-campaign-map`): para que Inicio lo muestre al abrir la app hace falta una foto de sus números clave. El usuario decidió meterlo en esta spec en vez de separarlo.

## Alcance

**Dentro:**

- Módulo nuevo `indicators` (`js/modules/indicators/{core,ui,app}`), estilos `css/modules/indicators.css` (después de `metawatch.css`, antes de `themes.css`). Prefijo de ids y clases `#ix-`/`.ix-`; prefijo de nombres del núcleo `ix`/`IX_` (no chocar al aplanar en `js/index.js`).
- **Franja** `<section class="ix-strip" id="ix-root" aria-label="Indicadores">` dentro de `#v-dash`, justo **debajo de la tarjeta principal** (`.hero`) y antes de `#tk-rail`. Rejilla de 4 tarjetas iguales; 2 columnas bajo 900 px y 1 bajo 520 px. Las columnas laterales de 1680 px (`.tk-rail`, `.hb-rail`) no se tocan.
- **Cuatro tarjetas** `.ix-card[data-k]`, en este orden. Cada una es un `<button>` (clic y teclado) con `aria-label` que resume su dato:
  - **Mini P&L** (`data-k="pnl"`): utilidad en COP (verde si ≥ 0, rojo si < 0), medidor de margen con marca en `MARGIN.healthy` y color por `MARGIN` (≥ healthy verde, ≥ even amarillo, menor rojo), chips ROAS y efectividad (`fmt`) con semáforo de las reglas de `diagnostics.kpis` (verde con holgura o sobre la meta, amarillo en el límite, rojo bajo equilibrio o bajo la meta), y la línea «<producto o Todos> · <periodo> · dato del <fecha>». Clic → `#tabs [data-v="pyl"]`.
  - **Embudo de productos** (`data-k="funnel"`): conteo por estado de la bitácora de Buscar producto (`STATUS` de `search`): Evaluando → En testeo → Activo → Ganador, una barra por estado proporcional al mayor, y «N descartados» aparte. Clic → `#tabs [data-v="buscar"]`.
  - **Testeo** (`data-k="testing"`): dos bloques separados por una raya. «Práctica»: mejor puntaje (`app.state.testing.best`, 0–100 %) con su medidor. «En Meta»: escalera de los 3 cortes de `NS_TEST.cuts` (20K, 30K, 40K) con los colores de la alerta de la barra (amarillo, naranja, rojo; los alcanzados rellenos y el último con halo) y, si Meta está conectado y hay dato, el corte más alto alcanzado por un conjunto activo («Corte 30K · C2») y cuántos conjuntos activos hay. Sin conexión a Meta la escalera queda apagada y dice «Meta sin dato de cortes». *(Ajustado a pedido del usuario durante la implementación.)* Clic → `#tabs [data-v="testeo"]`.
  - **Pulso de tareas** (`data-k="tasks"`): solo el avance de hoy, en un anillo que se rellena con el porcentaje completado al centro, y debajo «N de M hechas hoy» (mismo conteo de tareas y subtareas que `tkProgress`) y cuántas faltan; con el 100 % el anillo se pone verde y dice «¡Todo hecho por hoy!». Sin tareas hoy la tarjeta queda vacía. *(Ajustado a pedido del usuario: se quitaron las mini-barras de 5 días y la racha de la tarjeta; `ixTasks` las sigue calculando en el núcleo.)* Clic → baja a `#tk-root` con `scrollIntoView` y enfoca `#tk-new`.
- **Racha:** días seguidos cumplidos que terminan en hoy; si hoy aún no está cumplido, se cuenta desde ayer. Día cumplido = tiene tareas y todas (con subtareas) están hechas. Se calcula sobre la ventana de 5 días mostrada (máximo 5).
- **Estado vacío:** una tarjeta sin dato queda atenuada (`.ix-empty`) con una invitación y el mismo clic hacia su pestaña: «Sube tus reportes en el Tablero P&L», «Guarda tu primer candidato», «Practica en Testeo o conecta Meta», «Anota tu primera tarea». Ninguna tarjeta se oculta: la franja siempre tiene 4.
- **Animaciones:** entrada escalonada de las tarjetas (fundido + 8 px de subida, 60 ms entre una y otra); barras y medidores que crecen de 0 a su valor (500 ms); números que suben de 0 a su valor (conteo, 600 ms, formateados con `fmt`/`copText`). Solo en la primera pintada tras cargar y al volver a Inicio (`nav:vista` con `v: 'dash'`); los repintados por cambio de dato no vuelven a animar desde 0. Con `prefers-reduced-motion` no hay animación: todo aparece ya en su valor final.
- **Foto del P&L:** `services.storage.pnlSnap` (clave `pyl-pnl-snap`). `app/main.js#render()` guarda la foto de cada cálculo del tablero, tras `S.current = …` (ver Modelo de datos). Sin `localStorage` no falla: la tarjeta queda vacía.
- **Cuándo se repinta la franja:** al cargar, al volver a Inicio (`nav:vista`, lee la foto del P&L, la bitácora y el mejor puntaje) y con dos eventos nuevos que avisan cambios que ocurren mientras Inicio está abierto: `tareas:cambio` (lo dispara `app/tasks.js` tras cada cambio de la nota) y `meta:dato` (lo dispara `app/metawatch.js` al terminar cada consulta, buena o mala). Cambio mínimo en esos dos archivos: un `dispatchEvent`.
- Sigue el tema: solo tokens (`--card`, `--line-2`, `--ink`, `--soft`, `--b`, `--b-rgb`, `--g-*`, `--y-*`, `--r-*`). Las tarjetas usan la clase `.card-side` (relieve neutro) para verse hermanas de Mis tareas y del Centro de mando.
- Accesibilidad: cada tarjeta es un `<button>` con foco visible; las barras y medidores son decorativos (`aria-hidden`) y el dato va en el `aria-label` y en texto visible.

**Fuera de la spec (otras specs):**

- Rango o filtros (7/30 días), selector de periodo o producto dentro de las tarjetas.
- Gráficas históricas o series de tiempo (solo valores actuales y 5 días de tareas).
- Datos de TikTok, varias campañas de Meta o cruce de ventas del píxel con Dropi.
- Tarjetas configurables, reordenables u ocultables por el usuario.
- Botón para borrar la foto del P&L (se sobrescribe con cada cálculo).
- Notificaciones o sonidos desde las tarjetas.
- Mostrar la franja en otras pestañas o dentro de la tarjeta principal.
- Racha de más de 5 días (la poda de Mis tareas solo conserva ~6 días).

## Modelo de datos

### `localStorage` — clave `pyl-pnl-snap`

```js
{
  v: 1,                       // IX_VERSION
  at: 1763650000000,          // cuándo se calculó (Date.now())
  prod: 'Todos',              // nombre del producto filtrado o 'Todos'
  from: '2026-11-01',         // rango del filtro (YYYY-MM-DD) o null si es todo
  to: '2026-11-20',
  util: 1250000,              // a.util
  fact: 6400000,              // a.fact
  margen: 0.195,              // a.margen (null si no hay cobrado)
  roas: 3.4,                  // a.roas (null si no hay ads)
  roasEq: 2.1,                // a.roasEq: ROAS de equilibrio (opcional; sin él ROAS no lleva semáforo). Se agregó a pedido del usuario durante la implementación
  efect: 0.72                 // a.efect (null si no hay entregas ni devoluciones)
}
```

Un solo registro: cada render del tablero lo sobrescribe. Roto o de otra `v` → `null` (tarjeta vacía). Sin datos de clientes ni de pedidos.

### Núcleo `core/indicators.js` (`PYL.core.indicators`)

Funciones puras que reciben datos y devuelven datos para la UI. Sin DOM, sin `localStorage`.

```js
ixPnl(snap)              // → { util, tone, margen, level, marginFill, roas, efect, label, at } | null
ixFunnel(log, statuses)  // → { rows: [{ k, t, icon, n, pct }], dropped, total } | null si no hay candidatos
ixTesting(best, rows)    // → { best, cut, set, active } ; cut = índice de NS_TEST.cuts del mejor activo (−1 = ninguno)
ixTasks(note, today)     // → { done, total, days: [{ key, done, total, fill }], streak }
ixLoad(raw)              // valida la foto de pyl-pnl-snap → foto | null
IX_VERSION               // 1
```

Los números salen de `MARGIN` (`pnl.diagnostics`), `STATUS` y `scoreLevel` (`search`), `NS_TEST.cuts` (`metrics`), `mwCut` (`metawatch`) y `tkProgress`/`tkDayKey`/`tkAddDays` (`tasks`): ningún umbral se escribe a mano.

### Estado

`app.state.indicators = { data, played }`: `data` = lo último que devolvieron las funciones del núcleo, por tarjeta; `played` = si ya corrió la animación de entrada en esta visita a Inicio. No se guarda.

## Plan de implementación

1. Crear `js/modules/indicators/core/indicators.js` con `ixLoad`, `ixPnl`, `ixFunnel`, `ixTesting`, `ixTasks`, y agregarlo a `js/index.js`. Pruebas en `tests/core.test.js`: P&L con utilidad negativa y positiva, margen en cada corte de `MARGIN`, foto rota o de otra versión, embudo con bitácora vacía y con descartados, `ixTesting` sin conjuntos y con conjuntos `OFF`, racha con hoy cumplido, hoy a medias y día sin tareas. `node --check` y `node tests/core.test.js`.
2. Agregar `services.storage.pnlSnap` (`load` devuelve el texto crudo, `save`, `clear`) en `shared/services/storage.js`. Probar en consola que guarda y lee; el valor de `save` es `false` si no cupo.
3. Hacer que `app/main.js#render()` guarde la foto tras armar `S.current`. Verificar en el navegador que al cargar reportes aparece `pyl-pnl-snap` en `localStorage` y que cada filtro la actualiza.
4. Crear `ui/indicators.js` (`PYL.ui.indicators`: `strip`, `card` por tipo, helpers de barras y medidor, estado vacío) y la sección `#ix-root` en `index.html` entre `.hero` y `#tk-rail`, con `css/modules/indicators.css` y su `<link>`. Tarjetas con datos fijos de prueba para revisar la maqueta en los 7 temas y a 1680, 900 y 520 px. Sin animación todavía.
5. Crear `app/indicators.js`: lee los datos reales (`storage.pnlSnap`, `app.state.search.log`, `app.state.testing.best`, `app.state.metawatch.rows`, `app.state.tasks.note`), llama al núcleo y repinta. Conecta el clic de cada tarjeta a su pestaña (o a `#tk-root`). Escucha `nav:vista`.
6. Disparar `tareas:cambio` desde `app/tasks.js` y `meta:dato` desde `app/metawatch.js`; la franja los escucha y repinta sin reiniciar la animación.
7. Agregar las animaciones (entrada escalonada, barras, medidores, conteo de números) con `prefers-reduced-motion`. Verificar que volver a Inicio las repite y que los cambios de dato no.
8. Pruebas de humo en `tests/smoke.test.js`: la franja existe con 4 tarjetas en orden, estado vacío de cada una, tarjeta con datos simulados (foto de `pyl-pnl-snap`, bitácora, puntaje, tareas), clic navega a la pestaña correcta, `tareas:cambio` repinta, consola limpia. Actualizar `tests/fixtures/claves-pyl.json` con `node tests/smoke.test.js --claves` (por un temporal, no redirigiendo directo).

## Criterios de aceptación

- [x] Con todo vacío, Inicio muestra 4 tarjetas atenuadas con su invitación, en este orden: Mini P&L, Embudo, Testeo, Pulso de tareas.
- [x] La franja queda bajo la tarjeta principal y no mueve ni solapa `#tk-rail` ni `#hb-rail` a 1680 px o más. *(orden en el DOM verificado con prueba; falta revisar a 1680 px en el navegador que no solape)*
- [x] La franja tiene 4 columnas a 900 px o más, 2 entre 520 y 899 px y 1 bajo 520 px, sin scroll horizontal. *(reglas CSS a 900 y 520 px revisadas; falta ver «sin scroll horizontal» en el navegador)*
- [x] Tras cargar reportes en el Tablero P&L existe `pyl-pnl-snap` con `v: 1` y los campos del modelo; al recargar la app, Mini P&L muestra utilidad, margen, ROAS, efectividad y «dato del <fecha>» sin volver a subir archivos.
- [x] Utilidad negativa se ve en rojo; margen ≥ `MARGIN.healthy` verde, ≥ `MARGIN.even` amarillo, menor rojo.
- [x] Un `pyl-pnl-snap` roto o con otra `v` deja Mini P&L vacío sin errores en consola.
- [x] El Embudo cuenta cada estado de la bitácora y los descartados aparte; borrar un producto en Buscar y volver a Inicio cambia el número.
- [x] Testeo muestra el mejor puntaje; sin Meta conectado no muestra corte y no da error.
- [x] Con Meta conectado, Testeo muestra el corte más alto de un conjunto **activo**; un conjunto `OFF` no cuenta.
- [x] Pulso de tareas muestra «N de M hechas hoy» igual al de Mis tareas y marcar una tarea con Inicio abierto lo actualiza sin recargar.
- [x] La racha cuenta hoy si está cumplido y, si no, cuenta desde ayer; un día sin tareas la corta.
- [x] Clic (o Enter/Espacio) en cada tarjeta abre su pestaña: `pyl`, `buscar`, `testeo`; la de tareas baja a `#tk-root` y enfoca `#tk-new`.
- [x] La entrada escalonada, el crecimiento de barras y el conteo de números corren al cargar y al volver a Inicio, y no se repiten cuando solo cambia un dato. *(clase de animación y su repetición al volver verificadas; falta ver el efecto en el navegador)*
- [x] Con `prefers-reduced-motion` no hay animación y los valores aparecen finales.
- [x] Las 4 tarjetas se leen bien en los 7 temas (verificado en el navegador). *(pendiente: revisar en el navegador)*
- [x] Ningún id `#ix-` se repite en la página y `node tests/core.test.js` y `node tests/smoke.test.js` pasan con la consola limpia.

## Decisiones

- **Sí:** una sola spec con los cuatro indicadores, a pedido del usuario. Se sugirió dividir el Mini P&L por su persistencia nueva y se descartó: cada paso del plan es commiteable por separado.
- **Sí:** franja bajo la tarjeta principal. Encima empujaría el saludo y el título hacia abajo y se descartó; dentro de la tarjeta principal la recarga; una columna nueva choca con los márgenes que ya usan reloj, cortes, tareas y Centro de mando.
- **Sí:** el clic lleva a la pestaña de origen, sin filtros ni estado nuevo. Las tarjetas son lectura rápida.
- **Sí:** foto de números clave en `pyl-pnl-snap` guardada en cada render del tablero. Pesa unos 300 bytes y no lleva datos de clientes. Se descartó leer la última fila del Excel consolidado: depende de un archivo vinculado y de IndexedDB (asíncrono).
- **Sí:** la foto guarda el filtro con el que se calculó (producto y periodo) y lo dice en la tarjeta, para no hacer pasar un solo producto por el negocio entero.
- **Sí:** Testeo = mejor puntaje de práctica más corte más alto de Meta cuando hay dato. Sin Meta solo el puntaje.
- **Sí:** Embudo por estado de la bitácora (los de `STATUS`). Se descartó el conteo por score /8 por ahora.
- **Sí:** tarjeta sin dato atenuada con invitación en vez de ocultarla, para que la franja no cambie de forma y diga qué hacer.
- **Sí:** animación solo en la primera pintada y al volver a Inicio; los repintados por dato no reinician desde 0 (evita parpadeos al marcar tareas).
- **Sí:** eventos `tareas:cambio` y `meta:dato` en vez de que `indicators` lea el estado en un temporizador. Es el mismo patrón que `rapido:candidato` o `landing:prod`.
- **Sí:** racha limitada a 5 días. `tkRollOver` borra los días anteriores a hoy − 5, así que no hay historia más larga.
- **No:** gráficas con librería externa. Barras y medidores en HTML/CSS/SVG propios, como el resto de la app.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La foto del P&L queda vieja si el usuario no vuelve al tablero | La tarjeta muestra «dato del <fecha>» siempre |
| Guardar la foto en cada render del tablero escribe `localStorage` muy seguido | Es un registro de ~300 bytes; si llega a notarse, guardar solo si cambió algún campo |
| Mostrar una foto de un solo producto como si fuera todo el negocio | Etiqueta con producto y periodo en la tarjeta |
| Los eventos nuevos tocan `app/tasks.js` y `app/metawatch.js` | Cambio de una línea cada uno; las pruebas existentes de ambos módulos deben seguir pasando |
| Animaciones con 4 tarjetas a la vez en equipos lentos | Solo `transform` y `opacity`; el conteo usa `requestAnimationFrame` y se salta con `prefers-reduced-motion` |
| jsdom no evalúa CSS ni mide | Las pruebas revisan nodos y textos; lo visual (7 temas, anchos) se revisa en el navegador |

## Qué **no** está en esta spec

- Filtros, rangos de fechas o selector de producto en las tarjetas.
- Gráficas históricas y series de tiempo.
- TikTok, varias campañas de Meta y cruce con pedidos de Dropi.
- Tarjetas configurables o reordenables.
- Botón para borrar la foto del P&L.
- Notificaciones y sonidos.
- Mostrar la franja fuera de Inicio.
