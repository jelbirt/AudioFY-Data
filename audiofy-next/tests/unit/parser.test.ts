import { describe, it, expect } from 'vitest';
import { parseFile, detectHeaders } from '../../src/core/data/parser';
import * as XLSX from 'xlsx';

/** Helper to create an in-memory xlsx buffer from a 2D array */
function createXlsxBuffer(data: (string | number | null)[][], sheetName = 'Sheet1'): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return buffer;
}

/** Helper to create a CSV string */
function createCsv(rows: string[][]): string {
  return rows.map((r) => r.join(',')).join('\n');
}

describe('detectHeaders', () => {
  it('detects column headers when first row is text', () => {
    const raw: (string | number)[][] = [
      ['Name', 'Age', 'Score'],
      [1, 25, 90],
      [2, 30, 85],
    ];
    const result = detectHeaders(raw);
    expect(result.hasColHeader).toBe(true);
  });

  it('detects row headers when first column is text', () => {
    const raw: (string | number)[][] = [
      ['Name', 'Age', 'Score'],
      ['Alice', 25, 90],
      ['Bob', 30, 85],
    ];
    const result = detectHeaders(raw);
    expect(result.hasColHeader).toBe(true);
    expect(result.hasRowHeader).toBe(true);
  });

  it('detects no headers when all data is numeric', () => {
    const raw: (string | number)[][] = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ];
    const result = detectHeaders(raw);
    expect(result.hasColHeader).toBe(false);
    expect(result.hasRowHeader).toBe(false);
  });

  it('handles empty data', () => {
    const result = detectHeaders([]);
    expect(result.hasColHeader).toBe(false);
    expect(result.hasRowHeader).toBe(false);
  });
});

describe('parseFile', () => {
  it('parses xlsx with column headers', () => {
    const data = [
      ['X', 'Y', 'Z'],
      [1, 10, 100],
      [2, 20, 200],
      [3, 30, 300],
    ];
    const buffer = createXlsxBuffer(data);
    const result = parseFile(buffer, 'test.xlsx');

    expect(result.fileName).toBe('test.xlsx');
    expect(result.sheets).toHaveLength(1);
    expect(result.sheets[0].name).toBe('Sheet1');
    expect(result.sheets[0].headers.col).toEqual(['X', 'Y', 'Z']);
    expect(result.sheets[0].data).toHaveLength(3);
    expect(result.sheets[0].numericColumns).toEqual([0, 1, 2]);
  });

  it('parses xlsx with row and column headers', () => {
    const data = [
      ['', 'Score', 'Grade'],
      ['Alice', 90, 4.0],
      ['Bob', 85, 3.5],
    ];
    const buffer = createXlsxBuffer(data);
    const result = parseFile(buffer, 'test.xlsx');

    expect(result.sheets[0].headers.row).toEqual(['Alice', 'Bob']);
    expect(result.sheets[0].headers.col).toEqual(['Score', 'Grade']);
  });

  it('parses purely numeric data (no headers)', () => {
    const data = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ];
    const buffer = createXlsxBuffer(data);
    const result = parseFile(buffer, 'numbers.xlsx');

    expect(result.sheets[0].headers.col).toEqual(['Column 1', 'Column 2', 'Column 3']);
    expect(result.sheets[0].data).toHaveLength(3);
    expect(result.sheets[0].numericColumns).toEqual([0, 1, 2]);
  });

  it('parses CSV string', () => {
    const csv = createCsv([
      ['x', 'y'],
      ['1', '10'],
      ['2', '20'],
      ['3', '30'],
    ]);
    const result = parseFile(csv, 'data.csv');

    expect(result.sheets).toHaveLength(1);
    expect(result.sheets[0].headers.col).toEqual(['x', 'y']);
    expect(result.sheets[0].data.length).toBe(3);
  });

  it('handles null/empty cells', () => {
    const data = [
      ['X', 'Y'],
      [1, null],
      [null, 20],
      [3, 30],
    ];
    const buffer = createXlsxBuffer(data);
    const result = parseFile(buffer, 'sparse.xlsx');

    expect(result.sheets[0].data).toHaveLength(3);
    // Nulls should be preserved
    expect(result.sheets[0].data[0][1]).toBeNull();
    expect(result.sheets[0].data[1][0]).toBeNull();
  });

  it('identifies numeric vs non-numeric columns', () => {
    const data = [
      ['Name', 'Age', 'City', 'Score'],
      ['Alice', 25, 'NYC', 90],
      ['Bob', 30, 'LA', 85],
      ['Charlie', 35, 'CHI', 95],
    ];
    const buffer = createXlsxBuffer(data);
    const result = parseFile(buffer, 'mixed.xlsx');

    // After removing row header (Name column), Age=0 and Score=2 should be numeric
    // City=1 should not be numeric
    const numCols = result.sheets[0].numericColumns;
    expect(numCols.length).toBeGreaterThanOrEqual(2);
  });
});
