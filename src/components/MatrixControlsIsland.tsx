import { useStore } from "@nanostores/react";
import { Circle, CircleCheck } from "lucide-react";
import MatrixOptionGroups from "./MatrixOptionGroups";
import SelectField from "./SelectField";
import { fieldLabelClass } from "./formFieldStyles";
import {
  $scoringMatrixPage,
  scoringMatrixPage,
} from "../stores/scoringMatrixPage";

export default function MatrixControlsIsland() {
  const state = useStore($scoringMatrixPage);
  const TriangleToggleIcon = state.showTriangle ? CircleCheck : Circle;

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1.5 min-w-55">
            <label
              htmlFor="scoring-matrix-page-select"
              className={fieldLabelClass}
            >
              Matrix
            </label>
            <SelectField
              id="scoring-matrix-page-select"
              value={state.matrixName}
              onChange={(event) => {
                scoringMatrixPage.setMatrixName(event.target.value);
              }}
              suppressHydrationWarning
            >
              <MatrixOptionGroups />
            </SelectField>
          </div>

          <button
            type="button"
            aria-pressed={state.showTriangle}
            onClick={() => {
              scoringMatrixPage.setShowTriangle(!state.showTriangle);
            }}
            className="px-4 py-2 h-field text-sm border border-border-default rounded-md hover:bg-surface-hover transition-colors bg-surface-panel text-fg-primary shadow-sm inline-flex items-center gap-2"
          >
            <TriangleToggleIcon size={16} aria-hidden="true" />
            <span>Show triangle</span>
          </button>
        </div>
      </div>
    </div>
  );
}
