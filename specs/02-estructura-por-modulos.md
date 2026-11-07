# SPEC 02 — Estructura de carpetas por módulos

> **Estado:** Aprobado
> **Depende de:** SPEC 00, SPEC 01
> **Fecha:** 2026-11-07
> **Objetivo:** Reorganizar `js/` y `css/` por módulo de la app (con sus capas adentro) sin cambiar ninguna lógica, y dejar pruebas en el repo que demuestren que nada se rompió.

## Por qué existe esta spec

El código ya sigue capas (SPEC 00, sección 3). Pero cada capa es una carpeta plana con archivos de todas las partes mezclados. Para tocar Buscar producto hay que abrir cuatro carpetas y adivinar qué archivo es de quién.

La spec cambia de "paquetes por capa" a "paquetes por funcionalidad, con capas adentro". Es el mismo paso que se da en Java al pasar de `controller/`, `service/`, `model/` sueltos a `pedidos/controller`, `pedidos/service`...

| Java (MVC por capas) | Aquí | Qué hace |
|---|---|---|
| `model` / `domain` | `core/` | Reglas y cálculos, sin DOM; se prueba en Node |
| `repository` | `services/` | Guardar y leer (`localStorage`, archivos, Excel) |
| `view` | `ui/` | Pinta; recibe datos y callbacks |
| `controller` | `app/` | Estado y casos de uso; único que muta `app.state` |
| paquete por funcionalidad | `modules/<módulo>/` | Todo lo de una parte de la app junto |
| `common` / `shared` | `shared/` | Lo que usan varios módulos |

Es solo estructura. El namespace del código (`PYL.core.search`, `PYL.ui.candidate`...) no cambia: la carpeta dice el módulo y el namespace dice la capa.

## Alcance

**Dentro:**

- Mover cada archivo de `js/` a su carpeta nueva según el mapa de la sección "Modelo de datos". Los nombres de archivo no cambian.
- Actualizar las rutas de `<script>` y `<link>` en `index.html`. El orden de los `<script>` queda idéntico al de hoy; solo cambia la ruta.
- Mover `js/core/index.js` (entrada de Node) a `js/index.js` con la lista de rutas nuevas. Sigue exportando el mismo objeto aplanado.
- Sacar la navegación entre pestañas de `app/trainer.js` a `js/app/nav.js`, con el mismo comportamiento.
- Partir `css/base.css` por módulo en `css/modules/` y sacar los temas a `css/themes.css`.
- Renombrar `css/components.css` a `css/modules/pnl.css`, sin cambiar su contenido.
- Agregar `tests/` con pruebas del núcleo en Node y una prueba de humo en jsdom.
- Actualizar en los comentarios de código las rutas que cambian (ej. `/* Buscar producto (js/ui/search.js) */`).
- Actualizar `CLAUDE.md` y `README.md` después del merge.

**Fuera (para specs futuras):**

- Partir `app/trainer.js` en core/ui/app (Fase 2 del Entrenador). Va en su propia spec con pruebas.
- Renombrar el namespace (`PYL.core.search` → `PYL.modules.search.core`) o los nombres de archivo.
- Corregir la deuda o los bugs de SPEC 00 (B1–B5, literales de `MARGIN`, `store` del Entrenador...).
- Partir `index.html` en plantillas por módulo: en `file://` no se puede cargar HTML con `fetch`.
- Partir `services/storage.js` por módulo.
- Agregar `package.json`, bundler, runner de pruebas o ES modules.
- Un `js/README.md` aparte: la estructura se documenta en `README.md` y `CLAUDE.md`.

## Modelo de datos

Esta spec no agrega estructuras de datos ni claves de almacenamiento. `pyl-*`, `ns_*` (incluida `ns_view`) y `app.state` quedan iguales.

### Mapa de archivos (antes → después)

