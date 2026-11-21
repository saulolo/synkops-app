# SPEC 21 — Cortes de testeo en vivo en el margen derecho de la barra

> **Estado:** Implementado
> **Depende de:** SPEC 06, SPEC 10, SPEC 20
> **Fecha:** 2026-11-20
> **Objetivo:** Llenar el margen derecho de la barra superior, desde 1680 px, con el gasto real de los conjuntos de una campaña de testeo de Meta, leído con la Marketing API, que avisa con latido y sonido cuando un conjunto llega al corte de 20.000, 30.000 o 40.000.

## Por qué existe esta spec

La SPEC 20 puso el reloj en el margen izquierdo de la barra y dejó el derecho vacío (encima del Centro de mando). El usuario quiere usar ese espacio para algo útil del negocio. En el testeo de NovaSociety cada conjunto se califica al llegar a 20.000, 30.000 y 40.000 de gasto acumulado (`NS_TEST.cuts`). Hoy hay que entrar al Administrador de anuncios a mirar. El usuario quiere que la barra le avise cuando un conjunto llega a un corte.

Es la **primera conexión directa** de Synkops: hasta ahora los datos entraban a mano o con archivos. Se evaluaron otras fuentes (ver Decisiones): el MCP de Meta y los conectores de Claude no se pueden usar desde `file://`, y el scraping del Administrador exige una extensión frágil que va contra los términos de Meta. La Marketing API con un token de usuario del sistema es gratis, de solo lectura, no vence y está permitida.

## Alcance

**Dentro:**

- Módulo nuevo `metawatch` (`js/modules/metawatch/{core,services,ui,app}`) con estilos en `css/modules/metawatch.css` (después de `clock.css`, antes de `themes.css`). Prefijo de ids y clases `#mw-`/`.mw-`; prefijo de nombres del núcleo `mw`/`MW_` (para no chocar al aplanar en `js/index.js`).
- **Bloque en la barra** `<div class="mw-rail" id="mw-root">` dentro de `.top-in`, después de `.top-row`. Espejo del reloj: absoluto, alto completo de la barra, 210 px de ancho, `left: calc(100% - 24px + 14px)`. Solo se ve **desde 1680 px**; por debajo, `display:none`. Se ve en todas las pestañas.
- **Contenido del bloque:**
  - Cabecera: «CORTES · <primer nombre del producto o de la campaña>» y la hora del último dato («↻ 10:45»).
  - Una fila `.mw-set[data-id]` por conjunto de la campaña elegida (el ABO trae 4): nombre corto (`C1`…`C4` por orden de creación; nombre completo en `title`), barrita con marcas en 20K, 30K y 40K (de `NS_TEST.cuts`) y gasto acumulado en miles («31K»). Un conjunto que ya no está activo (pausado o apagado; `effective_status` distinto de `ACTIVE`) va atenuado (`.mw-off-set`) con la etiqueta «OFF» en vez de la barrita, conserva su gasto y no late ni suena.
  - Sin conexión: «Conectar Meta». Sin campaña: «Elige una campaña». Con error: el mensaje corto (ver Estados).
- **Clic en el bloque** abre el panel `#mw-panel` (flotante, bajo el bloque, alineado a la derecha). Se cierra con ✕ `#mw-x`, Esc o clic fuera. El foco vuelve al bloque.
- **Panel:**
  - Conexión: campo `#mw-token` (`type="password"`) y botón `#mw-connect`. Al conectar valida el token pidiendo las cuentas.
  - Sin guía para sacar el token: se hizo y se quitó en el paso 8 a pedido del usuario (ya tiene el token; el paso a paso quedó en el paso 1 de esta spec, ver Decisiones).
  - Cuenta publicitaria `#mw-account` (lista de `/me/adaccounts`) y campaña `#mw-campaign` (campañas activas de esa cuenta).
  - Lista `#mw-rows` con cada conjunto: gasto, pagos iniciados (PI), ventas, CPPI, corte alcanzado y el veredicto de `testVerdict` en ese corte (frase y color de luz). Si el conjunto late, botón «Revisado» (`.mw-seen`).
  - Botones: «Actualizar» `#mw-refresh`, sonido 🔔/🔕 `#mw-sound` y «Desconectar» `#mw-off` (pregunta antes y borra `pyl-meta` entero).
