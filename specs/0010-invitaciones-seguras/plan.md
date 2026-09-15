# Plan — Invitaciones seguras

Escrito antes de la implementación, 2026-09-15. Corrección del contrato existente
0001 bajo la instrucción de continuar el proyecto; no se registra una aprobación
comercial inexistente.

1. Añadir regresiones de integración sobre PGlite y comprobar el fallo original.
2. Mantener el servicio actual. Dentro de una transacción, buscar invitación y
   usuario, comparar correo, bloquear la fila del workspace para serializar
   aceptaciones, revalidar estado/rol/cupo y consumir el token con un UPDATE
   condicional que devuelve la fila. Insertar membresía sin modificar roles.
3. Mover la mutación del render a una Server Action autenticada. Un formulario
   reutiliza Button y ActionResult y presenta error/estado pendiente accesibles.
   Redirigir fuera del catch, después de establecer la cookie.
4. Probar la frontera de la acción y el render sin efectos secundarios; ejecutar
   lint, tipos, integración y build. Documentar por separado la QA en navegador.

Se descarta aceptar en GET por sus efectos al precargar y por las restricciones
de cookies. Se descarta comprobar correo solo en la UI porque no autoriza el
POST. El bloqueo por workspace cubre el cupo entre aceptaciones sin añadir tablas
ni dependencias. PGlite no sustituye una prueba de concurrencia en PostgreSQL remoto.
