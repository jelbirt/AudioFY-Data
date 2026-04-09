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
 * Integration tests — Data pipeline end-to-end: parse → build → normalize → frequency map.
 * Also tests createDataSource orchestration with CSV data.
 */
import { describe, it, expect } from 'vitest';
import { createDataSource, buildDataSource } from '../../src/core/data';
import { normalize, computeStats, mapToFrequencyLog, mapToFrequencyLinear, mapToFrequencyMidi, mapToRange } from '../../src/core/data';
import { computeNotes } from '../../src/core/audio/engine';
import type { DataSource, ParsedSheet } from '../../src/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Simple CSV content: 2 numeric columns (x, y) with 5 rows */
const SIMPLE_CSV = 'x,y\n1,10\n2,20\n3,30\n4,40\n5,50';

/** CSV with mixed types */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MIXED_CSV = 'name,score,grade\nAlice,85,A\nBob,92,A\nCharlie,78,B\nDiana,95,A\nEve,88,B';

/** CSV with no header (all numeric) */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ALL_NUMERIC_CSV = '1,2,3\n4,5,6\n7,8,9\n10,11,12';

// ---------------------------------------------------------------------------
// createDataSource end-to-end
// ---------------------------------------------------------------------------

describe('Integration: createDataSource', () => {
  it('parses CSV and creates a complete DataSource', () => {
    const { parsedFile, source } = createDataSource(SIMPLE_CSV, 'test.csv');

    // ParsedFile
    expect(parsedFile.fileName).toBe('test.csv');
    expect(parsedFile.sheets).toHaveLength(1);
    expect(parsedFile.sheets[0].name).toBe('Sheet1');

    // DataSource basics
    expect(source.fileName).toBe('test.csv');
    expect(source.id).toMatch(/^source-\d+-\d+$/);
    expect(source.rows.length).toBe(5);
    expect(source.columns.length).toBeGreaterThanOrEqual(2);

    // Stats were computed
    const yCol = source.columns.find((c) => c.name === 'y');
    expect(yCol).toBeDefined();
    expect(yCol!.stats.min).toBe(10);
    expect(yCol!.stats.max).toBe(50);
    expect(yCol!.stats.mean).toBe(30);

    // Audio mapping defaults
    expect(source.audioMapping.waveform).toBe('sine');
    expect(source.audioMapping.frequencyRange).toEqual([200, 2000]);
    expect(source.normalization).toBe('min-max');
  });

  it('creates DataSource with custom options', () => {
    const { source } = createDataSource(SIMPLE_CSV, 'test.csv', {
      color: '#ff0000',
      normalization: 'z-score',
    });

    expect(source.color).toBe('#ff0000');
    expect(source.normalization).toBe('z-score');
  });

  it('throws on empty file', () => {
    expect(() => createDataSource('', 'empty.csv')).toThrow();
  });

  it('throws on insufficient numeric columns', () => {
    // buildDataSource requires 2 numeric columns; all-text CSV won't have any
    expect(() => createDataSource('name,value\nAlice,test\nBob,hello', 'bad.csv')).toThrow();
  });

  it('handles out-of-range sheet index', () => {
    expect(() =>
      createDataSource(SIMPLE_CSV, 'test.csv', { sheetIndex: 5 }),
    ).toThrow(/Sheet index 5 out of range/);
  });
});

// ---------------------------------------------------------------------------
// Data pipeline → audio note computation
// ---------------------------------------------------------------------------

