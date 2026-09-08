# KnowHub — Product brief para la landing

Fecha: 8 de septiembre de 2026. Base de lectura: repositorio `santybenawr/knowhub`, commit `aa18d022`.

Este brief describe lo encontrado en el código y propone decisiones comerciales y editoriales. **Observado** significa inspeccionado en archivos; no equivale a una prueba de ejecución. **Interpretación** es una conclusión razonada del análisis. **Propuesta** es una decisión para la próxima landing. Las referencias `archivo:línea` corresponden a esa base, antes de implementar cambios.

## 1. Definición del producto

**Observado.** KnowHub reúne documentos, notas y reuniones en una biblioteca que se puede buscar y consultar con preguntas. Las reuniones conectan transcripción, resumen, decisiones, pendientes y fuentes navegables. El nombre, lema y descripción están centralizados en `src/config/app.ts:1–6`. La navegación principal expone Inicio, Biblioteca, Preguntar, Reuniones y Buscar (`src/components/shared/nav-config.ts:4–10`).

**Interpretación.** La propuesta más defendible no es «otra aplicación de IA que resume»: es conservar el contexto de lo que se leyó, escribió y escuchó, y facilitar el regreso a la fuente cuando hay que recordar una decisión o justificar una respuesta. La reunión es el mejor escenario de demostración porque el salto desde una respuesta hasta un momento concreto se comprende visualmente.

**Propuesta de posicionamiento:** «KnowHub convierte documentos, notas y reuniones en una memoria que puedes consultar y contrastar con sus fuentes».

**Promesa editorial principal:** «Vuelve al momento en que quedó claro».

**Explicación funcional de apoyo:** «Reúne lo que lees, escribes y escuchas. Encuentra respuestas y vuelve al fragmento de origen».

«Memoria verificable» significa aquí **capacidad de inspeccionar el origen**, no garantía de que el modelo siempre interprete correctamente. El sistema construye citas con enlaces (`src/server/ai/rag.ts:78–100`); la propia implementación conserva fuentes recuperadas cuando la respuesta no contiene marcadores válidos (`src/server/ai/rag.ts:212–226`). No hay evidencia en esta revisión de una certificación semántica de cada frase.

## 2. Problema y situaciones de uso

| Situación | Fricción que busca resolver | Resultado concreto que puede mostrar la landing | Evidencia |
| --- | --- | --- | --- |
| Después de una reunión alguien pregunta qué se decidió | La respuesta quedó en una grabación o en notas dispersas | Decisión → segmento → tiempo de la reunión | `src/features/meetings/meeting-workspace.tsx:89–115` |
| Hay un pendiente pero no se recuerda quién lo asumió | Hay que reconstruir el acuerdo | Pendiente con responsable y fecha cuando están disponibles; campos desconocidos explícitos | `src/features/meetings/meeting-workspace.tsx:20–29`; `.specify/constitution.md:42–54` |
| Una pregunta involucra distintas fuentes de un proyecto | Hay que buscar archivo por archivo | Consultar toda la biblioteca o limitar por proyecto/reunión | `src/features/ask/ask-workspace.tsx:20–55` |
| Se encuentra una respuesta pero hace falta revisarla | Un resumen aislado no permite comprobar el origen | Abrir reunión con `?t=` o documento con `?chunk=` y fragmento resaltado | `src/server/ai/rag.ts:78–86`; `src/features/documents/document-content.tsx:22–46` |
| Se escriben apuntes durante el trabajo o el estudio | Guardar y ordenar compite con tomar notas | Autoguardado e indexación posterior | `src/features/notes/note-editor.tsx:20–25,68–118` |

Estos son escenarios inferidos de las funciones; no son hallazgos de entrevistas, métricas de mercado ni testimonios.

## 3. Audiencia y prioridad recomendada

**Observado:** el onboarding ofrece Estudio, Trabajo, Empresa, Investigación y Personal, con descripciones visibles. El valor inicial es `trabajo` (`src/components/shared/onboarding-flow.tsx:12–18,28`). No se encontró en los archivos revisados una decisión comercial que priorice un sector, país, edad o tamaño de empresa.

| Prioridad propuesta | Persona de referencia | Necesidad a mostrar | Justificación y límites |
| --- | --- | --- | --- |
| Principal | Profesional o integrante de un proyecto que participa en reuniones y reúne documentación | Recordar acuerdos, recuperar antecedentes y revisar las fuentes | Coincide con la centralidad de reuniones y proyectos. Es una hipótesis comercial, no una audiencia validada |
| Secundaria | Estudiante que trabaja con clases, lecturas y apuntes | Reunir material y volver al fragmento que explica una respuesta | «Estudio» existe explícitamente en onboarding; no prometer evaluación automática ni mejora demostrada de notas |
| Secundaria | Persona investigadora que organiza entrevistas y documentos | Relacionar hallazgos con sus fuentes | «Investigación» existe en onboarding; no presentar el producto como gestor bibliográfico académico completo |
| Posterior | Equipo que quiere compartir conocimiento | Consultar información agrupada en un workspace/proyecto | Hay miembros y workspaces; límites de plan y operación comercial requieren validación antes de vender planes |

