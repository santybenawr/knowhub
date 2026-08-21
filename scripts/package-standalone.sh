#!/usr/bin/env bash
#
# Packages KnowHub as a self-contained folder that runs with `node server.js`
# and no install step — for sharing a build with people who do not have a
# development toolchain.
#
# Usage:  ./scripts/package-standalone.sh [output-dir]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${1:-$ROOT/dist}"
STAMP="$(date +%Y%m%d)"
PKG="$OUT_DIR/knowhub-app-$STAMP"

cd "$ROOT"

echo "==> Building standalone output"
rm -rf .next/standalone
KNOWHUB_STANDALONE=1 pnpm exec next build

echo "==> Assembling $PKG"
rm -rf "$PKG"
mkdir -p "$PKG"
cp -R .next/standalone/. "$PKG/"

# Next emits the server but not the client assets; both are required to serve.
mkdir -p "$PKG/.next/static"
cp -R .next/static/. "$PKG/.next/static/"
cp -R public "$PKG/public"

# Next's file tracing follows static imports. These packages are loaded
# dynamically and ship WASM/tarball assets that the tracer cannot see, so their
# resolved trees are copied in whole. `-L` dereferences pnpm's symlinks.
echo "==> Copying dynamically-loaded packages"
copy_pkg() {
  local name="$1"
  local src
  src="$(node -e "
    const { createRequire } = require('node:module')
    const path = require('node:path')
    const req = createRequire(path.join(process.cwd(), 'package.json'))
    let dir = path.dirname(req.resolve('$name'))
    while (!require('node:fs').existsSync(path.join(dir, 'package.json'))) dir = path.dirname(dir)
    process.stdout.write(dir)
  ")"
  mkdir -p "$PKG/node_modules/$name"
  cp -RL "$src/." "$PKG/node_modules/$name/"
  echo "    $name"
}

copy_pkg "@electric-sql/pglite"
copy_pkg "@electric-sql/pglite-pgvector"
copy_pkg "unpdf"

# Next's tracer copies only the files it can prove are reachable, which leaves
# some packages partial — `@swc/helpers`, for instance, arrives with its CJS
# build but not the ESM one the runtime actually loads. Completing every traced
# package from the local store, then following the symlinks those complete
# copies introduce until nothing dangles, avoids playing whack-a-mole with the
# next partially-traced dependency.
echo "==> Completing partially-traced packages"
node scripts/complete-store.mjs "$ROOT" "$PKG"

echo "==> Writing launchers"
cat > "$PKG/start.command" <<'LAUNCHER'
#!/usr/bin/env bash
# macOS / Linux launcher. Double-click on macOS, or run ./start.command
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "KnowHub necesita Node.js 20 o superior."
  echo "Instálalo desde https://nodejs.org y vuelve a abrir este archivo."
  read -r -p "Presiona Enter para cerrar..."
  exit 1
fi

# The session signing key is generated once and kept beside the data, so
# sessions survive a restart. Never commit or share this file.
mkdir -p .data
if [ ! -f .data/auth-secret ]; then
  node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))" > .data/auth-secret
  chmod 600 .data/auth-secret
fi

export NODE_ENV=production
export PORT="${PORT:-3010}"
export HOSTNAME=127.0.0.1
export AUTH_SECRET="$(cat .data/auth-secret)"
export PGLITE_DATA_DIR=.data/pglite
export STORAGE_LOCAL_DIR=.data/storage
export NEXT_PUBLIC_APP_URL="http://localhost:$PORT"
# No AI credentials in this package, so the local deterministic providers are
# selected explicitly. Set OPENAI_API_KEY below to use a real model instead.
export AI_PROVIDER="${AI_PROVIDER:-mock}"
export TRANSCRIPTION_PROVIDER="${TRANSCRIPTION_PROVIDER:-mock}"

echo ""
echo "  KnowHub  ·  http://localhost:$PORT"
echo "  Ctrl+C para detener"
echo ""
( sleep 2; command -v open >/dev/null 2>&1 && open "http://localhost:$PORT" || true ) &
exec node server.js
LAUNCHER
chmod +x "$PKG/start.command"
cp "$PKG/start.command" "$PKG/start.sh"

cat > "$PKG/start.bat" <<'LAUNCHER'
@echo off
REM Windows launcher. Double-click this file.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo KnowHub necesita Node.js 20 o superior.
  echo Instalalo desde https://nodejs.org y vuelve a abrir este archivo.
  pause
  exit /b 1
)

if not exist .data mkdir .data
if not exist .data\auth-secret (
  node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))" > .data\auth-secret
)
set /p AUTH_SECRET=<.data\auth-secret

set NODE_ENV=production
if "%PORT%"=="" set PORT=3010
set HOSTNAME=127.0.0.1
set PGLITE_DATA_DIR=.data/pglite
set STORAGE_LOCAL_DIR=.data/storage
set NEXT_PUBLIC_APP_URL=http://localhost:%PORT%
if "%AI_PROVIDER%"=="" set AI_PROVIDER=mock
if "%TRANSCRIPTION_PROVIDER%"=="" set TRANSCRIPTION_PROVIDER=mock

echo.
echo   KnowHub  .  http://localhost:%PORT%
echo   Ctrl+C para detener
echo.
start "" "http://localhost:%PORT%"
node server.js
LAUNCHER

echo "==> Done: $PKG"
du -sh "$PKG"
