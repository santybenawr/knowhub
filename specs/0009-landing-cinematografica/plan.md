# Plan 0009 — Landing cinematográfica

> Deriva de [spec.md](spec.md). **Aprobado para implementación el 2026-09-08**, con enmienda de prelanzamiento y Vercel registrada en la spec.

La exportación pública tendrá una entrada mínima en `marketing/` que importa los mismos componentes de `src/features/marketing/`. Reutiliza Next, Inter y las dependencias existentes. Su salida estática no contiene APIs ni servicios privados. El script `build:landing` prepara assets y exporta las rutas públicas. No se migra el hosting de la app.
> Fecha: 2026-09-08 · Base: `aa18d022367c55c903f6caa8e9b90b485217829f`.

## Enfoque

Conservar Next.js App Router y el grupo `(marketing)`. La portada seguirá siendo un Server Component; solo la demo y controles de movimiento necesitan componentes cliente. La dirección visual amplía la identidad violeta/ámbar y representa el recorrido de la fuente con texto real. Un video ambiental puede añadirse sin cambiar el significado ni los contratos de la página.

La primera implementación utiliza CSS, SVG propio, IntersectionObserver y APIs del navegador. No se añade una biblioteca de animación antes de demostrar que una interacción requerida la necesita. No se cambia de framework ni hosting.

## Alternativas evaluadas en esta propuesta

| Alternativa | Decisión y razón |
| --- | --- |
| Reutilizar marketing existente | Recomendada: ya ofrece `/`, tema, logo, CTA, legales y despliegue común. |
| Crear otra app o migrar de framework | Descartada: duplica identidad, despliegue y navegación sin necesidad demostrada. |
| GSAP + Motion + Lenis + Three.js | Descartada como paquete inicial: cuatro sistemas para una experiencia resoluble con HTML/CSS. |
| GSAP para una secuencia compleja | Reserva técnica: evaluar solo si aparece una necesidad concreta, con revisión de coste y compatibilidad. |
| Video con todo el texto y UI generados | Descartado: ilegibilidad, inconsistencias y falta de interactividad; texto/UI serán HTML. |
| Hero dependiente de WebGL | Descartado: póster y elementos HTML bastan para el concepto con menor coste de carga. |
| Chat real sin autenticación | Fuera de alcance: consumo y riesgo de abuso innecesarios para la demo. |

Estas decisiones se proponen hoy; no se atribuyen al desarrollo histórico del MVP.

## Cambios en datos

Ninguno. No requiere migraciones, seed nuevo, API, secretos, tablas ni acceso a workspaces. La demo usa datos estáticos propios y tipados, contrastados manualmente con el recorrido real.

## Fronteras y archivos previstos

**Los archivos nuevos de esta tabla son propuestas; no se han creado como código.**

| Capa / archivo | Cambio previsto |
| --- | --- |
| `src/app/(marketing)/page.tsx` | Componer secciones, copy y metadatos. |
| `src/app/(marketing)/layout.tsx` | Ajustes puntuales de header/footer; verificar también `/privacy` y `/terms`, que comparten layout. |
| `src/features/marketing/landing.module.css` | Estilos y animaciones acotados; sin sobrescribir tokens globales. |
| `src/features/marketing/landing-content.ts` | Copy y fixture ilustrativo con IDs constantes. |
| `src/features/marketing/source-demo.tsx` | Isla cliente pregunta → respuesta → fuente, teclado y alternativa estática. |
| `src/features/marketing/ambient-media.tsx` | Isla cliente con video, movimiento reducido, errores y pausa. |
| `src/features/marketing/landing-sections.tsx` | Secciones de servidor y primitivas existentes. |
| `public/marketing/` | Póster, video opcional y material público propio. |
| `e2e/landing.spec.ts` | Pruebas de comportamiento nuevas, conservando las cinco existentes. |
| `src/server/**`, DB, auth, dashboard | Sin cambios previstos. |

Reutilizar `APP`, `Logo`, `Button`, `Badge`, `ThemeToggle`, Inter y tokens. No importar `MeetingWorkspace` o `AskWorkspace` en marketing: incorporan lógica y contratos privados innecesarios. La demo reutiliza lenguaje visual y primitivas.

## Contrato de demo

Estados: `initial` → `answer` → `source`; reinicio al estado inicial. La fuente sigue disponible estáticamente sin JavaScript. Revelación con anuncio accesible discreto; preferir panel dentro de la página a modal innecesario. Si se necesita diálogo, usar Radix existente y devolver foco al activador.

