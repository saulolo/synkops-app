# SPEC 15 — Logística: mensajes de reconfirmación, envío y entrega

> **Estado:** Implementado
> **Depende de:** SPEC 13
> **Fecha:** 2026-11-19 (ampliada el mismo día con las Partes 10, 11 y 12)
> **Objetivo:** Sumar a "Mensajes a clientes" seis plantillas nuevas (Reconfirmación de Pedido, Reintento de Entrega, Flete Especial, Recordatorio En Ruta, Pedido Entregado y Reclamar en Oficina) y cambiar la marca a `🍃VidanovaStore®` en todos los mensajes, con la misma dinámica de tarjetas de la SPEC 13.

## Por qué existe esta spec

La SPEC 13 cubrió los mensajes de antes del despacho (confirmar pedido, guía, intentos, anticipo). Faltan los de después: la ruta, la entrega fallida, el flete especial, el pedido en oficina y el cierre con agradecimiento. Cada uno lo escribió el usuario y se pega a mano hoy en WhatsApp. Esta spec los suma como tarjetas, una por mensaje, y deja el texto de cada una tal cual lo redactó (solo con correcciones ortográficas acordadas).

## Alcance

**Dentro:**

> **Ampliación (Partes 10 y 11):** tras implementar los pasos 1 a 10 el usuario pidió ajustes a textos, botones y campos (Parte 10) y una reorganización de la pestaña (Parte 11). Esas Partes y los pasos 11 a 17 los recogen y **prevalecen** sobre los textos de las Partes 3 a 8 y sobre el orden de la Parte 9. Cada Parte vieja marca lo que cambió.

**Parte 1 · Dinámica heredada (no cambia)**

Cada plantilla nueva sigue lo de la SPEC 13:

- Una tarjeta por plantilla (`.lg-card`, `#lg-card-<k>`), contraída al abrir la pestaña, con `#lg-<k>-toggle`, formulario `#lg-<k>-form`, campos `#lg-<k>-f-<campo>`, avisos `#lg-<k>-err-<campo>`, y los botones `#lg-<k>-gen`, `#lg-<k>-copy`, `#lg-<k>-clear` y, si la plantilla tiene campos `from`, `#lg-<k>-import` («Traer de Desarrollo»).
- Todos los campos son obligatorios y editables, salvo lo indicado en cada plantilla.
- El mensaje solo cambia al tocar «Generar mensaje». Nada se guarda entre sesiones.
- El dinero se escribe como `97400`, `97.400` o `$ 97.400` y sale en el mensaje como `$97.400` (sin espacio).
- «Limpiar» vacía los datos propios del pedido (campos sin `from`) y el mensaje, y deja los campos `from`. Se suma la propiedad `keep` (ver Parte 2).

**Parte 2 · Cambios al núcleo común**

- **Marca con ®:** `LG_STORE` pasa de `🍃VidanovaStore` a `🍃VidanovaStore®`. Como `STORE_BOLD` se deriva de `LG_STORE`, todas las plantillas (también las de la SPEC 13: Pedidos, Guia, Segundo Intento y Anticipo) dicen `🍃*VidanovaStore®*`. El ® va dentro de los asteriscos.
- **Campo condicional (`when`):** un campo con `when: '<clave de una casilla>'` solo existe si esa casilla está marcada: la UI lo muestra solo entonces, `lgValues` no lo exige ni lo devuelve si está desmarcada, y desmarcar la casilla no borra lo escrito. Lo usan «Pedido Entregado» y «Reclamar en Oficina» (Título del manual, condicionado a «Incluye manual»).
- **Campo que se conserva (`keep`):** un campo con `keep: true` no se vacía con «Limpiar» (como ya pasa con la casilla de obsequio). Lo llevan las casillas «Incluye manual» y el Título del manual, porque pertenecen al producto, no al pedido.
- **Constantes de la tienda** en `core/logistics.js`: `LG_CATALOG` = `https://vidanovastore.com/products`, `LG_NEQUI` = `3182110955` y `LG_BANK` = `23015881151`. Hoy las cuentas están escritas dentro del texto de «Solicitud de Anticipo»; se mueven a las constantes sin cambiar el texto que sale.

**Parte 3 · Reconfirmación de Pedido (`reconfirma`)**

Segundo mensaje de confirmación del pedido, para cuando el cliente no contestó el primero. Va justo a la derecha de «Confirmación de Pedidos». «Segundo Intento» (`recordatorio`) se elimina en la Parte 10: el segundo recordatorio pasa a ser «Tercer Intento».

- Campo: Nombre de cliente (`name`, ej. `Eugenia`).
- Sin «Traer de Desarrollo».

```text
¡Hola Eugenia! 👋 Te escribíamos de la tienda 🍃*VidanovaStore®* nuevamente.

Te contactamos brevemente para confirmar los datos y asegurarnos de que tu *Envío Gratis* salga hoy mismo hacia tu dirección. 📦

Recuerda que con nosotros *no arriesgas nada ni pagas por adelantado*: el pago es 100% en efectivo únicamente cuando el repartidor de la transportadora te entregue el paquete en la puerta de tu casa. 💵🤝

¿Nos confirmas por favor con un simple "SÍ" o un "OK" si todo está correcto para proceder con el despacho? ¡Quedamos atentos! ✨
```

Texto del usuario con tres ajustes: `**…**` pasó a `*…*` (la negrita de WhatsApp es de un solo asterisco), se sumó el 🍃 a la tienda (como en las demás plantillas) y se agregó el ®. «Te escribíamos» queda literal.

**Parte 4 · Reintento de Entrega (`reintento`)**

Cuando el repartidor no encontró al cliente y el pedido sale otra vez en ruta.

- Campos: Nombre de cliente (`name`, ej. `Rafael`) y Producto (`product`, ej. `Crema Despigmentante Coreana`, `from: 'name'`: se prellena de Desarrollo y trae «Traer de Desarrollo»). El producto sale en negrita sin que se escriban los asteriscos.

