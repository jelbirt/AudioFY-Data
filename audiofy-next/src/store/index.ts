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
 * Zustand Store — central state management for AudioFY.
 *
 * All UI state flows through this store. Core engine objects
 * (AudioEngine, SyncController) are held as non-serializable refs
 * and accessed via hooks, not stored here.
 */
import { create } from 'zustand';
import type {
  DataSource,
  ParsedFile,
  ActivePoint,
  PlaybackState,
  PlaybackConfig,
  VisualizationConfig,
  AudioConfig,
  AudioMapping,
  NormalizationMode,
  OscillatorType,
  ADSR,
} from '@types';

/** Represents a file that has been parsed but awaits user sheet selection. */
export interface PendingImport {
  parsedFile: ParsedFile;
  fileName: string;
  filePath?: string;
}
import type { RecentFile } from '@core/config';
import { DEFAULT_PLAYBACK, DEFAULT_VISUALIZATION, DEFAULT_AUDIO } from '@core/config';

/** Detect system color-scheme preference. */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface AppState {
  // --- Data ---
  sources: DataSource[];
  parsedFiles: Record<string, ParsedFile>;

  // --- Playback / Sync ---
  playbackState: PlaybackState;
  currentTime: number;
  progress: number;
  activePoints: ActivePoint[];
  playbackConfig: PlaybackConfig;

  // --- Audio ---
  audioConfig: AudioConfig;
  audioInitialized: boolean;

  // --- Visualization ---
  visualizationConfig: VisualizationConfig;

  // --- UI ---
  selectedSourceId: string | null;
  settingsPanelOpen: boolean;
  recentFiles: RecentFile[];
  error: string | null;
  notification: string | null;
  loading: boolean;
  loadingMessage: string | null;

  // --- Import ---
  pendingImport: PendingImport | null;
}

export interface AppActions {
  // --- Data ---
  addSource: (source: DataSource, parsedFile?: ParsedFile) => void;
  removeSource: (sourceId: string) => void;
  updateSourceMapping: (sourceId: string, mapping: Partial<AudioMapping>) => void;
  updateSourceNormalization: (sourceId: string, mode: NormalizationMode) => void;
  updateSourceColor: (sourceId: string, color: string) => void;
  updateSourceWaveform: (sourceId: string, waveform: OscillatorType) => void;
  updateSourceEnvelope: (sourceId: string, envelope: ADSR) => void;
  clearSources: () => void;

  // --- Playback / Sync ---
  setPlaybackState: (state: PlaybackState) => void;
  setCurrentTime: (time: number) => void;
  setProgress: (progress: number) => void;
  setActivePoints: (points: ActivePoint[]) => void;
  updatePlaybackConfig: (config: Partial<PlaybackConfig>) => void;

  // --- Audio ---
  updateAudioConfig: (config: Partial<AudioConfig>) => void;
  setAudioInitialized: (initialized: boolean) => void;

  // --- Visualization ---
  updateVisualizationConfig: (config: Partial<VisualizationConfig>) => void;

  // --- UI ---
  selectSource: (sourceId: string | null) => void;
  toggleSettingsPanel: () => void;
  setSettingsPanelOpen: (open: boolean) => void;
  setRecentFiles: (files: RecentFile[]) => void;
  setError: (error: string | null) => void;
  setNotification: (notification: string | null) => void;
  setLoading: (loading: boolean, message?: string | null) => void;

  // --- Import ---
  setPendingImport: (pending: PendingImport | null) => void;

  // --- Batch sync state update ---
  syncState: (patch: {
    playbackState?: PlaybackState;
    currentTime?: number;
    progress?: number;
    activePoints?: ActivePoint[];
  }) => void;
}

