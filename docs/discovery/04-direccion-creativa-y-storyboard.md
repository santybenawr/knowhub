# KnowHub — Dirección creativa, storyboard y assets

Fecha: 8 de septiembre de 2026. Base: commit `aa18d022`. Documento de **propuesta**, derivado del código observado; no es una landing implementada ni una campaña publicada. Debe leerse junto a `03-product-brief.md` y la especificación de implementación que acompañe esta entrega.

## 1. Concepto elegido: «Vuelve al momento en que quedó claro»

La historia visual parte de una memoria difusa y termina en una fuente concreta. Primero aparecen fragmentos de lo que se escuchó, escribió y leyó; después una pregunta los ordena; finalmente la respuesta conduce a un timestamp y al fragmento original. La imagen distintiva de KnowHub será ese trayecto **pregunta → respuesta → cita → momento**, no una animación de un cerebro ni una nube de partículas sin relación con el producto.

**Razón de producto:** la app ya convierte citas de reunión en enlaces `?t=` y coordina cita, segmento y reproductor (`src/server/ai/rag.ts:78–86`; `src/features/meetings/meeting-workspace.tsx:89–115`). «Memoria verificable» se usará como concepto de inspección del origen, sin prometer infalibilidad de la IA.

**Tono:** preciso, tranquilo y seguro. El impacto viene de la escala tipográfica, la luz y una demostración que se entiende. La composición debe sentirse como la presentación de una herramienta útil, con el contenido real del producto en primer plano.

## 2. Dirección visual

| Decisión | Aplicación concreta | Base existente |
| --- | --- | --- |
| Violeta como estructura | Trazos, citas, selección y CTA; evitar que todos los elementos compitan por ese color | `src/app/globals.css:22–25,54–57` |
| Ámbar como recuerdo encontrado | Un punto que recorre la línea y se detiene en la fuente; resaltar el instante de descubrimiento | `src/components/shared/logo.tsx:16`; `public/icon.svg:5` |
| Fondos claros y oscuros | Lienzo cálido legible; escenario audiovisual profundo en el hero o el momento de evidencia | `src/app/globals.css:12–20,44–52` |
| Inter con jerarquía editorial | Titular grande de pocas palabras, textos breves y suficiente espacio; mono solo para tiempos y fuente | `src/app/layout.tsx:11–15`; `src/app/globals.css:7–8` |
| Interfaz creíble | Ventana de producto con navegación, pestañas y una fuente; tamaño suficiente para leer el dato clave | `src/features/meetings/meeting-workspace.tsx:200–217` |
| Movimiento intencional | Una línea une una respuesta y su fuente; el resto sirve para abrir la composición | Citas y saltos existentes, no funcionalidades nuevas |

Reutilizar `Logo`, `Button`, `Badge`, iconos Lucide y los tokens. Si se requiere una superficie de hero más oscura, darle variables o clases locales en marketing; no modificar la clase global de tema ni reestilizar el dashboard. No copiar interfaces de otras marcas, introducir un logotipo nuevo ni añadir fuentes remotas de campaña.

## 3. Guion editorial y storyboard de la página

La duración sugerida corresponde a una demostración guiada opcional; el visitante puede desplazarse y leer a su propio ritmo. No bloquear el scroll ni exigir ver una secuencia completa para usar el CTA.

