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
 * File parser module — reads xlsx, xls, csv, tsv, json files using
 * papaparse (CSV/TSV) and exceljs (XLSX/XLS). Produces ParsedFile
 * structures with auto-detected headers.
 *
 * Note: .ods is NOT supported; the former xlsx@0.18.5 dependency was
 * removed to close CVE-2023-30533 and GHSA-5pgg-2g8v-p4x9.
 */
import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import type { ParsedFile, ParsedSheet, ColumnQuality } from '@types';

// Re-export ColumnQuality from the canonical type module so callers can keep
// importing it from './parser' if they prefer (back-compat shim).
export type { ColumnQuality } from '@types';

/** Supported binary formats (XLSX family) that exceljs can parse. */
const XLSX_EXTENSIONS = ['xlsx', 'xls'];

/** JSON extension — everything else defaults to the CSV/TSV text path. */
const JSON_EXTENSIONS = ['json'];

type RawCell = string | number | boolean | null;

/**
 * Parse a file (as ArrayBuffer or string) into structured sheets.
 *
 * - XLSX/XLS: requires ArrayBuffer (binary format, decoded by exceljs)
 * - CSV/TSV: accepts either string or ArrayBuffer (decoded as UTF-8)
 * - JSON: accepts either string or ArrayBuffer (decoded as UTF-8)
 *
 * Async because exceljs.xlsx.load returns a Promise. CSV/JSON paths resolve
 * synchronously.
 */
export async function parseFile(
  data: ArrayBuffer | string,
  fileName: string,
): Promise<ParsedFile> {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';

  if (XLSX_EXTENSIONS.includes(ext)) {
    if (typeof data === 'string') {
      throw new Error(`${ext.toUpperCase()} files must be provided as ArrayBuffer, not string`);
    }
    return parseXlsx(data, fileName);
  }

  if (JSON_EXTENSIONS.includes(ext)) {
    const text = typeof data === 'string' ? data : decodeBuffer(data);
    return parseJson(text, fileName);
  }

  // Default path: treat as CSV/TSV. Delimiter is auto-detected by papaparse,
  // but we pass an explicit delimiter for .tsv to be robust.
  const text = typeof data === 'string' ? data : decodeBuffer(data);
  const delimiter = ext === 'tsv' ? '\t' : undefined;
  return parseCsv(text, fileName, delimiter);
}

function decodeBuffer(buffer: ArrayBuffer): string {
  // Use TextDecoder which is available in browsers, workers, and jsdom.
  return new TextDecoder('utf-8').decode(buffer);
}

/**
 * Parse XLSX/XLS binary data using exceljs.
 */
async function parseXlsx(data: ArrayBuffer, fileName: string): Promise<ParsedFile> {
  const workbook = new ExcelJS.Workbook();
  // exceljs' xlsx.load takes its `Buffer` type which declared-extends
  // ArrayBuffer. Under jsdom (JSZip) a bare ArrayBuffer confuses JSZip's
  // input-type detection, so pass a Uint8Array view which is supported
  // unambiguously across environments.
  const u8 = new Uint8Array(data);
  await workbook.xlsx.load(u8 as unknown as Parameters<typeof workbook.xlsx.load>[0]);

  const sheets: ParsedSheet[] = [];
  workbook.eachSheet((worksheet) => {
    const raw: RawCell[][] = [];
    // includeEmpty ensures row numbers/column alignment is preserved even for blank rows.
    worksheet.eachRow({ includeEmpty: true }, (row) => {
      const rowArr: RawCell[] = [];
      // Row.values is 1-indexed; index 0 is undefined. Copy index 1..N.
      // cellCount reflects the column count for this row; use columnCount as a
      // ceiling to preserve column alignment across rows.
      const maxCol = Math.max(row.cellCount, worksheet.columnCount);
      for (let c = 1; c <= maxCol; c++) {
        const cell = row.getCell(c);
        rowArr.push(coerceCellValue(cell.value));
      }
      raw.push(rowArr);
    });

    // Trim trailing entirely-null rows to mirror xlsx@0.18.5's blankrows:false
    // behavior. Leading/interior blank rows are preserved.
    while (raw.length > 0 && raw[raw.length - 1].every((c) => c === null)) {
      raw.pop();
    }

    sheets.push(parseSheet(worksheet.name, raw));
  });

  return { fileName, sheets };
}

/**
 * Parse CSV/TSV text using papaparse.
 */
