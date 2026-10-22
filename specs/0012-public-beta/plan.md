# Plan

Mantener Next.js y la autenticación local existente. Usar el adaptador Supabase
Storage ya implementado y PostgreSQL a través de pg/Drizzle. Crear recursos propios
de KnowHub en el plan gratuito. Un perfil explícito de beta limita la captura y
las invitaciones sin cambiar la demo local. Revocar el acceso directo de los roles
anon/authenticated a las tablas privadas de la app; el servidor conserva sus
controles por workspace. Ejecutar migraciones con una conexión verificada antes
del despliegue, sin DDL por petición. Validar primero localmente y después remoto.

22/10/2026: la base PostgreSQL responde, pero el servicio HTTP de Supabase devuelve
`TenantNotFound` durante la incidencia oficial API Gateway Request Issues. Usar
Vercel Blob privado para los archivos, dentro del plan Hobby existente y sin
cambio de facturación. Añadir un adaptador a la interfaz existente, con rutas
validadas y URLs firmadas para un único objeto y solo lectura. Conservar Supabase
Storage como alternativa, sin crear ni migrar archivos de usuarios existentes.
