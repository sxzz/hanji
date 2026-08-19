#!/usr/bin/env bash

set -euo pipefail

: "${CODEX_WORKTREE_PATH:?CODEX_WORKTREE_PATH is not set}"

source_tree="${CODEX_SOURCE_TREE_PATH:-$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)}"
source_fonts="$source_tree/public/fonts"
worktree_fonts="$CODEX_WORKTREE_PATH/public/fonts"

if [[ ! -d "$CODEX_WORKTREE_PATH" ]]; then
  echo "Worktree does not exist: $CODEX_WORKTREE_PATH" >&2
  exit 1
fi

shopt -s nullglob
font_binaries=("$source_fonts"/*.woff2)
font_stylesheets=("$source_fonts"/fonts-*.css)

if ((${#font_binaries[@]} == 0 || ${#font_stylesheets[@]} == 0)); then
  echo \
    "No complete font build found in $source_fonts; run 'pnpm build:data' in the source tree first." \
    >&2
  exit 1
fi

mkdir -p "$worktree_fonts"
cp -p "${font_binaries[@]}" "${font_stylesheets[@]}" "$worktree_fonts/"

cd "$CODEX_WORKTREE_PATH"
pnpm install --frozen-lockfile
