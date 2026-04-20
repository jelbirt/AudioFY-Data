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
 * DataTable — Synchronized data table with row highlighting during playback,
 * auto-scroll, color-coded source columns, sortable headers, and column stats.
 */
import {
  useEffect,
  useRef,
  useMemo,
  useState,
  useCallback,
  type UIEvent,
  type KeyboardEvent,
} from 'react';
import type { DataSource, ActivePoint, VisualizationConfig } from '@types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DataTableProps {
  /** Data sources to display */
  sources: DataSource[];
  /** Currently active (sonifying) points */
  activePoints: ActivePoint[];
  /** Visualization config */
  config: VisualizationConfig;
  /** Maximum height before scrolling */
  maxHeight: number;
  /** Callback when a row is clicked */
  onRowClick?: (sourceId: string, pointIndex: number) => void;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  columnIndex: number | null;
  direction: SortDirection;
}

// ---------------------------------------------------------------------------
// Helpers (pure, testable)
// ---------------------------------------------------------------------------

/** Build flat table rows from multiple sources */
export interface TableRow {
  sourceId: string;
  sourceColor: string;
  sourceName: string;
  pointIndex: number;
  values: number[];
  columnNames: string[];
}

// eslint-disable-next-line react-refresh/only-export-components
export function buildTableRows(sources: DataSource[]): TableRow[] {
  const rows: TableRow[] = [];

  for (const src of sources) {
    for (let i = 0; i < src.rows.length; i++) {
      rows.push({
        sourceId: src.id,
        sourceColor: src.color,
        sourceName: src.name,
        pointIndex: i,
        values: src.rows[i],
        columnNames: src.columns.map((c) => c.name),
      });
    }
  }

  return rows;
}

/** Sort rows by a column value */
// eslint-disable-next-line react-refresh/only-export-components
export function sortRows(
  rows: TableRow[],
  columnIndex: number,
  direction: SortDirection,
): TableRow[] {
  if (direction === null) return rows;

  return [...rows].sort((a, b) => {
    const aRaw = a.values[columnIndex];
    const bRaw = b.values[columnIndex];
    // NaN / null values sort to the end regardless of direction so they don't
    // disrupt the ordered region of the data.
    const aNaN = aRaw == null || Number.isNaN(aRaw);
    const bNaN = bRaw == null || Number.isNaN(bRaw);
    if (aNaN && bNaN) return 0;
    if (aNaN) return 1;
    if (bNaN) return -1;
    return direction === 'asc' ? aRaw - bRaw : bRaw - aRaw;
  });
}

