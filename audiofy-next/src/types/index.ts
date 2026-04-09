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

export interface ParsedSheet {
  name: string;
  headers: { row: string[]; col: string[] };
  data: (string | number | null)[][];
  numericColumns: number[];
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
