# Tareas — Invitaciones seguras

- [x] Leer spec 0001, constitución, servicio, esquema y documentación local de Next.
- [x] Aislar cambios en `codex/knowhub-production-readiness`.
- [x] Reproducir el acceso con correo incorrecto mediante prueba de integración.
- [x] Implementar aceptación atómica con destinatario, cupo y permisos vigentes.
- [x] Sustituir mutación GET por formulario y Server Action autenticada.
- [x] Verificar rechazos, doble uso, concurrencia, rol previo y frontera HTTP/UI.
- [x] Ejecutar `pnpm verify` y registrar resultados/limitaciones.
- [x] Actualizar checkpoint e inventario de pendientes de producción.

## Resultados — 2026-09-15

- Base sin cambios: lint, tipos, 150 tests/18 archivos y build correctos.
- Regresión antes del fix: 6 fallos y 3 éxitos en `invitations.test.ts`.
- Después: 9/9 integración y 9/9 frontera de acción/render.
- `pnpm verify` final: lint, tipos, **168 tests/20 archivos** y build correctos.
- Navegador integrado, build de producción local en puerto 3033, base PGlite
  aislada y cuentas ficticias: login, confirmación en GET, aceptación por botón,
  dashboard del equipo correcto, persistencia tras recarga y rechazo del enlace
  ya consumido. Sin errores de consola observados en ese recorrido.
- No se ejecutó la suite Playwright completa, PostgreSQL remoto, Safari/iPhone
  ni proveedores reales. Las llamadas simultáneas de las pruebas usan PGlite;
  repetirlas con conexiones PostgreSQL independientes antes de producción.

Logs locales de esta sesión, fuera del repositorio: `work/baseline-production-2026-09-15.log`,
`work/invitations-before-2026-09-15.log`, `work/verify-production-final-2026-09-15.log`.
