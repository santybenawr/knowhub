# Recuperación de la base de datos — 05/11/2026

**Estado: servicio recuperado en Neon y publicado; prueba pública aprobada.**
El dominio https://knowhub-app-sacramented.vercel.app apunta al despliegue
`dpl_C7Py2ou5PWqLyvB1tRtBYZKZ9Ws6`, READY. `/api/health`, el formulario de registro
y la marca responden 200 sin sesión de Vercel. El recorrido público completo
con dos cuentas sintéticas pasó después de la promoción. Este documento
complementa la [verificación del MVP y la marca](mvp-recheck-brand-2026-11-05.md).
Las horas de los informes privados están en UTC; la fecha del incidente se
expresa en America/Bogota.

## Diagnóstico y decisión

Las conexiones nuevas al pooler de Supabase fallaron con `28P01` en el puerto
6543 y `28000 / PAM authentication failed` en el 5432. El SQL Editor también
falló. El reinicio previo no recuperó el servicio. El propietario restableció
la contraseña y se comprobó que la integración de Vercel recibió el cambio;
ambas conexiones volvieron a fallar. El ticket `SU-540664` solo tenía acuse de
recibo cuando se consultó durante esta recuperación.

PostgREST seguía permitiendo la lectura autorizada de los datos. El propietario
autorizó primero un respaldo privado completo y después su transferencia a
Neon Free, incluidas cuentas, hashes de contraseñas y contenido. Condiciones:
conservar Supabase intacto y cambiar producción únicamente después de verificar
la restauración y los flujos. No se contrató un plan de pago.

## Respaldo y archivos

- Exportación de las 25 tablas: 754 filas, incluidas 8 cuentas y sus 8 registros
  de credenciales, 8 documentos, 5 notas, 3 reuniones y 6 entradas del historial
  de migraciones. No se regeneran identificadores ni contraseñas de usuarios.
- SHA-256 verificado para los 25 archivos de datos y las 6 fuentes de migración.
  Una segunda lectura completa coincidió en contenido y conteos para todas las
  tablas. Se comprobaron 50 claves foráneas y 1.403 referencias, sin roturas.
- La exportación por API fue secuencial, no un snapshot transaccional. La doble
  lectura acredita estabilidad durante esa comprobación.
- Respaldo local en `.data/launch/recovery-backup-nov05/`, ignorado por Git:
  directorio 0700 y archivos 0600. No incluirlo en commits ni despliegues.
- Los binarios originales permanecen en Vercel Blob privado. Una consulta de
  metadatos confirmó disponibles los 8 archivos originales referenciados por
  los documentos activos. El respaldo JSON conserva sus rutas y contenidos
  extraídos; no constituye un segundo respaldo de los binarios.

## Destino y compatibilidad

Neon `knowhub-recovery-data`, plan `free_v3`, región `iad1`, recurso
`store_bok9Pkx8x9OQTrHa`, está conectado únicamente al entorno production de
`sacramented/knowhub-app` con prefijo `KNOWHUB_RECOVERY`. La conexión directa
verificada usa TLS y el rol de servidor tiene `BYPASSRLS`. La primera inspección
confirmó que el destino no contenía tablas de aplicación.

KnowHub autentica mediante scrypt y sesiones propias; esta operación no migra
a Supabase Auth ni activa Neon Auth. Las migraciones históricas `0002` y `0005`
referencian `auth.uid()`. Para poder aplicarlas en este destino sin Supabase,
el importador crea esa función solo si no existe: devuelve siempre `NULL::uuid`
y revoca su ejecución a `PUBLIC`. Es una compatibilidad que deniega acceso por
defecto, no una implementación de identidad de usuarios.

El backend conserva su rol privilegiado y sus comprobaciones de pertenencia
al workspace en cada operación. Por ello, la verificación de RLS y permisos
de tablas debe acompañarse de pruebas remotas de aislamiento entre cuentas;
habilitar RLS por sí solo no demuestra ese aislamiento. No exponer las
credenciales PostgreSQL al navegador ni crear acceso directo para usuarios.

Se actualizó `DATABASE_URL` de production como secreto a la conexión agrupada
de Neon y se retiró `DATABASE_SSL_CA` de ese entorno. Neon se valida con las
raíces de confianza del sistema y `rejectUnauthorized: true`. Se conservan
`AUTH_SECRET`, la configuración de Blob privado y los límites de la beta.
Los cambios se probaron primero en un build con `--skip-domain`; el dominio
público se reasignó únicamente después de aprobar las pruebas.

## Restauración y verificaciones

El importador privado exige host de destino exacto, base vacía, rol adecuado y
checksums válidos. El comando que lo invoca comprueba previamente que el informe
de destino no exista; el script lo escribe con modo exclusivo `wx` después de
confirmar. Esta comprobación previa evita confundir un fallo al guardar el
informe con un fallo de restauración. Ejecuta esquema y datos dentro de una
transacción, omite columnas generadas y compara todas las filas mediante tipos
PostgreSQL. Comprueba conteos, claves foráneas, RLS y ausencia de permisos de
tablas para `PUBLIC` antes de confirmar. Conserva las fechas del historial de
migraciones y regenera los vectores de búsqueda derivados.

