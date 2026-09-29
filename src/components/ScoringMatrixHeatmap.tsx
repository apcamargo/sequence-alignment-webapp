import { useEffect, useId, useMemo, useRef } from "react";
import { select } from "d3-selection";
import "d3-transition";
import {
  createMatrixLayout,
  selectLayer,
  renderLabels,
  renderGrid,
  renderRings,
  buildGridLineData,
  buildGridRectData,
  buildRowLabels,
  buildColLabels,
  buildCellRingPath,
  type RootSelection,
  type BaseCellDatum,
  type RingDatum,
} from "../lib/d3/matrix-rendering-core";
import {
  DIVERGING_BLUE_RED,
  buildDivergingScale,
  getContrastingTextColor,
  formatScore,
  computeScaleLimit,
} from "../lib/d3/colormap";
import MatrixViewport from "./MatrixViewport";

// Smaller cell size for substitution matrices (matrices are big)
const HEATMAP_CELL_SIZE = 38;

// Fast transitions for the dense matrix — hovers need snappy feedback.
const HEATMAP_TRANSITION_DURATION = 25;

// Hover highlight: the hovered cell gets an inset ring drawn in that
// cell's text color, at a stronger opacity than the practice-page rings
// so it stands out against the dense heatmap. HOVER_RING_DURATION is fast
// enough to track the pointer but long enough to read as a fade.
// HOVER_RING_WIDTH is a half-integer: the ring sits on the 0.5 stroke grid,
// so a x.5 width puts the inner edge on an integer fill boundary in both
// axes and keeps it crisp at 1x displays.
const HOVER_RING_WIDTH = 3.5;
const HOVER_RING_OPACITY = 0.45;
const HOVER_RING_DURATION = 55;
const LABEL_BASE_CLASS =
  "text-sm font-bold fill-viz-label transition-colors duration-150";
const LABEL_MUTED_CLASS =
  "text-sm font-bold fill-viz-score-muted transition-colors duration-150";

export interface HoveredCellInfo {
  i: number;
  j: number;
  row: string;
  col: string;
  score: number;
}

interface ScoringMatrixHeatmapProps {
  labels: string[];
  scores: number[];
  showTriangle?: boolean;
  hoveredCell?: HoveredCellInfo | null;
  onCellHover?: (info: HoveredCellInfo | null) => void;
}

/** Extended cell datum for heatmap */
interface HeatmapCellDatum extends BaseCellDatum {
  score: number;
  color: string;
  textColor: string;
  visible: boolean;
  label: string;
}

type HoveredIndices = { i: number; j: number } | null;

function renderCells(
  root: RootSelection,
  cellData: HeatmapCellDatum[],
  clipId: string,
  duration: number,
): void {
  const layer = selectLayer(root, "cells").attr("clip-path", `url(#${clipId})`);

  layer
    .selectAll<SVGRectElement, HeatmapCellDatum>("rect")
    .data(cellData, (d) => d.key)
    .join(
      (enter) =>
        enter
          .append("rect")
          .attr("x", (d) => d.x)
          .attr("y", (d) => d.y)
          .attr("width", (d) => d.width)
          .attr("height", (d) => d.height)
          .attr("fill", (d) => d.color)
          .style("opacity", (d) => (d.visible ? 1 : 0)),
      (update) =>
        update
          .attr("x", (d) => d.x)
          .attr("y", (d) => d.y)
          .attr("width", (d) => d.width)
          .attr("height", (d) => d.height)
          .call((u) =>
            u
              .transition()
              .duration(duration)
              .attr("fill", (d) => d.color)
              .style("opacity", (d) => (d.visible ? 1 : 0)),
          ),
      (exit) => exit.remove(),
    );
}

function renderScores(
  root: RootSelection,
  cellData: HeatmapCellDatum[],
  duration: number,
): void {
  const layer = selectLayer(root, "scores").style("pointer-events", "none");
  const visibleCells = cellData.filter((d) => d.visible);

  layer
    .selectAll<SVGTextElement, HeatmapCellDatum>("text")
    .data(visibleCells, (d) => d.key)
    .join(
      (enter) =>
        enter
          .append("text")
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("class", "text-sm font-mono tabular-nums")
          .attr("x", (d) => d.cx)
          .attr("y", (d) => d.cy)
          .attr("fill", (d) => d.textColor)
          .style("opacity", 0)
          .text((d) => d.label)
          .call((e) =>
            e
              // Enter, update, and exit share the "score-fade" name so a new
              // fade always interrupts the previous one: an update re-targets
              // opacity to 1 and cancels a pending exit remove instead of
              // leaving the score stuck invisible mid-fade.
              .transition("score-fade")
              .duration(duration)
              .style("opacity", 1),
          ),
      (update) =>
        update
          .attr("x", (d) => d.cx)
          .attr("y", (d) => d.cy)
          .call((u) =>
            u
              .transition("score-fade")
              .duration(duration)
              .attr("fill", (d) => d.textColor)
              .style("opacity", 1),
          ),
      (exit) =>
        exit.call((e) =>
          e
            .transition("score-fade")
            .duration(duration)
            .style("opacity", 0)
            .remove(),
        ),
    )
    .text((d) => d.label);
}