function parseCsv(text: string, fileName: string, delimiter?: string): ParsedFile {
  const result = Papa.parse<RawCell[]>(text, {
    delimiter,
    dynamicTyping: true,
    skipEmptyLines: 'greedy',
    header: false,
  });

  const raw: RawCell[][] = (result.data as RawCell[][]).map((row) =>
    row.map((cell) => normalizeRawCell(cell)),
  );

  // papaparse produces a single sheet named "Sheet1" to preserve backward
  // compatibility with the prior xlsx-based behavior.
  return {
    fileName,
    sheets: [parseSheet('Sheet1', raw)],
  };
}

/**
 * Parse JSON text. Accepts a JSON array-of-arrays or an array of objects
 * (the keys become column headers of the first sheet).
 */
function parseJson(text: string, fileName: string): ParsedFile {
  const parsed = JSON.parse(text);
  let raw: RawCell[][];

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      raw = [];
    } else if (Array.isArray(parsed[0])) {
      raw = parsed.map((row: unknown[]) => row.map((c) => normalizeRawCell(c as RawCell)));
    } else if (typeof parsed[0] === 'object' && parsed[0] !== null) {
      // Array of objects — headers are union of keys, preserving first-seen order.
      const headers: string[] = [];
      for (const obj of parsed) {
        for (const key of Object.keys(obj as Record<string, unknown>)) {
          if (!headers.includes(key)) headers.push(key);
        }
      }
      raw = [headers];
      for (const obj of parsed) {
        raw.push(
          headers.map((h) => normalizeRawCell((obj as Record<string, unknown>)[h] as RawCell)),
        );
      }
    } else {
      // Scalar array — single column.
      raw = (parsed as unknown[]).map((v) => [normalizeRawCell(v as RawCell)]);
    }
  } else {
    throw new Error('JSON file must contain an array at the top level');
  }

  return {
    fileName,
    sheets: [parseSheet('Sheet1', raw)],
  };
}

/**
 * Convert an ExcelJS CellValue into the simple union our pipeline uses.
 * Formula cells collapse to their computed result; rich-text cells collapse
 * to their plain-text concatenation; hyperlinks collapse to their display text.
 */
function coerceCellValue(value: unknown): RawCell {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }
  if (value instanceof Date) {
    // Match xlsx@0.18.5's default date handling: emit the serial-ish number
    // representation. Keeping as ISO string preserves information better and
    // the downstream numeric detector will mark it non-numeric, which is the
    // correct semantics since dates aren't directly sonifiable.
    return value.toISOString();
  }
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>;
    // Formula cell: { formula, result }
    if ('result' in v) {
      return coerceCellValue(v.result);
    }
    // Rich text cell: { richText: [{ text: '...' }, ...] }
    if (Array.isArray(v.richText)) {
      return (v.richText as Array<{ text: string }>).map((r) => r.text ?? '').join('');
    }
    // Hyperlink cell: { text, hyperlink }
    if (typeof v.text === 'string') return v.text;
    // Error cell: { error: '#DIV/0!' }
    if (typeof v.error === 'string') return v.error;
  }
  return null;
}

/**
 * Normalize a cell from any source (papaparse, JSON, exceljs) so that empty
 * strings become null and bare values pass through unchanged.
 */
function normalizeRawCell(cell: unknown): RawCell {
  if (cell === null || cell === undefined) return null;
  if (typeof cell === 'string') {
    const trimmed = cell.trim();
    return trimmed === '' ? null : cell;
  }
  if (typeof cell === 'number' || typeof cell === 'boolean') return cell;
  // Fallback: stringify so downstream numeric detection can try to parse.
  return String(cell);
}

/**
 * Parse a single sheet's raw 2D array into a ParsedSheet with header detection.
 */
