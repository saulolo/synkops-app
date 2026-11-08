# SPEC 03 — Guía de consulta de las Hard Metrics

> **Estado:** Implementado
> **Depende de:** SPEC 00, SPEC 02
> **Fecha:** 2026-11-07
> **Objetivo:** Reemplazar la tabla de la pestaña de métricas por una guía animada de consulta (diagrama TikTok · ¿Cómo se logra? · Meta) que explique cómo se lee cada métrica dura (CTR, CPC, CPM, CPPI, CPA), con avisos, una tabla de diagnóstico y solución, y una explicación simple de cada una.

## Por qué existe esta spec

La tabla anterior (`trainer.js`, bloque "Módulo 1 · Tabla") solo daba el número límite y un probador "Mi dato". No decía qué mide cada métrica ni qué pregunta responde.

El usuario quiere una guía de consulta con la forma de su gráfica "Las 5 métricas más importantes". Ahí TikTok va a la izquierda, "¿Cómo se logra?" en el centro y Meta a la derecha. Cada métrica dice si se quiere alta o baja y a qué lleva ("Mayor probabilidad de compra", "Mayor rentabilidad"). Debe tener movimiento y verse llamativa, sin dejar de ser fácil de leer.

Fuentes (no siempre coinciden):

| Métrica | Criterio de NovaSociety (Juan, MCP `reglas_de_juan`) | Referencia del curso (`04-analisis-y-optimizacion-de-metricas.md` y la imagen "Las 5 métricas") |
|---|---|---|
| CTR | No se mira | Meta > 2 %, TikTok > 0,5 % |
| CPC | Sin número fijo: se lee junto al CPM | < 800 COP, ideal < 600 |
| CPM | Meta ≤ 20.000, TikTok ≤ 6.000 | Meta < 15.000, TikTok < 6.000, ideal < 5.000 |
| CPPI | < 4.000 bueno · 4.000–5.000 se sostiene · 5.000–6.000 flojo · > 6.000 apaga | < 3.500, ideal < 3.000 |
| CPA | Del costeo: escala / tope / apaga (genérico 12.000 / 15.000 / 20.000) | < 15.000, ideal < 12.000 |

En la app **manda el criterio de NovaSociety**. En la interfaz no se nombra a Juan: dice "NovaSociety". Los números del curso se usan donde NovaSociety no da uno (los límites de CTR y CPC, el rango ideal).

Es el primer paso para sacar el Entrenador de `trainer.js` (Fase 2): la guía nace como módulo propio con capas y pruebas.

## Alcance

**Dentro:**

- Módulo nuevo `metrics` con capas `core`, `ui` y `app`, y su CSS `css/modules/metrics.css`.
- **La pestaña** (`#v-metricas`, rótulo "Métricas"; el id `metricas` no cambia). Su cabecera general dice "Después de pautar · leo mis números", "Métricas: cómo leer mi campaña" y una definición de qué dicen las métricas. La pestaña tendrá más apartados (métricas blandas, en otra spec); este es el de Hard Metrics.
- **Diagrama** `#hm-map`, una tarjeta con:
  - Cabecera propia "Hard Metrics" (título con barrita de acento y subtítulo) y el botón "Expandir" (ver abajo).
  - Título "Las 5 métricas más importantes" y, debajo, una llave en forma de onda suave que baja hacia TikTok (izquierda) y Meta (derecha), con la punta hacia abajo.
  - Tres columnas: TikTok · ¿Cómo se logra? · Meta. TikTok y Meta son chips con punto de color (cian y color de la marca); "¿Cómo se logra?" es una píldora con degradado de la marca. "Rangos" va justo encima de la columna de números de cada lado, con una "i".
  - Una fila por métrica, en el orden de la gráfica: CTR, CPC, CPM, CPPI, CPA.
  - **El diagrama es una imagen fija de orientación:** no se alimenta de las métricas reales (eso será un módulo dinámico en otra spec). Lo que dice cada fila está en `row.view`:
    - CTR: `> 0,5 %` (TikTok) y `> 2 %` (Meta). CPC: `< 800` en los dos lados. CPM: `≤ 6.000` (TikTok) y `≤ 20.000` (Meta). CPPI: `< 4.000` en los dos lados. CPA: `≤ 15.000` en los dos lados. Ninguno lleva texto pequeño debajo.
  - Por lado y por métrica: dirección ("Alta" o "Baja"), botón con el nombre y su subtítulo (Clics, Clics, Retención, Interés + Web, Compra), con una "i" en la esquina, y el número grande.
  - Lados exteriores: las flechas de CTR, CPC, CPM y CPPI se juntan en "Mayor probabilidad de compra" y la de CPA va a "Mayor rentabilidad".
  - Centro: el "¿Cómo se logra?" de cada fila. CTR y CPC comparten la marca "Despierta curiosidad".