```text
¡Saludos, Rafael! ☀️

Le escribimos de la tienda 🍃*VidanovaStore®*.

Queremos informarle que su *Crema Despigmentante Coreana* ya salió nuevamente en ruta de reparto para ser entregada hoy en la dirección confirmada. 🚚📦

Tuvimos un intento de entrega anterior donde no fue posible ubicarl@, por lo que le pedimos el favor de *dejar encargado a alguien con el dinero en efectivo* o estar muy atent@ a su celular por si el repartidor de la transportadora se comunica.

Cualquier novedad, quedamos muy atentos por este medio. ¡Que tenga un excelente día! 😊
```

Se corrigió «Saudos» a «Saludos». `ubicarl@` y `atent@` quedan con `@` (decisión del usuario).

**Parte 5 · Flete Especial (`flete`)**

Cuando el pedido va a una zona lejana y el flete cotizado se sale del presupuesto; se pide un anticipo para despachar.

- Campos: Nombre de cliente (`name`, ej. `Rafael`), Ciudad (`city`, ej. `Vaupés`), Precio del flete (`shipping`, dinero, ej. `$ 50.000`, aviso «Flete mayor a 0»), Producto (`product`, ej. `Crema arbutina`, `from: 'name'`, con «Traer de Desarrollo») y Valor del anticipo (`advance`, dinero, ej. `$ 20.000`, aviso «Anticipo mayor a 0»).
- Las cuentas (`LG_NEQUI`, `LG_BANK`) van fijas.

```text
¡Hola, Rafael! 🌸Te saludamos de 🍃*VidanovaStore®*
Te comparto la captura de la transportadora: al ser una zona aérea especial hacia Vaupés, el flete nos sale en $50.000, por lo que lastimosamente nos es imposible enviarlo con flete gratis total. 🥺
Queremos que no te quedes sin tu Crema arbutina, nosotros asumimos la mayor parte del envío si tú nos apoyas con un anticipo de $20.000 parte del flete, y el producto lo pagas en efectivo al recibir en tu casa. 🚚✨
Cuenta Nequi: 3182110955
Cuenta Bancolombia - Ahorros: 23015881151

¿Te gustaría transferir el flete para despacharte de una vez, o prefieres que cancelemos la orden? ¡Lo que tú decidas lo entendemos con el mayor gusto! 🤍
```

Cambios al texto del usuario: `**VidanovaStore**` pasó a `🍃*VidanovaStore®*` y se agregó una coma tras «tu [Producto]». La captura de la transportadora se adjunta aparte en WhatsApp (la app no la adjunta). Los saltos de línea simples se respetan como los escribió.

**Parte 6 · Recordatorio En Ruta (`enruta`)**

Recordatorio de que el pedido ya va en ruta, para que el cliente esté pendiente o deje el dinero listo.

- Campos: Nombre de cliente (`name`, ej. `Beatriz`) y Producto (`product`, ej. `Crema Arbutina`, `from: 'name'`, con «Traer de Desarrollo»).

```text
Hola, Beatriz, *tu pedido Crema Arbutina ya se encuentra en ruta de entrega*.
📦 Al ser un servicio *contra entrega*, recuerda estar pendiente de la llegada del repartidor o dejar el dinero listo con un conocido para asegurar una entrega rápida.
¡Agradecemos mucho tu colaboración! ✨
```

El título que el usuario puso arriba de su borrador («MENSAJE RECORDATORIO QUE EL PEDIDO ESTA EN RUTA») es solo una etiqueta suya: no va en el mensaje ni en la tarjeta. Se cambió «Estimad@» por «Hola, <nombre>,» (sirve para hombre y mujer) y «estar atento» por «estar pendiente».

**Parte 7 · Pedido Entregado (`entregado`)**

Agradecimiento cuando el pedido ya llegó; invita a ver el catálogo y, si lleva manual de regalo, lo recuerda.

- Campos: Nombre de cliente (`name`, ej. `Beatriz`), casilla «Incluye manual» (`manual`, marcada por defecto, `keep`) y Título del manual (`manualTitle`, ej. `Manual de Bienestar Articular`, `when: 'manual'`, `keep`; obligatorio solo con la casilla marcada). Sin Producto ni «Traer de Desarrollo».
- Fijos en el texto: `LG_CATALOG` y el nombre «Saul».

Con manual:

```text
¡Hola, Beatriz! 👋 Espero que estés teniendo un excelente día.

Te escribimos desde 🍃*VidanovaStore®* porque vimos que ya recibiste tu pedido. ¡Nos alegra mucho que ya esté contigo! Queremos que le saques el mayor provecho desde hoy.
¡Gracias de corazón por confiar en nosotros!

Como un detalle especial por tu compra, te comparto este manual exclusivo que preparamos para ti:
📄 Tu guía adjunta: *Manual de Bienestar Articular*. (Una guía valorada por especialistas, exclusiva para ti).
💡 Un consejo clave: Échale un vistazo antes de empezar a usar tu producto; ahí tienes las pautas exactas para ver los mejores resultados paso a paso.

Si más adelante quieres pedir algo nuevo para ti o recomendárselo a alguien, puedes ver todo nuestro catálogo aquí:
🔗 https://vidanovastore.com/products

Cualquier duda que tengas sobre cómo usarlo, escríbeme por aquí, me llamo Saul y con gusto te ayudo. ¡Que lo disfrutes mucho! ✨

Equipo 🍃 *VidanovaStore®*
```

Sin manual (casilla desmarcada) se quita todo el bloque «Como un detalle especial…» con sus dos líneas (📄 y 💡), porque el consejo habla del manual:

```text
¡Hola, Beatriz! 👋 Espero que estés teniendo un excelente día.

Te escribimos desde 🍃*VidanovaStore®* porque vimos que ya recibiste tu pedido. ¡Nos alegra mucho que ya esté contigo! Queremos que le saques el mayor provecho desde hoy.
¡Gracias de corazón por confiar en nosotros!

Si más adelante quieres pedir algo nuevo para ti o recomendárselo a alguien, puedes ver todo nuestro catálogo aquí:
🔗 https://vidanovastore.com/products

Cualquier duda que tengas sobre cómo usarlo, escríbeme por aquí, me llamo Saul y con gusto te ayudo. ¡Que lo disfrutes mucho! ✨

Equipo 🍃 *VidanovaStore®*
```