| Comprobación | Resultado confirmado |
| --- | --- |
| Ensayos locales de restauración v2 y v3 | 25/25 tablas, 754 filas y contenido coincidente; 50 FK / 1.403 referencias sin roturas |
| Políticas PostgreSQL en ensayo local | No comprobadas por PGlite; obligatorias en el destino remoto |
| Primera restauración remota | Revertida íntegramente; el destino volvió a quedar vacío |
| Causa del primer intento | El driver remoto devuelve `name[]` como texto; el importador necesitó convertir los nombres a `text[]` |
| Restauración definitiva en Neon | Confirmada: 25/25 tablas, 754 filas y contenido coincidente; 50 FK / 1.403 referencias sin roturas |
| Seguridad del destino restaurado | 25 tablas con RLS; 0 permisos de tablas para `PUBLIC` |
| Variables del siguiente build | `DATABASE_URL` apunta al pool Neon; `DATABASE_SSL_CA` retirada de production |
| Build protegido con conexión Neon | `dpl_C7Py2ou5PWqLyvB1tRtBYZKZ9Ws6`, READY; compilación y TypeScript aprobados; `/api/health` 200 |
| E2E remoto antes de promoción | Aprobado, 22,4 s: registro/tutorial, notas, TXT UTF-16, descarga privada, filtros, reunión, fuentes, nuevo inicio de sesión y aislamiento entre dos cuentas QA |
| Logs del candidato después de E2E | 0 entradas de nivel error en la consulta del despliegue |
| Datos originales después del E2E protegido | 754/754 presentes e idénticos, sin excepciones; 61 filas nuevas de QA; 50 FK / 1.496 referencias actuales sin roturas |
| Promoción al dominio público | Confirmada; inspección del dominio resuelve a `dpl_C7Py2ou5PWqLyvB1tRtBYZKZ9Ws6` |
| HTTP público sin sesión Vercel | Health/registro/logo 200; dashboard anónimo redirige a login (307); subida anónima rechazada (401); logo idéntico al archivo local |
| E2E completo después de promoción | Aprobado, 18,1 s, en el dominio público sin cookie de protección Vercel; otras dos cuentas QA independientes |
| Logs después del E2E público | 0 entradas de nivel error en la consulta del despliegue |

Evidencias privadas dentro de `.data/launch/`: informes de ensayo local v2/v3;
`recovery-neon-restore-report.json` registra el intento revertido y
`recovery-neon-restore-report-v2.json` acredita la restauración confirmada.
`recovery-original-records-verification.json` registra la comparación posterior
de los originales en una transacción de solo lectura. La verificación pública
está en `neon-public-verification.json` (06/11/2026 00:42 UTC, 05/11 en Colombia).
El candidato probado es
`https://knowhub-iwzd95uid-sacramented.vercel.app`; conserva la protección de
Vercel. Las capturas de la suite documentan la guía de escritorio/móvil y los
filtros TXT/proyecto con la marca 3D. TypeScript, ESLint de la configuración de
pruebas y `git diff --check` también pasaron. No se modificó código de runtime
en esta recuperación; se cambió su configuración de conexión.

Los únicos cambios de código son opciones de la suite de pruebas:
`playwright.beta.config.ts` y `e2e-beta/launch.spec.ts` aceptan un estado privado
con una cookie de protección limitada al host del candidato. No comparten
sesiones de aplicación entre cuentas. Los dos recorridos crearon en total
cuatro cuentas QA con contenido ficticio, aislado de los usuarios originales.

## Publicación y reversión

1. Completar y verificar la restauración remota. No repetir el importador sobre
   una base con datos; su guarda de destino vacío debe permanecer activa.
2. Preparar las variables del siguiente build y desplegar con
   `--prod --skip-domain`. La URL pública mantiene el despliegue anterior mientras se
   prueba el candidato. Conservar la protección de despliegues de Vercel.
3. Ejecutar la suite beta con dos cuentas sintéticas independientes, revisar
   `/api/health`, descarga privada y errores de runtime. Para un despliegue
   protegido, el estado privado de Playwright puede contener únicamente la
   cookie de acceso a Vercel, nunca una sesión de usuario de la aplicación.
4. Promover solo el candidato aprobado; comprobar alias, health y acceso desde
   el dominio público sin sesión Vercel. Registrar ID y evidencia arriba.

Antes de la promoción, un candidato fallido puede descartarse sin cambiar el
dominio público ni borrar la restauración. Después, una reversión de código
debe usar un build validado contra la misma base Neon y compatible con su
esquema. No promover a ciegas el build antiguo: conserva credenciales anteriores
y depende de Supabase, que sigue averiado. Volver a Supabase requiere recuperar
primero su conexión, incorporar de forma controlada cualquier escritura nueva
hecha en Neon, verificar integridad y probar un nuevo candidato. Nunca alternar
ambas bases como destinos de escritura sin esa reconciliación.

Supabase y el respaldo privado se conservan para recuperación. La migración no
habilita IA externa, transcripción de audio, correo de recuperación ni cobros;
se mantiene el alcance explícito de la beta.