Para la primera landing, contar una historia de **reunión de proyecto** y luego abrir a clases, documentos y notas. Una página que intenta hablar igual a cinco públicos pierde la claridad del ejemplo central.

## 4. Capacidades que sí respaldan el mensaje

| Pilar | Comportamiento observado | Cómo traducirlo al usuario | Condición que debe acompañarlo |
| --- | --- | --- | --- |
| Capturar | Crear reunión por grabación, archivo o transcripción importada | «Graba, sube o importa» | La transcripción real de audio requiere proveedor configurado; permiso de micrófono y avisos de grabación |
| Reunir | Biblioteca con documentos, notas y reuniones, filtrada por tipo y proyecto | «Tu proyecto, con todo su contexto» | Solo contenido disponible en el workspace autorizado |
| Entender lo hablado | Pestañas Resumen, Decisiones, Pendientes, Transcripción y Preguntar | «Del encuentro a los acuerdos» | Los resultados de IA pueden contener errores; mostrar y permitir revisar fuentes |
| Buscar | Búsqueda por palabras y semántica | «Encuentra el fragmento que necesitas» | No prometer encontrar cualquier respuesta; depende de indexación y contenido disponible |
| Preguntar | Consulta con alcance de biblioteca, proyecto o reunión | «Haz la pregunta. Revisa la fuente» | Si no se recupera evidencia suficiente, el sistema devuelve la respuesta de ausencia |
| Volver al origen | Citas con tiempo de reunión o fragmento de documento | «De la respuesta al momento exacto» | El salto reproduce audio solo cuando la reunión lo tiene; una transcripción importada puede no incluir audio |

Fuentes de esta tabla: `src/app/(dashboard)/meetings/new/page.tsx:18–46`; `src/app/(dashboard)/library/page.tsx:24–61`; `src/features/meetings/meeting-workspace.tsx:200–240`; `src/app/(dashboard)/search/page.tsx:30–50`; `src/features/ask/ask-workspace.tsx:20–55`; `src/server/ai/rag.ts:197–208`; `src/features/meetings/meeting-workspace.tsx:125–133`.

## 5. Objetivo, CTA y recorrido

**Propuesta de objetivo principal:** llevar a una persona que entiende la utilidad del producto al registro existente. No hay motivo funcional para inventar una lista de espera, descarga de tienda o solicitud de demo por correo.

- CTA principal constante: **«Crear mi cuenta» → `/signup`**.
- CTA secundario de exploración: **«Ver cómo funciona» → `#como-funciona`**, conservando el ancla existente.
- Acceso para quien ya usa la aplicación: **«Iniciar sesión» → `/login`**.
- Cierre: repetir «Crear mi cuenta», sin introducir otra decisión comercial.

El registro es una ruta real (`src/app/(auth)/signup/page.tsx:9–18`). La acción valida el formulario, crea usuario/workspace/sesión y redirige a `/onboarding` (`src/app/(auth)/actions.ts:50–74`; `src/server/auth/service.ts:33–48`). El onboarding permite elegir propósito, crear un proyecto opcional y conocer las tres formas de captura (`src/components/shared/onboarding-flow.tsx:65–145`).

**Recorrido propuesto:** `/` → entender caso de uso → explorar ejemplo de fuente → `/signup` → `/onboarding` → capturar primer recurso → preguntar → inspeccionar su fuente.

**Criterio de activación propuesto:** primer recurso procesado + primera pregunta con fuentes + primera inspección de la evidencia. Es una definición de producto a validar; no existe aquí una tasa de activación calculada.

La app ya registra eventos como `signup_completed`, `onboarding_completed`, `document_uploaded`, `meeting_analysis_completed` y `ai_question_sent` (`src/server/analytics/index.ts:12–26`). No se encontró en ese contrato un evento de impresión de landing, clic en CTA o clic en fuente. Cualquier medición nueva necesita definición y minimización de datos; no añadir un proveedor de seguimiento por defecto ni presentar tasas de conversión inventadas.

## 6. Identidad que debe conservarse

| Elemento | Estado observado | Decisión recomendada |
| --- | --- | --- |
| Nombre y voz | KnowHub; interfaz en español; lema «Transforma información en conocimiento» | Mantener nombre, idioma y claridad de producto; usar el nuevo titular como campaña, no renombrar la marca |
| Logotipo | Símbolo blanco sobre cuadrado violeta con punto ámbar; SVG React | Reutilizar `Logo`; no generar una nueva marca con IA |
| Paleta | Fondos claros cálidos, texto neutro, violeta de marca, ámbar de acento, rojo para grabación, variantes oscuras | Ampliar profundidad y composición dentro del ámbito de marketing; conservar significado de los colores |
| Tipografía | Inter mediante `next/font`; monoespaciada para datos | Mantener Inter; usar números tabulares/mono en timestamps para conectar con el producto |
| Superficies | Bordes finos, radios de tarjeta, componentes comunes | Reutilizar Button, Badge y tokens; dar escala editorial a la landing |
| Tema | Preferencia del usuario almacenada y aplicada antes del primer render | Respetarla; una escena oscura puntual no debe cambiar el tema del dashboard |