Cambios al texto del usuario: se quitó el `!` suelto de «desde 🍃*VidanovaStore*! porque» y se agregó el ®. Se cambió el enlace de producto (`…/products/omegaxl-join`) por el del catálogo, fijo.

**Parte 8 · Reclamar en Oficina (`oficina`)**

Cuando el pedido está en la oficina de la transportadora para que el cliente lo reclame.

- Campos: Producto (`product`, ej. `Crema Arbutina`, `from: 'name'`, con «Traer de Desarrollo»), casilla «Incluye manual» (`manual`, marcada por defecto, `keep`) y Título del manual (`manualTitle`, `when: 'manual'`, `keep`). Sin Nombre de cliente.

Con manual:

```text
Saludos desde 🍃*VidanovaStore®*, le informamos que su pedido de Crema Arbutina ya se encuentra en la oficina para ser reclamado. Por favor, nos informe cuando lo obtenga para enviarle el Manual de Bienestar Articular.
```

Sin manual:

```text
Saludos desde 🍃*VidanovaStore®*, le informamos que su pedido de Crema Arbutina ya se encuentra en la oficina para ser reclamado. Por favor, nos informe cuando lo obtenga.
```

El título «RECLAMAR EN OFICINA» es solo etiqueta del usuario (no va en el mensaje). Correcciones al texto: «reclamada» a «reclamado», «nos informa» a «nos informe», se quitó la coma tras el producto, la oración larga se cortó en dos y se agregó el ®. Sin «de uso» tras el título del manual. El manual va sin negrita.

**Parte 9 · Orden de las tarjetas**

Orden en `LG_TEMPLATES` (las tarjetas fluyen por ancho; ya no hay saltos de fila forzados):

1. `pedido` · `reconfirma` · `tercero` (Tercer Intento) · `confirmado` · `guia` · `anticipo` (las seis que quedan de la SPEC 13, con `reconfirma` nueva a la derecha de Pedidos; `recordatorio` se elimina en la Parte 10)
2. Luego las nuevas, en el orden en que se redactaron: `reintento` · `flete` · `enruta` · `entregado` · `oficina`.

Este orden reemplaza el de las notas finales de la SPEC 13. Mover una tarjeta es mover su entrada en `LG_TEMPLATES`.

**Parte 10 · Ajustes tras la primera revisión (pedidos por el usuario)**

1. **«Traer de Desarrollo» a la izquierda de la flecha.** En una tarjeta abierta el botón queda justo a la izquierda de la flecha de contraer (hoy queda a su derecha y se puede pulsar sin querer al intentar contraer). Solo estilo; el botón sigue apareciendo solo con la tarjeta abierta y solo en las tarjetas que lo tienen.
2. **Teléfono de contacto validado** (Confirmación de Pedidos, `phone`, nuevo tipo `phone`). Se aceptan `+57 311 7624068`, `+573117624068`, `311 7624068` y `3117624068` (prefijo `+57` opcional, con o sin espacio; diez dígitos que empiezan por 3, con un espacio opcional tras los tres primeros). Cualquier otra forma se rechaza con el aviso «Teléfono inválido: usa 311 7624068 o +57 311 7624068». En el mensaje sale siempre `3117624068` (sin `+57` ni espacios) y el campo se reescribe así al salir de él, como el dinero. Función nueva `lgPhone(text)` en el núcleo (devuelve el número de 10 dígitos o `null`).
3. **Botones de la tarjeta.** «Generar mensaje» va arriba, a todo el ancho y con un estilo propio y sencillo (degradado del color de acento, sombra suave, letra más gruesa); debajo, en una fila, «Limpiar» y «Copiar mensaje». El orden en la tarjeta es `gen`, `clear`, `copy`. Todo con tokens de color (7 temas).
4. **Un solo recordatorio de contacto.** Se elimina la plantilla `recordatorio` («Segundo Intento», «Te escribimos otra vez…») y se queda `tercero` con el nombre **«Tercer Intento»**, su mensaje de llamada sin respuesta y sus campos (nombre, producto, ciudad), ahora en la 3.ª posición. Orden final de las 12 tarjetas: `pedido` · `reconfirma` · `tercero` · `confirmado` · `guia` · `infografia` · `anticipo` · `reintento` · `flete` · `enruta` · `entregado` · `oficina`.
5. **Producto en negrita.** En todo mensaje con campo `product` sale `*producto*` (el usuario lo escribe sin asteriscos): `pedido` (`-- *X* --`), `guia`, `tercero`, `anticipo`, `flete` y `oficina`. `reintento` ya lo traía y `enruta` lo lleva dentro de su frase en negrita (no se anidan asteriscos).
6. **Cuentas con íconos y bien separadas** (`anticipo` y `flete`). Constante de texto compartida `LG_ACCOUNTS` (arma el bloque con `LG_NEQUI` y `LG_BANK`):

```text
📱 *Nequi/Daviplata*
3182110955

🏦 *Ahorros - Bancolombia*
23015881151
```

   En `anticipo` va tras la línea «Puedes realizar el abono a cualquiera de nuestras dos cuentas:» (reemplaza «…a nuestro Nequi/Daviplata:» y «O a nuestra cuenta de Ahorros - Bancolombia»). En `flete` va tras el párrafo de la propuesta, sin línea de introducción.
7. **Textos ajustados** (reemplazan a los de las Partes 5 a 8 donde difieran):
   - **Reintento de Entrega:** «Le escribimos de la tienda» pasa a «**Te** escribimos de la tienda 🍃*VidanovaStore®*.» (el resto del texto, en «usted», no cambia).
   - **Flete Especial** (sin el 🌸, un párrafo por bloque y cuentas en el formato del punto 6):

