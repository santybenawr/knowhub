# KnowHub — Retoma y pendientes de producción

Revisión: 2026-09-15. Base de la app: `aa18d02`; base de este checkout con landing:
`c9a798e`. Rama de trabajo: `codex/knowhub-production-readiness`.

## Estado y decisiones confirmadas

El checkout original de Claude y `origin/main` coinciden en `aa18d02`, sin cambios
locales observados. La copia de trabajo de Codex partía limpia de la rama de la
landing. La app sigue siendo un MVP web, no un producto listo para App Store.
Este documento actualiza el diagnóstico; no convierte las pruebas con mocks en
evidencia de funcionamiento de los proveedores de producción.

El usuario confirmó Colombia como país desde donde cobrará y dos familias de
planes: personales y de equipo, con precios distintos. No confirmó aún si operará
como persona o empresa. No tiene confirmada una cuenta Apple Developer.
Precios, moneda de presentación, periodicidad, prueba gratuita, cuotas, asientos
incluidos y política de cancelación siguen por definir. Los valores Free/Pro/Team
de `src/config/plans.ts` son límites técnicos del MVP, no un catálogo comercial aprobado.

## Qué existe

| Área | Implementado / evidencia | Límite actual |
| --- | --- | --- |
| Arquitectura | Next.js/React; módulos en `src/server`; Drizzle, PostgreSQL/PGlite | No hay proyecto iOS ni binario firmado |
| Cuentas y equipos | `server/auth`, `server/permissions`, `server/workspaces` | Correo sin envío/verificación; revisión de recuperación pendiente |
| Documentos y notas | Carga, extracción, biblioteca y proyectos | Falta QA de formatos/límites con datos reales y proveedor remoto |
| Reuniones | Captura/carga/importación, transcripción, análisis, búsqueda | El proveedor mock produce transcripción ficticia; validar audio real |
| IA y fuentes | `server/ai`, segmentos, citas y enlaces a evidencia | Una cita sintáctica no garantiza respaldo de cada afirmación |
| Procesamiento | Cola persistida y ejecución en proceso en `server/jobs` | Continuidad tras reinicios y operación sostenida sin verificar |
| Planes y consumo | Límites por workspace, `usage_events`, `billingCustomerId` | Sin checkout, webhooks, ciclo de suscripción ni concesión de acceso por pago |
| Marketing | Landing aislada bajo `marketing/`, publicada previamente | Presentación de prelanzamiento, separada de la app privada |

## Trabajo de esta retoma

La [spec 0010](../specs/0010-invitaciones-seguras/spec.md) corrige invitaciones:
destinatario comprobado en servidor, consumo atómico, comprobación de workspace,
permisos del invitante y cupo al aceptar. El GET muestra un formulario; solo el
POST autenticado modifica membresías y establece la cookie. No se alteran roles
existentes. Sin migraciones ni dependencias nuevas.

Los nueve escenarios de integración reprodujeron seis fallos antes del cambio y
pasaron después. `pnpm verify` final pasó lint, tipos, 168 pruebas en 20 archivos
y build. Se verificó en navegador local el login, confirmación, aceptación,
workspace activo tras recarga y rechazo al reutilizar el enlace, sin errores de
consola observados. No se ejecutó aquí la suite Playwright completa ni PostgreSQL
remoto. Detalles en [tareas 0010](../specs/0010-invitaciones-seguras/tasks.md).
No equivale a una auditoría de seguridad integral.

## Pendientes priorizados y criterio de cierre

P0 impide un lanzamiento con datos o pagos reales; P1 debe cerrarse para la beta
correspondiente. «Observado» significa lectura del código salvo prueba indicada.

