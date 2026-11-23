# SPEC 24 — Íconos propios dorados en toda la app

> **Estado:** Implementado
> **Depende de:** SPEC 02
> **Fecha:** 2026-11-23
> **Objetivo:** Reemplazar los emojis que funcionan como ícono por un único conjunto de SVG de línea en `js/shared/ui/icons.js`, pintados en dorado metalizado como identidad de la app.

## Por qué existe esta spec

Hoy la app mezcla emojis (~230 líneas en 30 archivos) con SVG sueltos copiados en varios módulos (`ICON_DEL` repetido en `hub` y `quick`, `ICON_COPY`/`ICON_OK` en `candidate`, `ICON` en `tasks`, `ICONS` en `logistics` e `indicators`, `ICON_DK`, `ICON_AP`, `ICON_CHAIN`/`ICON_HARD` en `cheat`). Los emojis cambian según el sistema operativo, no siguen el tema y no dan identidad. El usuario quiere un solo conjunto propio, de línea, en dorado.

## Alcance

**Dentro:**

- **Módulo nuevo** `js/shared/ui/icons.js` (`PYL.ui.icons`), con su `<script>` en `index.html` después de `shared/ui/dom.js` y antes de `shared/ui/tooltip.js`:
  - `icons.svg(name, size = 16)` → string `<svg>` 24×24, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.8"` fijo, `stroke-linecap/linejoin="round"`, `aria-hidden="true"`, `focusable="false"`, `class="ic-svg"`. Nombre desconocido → `''`.
  - `icons.el(name, size = 16, cls?)` → `<span class="ic[ cls]" aria-hidden="true">` con el SVG adentro, listo para `append`.
  - `icons.dot(tone)` → `<span class="ic-dot" data-tone="g|y|r|n" aria-hidden="true">` (punto de semáforo, ver abajo).
  - `icons.hydrate(root)` → llena cada `[data-ic]` vacío del HTML estático con su SVG (idempotente; mismo patrón que hoy usa `ui/logistics.js#icons`).
  - `icons.NAMES` → arreglo con todos los nombres (lo usan las pruebas).
  - Nombres en inglés, kebab-case (`trash`, `copy`, `target`, `trend-up`).
- **Un solo conjunto:** se mudan al módulo todos los SVG propios que ya existen y se borran sus constantes locales: `tasks` (`ICON`: plus, chevron-down, check-check, check, trash, history, settings, close, bold, italic, underline…), `hub` (`ICON_DEL`, `ICON_UP`, `ICON_NOIMG`), `quick` (`ICON_BOLT`, `ICON_SEND`, `ICON_DEL`), `search/ui/candidate.js` (`ICON_COPY`, `ICON_OK`), `dkprompt` (`ICON_DK` → `dropkiller`), `adprompt` (`ICON_AP` → `ad-search`), `cheat` (`ICON_CHAIN`, `ICON_HARD`), `indicators` (`ICONS`) y `logistics` (`ICONS`). Los duplicados quedan en uno (`trash`, `copy`, `check`). Todos pasan a trazo 1.8.
- **Íconos de dos tonos de Logística** (importar, escoba, copiar, varita): sus dibujos se vuelven los oficiales del set como `download`, `broom`, `copy` y `sparkles`, con el relleno suave. Las clases `lg-i-fill`, `lg-i-a`, `lg-i-b`, `lg-i-d`, `lg-i-d2`, `lg-i-sweep` pasan a `ic-fill`, `ic-a`, `ic-b`, `ic-d`, `ic-d2`, `ic-sweep`, y su animación al pasar el mouse se mueve de `logistics.css` a `base.css`, disponible para cualquier botón con ícono (quieta con `prefers-reduced-motion`).
- **Color dorado** en `base.css`: token `--ic-gold: #D4AF37` en `:root` (temas oscuros) y `#9A7B1C` en `:root[data-theme="light"]` (`themes.css`). Fijo: no sigue `--b`. `.ic { color: var(--ic-gold); filter: drop-shadow(0 0 2px rgba(212,175,55,.35)); }`; en hover/foco del botón que lo contiene, el brillo sube. Tamaño y alineación: `inline-flex`, `vertical-align: -0.15em`, `gap` con el texto.
- **Dónde NO va dorado** (heredan `currentColor` del contenedor con `color: inherit` y sin `drop-shadow`): dentro de botones de color (botón primario `.btn:not(.ghost)`, flotantes `.qk-btn`, `.dk-btn`, `.ap-btn`, papelera `.cd-act.del`, botones verdes `.ts-go`) y dentro de notas semánticas (`.note.ny`, `.note.nr`, `.note.ng`, `.hm-warn`), para no perder contraste ni significado.
- **Semáforos** (🟢🟡🔴⚪ en Testeo, Escalado, Buscar y el Simulador): pasan a `icons.dot(tone)`, un punto CSS de 8 px con `--g`, `--y`, `--r` o `--muted` (nunca dorado).
- **Regla de reemplazo:**
  - Se cambia todo emoji que **abre** un botón, pestaña, título, sub-pestaña, tarjeta, fila, KPI, encabezado de tooltip o nota («⚠️ …», «💡 …», «⛔ No apagues…», «✅ ¡Acertaste!», «❌ No era esa», «🏆» del mejor puntaje).
  - Se quedan: emoji en medio de una frase y los símbolos tipográficos (✓ ✕ ↗ ↕ ↑ ↓ → ▭ ·).
  - Los controles del Simulador ▶ ⏸ ⏮ 🎲 pasan a íconos (`play`, `pause`, `skip-back`, `dice`).
