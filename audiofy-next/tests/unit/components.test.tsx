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
 * Component tests for ScatterPlot and DataTable React components.
 *
 * NOTE: D3 effects run against jsdom's partial SVG support (no getBBox,
 * no computed layout, etc.) and may silently fail inside useEffect. These
 * tests verify React render-tree structure and event wiring, NOT D3
 * rendering correctness (axes, ticks, data-point circles, zoom transforms).
 * Visual/D3-specific behavior is covered by Playwright e2e tests.
 *
 * The `afterEach` hook below fails any test that produced a `console.error`
 * so that silent D3/React failures surface instead of passing quietly.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { VisualizationConfig } from '../../src/types';

// ---------------------------------------------------------------------------
// D3 mock — jsdom doesn't support full SVG, so we mock d3 partially.
// See the file-level NOTE above: D3 effects may silently no-op under jsdom,
// so we do NOT rely on D3-rendered output in any assertion below.
// ---------------------------------------------------------------------------

vi.mock('d3', async () => {
  const actual = await vi.importActual<typeof import('d3')>('d3');
  return {
    ...actual,
    // The real d3.select works on jsdom elements but SVG rendering
    // is limited. We'll test component render output, not D3 internals.
  };
});

// ---------------------------------------------------------------------------
// console.error watcher — surfaces silent failures from D3 effects or React
// error boundaries. Any console.error during a test will fail that test.
// ---------------------------------------------------------------------------

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  const calls = consoleErrorSpy.mock.calls;
  consoleErrorSpy.mockRestore();
  if (calls.length > 0) {
    throw new Error(
      `Unexpected console.error during test (${calls.length} call(s)): ` +
        calls.map((c) => c.map((a) => String(a)).join(' ')).join(' | '),
    );
  }
});

// Import components AFTER mocks
import { ScatterPlot } from '../../src/core/visualization/ScatterPlot';
import { DataTable } from '../../src/core/visualization/DataTable';

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
      sourceVolume: 1,
    },
    ...overrides,
  };
}

const defaultVizConfig: VisualizationConfig = {
  theme: 'light',
  showGrid: true,
  showLegend: true,
  pointSize: 4,
};

// ---------------------------------------------------------------------------
// ScatterPlot component tests
// ---------------------------------------------------------------------------

describe('ScatterPlot', () => {
  it('renders an SVG element with ARIA label', () => {
    render(
      <ScatterPlot
        sources={[makeSource()]}
        activePoints={[]}
        playbackProgress={0}
        config={defaultVizConfig}
        width={600}
        height={400}
      />,
    );

    const svg = document.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toContain('3 data points');
    expect(svg?.getAttribute('aria-label')).toContain('1 source');
  });

  it('renders with correct dimensions', () => {
    render(
      <ScatterPlot
        sources={[makeSource()]}
        activePoints={[]}
        playbackProgress={0}
        config={defaultVizConfig}
        width={800}
        height={600}
      />,
    );

    const svg = document.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('800');
    expect(svg?.getAttribute('height')).toBe('600');
  });

  it('shows legend when config.showLegend is true', () => {
    render(
      <ScatterPlot
        sources={[makeSource()]}
        activePoints={[]}
        playbackProgress={0}
        config={{ ...defaultVizConfig, showLegend: true }}
        width={600}
        height={400}
      />,
    );

    expect(screen.getByText('Test Source')).toBeTruthy();
  });

  it('hides legend when config.showLegend is false', () => {
    render(
      <ScatterPlot
        sources={[makeSource()]}
        activePoints={[]}
        playbackProgress={0}
        config={{ ...defaultVizConfig, showLegend: false }}
        width={600}
        height={400}
      />,
    );

    expect(screen.queryByText('Test Source')).toBeNull();
  });

  it('renders Reset Zoom button', () => {
    render(
      <ScatterPlot
        sources={[makeSource()]}
        activePoints={[]}
        playbackProgress={0}
        config={defaultVizConfig}
        width={600}
        height={400}
      />,
    );

    expect(screen.getByText('Reset Zoom')).toBeTruthy();
  });

  it('handles empty sources', () => {
    render(
      <ScatterPlot
        sources={[]}
        activePoints={[]}
        playbackProgress={0}
        config={defaultVizConfig}
        width={600}
        height={400}
      />,
    );

    const svg = document.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toContain('0 data points');
  });

  it('reflects dark theme in SVG background', () => {
    render(
      <ScatterPlot
        sources={[makeSource()]}
        activePoints={[]}
        playbackProgress={0}
        config={{ ...defaultVizConfig, theme: 'dark' }}
        width={600}
        height={400}
      />,
    );

    const svg = document.querySelector('svg');
    expect(svg?.style.background).toBe('rgb(26, 26, 46)'); // #1a1a2e
  });

  it('reflects light theme in SVG background', () => {
    render(
      <ScatterPlot
        sources={[makeSource()]}
        activePoints={[]}
        playbackProgress={0}
        config={{ ...defaultVizConfig, theme: 'light' }}
        width={600}
        height={400}
      />,
    );

    const svg = document.querySelector('svg');
    expect(svg?.style.background).toBe('rgb(250, 250, 250)'); // #fafafa
  });

  it('renders multiple sources in legend', () => {
    const src1 = makeSource({ id: 'a', name: 'Source A', color: '#f00' });
    const src2 = makeSource({ id: 'b', name: 'Source B', color: '#0f0' });

    render(
      <ScatterPlot
        sources={[src1, src2]}
        activePoints={[]}
        playbackProgress={0}
        config={defaultVizConfig}
        width={600}
        height={400}
      />,
    );

    expect(screen.getByText('Source A')).toBeTruthy();
    expect(screen.getByText('Source B')).toBeTruthy();
  });

  it('ARIA label reflects multiple sources', () => {
    const src1 = makeSource({ id: 'a' });
    const src2 = makeSource({ id: 'b', rows: [[4, 40]] });

    render(
      <ScatterPlot
        sources={[src1, src2]}
        activePoints={[]}
        playbackProgress={0}
        config={defaultVizConfig}
        width={600}
        height={400}
      />,
    );

    const svg = document.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toContain('4 data points');
    expect(svg?.getAttribute('aria-label')).toContain('2 sources');
  });
});

