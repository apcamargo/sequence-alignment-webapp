import { path } from "d3-path";
import { type Selection } from "d3-selection";
import "d3-transition";

export const CELL_SIZE = 52;
export const HEADER_SIZE = 36;
export const RADIUS = 6;
export const GRID_OFFSET = 0.5;
export const DEFAULT_TRANSITION_DURATION = 200;
export const DEFAULT_RING_WIDTH = 4.5;
export const DEFAULT_RING_INSET = 0;
export const DEFAULT_RING_OPACITY = 0.3;
export const DEFAULT_RING_DURATION = 150;
export interface LabelDatum {
  key: string;
  x: number;
  y: number;
  text: string;
  className: string;
}
export interface GridLineDatum {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
export interface GridRectDatum {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
}
export interface BaseCellDatum {
  key: string;
  i: number;
  j: number;
  x: number;
  y: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
}
export interface RingDatum {
  key: string;
  path: string;
  color: string;
  opacity: number;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RootSelection = Selection<SVGGElement, unknown, any, unknown>;
export interface MatrixLayoutOptions {
  cellSize?: number;
  headerSize?: number;
  topHeaderSize?: number;
  radius?: number;
  gridOffset?: number;
}
export interface MatrixLayout {
  rows: number;
  cols: number;
  cellSize: number;
  headerSize: number;
  topHeaderSize: number;
  radius: number;
  gridOffset: number;
  gridWidth: number;
  gridHeight: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  clipRect: {
    x: number;
    y: number;
    width: number;
    height: number;
    rx: number;
  };
  cellX: (col: number) => number;
  cellY: (row: number) => number;
  cellCX: (col: number) => number;
  cellCY: (row: number) => number;
}
export const alignToPixel = (value: number): number =>
  Math.floor(value) + GRID_OFFSET;
export function createMatrixLayout(
  rows: number,
  cols: number,
  options: MatrixLayoutOptions = {},
): MatrixLayout {
  const cellSize = options.cellSize ?? CELL_SIZE;
  const headerSize = options.headerSize ?? HEADER_SIZE;
  const topHeaderSize = options.topHeaderSize ?? headerSize;
  const radius = options.radius ?? RADIUS;
  const gridOffset = options.gridOffset ?? GRID_OFFSET;
  const gridWidth = cols * cellSize - 1;
  const gridHeight = rows * cellSize - 1;
  const startX = headerSize + gridOffset;
  const startY = topHeaderSize + gridOffset;
  const endX = startX + gridWidth;
  const endY = startY + gridHeight;

  return {
    rows,
    cols,
    cellSize,
    headerSize,
    topHeaderSize,
    radius,
    gridOffset,
    gridWidth,
    gridHeight,
    startX,
    startY,
    endX,
    endY,
    clipRect: {
      x: startX,
      y: startY,
      width: gridWidth,
      height: gridHeight,
      rx: radius,
    },
    cellX: (col) => headerSize + col * cellSize,
    cellY: (row) => topHeaderSize + row * cellSize,
    cellCX: (col) => headerSize + col * cellSize + cellSize / 2,
    cellCY: (row) => topHeaderSize + row * cellSize + cellSize / 2,
  };
}
export function getRoundedRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  roundTL: boolean,
  roundTR: boolean,
  roundBR: boolean,
  roundBL: boolean,
): string {
  const r = Math.min(radius, width / 2, height / 2);
  const roundedRectPath = path();

  roundedRectPath.moveTo(x + (roundTL ? r : 0), y);
  roundedRectPath.lineTo(x + width - (roundTR ? r : 0), y);
  if (roundTR) {
    roundedRectPath.arcTo(x + width, y, x + width, y + r, r);
  } else {
    roundedRectPath.lineTo(x + width, y);
  }

  roundedRectPath.lineTo(x + width, y + height - (roundBR ? r : 0));
  if (roundBR) {
    roundedRectPath.arcTo(x + width, y + height, x + width - r, y + height, r);
  } else {
    roundedRectPath.lineTo(x + width, y + height);
  }

  roundedRectPath.lineTo(x + (roundBL ? r : 0), y + height);
  if (roundBL) {
    roundedRectPath.arcTo(x, y + height, x, y + height - r, r);
  } else {
    roundedRectPath.lineTo(x, y + height);
  }

  roundedRectPath.lineTo(x, y + (roundTL ? r : 0));
  if (roundTL) {
    roundedRectPath.arcTo(x, y, x + r, y, r);
  } else {
    roundedRectPath.lineTo(x, y);
  }

  roundedRectPath.closePath();
  return roundedRectPath.toString();
}
export function selectLayer(root: RootSelection, layer: string): RootSelection {
  return root
    .selectAll<SVGGElement, null>(`g[data-layer='${layer}']`)
    .data([null])
    .join("g")
    .attr("data-layer", layer) as RootSelection;
}
export function renderLabels(
  root: RootSelection,
  labelData: LabelDatum[],
  duration: number = DEFAULT_TRANSITION_DURATION,
): void {
  const labelsLayer = selectLayer(root, "labels");
  labelsLayer
    .selectAll<SVGTextElement, LabelDatum>("text")
    .data(labelData, (d) => d.key)
    .join(
      (enter) =>
        enter
          .append("text")
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("x", (d) => d.x)
          .attr("y", (d) => d.y)
          .attr("class", (d) => d.className)
          .text((d) => d.text)
          .style("opacity", 0)
          .call((e) => e.transition().duration(duration).style("opacity", 1)),
      (update) =>
        update
          .attr("x", (d) => d.x)
          .attr("y", (d) => d.y)
          .attr("class", (d) => d.className),
      (exit) =>
        exit.call((e) =>
          e.transition().duration(duration).style("opacity", 0).remove(),
        ),
    )
    .text((d) => d.text);
}
export function renderGrid(
  root: RootSelection,
  gridRectData: GridRectDatum[],
  gridLines: GridLineDatum[],
  duration: number = DEFAULT_TRANSITION_DURATION,
): void {
  const gridLayer = selectLayer(root, "grid")
    .attr("class", "stroke-viz-grid")
    .attr("stroke-width", 1)
    .attr("fill", "none");

  gridLayer
    .selectAll<SVGRectElement, GridRectDatum>("rect")
    .data(gridRectData, (d) => d.key)
    .join(
      (enter) =>
        enter
          .append("rect")
          .attr("x", (d) => d.x)
          .attr("y", (d) => d.y)
          .attr("width", (d) => d.width)
          .attr("height", (d) => d.height)
          .attr("rx", (d) => d.rx),
      (update) =>
        update.attr("width", (d) => d.width).attr("height", (d) => d.height),
      (exit) => exit.remove(),
    );

  gridLayer
    .selectAll<SVGLineElement, GridLineDatum>("line")
    .data(gridLines, (d) => d.key)
    .join(
      (enter) =>
        enter
          .append("line")
          .attr("x1", (d) => d.x1)
          .attr("y1", (d) => d.y1)
          .attr("x2", (d) => d.x2)
          .attr("y2", (d) => d.y2)
          .style("opacity", 0)
          .call((e) => e.transition().duration(duration).style("opacity", 1)),
      (update) =>
        update
          .attr("x1", (d) => d.x1)
          .attr("y1", (d) => d.y1)
          .attr("x2", (d) => d.x2)
          .attr("y2", (d) => d.y2),
      (exit) =>
        exit.call((e) =>
          e.transition().duration(duration).style("opacity", 0).remove(),
        ),
    );
}
export function renderRings(
  root: RootSelection,
  layerName: string,
  rings: RingDatum[],
  clipId: string,
  duration: number = DEFAULT_RING_DURATION,
): void {
  const layer = selectLayer(root, layerName).attr(
    "clip-path",
    `url(#${clipId})`,
  );

  layer
    .selectAll<SVGPathElement, RingDatum>("path")
    .data(rings, (d) => d.key)
    .join(
      (enter) =>
        enter
          .append("path")
          .attr("fill-rule", "evenodd")
          .attr("stroke", "none")
          .attr("d", (d) => d.path)
          .attr("fill", (d) => d.color)
          .attr("fill-opacity", 0)
          .call((e) =>
            e
              .transition()
              .duration(duration)
              .attr("fill-opacity", (d) => d.opacity),
          ),
      (update) =>
        update
          .attr("d", (d) => d.path)
          .call((u) =>
            u
              .transition()
              .duration(duration)
              .attr("fill", (d) => d.color)
              .attr("fill-opacity", (d) => d.opacity),
          ),
      (exit) =>
        exit.call((e) =>
          e.transition().duration(duration).attr("fill-opacity", 0).remove(),
        ),
    );
}
export function buildGridRectData(layout: MatrixLayout): GridRectDatum[] {
  return [
    {
      key: "border",
      x: layout.startX,
      y: layout.startY,
      width: layout.gridWidth,
      height: layout.gridHeight,
      rx: layout.radius,
    },
  ];
}
export function buildGridLineData(layout: MatrixLayout): GridLineDatum[] {
  const { cols, rows, cellSize, startX, startY, endX, endY } = layout;

  return [
    ...Array.from({ length: Math.max(0, cols - 1) }).map((_, j) => ({
      key: `v-${j}`,
      x1: startX + (j + 1) * cellSize,
      y1: startY,
      x2: startX + (j + 1) * cellSize,
      y2: endY,
    })),
    ...Array.from({ length: Math.max(0, rows - 1) }).map((_, i) => ({
      key: `h-${i}`,
      x1: startX,
      y1: startY + (i + 1) * cellSize,
      x2: endX,
      y2: startY + (i + 1) * cellSize,
    })),
  ];
}
export interface AxisLabelOptions {
  className?: string;
}
export function buildRowLabels(
  labels: string[],
  layout: MatrixLayout,
  options: AxisLabelOptions = {},
): LabelDatum[] {
  const { headerSize } = layout;
  const { className = "text-sm font-bold fill-viz-label" } = options;

  return labels.map((text, i) => ({
    key: `row-${i}`,
    x: headerSize / 2,
    y: layout.cellCY(i),
    text,
    className,
  }));
}
export function buildColLabels(
  labels: string[],
  layout: MatrixLayout,
  options: AxisLabelOptions = {},
): LabelDatum[] {
  const { headerSize, rows } = layout;
  const { className = "text-sm font-bold fill-viz-label" } = options;

  return labels.map((text, j) => ({
    key: `col-${j}`,
    x: layout.cellCX(j),
    y: layout.cellY(rows) + headerSize / 2,
    text,
    className,
  }));
}
export interface CellRingConfig {
  ringWidth?: number;
  ringInset?: number;
}
export function buildCellRingPath(
  cell: BaseCellDatum,
  layout: MatrixLayout,
  config: CellRingConfig = {},
): string {
  const { rows, cols, cellSize, gridOffset, radius } = layout;
  const { ringWidth = DEFAULT_RING_WIDTH, ringInset = DEFAULT_RING_INSET } =
    config;

  const ringOffset = gridOffset + ringInset;
  const outerRadius = Math.max(0, radius - ringInset);
  const innerRadius = Math.max(0, outerRadius - ringWidth * 0.65);

  const x = cell.x + ringOffset;
  const y = cell.y + ringOffset;
  const isTop = cell.i === 0;
  const isBottom = cell.i === rows - 1;
  const isLeft = cell.j === 0;
  const isRight = cell.j === cols - 1;
  const isCorner = (isTop || isBottom) && (isLeft || isRight);

  const outerWidth = cellSize - (isRight ? 1 : 0);
  const outerHeight = cellSize - (isBottom ? 1 : 0);
  const innerWidth = outerWidth - ringWidth * 2;
  const innerHeight = outerHeight - ringWidth * 2;

  const outerPath = getRoundedRectPath(
    x,
    y,
    outerWidth,
    outerHeight,
    isCorner ? outerRadius : 0,
    isTop && isLeft,
    isTop && isRight,
    isBottom && isRight,
    isBottom && isLeft,
  );

  const innerPath =
    innerWidth > 0 && innerHeight > 0
      ? getRoundedRectPath(
          x + ringWidth,
          y + ringWidth,
          innerWidth,
          innerHeight,
          isCorner ? innerRadius : 0,
          isTop && isLeft,
          isTop && isRight,
          isBottom && isRight,
          isBottom && isLeft,
        )
      : "";

  return innerPath ? `${outerPath} ${innerPath}` : outerPath;
}