```text
¡Hola, Rafael! Te saludamos de 🍃*VidanovaStore®*

Te comparto la captura de la transportadora: al ser una zona aérea especial hacia Vaupés, el flete nos sale en $50.000, por lo que lastimosamente nos es imposible enviarlo con flete gratis total. 🥺

Queremos que no te quedes sin tu *Crema arbutina*, nosotros asumimos la mayor parte del envío si tú nos apoyas con un anticipo de $20.000 parte del flete, y el producto lo pagas en efectivo al recibir en tu casa. 🚚✨

📱 *Nequi/Daviplata*
3182110955

🏦 *Ahorros - Bancolombia*
23015881151

¿Te gustaría transferir el flete para despacharte de una vez, o prefieres que cancelemos la orden? ¡Lo que tú decidas lo entendemos con el mayor gusto! 🤍
```

   - **Recordatorio En Ruta** (una línea en blanco entre los tres párrafos):

```text
Hola, Beatriz, *tu pedido Crema Arbutina ya se encuentra en ruta de entrega*.

📦 Al ser un servicio *contra entrega*, recuerda estar pendiente de la llegada del repartidor o dejar el dinero listo con un conocido para asegurar una entrega rápida.

¡Agradecemos mucho tu colaboración! ✨
```

   - **Pedido Entregado:** «¡Gracias de corazón por confiar en nosotros! 🤍» (corazón blanco, como en las demás plantillas). El resto igual.
   - **Reclamar en Oficina:** el producto va en negrita y «Por favor…» empieza en una línea nueva (salto simple):

```text
Saludos desde 🍃*VidanovaStore®*, le informamos que su pedido de *Crema Arbutina* ya se encuentra en la oficina para ser reclamado.
Por favor, nos informe cuando lo obtenga para enviarle el Manual de Bienestar Articular.
```

     Sin manual: «Por favor, nos informe cuando lo obtenga.»

**Parte 11 · Contenedor «Mensajes a Clientes» y sub-pestaña «Plantillas de mensajes»**

Para dejar lugar a «Mensajes a Proveedores» (que se construirá en otra spec), la pestaña Logística se reorganiza:

- **Sub-pestaña:** `msgs` pasa de «💬 Mensajes a clientes» a **«💬 Plantillas de mensajes»** (nombre general; elegido por el usuario entre tres opciones). El texto de `LG_PARTS` sale solo de `core/logistics.js`.
- **Contenedor:** las 12 tarjetas de clientes quedan dentro de un contenedor titulado **«Mensajes a Clientes»** (`#lg-group-clientes`, título `#lg-group-clientes-h`, `<section aria-labelledby>`), que a su vez va dentro de `#lg-msgs`, el bloque que se muestra u oculta con la sub-pestaña `msgs`. Un contenedor futuro («Mensajes a Proveedores») será otro `<section class="lg-group">` hermano dentro de `#lg-msgs`, sin tocar este.
- **`#lg-cards`** sigue siendo el contenedor de las tarjetas (mismo id y mismo orden), ahora dentro del grupo. Las tarjetas no cambian.
- **Estilo:** el contenedor se ve como un marco suave con un título con barrita de acento, solo con tokens de color (7 temas), y en pantalla angosta no desborda.
- **Título de las tarjetas con «chip de etapa»** (estilo elegido por el usuario entre tres propuestas): en una sola línea van, de izquierda a derecha, una etiqueta pequeña con la etapa del pedido, el nombre de la tarjeta (más compacto: 16 px, sin la barrita de acento, que queda para el título del contenedor; un nombre largo pasa a una segunda línea) y la flecha de contraer. La tarjeta contraída queda baja y compacta (estilo elegido entre tres propuestas). Etapas en `LG_STAGES` (`confirmar` «Confirmar», `cobro` «Cobro», `envio` «Envío», `entrega` «Entrega»); cada plantilla trae `stage`: `pedido`, `reconfirma`, `tercero`, `confirmado` → Confirmar; `anticipo`, `flete` → Cobro; `guia`, `infografia`, `reintento`, `enruta`, `oficina` → Envío; `entregado` → Entrega. El chip es un `<span class="lg-stage" data-stage>` hermano del título dentro de `.lg-head` (el `<h2>` sigue teniendo solo el nombre); colores con tokens de los temas.
- **Rejilla:** dentro del contenedor las tarjetas van en **tres columnas iguales que llenan todo el ancho** (sin hueco a la derecha); dos columnas si el contenedor mide menos de 930 px y una si mide menos de 620 px (consulta de contenedor, no de pantalla). Las tarjetas ya no tienen ancho fijo de 385 px: se estiran con la columna.
- **Fuera:** crear «Mensajes a Proveedores», plegar o contraer el contenedor, cambiar el título «Logística» o su texto de ayuda.

**Parte 12 · Envío de Infografía (`infografia`)**

Mensaje para mandar la infografía con el paso a paso de uso del producto. Va **justo después de «Confirmación de Guia»** y antes de «Solicitud de Anticipo» (etapa Envío). La imagen se adjunta aparte en WhatsApp.

- Campo: Producto (`product`, ej. `Crema Arbutina`, `from: 'name'`, con «Traer de Desarrollo»). No pide nombre de cliente (el saludo es fijo, como lo redactó el usuario).

```text
¡Hola! 👋 Te saludamos de 🍃*VidanovaStore®*.

Para que le saques el máximo provecho a tu producto y veas resultados más rápido, te compartimos esta *infografía visual* con el paso a paso exacto para aplicar tu *Crema Arbutina* en tu rutina. 🌙✨

¡Guárdala en tu celular para tenerla a la mano! Cualquier duda con el uso, con gusto te asesoramos por aquí. 😊
```

Cambios al texto del usuario: `🍃 *VidanovaStore*` pasó a `🍃*VidanovaStore®*` (sin espacio y con ®, como en las demás plantillas), `**infografía visual**` pasó a `*…*` (negrita de WhatsApp) y se quitó el `[Nombre producto: …]` entre corchetes, que es la marca del campo. «aplicar tu <producto> en tu rutina» queda literal (sirve para cremas; si luego hay productos de otro tipo, se ajusta).

