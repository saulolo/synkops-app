# SPEC 00 — Estado actual del proyecto

> **Estado:** Implementado
> **Depende de:** ninguna
> **Fecha:** 2026-11-07
> **Objetivo:** Documentar lo que existe hoy en el repositorio para usarlo como línea base de las specs siguientes.

## Por qué existe esta spec

El proyecto empezó sin Spec Driven Design. Esta spec es retroactiva: describe el código, no propone cambios.

Convenciones de este documento:

- **Hecho:** todo lo que no lleva marca salió de leer el código o de ejecutarlo.
- **Supuesto:** inferencia que el código no confirma por sí solo.
- **Verificado:** se ejecutó el 2026-11-07 con Node 24 y datos de prueba inventados. jsdom 26 carga la app y ExcelJS 4.4.0 prueba el Excel.
- **Sin verificar:** nada se probó en un navegador real ni con reportes reales de Dropi o Meta.

## Alcance

**Dentro:**

- Estado del código en el commit `fa4c5c3`; ninguna línea de código cambió con esta spec.
- Actualización de `CLAUDE.md` y `README.md` para reflejar lo descrito aquí.
- Módulos, datos, integraciones, reglas de negocio, decisiones y deuda técnica.

**Fuera:**

- Cualquier cambio de código.
- Propuestas, roadmap o próximos pasos: el usuario los define en cada spec.
- La corrección de la deuda y de los riesgos listados aquí.
- El cambio de nombre a Synkops en la interfaz y el código.

## 1. Resumen

Es una aplicación web local de una sola página para operar una tienda de dropshipping con pago contra entrega (COD) en Colombia.

Acompaña un producto de principio a fin con el método de NovaSociety (Juan Herrera):

1. Buscarlo y evaluarlo.
2. Costearlo.
3. Montar su landing en Shopify y su campaña en Meta Ads.
4. Leer el testeo y escalar.
5. Medir la utilidad real cruzando reportes de Dropi y Meta.

**Para quién:** la persona dueña de la tienda Vidanova, que confirmó que la app es de uso personal y que por ahora la usa solo en su PC y en el navegador.

**Objetivo declarado:** convertirse en Synkops, la aplicación que centraliza y automatiza todo su ecommerce. Hoy no existe ninguna automatización ni conexión directa con esas plataformas: los datos entran subiendo archivos o escribiéndolos a mano.

## 2. Stack y versiones

| Elemento | Hoy |
|---|---|
| Lenguajes | HTML, CSS y JavaScript sin transpilar |
| Frameworks | Ninguno |
| Librería de ejecución | ExcelJS 4.4.0 por CDN de cdnjs, sin atributo `integrity` (`index.html:10`) |
| Tipografías | Inter y Source Serif 4, de Google Fonts (`index.html:7-9`) |
| APIs del navegador | `localStorage`, IndexedDB, File System Access, Clipboard, Canvas, `window.print` |
| Gestor de paquetes y build | No hay: no existe `package.json` |
| Pruebas | No hay runner ni archivos de prueba en el repo |
| Lint y formato | No hay configuración |
| CI/CD | No hay: no existe `.github/` |
| Versión | README dice 1.1.0; no hay tags ni otra fuente |
| Repositorio | `github.com/saulolo/synkops-app` (antes `dropshipping-cod-pnl`), rama `main`, 26 commits |

Node solo se usa para probar el núcleo. `js/core/index.js` carga los módulos en orden y exporta sus funciones aplanadas.

## 3. Arquitectura

### Carpetas

```text
index.html       Única página: 9 secciones .view y la carga ordenada de scripts
css/             base.css (diseño y temas), components.css (P&L), report.css (PDF)
js/core/         Lógica y contenido, sin DOM
js/services/     Adaptadores: storage, files, consolidado
js/ui/           Pintado; recibe datos y callbacks
js/app/          Estado y casos de uso; main.js arranca el tablero
docs/referencia/ Prototipo original del entrenador; no se carga
docs/img/, img/  Capturas del README y logo del autor
```

### Patrones

- Cada archivo es un IIFE que publica en el global `PYL` (`PYL.core`, `.services`, `.ui`, `.app`).
- El orden de `<script>` en `index.html` es el orden de capas: `core → services → ui → app`.
- `js/app/theme.js` es la excepción: se carga en `<head>` para aplicar el tema antes de pintar.
- Los textos dinámicos son datos, no HTML: `string`, `{ b }` o `{ a, href }`, pintados con `ui.dom.rich`.
- Hay dos flujos de pintado:
  - El Tablero P&L tiene un solo punto de entrada, `app/main.js#render()`.
  - `app/search.js`, `app/landing.js`, `app/ads.js` y `app/trainer.js` se inician solos al cargar y se repintan por su cuenta.
