// AudioFY — Data Sonification & Visualization
// Copyright (C) 2026 Jordan Elbirt
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

/**
 * ScatterPlot — D3.js SVG scatter plot with zoom/pan, color-coded multi-source,
 * animated point highlighting for audio sync, legend, and configurable axes.
 *
 * React owns the component lifecycle; D3 owns rendering inside the SVG via refs.
 */
import { useEffect, useRef, useCallback, useMemo, memo } from 'react';
import * as d3 from 'd3';
import type { DataSource, ActivePoint, VisualizationConfig } from '@types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScatterPlotProps {
  /** Data sources to display */
  sources: DataSource[];
  /** Currently active (sonifying) points */
  activePoints: ActivePoint[];
  /** Playback progress 0–1 for trail effect */
  playbackProgress: number;
  /** Visualization config (theme, grid, legend, pointSize) */
  config: VisualizationConfig;
  /** Container dimensions */
  width: number;
  height: number;
  /** Callbacks */
  onPointClick?: (sourceId: string, pointIndex: number) => void;
  onPointHover?: (sourceId: string, pointIndex: number | null) => void;
}

interface PlotPoint {
  sourceId: string;
  sourceColor: string;
  pointIndex: number;
  x: number;
  y: number;
  xLabel: string;
  yLabel: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MARGIN = { top: 30, right: 30, bottom: 50, left: 60 };
const ACTIVE_RADIUS_MULTIPLIER = 2.2;
const ACTIVE_STROKE_WIDTH = 2.5;
const TRANSITION_DURATION = 80; // ms — fast for audio sync

/** Respect prefers-reduced-motion: skip D3 transitions when the OS requests it. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

// ---------------------------------------------------------------------------
// Helpers (pure, testable)
// ---------------------------------------------------------------------------

/** Flatten sources into a single PlotPoint[] for D3 */
// eslint-disable-next-line react-refresh/only-export-components
export function flattenSources(sources: DataSource[]): PlotPoint[] {
  const points: PlotPoint[] = [];

  for (const src of sources) {
    const xColIdx = src.columns.findIndex((c) => c.index === src.audioMapping.xColumn);
    const yColIdx = src.columns.findIndex((c) => c.index === src.audioMapping.yColumn);

    if (xColIdx === -1 || yColIdx === -1) continue;

    const xLabel = src.columns[xColIdx].name;
    const yLabel = src.columns[yColIdx].name;

    for (let i = 0; i < src.rows.length; i++) {
      points.push({
        sourceId: src.id,
        sourceColor: src.color,
        pointIndex: i,
        x: src.rows[i][xColIdx],
        y: src.rows[i][yColIdx],
        xLabel,
        yLabel,
      });
    }
  }

  return points;
}

/** Check whether a point is currently active */
// eslint-disable-next-line react-refresh/only-export-components
export function isPointActive(point: PlotPoint, activePoints: ActivePoint[]): boolean {
  return activePoints.some(
    (ap) => ap.sourceId === point.sourceId && ap.pointIndex === point.pointIndex,
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ScatterPlot = memo(function ScatterPlot({
  sources,
  activePoints,
  playbackProgress: _playbackProgress,
  config,
  width,
  height,
  onPointClick,
  onPointHover,
}: ScatterPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const currentTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);

  // Refs for values used in D3 event handlers to avoid stale closures
  const onPointClickRef = useRef(onPointClick);
  onPointClickRef.current = onPointClick;
  const onPointHoverRef = useRef(onPointHover);
  onPointHoverRef.current = onPointHover;
  const xScaleRef = useRef<d3.ScaleLinear<number, number>>(null!);
  const yScaleRef = useRef<d3.ScaleLinear<number, number>>(null!);
  const configRef = useRef(config);
  configRef.current = config;

  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  // Flatten all source data into plot points
  const points = useMemo(() => flattenSources(sources), [sources]);

  // Compute scales
  const xExtent = useMemo(() => {
    const ext = d3.extent(points, (d) => d.x) as [number, number];
    return ext[0] !== undefined ? ext : ([0, 1] as [number, number]);
  }, [points]);

  const yExtent = useMemo(() => {
    const ext = d3.extent(points, (d) => d.y) as [number, number];
    return ext[0] !== undefined ? ext : ([0, 1] as [number, number]);
  }, [points]);

  const xScale = useMemo(
    () => d3.scaleLinear().domain(xExtent).range([0, innerWidth]).nice(),
    [xExtent, innerWidth],
  );

  const yScale = useMemo(
    () => d3.scaleLinear().domain(yExtent).range([innerHeight, 0]).nice(),
    [yExtent, innerHeight],
  );

  // Keep scale refs current for D3 event handlers
  xScaleRef.current = xScale;
  yScaleRef.current = yScale;

  // -----------------------------------------------------------------------
  // Initial SVG setup (structure, axes, grid, zoom)
  // Only rebuilds when dimensions or theme/grid config changes — NOT on
  // data/source changes (those are handled by the points effect below).
  // -----------------------------------------------------------------------
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // clear on full re-init
    currentTransformRef.current = d3.zoomIdentity;

    const isDark = config.theme === 'dark';
    const textColor = isDark ? '#e0e0e0' : '#333';
    // Grid color chosen to meet WCAG 1.4.11 (≥3:1 contrast with plot background):
    //   light: #888 on #fafafa ≈ 3.28:1
    //   dark:  #777 on #1a1a2e ≈ 3.84:1
    const gridColor = isDark ? '#777' : '#888';

    // Clip path so points don't overflow axes
    svg
      .append('defs')
      .append('clipPath')
      .attr('id', 'plot-clip')
      .append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight);

    const g = svg
      .append('g')
      .attr('class', 'plot-root')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Grid lines
    if (config.showGrid) {
      g.append('g')
        .attr('class', 'grid grid-x')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(
          d3
            .axisBottom(xScale)
            .tickSize(-innerHeight)
            .tickFormat(() => ''),
        )
        .selectAll('line')
        .attr('stroke', gridColor)
        .attr('stroke-opacity', 0.5);

      g.append('g')
        .attr('class', 'grid grid-y')
        .call(
          d3
            .axisLeft(yScale)
            .tickSize(-innerWidth)
            .tickFormat(() => ''),
        )
        .selectAll('line')
        .attr('stroke', gridColor)
        .attr('stroke-opacity', 0.5);

      // Remove grid domain lines
      g.selectAll('.grid .domain').remove();
    }

    // Axes
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('fill', textColor);

    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .attr('fill', textColor);

    // Style axis lines
    g.selectAll('.x-axis path, .x-axis line, .y-axis path, .y-axis line').attr('stroke', textColor);

    // Axis label placeholders (updated by a separate lightweight effect)
    g.append('text')
      .attr('class', 'axis-label x-label')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + MARGIN.bottom - 8)
      .attr('text-anchor', 'middle')
      .attr('fill', textColor)
      .attr('font-size', '13px');

    g.append('text')
      .attr('class', 'axis-label y-label')
      .attr('x', -innerHeight / 2)
      .attr('y', -MARGIN.left + 16)
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('fill', textColor)
      .attr('font-size', '13px');

    // Points group (clipped)
    g.append('g').attr('class', 'points-group').attr('clip-path', 'url(#plot-clip)');

    // Tooltip group (above everything)
    g.append('g').attr('class', 'tooltip-group');

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 20])
      .extent([
        [0, 0],
        [innerWidth, innerHeight],
      ])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        currentTransformRef.current = event.transform;
        const newXScale = event.transform.rescaleX(xScale);
        const newYScale = event.transform.rescaleY(yScale);

        g.select<SVGGElement>('.x-axis').call(d3.axisBottom(newXScale));
        g.select<SVGGElement>('.y-axis').call(d3.axisLeft(newYScale));

        g.selectAll<SVGCircleElement, PlotPoint>('.data-point')
          .attr('cx', (d) => newXScale(d.x))
          .attr('cy', (d) => newYScale(d.y));

        // Update grid if shown
        if (config.showGrid) {
          g.select<SVGGElement>('.grid-x').call(
            d3
              .axisBottom(newXScale)
              .tickSize(-innerHeight)
              .tickFormat(() => ''),
          );
          g.select<SVGGElement>('.grid-y').call(
            d3
              .axisLeft(newYScale)
              .tickSize(-innerWidth)
              .tickFormat(() => ''),
          );
          g.selectAll('.grid line').attr('stroke', gridColor).attr('stroke-opacity', 0.5);
          g.selectAll('.grid .domain').remove();
        }
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Cleanup: remove all D3 content and zoom behavior on unmount/re-init
    return () => {
      svg.on('.zoom', null);
      svg.selectAll('*').remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.theme, config.showGrid, innerWidth, innerHeight]);

  // -----------------------------------------------------------------------
  // Axis labels — lightweight update when sources/columns change
  // -----------------------------------------------------------------------
  useEffect(() => {
    const svg = d3.select(svgRef.current);

    const xLabel = sources[0]?.columns.find(
      (c) => c.index === sources[0]?.audioMapping.xColumn,
    )?.name ?? '';
    const yLabel = sources[0]?.columns.find(
      (c) => c.index === sources[0]?.audioMapping.yColumn,
    )?.name ?? '';

    svg.select('.x-label').text(xLabel);
    svg.select('.y-label').text(yLabel);
  }, [sources]);

  // -----------------------------------------------------------------------
  // Render / update points + refresh axes when data or scales change
  // -----------------------------------------------------------------------
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const g = svg.select('.plot-root');
    const pointsGroup = svg.select('.points-group');
    if (pointsGroup.empty()) return;

    const t = currentTransformRef.current;
    const scaledX = t.rescaleX(xScale);
    const scaledY = t.rescaleY(yScale);

    // Refresh axes to match current scales (data may have changed domains)
    const isDark = config.theme === 'dark';
    const textColor = isDark ? '#e0e0e0' : '#333';

    g.select<SVGGElement>('.x-axis').call(d3.axisBottom(scaledX));
    g.select<SVGGElement>('.y-axis').call(d3.axisLeft(scaledY));
    g.selectAll('.x-axis text, .y-axis text').attr('fill', textColor);
    g.selectAll('.x-axis path, .x-axis line, .y-axis path, .y-axis line').attr('stroke', textColor);

    const baseR = config.pointSize;

    pointsGroup
      .selectAll<SVGCircleElement, PlotPoint>('.data-point')
      .data(
        points.filter((d) => !Number.isNaN(d.x) && !Number.isNaN(d.y)),
        (d) => `${d.sourceId}-${d.pointIndex}`,
      )
      .join(
        (enter) =>
          enter
            .append('circle')
            .attr('class', 'data-point')
            .attr('cx', (d) => scaledX(d.x))
            .attr('cy', (d) => scaledY(d.y))
            .attr('r', 0)
            .attr('fill', (d) => d.sourceColor)
            .attr('opacity', 0.7)
            .attr('cursor', 'pointer')
            .call((sel) => {
              const s = prefersReducedMotion() ? sel : sel.transition().duration(300);
              s.attr('r', baseR);
            }),
        (update) => update,
        (exit) =>
          exit.call((sel) => {
            if (prefersReducedMotion()) {
              sel.remove();
            } else {
              sel.transition().duration(200).attr('r', 0).remove();
            }
          }),
      )
      .on('click', (_event, d) => {
        onPointClickRef.current?.(d.sourceId, d.pointIndex);
      })
      .on('mouseenter', (_event, d) => {
        onPointHoverRef.current?.(d.sourceId, d.pointIndex);

        // Use current transform and scales from refs (avoid stale closures)
        const curTransform = currentTransformRef.current;
        const curXScale = curTransform.rescaleX(xScaleRef.current);
        const curYScale = curTransform.rescaleY(yScaleRef.current);
        const curConfig = configRef.current;

        // Show tooltip
        const tooltipGroup = svg.select('.tooltip-group');
        tooltipGroup.selectAll('*').remove();

        const tx = curXScale(d.x);
        const ty = curYScale(d.y) - baseR * ACTIVE_RADIUS_MULTIPLIER - 8;

        const text = tooltipGroup
          .append('text')
          .attr('x', tx)
          .attr('y', ty)
          .attr('text-anchor', 'middle')
          .attr('font-size', '11px')
          .attr('fill', curConfig.theme === 'dark' ? '#fff' : '#000')
          .text(`(${d.x.toFixed(2)}, ${d.y.toFixed(2)})`);

        // Background rect behind text
        const bbox = (text.node() as SVGTextElement).getBBox();
        tooltipGroup
          .insert('rect', 'text')
          .attr('x', bbox.x - 4)
          .attr('y', bbox.y - 2)
          .attr('width', bbox.width + 8)
          .attr('height', bbox.height + 4)
          .attr('rx', 3)
          .attr('fill', curConfig.theme === 'dark' ? '#333' : '#fff')
          .attr('stroke', curConfig.theme === 'dark' ? '#666' : '#ccc')
          .attr('opacity', 0.9);
      })
      .on('mouseleave', (_event, d) => {
        onPointHoverRef.current?.(d.sourceId, null);
        svg.select('.tooltip-group').selectAll('*').remove();
      });

  }, [points, config.pointSize, config.theme, xScale, yScale]);

  // -----------------------------------------------------------------------
  // Highlight active points (fast updates during playback)
  // -----------------------------------------------------------------------
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const baseR = config.pointSize;

    const reduced = prefersReducedMotion();
    const sel = svg.selectAll<SVGCircleElement, PlotPoint>('.data-point');
    const applied = reduced ? sel : sel.transition().duration(TRANSITION_DURATION);
    applied
      .attr('r', (d) => (isPointActive(d, activePoints) ? baseR * ACTIVE_RADIUS_MULTIPLIER : baseR))
      .attr('opacity', (d) => (isPointActive(d, activePoints) ? 1 : 0.6))
      .attr('stroke', (d) =>
        isPointActive(d, activePoints) ? (config.theme === 'dark' ? '#fff' : '#000') : 'none',
      )
      .attr('stroke-width', (d) => (isPointActive(d, activePoints) ? ACTIVE_STROKE_WIDTH : 0));
  }, [activePoints, config.pointSize, config.theme]);

  // -----------------------------------------------------------------------
  // Legend
  // -----------------------------------------------------------------------
  const legendItems = useMemo(
    () => sources.map((s) => ({ id: s.id, name: s.name, color: s.color })),
    [sources],
  );

  // -----------------------------------------------------------------------
  // Reset zoom callback
  // -----------------------------------------------------------------------
  const resetZoom = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    if (prefersReducedMotion()) {
      d3.select(svgRef.current).call(zoomRef.current.transform, d3.zoomIdentity);
    } else {
      d3.select(svgRef.current)
        .transition()
        .duration(500)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  }, []);

  // Expose resetZoom on the SVG element for external access
  useEffect(() => {
    if (svgRef.current) {
      (svgRef.current as SVGSVGElement & { resetZoom?: () => void }).resetZoom = resetZoom;
    }
  }, [resetZoom]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  const isDark = config.theme === 'dark';

  return (
    <div className="scatter-plot-container" style={{ position: 'relative', width, height }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{
          background: isDark ? '#1a1a2e' : '#fafafa',
          borderRadius: '4px',
          userSelect: 'none',
        }}
        role="img"
        aria-label={`Scatter plot with ${points.length} data points from ${sources.length} source${sources.length !== 1 ? 's' : ''}`}
      />

      {/* Legend overlay */}
      {config.showLegend && legendItems.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: isDark ? 'rgba(30,30,50,0.9)' : 'rgba(255,255,255,0.9)',
            border: `1px solid ${isDark ? '#444' : '#ddd'}`,
            borderRadius: 4,
            padding: '6px 10px',
            fontSize: '12px',
            color: isDark ? '#e0e0e0' : '#333',
            pointerEvents: 'none',
          }}
        >
          {legendItems.map((item) => (
            <div
              key={item.id}
              style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: item.color,
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Reset zoom button */}
      <button
        onClick={resetZoom}
        title="Reset zoom"
        aria-label="Reset chart zoom to original view"
        style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          background: isDark ? '#333' : '#fff',
          border: `1px solid ${isDark ? '#555' : '#ccc'}`,
          borderRadius: 4,
          padding: '4px 8px',
          fontSize: '11px',
          color: isDark ? '#ccc' : '#666',
          cursor: 'pointer',
        }}
      >
        Reset Zoom
      </button>
    </div>
  );
});
