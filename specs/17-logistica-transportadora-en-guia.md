# SPEC 17 — Logística: transportadora en Confirmación de Guia y arranque siempre en Inicio, ciudades excluidas al día y favicon

> **Estado:** Aprobado
> **Depende de:** SPEC 13, SPEC 15
> **Fecha:** 2026-11-20
> **Objetivo:** (1) Sumar a la tarjeta «Confirmación de Guia» el campo obligatorio «Transportadora», que el mensaje imprime siempre en MAYÚSCULAS debajo del número de guía. (2) Que la app arranque siempre en Inicio, aunque la última vez se haya cerrado en otra pestaña. (3) Poner al día las ciudades excluidas de Meta Ads en Desarrollo. (4) Darle a la app un favicon propio y usar el mismo pulso como logo de la barra superior.

## Por qué existe esta spec

El mensaje «Confirmación de Guia» le dice al cliente su número de guía y que lo rastree «en la página web de la transportadora», pero no dice cuál. El usuario la escribe hoy a mano después de pegar el mensaje. Esta spec suma el campo para que salga en el mensaje.

## Por qué existe la Parte 2 (arranque en Inicio)

Hoy `js/app/nav.js` recuerda la última pestaña en `localStorage` (`ns_view`) y la restaura al cargar. Si se cierra el navegador estando en, por ejemplo, Logística, la app vuelve a abrir en Logística. El usuario quiere que cada vez que abre la app quede en **Inicio**.

## Alcance

### Parte 1 · Transportadora en Confirmación de Guia

**Dentro:**

- Campo nuevo en la plantilla `guia` de `LG_TEMPLATES`:
  `{ k: 'carrier', label: 'Transportadora', type: 'text', ph: 'Ej: ENVIA' }`
- Va en el formulario **justo después de «Número de guía»**. Orden final: Nombre del destinatario, Producto, Número de guía, Transportadora, Precio, Dirección de entrega.
- Obligatorio, con la regla común de los campos de texto: vacío (o solo espacios) → aviso «Escribe transportadora» y no se arma el mensaje.
- Se escribe a mano: sin `from`, sin `def`, sin `keep`. «Limpiar» lo vacía como a los demás campos de texto.
- El campo **no** se reformatea: queda como el usuario lo escribió (`envia`, `Envia`, `ENVIA`).
- En el mensaje sale siempre en MAYÚSCULAS (`toLocaleUpperCase('es-CO')` sobre el texto recortado), en una línea nueva **justo debajo** de la del número de guía:

```text
🚚 *Número de Guía*: 074102602224
🚛 *Transportadora*: ENVIA
🔗 *Rastreo*: Puedes consultar el estado de tu paquete directamente en la página web de la transportadora con ese número de guía.
```

Mensaje completo con `Pablo`, `Omegaxl joint support`, `074102602224`, `envia`, `97400` y `Cra 67 # 25 - 34 Itagui - Calatrava`:

```text
*CONFIRMACIÓN GUIA*
¡Hola, Pablo! 👋 Te saludamos nuevamente de 🍃*VidanovaStore®*.

Te confirmamos que tu pedido de la *Omegaxl joint support* ya fue empacado y entregado a la transportadora. 📦✨

🚚 *Número de Guía*: 074102602224
🚛 *Transportadora*: ENVIA
🔗 *Rastreo*: Puedes consultar el estado de tu paquete directamente en la página web de la transportadora con ese número de guía.

El tiempo estimado de entrega es de *2 a 4 días hábiles*.
💵 Recuerda tener listos los *$97.400* en efectivo para cuando el repartidor llegue a tu dirección (Cra 67 # 25 - 34 Itagui - Calatrava).

¡Cualquier duda que tengas durante el camino, nos puedes escribir por aquí! Que tengas un excelente día. 😊
```

(El tiempo de entrega sale de `LG_DAYS`, como hoy; el ejemplo muestra su valor actual.)

**Pruebas y documentación (Parte 1)**

