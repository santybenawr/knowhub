# Plan NNNN — <Nombre>

> Deriva de [`spec.md`](spec.md). Si el plan necesita algo que la spec no pide,
> se corrige la spec primero.

## Enfoque

La decisión técnica central en un párrafo. Qué se hace y por qué esto y no lo
otro.

## Alternativas descartadas

Lo que se consideró y por qué no. Esto es lo que evita volver a discutirlo en
tres meses.

| Alternativa | Por qué no |
| --- | --- |
| … | … |

## Cambios en el modelo de datos

Tablas, columnas, índices, restricciones. Número de migración si aplica.

```sql
-- …
```

## Fronteras afectadas

Qué capas se tocan y qué contrato cambia.

| Capa | Cambio |
| --- | --- |
| `src/server/…` | … |
| `src/app/…` | … |

## Estrategia de pruebas

Qué se prueba en unitarias, qué en integración, qué en e2e — y por qué en ese
nivel y no en otro.

- **Unitarias:** …
- **Integración:** …
- **E2E:** …

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| … | … |

## Impacto en la constitución

¿Este plan tensiona algún principio? Si sí, se resuelve aquí o se para.
