# Spec 0006 — Inteligencia de reuniones

> **Estado:** Implementada · **Fecha:** 2026-08-21 · **Retroactiva**
> **Depende de:** [0005](../0005-captura-de-reuniones/spec.md), [0008](../0008-procesamiento-asincrono/spec.md)
> **Función insignia**

## Problema

Tener el audio de una reunión no es tenerla resuelta. Nadie vuelve a escuchar
cuarenta y tres minutos para encontrar en qué minuto se decidió algo. Y un
resumen automático sin forma de verificarlo es peor que no tenerlo: hay que
confiar en él para tomar decisiones reales.

## Resultado esperado

Después de una reunión, las decisiones y los pendientes están ahí — y cada uno
lleva a los segundos exactos donde se dijeron, para poder comprobarlos en dos
clics.

## Alcance

**Dentro:**
- Transcripción con segmentos y marcas de tiempo reales
- Separación de hablantes cuando el proveedor la ofrece
- Renombrar hablantes
- Extracción de resumen, temas, decisiones, pendientes, preguntas abiertas
- Evidencia obligatoria: cada dato apunta a los segmentos que lo sustentan
- Navegación desde cualquier dato al momento del audio
- Sincronía entre reproductor y transcripción
- Preguntar sobre una reunión concreta

**Fuera** (y por qué):
- Asistente durante la reunión en vivo — otra clase de producto
- Traducción automática
- Detección de sentimiento o métricas de participación — invitan a conclusiones
  que la evidencia no sostiene
- Edición destructiva de la transcripción — el audio es la fuente de verdad

## Requisitos

| # | Requisito | Prioridad |
| --- | --- | --- |
| R1 | El audio se transcribe en segmentos con inicio y fin reales | P0 |
| R2 | Se extraen decisiones, cada una con los segmentos que la sustentan | P0 |
| R3 | Se extraen pendientes, con responsable y fecha **solo si se dijeron** | P0 |
| R4 | Cada dato extraído lleva al momento exacto del audio | P0 |
| R5 | Al reproducir, se resalta el segmento en curso | P0 |
| R6 | El usuario puede preguntar sobre la reunión y recibe citas con timestamp | P0 |
| R7 | Los hablantes se separan cuando el proveedor lo permite | P1 |
| R8 | El usuario puede renombrar un hablante y el cambio se refleja en todo | P1 |
| R9 | Se extraen resumen, temas y preguntas abiertas | P1 |
| R10 | Un enlace `?t=` abre la reunión en ese segundo | P1 |
| R11 | El usuario ve el progreso por etapas y puede reintentar la que falle | P1 |

## Reglas de negocio e invariantes

Estas son las que definen el producto. Romper una es romper la propuesta.

- **Nada se afirma sin evidencia** (constitución I). Decisiones, pendientes y
  puntos clave referencian segmentos concretos. Los ids que el modelo invente y
  no existan en la transcripción **se descartan antes de guardar**.
- **La ausencia se declara** (constitución III). Sin responsable dicho,
  `responsable = null` y la pantalla dice "Responsable no especificado". Igual con
  las fechas. Estos campos son opcionales en el esquema *a propósito*: no se pone
  al modelo en la posición de tener que rellenar un campo obligatorio.
- **Nunca se inventa un hablante.** Sin diarización, los segmentos van sin
  hablante. Un hablante sin nombre se muestra como "Hablante 1", que es una
  posición, no una identidad.
- **Renombrar no toca la transcripción.** El nombre vive en un mapeo aparte y se
  resuelve al leer, así que es reversible y sobrevive a un reprocesamiento.
- **Los timestamps sobreviven al fragmentado.** Cada fragmento guarda su inicio,
  su fin, sus hablantes y sus ids de segmento. Perderlos convertiría una cita en
  "en algún punto de 43 minutos", que no es evidencia.
- **Un timestamp citado se deriva del fragmento recuperado**, nunca se genera.
- Reprocesar reemplaza en una transacción: jamás duplica segmentos ni fragmentos.
- Si falla la transcripción, **el audio no se borra** (constitución VI).

## Criterios de aceptación

- [x] **Dado** una transcripción importada, **cuando** termina el proceso,
      **entonces** hay segmentos con tiempos crecientes y no solapados
