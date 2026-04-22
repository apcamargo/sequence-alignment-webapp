import SessionControlsIsland from "./SessionControlsIsland";
import { alignmentPageSession } from "../stores/alignmentPageSession";

export default function AlignmentControlsIsland() {
  return <SessionControlsIsland session={alignmentPageSession} />;
}