- **Lectura de Meta** (`services/metawatch.js`, `fetch` GET a `https://graph.facebook.com/<MW_API>/…` con el token en el encabezado `Authorization: Bearer <token>`, nunca en la URL: Chrome imprime en consola la URL de cada petición fallida y el token quedaría a la vista; confirmado en el paso 1 que Meta acepta el encabezado desde `file://`):
  - `GET /me/adaccounts?fields=id,name,currency,account_status`
  - `GET /act_<cuenta>/campaigns?fields=id,name,effective_status&effective_status=["ACTIVE"]`
  - `GET /<campaña>/adsets?fields=id,name,effective_status,created_time`
  - `GET /<campaña>/insights?level=adset&date_preset=maximum&fields=adset_id,adset_name,spend,actions`
- **Gasto acumulado de toda la vida del conjunto** (`date_preset=maximum`), no solo de hoy: los cortes se leen por gasto acumulado y el corte de 40.000 cae en el día 2 de un conjunto de 30.000 diarios.
- **PI y ventas** salen de `actions`: el primer tipo presente de `MW_PI_TYPES` y de `MW_SALE_TYPES` (Releasit manda `Purchase` al píxel). Los tipos exactos se confirman en el paso 1 con datos reales.
- **Veredicto** con `core.testing.testVerdict({ spend, pi, sales, tope })`. El tope es el CPA tope del producto activo (el de la píldora, `S.tope` de `trainer.js`); sin producto, `GENERIC_CPA` del medio (15.000).
- **Frecuencia:** consulta al abrir la app, cada **15 min** y con «Actualizar». Sigue consultando con la pestaña en segundo plano y con la pantalla angosta, para que el sonido avise igual. Sin token o sin campaña no consulta.
- **Alerta de corte (solo conjuntos activos):** cuando el gasto de un conjunto activo pasa un corte nuevo (mayor que el último revisado), su fila del bloque y del panel late (`.mw-alert`, color del corte) hasta tocar «Revisado». Suena una sola vez por conjunto y corte.
- **Sonido:** archivo propio `sounds/corte.mp3` con `<audio>`. Si el archivo no existe o el navegador bloquea la reproducción, no suena y no hay error en consola. Interruptor 🔔/🔕 guardado.
- **Al elegir una campaña** que ya pasó cortes: el último corte alcanzado de cada conjunto queda latiendo, sin sonido.
- **Estados y errores** (texto corto en el bloque y en el panel, sin romper nada):
  - Token inválido o revocado (`OAuthException`, código 190): «Token inválido: vuelve a conectar».
  - Sin red o bloqueo del navegador: «Sin conexión · último dato 10:45» y se muestran los datos guardados.
  - Cuenta en moneda distinta de COP: se muestran gasto y PI, sin veredicto, con «Cortes en COP: esta cuenta usa <moneda>».
  - Campaña terminada o sin conjuntos: «La campaña no tiene conjuntos activos».
  - Cuenta sin campañas activas: «No hay campañas activas» en el bloque y como única opción de `#mw-campaign`, que queda deshabilitada (decisión del usuario en el paso 7).
  - Sin `sounds/corte.mp3` (el `<audio>` dispara `error`): no vuelve a intentar sonar. Chrome puede mostrar una línea de red al cargar la página; desaparece al poner el archivo.
  - Límite de consultas de Meta (códigos 4, 17, 613): «Meta pidió esperar» y se reintenta en el siguiente ciclo.
- **Persistencia** en `localStorage`, clave `pyl-meta` (ver Modelo de datos), con `services.storage`.
- Sigue el tema: solo tokens (`--card`, `--line-2`, `--ink`, `--soft`, `--b`, `--g-*`, `--y-*`, `--r-*`). Con `prefers-reduced-motion` no late: solo cambia de color.
- Accesibilidad: el bloque es un `<button>` con `aria-label` («Cortes de testeo: C1 llegó a 30.000, revisar»); el panel es un diálogo (`role="dialog"`, `aria-labelledby`).

