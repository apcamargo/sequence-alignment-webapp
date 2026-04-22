import SessionControlsIsland from "./SessionControlsIsland";
import { practicePageSession } from "../stores/practicePageSession";

export default function PracticeControlsIsland() {
  return <SessionControlsIsland session={practicePageSession} />;
}
