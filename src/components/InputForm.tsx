import { MAX_SEQUENCE_LENGTH } from "../lib/alignment/constants";
import type { ScoringOptions } from "../lib/alignment/types";
import { getScoringMatricesHref } from "../lib/routes";
import MatrixOptionGroups from "./MatrixOptionGroups";
import SelectField from "./SelectField";
import {
  fieldCenteredControlClass,
  fieldLabelClass,
  fieldSegmentedControlClass,
  fieldSegmentedDividerClass,
  fieldSegmentedShellClass,
  fieldShellClass,
  fieldTextControlClass,
} from "./formFieldStyles";

interface InputFormProps {
  seq1: string;
  seq2: string;
  scoring: ScoringOptions;
  onSeq1Change: (value: string) => void;
  onSeq2Change: (value: string) => void;
  onScoringChange: (scoring: ScoringOptions) => void;
}

export default function InputForm({
  seq1,
  seq2,
  scoring,
  onSeq1Change,
  onSeq2Change,
  onScoringChange,
}: InputFormProps) {
  const fieldGroupClass = "flex flex-col gap-1.5 flex-1 min-w-[200px]";
  const fieldShellWithCounterClass = `${fieldShellClass} relative`;
  const sequenceInputClass = `${fieldTextControlClass} font-mono pr-12`;
  const counterClass =
    "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fg-secondary";
  const matrixHeaderClass = "flex flex-wrap items-center gap-x-3 gap-y-1";
  const matrixLinkClass =
    "ml-auto inline-flex items-center rounded-sm text-sm font-semibold text-accent-primary transition-colors hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/45";

  return (
    <div className="my-6 flex flex-col gap-6 lg:my-0">
      <div className="flex flex-wrap gap-6">
        <div className="flex-1 min-w-75 flex flex-col gap-1.5">
          <label htmlFor="seq1" className={fieldLabelClass}>
            Sequence 1
          </label>
          <div className={fieldShellWithCounterClass}>
            <input
              id="seq1"
              type="text"
              value={seq1}
              onChange={(e) => onSeq1Change(e.target.value)}
              maxLength={MAX_SEQUENCE_LENGTH}
              placeholder="e.g. ACT"
              spellCheck={false}
              className={sequenceInputClass}
            />
            <span className={counterClass}>
              {seq1.length}/{MAX_SEQUENCE_LENGTH}
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-75 flex flex-col gap-1.5">
          <label htmlFor="seq2" className={fieldLabelClass}>
            Sequence 2
          </label>
          <div className={fieldShellWithCounterClass}>
            <input
              id="seq2"
              type="text"
              value={seq2}
              onChange={(e) => onSeq2Change(e.target.value)}
              maxLength={MAX_SEQUENCE_LENGTH}
              placeholder="e.g. ACGT"
              spellCheck={false}
              className={sequenceInputClass}
            />
            <span className={counterClass}>
              {seq2.length}/{MAX_SEQUENCE_LENGTH}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <div className={fieldGroupClass}>
          <label htmlFor="alignment-mode" className={fieldLabelClass}>
            Alignment Mode
          </label>
          <SelectField
            id="alignment-mode"
            value={scoring.alignmentMode}
            onChange={(e) =>
              onScoringChange({
                ...scoring,
                alignmentMode: e.target
                  .value as ScoringOptions["alignmentMode"],
              })
            }
          >
            <option value="global">Global</option>
            <option value="local">Local</option>
          </SelectField>
        </div>

        <div className={fieldGroupClass}>
          <label htmlFor="scoring-mode" className={fieldLabelClass}>
            Scoring schema
          </label>
          <SelectField
            id="scoring-mode"
            value={scoring.mode}
            onChange={(e) =>
              onScoringChange({
                ...scoring,
                mode: e.target.value as ScoringOptions["mode"],
              })
            }
          >
            <option value="simple">Simple</option>
            <option value="matrix">Scoring matrix</option>
          </SelectField>
        </div>

        <div className="flex-2 min-w-37.5">
          {scoring.mode === "simple" ? (
            <div className="flex flex-col gap-1.5">
              <label className={fieldLabelClass}>Match / Mismatch</label>
              <div className={fieldSegmentedShellClass}>
                <input
                  id="match"
                  type="number"
                  value={scoring.matchScore}
                  onChange={(e) =>
                    onScoringChange({
                      ...scoring,
                      matchScore: parseInt(e.target.value) || 0,
                    })
                  }
                  title="Match score"
                  className={fieldSegmentedControlClass}
                />
                <span
                  aria-hidden="true"
                  className={fieldSegmentedDividerClass}
                />
                <input
                  id="mismatch"
                  type="number"
                  value={scoring.mismatchScore}
                  onChange={(e) =>
                    onScoringChange({
                      ...scoring,
                      mismatchScore: parseInt(e.target.value) || 0,
                    })
                  }
                  title="Mismatch score"
                  className={fieldSegmentedControlClass}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className={matrixHeaderClass}>
                <label htmlFor="matrix" className={fieldLabelClass}>
                  Matrix
                </label>
                <a
                  href={getScoringMatricesHref(scoring.matrixName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={matrixLinkClass}
                >
                  View matrix
                  <span aria-hidden="true" className="ml-0.75">
                    ↗
                  </span>
                </a>
              </div>
              <SelectField
                id="matrix"
                value={scoring.matrixName}
                onChange={(e) =>
                  onScoringChange({ ...scoring, matrixName: e.target.value })
                }
              >
                <MatrixOptionGroups />
              </SelectField>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-18.75">
          <label htmlFor="gap" className={fieldLabelClass}>
            Gap
          </label>
          <div className={fieldShellClass}>
            <input
              id="gap"
              type="number"
              value={scoring.gapPenalty}
              onChange={(e) =>
                onScoringChange({
                  ...scoring,
                  gapPenalty: parseInt(e.target.value) || 0,
                })
              }
              className={fieldCenteredControlClass}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