function parseSheet(name: string, raw: RawCell[][]): ParsedSheet {
  if (raw.length === 0) {
    return {
      name,
      headers: { row: [], col: [] },
      data: [],
      numericColumns: [],
      columnQuality: [],
    };
  }

  const { hasRowHeader, hasColHeader } = detectHeaders(raw);

  // Normalize row widths so header/column slicing stays aligned.
  let maxWidth = 0;
  for (const row of raw) {
    if (row.length > maxWidth) maxWidth = row.length;
  }

  // Extract headers
  const colHeaders: string[] = hasColHeader
    ? Array.from({ length: maxWidth }, (_, i) => String(raw[0][i] ?? ''))
    : Array.from({ length: maxWidth }, (_, i) => `Column ${i + 1}`);

  const dataStartRow = hasColHeader ? 1 : 0;
  const dataStartCol = hasRowHeader ? 1 : 0;

  const rowHeaders: string[] = hasRowHeader
    ? raw.slice(dataStartRow).map((row) => String(row[0] ?? ''))
    : raw.slice(dataStartRow).map((_, i) => `Row ${i + 1}`);

  // Extract data (excluding header row/col)
  const data: (string | number | null)[][] = raw.slice(dataStartRow).map((row) =>
    row.slice(dataStartCol).map((cell) => {
      if (cell === null || cell === undefined || cell === '') return null;
      if (typeof cell === 'boolean') return cell ? 1 : 0;
      if (typeof cell === 'number') return cell;
      const parsed = Number(cell);
      return isNaN(parsed) ? String(cell) : parsed;
    }),
  );

  const columnQuality = computeColumnQuality(data);
  const numericColumns = columnQuality.filter((q) => q.isNumeric).map((q) => q.index);

  return {
    name,
    headers: {
      row: rowHeaders,
      col: hasRowHeader ? colHeaders.slice(dataStartCol) : colHeaders,
    },
    data,
    numericColumns,
    columnQuality,
  };
}

/**
 * Auto-detect whether the first row and/or first column are headers.
 *
 * Heuristic: if a row/column is predominantly non-numeric strings while
 * the rest of the data is predominantly numeric, it's likely a header.
 */
export function detectHeaders(raw: RawCell[][]): {
  hasRowHeader: boolean;
  hasColHeader: boolean;
} {
  if (raw.length === 0) return { hasRowHeader: false, hasColHeader: false };

  const firstRow = raw[0];
  const restRows = raw.slice(1);

  // Check first row: is it mostly non-numeric while rest is mostly numeric?
  const firstRowTextRatio = textRatio(firstRow);
  // For rest data ratio, use all columns (not just sliced) to avoid skewing detection
  const restDataTextRatio =
    restRows.length > 0
      ? restRows.reduce((sum, row) => sum + textRatio(row), 0) / restRows.length
      : 0;

  const hasColHeader = firstRowTextRatio > 0.5 && restDataTextRatio < 0.5;

  // Check first column: is it mostly non-numeric text while rest is numeric?
  const firstColValues = raw.slice(hasColHeader ? 1 : 0).map((row) => row[0]);
  const firstColTextRatio = averageTextRatio(firstColValues);
  const hasRowHeader = firstColTextRatio > 0.5 && restDataTextRatio < 0.5;

  return { hasRowHeader, hasColHeader };
}

/** Fraction of cells in an array that are non-numeric strings. */
function textRatio(cells: RawCell[]): number {
  if (cells.length === 0) return 0;
  const textCount = cells.filter(
    (c) => typeof c === 'string' && c.trim() !== '' && isNaN(Number(c)),
  ).length;
  return textCount / cells.length;
}

/** Average text ratio for a flat list of values. */
function averageTextRatio(values: RawCell[]): number {
  return textRatio(values);
}

// Thresholds for numeric-column detection. A column qualifies only when BOTH
// the numeric-purity and populated-density ratios clear their bars — this
// avoids flagging sparse columns (e.g. 1 number + 9 blanks) as fully numeric,
// which would otherwise let extractNumericColumn silently zero-fill the gaps.
const NUMERIC_RATIO_THRESHOLD = 0.7;
const POPULATED_RATIO_THRESHOLD = 0.5;

/**
 * Compute per-column quality metrics for a parsed sheet's data.
 * Exported so downstream code (import UI) can show warnings for sparse columns.
 */
export function computeColumnQuality(data: (string | number | null)[][]): ColumnQuality[] {
  if (data.length === 0) return [];

  let colCount = 0;
  for (const row of data) {
    if (row.length > colCount) colCount = row.length;
  }

  const totalRowCount = data.length;
  const quality: ColumnQuality[] = [];

  for (let col = 0; col < colCount; col++) {
    let numericCount = 0;
    let nonNullCount = 0;

    for (const row of data) {
      const val = row[col];
      if (val !== null && val !== undefined) {
        nonNullCount++;
        if (typeof val === 'number') numericCount++;
      }
    }

    const numericRatio = nonNullCount > 0 ? numericCount / nonNullCount : 0;
    const populatedRatio = totalRowCount > 0 ? nonNullCount / totalRowCount : 0;
    const isNumeric =
      nonNullCount > 0 &&
      numericRatio >= NUMERIC_RATIO_THRESHOLD &&
      populatedRatio >= POPULATED_RATIO_THRESHOLD;

    quality.push({
      index: col,
      nonNullCount,
      numericCount,
      totalRowCount,
      numericRatio,
      populatedRatio,
      isNumeric,
    });
  }

  return quality;
}
