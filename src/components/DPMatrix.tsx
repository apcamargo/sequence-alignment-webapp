import { useEffect, useId, useMemo, useRef } from "react";
import { select } from "d3-selection";
import "d3-transition";
import type {
  MatrixData,
  TracebackPath,
  ValidationState,
} from "../lib/alignment/types";
import {
  createMatrixLayout,
  DEFAULT_RING_WIDTH,
  DEFAULT_RING_INSET,
  DEFAULT_RING_OPACITY,
  DEFAULT_TRANSITION_DURATION,
  alignToPixel,
  selectLayer,
  renderLabels,
  renderGrid,
  renderRings,
  buildGridLineData,
  buildGridRectData,
  buildCellRingPath,
  type RootSelection,
  type LabelDatum,
  type BaseCellDatum,
  type RingDatum,
  type MatrixLayout,
} from "../lib/d3/matrix-rendering-core";
import MatrixViewport from "./MatrixViewport";

interface ArrowElement {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  angle: number;
  isOnPath: boolean;
}

/** Arrow element with pixel-aligned coordinates for crisp rendering */
interface AlignedArrowElement extends ArrowElement {
  ax1: number;
  ay1: number;
  ax2: number;
  ay2: number;
  aangle: number;
  headPoints: string;
}

interface MatrixCellDatum extends BaseCellDatum {
  score: number;
  isOnPath: boolean;
}

interface DPMatrixProps {
  matrix: MatrixData;
  seq1: string;
  seq2: string;
  currentPath?: TracebackPath;
  showScores?: boolean;
  showArrows?: boolean;
  editable?: boolean;
  cellInputs?: string[][];
  validationMap?: ValidationState[][];
  onCellInputChange?: (row: number, col: number, value: string) => void;
  onCellCommit?: (row: number, col: number, value: string) => void;
}

const DIAGONAL = 1;
const UP = 2;
const LEFT = 4;

const OPACITY_BG_PATH = 0.33;
const OPACITY_ARROW_PATH = 1.0;
const OPACITY_ARROW_BASE = 0.25;
const ARROW_LENGTH = 0.42;
const ARROW_LENGTH_DIAGONAL = 0.46;
const ARROW_HEAD_LENGTH = 6;
const ARROW_HEAD_ANGLE = Math.PI / 4.5;

/** Get CSS class for score text based on path membership */
const getScoreClassName = (isOnPath: boolean): string =>
  `text-sm font-mono transition-colors duration-300 ${
    isOnPath ? "fill-viz-score font-bold" : "fill-viz-score-muted font-normal"
  }`;

const getArrowHeadPoints = (x2: number, y2: number, angle: number) => {
  const p1x = x2 - ARROW_HEAD_LENGTH * Math.cos(angle - ARROW_HEAD_ANGLE);
  const p1y = y2 - ARROW_HEAD_LENGTH * Math.sin(angle - ARROW_HEAD_ANGLE);
  const p2x = x2 - ARROW_HEAD_LENGTH * Math.cos(angle + ARROW_HEAD_ANGLE);
  const p2y = y2 - ARROW_HEAD_LENGTH * Math.sin(angle + ARROW_HEAD_ANGLE);
  return `${p1x},${p1y} ${x2},${y2} ${p2x},${p2y}`;
};

const getCell = (matrix: MatrixData, i: number, j: number) =>
  matrix.cells[i * matrix.cols + j];

const buildPathSets = (currentPath?: TracebackPath) => {
  const pathCells = new Set<string>();
  const pathEdges = new Set<string>();
  if (!currentPath) return { pathCells, pathEdges };

  for (const step of currentPath.steps) {
    pathCells.add(`${step.i},${step.j}`);
  }

  for (let k = 0; k < currentPath.steps.length - 1; k++) {
    const from = currentPath.steps[k];
    const to = currentPath.steps[k + 1];
    pathEdges.add(`${from.i},${from.j}->${to.i},${to.j}`);
  }

  return { pathCells, pathEdges };
};

