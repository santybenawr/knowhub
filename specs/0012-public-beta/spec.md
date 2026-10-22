# 0012 · Beta web con persistencia

22/10/2026. Alcance autorizado por el usuario: publicar ahora el MVP, con registro
abierto, cuentas, documentos, notas y reuniones importadas como texto. IA y
transcripción de audio reales quedan para después. La demo y landing se conservan.

- Proyecto independiente `sacramented/knowhub-app`, PostgreSQL remoto y bucket privado.
- Cada cuenta conserva sus recursos y no puede leer los de otra cuenta.
- Conexiones PostgreSQL con certificado TLS verificado. Sin PGlite ni archivos
  locales en el despliegue. Migraciones explícitas antes de publicar.
- La beta solo permite importar transcripciones; bloquear audio también en servidor.
- Documentos hasta 4 MiB para respetar el límite del transporte de Vercel.
- Las respuestas extractivas se identifican como tales, sin prometer IA real.
- No prometer correo de recuperación sin transporte. Las invitaciones a equipos
  permanecen deshabilitadas en esta beta hasta verificar la propiedad del correo.
- No cargar la cuenta demo ni sus credenciales públicas en la base remota.
- No contratar planes pagos ni divulgar secretos. La aceptación de términos de
  Supabase depende del usuario.

Aceptación: registro y acceso públicos, crear/recargar nota, subir/leer/descargar
documento, importar reunión, búsqueda/citas y rechazo entre cuentas, sobre el
despliegue HTTPS real. Informar cualquier comprobación pendiente.
