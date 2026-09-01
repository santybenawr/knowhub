# Spec 0008 — Procesamiento asíncrono

> **Estado:** Implementada · **Fecha:** 2026-08-21 · **Retroactiva**
> **Depende de:** ninguna · **Infraestructura transversal**

## Problema

Transcribir una reunión de una hora tarda minutos. Extraer texto de un PDF grande,
también. Si eso ocurre dentro de la petición HTTP, el usuario se queda mirando una
pantalla bloqueada y el navegador acaba cortando la conexión — perdiendo el
trabajo a medio hacer.

## Resultado esperado

Después de subir algo, la persona sigue usando KnowHub. El recurso aparece en su
biblioteca marcado como "Procesando…", y cuando termina, está listo. Si algo
falla, falla solo esa etapa y se puede reintentar sin repetir lo anterior.

## Alcance

**Dentro:**
- Cola de trabajos con reclamación segura
- Encadenamiento de etapas
- Estado por etapa, visible en la interfaz
- Reintentos acotados, solo para fallos transitorios
- Reintento manual de una etapa
- Idempotencia: reintentar nunca duplica
- Recuperación de trabajos huérfanos

**Fuera** (y por qué):
- Broker de mensajes (Kafka, Redis, SQS) — un servicio más que operar para una
  cola que ya cabe en una tabla
- Trabajos programados / recurrentes
- Prioridades entre trabajos

## Requisitos

| # | Requisito | Prioridad |
| --- | --- | --- |
| R1 | El trabajo largo no bloquea la petición HTTP | P0 |
| R2 | El usuario ve el estado real de cada etapa | P0 |
| R3 | Cada etapa falla de forma independiente | P0 |
| R4 | Reintentar una etapa no duplica su salida | P0 |
| R5 | El fallo de una etapa no destruye lo de las anteriores | P0 |
| R6 | Un fallo permanente no se reintenta en bucle | P0 |
| R7 | El usuario puede reintentar una etapa manualmente | P1 |
| R8 | Un trabajo huérfano se recupera | P1 |
| R9 | Encolar dos veces lo mismo no lo ejecuta dos veces | P1 |

## Reglas de negocio e invariantes

- **El trabajo se entrega a `after()` de Next.** Una promesa suelta no basta: al
  enviar la respuesta el entorno puede desmontar la invocación y el trabajo se
  quedaría en `pending` para siempre. *(Se descubrió al empaquetar la build de
  producción; en desarrollo no se manifestaba.)*
- **La reclamación es un UPDATE condicional** sobre `status = 'pending''`. Dos
  ejecutores no pueden tomar la misma fila.
- **Solo se reintenta lo transitorio.** Un formato rechazado o un archivo
  demasiado grande fallan igual siempre: se marcan como fallidos de inmediato.
- **Cada etapa reemplaza su salida en una transacción.** Ese es el mecanismo de
  idempotencia: borrar e insertar juntos, nunca acumular.
- Encolar algo que ya está pendiente o en proceso devuelve el trabajo existente.
- Un trabajo en `processing` demasiado tiempo vuelve a `pending`, hasta el máximo
  de intentos: un proceso que muere no debe dejar un recurso atascado.
- **Los estados que se muestran son los reales.** No hay porcentaje inventado
  cuando el proveedor no lo reporta (constitución X).

## Etapas

```
documento:  document_processing → document_embedding
nota:       note_embedding
reunión:    meeting_transcription → meeting_analysis → meeting_embedding
```

## Criterios de aceptación

- [x] **Dado** una subida de audio, **cuando** responde la petición, **entonces**
      ya volvió el control al usuario y el proceso sigue en segundo plano
- [x] **Dado** el proceso terminado, **cuando** se consulta, **entonces** cada
      etapa está completada y la reunión está lista
- [x] **Dado** una transcripción importada dos veces, **cuando** se consulta,
      **entonces** hay el mismo número de segmentos que la primera vez
- [x] **Dado** un fallo de transcripción, **cuando** se consulta, **entonces**
      esa etapa está fallida, con su motivo, y el audio sigue existiendo
- [x] **Dado** un fallo de análisis, **cuando** se reintenta con el proveedor ya
      disponible, **entonces** se completa sin repetir la transcripción
- [x] **Dado** un fallo de embeddings, **cuando** ocurre, **entonces** la reunión
      queda igualmente en estado listo
- [x] **Dado** el mismo trabajo encolado dos veces, **cuando** hay uno pendiente,
      **entonces** se devuelve ese mismo

## Casos límite y fallos

| Situación | Comportamiento esperado |
| --- | --- |
| Proceso muere a mitad | El trabajo vuelve a `pending` y se retoma |
| Fallo transitorio | Se reintenta hasta 3 veces |
| Fallo permanente | Se marca fallido de inmediato, con el motivo |
| Sin handler registrado | Se marca fallido diciendo exactamente eso |
| Fallo del recurso ajeno | El ejecutor valida la pertenencia antes de procesar |

## Verificación de la constitución

| Principio | Cómo lo cumple |
| --- | --- |
| VI. Degradar | Etapas independientes; ninguna destruye lo anterior; reemplazo transaccional |
| VIII. Autorización | El ejecutor valida la pertenencia del recurso antes de tocarlo |
| X. Verdad | Estados reales por etapa, sin porcentajes inventados |

## Estado de implementación

| Requisito | Código | Prueba |
| --- | --- | --- |
| R1, R8, R9 | [`server/jobs/index.ts`](../../src/server/jobs/index.ts) | `tests/integration/meeting-pipeline.test.ts` |
| R2, R3, R5, R7 | Columnas de estado por etapa + `retryStageAction` | `tests/integration/meeting-failures.test.ts` |
| R4 | Reemplazo transaccional en cada etapa | `tests/integration/meeting-pipeline.test.ts` |
| R6 | `isRetryable()` | — |
| Registro | [`server/jobs/register.ts`](../../src/server/jobs/register.ts) | — |

`drainJobs()` existe para que las pruebas esperen a que la cola se asiente sin
sondear con esperas arbitrarias.

## Limitaciones conocidas

- Los trabajos corren en el mismo proceso que sirve la aplicación. Bajo carga
  alta convendría un ejecutor aparte; la tabla ya lo permitiría sin cambiar el
  modelo.
- Sin prioridades ni programación diferida.
