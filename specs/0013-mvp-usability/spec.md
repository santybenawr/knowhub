# 0013 — Usabilidad y guía de la beta

## Objetivo

Corregir los recorridos del MVP publicado y acompañar a una persona recién
registrada hasta que pueda guardar, encontrar y consultar su información.

## Contenido, filtros y guardado

- TXT/Markdown admiten UTF-8, UTF-16 con BOM y Windows-1252 sin confundir texto
  UTF-16 con audio. El contenido binario o corrupto se rechaza con un mensaje útil.
- Las tarjetas identifican PDF, Word/DOCX, TXT y Markdown. La biblioteca combina
  tipo, formato de documento y proyecto, y permite limpiar los filtros.
- Las consultas de notas o reuniones solas conservan los alias SQL necesarios;
  las combinaciones no provocan errores de columnas ni muestran otros workspaces.
- Los estados vacíos distinguen ausencia de contenido de ausencia de coincidencias.
- Salir de una nota por un enlace interno espera el último guardado. Cerrar o
  recargar con cambios pendientes activa el aviso del navegador.
- Una nota creada con solo título es buscable. Una nota vacía no queda en espera.
- La indexación conserva la versión anterior hasta reemplazarla completa; una
  edición o eliminación durante el procesamiento impide publicar una versión vieja.
- Encolado concurrente y reintentos no duplican etapas; las ediciones de una nota
  se agrupan en un seguimiento pendiente detrás del trabajo activo.
- Eliminar un proyecto conserva sus recursos y retira su asociación al proyecto.

## Reuniones, preguntas y disponibilidad

- Los detalles y listados actualizan el procesamiento sin recargar manualmente.
- Una importación fallida puede reintentarse sobre la misma reunión. La fecha
  elegida se conserva como fecha de calendario y no cambia por zona horaria.
- La transcripción usa búsqueda literal y navegación con teclado; las citas
  abren el segmento correspondiente, incluido el segundo cero.
- El historial de preguntas se reabre con mensajes y citas, se puede continuar y
  conserva el alcance original. Una fuente eliminada no habilita una consulta global.
- La lectura de respuestas parciales procesa frames completos y comunica fallos
  de conexión, respuesta incompleta o tiempo agotado, en lugar de quedar esperando.
- Buscar conserva los filtros al navegar y comunica validación/límites de uso sin
  sustituir toda la página por un error inesperado.
- Una inicialización de base de datos fallida se puede reintentar; una desconexión
  ociosa no debe cerrar el proceso ni registrar credenciales.

## Guía y registro

- El registro conserva tres pasos breves: propósito, proyecto opcional y guía.
- La guía explica notas, formatos y límite de documentos, espera de procesamiento,
  reuniones por transcripción, filtros combinados y consulta de fuentes.
- La beta no promete IA externa ni transcripción de audio disponibles.
- Omitir finaliza la configuración de forma persistente, sin volver a enviarla
  a la misma pantalla al abrir Inicio o iniciar sesión otra vez.
- Completar dos veces no crea proyectos duplicados ni modifica una configuración
  ya completada. Proyecto y finalización se guardan en una transacción.
- Ayuda y guía está disponible en `/help`, en escritorio y móvil, sin volver a
  configurar la cuenta ni crear datos de ejemplo.
- La navegación por teclado muestra el foco y comunica el paso actual.

## Validación

Pruebas de decodificación, filtros SQL, aislamiento, transacciones y concurrencia;
recorridos de guardado/navegación, reuniones, historial y registro/omisión/reingreso;
acceso a la guía en móvil y contenido coherente con el perfil beta. La evidencia
y las comprobaciones aún pendientes constan en
[la auditoría del 05/11/2026](../../docs/mvp-audit-2026-11-05.md).

## Fuera de alcance

No activar IA externa, audio, correos, pagos ni planes de pago. Esta revisión no
añade migraciones, no reinicia los datos y no sustituye los proveedores actuales.
Una compilación aprobada no acredita que la infraestructura remota esté operativa.