**Fuera de la spec (otras specs):**

- TikTok Ads.
- Varias campañas a la vez.
- Reglas de escalado (días 2+ con ventas) y la pestaña Escalado.
- Apagar, pausar o editar conjuntos desde Synkops (el token es solo de lectura).
- Llenar «📂 Lectura real · pronto» de Testeo con estos datos.
- Notificaciones del sistema (Windows) y aviso en `#toast`.
- Mostrar el bloque bajo 1680 px o en versión compacta.
- Cruzar ventas del píxel con pedidos de Dropi.
- Extensión de Chrome o scraping del Administrador de anuncios.

## Modelo de datos

### `localStorage` — clave `pyl-meta`

```js
{
  v: 1,                       // MW_VERSION
  token: 'EAAB…',             // token de usuario del sistema, ads_read
  account: { id: 'act_123', name: 'Vidanova', currency: 'COP' },
  campaign: { id: '120…', name: 'TEST 21/11 Plant' },
  sound: true,
  seen: { '<adsetId>': 1 },   // último corte revisado (índice en NS_TEST.cuts, -1 = ninguno)
  rung: { '<adsetId>': 1 },   // último corte que ya sonó
  last: { at: 1763650000000, rows: [/* mwRow */] }  // último dato bueno, para mostrar sin red
}
```

Roto o de otra `v` → se descarta y arranca sin conexión. Cambiar de campaña vacía `seen`, `rung` y `last`.

### `core/metawatch.js` (`PYL.core.metawatch`)

```js
MW_VERSION     // 1
MW_API         // 'v27.0' — versión vigente de la Graph API (paso 1: sin versión Meta responde el error 2635)
MW_EVERY       // 15 * 60 * 1000
MW_PI_TYPES    // ['offsite_conversion.fb_pixel_initiate_checkout', 'initiate_checkout', 'omni_initiated_checkout']
MW_SALE_TYPES  // ['offsite_conversion.fb_pixel_purchase', 'purchase', 'omni_purchase']
               // Paso 1 (cuenta VN-1, historial): los tres tipos de cada lista traen el mismo total
               // (854 PI, 87 compras), así que tomar solo el primero presente no cuenta doble.

mwAction(actions, types) // → número del primer tipo presente, 0 si no hay
mwRow(insight, adset)    // → { id, name, short, active, spend, pi, sales, created }
mwRows(insights, adsets) // → filas ordenadas por created; short = 'C1'…'Cn'
mwCut(spend)             // → índice del último corte de NS_TEST.cuts alcanzado, -1 si ninguno
mwAlerts(rows, seen, rung, quiet) // quiet = true al elegir campaña: actualiza rung sin sonar → { pulse: [ids], ring: [ids], rung } (ring = corte nuevo aún no sonado; filas con active: false nunca entran)
mwVerdict(row, tope, currency) // → testVerdict(...) o null si currency !== 'COP' o mwCut < 0
mwError(json, status)    // → { k: 'token' | 'limit' | 'net' | 'other', text }
mwLoad(raw)              // → estado válido o null
mwK(n)                   // 31250 → '31K'
```

### `services/metawatch.js` (`PYL.services.metawatch`)

`accounts(token)`, `campaigns(token, account)`, `adsets(token, campaign)`, `insights(token, campaign)`: devuelven promesas con el `data` de la respuesta o rechazan con `mwError`. Y `load()`/`save(state)` sobre `pyl-meta`.

### `ui/metawatch.js` (`PYL.ui.metawatch`)

`rail(node, view)` pinta el bloque; `panel(node, view, on)` pinta el panel (callbacks `on.connect`, `on.account`, `on.campaign`, `on.seen`, `on.refresh`, `on.sound`, `on.off`). No guardan estado.

### `app/metawatch.js` (`PYL.app.metawatch`)

Estado `app.state.metawatch = { saved, accounts, campaigns, rows, status, open, busy }`. Publica `refresh()` y `tick()` para las pruebas. Lee el tope con `PYL.app.trainer.product()` en el momento del veredicto (cambio mínimo en `trainer.js`: publicar `product()` que devuelve `S`).

### Ids y clases nuevos