- `tests/core.test.js`: campos de `guia` (`['name', 'product', 'guide', 'carrier', 'price', 'address']`) y sus `ph`; `lgForm` arranca con `carrier: ''`; `lgValues` con `carrier` vacío da «Escribe transportadora»; texto exacto del mensaje con `envia`, `Envia` y `ENVIA` (los tres → `ENVIA`); actualizar los usos existentes de `guia` (fixture de la línea ~1515 y el texto esperado de la ~1619).
- `tests/smoke.test.js`: el formulario `#lg-guia-form` tiene 6 campos en orden, etiqueta «Transportadora», placeholder `Ej: ENVIA` y su aviso `#lg-guia-err-carrier`; Generar con `envia` muestra `🚛 *Transportadora*: ENVIA` en `#lg-guia-out` y el campo sigue diciendo `envia`; Limpiar lo vacía.
- `tests/fixtures/claves-pyl.json` no cambia (no hay claves nuevas en `PYL.*`).
- Después del merge, actualizar `CLAUDE.md` y `README.md`.

### Parte 2 · Arranque siempre en Inicio

**Dentro:**

- `js/app/nav.js`: al cargar, `go('dash')` siempre. Ya no se lee `ns_view` para elegir la vista inicial.
- Ya no se guarda `ns_view` en `go()` (nadie más la lee; el valor viejo que quede en `localStorage` se ignora y no hace falta borrarlo).
- Cambiar de pestaña durante la sesión sigue igual (`go(v)`, evento `nav:vista`, `resize` en el tablero). Recargar con F5 también vuelve a Inicio.
- `tests/smoke.test.js`: con `ns_view = "logistica"` guardado en un `localStorage` simulado, la página nueva abre con solo `#v-dash` activo y `aria-current` en la pestaña Inicio.
- Después del merge, `CLAUDE.md` (Navegación) y `README.md`.

**Fuera:**

- Recordar la última pestaña como opción configurable.
- Cambiar la pestaña que abre un enlace con hash o parámetros.

### Parte 3 · Ciudades excluidas al día (Desarrollo → Meta Ads)

En Desarrollo → Meta Ads → ABO, paso «Conjunto 1: presupuesto y audiencia», la casilla de Lugares trae el desplegable «Ver ciudades que excluyo» (`EXCLUDED` en `js/modules/ads/core/ads.js`). Hoy tiene ciudades que ya no se excluyen (Amagá, Amalfi, Guatapé, Santa Fe de Antioquia, Valparaíso, San José De Cúcuta, Risaralda, Yopal, Chipaque, Cogua, Pacho, Nobsa…) y le faltan departamentos completos (Amazonas, Guainía, Vaupés, Vichada).

**Dentro:**

- Reemplazar `EXCLUDED` por la lista que tiene hoy el Administrador de anuncios, sin Guatapé (venía en la lista pegada por error: no se excluye) (Inclusión: Colombia), en el orden en que la muestra Meta. Las ciudades se escriben tal como salen en Meta; los departamentos con su tilde. Un departamento excluido completo lleva un solo valor: `'Todo el departamento'`.

```js
const EXCLUDED = [
  ['Amazonas', ['Todo el departamento']],
  ['Antioquia', ['Caicedo', 'San Andrés de Cuerquia', 'Tarso']],
  ['Arauca', ['Arauca', 'Arauquita', 'Cravo', 'Tame']],
  ['Caquetá', ['Albania (Caquetá)', 'Belén De Los Andaquíes', 'Morelia (Caquetá)', 'Puerto Rico (Caquetá)', 'Puerto Solano', 'San José del Fragua', 'San Vicente De Caguán', 'Solano']],
  ['Chocó', ['Bahía Solano']],
  ['Guainía', ['Todo el departamento']],
  ['Huila', ['Isnos', 'San José De Isnos']],
  ['Magdalena', ['Nueva Granada (Magdalena)']],
  ['Meta', ['Guamal']],
  ['Putumayo', ['La Hormiga', 'Puerto Asís', 'Puerto Guzmán', 'Villagarzón']],
  ['San Andrés y Providencia', ['San Andrés (San Andrés y Providencia)', 'Providencia']],
  ['Santander', ['Carcasí']],
  ['Sucre', ['El Francés', 'El Islote', 'El Roble']],
  ['Tolima', ['Venadillo']],
  ['Vaupés', ['Todo el departamento']],
  ['Vichada', ['Todo el departamento']],
  ['Casanare', ['Villanueva (Casanare)']],
  ['Cundinamarca', ['Fómeque', 'Quebradanegra', 'Quito']],
  ['Boyacá', ['Jericó']],
];
```