| ID / prioridad | Evidencia y pendiente | Cierre verificable |
| --- | --- | --- |
| SEC-01 / P0 | Invitaciones: seis regresiones reproducidas y corregidas en 0010 | Suite y prueba del POST; repetir concurrencia en PostgreSQL remoto |
| SEC-02 / P0 | `auth/service.ts`: recuperación actualiza credenciales sin revocar sesiones; consumo inicial fuera de transacción | Token de un solo uso también concurrente y revocación de sesiones anteriores |
| SEC-03 / P0 | `db/client.ts`: TLS remoto usa `rejectUnauthorized: false`; RLS requiere `auth.uid()` de Supabase | Certificado verificado y aislamiento probado con roles reales; configuración explícita del proveedor |
| SEC-04 / P0 | `users.emailVerifiedAt` existe, pero no hay transporte ni flujo efectivo de verificación | Envío real, token de verificación, recuperación segura y política de acceso acordada |
| DATA-01 / P0 | `meetings/service.ts: attachAudio` borra el objeto previo antes de guardar el nuevo | Fallos de upload/DB preservan audio anterior; reemplazos concurrentes no pierden datos |
| AI-01 / P0 | Poda de evidencia permite ids vacíos; `ai/rag.ts: keepCitedOnly` puede conservar fuentes sin citas válidas | Política explícita de abstención y pruebas de respuestas sin respaldo; QA semántica con corpus |
| OPS-01 / P0 | `jobs/index.ts`: worker en proceso; deduplicación y recuperación requieren endurecimiento | Reiniciar durante tareas, reintentar sin duplicar efectos y drenar cola con worker supervisado |
| BILL-01 / P0 | `config/env.ts` muestra Stripe por presencia de clave; no hay servicio de facturación | Estado de integración honesto; proveedor elegido y checkout sandbox verificado |
| BILL-02 / P0 | `usage/index.ts`: almacenamiento suma documentos, no audio; límites no reservan consumo atómicamente | Conteo completo, duración confiable, reglas de renovación y pruebas de cuota concurrente |
| BILL-03 / P0 | Sin suscripciones, eventos de proveedor o derechos de acceso persistidos | Pago firmado concede acceso; duplicados, retrasos, renovación, impago, cancelación y reembolso probados |
| PRIV-01 / P0 | Sin flujo de eliminación de cuenta; borrado de workspace es lógico; revisión de logs y almacenamiento pendiente | Política de retención, eliminación/exportación, tratamiento de grabaciones y revisión de datos en logs |
| OPS-02 / P0 | PGlite/mocks verificados localmente; proveedores externos no validados aquí | Staging separado, PostgreSQL/vector, almacenamiento privado, IA real, secretos, backups y restauración probados |
| IOS-01 / P1 | No hay cliente iOS, StoreKit ni proyecto Xcode | Elegir arquitectura móvil tras prueba de grabación; build firmado y TestFlight |
| IOS-02 / P1 | Apple Developer no confirmado; sin productos App Store Connect | Identidad/contratos/cuenta bancaria, productos, compra/restauración y notificaciones sandbox |
| UX-01 / P1 | Hallazgos manuales en `discovery/05-validacion-y-hallazgos.md`; salto de evidencia sin audio ambiguo | Pruebas de navegación por fuente, transcripción, estados vacíos y errores |
| MEDIA-01 / P1 | `api/storage/[...path]/route.ts` anuncia rangos sin responder parcialmente | Reproducción y búsqueda en audio largo verificadas, respuestas Range adecuadas |
| QA-01 / P1 | Suite E2E histórica bloqueada por Chromium del entorno; no prueba real de micrófono/IA | E2E en CI o entorno compatible, Safari/iPhone, permisos, interrupciones y red inestable |
| QA-02 / P1 | Accesibilidad y rendimiento parcial; Sentry solo configurado por variables | Teclado/lector/contraste, presupuestos medidos, alertas sin datos privados |
| PWA-01 / P1 | PNG de iconos previos 1×1 y sin service worker | Definir alcance PWA; iconos válidos y comportamiento de instalación honesto |

## Orden propuesto