- **Datos de `core`:** el emoji sale del dato y queda el nombre del ícono: `icon: '🎯'` → `icon: 'target'`; textos con emoji al inicio se separan (`t: '📂 Lectura real · pronto'` → `icon: 'folder-open', t: 'Lectura real · pronto'`). `core` sigue sin tocar el DOM; la `ui` pinta con `PYL.ui.icons`. Archivos: `search/core/search.js` (`STRATEGIES`, `BY_PROVIDER`, características del producto, `STATUS`, `MSP`, `VALUE`, niveles de score, filtros, estadísticas `byStatus`/`byComp`), `testing/core/testing.js` (`TEST_ACTIONS`, `TESTING_PARTS`, `badgeIcon`, `donts` de `TEST_CHAIN`), `testing/core/simulator.js` (`SIM_SCENARIOS`), `scaling/core/scaling.js` (acciones, partes, estrategias y `soon`), `ads/core/ads.js` (`AD_STRATEGIES`) y `landing/core/landing.js` (título «⭐ Imagen 1»). Los semáforos de datos pasan a `icon: 'dot'` + su `tone`.
- **Tooltip** (`shared/ui/tooltip.js`): `tip.icon` opcional (nombre) se pinta antes de `tip.h`; la línea `warn` usa `icons.svg('alert')` en vez de «⚠». Los tooltips del P&L (`pnl/ui/summary.js` `TIPS`, `pnl/ui/unit-table.js`) y `cheat` pasan su emoji a `icon`.
- **HTML estático** (`index.html`): botones y títulos con emoji (🧹 Limpiar formulario, 📋 Productos, 📊 Estadísticas, 📄, 📑/📈/📊 de los desplegables del P&L, 📋 Copiar resumen, 📄 Informe PDF) pasan a `<span class="ic" data-ic="<nombre>"></span>` + texto; `app/main.js` llama `PYL.ui.icons.hydrate(document)` al arrancar.
- **Interfaz por módulo** (strings en `ui/` y `app/`): `adprompt` (Importar, imagen vacía, Generar, Copiar, Limpiar), `dkprompt` (Generar, Copiar), `quick` (Limpiar, imagen y miniatura vacías), `ads/ui` (Copiar, Campaña, Video), `landing/ui` (Copiar, mini copiar, notas ⚠️/💡), `metawatch` (🔔 Sonido / 🔕 Sin sonido → `bell` / `bell-off`), `metrics/ui` y `cheat/ui` (💡, ⚠), `testing/ui` (semáforo, feedback, 💡, 🏆), `testing/ui/simulator.js` y `testing/app/testing.js` (🔗, 🎛, ⏳, ⚠, 🚀, controles), `scaling/ui` (semáforo, feedback, modos, avisos), `search/ui/candidate.js` (estadísticas, KPI, donas, barras), `pnl/ui/summary.js` (proyección «🚚 N pedidos en ruta» en pantalla) y `pnl/ui/unit-table.js`.
- **Entrenador** (`trainer/app/trainer.js`): los marcadores 🛑 🚀 ⚠️ al inicio de sus notas HTML se cambian por `PYL.ui.icons.svg(…)` dentro del mismo string, sin reescribir el entrenador.
- **Pruebas** (ver criterios) y actualización de `tests/fixtures/claves-pyl.json`.
- **Docs:** `CLAUDE.md` (nuevo bloque «Íconos», regla de reemplazo, token `--ic-gold`, excepciones, módulo en el mapa de capas y en dependencias) y `README.md`.