// ---------------------------------------------------------------------------
// DataTable component tests
// ---------------------------------------------------------------------------

describe('DataTable', () => {
  it('renders "No data loaded" when sources is empty', () => {
    render(
      <DataTable
        sources={[]}
        activePoints={[]}
        config={defaultVizConfig}
        maxHeight={400}
      />,
    );

    expect(screen.getByText('No data loaded')).toBeTruthy();
  });

  it('renders table with correct number of rows', () => {
    render(
      <DataTable
        sources={[makeSource()]}
        activePoints={[]}
        config={defaultVizConfig}
        maxHeight={400}
      />,
    );

    const table = screen.getByRole('grid');
    expect(table).toBeTruthy();
    // 3 data rows + header row
    const rows = table.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
  });

  it('renders column headers', () => {
    render(
      <DataTable
        sources={[makeSource()]}
        activePoints={[]}
        config={defaultVizConfig}
        maxHeight={400}
      />,
    );

    expect(screen.getByText('X')).toBeTruthy();
    expect(screen.getByText('Y')).toBeTruthy();
  });

  it('renders row index numbers', () => {
    render(
      <DataTable
        sources={[makeSource()]}
        activePoints={[]}
        config={defaultVizConfig}
        maxHeight={400}
      />,
    );

    // Row indices: 1, 2, 3
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('renders data values formatted to 2 decimal places', () => {
    render(
      <DataTable
        sources={[makeSource()]}
        activePoints={[]}
        config={defaultVizConfig}
        maxHeight={400}
      />,
    );

    expect(screen.getByText('1.00')).toBeTruthy();
    expect(screen.getByText('10.00')).toBeTruthy();
    expect(screen.getByText('30.00')).toBeTruthy();
  });

  it('does not show Source column for single source', () => {
    render(
      <DataTable
        sources={[makeSource()]}
        activePoints={[]}
        config={defaultVizConfig}
        maxHeight={400}
      />,
    );

    expect(screen.queryByText('Source')).toBeNull();
  });

  it('shows Source column for multiple sources', () => {
    const src1 = makeSource({ id: 'a', name: 'Alpha' });
    const src2 = makeSource({ id: 'b', name: 'Beta', rows: [[4, 40]] });

    render(
      <DataTable
        sources={[src1, src2]}
        activePoints={[]}
        config={defaultVizConfig}
        maxHeight={400}
      />,
    );

    expect(screen.getByText('Source')).toBeTruthy();
    expect(screen.getAllByText('Alpha')).toHaveLength(3); // 3 rows
    expect(screen.getByText('Beta')).toBeTruthy();
  });

  it('renders sortable column headers with aria-sort', () => {
    render(
      <DataTable
        sources={[makeSource()]}
        activePoints={[]}
        config={defaultVizConfig}
        maxHeight={400}
      />,
    );

    const headers = screen.getAllByRole('columnheader');
    // Data column headers (X, Y) should have aria-sort
    const sortableHeaders = headers.filter((h) => h.getAttribute('aria-sort') !== null);
    expect(sortableHeaders.length).toBeGreaterThanOrEqual(2);
    sortableHeaders.forEach((h) => {
      expect(h.getAttribute('aria-sort')).toBe('none');
    });
  });

  it('sorts ascending on column click', async () => {
    const user = userEvent.setup();
    const source = makeSource({
      rows: [
        [3, 10],
        [1, 30],
        [2, 20],
      ],
    });

    render(
      <DataTable
        sources={[source]}
        activePoints={[]}
        config={defaultVizConfig}
        maxHeight={400}
      />,
    );

    // Click on 'X' column header to sort ascending
    const xHeader = screen.getByText('X');
    await user.click(xHeader);

    expect(xHeader.closest('[aria-sort]')?.getAttribute('aria-sort')).toBe('ascending');
  });

  it('cycles sort: asc → desc → none on repeated clicks', async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        sources={[makeSource()]}
        activePoints={[]}
        config={defaultVizConfig}
        maxHeight={400}
      />,
    );

    const xHeader = screen.getByText('X');

    // First click: ascending
    await user.click(xHeader);
    expect(xHeader.closest('[aria-sort]')?.getAttribute('aria-sort')).toBe('ascending');

    // Second click: descending
    await user.click(xHeader);
    expect(xHeader.closest('[aria-sort]')?.getAttribute('aria-sort')).toBe('descending');

    // Third click: none
    await user.click(xHeader);
    expect(xHeader.closest('[aria-sort]')?.getAttribute('aria-sort')).toBe('none');
  });

  it('sorts via keyboard (Enter/Space)', async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        sources={[makeSource()]}
        activePoints={[]}
        config={defaultVizConfig}
        maxHeight={400}
      />,
    );

    const xHeader = screen.getByText('X');
    xHeader.focus();
    await user.keyboard('{Enter}');
    expect(xHeader.closest('[aria-sort]')?.getAttribute('aria-sort')).toBe('ascending');
  });

  it('fires onRowClick callback', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();

    render(
      <DataTable
        sources={[makeSource()]}
        activePoints={[]}
        config={defaultVizConfig}
        maxHeight={400}
        onRowClick={onRowClick}
      />,
    );

    // Click the first data row
    const firstRow = screen.getByText('1.00').closest('tr')!;
    await user.click(firstRow);
    expect(onRowClick).toHaveBeenCalledWith('src-1', 0);
  });

  it('renders Show Statistics toggle button', () => {
    render(
      <DataTable
        sources={[makeSource()]}
        activePoints={[]}
        config={defaultVizConfig}
        maxHeight={400}
      />,
    );

    expect(screen.getByText('Show Statistics')).toBeTruthy();
  });

  it('toggles statistics display', async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        sources={[makeSource()]}
        activePoints={[]}
        config={defaultVizConfig}
        maxHeight={400}
      />,
    );

    const btn = screen.getByText('Show Statistics');
    await user.click(btn);
    expect(screen.getByText('Hide Statistics')).toBeTruthy();
    // Stats row for mean should appear
    expect(screen.getByText('mean')).toBeTruthy();
    expect(screen.getByText('min')).toBeTruthy();
    expect(screen.getByText('max')).toBeTruthy();
  });

  it('renders with dark theme styles', () => {
    render(
      <DataTable
        sources={[makeSource()]}
        activePoints={[]}
        config={{ ...defaultVizConfig, theme: 'dark' }}
        maxHeight={400}
      />,
    );

    const container = document.querySelector('.data-table-container');
    expect(container).toBeTruthy();
    expect((container as HTMLElement).style.background).toBe('rgb(26, 26, 46)');
  });

  it('has correct grid ARIA label', () => {
    render(
      <DataTable
        sources={[makeSource()]}
        activePoints={[]}
        config={defaultVizConfig}
        maxHeight={400}
      />,
    );

    const table = screen.getByRole('grid');
    expect(table.getAttribute('aria-label')).toContain('3 rows');
    expect(table.getAttribute('aria-label')).toContain('2 columns');
  });

  it('has region with data table label', () => {
    render(
      <DataTable
        sources={[makeSource()]}
        activePoints={[]}
        config={defaultVizConfig}
        maxHeight={400}
      />,
    );

    expect(screen.getByRole('region')).toBeTruthy();
  });
});
