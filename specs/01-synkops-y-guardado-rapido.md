# SPEC 01 — Nombre Synkops y guardado rápido de productos

> **Estado:** Implementado
> **Depende de:** SPEC 00
> **Fecha:** 2026-11-07
> **Objetivo:** Mostrar la marca Synkops con su slogan y agregar en Buscar producto un botón flotante para guardar rápido productos (nombre, ID e imagen) como lista de pendientes que puedo enviar a Mi candidato.

## Por qué existe esta spec

Junta dos cambios pequeños que el usuario pidió a la vez. El renombre solo toca dos líneas de `index.html`, así que no merece spec propia.

El guardado rápido es una libreta de pendientes. Sirve para anotar productos al vuelo mientras busco. Cuando elijo uno, lo envío a Mi candidato con un botón. No calcula nada; su única conexión es ese envío.

## Alcance

**Dentro:**

- `<title>` de `index.html` pasa a "Synkops · Mi operación en sincronía".
- La barra superior (`index.html:26`) muestra **Synkops** y debajo el slogan "Mi operación en sincronía", en lugar de "NovaSociety · Entrenador" y "Métricas de paid media".
- Botón flotante fijo abajo a la derecha, visible solo en la pestaña Buscar producto (`#v-buscar`).
- El botón muestra un numerito con la cantidad de productos guardados; sin productos, el numerito no aparece.
- Al hacer clic se abre un panel pequeño encima del botón, sin oscurecer la página. Se cierra con ✕, con Esc o con otro clic en el botón.
- Formulario del panel con cuatro campos: Nombre, ID Dropi, Precio proveedor e Imagen. Van en una sola fila, uno al lado del otro, con etiquetas pequeñas y el botón Guardar al final, para ahorrar altura y ver más productos de la lista. En pantalla angosta se parten en dos filas.
- Solo la lista se desplaza dentro del panel; el formulario y la barra "Guardados" quedan fijos.
- Nombre e ID son obligatorios; el precio y la imagen son opcionales.
- El precio se escribe como `25000` o `25.000` y el campo lo muestra al instante con signo pesos (`$ 25.000`). Se guarda como número entero de pesos; los centavos se descartan y las letras se ignoran.
- La lista muestra el precio junto al ID. Es solo un dato guardado: no se usa para ningún cálculo.
- La imagen entra pegándola con Ctrl+V en el campo Imagen; elegir un archivo queda como respaldo.
- La imagen se guarda con la misma calidad que la foto de Mi candidato (`services.files.imageDataURL` con sus valores por defecto: JPEG de lado mayor 400 px).
- En el formulario y en la lista la imagen se ve en miniatura; el tamaño pequeño es solo visual.
- Un ID ya guardado no se guarda otra vez: aparece el aviso "Ese ID ya está guardado".
- Lista de productos guardados dentro del panel, el más nuevo primero, con miniatura, nombre e ID.
- Cada fila tiene botón de copiar junto al nombre y junto al ID, el mismo `copyBtn` de Mi candidato.
- Cada fila tiene un ícono de enviar a la derecha del producto (con el texto "Enviar a Mi candidato" al pasar el cursor y como etiqueta de accesibilidad). Carga nombre, ID Dropi, precio (en Precio proveedor) e imagen en el formulario de Mi candidato como producto nuevo (sin "Editando"), cierra el panel y lleva la vista a `#b-cand`.
- Si Mi candidato tiene algo que se perdería, pregunta antes con el mismo criterio de "🧹 Limpiar formulario" (`core.search.unsaved`). Si cancelo, nada cambia.
- El producto enviado se queda en la lista rápida.
- Lo enviado a Mi candidato es una copia: "Limpiar" solo vacía la lista rápida y no toca Mi candidato ni la bitácora.
- Botón "🧹 Limpiar" que borra todos los productos guardados. Antes pregunta con `ui.feedback.ask`. Queda deshabilitado si la lista está vacía.
- Persistencia en su propia clave de `localStorage`, `pyl-quick`, para que limpiar libere de verdad el espacio de las fotos.
- Actualización de `CLAUDE.md` y `README.md` después del merge.

**Fuera (para specs futuras):**

- Las etiquetas "Criterio NovaSociety" y demás menciones al método: se quedan, porque citan el método de Juan Herrera y no la marca.
- Renombrar claves `pyl-*` y `ns_*`, el namespace `PYL` o `wb.creator`: requiere migrar datos guardados.
- Cualquier uso de la lista fuera del panel, salvo el envío a Mi candidato.
- Guardar en la bitácora al enviar: el producto llega al formulario y yo decido si lo guardo.
- Borrar un solo producto (papelera por fila).
- Editar un producto ya guardado.
- Cualquier cálculo, score o semáforo sobre estos productos.
- Exportar o respaldar la lista.
- Logo o ícono nuevo de la marca.

## Modelo de datos

