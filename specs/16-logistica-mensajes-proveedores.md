# SPEC 16 — Logística: mensajes a proveedores

> **Estado:** Implementado
> **Depende de:** SPEC 13, SPEC 15
> **Fecha:** 2026-11-19
> **Objetivo:** Sumar a «Plantillas de mensajes» el contenedor «Mensajes a Proveedores» con dos tarjetas, «Validación de Producto» y «Solicitud de Privatización», que traen proveedor, producto e ID Dropi de Mi candidato.

## Por qué existe esta spec

La SPEC 15 dejó la pestaña Logística lista para un segundo grupo de mensajes («Mensajes a Proveedores») sin construirlo. Antes de escalar un producto el usuario le escribe al proveedor para validar stock, hora de corte y restock, y cuando el producto funciona le pide privatizarlo. Hoy esos mensajes se escriben a mano. Esta spec los suma como tarjetas con la misma dinámica de las de clientes, pero con los datos de **Mi candidato** (Buscar producto), que es donde vive el proveedor.

## Alcance

**Dentro:**

**Parte 1 · Contenedor «Mensajes a Proveedores»**

- Nuevo `<section class="card lg-group" id="lg-group-proveedores" aria-labelledby="lg-group-proveedores-h">` dentro de `#lg-msgs`, **debajo** de `#lg-group-clientes`, con título `<h2 id="lg-group-proveedores-h">Mensajes a Proveedores</h2>` y su rejilla `<div class="lg-cards" id="lg-cards-prov">`.
- Mismo estilo y rejilla que «Mensajes a Clientes» (tres columnas, `@container` a dos y a una); no se agrega CSS de contenedor nuevo. Separación vertical entre los dos grupos con la de las tarjetas `.card` de la página.
- `#lg-group-clientes` y `#lg-cards` no cambian.
- Cada plantilla de `LG_TEMPLATES` puede traer `group: 'prov'`; sin `group` va a Clientes. `app/logistics.js` pone cada tarjeta en `#lg-cards` o en `#lg-cards-prov` según su `group`, manteniendo el orden de `LG_TEMPLATES`.

**Parte 2 · Datos de Mi candidato**

- Las plantillas de proveedores traen `src: 'cand'` (a nivel de plantilla). Sus campos `from` se leen de `app.state.search.draft` y no de `app.state.landing.prod`.
- Función nueva del núcleo `lgFromCand(draft)` → `{ product, dropi, supplier }`:
  - `product` = `draft.name` recortado (o `''`).
  - `dropi` = `draft.dropi` recortado (o `''`).
  - `supplier` = el nombre recortado del proveedor **solo si `draft.suppliers` tiene exactamente un proveedor con nombre no vacío**; si hay 0 o 2 o más, `''`.
- Campos con `from`: `from: 'name'` → `product`, `from: 'dropi'` → `dropi`, `from: 'supplier'` → `supplier`.
- Botón de la cabecera: el mismo `#lg-<k>-import` (`.lg-import`, mismo ícono y lugar), con título y `aria-label` **«Traer de Mi candidato»** en estas tarjetas («Traer de Desarrollo» en las demás).
- Al tocarlo:
  - Sin nombre en Mi candidato: aviso en `#toast` «Mi candidato no tiene producto: llena «Mi candidato» en Buscar producto o escribe los datos aquí.» y no cambia nada.
  - Con nombre: pisa cada campo `from` que tenga dato en Mi candidato (un dato vacío no borra lo escrito) y avisa «Traje «<producto>» de Mi candidato.». Si `supplier` salió vacío, el aviso suma « Escribe el proveedor a mano: Mi candidato no tiene uno solo.».
- Al abrir la pestaña, los campos `from` vacíos se prellenan de su fuente (Desarrollo o Mi candidato), como hoy.
- Los tres campos siguen siendo editables a mano. «Limpiar» no los vacía (son `from`, como en las demás tarjetas): solo borra el mensaje y los errores.

**Parte 3 · Campo ID Dropi solo números**