- La comunicación entre módulos usa los eventos `landing:prod` y `costeo:precio`, eventos `input` sobre campos del Costeo y lecturas de `app.state`.

### Cumplimiento de las capas

| Regla | Resultado |
|---|---|
| `core` sin `document` ni `window` | Cumple (búsqueda en `js/core/`) |
| `ui` sin referencias a `PYL.app` | Cumple (búsqueda en `js/ui/`) |
| Sin `<style>` ni `onclick` en `index.html` | Cumple |
| IDs únicos en `index.html` | Cumple |
| Persistencia solo en `services` | No cumple: `app/trainer.js` y `app/theme.js` usan `localStorage` directo |
| Reglas separadas del pintado | No cumple en el Entrenador: `trainer.js` mezcla reglas, estado y pintado |

### Convenciones de nombres

- Archivos en kebab-case; módulos en camelCase dentro de `PYL` (`ui.productsTable`).
- Constantes de contenido en mayúsculas (`LIMITS`, `FLOW`, `ABO_STEPS`).
- IDs con prefijo por módulo: `#b-` Buscar, `#d-` Desarrollo, `#ma-` Meta Ads, `#c-` Costeo.
- Claves de almacenamiento: `pyl-*` en la arquitectura por capas y `ns_*` en el Entrenador.
- Identificadores de código en inglés o español según el caso; textos de interfaz en español de Colombia.

## 4. Módulos existentes

Criterio de estado:

- **Completo:** hace todo lo que promete su interfaz y pasó la verificación descrita.
- **Parcial:** una parte visible está sin construir.
- **Roto:** falla al usarse. No se encontró ningún módulo roto, con el límite indicado arriba.

| Módulo | Qué hace | Archivos principales | Estado | Evidencia |
|---|---|---|---|---|
| Navegación | Pestañas; recuerda la última abierta | `app/trainer.js` | Completo | Las 9 pestañas abren en jsdom sin errores |
| Inicio | Resume el método y la cadena CPM → CPC → CPPI → CPA | `app/trainer.js`, `index.html` | Completo | Abre sin errores; contenido no auditado |
| Costeo | Precio por margen, CPA máximo, zonas y reparto por pedido | `app/trainer.js`, `core/search.js` | Completo | Proveedor 30.000 da precio $99.900 y tope $21.617 |
| Hard Metrics | Rangos Meta y TikTok con semáforo | `app/trainer.js` | Completo | Revisión de código |
| Simulador de testeo | Cortes 20K, 30K y 40K, con historial | `app/trainer.js` | Completo | 20.000 con 1 pago iniciado da "APAGAR INMEDIATO" |
| Escalera | 15 escalones y decisión con ventana de 3 días | `app/trainer.js` | Completo | Revisión de código |
| Creativos | Pipeline, meta semanal y diagnóstico | `app/trainer.js` | Completo | Revisión de código |
| Buscar producto | Flujograma, estrategias VDO y por proveedor, candidato, score, bitácora | `core/search.js`, `ui/search.js`, `ui/candidate.js`, `app/search.js` | Completo | Candidato → Costeo → precio de vuelta → bitácora funciona en jsdom |
| Desarrollo: Shopify | Guía de 8 pasos, prompts, precios y ofertas de Releasit | `core/landing.js`, `ui/landing.js`, `app/landing.js` | Completo | "Traer de mi candidato" y ofertas 0/20/30% correctas |
| Desarrollo: Meta Ads | Guía por estrategia | `core/ads.js`, `ui/ads.js`, `app/ads.js` | Parcial | ABO completa (7 pasos); CBO sin pasos |
| Desarrollo: TikTok Ads | Botón deshabilitado "pronto" | `index.html:329` | Parcial | No hay contenido |
| Tablero P&L: cálculo | Carga de reportes, filtros, KPI, cascada, embudo, simulador, productos y campañas | `core/pnl.js`, `core/insights.js`, `core/diagnostics.js`, `core/dropi.js`, `core/meta.js`, `app/main.js` | Completo | Cifras correctas con CSV de prueba de Dropi |
| Tablero P&L: Excel | Plantilla de 20 columnas, fila, duplicados y exportación | `core/excel.js`, `services/consolidado.js`, `app/save.js` | Completo | Escritura y relectura correctas con ExcelJS. Escribir en disco quedó sin verificar |
| Tablero P&L: informe PDF | Documento de 9 secciones para imprimir | `ui/report.js`, `app/report.js`, `css/report.css` | Completo | Se arma y llama a `print()` en jsdom. El PDF final quedó sin verificar |
| Temas | 7 temas con menú | `app/theme.js`, `css/base.css` | Completo | Revisión de código; aspecto sin verificar |

