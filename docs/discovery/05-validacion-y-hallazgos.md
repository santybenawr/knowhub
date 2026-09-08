# KnowHub — acta de validación y hallazgos de ejecución

Fecha: **8 de septiembre de 2026**. Repositorio: `santybenawr/knowhub`. Base: `aa18d022367c55c903f6caa8e9b90b485217829f`. Rama local: `codex/knowhub-discovery-landing`.

La revisión se realizó sobre una clonación nueva. No se usó la carpeta original que puede estar abierta en Claude Code ni la demo histórica KnowHub v2. No se modificaron `src/`, `public/`, dependencias, lockfile, migraciones o configuración de la aplicación. Los cambios del repositorio son documentos y el índice de specs; no se hizo push ni despliegue.

## 1. Resultados actuales

| Comprobación | Resultado | Alcance |
| --- | --- | --- |
| Instalación del lockfile | Completada con pnpm 11.5.3 | 23 dependencias de ejecución y 16 de desarrollo; inventario en `06-dependencias.md`. |
| `pnpm verify` | **Exit 0** | Incluye lint, tipos, Vitest y build en secuencia. |
| Lint y TypeScript | **Pasaron** | Sin errores informados por estos comandos. |
| Vitest | **150 pruebas / 18 archivos pasaron** | PGlite y proveedores deterministas locales; duración informada 6,62 s. |
| Build de producción | **Pasó** | Next.js 16.3.1; compilación y generación de rutas completadas. |
| `pnpm test:e2e` | **Bloqueado al iniciar Chromium** | Cinco casos reportados fallidos antes de sus acciones (0 ms), más reintentos configurados. No son cinco recorridos ejecutados con fallos funcionales. |
| Revisión con navegador integrado | **Parcial, realizada** | Portada responsive, ingreso con cuenta demo, dashboard, reunión, decisiones, consulta local y apertura de cita. No sustituye toda la suite. |
| Consola del navegador integrado | Sin entradas `error`/`warn` en la consulta final del recorrido | Solo refleja el alcance inspeccionado, no todas las rutas o situaciones de la app. |
| Fuentes de documentación | Comprobación automática de existencia y límites de líneas, más contraste selectivo de contenido | No equivale a certificación semántica automática de cada referencia. |

El error de Chromium fue `bootstrap_check_in ... Permission denied (1100)` / `MachPortRendezvousServer`; el proceso termina antes de arrancar los recorridos. No se desactivaron controles del sistema para forzar su ejecución. Se utilizó el navegador integrado disponible para una inspección independiente.

Entorno: macOS ARM64, Node **v26.3.0**, pnpm **11.5.3**. La prueba automatizada de navegador usa el servidor configurado en 3011 y sus datos aislados. La revisión visual utilizó una instancia local en 3027 y otra base/directorio de almacenamiento, con el seed ficticio del repositorio. No se configuraron claves de IA o transcripción externas.

## 2. Recorrido observado en el navegador integrado

1. Portada actual cargada con título, CTA, navegación e identidad KnowHub.
2. Clic en «Iniciar sesión» y acceso con la cuenta local de demostración incluida en el seed.
3. Dashboard visible con proyectos, documentos, nota y reunión de ejemplo; aviso de proveedores locales visible.
4. Apertura de «Reunión Proyecto Emprendimiento» y pestaña Decisiones: se muestra «Entonces vamos a seleccionar el proveedor B» con fuente `01:38`.
5. Consulta «¿Qué proveedor seleccionamos?» desde la pestaña Preguntar: se devuelve una respuesta extractiva local y una fuente del intervalo `00:00–02:58`.
6. Clic en la cita de la respuesta: cambia a la pestaña Transcripción y permite inspeccionar sus segmentos. No hay audio en esta reunión importada y no se comprobó reproducción física.
7. Revisión visual de esa transcripción a 390 px; ancho de documento y viewport ambos 390 px. La barra de pestañas usa desplazamiento horizontal propio.

La respuesta local observada incluyó frases sobre las propuestas y la diferencia de precio; **no fue literalmente la respuesta editorial del storyboard**. El storyboard usa una recreación coherente y rotulada, no una captura de ese resultado. El intervalo recuperado abarca casi toda la reunión breve: citar el inicio de un fragmento no identifica necesariamente el segundo de la afirmación específica.

## 3. Fallos y diferencias confirmados en interfaz

