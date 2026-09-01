# Spec 0005 — Captura de reuniones

> **Estado:** Implementada · **Fecha:** 2026-08-21 · **Retroactiva**
> **Depende de:** [0001](../0001-autenticacion-y-workspaces/spec.md)
> **Continúa en:** [0006 — Inteligencia de reuniones](../0006-inteligencia-de-reuniones/spec.md)

## Problema

En una reunión hay que elegir entre participar y tomar notas. Quien toma notas se
pierde la conversación; quien participa pierde el detalle. Y lo que se pierde no
es el resumen: es quién se comprometió a qué, y cuándo se dijo.

## Resultado esperado

Pulsar un botón al empezar y otro al terminar. Nada más. El audio queda guardado
y el sistema se encarga del resto.

## Alcance

**Dentro:**
- Grabación desde el navegador, con pausa y reanudación
- Subida de grabaciones existentes
- Importación de transcripciones en texto
- Almacenamiento privado del audio
- Reproductor con búsqueda de posición y velocidad
- Aviso de consentimiento antes de la primera grabación

**Fuera** (y por qué):
- Grabación garantizada en segundo plano — el navegador puede suspender la
  pestaña; prometerlo sería mentir (constitución X)
- Transcripción en vivo durante la reunión — el MVP no la necesita y añade una
  clase entera de complejidad
- Grabar audio del sistema o de otros participantes en una videollamada —
  requiere una extensión o app nativa
- App nativa — el backend queda listo para que exista después

## Requisitos

| # | Requisito | Prioridad |
| --- | --- | --- |
| R1 | El usuario puede grabar una reunión desde el navegador | P0 |
| R2 | El usuario puede pausar y reanudar sin perder lo grabado | P0 |
| R3 | El audio queda guardado de forma privada | P0 |
| R4 | El usuario puede subir una grabación hecha en otra aplicación | P0 |
| R5 | El usuario puede importar una transcripción en texto | P0 |
| R6 | El usuario puede reproducir el audio y moverse por él | P0 |
| R7 | Se muestra un aviso de consentimiento antes de la primera grabación | P0 |
| R8 | Si el navegador no soporta grabar, se ofrecen las alternativas | P0 |
| R9 | Se ve el tiempo transcurrido mientras graba | P1 |
| R10 | Se indica que el micrófono está captando | P2 |

## Reglas de negocio e invariantes

- **La reunión existe desde antes de grabar.** Si la sesión se interrumpe, hay
  dónde adjuntar el audio capturado en vez de perderlo.
- **El reloj solo avanza mientras se captura.** El tiempo en pausa no cuenta.
- Nunca dos grabaciones simultáneas en la misma sesión.
- El audio se captura por fragmentos, no en un solo búfer: una reunión de dos
  horas no puede vivir entera en memoria.
- Los fragmentos que llegan *después* de pulsar Finalizar se conservan: el
  navegador vacía su búfer al detener y descartarlos truncaría el final.
- **Reemplazar el audio de una reunión borra el objeto anterior.** Si no, el
  almacenamiento se llena de huérfanos que nadie puede ver ni eliminar.
- El formato del contenedor se detecta preguntándole al navegador qué soporta.
  No se asume que todos produzcan lo mismo.
- Antes de salir de la página grabando, se advierte.
- **KnowHub no obtiene consentimientos.** El aviso dice que la responsabilidad es
  de quien graba, y no afirma cumplimiento legal.

## Criterios de aceptación

- [x] **Dado** el permiso concedido, **cuando** graba, pausa, reanuda y finaliza,
      **entonces** el audio se guarda con la duración correcta sin contar la pausa
- [x] **Dado** que está grabando, **cuando** se intenta iniciar otra grabación,
      **entonces** se ignora
- [x] **Dado** que se pulsó Finalizar, **cuando** llega un último fragmento,
      **entonces** se incluye en el audio
- [x] **Dado** un navegador sin soporte, **cuando** se abre la grabación,
      **entonces** se ofrece subir o importar en vez de un botón inútil
- [x] **Dado** el permiso denegado, **cuando** ocurre, **entonces** se explica
      cómo concederlo
- [x] **Dado** una reunión con audio, **cuando** se sube otro audio, **entonces**
      el anterior deja de existir en el almacenamiento
- [x] **Dado** un archivo que no es audio, **cuando** se sube, **entonces** se
      rechaza
- [x] **Dado** una transcripción pegada con tiempos y nombres, **cuando** se
      importa, **entonces** se crean segmentos con esos tiempos y esos hablantes

## Casos límite y fallos

| Situación | Comportamiento esperado |
| --- | --- |
| Permiso de micrófono denegado | Mensaje con cómo concederlo y opción de reintentar |
| Sin micrófono conectado | Se dice eso exactamente |
| Micrófono ocupado por otra app | Se pide cerrarla |
| Grabación de duración cero | Se avisa que no se capturó audio; no se sube nada |
| Falla la subida | Se informa; se ofrece reintentar |
| Grabación interrumpida | Se conserva lo capturado **solo si de verdad se pudo guardar** |
| Excede la duración máxima del plan | Se rechaza indicando el límite |
| Navegación interna mientras graba | Se advierte antes de salir |

## Verificación de la constitución

| Principio | Cómo lo cumple |
| --- | --- |
| VI. Degradar | La reunión existe antes del audio; un fallo de subida no la destruye |
| VIII. Nada privado | Audio privado, ruta derivada de ids, URL firmada con expiración, validación por *magic bytes* |
| X. Verdad | Se advierte que el navegador puede suspender la captura; el aviso de consentimiento no promete cumplimiento legal |

## Estado de implementación

| Requisito | Código | Prueba |
| --- | --- | --- |
| R1, R2, R9, R10 | [`features/meetings/recording/`](../../src/features/meetings/recording/) | `tests/unit/recorder-machine.test.ts` (12 pruebas, sin hardware) |
| R3, R4 | `attachAudio()` en [`server/meetings/service.ts`](../../src/server/meetings/service.ts) | `tests/integration/meeting-failures.test.ts` |
| R5 | [`server/transcription/parse-transcript.ts`](../../src/server/transcription/parse-transcript.ts) | `tests/unit/transcript-parsing.test.ts` |
| R6 | [`features/meetings/audio-player.tsx`](../../src/features/meetings/audio-player.tsx) | `e2e/meetings.spec.ts` |
| R7 | Aviso en [`new-meeting-flow.tsx`](../../src/features/meetings/new-meeting-flow.tsx) | — |
| R8 | `isRecordingSupported()` | — |

La lógica de grabación es un reducer puro, separado de `MediaRecorder`, para que
el ciclo completo —incluidos los fallos difíciles de reproducir con hardware— se
pruebe en Node.

## Limitaciones conocidas

- La grabación en segundo plano en móvil no está garantizada.
- La subida es completa al final, no incremental durante la grabación. La captura
  por fragmentos deja la puerta abierta a hacerla incremental.
- Solo captura el micrófono, no el audio del sistema.