**Fuera de la spec:**

- **Logística:** el texto de los mensajes de WhatsApp (`core/logistics.js`, 🍃📱🏦💬…) no se toca: se copia al portapapeles.
- **Narrativa del P&L:** `pnl/core/diagnostics.js` (conclusiones, historia, veredicto «🚀 Ganador», «⚖️ Equilibrio», 🟢/🔴 del texto) y `pnl/ui/report.js` (informe PDF): son contenido que se copia con «Copiar resumen» y sale en el PDF. Se quedan con emoji.
- Cualquier texto que se copie al portapapeles o vaya dentro de un prompt (Prompt DropKiller, Prompt buscar anuncios, prompts de la landing, nombre de campaña).
- Íconos de terceros en el Centro de mando (favicons e íconos subidos por el usuario).
- El favicon `img/favicon.svg` y el pulso del título.
- Degradado SVG real (`url(#…)`) para el dorado.
- Reordenar o rediseñar pantallas: solo se cambia el símbolo, no el layout.
- Separar el entrenador en `core`/`ui` (su Fase 2).

## Modelo de datos

No hay datos guardados nuevos ni cambios en `localStorage`. Cambia la forma de algunos datos de `core`:

```js
// Antes
{ k: 'vdo', t: 'Estrategia VDO', icon: '🎯', d: '…' }
{ k: 'real', t: '📂 Lectura real · pronto', disabled: true }
byComp: [['g', 'Poco competido', '🟢'], …]

// Después
{ k: 'vdo', t: 'Estrategia VDO', icon: 'target', d: '…' }
{ k: 'real', icon: 'folder-open', t: 'Lectura real · pronto', disabled: true }
byComp: [['g', 'Poco competido', 'dot'], …]   // la ui pinta icons.dot(tone)
```

```js
// js/shared/ui/icons.js
PYL.ui.icons = {
  NAMES,                        // ['alert', 'bell', 'bell-off', 'broom', 'check', …]
  svg(name, size = 16),         // string; '' si no existe
  el(name, size = 16, cls),     // <span class="ic"> con el svg
  dot(tone),                    // <span class="ic-dot" data-tone>
  hydrate(root),                // llena [data-ic] vacíos
};
```

Tabla emoji → nombre (base; los SVG que ya existen conservan su dibujo con el nombre indicado):

| Emoji | Nombre | Emoji | Nombre | Emoji | Nombre |
|---|---|---|---|---|---|
| 🧹 | `broom` | 📋 | `clipboard` | 📊 | `chart-bar` |
| 📄 | `file` | 📑 | `file-text` | 📈 | `trend-up` |
| 📥 | `download` | 🖼 | `image` | ✨ | `sparkles` |
| 🧪 | `flask` | ⚖️ | `scale` | 📁 | `folder` |
| 📂 | `folder-open` | 🎬 | `clapper` | ⚠️ | `alert` |
| ⭐ | `star` | 💡 | `bulb` | 🔔 / 🔕 | `bell` / `bell-off` |
| 💰 | `coins` | 💵 | `cash` | 💸 | `money-out` |
| 🚚 | `truck` | 🎯 | `target` | 📦 | `package` |
| 📢 | `megaphone` | ⬆️ / ⬇️ / ⏬ | `arrow-up` / `arrow-down` / `arrows-down` | 🛑 | `stop` |
| 🏄 | `wave` | 🔀 | `shuffle` | 🔄 | `refresh` |
| 🎛️ | `sliders` | ✅ | `check-circle` | ❌ | `x-circle` |
| 🏆 | `trophy` | 🏭 | `factory` | 🔎 🔍 | `search` |
| 🌎 | `globe` | 📍 📌 | `pin` | 🏪 | `store` |
| 💎 | `gem` | 🤩 | `eye` | 🩹 | `bandage` |
| 🚀 | `rocket` | 🔸 / 🔶 | `signal-low` / `signal-mid` | 🔥 | `flame` |
| 🍃 | `leaf` | ⚔️ | `swords` | 🔗 | `link` |
| ⏳ | `hourglass` | 😐 | `face-meh` | 🧱 | `wall` |
| ❓ | `help` | ⛔ | `ban` | ▶ ⏸ ⏮ 🎲 | `play` `pause` `skip-back` `dice` |
| 🟢🟡🔴⚪ | `dot` (+ tone) | | | | |