const buildArrowElements = (
  matrix: MatrixData,
  pathEdges: Set<string>,
  hasPath: boolean,
  layout: MatrixLayout,
): AlignedArrowElement[] => {
  if (!hasPath) return [];
  const arrowElements: ArrowElement[] = [];
  const { cellSize } = layout;

  for (let i = 0; i < matrix.rows; i++) {
    for (let j = 0; j < matrix.cols; j++) {
      const cell = getCell(matrix, i, j);
      const arrowBits = cell.arrows;

      const cx = layout.cellCX(j);
      const cy = layout.cellCY(i);
      const baseLength =
        (arrowBits & DIAGONAL) !== 0 ? ARROW_LENGTH_DIAGONAL : ARROW_LENGTH;
      const halfLen = baseLength / 2;

      if ((arrowBits & DIAGONAL) !== 0 && i > 0 && j > 0) {
        const dx = -cellSize;
        const dy = -cellSize;
        const isOnPath = pathEdges.has(`${i},${j}->${i - 1},${j - 1}`);
        const start = 0.5 - halfLen / Math.SQRT2;
        const end = 0.5 + halfLen / Math.SQRT2;
        arrowElements.push({
          key: `d-${i}-${j}`,
          x1: cx + dx * start,
          y1: cy + dy * start,
          x2: cx + dx * end,
          y2: cy + dy * end,
          angle: Math.atan2(dy, dx),
          isOnPath,
        });
      }

      if ((arrowBits & UP) !== 0 && i > 0) {
        const dy = -cellSize;
        const isOnPath = pathEdges.has(`${i},${j}->${i - 1},${j}`);
        const start = 0.5 - halfLen;
        const end = 0.5 + halfLen;
        arrowElements.push({
          key: `u-${i}-${j}`,
          x1: cx,
          y1: cy + dy * start,
          x2: cx,
          y2: cy + dy * end,
          angle: Math.atan2(dy, 0),
          isOnPath,
        });
      }

      if ((arrowBits & LEFT) !== 0 && j > 0) {
        const dx = -cellSize;
        const isOnPath = pathEdges.has(`${i},${j}->${i},${j - 1}`);
        const start = 0.5 - halfLen;
        const end = 0.5 + halfLen;
        arrowElements.push({
          key: `l-${i}-${j}`,
          x1: cx + dx * start,
          y1: cy,
          x2: cx + dx * end,
          y2: cy,
          angle: Math.atan2(0, dx),
          isOnPath,
        });
      }
    }
  }

  // Pre-compute pixel-aligned coordinates for crisp rendering
  return arrowElements.map((arrow) => {
    const ax1 = alignToPixel(arrow.x1);
    const ay1 = alignToPixel(arrow.y1);
    const ax2 = alignToPixel(arrow.x2);
    const ay2 = alignToPixel(arrow.y2);
    const aangle = Math.atan2(ay2 - ay1, ax2 - ax1);
    return {
      ...arrow,
      ax1,
      ay1,
      ax2,
      ay2,
      aangle,
      headPoints: getArrowHeadPoints(ax2, ay2, aangle),
    };
  });
};

const buildLabelData = (
  seq1: string,
  seq2: string,
  layout: MatrixLayout,
): LabelDatum[] => {
  const { headerSize, topHeaderSize } = layout;
  return [
    {
      key: "top-dash",
      x: layout.cellCX(0),
      y: topHeaderSize / 2,
      text: "−",
      className: "text-sm font-bold fill-viz-label",
    },
    ...seq2.split("").map((c, j) => ({
      key: `top-${j}`,
      x: layout.cellCX(j + 1),
      y: topHeaderSize / 2,
      text: c,
      className: "text-sm font-bold uppercase fill-viz-label",
    })),
    {
      key: "left-dash",
      x: headerSize / 2,
      y: layout.cellCY(0),
      text: "−",
      className: "text-sm font-bold fill-viz-label",
    },
    ...seq1.split("").map((c, i) => ({
      key: `left-${i}`,
      x: headerSize / 2,
      y: layout.cellCY(i + 1),
      text: c,
      className: "text-sm font-bold uppercase fill-viz-label",
    })),
  ];
};

