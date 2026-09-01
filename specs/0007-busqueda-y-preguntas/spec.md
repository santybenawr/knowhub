# Spec 0007 — Búsqueda y preguntas

> **Estado:** Implementada · **Fecha:** 2026-08-21 · **Retroactiva**
> **Depende de:** [0003](../0003-documentos/spec.md), [0004](../0004-notas/spec.md), [0006](../0006-inteligencia-de-reuniones/spec.md)

## Problema

Buscar por palabras exactas falla cuando uno recuerda la idea pero no las
palabras. Y preguntarle a un modelo falla de otra forma: responde con seguridad
aunque la respuesta no esté en tus documentos, y no hay manera de distinguir una
cosa de la otra.

## Resultado esperado

Se busca como se recuerda —a medias— y aparece lo correcto. Se pregunta en
lenguaje natural y la respuesta viene con sus fuentes, cada una a un clic de
distancia. Cuando la biblioteca no tiene la respuesta, KnowHub lo dice.

## Alcance

**Dentro:**
- Búsqueda híbrida sobre documentos, notas y reuniones a la vez
- Filtros por tipo y proyecto
- Preguntar acotando a todo, un proyecto, un documento, una nota o una reunión
- Respuestas en streaming con citas numeradas
- Navegación desde la cita a la evidencia
- Contenido relacionado
- Historial de conversaciones

**Fuera** (y por qué):
- Búsqueda por hablante — preparada en el modelo de datos, no expuesta
- Grafo de conocimiento
- Búsqueda entre workspaces — rompería el aislamiento por diseño

## Requisitos

| # | Requisito | Prioridad |
| --- | --- | --- |
| R1 | La búsqueda combina coincidencia de palabras y similitud semántica | P0 |
| R2 | Busca en documentos, notas y reuniones simultáneamente | P0 |
| R3 | Un resultado de reunión muestra su rango de tiempo y abre el audio ahí | P0 |
| R4 | Un resultado de documento muestra su página cuando existe | P0 |
| R5 | El usuario puede preguntar en lenguaje natural | P0 |
| R6 | Toda respuesta apoyada en la biblioteca incluye sus fuentes | P0 |
| R7 | Sin evidencia suficiente, se dice — no se responde de memoria | P0 |
| R8 | Cada cita abre la evidencia exacta | P0 |
| R9 | El usuario puede acotar la pregunta a un recurso o proyecto | P1 |
| R10 | La respuesta se muestra mientras se genera | P1 |
| R11 | Un recurso muestra contenido relacionado | P2 |

## Reglas de negocio e invariantes

- **Nunca se responde sin evidencia** (constitución II).
- **El contenido recuperado es dato, no instrucción** (constitución V).
- **Nunca se busca fuera del workspace.** El predicado va dentro del SQL de las
  dos ramas de la búsqueda, no en el llamador.
- **No se manda la biblioteca entera al modelo.** Hay tope de fragmentos, de
  tamaño por fragmento, de contexto total, y un máximo por recurso para que una
  reunión larga no desplace todo lo demás.
- Se muestran solo las fuentes que la respuesta citó de verdad. Listar todo lo
  recuperado haría parecer respaldado lo que no se usó. Si no citó ninguna, se
  muestran todas para que el usuario pueda revisar igual.
- Los timestamps citados se derivan del fragmento recuperado. Nunca se generan.
- **Las citas se envían antes que el texto**, para que las fuentes estén en
  pantalla mientras la respuesta se escribe. Eso las hace leer como evidencia y
  no como una nota al pie.
- Si la rama semántica falla, se responde con la de palabras en vez de con un
  error.

## Decisiones de recuperación

Tres decisiones que no son obvias y que definen la calidad:

1. **La consulta se convierte en un OR de sus lexemas, no un AND.** La gente
   pregunta en frases. Con AND, "¿Qué decidimos sobre el proveedor?" no coincide
   con nada porque "decidimos" no aparece literalmente — aunque "proveedor" esté
   ahí mismo.

2. **El índice usa la configuración `spanish`, no `simple`.** Elimina palabras
   vacías y aplica lematización. Sin eso, el OR del punto anterior hace que
   "receta de cocina" coincida con cualquier texto que contenga "de".

