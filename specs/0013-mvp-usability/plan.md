# Plan

## Correcciones operativas

1. Reproducir fallos con datos ficticios: TXT de distintos editores, filtros
   combinados, notas con guardado lento, importaciones y preguntas guardadas.
2. Centralizar decodificación y formatos; corregir alias de consultas UNION y
   mantener filtros en URL con validación de pertenencia al workspace.
3. Esperar guardados antes de navegar. Generar embeddings fuera de la transacción
   y reemplazar los fragmentos solo si el contenido vigente coincide con la instantánea.
4. Serializar encolado/reclamación con un bloqueo corto de workspace. Mantener un
   seguimiento por nota y recuperar trabajos abandonados desde el reintento explícito.
5. Actualizar estados de procesamiento y conservar reuniones al reintentar.
   Reabrir conversaciones con sus citas y alcance; acotar esperas y manejar errores.
6. Liberar la inicialización fallida de la base para permitir reconexión, sin
   ocultar errores de configuración ni desactivar TLS.

## Guía y registro

1. Conectar la acción existente de omisión al formulario y hacer la finalización
   transaccional e idempotente, sin migrar tablas.
2. Sustituir las promesas de audio del último paso por una guía breve y concreta.
3. Reutilizar la introducción en una página de ayuda con instrucciones ampliadas,
   límites, acciones disponibles y resolución de problemas.
4. Añadir acceso permanente desde el menú lateral y la barra móvil.
5. Cubrir persistencia, reintentos, contenido beta y navegación con pruebas.

## Publicación

Repetir lint, tipos, suite y recorridos tras los últimos cambios. Restaurar y
verificar la conexión remota antes de considerar operativa la beta. Preparar un
despliegue sin asignar el alias, probar el perfil real y promover solo tras validar.
La auditoría distingue evidencia local, bloqueo de infraestructura y estado de release.

Se conserva el diseño, los componentes y las dependencias existentes. La guía
no depende de ventanas emergentes, no escribe datos de muestra y no requiere
almacenamiento adicional ni servicios externos.
