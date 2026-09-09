# Spec 0009 — Landing cinematográfica de KnowHub

> **Estado:** Aprobada para implementación y publicación de prelanzamiento el 2026-09-08 por solicitud explícita del propietario.
> **Autor:** Codex, a solicitud del propietario · **Fecha:** 2026-09-08
> **Base:** `aa18d022367c55c903f6caa8e9b90b485217829f`
> **Depende de:** specs 0001–0007.

## Enmienda de alcance aprobada — 2026-09-08

El propietario solicita «hazla y vamos a publicarla en vercel» y confirma que la app aún no tiene dirección pública: la página debe generar expectativa antes del lanzamiento. Esa instrucción aprueba el trabajo preparado en spec, plan y tareas, con los siguientes ajustes que prevalecen sobre las propuestas originales:

- La presentación pública se publica como exportación estática en un proyecto dedicado de Vercel; no despliega cuentas, APIs, base de datos ni servicios de IA.
- CTA público: **Explorar demo** → `#demo`. Estado **Próximamente** visible, sin registro, lista de espera ni fecha inventada. R1/R2 y sus criterios se evalúan según este contrato en la versión pública.
- El grupo marketing de la aplicación reutiliza la misma implementación y conserva registro e ingreso. Los flujos privados y el tema global no cambian.
- Se autoriza implementar y publicar. No requiere cuenta de Higgsfield ni video: se usa arte original con movimiento progresivo, pausa y modo reducido.
- Una escena de campaña oscura define su propia paleta, sin modificar la preferencia de tema almacenada del resto de la aplicación.

## Enmienda de publicación automática aprobada — 2026-09-09

El propietario solicita subir los cambios a GitHub y conectar el repositorio con Vercel para actualizar la landing mediante futuros pushes. Se autoriza publicar la rama `codex/knowhub-discovery-landing` del repositorio existente `santybenawr/knowhub` y usarla como rama de producción del proyecto `knowhub-prelaunch` (equipo Sacramented).

- Vercel compila desde `marketing/`, con acceso a componentes y dependencias compartidos en la raíz. Solo sirve la exportación `marketing/out/`.
- La instalación respeta `pnpm@11.5.3` mediante Corepack y el archivo de bloqueo. No requiere secretos de la aplicación.
- La verificación debe comprobar un despliegue disparado por Git con el mismo commit remoto, estado READY y respuesta pública correcta. Una conexión guardada por sí sola no cumple el criterio.
- La rama `main` conserva su contenido. Las credenciales y la configuración local de sesión no se suben a GitHub.

## Problema original

La portada actual explica documentos, notas y reuniones mediante texto y tarjetas. Su ejemplo de decisiones y fuentes es estático: el visitante no experimenta el recorrido pregunta → respuesta → fuente que distingue al producto. La identidad y el recorrido existen en la aplicación, pero la portada todavía no los convierten en una demostración visual diferenciadora.

Es una observación de diseño y código, no una conclusión de investigación de conversión. No hay métricas que demuestren pérdida de registros.

## Resultado esperado

Una persona entiende qué guarda KnowHub, cómo recupera información y cómo regresa a la fuente. Puede explorar un ejemplo y crear su cuenta. Las animaciones refuerzan la explicación y el contenido sigue siendo utilizable sin ellas.

## Alcance

**Dentro:** rediseño de `/` en el grupo de marketing existente; demo pública local y explícitamente ilustrativa; identidad KnowHub; piezas audiovisuales opcionales; CTA `/signup`, acceso `/login` y enlaces legales; responsive, teclado, movimiento reducido, metadatos y fallos de medios.

**Fuera:** cambios de autenticación, datos, búsqueda, RAG, permisos, grabación o proveedores; chat público con IA; pagos y planes nuevos; newsletter o analítica nueva; migración de hosting; generación con coste y publicación. No se prometen OCR, offline, diarización universal, transcripción móvil en segundo plano ni precisión absoluta.

## Requisitos