- Tipo de campo nuevo `type: 'digits'`: obligatorio y solo dígitos (se recortan espacios a los lados). Vacío → «Escribe id dropi» (regla común `Escribe ${label.toLowerCase()}`); con otro carácter → el `errDigits` del campo, aquí «ID inválido: solo números».
- En el mensaje sale tal cual se escribió (sin puntos ni formato).

**Parte 4 · Etapas nuevas**

- `LG_STAGES` suma `validar: 'Validar'` y `privatizar: 'Privatizar'`.
- Colores del chip en `css/modules/logistics.css`: `validar` con `--o`/`--o-ink` y `privatizar` con `--r`/`--r-ink` (tokens que ya existen en los 7 temas).

**Parte 5 · Validación de Producto (`valida`)**

Antes de pautar en serio: confirmo con el proveedor stock real, hora de corte y restock.

- `{ k: 'valida', group: 'prov', src: 'cand', stage: 'validar', title: 'Validación de Producto', sub: 'Antes de escalar la pauta: valido con el proveedor stock, hora de corte y restock.' }`
- Campos, en este orden:
  - Proveedor (`supplier`, `type: 'text'`, `from: 'supplier'`, ph `Ej: Botania`).
  - Producto (`product`, `type: 'text'`, `from: 'name'`, ph `Ej: Crema Arbutina`).
  - ID Dropi (`dropi`, `type: 'digits'`, `from: 'dropi'`, ph `Ej: 2234277`, `errDigits: 'ID inválido: solo números'`).
- Fijos en el texto: «Saul», `STORE_BOLD`, «(Comunidad NovaProject)» y «15-20 pedidos diarios».

Con `Botania`, `Crema Arbutina` y `2234277`:

```text
Hola, buen día equipo de Botania. Les saluda Saul de la tienda 🍃*VidanovaStore®* (Comunidad NovaProject).
Estamos por iniciar pauta publicitaria escalada para su producto *Crema Arbutina* con ID: *2234277*.

Quisiera validar con ustedes rápidamente 3 puntos operativos:
1. ¿Tienen stock físico real en bodega para despachos inmediatos?
2. ¿Cuál es su hora de corte para despachar el mismo día las guías generadas?
3. ¿Tienen proyección de restock continuo para este producto en caso de escalar a 15-20 pedidos diarios?

Quedo atento para coordinar y empezar a meterle volumen. Muchas gracias.
```

