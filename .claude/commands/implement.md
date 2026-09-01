---
description: Implementa las tareas de una spec, verificando en cada paso
argument-hint: <número de spec, ej. 0009>
---

Implementa `specs/$ARGUMENTS-*/tasks.md`.

## Cómo trabajar

1. Lee la spec, el plan y las tareas. Los tres.
2. Trabaja tarea por tarea, en orden.
3. Después de cada tarea, ejecuta su comando de verificación. Si falla:
   identifica la causa, arréglala, vuelve a ejecutar. No pases a la siguiente
   con algo en rojo.
4. Marca la tarea `[x]` en `tasks.md` cuando esté verificada de verdad.

## Reglas

- **La spec manda.** Si al implementar descubres que la spec pide algo imposible
  o contradictorio, para y dímelo. No la reinterpretes en silencio para poder
  seguir.
- No amplíes el alcance. Lo que la spec dejó fuera, se queda fuera; si aparece
  algo que vale la pena, anótalo como spec futura.
- Escribe código que se lea como el que lo rodea: mismas convenciones, misma
  densidad de comentarios, mismos idiomas (código en inglés, texto de interfaz
  en español).
- Los comentarios explican **por qué**, no qué. Si el qué no se entiende, el
  problema es el código.
- Antes de dar por terminado: `pnpm lint && pnpm typecheck && pnpm test`, y
  `pnpm test:e2e` si tocaste un flujo de usuario.

## Al terminar

1. Verifica cada criterio de aceptación de la spec contra el producto real, no
   contra tu memoria de lo que escribiste.
2. Actualiza el estado de la spec a **Implementada** y añade la sección "Estado
   de implementación" con enlaces al código y a las pruebas que la cubren.
3. Actualiza `CLAUDE.md` o `docs/` si cambió algún contrato.
4. Repórtame qué quedó hecho, qué verificaste y qué no.