`#mw-root` (`<div>` con el botón `.mw-btn`, que es el bloque, y el panel), `#mw-panel`, `#mw-title`, `#mw-x`, `#mw-token`, `#mw-connect`, `#mw-account`, `#mw-campaign`, `#mw-rows`, `#mw-refresh`, `#mw-sound`, `#mw-off`, `#mw-status`, `#mw-audio`; `.mw-rail`, `.mw-head`, `.mw-set`, `.mw-bar`, `.mw-mark`, `.mw-alert`, `.mw-off-set`, `.mw-seen`.

### Archivos que cambian

- Nuevos: `js/modules/metawatch/core/metawatch.js`, `services/metawatch.js`, `ui/metawatch.js`, `app/metawatch.js`, `css/modules/metawatch.css`. El usuario pone `sounds/corte.mp3`.
- `index.html`: `#mw-root` y `<audio id="mw-audio" src="sounds/corte.mp3" preload="auto">` dentro de `.top-in`; `<script>` de cada capa después de los de `testing` (usa `testVerdict`); `<link>` después de `clock.css`.
- `js/modules/trainer/app/trainer.js`: publicar `PYL.app.trainer.product()`.
- `js/index.js`: agregar `core/metawatch.js`.
- `tests/core.test.js`, `tests/smoke.test.js`, `tests/fixtures/claves-pyl.json`.
- Después del merge: `CLAUDE.md` (ya hay una conexión directa: graph.facebook.com) y `README.md`.

## Plan de implementación

Pruebas primero: se escriben, fallan y luego se hace el código.

1. **Prueba real con Meta (manual, sin código de la app).** El usuario saca el token con la guía y corre en la consola de DevTools, con `index.html` abierto por `file://`, un `fetch` a `/me/adaccounts` y a `/<campaña>/insights`. Se confirma: (a) que el navegador deja leer la respuesta desde `file://` (CORS), (b) la versión vigente para `MW_API`, (c) los `action_type` reales de PI y compra. **Si (a) falla, la spec se detiene** y se vuelve a decidir.
2. **Núcleo.** Pruebas en Node de `mwAction`, `mwRows` (orden y `C1`…`C4`), `mwCut` (19.999 → -1, 20.000 → 0, 39.999 → 1, 40.000 → 2), `mwAlerts` (corte nuevo late y suena una vez; revisado deja de latir; elegir campaña con cortes pasados late sin sonar), `mwVerdict` (misma salida que `testVerdict`; moneda USD → `null`), `mwError` (190, 4/17/613, sin red), `mwLoad` y `mwK`. Luego `core/metawatch.js` y su línea en `js/index.js`.
3. **Servicio.** `services/metawatch.js` con `fetch` y `pyl-meta`. Prueba de humo con `window.fetch` simulado: arma las URL correctas y traduce los errores.
4. **Bloque y panel sin conexión.** Prueba de humo: `#mw-root` dentro de `header.top .top-in`, dice «Conectar Meta»; el clic abre `#mw-panel` con token y guía; Esc lo cierra y el foco vuelve. Luego `ui`, `app`, `index.html` y `claves-pyl.json`.
5. **Conectar y elegir campaña.** Prueba de humo con `fetch` simulado: token → lista de cuentas → campañas → 4 filas `.mw-set` con su gasto; token inválido muestra «Token inválido: vuelve a conectar».
6. **Cortes, veredicto y alerta.** Prueba de humo con `fetch`, `Date` y `setTimeout` simulados: el ciclo de 15 min trae un conjunto que pasa de 18.000 a 21.000 → su fila late y `#mw-audio.play` se llama una vez; segundo ciclo igual → no vuelve a sonar; «Revisado» quita el latido; el panel muestra el veredicto de `testVerdict` con el tope de `trainer.product()`. Luego `trainer.js#product`.
7. **Estilos.** `css/modules/metawatch.css`: posición espejo del reloj, corte de 1680 px, barritas con marcas, latido, panel, tokens y `prefers-reduced-motion`. Revisión visual del usuario en los 7 temas.
8. **Sonido y desconectar.** Interruptor 🔔/🔕 guardado; «Desconectar» pregunta y borra `pyl-meta`; sin `sounds/corte.mp3` no hay error. Prueba real del usuario con una campaña corriendo.
9. **Documentación.** Después del merge, `CLAUDE.md` y `README.md`.

