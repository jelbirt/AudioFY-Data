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

// ============================================================
// AudioFY Core Type Definitions
// ============================================================

// --- Data Pipeline Types ---

export type NormalizationMode = 'none' | 'min-max' | 'z-score' | 'robust' | 'log';

export type ColumnType = 'numeric' | 'categorical' | 'temporal';

export interface ColumnStats {
  min: number;
  max: number;
  mean: number;
  stdDev: number;
  median: number;
  q1: number;
  q3: number;
}

export interface ColumnDef {
  index: number;
  name: string;
  type: ColumnType;
  stats: ColumnStats;
}

export interface DataSource {
  id: string;
  name: string;
  fileName: string;
  sheetName?: string;
  columns: ColumnDef[];
  rows: number[][];
  headers: { row: string[]; col: string[] };
  color: string;
  normalization: NormalizationMode;
  audioMapping: AudioMapping;
}

/**
 * Per-column data-quality metrics computed during parsing.
 * Surface in UI code (e.g. ImportPreviewModal) to warn users about sparse
 * columns that pass the numeric threshold on populated cells but have many
 * blanks — those blanks become NaN downstream and are skipped during
 * playback/rendering.
 */
export interface ColumnQuality {
  /** Column index within the sheet's `data` array. */
  index: number;
  /** Count of non-null cells in this column. */
  nonNullCount: number;
  /** Count of cells that parsed as numbers. */
  numericCount: number;
  /** Total number of rows in the sheet (denominator for populatedRatio). */
  totalRowCount: number;
  /** numericCount / nonNullCount — fraction of populated cells that are numeric. */
  numericRatio: number;
  /** nonNullCount / totalRowCount — fraction of rows that actually have data. */
  populatedRatio: number;
  /** Whether this column passes the "numeric" test (used to build numericColumns). */
  isNumeric: boolean;
}

export interface ParsedSheet {
  name: string;
  headers: { row: string[]; col: string[] };
  data: (string | number | null)[][];
  numericColumns: number[];
  /**
   * Per-column quality metrics. Optional for backward compatibility with
   * fixtures created before the field was introduced; parsers produced by
   * the current `parser.ts` always populate this.
   */
  columnQuality?: ColumnQuality[];
}

export interface ParsedFile {
  fileName: string;
  sheets: ParsedSheet[];
}

// --- Audio Types ---

export type OscillatorType =
  | 'sine'
  | 'square'
  | 'sawtooth'
  | 'triangle'
  | 'fmsine'
  | 'fmsquare'
  | 'fmsawtooth'
  | 'fmtriangle'
  | 'amsine'
  | 'amsquare'
  | 'amsawtooth'
  | 'amtriangle';

export type FrequencyScale = 'log' | 'linear' | 'midi';

export interface ADSR {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface AudioMapping {
  xColumn: number;
  yColumn: number;
  frequencyRange: [number, number];
  frequencyScale: FrequencyScale;
  volumeRange: [number, number];
  panRange: [number, number];
  waveform: OscillatorType;
  envelope: ADSR;
  sourceVolume: number;
}

export interface EffectsConfig {
  reverb: { enabled: boolean; decay: number; wet: number };
  filter: { enabled: boolean; frequency: number; type: BiquadFilterType };
  chorus: { enabled: boolean; frequency: number; delayTime: number; depth: number };
}

// --- Playback Types ---

export type PlaybackState = 'stopped' | 'playing' | 'paused';

export interface PlaybackConfig {
  speed: number;
  loop: boolean;
  duration: number;
}

// --- Sync Types ---

export interface SyncEvent {
  sourceId: string;
  pointIndex: number;
  time: number;
  type: 'note-start' | 'note-end';
}

export interface ActivePoint {
  sourceId: string;
  pointIndex: number;
}

// --- Config/Persistence Types ---

export interface VisualizationConfig {
  theme: 'light' | 'dark';
  showGrid: boolean;
  showLegend: boolean;
  pointSize: number;
}

export interface AudioConfig {
  masterVolume: number;
  effects: EffectsConfig;
}

export interface SourceConfig {
  filePath: string;
  sheetName?: string;
  xColumn: number;
  yColumn: number;
  color: string;
  normalization: NormalizationMode;
  audioMapping: AudioMapping;
}

export interface AudioFYConfig {
  version: 2;
  sources: SourceConfig[];
  playback: PlaybackConfig;
  visualization: VisualizationConfig;
  audio: AudioConfig;
}

// --- UI Types ---

export interface PanelLayout {
  chartWidth: number;
  tableHeight: number;
  sidebarWidth: number;
}
