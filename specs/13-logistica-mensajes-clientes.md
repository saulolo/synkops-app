# SPEC 13 — Logística: mensajes a clientes

> **Estado:** Aprobado
> **Depende de:** SPEC 06, SPEC 11
> **Fecha:** 2026-11-14
> **Objetivo:** Crear la pestaña Logística con un bloque "Mensajes a clientes" que arma, desde una plantilla fija, el mensaje "Confirmación guía" (tarjeta "Confirmación de Guia") con los datos del pedido (producto y precio traídos de Desarrollo y editables) para copiarlo y pegarlo en WhatsApp.

## Por qué existe esta spec

Logística va a reunir todo lo del pedido después de la venta: seguimiento, clientes y entregas. Mientras eso se diseña, lo que más tiempo me quita hoy es escribir a mano los mensajes a cada cliente. Esta spec abre la pestaña con ese primer bloque y deja el lugar listo para las demás plantillas y para el seguimiento.

## Alcance

**Dentro:**

**Parte 1 · Pestaña y módulo**

- Pestaña nueva "Logística" en la barra superior, después de "Escalado" (`<button data-v="logistica">Logística</button>`), con su vista `<section class="view" id="v-logistica">`.
- Módulo nuevo `js/modules/logistics/{core,ui,app}/logistics.js` (`PYL.core.logistics`, `PYL.ui.logistics`, `app.state.logistics`) y `css/modules/logistics.css`.
- Encabezado: eyebrow "Después de la venta · hablo con mis clientes", título "Logística" (con la barrita de acento de las pestañas del entrenador) y un lead corto que diga que aquí irá el seguimiento de pedidos, clientes y entregas, y que hoy arma los mensajes a clientes.
- Sub-pestañas `#lg-parts` (`data-part`), con el mismo estilo y comportamiento que `#ts-parts` de Testeo:
  - "💬 Mensajes a clientes" (`msgs`): abierta.
  - "📦 Seguimiento de pedidos · pronto" (`track`): deshabilitada (`disabled`, opacidad .5, como "Lectura real" en Testeo).
- Siempre abre en `msgs` (no se guarda la sub-pestaña).

**Parte 2 · Mensajes a clientes**

- **Una tarjeta por plantilla, lado a lado** (`#lg-cards`; cada una `.lg-card` con id `#lg-card-<k>`), de izquierda a derecha en el orden de `LG_TEMPLATES`: "Confirmación de Guia" (`guia`) y, a su derecha, "Confirmación de Pedidos" (`pedido`). Cada tarjeta es **independiente**: su propio formulario, mensaje, errores y botones; lo escrito en una no pasa a la otra. Son angostas (`max-width: 420px`, parecidas al panel de Prompt buscar anuncios, porque van a sumarse más mensajes y se quiere proporcional) y, si no caben, bajan de fila. Las tarjetas de una misma fila miden lo mismo de alto: el cuadro Mensaje de la que tiene menos campos se alarga y el de la que tiene más queda en su mínimo (230 px). (Cambios del usuario tras el paso 4: el título pasó de "Mensajes a clientes" a "Confirmación de Guia", y la plantilla `pedido` se sumó como tarjeta aparte; antes hubo un selector de plantillas dentro de una sola tarjeta y se quitó.)
- No hay selector de plantillas. Agregar otra plantilla = sumar una entrada en `LG_TEMPLATES` y su texto en `lgMessage`; su tarjeta aparece sola, a la derecha de las demás.
- Formulario de cada tarjeta (`#lg-<k>-form`), con un campo por cada `field` de su plantilla (`#lg-<k>-f-<campo>`, aviso `#lg-<k>-err-<campo>`). Para "Confirmación de Guia" (`guia`):
  - Nombre del destinatario (`name`): texto, obligatorio.
  - Producto (`product`): texto, obligatorio. Se prellena con `app.state.landing.prod.name`.
  - Número de guía (`guide`): texto, obligatorio (se acepta cualquier carácter; se recortan espacios).
  - Precio (`price`): dinero, obligatorio, > 0. Se prellena con `app.state.landing.prod.price`. Acepta `97400`, `97.400` o `$ 97.400`; al salir del campo se muestra formateado (`$ 97.400`).
  - Dirección de entrega (`address`): texto libre en un solo campo, obligatorio (ej. `Cra 67 # 25 - 34 Itagui - Calatrava`).
