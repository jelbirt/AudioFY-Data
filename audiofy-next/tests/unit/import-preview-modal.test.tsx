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
 * Tests for ImportPreviewModal — specifically the sparse-column warning
 * badge that flags numeric columns with >=10% blank values.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ImportPreviewModal } from '../../src/ui/components/ImportPreviewModal';
import type { ParsedFile, ColumnQuality } from '../../src/types';

function makePending(overrides?: { columnQuality?: ColumnQuality[] }) {
  const parsedFile: ParsedFile = {
    fileName: 'test.csv',
    sheets: [
      {
        name: 'Sheet1',
        headers: { row: [], col: ['Dense', 'Sparse', 'AlsoDense'] },
        data: [
          [1, null, 100],
          [2, 20, 200],
          [3, null, 300],
          [4, null, 400],
        ],
        numericColumns: [0, 1, 2],
        columnQuality: overrides?.columnQuality,
      },
    ],
  };
  return {
    parsedFile,
    fileName: 'test.csv',
    filePath: '/tmp/test.csv',
  };
}

describe('ImportPreviewModal — sparse-column badge', () => {
  it('renders a warning badge for sparse numeric columns', () => {
    const quality: ColumnQuality[] = [
      {
        index: 0,
        nonNullCount: 4,
        numericCount: 4,
        totalRowCount: 4,
        numericRatio: 1,
        populatedRatio: 1,
        isNumeric: true,
      },
      {
        index: 1,
        nonNullCount: 1,
        numericCount: 1,
        totalRowCount: 4,
        numericRatio: 1,
        populatedRatio: 0.25,
        isNumeric: true,
      },
      {
        index: 2,
        nonNullCount: 4,
        numericCount: 4,
        totalRowCount: 4,
        numericRatio: 1,
        populatedRatio: 1,
        isNumeric: true,
      },
    ];

    render(
      <ImportPreviewModal
        pending={makePending({ columnQuality: quality })}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    // The sparse column (index 1, 75% blank) should have a badge with 75% blank text.
    const badges = document.querySelectorAll('.sparse-column-badge');
    expect(badges).toHaveLength(1);
    expect(badges[0].textContent).toMatch(/75% blank/);
    const titleAttr = badges[0].getAttribute('title');
    expect(titleAttr).toMatch(/75% blank/);
    expect(titleAttr).toMatch(/skipped in playback/);
    expect(badges[0].getAttribute('aria-label')).toMatch(/75% blank/i);
  });

  it('does not render a badge when columnQuality is missing', () => {
    render(
      <ImportPreviewModal
        pending={makePending({ columnQuality: undefined })}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(document.querySelectorAll('.sparse-column-badge')).toHaveLength(0);
  });

  it('does not render a badge when columns are dense (populatedRatio >= 0.9)', () => {
    const quality: ColumnQuality[] = [
      {
        index: 0,
        nonNullCount: 10,
        numericCount: 10,
        totalRowCount: 10,
        numericRatio: 1,
        populatedRatio: 1,
        isNumeric: true,
      },
      {
        index: 1,
        nonNullCount: 10,
        numericCount: 10,
        totalRowCount: 10,
        numericRatio: 1,
        populatedRatio: 1,
        isNumeric: true,
      },
      {
        index: 2,
        nonNullCount: 10,
        numericCount: 10,
        totalRowCount: 10,
        numericRatio: 1,
        populatedRatio: 1,
        isNumeric: true,
      },
    ];

    render(
      <ImportPreviewModal
        pending={makePending({ columnQuality: quality })}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(document.querySelectorAll('.sparse-column-badge')).toHaveLength(0);
    // Sanity: the modal rendered its preview headers.
    expect(screen.getByText(/Preview/i)).toBeInTheDocument();
  });

  it('does not render a badge when column is sparse but NOT numeric', () => {
    const quality: ColumnQuality[] = [
      {
        index: 0,
        nonNullCount: 10,
        numericCount: 10,
        totalRowCount: 10,
        numericRatio: 1,
        populatedRatio: 1,
        isNumeric: true,
      },
      {
        // Sparse AND not numeric — the sparse-column warning is scoped to
        // numeric columns only, since non-numeric columns would not
        // contribute to playback anyway.
        index: 1,
        nonNullCount: 3,
        numericCount: 0,
        totalRowCount: 10,
        numericRatio: 0,
        populatedRatio: 0.3,
        isNumeric: false,
      },
      {
        index: 2,
        nonNullCount: 10,
        numericCount: 10,
        totalRowCount: 10,
        numericRatio: 1,
        populatedRatio: 1,
        isNumeric: true,
      },
    ];

    render(
      <ImportPreviewModal
        pending={makePending({ columnQuality: quality })}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(document.querySelectorAll('.sparse-column-badge')).toHaveLength(0);
  });
});