**Pruebas y documentación**

- `tests/core.test.js`: texto exacto de cada plantilla nueva (los ejemplos de arriba), con y sin manual donde aplica; validación; `when` y `keep`; las plantillas de la SPEC 13 con `®`.
- `tests/smoke.test.js`: 12 plantillas en el orden de la Parte 9 (ajustada en la Parte 10), contraídas; campo condicional que aparece y desaparece; Generar, Copiar y Limpiar de las nuevas.
- Regenerar `tests/fixtures/claves-pyl.json` solo si cambia una clave de `PYL.*` (se espera que no).
- Después del merge, actualizar `CLAUDE.md` y `README.md`.

**Fuera (otras specs):**

- Más plantillas distintas a estas seis.
- Editor de plantillas en la app.
- Seguimiento de pedidos, clientes y entregas (sub-pestaña `track`).
- Adjuntar imágenes (captura de la transportadora, manual en PDF, gráfica del anticipo): se envían aparte en WhatsApp.
- Abrir WhatsApp (`wa.me`) o pedir el teléfono del cliente.
- Guardar campos, historial o plantillas elegidas.
- Mover las cuentas bancarias a un lugar editable por el usuario.
- Validar otros campos (dirección, ciudad…) o teléfonos de otros países.

## Modelo de datos

No hay estructuras de estado nuevas: cada plantilla se suma a `LG_TEMPLATES` y su tarjeta aparece sola. `app.state.logistics.cards` crea una entrada por plantilla, con el mismo formato (`{ form, last }`), y sigue sin guardarse.

### Cambios en `core/logistics.js`

```js
const LG_STORE = '🍃VidanovaStore®';
const LG_CATALOG = 'https://vidanovastore.com/products';
const LG_NEQUI = '3182110955';
const LG_BANK = '23015881151';

// Campo condicional y campo que se conserva:
{ k: 'manual',      label: 'Incluye manual',   type: 'check', def: true, keep: true },
{ k: 'manualTitle', label: 'Título del manual', type: 'text', when: 'manual', keep: true, ph: 'Ej: Manual de Bienestar Articular' },
```

- `lgValues(tpl, form)`: si un campo trae `when` y la casilla indicada está desmarcada, no se valida ni entra en `values`.
- `lgForm(tpl)`: sin cambios (el `def` de cada campo).
- Funciones nuevas: ninguna (la Parte 10 suma `lgPhone`). Texto de cada plantilla en `TEXT` (`reconfirma`, `reintento`, `flete`, `enruta`, `entregado`, `oficina`).
- Claves nuevas en el objeto exportado: `LG_CATALOG`, `LG_NEQUI`, `LG_BANK` (prefijo `LG_`, no chocan al aplanar).

### Ids nuevos (prefijo `#lg-`)

Por cada plantilla nueva (`<k>` = `reconfirma`, `reintento`, `flete`, `enruta`, `entregado`, `oficina`): `#lg-card-<k>`, `#lg-<k>-toggle`, `#lg-<k>-body`, `#lg-<k>-form`, `#lg-<k>-f-<campo>`, `#lg-<k>-err-<campo>`, `#lg-<k>-import` (si hay campo `from`), `#lg-<k>-gen`, `#lg-<k>-copy`, `#lg-<k>-clear`, `#lg-<k>-out`. Campo condicional: `#lg-<k>-f-manualTitle`.

### Archivos que cambian

- `js/modules/logistics/core/logistics.js`: constantes, plantillas, textos, `when`, `keep`.
- `js/modules/logistics/ui/logistics.js`: mostrar u ocultar los campos con `when` según la casilla.
- `js/modules/logistics/app/logistics.js`: repintar el campo condicional al marcar la casilla; «Limpiar» respeta `keep`.
- `index.html`: el contenedor `#lg-msgs` > `#lg-group-clientes` alrededor de `#lg-cards` (Parte 11; es el único cambio en este archivo).
- `css/modules/logistics.css`: ocultar el campo condicional (`.lg-cell[hidden]`), mover «Traer de Desarrollo» junto a la flecha y el estilo de los botones (Parte 10).
- `tests/core.test.js`, `tests/smoke.test.js`.
- Después del merge: `CLAUDE.md`, `README.md`.

No se crean archivos nuevos ni cambian `js/index.js` ni el orden de `<script>`/`<link>`; `index.html` solo gana el contenedor de la Parte 11. Con la Parte 10 se suma la clave `lgPhone` (y `LG_ACCOUNTS` si se exporta) al objeto de `core.logistics`: `tests/core.test.js` lista las claves aplanadas y se actualiza; `claves-pyl.json` no cambia.

## Plan de implementación

Pruebas primero en cada paso: se escriben, fallan y luego se hace el código. Cada paso deja la app funcionando y se commitea solo.

