import { describe, it, expect } from 'vitest';
import { computeNotes } from '../../src/core/audio/engine';
import type { DataSource } from '../../src/types';

function makeSource(overrides: Partial<DataSource> = {}): DataSource {
  return {
    id: 'test-source',
    name: 'Test',
    fileName: 'test.xlsx',
    columns: [
      { index: 0, name: 'X', type: 'numeric', stats: { min: 1, max: 5, mean: 3, stdDev: 1.4, median: 3, q1: 2, q3: 4 } },
      { index: 1, name: 'Y', type: 'numeric', stats: { min: 10, max: 50, mean: 30, stdDev: 14, median: 30, q1: 20, q3: 40 } },
    ],
    rows: [
      [1, 10],
      [2, 20],
      [3, 30],
      [4, 40],
      [5, 50],
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
      panRange: [-1, 1],
      waveform: 'sine',
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 },
    },
    ...overrides,
  };
}

describe('computeNotes', () => {
  it('generates correct number of notes', () => {
    const source = makeSource();
    const notes = computeNotes(source, 5);
    expect(notes).toHaveLength(5);
  });

  it('spaces notes evenly across duration', () => {
    const source = makeSource();
    const notes = computeNotes(source, 10);

    expect(notes[0].time).toBeCloseTo(0);
    expect(notes[1].time).toBeCloseTo(2);
    expect(notes[4].time).toBeCloseTo(8);
  });

  it('maps frequency using log scale by default', () => {
    const source = makeSource();
    const notes = computeNotes(source, 5);

    // First point (Y=10, normalized=0) should get min frequency
    expect(notes[0].frequency).toBeCloseTo(200);
    // Last point (Y=50, normalized=1) should get max frequency
    expect(notes[4].frequency).toBeCloseTo(2000);
    // Middle should be geometric mean for log scale
    expect(notes[2].frequency).toBeCloseTo(Math.sqrt(200 * 2000), -1);
  });

  it('maps frequency using linear scale', () => {
    const source = makeSource({
      audioMapping: {
        ...makeSource().audioMapping,
        frequencyScale: 'linear',
      },
    });
    const notes = computeNotes(source, 5);

    expect(notes[0].frequency).toBeCloseTo(200);
    expect(notes[2].frequency).toBeCloseTo(1100); // linear midpoint
    expect(notes[4].frequency).toBeCloseTo(2000);
  });

  it('maps pan across x-axis range', () => {
    const source = makeSource();
    const notes = computeNotes(source, 5);

    // X goes 1,2,3,4,5 → normalized 0,.25,.5,.75,1 → pan -1,-.5,0,.5,1
    expect(notes[0].pan).toBeCloseTo(-1);
    expect(notes[2].pan).toBeCloseTo(0);
    expect(notes[4].pan).toBeCloseTo(1);
  });

  it('maps velocity from volume range', () => {
    const source = makeSource();
    const notes = computeNotes(source, 5);

    // Volume range [0.1, 0.8], Y normalized [0, 0.25, 0.5, 0.75, 1]
    expect(notes[0].velocity).toBeCloseTo(0.1);
    expect(notes[4].velocity).toBeCloseTo(0.8);
  });

  it('handles empty rows', () => {
    const source = makeSource({ rows: [] });
    const notes = computeNotes(source, 5);
    expect(notes).toHaveLength(0);
  });

  it('handles single data point', () => {
    const source = makeSource({
      rows: [[3, 30]],
    });
    const notes = computeNotes(source, 5);
    expect(notes).toHaveLength(1);
    expect(notes[0].time).toBe(0);
  });

  it('clamps velocity to [0, 1]', () => {
    const source = makeSource();
    const notes = computeNotes(source, 5);
    notes.forEach((note) => {
      expect(note.velocity).toBeGreaterThanOrEqual(0);
      expect(note.velocity).toBeLessThanOrEqual(1);
    });
  });

  it('clamps pan to [-1, 1]', () => {
    const source = makeSource();
    const notes = computeNotes(source, 5);
    notes.forEach((note) => {
      expect(note.pan).toBeGreaterThanOrEqual(-1);
      expect(note.pan).toBeLessThanOrEqual(1);
    });
  });

  it('sets note duration to 80% of spacing', () => {
    const source = makeSource();
    const notes = computeNotes(source, 10);
    const spacing = 10 / 5; // 2 seconds
    expect(notes[0].duration).toBeCloseTo(spacing * 0.8);
  });

  it('enforces minimum note duration of 50ms', () => {
    const source = makeSource({
      rows: Array.from({ length: 1000 }, (_, i) => [i, i * 10]),
    });
    const notes = computeNotes(source, 1); // 1ms per note
    notes.forEach((note) => {
      expect(note.duration).toBeGreaterThanOrEqual(0.05);
    });
  });
});
