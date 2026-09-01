---
description: Descompone un plan aprobado en tareas verificables
argument-hint: <número de spec, ej. 0009>
---

Descompón el plan de `specs/$ARGUMENTS-*/plan.md` en tareas ejecutables.

## Reglas

- **Cada tarea deja el repositorio en verde.** Si una tarea rompe el build y la
  siguiente lo arregla, están mal cortadas: júntalas.
- Ordena por verificabilidad, no por minimizar pasos. Prefiero seis tareas que
  puedo comprobar a tres que no.
- Cada tarea nombra los archivos que toca y el comando exacto que la verifica.
- Las pruebas van **en la misma tarea** que el código que prueban, nunca en una
  tarea "escribir tests" al final.
- Completa la tabla de trazabilidad: ningún requisito sin tarea, ninguna tarea
  sin requisito. Si sobra una tarea, o falta un requisito en la spec, o la tarea
  no hace falta.

## Qué producir

`specs/$ARGUMENTS-*/tasks.md` a partir de `.specify/templates/tasks.md`.

Muéstrame la lista y la tabla de trazabilidad antes de implementar.