## 5. Modelo de datos

No hay base de datos. Todo vive en memoria y en el navegador.

### Datos en memoria (no persisten)

```js
// Tablero P&L: app.state en js/app/state.js. Los reportes se cargan de nuevo en cada sesión.
state = { dropi, meta, metaInfo, metrics, map, prod, iva, funnelMode, current };

// Línea de Dropi, una por producto de la orden (core/dropi.js)
line = { id, status, cls /* can|ent|dev|pen|rut */, date, prod, total, flete, devRaw, dev, prov, giftOf? };

// Cargo de facturación de Meta (core/meta.js)
charge = { date, amt, method };

// Fila de campaña de Meta (core/meta.js)
camp = { name, start, end, status, spend, purchases, impr, checkouts, ctr };

// Filtro y último cálculo (app/filters.js, app/main.js)
f = { prod, from, to, adsOverride, iva, today };
current = { a, x, f, weeks, prev, products };
```

`a` es el resultado de `core.pnl.aggregate`; sus fórmulas están en la sección 7.

### Datos persistentes

| Dónde | Clave | Contenido |
|---|---|---|
| `localStorage` | `pyl-search` | `active, done, draft, editingId, log[], view, filter, q, sort, strat, provStep` |
| `localStorage` | `pyl-landing` | `active, done, prod, sub, unit, gift, warranty` |
| `localStorage` | `pyl-ads` | `part, strat, plans{abo,cbo}, slug, slugFor` |
| `localStorage` | `pyl-cod-campaign-map` | Campaña → producto; `''` significa sin asignar a propósito |
| `localStorage` | `pyl-theme` | Tema elegido |
| `localStorage` | `ns_prod` | Producto activo: `name, tope, escala, apaga, generic?` |
| `localStorage` | `ns_view`, `ns_hist`, `ns_lv2` | Pestaña, últimas 10 evaluaciones y escalón |
| `localStorage` | `ns_cards`, `ns_week` | Pipeline de creativos y conteo semanal |
| IndexedDB `pyl-cod`, almacén `kv` | `master` | Acceso al Excel consolidado vinculado |
| Archivo del usuario | `Utilidad_Consolidado_Global.xlsx` | Hoja `Registro` (20 columnas, fila por periodo) y hoja `Fórmulas` |

### Candidato (`draft` y cada elemento de `log`)

```js
candidate = {
  id, updatedAt, photo /* JPEG base64, lado mayor 400 px */, name, dropi, notes,
  price, sellPrice, flete, cpa, devRate, cancelRate,
  status /* evaluando|testeo|activo|descartado|ganador */, msp, val, market,
  sales7, sales30, salesTotal, prov, advertisers, adDays, stock, ia,
  suppliers /* [{ name, created }] */, validated /* [país] */, traits /* { rasgo: true } */,
};
```

### Relaciones

- Línea de Dropi → producto: por el **texto** de la columna `PRODUCTO`.
- Campaña → producto: por `map`, sugerido por coincidencia de palabras y corregible a mano.
- Cargo de Meta → producto: calculado por fechas de ciclo y gasto de campañas; no se guarda.
- Candidato → landing y costeo: **copia** de valores, sin referencia.
- Landing → Meta Ads: lectura en vivo de `state.landing.prod`.
- Bitácora → P&L: **no hay relación**. No existe un identificador de producto común a todos los módulos.

## 6. Integraciones y APIs

La app no tiene backend ni endpoints propios. No hay `fetch` ni `XMLHttpRequest` en `js/`. No hay mocks.

