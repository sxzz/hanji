#!/usr/bin/env bash

set -euo pipefail

: "${CODEX_WORKTREE_PATH:?CODEX_WORKTREE_PATH is not set}"

source_tree="${CODEX_SOURCE_TREE_PATH:-$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)}"
source_assets="$source_tree/app/assets"
worktree_assets="$CODEX_WORKTREE_PATH/app/assets"
source_notices="$source_tree/public/notices"
worktree_notices="$CODEX_WORKTREE_PATH/public/notices"

if [[ ! -d "$CODEX_WORKTREE_PATH" ]]; then
  echo "Worktree does not exist: $CODEX_WORKTREE_PATH" >&2
  exit 1
fi

shopt -s nullglob
data_files=(
  "$source_assets/data/chars.json"
  "$source_assets/data/sources.json"
)
stroke_shards=("$source_assets"/strokes/[0-9a-f][0-9a-f].json)
font_binaries=("$source_assets"/fonts/*.woff2)
font_stylesheets=("$source_assets"/fonts/fonts-*.css)
notice_files=(
  "$source_notices/data-sources.md"
  "$source_notices/noto-ofl.txt"
  "$source_notices/animcjk-APL.txt"
  "$source_notices/animcjk-COPYING.txt"
)
face_marks="$source_tree/app/generated/face-marks.ts"

complete=true
for file in "${data_files[@]}" "${notice_files[@]}" "$face_marks"; do
  if [[ ! -f "$file" ]]; then
    complete=false
    break
  fi
done

if (
  [[ "$complete" != true ]] ||
    ((${#stroke_shards[@]} != 32)) ||
    ((${#font_binaries[@]} == 0)) ||
    ((${#font_stylesheets[@]} != 3))
); then
  echo \
    "No complete data build found in $source_tree; run 'pnpm build:data' in the source tree first." \
    >&2
  exit 1
fi

mkdir -p \
  "$worktree_assets/data" \
  "$worktree_assets/strokes" \
  "$worktree_assets/fonts" \
  "$worktree_notices"
cp -p "${data_files[@]}" "$worktree_assets/data/"
cp -p "${stroke_shards[@]}" "$worktree_assets/strokes/"
cp -p \
  "${font_binaries[@]}" \
  "${font_stylesheets[@]}" \
  "$worktree_assets/fonts/"
cp -p "${notice_files[@]}" "$worktree_notices/"
cp -p "$face_marks" "$CODEX_WORKTREE_PATH/app/generated/face-marks.ts"

cd "$CODEX_WORKTREE_PATH"
pnpm install --frozen-lockfile
