---
description: Escribe la especificación de una función nueva, antes de cualquier código
argument-hint: <descripción de la función>
---

Vas a escribir una especificación para KnowHub. **No escribas código en este paso.**

Función solicitada: $ARGUMENTS

## Antes de escribir

1. Lee `.specify/constitution.md`. Es vinculante.
2. Lee `specs/README.md` para ver el índice y elegir el siguiente número.
3. Revisa las specs existentes relacionadas: si esta función toca un módulo ya
   especificado, la nueva spec debe declarar la dependencia y no contradecirla.
4. Mira el código real de las fronteras que va a tocar. Una spec que ignora lo
   que ya existe genera un plan imposible.

## Qué producir

Crea `specs/NNNN-<slug-corto>/spec.md` a partir de
`.specify/templates/spec.md`.

Reglas:

- **Describe el qué y el porqué, nunca el cómo.** Si escribes un nombre de tabla,
  de archivo o de librería, te pasaste al plan.
- Cada requisito debe poder verificarse observando el producto, con sí o no.
- Los criterios de aceptación son los que después se convierten en pruebas.
  Escríbelos como comportamiento observable.
- Piensa los fallos con el mismo cuidado que el camino feliz. Un caso límite sin
  respuesta definida es un bug esperando.
- Completa la tabla de verificación de la constitución. Si algún principio no
  aplica, dilo explícitamente en vez de dejarlo en blanco.

## Preguntas abiertas

Si algo es genuinamente ambiguo y las lecturas posibles llevan a productos
distintos, déjalo en "Preguntas abiertas" y **pregúntame** antes de dar la spec
por lista. No inventes la respuesta para poder seguir.

## Al terminar

Muéstrame el resumen: problema, alcance, requisitos y preguntas abiertas.
No avances al plan hasta que apruebe.