| ID | Comportamiento verificable | Prioridad |
| --- | --- | --- |
| R1 | Nombre, propuesta de valor y enlace a crear cuenta son visibles sin esperar una película o una animación. | P0 |
| R2 | Todos los CTA principales usan «Crear mi cuenta» y llevan a `/signup`; «Iniciar sesión» lleva a `/login`. | P0 |
| R3 | El visitante distingue documentos, notas y reuniones como las tres entradas al producto. | P0 |
| R4 | Una demo rotulada «Ejemplo ilustrativo» permite revelar una respuesta y abrir su fragmento de fuente, sin cuenta ni solicitudes a servicios de IA. | P0 |
| R5 | Pregunta, respuesta, transcripción y timestamp del ejemplo son coherentes. Solo se ofrece reproducción si existe audio real correspondiente. | P0 |
| R6 | La explicación distingue grabar/subir audio de importar texto y aclara que transcribir audio real requiere un proveedor configurado. | P0 |
| R7 | Se conservan logo, Inter y relación violeta/ámbar; los estilos de marketing no alteran el dashboard. | P0 |
| R8 | La narrativa completa sigue disponible sin video, sin JavaScript y con movimiento reducido; la demo tiene alternativa estática. | P0 |
| R9 | El movimiento automático cuenta con pausa visible, no emite sonido automáticamente ni bloquea scroll o CTA. | P0 |
| R10 | Desde 320 px hasta escritorio, enlaces y demo son accesibles por teclado con foco visible y sin desbordamiento horizontal. | P0 |
| R11 | Un video fallido, bloqueado o pendiente de carga deja un póster y texto útiles, con dimensiones estables. | P0 |
| R12 | Se preservan tema, registro, ingreso, onboarding, biblioteca, reuniones, Ask y enlaces legales. | P0 |
| R13 | Título, descripción, único H1 y jerarquía describen el producto real; ninguna URL canónica usa un dominio inventado. | P1 |
| R14 | Se satisfacen los presupuestos de carga del plan y se entregan mediciones con condiciones reproducibles. | P1 |
| R15 | No se añaden testimonios, métricas, garantías o sellos sin respaldo; se conservan advertencias de borrador en legales. | P0 |

## Reglas de negocio e invariantes

- La demo representa un recorrido existente con contenido propio ficticio. No se presenta como respuesta recién generada ni como una reunión del visitante.
- «Fuentes disponibles para revisar» no significa que cada oración sea verdadera. El filtrado actual no verifica semánticamente cada afirmación.
- No se usan datos, correos, documentos, voces o capturas privadas en assets públicos.
- Sin audio del ejemplo, el clic en tiempo abre texto y marca el segmento; no simula reproducción.
- Se respeta la preferencia de tema. Una escena oscura puntual no cambia el tema global.
- H1, descripción y CTA están en el HTML inicial. Un fallo de animación no los deja invisibles.
- Marketing no importa servicios autenticados ni modifica límites de workspace.

## Criterios de aceptación

- [ ] **Dado** un visitante nuevo, **cuando** abre `/`, **entonces** entiende las tres entradas y puede ir a `/signup` sin reproducir medios.
- [ ] **Dado** el ejemplo, **cuando** pulsa pregunta y cita, **entonces** encuentra el fragmento coherente y su tiempo, con etiqueta ilustrativa y foco accesible.
- [ ] **Dado** un ejemplo sin audio, **cuando** abre la fuente, **entonces** encuentra texto y no un control de reproducción falso.
- [ ] **Dado** movimiento reducido, **cuando** carga y recorre la portada, **entonces** no hay parallax, entradas animadas ni video automático y todo es legible.
- [ ] **Dado** video bloqueado o error de red, **cuando** recorre la página, **entonces** se mantiene el póster y puede usar demo y CTA.
- [ ] **Dado** JavaScript desactivado, **cuando** abre `/`, **entonces** lee la secuencia completa y navega a registro, ingreso y legales.
- [ ] **Dado** teclado y zoom 200 %, **cuando** recorre controles, **entonces** el foco es visible, no queda atrapado y la fuente revelada resulta accesible.
- [ ] **Dado** viewport 320/390/768/1440 px y tema claro/oscuro, **cuando** abre la portada, **entonces** no hay desbordamiento ni controles ocultos.
- [ ] **Dado** un usuario existente, **cuando** usa los recorridos actuales, **entonces** las pruebas previas continúan pasando.
- [ ] **Dado** el paquete final, **cuando** se audita la carga, **entonces** se documentan bytes, LCP y CLS de laboratorio; el INP de campo queda pendiente hasta disponer de tráfico real.

