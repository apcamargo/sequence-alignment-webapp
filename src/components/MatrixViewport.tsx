import type { CSSProperties, ReactNode } from "react";

interface MatrixViewportProps {
  width: number;
  height: number;
  children: ReactNode;
  overlay?: ReactNode;
}

export default function MatrixViewport({
  width,
  height,
  children,
  overlay,
}: MatrixViewportProps) {
  const frameStyle: CSSProperties = { width, height };

  return (
    <div className="w-full my-2">
      <div className="w-full min-w-0 overflow-x-auto pb-2">
        <div className="min-w-max px-1 flex justify-center">
          <div className="relative" style={frameStyle}>
            {children}
            {overlay}
          </div>
        </div>
      </div>
    </div>
  );
}