```text
js/
  index.js                      ← js/core/index.js (solo Node)
  shared/
    core/      parse.js, dates.js, format.js
    services/  storage.js, files.js
    ui/        dom.js, tooltip.js, feedback.js
  modules/
    pnl/
      core/      dropi.js, meta.js, pnl.js, diagnostics.js, insights.js, excel.js
      services/  consolidado.js
      ui/        upload-zones.js, notices.js, trend.js, summary.js, cascade.js, funnel.js,
                 diagnosis-panel.js, unit-table.js, simulator.js, products-table.js,
                 campaigns-table.js, report.js, presets.js
      app/       filters.js, data-loader.js, save.js, report.js
    search/
      core/  search.js
      ui/    search.js, candidate.js
      app/   search.js
    quick/
      core/  quick.js
      ui/    quick.js
      app/   quick.js
    landing/
      core/  landing.js
      ui/    landing.js
      app/   landing.js
    ads/
      core/  ads.js
      ui/    ads.js
      app/   ads.js
    trainer/
      app/   trainer.js
  app/
    theme.js   (se sigue cargando en <head>)
    state.js
    nav.js     (nuevo: sale de trainer.js)
    main.js    (siempre el último <script>)

css/
  base.css              tokens, barra superior, layout, tags, botones, campos, KPI, tablas,
                        toast, indicador de desplegable, enlace en texto, alias del tablero
  modules/
    trainer.css         cadena de Inicio, costeo, zone bar, dona, simulador, escalera, pipeline
    search.css          Buscar producto, Mi candidato, bitácora, estadísticas, secciones contraíbles
    quick.css           guardado rápido (.qk-*)
    landing.css         Desarrollo → Shopify
    ads.css             Desarrollo → Meta Ads (.ma-*)
    pnl.css             ← css/components.css, sin cambios
  themes.css            selector de tema, modo claro, temas oscuros y SVG con colores fijos
  report.css            sin cambios
```

### Orden de carga de CSS

`base.css` → `modules/trainer.css` → `search.css` → `quick.css` → `landing.css` → `ads.css` → `themes.css` → `modules/pnl.css` → `report.css`.

Este orden respeta el de hoy: módulos en el orden en que aparecen en `base.css`, temas al final de lo que era `base.css`, y después el tablero y el informe.

### Reglas de dependencia

- `shared/` no usa nada de `modules/`.
- Un módulo usa `shared/` y los módulos que se cargan antes. Las dependencias que ya existen se mantienen y se documentan:
  - `search` → `pnl` (`core.diagnostics.MARGIN`).
  - `quick` → `search` (`ui.candidate.copyBtn`, evento `rapido:candidato`).
  - `ads` → `landing` y `search` (`ui.landing.stepList`, `ui.search.strategyTabs`, evento `landing:prod`).
  - `trainer` → `search` (`core.search` en el Costeo).
- Dentro de cada módulo siguen las reglas de capas de `CLAUDE.md`.

### `js/app/nav.js`

Recibe `go(v)` y los listeners de `#tabs button` y `[data-go]`, tal cual están en `trainer.js:57-66`, y la llamada inicial `go(store.get("ns_view", "dash"))` de `trainer.js:696`. Usa la misma clave `ns_view` con el mismo try/catch.

Lo único propio del Entrenador dentro de `go` es `growLadder()`. `nav.js` dispara el evento `nav:vista` sobre `document` con `detail = { v }`, y `trainer.js` lo escucha y llama a `growLadder()` cuando `v === 'escalera'`. El `resize` para el tablero se queda en `nav.js`. Se carga después de `trainer.js` y antes de `main.js`, así la vista inicial se abre en el mismo momento que hoy.

### Pruebas

```text
tests/
  core.test.js        Node puro (node:assert): carga js/index.js y compara resultados conocidos
  smoke.test.js       jsdom: abre index.html, recorre las pestañas y revisa la consola
  fixtures/
    dropi-prueba.csv  órdenes inventadas, sin datos reales
```

- `node tests/core.test.js` sin dependencias.
- `NODE_PATH=<carpeta con jsdom@26>/node_modules node tests/smoke.test.js`. jsdom se instala fuera del repo, como hoy.
- Cada prueba imprime `OK` o el primer fallo, y termina con código 1 si algo falla.

## Plan de implementación