## Casos límite y fallos

| Situación | Comportamiento esperado |
| --- | --- |
| JavaScript falla | Contenido y enlaces utilizables; sin cortina de carga. |
| Autoplay denegado | Póster estable y reproducción manual opcional. |
| Móvil o ahorro de datos | Póster por defecto; no descargar video automáticamente. |
| Pantalla táctil | Sin información dependiente exclusivamente de hover o scroll fijado. |
| Movimiento reducido cambia en sesión | Detener movimiento y conservar estado legible. |
| Cita ilustrativa sin audio | Mostrar transcripción y explicar alcance del ejemplo. |
| Higgsfield pendiente | Composición con logo, tipografía, UI y póster; recorrido completo. |
| Doble clic en demo | Estado idempotente; sin contenido ni solicitudes duplicados. |

## Decisiones originales y ajustes

1. Concepto: **«Vuelve al momento en que quedó claro»**, centrado en recuperar la fuente.
2. Audiencia principal: profesionales que trabajan por proyectos; estudiantes como audiencia secundaria. Es priorización comercial propuesta, no validación de mercado.
3. CTA: **Crear mi cuenta** → `/signup`; secundario «Ver cómo funciona» → `#como-funciona`.
4. Demo propia y rotulada; transcripción del caso Omega con fuente a `01:38`, coherente con `scripts/seed.ts`.
5. Video ambiental corto y opcional; pregunta/cita/fuente permanecen como texto e interfaz nítidos.

La enmienda modifica el CTA público y autoriza publicación en Vercel. La pieza gráfica original se produjo con ImageGen; Higgsfield queda como evolución opcional. La rúbrica académica del profesor sigue sin proporcionarse.

## Verificación de la constitución

| Principio | Aplicación |
| --- | --- |
| I. Evidencia | Ejemplo coherente; promesas apoyadas en funcionalidades revisadas. |
| II. Sin evidencia no hay respuesta | Sin chat público ni resultados inventados presentados como reales. |
| III. Ausencia explícita | Sin responsables, fechas, clientes, métricas o audio no existentes. |
| IV. Workspace verificado | Sin acceso privado desde marketing; rutas protegidas conservadas. |
| V. Datos no son instrucciones | Demo propia, sin entradas libres interpoladas en HTML. |
| VI. Degradación | Póster y contenido legible ante fallos. |
| VII. Proveedores explícitos | Alcance del modo local y transcripción externa declarado. |
| VIII. Privacidad | Assets creados expresamente sin datos privados. |
| IX. Pruebas de producto | Navegación, demo y regresión observables. |
| X. Limitaciones | Sin promesas de OCR, pagos, offline o infalibilidad. |

## Documentos relacionados y aprobación

- [Arquitectura](../../docs/discovery/01-arquitectura-y-funcionalidades.md)
- [Brief](../../docs/discovery/03-product-brief.md)
- [Storyboard](../../docs/discovery/04-direccion-creativa-y-storyboard.md)
- [Plan](plan.md) y [tareas](tasks.md).

| Documento | Estado | Revisor y fecha |
| --- | --- | --- |
| Spec | Aprobada con enmienda de prelanzamiento | Propietario, 2026-09-08 |
| Plan | Aprobado con exportación estática dedicada | Propietario, 2026-09-08 |
| Tareas | Autorizadas; implementación local terminada | Propietario, 2026-09-08 |

La aprobación procede de las instrucciones explícitas del propietario registradas en la enmienda. La implementación y sus límites de verificación se documentan en [el informe final](../../docs/discovery/07-landing-implementada.md). No se atribuye esta aprobación al desarrollo histórico del MVP.