const buildCellData = (
  matrix: MatrixData,
  pathCells: Set<string>,
  layout: MatrixLayout,
): MatrixCellDatum[] => {
  const cells: MatrixCellDatum[] = [];
  for (let i = 0; i < matrix.rows; i++) {
    for (let j = 0; j < matrix.cols; j++) {
      const cell = getCell(matrix, i, j);
      const x = layout.cellX(j);
      const y = layout.cellY(i);
      cells.push({
        key: `cell-${i}-${j}`,
        i,
        j,
        x,
        y,
        cx: layout.cellCX(j),
        cy: layout.cellCY(i),
        width: layout.cellSize,
        height: layout.cellSize,
        score: cell.score,
        isOnPath: pathCells.has(`${i},${j}`),
      });
    }
  }
  return cells;
};

const buildValidationRings = (
  cellData: MatrixCellDatum[],
  layout: MatrixLayout,
  validationMap?: ValidationState[][],
): RingDatum[] => {
  if (!validationMap) return [];

  return cellData
    .map((cell) => {
      const state = validationMap[cell.i]?.[cell.j] ?? "unset";
      if (state === "unset") return null;

      const path = buildCellRingPath(cell, layout, {
        ringWidth: DEFAULT_RING_WIDTH,
        ringInset: DEFAULT_RING_INSET,
      });

      const color =
        state === "correct"
          ? "var(--color-viz-success)"
          : "var(--color-viz-error)";

      return {
        key: `validation-${cell.i}-${cell.j}`,
        path,
        color,
        opacity: DEFAULT_RING_OPACITY,
      };
    })
    .filter((item): item is RingDatum => item !== null);
};

const renderPathHighlight = (
  root: RootSelection,
  cellData: MatrixCellDatum[],
  clipId: string,
) => {
  const pathLayer = selectLayer(root, "path").attr(
    "clip-path",
    `url(#${clipId})`,
  );
  pathLayer
    .selectAll<SVGRectElement, MatrixCellDatum>("rect")
    .data(cellData, (d) => d.key)
    .join(
      (enter) =>
        enter
          .append("rect")
          .attr("class", "fill-viz-path-fill")
          .attr("x", (d) => d.x)
          .attr("y", (d) => d.y)
          .attr("width", (d) => d.width)
          .attr("height", (d) => d.height)
          .style("fill-opacity", 0)
          .call((e) =>
            e
              .transition()
              .duration(DEFAULT_TRANSITION_DURATION)
              .style("fill-opacity", OPACITY_BG_PATH),
          ),
      (update) =>
        update
          .attr("x", (d) => d.x)
          .attr("y", (d) => d.y)
          .attr("width", (d) => d.width)
          .attr("height", (d) => d.height),
      (exit) =>
        exit.call((e) =>
          e
            .transition()
            .duration(DEFAULT_TRANSITION_DURATION)
            .style("fill-opacity", 0)
            .remove(),
        ),
    );
};

