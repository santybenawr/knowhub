# KnowHub — Guía rápida

Esta es la versión de prueba de KnowHub. Funciona **sin conectar ningún servicio
externo**: sin base de datos que instalar, sin claves de API, sin cuentas en la
nube. Todo corre en tu computador.

---

## Opción A — Solo quiero probarlo (5 minutos)

**Necesitas:** [Node.js 20 o superior](https://nodejs.org) instalado.

1. Descomprime la carpeta.
2. Abre una terminal dentro de ella.
3. Ejecuta:

```bash
npm install -g pnpm
pnpm install
pnpm db:migrate
```

4. Carga los datos de ejemplo (opcional, pero recomendado para ver todo funcionando):

```bash
ENABLE_DEMO_DATA=true pnpm db:seed
```

5. Arranca la aplicación:

```bash
pnpm dev
```

6. Abre la dirección que aparece en la terminal — por defecto
   **http://localhost:3000**. Si ese puerto está ocupado, arranca con otro:
   `PORT=3010 pnpm dev`

Si cargaste los datos de ejemplo, entra con:

| | |
|---|---|
| Correo | `demo@knowhub.test` |
| Contraseña | `knowhub-demo-2026` |

O crea tu propia cuenta desde "Empezar gratis".

---

## Qué probar

Un recorrido de cinco minutos que muestra de qué se trata el producto:

1. **Inicio** → verás documentos, una nota y una reunión ya procesados.
2. **Reuniones → "Reunión Proyecto Emprendimiento"**
   - Pestaña **Decisiones**: la decisión extraída, con un botón "Fuente · 01:38".
   - Pestaña **Pendientes**: fíjate en que unos tienen responsable y fecha, y otros
     dicen *"Responsable no especificado"* — porque en la reunión no se dijo. KnowHub
     nunca lo inventa.
   - Pestaña **Transcripción**: haz clic en cualquier marca de tiempo.
3. **Preguntar a KnowHub** → escribe *"¿Qué decidimos sobre el proveedor?"*
   - La respuesta trae un `[1]`. Haz clic: te lleva a la fuente exacta.
4. **Nueva reunión** → prueba los tres caminos: grabar con tu micrófono, subir un
   audio, o pegar una transcripción.
5. **Buscar** → busca una palabra que esté en un documento y otra que no esté en
   ningún lado. Cuando no hay evidencia, KnowHub lo dice en vez de inventar.

---

## Importante para las pruebas

Esta versión corre **sin proveedores de IA configurados**. La aplicación lo avisa en
un recuadro amarillo en pantalla. Eso significa:

| Función | Con proveedores locales (ahora) | Con `OPENAI_API_KEY` |
|---|---|---|
| Búsqueda y citas | Funciona de verdad | Mejor comprensión semántica |
| Análisis de reunión | Extracción por reglas sobre la transcripción real | Modelo de lenguaje |
| Respuestas | Extractivas: citan texto real recuperado | Redactadas |
| Transcribir audio | **Guion de ejemplo, no transcribe de verdad** | Transcripción real |

Todo el flujo está completo y las decisiones/pendientes salen del texto real. Lo único
que el modo local no puede hacer es *escuchar* un audio.

**Para probar reuniones con contenido real sin pagar nada:** usa
**Nueva reunión → Importar transcripción** y pega cualquier transcripción. Ese camino
no usa ningún proveedor externo y ejecuta el pipeline completo.

**Para activar la IA real:** crea un archivo `.env.local` con:

```
OPENAI_API_KEY=sk-...
```

y reinicia con `pnpm dev`.

---

## Opción B — Quiero seguir desarrollando

```bash
pnpm verify      # lint + typecheck + tests + build
pnpm test        # 150 pruebas unitarias y de integración
pnpm test:e2e    # 5 flujos end-to-end
pnpm db:reset    # borra la base local y el almacenamiento
```

Lee [`CLAUDE.md`](CLAUDE.md) primero: es el resumen operativo del proyecto (stack,
arquitectura, reglas de seguridad, comandos). El detalle está en
[`docs/`](docs/) y en el [`README.md`](README.md).

---

## Preguntas frecuentes

**¿Dónde se guardan mis datos de prueba?**
En la carpeta `.data/` del proyecto. Bórrala (o corre `pnpm db:reset`) para empezar
de cero. Nada sale de tu computador.

**¿El audio se sube a algún servidor?**
No. Se guarda en `.data/storage/`, fuera de la carpeta pública, y solo se sirve con
un enlace firmado que expira.

**¿Puedo grabar desde el celular?**
Sí, pero el navegador puede suspender la captura si bloqueas la pantalla o cambias de
app. La aplicación lo advierte mientras grabas.

**¿Funciona en Windows?**
Sí. Los comandos son los mismos; para las variables de entorno usa
`$env:ENABLE_DEMO_DATA="true"` en PowerShell.

**No me carga nada / veo un error de base de datos.**
Corre `pnpm db:reset` y luego `pnpm db:migrate`.
