# KnowHub — Presentación de prelanzamiento

**Web pública:** https://knowhub-prelaunch.vercel.app · Proyecto Vercel: `knowhub-prelaunch` · Equipo: `Sacramented`.

Esta entrada exporta una landing estática independiente de la aplicación privada. Importa los mismos componentes de `src/features/marketing/` que la portada de la app. No despliega endpoints, cuentas, base de datos, almacenamiento ni proveedores de IA.

## Uso

Desde la raíz del repositorio, con Node compatible y pnpm:

```sh
pnpm install --frozen-lockfile
pnpm dev:landing --port 3033
```

Para generar exactamente los archivos de publicación:

```sh
pnpm build:landing
python3 -m http.server 3033 --bind 127.0.0.1 --directory marketing/out
```

Abrir `http://localhost:3033`. Probar «Explorar demo» → «Revelar respuesta» → cita `[1]` → fragmento `01:38`. Revisar también «Reiniciar», pausa, FAQs, privacidad y términos.

```sh
pnpm verify
pnpm test:landing
```

`test:landing` presupone `pnpm build:landing` y usa Python 3 para servir la exportación. Si ya hay un servidor en 3033 lo reutiliza. Los tests de Chromium pueden requerir un entorno fuera del sandbox de Codex en macOS; consultar el informe de validación.

## Publicar en Vercel

La salida es `marketing/out/`, incluido `vercel.json` con headers. Publicar únicamente esa carpeta en un proyecto dedicado. No seleccionar la raíz del repositorio: contiene la app completa y su backend.

```sh
vercel login
vercel deploy marketing/out --prod --yes --project knowhub-prelaunch
```

Crear primero el proyecto `knowhub-prelaunch` en la cuenta/equipo correspondiente si aún no existe. No hay variables de entorno requeridas para esta presentación. La conexión con GitHub, un dominio propio y la app pública se pueden configurar después.

La publicación conserva el estado «Próximamente» y el CTA a la demo. La aplicación existente usa la misma portada con CTA a `/signup` y acceso a `/login`.

## Contenido y assets

- Texto y demo ficticia: `src/features/marketing/landing-content.ts`.
- Narrativa y composición: `landing-page.tsx`.
- Interacción pregunta/respuesta/fuente: `source-demo.tsx`.
- Movimiento progresivo: `motion-stage.tsx`; sin bibliotecas nuevas.
- Arte: `public/marketing/memory-sculpture.webp`, 960 × 960, 54.800 bytes.
- Imagen original generada con ImageGen el 8 de septiembre de 2026. El texto y la interfaz son HTML, no forman parte de la imagen.
- Los prompts para un futuro video de Higgsfield siguen en el storyboard. No se generó ni se requiere video para esta entrega.

Las páginas públicas de privacidad y términos describen exclusivamente esta presentación. Los borradores legales de la aplicación siguen intactos en `src/app/(marketing)/`.
