#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$ROOT/../api"
OUT_DIR="$ROOT/src-tauri/binaries"
TRIPLE="$(rustc -vV | awk '/^host:/ {print $2}')"
EXT=""
[[ "$TRIPLE" == *windows* ]] && EXT=".exe"

mkdir -p "$OUT_DIR"
cargo build --manifest-path "$API_DIR/Cargo.toml" -p gitnapse-server --release
cp "$API_DIR/target/release/gitnapse-server$EXT" "$OUT_DIR/gitnapse-server-$TRIPLE$EXT"
echo "staged $OUT_DIR/gitnapse-server-$TRIPLE$EXT"
