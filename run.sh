#!/usr/bin/env bash
#
# GitNapse Desktop launcher.
#
#   ./run.sh                    build the sidecar + launch the Tauri app (dev)
#   ./run.sh --release          build the production frontend and run it (faster)
#   ./run.sh --build            build a release bundle instead of running dev
#   ./run.sh --gpu              do not touch WebKit GPU env (full acceleration)
#   ./run.sh --compat           force software rendering (blank-frame fallback)
#   ./run.sh --no-server        do not stage/build gitnapse-server
#   ./run.sh --no-github-token  do not auto-use the local `gh` token
#   ./run.sh --help
#
# It prefers the system webkit2gtk-4.1 webview. On Arch machines without it
# (and without sudo) it bootstraps a private copy under ~/.cache and runs
# against that, so nothing needs to be installed system-wide. The app manages
# its own gitnapse-server sidecar, so no separate server is required.
#
# Authentication reuses the core secure store (~/.config/GitNapse). If
# GITHUB_TOKEN is unset and the GitHub CLI is authenticated, its token is used
# (see --no-github-token). Otherwise paste a token in Settings on first run.
#
# Performance: the first run downloads webkit (~40 MB) and compiles the Rust
# workspace (a few minutes); later runs reuse both and start fast. By default it
# disables only the WebKit DMA-BUF renderer — that avoids a Wayland protocol
# crash on some GPU stacks while keeping accelerated compositing. Use --gpu for
# full acceleration, or --compat if the webview shows a blank/black frame.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/gitnapse/desktop-deps"
MIRROR="https://geo.mirror.pkgbuild.com"
# Exactly 23 chars: the length of the "/usr/lib/webkit2gtk-4.1" string the
# library is compiled with, so it can be patched in place (ELF offsets kept).
FAKE_HELPER="/tmp/gnwkxxxxxxxxxxxxxx"
BROWSER_PKGS=(webkit2gtk-4.1 enchant harfbuzz-icu hyphen libmanette)

log() { printf '\033[1m[run]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[run:error]\033[0m %s\n' "$*" >&2; exit 1; }

have_system_webkit() { pkg-config --exists webkit2gtk-4.1 2>/dev/null; }

pkg_filename() {
  curl -fsSL -m 30 "https://archlinux.org/packages/search/json/?name=$1" |
    python3 -c 'import sys,json;d=json.load(sys.stdin);r=d.get("results") or [];print(r[0]["filename"] if r else "")'
}

download_pkg() {
  local filename="$1" dest="$2" repo
  for repo in extra core; do
    if curl -fsSL -m 600 -o "$dest" "$MIRROR/$repo/os/x86_64/$filename"; then
      return 0
    fi
  done
  return 1
}

bootstrap_webkit() {
  command -v python3 >/dev/null 2>&1 || die "python3 is required to bootstrap a private webkit"
  log "system webkit2gtk-4.1 not found; bootstrapping a private copy in $CACHE"
  mkdir -p "$CACHE/webkit" "$CACHE/deps"

  if [[ ! -f "$CACHE/.webkit-done" ]]; then
    local name fn
    for name in "${BROWSER_PKGS[@]}"; do
      fn="$(pkg_filename "$name")"
      [[ -n "$fn" ]] || die "cannot resolve the '$name' package filename"
      log "fetching $fn"
      download_pkg "$fn" "$CACHE/$name.pkg.tar.zst" || die "download failed: $name"
      if [[ "$name" == "webkit2gtk-4.1" ]]; then
        tar --zstd -xf "$CACHE/$name.pkg.tar.zst" -C "$CACHE/webkit"
      else
        tar --zstd -xf "$CACHE/$name.pkg.tar.zst" -C "$CACHE/deps"
      fi
      rm -f "$CACHE/$name.pkg.tar.zst"
    done

    local pc
    for pc in "$CACHE"/webkit/usr/lib/pkgconfig/webkit2gtk-4.1.pc \
      "$CACHE"/webkit/usr/lib/pkgconfig/javascriptcoregtk-4.1.pc \
      "$CACHE"/webkit/usr/lib/pkgconfig/webkit2gtk-web-extension-4.1.pc; do
      [[ -f "$pc" ]] || continue
      sed -i "s|^prefix=/usr|prefix=$CACHE/webkit/usr|; s|^libdir=/usr/lib|libdir=$CACHE/webkit/usr/lib|" "$pc"
    done

    local so
    for so in "$CACHE"/webkit/usr/lib/libwebkit2gtk-4.1.so.0.*; do
      [[ -f "$so" ]] || continue
      perl -0777 -pi -e "s{/usr/lib/webkit2gtk-4\.1}{$FAKE_HELPER}g" "$so"
    done

    touch "$CACHE/.webkit-done"
  fi

  rm -rf "$FAKE_HELPER"
  ln -sfn "$CACHE/webkit/usr/lib/webkit2gtk-4.1" "$FAKE_HELPER"
  export PKG_CONFIG_PATH="$CACHE/webkit/usr/lib/pkgconfig${PKG_CONFIG_PATH:+:$PKG_CONFIG_PATH}"
  export LD_LIBRARY_PATH="$CACHE/deps/usr/lib:$CACHE/webkit/usr/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
}