- **Avisos (`#tip`), todos con la misma tarjeta moderna (clase `hm-tip`):**
  - Al pasar el mouse por el **número** de CTR, CPC, CPM y CPPI: "Límite máximo permitido" solo de la plataforma de ese lado y, si lo hay, el rango ideal. CTR: 0,5 % TikTok · 2 % Meta, más la nota "No se mira…". CPC: $ 800, ideal < $ 600. CPM: TikTok $ 6.000 · Meta $ 20.000, ideal < $ 5.000. CPPI: $ 4.000 COP, ideal < $ 3.000.
  - Al pasar el mouse por el **número del CPA**: los genéricos de NovaSociety (escala 12.000, tope 15.000, apaga 20.000). El botón del CPA no lleva aviso.
  - Al pasar el mouse por **"Rangos"**: la frase "Quiero que esta métrica sea lo más ( ) posible".
  - Al pasar el mouse por el **"¿Cómo se logra?"** de una fila: una tabla de dos columnas, "Diagnóstico si falla (fuera de rango)" y "Palanca de solución", solo con la fila de esa métrica y tres viñetas por celda. Lo que sale del criterio de NovaSociety va marcado "NovaSociety:".
- **Botón "i" de cada métrica:** al hacer clic abre un panel más alto, con efectos, que explica la métrica: nombre completo, qué mide en una frase, una comparación cotidiana (💡), el semáforo de sus señales (rango y qué significa) y una nota "Ojo". Se cierra con ×, clic afuera, Esc, otro clic en la misma "i" o al mover la ventana; solo hay uno abierto. En celular la "i" sale junto al botón de TikTok.
- **Movimiento:**
  - Al abrir la pestaña, la llave y las flechas se dibujan una vez, fila por fila (trazo que avanza). No se repite al volver.
  - Al pasar el mouse por una fila, se resalta esa fila en los dos lados y en el centro, las demás se atenúan y las flechas de esa fila se mueven (rayitas que corren en su sentido). La punta de destino compartida también se ilumina.
  - Las flechas de la llave tienen su propio movimiento: una luz que viaja por el trazo.
  - Todas las flechas entre columnas miden lo mismo (columnas de ancho fijo y separación igual a cada lado).
  - La fila elegida (clic en el botón de la métrica) queda marcada. Elegirla no abre nada.
  - Con `prefers-reduced-motion: reduce` todo se ve completo y sin animación.
- **Ancho y expandir.** La tarjeta mide lo mismo que las demás. Con el botón "Expandir" o con un clic en un espacio vacío de la tarjeta, se expande hasta 1760 px (o el ancho de la ventana − 64 px) y la separación entre columnas crece (48 px; 76 px desde 1600 px de ventana), con flechas más largas y gruesas. Otro clic la contrae. Siempre empieza contraída. Por debajo de 1281 px de ventana el botón no aparece y el diagrama se apila.
- **Tarjeta "La cadena que decide todo":** copia exacta de la de Inicio, debajo del diagrama. Comparte con la de Inicio el contenido y el eslabón elegido (la lógica vive en `trainer.js`).
- **En las dos tarjetas de la cadena (Inicio y Métricas):**
  - Sobre los pasos 1 y 2: "MÉTRICAS ANTES DEL CLIC". Sobre los pasos 3 y 4: "MÉTRICAS DESPUÉS DEL CLIC".
  - Una raya vertical con rayitas animadas entre el paso 2 y el 3.
  - Al hacer clic en un paso, su desplegable "¿Qué falla y cómo lo arreglo?" se abre; al empezar va contraído.
