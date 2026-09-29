#!/usr/bin/env bash
# Builds the real GitNapse protocol server and stages it next to the desktop
# dev/release executable, so the app resolves its sidecar with no env setup
# (bridge resolution order: GITNAPSE_SERVER_BIN -> sibling exe -> PATH).
#
#   ./scripts/dev-server.sh          # debug build (npm run tauri:dev)
#   ./scripts/dev-server.sh release  # release build (npm run tauri:build)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$ROOT/../api"
PROFILE="${1:-debug}"
NAME="gitnapse-server"
[[ "$(uname -s)" == *MINGW* || "$(uname -s)" == *MSYS* || "$(uname -s)" == *CYGWIN* ]] && NAME="gitnapse-server.exe"

if [[ ! -f "$API_DIR/Cargo.toml" ]]; then
  echo "error: the api repo is not checked out next to desktop ($API_DIR)" >&2
  exit 1
fi

if [[ "$PROFILE" == "release" ]]; then
  cargo build --manifest-path "$API_DIR/Cargo.toml" -p gitnapse-server --release
  SRC="$API_DIR/target/release/$NAME"
else
  cargo build --manifest-path "$API_DIR/Cargo.toml" -p gitnapse-server
  SRC="$API_DIR/target/debug/$NAME"
fi

stage() {
  local dir="$1"
  mkdir -p "$dir"
  cp "$SRC" "$dir/$NAME"
  chmod +x "$dir/$NAME"
  echo "staged $dir/$NAME"
}

# Cargo workspace target lives at desktop/target; Tauri may also use
# src-tauri/target depending on how it is invoked.
stage "$ROOT/target/$PROFILE"
if [[ -d "$ROOT/src-tauri/target" ]]; then
  stage "$ROOT/src-tauri/target/$PROFILE"
fi
