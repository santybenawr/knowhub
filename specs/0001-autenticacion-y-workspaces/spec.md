# Spec 0001 — Autenticación y workspaces

> **Estado:** Implementada · **Fecha:** 2026-08-21 · **Retroactiva**
> **Depende de:** ninguna

## Problema

El conocimiento que la gente sube a KnowHub es lo más sensible que tiene: las
grabaciones de sus reuniones, los documentos internos de su empresa, sus notas.
Necesita una cuenta desde el primer minuto, y necesita saber que lo suyo es suyo
— incluso cuando comparte el espacio con un equipo.

## Resultado esperado

Cualquiera puede crear una cuenta en menos de un minuto y encontrarse ya dentro
de un espacio propio, sin configurar nada. Cuando invita a alguien, controla
exactamente qué puede hacer esa persona.

## Alcance

**Dentro:**
- Registro, inicio y cierre de sesión, recuperación de contraseña
- Workspace personal automático al registrarse
- Creación de workspaces adicionales (equipo, educación, empresa)
- Cuatro roles con permisos diferenciados
- Invitaciones por enlace
- Aislamiento total entre workspaces

**Fuera** (y por qué):
- OAuth con Google — el registro con correo cubre el MVP; la frontera de
  autenticación queda preparada para añadirlo sin tocar el resto
- Verificación obligatoria de correo — no hay transporte de correo configurado;
  exigirla dejaría a todo el mundo fuera
- SSO empresarial — no hay todavía un cliente empresarial que lo justifique

## Requisitos

| # | Requisito | Prioridad |
| --- | --- | --- |
| R1 | El usuario puede registrarse con nombre, correo y contraseña | P0 |
| R2 | Al registrarse queda dentro de un workspace personal, sin configurarlo | P0 |
| R3 | El usuario puede iniciar y cerrar sesión | P0 |
| R4 | El usuario puede recuperar el acceso si olvida su contraseña | P0 |
| R5 | Un usuario nunca ve datos de un workspace al que no pertenece | P0 |
| R6 | El usuario puede crear workspaces adicionales y cambiar entre ellos | P1 |
| R7 | Un administrador puede invitar personas y asignarles un rol | P1 |
| R8 | Un administrador puede cambiar roles y quitar miembros | P1 |

## Reglas de negocio e invariantes

- **El workspace personal se crea en la misma transacción que la cuenta.** Una
  cuenta sin workspace deja al usuario en una pantalla vacía sin salida.
- **El `workspaceId` que llega del cliente es una solicitud, no un hecho**
  (constitución IV). Se resuelve contra membresías reales antes de usarse.
- **Un no-miembro recibe "no encontrado", no "prohibido".** Un "prohibido"
  confirmaría que el id existe.
- El propietario no puede cambiar su propio rol ni ser removido: dejaría el
  workspace huérfano.
- Nadie puede asignar un rol igual o superior al suyo.
- Las contraseñas nunca se guardan recuperables.
- Los tokens de sesión se guardan hasheados: una fuga de la base de datos no debe
  poder reproducirse como inicio de sesión.
- El mensaje de error de inicio de sesión es idéntico exista o no la cuenta, y la
  comparación tarda lo mismo. Lo contrario permite enumerar cuentas.

## Roles

| | OWNER | ADMIN | MEMBER | VIEWER |
| --- | --- | --- | --- | --- |
| Leer contenido y buscar | ✓ | ✓ | ✓ | ✓ |
| Crear y editar contenido | ✓ | ✓ | ✓ | |
| Grabar reuniones, usar IA | ✓ | ✓ | ✓ | |
| Eliminar contenido | ✓ | ✓ | | |
| Gestionar miembros | ✓ | ✓ | | |
| Facturación, eliminar workspace | ✓ | | | |

## Criterios de aceptación

- [x] **Dado** un visitante, **cuando** completa el registro, **entonces** queda
      autenticado y con un workspace personal donde es OWNER
- [x] **Dado** un correo ya registrado, **cuando** alguien intenta registrarlo de
      nuevo, **entonces** se rechaza sin crear nada
- [x] **Dado** un usuario, **cuando** falla la contraseña o no existe la cuenta,
      **entonces** el mensaje es el mismo en ambos casos
- [x] **Dado** un enlace de recuperación usado, **cuando** se intenta usar otra
      vez, **entonces** se rechaza
- [x] **Dado** el usuario A con contenido, **cuando** el usuario B usa los ids
      reales de A por cualquier vía, **entonces** todo se deniega
- [x] **Dado** un ADMIN, **cuando** intenta asignar el rol ADMIN, **entonces** se
      rechaza
- [x] **Dado** el propietario, **cuando** alguien intenta removerlo, **entonces**
      se rechaza

## Casos límite y fallos

| Situación | Comportamiento esperado |
| --- | --- |
| Usuario sin ningún workspace (dato corrupto) | Se le crea uno al iniciar sesión, en vez de dejarlo bloqueado |
| Enlace de recuperación expirado | Mensaje claro y opción de pedir otro |
| Correo desconocido en recuperación | Se responde "éxito" sin emitir token: no se revela quién está registrado |
| Muchos intentos de inicio de sesión | Se limitan por origen, con el tiempo de espera en el mensaje |
| Invitación a alguien que ya es miembro | Se rechaza con motivo |
| No hay servicio de correo | El enlace se entrega en pantalla para compartirlo. No se finge un envío |

## Verificación de la constitución

| Principio | Cómo lo cumple |
| --- | --- |
| IV. Aislamiento | Toda operación resuelve el workspace contra membresías reales; el predicado va dentro del SQL |
| VIII. Nada privado en claro | Contraseñas con scrypt; tokens de sesión hasheados; `AUTH_SECRET` obligatorio en producción |
| X. Verdad sobre limitaciones | Sin transporte de correo, el enlace se muestra en vez de simular un envío |

## Estado de implementación

| Requisito | Código | Prueba |
| --- | --- | --- |
| R1, R2 | [`server/auth/service.ts`](../../src/server/auth/service.ts) `signup()` | `tests/integration/auth.test.ts` |
| R3 | [`server/auth/session.ts`](../../src/server/auth/session.ts) | `tests/integration/auth.test.ts` |
| R4 | `createPasswordResetToken()`, `resetPassword()` | `tests/integration/auth.test.ts` |
| R5 | [`server/permissions/`](../../src/server/permissions/) | `tests/integration/tenant-isolation.test.ts`, `e2e/meetings.spec.ts` |
| R6 | [`server/workspaces/`](../../src/server/workspaces/) | — |
| R7, R8 | `inviteMember()`, `changeMemberRole()`, `removeMember()` | `tests/unit/permissions.test.ts` |

Puerta única de entrada: [`server/auth/guard.ts`](../../src/server/auth/guard.ts).
Detalle de seguridad en [`docs/security.md`](../../docs/security.md).

## Limitaciones conocidas

- Sin envío de correo: los enlaces de recuperación e invitación se entregan en
  pantalla.
- Sin verificación obligatoria de correo.
- Google OAuth preparado a nivel de frontera, no implementado.