- **Títulos de las tarjetas de las otras pestañas** (Inicio, Buscar, Desarrollo, Costeo, Simulador, Escalera, Creativos): barrita de acento y 22 px, como la cabecera de Hard Metrics (regla en `css/base.css`). El Tablero P&L queda igual.
- **Tooltip compartido** (`js/shared/ui/tooltip.js`): acepta una tabla (`tip.table`), una clase propia (`tip.cls`), no pinta el título cuando hay tabla, se rehace según el contenido (no solo el título) y se abre abajo del cursor si arriba no cabe.
- **Celular** (pantalla angosta): el diagrama se apila. Por métrica: nombre con Alta o Baja, luego TikTok y Meta lado a lado y "¿Cómo se logra?" debajo. Sin flechas laterales y sin scroll horizontal.
- **Accesibilidad:** cada métrica es un botón con `aria-pressed`; la "i" es un botón con `aria-expanded`; los avisos se abren también con el teclado; las flechas SVG son decorativas (`aria-hidden`).
- **Quitado de la pestaña:** el selector Meta / TikTok / Comparar, el probador "Mi dato", la tabla `#mtBody`, las tres notas de abajo, la ficha de detalle `#hm-detail` y el bloque "Efecto de desencadenamiento" `#hm-chain` (se construyeron y se descartaron durante la spec).
- **Quitado de `trainer.js`:** el bloque "Módulo 1 · Tabla" (`plat`, `ICON`, `rows`, `fv`, `rangeTxt`, `light`, `renderTable`, listeners de `[data-plat]`).
- Pruebas en `tests/core.test.js` y `tests/smoke.test.js`.
- Actualizar `CLAUDE.md` y `README.md` después del merge.

**Fuera (para specs futuras):**

- Métricas blandas (Hook rate, Hold 25/50/75 %, Outbound CTR, ATC/IC, CVR).
- Un diagrama dinámico con las métricas reales del usuario.
- Glosario de "otras métricas" (presupuesto, resultados, alcance, impresiones, importe gastado, clics en el enlace).
- Protocolo de testeo, Surfing Scaling, reglas anti-pérdida y escalado horizontal (ya viven en Simulador y Escalera).
- Partir el resto de `trainer.js` en capas.
- Leer métricas reales de Meta o TikTok.
- Librerías de animación o de gráficas (todo con CSS y SVG propios).

## Modelo de datos

No hay persistencia nueva ni claves de `localStorage`. La métrica elegida y si el diagrama está expandido viven solo en memoria. `app.state.metrics` ya es del tablero P&L (campañas de Meta), por eso el estado de la guía es `app.state.hardMetrics = { sel, expanded, played }`.

### `js/modules/metrics/core/metrics.js` → `PYL.core.metrics`

