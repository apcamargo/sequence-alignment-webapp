import { createAlignmentSessionStore } from "./createAlignmentSessionStore";

export const practicePageSession = createAlignmentSessionStore();
export const $practicePageSession = practicePageSession.$state;
