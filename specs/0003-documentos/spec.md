# Spec 0003 — Documentos

> **Estado:** Implementada · **Fecha:** 2026-08-21 · **Retroactiva**
> **Depende de:** [0001](../0001-autenticacion-y-workspaces/spec.md), [0008](../0008-procesamiento-asincrono/spec.md)

## Problema

La gente acumula PDFs, informes y apuntes que leyó una vez. Meses después
recuerda que "algo decía sobre esto", pero no en cuál de los cuarenta archivos ni
en qué página. Abrir uno por uno no escala.

## Resultado esperado

Subir un documento y olvidarse de dónde quedó. Cuando haga falta, se busca por lo
que decía —no por su nombre— y KnowHub abre la página exacta.

## Alcance

**Dentro:**
- Subida de PDF, DOCX, Markdown y texto plano
- Arrastrar y soltar, con progreso real
- Extracción de texto conservando la página
- Resumen y temas automáticos
- Indexación para búsqueda y preguntas
- Ver el contenido extraído y descargar el original
- Reprocesar y eliminar

**Fuera** (y por qué):
- OCR de PDFs escaneados — requiere otra clase de proveedor; se rechaza el
  archivo explicando por qué, en vez de indexar un documento vacío
- PPTX, XLSX, Google Drive — el parser es una frontera abierta; añadirlos es
  implementar una interfaz, no rediseñar
- Edición del documento — KnowHub recuerda, no edita

## Requisitos

| # | Requisito | Prioridad |
| --- | --- | --- |
| R1 | El usuario puede subir PDF, DOCX, MD y TXT | P0 |
| R2 | El texto se extrae y queda buscable | P0 |
| R3 | Una cita de documento identifica la página cuando el formato la tiene | P0 |
| R4 | El usuario ve el estado del procesamiento por etapas | P0 |
| R5 | El original se conserva y puede descargarse | P0 |
| R6 | El sistema resume el documento y extrae sus temas | P1 |
| R7 | El usuario puede preguntar acotando a un documento | P1 |
| R8 | El usuario puede reprocesar un documento fallido | P1 |
| R9 | Subir muestra progreso real, no una animación indefinida | P2 |

## Reglas de negocio e invariantes

- **El tipo de archivo lo deciden los bytes, no la extensión ni el MIME
  declarado** (constitución VIII). Un ejecutable renombrado a `.pdf` se rechaza.
- El archivo se guarda con una ruta derivada de ids verificados. El nombre que
  puso el usuario nunca forma parte de la ruta.
- **Un PDF sin capa de texto se rechaza con su motivo.** Indexarlo vacío sería
  peor: aparecería en la biblioteca fingiendo estar disponible.
- El resumen es un extra: si el proveedor de IA falla, la ingesta se completa
  igual y el documento queda buscable.
- Reprocesar reemplaza los fragmentos en una transacción. Nunca los duplica.
- Los límites de plan se comprueban **antes** de guardar, contando tanto el
  número de documentos como los bytes que entran.

## Criterios de aceptación

- [x] **Dado** un Markdown válido, **cuando** se sube, **entonces** queda
      procesado, embebido y aparece en resultados de búsqueda por su contenido
- [x] **Dado** un archivo cuyos bytes contradicen su extensión, **cuando** se
      sube, **entonces** se rechaza y no se crea ningún documento
- [x] **Dado** un archivo con extensión no soportada, **cuando** se sube,
      **entonces** se rechaza indicando los formatos aceptados
- [x] **Dado** un PDF escaneado sin texto, **cuando** se procesa, **entonces** se
      informa que no hay texto seleccionable y que no hay OCR
- [x] **Dado** un documento subido, **cuando** se consulta el uso del workspace,
      **entonces** cuenta en documentos y en almacenamiento
- [x] **Dado** una cita de documento, **cuando** se abre, **entonces** el
      fragmento citado queda resaltado en pantalla

## Casos límite y fallos

| Situación | Comportamiento esperado |
| --- | --- |
| Archivo vacío | Se rechaza antes de guardarlo |
| Excede el tamaño máximo | Se rechaza indicando el máximo |
| Excede el límite del plan | Se rechaza indicando qué límite y de qué plan |
| Falla la extracción | El original se conserva y se puede descargar; se ofrece reprocesar |
| Falla el resumen | El documento queda igualmente completo y buscable |
| Fallan los embeddings | Sigue disponible y encontrable por palabras |
| Se corta la conexión al subir | Se informa; no queda un documento a medias |

## Verificación de la constitución

| Principio | Cómo lo cumple |
| --- | --- |
| I. Evidencia | Los fragmentos conservan su página; la cita abre y resalta el fragmento exacto |
| VI. Degradar | Resumen y embeddings pueden fallar sin perder el documento |
| VIII. Nada privado en claro | Almacenamiento privado, URLs firmadas, validación por *magic bytes*, rutas derivadas de ids |
| X. Verdad | El progreso de subida es real (XHR); un PDF escaneado se rechaza en vez de fingir |

## Estado de implementación

| Requisito | Código | Prueba |
| --- | --- | --- |
| R1, R5 | [`server/documents/index.ts`](../../src/server/documents/index.ts), [`api/documents/upload`](../../src/app/api/documents/upload/route.ts) | `tests/integration/knowledge-pipeline.test.ts`, `e2e/knowledge.spec.ts` |
| R2, R3 | [`server/documents/parsers/`](../../src/server/documents/parsers/), `chunkPages()` | `tests/unit/chunking.test.ts` |
| R4, R8 | Estados `processing_status` / `embedding_status` | `tests/integration/knowledge-pipeline.test.ts` |
| R6 | `summarizeDocument()` | — |
| Validación | [`server/documents/validation.ts`](../../src/server/documents/validation.ts) | `tests/unit/file-validation.test.ts` |
| R9 | [`features/library/upload-dialog.tsx`](../../src/features/library/upload-dialog.tsx) | — |

## Limitaciones conocidas

- Sin OCR.
- DOCX no tiene paginación en el archivo: se reporta como una sola página y la
  cita referencia el extracto, no un número de página.