describe('Integration: Data pipeline → computeNotes', () => {
  it('produces correct number of notes for a data source', () => {
    const { source } = createDataSource(SIMPLE_CSV, 'test.csv');
    const notes = computeNotes(source, 10);

    expect(notes).toHaveLength(5);
    notes.forEach((note) => {
      expect(note.sourceId).toBe(source.id);
      expect(note.frequency).toBeGreaterThan(0);
      expect(note.velocity).toBeGreaterThanOrEqual(0);
      expect(note.velocity).toBeLessThanOrEqual(1);
      expect(note.pan).toBeGreaterThanOrEqual(-1);
      expect(note.pan).toBeLessThanOrEqual(1);
      expect(note.time).toBeGreaterThanOrEqual(0);
      expect(note.duration).toBeGreaterThan(0);
    });
  });

  it('notes are evenly spaced across duration', () => {
    const { source } = createDataSource(SIMPLE_CSV, 'test.csv');
    const duration = 10;
    const notes = computeNotes(source, duration);

    const spacing = duration / 5;
    notes.forEach((note, i) => {
      expect(note.time).toBeCloseTo(i * spacing, 5);
    });
  });

  it('frequency increases with Y values for min-max normalized data', () => {
    const { source } = createDataSource(SIMPLE_CSV, 'test.csv', {
      normalization: 'min-max',
    });
    const notes = computeNotes(source, 10);

    // Y values are 10,20,30,40,50 — monotonically increasing
    // With min-max normalization and log frequency mapping, frequencies should increase
    for (let i = 1; i < notes.length; i++) {
      expect(notes[i].frequency).toBeGreaterThan(notes[i - 1].frequency);
    }
  });

  it('returns empty for source with no rows', () => {
    const { source } = createDataSource(SIMPLE_CSV, 'test.csv');
    const emptySource: DataSource = { ...source, rows: [] };
    const notes = computeNotes(emptySource, 10);
    expect(notes).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Normalization → frequency mapping pipeline
// ---------------------------------------------------------------------------

describe('Integration: normalize → frequency mapping', () => {
  const values = [10, 20, 30, 40, 50];

  it('min-max → log frequency produces increasing frequencies', () => {
    const normalized = normalize(values, 'min-max');
    const frequencies = normalized.map((v) => mapToFrequencyLog(v, 200, 2000));

    expect(frequencies[0]).toBeCloseTo(200, 0);
    expect(frequencies[4]).toBeCloseTo(2000, 0);

    for (let i = 1; i < frequencies.length; i++) {
      expect(frequencies[i]).toBeGreaterThan(frequencies[i - 1]);
    }
  });

  it('min-max → linear frequency produces increasing frequencies', () => {
    const normalized = normalize(values, 'min-max');
    const frequencies = normalized.map((v) => mapToFrequencyLinear(v, 200, 2000));

    expect(frequencies[0]).toBeCloseTo(200, 0);
    expect(frequencies[4]).toBeCloseTo(2000, 0);
  });

  it('min-max → MIDI frequency snaps to chromatic scale', () => {
    const normalized = normalize(values, 'min-max');
    const frequencies = normalized.map((v) => mapToFrequencyMidi(v, 48, 84));

    // Frequencies should be increasing since input values are increasing
    for (let i = 1; i < frequencies.length; i++) {
      expect(frequencies[i]).toBeGreaterThanOrEqual(frequencies[i - 1]);
    }

    // Each frequency should correspond to a MIDI note (A=440Hz * 2^((note-69)/12))
    // MIDI 48 = ~130.81Hz, MIDI 84 = ~523.25Hz
    expect(frequencies[0]).toBeCloseTo(130.81, 0);
  });

  it('z-score normalization with stats validates', () => {
    const stats = computeStats(values);
    expect(stats.mean).toBe(30);
    expect(stats.min).toBe(10);
    expect(stats.max).toBe(50);

    const normalized = normalize(values, 'z-score');
    // z-score: mean should map to ~0
    const middleIndex = 2; // value=30=mean
    expect(normalized[middleIndex]).toBeCloseTo(0, 5);
  });

  it('robust normalization is resilient to outliers', () => {
    const withOutliers = [10, 20, 30, 40, 50, 1000];
    const robust = normalize(withOutliers, 'robust');
    const minmax = normalize(withOutliers, 'min-max');

    // Robust normalization should not compress the bulk of data into a tiny range
    // like min-max does when there's a huge outlier
    const robustRange = Math.max(...robust.slice(0, 5)) - Math.min(...robust.slice(0, 5));
    const minmaxRange = Math.max(...minmax.slice(0, 5)) - Math.min(...minmax.slice(0, 5));
    expect(robustRange).toBeGreaterThan(minmaxRange);
  });

  it('mapToRange maps correctly', () => {
    expect(mapToRange(0, 100, 200)).toBe(100);
    expect(mapToRange(1, 100, 200)).toBe(200);
    expect(mapToRange(0.5, 100, 200)).toBe(150);
  });
});

// ---------------------------------------------------------------------------
// buildDataSource with custom sheet
// ---------------------------------------------------------------------------

describe('Integration: buildDataSource', () => {
  const mockSheet: ParsedSheet = {
    name: 'TestSheet',
    headers: { row: [], col: ['A', 'B', 'C'] },
    data: [
      [1, 10, 100],
      [2, 20, 200],
      [3, 30, 300],
      [4, 40, 400],
    ],
    numericColumns: [0, 1, 2],
  };

  it('builds DataSource from a parsed sheet', () => {
    const source = buildDataSource(mockSheet, 'test.xlsx');

    expect(source.name).toBe('TestSheet');
    expect(source.fileName).toBe('test.xlsx');
    expect(source.columns).toHaveLength(3);
    expect(source.rows).toHaveLength(4);
    expect(source.audioMapping.xColumn).toBe(0);
    expect(source.audioMapping.yColumn).toBe(1);
  });

  it('respects custom xColumn and yColumn', () => {
    const source = buildDataSource(mockSheet, 'test.xlsx', {
      xColumn: 1,
      yColumn: 2,
    });

    expect(source.audioMapping.xColumn).toBe(1);
    expect(source.audioMapping.yColumn).toBe(2);
  });

  it('throws if fewer than 2 numeric columns', () => {
    const singleCol: ParsedSheet = {
      name: 'Bad',
      headers: { row: [], col: ['A'] },
      data: [[1], [2], [3]],
      numericColumns: [0],
    };

    expect(() => buildDataSource(singleCol, 'bad.xlsx')).toThrow(
      /needs at least 2 numeric columns/,
    );
  });

  it('assigns colors from the default palette', () => {
    const source1 = buildDataSource(mockSheet, 'a.xlsx');
    const source2 = buildDataSource(mockSheet, 'b.xlsx');
    // Each call increments the counter, so colors should be from the palette
    expect(source1.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(source2.color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
