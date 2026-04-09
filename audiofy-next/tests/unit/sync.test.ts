/**
 * Tests for synchronization controller pure utility functions.
 */
import { describe, it, expect } from 'vitest';
import {
  findActivePoints,
  computeProgress,
  sortNotesByTime,
} from '../../src/core/sync';
import type { ScheduledNote } from '../../src/core/audio/engine';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeNotes(): ScheduledNote[] {
  return [
    { sourceId: 'a', pointIndex: 0, frequency: 440, velocity: 0.5, pan: 0, time: 0, duration: 0.5 },
    { sourceId: 'a', pointIndex: 1, frequency: 550, velocity: 0.6, pan: 0, time: 0.5, duration: 0.5 },
    { sourceId: 'b', pointIndex: 0, frequency: 330, velocity: 0.4, pan: -0.5, time: 0.2, duration: 0.6 },
    { sourceId: 'a', pointIndex: 2, frequency: 660, velocity: 0.7, pan: 0.3, time: 1.0, duration: 0.5 },
    { sourceId: 'b', pointIndex: 1, frequency: 440, velocity: 0.5, pan: 0.5, time: 0.8, duration: 0.4 },
  ];
}

// ---------------------------------------------------------------------------
// sortNotesByTime
// ---------------------------------------------------------------------------

describe('sortNotesByTime', () => {
  it('sorts notes in ascending time order', () => {
    const notes = makeNotes();
    const sorted = sortNotesByTime(notes);

    expect(sorted.map((n) => n.time)).toEqual([0, 0.2, 0.5, 0.8, 1.0]);
  });

  it('does not mutate the original array', () => {
    const notes = makeNotes();
    const originalTimes = notes.map((n) => n.time);
    sortNotesByTime(notes);
    expect(notes.map((n) => n.time)).toEqual(originalTimes);
  });

  it('handles empty array', () => {
    expect(sortNotesByTime([])).toEqual([]);
  });

  it('handles single note', () => {
    const notes = [makeNotes()[0]];
    expect(sortNotesByTime(notes)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// findActivePoints
// ---------------------------------------------------------------------------

describe('findActivePoints', () => {
  const sorted = sortNotesByTime(makeNotes());
  // sorted times: [0, 0.2, 0.5, 0.8, 1.0]
  // sorted durations: [0.5, 0.6, 0.5, 0.4, 0.5]
  // Active ranges:
  //   a:0  [0, 0.5)
  //   b:0  [0.2, 0.8)
  //   a:1  [0.5, 1.0)
  //   b:1  [0.8, 1.2)
  //   a:2  [1.0, 1.5)

  it('returns empty at negative time', () => {
    expect(findActivePoints(sorted, -1)).toEqual([]);
  });

  it('finds the first note at time 0', () => {
    const active = findActivePoints(sorted, 0);
    expect(active).toEqual([{ sourceId: 'a', pointIndex: 0 }]);
  });

  it('finds overlapping notes at time 0.3', () => {
    const active = findActivePoints(sorted, 0.3);
    expect(active).toHaveLength(2);
    expect(active).toContainEqual({ sourceId: 'a', pointIndex: 0 });
    expect(active).toContainEqual({ sourceId: 'b', pointIndex: 0 });
  });

  it('handles boundary: note ends at exactly its time + duration', () => {
    // a:0 ends at 0.5 (exclusive), a:1 starts at 0.5 (inclusive)
    const active = findActivePoints(sorted, 0.5);
    expect(active).toContainEqual({ sourceId: 'b', pointIndex: 0 });
    expect(active).toContainEqual({ sourceId: 'a', pointIndex: 1 });
    expect(active).not.toContainEqual({ sourceId: 'a', pointIndex: 0 });
  });

  it('finds three overlapping notes at time 0.85', () => {
    // At 0.85: b:0 [0.2,0.8) ended, a:1 [0.5,1.0) active, b:1 [0.8,1.2) active
    const active = findActivePoints(sorted, 0.85);
    expect(active).toContainEqual({ sourceId: 'a', pointIndex: 1 });
    expect(active).toContainEqual({ sourceId: 'b', pointIndex: 1 });
    expect(active).not.toContainEqual({ sourceId: 'b', pointIndex: 0 });
  });

  it('returns empty after all notes have ended', () => {
    expect(findActivePoints(sorted, 2.0)).toEqual([]);
  });

  it('handles empty notes array', () => {
    expect(findActivePoints([], 0.5)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// computeProgress
// ---------------------------------------------------------------------------

describe('computeProgress', () => {
  it('returns 0 at time 0', () => {
    expect(computeProgress(0, 10)).toBe(0);
  });

  it('returns 0.5 at midpoint', () => {
    expect(computeProgress(5, 10)).toBe(0.5);
  });

  it('returns 1 at end', () => {
    expect(computeProgress(10, 10)).toBe(1);
  });

  it('clamps to 0 for negative time', () => {
    expect(computeProgress(-5, 10)).toBe(0);
  });

  it('clamps to 1 for time beyond duration', () => {
    expect(computeProgress(15, 10)).toBe(1);
  });

  it('returns 0 for zero duration', () => {
    expect(computeProgress(5, 0)).toBe(0);
  });

  it('returns 0 for negative duration', () => {
    expect(computeProgress(5, -10)).toBe(0);
  });

  it('handles fractional values correctly', () => {
    expect(computeProgress(3.33, 10)).toBeCloseTo(0.333, 3);
  });
});
