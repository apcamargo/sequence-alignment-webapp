import type { ScoringOptions } from "./types";

export const MAX_SEQUENCE_LENGTH = 10;

export const DEFAULT_SEQUENCE_1 = "ACT";
export const DEFAULT_SEQUENCE_2 = "ACGT";

export const DEFAULT_SCORING: ScoringOptions = {
  alignmentMode: "global",
  mode: "simple",
  matchScore: 2,
  mismatchScore: -1,
  matrixName: "EDNAFULL",
  gapPenalty: -2,
};

export const MATRIX_GROUPS = [
  {
    label: "DNA",
    options: ["EDNAFULL"],
  },
  {
    label: "Protein",
    options: [
      "BLOSUM100",
      "BLOSUM90",
      "BLOSUM80",
      "BLOSUM70",
      "BLOSUM62",
      "BLOSUM50",
      "BLOSUM40",
      "BLOSUM30",
      "PAM250",
      "PAM160",
      "PAM120",
      "PAM80",
      "PAM40",
      "PAM10",
      "PAM1",
    ],
  },
] as const;
