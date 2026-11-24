# SPEC 26 — Guardado rápido: editar un producto guardado

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 24
> **Fecha:** 2026-11-24
> **Objetivo:** Agregar un lápiz a cada producto del Guardado rápido (Buscar producto) que cargue sus campos en el formulario del panel para corregirlos y actualizarlos en su mismo lugar.

## Por qué existe esta spec

Hoy un producto del Guardado rápido solo se puede enviar a Mi candidato o eliminar. Si anoté mal el nombre, el ID Dropi, el precio o la imagen, la única salida es borrarlo y volver a escribirlo, y pierde su lugar en la lista. El usuario quiere editarlo.

## Alcance

**Dentro:**

- **Lápiz en cada fila** (`.qk-edit`, ícono `edit` de `PYL.ui.icons`, sin `.ic`, mismo tamaño y estilo que `.qk-send`). Orden de la fila: miniatura · datos · lápiz · enviar · papelera. `title` «Editar» y `aria-label` «Editar <nombre>».
- **Modo edición en el formulario de arriba** (no en la fila): el lápiz carga nombre, ID Dropi, precio proveedor (con el formato `$ 25.000`) e imagen del producto en los campos `#qk-name`, `#qk-dropi`, `#qk-price` y la vista previa `#qk-photo`, y deja el foco en Nombre.
  - El botón `#qk-save` dice «Actualizar» (en vez de «Guardar»).
  - Aparece un botón `#qk-cancel` «Cancelar» (`.btn ghost sm`) junto a `#qk-save`; fuera del modo edición está oculto (`hidden`).
  - La fila que se edita lleva `.is-editing` (borde en acento `--b`) y su lápiz `aria-pressed="true"`.
  - Enter en un campo actualiza, igual que hoy guarda.
- **Campos editables:** los cuatro. La imagen se cambia con Ctrl+V o eligiendo archivo, y se quita con `.qk-photo-rm`, igual que al crear.
- **Actualizar:** valida con las mismas reglas que al crear (nombre e ID obligatorios; ID repetido rechazado **sin contar el propio producto**). Si pasa, reemplaza los datos del producto conservando su `id`, `createdAt` y su posición en la lista; guarda en `pyl-quick`, sale del modo edición, vacía el formulario y avisa en `#toast` «Actualicé "<nombre>" en el guardado rápido.». Si falla, avisa el error y sigue en edición.
  - Precio vacío o inválido → el producto queda sin `price`. Sin imagen → queda sin `photo`.
- **Salir del modo edición sin guardar** (formulario vacío y botón vuelve a «Guardar»): «Cancelar», cerrar el panel (✕, Esc, el botón flotante o abrir otro flotante), eliminar ese producto con su papelera y «Limpiar».
- **Cambiar de producto:** tocar el lápiz de otro producto carga ese otro sin preguntar (lo escrito y no actualizado se pierde). Tocar el lápiz del mismo producto lo vuelve a cargar.
- Enviar a Mi candidato desde una fila manda los datos **guardados** (no lo escrito en el formulario), y como cierra el panel, cancela la edición.
- Editar no toca lo que ya se envió a Mi candidato.
- **Núcleo** (`js/modules/quick/core/quick.js`): `quickCheck(items, entry, exceptId?)` ignora el producto `exceptId` al buscar ID repetido; nueva `quickUpdate(items, id, entry)`.
- **Pruebas** en `tests/core.test.js` y `tests/smoke.test.js`; lista de claves aplanadas de `core.test.js` (suma `quickUpdate`); `CLAUDE.md` y `README.md`.

**Fuera de la spec:**

- Editar dentro de la fila (descartado, ver Decisiones).
- Reordenar los productos del Guardado rápido.
- Avisar o preguntar si hay cambios sin actualizar al cambiar de producto o cerrar.
- Propagar la edición a Mi candidato o a la bitácora.
- Cambios en el formato guardado `pyl-quick`.

## Modelo de datos

El producto guardado no cambia de forma (`{ id, name, dropi, createdAt, price?, photo? }`) y `pyl-quick` sigue siendo `{ items }`, sin versión nueva.

```js
// Núcleo (sin DOM)
quickCheck(items, entry, exceptId)   // exceptId opcional: ese producto no cuenta como ID repetido
quickUpdate(items, id, entry)        // lista nueva; el producto `id` toma name/dropi recortados,
                                     // price si > 0 (si no, sin price) y photo si hay (si no, sin photo);
                                     // conserva id, createdAt y posición. Id inexistente → misma lista.

// Estado (app.state.quick)
{
  open: false,
  items: [/* … */],
  photo: '',        // imagen del formulario (en edición, arranca con la del producto)
  editing: null,    // id del producto en edición o null (no se guarda)
}
```

`ui.quick.render(root, v)` recibe además `v.editing`. Nueva `ui.quick.fill(root, item)` que pone nombre, ID y precio formateado en los campos y enfoca Nombre. El callback `on.edit(id)` se suma a los de `build`, y `on.cancel()` para «Cancelar».

## Plan de implementación