```js
// Valores genéricos de NovaSociety para el CPA (los del producto sin costeo): salen en el aviso del número del CPA.
const GENERIC_CPA = { escala: 12000, tope: 15000, apaga: 20000 };

// Destinos de las flechas exteriores.
const GOALS = { buy: 'Mayor probabilidad de compra', profit: 'Mayor rentabilidad' };

// Encabezado de la tabla de "¿Cómo se logra?".
const FAIL_HEAD = ['Diagnóstico si falla (fuera de rango)', 'Palanca de solución'];

// Una fila por métrica, en el orden del diagrama.
const HARD_METRICS = [
  {
    k: 'cpm',                       // 'ctr' | 'cpc' | 'cpm' | 'cppi' | 'cpa'
    name: 'CPM',
    tag: 'Retención',               // subtítulo bajo el nombre (de la gráfica)
    question: '¿El video retiene?',
    how: ['Creativo ', { b: 'entretenido' }, ' = ', { b: 'retención' }],   // columna "¿Cómo se logra?"
    group: null,                    // 'curiosidad' en CTR y CPC (marca "Despierta curiosidad")
    dir: 'down',                    // 'up' = Alta · 'down' = Baja
    goal: 'buy',                    // 'buy' | 'profit'
    view: {                         // lo que dice el diagrama, por plataforma
      meta:   { main: '≤ 20.000', ref: null, tip: { h, p, li, cls } },   // tip: aviso al pasar el mouse por el número
      tiktok: { main: '≤ 6.000',  ref: null, tip: { /* ... */ } },
    },
    diag:  [/* 3 viñetas (string o segmentos) de "Diagnóstico si falla" */],
    lever: [/* 3 viñetas de "Palanca de solución" */],
    means: {                        // popover de la "i"
      full: 'Costo por mil impresiones',
      simple: 'Cuánto pago para que mi anuncio se muestre mil veces.',
      analogy: '…una comparación cotidiana…',
      signals: [{ z: 'g', t: 'Menos de $ 5.000', m: 'Ideal: …' } /* z: g | y | o | r */],
      note: 'Es el primer eslabón de la cadena…',
    },
  },
  // ctr, cpc, cppi, cpa ...
];

const copText = (v) => '15.000';    // formato es-CO sin toLocaleString (igual en navegador y Node)
```

Textos de "¿Cómo se logra?", tomados de la gráfica:

| Métrica | ¿Cómo se logra? | Subtítulo | Dirección | Destino |
|---|---|---|---|---|
| CTR | Buen creativo + interés en el producto | Clics | Alta | Mayor probabilidad de compra |
| CPC | Buen creativo + interés en el producto | Clics | Baja | Mayor probabilidad de compra |
| CPM | Creativo **entretenido** = **retención** | Retención | Baja | Mayor probabilidad de compra |
| CPPI | Buena product page/landing + buena oferta | Interés + Web | Baja | Mayor probabilidad de compra |
| CPA | Haciendo bien todo lo anterior | Compra | Baja | Mayor rentabilidad |

Convenciones:

- Zonas (`z`): `g` bueno, `y` se sostiene, `o` flojo, `r` apaga o caro. Colores con los tokens `--g`, `--y`, `--o`, `--r`.
- Todo en COP. Los textos (`how`, `diag`, `lever`) son segmentos (`string`, `{ b }`) y se pintan con `PYL.ui.dom.rich`. Nada de HTML en `core`.
- Las soluciones de NovaSociety se copian tal cual las da el MCP: CPM caro → creativos nuevos con el hook en los primeros 3 segundos; CPC caro con CPM sano → el producto no interesa; buen CPPI sin ventas → mejorar la confianza de la página, la oferta y el formulario, sin fricción. Lo demás son buenas prácticas generales y van sin la marca "NovaSociety:".
- Los nombres exportados (`GENERIC_CPA`, `GOALS`, `FAIL_HEAD`, `HARD_METRICS`) no existen en otro `core`: así no se pisan al aplanarlos en `js/index.js`.

### Animación y medidas

- Las flechas y la llave son `<path>` SVG dibujados con `stroke-dasharray`/`stroke-dashoffset`. Las flechas se miden con `getBoundingClientRect` y se recalculan en `resize`, al abrir la pestaña (`nav:vista`), al cargar las tipografías y al expandir o contraer.
- La animación de entrada corre la primera vez que se abre la pestaña con medidas reales.
- La luz de la llave se mide con `getTotalLength()`: el largo se pasa a CSS con unidad (`px`), porque un número sin unidad dentro de `calc()` no se anima.

### Archivos

```text
js/modules/metrics/
  core/metrics.js   PYL.core.metrics   datos y textos, sin DOM
  ui/metrics.js     PYL.ui.metrics     map(node, rows, on), mark, expand, drawArrows, arrowPaths
  app/metrics.js    PYL.app.state.hardMetrics   arranca, estado en memoria, escucha nav:vista, resize y clics
css/modules/metrics.css                estilos .hm-* (después de ads.css, antes de themes.css)
```

