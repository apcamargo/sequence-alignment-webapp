export type AlignmentMode = "global" | "local";
export type ScoringMode = "simple" | "matrix";

export interface ScoringOptions {
  alignmentMode: AlignmentMode;
  mode: ScoringMode;
  matchScore: number;
  mismatchScore: number;
  matrixName: string;
  gapPenalty: number;
}

export interface MatrixCell {
  score: number;
  arrows: number;
}

export interface MatrixData {
  rows: number;
  cols: number;
  cells: MatrixCell[];
}

export interface TracebackStep {
  i: number;
  j: number;
}

export interface TracebackPath {
  steps: TracebackStep[];
}

export interface AlignedPair {
  seq1: string;
  seq2: string;
}

export interface AlignmentResult {
  sequences: { seq1: string; seq2: string };
  matrix: MatrixData;
  traceback_paths: TracebackPath[];
  alignments: AlignedPair[];
  final_score: number;
}

export type ValidationState = "unset" | "correct" | "wrong";

export interface ScoringMatrixData {
  name: string;
  alphabet: number[];
  scores: number[];
}
