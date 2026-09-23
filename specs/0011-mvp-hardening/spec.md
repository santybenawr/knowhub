# 0011 · MVP de presentación y correcciones verificables

Fecha: 22/09/2026. El usuario solicita revisar la app completa, corregir errores y preparar un MVP en aproximadamente una semana y media. Prioridad confirmada: demo local; publicación deseable después de validar infraestructura.

## Contrato de esta revisión

- Reset de contraseña: consumo atómico del token y revocación de sesiones anteriores en una transacción; solicitudes concurrentes no pueden reutilizarlo.
- Audio: subir con una clave nueva antes de sustituir la referencia. Si falla upload/DB o cambia la referencia concurrentemente, conservar el audio anterior. No sobrescribir una referencia actualizada por otra solicitud.
- Evidencia: una respuesta sin citas válidas se sustituye por abstención, tanto por API como en modo no streaming; no entregar texto sin verificar citas. La existencia de una cita no certifica respaldo semántico. Eliminar elementos de análisis que queden sin segmentos válidos.
- Reproducción: respetar rangos simples de bytes y responder 206/416 correctamente, después de verificar la firma.
- Navegación de fuentes: citas y botones de evidencia abren la transcripción, incluyendo el segundo cero y las reuniones importadas sin archivo de audio.
- Interfaz: error o stream incompleto no se muestra como respuesta terminada; distinguir explícitamente transcripción ficticia de importación real y no anunciar integración de pagos inexistente.
- Demo: datos, almacenamiento y puerto aislados; no tocar las cuentas ni datos previos. Preparar instrucciones y evidencias de pruebas reproducibles.
- Cola local: un fallo transitorio se reintenta sin confundirse con una cola vacía; máximo de tres intentos y sin reintentar errores de validación. El worker durable sigue fuera de este cierre.

No se declara producción, suscripciones, App Store, transcripción real, QA de micrófono ni ausencia total de errores con pruebas locales. No se publica backend sobre la rama de marketing. Registrar otros hallazgos con alcance y evidencia.
