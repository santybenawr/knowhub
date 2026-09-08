# KnowHub — diseño real y preparación de la landing

**Entrega del 8 de septiembre de 2026.** Base `aa18d022`, rama local `codex/knowhub-discovery-landing`.

KnowHub reúne documentos, notas y reuniones y permite recuperar contenido con fuentes enlazadas. La dirección propuesta para su landing es **«Vuelve al momento en que quedó claro»**: una pregunta conduce a una respuesta y después a un fragmento de origen. Conserva nombre, logo, Inter, violeta y ámbar.

## Qué está preparado

| Documento | Qué resuelve |
| --- | --- |
| [01 · Arquitectura y funcionalidades](01-arquitectura-y-funcionalidades.md) | Frontend/backend, módulos, datos, rutas, proveedores, límites y trazabilidad. |
| [02 · Propuesta de SDD académico](02-propuesta-sdd-academico.md) | Problema, objetivos, actores, RF/RNF, arquitectura, datos, secuencia, decisiones y plan de evaluación. |
| [03 · Product brief](03-product-brief.md) | Producto, audiencia propuesta, propuesta de valor, capacidades, CTA y reglas del mensaje. |
| [04 · Dirección creativa y storyboard](04-direccion-creativa-y-storyboard.md) | Secciones, copy, movimiento, móvil y tres prompts de assets Higgsfield con prioridades. |
| [05 · Validación y hallazgos](05-validacion-y-hallazgos.md) | Pruebas actuales, revisión de interfaz, problemas encontrados y límites. |
| [06 · Dependencias](06-dependencias.md) | Versiones declaradas e instaladas, separando ejecución y desarrollo. |
| [Spec 0009](../../specs/0009-landing-cinematografica/spec.md) | Contrato observable de la nueva landing. |
| [Plan 0009](../../specs/0009-landing-cinematografica/plan.md) | Integración, componentes, alternativas, carga, pruebas y reversión. |
| [Tareas 0009](../../specs/0009-landing-cinematografica/tasks.md) | Secuencia y trazabilidad requisito → tarea → verificación. |

## Decisión recomendada

Reutilizar el grupo de marketing de Next.js y crear una demo ilustrativa con HTML y componentes del proyecto. CTA principal: **Crear mi cuenta** → `/signup`. Usar video ambiental opcional y mantener texto, UI y controles nítidos y accesibles. No hace falta una migración ni añadir cuatro bibliotecas de animación para contar esta historia.

La nueva landing debe resolver el desbordamiento de la cabecera actual en pantallas estrechas. La demostración debe dejar claro cuándo muestra texto y cuándo existe audio. La propuesta evita promesas absolutas sobre la precisión de la IA o funcionalidades todavía ausentes.

## Estado de la entrega

**Comprobado:** lint, TypeScript, 150 pruebas en 18 archivos y build de producción pasaron. En el navegador integrado se revisaron portada, ingreso, dashboard y consulta/cita de reunión con datos ficticios locales. Los cinco E2E automáticos quedaron bloqueados antes de ejecutarse porque Chromium no pudo arrancar por permisos de macOS.

**Preparado:** análisis, propuesta académica, brief, storyboard, prompts y spec/plan/tareas. **No implementado:** el rediseño de la landing. No se modificó código de la aplicación ni se hizo push, despliegue o generación de pago.

El repo utiliza **Spec-Driven Development**; el documento académico es un **Software Design Document**. Las ocho specs antiguas son retroactivas y la 0009 es una propuesta futura. Ambos sentidos de SDD quedan separados, sin atribuir al MVP una planificación histórica que no consta.

## Puerta para la siguiente fase

`CLAUDE.md`, sección «How we work», establece: **«No code before an approved spec.»** El flujo de [specs/README.md](../../specs/README.md) prevé aprobación de spec, plan y tareas. Los tres borradores están listos para revisar conjuntamente; no se han marcado aprobados por el mero hecho de escribirlos.

La solicitud actual de preparar la implementación queda cubierta por estos documentos. Para comenzar a escribir la landing se deberá registrar la aprobación o ajustes a la 0009. La generación con coste y la publicación requieren concretar cuenta/presupuesto y destino cuando correspondan.

## Implementación posterior

[Landing implementada y validación](07-landing-implementada.md), autorizada como prelanzamiento el 8 de septiembre de 2026. Los informes 01–06 describen la base revisada antes de este cambio; el informe 07 registra la ejecución posterior.
