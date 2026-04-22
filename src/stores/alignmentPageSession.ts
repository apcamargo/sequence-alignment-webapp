import { createAlignmentSessionStore } from "./createAlignmentSessionStore";

export const alignmentPageSession = createAlignmentSessionStore();
export const $alignmentPageSession = alignmentPageSession.$state;