1. **Pruebas de línea base.** Crear `tests/core.test.js`, `tests/smoke.test.js` y `tests/fixtures/dropi-prueba.csv` sobre la estructura actual. `core.test.js` revisa: la lista de funciones exportadas, proveedor 30.000 → precio $99.900 y tope $21.617 (SPEC 00), `quickCheck`/`quickAdd`/`quickPrice`, y `aggregate` del CSV de prueba (`rec`, `ent`, `dev`, `fact`, `util`). `smoke.test.js` revisa: que existan las claves de `PYL.core`, `PYL.services`, `PYL.ui` y `PYL.app`; que cada pestaña de `#tabs` abra su `.view`; y que no haya errores en consola salvo el de `scrollTo`. Las dos pasan en verde antes de mover nada.
2. **Compartidos.** Mover `parse`, `dates`, `format`, `storage`, `files`, `dom`, `tooltip` y `feedback` a `js/shared/`. Mover `js/core/index.js` a `js/index.js` con las rutas nuevas. Actualizar `index.html`. Pruebas en verde.
3. **Módulo pnl.** Mover sus archivos de core, services, ui y app a `js/modules/pnl/`. Actualizar `index.html` y `js/index.js`. Pruebas en verde.
4. **Módulos search y quick.** Mover a `js/modules/search/` y `js/modules/quick/`. Pruebas en verde.
5. **Módulos landing y ads.** Mover a `js/modules/landing/` y `js/modules/ads/`. Pruebas en verde.
6. **Módulo trainer.** Mover `app/trainer.js` a `js/modules/trainer/app/trainer.js` sin tocar su contenido, salvo la ruta en el comentario de cabecera. Pruebas en verde.
7. **Navegación.** Crear `js/app/nav.js` con `go`, sus listeners y la vista inicial. En `trainer.js`, quitar ese bloque y escuchar `nav:vista` para `growLadder()`. Agregar a `smoke.test.js`: abrir Escalera crece la escalera, y abrir el tablero dispara `resize`. Pruebas en verde.
8. **CSS por módulo.** Mover de `base.css` los bloques de cada módulo a `css/modules/trainer.css`, `search.css`, `quick.css`, `landing.css` y `ads.css`, copiados sin cambios. Agregar sus `<link>` en el orden de la sección "Orden de carga de CSS". Antes, listar los selectores que quedan en más de un archivo y confirmar que su orden relativo no cambió.
9. **Temas y tablero.** Mover a `css/themes.css` desde "Selector de tema" hasta el final de `base.css`. Renombrar `css/components.css` a `css/modules/pnl.css`. Ajustar `<link>`.
10. **Comentarios.** Actualizar las rutas viejas que aparecen en comentarios de `js/` y `css/` (búsqueda de `js/ui/`, `js/core/`, `js/app/`, `components.css`).
11. **Documentación.** Después del merge, actualizar en `CLAUDE.md` y `README.md` el mapa de carpetas, las reglas de dependencia, el comando `require('./js/index.js')`, la ubicación de los CSS y cómo correr `tests/`.

## Criterios de aceptación

- [x] No queda ningún archivo en `js/core/`, `js/services/` ni `js/ui/`. `js/app/` solo tiene `theme.js`, `state.js`, `nav.js` y `main.js`.
- [x] Cada archivo del mapa está en su carpeta nueva con el mismo nombre.
- [x] `git diff -M --stat` muestra los archivos movidos como renombres; los únicos con cambios de contenido son `index.html`, `js/index.js`, `trainer.js`, `nav.js`, `base.css` y comentarios de rutas.
- [x] El orden de los `<script>` en `index.html` es el mismo de antes (misma lista de nombres en el mismo orden).
- [x] `index.html` no tiene `<style>`, `import`, `export` ni `type="module"`.
- [x] `node tests/core.test.js` pasa con los mismos valores que en el paso 1.
- [x] `tests/smoke.test.js` pasa: todas las pestañas abren y no hay errores nuevos en consola.
- [x] Las claves de `PYL.core`, `PYL.services`, `PYL.ui` y `PYL.app` son las mismas que en el paso 1.
- [x] La suma de líneas de `base.css`, `modules/trainer.css`, `search.css`, `quick.css`, `landing.css`, `ads.css` y `themes.css` es igual a las líneas de `base.css` antes del paso 8, más solo cabeceras de comentario.
- [x] Abrir `index.html` con doble clic muestra la última pestaña abierta, igual que antes (revisado en el navegador).
- [x] Abrir Escalera muestra la escalera crecida; abrir el Tablero P&L mide la cascada y la tendencia (revisado en el navegador).
- [x] Los 7 temas se ven igual que antes en Inicio, Buscar producto, Desarrollo y Tablero P&L (revisado en el navegador).
- [x] Los datos ya guardados (bitácora, guardado rápido, guías, Entrenador) siguen ahí al recargar (revisado en el navegador).
- [x] Ningún archivo de `js/shared/` menciona `modules/` ni usa un namespace que solo exista en un módulo.

