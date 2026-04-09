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
 * Tests for visualization utility functions (pure logic, no DOM).
 */
import { describe, it, expect } from 'vitest';
import { flattenSources, isPointActive } from '../../src/core/visualization/ScatterPlot';
import { buildTableRows, sortRows, isRowActive } from '../../src/core/visualization/DataTable';
import type { DataSource, ActivePoint } from '../../src/types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeSource(overrides: Partial<DataSource> = {}): DataSource {
  return {
    id: 'src-1',
    name: 'Test Source',
    fileName: 'test.csv',
    columns: [
      { index: 0, name: 'X', type: 'numeric', stats: { min: 0, max: 10, mean: 5, stdDev: 3, median: 5, q1: 2.5, q3: 7.5 } },
      { index: 1, name: 'Y', type: 'numeric', stats: { min: 0, max: 100, mean: 50, stdDev: 30, median: 50, q1: 25, q3: 75 } },
    ],
    rows: [
      [1, 10],
      [2, 20],
      [3, 30],
    ],
    headers: { row: [], col: ['X', 'Y'] },
    color: '#8884d8',
    normalization: 'min-max',
    audioMapping: {
      xColumn: 0,
      yColumn: 1,
      frequencyRange: [200, 2000],
      frequencyScale: 'log',
      volumeRange: [0.1, 0.8],
      panRange: [-0.8, 0.8],
      waveform: 'sine',
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 },
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// flattenSources
// ---------------------------------------------------------------------------

describe('flattenSources', () => {
  it('returns empty array for empty sources', () => {
    expect(flattenSources([])).toEqual([]);
  });

  it('flattens a single source into plot points', () => {
    const src = makeSource();
    const points = flattenSources([src]);

    expect(points).toHaveLength(3);
    expect(points[0]).toMatchObject({
      sourceId: 'src-1',
      sourceColor: '#8884d8',
      pointIndex: 0,
      x: 1,
      y: 10,
      xLabel: 'X',
      yLabel: 'Y',
    });
    expect(points[2].pointIndex).toBe(2);
    expect(points[2].x).toBe(3);
    expect(points[2].y).toBe(30);
  });

  it('flattens multiple sources', () => {
    const src1 = makeSource({ id: 'a', color: '#f00' });
    const src2 = makeSource({
      id: 'b',
      color: '#0f0',
      rows: [[4, 40], [5, 50]],
    });

    const points = flattenSources([src1, src2]);
    expect(points).toHaveLength(5);
    expect(points[3].sourceId).toBe('b');
    expect(points[3].sourceColor).toBe('#0f0');
    expect(points[3].x).toBe(4);
  });

  it('skips sources with missing column mappings', () => {
    const src = makeSource({
      audioMapping: {
        ...makeSource().audioMapping,
        xColumn: 99, // doesn't exist
      },
    });
    expect(flattenSources([src])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// isPointActive
// ---------------------------------------------------------------------------

describe('isPointActive', () => {
  const point = {
    sourceId: 'src-1',
    sourceColor: '#8884d8',
    pointIndex: 2,
    x: 3,
    y: 30,
    xLabel: 'X',
    yLabel: 'Y',
  };

  it('returns true when point matches an active point', () => {
    const active: ActivePoint[] = [{ sourceId: 'src-1', pointIndex: 2 }];
    expect(isPointActive(point, active)).toBe(true);
  });

  it('returns false when no match', () => {
    const active: ActivePoint[] = [{ sourceId: 'src-1', pointIndex: 0 }];
    expect(isPointActive(point, active)).toBe(false);
  });

  it('returns false for empty active list', () => {
    expect(isPointActive(point, [])).toBe(false);
  });

  it('matches correct source even with same pointIndex', () => {
    const active: ActivePoint[] = [{ sourceId: 'src-2', pointIndex: 2 }];
    expect(isPointActive(point, active)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildTableRows
// ---------------------------------------------------------------------------

describe('buildTableRows', () => {
  it('returns empty array for empty sources', () => {
    expect(buildTableRows([])).toEqual([]);
  });

  it('builds rows from a single source', () => {
    const src = makeSource();
    const rows = buildTableRows([src]);

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      sourceId: 'src-1',
      sourceColor: '#8884d8',
      sourceName: 'Test Source',
      pointIndex: 0,
      values: [1, 10],
    });
  });

  it('builds rows from multiple sources', () => {
    const src1 = makeSource({ id: 'a', name: 'A' });
    const src2 = makeSource({ id: 'b', name: 'B', rows: [[7, 70]] });

    const rows = buildTableRows([src1, src2]);
    expect(rows).toHaveLength(4);
    expect(rows[3].sourceId).toBe('b');
    expect(rows[3].sourceName).toBe('B');
    expect(rows[3].values).toEqual([7, 70]);
  });
});

// ---------------------------------------------------------------------------
// sortRows
// ---------------------------------------------------------------------------

describe('sortRows', () => {
  const src = makeSource({
    rows: [
      [3, 10],
      [1, 30],
      [2, 20],
    ],
  });
  const rows = buildTableRows([src]);

  it('returns unchanged when direction is null', () => {
    const result = sortRows(rows, 0, null);
    expect(result.map((r) => r.values[0])).toEqual([3, 1, 2]);
  });

  it('sorts ascending by column 0', () => {
    const result = sortRows(rows, 0, 'asc');
    expect(result.map((r) => r.values[0])).toEqual([1, 2, 3]);
  });

  it('sorts descending by column 0', () => {
    const result = sortRows(rows, 0, 'desc');
    expect(result.map((r) => r.values[0])).toEqual([3, 2, 1]);
  });

  it('sorts ascending by column 1', () => {
    const result = sortRows(rows, 1, 'asc');
    expect(result.map((r) => r.values[1])).toEqual([10, 20, 30]);
  });

  it('does not mutate original array', () => {
    const original = [...rows];
    sortRows(rows, 0, 'asc');
    expect(rows.map((r) => r.values[0])).toEqual(original.map((r) => r.values[0]));
  });
});

// ---------------------------------------------------------------------------
// isRowActive
// ---------------------------------------------------------------------------

describe('isRowActive', () => {
  const src = makeSource();
  const rows = buildTableRows([src]);

  it('returns true for active row', () => {
    const active: ActivePoint[] = [{ sourceId: 'src-1', pointIndex: 1 }];
    expect(isRowActive(rows[1], active)).toBe(true);
  });

  it('returns false for inactive row', () => {
    const active: ActivePoint[] = [{ sourceId: 'src-1', pointIndex: 1 }];
    expect(isRowActive(rows[0], active)).toBe(false);
  });

  it('returns false for empty active list', () => {
    expect(isRowActive(rows[0], [])).toBe(false);
  });
});