## Plan de implementación

1. **Módulo y estilos.** Crear `js/shared/ui/icons.js` con `svg`, `el`, `dot`, `hydrate`, `NAMES` y todos los dibujos (los migrados + los nuevos de la tabla), trazo 1.8. `<script>` en `index.html` tras `dom.js`. En `base.css`: `--ic-gold`, `.ic`, `.ic-svg`, `.ic-dot[data-tone]`, reglas de herencia (botones de color, notas semánticas), animaciones `ic-*` movidas desde `logistics.css` con `prefers-reduced-motion`. En `themes.css`: `--ic-gold` del tema claro. `app/main.js` llama `hydrate(document)`. Actualizar `claves-pyl.json`. Pruebas del módulo. La app sigue igual (nadie lo usa aún).
2. **Migrar los SVG existentes.** `tasks`, `hub`, `quick`, `candidate`, `dkprompt`, `adprompt`, `cheat`, `indicators` y `logistics` usan `PYL.ui.icons`; se borran sus constantes locales y, en `logistics.css`, las reglas `lg-i-*` (las clases del SVG pasan a `ic-*`). Correr pruebas.
3. **HTML estático y P&L de pantalla.** Emojis de `index.html` → `data-ic`; `pnl/ui/summary.js` (`TIPS` → `icon`, proyección en pantalla) y `pnl/ui/unit-table.js`; `tooltip.js` acepta `tip.icon` y pinta `alert` en `warn`.
4. **Datos de `core` y su `ui`.** `search`, `testing`, `simulator`, `scaling`, `ads`, `landing` cambian emoji por nombre; sus `ui` (`search/ui/*`, `testing/ui/*`, `scaling/ui`, `ads/ui`, `landing/ui`, `metawatch/ui`, `metrics/ui`) pintan con `icons.el`/`icons.dot`. Actualizar pruebas de `core.test.js` que comparen textos con emoji.
5. **Botones y notas restantes** (`adprompt`, `dkprompt`, `quick`, `metawatch`, `testing/app`, controles del Simulador) y **entrenador** (`trainer.js`).
6. **Pruebas de barrido.** `core.test.js`: todo campo `icon` de los datos de `core` existe en `icons.NAMES` (se carga `icons.js` en Node con un `PYL` mínimo, o se valida contra la lista exportada). `smoke.test.js`: recorre el `textContent` visible de las 11 pestañas, Mis tareas, hub, Cortes de testeo (panel) y los paneles flotantes, y falla si encuentra `\p{Extended_Pictographic}` fuera de las zonas permitidas (`#v-logistica` mensajes/salidas, `#story-*` y veredicto del P&L, `#report`, `<textarea>`/salidas de prompts). Correr `node tests/core.test.js` y `smoke.test.js`.
7. **Docs.** `CLAUDE.md` y `README.md`.

## Criterios de aceptación

- [x] `PYL.ui.icons` existe con `svg`, `el`, `dot`, `hydrate` y `NAMES`; está en `claves-pyl.json`.
- [x] Cada nombre de `NAMES` devuelve un `<svg>` con `viewBox="0 0 24 24"`, `stroke="currentColor"`, `stroke-width="1.8"` y `aria-hidden="true"`; un nombre desconocido devuelve `''`.
- [x] `hydrate` es idempotente (dos llamadas no duplican el SVG).
- [x] No quedan constantes SVG locales: `grep` de `<svg` en `js/modules/**/ui` y `app` no encuentra dibujos de íconos (solo usos de `PYL.ui.icons`; quedan fuera los SVG que no son íconos: reloj, diagrama de métricas, cadena, teléfono de Inicio, gráficas).
- [x] Los íconos de Logística (importar, limpiar, copiar, generar) se ven y animan igual que antes, ahora desde el set.
- [x] Todo campo `icon` en datos de `core` (search, testing, simulator, scaling, ads, landing) es un nombre de `NAMES` o `dot`; ningún `t` empieza con emoji.
- [x] El barrido de `smoke.test.js` no encuentra emojis fuera de las zonas permitidas en ninguna pestaña ni panel.
- [x] Los mensajes de Logística generados conservan sus emojis (prueba existente sigue pasando).
- [x] «Copiar resumen» del P&L y el informe PDF conservan sus emojis.
- [x] Los semáforos son `.ic-dot` con `data-tone` `g`/`y`/`r`/`n`, no SVG dorado.
- [x] El botón de sonido de Cortes de testeo muestra `bell`/`bell-off` y conserva «Sonido»/«Sin sonido» y `aria-pressed`.
- [x] `node tests/core.test.js` y `smoke.test.js` pasan, consola limpia.
- [x] En el navegador (revisa el usuario): íconos dorados con brillo tenue en los 6 temas oscuros y dorado oscuro legible en el claro; dentro de botones de color y notas toman el color del contenedor; alineados con el texto; sin cambios de layout.