Cambios al texto del usuario: el producto va en negrita (`*…*`), se quitó el punto antes del paréntesis («…VidanovaStore®*. (Comunidad…» → «…VidanovaStore®* (Comunidad…») y se quitaron los corchetes de los campos. Ajuste posterior (pedido del usuario): el ID también va en negrita y hay una línea en blanco antes de «Quisiera validar…» y antes de «Quedo atento…».

**Parte 6 · Solicitud de Privatización (`privatiza`)**

Cuando el producto funciona: le pido al proveedor que lo privatice para mi tienda. Texto redactado por el asistente y ajustado por el usuario.

- `{ k: 'privatiza', group: 'prov', src: 'cand', stage: 'privatizar', title: 'Solicitud de Privatización', sub: 'Cuando el producto funciona: le pido al proveedor que lo privatice para mi tienda.' }`
- Campos: los mismos tres de `valida` (Proveedor, Producto, ID Dropi), con el mismo `from`, tipo y avisos.

```text
Hola, buen día equipo de Botania. Les saluda Saul de la tienda 🍃*VidanovaStore®* (Comunidad NovaProject).

Venimos trabajando con su producto *Crema Arbutina* (ID: 2234277) y los resultados de la pauta han sido muy buenos. Es un producto en el que creemos y queremos apostarle fuerte.

Por eso quisiera proponerles la *privatización* del producto para nuestra tienda. A cambio, nos comprometemos a:
✅ Invertir en pauta publicitaria constante para mover volumen.
✅ Cuidar la imagen del producto con una página y unos creativos de calidad.

Quedo atento a su respuesta. ¡Muchas gracias por su apoyo! 🤝
```

**Parte 7 · Orden**

`LG_TEMPLATES` termina con `valida` y `privatiza`, en ese orden, después de `oficina`. Las 12 tarjetas de clientes no cambian de orden.

**Pruebas y documentación**

- `tests/core.test.js`: texto exacto de `valida` y `privatiza`; `lgFromCand` con 0, 1, 2 proveedores y con nombres vacíos; tipo `digits` (vacío, `2234277`, ` 2234277 `, `22.34277`, `ID2234277`); claves aplanadas con `lgFromCand`.
- `tests/smoke.test.js`: `#lg-group-proveedores` debajo de `#lg-group-clientes` dentro de `#lg-msgs`; `#lg-cards` con las 12 de siempre y `#lg-cards-prov` con `valida` y `privatiza`, contraídas; botón «Traer de Mi candidato» con un `app.state.search.draft` sembrado (1 proveedor → lo trae; 2 → proveedor vacío y aviso); Generar, Copiar y Limpiar; error del ID con letras.
- `tests/fixtures/claves-pyl.json` solo se regenera si cambia una clave de primer nivel de `PYL.*` (se espera que no).
- Después del merge, actualizar `CLAUDE.md` y `README.md`.

**Fuera (otras specs):**

- Otros mensajes a proveedores (el usuario confirmó que solo son estos dos).
- Campos editables para «Saul», «15-20 pedidos diarios» o el volumen actual.
- Elegir uno de varios proveedores de Mi candidato con una lista desplegable.
- Traer los datos de la bitácora o de Desarrollo en estas tarjetas.
- Cambiar el eyebrow, el título o el texto de ayuda de la pestaña Logística.
- Abrir WhatsApp (`wa.me`), guardar campos o historial, editor de plantillas.

## Modelo de datos

No hay estado nuevo: `app.state.logistics.cards` crea una entrada por plantilla (`{ form, last, open }`) y las dos nuevas aparecen solas. Nada se guarda.

### Cambios en `core/logistics.js`

```js
const LG_STAGES = { confirmar: 'Confirmar', cobro: 'Cobro', envio: 'Envío', entrega: 'Entrega', validar: 'Validar', privatizar: 'Privatizar' };

// Propiedades nuevas de plantilla: group: 'prov' (contenedor Mensajes a Proveedores), src: 'cand' (sus `from` salen de Mi candidato).
// Propiedades nuevas de campo: type: 'digits' (solo números) con errDigits; from: 'dropi' | 'supplier'.
{ k: 'dropi', label: 'ID Dropi', type: 'digits', from: 'dropi', ph: 'Ej: 2234277', errDigits: 'ID inválido: solo números' }

lgFromCand(draft) // → { product, dropi, supplier }
```

- `lgValues`: rama nueva para `digits` (`/^\d+$/` sobre el texto recortado).
- `TEXT.valida` y `TEXT.privatiza` usan `STORE_BOLD`; ningún texto nuevo repite la marca a mano.
- Clave nueva exportada: `lgFromCand` (prefijo `lg`, no choca al aplanar).

### Ids nuevos

- `#lg-group-proveedores`, `#lg-group-proveedores-h`, `#lg-cards-prov`.
- Por plantilla (`<k>` = `valida`, `privatiza`): `#lg-card-<k>`, `#lg-<k>-toggle`, `#lg-<k>-body`, `#lg-<k>-form`, `#lg-<k>-f-supplier`, `#lg-<k>-f-product`, `#lg-<k>-f-dropi`, `#lg-<k>-err-<campo>`, `#lg-<k>-import`, `#lg-<k>-gen`, `#lg-<k>-clear`, `#lg-<k>-copy`, `#lg-<k>-out`.

### Archivos que cambian

- `js/modules/logistics/core/logistics.js`: etapas, plantillas, textos, `digits`, `lgFromCand`.
- `js/modules/logistics/ui/logistics.js`: título y `aria-label` del botón según `src`.
- `js/modules/logistics/app/logistics.js`: fuente de los `from` según `src` (prefill e importar), avisos, tarjeta en `#lg-cards` o `#lg-cards-prov` según `group`.
- `index.html`: el `<section>` de proveedores dentro de `#lg-msgs` y el comentario que lo anunciaba.
- `css/modules/logistics.css`: colores de los chips `validar` y `privatizar`.
- `tests/core.test.js`, `tests/smoke.test.js`.
- Después del merge: `CLAUDE.md` (Logística y la línea de dependencias: `logistics` pasa a leer también `app.state.search.draft`) y `README.md`.

No se crean archivos ni cambia el orden de `<script>`/`<link>`. `app.state.search.draft` se lee al tocar el botón o al abrir la pestaña (no al cargar), así que el orden de carga de `search` y `logistics` no importa.

## Plan de implementación

Pruebas primero en cada paso: se escriben, fallan y luego se hace el código. Cada paso deja la app funcionando y se commitea solo.

1. **Tipo `digits` y `lgFromCand` en el núcleo.** Pruebas en Node: `lgValues` con una plantilla de prueba (`digits` vacío, válido, con espacios, con punto, con letras); `lgFromCand` con `null`, sin proveedores, con 1, con 2, con 2 donde uno tiene nombre vacío (→ cuenta como 1) y con nombre/ID con espacios. Luego el código y la clave en la lista de claves aplanadas.
2. **Etapas y plantilla «Validación de Producto».** Pruebas: texto exacto de la Parte 5, errores de los tres campos, `group`, `src` y `stage`. Luego `LG_STAGES`, la entrada en `LG_TEMPLATES` y `TEXT.valida`.
3. **Plantilla «Solicitud de Privatización».** Pruebas: texto exacto de la Parte 6 y errores. Luego la entrada y `TEXT.privatiza`.
4. **Contenedor y reparto de tarjetas.** Humo: `#lg-group-proveedores` (título «Mensajes a Proveedores») después de `#lg-group-clientes` dentro de `#lg-msgs`; `#lg-cards` con las 12 tarjetas de siempre en su orden y `#lg-cards-prov` con `valida`, `privatiza`, contraídas. Luego `index.html` y el reparto por `group` en `app/logistics.js`.
5. **Traer de Mi candidato.** Humo con `app.state.search.draft` sembrado: el botón se llama «Traer de Mi candidato» en las dos tarjetas nuevas y «Traer de Desarrollo» en las demás; con un proveedor llena los tres campos; con dos llena producto e ID, deja el proveedor como estaba y el aviso pide escribirlo; sin nombre avisa y no cambia nada; al abrir la pestaña se prellenan los vacíos. Luego `ui/logistics.js` y `app/logistics.js`.
6. **Colores de los chips.** Reglas `.lg-stage[data-stage=validar|privatizar]` en `logistics.css`. Se revisa a ojo en el navegador.
7. **Documentación.** Después del merge, `CLAUDE.md` y `README.md`.

## Criterios de aceptación

**Contenedor**
- [x] Bajo «Mensajes a Clientes» aparece un contenedor titulado «Mensajes a Proveedores», con el mismo estilo, dentro del bloque de la sub-pestaña «Plantillas de mensajes».
- [x] «Mensajes a Clientes» sigue con sus 12 tarjetas en el mismo orden; «Mensajes a Proveedores» tiene «Validación de Producto» y «Solicitud de Privatización», en ese orden, contraídas al abrir.
- [x] Las tarjetas de proveedores muestran el chip «Validar» y «Privatizar», con colores distintos a los de las etapas de clientes.

**Traer de Mi candidato**
- [x] El botón de las dos tarjetas nuevas dice «Traer de Mi candidato» (título y `aria-label`); el de las demás sigue diciendo «Traer de Desarrollo».
- [x] Con un solo proveedor en Mi candidato, el botón llena Proveedor, Producto e ID Dropi.
- [x] Con 0 o con 2 o más proveedores, llena Producto e ID, no toca Proveedor y el aviso pide escribirlo a mano.
- [x] Sin nombre en Mi candidato, avisa y no cambia ningún campo.
- [x] Al abrir la pestaña, los campos vacíos de estas tarjetas se llenan de Mi candidato; los ya escritos no se pisan.
- [x] Los tres campos se pueden editar a mano y «Limpiar» solo borra el mensaje y los errores.

**Validación**
- [x] ID Dropi vacío da «Escribe id dropi»; con letras, puntos u otros caracteres da «ID inválido: solo números»; con espacios a los lados se acepta y sale sin ellos.
- [x] Proveedor o Producto vacíos marcan su campo y no arman el mensaje.

**Textos**
- [x] «Validación de Producto» con `Botania`, `Crema Arbutina` y `2234277` genera exactamente el texto de la Parte 5.
- [x] «Solicitud de Privatización» con los mismos datos genera exactamente el texto de la Parte 6, sin la línea de pedidos diarios ni la pregunta de condiciones.
- [x] En los dos el producto va en negrita y la tienda dice `🍃*VidanovaStore®*`; en «Validación de Producto» también el ID.

**Calidad**
- [x] El texto de las plantillas vive solo en `core/logistics.js`.
- [x] Ids `#lg-` únicos en la página; ningún nombre `lg*`/`LG_*` choca al aplanar `js/index.js`.
- [x] Al recargar no queda nada guardado de esta pestaña.
- [x] Pasan `node tests/core.test.js`, `tests/smoke.test.js` y `node --check` de cada archivo tocado; consola limpia.
- [x] Se ve bien en los 7 temas y en pantalla angosta (revisado en el navegador).
- [x] Pegado en WhatsApp Web, los `*` salen en negrita y los emojis y el `®` se ven.

## Decisiones

- **Sí:** spec nueva (SPEC 16) en vez de ampliar la 15, que ya está implementada y cerrada.
- **Sí:** proveedor, producto e ID salen todos de Mi candidato (decisión del usuario), una sola fuente coherente. **No:** producto de Desarrollo y proveedor de Mi candidato, porque podían ser productos distintos. **No:** agregar Proveedor a Desarrollo, porque tocaba el módulo landing y su guardado.
- **Sí:** el proveedor se trae solo si Mi candidato tiene exactamente uno (decisión del usuario); si no, se escribe a mano. El aviso que lo pide lo propuso el asistente.
- **Sí:** un dato vacío de Mi candidato no borra lo ya escrito en la tarjeta (misma regla que «Traer de Desarrollo»).
- **Sí:** la fuente se marca en la plantilla (`src: 'cand'`) y no en cada campo, porque una tarjeta trae todo de un solo lugar.
- **Sí:** el contenedor va debajo de «Mensajes a Clientes» (decisión del usuario) y las tarjetas eligen grupo con `group: 'prov'`.
- **Sí:** chips «Validar» y «Privatizar» (decisión del usuario); colores naranja (`--o`) y rojo (`--r`) elegidos por el asistente porque ya existen en los 7 temas y no los usa otra etapa.
- **Sí:** ID Dropi solo números (decisión del usuario), con tipo de campo propio `digits`.
- **Sí:** producto en negrita (decisión del usuario), igual que en los mensajes a clientes.
- **Sí:** «Saul», «(Comunidad NovaProject)» y «15-20 pedidos diarios» fijos en el texto (decisión del usuario: ningún campo más).
- **Sí:** el texto de la privatización lo redactó el asistente; el usuario quitó «Mantener un flujo estable de pedidos diarios con ustedes» y la pregunta por las condiciones (pedido mínimo, exclusividad, volumen).
- **Sí:** solo estos dos mensajes a proveedores (decisión del usuario).
- **No:** lista desplegable para elegir entre varios proveedores de Mi candidato: es más UI para un caso que se resuelve escribiendo.
- **No:** guardar campos: igual que en las SPEC 13 y 15.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Mi candidato tiene otro producto distinto al que quiero escribirle al proveedor | Los campos son editables y el aviso dice qué producto trajo |
| Un proveedor con nombre vacío cuenta como proveedor y bloquea el traído | `lgFromCand` solo cuenta proveedores con nombre no vacío (se prueba en el paso 1) |
| El botón «Traer» cambia de texto en las tarjetas de clientes por error | El humo del paso 5 revisa las dos variantes |
| Los colores `--o`/`--r` del chip se confunden con alertas | Se revisa en los 7 temas; si molesta, se cambia solo la regla CSS |

## Lo que **no** está en esta spec

- Más mensajes a proveedores.
- Campos editables para el nombre, la comunidad o los pedidos diarios.
- Elegir entre varios proveedores de Mi candidato.
- Cambiar los textos generales de la pestaña Logística.
- WhatsApp directo, guardado, historial o editor de plantillas.

Cada una de esas, si llega, va en su propia spec.
