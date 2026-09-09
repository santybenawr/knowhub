# Tareas 0009 — Landing cinematográfica

> Deriva de [plan.md](plan.md). **Implementación autorizada el 2026-09-08**, con publicación en Vercel y CTA de demo de prelanzamiento según enmienda en la spec.

- [x] **T0 — Acordar contrato y fijar base**
  - Revisar spec, plan y tareas; registrar responsable, fecha y cambios.
  - Comprobar HEAD remoto, rama e instrucciones; leer guía local de Next.
  - Usar el informe actual de validación como evidencia de esta base y repetirlo si cambia commit/entorno.

- [x] **T1 — Contenido y fuente ilustrativa**
  - Propuesto: `src/features/marketing/landing-content.ts`.
  - Copy definitivo y caso Omega coherente entre pregunta, respuesta, participante y timestamp. Etiqueta ilustrativa visible.
  - Verificación: contrastar claims con auditoría y proveedores; no crear tests que repliquen arrays de textos.

- [x] **T2 — Portada responsive sin movimiento**
  - Archivos previstos: página/layout marketing, `landing-sections.tsx`, `landing.module.css`.
  - Reutilizar logo, tokens, botones y tema; H1/CTA en HTML inicial.
  - Verificación: 320/390/768/1440, claro/oscuro, sin JS; lint, tipos y pruebas existentes.

- [x] **T3 — Demo pregunta → respuesta → fuente**
  - Propuesto: `source-demo.tsx`.
  - Controles semánticos, foco, reinicio y alternativa estática. Sin API pública, datos privados o reproducción falsa.
  - Verificación: E2E de recorrido y teclado; ausencia de solicitudes a IA y coherencia del segmento.

- [x] **T4 — Assets**
  - Propuesto: `public/marketing/` y registro de procedencia en documentación.
  - Póster e imágenes con dimensiones y texto separado. Antes de generar con coste, validar referencias y autorización aplicable.
  - Para videos generados: registrar modelo real, fecha, referencias autorizadas, versión y condiciones de uso revisadas; optimizar exportaciones.
  - Verificación: bytes, encuadre móvil, legibilidad y ausencia de datos privados. El video es opcional.

- [x] **T5 — Movimiento progresivo**
  - Propuestos: `ambient-media.tsx`, `landing.module.css`.
  - Entradas discretas, pausa, póster móvil y movimiento reducido dinámico.
  - Verificación: autoplay denegado, medio fallido, preferencia reducida y reanudación manual; comparar con versión estática.

- [x] **T6 — Metadatos y navegación**
  - Archivo: página/layout marketing; imagen social solo cuando exista.
  - Unificar CTA y conservar acceso/legales. Canónica solo con dominio verificado.
  - Verificación: HTML, H1, título, descripción y navegación a cuenta/legales.

- [ ] **T7 — QA y regresión**
  - Propuesto: `e2e/landing.spec.ts` e informe de resultados.
  - Ejecutar `pnpm verify`, E2E existentes y nuevas; revisar consola, tamaños, temas y teclado.
  - Medir bytes y rendimiento según plan. Documentar límites sin convertir objetivos en resultados.

- [x] **T8 — Entrega e integración**
  - Actualizar estado de spec y documentación con evidencia real.
  - Comparar HEAD remoto antes de integrar; conservar trabajo paralelo.
  - Explicar reversión y pendientes. Publicar solo dentro de autorización aplicable.

## Publicación automática — 2026-09-09

- [x] Subir la rama de la landing al repositorio existente sin modificar `main`.
- [x] Conectar el proyecto Vercel y guardar rama de producción, compilación estática y filtro de ramas.
- [x] Documentar cómo editar, validar, publicar y revertir mediante Git.
- [x] Confirmar despliegue automático desde un nuevo push: commit `015f3ede36cfae091dc43b1cf6da8153bc1eeee9`, despliegue `dpl_2mYnkpA22yAwivRZn84h4jdmbjCJ`, origen Git, producción READY y dominio público verificado el 2026-09-09.

## Trazabilidad

Las pruebas siguientes son **casos previstos**, no implementados ni ejecutados:

| Requisito | Tareas | Verificación prevista |
| --- | --- | --- |
| R1 | T1, T2, T7 | Hero/CTA visibles antes de video. |
| R2 | T2, T6, T7 | CTA a `/signup` y acceso `/login`. |
| R3 | T1, T2 | Tres entradas y descripciones. |
| R4 | T1, T3, T7 | Pregunta, respuesta, cita/fuente sin API externa. |
| R5 | T1, T3, T4 | Fixture coherente, sin reproducción inexistente. |
| R6 | T1, T2, T7 | Alcance explícito de audio y proveedores. |
| R7 | T2, T7 | Logo/tokens y comparación de dashboard. |
| R8 | T2, T3, T5, T7 | Sin JS y movimiento reducido. |
| R9 | T5, T7 | Pausa, silencio y scroll nativo. |
| R10 | T2, T3, T7 | Teclado, foco, zoom y responsive. |
| R11 | T4, T5, T7 | Error de video y póster estable. |
| R12 | T0, T2, T7, T8 | Suite previa, auth, legales, tema y Git. |
| R13 | T6, T7 | HTML y dominio verificado. |
| R14 | T4, T5, T7 | Bytes y tres mediciones de laboratorio. |
| R15 | T1, T6, T7, T8 | Legales y revisión de promesas. |

## Resultado de ejecución — 2026-09-08

T0–T6 implementadas con los ajustes de prelanzamiento: `landing-page.tsx`, `source-demo.tsx`, `motion-stage.tsx`, shell y CSS compartidos; arte original optimizado; exportación estática en `marketing/`. El video es opcional y no se incluyó. T7 permanece parcial por la limitación de Chromium y mediciones de rendimiento pendientes. T8 completada: publicación READY y HTTP/navegador verificados en https://knowhub-prelaunch.vercel.app. El informe `docs/discovery/07-landing-implementada.md` distingue comprobaciones ejecutadas y pendientes.