- La UI no cambia: `ui.landing.stepDetail` ya pinta `it.more.groups` como «Departamento: ciudad, ciudad».
- `tests/core.test.js`: `core.ads.EXCLUDED` es exactamente esa lista.
- Después del merge, `CLAUDE.md` y `README.md` solo si nombran ciudades.

**Fuera:** editar la lista desde la app; copiarla al portapapeles para pegarla en Meta.

### Parte 4 · Favicon

Hoy la pestaña del navegador muestra el ícono genérico de archivo local. Se elige la propuesta «C · Pulso» (decisión del usuario, entre cuatro): una línea de pulso negra sobre un cuadrado redondeado con el degradado dorado del tema Gold. Representa la operación en vivo y se lee bien a 16 px.

**Dentro:**

- Archivo nuevo `img/favicon.svg` (viewBox 64, `rx` 15, degradado `#FFE08A` → `#F5C451` → `#E2A92C`, trazo `#141414` de 5,5 con puntas redondas):

```svg
<path d="M8 34H19L25 20L33 46L39 28L43 34H56"/>
```

- `index.html`: `<link rel="icon" type="image/svg+xml" href="img/favicon.svg">` en el `<head>`, justo después de `<title>`. Funciona con `file://`.
- Colores fijos: el favicon no sigue el tema elegido.
- Logo de la barra superior (`.brand-mark`, junto a «Synkops · Mi operación en sincronía»): el SVG de la flecha de tendencia se cambia por el mismo pulso, escalado a su `viewBox` de 24 (`M3 12.75H7.1L9.4 7.5L12.4 17.25L14.6 10.5L16.1 12.75H21`). Este sí sigue el tema: fondo con el degradado `--b` → `--b2` de siempre y trazo `currentColor` con `.brand-mark{color:var(--on-b)}`. En Gold queda igual al favicon (pulso oscuro sobre dorado); en los temas azules, pulso blanco.
- Efecto del logo (monitor cardíaco, decisión del usuario): dos trazos del mismo pulso, uno tenue (`.bm-base`, opacidad .35) y otro (`.bm-run`, `pathLength="100"`, `stroke-dasharray: 28 72`) cuya luz recorre la línea en bucle cada 2,4 s. El cuadro late (`scale(1.05)` y halo más fuerte) cuando la luz pasa por el pico. Con el cursor sobre la marca, el ciclo va a 1,2 s. Con `prefers-reduced-motion` no hay animación y el pulso se ve entero. Estilos en `base.css`, junto a `.brand-mark`.
- `tests/smoke.test.js`: el `<head>` trae el `<link rel="icon">` con `img/favicon.svg` y el archivo existe; el logo de la barra dibuja el pulso con `stroke="currentColor"` en dos trazos (`.bm-base` y `.bm-run`).

**Fuera:** favicon que cambie con el tema; PNG/ICO para navegadores viejos.

### Fuera de la spec (otras specs)

- Lista desplegable de transportadoras o validar contra una lista fija.
- Enlace de rastreo por transportadora.
- Traer la transportadora de Dropi o de otro módulo.
- Agregar la transportadora a otras plantillas (Recordatorio En Ruta, Reclamar en Oficina, etc.).
- Cualquier otro cambio en el texto de «Confirmación de Guia».

## Modelo de datos

No hay estado nuevo ni persistencia: `app.state.logistics.cards.guia.form` suma la clave `carrier` sola, porque `lgForm` arma el formulario desde los campos de la plantilla. Nada se guarda.

### Cambios en `core/logistics.js`