- El tiempo de entrega **no es un campo**: es fijo (`LG_DAYS` = `2 a 4`) y el mensaje agrega "días hábiles" (cambio del usuario tras el paso 4: no varía).
- Cada campo muestra un ejemplo en gris cuando está vacío (`ph`, formato `Ej: Pablo`), tomado de los datos del mensaje de ejemplo (cambio del usuario tras el paso 4).
- **Todos los campos son editables**, también los que vienen de Desarrollo.
- **Prellenado desde Desarrollo:**
  - Al abrir la pestaña (evento `nav:vista` con `v = 'logistica'`), los campos que vienen de Desarrollo (`from`) de cada tarjeta se llenan con los de Desarrollo **solo si están vacíos**: no pisan lo que ya escribí (en `guia`, Producto y Precio; en `pedido`, solo Producto).
  - Botón `#lg-<k>-import` "Traer de Desarrollo" (ícono junto al título de cada tarjeta): sobrescribe los campos `from` de **esa** tarjeta con los de Desarrollo. Si Desarrollo no tiene nombre, avisa en `#toast` y no cambia nada.
- **Botones** de cada tarjeta (fila `.lg-acts`):
  - `#lg-<k>-gen` "Generar mensaje": valida; si todo está bien arma el mensaje en `#lg-<k>-out` (textarea de solo lectura). Si falta algo, marca los campos (`.lg-bad`, `aria-invalid`, texto en `#lg-<k>-err-<campo>`), avisa en `#toast` y deja el mensaje anterior.
  - `#lg-<k>-copy` "Copiar mensaje": copia `#lg-<k>-out` (`ui.dom.copy`) y avisa en `#toast`. Sin mensaje generado, avisa y no copia.
  - `#lg-<k>-clear` "Limpiar": vacía los datos propios del pedido de esa tarjeta (los campos sin `from`; en `guia`: Nombre, Número de guía y Dirección) y su mensaje; deja el Producto y el Precio (para el siguiente pedido del mismo producto). No pregunta.
- **El mensaje no se actualiza en vivo**: solo cambia al tocar "Generar mensaje".
- Nada se guarda entre sesiones: al recargar los campos arrancan vacíos y Producto/Precio se vuelven a traer al abrir la pestaña.

**Parte 3 · Texto de "Confirmación guía" (`guia`)**

Se respeta tal cual el texto del usuario, incluidos los `*` de negrita de WhatsApp, los emojis y los saltos de línea. Con los datos del ejemplo debe salir exactamente:

```text
*CONFIRMACIÓN GUIA*
¡Hola, Pablo! 👋 Te saludamos nuevamente de 🍃*VidanovaStore*.

Te confirmamos que tu pedido de la Omegaxl joint support ya fue empacado y entregado a la transportadora. 📦✨

🚚 *Número de Guía*: 074102602224
🔗 *Rastreo*: Puedes consultar el estado de tu paquete directamente en la página web de la transportadora con ese número de guía.

El tiempo estimado de entrega es de *2 a 4 días hábiles*.
💵 Recuerda tener listos los *$97.400* en efectivo para cuando el repartidor llegue a tu dirección (Cra 67 # 25 - 34 Itagui - Calatrava).

¡Cualquier duda que tengas durante el camino, nos puedes escribir por aquí! Que tengas un excelente día. 😊
```

- La tienda (`🍃VidanovaStore`) es una constante (`LG_STORE`), no un campo.
- El precio va en el mensaje sin espacio tras el signo: `$97.400` (miles con punto, sin decimales).

**Parte 3b · Confirmación de Pedidos (`pedido`)**

Campos (`#lg-pedido-f-<k>`), todos obligatorios y editables:

- Nombre de cliente (`name`), texto. Ej: `Eugenia`.
- Producto (`product`), texto, prellenado desde Desarrollo como en `guia` (su «Traer de Desarrollo» solo toca el Producto). Ej: `Omegaxl joint support`.
- Dirección de entrega (`address`), texto. Ej: `Colombia 20# 19 .30 - barrio Capri`.
- Ciudad / Municipio (`city`), texto. Ej: `PASTO`.
- Departamento (`dept`), texto. Ej: `NARIÑO`. En el mensaje siempre sale en **mayúsculas**, aunque se escriba en minúscula (el campo se deja como se escribió).
- Teléfono de contacto (`phone`), texto. Ej: `3214566677`.
- Total a pagar (COD - contraentrega) (`total`), dinero > 0 (aviso «Total mayor a 0»), con el mismo formato que Precio. **No** se trae de Desarrollo (no lo pidió el usuario).

Los datos se ponen tal como se escriben, salvo el Departamento, que va siempre en mayúsculas. Con los datos del ejemplo debe salir exactamente:

```text
¡Hola Eugenia! 🌟

Acabamos de recibir tu compra del producto -- Omegaxl joint support -- en nuestra tienda 🍃*VidanovaStore*

El cual será entregado en:

*Dirección:* Colombia 20# 19 .30 - barrio Capri
*Ciudad:* PASTO
*Departamento:* NARIÑO
*Teléfono:* 3214566677
*Total a Pagar:* $97.400

El *envío* es totalmente *Gratis* y el pago es *Contra Entrega* para tu seguridad 🛍️🤍

🚚 Por favor *confírmanos* si tus datos son correctos para despachar tu pedido *ahora* 🤍
```

**Pruebas y documentación**

- `tests/core.test.js`: plantilla, validación y texto del mensaje (ver Criterios).
- `tests/smoke.test.js`: 11 pestañas, sub-pestañas, tarjetas por plantilla, prellenado, Generar, Copiar, Limpiar, errores.
- Agregar `core/logistics.js` a `js/index.js` y regenerar `tests/fixtures/claves-pyl.json`.
- Después del merge, actualizar `CLAUDE.md` y `README.md`.

**Fuera (otras specs):**

- Más plantillas aparte de `pedido` y `guia` (novedad, en reparto, etc.): se agregan después, una por una, en `LG_TEMPLATES`.
- Editor de plantillas en la app (crear, editar o borrar plantillas propias).
- Seguimiento de pedidos, clientes y entregas (la sub-pestaña `track` solo se anuncia).
- Abrir WhatsApp (`wa.me`) o pedir el teléfono del cliente.
- Calcular el precio por unidades (ofertas 1/2/3 de Releasit).
- Traer datos del pedido desde el reporte de Dropi o desde el MCP de Dropi.
- Guardar los campos o un historial de mensajes enviados.
- Separar dirección y ciudad.

## Modelo de datos

### Archivos nuevos

- `js/modules/logistics/core/logistics.js` → `PYL.core.logistics`. Sin DOM. Nombres con prefijo `lg`/`LG_` para no chocar al aplanar en `js/index.js`. Va al final de los `core` de módulo en `index.html` y en `js/index.js`.
- `js/modules/logistics/ui/logistics.js` → `PYL.ui.logistics`. Recibe datos y callbacks; no muta estado.
- `js/modules/logistics/app/logistics.js` → `app.state.logistics`. Va después de `landing/app/landing.js` (lee `app.state.landing.prod`) y antes de `app/nav.js`.
- `css/modules/logistics.css`: `<link>` después de `cheat.css` (o del último CSS de módulo) y antes de `themes.css`. Solo tokens del tema. Reutiliza `.seg`, `.card`, campos y botones de `base.css`; el estilo de las sub-pestañas se toma de `#ts-parts` (si está atado al id, se generaliza con una clase compartida en el mismo paso).

### `core/logistics.js`