IDs con prefijo `#hm-`: `#hm-map`. Clases del popover: `.hm-pop`, `.hm-info`. La copia de la cadena en Métricas usa los ids `flow2` y `fpath2` (los de Inicio son `flow` y `fpath`): un degradado dentro de una vista oculta no se pinta si se referencia desde otra.

## Plan de implementación

1. **Núcleo.** `core/metrics.js` con los datos, agregado a `index.html` y `js/index.js`. Pruebas de las filas, direcciones, destinos, números del diagrama, avisos, diagnósticos y significados.
2. **Diagrama estático.** `ui/metrics.js` con `map` y `css/modules/metrics.css` (PC y apilado).
3. **Flechas y llave.** `drawArrows`: llave, flechas entre columnas, flechas exteriores que se juntan, marca "Despierta curiosidad".
4. **Avisos, tabla e "i".** Tooltip compartido con tabla; avisos de límites, CPA, Rangos; tabla de "¿Cómo se logra?"; popover de la "i".
5. **Arranque y animación.** `app/metrics.js`: pinta, escucha `nav:vista` y `resize`; entrada la primera vez; `prefers-reduced-motion`.
6. **Cambiar la pestaña.** Cabecera nueva en `index.html`, quitar la tabla vieja, notas y selector; borrar de `trainer.js` el bloque "Módulo 1 · Tabla"; borrar del CSS solo las reglas sin uso.
7. **Cadena.** Copia de "La cadena que decide todo" bajo el diagrama; títulos antes/después, raya y desplegable que abre al clic en las dos tarjetas.
8. **Ancho, expandir y estilos.** Diagrama del mismo ancho que las demás tarjetas, con botón "Expandir"; estilo de título de tarjeta en las otras pestañas.
9. **Humo.** Pruebas en `tests/smoke.test.js` y `tests/fixtures/claves-pyl.json` regenerado con `node tests/smoke.test.js --claves`.
10. **Documentación.** Después del merge, actualizar `CLAUDE.md` y `README.md`: módulo `metrics`, prefijo `#hm-`, orden de CSS, el tooltip con tabla, la cadena duplicada y el estilo de título de tarjeta.

## Criterios de aceptación

Marcados `[x]` los que cubren `tests/core.test.js` y `tests/smoke.test.js` o una revisión de código. Los de "(revisado en el navegador)" los confirma el usuario.

**Diagrama**

- [x] La pestaña se llama "Métricas"; el diagrama trae la cabecera "Hard Metrics".
- [x] El diagrama tiene tres columnas (TikTok · ¿Cómo se logra? · Meta) y 5 filas en orden CTR, CPC, CPM, CPPI, CPA.
- [x] Cada lado tiene un botón por métrica (10) con su "i" (10), el número grande y "Alta" o "Baja".
- [x] CTR dice "Alta"; CPC, CPM, CPPI y CPA dicen "Baja".
- [x] "Rangos" aparece una vez por lado y su aviso dice "Quiero que esta métrica sea lo más ( ) posible"; la frase no está escrita en el diagrama.
- [x] CTR: `> 2 %` (Meta) y `> 0,5 %` (TikTok); CPC: `< 800`; CPM: `≤ 20.000` (Meta) y `≤ 6.000` (TikTok); CPPI: `< 4.000`; CPA: `≤ 15.000`. Ninguno con texto pequeño debajo.
- [x] Las flechas de CTR, CPC, CPM y CPPI llegan a "Mayor probabilidad de compra"; la de CPA a "Mayor rentabilidad" (`arrowPaths`, revisado en el código).
- [x] La llave del título baja con forma de onda y las dos puntas apuntan hacia abajo, una a TikTok y otra a Meta (revisado en el navegador).
- [x] Todas las flechas entre columnas miden lo mismo en las 5 filas (revisado en el navegador).
- [x] Al pasar el mouse por una fila, esa fila se resalta, las demás se atenúan y sus flechas se mueven; la punta de destino también se ilumina (revisado en el navegador).
- [x] La luz de la llave recorre las flechas de punta a punta (revisado en el navegador).
- [x] La primera vez que se abre la pestaña, la llave y las flechas se dibujan fila por fila; al volver no se repite (revisado en el navegador).