const renderArrows = (
  root: RootSelection,
  arrowElements: AlignedArrowElement[],
) => {
  const arrowLayer = selectLayer(root, "arrows");

  arrowLayer
    .selectAll<SVGGElement, AlignedArrowElement>("g.arrow")
    .data(arrowElements, (d) => d.key)
    .join(
      (enter) => {
        const g = enter
          .append("g")
          .attr("class", "arrow")
          .style("opacity", 0)
          .style("color", (d) =>
            d.isOnPath
              ? "var(--color-viz-path)"
              : "var(--color-viz-path-muted)",
          );

        g.append("line")
          .attr("stroke", "currentColor")
          .attr("stroke-width", 1.5)
          .attr("stroke-linecap", "round")
          .attr("x1", (d) => d.ax1)
          .attr("y1", (d) => d.ay1)
          .attr("x2", (d) => d.ax2)
          .attr("y2", (d) => d.ay2);

        g.append("polyline")
          .attr("fill", "none")
          .attr("stroke", "currentColor")
          .attr("stroke-width", 1.5)
          .attr("stroke-linecap", "round")
          .attr("stroke-linejoin", "round")
          .attr("points", (d) => d.headPoints);

        g.transition()
          .duration(DEFAULT_TRANSITION_DURATION)
          .style("opacity", (d) =>
            d.isOnPath ? OPACITY_ARROW_PATH : OPACITY_ARROW_BASE,
          );

        return g;
      },
      (update) => {
        update
          .transition()
          .duration(DEFAULT_TRANSITION_DURATION)
          .style("color", (d) =>
            d.isOnPath
              ? "var(--color-viz-path)"
              : "var(--color-viz-path-muted)",
          )
          .style("opacity", (d) =>
            d.isOnPath ? OPACITY_ARROW_PATH : OPACITY_ARROW_BASE,
          );

        update
          .select<SVGLineElement>("line")
          .attr("x1", (d) => d.ax1)
          .attr("y1", (d) => d.ay1)
          .attr("x2", (d) => d.ax2)
          .attr("y2", (d) => d.ay2);

        update
          .select<SVGPolylineElement>("polyline")
          .attr("points", (d) => d.headPoints);

        return update;
      },
      (exit) =>
        exit
          .transition()
          .duration(DEFAULT_TRANSITION_DURATION)
          .style("opacity", 0)
          .remove(),
    );
};

const renderScores = (
  root: RootSelection,
  cellData: MatrixCellDatum[],
  showScores: boolean,
) => {
  const scoresLayer = selectLayer(root, "scores");
  scoresLayer
    .selectAll<SVGTextElement, MatrixCellDatum>("text")
    .data(cellData, (d) => d.key)
    .join(
      (enter) =>
        enter
          .append("text")
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("x", (d) => d.cx)
          .attr("y", (d) => d.cy)
          .attr("class", (d) => getScoreClassName(d.isOnPath))
          .attr("data-row", (d) => d.i)
          .attr("data-col", (d) => d.j)
          .text((d) => (showScores ? String(d.score) : ""))
          .style("opacity", 0)
          .call((e) =>
            e
              .transition()
              .duration(DEFAULT_TRANSITION_DURATION)
              .style("opacity", 1),
          ),
      (update) => update.attr("x", (d) => d.cx).attr("y", (d) => d.cy),
      (exit) =>
        exit.call((e) =>
          e
            .transition()
            .duration(DEFAULT_TRANSITION_DURATION)
            .style("opacity", 0)
            .remove(),
        ),
    )
    .attr("class", (d) => getScoreClassName(d.isOnPath))
    .text((d) => (showScores ? String(d.score) : ""));
};

