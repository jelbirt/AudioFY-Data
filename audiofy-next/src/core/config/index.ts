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
 * Configuration & Persistence — JSON config with Zod schema validation,
 * save/load support, defaults, and migration capability.
 *
 * Uses Zod for runtime validation so corrupted or outdated config files
 * produce clear errors rather than silent failures.
 */
import { z } from 'zod';
import type {
  AudioFYConfig,
  SourceConfig,
  PlaybackConfig,
  VisualizationConfig,
  AudioConfig,
  EffectsConfig,
  AudioMapping,
  ADSR,
  NormalizationMode,
  OscillatorType,
  FrequencyScale,
} from '@types';

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const adsrSchema = z.object({
  attack: z.number().min(0).max(10),
  decay: z.number().min(0).max(10),
  sustain: z.number().min(0).max(1),
  release: z.number().min(0).max(30),
}) satisfies z.ZodType<ADSR>;

const oscillatorTypeSchema = z.enum([
  'sine', 'square', 'sawtooth', 'triangle',
  'fmsine', 'fmsquare', 'fmsawtooth', 'fmtriangle',
  'amsine', 'amsquare', 'amsawtooth', 'amtriangle',
]) satisfies z.ZodType<OscillatorType>;

const frequencyScaleSchema = z.enum(['log', 'linear', 'midi']) satisfies z.ZodType<FrequencyScale>;

const normalizationModeSchema = z.enum([
  'none', 'min-max', 'z-score', 'robust', 'log',
]) satisfies z.ZodType<NormalizationMode>;

const audioMappingSchema = z.object({
  xColumn: z.number().int().min(0),
  yColumn: z.number().int().min(0),
  frequencyRange: z.tuple([z.number().min(20).max(20000), z.number().min(20).max(20000)]),
  frequencyScale: frequencyScaleSchema,
  volumeRange: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]),
  panRange: z.tuple([z.number().min(-1).max(1), z.number().min(-1).max(1)]),
  waveform: oscillatorTypeSchema,
  envelope: adsrSchema,
}) satisfies z.ZodType<AudioMapping>;

const sourceConfigSchema = z.object({
  filePath: z.string().min(1),
  sheetName: z.string().optional(),
  xColumn: z.number().int().min(0),
  yColumn: z.number().int().min(0),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  normalization: normalizationModeSchema,
  audioMapping: audioMappingSchema,
}) satisfies z.ZodType<SourceConfig>;

const playbackConfigSchema = z.object({
  speed: z.number().min(0.25).max(4),
  loop: z.boolean(),
  duration: z.number().min(1).max(600),
}) satisfies z.ZodType<PlaybackConfig>;

const biquadFilterTypeSchema = z.enum([
  'lowpass', 'highpass', 'bandpass', 'lowshelf',
  'highshelf', 'peaking', 'notch', 'allpass',
]) as z.ZodType<BiquadFilterType>;

const effectsConfigSchema = z.object({
  reverb: z.object({ enabled: z.boolean(), decay: z.number().min(0.1).max(30), wet: z.number().min(0).max(1) }),
  filter: z.object({ enabled: z.boolean(), frequency: z.number().min(20).max(20000), type: biquadFilterTypeSchema }),
  chorus: z.object({ enabled: z.boolean(), frequency: z.number().min(0.1).max(100), delayTime: z.number().min(0).max(100), depth: z.number().min(0).max(1) }),
}) satisfies z.ZodType<EffectsConfig>;

const visualizationConfigSchema = z.object({
  theme: z.enum(['light', 'dark']),
  showGrid: z.boolean(),
  showLegend: z.boolean(),
  pointSize: z.number().min(1).max(30),
}) satisfies z.ZodType<VisualizationConfig>;

const audioConfigSchema = z.object({
  masterVolume: z.number().min(0).max(1),
  effects: effectsConfigSchema,
}) satisfies z.ZodType<AudioConfig>;

export const audiofyConfigSchema = z.object({
  version: z.literal(2),
  sources: z.array(sourceConfigSchema),
  playback: playbackConfigSchema,
  visualization: visualizationConfigSchema,
  audio: audioConfigSchema,
}) satisfies z.ZodType<AudioFYConfig>;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_ADSR: ADSR = {
  attack: 0.02,
  decay: 0.1,
  sustain: 0.3,
  release: 0.5,
};

