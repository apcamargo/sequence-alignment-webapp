# Sequence alignment webapp

This web application provides interactive visualizations for the dynamic programming matrix used in pairwise sequence alignment. It implements both global and local alignment algorithms and allows customization of scoring parameters. The alignment engine is implemented in Rust and compiled to WebAssembly for performance.

## Build requirements

- Bun
- Rust
- `wasm-pack`

## Quick start

To start a local development server and provide the application at `http://localhost:4321/`, execute the following commands in the project root:

```sh
bun install
bun run dev
```

If you change Rust code in `plugin/`, run `bun run build:wasm` to recompile the WASM module and refresh the generated JavaScript and type definitions in `src/wasm/`.

## Commands

| Command | Action |
| :--- | :--- |
| `bun install` | Install dependencies |
| `bun run dev` | Start the dev server; rebuilds WASM first |
| `bun run build` | Create a production build; rebuilds WASM first |
| `bun run check` | Run the TypeScript checker |
| `bun run preview` | Preview the production build |
| `bun run build:wasm` | Rebuild the Rust crate and refresh `src/wasm/` |
| `bun run plugin:test` | Run the Rust unit tests |

## Layout

- `src/`: Astro pages, React components, hooks, and app code
- `public/`: static files
- `plugin/`: Rust crate for the alignment engine
- `src/wasm/`: generated JavaScript, type definitions, and WASM module
