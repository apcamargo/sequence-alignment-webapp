import { useStore } from "@nanostores/react";
import InputForm from "./InputForm";
import type { createAlignmentSessionStore } from "../stores/createAlignmentSessionStore";

interface SessionControlsIslandProps {
  session: Pick<
    ReturnType<typeof createAlignmentSessionStore>,
    "$state" | "setScoring" | "setSeq1" | "setSeq2"
  >;
}

export default function SessionControlsIsland({
  session,
}: SessionControlsIslandProps) {
  const state = useStore(session.$state);

  return (
    <InputForm
      seq1={state.seq1}
      seq2={state.seq2}
      scoring={state.scoring}
      onSeq1Change={session.setSeq1}
      onSeq2Change={session.setSeq2}
      onScoringChange={session.setScoring}
    />
  );
}