function renderHitTargets(
  root: RootSelection,
  cellData: HeatmapCellDatum[],
  labels: string[],
  onCellHover?: (info: HoveredCellInfo | null) => void,
): void {
  const layer = selectLayer(root, "hit");
  const visibleCells = cellData.filter((d) => d.visible);

  if (!onCellHover) {
    layer.selectAll("rect").remove();
    return;
  }

  layer
    .selectAll<SVGRectElement, HeatmapCellDatum>("rect")
    .data(visibleCells, (d) => d.key)
    .join(
      (enter) =>
        enter
          .append("rect")
          .attr("fill", "transparent")
          .attr("pointer-events", "all")
          .attr("x", (d) => d.x)
          .attr("y", (d) => d.y)
          .attr("width", (d) => d.width)
          .attr("height", (d) => d.height),
      (update) =>
        update
          .attr("x", (d) => d.x)
          .attr("y", (d) => d.y)
          .attr("width", (d) => d.width)
          .attr("height", (d) => d.height),
      (exit) => exit.remove(),
    )
    .on("pointerenter", (_, d) => {
      onCellHover({
        i: d.i,
        j: d.j,
        row: labels[d.i],
        col: labels[d.j],
        score: d.score,
      });
    })
    .on("pointerleave", () => {
      onCellHover(null);
    });
}

function renderHover(
  root: RootSelection,
  ring: RingDatum | null,
  clipId: string,
): void {
  selectLayer(root, "hover").style("pointer-events", "none");

  // Rings are keyed per cell, so each one fades in when shown and fades
  // out when the pointer moves on, at the hover ring duration.
  renderRings(
    root,
    "hover",
    ring ? [ring] : [],
    clipId,
    HOVER_RING_DURATION,
  );
}

export default function ScoringMatrixHeatmap({
  labels,
  scores,
  showTriangle = false,
  hoveredCell,
  onCellHover,
}: ScoringMatrixHeatmapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const clipId = useId().replace(/:/g, "");

  const n = labels.length;
  const layout = useMemo(
    () =>
      createMatrixLayout(n, n, {
        cellSize: HEATMAP_CELL_SIZE,
        topHeaderSize: 0,
      }),
    [n],
  );
  const width = layout.headerSize + n * layout.cellSize + 4;
  const height =
    layout.topHeaderSize + n * layout.cellSize + layout.headerSize + 4;

  const scaleLimit = useMemo(() => computeScaleLimit(scores), [scores]);
  const colorScale = useMemo(
    () => buildDivergingScale(DIVERGING_BLUE_RED, scaleLimit),
    [scaleLimit],
  );

  const cellData = useMemo(() => {
    const cells: HeatmapCellDatum[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const score = scores[i * n + j];
        const x = layout.cellX(j);
        const y = layout.cellY(i);
        const color = colorScale(score);
        const textColor = getContrastingTextColor(color);
        const visible = showTriangle ? j <= i : true;

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
          score,
          color,
          textColor,
          visible,
          label: formatScore(score),
        });
      }
    }
    return cells;
  }, [n, scores, colorScale, showTriangle, layout]);

  const hoveredIndices = useMemo<HoveredIndices>(() => {
    if (!hoveredCell) return null;
    const { i, j } = hoveredCell;
    if (i < 0 || j < 0 || i >= n || j >= n) return null;
    if (showTriangle && j > i) return null;
    return { i, j };
  }, [hoveredCell, n, showTriangle]);

  const hoverRing = useMemo<RingDatum | null>(() => {
    if (!hoveredIndices) return null;
    const cell = cellData[hoveredIndices.i * n + hoveredIndices.j];
    if (!cell) return null;

    return {
      key: `hover-ring-${hoveredIndices.i}-${hoveredIndices.j}`,
      path: buildCellRingPath(cell, layout, {
        ringWidth: HOVER_RING_WIDTH,
        ringInset: 0,
      }),
      color: cell.textColor,
      opacity: HOVER_RING_OPACITY,
    };
  }, [hoveredIndices, cellData, layout, n]);

  const rowLabels = useMemo(
    () =>
      buildRowLabels(labels, layout, { className: LABEL_BASE_CLASS }).map(
        (datum, index) => ({
          ...datum,
          className:
            hoveredIndices && index !== hoveredIndices.i
              ? LABEL_MUTED_CLASS
              : LABEL_BASE_CLASS,
        }),
      ),
    [labels, layout, hoveredIndices],
  );

  const colLabels = useMemo(
    () =>
      buildColLabels(labels, layout, { className: LABEL_BASE_CLASS }).map(
        (datum, index) => ({
          ...datum,
          className:
            hoveredIndices && index !== hoveredIndices.j
              ? LABEL_MUTED_CLASS
              : LABEL_BASE_CLASS,
        }),
      ),
    [labels, layout, hoveredIndices],
  );

  const gridRectData = useMemo(() => buildGridRectData(layout), [layout]);
  const gridLineData = useMemo(() => buildGridLineData(layout), [layout]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = select(svgRef.current);
    const root = svg
      .selectAll<SVGGElement, null>("g[data-root]")
      .data([null])
      .join("g")
      .attr("data-root", "true") as RootSelection;

    renderCells(root, cellData, clipId, HEATMAP_TRANSITION_DURATION);
    renderGrid(root, gridRectData, gridLineData);
    renderScores(root, cellData, HEATMAP_TRANSITION_DURATION);
    renderHitTargets(root, cellData, labels, onCellHover);
    renderHover(root, hoverRing, clipId);
    renderLabels(
      root,
      [...rowLabels, ...colLabels],
      HEATMAP_TRANSITION_DURATION,
    );

    ["cells", "hover", "grid", "scores", "hit", "labels"].forEach((layer) => {
      root.select(`g[data-layer='${layer}']`).raise();
    });
  }, [
    cellData,
    clipId,
    colLabels,
    gridLineData,
    gridRectData,
    hoveredIndices,
    hoverRing,
    labels,
    onCellHover,
    rowLabels,
  ]);

  return (
    <MatrixViewport width={width} height={height}>
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
