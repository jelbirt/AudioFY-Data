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
 * App — main application component. Wires together the store,
 * hooks, and UI components into the full AudioFY layout.
 */
import { useEffect, useCallback, useMemo, useRef, useState, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useAppStore } from '@store';
import { useAudioEngine, useSyncController, useFileImport, useKeyboardShortcuts } from '@ui/hooks';
import { Toolbar } from '@ui/components/Toolbar';
import { SourceList } from '@ui/components/SourceList';
import { SettingsPanel } from '@ui/components/SettingsPanel';
import { ImportPreviewModal } from '@ui/components/ImportPreviewModal';
import { ScatterPlot } from '@core/visualization/ScatterPlot';
import { DataTable } from '@core/visualization/DataTable';
import { exportSVG, exportPNG, exportAudio } from '@core/export';
import { buildDataSource } from '@core/data';
import { serializeConfig, validateConfig } from '@core/config';
import type { AudioFYConfig, SourceConfig } from '@types';
import '@ui/styles/app.css';

// ---------------------------------------------------------------------------
// ErrorBoundary
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[AudioFY] Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          role="alert"
          style={{
            padding: 32,
            textAlign: 'center',
            color: 'var(--danger, #ff3b30)',
            background: 'var(--bg-primary, #fff)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Something went wrong</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary, #666)', maxWidth: 400 }}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button className="btn" onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const sources = useAppStore((s) => s.sources);
  const activePoints = useAppStore((s) => s.activePoints);
  const progress = useAppStore((s) => s.progress);
  const visualizationConfig = useAppStore((s) => s.visualizationConfig);
  const settingsPanelOpen = useAppStore((s) => s.settingsPanelOpen);
  const error = useAppStore((s) => s.error);
  const loading = useAppStore((s) => s.loading);
  const setError = useAppStore((s) => s.setError);
  const toggleSettingsPanel = useAppStore((s) => s.toggleSettingsPanel);
  const pendingImport = useAppStore((s) => s.pendingImport);
  const setPendingImport = useAppStore((s) => s.setPendingImport);
  const addSource = useAppStore((s) => s.addSource);

  // --- Engine & Sync ---
  const { initialize, getEngine } = useAudioEngine();
  const sync = useSyncController(getEngine);
  const { openFileDialog, handleDrop, handleDragOver } = useFileImport();

  // --- Chart container sizing ---
  const chartRef = useRef<HTMLDivElement>(null);
  const errorBannerRef = useRef<HTMLDivElement>(null);
  const [chartSize, setChartSize] = useState({ width: 800, height: 500 });

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setChartSize({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // --- Focus error banner when a new error appears ---
  useEffect(() => {
    if (error) {
      errorBannerRef.current?.focus();
    }
  }, [error]);

  // --- Theme ---
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', visualizationConfig.theme);
  }, [visualizationConfig.theme]);

  // --- Prepare sonification when sources or duration change ---
  const playbackConfig = useAppStore((s) => s.playbackConfig);

  const handlePlay = useCallback(async () => {
    if (sources.length === 0) {
      setError('No data loaded. Open a file first.');
      return;
    }
    await initialize();
    sync.prepare();
    sync.play();
  }, [initialize, sync, sources.length, setError]);

  const handleStop = useCallback(() => {
    sync.stop();
  }, [sync]);

  const handleTogglePlayPause = useCallback(async () => {
    const state = useAppStore.getState().playbackState;
    if (state === 'stopped') {
      await handlePlay();
    } else {
      sync.togglePlayPause();
    }
  }, [handlePlay, sync]);

  // --- Save / Load project ---
  const updatePlaybackConfig = useAppStore((s) => s.updatePlaybackConfig);
  const updateVisualizationConfig = useAppStore((s) => s.updateVisualizationConfig);
  const updateAudioConfig = useAppStore((s) => s.updateAudioConfig);

  const handleSaveProject = useCallback(() => {
    const state = useAppStore.getState();
    const sourceConfigs: SourceConfig[] = state.sources.map((s) => ({
      filePath: s.fileName,
      sheetName: s.sheetName,
      xColumn: s.audioMapping.xColumn,
      yColumn: s.audioMapping.yColumn,
      color: s.color,
      normalization: s.normalization,
      audioMapping: s.audioMapping,
    }));

    const config: AudioFYConfig = {
      version: 2,
      sources: sourceConfigs,
      playback: state.playbackConfig,
      visualization: state.visualizationConfig,
      audio: state.audioConfig,
    };

    const json = serializeConfig(config);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audiofy-project.json';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleLoadProject = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const result = validateConfig(text);

        if (!result.success || !result.config) {
          setError(`Invalid project file: ${result.errors.join(', ')}`);
          return;
        }

        const config = result.config;

        // Restore playback, visualization, and audio config
        updatePlaybackConfig(config.playback);
        updateVisualizationConfig(config.visualization);
        updateAudioConfig(config.audio);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
      }
    };

    input.click();
  }, [setError, updatePlaybackConfig, updateVisualizationConfig, updateAudioConfig]);

  // --- Keyboard shortcuts ---
  const shortcutHandlers = useMemo(
    () => ({
      togglePlayPause: handleTogglePlayPause,
      stop: handleStop,
      openFile: openFileDialog,
      toggleSettings: toggleSettingsPanel,
      saveProject: handleSaveProject,
    }),
    [handleTogglePlayPause, handleStop, openFileDialog, toggleSettingsPanel, handleSaveProject],
  );
  useKeyboardShortcuts(shortcutHandlers);

  // --- Chart / table interaction handlers ---
  const handlePointClick = useCallback(
    (sourceId: string, pointIndex: number) => {
      const source = useAppStore.getState().sources.find((s) => s.id === sourceId);
      if (!source || source.rows.length === 0) return;
      const p = pointIndex / source.rows.length;
      sync.seekProgress(Math.max(0, Math.min(1, p)));
    },
    [sync],
  );

  const handleRowClick = useCallback(
    (sourceId: string, pointIndex: number) => {
      const source = useAppStore.getState().sources.find((s) => s.id === sourceId);
      if (!source || source.rows.length === 0) return;
      const p = pointIndex / source.rows.length;
      sync.seekProgress(Math.max(0, Math.min(1, p)));
    },
    [sync],
  );

  // --- Drag state ---
  const [dragOver, setDragOver] = useState(false);

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      handleDragOver(e);
      setDragOver(true);
    },
    [handleDragOver],
  );

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      setDragOver(false);
      handleDrop(e);
    },
    [handleDrop],
  );

  // --- Import preview handlers ---
  const handleConfirmImport = useCallback(
    (sheetIndex: number) => {
      if (!pendingImport) return;
      const { parsedFile, fileName } = pendingImport;
      try {
        const sheet = parsedFile.sheets[sheetIndex];
        const source = buildDataSource(sheet, fileName);
        addSource(source, parsedFile);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to import sheet');
      }
      setPendingImport(null);
    },
    [pendingImport, addSource, setError, setPendingImport],
  );

  const handleCancelImport = useCallback(() => {
    setPendingImport(null);
  }, [setPendingImport]);

  // --- Export handlers ---
  const getSvgElement = useCallback((): SVGSVGElement | null => {
    // Find the SVG inside the chart container
    return chartRef.current?.querySelector('svg') ?? null;
  }, []);

  const handleExportSVG = useCallback(() => {
    const svg = getSvgElement();
    if (!svg) {
      setError('No chart to export. Load data first.');
      return;
    }
    try {
      exportSVG(svg);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SVG export failed');
    }
  }, [getSvgElement, setError]);

  const handleExportPNG = useCallback(async () => {
    const svg = getSvgElement();
    if (!svg) {
      setError('No chart to export. Load data first.');
      return;
    }
    try {
      await exportPNG(svg);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PNG export failed');
    }
  }, [getSvgElement, setError]);

  const handleExportAudio = useCallback(async () => {
    try {
      await initialize();
      const duration = playbackConfig.duration;
      await exportAudio(() => sync.prepare(), duration);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audio export failed');
    }
  }, [initialize, sync, playbackConfig.duration, setError]);

  // --- ARIA live announcements for playback state ---
  const playbackState = useAppStore((s) => s.playbackState);
  const [announcement, setAnnouncement] = useState('');

  // Announce playback state changes to screen readers via ARIA live region.
  // The setState call is intentional — it drives the live region text content
  // and does not cause meaningful cascading renders.
  useEffect(() => {
    const msg =
      playbackState === 'playing'
        ? 'Playback started'
        : playbackState === 'paused'
          ? 'Playback paused'
          : 'Playback stopped';
    setAnnouncement(msg); // eslint-disable-line react-hooks/set-state-in-effect
  }, [playbackState]);

  return (
    <ErrorBoundary>
      <div className="app-layout" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
        {/* Skip to main content link */}
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>

        {/* ARIA live region for playback state announcements */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement}
        </div>

        {/* Error banner */}
        {error && (
          <div ref={errorBannerRef} className="error-banner" role="alert" tabIndex={-1}>
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss error">
              &times;
            </button>
          </div>
        )}

        {/* Toolbar */}
        <Toolbar
          onOpenFile={openFileDialog}
          onStop={handleStop}
          onTogglePlayPause={handleTogglePlayPause}
          onSeekProgress={(p) => sync.seekProgress(p)}
          onExportSVG={handleExportSVG}
          onExportPNG={handleExportPNG}
          onExportAudio={handleExportAudio}
          onSaveProject={handleSaveProject}
          onLoadProject={handleLoadProject}
        />

        {/* Body */}
        <div className="app-body">
          {/* Sidebar */}
          <nav className="app-sidebar" aria-label="Data sources and settings">
            <SourceList />
            <div id="settings-panel" aria-hidden={!settingsPanelOpen}>
              {settingsPanelOpen && <SettingsPanel />}
            </div>
          </nav>

          {/* Main content */}
          <main className="app-main" id="main-content">
            {/* Chart */}
            <div className="app-chart" ref={chartRef}>
              {sources.length === 0 ? (
                <div
                  className={`drop-zone ${dragOver ? 'drop-zone-active' : ''}`}
                  aria-dropeffect="execute"
                  aria-label="Drop zone: accepts .xlsx, .csv, .tsv, .ods, .json files"
                >
                  <div className="drop-zone-icon" aria-hidden="true">
                    &#128202;
                  </div>
                  <div>Drop a spreadsheet here or click Open File</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Supports .xlsx, .csv, .tsv, .ods, .json
                  </div>
                </div>
              ) : (
                <ErrorBoundary
                  fallback={
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                      Chart failed to render. Try reloading your data.
                    </div>
                  }
                >
                  <ScatterPlot
                    sources={sources}
                    activePoints={activePoints}
                    playbackProgress={progress}
                    config={visualizationConfig}
                    width={chartSize.width}
                    height={chartSize.height}
                    onPointClick={handlePointClick}
                  />
                </ErrorBoundary>
              )}

              {loading && (
                <div className="loading-overlay" role="status" aria-label="Loading">
                  <span>Loading...</span>
                </div>
              )}
            </div>

            {/* Data Table */}
            {sources.length > 0 && (
              <div className="app-table">
                <ErrorBoundary
                  fallback={
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                      Table failed to render. Try reloading your data.
                    </div>
                  }
                >
                  <DataTable
                    sources={sources}
                    activePoints={activePoints}
                    config={visualizationConfig}
                    maxHeight={250}
                    onRowClick={handleRowClick}
                  />
                </ErrorBoundary>
              </div>
            )}
          </main>
        </div>

        {/* Import Preview Modal */}
        {pendingImport && (
          <ImportPreviewModal
            pending={pendingImport}
            onConfirm={handleConfirmImport}
            onCancel={handleCancelImport}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
