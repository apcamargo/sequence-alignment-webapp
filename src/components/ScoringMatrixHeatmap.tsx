import { useEffect, useId, useMemo, useRef } from "react";
import { select } from "d3-selection";
import "d3-transition";
import {
  createMatrixLayout,
  DEFAULT_TRANSITION_DURATION,
  selectLayer,
  renderLabels,
  renderGrid,
  buildGridLineData,
  buildGridRectData,
  buildRowLabels,
  buildColLabels,
  type RootSelection,
  type BaseCellDatum,
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

export interface HoveredCellInfo {
  row: string;
  col: string;
  score: number;
}

interface ScoringMatrixHeatmapProps {
  labels: string[];
  scores: number[];
  showTriangle?: boolean;
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

function renderCells(
  root: RootSelection,
  cellData: HeatmapCellDatum[],
  clipId: string,
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
              .duration(DEFAULT_TRANSITION_DURATION)
              .attr("fill", (d) => d.color)
              .style("opacity", (d) => (d.visible ? 1 : 0)),
          ),
      (exit) => exit.remove(),
    );
}

function renderScores(root: RootSelection, cellData: HeatmapCellDatum[]): void {
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
              .transition()
              .duration(DEFAULT_TRANSITION_DURATION)
              .style("opacity", 1),
          ),
      (update) =>
        update
          .attr("x", (d) => d.cx)
          .attr("y", (d) => d.cy)
          .call((u) =>
            u
              .transition()
              .duration(DEFAULT_TRANSITION_DURATION)
              .attr("fill", (d) => d.textColor),
          ),
      (exit) =>
        exit.call((e) =>
          e
            .transition()
            .duration(DEFAULT_TRANSITION_DURATION)
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
        row: labels[d.i],
        col: labels[d.j],
        score: d.score,
      });
    })
    .on("pointerleave", () => {
      onCellHover(null);
    });
}

export default function ScoringMatrixHeatmap({
  labels,
  scores,
  showTriangle = false,
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

  const rowLabels = useMemo(
    () =>
      buildRowLabels(labels, layout, {
        className: "text-sm font-bold fill-viz-label",
      }),
    [labels, layout],
  );

  const colLabels = useMemo(
    () =>
      buildColLabels(labels, layout, {
        className: "text-sm font-bold fill-viz-label",
      }),
    [labels, layout],
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

    renderCells(root, cellData, clipId);
    renderGrid(root, gridRectData, gridLineData);
    renderScores(root, cellData);
    renderHitTargets(root, cellData, labels, onCellHover);
    renderLabels(root, [...rowLabels, ...colLabels]);

    ["cells", "grid", "scores", "hit", "labels"].forEach((layer) => {
      root.select(`g[data-layer='${layer}']`).raise();
    });
  }, [
    cellData,
    clipId,
    colLabels,
    gridLineData,
    gridRectData,
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