1. **Marca con ®.** Pruebas en Node: `lgMessage` de `pedido`, `guia`, `recordatorio` y `anticipo` con los ejemplos de la SPEC 13 sale con `🍃*VidanovaStore®*`. Luego `LG_STORE` con el ® y se actualizan los textos esperados de las pruebas existentes (`core.test.js` y `smoke.test.js`).
2. **Constantes de la tienda.** Pruebas: el texto de `anticipo` sale idéntico al de antes. Luego `LG_CATALOG`, `LG_NEQUI` y `LG_BANK`, y `anticipo` los usa.
3. **Campo condicional y `keep` en el núcleo.** Pruebas con una plantilla de prueba: con la casilla marcada el campo `when` es obligatorio y entra en `values`; desmarcada no da error ni entra. Luego `lgValues`. Se agrega la clave `when`/`keep` a la documentación del comentario de `LG_TEMPLATES`.
4. **Campo condicional y `keep` en la interfaz.** Humo con una plantilla de prueba sembrada en el estado: el campo condicional se oculta con la casilla desmarcada y aparece al marcarla sin perder lo escrito; «Limpiar» no vacía los campos `keep`. Luego `ui/logistics.js`, `app/logistics.js` y, si hace falta, `logistics.css`.
5. **Reconfirmación de Pedido.** Pruebas: texto exacto de la Parte 3, error con el nombre vacío, tarjeta justo a la derecha de «Confirmación de Pedidos». Luego su entrada en `LG_TEMPLATES` (segunda posición) y su texto; se quita `newRow` de `recordatorio`. Se ajustan las pruebas de orden existentes.
6. **Reintento de Entrega.** Pruebas: texto exacto de la Parte 4 (con `@` y negrita del producto), errores, «Traer de Desarrollo» pisa solo el producto. Luego la plantilla y su texto.
7. **Flete Especial.** Pruebas: texto exacto de la Parte 5, errores de flete y anticipo (`Flete mayor a 0`, `Anticipo mayor a 0`), producto prellenado. Luego la plantilla y su texto.
8. **Recordatorio En Ruta.** Pruebas: texto exacto de la Parte 6 y errores. Luego la plantilla y su texto.
9. **Pedido Entregado.** Pruebas: texto exacto con manual y sin manual (Parte 7); con la casilla desmarcada el título no es obligatorio; con ella marcada y el título vacío, error. Luego la plantilla y su texto.
10. **Reclamar en Oficina.** Pruebas: texto exacto con y sin manual (Parte 8) y errores. Luego la plantilla y su texto.
11. **Botón «Traer de Desarrollo» a la izquierda de la flecha** (Parte 10, punto 1). Humo: en una tarjeta con el botón, este queda antes de la flecha en el orden visual de la cabecera; solo estilo, se revisa a ojo en el paso 18.
12. **Teléfono validado** (punto 2). Pruebas: `lgPhone` con las cuatro formas válidas da `3117624068` y las inválidas (letras, 9 o 11 dígitos, `+1`, otros separadores) dan `null`; el campo avisa, se reescribe al salir y el mensaje de Pedidos lleva `3117624068`. Luego `lgPhone`, tipo `phone` en `lgValues` y la UI.
13. **Botones y «Tercer Intento»** (puntos 3 y 4). Pruebas: orden `gen`, `clear`, `copy` en cada tarjeta; `recordatorio` ya no existe y `tercero` queda tercero, titulado «Tercer Intento»; el orden de las 12 tarjetas. Luego el orden de los botones, su estilo y quitar `recordatorio`.
14. **Producto en negrita y cuentas con íconos** (puntos 5 y 6). Pruebas: texto exacto de `pedido`, `guia`, `tercero` y `anticipo` con `*producto*` y el bloque de cuentas; `LG_ACCOUNTS` sin repetir números. Luego las plantillas.
15. **Textos ajustados de las plantillas nuevas** (punto 7). Pruebas: texto exacto de `reintento`, `flete`, `enruta`, `entregado` y `oficina` según la Parte 10. Luego los textos.
16. **Revisión de la ampliación.** Se corre todo, se repasan los criterios nuevos y se actualizan los textos esperados que queden.
17. **Contenedor y sub-pestaña** (Parte 11). Pruebas de humo primero: la sub-pestaña se llama «💬 Plantillas de mensajes»; las tarjetas viven dentro de `#lg-group-clientes` (título «Mensajes a Clientes») y este dentro de `#lg-msgs`; `#lg-cards` conserva su orden. Luego `index.html`, `LG_PARTS`, `app/logistics.js` (mostrar u ocultar `#lg-msgs`) y el estilo.
18. **Revisión visual.** En el navegador: 7 temas, pantalla angosta, orden de las 12 tarjetas, botón «Traer de Desarrollo» junto a la flecha, botones, copiar y pegar en WhatsApp Web (negritas, emojis, `®`, `@`, íconos de las cuentas).
19. **Documentación.** Después del merge, `CLAUDE.md` y `README.md`: plantillas nuevas, `®`, `when`, `keep`, constantes de la tienda, `lgPhone`, el nuevo orden, la eliminación de «Segundo Intento» y el contenedor «Mensajes a Clientes» dentro de «Plantillas de mensajes».

## Criterios de aceptación

**Marca**
- [x] Todo mensaje que nombra la tienda dice `🍃*VidanovaStore®*` (incluidos Pedidos, Guia y Anticipo); ninguno dice `VidanovaStore` sin ®. («Tercer Intento» y «Pedido Confirmado» no nombran la tienda en su texto original y no se tocaron.)
- [x] «Solicitud de Anticipo» cambia solo por el ®, el producto en negrita y el bloque de cuentas con íconos (los números de cuenta siguen iguales).

**Tarjetas**
- [x] La pestaña muestra 12 tarjetas, todas contraídas al abrir, en este orden: Confirmación de Pedidos, Reconfirmación de Pedido, Tercer Intento, Pedido Confirmado, Confirmación de Guia, Envío de Infografía, Solicitud de Anticipo, Reintento de Entrega, Flete Especial, Recordatorio En Ruta, Pedido Entregado y Reclamar en Oficina.
- [x] «Reconfirmación de Pedido» queda justo a la derecha de «Confirmación de Pedidos»; «Segundo Intento» ya no existe y «Tercer Intento» sigue a la reconfirmación.
- [x] Cada tarjeta nueva es independiente: lo escrito, los errores y el mensaje de una no cambian en otra.
- [x] Cada tarjeta nueva sigue la dinámica de la SPEC 13: nace contraída, «Generar mensaje» valida y arma, «Copiar mensaje» copia (o avisa si no hay), «Limpiar» vacía lo propio del pedido, y el mensaje solo cambia al volver a tocar «Generar mensaje».