## Criterios de aceptación

- [x] El paso 1 confirmó que `fetch` a graph.facebook.com funciona desde `file://` y fijó `MW_API`, `MW_PI_TYPES` y `MW_SALE_TYPES` con datos reales.
- [x] Desde 1680 px, el margen derecho de la barra muestra el bloque de cortes en las 11 pestañas; por debajo no se ve.
- [x] El bloque queda alineado en vertical con la columna del Centro de mando (210 px, espejo del reloj).
- [x] Sin token, el bloque dice «Conectar Meta» y el clic abre el panel con el campo de token (sin guía, a pedido del usuario).
- [x] Con un token válido, el panel lista las cuentas publicitarias y las campañas activas de la elegida.
- [x] Al elegir la campaña de testeo ABO, el bloque muestra 4 filas `C1`…`C4` con gasto acumulado, barrita y marcas en 20K, 30K y 40K.
- [x] El gasto del bloque coincide con «Importe gastado» del Administrador de anuncios en el rango «Desde siempre» (con el retraso propio de Meta).
- [x] La app consulta a Meta al abrir, cada 15 min (también en segundo plano) y con «Actualizar».
- [x] Cuando un conjunto pasa un corte, su fila late y suena `sounds/corte.mp3` una sola vez; tras «Revisado» deja de latir hasta el siguiente corte.
- [x] Un conjunto apagado o pausado se ve atenuado con «OFF», muestra su gasto y no late ni suena.
- [x] Recargar la página no vuelve a sonar un corte ya sonado ni a latir uno ya revisado.
- [x] El panel muestra PI, ventas, CPPI y el veredicto de `testVerdict` de cada conjunto con el tope del producto activo (15.000 sin producto).
- [x] Con 🔕 no suena; la elección se conserva al recargar.
- [x] Con un token revocado el bloque dice «Token inválido: vuelve a conectar»; sin red dice «Sin conexión · último dato hh:mm» y muestra los últimos datos.
- [x] Una cuenta que no está en COP muestra gasto y PI sin veredicto, con el aviso de moneda.
- [x] «Desconectar» pregunta y, al confirmar, borra `pyl-meta`; el bloque vuelve a «Conectar Meta».
- [x] Con «reducir movimiento» las filas no laten: solo cambian de color.
- [x] El token nunca aparece en la consola, en el `aria-label` ni en el HTML visible.
- [x] Pasan `node tests/core.test.js`, `tests/smoke.test.js` y `node --check` de los cuatro archivos de `js/modules/metawatch/`; consola limpia.
- [x] `tests/fixtures/claves-pyl.json` trae `PYL.core.metawatch`, `PYL.services.metawatch`, `PYL.ui.metawatch`, `PYL.app.metawatch` y `PYL.app.trainer.product`.

## Decisiones