export type AppStore = AppState & AppActions;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAppStore = create<AppStore>((set) => ({
  // --- Initial state ---
  sources: [],
  parsedFiles: {},
  playbackState: 'stopped',
  currentTime: 0,
  progress: 0,
  activePoints: [],
  playbackConfig: { ...DEFAULT_PLAYBACK },
  audioConfig: { ...DEFAULT_AUDIO },
  audioInitialized: false,
  visualizationConfig: { ...DEFAULT_VISUALIZATION, theme: getSystemTheme() },
  selectedSourceId: null,
  settingsPanelOpen: false,
  recentFiles: [],
  error: null,
  notification: null,
  loading: false,
  loadingMessage: null,
  pendingImport: null,

  // --- Actions ---

  addSource: (source, parsedFile) =>
    set((state) => {
      const newParsedFiles = { ...state.parsedFiles };
      if (parsedFile) {
        // Key by source ID to avoid collisions when files share the same name
        newParsedFiles[source.id] = parsedFile;
      }
      return {
        sources: [...state.sources, source],
        parsedFiles: newParsedFiles,
        selectedSourceId: source.id,
      };
    }),

  removeSource: (sourceId) =>
    set((state) => {
      const remaining = state.sources.filter((s) => s.id !== sourceId);

      // Clean up parsedFiles entry for the removed source
      const newParsedFiles = { ...state.parsedFiles };
      delete newParsedFiles[sourceId];

      // Auto-select another source if the deleted one was selected
      let nextSelected = state.selectedSourceId;
      if (state.selectedSourceId === sourceId) {
        const deletedIndex = state.sources.findIndex((s) => s.id === sourceId);
        // Prefer the next source, or the previous one, or null
        nextSelected =
          remaining[Math.min(deletedIndex, remaining.length - 1)]?.id ?? null;
      }

      return {
        sources: remaining,
        parsedFiles: newParsedFiles,
        selectedSourceId: nextSelected,
      };
    }),

  updateSourceMapping: (sourceId, mapping) =>
    set((state) => ({
      sources: state.sources.map((s) =>
        s.id === sourceId ? { ...s, audioMapping: { ...s.audioMapping, ...mapping } } : s,
      ),
    })),

  updateSourceNormalization: (sourceId, mode) =>
    set((state) => ({
      sources: state.sources.map((s) => (s.id === sourceId ? { ...s, normalization: mode } : s)),
    })),

  updateSourceColor: (sourceId, color) =>
    set((state) => ({
      sources: state.sources.map((s) => (s.id === sourceId ? { ...s, color } : s)),
    })),

  updateSourceWaveform: (sourceId, waveform) =>
    set((state) => ({
      sources: state.sources.map((s) =>
        s.id === sourceId ? { ...s, audioMapping: { ...s.audioMapping, waveform } } : s,
      ),
    })),

  updateSourceEnvelope: (sourceId, envelope) =>
    set((state) => ({
      sources: state.sources.map((s) =>
        s.id === sourceId ? { ...s, audioMapping: { ...s.audioMapping, envelope } } : s,
      ),
    })),

  clearSources: () =>
    set({
      sources: [],
      parsedFiles: {},
      selectedSourceId: null,
      playbackState: 'stopped',
      currentTime: 0,
      progress: 0,
      activePoints: [],
    }),

  setPlaybackState: (playbackState) => set({ playbackState }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setProgress: (progress) => set({ progress }),
  setActivePoints: (activePoints) => set({ activePoints }),

  updatePlaybackConfig: (config) =>
    set((state) => ({
      playbackConfig: { ...state.playbackConfig, ...config },
    })),

  updateAudioConfig: (config) =>
    set((state) => ({
      audioConfig: { ...state.audioConfig, ...config },
    })),

  setAudioInitialized: (audioInitialized) => set({ audioInitialized }),

  updateVisualizationConfig: (config) =>
    set((state) => ({
      visualizationConfig: { ...state.visualizationConfig, ...config },
    })),

  selectSource: (selectedSourceId) => set({ selectedSourceId }),
  toggleSettingsPanel: () => set((state) => ({ settingsPanelOpen: !state.settingsPanelOpen })),
  setSettingsPanelOpen: (settingsPanelOpen) => set({ settingsPanelOpen }),
  setRecentFiles: (recentFiles) => set({ recentFiles }),
  setError: (error) => set({ error }),
  setNotification: (notification) => set({ notification }),
  setLoading: (loading, message) => set({ loading, loadingMessage: message ?? null }),
  setPendingImport: (pendingImport) => set({ pendingImport }),

  syncState: (patch) => set(patch),
}));