export default function DPMatrix({
  matrix,
  seq1,
  seq2,
  currentPath,
  showScores,
  showArrows,
  editable,
  cellInputs,
  validationMap,
  onCellInputChange,
  onCellCommit,
}: DPMatrixProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const clipId = useId().replace(/:/g, "");

  const showScoresValue = showScores ?? Boolean(currentPath);
  const showArrowsValue = showArrows ?? Boolean(currentPath);

  const layout = useMemo(
    () => createMatrixLayout(matrix.rows, matrix.cols),
    [matrix.rows, matrix.cols],
  );

  const { pathCells, pathEdges } = useMemo(
    () => buildPathSets(currentPath),
    [currentPath],
  );

  const cellData = useMemo(
    () => buildCellData(matrix, pathCells, layout),
    [matrix, pathCells, layout],
  );

  const pathCellData = useMemo(
    () => cellData.filter((cell) => cell.isOnPath),
    [cellData],
  );

  const arrowElements = useMemo(
    () =>
      showArrowsValue
        ? buildArrowElements(matrix, pathEdges, Boolean(currentPath), layout)
        : [],
    [showArrowsValue, matrix, pathEdges, currentPath, layout],
  );

  const labelData = useMemo(
    () => buildLabelData(seq1, seq2, layout),
    [seq1, seq2, layout],
  );

  const gridRectData = useMemo(() => buildGridRectData(layout), [layout]);
  const gridLines = useMemo(() => buildGridLineData(layout), [layout]);

  const validationRings = useMemo(
    () => buildValidationRings(cellData, layout, validationMap),
    [cellData, layout, validationMap],
  );

  const width = layout.headerSize + matrix.cols * layout.cellSize + 4;
  const height = layout.topHeaderSize + matrix.rows * layout.cellSize + 4;

  const inputGridStyle = useMemo(
    () => ({
      width,
      height,
      gridTemplateColumns: `${layout.headerSize}px repeat(${matrix.cols}, ${layout.cellSize}px)`,
      gridTemplateRows: `${layout.topHeaderSize}px repeat(${matrix.rows}, ${layout.cellSize}px)`,
      justifyContent: "start",
      alignContent: "start",
    }),
    [
      width,
      height,
      layout.headerSize,
      layout.topHeaderSize,
      layout.cellSize,
      matrix.cols,
      matrix.rows,
    ],
  );

  const baseInputClass =
    "text-sm font-mono text-center bg-transparent text-viz-score-muted w-full h-full outline-none border-0 appearance-none transition-[color] duration-150";

  const getValidationClasses = (state: ValidationState) => {
    if (state === "correct") {
      return "text-status-success";
    }
    if (state === "wrong") {
      return "text-status-error";
    }
    return "text-viz-score-muted";
  };

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = select(svgRef.current);
    const root = svg
      .selectAll<SVGGElement, null>("g[data-root]")
      .data([null])
      .join("g")
      .attr("data-root", "true") as RootSelection;

    renderLabels(root, labelData);
    renderPathHighlight(root, pathCellData, clipId);
    renderGrid(root, gridRectData, gridLines);
    renderRings(root, "validation", validationRings, clipId);
    renderArrows(root, arrowElements);
    renderScores(root, cellData, showScoresValue);

    ["path", "validation", "grid", "arrows", "scores", "labels"].forEach(
      (layer) => {
        root.select(`g[data-layer='${layer}']`).raise();
      },
    );
  }, [
    arrowElements,
    cellData,
    clipId,
    gridLines,
    gridRectData,
    labelData,
    pathCellData,
    validationRings,
    showScoresValue,
  ]);

  return (
    <MatrixViewport
      width={width}
      height={height}
      overlay={
        editable ? (
          <div className="absolute inset-0">
            <div className="grid" style={inputGridStyle}>
              {Array.from({ length: matrix.rows + 1 }).map((_, row) =>
                Array.from({ length: matrix.cols + 1 }).map((__, col) => {
                  const key = `input-${row}-${col}`;
                  if (row === 0 || col === 0) {
                    return <div key={key} />;
                  }
                  const i = row - 1;
                  const j = col - 1;
                  const value = cellInputs?.[i]?.[j] ?? "";
                  const validationState = validationMap?.[i]?.[j] ?? "unset";

                  return (
                    <input
                      key={key}
                      type="text"
                      inputMode="numeric"
                      aria-label={`Row ${i + 1} Column ${j + 1}`}
                      value={value}
                      onChange={(event) =>
                        onCellInputChange?.(i, j, event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        onCellCommit?.(i, j, event.currentTarget.value);
                      }}
                      className={`${baseInputClass} ${getValidationClasses(
                        validationState,
                      )}`}
                    />
                  );
                }),
              )}
            </div>
          </div>
        ) : undefined
      }
    >
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="select-none block"
      >
        <defs>
          <clipPath id={clipId}>
            <rect
              x={layout.clipRect.x}
              y={layout.clipRect.y}
              width={layout.clipRect.width}
              height={layout.clipRect.height}
              rx={layout.clipRect.rx}
            />
          </clipPath>
        </defs>
      </svg>
    </MatrixViewport>
  );
}