| Servicio | Tipo de integración | Detalle |
|---|---|---|
| Dropi | Archivo manual | `.xlsx` o `.csv`; columnas exactas en `DROPI_COLS` (`core/dropi.js:18`) |
| Meta: facturación | Archivo manual | `.csv`; detección por encabezados en español o inglés (`core/meta.js:8`) |
| Meta: campañas | Archivo manual | `.csv`, con o sin desglose por día (`core/meta.js:52`) |
| Excel consolidado | File System Access | Escritura directa en Chrome y Edge; en otros navegadores, descarga de copia |
| cdnjs | Carga de script | ExcelJS; sin él no se leen `.xlsx` ni se guarda en Excel, y un aviso lo indica |
| Google Fonts | Hoja de estilos | Tipografías |
| FastMoss | Enlace | Constante `FASTMOSS` en `core/search.js:106` |
| Tienda | Texto | `URL_BASE` en `core/ads.js:163`, para copiar la URL del producto |
| Shopify, Releasit, Dropify, TrustWill | Solo guía | Pasos manuales en `core/landing.js` |
| DropKiller, Kalodata, TuWinner, otros | Solo guía | Texto en `core/search.js` |
| Claude | Solo guía | Prompts para copiar y las skills `/mi-pagina-vidanova` y `/anuncio-estatico` |
| MCP de NovaSociety | Solo referencia | Sus reglas inspiran los cálculos; la app no se conecta a él |

## 7. Reglas de negocio implementadas

### P&L contra entrega

| Regla | Dónde |
|---|---|
| Estado de Dropi → fase: devolución, cancelado, entregado, pendiente; lo demás es "en ruta" | `core/dropi.js:10` |
| "Entregado a transportadora" no es entregado | `core/dropi.js:13` |
| El costo de devolución se toma una vez por orden y se reparte según el flete | `core/dropi.js:55` |
| Los obsequios se suman al producto principal de su orden | `core/dropi.js:64` |
| `wallet = fact − merc − fletes`; `util = wallet − ads` | `core/pnl.js:106` |
| `margen`, `efect`, `roas`, `roasEq`, `cpa` y `cpaMax` | `core/pnl.js:115` |
| Solo entregados y devueltos generan montos | `core/pnl.js:55` |
| Con IVA es el cargo de tarjeta; sin IVA es cargo ÷ 1,19 | `core/pnl.js:80` |
| Sin facturación: gasto de campañas × 1,19 | `core/pnl.js:86` |
| Cargo → producto activo en esa fecha; si coinciden varios, por gasto de campañas | `core/pnl.js:30` |
| Cargo fuera de todo ciclo → último producto terminado | `core/pnl.js:33` |
| Prepago: cuenta el gasto y no las recargas | `core/meta.js:39` |
| Se omiten cobros fallidos o reembolsados | `core/meta.js:34` |
| Campaña → producto por palabras en común | `core/meta.js:100` |
| Periodo anterior de igual duración, con inversión automática | `core/insights.js:18` |
| Proyección: pedidos en ruta × efectividad × `cpaMax` | `core/insights.js:49` |
| Plan de acción ordenado por utilidad estimada | `core/insights.js:104` |

### Cortes y diagnósticos

| Regla | Dónde |
|---|---|
| Margen: ±2% equilibrio, 10% piso amarillo, 15% sano, 20% ideal | `core/diagnostics.js:10` |
| Veredicto: Sin cobros, Equilibrio, En pérdida, Ganador o Zona límite | `core/diagnostics.js:161` |
| Cancelación: referencia 15–20%; sano 15–25%; alerta sobre 30% | `core/diagnostics.js:25` |
| Efectividad mínima 70%; devolución máxima 25%; global 60% | `core/diagnostics.js:32` |
| Mercancía ≥ 70% retenido, fletes ≤ 25%, Wallet ≥ 45%, Ads ≤ 60% de Wallet | `core/diagnostics.js:75` |
| Holgura de ROAS y CPA: 15% | `core/diagnostics.js:176` |

### Búsqueda y costeo

| Regla | Dónde |
|---|---|
| Umbrales VDO y por proveedor en `LIMITS` | `core/search.js:9` |
| Ciclo de vida por ventas totales: hasta 99, 2.000, 6.000, 15.000 y más | `core/search.js:26` |
| Producto ganador: 6 rasgos, 2 obligatorios | `core/search.js:148` |
| Semáforo VDO: un rojo descarta; faltan datos sin total o proveedores | `core/search.js:358` |
| Score /8: MSP 3, valor 2, competencia 2, validado 1 | `core/search.js:333` |
| Costos por defecto: flete 20.000, CPA 15.000, 25% devolución, 25% cancelación, margen 13% | `core/search.js:270` |
| Flete y CPA costeados por porcentaje de entrega | `core/search.js:278` |
| Precio por margen, redondeado a terminación 4.900 o 9.900 | `core/search.js:303` |

