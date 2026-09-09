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

## Actualizar la web con GitHub

Repositorio: [santybenawr/knowhub](https://github.com/santybenawr/knowhub/tree/codex/knowhub-discovery-landing). Vercel está conectado a la rama **`codex/knowhub-discovery-landing`**. Cada push a esa rama inicia una compilación de producción; al completarse correctamente, actualiza **https://knowhub-prelaunch.vercel.app**. La rama `main` conserva la aplicación existente.

Desde un checkout limpio de esa rama:

```sh
git switch codex/knowhub-discovery-landing
git pull --ff-only
# Editar los archivos de la landing.
pnpm build:landing
pnpm lint
pnpm typecheck
git add <archivos-editados>
git commit -m "feat(marketing): describir el cambio"
git push
```

Para cambios de lógica compartida, ejecutar también `pnpm verify`. Confirmar en los despliegues de Vercel que el commit del push alcanza `Ready` y abrir la URL pública. Una compilación fallida conserva la publicación anterior. Para revertir un cambio publicado, usar `git revert <commit>` y hacer push; no forzar ni reescribir la rama.

### Configuración del proyecto Vercel

Estos ajustes están guardados en el proyecto `knowhub-prelaunch`, equipo Sacramented:

| Ajuste | Valor |
| --- | --- |
| Repositorio | `santybenawr/knowhub` |
| Rama de producción | `codex/knowhub-discovery-landing` |
| Root Directory | `marketing` |
| Incluir archivos fuera del directorio raíz | Sí; componentes y dependencias compartidos |
| Framework Preset | Other |
| Node.js | 24.x |
| Install Command | `cd .. && corepack pnpm install --frozen-lockfile` |
| Build Command | `cd .. && corepack pnpm build:landing` |
| Output Directory | `out` |

Corepack usa la versión de pnpm fijada en el `package.json` de la raíz. El paso «Ignored Build Step» omite pushes a otras ramas mediante `[ -n "$VERCEL_GIT_COMMIT_REF" ] && [ "$VERCEL_GIT_COMMIT_REF" != "codex/knowhub-discovery-landing" ]`. Si se cambia la rama de publicación, actualizar también ese filtro.

Solo se sirve `marketing/out/`; `marketing/vercel.json` conserva las cabeceras de la presentación. No se requieren variables de entorno de la app. No subir `.env*`, `.vercel/`, sesiones de CLI, base de datos ni archivos de almacenamiento. La configuración local de Vercel permanece ignorada por Git.

El despliegue inicial del 8 de septiembre se hizo desde la exportación estática local. Desde la conexión de Git, el flujo habitual es el push; no reutilizar aquel comando de subida directa de `marketing/out/` con los nuevos ajustes de compilación.

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
