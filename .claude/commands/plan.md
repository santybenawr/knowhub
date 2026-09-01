---
description: Traduce una spec aprobada a un plan técnico
argument-hint: <número de spec, ej. 0009>
---

Vas a escribir el plan técnico de la spec $ARGUMENTS. **Todavía no escribas
código de producción.**

## Antes de escribir

1. Lee `specs/$ARGUMENTS-*/spec.md` completa.
2. Si tiene preguntas abiertas sin resolver, **detente** y resuélvelas conmigo
   primero. Un plan sobre una spec ambigua es trabajo perdido.
3. Lee `.specify/constitution.md` y `CLAUDE.md`.
4. Lee el código real de las fronteras afectadas. No planifiques contra una
   arquitectura imaginada.

## Qué producir

Crea `specs/$ARGUMENTS-*/plan.md` a partir de `.specify/templates/plan.md`.

Reglas:

- Explica **por qué** este enfoque y no otro. Las alternativas descartadas son la
  parte más valiosa del documento: evitan volver a discutirlo dentro de tres
  meses.
- Reutiliza lo que ya existe. Si vas a añadir una abstracción nueva, justifica por
  qué las fronteras actuales (`StorageProvider`, `AIProvider`,
  `TranscriptionProvider`, `DocumentParser`, `JobHandler`) no sirven.
- Antes de proponer una dependencia nueva, verifica que el stack no lo resuelva
  ya. Nada de librerías para formatear un timestamp o manejar un modal.
- Decide en qué nivel se prueba cada cosa y por qué en ese y no en otro.
- Si el plan tensiona un principio de la constitución, dilo. No lo escondas.

## Al terminar

Muéstrame el enfoque, las alternativas descartadas y los riesgos.
No avances a las tareas hasta que apruebe.