### Testeo y escala (solo en `app/trainer.js`)

| Regla | Dónde |
|---|---|
| Zonas: escala = 80% del tope; apaga = 133% del tope | `app/trainer.js:190` |
| Producto genérico: 12.000, 15.000 y 20.000 | `app/trainer.js:38` |
| CPM máximo: Meta 20.000, TikTok 6.000 | `app/trainer.js:41` |
| CPPI: bueno bajo 4.000, límite 6.000 | `app/trainer.js:339` |
| Cortes de testeo en 20.000, 30.000 y 40.000 | `app/trainer.js:448` |
| 15 escalones, de 100.000 a 1.280.000 | `app/trainer.js:42` |
| Regla dura: dos días en zona de apagar | `app/trainer.js:555` |
| Excepción de un día: cero ventas, cero pagos y el doble de la zona de apagar | `app/trainer.js:553` |
| Día flojo: 50% o más caro baja un escalón | `app/trainer.js:557` |
| Meta semanal de creativos: de 4 a 5 | `app/trainer.js:655` |

### Landing y Meta Ads

| Regla | Dónde |
|---|---|
| Subtítulo de menos de 7 palabras; título de hasta 70 caracteres | `core/landing.js:11` |
| Ofertas 1, 2 y 3 unidades con 0, 20 y 30% | `core/landing.js:14` |
| Precio tachado: el doble, conservando la terminación | `core/landing.js:174` |
| ABO: 4 conjuntos, 30.000 diarios por conjunto, inicio 5:00 a. m. | `core/ads.js:12` |
| Nombre de campaña: fecha de mañana y primer nombre del producto | `core/ads.js:156` |
| Lista de ciudades excluidas | `core/ads.js:24` |

## 8. Decisiones técnicas

| Decisión | Por qué | Base |
|---|---|---|
| Sin build ni módulos ES | Los ES modules se bloquean en `file://` y la app se abre con doble clic | `CLAUDE.md`, README |
| Datos solo en el navegador | Privacidad y cero infraestructura | README (sección Privacidad) |
| Capas `core → services → ui → app` | Probar el núcleo sin navegador y reutilizarlo | Comentarios y `core/index.js` |
| Diagnósticos como datos | El tablero y el PDF comparten una sola lógica | `core/diagnostics.js:1` |
| `ExcelJS` como parámetro en `core/excel.js` | Que el núcleo no dependa de un global del navegador | `core/excel.js:2` |
| Handle del Excel en IndexedDB | `localStorage` no puede guardarlo | `services/storage.js:2` |
| Fotos a JPEG de 400 px | Que quepan en `localStorage` | `services/files.js:46` |
| Inversión por ciclo de producto, sin prorrateo | La facturación es el gasto real; el commit `d1b6380` quitó el prorrateo | Comentarios en `core/pnl.js`. Supuesto: la razón exacta del cambio |
| Prepago sin recargas | Sumarlas duplicaría la inversión | `core/meta.js:16` |
| Números de la estrategia por proveedor distintos del VDO | Son métodos diferentes, a propósito | README, `CLAUDE.md` |
| MSP en 3 niveles con equivalencia 1–5 | Simplifica el formulario y conserva compatibilidad con NovaSociety y con datos viejos | `core/search.js:261` |
| Entrenador copiado del prototipo | Integrarlo rápido y separarlo en una fase 2 | `CLAUDE.md`. Supuesto: la motivación de velocidad |
| Sin autenticación | Uso personal en un solo equipo | Confirmado por el usuario el 2026-11-07 (el motivo sigue siendo supuesto) |

## 9. Deuda técnica, bugs y riesgos

El código no tiene comentarios `TODO` ni `FIXME`. El repositorio tampoco registra bugs conocidos. Los puntos siguientes salen de esta revisión.

### Bugs o comportamientos dudosos reproducidos

