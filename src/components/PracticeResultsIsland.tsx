import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useStore } from "@nanostores/react";
import AsyncStatus from "./AsyncStatus";
import DPMatrix from "./DPMatrix";
import type { MatrixData, ValidationState } from "../lib/alignment/types";
import {
  $practicePageSession,
  practicePageSession,
} from "../stores/practicePageSession";

const createGrid = <T,>(rows: number, cols: number, value: T): T[][] =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => value));

const buildScoreValidationMap = (
  matrix: MatrixData,
  inputs: string[][],
): ValidationState[][] =>
  matrix.cells.reduce<ValidationState[][]>((rows, cell, index) => {
    const row = Math.floor(index / matrix.cols);
    const col = index % matrix.cols;
    if (!rows[row]) {
      rows[row] = [];
    }

    const value = inputs[row]?.[col]?.trim() ?? "";
    if (value === "" || value === "-") {
      rows[row][col] = "unset";
      return rows;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      rows[row][col] = "wrong";
      return rows;
    }

    rows[row][col] = parsed === cell.score ? "correct" : "wrong";
    return rows;
  }, []);

export default function PracticeResultsIsland() {
  const state = useStore($practicePageSession);
  const [userInputs, setUserInputs] = useState<string[][]>([]);
  const [validationMap, setValidationMap] = useState<ValidationState[][]>([]);

  useEffect(() => {
    practicePageSession.activate();
  }, []);

  const matrix = state.result?.matrix ?? null;

  useEffect(() => {
    if (!matrix) {
      setUserInputs([]);
      setValidationMap([]);
      return;
    }

    setUserInputs(createGrid(matrix.rows, matrix.cols, ""));
    setValidationMap(createGrid(matrix.rows, matrix.cols, "unset"));
  }, [matrix]);

  const handleCheckAnswers = (inputsOverride?: string[][]) => {
    if (!matrix) {
      return;
    }

    const inputs = inputsOverride ?? userInputs;
    setValidationMap(buildScoreValidationMap(matrix, inputs));
  };

  return (
    <>
      <AsyncStatus
        error={state.error}
        isLoading={!state.wasmLoaded && !state.error}
        loadingMessage="Loading alignment plugin…"
      />

      {matrix && (
        <div className="flex flex-col items-center gap-4 mt-0 mb-4">
          <button
            type="button"
            onClick={() => handleCheckAnswers()}
            className="px-4 py-2 text-sm border border-border-default rounded-md hover:bg-surface-hover transition-colors bg-surface-panel text-fg-primary shadow-sm flex items-center gap-2"
          >
            <Check size={16} />
            Check answers
          </button>

          <DPMatrix
            matrix={matrix}
            seq1={state.result?.sequences.seq1 ?? state.seq1}
            seq2={state.result?.sequences.seq2 ?? state.seq2}
            editable
            showArrows={false}
            showScores={false}
            cellInputs={userInputs}
            validationMap={validationMap}
            onCellInputChange={(row, col, value) => {
              if (!/^-?\d*$/.test(value)) {
                return;
              }

              setUserInputs((prev) => {
                const next = prev.map((rowValues) => [...rowValues]);
                if (!next[row]) {
                  return prev;
                }

                next[row][col] = value;
                return next;
              });

              setValidationMap((prev) => {
                if (!prev[row]) {
                  return prev;
                }

                const next = prev.map((rowValues) => [...rowValues]);
                next[row][col] = "unset";
                return next;
              });
            }}
            onCellCommit={(row, col, value) => {
              if (!matrix) {
                return;
              }

              setUserInputs((prev) => {
                const next = prev.map((rowValues) => [...rowValues]);
                if (!next[row]) {
                  return prev;
                }

                next[row][col] = value;
                handleCheckAnswers(next);
                return next;
              });
            }}
          />
        </div>
      )}
    </>
  );
}