```js
const LG_STORE = '🍃VidanovaStore';
const LG_DAYS = '2 a 4'; // tiempo de entrega fijo (no es un campo)
const LG_PARTS = [
  { k: 'msgs',  label: '💬 Mensajes a clientes' },
  { k: 'track', label: '📦 Seguimiento de pedidos · pronto', disabled: true },
];
const LG_TEMPLATES = [ // una tarjeta por plantilla, de izquierda a derecha; la primera es también la de respaldo en lgTemplate
  { k: 'guia', title: 'Confirmación de Guia',
    fields: [
      { k: 'name',    label: 'Nombre del destinatario', type: 'text', ph: 'Ej: Pablo' },
      { k: 'product', label: 'Producto',                type: 'text',  from: 'name', ph: 'Ej: Omegaxl joint support' },  // landing.prod.name
      { k: 'guide',   label: 'Número de guía',          type: 'text', ph: 'Ej: 074102602224' },
      { k: 'price',   label: 'Precio',                  type: 'money', from: 'price', ph: 'Ej: $ 97.400' }, // landing.prod.price
      { k: 'address', label: 'Dirección de entrega',    type: 'text', ph: 'Ej: Cra 67 # 25 - 34 Itagui - Calatrava' },
    ] },
  { k: 'pedido', title: 'Confirmación de Pedidos',
    fields: [/* Parte 3b: name, product (from: 'name'), address, city, dept, phone, total (money, errMoney: 'Total mayor a 0') */] },
];
```

Funciones (puras):

- `lgTemplate(k)` → la plantilla con esa clave; una clave desconocida cae en la primera.
- `lgMoney(text)` → número en pesos o `null` (`'97.400'`, `'$ 97.400'`, `'97400'` → `97400`; vacío o `0` → `null`).
- `lgValues(tpl, form)` → `{ ok, values, errors }`. Recorta espacios; vacío = error «Escribe …»; `money` inválido o ≤ 0 = error «Precio mayor a 0» (o el `errMoney` del campo, p. ej. «Total mayor a 0»).
- `lgPrefill(prod)` → `{ product, price }` desde `landing.prod` (`name`, `price`); faltantes = `''`/`null`.
- `lgMessage(k, values)` → el texto de la plantilla `k` (Parte 3 o 3b) con los valores puestos (el dinero formateado `$97.400`).

### Estado (`app.state.logistics`, no se guarda)

```js
{ part: 'msgs',   // sub-pestaña abierta
  cards: {        // una entrada por plantilla (clave = `k` de LG_TEMPLATES)
    guia:   { form: { name: '', product: '', guide: '', price: '', address: '' }, last: '' },
    pedido: { form: { name: '', product: '', address: '', city: '', dept: '', phone: '', total: '' }, last: '' },
  } }             // form = lo escrito; last = último mensaje generado
```

### Ids y clases (prefijo `#lg-`/`.lg-`)

`#lg-parts`, `#lg-cards`, `.lg-card`, `#lg-card-<k>`, y por tarjeta (con `<k>` = `guia` o `pedido`): `#lg-<k>-form`, `#lg-<k>-f-<campo>`, `#lg-<k>-err-<campo>`, `#lg-<k>-import`, `#lg-<k>-gen`, `#lg-<k>-copy`, `#lg-<k>-clear`, `#lg-<k>-out`; clases `.lg-acts`, `.lg-bad`. Cada tarjeta lleva su clave en el id para que dos tarjetas no repitan ids. `#lg-soon` (si la sub-pestaña `track` necesita tarjeta: no se muestra porque está deshabilitada).

### Dependencias

`logistics` usa `landing` (`app.state.landing.prod`) y `shared/` (`ui.dom.copy`, `ui.feedback.toast`, `core.format` si sirve para el dinero). Ningún módulo usa `logistics`. Navegación por `nav:vista`.

## Plan de implementación

Pruebas primero en cada paso: se escriben, fallan y luego se hace el código.