```js
{ k: 'guia', stage: 'envio', title: 'Confirmación de Guia',
  fields: [
    { k: 'name', label: 'Nombre del destinatario', type: 'text', ph: 'Ej: Pablo' },
    { k: 'product', label: 'Producto', type: 'text', from: 'name', ph: 'Ej: Omegaxl joint support' },
    { k: 'guide', label: 'Número de guía', type: 'text', ph: 'Ej: 074102602224' },
    { k: 'carrier', label: 'Transportadora', type: 'text', ph: 'Ej: ENVIA' },
    { k: 'price', label: 'Precio', type: 'money', from: 'price', ph: 'Ej: $ 97.400' },
    { k: 'address', label: 'Dirección de entrega', type: 'text', ph: 'Ej: Cra 67 # 25 - 34 Itagui - Calatrava' },
  ] },
```

- `TEXT.guia` suma la línea `🚛 *Transportadora*: ${String(v.carrier || '').toLocaleUpperCase('es-CO')}` entre «Número de Guía» y «Rastreo». La conversión a mayúsculas vive solo en el texto del mensaje (núcleo), no en la UI.

### Ids nuevos

- `#lg-guia-f-carrier`, `#lg-guia-err-carrier` (los crea la UI desde la plantilla).

### Archivos que cambian

- `js/modules/logistics/core/logistics.js`: campo y texto de `guia`.
- `tests/core.test.js`, `tests/smoke.test.js`.
- Después del merge: `CLAUDE.md` y `README.md`.

`ui/logistics.js`, `app/logistics.js`, `index.html` y `css/` no cambian.

Parte 2: solo cambia `js/app/nav.js` (y `tests/smoke.test.js`).

Parte 3: solo cambia `js/modules/ads/core/ads.js` (y `tests/core.test.js`).

Parte 4: `img/favicon.svg` (nuevo), `index.html`, `css/base.css` (color del trazo de `.brand-mark`) y `tests/smoke.test.js`.

## Plan de implementación

Pruebas primero: se escriben, fallan y luego se hace el código.

1. **Campo y mensaje en el núcleo.** Pruebas en Node (campos, `ph`, `lgForm`, aviso de vacío, texto exacto, mayúsculas con `envia`/`Envia`/`ENVIA`) y actualización de las pruebas existentes de `guia`. Luego el campo en `LG_TEMPLATES` y la línea en `TEXT.guia`.
2. **Humo de la tarjeta.** Pruebas jsdom del formulario de 6 campos, Generar (mensaje en mayúsculas y campo sin cambiar) y Limpiar. No debería hacer falta código: la tarjeta se arma sola desde la plantilla.
3. **Arranque en Inicio.** Prueba de humo con `ns_view` guardado en otra pestaña (falla), luego `nav.js`: abrir siempre `dash` y dejar de leer/guardar `ns_view`.
4. **Ciudades excluidas.** Prueba en Node con la lista nueva (falla), luego `EXCLUDED`.
5. **Favicon.** Prueba de humo (falla), luego `img/favicon.svg`, el `<link rel="icon">` y el pulso en el logo de la barra.
6. **Documentación.** Después del merge, `CLAUDE.md` y `README.md`.

## Estado de la implementación

Pasos 1 a 5 del plan implementados en la rama `spec-17-logistica-transportadora-en-guia` (sin commit todavía). El paso 6 (documentación) va después del merge.

- **Parte 1:** campo `carrier` en `guia` y línea `🚛 *Transportadora*` en mayúsculas en `TEXT.guia`. El recorte de espacios lo hace `lgValues`, como en los demás campos; `lgMessage` solo pasa a mayúsculas. `ui`, `app`, `index.html` y `css` no cambiaron.
- **Parte 2:** `nav.js` abre siempre `dash`; se quitó el `store` local y ya no se lee ni guarda `ns_view`.
- **Parte 3:** `EXCLUDED` con 19 departamentos; Amazonas, Guainía, Vaupés y Vichada como `'Todo el departamento'` (constante interna `ALL_DEPT`, no exportada); sin Guatapé.
- **Parte 4:** se eligió «C · Pulso» entre cuatro propuestas (A · Sincronía, B · Caja, C · Pulso, D · Caja en sincronía). `img/favicon.svg` con colores fijos, `<link rel="icon">` tras `<title>`, logo de la barra con el mismo pulso que sigue el tema y efecto de monitor cardíaco.
- **Pruebas:** cada parte se escribió primero en `tests/core.test.js` o `tests/smoke.test.js`, falló y luego pasó. `tests/fixtures/claves-pyl.json` no cambió.

