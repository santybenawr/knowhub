# Spec 0010 — Corrección de invitaciones

Fecha: 2026-09-15. Alcance: mantenimiento del contrato de acceso de la spec 0001,
R5 y R7, bajo la solicitud del usuario de continuar la app y corregir pendientes.
No constituye aprobación de nuevas funciones comerciales, precios o proveedor de cobro.

## Problema observado

`acceptInvitation` no compara el correo de la cuenta con el destinatario. La
página consume el enlace durante un GET y después intenta escribir una cookie
desde el render, operación no permitida por Next.js. El consumo del token tampoco
es condicional dentro de la transacción y no se revalida el cupo al aceptar.

## Contrato y criterios de aceptación

- R1: aceptar exige sesión vigente; el usuario se obtiene en el servidor.
- R2: el correo guardado de esa cuenta debe coincidir con el destinatario,
  ignorando mayúsculas y espacios exteriores. Un rechazo no consume el enlace.
- R3: tokens inexistentes, expirados o consumidos no crean membresías.
- R4: membresía y consumo del token son una operación atómica; dos intentos
  simultáneos del mismo enlace producen un solo éxito.
- R5: no se acepta en un workspace eliminado ni si el invitante perdió el permiso
  de asignar ese rol. Se comprueba el límite vigente de miembros al aceptar.
- R6: aceptar no cambia el rol de una membresía que ya existe. Aceptaciones
  simultáneas de enlaces distintos no sobrepasan el cupo.
- R7: abrir o precargar el enlace no modifica datos. El usuario ve su cuenta y
  pulsa «Aceptar invitación»; el POST vuelve a autenticar y establece el workspace
  activo. Los errores se muestran sin exponer datos internos.

## Límites

No se incorpora envío ni verificación de correo en esta corrección: la spec 0001
los excluía del MVP. Comparar el correo no acredita su propiedad; verificarlo
antes de un lanzamiento público sigue siendo un pendiente de seguridad.
No cambia el esquema, el catálogo de planes, la landing ni el despliegue.

## Constitución

IV: autorización por destinatario y workspace. IX: regresiones de acceso, consumo
y cupos. X: se distingue coincidencia del correo de verificación de su propiedad.