| Escena | Qué debe comprender la persona | Composición y copy propuesto | Movimiento propuesto | Interacción y evidencia |
| --- | --- | --- | --- | --- |
| 00. Navegación persistente | Está en KnowHub y puede entrar o crear cuenta | Logo original; enlace «Cómo funciona»; «Iniciar sesión»; botón «Crear mi cuenta» | Fondo ligeramente más opaco al desplazarse, sin ocultar controles | `/login`, `/signup`, `#como-funciona`; rutas actuales en `src/app/(marketing)/layout.tsx:12–23` |
| 01. Hero — el momento | KnowHub permite recuperar contexto con fuentes | Eyebrow «Documentos · Notas · Reuniones». H1 «Vuelve al momento en que quedó claro». Texto «Reúne lo que lees, escribes y escuchas. Encuentra respuestas y vuelve al fragmento de origen». CTA «Crear mi cuenta»; secundario «Ver cómo funciona» | Entrada del texto 450–650 ms, desplazamiento de 12 px como máximo. Fondo de luz violeta y un punto ámbar muy lento, decorativo | La promesa y los enlaces deben existir desde el HTML inicial; el video no contiene texto esencial |
| 02. Demostración — pregunta | Hay una respuesta útil a una duda concreta | Ventana rotulada «Ejemplo ilustrativo · Proyecto Omega». Pregunta «¿Qué proveedor elegimos?». Respuesta «Se decidió seleccionar al proveedor B. [1]» | Al pulsar «Explorar ejemplo», aparecen pregunta y respuesta por bloques, sin fingir una consulta viva a IA | Datos del ejemplo de producto en `src/app/(marketing)/page.tsx:88–107`; escenario similar en `scripts/seed.ts:15–27` |
| 03. Demostración — evidencia | Puede revisar lo que sustenta la respuesta | Título «La respuesta es el comienzo. La fuente te da contexto». Botón «Ver fuente · 01:38». Panel «01:38 · Santiago: Entonces vamos a seleccionar el proveedor B» | El marcador [1] ilumina una línea que llega al segmento; 300–450 ms. El tiempo cambia solo por la acción explícita del visitante | El `01:38` y la frase proceden de `scripts/seed.ts:22`; en una demo estática mostrar segmento, no reproducir audio inexistente. La app real busca audio cuando lo tiene (`meeting-workspace.tsx:125–133`) |
| 04. Tres entradas, un contexto | No está limitado a reuniones | Título «Lo que lees. Lo que escribes. Lo que escuchas». Tres columnas: «Documentos / PDF con texto, DOCX, Markdown y TXT»; «Notas / Escribe y conserva tus ideas»; «Reuniones / Graba, sube o importa una transcripción» | Tres superficies se ordenan en una biblioteca; desplazamientos cortos. En móvil se apilan | Capacidades observadas en biblioteca y creación de reunión; formatos en `src/server/documents/validation.ts:13` |
| 05. Cómo funciona | El proceso tiene pasos comprensibles | Ancla `#como-funciona`. «Captura» → «Organiza» → «Pregunta» → «Vuelve a la fuente». Frase final «Tus acuerdos, junto a su contexto» | La línea avanza al entrar cada paso en viewport; sin autoplay de pestañas ni simular porcentajes de procesamiento | Títulos y explicaciones visibles incluso sin JavaScript; reutilizar el ancla de la landing actual (`src/app/(marketing)/page.tsx:115`) |
| 06. Control y honestidad | El producto ayuda a revisar, no exige confianza ciega | «Cuando importa, vuelve al origen». Tres pruebas concretas: fuentes navegables; alcance de consulta por proyecto/reunión; aviso cuando no hay evidencia suficiente | Sin efecto complejo; dejar leer. Pequeño ejemplo de ausencia de respuesta claramente rotulado | `src/features/ask/ask-workspace.tsx:29–55`; `src/server/ai/rag.ts:197–200`. No sustituir esto por logos de clientes o sellos no existentes |
| 07. Preguntas prácticas | Entiende las condiciones de uso principales | Cuatro preguntas: formatos; transcripción; fuente sin audio; información insuficiente. Respuestas abajo | Acordeón accesible opcional, con expansión de contenido corta y sin rebote | No esconder limitaciones fundamentales tras un efecto ni afirmar funciones no probadas |
| 08. Cierre | El próximo paso es crear cuenta | «Tu próximo proyecto puede conservar su contexto». Texto «Empieza reuniendo un documento, una nota o una reunión». CTA «Crear mi cuenta» | El punto ámbar llega a reposo; composición estática | `/signup`; pie con `/privacy` y `/terms`, conservando sus avisos actuales |

### Copy propuesto para las preguntas prácticas

**¿Qué puedo guardar?** Documentos PDF con texto seleccionable, DOCX, Markdown y TXT, además de notas y reuniones. Los PDF escaneados todavía no tienen lectura mediante OCR. Evidencia: `src/server/documents/validation.ts:13`; `src/server/documents/parsers/pdf.ts:34–37`.

**¿Cómo entra una reunión?** Puedes grabarla desde el navegador, subir un archivo o importar una transcripción. La transcripción de audio requiere un proveedor configurado. En una instancia de demostración, el modo de desarrollo se indica expresamente. Evidencia: `src/app/(dashboard)/meetings/new/page.tsx:31–46`; `src/components/shared/provider-notice.tsx:15–27`.

**¿Siempre puedo escuchar la fuente?** Si la reunión tiene una grabación disponible, sus citas permiten volver al momento correspondiente. Una transcripción importada puede consultarse aunque no tenga audio. Evidencia: `src/features/meetings/meeting-workspace.tsx:89–115,125–133`.

