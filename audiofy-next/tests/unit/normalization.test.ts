import { describe, it, expect } from 'vitest';
import {
  normalizeMinMax,
  normalizeZScore,
  normalizeRobust,
  normalizeLog,
  normalize,
  computeStats,
  mapToFrequencyLog,
  mapToFrequencyLinear,
  mapToFrequencyMidi,
  mapToRange,
} from '../../src/core/data/normalization';

describe('normalizeMinMax', () => {
  it('scales values to [0, 1]', () => {
    const result = normalizeMinMax([10, 20, 30, 40, 50]);
    expect(result).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it('handles single value', () => {
    const result = normalizeMinMax([5]);
    expect(result).toEqual([0.5]);
  });

  it('handles identical values', () => {
    const result = normalizeMinMax([3, 3, 3]);
    expect(result).toEqual([0.5, 0.5, 0.5]);
  });

  it('handles negative values', () => {
    const result = normalizeMinMax([-10, 0, 10]);
    expect(result).toEqual([0, 0.5, 1]);
  });

  it('returns empty array for empty input', () => {
    expect(normalizeMinMax([])).toEqual([]);
  });
});

describe('normalizeZScore', () => {
  it('centers data around 0', () => {
    const result = normalizeZScore([10, 20, 30]);
    const mean = result.reduce((s, v) => s + v, 0) / result.length;
    expect(mean).toBeCloseTo(0, 10);
  });

  it('produces unit standard deviation', () => {
    const result = normalizeZScore([10, 20, 30, 40, 50]);
    const mean = result.reduce((s, v) => s + v, 0) / result.length;
    const variance = result.reduce((s, v) => s + (v - mean) ** 2, 0) / result.length;
    expect(Math.sqrt(variance)).toBeCloseTo(1, 5);
  });

  it('handles identical values', () => {
    const result = normalizeZScore([5, 5, 5]);
    expect(result).toEqual([0, 0, 0]);
  });
});

describe('normalizeRobust', () => {
  it('centers IQR data around 0-1 range', () => {
    const result = normalizeRobust([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    // Q1 and Q3 should map to 0 and 1 respectively
    expect(result.length).toBe(10);
  });

  it('handles identical values', () => {
    const result = normalizeRobust([5, 5, 5]);
    expect(result).toEqual([0.5, 0.5, 0.5]);
  });

  it('is resistant to outliers', () => {
    const normal = normalizeRobust([1, 2, 3, 4, 5]);
    const withOutlier = normalizeRobust([1, 2, 3, 4, 1000]);
    // The first few values should be similar despite the outlier
    expect(Math.abs(normal[0] - withOutlier[0])).toBeLessThan(Math.abs(normal[0]));
  });
});

describe('normalizeLog', () => {
  it('produces values in [0, 1]', () => {
    const result = normalizeLog([1, 10, 100, 1000]);
    expect(result[0]).toBeCloseTo(0);
    expect(result[result.length - 1]).toBeCloseTo(1);
    result.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(-0.001);
      expect(v).toBeLessThanOrEqual(1.001);
    });
  });

  it('handles negative values', () => {
    const result = normalizeLog([-5, 0, 5, 10]);
    expect(result[0]).toBeCloseTo(0);
    expect(result[result.length - 1]).toBeCloseTo(1);
  });

  it('compresses large ranges', () => {
    const result = normalizeLog([1, 10, 100, 1000]);
    // Log should make spacing more even than min-max
    const diffs = [];
    for (let i = 1; i < result.length; i++) {
      diffs.push(result[i] - result[i - 1]);
    }
    // Differences should decrease (log compression)
    expect(diffs[0]).toBeGreaterThan(diffs[diffs.length - 1]);
  });
});

describe('normalize (dispatcher)', () => {
  it('dispatches to correct mode', () => {
    const values = [10, 20, 30];
    expect(normalize(values, 'none')).toEqual([10, 20, 30]);
    expect(normalize(values, 'min-max')).toEqual(normalizeMinMax(values));
    expect(normalize(values, 'z-score')).toEqual(normalizeZScore(values));
    expect(normalize(values, 'robust')).toEqual(normalizeRobust(values));
    expect(normalize(values, 'log')).toEqual(normalizeLog(values));
  });

  it('returns empty for empty input', () => {
    expect(normalize([], 'min-max')).toEqual([]);
  });
});

describe('computeStats', () => {
  it('computes correct statistics', () => {
    const stats = computeStats([1, 2, 3, 4, 5]);
    expect(stats.min).toBe(1);
    expect(stats.max).toBe(5);
    expect(stats.mean).toBe(3);
    expect(stats.median).toBe(3);
    expect(stats.stdDev).toBeCloseTo(Math.sqrt(2), 5);
  });

  it('computes quartiles', () => {
    const stats = computeStats([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(stats.q1).toBeCloseTo(2.75, 1);
    expect(stats.q3).toBeCloseTo(6.25, 1);
  });

  it('handles empty array', () => {
    const stats = computeStats([]);
    expect(stats.min).toBe(0);
    expect(stats.max).toBe(0);
    expect(stats.mean).toBe(0);
  });

  it('handles single value', () => {
    const stats = computeStats([42]);
    expect(stats.min).toBe(42);
    expect(stats.max).toBe(42);
    expect(stats.mean).toBe(42);
    expect(stats.median).toBe(42);
    expect(stats.stdDev).toBe(0);
  });
});

describe('frequency mapping', () => {
  it('mapToFrequencyLog produces perceptually uniform mapping', () => {
    const low = mapToFrequencyLog(0, 200, 2000);
    const mid = mapToFrequencyLog(0.5, 200, 2000);
    const high = mapToFrequencyLog(1, 200, 2000);

    expect(low).toBeCloseTo(200);
    expect(high).toBeCloseTo(2000);
    // Midpoint should be geometric mean, not arithmetic
    expect(mid).toBeCloseTo(Math.sqrt(200 * 2000), 0);
  });

  it('mapToFrequencyLinear produces linear mapping', () => {
    expect(mapToFrequencyLinear(0, 200, 2000)).toBeCloseTo(200);
    expect(mapToFrequencyLinear(0.5, 200, 2000)).toBeCloseTo(1100);
    expect(mapToFrequencyLinear(1, 200, 2000)).toBeCloseTo(2000);
  });

  it('mapToFrequencyMidi snaps to chromatic notes', () => {
    // MIDI 69 = A4 = 440Hz
    const freq = mapToFrequencyMidi(0.5, 48, 84);
    // Should be a valid chromatic frequency
    expect(freq).toBeGreaterThan(100);
    expect(freq).toBeLessThan(1500);
  });
});

describe('mapToRange', () => {
  it('maps [0,1] to target range', () => {
    expect(mapToRange(0, 100, 200)).toBe(100);
    expect(mapToRange(0.5, 100, 200)).toBe(150);
    expect(mapToRange(1, 100, 200)).toBe(200);
  });
});
