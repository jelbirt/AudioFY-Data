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
 * Tests for configuration & persistence module.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateConfig,
  serializeConfig,
  createDefaultConfig,
  migrateConfig,
  parseRecentFiles,
  addRecentFile,
  serializeRecentFiles,
  DEFAULT_PLAYBACK,
  DEFAULT_VISUALIZATION,
  DEFAULT_AUDIO,
} from '../../src/core/config';
import type { AudioFYConfig } from '../../src/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function validConfig(): AudioFYConfig {
  return {
    version: 2,
    sources: [
      {
        filePath: '/data/test.xlsx',
        sheetName: 'Sheet1',
        xColumn: 0,
        yColumn: 1,
        color: '#8884d8',
        normalization: 'min-max',
        audioMapping: {
          xColumn: 0,
          yColumn: 1,
          frequencyRange: [200, 2000],
          frequencyScale: 'log',
          volumeRange: [0.1, 0.8],
          panRange: [-0.8, 0.8],
          waveform: 'sine',
          envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 },
        },
      },
    ],
    playback: { speed: 1, loop: false, duration: 10 },
    visualization: { theme: 'light', showGrid: true, showLegend: true, pointSize: 6 },
    audio: {
      masterVolume: 0.8,
      effects: {
        reverb: { enabled: false, decay: 2, wet: 0.3 },
        filter: { enabled: false, frequency: 20000, type: 'lowpass' },
        chorus: { enabled: false, frequency: 4, delayTime: 2.5, depth: 0.5 },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// createDefaultConfig
// ---------------------------------------------------------------------------

describe('createDefaultConfig', () => {
  it('returns a valid config with version 2', () => {
    const config = createDefaultConfig();
    expect(config.version).toBe(2);
    expect(config.sources).toEqual([]);
    expect(config.playback).toEqual(DEFAULT_PLAYBACK);
    expect(config.visualization).toEqual(DEFAULT_VISUALIZATION);
    expect(config.audio).toEqual(DEFAULT_AUDIO);
  });

  it('passes validation', () => {
    const result = validateConfig(createDefaultConfig());
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateConfig
// ---------------------------------------------------------------------------

describe('validateConfig', () => {
  it('validates a correct config object', () => {
    const result = validateConfig(validConfig());
    expect(result.success).toBe(true);
    expect(result.config).toEqual(validConfig());
    expect(result.errors).toEqual([]);
  });

  it('validates a correct JSON string', () => {
    const json = JSON.stringify(validConfig());
    const result = validateConfig(json);
    expect(result.success).toBe(true);
  });

  it('rejects invalid JSON string', () => {
    const result = validateConfig('not json{{{');
    expect(result.success).toBe(false);
    expect(result.errors).toContain('Invalid JSON');
  });

  it('rejects wrong version', () => {
    const config = { ...validConfig(), version: 99 };
    const result = validateConfig(config);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects missing required fields', () => {
    const result = validateConfig({ version: 2 });
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects invalid color format', () => {
    const config = validConfig();
    config.sources[0].color = 'red'; // not hex
    const result = validateConfig(config);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('color'))).toBe(true);
  });

  it('rejects frequency out of range', () => {
    const config = validConfig();
    config.sources[0].audioMapping.frequencyRange = [5, 2000]; // 5 < min 20
    const result = validateConfig(config);
    expect(result.success).toBe(false);
  });

  it('rejects speed out of range', () => {
    const config = validConfig();
    config.playback.speed = 10; // max is 4
    const result = validateConfig(config);
    expect(result.success).toBe(false);
  });

  it('rejects invalid waveform type', () => {
    const config = validConfig();
    (config.sources[0].audioMapping as Record<string, unknown>).waveform = 'noise';
    const result = validateConfig(config);
    expect(result.success).toBe(false);
  });

  it('accepts config with no sources', () => {
    const config = validConfig();
    config.sources = [];
    const result = validateConfig(config);
    expect(result.success).toBe(true);
  });

  it('accepts dark theme', () => {
    const config = validConfig();
    config.visualization.theme = 'dark';
    const result = validateConfig(config);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// serializeConfig
// ---------------------------------------------------------------------------

describe('serializeConfig', () => {
  it('produces valid JSON that re-validates', () => {
    const config = validConfig();
    const json = serializeConfig(config);
    const parsed = JSON.parse(json);
    const result = validateConfig(parsed);
    expect(result.success).toBe(true);
    expect(result.config).toEqual(config);
  });

  it('is formatted with 2-space indent', () => {
    const json = serializeConfig(validConfig());
    expect(json).toContain('\n  ');
  });
});

// ---------------------------------------------------------------------------
// migrateConfig
// ---------------------------------------------------------------------------

describe('migrateConfig', () => {
  it('returns default config for null input', () => {
    const result = migrateConfig(null);
    expect(result.version).toBe(2);
    expect(result.sources).toEqual([]);
  });

  it('returns default config for non-object input', () => {
    const result = migrateConfig('garbage');
    expect(result.version).toBe(2);
  });

  it('migrates version 1 (no version field) by applying defaults', () => {
    const v1 = {
      sources: [],
      playback: { speed: 2 },
    };
    const result = migrateConfig(v1);
    expect(result.version).toBe(2);
    expect(result.playback.speed).toBe(2);
    expect(result.playback.loop).toBe(DEFAULT_PLAYBACK.loop);
    expect(result.playback.duration).toBe(DEFAULT_PLAYBACK.duration);
  });

  it('passes through valid version 2 config', () => {
    const config = validConfig();
    const result = migrateConfig(config);
    expect(result).toEqual(config);
  });

  it('returns default for invalid version 2 config', () => {
    const bad = { version: 2, sources: 'invalid' };
    const result = migrateConfig(bad);
    expect(result.version).toBe(2);
    expect(result.sources).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Recent files
// ---------------------------------------------------------------------------

describe('parseRecentFiles', () => {
  it('parses valid JSON', () => {
    const files = [{ path: '/a.xlsx', name: 'a.xlsx', timestamp: 1000 }];
    const result = parseRecentFiles(JSON.stringify(files));
    expect(result).toEqual(files);
  });

  it('returns empty for invalid JSON', () => {
    expect(parseRecentFiles('not json')).toEqual([]);
  });

  it('returns empty for invalid structure', () => {
    expect(parseRecentFiles('[{"bad": true}]')).toEqual([]);
  });
});

describe('addRecentFile', () => {
  it('adds a new file to the front', () => {
    const existing = [{ path: '/old.csv', name: 'old.csv', timestamp: 1000 }];
    const result = addRecentFile(existing, '/new.xlsx', 'new.xlsx');
    expect(result[0].path).toBe('/new.xlsx');
    expect(result).toHaveLength(2);
  });

  it('moves existing file to front (deduplication)', () => {
    const existing = [
      { path: '/a.csv', name: 'a.csv', timestamp: 1000 },
      { path: '/b.csv', name: 'b.csv', timestamp: 900 },
    ];
    const result = addRecentFile(existing, '/b.csv', 'b.csv');
    expect(result[0].path).toBe('/b.csv');
    expect(result).toHaveLength(2);
  });

  it('caps at 10 entries', () => {
    const existing = Array.from({ length: 10 }, (_, i) => ({
      path: `/${i}.csv`,
      name: `${i}.csv`,
      timestamp: i,
    }));
    const result = addRecentFile(existing, '/new.csv', 'new.csv');
    expect(result).toHaveLength(10);
    expect(result[0].path).toBe('/new.csv');
    // Last old file dropped
    expect(result.find((f) => f.path === '/9.csv')).toBeUndefined();
  });
});

describe('serializeRecentFiles', () => {
  it('round-trips through parse', () => {
    const files = [{ path: '/a.csv', name: 'a.csv', timestamp: 1000 }];
    const json = serializeRecentFiles(files);
    expect(parseRecentFiles(json)).toEqual(files);
  });
});
