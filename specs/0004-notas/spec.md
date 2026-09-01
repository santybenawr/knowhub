# Spec 0004 — Notas

> **Estado:** Implementada · **Fecha:** 2026-08-21 · **Retroactiva**
> **Depende de:** [0001](../0001-autenticacion-y-workspaces/spec.md), [0008](../0008-procesamiento-asincrono/spec.md)

## Problema

No todo lo que alguien quiere recordar viene en un archivo o en una grabación. A
veces es una idea de tres líneas escrita en el momento. Si esa idea acaba en una
app aparte, queda fuera del conocimiento buscable — y es justo la que más se
busca después.

## Resultado esperado

Escribir una nota es tan directo como en cualquier bloc, y esa nota entra al
mismo índice que todo lo demás: aparece en búsquedas y puede citarse en una
respuesta.

## Alcance

**Dentro:**
- Crear, editar y eliminar notas
- Autoguardado sin botón obligatorio
- Asignar a un proyecto
- Indexación automática para búsqueda y preguntas
- Contenido relacionado por similitud

**Fuera** (y por qué):
- Editor enriquecido (negritas, listas, tablas) — el valor está en recuperar el
  contenido, no en darle formato; texto plano se indexa mejor y se lee igual
- Colaboración en tiempo real — una nota tiene un autor en el MVP
- Historial de versiones

## Requisitos

| # | Requisito | Prioridad |
| --- | --- | --- |
| R1 | El usuario puede crear una nota con título y contenido | P0 |
| R2 | La nota se guarda sola mientras escribe | P0 |
| R3 | La nota queda buscable y citable | P0 |
| R4 | El usuario puede asignarla a un proyecto | P1 |
| R5 | El usuario ve si se guardó, si está guardando o si falló | P1 |
| R6 | El usuario puede eliminarla | P1 |
| R7 | La nota muestra contenido relacionado del workspace | P2 |

## Reglas de negocio e invariantes

- **El autoguardado no puede reindexar en cada tecla.** La nota se guarda al
  detenerse de escribir; la indexación (fragmentar + embeber) pasa por la cola de
  trabajos.
- **Cambiar solo el título no dispara reindexación.** El título forma parte del
  texto indexado, pero renombrar no justifica recalcular embeddings.
- Reindexar reemplaza los fragmentos en una transacción: el contenido viejo
  desaparece del índice.
- Una nota vacía no se crea: si el usuario abre el editor y se va sin escribir,
  no queda basura.
- El título se antepone al contenido al indexar: en notas cortas concentra buena
  parte de la señal de recuperación.

## Criterios de aceptación

- [x] **Dado** el editor con contenido, **cuando** el usuario deja de escribir,
      **entonces** se guarda sin pulsar nada y la URL pasa a la nota real
- [x] **Dado** una nota guardada, **cuando** termina la indexación, **entonces**
      aparece en búsquedas por su contenido
- [x] **Dado** una nota indexada, **cuando** se cambia su contenido y se
      reindexa, **entonces** el texto anterior ya no aparece en los fragmentos
- [x] **Dado** una nota indexada, **cuando** solo se cambia el título,
      **entonces** no se marca para reindexar
- [x] **Dado** una nota, **cuando** se pregunta algo que responde,
      **entonces** la respuesta la cita y el enlace la abre

## Casos límite y fallos

| Situación | Comportamiento esperado |
| --- | --- |
| Editor abierto y abandonado sin escribir | No se crea nada |
| Nota sin título | Se lista como "Nota sin título" |
| Falla el guardado | Se indica en pantalla; el texto no se pierde del editor |
| Fallan los embeddings | La nota existe y es editable; se indica que la búsqueda inteligente no está lista |
| Nota muy larga | Se fragmenta como un documento |

## Verificación de la constitución

| Principio | Cómo lo cumple |
| --- | --- |
| VI. Degradar | Un fallo de indexación no impide leer ni editar la nota |
| IX. Pruebas de comportamiento | Se prueba que reindexa al cambiar contenido y **no** al cambiar solo el título |

## Estado de implementación

| Requisito | Código | Prueba |
| --- | --- | --- |
| R1, R2, R4, R6 | [`server/notes/`](../../src/server/notes/), [`features/notes/note-editor.tsx`](../../src/features/notes/note-editor.tsx) | `tests/integration/knowledge-pipeline.test.ts`, `e2e/knowledge.spec.ts` |
| R3 | `indexNote()` vía cola de trabajos | `tests/integration/knowledge-pipeline.test.ts` |
| R5 | Indicador de estado en el editor | — |
| R7 | `findRelated()` en [`server/search/`](../../src/server/search/) | — |

## Limitaciones conocidas

- Texto plano, sin formato enriquecido.
- Sin historial de versiones ni colaboración simultánea.