```js
// localStorage 'pyl-quick' (services.storage.quick). Solo se guarda la lista.
quick = {
  items: [ /* el más nuevo primero */
    { id: '1730999999999' /* Date.now() */, name: 'Masajeador cervical', dropi: '1863859', price: 25000 /* pesos, opcional */, photo: 'data:image/jpeg;base64,...' /* opcional */, createdAt: 1730999999999 },
  ],
};

// En memoria: app.state.quick = { open: false, items: [...] }. "open" no se persiste.
```

Convenciones:

- `name` y `dropi` se guardan sin espacios al inicio ni al final.
- El duplicado se compara por `dropi` ya recortado.
- IDs del DOM con prefijo `#qk-` (`#qk-btn`, `#qk-count`, `#qk-panel`, `#qk-name`, `#qk-dropi`, `#qk-price`, `#qk-photo`, `#qk-save`, `#qk-list`, `#qk-clear`). Clases con prefijo `.qk-`.
- El envío a Mi candidato usa el evento `rapido:candidato` sobre `document`, con `detail = { name, dropi, price?, photo? }`. Sigue el patrón de `costeo:precio`.

## Plan de implementación

1. **Renombre.** Cambiar `<title>` y la marca de la barra superior en `index.html`. Prueba: abrir `index.html` y ver "Synkops" y el slogan.
2. **Núcleo.** Crear `js/core/quick.js` (`PYL.core.quick`) con `quickCheck(items, entry)`, que devuelve `{ ok: true }` o `{ ok: false, msg }` (falta nombre, falta ID, ID repetido), y `quickAdd(items, entry, now)`, que devuelve la lista nueva con el producto al inicio. Agregarlo a `js/core/index.js` y a `index.html` después de `core/ads.js`. Prueba en Node con `core.quickCheck` y `core.quickAdd`.
3. **Persistencia.** Agregar `quick` con clave `pyl-quick` a `js/services/storage.js`. `save` devuelve `false` si no cupo, igual que `search`.
4. **Pintado.** Publicar `copyBtn` en `PYL.ui.candidate`. Crear `js/ui/quick.js` (`PYL.ui.quick`) con `build(root, on)` y `render(root, v)`: botón, numerito, panel, formulario y lista. No modifica estado; recibe callbacks `on = { toggle, close, save, photo, photoClear, clear, copy, send }`. Cargarlo en `index.html` después de `ui/candidate.js`. Agregar el marcado del botón y del panel dentro de `#v-buscar`.
5. **Estilos.** Agregar en `css/base.css` las clases `.qk-*`: botón fijo abajo a la derecha, numerito, panel, lista con miniaturas. Solo tokens (`var(--b)`, `--on-b`...), sin colores a mano, para que funcione con los 7 temas.
6. **Estado y casos de uso.** Crear `js/app/quick.js`: carga `pyl-quick`, guarda (con `quickCheck` y `quickAdd`), recibe la foto por archivo o por el evento `paste` del panel, confirma y vacía con "Limpiar", y cierra con Esc. Avisa con `ui.feedback.toast` al guardar, al rechazar y si no cupo en el almacenamiento. Cargarlo en `index.html` después de `app/search.js`.
7. **Envío a Mi candidato.** En `js/ui/quick.js`, botón "Enviar a Mi candidato" por fila. En `js/app/quick.js`, `send(id)` dispara `rapido:candidato` y cierra el panel. En `js/app/search.js`, escuchar ese evento: si `core.search.unsaved` dice que se perdería algo, preguntar con `ui.feedback.ask`; luego `loadDraft({ name, dropi, photo }, null)` y llevar la vista a `#b-cand`. Prueba en jsdom: enviar un producto llena `#b-f-name` y el ID Dropi.
8. **Documentación.** Después del merge, actualizar `CLAUDE.md` y `README.md` con el nombre, el slogan y el guardado rápido.

## Criterios de aceptación

- [x] La pestaña del navegador dice "Synkops · Mi operación en sincronía".
- [x] La barra superior muestra "Synkops" y debajo "Mi operación en sincronía".
- [x] Las etiquetas "Criterio NovaSociety" siguen iguales.
- [x] El botón flotante aparece en Buscar producto y no aparece en ninguna otra pestaña.
- [x] Clic en el botón abre el panel; ✕, Esc o otro clic en el botón lo cierran.
- [x] Guardar sin nombre o sin ID no guarda y muestra el motivo.
- [x] Guardar con un ID ya guardado no guarda y muestra "Ese ID ya está guardado".
- [x] Guardar con nombre e ID y sin imagen ni precio agrega el producto arriba de la lista.
- [x] Escribir `25000` o `25.000` en Precio proveedor lo muestra como `$ 25.000`; se guarda 25000 y la lista lo muestra con signo pesos.
- [x] Al enviar a Mi candidato, el precio llega a Precio proveedor; un producto sin precio no arrastra el de otro.
- [x] Pegar una imagen con Ctrl+V en el campo Imagen la muestra en miniatura; elegir un archivo hace lo mismo.
- [x] La imagen guardada es JPEG de lado mayor 400 px, igual que la foto de Mi candidato.
- [x] "Enviar a Mi candidato" llena nombre, ID Dropi y foto de Mi candidato como producto nuevo y lleva la vista a `#b-cand`.
- [x] La foto enviada se ve en Mi candidato con la misma calidad que una subida ahí.
- [x] Con cambios sin guardar en Mi candidato, enviar pregunta antes; al cancelar, Mi candidato no cambia.
- [x] Después de enviar, el producto sigue en la lista rápida.
- [x] Enviar no guarda nada en la bitácora.
- [x] Después de enviar un producto, "Limpiar" vacía la lista rápida y Mi candidato conserva nombre, ID y foto.
- [x] El botón de copiar junto al nombre y junto al ID copia ese valor al portapapeles.
- [x] El numerito muestra la cantidad exacta de productos y no aparece con 0.
- [x] "Limpiar" pregunta antes; al aceptar, la lista queda vacía y la clave `pyl-quick` queda sin productos; al cancelar, nada cambia.
- [x] "Limpiar" está deshabilitado con la lista vacía.
- [x] Al recargar la página, los productos guardados siguen ahí (revisado en el navegador).
- [x] Mi candidato, la bitácora y el Costeo no cambian al guardar o limpiar productos rápidos; solo el envío toca Mi candidato.
- [x] `node -e "require('./js/core/index.js')"` carga sin errores y `quickCheck`/`quickAdd` responden como en el paso 2.
- [x] La app abre en jsdom sin errores nuevos en consola.

