#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
WASM_OUTPUT_DIR="${PROJECT_ROOT}/src/wasm"
PKG_DIR="${SCRIPT_DIR}/pkg"
FILES=(
  "sequence_alignment_bg.wasm"
  "sequence_alignment_bg.wasm.d.ts"
  "sequence_alignment.d.ts"
  "sequence_alignment.js"
)

echo "Building WASM module in ${SCRIPT_DIR}..."
cd "${SCRIPT_DIR}"
wasm-pack build --target web

echo "Refreshing generated artifacts in ${WASM_OUTPUT_DIR}..."
mkdir -p "${WASM_OUTPUT_DIR}"

shopt -s dotglob nullglob
for path in "${WASM_OUTPUT_DIR}"/*; do
  if [[ "$(basename "${path}")" != ".gitignore" ]]; then
    rm -rf "${path}"
  fi
done
shopt -u dotglob nullglob

for file in "${FILES[@]}"; do
  cp "${PKG_DIR}/${file}" "${WASM_OUTPUT_DIR}/${file}"
done

if [[ -d "${PKG_DIR}/snippets" ]]; then
  cp -R "${PKG_DIR}/snippets" "${WASM_OUTPUT_DIR}/snippets"
fi

echo "WASM module successfully updated."
