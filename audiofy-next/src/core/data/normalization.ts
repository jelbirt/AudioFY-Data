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
 * Normalization engine — transforms raw numeric data using various strategies.
 * Each function is pure: takes data in, returns normalized data out.
 */
import type { NormalizationMode, ColumnStats } from '@types';

/**
 * Normalize an array of numbers using the specified mode.
 */
export function normalize(values: number[], mode: NormalizationMode): number[] {
  if (values.length === 0) return [];

  switch (mode) {
    case 'none':
      return [...values];
    case 'min-max':
      return normalizeMinMax(values);
    case 'z-score':
      return normalizeZScore(values);
    case 'robust':
      return normalizeRobust(values);
    case 'log':
      return normalizeLog(values);
    default:
      return [...values];
  }
}

/**
 * Min-max normalization: scales values to [0, 1].
 */
export function normalizeMinMax(values: number[]): number[] {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min;
  if (range === 0) return values.map(() => 0.5);
  return values.map((v) => (v - min) / range);
}

/**
 * Z-score normalization: centers around mean with unit standard deviation.
 * Output is NOT bounded to [0, 1].
 */
export function normalizeZScore(values: number[]): number[] {
  const stats = computeStats(values);
  if (stats.stdDev === 0) return values.map(() => 0);
  return values.map((v) => (v - stats.mean) / stats.stdDev);
}

/**
 * Robust normalization: uses median and IQR, resistant to outliers.
 * Output is roughly centered around 0.5 for the interquartile range.
 */
export function normalizeRobust(values: number[]): number[] {
  const stats = computeStats(values);
  const iqr = stats.q3 - stats.q1;
  if (iqr === 0) return values.map(() => 0.5);
  // Scale so Q1 maps to 0 and Q3 maps to 1, then clamp to [0, 1]
  return values.map((v) => Math.max(0, Math.min(1, (v - stats.q1) / iqr)));
}

/**
 * Log normalization: applies log transform then min-max scales.
 * Handles negative values by shifting to positive range first.
 */
export function normalizeLog(values: number[]): number[] {
  let min = Infinity;
  for (const v of values) {
    if (v < min) min = v;
  }
  // Shift so all values are >= 1 (log(1) = 0)
  const shifted = values.map((v) => v - min + 1);
  const logged = shifted.map((v) => Math.log(v));
  return normalizeMinMax(logged);
}

/**
 * Compute column statistics for a numeric array.
 */
export function computeStats(values: number[]): ColumnStats {
  if (values.length === 0) {
    return { min: 0, max: 0, mean: 0, stdDev: 0, median: 0, q1: 0, q3: 0 };
  }

  // Filter out NaN and Infinity values for robust statistics
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) {
    return { min: 0, max: 0, mean: 0, stdDev: 0, median: 0, q1: 0, q3: 0 };
  }

  const sorted = [...finite].sort((a, b) => a - b);
  const n = sorted.length;

  const min = sorted[0];
  const max = sorted[n - 1];
  const mean = sorted.reduce((sum, v) => sum + v, 0) / n;
  const variance = sorted.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const median = percentile(sorted, 0.5);
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);

  return { min, max, mean, stdDev, median, q1, q3 };
}

/**
 * Compute percentile from a pre-sorted array using linear interpolation.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];

  const index = p * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const fraction = index - lower;

  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
}

/**
 * Map a normalized value [0, 1] to a target range.
 */
export function mapToRange(value: number, min: number, max: number): number {
  return min + value * (max - min);
}

/**
 * Map a normalized value [0, 1] to frequency using logarithmic scale.
 * This produces perceptually uniform pitch intervals.
 */
export function mapToFrequencyLog(normalizedValue: number, minHz: number, maxHz: number): number {
  if (minHz <= 0 || maxHz <= 0) throw new Error('Frequency bounds must be positive');
  if (minHz > maxHz) [minHz, maxHz] = [maxHz, minHz];
  const clamped = Number.isFinite(normalizedValue) ? Math.max(0, Math.min(1, normalizedValue)) : 0;
  return minHz * Math.pow(maxHz / minHz, clamped);
}

/**
 * Map a normalized value [0, 1] to frequency using linear scale.
 */
export function mapToFrequencyLinear(
  normalizedValue: number,
  minHz: number,
  maxHz: number,
): number {
  if (minHz <= 0 || maxHz <= 0) throw new Error('Frequency bounds must be positive');
  if (minHz > maxHz) [minHz, maxHz] = [maxHz, minHz];
  const clamped = Number.isFinite(normalizedValue) ? Math.max(0, Math.min(1, normalizedValue)) : 0;
  return minHz + clamped * (maxHz - minHz);
}

/**
 * Map a normalized value [0, 1] to the nearest MIDI note, then to frequency.
 * Constrains output to a chromatic scale.
 */
export function mapToFrequencyMidi(
  normalizedValue: number,
  minMidi: number,
  maxMidi: number,
): number {
  if (minMidi > maxMidi) [minMidi, maxMidi] = [maxMidi, minMidi];
  const clampedMin = Math.max(0, Math.min(127, minMidi));
  const clampedMax = Math.max(0, Math.min(127, maxMidi));
  const clamped = Number.isFinite(normalizedValue) ? Math.max(0, Math.min(1, normalizedValue)) : 0;
  const midiNote = Math.round(clampedMin + clamped * (clampedMax - clampedMin));
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}
