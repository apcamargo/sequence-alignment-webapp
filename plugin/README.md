# Sequence alignment WASM plugin

This crate builds the WebAssembly module consumed by the Astro app at the repository root. It is not maintained as a standalone Rust library or CLI.

## Exported wasm API

The web app uses two exports:

```ts
align_wasm(
  seq1: string,
  seq2: string,
  matrixName: string | null,
  matchScore: number,
  mismatchScore: number,
  gapOpen: number,
  gapExtend: number,
  mode: "global" | "local",
): string

matrix_data_wasm(name: string): string
```

Both functions return JSON as a string on success, or a string starting with `"Error:"` on failure.

## Alignment response shape

`align_wasm` returns JSON with this shape:

```json
{
  "sequences": { "seq1": "AC", "seq2": "AC" },
  "matrix": {
    "rows": 3,
    "cols": 3,
    "cells": [{ "score": 0, "arrows": 0 }]
  },
  "traceback_paths": [{ "steps": [{ "i": 2, "j": 2 }] }],
  "alignments": [{ "seq1": "AC", "seq2": "AC" }],
  "final_score": 4
}
```

The payload intentionally includes the full dynamic programming matrix and all optimal traceback paths because the web UI visualizes them directly.

## Matrix response shape

`matrix_data_wasm` returns:

```json
{
  "name": "BLOSUM62",
  "alphabet": [65, 82, 78],
  "scores": [4, -1, -2]
}
```

`alphabet` is an array of ASCII byte values. `scores` is a flat row-major matrix aligned to that alphabet order.

## Implementation notes

- Global and local alignment are both supported.
- Gap penalties are currently linear only. If `gapOpen != gapExtend`, the function returns an error.
- Built-in substitution matrices are generated from `src/data/*.mat` by `build.rs`.
- Traceback is iterative and returns all equally optimal paths in stable branch order.

## Development

Run tests:

```bash
cargo test --lib
```

Build the wasm target directly:

```bash
cargo build --target wasm32-unknown-unknown --lib
```

Build and copy the generated browser-facing artifacts into the web app:

```bash
./build-wasm.sh
```

The generated JS and WASM files are copied into `../src/wasm/`. Keep the exported function names stable because the web app imports them directly.