**Textos**
- [x] «Reconfirmación de Pedido» con `Eugenia` genera exactamente el texto de la Parte 3.
- [x] «Reintento de Entrega» con `Rafael` y `Crema Despigmentante Coreana` genera exactamente el texto de la Parte 4, con el producto en negrita y `ubicarl@` / `atent@` con arroba.
- [x] «Flete Especial» con los datos de ejemplo genera exactamente el texto de la Parte 5 (con la coma tras el producto, `$50.000`, `$20.000` y las dos cuentas).
- [x] «Recordatorio En Ruta» con `Beatriz` y `Crema Arbutina` genera exactamente el texto de la Parte 6 (sin el título «MENSAJE RECORDATORIO…»).
- [x] «Pedido Entregado» con la casilla marcada genera exactamente el texto con manual de la Parte 7; desmarcada, el de sin manual.
- [x] «Reclamar en Oficina» con la casilla marcada genera el texto con manual de la Parte 8; desmarcada, el de sin manual.

**Campos**
- [x] Reintento, Flete Especial, Recordatorio En Ruta y Reclamar en Oficina traen el Producto de Desarrollo con «Traer de Desarrollo» y abrir la pestaña lo llena solo si está vacío.
- [x] «Pedido Entregado» y «Reclamar en Oficina» tienen la casilla «Incluye manual» marcada al abrir y el campo «Título del manual» visible; al desmarcarla el campo se oculta, no se exige y lo escrito se conserva al volver a marcarla.
- [x] Con «Incluye manual» marcada y el título vacío, «Generar mensaje» marca el campo con error y no arma el mensaje.
- [x] «Limpiar» en «Pedido Entregado» y «Reclamar en Oficina» deja la casilla y el título del manual como estaban.
- [x] El dinero (flete y anticipo) acepta `50000`, `50.000` y `$ 50.000`, y el campo muestra `$ 50.000` al salir; un valor 0 o con letras da «Flete mayor a 0» / «Anticipo mayor a 0».

**Contenedor (Parte 11)**
- [x] La sub-pestaña se llama «Plantillas de mensajes» (ya no «Mensajes a clientes») y abre al cargar; «Seguimiento de pedidos» sigue deshabilitada.
- [x] Las 12 tarjetas están dentro de un contenedor titulado «Mensajes a Clientes»; el contenedor va dentro del bloque que muestra la sub-pestaña, listo para sumar otro hermano («Mensajes a Proveedores») sin tocar este.
- [x] Cada tarjeta muestra, en una sola línea, un chip con su etapa (Confirmar, Cobro, Envío o Entrega), el nombre sin barrita de acento y la flecha; el contenedor «Mensajes a Clientes» usa el título unificado de los otros módulos.
- [x] Las tarjetas van tres por fila, repartidas en columnas iguales que llenan el contenedor (sin hueco a la derecha); en un contenedor más angosto pasan a dos y luego a una por fila.
- [x] El contenedor se ve bien en los 7 temas y en pantalla angosta, y las tarjetas conservan su orden y comportamiento.

**Infografía (Parte 12)**
- [x] «Envío de Infografía» va justo después de «Confirmación de Guia», con el campo Producto de Desarrollo y «Traer de Desarrollo», y genera exactamente el texto de la Parte 12 con el producto en negrita.

**Ajustes (Parte 10)**
- [x] En una tarjeta abierta, «Traer de Desarrollo» queda fijo justo debajo de la flecha de contraer, en el espacio libre junto al subtítulo (cambió de lugar tras verlo en el navegador).
- [x] El teléfono de Pedidos acepta `+57 311 7624068`, `311 7624068`, `+573117624068` y `3117624068`; rechaza cualquier otra forma con su aviso; al salir del campo y en el mensaje se ve `3117624068`.
- [x] En cada tarjeta, «Generar mensaje» va arriba, a todo el ancho y con estilo destacado; «Limpiar» y «Copiar mensaje» van debajo en una fila.
- [x] El producto sale entre asteriscos (negrita) en Pedidos, Guia, Tercer Intento, Anticipo, Reintento, Flete Especial, Recordatorio En Ruta y Reclamar en Oficina, sin asteriscos anidados.
- [x] «Solicitud de Anticipo» y «Flete Especial» muestran las dos cuentas con 📱 y 🏦, cada una con su nombre y número en líneas aparte.
- [x] Reintento dice «Te escribimos de la tienda»; Flete Especial no lleva 🌸 y tiene un párrafo por bloque; Recordatorio En Ruta tiene líneas en blanco entre sus tres párrafos; Pedido Entregado lleva 🤍 en «¡Gracias de corazón…!»; Reclamar en Oficina lleva el producto en negrita y «Por favor…» en línea nueva.

**Calidad**
- [x] El texto de las plantillas vive solo en `core/logistics.js`; la UI no escribe partes del mensaje.
- [x] Las cuentas y el enlace del catálogo salen de `LG_NEQUI`, `LG_BANK` y `LG_CATALOG`, sin repetirse en los textos.
- [x] Ids `#lg-` únicos en la página; ningún nombre `lg*`/`LG_*` choca al aplanar `js/index.js`.
- [x] Al recargar no queda nada guardado de esta pestaña.
- [x] Pasan `node tests/core.test.js`, `tests/smoke.test.js` y `node --check` de cada archivo tocado; consola limpia.
- [x] Pegado en WhatsApp Web, los `*` salen en negrita y los emojis y el `®` se ven (revisado en el navegador).
- [x] Se ve bien en los 7 temas y en pantalla angosta (revisado en el navegador).

## Decisiones

