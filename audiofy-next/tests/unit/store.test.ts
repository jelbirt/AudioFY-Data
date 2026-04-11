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
 * Tests for Zustand store — actions and state management.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../src/store';
import type { DataSource, ActivePoint } from '../../src/types';
import { DEFAULT_PLAYBACK, DEFAULT_VISUALIZATION, DEFAULT_AUDIO } from '../../src/core/config';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function mockSource(overrides: Partial<DataSource> = {}): DataSource {
  return {
    id: 'test-source-1',
    name: 'Sheet1',
    fileName: 'test.csv',
    sheetName: 'Sheet1',
    columns: [
      { index: 0, name: 'x', type: 'numeric', stats: { min: 0, max: 10, mean: 5, stdDev: 3, median: 5, q1: 2.5, q3: 7.5 } },
      { index: 1, name: 'y', type: 'numeric', stats: { min: 0, max: 100, mean: 50, stdDev: 30, median: 50, q1: 25, q3: 75 } },
    ],
    rows: [[1, 10], [2, 20], [3, 30]],
    headers: { row: [], col: ['x', 'y'] },
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
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AppStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAppStore.setState({
      sources: [],
      parsedFiles: {},
      playbackState: 'stopped',
      currentTime: 0,
      progress: 0,
      activePoints: [],
      playbackConfig: { ...DEFAULT_PLAYBACK },
      audioConfig: { ...DEFAULT_AUDIO },
      audioInitialized: false,
      visualizationConfig: { ...DEFAULT_VISUALIZATION },
      selectedSourceId: null,
      settingsPanelOpen: false,
      recentFiles: [],
      error: null,
      loading: false,
    });
  });

  describe('Initial state', () => {
    it('starts with empty sources', () => {
      expect(useAppStore.getState().sources).toEqual([]);
    });

    it('starts with stopped playback', () => {
      expect(useAppStore.getState().playbackState).toBe('stopped');
    });

    it('starts with default configs', () => {
      const state = useAppStore.getState();
      expect(state.playbackConfig).toEqual(DEFAULT_PLAYBACK);
      expect(state.visualizationConfig).toEqual(DEFAULT_VISUALIZATION);
      expect(state.audioConfig).toEqual(DEFAULT_AUDIO);
    });
  });

  describe('Source management', () => {
    it('addSource adds a source and selects it', () => {
      const source = mockSource();
      useAppStore.getState().addSource(source);

      const state = useAppStore.getState();
      expect(state.sources).toHaveLength(1);
      expect(state.sources[0]).toEqual(source);
      expect(state.selectedSourceId).toBe('test-source-1');
    });

    it('addSource stores parsedFile when provided', () => {
      const source = mockSource();
      const parsedFile = { fileName: 'test.csv', sheets: [] };
      useAppStore.getState().addSource(source, parsedFile);

      const state = useAppStore.getState();
      // parsedFiles are keyed by source.id, not fileName
      expect(state.parsedFiles[source.id]).toEqual(parsedFile);
    });

    it('removeSource removes a source by id', () => {
      const source = mockSource();
      useAppStore.getState().addSource(source);
      useAppStore.getState().removeSource('test-source-1');

      expect(useAppStore.getState().sources).toHaveLength(0);
    });

    it('removeSource clears selection if removed source was the only one', () => {
      const source = mockSource();
      useAppStore.getState().addSource(source);
      expect(useAppStore.getState().selectedSourceId).toBe('test-source-1');

      useAppStore.getState().removeSource('test-source-1');
      expect(useAppStore.getState().selectedSourceId).toBeNull();
    });

    it('removeSource keeps selection if another source was selected', () => {
      const s1 = mockSource({ id: 'src-1' });
      const s2 = mockSource({ id: 'src-2' });
      useAppStore.getState().addSource(s1);
      useAppStore.getState().addSource(s2);
      // s2 should be selected (last added)
      expect(useAppStore.getState().selectedSourceId).toBe('src-2');

      useAppStore.getState().removeSource('src-1');
      expect(useAppStore.getState().selectedSourceId).toBe('src-2');
    });

    it('removeSource auto-selects next source when selected source is deleted', () => {
      const s1 = mockSource({ id: 'src-1', fileName: 'a.csv' });
      const s2 = mockSource({ id: 'src-2', fileName: 'b.csv' });
      const s3 = mockSource({ id: 'src-3', fileName: 'c.csv' });
      useAppStore.getState().addSource(s1);
      useAppStore.getState().addSource(s2);
      useAppStore.getState().addSource(s3);
      // Select the middle source
      useAppStore.getState().selectSource('src-2');

      useAppStore.getState().removeSource('src-2');
      // Should auto-select src-3 (the source at the same index)
      expect(useAppStore.getState().selectedSourceId).toBe('src-3');
    });

    it('clearSources removes all sources', () => {
      useAppStore.getState().addSource(mockSource({ id: 'a' }));
      useAppStore.getState().addSource(mockSource({ id: 'b' }));
      useAppStore.getState().clearSources();

      const state = useAppStore.getState();
      expect(state.sources).toHaveLength(0);
      expect(state.selectedSourceId).toBeNull();
      expect(Object.keys(state.parsedFiles).length).toBe(0);
    });
  });

  describe('Source updates', () => {
    it('updateSourceMapping merges partial mapping', () => {
      useAppStore.getState().addSource(mockSource());
      useAppStore.getState().updateSourceMapping('test-source-1', {
        frequencyRange: [300, 3000],
      });

      const source = useAppStore.getState().sources[0];
      expect(source.audioMapping.frequencyRange).toEqual([300, 3000]);
      // Other fields unchanged
      expect(source.audioMapping.waveform).toBe('sine');
    });

    it('updateSourceNormalization changes normalization mode', () => {
      useAppStore.getState().addSource(mockSource());
      useAppStore.getState().updateSourceNormalization('test-source-1', 'z-score');

      expect(useAppStore.getState().sources[0].normalization).toBe('z-score');
    });

    it('updateSourceColor changes color', () => {
      useAppStore.getState().addSource(mockSource());
      useAppStore.getState().updateSourceColor('test-source-1', '#ff0000');

      expect(useAppStore.getState().sources[0].color).toBe('#ff0000');
    });

    it('updateSourceWaveform changes waveform in audioMapping', () => {
      useAppStore.getState().addSource(mockSource());
      useAppStore.getState().updateSourceWaveform('test-source-1', 'square');

      expect(useAppStore.getState().sources[0].audioMapping.waveform).toBe('square');
    });

    it('updateSourceEnvelope changes envelope in audioMapping', () => {
      const env = { attack: 0.1, decay: 0.2, sustain: 0.5, release: 1.0 };
      useAppStore.getState().addSource(mockSource());
      useAppStore.getState().updateSourceEnvelope('test-source-1', env);

      expect(useAppStore.getState().sources[0].audioMapping.envelope).toEqual(env);
    });
  });

  describe('Playback state', () => {
    it('setPlaybackState updates state', () => {
      useAppStore.getState().setPlaybackState('playing');
      expect(useAppStore.getState().playbackState).toBe('playing');
    });

    it('setCurrentTime updates time', () => {
      useAppStore.getState().setCurrentTime(5.5);
      expect(useAppStore.getState().currentTime).toBe(5.5);
    });

    it('setProgress updates progress', () => {
      useAppStore.getState().setProgress(0.75);
      expect(useAppStore.getState().progress).toBe(0.75);
    });

    it('setActivePoints updates active points', () => {
      const points: ActivePoint[] = [
        { sourceId: 'src-1', pointIndex: 0 },
        { sourceId: 'src-1', pointIndex: 3 },
      ];
      useAppStore.getState().setActivePoints(points);
      expect(useAppStore.getState().activePoints).toEqual(points);
    });

    it('updatePlaybackConfig merges partial config', () => {
      useAppStore.getState().updatePlaybackConfig({ speed: 2, loop: true });

      const config = useAppStore.getState().playbackConfig;
      expect(config.speed).toBe(2);
      expect(config.loop).toBe(true);
      expect(config.duration).toBe(DEFAULT_PLAYBACK.duration);
    });
  });

  describe('Audio config', () => {
    it('updateAudioConfig merges partial config', () => {
      useAppStore.getState().updateAudioConfig({ masterVolume: 0.5 });
      expect(useAppStore.getState().audioConfig.masterVolume).toBe(0.5);
    });

    it('setAudioInitialized updates flag', () => {
      useAppStore.getState().setAudioInitialized(true);
      expect(useAppStore.getState().audioInitialized).toBe(true);
    });
  });

  describe('Visualization config', () => {
    it('updateVisualizationConfig merges partial config', () => {
      useAppStore.getState().updateVisualizationConfig({ theme: 'dark', pointSize: 10 });

      const config = useAppStore.getState().visualizationConfig;
      expect(config.theme).toBe('dark');
      expect(config.pointSize).toBe(10);
      expect(config.showGrid).toBe(true); // unchanged
    });
  });

  describe('UI state', () => {
    it('selectSource updates selectedSourceId', () => {
      useAppStore.getState().selectSource('some-id');
      expect(useAppStore.getState().selectedSourceId).toBe('some-id');
    });

    it('toggleSettingsPanel toggles the panel', () => {
      expect(useAppStore.getState().settingsPanelOpen).toBe(false);
      useAppStore.getState().toggleSettingsPanel();
      expect(useAppStore.getState().settingsPanelOpen).toBe(true);
      useAppStore.getState().toggleSettingsPanel();
      expect(useAppStore.getState().settingsPanelOpen).toBe(false);
    });

    it('setSettingsPanelOpen sets explicitly', () => {
      useAppStore.getState().setSettingsPanelOpen(true);
      expect(useAppStore.getState().settingsPanelOpen).toBe(true);
    });

    it('setRecentFiles updates recent files', () => {
      const files = [{ path: '/a', name: 'a.csv', timestamp: 1000 }];
      useAppStore.getState().setRecentFiles(files);
      expect(useAppStore.getState().recentFiles).toEqual(files);
    });

    it('setError sets and clears errors', () => {
      useAppStore.getState().setError('Something went wrong');
      expect(useAppStore.getState().error).toBe('Something went wrong');

      useAppStore.getState().setError(null);
      expect(useAppStore.getState().error).toBeNull();
    });

    it('setLoading updates loading state', () => {
      useAppStore.getState().setLoading(true);
      expect(useAppStore.getState().loading).toBe(true);
    });
  });

  describe('syncState batch update', () => {
    it('updates multiple fields atomically', () => {
      useAppStore.getState().syncState({
        playbackState: 'playing',
        currentTime: 3.5,
        progress: 0.35,
        activePoints: [{ sourceId: 'src-1', pointIndex: 2 }],
      });

      const state = useAppStore.getState();
      expect(state.playbackState).toBe('playing');
      expect(state.currentTime).toBe(3.5);
      expect(state.progress).toBe(0.35);
      expect(state.activePoints).toHaveLength(1);
    });

    it('partial syncState only updates provided fields', () => {
      useAppStore.getState().setProgress(0.5);
      useAppStore.getState().syncState({ currentTime: 7 });

      const state = useAppStore.getState();
      expect(state.currentTime).toBe(7);
      expect(state.progress).toBe(0.5); // unchanged
    });
  });

  // -------------------------------------------------------------------------
  // pendingImport
  // -------------------------------------------------------------------------

  describe('pendingImport', () => {
    it('starts as null', () => {
      expect(useAppStore.getState().pendingImport).toBeNull();
    });

    it('setPendingImport stores the pending import', () => {
      const pending = {
        parsedFile: {
          sheets: [
            { name: 'Sheet1', headers: ['a', 'b'], rows: [[1, 2]], numericCols: [0, 1] },
            { name: 'Sheet2', headers: ['c', 'd'], rows: [[3, 4]], numericCols: [0, 1] },
          ],
        },
        fileName: 'multi-sheet.xlsx',
      };

      useAppStore.getState().setPendingImport(pending as unknown as import('../../src/store').PendingImport);
      expect(useAppStore.getState().pendingImport).toEqual(pending);
    });

    it('setPendingImport(null) clears the pending import', () => {
      const pending = {
        parsedFile: { sheets: [{ name: 'S1', headers: [], rows: [], numericCols: [] }] },
        fileName: 'test.xlsx',
      };

      useAppStore.getState().setPendingImport(pending as unknown as import('../../src/store').PendingImport);
      expect(useAppStore.getState().pendingImport).not.toBeNull();

      useAppStore.getState().setPendingImport(null);
      expect(useAppStore.getState().pendingImport).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Column mapping updates
  // -------------------------------------------------------------------------

  describe('column mapping updates', () => {
    beforeEach(() => {
      const source = mockSource({
        columns: [
          { index: 0, name: 'a', type: 'numeric', stats: { min: 0, max: 1, mean: 0.5, stdDev: 0.3, median: 0.5, q1: 0.25, q3: 0.75 } },
          { index: 1, name: 'b', type: 'numeric', stats: { min: 0, max: 10, mean: 5, stdDev: 3, median: 5, q1: 2.5, q3: 7.5 } },
          { index: 2, name: 'c', type: 'numeric', stats: { min: 0, max: 100, mean: 50, stdDev: 30, median: 50, q1: 25, q3: 75 } },
        ],
      });
      useAppStore.getState().addSource(source);
    });

    it('updateSourceMapping changes xColumn', () => {
      useAppStore.getState().updateSourceMapping('test-source-1', { xColumn: 2 });
      const src = useAppStore.getState().sources[0];
      expect(src.audioMapping.xColumn).toBe(2);
      expect(src.audioMapping.yColumn).toBe(1); // unchanged
    });

    it('updateSourceMapping changes yColumn', () => {
      useAppStore.getState().updateSourceMapping('test-source-1', { yColumn: 2 });
      const src = useAppStore.getState().sources[0];
      expect(src.audioMapping.yColumn).toBe(2);
      expect(src.audioMapping.xColumn).toBe(0); // unchanged
    });

    it('updateSourceMapping changes both columns at once', () => {
      useAppStore.getState().updateSourceMapping('test-source-1', { xColumn: 2, yColumn: 0 });
      const src = useAppStore.getState().sources[0];
      expect(src.audioMapping.xColumn).toBe(2);
      expect(src.audioMapping.yColumn).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Config restoration (save/load flow)
  // -------------------------------------------------------------------------

  describe('config restoration', () => {
    it('updatePlaybackConfig restores playback settings', () => {
      useAppStore.getState().updatePlaybackConfig({ speed: 2, loop: true, duration: 20 });
      const config = useAppStore.getState().playbackConfig;
      expect(config.speed).toBe(2);
      expect(config.loop).toBe(true);
      expect(config.duration).toBe(20);
    });

    it('updateVisualizationConfig restores viz settings', () => {
      useAppStore.getState().updateVisualizationConfig({
        theme: 'dark',
        showGrid: false,
        pointSize: 10,
      });
      const config = useAppStore.getState().visualizationConfig;
      expect(config.theme).toBe('dark');
      expect(config.showGrid).toBe(false);
      expect(config.pointSize).toBe(10);
    });

    it('updateAudioConfig restores audio settings', () => {
      useAppStore.getState().updateAudioConfig({
        masterVolume: 0.5,
        effects: {
          reverb: { enabled: true, decay: 3, wet: 0.6 },
          filter: { enabled: true, frequency: 5000, type: 'lowpass' },
          chorus: { enabled: true, frequency: 4, delayTime: 2.5, depth: 0.5 },
        },
      });
      const config = useAppStore.getState().audioConfig;
      expect(config.masterVolume).toBe(0.5);
      expect(config.effects.reverb.enabled).toBe(true);
      expect(config.effects.chorus.enabled).toBe(true);
    });
  });
});