/** Check if a row is active */
// eslint-disable-next-line react-refresh/only-export-components
export function isRowActive(row: TableRow, activePoints: ActivePoint[]): boolean {
  return activePoints.some(
    (ap) => ap.sourceId === row.sourceId && ap.pointIndex === row.pointIndex,
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Virtualization constants
// ---------------------------------------------------------------------------

const ROW_HEIGHT = 28; // px — fixed row height for virtual scroll
const OVERSCAN = 10; // extra rows rendered above/below viewport

export function DataTable({
  sources,
  activePoints,
  config,
  maxHeight,
  onRowClick,
}: DataTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<SortState>({ columnIndex: null, direction: null });
  const [showStats, setShowStats] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);

  // Build and sort rows
  const rawRows = useMemo(() => buildTableRows(sources), [sources]);
  const rows = useMemo(
    () =>
      sort.columnIndex !== null ? sortRows(rawRows, sort.columnIndex, sort.direction) : rawRows,
    [rawRows, sort],
  );

  // Column headers from first source (all sources share column layout after pipeline)
  const columnHeaders = useMemo(() => {
    if (sources.length === 0) return [];
    return sources[0].columns.map((c) => c.name);
  }, [sources]);

  // Column stats from first source
  const columnStats = useMemo(() => {
    if (sources.length === 0) return [];
    return sources[0].columns.map((c) => c.stats);
  }, [sources]);

  // Virtualization calculations
  const headerHeight = 34; // thead height approximation
  const statsToggleHeight = 26; // stats button height
  const viewportHeight = maxHeight - headerHeight - statsToggleHeight;
  const visibleRowCount = Math.ceil(viewportHeight / ROW_HEIGHT);

  const startIdx = useMemo(() => {
    const raw = Math.floor(scrollTop / ROW_HEIGHT);
    return Math.max(0, raw - OVERSCAN);
  }, [scrollTop]);

  const endIdx = useMemo(() => {
    const raw = Math.floor(scrollTop / ROW_HEIGHT) + visibleRowCount;
    return Math.min(rows.length, raw + OVERSCAN);
  }, [scrollTop, visibleRowCount, rows.length]);

  const visibleRows = useMemo(() => rows.slice(startIdx, endIdx), [rows, startIdx, endIdx]);

  // Auto-scroll to active row during playback
  useEffect(() => {
    if (activePoints.length === 0 || !containerRef.current) return;

    // Find the first active row index in the sorted list
    const activeIdx = rows.findIndex((row) => isRowActive(row, activePoints));
    if (activeIdx === -1) return;

    const rowTop = activeIdx * ROW_HEIGHT;
    const rowBottom = rowTop + ROW_HEIGHT;
    const container = containerRef.current;
    const currentScrollTop = container.scrollTop;

    if (rowTop < currentScrollTop || rowBottom > currentScrollTop + viewportHeight) {
      container.scrollTo({
        top: rowTop - viewportHeight / 2 + ROW_HEIGHT / 2,
        behavior: 'smooth',
      });
    }
  }, [activePoints, rows, viewportHeight]);

  // Scroll handler
  const handleScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    setScrollTop((e.target as HTMLDivElement).scrollTop);
  }, []);

  // Sort handler
  const handleSort = useCallback((colIndex: number) => {
    setSort((prev) => {
      if (prev.columnIndex === colIndex) {
        // Cycle: asc → desc → null
        const nextDir: SortDirection =
          prev.direction === 'asc' ? 'desc' : prev.direction === 'desc' ? null : 'asc';
        return { columnIndex: nextDir === null ? null : colIndex, direction: nextDir };
      }
      return { columnIndex: colIndex, direction: 'asc' };
    });
  }, []);

  // Row keyboard handler — Enter or Space triggers the same seek as onClick.
  // Space is preventDefault'd to avoid the default page-scroll behavior.
  const handleRowKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTableRowElement>, sourceId: string, pointIndex: number) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onRowClick?.(sourceId, pointIndex);
      }
    },
    [onRowClick],
  );

  const isDark = config.theme === 'dark';
  const showSourceColumn = sources.length > 1;

  if (sources.length === 0) {
    return (
      <div
        style={{
          padding: 20,
          textAlign: 'center',
          color: isDark ? '#888' : '#999',
          fontSize: '14px',
        }}
      >
        No data loaded
      </div>
    );
  }

  const topPadding = startIdx * ROW_HEIGHT;
  const bottomPadding = Math.max(0, (rows.length - endIdx) * ROW_HEIGHT);

  return (
    <div
      className="data-table-container"
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        maxHeight,
        overflow: 'auto',
        border: `1px solid ${isDark ? '#444' : '#ddd'}`,
        borderRadius: 4,
        fontSize: '12px',
        background: isDark ? '#1a1a2e' : '#fff',
        color: isDark ? '#e0e0e0' : '#333',
      }}
      role="region"
      aria-label="Data table"
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
        }}
        role="grid"
        aria-label={`Data table with ${rows.length} rows and ${columnHeaders.length} columns`}
        aria-rowcount={rows.length}
      >
        <thead
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 1,
            background: isDark ? '#252545' : '#f5f5f5',
          }}
        >
          <tr>
            <th
              style={{
                padding: '6px 8px',
                textAlign: 'center',
                borderBottom: `2px solid ${isDark ? '#555' : '#ccc'}`,
                width: 40,
              }}
            >
              #
            </th>
            {showSourceColumn && (
              <th
                style={{
                  padding: '6px 8px',
                  textAlign: 'left',
                  borderBottom: `2px solid ${isDark ? '#555' : '#ccc'}`,
                  width: 100,
                }}
              >
                Source
              </th>
            )}
            {columnHeaders.map((name, i) => (
              <th
                key={i}
                onClick={() => handleSort(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSort(i);
                  }
                }}
                role="columnheader"
                aria-sort={
                  sort.columnIndex === i
                    ? sort.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                tabIndex={0}
                style={{
                  padding: '6px 8px',
                  textAlign: 'right',
                  borderBottom: `2px solid ${isDark ? '#555' : '#ccc'}`,
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
                title={`Click to sort by ${name}`}
              >
                {name}
                {sort.columnIndex === i && (
                  <span style={{ marginLeft: 4 }}>
                    {sort.direction === 'asc' ? '\u25B2' : '\u25BC'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* Virtual spacer — top */}
          {topPadding > 0 && (
            <tr aria-hidden="true">
              <td style={{ height: topPadding, padding: 0, border: 'none' }} />
            </tr>
          )}

          {visibleRows.map((row, i) => {
            const absoluteIdx = startIdx + i;
            const active = isRowActive(row, activePoints);
            const isInteractive = onRowClick != null;
            // Build a descriptive label: row number + source (if shown) + value summary.
            const valueSummary = row.values
              .map((v) => (typeof v === 'number' && !Number.isNaN(v) ? v.toFixed(2) : '—'))
              .join(', ');
            const rowLabel = isInteractive
              ? `Row ${row.pointIndex + 1}${showSourceColumn ? `, ${row.sourceName}` : ''}: ${valueSummary}. Press Enter or Space to seek.`
              : undefined;
            return (
              <tr
                key={`${row.sourceId}-${row.pointIndex}`}
                onClick={isInteractive ? () => onRowClick?.(row.sourceId, row.pointIndex) : undefined}
                onKeyDown={
                  isInteractive
                    ? (e) => handleRowKeyDown(e, row.sourceId, row.pointIndex)
                    : undefined
                }
                tabIndex={isInteractive ? 0 : undefined}
                aria-rowindex={absoluteIdx + 1}
                aria-label={rowLabel}
                style={{
                  height: ROW_HEIGHT,
                  background: active
                    ? isDark
                      ? 'rgba(100,100,255,0.3)'
                      : 'rgba(66,133,244,0.15)'
                    : absoluteIdx % 2 === 0
                      ? 'transparent'
                      : isDark
                        ? 'rgba(255,255,255,0.03)'
                        : 'rgba(0,0,0,0.02)',
                  cursor: isInteractive ? 'pointer' : 'default',
                  transition: 'background 80ms ease',
                  borderLeft: active ? `3px solid ${row.sourceColor}` : '3px solid transparent',
                }}
              >
                <td
                  style={{
                    padding: '4px 8px',
                    textAlign: 'center',
                    borderBottom: `1px solid ${isDark ? '#333' : '#eee'}`,
                    color: isDark ? '#888' : '#999',
                  }}
                >
                  {row.pointIndex + 1}
                </td>
                {showSourceColumn && (
                  <td
                    style={{
                      padding: '4px 8px',
                      borderBottom: `1px solid ${isDark ? '#333' : '#eee'}`,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: row.sourceColor,
                        marginRight: 6,
                        verticalAlign: 'middle',
                      }}
                    />
                    {row.sourceName}
                  </td>
                )}
                {row.values.map((val, colIdx) => (
                  <td
                    key={colIdx}
                    style={{
                      padding: '4px 8px',
                      textAlign: 'right',
                      borderBottom: `1px solid ${isDark ? '#333' : '#eee'}`,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {typeof val === 'number' && !Number.isNaN(val)
                      ? val.toFixed(2)
                      : '\u2014' /* em-dash for missing/NaN cells */}
                  </td>
                ))}
              </tr>
            );
          })}

          {/* Virtual spacer — bottom */}
          {bottomPadding > 0 && (
            <tr aria-hidden="true">
              <td style={{ height: bottomPadding, padding: 0, border: 'none' }} />
            </tr>
          )}
        </tbody>

        {/* Stats footer */}
        {showStats && columnStats.length > 0 && (
          <tfoot
            style={{
              position: 'sticky',
              bottom: 0,
              background: isDark ? '#252545' : '#f5f5f5',
              borderTop: `2px solid ${isDark ? '#555' : '#ccc'}`,
            }}
          >
            {(['min', 'max', 'mean', 'median', 'stdDev'] as const).map((stat) => (
              <tr key={stat}>
                <td
                  style={{
                    padding: '3px 8px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                  }}
                >
                  {stat}
                </td>
                {showSourceColumn && <td />}
                {columnStats.map((stats, i) => (
                  <td
                    key={i}
                    style={{
                      padding: '3px 8px',
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: '11px',
                    }}
                  >
                    {stats?.[stat] != null ? stats[stat].toFixed(2) : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tfoot>
        )}
      </table>

      {/* Stats toggle */}
      <button
        onClick={() => setShowStats((prev) => !prev)}
        aria-label={showStats ? 'Hide column statistics' : 'Show column statistics'}
        style={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          width: '100%',
          padding: '4px',
          background: isDark ? '#252545' : '#f5f5f5',
          border: 'none',
          borderTop: `1px solid ${isDark ? '#444' : '#ddd'}`,
          color: isDark ? '#888' : '#999',
          cursor: 'pointer',
          fontSize: '11px',
        }}
      >
        {showStats ? 'Hide Statistics' : 'Show Statistics'}
      </button>
    </div>
  );
}