Fuentes: `src/config/app.ts:1–6`; `src/components/shared/logo.tsx:3–16`; `src/app/globals.css:6–69,107–112`; `src/app/layout.tsx:11–15,40–49`; `src/app/(marketing)/layout.tsx:12–23`.

## 7. Mensajes y límites editoriales

| Mensaje utilizable | Matiz necesario | Evitar |
| --- | --- | --- |
| «Reúne documentos, notas y reuniones» | Formatos documentales actuales: PDF con texto seleccionable, DOCX, TXT y MD | OCR, cualquier formato, soporte universal para Word antiguo `.doc` |
| «Respuestas con fuentes para volver al origen» | Una cita facilita la revisión; no garantiza que toda inferencia sea correcta | «Cero alucinaciones», «100 % preciso», «cada frase certificada» |
| «Vuelve al segundo citado» | Cuando hay audio y marcas temporales disponibles; timestamps de transcripción dependen de origen/proveedor | Prometer precisión temporal absoluta bajo cualquier audio/proveedor |
| «Recupera decisiones y pendientes» | Responsables y fechas solo cuando están expresados/disponibles | Asignación automática infalible de tareas o integración con calendarios |
| «Graba desde el navegador» | Compatibilidad del navegador, permisos y limitaciones móviles | Grabación garantizada con pantalla bloqueada; integración automática Zoom/Meet/Teams |
| «Crear mi cuenta» | El repositorio define Free/Pro/Team y cuotas técnicas, pero no precios comerciales | «Gratis para siempre», ofertas, descuentos o checkout operativo no comprobado |
| «Consulta tu biblioteca» | Servicio e indexación disponibles; PWA no implica funcionamiento offline | «Todo funciona sin conexión» |

Referencias: `src/server/documents/validation.ts:13`; `src/server/documents/parsers/pdf.ts:19–37`; `src/server/ai/rag.ts:212–226`; `src/server/transcription/openai.ts:24–34`; `.specify/constitution.md:143–150`; `src/config/plans.ts:1–4,22–55`; `src/app/manifest.ts:4–19`.

**Dependencia material de la demostración:** el proveedor local de transcripción no interpreta el audio; devuelve un guion de desarrollo. La interfaz lo advierte (`src/server/transcription/mock.ts:4–15`; `src/features/meetings/meeting-workspace.tsx:135–141`). La landing pública puede mostrar un ejemplo ilustrativo, pero no debe llamar a ese resultado una prueba de transcripción real. La separación de hablantes también depende del proveedor: el adaptador OpenAI presente declara `supportsDiarization = false` (`src/server/transcription/openai.ts:24–34`).

**Privacidad:** describir accesos autorizados y fuentes privadas solo al nivel que el diseño y la verificación permitan. No prometer cifrado de extremo a extremo, residencia geográfica, certificaciones o que los datos nunca salen del dispositivo. La política técnica reconoce que puede transmitir contenido a proveedores según despliegue y aún es borrador (`src/app/(marketing)/privacy/page.tsx:7–17,35–40`).

## 8. Material disponible y material por producir

**Disponible:** SVG de logo en código y `public/icon.svg`; iconografía Lucide; paleta y tipografía; componentes de producto; ejemplo narrativo de Proyecto Omega en la landing actual (`src/app/(marketing)/page.tsx:86–108`) y transcripción de demostración en `scripts/seed.ts:15–27`.

**No disponible en `public/` en la base inspeccionada:** fotos de producto, capturas del dashboard, grabaciones promocionales, video de hero, posters y assets de campaña. Los dos PNG existentes se comprobaron como imágenes de 1×1 px, aunque sus nombres anuncian 192 y 512; no son material reutilizable de calidad. `public/icon.svg:1–6` sí contiene el símbolo vectorial completo.

**Por producir:** escenas HTML/SVG con datos ilustrativos; capturas reales de una instancia de prueba sin contenido privado; un fondo audiovisual breve opcional; poster estático y recorte móvil; imagen social de la landing. El documento de dirección creativa detalla usos y prompts. Ninguna imagen de interfaz generada con IA debe sustituir la evidencia del producto real.

## 9. Decisiones resueltas y pendientes

**Resueltas como propuesta de esta entrega:** mantener branding; centrar la historia en reuniones y fuentes; CTA `/signup`; reutilizar la estructura de rutas; ejemplos etiquetados; motion subordinado a comprensión; landing útil sin video externo.

**Pendientes que no impiden preparar la landing:** validar prioridad comercial de audiencia, decidir si habrá planes de venta, seleccionar assets finales y confirmar formato académico del profesor. No deben rellenarse con cifras, testimonios ni decisiones comerciales atribuidas al usuario.

**Antes de abrir un servicio público real:** el responsable del proyecto deberá validar el entorno, proveedores de IA/transcripción, transporte de correo, condiciones comerciales y páginas legales. Esta revisión de producto no declara que dichos pendientes estén resueltos ni sustituye la revisión técnica de ejecución.
