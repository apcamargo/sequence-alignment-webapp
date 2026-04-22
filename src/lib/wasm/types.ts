export type AlignmentWasmModule = {
  align_wasm: (
    seq1: string,
    seq2: string,
    matrixName: string | null | undefined,
    matchScore: number,
    mismatchScore: number,
    gapOpen: number,
    gapExtend: number,
    mode: string,
  ) => string;
};

export type MatrixDataWasmModule = {
  matrix_data_wasm: (name: string) => string;
};

export type SeqAlignWasmModule = AlignmentWasmModule & MatrixDataWasmModule;