- **Sí:** una sola spec para todo el lote de mensajes (decisión del usuario), con un paso por plantilla. **No:** una spec por mensaje: mucho papeleo para cambios iguales.
- **Sí:** «Reconfirmación de Pedido» como tarjeta aparte; el nombre lo propuso el asistente. ~~Se queda «Segundo Intento»~~ **Reemplazada** (Parte 10, punto 4): el usuario pidió eliminar «Segundo Intento» y dejar solo «Tercer Intento».
- **Sí:** «Reconfirmación de Pedido» justo después de «Confirmación de Pedidos» y el flujo de confirmación junto: Pedidos, Reconfirmación, Tercer Intento (decisión del usuario; sin Segundo Intento tras la Parte 10).
- **Sí:** respetar el texto del usuario palabra por palabra, salvo ortografía y gramática acordadas, el `®`, el `*` simple de WhatsApp y el 🍃 donde faltaba.
- **Sí:** `®` dentro de los asteriscos (`🍃*VidanovaStore®*`) y en todas las plantillas, también las de la SPEC 13 (decisión del usuario). **No:** dejar el ® solo en las nuevas.
- **Sí:** `**…**` pasa a `*…*`. WhatsApp usa un asterisco para la negrita; con dos se ven los asteriscos.
- **Sí:** saludo neutro «Hola, <nombre>,» en «Recordatorio En Ruta» y «estar pendiente» en vez de «atento» (decisión del usuario). **No:** `Estimad@` ni `Estimado(a)`.
- **Sí:** `ubicarl@` y `atent@` se dejan con arroba en «Reintento de Entrega» (decisión del usuario).
- **Sí:** «Incluye manual» marcada por defecto, con Título del manual condicionado a la casilla, en «Pedido Entregado» y «Reclamar en Oficina» (decisión del usuario). Sin manual se quita todo el bloque del manual, incluido el consejo clave.
- **Sí:** el campo condicional se resuelve con una propiedad de campo (`when`), no con una plantilla duplicada con y sin manual.
- **Sí:** «Limpiar» conserva la casilla y el título del manual (`keep`): son del producto, no del pedido. Propuesta del asistente.
- **Sí:** enlace del catálogo fijo `https://vidanovastore.com/products` (decisión del usuario). **No:** campo con el enlace del producto ni armarlo con el identificador de URL de Desarrollo.
- **Sí:** «Pedido Entregado» y «Reclamar en Oficina» sin campo Producto/Nombre según lo redactó el usuario: la entregada pide nombre y manual (sin producto); la de oficina pide producto y manual (sin nombre).
- **Sí:** las cuentas de Nequi y Bancolombia como constantes del núcleo, compartidas por Flete Especial y Solicitud de Anticipo. **No:** campo editable.
- **Sí:** las plantillas nuevas van al final, en el orden en que se redactaron (Reintento, Flete, En Ruta, Entregado, Oficina); mover una es cambiar su posición en `LG_TEMPLATES`. Los nombres «Flete Especial», «Recordatorio En Ruta», «Pedido Entregado» y «Reclamar en Oficina» los propuso el asistente (el usuario aceptó «Pedido Entregado»; «Reclamar en Oficina» y «Recordatorio En Ruta» salen de sus títulos).
- **Sí:** los títulos que el usuario puso encima de sus borradores («MENSAJE RECORDATORIO…», «RECLAMAR EN OFICINA») son etiquetas suyas y no van en el mensaje.
- **Sí (Parte 10):** «Traer de Desarrollo» a la izquierda de la flecha para no pulsarlo sin querer al contraer la tarjeta (decisión del usuario).
- **Sí (Parte 10):** teléfono con formato fijo (`+57 311 7624068` o `311 7624068`) y salida sin espacios; rechazar el resto (decisión del usuario). Se aceptan también las dos formas sin espacios (`3117624068`, `+573117624068`) por ser el mismo número; el asistente exige que empiece por 3 (celulares de Colombia).
- **Sí (Parte 10):** «Generar mensaje» encima de «Limpiar» y «Copiar», con estilo destacado (decisión del usuario).
- **Sí (Parte 10):** la tarjeta que queda se llama «Tercer Intento» (decisión del usuario, elegida entre dos opciones); se elimina `recordatorio`.
- **Sí (Parte 10):** producto en negrita en todos los mensajes que lo traen, salvo donde ya va en una frase en negrita (`enruta`) para no anidar asteriscos (criterio del asistente).
- **Sí (Parte 10):** cuentas con 📱 y 🏦 en un bloque compartido; la línea de introducción del Anticipo («a cualquiera de nuestras dos cuentas») y el 🏦 los propuso el asistente. En el Flete se quitó el 🌸, como pidió el usuario, aunque su ejemplo pegado aún lo mostraba.
- **Sí (Parte 10):** corazón 🤍 en «¡Gracias de corazón…!», igual que en las demás plantillas (elegido por el asistente entre blanco y azul).
- **Sí (Parte 11):** sub-pestaña «Plantillas de mensajes» y contenedor «Mensajes a Clientes» para dejar lugar a «Mensajes a Proveedores» (decisión del usuario). Se amplía esta spec en vez de abrir una SPEC 16 (decisión del usuario, tras ofrecerle ambas). **No:** crear ahora «Mensajes a Proveedores».
- **No:** adjuntar imágenes (captura de transportadora, manual, gráfica): se envían aparte.
- **No:** guardar campos ni historial: son datos personales de clientes (igual que en la SPEC 13).

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El `®` o los emojis se dañan al copiar o pegar | Las pruebas comparan el texto exacto; revisión en WhatsApp Web en el paso 18 |
| Cambiar `LG_STORE` rompe los textos esperados de la SPEC 13 | El paso 1 actualiza esas pruebas antes de tocar las plantillas nuevas |
| `lgValues` con `when` deja pasar un campo que sí debía ser obligatorio | El paso 3 prueba las dos ramas (marcada y desmarcada) antes de usar `when` en una tarjeta real |
| Sin saltos de fila forzados el orden por ancho cambia según la pantalla | Se revisa en el paso 18 en varios anchos; si molesta, se vuelve a poner `newRow` donde convenga |
| El teléfono pegado con otra forma (guiones, puntos, paréntesis) se rechaza | Es lo pedido: el aviso dice las formas válidas; si hace falta aceptar más, se amplía `lgPhone` |
| El `*` dentro de un campo del usuario (por ejemplo, un título con asteriscos) rompe la negrita | El usuario escribe sin asteriscos; los textos los ponen las plantillas |

## Lo que **no** está en esta spec

- Más plantillas aparte de estas seis, y un editor de plantillas.
- Seguimiento de pedidos, clientes y entregas.
- Adjuntar imágenes o archivos al mensaje.
- WhatsApp directo (`wa.me`) o teléfono del cliente.
- Guardar campos, historial o plantillas elegidas.
- Editar las cuentas bancarias desde la app.

Cada una de esas, si llega, va en su propia spec.