Sin pregunta libre ni falso indicador «la IA está pensando». Ejemplo rotulado desde el inicio. El timestamp revela el segmento; solo controla audio cuando exista un clip propio y sus tiempos coincidan. Sin autoplay audible.

## Movimiento y carga

- Contenido visible en el primer render. No dejar `opacity: 0` si un observador falla.
- Transformaciones y opacidad para entradas breves; reservar geometría para evitar saltos.
- Scroll nativo, sin secuestro ni escenas que exijan recorrer varias pantallas para alcanzar el CTA.
- Una escena ambiental automática simultánea como máximo, con pausa visible. Pausar fuera del viewport y con pestaña oculta.
- `prefers-reduced-motion: reduce`: póster, sin autoplay, parallax ni entradas animadas. Responder a cambios en sesión.
- Móvil: póster por defecto y video por acción del usuario; ahorro de datos detectado también evita descarga automática. No depender del soporte de esa API para el comportamiento móvil.
- Servir assets desde el mismo origen: la CSP existente admite `media-src 'self' blob:`. Evitar embeds que obliguen a ampliar permisos de terceros.
- Póster con dimensiones declaradas y prioridad si es elemento principal; medios inferiores diferidos. No precargar todas las variantes de video.
- Leer la guía pertinente de `node_modules/next/dist/docs/` antes de escribir código, como exige `CLAUDE.md`.

## Presupuestos propuestos

Son objetivos, **no mediciones actuales**:

| Elemento | Objetivo |
| --- | --- |
| Póster escritorio / móvil | ≤200 KB / ≤150 KB, dimensiones correctas y formato optimizado. |
| Video hero | Composición objetivo de 6–8 s; archivo servido a escritorio ≤2,5 MB. La duración generada depende del modelo y puede editarse después. |
| Móvil inicial | Sin video automático; imágenes responsive con espacio reservado. |
| JS añadido solo por marketing | ≤40 KB gzip; comparar base y final, no confundir con todo el runtime de Next. |
| Laboratorio | Tres ejecuciones móviles reproducibles; mediana objetivo LCP ≤2,5 s y CLS ≤0,1. Registrar dispositivo, throttling y herramienta. |
| Campo posterior | LCP ≤2,5 s, INP ≤200 ms y CLS ≤0,1 al percentil 75, segmentando móvil/escritorio. Requiere despliegue y tráfico. |

Los umbrales de campo proceden de [Web Vitals de Google](https://web.dev/articles/vitals), consultado el 2026-09-08. Una prueba local o puntuación de Lighthouse no demuestra el percentil 75 de usuarios reales.

## Estrategia de pruebas

- **Base:** `pnpm verify` y cinco E2E existentes con PGlite y mocks. Registrar resultados actuales y limitaciones reales del entorno.
- **Unitarias:** no añadir pruebas de listas de copy o composición estática. Solo para lógica de estados con fallos no cubierta adecuadamente en E2E.
- **Integración:** la landing no introduce servidor ni persistencia; mantener las pruebas existentes.
- **E2E nuevas:** CTA a registro; demo y fuente coherentes sin solicitudes a IA; sin JavaScript; video bloqueado; movimiento reducido; teclado; móvil; tema y legales.
- **Visual:** 320/390/768/1440 px, claro/oscuro, zoom 200 %, pausa, foco y consola. Guardar capturas y límites del navegador.
- **Rendimiento:** comparar payload y waterfall con base; guardar condiciones y mediciones. No declarar INP de campo sin tráfico real.

## Riesgos y reversión

| Riesgo | Mitigación |
| --- | --- |
| Motion perjudica legibilidad/móvil | Validar primero narrativa estática y comparar tamaños y temas. |
| Layout compartido afecta legales | Verificar `/privacy` y `/terms`. |
| UI generada engañosa | HTML y datos propios rotulados; sin resultados privados ni métricas inventadas. |
| Video costoso o inadecuado | Validar referencias y producir primero un plano prioritario; mantener póster. |
| Trabajo paralelo del propietario | Rama aislada; comprobar HEAD remoto antes de integrar. |
| Suite verde solo con mocks | Declarar que no verifica proveedores reales, micrófono o despliegue. |

La futura implementación será un cambio acotado. Para revertirla, revertir sus commits mediante Git; no borrar DB/storage ni usar reset destructivo. Esta preparación es documental y no modifica ejecución.

## Impacto en la constitución

No requiere enmiendas. Evidencia y transparencia limitan copy/demo. Las brechas del MVP se documentan para trabajo independiente; esta landing no las presenta como resueltas.