## Decisiones

- **Sí:** cambiar solo lo visible. Renombrar claves internas perdería los datos guardados sin una migración.
- **Sí:** mantener "Criterio NovaSociety". Cita el método de Juan Herrera, no el nombre de la app.
- **Sí:** slogan "Mi operación en sincronía", elegido por el usuario. Se escribe con tilde y en minúscula después de la primera palabra, como el subtítulo anterior.
- **Sí:** clave propia `pyl-quick`. Si viviera en `pyl-search`, limpiar no liberaría el espacio de la bitácora y un fallo de cupo afectaría a ambas.
- **No:** guardar dentro de `pyl-search`. Mezcla una libreta sin cálculos con el estado del evaluador.
- **Sí:** nombre e ID obligatorios; precio e imagen opcionales. El precio no se exige para poder anotar rápido.
- **Sí:** precio proveedor en el formulario, formateado en vivo con signo pesos. Pedido por el usuario; viaja a Precio proveedor de Mi candidato.
- **Sí:** guardar el precio como número (`quickPrice` en `core/quick.js`) y formatearlo con `core.format.fmt`, como el resto de la app.
- **No:** centavos ni otras monedas. Dropi trabaja en pesos enteros.
- **Sí:** pegar con Ctrl+V como vía principal y archivo como respaldo. Pegar una captura es lo más rápido al buscar.
- **No:** URL de la imagen. Se rompe si cambia la imagen o no hay internet.
- **Sí:** guardar la imagen con la calidad de Mi candidato (400 px) y achicarla solo en pantalla. Así llega a Mi candidato igual que una foto subida ahí.
- **No:** guardar la imagen en su resolución original. Mi candidato la reduce a 400 px de todos modos, y una original llenaría el cupo de `localStorage` con pocas fotos.
- **Sí:** rechazar ID repetido con aviso. Elegido por el usuario.
- **Sí:** confirmar antes de limpiar. Borrar todo no se puede deshacer.
- **Sí:** "Enviar a Mi candidato" por fila. Pedido por el usuario.
- **Sí:** el producto enviado se queda en la lista. Elegido por el usuario.
- **Sí:** preguntar antes de reemplazar Mi candidato si se perdería algo. Reutiliza el criterio de "Limpiar formulario". Recomendación tomada porque el usuario no eligió otra cosa.
- **Sí:** evento `rapido:candidato` en vez de llamar a `app/search.js` directo. Mantiene los módulos sueltos, como `costeo:precio`.
- **No:** papelera por fila. El usuario no la pidió.
- **Sí:** panel pequeño abajo a la derecha, sin fondo oscuro. Deja ver la página mientras anoto.
- **Sí:** reutilizar `copyBtn` de `ui/candidate.js`. Mismo botón de copiar que en el resto de la pestaña.
- **Sí:** validación en `core/quick.js`. Así se prueba en Node, como pide la arquitectura.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Las fotos llenan el cupo compartido de `localStorage` | Compresión a 400 px, aviso con toast si no cupo y "Limpiar" para liberar espacio |
| El botón fijo tapa contenido al final de Buscar producto | Margen inferior en `#v-buscar` del alto del botón |
| Nombres aplanados repetidos en `core/index.js` | Funciones con prefijo `quick` (`quickCheck`, `quickAdd`) |
| El `paste` captura texto pegado en los campos | Solo se toma el pegado si trae una imagen; el texto sigue su curso normal |

## Lo que **no** está en esta spec

- Renombrar claves, namespace o `wb.creator`.
- Quitar las menciones a NovaSociety como método.
- Guardar en la bitácora al enviar a Mi candidato.
- Borrar o editar un solo producto.
- Cálculos sobre los productos guardados.
- Exportar o respaldar la lista.

Cada una de esas, si llega, va en su propia spec.