- **Sí:** cortes de testeo en vivo en el margen derecho (decisión del usuario), en vez del anillo de Mis tareas, una cuenta regresiva, pendientes de Guardado rápido o una onda decorativa.
- **Sí:** Marketing API de Meta (decisión del usuario). Gratis, solo lectura, permitida y sin pestañas abiertas.
- **No:** MCP de Meta o conectores de Claude. Viven en claude.ai y los usa Claude en el chat; una página `file://` no puede llamarlos, y «Iniciar sesión con Facebook» exige un sitio `https` registrado.
- **No:** scraping con extensión de Chrome. Exige el Administrador abierto, se rompe cuando Meta cambia su HTML, va contra los términos de Meta y es un proyecto aparte.
- **No:** solo estimado por hora o reglas automatizadas de Meta. El usuario prefirió el dato real dentro de Synkops.
- **Sí:** token de usuario del sistema con `ads_read` y sin vencimiento (decisión del usuario). Costo $0. Contra aceptada: si se filtra, permite **ver** los datos de anuncios hasta revocarlo; no permite gastar ni editar.
- **No:** token del Graph API Explorer: vence en 1–2 horas.
- **Sí:** token en `localStorage` (`pyl-meta`) con «Desconectar» (decisión del usuario). Es un PC personal.
- **Sí:** una sola spec (decisión del usuario), aunque toca conexión, barra, alertas y sonido. Se mitiga con el paso 1 de prueba real antes de escribir código.
- **Sí:** cortes por conjunto, no por campaña (decisión del usuario): el ABO califica cada conjunto solo.
- **Sí:** elegir la campaña en el panel (decisión del usuario), no todos los conjuntos activos de la cuenta.
- **Sí:** panel en la propia barra (decisión del usuario). Por eso el bloque **sí** responde al clic, aunque al principio se pidió «solo decorativo»: sin clic no habría dónde conectar ni marcar «Revisado».
- **Sí:** gasto + PI + ventas y veredicto de `testVerdict` (decisión del usuario). Releasit manda `Purchase` al píxel (dato del usuario).
- **Sí:** tope del producto activo de la píldora, con `GENERIC_CPA` de respaldo (decisión del usuario).
- **Sí:** consulta cada 15 min (decisión del usuario). Meta atrasa ~15 min sus datos; un corte puede verse hasta ~30 min tarde.
- **Sí:** seguir consultando en segundo plano y con la pantalla angosta: si no, el sonido no avisaría justo cuando no se mira la app.
- **Sí:** gasto de toda la vida del conjunto (`date_preset=maximum`): los cortes son por gasto acumulado y el de 40.000 cae en el día 2.
- **Sí:** latido hasta «Revisado» + sonido una vez por corte (decisión del usuario).
- **Sí:** mp3 propio en `sounds/corte.mp3` (decisión del usuario), con interruptor 🔔/🔕 guardado.
- **No:** `#toast` ni notificaciones de Windows: el usuario eligió latido y sonido.
- **Sí:** desde 1680 px (decisión del usuario), mismo corte que el reloj.
- **Sí:** al elegir una campaña con cortes ya pasados, late sin sonar, para no disparar varios sonidos de golpe.
- **No:** guía «Cómo sacar el token» en el panel (decisión del usuario en el paso 8): ya sacó el token en el paso 1. Pasos usados: app «Synkops» con el caso de uso de la API de marketing y el portafolio del negocio; usuario del sistema `synkops-lector` (Empleado) con la cuenta publicitaria en solo «Ver rendimiento» y la app con «Desarrollar app»; token de la app con caducidad «Nunca» y solo `ads_read`.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Graph API no responde a `fetch` desde `file://` (CORS con origen `null`) | Paso 1 lo prueba antes de escribir código; si falla, la spec se detiene. |
| El token queda en `localStorage` y no vence | Solo `ads_read`; «Desconectar»; se revoca en Configuración del negocio → Usuarios del sistema → Revocar tokens; nunca se imprime. |
| El navegador bloquea `audio.play()` sin un clic previo en la página | Se ignora el rechazo sin error; el latido avisa igual. La primera interacción con la página habilita el sonido. |
| Los `action_type` de PI y compra cambian según el píxel | Listas `MW_PI_TYPES`/`MW_SALE_TYPES` en orden de prioridad, confirmadas en el paso 1. |
| Meta retira la versión de la API (~2 años) | `MW_API` es una sola constante; el error se muestra en el bloque sin romper la app. |
| 4 filas no caben en el alto de la barra | Letra pequeña y barritas de 4 px; revisión visual en el paso 7. |
| Ventas del píxel distintas a pedidos reales de Dropi | Fuera de alcance; el veredicto usa lo que reporta Meta, como el Administrador. |
| `metawatch` lee `trainer.js`, que carga después | Lectura perezosa (`PYL.app.trainer.product()` al calcular el veredicto), como `logistics` con `app.state.search`. |

## Lo que **no** está en esta spec

- TikTok Ads.
- Varias campañas a la vez.
- Escalado (días 2+).
- Apagar o editar conjuntos desde Synkops.
- Lectura real en Testeo.
- Notificaciones de Windows o `#toast`.
- El bloque bajo 1680 px.
- Cruce con Dropi.
- Scraping o extensión de Chrome.

Cada una de esas, si llega, va en su propia spec.