| Hallazgo | Evidencia de ejecución | Interpretación y acción propuesta |
| --- | --- | --- |
| Cabecera pública desborda en móvil | Viewport 320 px → documento 484 px; viewport 390 px → documento 484 px. Captura visual muestra navegación cortada. A 768, 1280 y 1440 px no se midió ese desbordamiento. | Corregir composición de header en la spec 0009; no basta con reducir el tamaño de letra del hero. Revisar también legales por layout compartido. |
| Fuente de decisión sin audio no revela directamente la transcripción | En Decisiones, pulsar «Fuente · 01:38» mantiene esa pestaña, sin resultado visible que muestre el texto de origen. | `seekToEvidence()` actualiza tiempo pero no cambia pestaña (`src/features/meetings/meeting-workspace.tsx:89–103`). El clic desde una cita de Ask sí cambia pestaña (`105–113`). Registrar corrección independiente del producto. |
| Controles de transcripción dicen «Reproducir» aun sin grabación | La reunión del seed no tiene reproductor de audio, pero sus segmentos muestran controles «Reproducir desde…». | Diferenciar saltar a segmento y reproducir audio. La demo nueva no debe heredar esta ambigüedad. |
| Fuente de Ask a nivel de fragmento | La consulta observada enlaza `00:00–02:58`, mientras la decisión está en `01:38`. | Describir retorno al fragmento/intervalo citado; no garantizar alineación exacta de cada afirmación. |

Estas observaciones pertenecen a la base existente. No se introdujeron cambios visuales ni de backend durante esta preparación.

## 4. Brechas prioritarias del código

El [informe de arquitectura](01-arquitectura-y-funcionalidades.md) contiene evidencia y una lista más amplia. Las siguientes condicionan la propuesta:

- La poda de referencias admite afirmaciones sin ids de evidencia y el RAG conserva fuentes aunque falten citas válidas; no hay garantía técnica de respaldo de cada frase.
- El proveedor local de transcripción devuelve un guion ficticio, no reconocimiento de voz.
- No hay transporte de correo ni integración completa de pagos.
- TLS remoto desactiva verificación de certificado y la migración RLS depende de una función específica del entorno; requieren revisión antes de producción.
- Los PNG PWA actuales son de 1×1 px; no se ofrece funcionamiento offline.
- Reemplazo de audio, acceso por invitación, continuidad de trabajos y conteo de consumo requieren comprobaciones específicas.

Son hallazgos de lectura salvo los identificados expresamente como observados en navegador. No se realizó explotación ni auditoría integral. No se corrigieron incidentalmente en una tarea de diseño de landing.

## 5. Cómo reproducir

En una copia del repo con Node/pnpm compatibles:

```sh
pnpm install --frozen-lockfile
pnpm verify
pnpm test:e2e
```

La suite E2E utiliza su propia configuración de servidor, base, mocks y almacenamiento. Comprobar que el puerto 3011 esté libre y que el entorno permita iniciar Chromium. Si falta el navegador, instalarlo desde las herramientas oficiales de Playwright según el entorno; en esta revisión el ejecutable ya existía y falló por permisos del sistema.

Para explorar contenido ficticio local, sin apuntar `DATABASE_URL` a una base ajena:

```sh
ENABLE_DEMO_DATA=true pnpm db:seed
PORT=3027 pnpm dev
```

El seed original documenta sus credenciales de demostración en el README del repo. Los comandos anteriores son una receta para una copia local sin servicios reales, no una instrucción para sembrar producción.

**Particularidad del entorno de esta revisión:** se usó un almacén pnpm dentro de `work/pnpm-store`. Con pnpm 11, la variable válida comprobada fue `PNPM_CONFIG_STORE_DIR`; la antigua `npm_config_store_dir` no era reconocida. Una instalación interrumpida dejó el estado de dependencias incompleto; se conservó su archivo de estado para diagnóstico y se reconstruyeron enlaces desde el almacén ya descargado. No se cambiaron versiones ni el lockfile. Este incidente de preparación quedó resuelto antes de las verificaciones finales de navegador. Véanse las [notas oficiales de pnpm 11](https://github.com/pnpm/pnpm.io/blob/main/blog/releases/11.0.md).

## 6. Pendientes reales

- Ejecutar los cinco E2E en un entorno que permita iniciar su Chromium.
- Micrófono físico, audio real, proveedor de IA/transcripción externo, PostgreSQL/Supabase remoto y producción.
- Revisión integral de accesibilidad: teclado, lector de pantalla, contraste, zoom y movimiento reducido; la inspección visual parcial no la sustituye.
- Medición de rendimiento con condiciones y tráfico definidos. No hay valores actuales de Core Web Vitals en esta entrega.
- Aprobación de spec, plan y tareas 0009 antes de implementar la landing, conforme al proceso del repo.
- Cuenta, modelo y presupuesto de generación para producir los assets opcionales de Higgsfield; no se generó ni compró material.
- Datos de portada y rúbrica académica para convertir la propuesta del SDD en entrega institucional final.
