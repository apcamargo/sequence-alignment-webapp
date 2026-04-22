export const fieldLabelClass =
  "text-sm font-semibold text-fg-secondary tracking-wide uppercase";

export const fieldShellClass =
  "w-full h-field overflow-hidden rounded-md border border-border-default bg-surface-panel text-fg-primary shadow-sm transition-all focus-within:ring-2 focus-within:ring-accent-primary/45 focus-within:border-accent-primary";

export const fieldControlBaseClass =
  "h-full w-full bg-transparent text-fg-primary outline-none";

export const fieldTextControlClass = `${fieldControlBaseClass} px-3`;

export const fieldCenteredControlClass = `${fieldControlBaseClass} px-3 text-center`;

export const fieldSegmentedShellClass =
  `${fieldShellClass} grid grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]`;

export const fieldSegmentedDividerClass =
  "h-full bg-border-default pointer-events-none";

export const fieldSegmentedControlClass =
  `${fieldCenteredControlClass} min-w-0`;