1. **Núcleo** (`core/quick.js`): `quickCheck` con `exceptId` y `quickUpdate`. Pruebas en `core.test.js` (caso «Guardado rápido»): ID repetido permitido si es el mismo producto y rechazado si es otro; `quickUpdate` conserva id, `createdAt` y posición, quita `price`/`photo` vacíos, no muta la lista recibida y con id inexistente no cambia nada. Agregar `quickUpdate` a la lista de claves aplanadas. Correr `node tests/core.test.js`.
2. **UI** (`ui/quick.js`): lápiz `.qk-edit` en `row()` antes de `.qk-send`; botón `#qk-cancel` en el formulario; `render` cambia el texto de `#qk-save` («Guardar»/«Actualizar»), muestra u oculta `#qk-cancel`, marca la fila `.is-editing` y el `aria-pressed` del lápiz; `fill(root, item)`. Estilos en `css/modules/quick.css`: `.qk-edit` igual a `.qk-send`, `.qk-row.is-editing` con borde `--b`, y la columna del formulario para Cancelar + Guardar (también en el `@media` angosto). Solo tokens.
3. **App** (`app/quick.js`): `S.editing`; `edit(id)` carga el producto (`U.fill`, `S.photo = item.photo || ''`); `save()` actualiza con `quickCheck(…, S.editing)` + `quickUpdate` cuando hay edición; `cancelEdit()` (vacía formulario, `S.photo = ''`, `S.editing = null`) llamado desde Cancelar, `setOpen(false)`, `del` del producto en edición y `clear`.
4. **Pruebas smoke** (`tests/smoke.test.js`, con el guardado rápido): ver criterios. Correr `core.test.js` y `smoke.test.js` con consola limpia.
5. **Docs:** `CLAUDE.md` (Buscar producto → Guardado rápido: lápiz, modo edición, `quickUpdate`) y `README.md` si describe el guardado rápido.

## Criterios de aceptación

- [ ] Cada fila del Guardado rápido tiene `.qk-edit` justo antes de `.qk-send`, con `aria-label` «Editar <nombre>».
- [ ] Tocar el lápiz pone nombre, ID y precio («$ 25.000») del producto en `#qk-name`, `#qk-dropi`, `#qk-price`, muestra su imagen en `#qk-photo` y enfoca `#qk-name`.
- [ ] En edición `#qk-save` dice «Actualizar», `#qk-cancel` está visible y la fila lleva `.is-editing`; fuera de edición dice «Guardar» y `#qk-cancel` está oculto.
- [ ] Actualizar con otro nombre cambia el producto sin cambiar su `id`, su `createdAt` ni su posición, y la lista no crece.
- [ ] Actualizar sin cambiar el ID no da «Ese ID ya está guardado.»; poner el ID de otro producto sí lo da y sigue en edición.
- [ ] Vaciar el precio y quitar la imagen y actualizar deja el producto sin `price` ni `photo`.
- [ ] Tras actualizar, el formulario queda vacío, el botón dice «Guardar» y `pyl-quick` guarda el cambio (localStorage simulado).
- [ ] «Cancelar», cerrar el panel (✕ o Esc), eliminar el producto en edición y «Limpiar» salen del modo edición con el formulario vacío y sin cambiar el producto.
- [ ] Con un producto en edición, tocar el lápiz de otro carga el otro sin preguntar.
- [ ] Enviar a Mi candidato en edición manda los datos guardados, no lo escrito.
- [ ] `quickCheck` con `exceptId` y `quickUpdate` pasan sus pruebas en `core.test.js`.
- [ ] `node tests/core.test.js` y `smoke.test.js` pasan, consola limpia.
- [ ] En el navegador (revisa el usuario): el lápiz se ve alineado con enviar y papelera, la fila en edición se distingue, Cancelar y Actualizar caben en el formulario ancho y angosto; 7 temas sin choques.

## Decisiones

- **Editar en el formulario de arriba, no en la fila:** reusa validación, pegado con Ctrl+V, formato del precio y vista previa; la fila es angosta para cuatro campos e imagen. *(Elegido por el usuario.)*
- **Se editan los cuatro campos, imagen incluida.** *(Elegido por el usuario.)*
- **El producto se queda en su lugar:** se conservan `id`, `createdAt` y posición; no sube al inicio. *(Elegido por el usuario.)*
- **Cerrar el panel cancela la edición:** nada se guarda sin tocar «Actualizar» y al reabrir el formulario está en modo normal. *(Elegido por el usuario.)*
- **Lápiz antes de enviar**, como el lápiz de la bitácora. *(Elegido por el usuario.)*
- **Cambiar de producto sin preguntar:** es una libreta rápida; preguntar agrega fricción. *(Elegido por el usuario.)*
- **`quickCheck` recibe `exceptId` en vez de una función nueva de validación:** una sola regla de ID repetido para crear y editar.
- **Sin versión nueva de `pyl-quick`:** el producto no cambia de forma.

## Riesgos

- **Columnas del formulario:** `.qk-form` es una rejilla de 5 columnas con el botón al final; sumar Cancelar puede apretar Nombre en el panel. Mitigación: Cancelar y Actualizar en una misma celda (o fila aparte en angosto) y revisar en el navegador.
- **Lista de claves de `core.test.js`:** al sumar `quickUpdate` la prueba de claves aplanadas falla hasta actualizar el texto esperado.

## Lo que **no** entra en esta spec

- Editar dentro de la fila.
- Reordenar el Guardado rápido.
- Preguntar por cambios sin actualizar.
- Llevar la edición a Mi candidato o a la bitácora.
