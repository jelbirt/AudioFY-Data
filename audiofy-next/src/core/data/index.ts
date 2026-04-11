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
 * Data Pipeline — orchestrates file parsing, column detection, stats computation,
 * and DataSource construction.
 */
import type {
  DataSource,
  ParsedFile,
  ParsedSheet,
  ColumnDef,
  AudioMapping,
  NormalizationMode,
} from '@types';
import { parseFile } from './parser';
import { computeStats } from './normalization';

let sourceIdCounter = 0;

function generateSourceId(): string {
  sourceIdCounter++;
  return `source-${sourceIdCounter}-${Date.now()}`;
}

/** Reset counter (for testing). */
export function _resetSourceIdCounter(): void {
  sourceIdCounter = 0;
}

/** Default color palette for multi-source visualization */
const DEFAULT_COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#0088fe',
  '#00c49f',
  '#ffbb28',
  '#ff8042',
];

/**
 * Create a DataSource from a file buffer + sheet selection.
 */
export function createDataSource(
  data: ArrayBuffer | string,
  fileName: string,
  options: {
    sheetIndex?: number;
    xColumn?: number;
    yColumn?: number;
    color?: string;
    normalization?: NormalizationMode;
  } = {},
): { parsedFile: ParsedFile; source: DataSource } {
  const parsedFile = parseFile(data, fileName);
  const sheetIndex = options.sheetIndex ?? 0;

  if (parsedFile.sheets.length === 0) {
    throw new Error(`No sheets found in file: ${fileName}`);
  }
  if (sheetIndex < 0 || sheetIndex >= parsedFile.sheets.length) {
    throw new Error(
      `Sheet index ${sheetIndex} out of range (file has ${parsedFile.sheets.length} sheets)`,
    );
  }

  const sheet = parsedFile.sheets[sheetIndex];
  const source = buildDataSource(sheet, fileName, options);

  return { parsedFile, source };
}

/**
 * Build a DataSource from a parsed sheet.
 */
export function buildDataSource(
  sheet: ParsedSheet,
  fileName: string,
  options: {
    xColumn?: number;
    yColumn?: number;
    color?: string;
    normalization?: NormalizationMode;
  } = {},
): DataSource {
  const numericCols = sheet.numericColumns;

  if (numericCols.length < 2) {
    throw new Error(
      `Sheet "${sheet.name}" needs at least 2 numeric columns, found ${numericCols.length}`,
    );
  }

  const xCol = options.xColumn ?? numericCols[0];
  const yCol = options.yColumn ?? numericCols[1];

  // Build column definitions with stats
  const columns: ColumnDef[] = numericCols.map((colIndex) => {
    const values = extractNumericColumn(sheet.data, colIndex);
    return {
      index: colIndex,
      name: sheet.headers.col[colIndex] ?? `Column ${colIndex + 1}`,
      type: 'numeric' as const,
      stats: computeStats(values),
    };
  });

  // Extract numeric rows (only numeric columns)
  const rows: number[][] = sheet.data
    .map((row) =>
      numericCols.map((colIndex) => {
        const val = row[colIndex];
        return typeof val === 'number' ? val : 0;
      }),
    )
    .filter((row) => row.some((v) => !Number.isNaN(v))); // remove rows that are entirely NaN

  const id = generateSourceId();
  const colorIndex = ((sourceIdCounter - 1) % DEFAULT_COLORS.length);

  const normalization = options.normalization ?? 'min-max';

  const audioMapping: AudioMapping = {
    xColumn: xCol,
    yColumn: yCol,
    frequencyRange: [200, 2000],
    frequencyScale: 'log',
    volumeRange: [0.1, 0.8],
    panRange: [-0.8, 0.8],
    waveform: 'sine',
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 },
  };

  return {
    id,
    name: sheet.name,
    fileName,
    sheetName: sheet.name,
    columns,
    rows,
    headers: sheet.headers,
    color: options.color ?? DEFAULT_COLORS[colorIndex],
    normalization,
    audioMapping,
  };
}

/**
 * Extract a single numeric column from parsed data.
 */
function extractNumericColumn(data: (string | number | null)[][], colIndex: number): number[] {
  const values: number[] = [];
  for (const row of data) {
    const val = row[colIndex];
    if (typeof val === 'number') {
      values.push(val);
    }
  }
  return values;
}

/**
 * Re-export for convenience.
 */
export { parseFile } from './parser';
export { parseFileAsync, terminateParseWorker } from './parseAsync';
export {
  normalize,
  computeStats,
  mapToRange,
  mapToFrequencyLog,
  mapToFrequencyLinear,
  mapToFrequencyMidi,
} from './normalization';
