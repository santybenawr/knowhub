# Segunda verificación y marca 3D — 05/11/2026

**Estado final:** servicio recuperado mediante Neon, con datos conservados y
pruebas remotas aprobadas antes y después de publicar. Ver el
[informe de recuperación](incident-recovery-2026-11-05.md). Las observaciones de
Supabase que siguen corresponden al diagnóstico previo a esa recuperación.

**Primera promoción:** por solicitud expresa del propietario, el build
`dpl_GWuZNqLozfLzN4s6Gtzcjh7bAtVS` se promovió al dominio público el 05/11/2026.
La inspección de Vercel confirma el nuevo destino. `/signup` y la marca responden
200 sin autenticación de Vercel; el logo coincide con el archivo probado.
`/api/health` sigue en 503: publicar el build no resolvió la conexión de Supabase.
La recuperación de datos/conexión se documentó por separado. Las notas
de preparación siguientes conservan la evidencia anterior a la promoción.

## Alcance y cambios

Repetición de las pruebas del MVP tras la auditoría operativa y sustitución del
símbolo plano por la escultura original de cristal violeta. El original está en
`public/marketing/memory-sculpture.webp`; no se generó una marca distinta.

- `src/components/shared/logo.tsx`: imagen local optimizada, reutilizada por la
  aplicación, onboarding, acceso, landing y demo. Revisada en claro/oscuro/móvil.
- `src/app/layout.tsx`, `src/app/manifest.ts`, `public/brand` e iconos públicos:
  favicon, Apple, instalación y variante maskable. Se corrigieron los PNG
  anteriores de 1×1 píxel, que estaban declarados como 192×192 y 512×512.
- `scripts/export-brand-icons.mjs`: exportación reproducible del original, sin
  credenciales, servicios externos ni nuevas dependencias.
- Los builds estáticos copian la marca compartida para evitar imágenes 404.
- `e2e/branding.spec.ts`: comprueba carga de imagen, temas, móvil y dimensiones
  reales de los PNG frente a su declaración. Landing y demo comprueban la imagen.

No cambia la base de datos, los proveedores de IA ni los límites de la beta.

## Validación repetida

| Verificación | Resultado |
| --- | --- |
| Vitest, lógica e integración con PostgreSQL embebido | 279/279, 41 archivos, 26,12 s |
| ESLint y TypeScript después del cambio de marca | Aprobados |
| MVP Chromium con build Webpack | 21/21, 46,1 s |
| Perfil beta local con build Webpack | 1/1, 21,1 s |
| Demo estática, escritorio y móvil, con build Webpack | 10/10, 6,7 s |
| Landing estática con build Webpack | 4/4, 2,5 s |
| Auditoría de dependencias | 0 vulnerabilidades conocidas, 682 dependencias consultadas |
| Paquete de despliegue | Marca incluida; sin .env, .data, .vercel ni resultados privados |

La beta verifica dos cuentas, registro/tutorial, persistencia tras volver a
entrar, TXT UTF-16 y descarga privada, filtros combinados, transcripción,
fuentes, aislamiento y ayuda móvil. Los recorridos de marca y beta no registraron
errores JavaScript de página. No se han comprobado dispositivos físicos ni
Safari/Firefox, carga sostenida ni recuperación de backups.

La exportación de landing usa ahora Webpack, igual que MVP y demo: Turbopack
falló al abrir un puerto en este entorno. Una primera compilación sin red no
pudo obtener Inter; la compilación con acceso de red pasó. Dos pruebas de
landing se ajustaron después de inspeccionar su evidencia: el selector de
`noscript` apuntaba un elemento vacío y la pausa se pulsaba sin hidratación
tras fallar la descarga de un chunk del servidor local. Se verifica ahora la
respuesta visible y la hidratación antes del clic; no se alteró el comportamiento
de pausa para hacer pasar la prueba.

Evidencias locales ignoradas por Git: `.data/launch/nov05-recheck-*.log` y
`nov05-recheck-dependency-audit.json`. Las capturas del logo se guardaron también
fuera del repositorio para revisión del propietario.

## Producción

El dominio público sigue devolviendo HTTP 503 en `/api/health`. La incidencia
de Supabase documentada en [la auditoría anterior](mvp-audit-2026-11-05.md)
sigue bloqueando el recorrido remoto. El reporte autorizado tiene número
**SU-540664**. Ninguna prueba local acredita que el registro público funcione.

Se debe recuperar la conexión, validar los flujos remotos y promover el nuevo
build probado. No se resetearon datos, rotaron contraseñas ni cambiaron planes.

### Despliegue preparado con la marca

- Proyecto/equipo: `sacramented/knowhub-app`.
- Commit probado: `da08f964dcb004c3e2d028272e9272dd35e54208`, subido a
  `origin/codex/knowhub-production-readiness`.
- Despliegue: `dpl_GWuZNqLozfLzN4s6Gtzcjh7bAtVS`, **READY**, objetivo production,
  creado con `--skip-domain`; la API confirma el commit y `alias: []`.
- URL protegida: https://knowhub-bemz1tj4k-sacramented.vercel.app
- Inspección: https://vercel.com/sacramented/knowhub-app/GWuZNqLozfLzN4s6Gtzcjh7bAtVS
- Build remoto Webpack aprobado. `/signup` y `/brand/knowhub-3d.webp`: HTTP 200.
  El HTML contiene el formulario y la nueva marca; la imagen descargada coincide
  byte por byte con el archivo probado localmente.
- `/api/health`: HTTP 503. Los registros del nuevo despliegue confirman `28P01`.
- El dominio público sigue en `dpl_3ZjLZVzPUPAMVLLfvX729k1m8Zod`; no se promovió.

Este despliegue reemplaza al anterior preparado para la futura promoción.
Después de recuperar y verificar registro/persistencia/aislamiento remotos:

```bash
vercel promote https://knowhub-bemz1tj4k-sacramented.vercel.app --scope sacramented
```

## Repetir la comprobación local

```bash
node_modules/.bin/vitest run
node_modules/.bin/eslint .
node_modules/.bin/tsc --noEmit --incremental false
node_modules/.bin/playwright test
node_modules/.bin/playwright test --config playwright.beta.config.ts
node scripts/build-landing.mjs
node_modules/.bin/playwright test --config marketing/playwright.config.ts
node scripts/build-demo-web.mjs
node_modules/.bin/playwright test --config demo-web/playwright.config.ts
```

Los dos últimos comandos construyen y arrancan servidores con bases de prueba
aisladas. Ejecutarlos secuencialmente: ambos usan el build raíz `.next`.