**¿Qué pasa si no hay información suficiente?** KnowHub indica cuando no recupera evidencia suficiente de la biblioteca para responder. Las fuentes disponibles permiten revisar los resultados. Evidencia: `src/server/ai/rag.ts:197–208`. Evitar prometer que un umbral de recuperación demuestra de manera absoluta que ningún documento contiene la respuesta.

## 4. Guion de una microdemostración de 12 segundos

Esta pieza se construye con interfaz real o HTML/SVG; no requiere generación de video.

1. **0–2 s:** tres recursos entran en una misma composición. Cada uno tiene nombre de tipo, sin archivos privados.
2. **2–5 s:** aparece «¿Qué proveedor elegimos?»; el cursor decorativo no debe parecer una caja que admite preguntas libres si no lo hace.
3. **5–8 s:** aparece la respuesta propuesta y [1]. Mostrar «Ejemplo ilustrativo» durante toda la pieza.
4. **8–10 s:** se activa «Ver fuente · 01:38» y se resalta el fragmento de la transcripción.
5. **10–12 s:** todo queda en reposo, con la respuesta y su evidencia a la vista. CTA real separado de la pieza.

Para la versión interactiva, sustituir los tiempos por botones o pasos controlados por la persona. No imitar un tiempo de respuesta medido del producto. Si se decide mostrar reproducción, producir una grabación de demostración autorizada con el guion correspondiente y verificar que el timestamp coincide; mientras no exista, mostrar únicamente la transcripción.

## 5. Sistema de movimiento, móvil y accesibilidad

**Reglas propuestas de implementación:**

- Usar preferentemente `transform` y `opacity`, transiciones cortas y CSS. Las dependencias actuales no incluyen una biblioteca dedicada de animación (`package.json:26–49`); la primera versión no necesita añadirla.
- Máximo una composición decorativa en movimiento continuo por viewport. Si el loop dura más de cinco segundos, ofrecer «Pausar animación» y recordar la elección durante la visita.
- No secuestrar scroll, esconder texto hasta una animación, mover el cursor del sistema, usar destellos, reproducir sonido automáticamente ni mezclar el rojo de grabación con un estado meramente decorativo.
- Animaciones de entrada: una sola vez, 450–650 ms, distancia 8–16 px, retrasos menores de 100 ms entre elementos. Interacciones: 150–250 ms; cambio de evidencia: hasta 450 ms.
- A 360–430 px: hero en una columna, CTA principal de ancho cómodo, ejemplo bajo el copy y no como captura microscópica. Convertir tres entradas a lista; la línea de contexto puede ser vertical. Evitar escenas fijadas al scroll en móvil.
- Controles táctiles de objetivo aproximado 44 px; no depender de hover. Tabs operables con teclado, foco visible y nombres comprensibles. La demo debe tener un botón real para inspeccionar su fuente.
- Con `prefers-reduced-motion: reduce`: desactivar autoplay de video, parallax, loops, desplazamientos y scroll suave de la landing. Mostrar el poster y el estado de demostración que incluye respuesta y fuente; mantener todos los contenidos y acciones. La app ya trata esta preferencia en su indicador de grabación (`src/app/globals.css:118–132`), pero la landing necesitará su propia cobertura.
- Asegurar que el texto normal y los controles tienen contraste verificable en ambos temas. No convertir un verde/ámbar/violeta en el único indicador del estado; acompañar con texto.
- El fondo generado será decorativo y estará excluido de la lectura asistida. Si se publica un video explicativo con voz, requerirá subtítulos/transcripción; el guion aquí puede comunicarse sin audio.

**Presupuestos propuestos, no mediciones:** poster hero ≤200 KB, variantes móviles pequeñas, video opcional de 6–8 s objetivo ≤2,5 MB; no exigir descarga de video antes de mostrar título/CTA. Servir formatos y dimensiones finales tras comprobar calidad. En ahorro de datos, pantalla pequeña o fallo de carga, preferir poster o composición CSS. Medir LCP, CLS y respuesta a interacción en el entorno real antes de publicar; no presentar objetivos como resultados.

## 6. Inventario de assets y decisiones de producción

