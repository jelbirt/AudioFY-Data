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
 * File parser module — reads xlsx, csv, tsv, ods, json files using SheetJS
 * and produces ParsedFile structures with auto-detected headers.
 */
import * as XLSX from 'xlsx';
import type { ParsedFile, ParsedSheet } from '@types';

/**
 * Parse a file (as ArrayBuffer or string) into structured sheets.
 * Supports: .xlsx, .xls, .csv, .tsv, .ods, .json
 */
export function parseFile(data: ArrayBuffer | string, fileName: string): ParsedFile {
  const workbook = XLSX.read(data, { type: data instanceof ArrayBuffer ? 'array' : 'string' });

  const sheets: ParsedSheet[] = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const raw: (string | number | boolean | null)[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
      blankrows: false,
    });

    return parseSheet(sheetName, raw);
  });

  return { fileName, sheets };
}

/**
 * Parse a single sheet's raw 2D array into a ParsedSheet with header detection.
 */
function parseSheet(name: string, raw: (string | number | boolean | null)[][]): ParsedSheet {
  if (raw.length === 0) {
    return { name, headers: { row: [], col: [] }, data: [], numericColumns: [] };
  }

  const { hasRowHeader, hasColHeader } = detectHeaders(raw);

  // Extract headers
  const colHeaders: string[] = hasColHeader
    ? raw[0].map((v) => String(v ?? ''))
    : raw[0].map((_, i) => `Column ${i + 1}`);

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

  // Identify numeric columns
  const numericColumns = identifyNumericColumns(data);

  return {
    name,
    headers: {
      row: rowHeaders,
      col: hasRowHeader ? colHeaders.slice(dataStartCol) : colHeaders,
    },
    data,
    numericColumns,
  };
}

/**
 * Auto-detect whether the first row and/or first column are headers.
 *
 * Heuristic: if a row/column is predominantly non-numeric strings while
 * the rest of the data is predominantly numeric, it's likely a header.
 */
export function detectHeaders(raw: (string | number | boolean | null)[][]): {
  hasRowHeader: boolean;
  hasColHeader: boolean;
} {
  if (raw.length === 0) return { hasRowHeader: false, hasColHeader: false };

  const firstRow = raw[0];
  const restRows = raw.slice(1);

  // Check first row: is it mostly non-numeric while rest is mostly numeric?
  const firstRowTextRatio = textRatio(firstRow);
  const restDataTextRatio =
    restRows.length > 0
      ? restRows.reduce((sum, row) => sum + textRatio(row.slice(1)), 0) / restRows.length
      : 0;

  const hasColHeader = firstRowTextRatio > 0.5 && restDataTextRatio < 0.5;

  // Check first column: is it mostly non-numeric text while rest is numeric?
  const firstColValues = raw.slice(hasColHeader ? 1 : 0).map((row) => row[0]);
  const firstColTextRatio = averageTextRatio(firstColValues);
  const hasRowHeader = firstColTextRatio > 0.5 && restDataTextRatio < 0.5;

  return { hasRowHeader, hasColHeader };
}

/** Fraction of cells in an array that are non-numeric strings. */
function textRatio(cells: (string | number | boolean | null)[]): number {
  if (cells.length === 0) return 0;
  const textCount = cells.filter(
    (c) => typeof c === 'string' && c.trim() !== '' && isNaN(Number(c)),
  ).length;
  return textCount / cells.length;
}

/** Average text ratio for a flat list of values. */
function averageTextRatio(values: (string | number | boolean | null)[]): number {
  return textRatio(values);
}

/** Identify which column indices are predominantly numeric. */
function identifyNumericColumns(data: (string | number | null)[][]): number[] {
  if (data.length === 0) return [];

  const colCount = Math.max(...data.map((row) => row.length));
  const numericCols: number[] = [];

  for (let col = 0; col < colCount; col++) {
    let numericCount = 0;
    let totalNonNull = 0;

    for (const row of data) {
      const val = row[col];
      if (val !== null && val !== undefined) {
        totalNonNull++;
        if (typeof val === 'number') numericCount++;
      }
    }

    // Column is numeric if >70% of non-null values are numbers
    if (totalNonNull > 0 && numericCount / totalNonNull > 0.7) {
      numericCols.push(col);
    }
  }

  return numericCols;
}
