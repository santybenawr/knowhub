# Spec 0002 — Proyectos y biblioteca

> **Estado:** Implementada · **Fecha:** 2026-08-21 · **Retroactiva**
> **Depende de:** [0001](../0001-autenticacion-y-workspaces/spec.md)

## Problema

Un documento, una nota y una reunión son cosas distintas para el sistema, pero
para la persona son lo mismo: cosas que guardó y quiere volver a encontrar. Si
cada tipo vive en su propia lista, el usuario tiene que recordar *dónde* guardó
algo antes de poder buscarlo — que es exactamente el problema que KnowHub existe
para eliminar.

## Resultado esperado

Una sola lista con todo lo capturado, ordenada por lo más reciente, filtrable por
tipo y por tema. Y una forma de agrupar por tema —el proyecto— que además acota
las búsquedas y las preguntas.

## Alcance

**Dentro:**
- Proyectos: crear, editar, archivar, eliminar
- Biblioteca unificada sobre documentos, notas y reuniones
- Filtros por tipo y por proyecto, reflejados en la URL
- Conteo de recursos por proyecto
- Preguntar acotado a un proyecto

**Fuera** (y por qué):
- Etiquetas libres — el proyecto cubre la necesidad de agrupar en el MVP; las
  etiquetas añaden una segunda taxonomía que hay que mantener
- Carpetas anidadas — la jerarquía profunda es trabajo de organización que el
  producto promete evitar
- Vista de calendario o línea de tiempo

## Requisitos

| # | Requisito | Prioridad |
| --- | --- | --- |
| R1 | El usuario ve documentos, notas y reuniones en una sola lista | P0 |
| R2 | La lista se ordena por recencia, mezclando los tres tipos correctamente | P0 |
| R3 | El usuario puede filtrar por tipo de recurso | P0 |
| R4 | El usuario puede crear proyectos y asignarles recursos | P1 |
| R5 | El usuario puede filtrar la biblioteca por proyecto | P1 |
| R6 | Cada proyecto muestra cuántos recursos de cada tipo contiene | P1 |
| R7 | El usuario puede preguntar acotando a un proyecto | P1 |
| R8 | Los filtros quedan en la URL, para compartir o volver | P2 |

## Reglas de negocio e invariantes

- **El orden por recencia debe ser correcto entre tipos.** Traer cada tabla por
  separado y mezclar en memoria rompe la paginación: el elemento número 61 podría
  ser más reciente que el 60.
- Un proyecto solo puede contener recursos de su mismo workspace. Un `projectId`
  que llega del cliente se valida contra el workspace verificado.
- Eliminar un proyecto no elimina su contenido: los recursos quedan sin proyecto.
  El agrupamiento es una vista, no una jerarquía de propiedad.
- Un recurso que todavía se está procesando aparece en la lista con su estado
  real, no oculto hasta estar listo.

## Criterios de aceptación

- [x] **Dado** un workspace con los tres tipos de recurso, **cuando** el usuario
      abre la biblioteca, **entonces** los ve mezclados y ordenados por recencia
- [x] **Dado** un filtro por tipo, **cuando** se aplica, **entonces** solo
      aparecen recursos de ese tipo y la URL lo refleja
- [x] **Dado** un proyecto con recursos, **cuando** se listan los proyectos,
      **entonces** los conteos por tipo son exactos
- [x] **Dado** un proyecto de otro workspace, **cuando** se intenta asignar un
      recurso, **entonces** se rechaza
- [x] **Dado** un proyecto vacío, **cuando** se abre, **entonces** se explica qué
      poner ahí en vez de mostrar una lista vacía

## Casos límite y fallos

| Situación | Comportamiento esperado |
| --- | --- |
| Biblioteca vacía | Se explica qué hacer, con accesos directos a las tres formas de capturar |
| Recurso en proceso | Aparece con la etiqueta "Procesando…" |
| Recurso con procesamiento fallido | Aparece marcado, no se oculta |
| Nota sin título | Se muestra como "Nota sin título" |
| Proyecto eliminado con recursos dentro | Los recursos siguen existiendo, sin proyecto |

## Verificación de la constitución

| Principio | Cómo lo cumple |
| --- | --- |
| IV. Aislamiento | La consulta unificada filtra por `workspace_id` dentro del SQL; los `projectId` se validan contra el workspace verificado |
| X. Verdad | Los recursos en proceso o fallidos se muestran con su estado real |

## Estado de implementación

| Requisito | Código | Prueba |
| --- | --- | --- |
| R1, R2, R3, R5 | [`server/library/`](../../src/server/library/) — UNION en SQL para ordenar entre tipos | `tests/integration/knowledge-pipeline.test.ts` |
| R4, R6 | [`server/projects/`](../../src/server/projects/) | `tests/integration/knowledge-pipeline.test.ts` |
| R7 | [`features/ask/`](../../src/features/ask/) con alcance de proyecto | — |
| R8 | [`features/library/library-filters.tsx`](../../src/features/library/library-filters.tsx) | — |

## Nota de implementación

Los conteos por proyecto usan subconsultas correlacionadas escritas como SQL
literal con alias propios. Interpolar columnas de Drizzle dentro de una plantilla
`sql` genera nombres **sin calificar** (`where "project_id" = "id"`), que se
resuelven contra la tabla interna y devuelven cero en silencio. Está comentado en
el código porque es una trampa fácil de repetir.

## Limitaciones conocidas

- Sin etiquetas libres ni jerarquía de carpetas.
- La biblioteca trae hasta 60 recursos; no hay paginación incremental.