| ID | Asset | Estado de la base | Producción recomendada | Destino propuesto |
| --- | --- | --- | --- | --- |
| E01 | Logo KnowHub | SVG React y SVG público disponibles | Reutilizar originales sin alterar proporciones | Header, footer, iconos |
| E02 | Iconos de tipos y acciones | Lucide instalado | Reutilizar familia existente | Biblioteca, pasos, controles |
| E03 | Paleta/tipografía/componentes | Tokens, Inter, Button y Badge disponibles | Reutilizar y componer | Toda la landing |
| E04 | Ejemplo Proyecto Omega | Existe en landing y seed | Curar una sola versión y etiquetarla; no mezclar timestamps como si fueran una grabación real | Demostración central |
| E05 | Captura de interfaz auténtica | No encontrada en `public/` | Capturar instancia de prueba, sin datos privados; revisar legibilidad y correspondencia con versión | Producto y material académico |
| E06 | Iconos PNG de instalación | Los dos archivos inspeccionados son de 1×1 px | Rasterizar el SVG original con tamaños correctos en trabajo específico; no usar IA para reconstruir la marca | PWA, fuera del asset cinematográfico |
| H01 | Fondo abstracto «Memoria en foco» | No existe | Opcional Higgsfield; textura audiovisual sin UI ni texto | Hero, detrás del contenido HTML |
| H02 | Plano «Tres fuentes, un contexto» | No existe | Opcional Higgsfield como transición decorativa; alternativa SVG/CSS completa | Entrada a biblioteca |
| H03 | Cierre «El instante encontrado» | No existe | Opcional, solo si aporta continuidad con H01; prioridad menor | Cierre o montaje promocional |
| D01 | Poster estático y recorte móvil | No existen | Exportar fotograma elegido de H01 si se genera; alternativa nativa CSS/SVG disponible | Fallos de video/reduced motion |
| D02 | Interfaz + timestamp + etiquetas | Componentes funcionales sí; composición de campaña no | Construir con HTML/SVG y texto real, jamás depender de letras generadas en video | Sobre H01/H02 o fondo nativo |
| D03 | Imagen social | No encontrada en `public/` | Componer logo + titular + demo legible con herramientas de diseño/código | Metadatos de la landing |

La inspección de `public/` encontró únicamente `icon.svg`, `icon-192.png` e `icon-512.png`. No se han generado ni comprado assets en esta preparación. Los nombres H01–H03 son identificadores de propuesta, no archivos existentes.

## 7. Higgsfield: flujo recomendado y límites de verificación

