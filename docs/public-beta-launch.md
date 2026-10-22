# Lanzamiento de la beta pública

Estado al 22/10/2026: **beta publicada y recorrido completo remoto aprobado**.
Dirección pública: https://knowhub-app-sacramented.vercel.app
Despliegue `dpl_3ZjLZVzPUPAMVLLfvX729k1m8Zod`, código `a9931aa`, Next 16.4.1.
Login y health responden 200 sin sesión Vercel. El health confirma PostgreSQL
y Vercel Blob; IA/transcripción siguen en modo extractivo/mock explícito.

## Alcance

Registro abierto y cuentas personales; documentos PDF/DOCX/TXT/MD de hasta 4 MiB,
notas con guardado y transcripciones pegadas. Búsqueda y respuestas extractivas,
sin IA externa ni transcripción de audio. El perfil se activa con
`NEXT_PUBLIC_KNOWHUB_BETA=true`, tanto al compilar como al ejecutar.

Sin recuperación de contraseña por correo ni invitaciones hasta integrar y
verificar ese transporte. La interfaz comunica ambos límites. No hay cobros.
La base remota arranca vacía, sin la cuenta demo de contraseña pública.

## Infraestructura

- Vercel: `sacramented/knowhub-app`, id `prj_EYyzOfmrJWvQP8RTfmVzw1Ih6ZJY`.
- El proyecto está separado de la landing y de `knowhub-demo-mvp`.
- Se desconectó Git automático del nuevo proyecto para que `main`, que todavía
  contiene una versión anterior, no reemplace un lanzamiento validado.
- Configuradas variables de producción, incluido un `AUTH_SECRET` aleatorio
  almacenado como secreto. Ningún valor secreto se incluye en este documento.
- Supabase Free: `cphgemoqeeptowmwjcqi`, recurso `store_L1uz7DzIqw5Hd7lg`.
  TLS verificado con la CA oficial; migraciones 0000 a 0005 aplicadas sin seed.
- Archivos: Vercel Blob privado `store_QpqXUJYhg098bK8B`, conectado solo a producción.
- Supabase Storage devolvió `TenantNotFound` durante la incidencia oficial
  [API Gateway Request Issues](https://status.supabase.com/incidents/01M5J8ZQ04EZXAYF10Q75MGC1T).
  La base PostgreSQL funciona. El adaptador Supabase se conserva como alternativa.
- No se cambió facturación ni se contrataron planes de pago.

## Despliegues siguientes

1. Verificar `.vercel/project.json`: debe apuntar a `sacramented/knowhub-app`.
   No volver a crear la integración ni el almacén: ambos existen.
2. Obtener variables mediante Vercel a un archivo ignorado en `.data/launch/`;
   no sustituir `.env.local` de desarrollo con credenciales de producción.
3. Mapear `DATABASE_URL` a la conexión agrupada del proveedor y configurar
   `DATABASE_SSL_CA`. El cliente exige verificación TLS; nunca desactivarla.
4. Mantener `STORAGE_PROVIDER=vercel-blob` y el almacén privado conectado.
   La aplicación limita los archivos a 4 MiB. Comprobar que no permite lecturas
   anónimas ni modificar la ruta de un enlace firmado.
5. Cargar el entorno remoto solamente en el proceso de migración y ejecutar
   `pnpm db:migrate`; no ejecutar `db:seed` ni `db:reset`. La migración 0004
   restringe acceso directo de anon/authenticated a las tablas de la app y la
   0005 retira también los permisos explícitos de la función interna.
6. Desplegar el proyecto con `vercel deploy --prod --skip-domain --scope sacramented`.
   Verificar el entorno y la conexión a datos. Se usa protección estándar
   `prod_deployment_urls_and_all_previews`: el dominio público de producción es
   accesible y los enlaces de despliegues individuales/previews quedan protegidos.
7. Ejecutar `KNOWHUB_BETA_URL=https://URL pnpm test:beta` sobre el despliegue y
   comprobar PostgreSQL, almacenamiento remoto, aislamiento y reinicio de sesión.
   La prueba crea cuentas QA con contraseñas aleatorias y contenido ficticio.
8. Promover el despliegue validado, confirmar alias y HTTP sin sesión Vercel y
   actualizar `NEXT_PUBLIC_APP_URL` si difiere de la dirección prevista.

## Validación local

- Lint, tipos y compilaciones de Next completados.
- Suite general: 221 pruebas aprobadas en 30 archivos, incluida la prueba SQL
  de denegación de acceso directo para los roles `anon` y `authenticated`.
- E2E existentes: 8/8 aprobados también con Next 16.4.1.
- Perfil beta: recorrido completo aprobado con dos cuentas independientes,
  guardado tras recarga/login, documento original, transcripción, citas y 404
  entre cuentas. El mismo recorrido pasó en el dominio público con dos cuentas
  QA independientes: 1/1, 18,5 segundos. Se verificó el archivo original remoto.
- Infraestructura real: 25 tablas con RLS y sin SELECT para anon/authenticated;
  función de membresía sin EXECUTE para esos roles. Base inicialmente con cero usuarios.
- Blob real: subida, lectura y URL firmada aprobadas; acceso sin firma y ruta
  modificada rechazados con 403. Se eliminó únicamente el archivo de esta prueba.
- Consulta de logs de errores del despliegue tras la prueba: sin entradas devueltas.
  Es una comprobación puntual; no hay monitorización continua configurada.

## Dependencias

Next actualizado a 16.4.1 por los avisos oficiales GHSA-2464-fhr4-w9xw y
GHSA-p3m5-59mp-jv5r; Vitest 4.1.12 y parches transitivos compatibles.
La auditoría posterior informa cero avisos críticos y dos pendientes sin versión
corregida publicada al comprobar el registro: `braces` (alto, cadena de ESLint,
patrones del repositorio) y `sprintf-js` (moderado, CLI de Mammoth).
KnowHub usa `mammoth.extractRawText`, no su ejecutable ni argparse. No presentar
esta auditoría como cero vulnerabilidades; revisar al publicarse los parches.

`pnpm test:beta` compila y arranca una base aislada en el puerto 3013. Las
pruebas ordinarias mantienen `NEXT_PUBLIC_KNOWHUB_BETA=false` para preservar
la demo local. No usar datos de terceros para las pruebas de lanzamiento.

Límite de transporte verificado en la documentación de
[Vercel Functions](https://vercel.com/docs/functions/limitations).
TLS contrastado con [Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).

El procesamiento conserva el runner actual con Next `after()`. Para tareas
largas y una operación sostenida siguen pendientes worker durable, recuperación
automática y pruebas de carga; esta beta limita las entradas y no procesa audio.