| # | Hallazgo | Evidencia |
|---|---|---|
| B1 | Veredicto "🚀 Ganador" sin ningún dato de publicidad: la inversión cuenta como $0. Solo un aviso lo matiza | CSV de prueba sin Meta; `core/diagnostics.js:161` |
| B2 | Un estado de Dropi desconocido cuenta en silencio como "en ruta" e infla la proyección | `INDEMNIZADA` da `rut`; `core/dropi.js:15`. Supuesto: que ese estado exista en Dropi |
| B3 | Una orden con líneas de estados distintos cuenta por su última línea, pero suma montos por línea: entregados 1 con cobros de 2 | Prueba con datos inventados; `core/pnl.js:51`. Supuesto: que Dropi pueda exportarlo |
| B4 | Efectividad entre 60% y 70%: el KPI la marca `warn` y el embudo `bad` | `core/diagnostics.js:35` y `:190` |
| B5 | El precio con el margen por defecto (13%) sale "Bajo la meta de 15%" | `core/search.js:270` y `:317`; margen calculado 13,2% |

### Reglas duplicadas o incoherentes

- La regla "cortes únicos en `MARGIN`" no se cumple: hay literales en `core/insights.js:83,129,153` y `ui/report.js:51`.
- El Excel usa otros cortes: margen verde desde 20% y amarillo desde 0 (`core/excel.js:137`).
- El Excel marca la cancelación sobre 20%, frente a 25% en el tablero (`core/excel.js:143`).
- Las reglas de testeo y escala solo existen dentro de `app/trainer.js`, junto con el pintado, y no se pueden probar en Node.

### Deuda de arquitectura

- `app/trainer.js` (697 líneas) mezcla reglas, estado, HTML por `innerHTML` y navegación.
- No existe un identificador de producto común: buscar, costear, montar y medir son islas conectadas por copias.
- La navegación general vive dentro de `trainer.js`, así que separarlo afecta a toda la app.
- La plataforma es solo COP y solo Meta: otras divisas se avisan sin convertir, y el gasto de TikTok no entra al P&L.

### Riesgos de datos

| Riesgo | Impacto |
|---|---|
| No hay exportación ni respaldo de bitácora, guías ni Entrenador | Borrar datos del navegador lo pierde todo |
| El cupo de `localStorage` es compartido y la bitácora guarda fotos | Al llenarse, los cambios quedan solo en la sesión; hay aviso en Buscar producto |
| El `store` del Entrenador ignora los errores al guardar (`trainer.js:16`) | Puede no guardar sin avisar |
| Sin versión de esquema; migraciones sueltas en `app/ads.js:14`, `app/search.js:16` y `core/search.js:264` | Cambios de formato frágiles |
| Renombrar claves `pyl-*` o `ns_*` al pasar a Synkops | Perdería los datos guardados si no se migran |
| Los reportes no persisten | Hay que subirlos de nuevo en cada sesión |

### Otros riesgos

- ExcelJS se carga por CDN sin `integrity`, y sin internet no se leen `.xlsx`.
- `S.name` entra sin escapar en `innerHTML` (`trainer.js:46,541`). El impacto es bajo: solo llega texto propio, pero puede romper la vista.
- No hay pruebas en el repo: las de jsdom viven en carpetas temporales y se pierden.
- `#f-reset` limpia la inversión manual, pero no campaña, compras ni CTR (`app/filters.js:108`). Supuesto: que no sea intencional.
- El reparto entre productos activos usa el gasto total de campañas, no el del rango (`core/pnl.js:84`).
- El pipeline de creativos arranca con tarjetas de ejemplo de otro producto (`trainer.js:602`).

### Documentación desactualizada

- El encabezado de `trainer.js` dice "sin cambios de lógica", pero el Costeo ya usa `core.search` (`trainer.js:182,222,293`). Es un comentario de código y sigue sin cambiar.
- Hay varios nombres en uso: Synkops en la documentación, `<title>` "NovaSociety · Entrenador de Métricas", y `wb.creator = 'P&L COD'`. El repo ya se llama `synkops-app`.
- `README.md` y `CLAUDE.md` se actualizaron con esta spec: nombre, partes de la app, los 4 pasos de inicio, el mapa informativo de Meta Ads y el flujo SDD.

## 10. Criterios de aceptación

- [x] Existe `specs/00-estado-actual.md` con todas las secciones pedidas.
- [x] No se modificó código; solo cambió la documentación: esta spec, `specs/.spec-config.yml`, `CLAUDE.md` y `README.md`.
- [x] Cada regla de la sección 7 indica su archivo.
- [x] Las inferencias están marcadas como supuesto.
- [x] El usuario cambió el estado a `Aprobado`.

## Lo que **no** está en esta spec

- Corrección de bugs o deuda.
- Propuestas, roadmap o próximos pasos.
- Cambio de nombre a Synkops.
- Conexiones con Dropi, Shopify o Meta.
