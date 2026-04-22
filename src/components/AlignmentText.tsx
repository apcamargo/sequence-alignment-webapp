import type {
  AlignmentMode,
  AlignedPair,
  TracebackPath,
} from "../lib/alignment/types";

interface AlignmentTextProps {
  alignment?: AlignedPair;
  score?: number;
  originalSeq1?: string;
  originalSeq2?: string;
  tracebackPath?: TracebackPath;
  alignmentMode?: AlignmentMode;
  className?: string;
}

export default function AlignmentText({
  alignment,
  score,
  originalSeq1,
  originalSeq2,
  tracebackPath,
  alignmentMode = "global",
  className,
}: AlignmentTextProps) {
  const containerClass = ["flex flex-col items-center gap-2", className]
    .filter(Boolean)
    .join(" ");

  if (!alignment) {
    return (
      <div className={containerClass}>
        <div className="text-fg-secondary italic">
          No alignment was found for this pair of sequences.
        </div>
        {typeof score === "number" && (
          <div className="font-bold text-sm text-fg-secondary">
            Score: {score}
          </div>
        )}
      </div>
    );
  }

  const matchLine = alignment.seq1
    .split("")
    .map((c1, i) => {
      const c2 = alignment.seq2[i];
      if (c1 === "-" || c2 === "-") return " ";
      return c1 === c2 ? "|" : " ";
    })
    .join("");

  let seq1LeftOverhang = "";
  let seq1RightOverhang = "";
  let seq2LeftOverhang = "";
  let seq2RightOverhang = "";
  let matchLineLeftPadding = "";
  let matchLineRightPadding = "";

  if (
    alignmentMode === "local" &&
    originalSeq1 &&
    originalSeq2 &&
    tracebackPath &&
    tracebackPath.steps.length > 0
  ) {
    const steps = tracebackPath.steps;
    const endStep = steps[0];
    const startStep = steps[steps.length - 1];

    const seq1Start = startStep.i;
    const seq1End = endStep.i;
    seq1LeftOverhang = originalSeq1.slice(0, seq1Start);
    seq1RightOverhang = originalSeq1.slice(seq1End);

    const seq2Start = startStep.j;
    const seq2End = endStep.j;
    seq2LeftOverhang = originalSeq2.slice(0, seq2Start);
    seq2RightOverhang = originalSeq2.slice(seq2End);

    const maxLeftOverhang = Math.max(
      seq1LeftOverhang.length,
      seq2LeftOverhang.length,
    );
    const maxRightOverhang = Math.max(
      seq1RightOverhang.length,
      seq2RightOverhang.length,
    );
    matchLineLeftPadding = " ".repeat(maxLeftOverhang);
    matchLineRightPadding = " ".repeat(maxRightOverhang);

    seq1LeftOverhang = seq1LeftOverhang.padStart(maxLeftOverhang, " ");
    seq2LeftOverhang = seq2LeftOverhang.padStart(maxLeftOverhang, " ");
    seq1RightOverhang = seq1RightOverhang.padEnd(maxRightOverhang, " ");
    seq2RightOverhang = seq2RightOverhang.padEnd(maxRightOverhang, " ");
  }

  const isLocal = alignmentMode === "local";
  const overhangClass = "text-fg-secondary";

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center font-mono text-lg tracking-[0.3em]">
        <pre className="m-0 leading-normal">
          {isLocal && <span className={overhangClass}>{seq1LeftOverhang}</span>}
          <span>{alignment.seq1}</span>
          {isLocal && (
            <span className={overhangClass}>{seq1RightOverhang}</span>
          )}
        </pre>

        <pre className="m-0 leading-none text-accent-primary">
          {isLocal && matchLineLeftPadding}
          {matchLine}
          {isLocal && matchLineRightPadding}
        </pre>

        <pre className="m-0 leading-normal">
          {isLocal && <span className={overhangClass}>{seq2LeftOverhang}</span>}
          <span>{alignment.seq2}</span>
          {isLocal && (
            <span className={overhangClass}>{seq2RightOverhang}</span>
          )}
        </pre>
      </div>

      {typeof score === "number" && (
        <div className="font-bold text-sm text-fg-secondary">
          Score: {score}
        </div>
      )}
    </div>
  );
}