Los criterios marcados se verificaron con las pruebas. Los que quedan sin marcar son visuales o manuales y se revisan en el navegador o en WhatsApp Web.

## Criterios de aceptación

- [x] La tarjeta «Confirmación de Guia» muestra el campo «Transportadora» justo después de «Número de guía», con el ejemplo `Ej: ENVIA`.
- [x] Con Transportadora vacía, Generar marca «Escribe transportadora» y no cambia el mensaje.
- [x] Escrita como `envia`, `Envia` o `ENVIA`, el mensaje dice `🚛 *Transportadora*: ENVIA`.
- [x] La línea sale justo debajo de `🚚 *Número de Guía*: …` y antes de `🔗 *Rastreo*: …`; el resto del mensaje no cambia.
- [x] El campo conserva lo que escribió el usuario (no se pasa a mayúsculas en el formulario).
- [x] «Limpiar» vacía la Transportadora.
- [x] Las demás plantillas no cambian.
- [x] Pasan `node tests/core.test.js`, `tests/smoke.test.js` y `node --check` de `js/modules/logistics/core/logistics.js`, `js/app/nav.js` y `js/modules/ads/core/ads.js`; consola limpia.
- [x] Con otra pestaña guardada como última (`ns_view`), al abrir la app queda en Inicio (`#v-dash` activa y Inicio resaltada).
- [x] Cerrar la pestaña del navegador estando en otro módulo y volver a abrir `index.html` abre Inicio.
- [x] Cambiar de pestaña con el menú sigue funcionando igual.
- [x] En Desarrollo → Meta Ads → «Conjunto 1: presupuesto y audiencia», «Ver ciudades que excluyo» muestra la lista nueva (Amazonas, Guainía, Vaupés y Vichada como «Todo el departamento»; sin Risaralda ni Norte de Santander).
- [x] La pestaña del navegador muestra el favicon de pulso dorado al abrir `index.html`.
- [x] El logo late como un monitor (luz que recorre el pulso y latido del cuadro), más rápido con el cursor encima y quieto con «reducir movimiento».
- [x] El logo de la barra superior muestra el mismo pulso; en Gold, oscuro sobre dorado, y en otros temas, con el color de texto sobre el acento.
- [x] Pegado en WhatsApp Web, «Transportadora» sale en negrita y el 🚛 se ve.

## Decisiones

- **Sí:** campo obligatorio (decisión del usuario), con la regla común de texto.
- **Sí:** emoji 🚛 para la línea (decisión del usuario), distinto del 🚚 del número de guía.
- **Sí:** mayúsculas solo en el mensaje (decisión del usuario); el campo queda como se escribió.
- **Sí:** el campo va después de «Número de guía» en el formulario, el mismo orden que en el mensaje.
- **Sí:** spec nueva y no ampliar la 15, que ya está implementada.
- **No:** lista fija de transportadoras: el usuario la escribe a mano.
- **Sí:** la app siempre arranca en Inicio (decisión del usuario), en esta misma spec y no en otra aparte.
- **Sí:** se deja de guardar `ns_view`: ya no tiene lector.
- **Sí:** ciudades excluidas al día en esta misma spec (decisión del usuario); departamento completo = «Todo el departamento».
- **Sí:** favicon «C · Pulso» con colores fijos del tema Gold (decisión del usuario).
- **Sí:** el logo de la barra usa el mismo pulso y sigue el tema (decisión del usuario).
- **Sí:** efecto de monitor cardíaco en el logo (decisión del usuario); el favicon queda quieto.

## Lo que **no** está en esta spec

- Lista o validación de transportadoras, enlaces de rastreo, traerla de Dropi.
- Transportadora en otras plantillas.

Cada una de esas, si llega, va en su propia spec.
