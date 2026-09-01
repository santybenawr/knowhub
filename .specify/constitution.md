# Constitución de KnowHub

Principios no negociables. Toda especificación, plan e implementación se evalúa
contra este documento. Si una spec contradice un principio, la spec está mal —
o el principio necesita una enmienda explícita, discutida y fechada.

No es una lista de buenas intenciones: cada principio está respaldado por código
y por una prueba que falla si se rompe.

---

## I. Toda afirmación de la IA enlaza a su evidencia

Esta es la razón de existir del producto, no una característica.

- Una respuesta que no puede verificarse no se entrega.
- Cada decisión, pendiente y punto clave referencia los segmentos exactos que lo
  sustentan.
- Una cita de reunión abre el audio en el segundo citado; una de documento, en su
  página.
- Los ids de evidencia que no existen en la fuente se descartan antes de guardar.

**Corolario:** si una función no puede rastrearse hasta su fuente, no se lanza.

*Verificado en:* `tests/integration/meeting-pipeline.test.ts`,
`tests/unit/search-scoring.test.ts`

---

## II. Sin evidencia no hay respuesta

Cuando la biblioteca no contiene la respuesta, KnowHub lo dice.

Nunca se recurre al conocimiento del modelo. Una respuesta correcta pero
proveniente del entrenamiento es indistinguible, para el usuario, de una
proveniente de sus documentos — y eso destruye toda la propuesta de confianza.

*Verificado en:* `tests/integration/knowledge-pipeline.test.ts`

---

## III. La ausencia se declara, no se rellena

Si en una reunión no se dijo quién es responsable, el campo es `null` y la
interfaz muestra "Responsable no especificado". Nunca un nombre inferido.

Aplica igual a fechas, participantes y hablantes: un hablante sin identificar se
muestra como "Hablante 1", que es una posición, no una identidad.

**Regla de diseño:** ningún campo que el modelo pueda desconocer se declara
obligatorio en el esquema. No se pone al modelo en la posición de tener que
inventar.

*Verificado en:* `tests/unit/meeting-analysis-schema.test.ts`

---

## IV. El `workspaceId` del cliente es una solicitud, no un hecho

Todo id que llega del cliente se resuelve contra membresías reales antes de
usarse. Los llamadores usan el id verificado que devuelve la resolución.

- El predicado `workspace_id` va **dentro del SQL**, no en el llamador.
- Un no-miembro recibe 404, no 403: un "prohibido" confirmaría que el id existe.
- Aplica a documentos, notas, reuniones, audio, transcripciones, análisis,
  búsquedas, embeddings y conversaciones.

*Verificado en:* `tests/integration/tenant-isolation.test.ts`,
`e2e/meetings.spec.ts`

---

## V. El contenido recuperado es dato, nunca instrucción

Los documentos y transcripciones son entrada no confiable. La defensa es
estructural, no un filtro de texto:

- Las reglas del sistema viven en un mensaje `system` y nada más va ahí.
- La evidencia va en un mensaje `user`, delimitada explícitamente.
- El prompt declara que lo delimitado es material citable y nunca una orden.

*Verificado en:* `tests/integration/prompt-safety.test.ts`

---

## VI. Un fallo degrada, no destruye

Cada etapa del procesamiento falla de forma independiente y conserva lo que las
anteriores produjeron:

| Falla | Lo que el usuario conserva |
| --- | --- |
| Transcripción | El audio, reproducible. **Nunca se borra.** |
| Análisis | La transcripción completa con timestamps |
| Embeddings | La reunión abierta y reproducible; solo falta la búsqueda |

Reintentar una etapa reemplaza su salida en una transacción: nunca duplica.

*Verificado en:* `tests/integration/meeting-failures.test.ts`

---

## VII. Los proveedores externos son intercambiables y explícitos

Almacenamiento, IA, transcripción y facturación viven detrás de una interfaz.
Nada por encima de esa frontera sabe qué proveedor responde.

- La app arranca y funciona **sin una sola credencial**.
- Los proveedores locales son deterministas y extractivos: no fabrican contenido.
- **En producción no hay fallback silencioso.** Sin credenciales, la aplicación
  falla con un error de configuración salvo que se active el proveedor local de
  forma explícita.
- Cuando corre en modo local, la interfaz lo dice en pantalla.

---

## VIII. Nada privado se guarda en claro ni se sirve sin autorizar

- El audio y los documentos son privados, fuera de cualquier ruta pública.
- Las lecturas van por URLs firmadas de vigencia corta, emitidas **solo después**
  de verificar la pertenencia. Nunca se persisten.
- Las rutas de almacenamiento se derivan de ids verificados; el nombre de archivo
  del usuario jamás forma parte de una ruta.
- El tipo de archivo lo deciden los *magic bytes*, no la extensión ni el MIME
  declarado.
- Los registros de auditoría guardan identificadores y conteos. **Nunca audio,
  transcripciones ni cuerpos de documento.**

---

## IX. Las pruebas describen comportamiento de producto

Una prueba que replica la implementación no prueba nada: cambia con ella.

- Se prueba lo que el producto promete, no cómo lo cumple.
- Las pruebas de integración corren contra PostgreSQL real (embebido), así que
  ejercitan el SQL de verdad, incluidas restricciones y búsqueda híbrida.
- Ninguna prueba toca la red ni depende de credenciales.
- No se elimina una prueba válida para conseguir verde.

---

## X. Se dice la verdad sobre las limitaciones

- No se promete grabación en segundo plano si el navegador puede suspenderla.
- No se muestra un porcentaje de progreso que el proveedor no reporta.
- No se simulan pagos.
- Un borrador legal se marca como borrador en la propia página.
- Un botón que no puede funcionar en este navegador se reemplaza por las
  alternativas que sí funcionan, no se deja roto.

---

## Enmiendas

| Fecha | Cambio | Motivo |
| --- | --- | --- |
| 2026-08-21 | Versión inicial, derivada del MVP construido | Adoptar SDD |