1. Seguridad y datos: 0010, recuperación de acceso, correo, TLS y reemplazo seguro
   de audio. Mantener el contrato existente; documentar nuevas decisiones antes de código.
2. Beta web: proveedores reales en staging, worker, citas fiables, cuotas y QA.
3. Monetización web: aprobar catálogo y condiciones, seleccionar proveedor,
   implementar suscripciones y probar su ciclo completo en sandbox.
4. iOS: prueba técnica de grabación/multitarea, arquitectura, cuenta Apple,
   compras/restauración, privacidad y TestFlight. Enviar a revisión solo tras QA.

La siguiente corrección técnica recomendada es SEC-02 (recuperación y sesiones);
DATA-01 sigue por su riesgo de pérdida de grabaciones. Ambas pueden avanzar sin
esperar a que se decidan los precios.

## Diseño comercial propuesto, aún no implementado

Conservar el workspace como frontera de datos y consumo: una suscripción personal
habilita un workspace personal; una de equipo habilita el workspace compartido.
No conceder acceso pagado a todos los workspaces solo porque un usuario pagó uno.
Definir si el equipo compra un paquete de asientos o paga por asiento adicional.

Separar catálogo, suscripción, eventos procesados y derechos de acceso. El backend
debe ser la fuente de verdad del acceso; nunca el redirect de un checkout ni un
precio enviado por el cliente. Los eventos requieren firma, idempotencia,
conciliación y protección frente a entrega fuera de orden. Una compra de Apple
debe vincularse de forma inequívoca a la cuenta/workspace y poder restaurarse.

Para Colombia, Wompi es un candidato a evaluar: documenta fuentes de pago para
cobros posteriores. Esto no acredita elegibilidad del comercio ni resuelve por
sí solo el calendario, reintentos y ciclo de suscripción de KnowHub.
[Documentación de Wompi](https://docs.wompi.co/docs/colombia/fuentes-de-pago/).
Stripe no lista Colombia entre sus países admitidos en la consulta del 15 de
septiembre; su placeholder en el código no es motivo para elegirlo.
[Disponibilidad de Stripe](https://stripe.com/global).

Para la venta de funciones digitales a particulares en iOS, planificar In-App
Purchase y comprobar las reglas de cada storefront antes de cerrar la compra.
No asumir que llamar «equipo» a un plan permite omitirlo: la excepción de servicios
empresariales tiene condiciones específicas. Apple también exige funcionalidad
suficiente y un mecanismo para iniciar la eliminación de cuentas creadas en la
app. Un contenedor web por sí solo no acredita esos requisitos.
[App Review Guidelines, 3.1 y 4.2](https://developer.apple.com/app-store/review/guidelines/),
[eliminación de cuentas](https://developer.apple.com/support/offering-account-deletion-in-your-app/).
Fuentes consultadas el 2026-09-15; volver a comprobar al preparar el envío.

## Cómo retomar y probar

Trabajar en `work/knowhub`, rama `codex/knowhub-production-readiness`. La rama
`codex/knowhub-discovery-landing` está conectada al despliegue público: no usarla
para publicar cambios de backend por accidente. El checkout original se conserva.

```sh
pnpm test tests/integration/invitations.test.ts tests/unit/invitation-actions.test.ts
pnpm verify
pnpm dev
```

En este entorno, anteponer a los comandos pnpm:
`PNPM_CONFIG_STORE_DIR=/Users/macbook/Documents/Codex/2026-09-08/referenced-chatgpt-conversation-this-is-an/work/pnpm-store`.

Para la prueba manual, usar cuentas y un workspace con cupo en una base de pruebas.
Abrir el enlace primero con otra cuenta: aceptar debe mostrar un error. Abrirlo
con la cuenta invitada: no debe incorporarse hasta pulsar el botón. Tras aceptar,
debe aparecer el workspace correcto. Reutilizar el enlace debe fallar. No cambiar
el plan de una base real manualmente para ejecutar esta prueba.
