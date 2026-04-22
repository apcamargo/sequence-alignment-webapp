import { loadSeqAlignWasm } from "../lib/wasm/loadSeqAlignWasm";
import type { SeqAlignWasmModule } from "../lib/wasm/types";

interface WasmBackedState {
  active: boolean;
  wasmLoaded: boolean;
}

interface EnsureSeqAlignWasmLoadedOptions<TState extends WasmBackedState> {
  getLoadErrorPatch: (error: unknown) => Partial<TState>;
  getState: () => TState;
  setState: (patch: Partial<TState>) => void;
}

export async function ensureSeqAlignWasmLoaded<
  TModule extends Partial<SeqAlignWasmModule>,
  TState extends WasmBackedState,
>({
  getLoadErrorPatch,
  getState,
  setState,
}: EnsureSeqAlignWasmLoadedOptions<TState>): Promise<TModule> {
  try {
    const module = (await loadSeqAlignWasm()) as TModule;
    const currentState = getState();
    if (currentState.active && !currentState.wasmLoaded) {
      setState({ wasmLoaded: true } as Partial<TState>);
    }
    return module;
  } catch (error) {
    if (getState().active) {
      setState({
        ...getLoadErrorPatch(error),
        wasmLoaded: false,
      } as Partial<TState>);
    }
    throw error;
  }
}
