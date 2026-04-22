import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import AlignmentText from "./AlignmentText";
import AsyncStatus from "./AsyncStatus";
import DPMatrix from "./DPMatrix";
import {
  $alignmentPageSession,
  alignmentPageSession,
} from "../stores/alignmentPageSession";

function PaginationTriangleIcon({
  direction = "right",
}: {
  direction?: "left" | "right";
}) {
  const path = (
    <path
      fill="currentColor"
      d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"
    />
  );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      className="h-3 w-3 shrink-0"
      aria-hidden="true"
    >
      {direction === "left" ? (
        <g transform="translate(24 0) scale(-1 1)">{path}</g>
      ) : (
        path
      )}
    </svg>
  );
}

export default function AlignmentResultsIsland() {
  const state = useStore($alignmentPageSession);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);

  useEffect(() => {
    alignmentPageSession.activate();
  }, []);

  useEffect(() => {
    setCurrentPathIndex(0);
  }, [state.result]);

  const totalPaths = state.result?.traceback_paths.length ?? 0;
  const hasPaths = totalPaths > 0;
  const safePathIndex = hasPaths
    ? Math.min(currentPathIndex, totalPaths - 1)
    : 0;

  return (
    <>
      <AsyncStatus
        error={state.error}
        isLoading={!state.wasmLoaded && !state.error}
        loadingMessage="Loading alignment plugin…"
      />

      {state.result && (
        <div className="flex flex-col items-center gap-4 mt-0 mb-4">
          <div className="flex items-center gap-8">
            <button
              type="button"
              aria-label="Previous alignment"
              onClick={() => {
                if (!hasPaths) {
                  return;
                }
                setCurrentPathIndex((prev) => Math.max(0, prev - 1));
              }}
              disabled={!hasPaths || safePathIndex === 0}
              className="inline-flex h-9 w-9 items-center justify-center border border-border-default rounded-md hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors bg-surface-panel text-fg-primary shadow-sm"
            >
              <PaginationTriangleIcon direction="left" />
            </button>

            <span className="text-sm font-bold tabular-nums text-fg-primary">
              {hasPaths ? (
                <>
                  Path {safePathIndex + 1} / {totalPaths}
                </>
              ) : (
                "No alignments"
              )}
            </span>

            <button
              type="button"
              aria-label="Next alignment"
              onClick={() => {
                if (!hasPaths) {
                  return;
                }
                setCurrentPathIndex((prev) =>
                  Math.min(totalPaths - 1, prev + 1),
                );
              }}
              disabled={!hasPaths || safePathIndex >= totalPaths - 1}
              className="inline-flex h-9 w-9 items-center justify-center border border-border-default rounded-md hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors bg-surface-panel text-fg-primary shadow-sm"
            >
              <PaginationTriangleIcon />
            </button>
          </div>

          <DPMatrix
            matrix={state.result.matrix}
            seq1={state.result.sequences.seq1}
            seq2={state.result.sequences.seq2}
            currentPath={
              hasPaths ? state.result.traceback_paths[safePathIndex] : undefined
            }
          />

          <AlignmentText
            className="self-center"
            alignment={
              hasPaths ? state.result.alignments[safePathIndex] : undefined
            }
            score={state.result.final_score}
            originalSeq1={state.result.sequences.seq1}
            originalSeq2={state.result.sequences.seq2}
            tracebackPath={
              hasPaths ? state.result.traceback_paths[safePathIndex] : undefined
            }
            alignmentMode={state.scoring.alignmentMode}
          />
        </div>
      )}
    </>
  );
}
