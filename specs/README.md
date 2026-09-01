# Especificaciones

KnowHub se desarrolla con **Spec-Driven Development**: primero se acuerda qué
debe hacer el producto y por qué; después cómo; después se implementa. El código
es la última consecuencia de una decisión, no el lugar donde se toma.

## El flujo

```
/spec <descripción>   →  specs/NNNN-nombre/spec.md    (el qué y el porqué)
        ↓ apruebas
/plan NNNN            →  specs/NNNN-nombre/plan.md    (el cómo, y qué se descartó)
        ↓ apruebas
/tasks NNNN           →  specs/NNNN-nombre/tasks.md   (pasos verificables)
        ↓ apruebas
/implement NNNN       →  código + pruebas, verificando en cada paso
```

Cada puerta existe para que un desacuerdo se resuelva cuando cuesta un párrafo,
no cuando cuesta una semana.

**Regla:** si al implementar se descubre que la spec pide algo imposible o
contradictorio, se para y se corrige la spec. No se reinterpreta en silencio.

## La constitución manda

[`.specify/constitution.md`](../.specify/constitution.md) contiene los principios
no negociables. Toda spec se evalúa contra ellos. Si una spec los contradice, la
spec está mal — o el principio necesita una enmienda explícita y fechada.

## Índice

| # | Especificación | Estado |
| --- | --- | --- |
| [0001](0001-autenticacion-y-workspaces/spec.md) | Autenticación y workspaces | Implementada |
| [0002](0002-proyectos-y-biblioteca/spec.md) | Proyectos y biblioteca | Implementada |
| [0003](0003-documentos/spec.md) | Documentos | Implementada |
| [0004](0004-notas/spec.md) | Notas | Implementada |
| [0005](0005-captura-de-reuniones/spec.md) | Captura de reuniones | Implementada |
| [0006](0006-inteligencia-de-reuniones/spec.md) | Inteligencia de reuniones | Implementada |
| [0007](0007-busqueda-y-preguntas/spec.md) | Búsqueda y preguntas | Implementada |
| [0008](0008-procesamiento-asincrono/spec.md) | Procesamiento asíncrono | Implementada |

## Sobre las specs 0001–0008

Son **retroactivas**: describen el MVP que ya está construido y verificado.

Llevan `spec.md` pero no `plan.md` ni `tasks.md`, y es deliberado. Un plan
documenta las alternativas que se evaluaron *antes* de decidir, y unas tareas
documentan la secuencia en que se ejecutó. Reconstruirlos hacia atrás sería
inventar una deliberación que no ocurrió en ese orden — un documento que parece
historia y no lo es.

Lo que sí aportan estas specs, y por eso existen: fijan el contrato observable de
cada módulo, y su sección **Estado de implementación** enlaza cada requisito con
el código que lo cumple y la prueba que lo verifica. Eso las hace comprobables,
no decorativas.

Las decisiones técnicas y sus alternativas descartadas ya están documentadas en
[`docs/`](../docs/): [architecture](../docs/architecture.md),
[database](../docs/database.md), [ai](../docs/ai.md), [security](../docs/security.md).

**De la 0009 en adelante va la tríada completa.**