- [x] **Dado** una reunión donde se decidió algo, **cuando** se abre Decisiones,
      **entonces** aparece la decisión con un botón "Fuente · mm:ss"
- [x] **Dado** un pendiente donde alguien se comprometió en primera persona,
      **cuando** se muestra, **entonces** aparece esa persona como responsable
- [x] **Dado** un pendiente sin responsable dicho, **cuando** se muestra,
      **entonces** dice "Responsable no especificado" — nunca un nombre inferido
- [x] **Dado** un dato extraído, **cuando** se pulsa su fuente, **entonces** el
      reproductor salta a ese segundo
- [x] **Dado** que el audio avanza, **cuando** entra en un segmento, **entonces**
      ese segmento se resalta
- [x] **Dado** un hablante renombrado, **cuando** se reprocesa la reunión,
      **entonces** el nombre se conserva
- [x] **Dado** una pregunta sobre la reunión, **cuando** se responde, **entonces**
      la cita enlaza a `/meetings/{id}?t=<segundo>`
- [x] **Dado** ids de evidencia inexistentes, **cuando** se guarda el análisis,
      **entonces** se descartan
- [x] **Dado** que la transcripción falla, **cuando** se consulta, **entonces**
      el audio sigue disponible y reproducible

## Casos límite y fallos

| Situación | Comportamiento esperado |
| --- | --- |
| Falla la transcripción | El audio se conserva. Se ofrece reintentar, escuchar o eliminar |
| Transcripción bien, análisis mal | Se muestra la transcripción y se ofrece "Volver a analizar" |
| Fallan los embeddings | La reunión se abre y se reproduce; se avisa que la búsqueda inteligente no está lista |
| Reunión sin decisiones | Se dice que no se identificaron decisiones explícitas. No se fabrica una |
| Reunión sin pendientes | Igual |
| Sin diarización | Segmentos sin hablante; nunca inventado |
| Un solo hablante | Sin sección de hablantes |
| Transcripción muy larga | Se acota lo que se envía al modelo por presupuesto de contexto |
| Proveedor de transcripción local | Banner en pantalla: el texto no corresponde al audio |

## Verificación de la constitución

| Principio | Cómo lo cumple |
| --- | --- |
| I. Evidencia | Cada dato lleva `evidenceSegmentIds`; los inválidos se podan; la cita salta al segundo |
| III. Ausencia declarada | `responsible` y `deadline` nullables por diseño; la interfaz lo dice |
| VI. Degradar | Tres etapas independientes; la transcripción fallida nunca borra el audio |
| VII. Proveedores | Diarización solo si el proveedor la ofrece; el modo local se anuncia |

## Estado de implementación

| Requisito | Código | Prueba |
| --- | --- | --- |
| R1, R7 | [`server/transcription/`](../../src/server/transcription/), [`server/meetings/transcript.ts`](../../src/server/meetings/transcript.ts) | `tests/integration/meeting-pipeline.test.ts` |
| R2, R3, R9 | `analyzeMeeting()` + [`validations/meeting-analysis.ts`](../../src/validations/meeting-analysis.ts) | `tests/unit/meeting-analysis-schema.test.ts`, `tests/integration/meeting-pipeline.test.ts` |
| Poda de evidencia | `pruneAnalysisEvidence()` | `tests/unit/meeting-analysis-schema.test.ts` |
| R4, R5, R10 | [`features/meetings/meeting-workspace.tsx`](../../src/features/meetings/meeting-workspace.tsx), `parseTimeParam()` | `tests/unit/time.test.ts`, `e2e/meetings.spec.ts` |
| R6 | Alcance de reunión en el RAG | `tests/integration/meeting-pipeline.test.ts` |
| R8 | `renameSpeaker()` + resolución al leer | `tests/integration/meeting-pipeline.test.ts` |
| R11 | Estados por etapa + `retryStageAction` | `tests/integration/meeting-failures.test.ts` |
| Fragmentado con tiempos | `chunkTranscriptSegments()` | `tests/unit/chunking.test.ts` |

## Limitaciones conocidas

- La diarización depende del proveedor. Whisper no la ofrece.
- El proveedor local de transcripción no decodifica audio: devuelve un guion de
  ejemplo, y la interfaz lo dice. Para contenido real sin proveedor, la vía es
  importar la transcripción.
- Sin traducción ni métricas de participación.