free_port() {
  local port="$1" pids p
  pids=$(ss -ltnp 2>/dev/null | grep ":$port" | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u)
  for p in $pids; do kill "$p" 2>/dev/null || true; done
}

TAURI_PID=""
cleanup() {
  trap - INT TERM EXIT
  log "shutting down (app, sidecar, dev server)…"
  [[ -n "$TAURI_PID" ]] && kill "$TAURI_PID" 2>/dev/null || true
  # tauri dev / vite node helpers for this project
  local pid cmd
  for pid in $(pgrep -x node 2>/dev/null); do
    cmd="$(tr '\0' ' ' </proc/"$pid"/cmdline 2>/dev/null)" || continue
    case "$cmd" in *tauri*|*vite*) kill "$pid" 2>/dev/null || true ;; esac
  done
  pkill -f "^${ROOT}/target/(debug|release)/gitnapse-desktop" 2>/dev/null || true
  pkill -f "^${ROOT}/target/(debug|release)/gitnapse-server" 2>/dev/null || true
  free_port 1420
  wait 2>/dev/null || true
}

show_help() {
  awk 'NR>1 { if ($0 ~ /^#/) { sub(/^# ?/, ""); print } else { exit } }' "$0"
}

main() {
  local stage_server=1 no_gh_token=0 compat=0 gpu_mode=0 build_mode=0 release_mode=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --no-server) stage_server=0 ;;
      --no-github-token) no_gh_token=1 ;;
      --compat) compat=1 ;;
      --gpu) gpu_mode=1 ;;
      --build) build_mode=1 ;;
      --release) release_mode=1 ;;
      -h | --help)
        show_help
        exit 0
        ;;
      *) die "unknown argument: $1" ;;
    esac
    shift
  done

  [[ -f "$ROOT/package.json" ]] || die "run.sh must live in the desktop repo"
  cd "$ROOT"

  if have_system_webkit; then
    log "using the system webkit2gtk-4.1"
  elif command -v pacman >/dev/null 2>&1; then
    bootstrap_webkit
  else
    die "webkit2gtk-4.1 not found; install the Tauri webview dependency for your distro"
  fi

  if [[ "$compat" == "1" ]]; then
    export WEBKIT_DISABLE_DMABUF_RENDERER=1
    export WEBKIT_DISABLE_COMPOSITING_MODE=1
    export WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS=1
    log "compat mode: software rendering (slower, most resilient)"
  elif [[ "$gpu_mode" == "0" ]]; then
    export WEBKIT_DISABLE_DMABUF_RENDERER=1
    log "WebKit DMA-BUF renderer disabled (stable on Wayland; use --gpu for full acceleration)"
  fi

  if [[ -z "${GITHUB_TOKEN:-}" && "$no_gh_token" == "0" ]] && command -v gh >/dev/null 2>&1; then
    if token="$(gh auth token 2>/dev/null)" && [[ -n "$token" ]]; then
      export GITHUB_TOKEN="$token"
      log "using the GitHub CLI token (disable with --no-github-token)"
    fi
  fi

  [[ -d node_modules ]] || {
    log "installing npm dependencies"
    npm install
  }

  if [[ "$stage_server" == "1" ]]; then
    log "building gitnapse-server (release) and staging it next to the app"
    "$ROOT/scripts/dev-server.sh" release
    if [[ "$build_mode" != "1" ]]; then
      # The dev app executable lives in target/debug, so the sidecar must too.
      server_name="gitnapse-server"
      case "$(uname -s)" in MINGW* | MSYS* | CYGWIN*) server_name="gitnapse-server.exe" ;; esac
      cp -f "$ROOT/target/release/$server_name" "$ROOT/target/debug/$server_name" 2>/dev/null || true
    fi
  fi

  trap cleanup EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM

  if [[ "$release_mode" == "1" ]]; then
    log "building the production frontend"
    npm run build
    log "compiling the release binary (slow the first time)"
    cargo build --release -p gitnapse-desktop
    log "launching GitNapse (release) — Ctrl+C to stop"
    "$ROOT/target/release/gitnapse-desktop" &
  elif [[ "$build_mode" == "1" ]]; then
    log "building the release bundle (needs webkit2gtk-4.1 and gitnapse-server at runtime)"
    npx tauri build &
  else
    log "launching GitNapse (Ctrl+C to stop)"
    npx tauri dev &
  fi
  TAURI_PID=$!
  wait "$TAURI_PID" || true
}

main "$@"
