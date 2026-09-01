# Tareas NNNN — <Nombre>

> Deriva de [`plan.md`](plan.md). Cada tarea deja el repo en verde
> (`pnpm lint && pnpm typecheck && pnpm test`).

Orden pensado para que cada paso sea verificable, no para minimizar pasos.

- [ ] **T1 — <migración / esquema>**
  - Archivos: `…`
  - Verificación: `pnpm db:migrate && pnpm test tests/integration/schema.test.ts`

- [ ] **T2 — <servicio + pruebas>**
  - Archivos: `…`
  - Cubre: R1, R2
  - Verificación: `pnpm test …`

- [ ] **T3 — <ruta / acción>**
  - Archivos: `…`
  - Verificación: …

- [ ] **T4 — <interfaz>**
  - Archivos: `…`
  - Verificación: revisión en el navegador + `pnpm test:e2e`

- [ ] **T5 — documentación**
  - Actualizar `CLAUDE.md` / `docs/` / `README.md` si cambió el contrato

## Trazabilidad

Ningún requisito sin tarea, ninguna tarea sin requisito.

| Requisito | Tareas | Prueba que lo cubre |
| --- | --- | --- |
| R1 | T2, T3 | `…` |
