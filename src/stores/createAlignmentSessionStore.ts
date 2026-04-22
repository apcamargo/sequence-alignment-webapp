import { atom } from "nanostores";
import {
  DEFAULT_SCORING,
  DEFAULT_SEQUENCE_1,
  DEFAULT_SEQUENCE_2,
  MAX_SEQUENCE_LENGTH,
} from "../lib/alignment/constants";
import type { AlignmentResult, ScoringOptions } from "../lib/alignment/types";
import type { SeqAlignWasmModule } from "../lib/wasm/types";
import { ensureSeqAlignWasmLoaded } from "./ensureSeqAlignWasmLoaded";

const ALIGNMENT_DEBOUNCE_MS = 150;

interface AlignmentSessionInitialState {
  seq1: string;
  seq2: string;
  scoring: ScoringOptions;
}

interface AlignmentSessionState extends AlignmentSessionInitialState {
  active: boolean;
  error: string | null;
  result: AlignmentResult | null;
  wasmLoaded: boolean;
}

const DEFAULT_ALIGNMENT_SESSION_INITIAL_STATE: AlignmentSessionInitialState = {
  seq1: DEFAULT_SEQUENCE_1,
  seq2: DEFAULT_SEQUENCE_2,
  scoring: { ...DEFAULT_SCORING },
};

const normalizeSequence = (value: string): string =>
  value.slice(0, MAX_SEQUENCE_LENGTH).toUpperCase();

const hasSameScoring = (left: ScoringOptions, right: ScoringOptions): boolean =>
  left.alignmentMode === right.alignmentMode &&
  left.mode === right.mode &&
  left.matchScore === right.matchScore &&
  left.mismatchScore === right.mismatchScore &&
  left.matrixName === right.matrixName &&
  left.gapPenalty === right.gapPenalty;

const cloneInitialState = (
  initialState: AlignmentSessionInitialState,
): AlignmentSessionInitialState => ({
  seq1: initialState.seq1,
  seq2: initialState.seq2,
  scoring: { ...initialState.scoring },
});

const createState = (
  initialState: AlignmentSessionInitialState,
): AlignmentSessionState => ({
  ...cloneInitialState(initialState),
  active: false,
  error: null,
  result: null,
  wasmLoaded: false,
});

export function createAlignmentSessionStore(
  defaultInitialState: AlignmentSessionInitialState = DEFAULT_ALIGNMENT_SESSION_INITIAL_STATE,
) {
  const initialState = cloneInitialState(defaultInitialState);
  const $state = atom<AlignmentSessionState>(createState(initialState));
  let computeTimer: number | null = null;
  let latestRunId = 0;

  const setState = (patch: Partial<AlignmentSessionState>) => {
    const currentState = $state.get();
    const patchKeys = Object.keys(patch) as (keyof AlignmentSessionState)[];
    if (patchKeys.every((key) => Object.is(currentState[key], patch[key]))) {
      return;
    }

    $state.set({
      ...currentState,
      ...patch,
    });
  };

  const clearScheduledAlignment = () => {
    if (computeTimer !== null && typeof window !== "undefined") {
      window.clearTimeout(computeTimer);
    }
    computeTimer = null;
  };

  const ensureWasmModule = async (): Promise<SeqAlignWasmModule> => {
    return ensureSeqAlignWasmLoaded<SeqAlignWasmModule, AlignmentSessionState>({
      getLoadErrorPatch(error) {
        return {
          error: `Failed to load WASM: ${error}`,
          result: null,
        };
      },
      getState: () => $state.get(),
      setState,
    });
  };

  const runAlignment = async (runId: number) => {
    const snapshot = $state.get();
    if (!snapshot.active) {
      return;
    }

    if (!snapshot.seq1 || !snapshot.seq2) {
      setState({
        error: null,
        result: null,
      });
      return;
    }

    let module: SeqAlignWasmModule;
    try {
      module = await ensureWasmModule();
    } catch {
      return;
    }

    if (runId !== latestRunId) {
      return;
    }

    const latestState = $state.get();
    if (!latestState.active) {
      return;
    }

    try {
      const matrixName =
        latestState.scoring.mode === "matrix"
          ? latestState.scoring.matrixName
          : undefined;
      const jsonResult = module.align_wasm(
        latestState.seq1,
        latestState.seq2,
        matrixName,
        latestState.scoring.matchScore,
        latestState.scoring.mismatchScore,
        latestState.scoring.gapPenalty,
        latestState.scoring.gapPenalty,
        latestState.scoring.alignmentMode,
      );

      if (runId !== latestRunId) {
        return;
      }

      if (jsonResult.startsWith("Error:")) {
        setState({
          error: jsonResult,
          result: null,
        });
        return;
      }

      setState({
        error: null,
        result: JSON.parse(jsonResult) as AlignmentResult,
      });
    } catch (error) {
      setState({
        error: `Alignment failed: ${error}`,
        result: null,
      });
    }
  };

  const scheduleAlignment = () => {
    const snapshot = $state.get();
    if (!snapshot.active || typeof window === "undefined") {
      return;
    }

    clearScheduledAlignment();

    const runId = ++latestRunId;
    computeTimer = window.setTimeout(() => {
      void runAlignment(runId);
    }, ALIGNMENT_DEBOUNCE_MS);
  };

  const activate = () => {
    if ($state.get().active) {
      return;
    }

    setState({ active: true });
    scheduleAlignment();
  };

  const setSeq1 = (value: string) => {
    const seq1 = normalizeSequence(value);
    if ($state.get().seq1 === seq1) {
      return;
    }

    setState({ seq1 });
    scheduleAlignment();
  };

  const setSeq2 = (value: string) => {
    const seq2 = normalizeSequence(value);
    if ($state.get().seq2 === seq2) {
      return;
    }

    setState({ seq2 });
    scheduleAlignment();
  };

  const setScoring = (scoring: ScoringOptions) => {
    if (hasSameScoring($state.get().scoring, scoring)) {
      return;
    }

    setState({
      scoring: { ...scoring },
    });
    scheduleAlignment();
  };

  return {
    $state,
    activate,
    reset() {
      latestRunId += 1;
      clearScheduledAlignment();
      $state.set(createState(initialState));
    },
    setScoring,
    setSeq1,
    setSeq2,
  };
}