**Avisos, tabla y significado**

- [x] Cada número de CTR, CPC, CPM y CPPI muestra "Límite máximo permitido" solo de su plataforma y el rango ideal (CPM Meta $ 20.000, TikTok $ 6.000; CPPI $ 4.000 COP, ideal < $ 3.000).
- [x] El CTR conserva la nota "No se mira…" en su aviso.
- [x] El número del CPA muestra los genéricos 12.000 / 15.000 / 20.000; el botón del CPA no tiene aviso.
- [x] El "¿Cómo se logra?" de cada fila muestra una tabla de 2 columnas con solo la métrica de esa fila, sin título.
- [x] Cada métrica trae 3 o más viñetas de diagnóstico y de solución.
- [x] La "i" abre el panel de significado con su semáforo (el CPPI con 4 señales); solo hay uno abierto; el segundo clic o Esc lo cierra; abrirlo no marca la métrica.
- [x] La nota del CTR ya no cita el caso de Gotas Focus.
- [x] Los avisos y el panel se ven bien en los 7 temas, claro y oscuro (revisado en el navegador).

**Ancho y expandir**

- [x] La tarjeta empieza contraída; el botón y un clic en un espacio vacío la expanden y la contraen; un clic en un elemento con aviso no cambia el ancho.
- [x] Contraída mide lo mismo que las demás tarjetas; expandida se ensancha y las flechas se alargan sin desalinearse (revisado en el navegador, con pantalla de 27").
- [x] En pantalla angosta (< 1281 px) el diagrama se apila, el botón no aparece, no hay flechas laterales y no hay scroll horizontal (revisado en el navegador).
- [x] Al cambiar el tamaño de la ventana, las flechas siguen unidas a sus nodos (revisado en el navegador).

**Cadena**

- [x] Debajo del diagrama está "La cadena que decide todo" (dos copias en la página: Inicio y Métricas), con los 4 eslabones; elegir uno cambia las dos.
- [x] Los títulos "MÉTRICAS ANTES DEL CLIC" y "MÉTRICAS DESPUÉS DEL CLIC" y la raya están en las dos tarjetas; al tocar un paso su desplegable se abre.
- [x] No hay ids repetidos en `index.html` (`flow2` y `fpath2` en la copia).
- [x] Ya no existen `#hm-detail` ni `#hm-chain`.

**Limpieza y calidad**

- [x] Ya no existen en la página `[data-plat]`, `#mtBody` ni los campos "Mi dato".
- [x] `trainer.js` ya no tiene `renderTable`, `rangeTxt` ni `light`, ni dispara `costeo:producto`.
- [x] `PYL.core.metrics` no toca el DOM (no usa `document` ni `window`).
- [x] `node tests/core.test.js` (6 pruebas), `tests/smoke.test.js` y `node --check` de todos los archivos tocados pasan; `claves-pyl.json` coincide con `--claves`; consola limpia.
- [x] Con "reducir movimiento" activado en el sistema, todo se ve completo y sin animación (revisado en el navegador).
- [x] Los títulos de tarjeta nuevos (barrita y 22 px) se ven bien en las otras pestañas, sobre todo "Datos del conjunto" e "Historial de evaluaciones", y dentro de los desplegables de Buscar producto (revisado en el navegador).

## Decisiones

- **Sí:** diagrama con la estructura de la gráfica del usuario, animado. **No:** tabla moderna, ni diagrama con tabla completa debajo (repetía información).
- **Sí:** el diagrama es estático: números fijos en `row.view`. Pedido del usuario; lo dinámico irá en otro módulo.
- **Sí:** NovaSociety manda. En la interfaz no se nombra a Juan ("NovaSociety"). Los números del curso se usan solo donde NovaSociety no da uno.
- **Sí:** el CPM de Meta es ≤ 20.000 en el diagrama y en el aviso (el criterio de NovaSociety), aunque la tabla del curso diga 15.000.
- **Sí:** cada aviso de límite solo habla de la plataforma de su lado. El CTR de Meta queda en 2 % (el usuario escribió "12.0 %"; lo confirmó como 2 %).
- **Sí:** avisos al pasar el mouse para lo corto (límites, Rangos, CPA, tabla de diagnóstico) y un panel con clic en la "i" para lo largo (significado). La tabla va sin la columna "Métrica": el usuario ya está parado sobre ella.
- **No:** la ficha de detalle `#hm-detail` ni el bloque "Efecto de desencadenamiento". Se construyeron y el usuario las descartó cuando el diagrama, los avisos y la "i" ya decían lo mismo. Con ellas se fueron el evento `costeo:producto`, las zonas del CPA por producto, los textos "Referencia del curso" y la fórmula.
- **Sí:** "La cadena que decide todo" se copia en Métricas compartiendo el código de `trainer.js` (misma lógica, dos tarjetas sincronizadas). Ids únicos en la copia. **No:** una cadena independiente en cada vista.
- **Sí:** al tocar un paso de la cadena su desplegable se abre; al empezar va contraído.
- **Sí:** la tarjeta del diagrama mide como las demás y se expande bajo demanda (botón o clic en un espacio vacío), sin recordar el estado. **No:** ensancharla siempre.
- **Sí:** cabecera "Hard Metrics" dentro de la tarjeta, porque habrá otra parecida para las métricas blandas; encabezado general de la pestaña para las dos.
- **Sí:** chips con identidad para TikTok y Meta y píldora de degradado para "¿Cómo se logra?". **No:** la opción sobria (texto con barrita), que el usuario probó y descartó.
- **Sí:** el título de tarjeta con barrita se aplica a las demás pestañas del entrenador, buscar, desarrollo y costeo con una sola regla en `base.css`. **No:** al Tablero P&L (no se pidió).
- **Sí:** el tooltip compartido gana tabla, `cls` y clave por contenido. Los demás tooltips de la app no cambian.
- **Sí:** CSS y SVG propios, sin librerías; `prefers-reduced-motion` respetado; animación de entrada solo la primera vez.
- **Sí:** módulo nuevo `metrics` con capas y pruebas. **No:** métricas blandas aquí.
- **No:** guardar la métrica elegida ni el estado expandido.
- **No:** cambiar `GENERIC` de `trainer.js` para que lea `GENERIC_CPA`. Queda duplicado hasta partir `trainer.js` (Fase 2); deuda anotada.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Las flechas se miden con la pestaña oculta y salen en 0 | Recalcular al abrir la pestaña (`nav:vista`), en `resize` y al cargar las tipografías |
| Las flechas se desalinean con textos largos, zoom o al expandir | Posición real de los nodos con `getBoundingClientRect`; nuevo dibujo al expandir o contraer; revisar con zoom del navegador |
| Entre 1281 y 1300 px de ventana el diagrama queda justo | Columna central flexible; si se ve apretado, subir el punto en que se apila |
| Demasiado movimiento cansa o distrae | Entrada solo una vez, pulso suave y `prefers-reduced-motion` |
| En jsdom no hay medidas reales y las flechas no se dibujan | `drawArrows` no hace nada sin medidas; el humo revisa nodos, avisos y paneles, no las flechas ni las animaciones |
| Colores fijos en el SVG que no siguen los temas | Títulos del SVG con variables de tema; revisar los 7 temas |
| El estilo de título de tarjeta apreta títulos que comparten fila con botones | Una sola regla en `base.css`; revisar "Datos del conjunto" e "Historial de evaluaciones" |
| Un clic en un espacio vacío expande sin querer | Los botones y los elementos con aviso no expanden; el cursor cambia a lupa |
| Dos copias de la cadena se desincronizan | Una sola función `chain()` pinta todas las copias; prueba de humo |
| Las fuentes cambian (MCP o curso) | Los números viven solo en `HARD_METRICS` y `GENERIC_CPA` |

## Lo que **no** está en esta spec

- Métricas blandas.
- Diagrama dinámico con las métricas reales.
- Glosario de otras métricas.
- Protocolo de testeo y escalado.
- Partir el resto de `trainer.js`.
- Librerías de animación o de gráficas.

Cada una de esas, si llega, va en su propia spec.
