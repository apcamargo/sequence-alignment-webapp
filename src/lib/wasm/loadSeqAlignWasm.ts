import type { SeqAlignWasmModule } from "./types";

let wasmInitPromise: Promise<SeqAlignWasmModule> | null = null;

export function loadSeqAlignWasm(): Promise<SeqAlignWasmModule> {
  if (!wasmInitPromise) {
    wasmInitPromise = Promise.all([
      import("../../wasm/sequence_alignment.js"),
      import("../../wasm/sequence_alignment_bg.wasm?url"),
    ]).then(async ([wasm, wasmUrl]) => {
      await wasm.default(wasmUrl.default);
      return {
        align_wasm: wasm.align_wasm,
        matrix_data_wasm: wasm.matrix_data_wasm,
      };
    });
  }

  return wasmInitPromise;
}
