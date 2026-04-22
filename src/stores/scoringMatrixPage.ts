import { atom } from "nanostores";
import { DEFAULT_SCORING } from "../lib/alignment/constants";
import type { ScoringMatrixData } from "../lib/alignment/types";
import {
  getMatrixNameFromSearch,
  getScoringMatricesHref,
  normalizeRoutePath,
  withBase,
} from "../lib/routes";
import type { MatrixDataWasmModule } from "../lib/wasm/types";
import { ensureSeqAlignWasmLoaded } from "./ensureSeqAlignWasmLoaded";

interface ScoringMatrixPageInitialState {
  matrixName: string;
  showTriangle: boolean;
}

interface ScoringMatrixPageState extends ScoringMatrixPageInitialState {
  active: boolean;
  error: string | null;
  matrix: ScoringMatrixData | null;
  wasmLoaded: boolean;
}

const createState = (
  initialState: ScoringMatrixPageInitialState,
): ScoringMatrixPageState => ({
  matrixName: initialState.matrixName,
  showTriangle: initialState.showTriangle,
  active: false,
  error: null,
  matrix: null,
  wasmLoaded: false,
});

const createInitialStateFromSearch = (
  search: string,
): ScoringMatrixPageInitialState => ({
  matrixName: getMatrixNameFromSearch(search),
  showTriangle: false,
});

const $scoringMatrixPageStore = atom<ScoringMatrixPageState>(
  createState(
    createInitialStateFromSearch(
      typeof window === "undefined" ? "" : window.location.search,
    ),
  ),
);

let latestLoadId = 0;

const syncBrowserUrl = (matrixName: string) => {
  if (typeof window === "undefined") {
    return;
  }

  const matricesPath = withBase("/matrices");

  if (
    normalizeRoutePath(window.location.pathname) !==
    normalizeRoutePath(matricesPath)
  ) {
    return;
  }

  const currentParams = new URLSearchParams(window.location.search);
  const currentMatrixName = currentParams.get("matrix");
  const hasMatrixParam = currentMatrixName !== null;

  if (!hasMatrixParam && matrixName === DEFAULT_SCORING.matrixName) {
    return;
  }

  const nextUrl = getScoringMatricesHref(matrixName);
  const currentUrl = `${window.location.pathname}${window.location.search}`;

  if (currentUrl === nextUrl) {
    return;
  }

  window.history.replaceState(window.history.state, "", nextUrl);
};

const setState = (patch: Partial<ScoringMatrixPageState>) => {
  const currentState = $scoringMatrixPageStore.get();
  const patchKeys = Object.keys(patch) as (keyof ScoringMatrixPageState)[];
  if (patchKeys.every((key) => Object.is(currentState[key], patch[key]))) {
    return;
  }

  $scoringMatrixPageStore.set({
    ...currentState,
    ...patch,
  });
};

const ensureWasmModule = async (): Promise<MatrixDataWasmModule> => {
  return ensureSeqAlignWasmLoaded<MatrixDataWasmModule, ScoringMatrixPageState>(
    {
      getLoadErrorPatch(error) {
        return {
          error: `Failed to load WASM: ${error}`,
          matrix: null,
        };
      },
      getState: () => $scoringMatrixPageStore.get(),
      setState,
    },
  );
};

const loadMatrix = async (loadId: number) => {
  const snapshot = $scoringMatrixPageStore.get();
  if (!snapshot.active) {
    return;
  }

  let module: MatrixDataWasmModule;
  try {
    module = await ensureWasmModule();
  } catch {
    return;
  }

  if (loadId !== latestLoadId) {
    return;
  }

  const latestState = $scoringMatrixPageStore.get();
  if (!latestState.active) {
    return;
  }

  const json = module.matrix_data_wasm(latestState.matrixName);
  if (json.startsWith("Error:")) {
    setState({
      error: json,
      matrix: null,
    });
    return;
  }

  try {
    setState({
      error: null,
      matrix: JSON.parse(json) as ScoringMatrixData,
    });
  } catch (error) {
    setState({
      error: `Failed to parse matrix data: ${error}`,
      matrix: null,
    });
  }
};

const requestMatrixLoad = () => {
  const snapshot = $scoringMatrixPageStore.get();
  if (!snapshot.active) {
    return;
  }

  const loadId = ++latestLoadId;
  void loadMatrix(loadId);
};

export const scoringMatrixPage = {
  $state: $scoringMatrixPageStore,
  activate() {
    if ($scoringMatrixPageStore.get().active) {
      return;
    }

    const state = $scoringMatrixPageStore.get();
    syncBrowserUrl(state.matrixName);
    setState({ active: true });
    requestMatrixLoad();
  },
  resetFromSearch(search: string) {
    latestLoadId += 1;
    $scoringMatrixPageStore.set(
      createState(createInitialStateFromSearch(search)),
    );
  },
  setMatrixName(matrixName: string) {
    if ($scoringMatrixPageStore.get().matrixName === matrixName) {
      return;
    }

    setState({
      error: null,
      matrix: null,
      matrixName,
    });
    syncBrowserUrl(matrixName);
    requestMatrixLoad();
  },
  setShowTriangle(showTriangle: boolean) {
    if ($scoringMatrixPageStore.get().showTriangle === showTriangle) {
      return;
    }

    setState({ showTriangle });
  },
};

export const $scoringMatrixPage = scoringMatrixPage.$state;