## Decisiones

- **Sí:** por módulo con capas adentro. Todo lo de una parte de la app queda junto; es la convención "feature-first" del frontend moderno. Elegido por el usuario.
- **No:** por capa con módulos adentro. Lo de un módulo seguiría repartido en cuatro carpetas.
- **No:** hexagonal, puertos y adaptadores. El usuario pidió algo más simple.
- **Sí:** solo mover archivos, sin cambiar el namespace `PYL.*`. Cero cambios dentro de los archivos = cero riesgo de lógica. Elegido por el usuario.
- **No:** renombrar a `PYL.modules.search.core`. Toca cientos de referencias.
- **Sí:** mismos nombres de archivo (`modules/search/core/search.js`). La carpeta ya dice la capa; renombrar complica el diff y la búsqueda.
- **Sí:** mismo orden de `<script>`. Las dependencias se resuelven por orden de carga; mantenerlo elimina el riesgo de un `undefined` al arrancar.
- **Sí:** `diagnostics.js` en `pnl`. Hoy es del tablero; `search` lo usa por `MARGIN` y queda documentado como dependencia.
- **Sí:** `tooltip.js` en `shared`. Es un componente genérico aunque hoy solo lo use el tablero.
- **Sí:** `state.js` en `js/app/`. Es el contenedor de `app.state` que todos los módulos extienden.
- **Sí:** `main.js` en `js/app/` y siempre al final. Es el arranque de la app, como pide `CLAUDE.md`.
- **Sí:** sacar la navegación a `js/app/nav.js`. Es de toda la app, no del Entrenador. Con evento `nav:vista`, como `costeo:precio` y `rapido:candidato`.
- **No:** partir `trainer.js` en capas aquí. Es más riesgoso y merece su propia spec. Elegido por el usuario.
- **Sí:** CSS por módulo en `css/modules/`. Todo el estilo en un solo lugar. Elegido por el usuario.
- **No:** CSS junto al JS del módulo. Mezcla estilos dentro de `js/`.
- **Sí:** `css/themes.css` aparte y cargado antes de `pnl.css`. Mantiene el orden de cascada de hoy: los temas estaban al final de `base.css` y antes de `components.css`.
- **Sí:** pruebas en `tests/` con `node:assert`, sin `package.json`. Respeta "sin dependencias npm"; jsdom sigue fuera del repo.
- **Sí:** pruebas de línea base antes de mover nada. Sin ellas no se puede demostrar "sin romper nada".
- **No:** `js/README.md`. Un tercer documento se desactualiza; la fuente es `README.md` y `CLAUDE.md`.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Una ruta mal escrita en `index.html` deja un módulo sin cargar | `smoke.test.js` revisa las claves de `PYL.*` y la consola después de cada paso |
| Partir `base.css` cambia el orden de reglas con igual especificidad | Copiar bloques en su orden original, listar selectores repetidos entre archivos (paso 8) y revisar los 7 temas en el navegador |
| Mover la navegación cambia cuándo se abre la vista inicial | `nav.js` se carga justo después de `trainer.js`, en el mismo punto donde hoy corre `go` |
| `growLadder` no se dispara al abrir Escalera | Evento `nav:vista` con prueba en `smoke.test.js` |
| Git no detecta los renombres y se pierde el historial | Mover con `git mv` y sin cambios de contenido en el mismo commit |
| El CSV de prueba trae datos reales | Datos inventados: nombres y cifras de ejemplo, sin teléfonos ni direcciones |

## Lo que **no** está en esta spec

- Partir `trainer.js` en core/ui/app.
- Renombrar namespace, archivos o claves guardadas.
- Corregir bugs o deuda de SPEC 00.
- Plantillas HTML por módulo.
- `package.json`, bundler o ES modules.

Cada una de esas, si llega, va en su propia spec.