export const DEFAULT_EFFECTS: EffectsConfig = {
  reverb: { enabled: false, decay: 2, wet: 0.3 },
  filter: { enabled: false, frequency: 20000, type: 'lowpass' },
  chorus: { enabled: false, frequency: 4, delayTime: 2.5, depth: 0.5 },
};

export const DEFAULT_PLAYBACK: PlaybackConfig = {
  speed: 1,
  loop: false,
  duration: 10,
};

export const DEFAULT_VISUALIZATION: VisualizationConfig = {
  theme: 'light',
  showGrid: true,
  showLegend: true,
  pointSize: 6,
};

export const DEFAULT_AUDIO: AudioConfig = {
  masterVolume: 0.8,
  effects: DEFAULT_EFFECTS,
};

export function createDefaultConfig(): AudioFYConfig {
  return {
    version: 2,
    sources: [],
    playback: { ...DEFAULT_PLAYBACK },
    visualization: { ...DEFAULT_VISUALIZATION },
    audio: { ...DEFAULT_AUDIO },
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationResult {
  success: boolean;
  config: AudioFYConfig | null;
  errors: string[];
}

/**
 * Validate and parse a JSON string or object as an AudioFYConfig.
 */
export function validateConfig(input: unknown): ValidationResult {
  // If string, try to parse as JSON first
  let data = input;
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input);
    } catch {
      return { success: false, config: null, errors: ['Invalid JSON'] };
    }
  }

  const result = audiofyConfigSchema.safeParse(data);

  if (result.success) {
    return { success: true, config: result.data, errors: [] };
  }

  const errors = result.error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`,
  );

  return { success: false, config: null, errors };
}

/**
 * Serialize config to a formatted JSON string.
 */
export function serializeConfig(config: AudioFYConfig): string {
  return JSON.stringify(config, null, 2);
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

/**
 * Attempt to migrate an older config version to the current schema.
 * Currently only version 2 exists; this is scaffolding for future migrations.
 */
export function migrateConfig(data: unknown): AudioFYConfig {
  if (typeof data !== 'object' || data === null) {
    return createDefaultConfig();
  }

  const obj = data as Record<string, unknown>;

  // Version 1 → 2 migration (placeholder for future use)
  if (obj.version === 1 || !obj.version) {
    // Apply defaults for any missing fields
    return {
      version: 2,
      sources: Array.isArray(obj.sources) ? (obj.sources as SourceConfig[]) : [],
      playback: {
        ...DEFAULT_PLAYBACK,
        ...(typeof obj.playback === 'object' ? obj.playback : {}),
      } as PlaybackConfig,
      visualization: {
        ...DEFAULT_VISUALIZATION,
        ...(typeof obj.visualization === 'object' ? obj.visualization : {}),
      } as VisualizationConfig,
      audio: {
        ...DEFAULT_AUDIO,
        ...(typeof obj.audio === 'object' ? obj.audio : {}),
      } as AudioConfig,
    };
  }

  // Already version 2 — validate and return
  const result = validateConfig(data);
  if (result.success && result.config) {
    return result.config;
  }

  return createDefaultConfig();
}

// ---------------------------------------------------------------------------
// Recent Files
// ---------------------------------------------------------------------------

const MAX_RECENT_FILES = 10;

export interface RecentFile {
  path: string;
  name: string;
  timestamp: number;
}

const recentFilesSchema = z.array(
  z.object({
    path: z.string(),
    name: z.string(),
    timestamp: z.number(),
  }),
);

/**
 * Parse recent files from a JSON string.
 */
export function parseRecentFiles(json: string): RecentFile[] {
  try {
    const data = JSON.parse(json);
    const result = recentFilesSchema.safeParse(data);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

/**
 * Add a file to the recent files list. Returns the updated list.
 */
export function addRecentFile(
  recentFiles: RecentFile[],
  filePath: string,
  fileName: string,
): RecentFile[] {
  const filtered = recentFiles.filter((f) => f.path !== filePath);
  const updated: RecentFile[] = [
    { path: filePath, name: fileName, timestamp: Date.now() },
    ...filtered,
  ].slice(0, MAX_RECENT_FILES);

  return updated;
}

/**
 * Serialize recent files to JSON.
 */
export function serializeRecentFiles(recentFiles: RecentFile[]): string {
  return JSON.stringify(recentFiles);
}