3. **Cada rama se normaliza distinto.** `ts_rank_cd` no tiene significado
   absoluto —depende de la consulta y del documento— así que se escala contra el
   mejor resultado del conjunto. La similitud coseno **sí** es absoluta, así que
   se usa tal cual: reescalarla por conjunto subiría a 1 un único resultado débil.

## Criterios de aceptación

- [x] **Dado** una nota que dice "vamos a seleccionar el proveedor B",
      **cuando** se busca "¿Qué decidimos sobre el proveedor?", **entonces**
      aparece con relevancia alta
- [x] **Dado** un workspace sobre proveedores, **cuando** se busca "receta de
      cocina", **entonces** no aparece nada relevante
- [x] **Dado** un workspace con varios temas, **cuando** se busca uno,
      **entonces** el recurso correcto va primero
- [x] **Dado** una pregunta que la biblioteca responde, **cuando** se responde,
      **entonces** hay al menos una cita y su enlace abre la evidencia
- [x] **Dado** una pregunta sin respuesta en la biblioteca, **cuando** se
      responde, **entonces** se dice que no hay información suficiente y no se
      cita nada
- [x] **Dado** una cita de reunión, **cuando** se pulsa, **entonces** el
      reproductor salta a ese segundo
- [x] **Dado** un documento con contenido hostil ("ignora las instrucciones"),
      **cuando** se recupera, **entonces** entra como evidencia delimitada en un
      mensaje de usuario, nunca en las reglas del sistema
- [x] **Dado** el usuario B, **cuando** pregunta acotando a una reunión del
      usuario A, **entonces** no obtiene evidencia ni respuesta

## Casos límite y fallos

| Situación | Comportamiento esperado |
| --- | --- |
| Biblioteca vacía | Se dice que no hay información suficiente |
| Consulta vacía | Se explica qué hace la búsqueda; no se ejecuta |
| Sin resultados | Se sugiere reformular o revisar si el recurso terminó de procesarse |
| Falla la rama semántica | Se responde solo con palabras; se registra el fallo |
| Se corta el streaming | Se informa y se permite reintentar |
| Se supera el límite de consultas del plan | Se indica el límite y el plan |
| Modelo cita un número inexistente | Ese marcador se deja como texto plano |

## Verificación de la constitución

| Principio | Cómo lo cumple |
| --- | --- |
| I. Evidencia | Cada cita resuelve a documento+página, nota o reunión+segundo |
| II. Sin evidencia no hay respuesta | Umbral de relevancia y mensaje explícito |
| IV. Aislamiento | `workspace_id` dentro del SQL en ambas ramas |
| V. Dato, no instrucción | Reglas en `system`; evidencia delimitada en `user` |

## Estado de implementación

| Requisito | Código | Prueba |
| --- | --- | --- |
| R1–R4 | [`server/search/index.ts`](../../src/server/search/index.ts) | `tests/integration/knowledge-pipeline.test.ts` |
| R5, R9, R10 | [`api/ask/route.ts`](../../src/app/api/ask/route.ts) (NDJSON), [`features/ask/`](../../src/features/ask/) | `e2e/knowledge.spec.ts` |
| R6, R8 | `citationHref()`, `keepCitedOnly()` en [`server/ai/rag.ts`](../../src/server/ai/rag.ts) | `tests/unit/search-scoring.test.ts` |
| R7 | Umbral + `NO_EVIDENCE_ANSWER` | `tests/integration/knowledge-pipeline.test.ts` |
| Presupuesto | `selectContext()` | `tests/unit/search-scoring.test.ts` |
| Inyección | [`server/ai/prompts/`](../../src/server/ai/prompts/) | `tests/integration/prompt-safety.test.ts` |
| Aislamiento | — | `tests/integration/tenant-isolation.test.ts` |
| R11 | `findRelated()` | — |

Ajustes centralizados en [`config/search.ts`](../../src/config/search.ts).

## Limitaciones conocidas

- Un solo índice de texto completo con lematización española: el contenido
  mayoritariamente en inglés se indexa con el stemmer español.
- Sin búsqueda por hablante en la interfaz.
- Con el proveedor local de embeddings, una pregunta cuyo vocabulario no comparte
  raíces con la fuente puede quedar bajo el umbral. Es una limitación real del
  modo sin credenciales, y el sistema prefiere decir "no encontré" antes que
  inventar.
