// Desarrollo de producto (módulo 5 de NovaSociety): montar la landing en Shopify paso a paso.
// La skill "Mi Página Vida Nova" (Claude) escribe el HTML de la descripción; aquí va solo lo que hago a mano:
// imágenes, Shopify, Dropify, inventario, Releasit y reseñas. Contenido de los pasos, prompts y cálculos. Sin DOM.
// Los textos son segmentos: string = texto plano, { b } = negrita.
// En los prompts: {producto} = nombre, {precio} = precio de venta; [ASÍ] = lo completo yo.
(() => {
  const core = globalThis.PYL.core;

  // Única fuente de los números de la landing (LANDING, para no chocar con LIMITS de search en index.js).
  const LANDING = {
    subWords: 7,      // subtítulo del título: menos de 7 palabras
    title: 70,        // título del producto (nombre: subtítulo)
    // Ofertas de cantidad de Releasit: descuento en porcentaje (pct) y la 2 preseleccionada; pre = inicio del título.
    offers: [{ qty: 1, pct: 0 }, { qty: 2, pct: 20, pre: 'Oferta:', preselect: true }, { qty: 3, pct: 30, pre: 'MEGA Oferta:' }],
    warranty: 30,     // días de garantía que pongo por defecto en las etiquetas de Releasit
    imports: 10,      // TrustWill: número de importaciones
    ownReviews: 6,    // TrustWill: reseñas de 5 estrellas que edito con las de mis clientes
    aliSales: 1000, // TrustWill: producto de AliExpress con más de 1.000 ventas
  };


  const STEPS = [
    { k: 'prep', t: 'Antes de empezar', where: 'Buscar producto y Costeo',
      p: ['Monto la página solo con un producto que ya pasó la búsqueda y tiene precio de venta del costeo.'],
      items: [
        { k: 'valid', t: ['El producto pasó ', { b: 'Buscar producto' }, ' (score y semáforo VDO).'] },
        { k: 'cost', t: ['Ya lo costeé: tengo el ', { b: 'precio de venta' }, '.'] },
        { k: 'data', t: ['Tengo el ', { b: 'enlace de Dropi' }, ', el ', { b: 'ID de Dropi' }, ', las ', { b: 'fotos reales' }, ' del producto y sus ', { b: 'especificaciones del proveedor' }, '.'] },
      ],
      tool: ['prep'] },

    { k: 'skill', t: 'Generar la página', where: 'Claude + Shopify → Productos → Agregar producto',
      p: ['Todo en el mismo chat de Claude, en este orden: primero le doy la información del proveedor, después saco el título y al final lanzo la skill, que escribe toda la descripción en HTML.'],
      prompts: [
        { k: 'feed', t: '1. Alimentar la IA con el producto', text: 'Te voy a pasar la información de un producto que voy a vender en mi tienda vidanovastore.com (Colombia, pago contra entrega): {producto}.\nEspecificaciones del proveedor: [pega la descripción, ingredientes o materiales, contenido y modo de uso]\nTe adjunto las fotos reales del producto.\nLéelo todo y respóndeme en 3 líneas: qué es, para quién es y cuál es su beneficio principal. Todavía no escribas nada más.' },
        { k: 'title', t: '2. Título del producto (5 opciones)', text: 'Con esa información, dame 5 opciones de subtítulo para el título de {producto}, de menos de 7 palabras, que resalten el beneficio principal y capten la atención de inmediato. Escríbelas como lo diría el cliente, con palabras simples, y sin prometer curar ni tratar enfermedades. Muéstralas así: "{producto}: subtítulo". Al final dime cuál recomiendas y por qué.' },
        { k: 'msg', t: '3. Mensaje para la skill', text: '/mi-pagina-vidanova\nProducto: {producto} — usa la información del proveedor y las fotos que te pasé arriba en este chat\nPrecio de 1 unidad: {precio}\nRegalo: [qué es y cómo llega, o "sin regalo"]\nFin del flash sale: [fecha, o lo dejo vacío y usa el domingo siguiente]\nReseñas reales: [pégalas tal cual, o "no tengo"]' },
      ],
      ordered: true,
      tool: ['title'],
      items: [
        { k: 'feed', t: ['Le pasé a la IA el ', { b: 'producto' }, ' (nombre y fotos reales) y sus ', { b: 'especificaciones del proveedor' }, ' (prompt 1).'] },
        { k: 'add', t: ['Abrí ', { b: 'Shopify → Productos → Agregar producto' }, '.'] },
        { k: 'title', t: ['Elegí una de las 5 opciones (prompt 2) y puse el título: ', { b: 'Producto: subtítulo' }, '.'] },
        { k: 'run', t: ['Lancé la skill en el mismo chat (prompt 3).'] },
        { k: 'html', t: ['Recibí el ', { b: 'archivo HTML' }, ' (un solo archivo).'] },
        { k: 'paste', t: ['Copié todo el HTML, lo pegué en el cuadro ', { b: 'Descripción' }, ' en el modo ', { b: 'Mostrar editor (</>)' }, ' y ', { b: 'guardé' }, '.'] },
      ],
      warn: ['La página ', { b: 'no lleva precios ni botones de compra' }, ': el pedido se hace en el formulario de Releasit.'],
      tip: ['Si quiero cambiar algo, le reenvío el código y le digo exactamente qué cambiar y "no cambies nada más".'] },

    { k: 'galeria', t: 'Imágenes de la página', where: 'IA de imágenes · foto real del producto adjunta',
      p: ['Genero las fotos de la página con la IA. En cada prompt ', { b: 'adjunto la foto real del producto' }, ' para que el empaque salga igual, y cambio lo que está entre [corchetes].'],
      prompts: [
        { k: 'mujer', t: '⭐ Imagen 1 · principal: mujer con el producto', text: 'Fotografía publicitaria ultrarrealista, formato cuadrado 1:1. Una mujer latina de unos 30 años, hermosa y natural, con piel real (poros visibles, sin retoque plástico) y una sonrisa genuina de felicidad, sostiene con una mano {producto} a la altura de su rostro, con la etiqueta de frente y legible. El producto es exactamente el de la foto de referencia que adjunto: misma forma, tamaño, colores, textos y marca; no inventes letras. Fondo de estudio azul claro pastel liso, con profundidad de campo suave. Luz suave de ventana lateral con sombras naturales. Cámara full frame, lente de 85 mm, f/2.8, enfoque nítido en el rostro y el producto. Estilo de fotografía de belleza de alta gama. Manos naturales con cinco dedos. Sin texto, sin logos de otras marcas, sin aspecto de render ni de imagen generada por IA.' },
        { k: 'antes', t: 'Imagen 2 · antes (el problema)', text: 'Fotografía ultrarrealista, formato cuadrado 1:1, plano medio frontal y centrado, cámara a la altura del pecho. [Persona: edad, género, piel, peinado y ropa, ej. mujer latina de 30 años, cabello oscuro recogido en moño, suéter beige de punto] sentada en [lugar, ej. un escritorio de madera en un estudio en casa, repisas con libros y plantas al fondo, ventana a la derecha]. Muestra [el problema que resuelve {producto}, ej. agotada y distraída, con la mano en la frente frente al portátil], con expresión [ej. cansada y frustrada] y objetos que lo cuentan [ej. papeles regados, el celular encendido, una taza de café vacía]. Deja libre el lado derecho de la mesa. Luz fría y apagada de día nublado. Cámara full frame, lente de 35 mm, f/4, piel y texturas reales. Sin el producto, sin texto, sin logos, sin aspecto de IA.', tip: ['Las imágenes 2 y 3 son el ', { b: 'deslizador antes/después' }, '. Solo aplican si el beneficio se ve en el día a día.'] },
        { k: 'despues', t: 'Imagen 3 · después (la solución)', text: 'Edita la primera imagen de referencia. Mantén EXACTAMENTE el mismo encuadre, ángulo de cámara, recorte, posición de la persona, ropa, peinado, cuarto, muebles y objetos de fondo. No muevas ni cambies el tamaño de nada. Solo cambia: la expresión a [ej. tranquila y enfocada, con una leve sonrisa, trabajando en el portátil], ordena la escena [ej. quita los papeles regados y el celular], cambia la luz a cálida y luminosa de mañana, y coloca {producto} sobre la mesa en el lado derecho, de frente, a su tamaño real y exactamente como en la segunda imagen de referencia (la foto real del producto). Fotografía ultrarrealista, sin texto, sin logos, sin aspecto de IA.', tip: ['Adjunto ', { b: '2 referencias' }, ' en este orden: la imagen 2 y la foto real del producto.'] },
        { k: 'anuncio', t: 'Imagen 4 · anuncio estático (skill /anuncio-estatico)', text: '/anuncio-estatico\nTe adjunto 2 imágenes, en este orden:\n1. La referencia: un anuncio que ya está corriendo en la biblioteca de anuncios de Meta.\n2. La foto real de mi producto: {producto}.\nEspecificaciones del proveedor: [pega lo que dice la etiqueta: qué es, para qué sirve, contenido]\nQuiero la misma pieza que la referencia (mismo formato, distribución, íconos y ángulo de copy) con mi producto dentro, con la paleta de mi producto y todo el texto en español de Colombia. En los beneficios, solo lo que afirma la etiqueta, sin prometer curar ni tratar enfermedades.', tip: ['Va en ', { b: '«De esto a esto»' }, '. La skill no hace la imagen: me devuelve un ', { b: 'prompt en inglés' }, '. En el generador subo la referencia, la foto del producto (mejor PNG sin fondo) y pego ese prompt. Si sale mal, le mando el resultado a la skill.'] },
        { k: 'recibes', t: 'Imagen 5 · qué recibes', text: 'Fotografía de producto ultrarrealista, formato cuadrado 1:1, vista cenital (flat-lay, cámara a 90° sobre la mesa). Sobre una superficie clara [ej. lino blanco o mármol blanco mate], ordenado y con espacio entre cada pieza, todo lo que trae el paquete de {producto}: [lista exacta de lo que llega, ej. 1 frasco de 30 ml, su gotero y su caja]. El producto es exactamente el de la foto de referencia que adjunto: misma forma, tamaño, colores, textos y marca; no inventes letras ni piezas que no vengan en el paquete. El producto principal al centro y la caja mostrando su frente. Luz natural suave de ventana desde arriba a la izquierda, sombras suaves y reales, texturas reales de cada material. Cámara full frame, lente de 50 mm, f/8, todo enfocado. Estilo catálogo premium de e-commerce. Sin texto, sin manos, sin elementos decorativos (ni plantas, ni flores, ni ingredientes sueltos), sin logos de otras marcas ni sellos del proveedor, sin aspecto de render ni de imagen generada por IA.', tip: ['En la lista pongo ', { b: 'exactamente las piezas' }, ' de "Qué recibes" de la skill. Si no trae caja, la quito.'] },
        { k: 'uso', t: 'Imagen 6 · modo de uso (uso real)', text: 'Anuncio de modo de uso ultrarrealista, formato cuadrado 1:1 (1080x1080 px). Fondo: fotografía real de [escena de uso, ej. una cocina luminosa en la mañana] con una mesa de madera, el fondo desenfocado y luz cálida de ventana. A la derecha, foto ultrarrealista de [la acción de uso, ej. una mano sosteniendo el gotero que suelta gotas sobre un vaso de vidrio con agua] y {producto} de pie a su lado, de frente y con la etiqueta legible. El producto es exactamente el de la foto de referencia que adjunto: misma forma, tamaño, colores, textos y marca; no inventes ni cambies el texto de la etiqueta. A la izquierda, una columna de texto alineada a la izquierda, en tipografía sans-serif gruesa del color oscuro del empaque [ej. verde oscuro #1F5F26]: titular enorme "[DOSIS, ej. SOLO 15 GOTAS]", con el número mucho más grande que las palabras; debajo, un recuadro redondeado con "[ASÍ DE FÁCIL]" en blanco sobre el color de la marca y "[ES INCLUIRLO EN TU DÍA]" sobre blanco. Todo el texto en español perfecto y con tildes correctas: [palabras con tilde, ej. ASÍ, FÁCIL, DÍA]. Solo la dosis y el modo de uso que dice la etiqueta, sin promesas de salud. Sin texto extra, sin logos de otras marcas, sin marcas de agua, sin aspecto de imagen generada por IA.', tip: ['Va en ', { b: '«Modo de uso»' }, '. La ', { b: 'dosis sale de la etiqueta' }, '. Si no es en gotas, cambio la acción: aplicar la crema, tomar la cápsula, usar el aparato.'] },
        { k: 'ficha', t: 'Imagen 7 · ficha técnica', text: 'Infografía de ficha técnica, formato cuadrado 1:1 (1080x1080 px), estilo ilustración vectorial plana y limpia, líneas finas y uniformes. Fondo plano blanco hueso, sin texturas. Color principal: el color oscuro del empaque [ej. verde oscuro #1F5F26] para bordes, etiquetas, checks e íconos; textos en gris carbón. Arriba, centrado: el nombre "{producto}" en sans-serif muy gruesa y, debajo, en cursiva entre dos líneas finas, "[qué es en pocas palabras, ej. Suplemento en gotas para tu rutina]". Debajo, dos recuadros de borde redondeado con su etiqueta en una pestaña oscura: a la izquierda "Especificaciones", una lista con check por fila y la palabra clave en negrita: [filas del proveedor, ej. "Contenido: 30 ml", "Envase: vidrio ámbar", "Tapa: gotero medidor", "Frecuencia: una vez al día"]; a la derecha "[Ingredientes o Componentes]", con el producto dibujado de pie, igual a la foto de referencia que adjunto, y a su lado un ícono por cada uno con su nombre debajo: [lista exacta del proveedor]. Debajo, un recuadro ancho "Modo de uso" con los pasos numerados en círculos oscuros, cada uno con una ilustración simple y una frase corta, separados por líneas verticales finas: [pasos de la etiqueta]. Al final, una fila de [4] íconos blancos en círculos del color principal con su texto corto al lado: [atributos reales, ej. "Dosis medida", "Fácil de llevar", "Frasco sellado"]. Solo los datos del proveedor que escribí; no repitas filas ni ingredientes y no agregues ninguno. Todo el texto en español perfecto con tildes correctas: [palabras con tilde, ej. Concentración, día, ámbar]. Sin promesas de salud, sin logos de otras marcas, sin marcas de agua.', tip: ['Copio especificaciones, ingredientes y pasos ', { b: 'tal cual del proveedor' }, '. Si la IA repite una fila, se lo pido corregido.'] },
        { k: 'bloque1', t: 'Imagen 8 · bloque 1 del cuerpo', text: 'Fotografía ultrarrealista estilo lifestyle, formato horizontal 4:3. Escena del bloque "[título del bloque 1 que escribió la skill]": [la escena, ej. un hombre latino de 35 años, camiseta gris, trabajando concentrado en su portátil y tomando notas en el escritorio de madera de su casa]. {producto} sobre la mesa cerca de la persona, de pie, de frente y con la etiqueta legible, como parte natural de la escena [ej. junto a un vaso de agua]. El producto es exactamente el de la foto de referencia que adjunto: misma forma, tamaño real, colores, textos y marca; no inventes letras. Plano medio, ángulo ligeramente lateral, luz natural de día por la ventana, ambiente colombiano cotidiano con detalles reales (libros, plantas, algo de desorden natural). Cámara full frame, lente de 35 mm, f/2.8, fondo un poco desenfocado. Piel, manos y texturas reales. Sin texto, sin logos de otras marcas, sin aspecto de render ni de imagen generada por IA.', tip: ['Imágenes 8, 9 y 10: la escena sale del ', { b: 'título y el párrafo de cada bloque' }, ' de "Lo que vas a sentir". Una persona o un momento distinto en cada una.'] },
        { k: 'bloque2', t: 'Imagen 9 · bloque 2 del cuerpo', text: 'Fotografía ultrarrealista estilo lifestyle, formato horizontal 4:3. Escena del bloque "[título del bloque 2 que escribió la skill]": [la escena, con otra persona y otro momento del día, ej. una estudiante de 22 años con suéter de lana y el cabello recogido, subrayando apuntes de noche en su escritorio]. {producto} en la escena, de frente y con la etiqueta legible [ej. asomado en la cartuchera abierta sobre la mesa]. El producto es exactamente el de la foto de referencia que adjunto: misma forma, tamaño real, colores, textos y marca; no inventes letras. Plano medio, luz cálida de una lámpara de escritorio y ambiente de noche, cuarto colombiano real (afiches, libros, taza). Cámara full frame, lente de 35 mm, f/2.8, fondo un poco desenfocado. Piel, manos y texturas reales. Sin texto, sin logos de otras marcas, sin aspecto de render ni de imagen generada por IA.' },
        { k: 'bloque3', t: 'Imagen 10 · bloque 3 del cuerpo', text: 'Fotografía ultrarrealista de detalle, formato horizontal 4:3. Escena del bloque "[título del bloque 3 que escribió la skill]": primer plano de las manos de una persona [la acción, ej. una mano sostiene una taza de café y la otra usa el gotero sobre un vaso de agua], sin que se vea la cara. {producto} al centro sobre la mesa, de pie, de frente y con la etiqueta legible. El producto es exactamente el de la foto de referencia que adjunto: misma forma, tamaño real, colores, textos y marca; no inventes letras. Luz natural suave de mañana, mesa de madera y plantas al fondo desenfocadas. Cámara full frame, lente de 50 mm, f/2.2, profundidad de campo corta. Piel, manos y texturas reales. Sin texto, sin logos de otras marcas, sin aspecto de render ni de imagen generada por IA.' },
        { k: 'gif2foto', t: 'Imagen 11 · GIF del segundo beneficio (1. foto inicial)', text: 'Fotografía ultrarrealista, formato cuadrado 1:1. Escena del beneficio de la sección GIF de la página: "[título de la sección que escribió la skill, ej. Cabe donde no cabe un termo]". [El momento inicial de la acción, ej. una mano a punto de guardar {producto} en el bolsillo frontal de un morral gris sobre una mesa de madera, con un termo al lado para comparar el tamaño]. {producto} visible, de frente y con la etiqueta legible. El producto es exactamente el de la foto de referencia que adjunto: misma forma, tamaño real, colores, textos y marca; no inventes letras. Luz natural de ventana, plantas desenfocadas al fondo. Cámara full frame, lente de 35 mm, f/2.8. Deja libre la esquina superior izquierda (ahí la página pone el sello). Piel, manos y texturas reales. Sin texto, sin logos de otras marcas, sin aspecto de render ni de imagen generada por IA.', tip: ['Primero genero esta ', { b: 'foto inicial' }, '. El beneficio sale de la sección GIF de la skill (llevarlo a todas partes, lo fácil que se limpia…).'] },
        { k: 'gif2video', t: 'Imagen 11 · GIF del segundo beneficio (2. animarla en video)', text: 'Anima esta imagen en un video de 4 segundos, formato cuadrado 1:1, con la cámara fija: sin movimiento de cámara ni zoom. [La acción completa, ej. la mano guarda el frasco en el bolsillo del morral, cierra la cremallera y se retira]. Movimientos lentos, naturales y realistas. El producto conserva su forma y su etiqueta en todo momento; la persona, los objetos y el fondo no cambian. Que el último cuadro quede casi igual al primero para que el bucle no se note. Sin texto, sin cortes, sin efectos ni transiciones.', tip: ['Subo la foto a una ', { b: 'IA de video' }, ' con este prompt y paso el video por un convertidor a GIF: cuadrado y de menos de 3 MB.'] },
        { k: 'testimonio', t: 'Imagen 12 · testimonial «Lo que dicen» (skill /anuncio-estatico)', text: '/anuncio-estatico\nTe adjunto 2 imágenes, en este orden:\n1. La referencia: un anuncio tipo testimonial (el producto en una mano al centro, un titular arriba y tarjetas de reseña con 5 estrellas alrededor).\n2. La foto real de mi producto: {producto}.\nAnaliza las dos. Entiende muy bien el concepto de mi marca y extrae los colores exactos de mi envase para la paleta; no uses los colores de la referencia.\nDiséñame el prompt en inglés para replicar esta estructura visual con mi producto, en el mismo formato de la referencia.\nTitular: en español de Colombia, directo y agresivo al dolor principal de mi cliente ideal (el público al que le habla {producto}).\nTestimonios: usa SOLO estas reseñas reales de mis clientes, palabra por palabra. Puedes recortar a un fragmento literal, pero no cambies, mejores ni agregues palabras. Pon primero las que hablan del dolor más fuerte:\n- "[reseña real 1]" — [Nombre, ciudad]\n- "[reseña real 2]" — [Nombre, ciudad]\n- "[reseña real 3]" — [Nombre, ciudad]\n- "[reseña real 4]" — [Nombre, ciudad]\n- "[reseña real 5]" — [Nombre, ciudad]\nEn cada tarjeta, en lugar de una foto de cara, un círculo del color de mi marca con la inicial del nombre. Sin promesas de curar ni tratar enfermedades.', tip: ['Necesita la ', { b: 'foto del producto' }, ', no solo el nombre. Las reseñas me las mandan mis clientes y van ', { b: 'tal cual' }, '.'] },
        { k: 'regalo', t: 'Imagen 13 · miniatura del regalo (si hay)', text: 'Portada vertical en formato 3:4 de [el regalo, ej. una guía digital en PDF] titulada "[título exacto del regalo]", vista de frente como la portada de un libro. Diseño limpio y moderno: fondo del color fuerte del empaque de {producto} [ej. verde #2E7D32], el título grande en tipografía sans-serif gruesa blanca y una ilustración simple [de qué trata el regalo]. Se va a ver en miniatura: pocos elementos, título legible y mucho contraste. Si el regalo es un objeto físico, en cambio: foto ultrarrealista del objeto de frente sobre fondo claro, luz suave de estudio. Texto en español con tildes correctas; ningún texto aparte del título; sin logos de otras marcas.', tip: ['Solo si el producto ', { b: 'trae regalo' }, '. Va en la tarjeta de regalo de arriba de la página. Si es digital, la página dice que llega por WhatsApp al confirmar (eso lo escribe la skill).'] },
      ],
      items: [
        { k: 'mujer', t: [{ b: 'Imagen 1' }, ': mujer sosteniendo el producto (la principal de la galería).'] },
        { k: 'antes', t: [{ b: 'Imagen 2' }, ': el antes, sin el producto (si aplica).'] },
        { k: 'despues', t: [{ b: 'Imagen 3' }, ': el después, editando la imagen 2 con el mismo encuadre (si aplica).'] },
        { k: 'anuncio', t: [{ b: 'Imagen 4' }, ': anuncio estático con la skill (referencia + foto del producto → prompt → generador de imágenes).'] },
        { k: 'recibes', t: [{ b: 'Imagen 5' }, ': qué recibes, todo lo del paquete visto desde arriba.'] },
        { k: 'uso', t: [{ b: 'Imagen 6' }, ': modo de uso con la dosis de la etiqueta (si aplica).'] },
        { k: 'ficha', t: [{ b: 'Imagen 7' }, ': ficha técnica con las especificaciones, ingredientes y modo de uso del proveedor.'] },
        { k: 'bloque1', t: [{ b: 'Imagen 8' }, ': escena del bloque 1 del cuerpo de la página.'] },
        { k: 'bloque2', t: [{ b: 'Imagen 9' }, ': escena del bloque 2, con otra persona u otro momento del día.'] },
        { k: 'bloque3', t: [{ b: 'Imagen 10' }, ': escena del bloque 3, detalle de manos usando el producto.'] },
        { k: 'gif2', t: [{ b: 'Imagen 11' }, ': GIF del segundo beneficio (foto inicial → video de 3–5 s → convertido a GIF).'] },
        { k: 'testimonio', t: [{ b: 'Imagen 12' }, ': testimonial con reseñas reales, palabra por palabra (skill → prompt → generador).'] },
        { k: 'regalo', t: [{ b: 'Imagen 13' }, ': miniatura del regalo (solo si el producto trae regalo).'] },
      ],
      tip: ['En todas adjunto la ', { b: 'foto real del producto' }, '. Si la etiqueta sale con letras inventadas, pego encima la foto real sin fondo en Canva.'] },

    { k: 'crear', t: 'Completar el producto', where: 'Shopify → Contenido → Archivos y Productos → mi producto',
      p: ['Subo las imágenes a Shopify, pongo cada URL en su imagen del código HTML y vuelvo al producto del paso 2 a ponerle los precios y la URL corta.'],
      ordered: true,
      items: [
        { k: 'up', t: ['Subí todas las fotos y GIF a ', { b: 'Contenido → Archivos' }, '.'] },
        { k: 'urls', t: ['En ', { b: 'Contenido → Archivos' }, ' copio la URL de cada imagen o GIF subido y la pego en el código HTML, en la imagen que le corresponde.'] },
        { k: 'price', t: [{ b: 'Precio' }, ': mi precio de venta.'] },
        { k: 'comp', t: [{ b: 'Precio de comparación' }, ': el doble, redondeado hacia arriba (sale tachado). ', { b: 'Ojo: desmarco "Cobrar impuestos sobre este producto".' }] },
        { k: 'slug', t: ['En ', { b: 'Identificador de URL' }, ' recorto la URL del producto a ', { b: 'una sola palabra' }, ' concisa (ej. products/magnesium).'] },
      ],
      tool: ['prices'],
      tip: ['Si una foto o GIF viene del CDN de otra tienda, la descargo y la subo a mi Shopify: si no, se puede caer.'] },

    { k: 'dropify', t: 'Vincular con Dropi', where: 'Apps → Dropify → Productos y Productos → mi producto → Inventario',
      p: ['Conecto el producto de Shopify con el de Dropi para que mis órdenes se vinculen con Dropi. Ya vinculado, entro al producto y arreglo el inventario.'],
      warn: [{ b: 'Sin este paso, los pedidos no llegan a Dropi.' }, ' Se hace con cada producto que lance.'],
      ordered: true,
      items: [
        { k: 'id', t: ['Busco el producto por su ', { b: 'ID de Dropi' }, '.'] },
        { k: 'link', t: ['Elijo ', { b: '"Vincular a un producto que ya exista en tu tienda"' }, ' y selecciono el que creé.'] },
        { k: 'price', t: [{ b: 'Determinar precio' }, ': pongo mi precio de venta (vacío = el sugerido por el proveedor).'] },
        { k: 'save', t: ['Guardo.'] },
        { k: 'suc', t: ['En ', { b: 'Productos → mi producto → Inventario' }, ': ', { b: 'Editar sucursales' }, ' y marco las dos direcciones que aparecen.'] },
        { k: 'track', t: [{ b: 'Después' }, ' (no antes) desactivo ', { b: '"Inventario con seguimiento"' }, '.'] },
      ],
      tool: ['dropify'],
      tip: ['"Importar como producto nuevo" crea otro producto en la tienda: como ya lo creé, uso vincular. En Inventario va ', { b: 'en el orden exacto' }, ': primero las sucursales, después el seguimiento.'] },

    { k: 'releasit', t: 'Formulario y ofertas', where: 'Apps → Releasit COD Form → Impulsor de ventas',
      p: ['En ', { b: 'Ofertas de cantidad → Añadir oferta' }, ' cargo las 3 ofertas. Toda la compra vive aquí. Abajo tengo, oferta por oferta, lo que va en cada campo.'],
      items: [
        { k: 'prod', t: ['Selecciono el producto y lo agrego.'] },
        { k: 'o1', t: [{ b: 'Oferta 1' }, ': Cantidad ', { b: '1' }, ', Tipo de descuento ', { b: 'Sin descuento' }, '.'] },
        { k: 'o2', t: [{ b: 'Oferta 2' }, ': Cantidad ', { b: '2' }, ', Tipo de descuento ', { b: 'Porcentaje' }, ', Valor del descuento ', { b: '20' }, ' y activo ', { b: '"Preseleccionar esta oferta"' }, '.'] },
        { k: 'o3', t: [{ b: 'Oferta 3' }, ': Cantidad ', { b: '3' }, ', Tipo de descuento ', { b: 'Porcentaje' }, ', Valor del descuento ', { b: '30' }, '.'] },
        { k: 'txt', t: ['En cada oferta pego su ', { b: 'Título' }, ' y su ', { b: 'Texto de la etiqueta' }, ' (letras blancas, fondo verde fosforescente).'] },
        { k: 'img', t: ['Le pongo a cada oferta su ', { b: 'miniatura' }, ' (prompts abajo).'] },      ],
      prompts: [
        { k: 'mini1', t: 'Miniatura oferta 1 · 1 unidad', text: 'Foto de producto ultrarrealista, formato cuadrado 1:1: una sola unidad de {producto} de frente, centrada, sobre un fondo liso de color suave (beige o verde salvia), luz de estudio suave y sombra leve. Mismo empaque, colores y textos de la foto real que adjunto. Encuadre cerrado: el producto ocupa casi toda la imagen porque se verá muy pequeña. Sin texto extra, sin logos de otras marcas.', tip: ['Se ve en miniatura junto a la oferta: ', { b: 'pocos elementos y producto grande' }, '.'] },
        { k: 'mini2', t: 'Miniatura oferta 2 · 2 unidades', text: 'Foto de producto ultrarrealista, formato cuadrado 1:1: dos unidades de {producto} de frente, una al lado de la otra, y delante [el regalo, ej. un cuaderno pequeño] apoyado, sobre el mismo fondo liso de color suave (beige o verde salvia), luz de estudio suave y sombra leve. Mismo empaque, colores y textos de la foto real que adjunto. Encuadre cerrado, todo bien grande. Sin texto extra, sin logos de otras marcas.', tip: ['Si el producto ', { b: 'no trae regalo' }, ', borro la parte del regalo.'] },
        { k: 'mini3', t: 'Miniatura oferta 3 · 3 unidades', text: 'Foto de producto ultrarrealista, formato cuadrado 1:1: tres unidades de {producto} de frente, en fila o en triángulo, y delante [el regalo, ej. un cuaderno pequeño] apoyado, sobre el mismo fondo liso de color suave (beige o verde salvia), luz de estudio suave y sombra leve. Mismo empaque, colores y textos de la foto real que adjunto. Encuadre cerrado, todo bien grande. Sin texto extra, sin logos de otras marcas.', tip: ['Uso el ', { b: 'mismo fondo' }, ' en las 3 miniaturas para que se vean como un juego.'] },
      ],
      tool: ['offer'],
      warn: ['La garantía va en la etiqueta ', { b: 'solo si de verdad la ofrezco' }, ', y el regalo solo si de verdad lo trae. Si el contador del flash llega a cero, cambio la oferta de verdad.'],
      tip: ['Con porcentaje, Releasit tacha el precio de las unidades sin descuento y muestra el precio con descuento (2 × 84.900 = 169.800 → 135.840).'] },

    { k: 'resenas', t: 'Reseñas', where: 'Apps → TrustWill → Importar reseñas y Q&A',
      items: [
        { k: 'ali', t: ['En AliExpress busco el producto con ', { b: `ideal más de ${LANDING.aliSales.toLocaleString('es-CO')} ventas` }, ' y muy buenas calificaciones, y copio el enlace.'] },
        { k: 'imp', t: ['En TrustWill pego el enlace en ', { b: 'Enlace a AliExpress' }, '.'] },
        { k: 'num', t: [{ b: 'Número de importaciones' }, ': ', { b: String(LANDING.imports) }, '.'] },
        { k: 'mine', t: ['Edito ', { b: `${LANDING.ownReviews} reseñas de 5 estrellas` }, ' con las reseñas reales de mis clientes de este producto.'] },
        { k: 'alt', t: ['Si no encuentro mi producto en AliExpress, busco ', { b: 'imágenes del producto' }, ' en otro sitio, por ejemplo en ', { b: 'Amazon' }, '.'] },
      ] },

    { k: 'revision', t: 'Revisión final', where: 'Mi página desde el celular', src: 'Criterio NovaSociety',
      p: ['Antes de pautar, abro la página como si fuera un cliente.'],
      items: [
        { k: 'mobile', t: ['La abro ', { b: 'desde el celular' }, ': galería, precio tachado, cinta arriba, deslizador, tabla 7/7 y anillos se ven bien.'] },
        { k: 'imgs', t: ['No hay ', { b: 'imágenes rotas' }, ' (todas cargan desde mi Shopify).'] },
        { k: 'form', t: ['Al tocar comprar abre el formulario de Releasit con las 3 ofertas y es corto, ', { b: 'sin fricción' }, '.'] },
        { k: 'test', t: ['Hago un ', { b: 'pedido de prueba' }, ': reviso que llegue a Shopify y a Dropi, y después lo ', { b: 'cancelo' }, ' para que no lo despachen.'] },
        { k: 'flash', t: ['El contador muestra su fecha y la anoté para cambiar la oferta ese día.'] },
      ],
      tip: ['NovaSociety: si la campaña tiene buen CPPI y no vende, el problema está en ', { b: 'la página, la oferta o el formulario' }, '. Se arregla dándole más confianza a la página y quitando la fricción. Con 200 visitas ya se puede juzgar la página.'] },
  ];

  const key = (s, it) => s.k + '.' + it.k;
  const num = (v) => (v === '' || v == null || !isFinite(Number(v)) || Number(v) <= 0 ? null : Number(v));
  const money = (v) => '$' + Number(v).toLocaleString('es-CO');

  // Reemplaza {producto} y {precio} en un prompt; sin dato queda un texto genérico.
  const fill = (text, vars = {}) => {
    const n = (vars.producto || '').trim(), p = num(vars.precio);
    return text
      .replace(/el producto \{producto\}/g, n ? 'el producto ' + n : 'el producto')
      .replace(/\{producto\}/g, n || 'el producto')
      .replace(/\{precio\}/g, p ? money(p) : '[precio de venta]');
  };

  const words = (s) => ((s || '').trim().match(/\S+/g) || []).length;
  const fullTitle = (name, sub) => [(name || '').trim(), (sub || '').trim()].filter(Boolean).join(': ');

  // Contador de caracteres: ok si cabe en el límite.
  const count = (text, max) => { const len = (text || '').length; return { len, max, ok: len > 0 && len <= max, over: len > max }; };

  // Redondea hacia arriba para que termine igual que el precio (84.900 → todo termina en .900), regla de la skill.
  const roundLike = (v, price) => { const end = price % 1000; return Math.ceil((v - end) / 1000) * 1000 + end; };

  // Precio, tachado (el doble, redondeado) y las ofertas de cantidad tal como las calcula Releasit con
  // descuento en porcentaje: tacha el precio sin descuento de las unidades (strike) y cobra el total.
  function prices(sellPrice) {
    const price = num(sellPrice);
    if (!price) return null;
    const compare = roundLike(price * 2, price);
    const offers = LANDING.offers.map(({ qty, pct }) => {
      const full = price * qty, total = Math.round(full * (1 - pct / 100));
      return { qty, pct, full, total, strike: pct ? full : null, discount: full - total, each: Math.round(total / qty) };
    });
    return { price, compare, offers };
  }

  // Título y texto de la etiqueta de cada oferta de Releasit (como los de FOCUS). Siempre llevan regalo:
  // sin nombre queda [Regalo] para que se note qué falta. La garantía sale si hay días.
  function offerTexts({ name, unit, gift, warranty }) {
    const n = (name || '').trim() || '{product_name}', u = (unit || '').trim() || 'Unidades', g = (gift || '').trim() || '[Regalo]';
    const days = num(warranty), extra = [`${g} GRATIS`, days && `${days} DÍAS DE GARANTÍA`].filter(Boolean);
    return LANDING.offers.map((o) => ({
      ...o,
      title: o.qty === 1 ? n : `${o.pre} ${o.qty} ${u} ${n} + ${o.qty === 2 ? 'GRATIS ' : ''}${g} de Regalo`,
      label: (o.pct ? [`${o.pct}% DE DESCUENTO`, ...extra].join(' + ') : '+ ' + extra.join(' + ')).toUpperCase(),
    }));
  }

  // Todo lo que se deriva del estado de la pestaña (para pintar contadores, precios y vistas previas).
  function view(st) {
    const p = st.prod || {}, title = fullTitle(p.name, st.sub);
    return {
      name: (p.name || '').trim(), dropi: (p.dropi || '').trim(), cost: num(p.cost),
      sub: { words: words(st.sub), max: LANDING.subWords, ok: words(st.sub) > 0 && words(st.sub) < LANDING.subWords },
      title, titleCount: count(title, LANDING.title),
      offers: offerTexts({ name: p.name, unit: st.unit, gift: st.gift, warranty: st.warranty }),
      prices: prices(p.price),
    };
  }

  // Avance: casillas marcadas de cada paso y del total (de STEPS o de otra guía con el mismo formato, ej. core.ads).
  function progress(done, list = STEPS) {
    const d = done || {};
    const steps = list.map((s) => { const n = s.items.filter((it) => d[key(s, it)]).length; return { k: s.k, done: n, total: s.items.length, complete: n === s.items.length }; });
    return { steps, done: steps.reduce((a, s) => a + s.done, 0), total: steps.reduce((a, s) => a + s.total, 0), stepsDone: steps.filter((s) => s.complete).length };
  }

  core.landing = { LANDING, STEPS, key, fill, words, fullTitle, count, roundLike, prices, offerTexts, view, progress };
})();