1. **Núcleo.** Pruebas en Node: `lgTemplate('x')` cae en la primera (`pedido`); `lgMoney` con `'97.400'`, `'$ 97.400'`, `'97400'`, `''`, `'0'`, `'abc'`; `lgValues` marca cada campo vacío y el precio inválido, y con todo bien da `ok: true`; `lgPrefill({ name: 'Omegaxl joint support', price: 97400 })`; `lgMessage('guia', ejemplo)` es idéntico al texto de la Parte 3 y `lgMessage('pedido', ejemplo)` al de la Parte 3b. Luego `core/logistics.js`, su `<script>` y su línea en `js/index.js`.
2. **Pestaña y sub-pestañas.** Humo: 11 pestañas y "Logística" justo después de "Escalado"; `#v-logistica` con encabezado; `#lg-parts` con `msgs` abierta y `track` deshabilitada (un clic no la abre). Luego el botón y la vista en `index.html`, `ui/logistics.js` (`parts`), `app/logistics.js`, `logistics.css`.
3. **Formulario y prellenado.** Humo: dos tarjetas, Guia a la izquierda y Pedidos a su derecha; 5 campos (sin tiempo de entrega); con `landing.prod` lleno, abrir la pestaña llena Producto y Precio; si ya escribí Producto no lo pisa; `#lg-import` sí lo pisa; sin producto en Desarrollo avisa. Luego `ui.logistics.card` y su lógica en `app`.
4. **Generar, copiar y limpiar.** Humo: Generar con campos vacíos marca `.lg-bad` y no cambia `#lg-<k>-out`; con todo lleno `#lg-<k>-out` = `lgMessage`; escribir después no cambia el mensaje; Copiar sin mensaje avisa; Limpiar vacía los datos del pedido y el mensaje, y deja el producto (y el precio). Luego botones en `ui` y `app`, y estilos.
5. **Revisión visual.** En el navegador: 7 temas, pantalla angosta, copiar y pegar en WhatsApp Web (negritas y emojis bien).
6. **Documentación.** Después del merge, `CLAUDE.md` y `README.md`: pestaña Logística, módulo `logistics`, ids `#lg-`, dependencias, orden de `<script>` y `<link>`.

## Criterios de aceptación

**Pestaña**
- [ ] La pestaña "Logística" aparece justo después de "Escalado" y abre `#v-logistica`.
- [ ] Muestra las sub-pestañas "💬 Mensajes a clientes" (abierta) y "📦 Seguimiento de pedidos · pronto" (deshabilitada, no se puede abrir).

**Mensajes a clientes**
- [ ] La pestaña muestra dos tarjetas separadas, lado a lado: "Confirmación de Guia" y, justo a su derecha, "Confirmación de Pedidos". No hay selector de plantillas.
- [ ] Las tarjetas son independientes: lo escrito, los errores y el mensaje de una no cambian la otra, y cada una tiene sus propios botones.
- [ ] "Confirmación de Pedidos" pide los 7 campos de la Parte 3b, trae el Producto de Desarrollo (el Total no) y, con los datos del ejemplo, genera el texto de la Parte 3b.
- [ ] El formulario pide Nombre del destinatario, Producto, Número de guía, Precio y Dirección de entrega (el tiempo de entrega, `2 a 4`, va fijo en el mensaje).
- [ ] Al abrir la pestaña, Producto y Precio vacíos se llenan con el nombre y el precio de "Producto que estoy montando" (Desarrollo).
- [ ] Si ya escribí Producto o Precio, abrir la pestaña no los cambia; "Traer de Desarrollo" sí.
- [ ] Todos los campos se pueden editar, incluido el precio traído.
- [ ] El precio acepta `97400`, `97.400` y `$ 97.400`, y se muestra `$ 97.400` al salir del campo.
- [ ] "Generar mensaje" con un campo vacío lo marca, avisa y no arma el mensaje.
- [ ] Con los datos del ejemplo, el mensaje generado es idéntico al de la Parte 3 (tienda, `*`, emojis, saltos de línea y `$97.400`).
- [ ] Editar un campo después de generar no cambia el mensaje hasta volver a tocar "Generar mensaje".
- [ ] "Copiar mensaje" lo copia y avisa; sin mensaje avisa y no copia.
- [ ] "Limpiar" vacía los datos del pedido y el mensaje de su tarjeta (en Guia: nombre, guía y dirección), y deja producto y precio.
- [ ] Al recargar no queda nada guardado de esta pestaña.
- [ ] Pegado en WhatsApp Web, las partes con `*` salen en negrita y los emojis se ven.

**Calidad**
- [ ] El texto de la plantilla vive solo en `core/logistics.js`; la UI no escribe partes del mensaje.
- [ ] Agregar una plantilla nueva solo exige una entrada en `LG_TEMPLATES` y su texto en `lgMessage`; su tarjeta aparece sola.
- [ ] Ids `#lg-` únicos en la página; ningún nombre `lg*`/`LG_*` choca al aplanar `js/index.js`.
- [ ] Ningún módulo existente cambia de comportamiento (Desarrollo solo se lee).
- [ ] Pasan `node tests/core.test.js`, `tests/smoke.test.js` y `node --check` de cada archivo tocado; consola limpia; `claves-pyl.json` coincide con `--claves`.
- [ ] Se ve bien en los 7 temas y en pantalla angosta (revisado en el navegador).