## Decisiones

- **Token plano + `drop-shadow`, no degradado SVG:** `currentColor` y `url(#…)` no se combinan, y una `url(#…)` puede no resolverse con `file://`. El brillo da el toque metálico. *(Elegido por el usuario.)*
- **Dorado solo en íconos sueltos:** en botones de color y notas semánticas el ícono hereda el color para no perder contraste ni significado. *(Elegido por el usuario; incluir las notas semánticas es extensión de la misma regla.)*
- **Dorado fijo `#D4AF37`, `#9A7B1C` en tema claro:** identidad que no cambia con el acento del tema. *(Elegido.)*
- **Una sola spec** aunque toca casi todos los módulos. *(Elegido por el usuario; se descartó partir en interfaz/datos o por pestañas.)*
- **Todos los SVG actuales al módulo, logos incluidos** (`dropkiller`, `ad-search`). *(Elegido.)*
- **Los íconos de dos tonos de Logística son los oficiales** de `download`, `broom`, `copy`, `sparkles`; su animación queda para toda la app. *(Elegido.)*
- **Trazo 1.8 fijo**, sin parámetro de grosor. Los íconos de `tasks` que usaban 2.5–3 (chevron, check) quedan más finos. *(Elegido; se descartó «2 ajustable».)*
- **Semáforos como punto CSS de color semántico**, no dorado. *(Elegido.)*
- **Nombre de ícono en el dato de `core`**, no mapa emoji → ícono en `ui`: el emoji deja de ser la fuente. *(Elegido.)*
- **Narrativa del P&L, informe PDF, mensajes de Logística y prompts copiados conservan emoji:** son contenido que sale de la app. *(Elegido.)*
- **Regla:** emoji que abre un elemento = ícono; en medio de frase o símbolo tipográfico = se queda; controles del Simulador = ícono. *(Elegido.)*
- **API `svg()` + `el()` + `dot()` + `hydrate()`**; se descartaron «solo `svg()`» y un sprite `<symbol>` en `index.html`. *(Elegido.)*
- **El entrenador entra** con cambio local en sus strings HTML. *(Elegido.)*
- **Barrido automático** en `smoke.test.js` + validación de nombres en `core.test.js`. *(Elegido.)*

## Riesgos

- **Spec grande:** muchos archivos; un paso a medias deja íconos mezclados. Mitigación: cada paso del plan deja la app funcionando y las pruebas en verde.
- **Pruebas que comparan textos con emoji** (`core.test.js`, `smoke.test.js`: sub-pestañas, feedback, sonido, escenarios) fallarán al cambiar el dato; hay que actualizarlas en el mismo paso.
- **`app.state` guardado:** ningún dato persistido guarda emojis de íconos (las claves guardadas son `k`), pero se revisa `pyl-search` (estado, mercado) antes del paso 4.
- **Contraste del dorado** sobre fondos claros o amarillos (tema Gold, botón primario): cubierto por la herencia en botones de color y el tono del tema claro; se revisa en el navegador.
- **Barrido con falsos positivos:** ®, ✓ o ↗ no son `Extended_Pictographic` salvo algunos (®, ↗, ↕ sí pueden serlo); la prueba lleva una lista blanca de símbolos tipográficos.
- **Choque de nombres al aplanar en `js/index.js`:** no aplica (`icons.js` es `ui`, no `core`), pero si `core.test.js` lo carga en Node debe hacerlo aparte, sin agregarlo a la lista de `core`.
