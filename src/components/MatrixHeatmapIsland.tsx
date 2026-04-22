import { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import AsyncStatus from "./AsyncStatus";
import ScoringMatrixHeatmap, {
  type HoveredCellInfo,
} from "./ScoringMatrixHeatmap";
import { formatScore } from "../lib/d3/colormap";
import {
  $scoringMatrixPage,
  scoringMatrixPage,
} from "../stores/scoringMatrixPage";

export default function MatrixHeatmapIsland() {
  const state = useStore($scoringMatrixPage);
  const [hoveredCell, setHoveredCell] = useState<HoveredCellInfo | null>(null);

  useEffect(() => {
    scoringMatrixPage.activate();
  }, []);

  const labels = useMemo(() => {
    if (!state.matrix) {
      return [] as string[];
    }

    return state.matrix.alphabet.map((code) => String.fromCharCode(code));
  }, [state.matrix]);

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4">
        {state.matrix && (
          <div className="text-sm text-fg-secondary min-h-field flex items-center justify-center">
            {hoveredCell
              ? `${hoveredCell.row}\u2192${hoveredCell.col}: ${formatScore(hoveredCell.score)}`
              : "\u00A0"}
          </div>
        )}

        <AsyncStatus
          error={state.error}
          isLoading={!state.wasmLoaded && !state.error}
          loadingMessage="Loading alignment plugin…"
        />

        {state.matrix && (
          <ScoringMatrixHeatmap
            labels={labels}
            scores={state.matrix.scores}
            showTriangle={state.showTriangle}
            onCellHover={setHoveredCell}
          />
        )}
      </div>
    </div>
  );
}