## Decisiones

- **Sí:** pestaña propia "Logística" después de "Escalado" (decisión del usuario, por ahora). Ahí crecerán seguimiento, clientes y entregas.
- **Sí:** bloque "Mensajes a clientes" como sub-pestaña, con "Seguimiento de pedidos · pronto" deshabilitada (decisión del usuario). Mismo patrón que Testeo.
- **Sí:** plantillas fijas en código (decisión del usuario). **No:** editor de plantillas en la app: más grande y hoy no hace falta.
- **Sí:** "Confirmación guía" y, a pedido del usuario tras el paso 4, "Confirmación de Pedidos" (otros campos y otro texto), cada una en su **propia tarjeta**, una al lado de la otra (la de Pedidos a la derecha). **No:** un selector de plantillas dentro de una sola tarjeta (se probó y el usuario pidió tarjetas aparte); las demás plantillas ahora.
- **Sí:** el total de "Confirmación de Pedidos" es un campo propio (`total`), sin prellenar: el usuario solo pidió traer el Producto de la app.
- **Sí:** producto y precio de "Producto que estoy montando" en Desarrollo (`landing.prod`) (decisión del usuario). **No:** Mi candidato: es un producto aún en evaluación.
- **Sí:** prellenar solo campos vacíos al abrir y botón "Traer de Desarrollo" para pisar. **No:** pisar siempre: borraría un precio que cambié a mano.
- **Sí:** tienda fija en `LG_STORE` y tiempo de entrega fijo `LG_DAYS` = `2 a 4` (decisión del usuario, revisada tras el paso 4: no varía, así que no es un campo; antes era un campo editable).
- **Sí:** precio editable con el de 1 unidad por defecto (decisión del usuario). **No:** calcular por unidades con las ofertas de Releasit.
- **Sí:** dirección en un solo campo libre (decisión del usuario). **No:** dirección y ciudad separadas.
- **Sí:** botón "Generar mensaje" (decisión del usuario), como Prompt DropKiller. **No:** vista previa en vivo.
- **Sí:** campo vacío = error marcado, sin mensaje (decisión del usuario). **No:** generar con `[corchetes]`.
- **Sí:** solo copiar (decisión del usuario). **No:** abrir `wa.me` ni pedir teléfono.
- **Sí:** nada se guarda (decisión del usuario): los datos son de un pedido puntual y son datos personales del cliente.
- **Sí:** "🧹 Limpiar" deja producto, precio y días para encadenar pedidos del mismo producto. Es una propuesta de esta spec; el usuario puede quitarla al revisar.
- **Sí:** el texto respeta "GUIA" sin tilde en el encabezado, tal como lo escribió el usuario.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El portapapeles falla en `file://` | Se usa `ui.dom.copy`, el mismo de Prompt DropKiller, que ya funciona en `file://` |
| Emojis o saltos de línea se dañan al copiar | La prueba del paso 1 compara el texto exacto; revisión en WhatsApp Web en el paso 5 |
| Desarrollo sin precio (`landing.prod.price` vacío) | Precio queda vacío y Generar lo marca como error |
| Estilo de `#ts-parts` atado al id de Testeo | Se generaliza a una clase compartida en el paso 2, sin cambiar cómo se ve Testeo |
| Nombres aplanados chocan en `js/index.js` | Prefijo `lg`/`LG_`; `report.js` tiene una función local `logistics` que no se publica |

## Lo que **no** está en esta spec

- Más plantillas (aparte de `pedido` y `guia`) y editor de plantillas.
- Seguimiento de pedidos, clientes y entregas.
- WhatsApp directo (`wa.me`) o teléfono del cliente.
- Precio por unidades (ofertas de Releasit).
- Datos del pedido desde Dropi.
- Guardar campos, plantilla o historial.

Cada una de esas, si llega, va en su propia spec.