La [página oficial de AI Video de Higgsfield](https://higgsfield.ai/ai-video), consultada durante esta revisión el 8 de septiembre de 2026, describe flujos de imagen a video, referencias de primer/último fotograma y controles de cámara. La disponibilidad concreta, límites, costes, resoluciones y modelos de la cuenta del usuario no se comprobaron. Los tamaños/duraciones siguientes son **especificaciones deseadas de entrega**, que se adaptarán a las opciones efectivamente disponibles; no una afirmación de que cualquier modelo los admite.

Flujo de producción propuesto: preparar un fotograma aprobado que respete la paleta → usarlo como referencia en un flujo compatible de imagen a video → probar movimiento leve → elegir un fragmento sin deformaciones → exportar poster/recorte → superponer interfaz, logo, texto y controles en la web. Si existen controles de primer y último fotograma en la opción elegida, usar composiciones coherentes para facilitar continuidad. El resultado se revisa manualmente; no se promete conservación perfecta de formas ni loop impecable.

No subir documentos, transcripciones ni capturas privadas como referencias. Una escena abstracta y un prototipo con datos de ejemplo bastan. Si una generación cambia el logo o las letras, descartar ese contenido: la UI y la marca se componen después.

### Prompt H01 — «Memoria en foco»

**Uso:** fondo hero. **Prioridad:** alta si se decide producir video. **Salida deseada:** 16:9, 6–8 s, sin audio; recorte 4:5 para móvil o poster.

> Crea un plano abstracto cinematográfico sobrio para KnowHub, una aplicación que conecta preguntas con sus fuentes. Fondo profundo carbón con matiz violeta. En el tercio derecho, una estructura fina de vidrio ahumado y pequeños trazos de luz violeta forma un arco abierto; un único punto de luz ámbar recorre suavemente uno de los trazos y llega a un nodo preciso. Debe sentirse como una memoria que encuentra su origen. Materiales: vidrio esmerilado, superficies mates, luz lateral difusa, reflejos controlados. Cámara con avance muy lento y poca profundidad de movimiento; ninguna rotación completa. Mantén el tercio izquierdo y la zona superior amplios, tranquilos y oscuros para colocar el texto en HTML. La composición central debe sobrevivir a un recorte vertical sin perder el punto ámbar. El movimiento comienza y termina casi en reposo. Sin personas, caras, cerebros, pantallas, letras, números, logotipos ni marcas de agua. Evita estética espacial, túneles de neón, partículas abundantes, flashes, explosiones, contraste pulsante y cambios bruscos. Un solo gesto claro, elegante y legible.

**Criterio de selección:** el titular sigue dominando; el punto ámbar no parece un botón; nada parpadea; poster útil sin reproducción. Preferir bajo movimiento si el resultado compite con la interfaz.

### Prompt H02 — «Tres fuentes, un contexto»

**Uso:** transición decorativa entre la captura y la biblioteca. **Prioridad:** media; SVG/CSS puede resolver la escena con más control. **Salida deseada:** 16:9, 5–6 s, sin audio.

> Plano de estudio abstracto con fondo cálido casi blanco y sombras suaves. Tres láminas de vidrio translúcido y bordes finos, una ligeramente vertical, otra horizontal y otra con un relieve ondulado muy sutil, representan leer, escribir y escuchar. Están separadas al inicio; con movimientos pequeños y naturales se alinean en un conjunto ordenado. Un hilo violeta delicado conecta las tres y termina en un punto ámbar. Nada debe aparecer por magia explosiva: la sensación es de orden y contexto. Cámara frontal con una inclinación mínima y desplazamiento lateral lento, óptica sin distorsión. Mantén el centro limpio para superponer tres iconos SVG y sus etiquetas después. Los materiales son reales y discretos; evita reflejos que reduzcan contraste. Sin texto, números, interfaces, rostros, manos, logotipos, marcas de terceros, cables complejos ni partículas. El final debe quedar estable para poder detener la pieza sobre un fotograma útil.

**Criterio de selección:** se distinguen tres entradas sin sugerir formatos no soportados. Si se deforma la geometría o cuesta explicar lo que representa, usar la alternativa SVG.

### Prompt H03 — «El instante encontrado»

**Uso:** cierre del montaje opcional; no imprescindible en la página. **Prioridad:** baja. **Salida deseada:** 16:9, 4–6 s, sin audio.

> Composición macro minimalista sobre carbón violeta, visualmente continua con el fondo «Memoria en foco». Una línea fina horizontal y pocos nodos luminosos discretos. Un punto ámbar se desplaza lentamente y se detiene en un único nodo; al detenerse, ese nodo adquiere un halo suave y preciso, sin destello. La cámara apenas se acerca y se detiene. Deja una gran zona vacía sobre la línea para colocar el cierre de KnowHub en la web. La escena comunica haber encontrado un momento concreto, no carga de datos ni una promesa de velocidad. Sin texto, números, relojes generados, UI, caras, manos, emblemas, animaciones robóticas, partículas o luces intermitentes. El último segundo debe estar prácticamente inmóvil y servir como poster.

**Criterio de selección:** el timestamp y el mensaje se añaden siempre como texto real fuera del video. La pieza no puede aparentar un progreso de procesamiento de la app.

## 8. Preparación de implementación sin romper la app

**Ámbito recomendado:** página de inicio dentro de `(marketing)` y componentes exclusivos de marketing. El layout público también envuelve privacidad/términos: cualquier cambio allí debe conservar navegación y lectura de esas páginas. Mantener rutas `/signup`, `/login`, `#como-funciona` y links legales. No introducir lectura de datos privados ni llamadas a `/api/ask` en la demo pública.

**Separación propuesta:** contenido editorial estático servido desde la página; pequeña isla de cliente para seleccionar fuente/pausar animación; decorado CSS/SVG o video opcional; datos de ejemplo fijos y etiquetados. Reutilizar los estilos y primitivas existentes, pero no montar componentes de dashboard que dependan de sesión, permisos o acciones del servidor solamente para ilustrar el producto.

**Criterios visuales y de comportamiento para aceptar la implementación:**

1. En desktop, móvil, tema claro y oscuro se entienden promesa, pregunta, respuesta y fuente sin leer letra diminuta.
2. `/signup` y `/login` conservan su flujo; la landing no crea cuentas ni dispara consultas de IA por visitar o explorar un ejemplo.
3. Toda interacción ilustrativa tiene etiqueta y resultado local claro; no hay reproductor que simule audio inexistente.
4. Sin video o con JavaScript desactivado permanecen mensaje principal, CTA y explicación del producto.
5. Teclado, foco, reduced motion, carga fallida de medios y viewport estrecho reciben revisión real antes de declarar la entrega validada.
6. No se publican logos de clientes, testimonios, cifras, certificaciones ni precios sin fuentes y autorización editorial.
7. Las comprobaciones del proyecto y los flujos existentes se ejecutan según la especificación; los resultados deben registrarse por quien las ejecute, no heredarse de `CHECKPOINT.md`.

Esta propuesta puede concretarse y revisarse antes de cualquier generación de pago. El video mejora la atmósfera; el argumento central ya puede demostrarse con la interfaz y las fuentes de KnowHub.
