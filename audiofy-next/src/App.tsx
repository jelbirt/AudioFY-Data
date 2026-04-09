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
import { ScatterPlot } from '@core/visualization/ScatterPlot';
import { DataTable } from '@core/visualization/DataTable';
import { exportSVG, exportPNG, exportWAV } from '@core/export';
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

  // --- Engine & Sync ---
  const { initialize, getEngine } = useAudioEngine();
  const sync = useSyncController(getEngine);
  const { openFileDialog, handleDrop, handleDragOver } = useFileImport();

  // --- Chart container sizing ---
  const chartRef = useRef<HTMLDivElement>(null);
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

  // --- Theme ---
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', visualizationConfig.theme);
  }, [visualizationConfig.theme]);

  // --- Prepare sonification when sources or duration change ---
  const playbackConfig = useAppStore((s) => s.playbackConfig);

  const handlePlay = useCallback(async () => {
    await initialize();
    sync.prepare();
    sync.play();
  }, [initialize, sync]);

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

  // --- Keyboard shortcuts ---
  const shortcutHandlers = useMemo(
    () => ({
      togglePlayPause: handleTogglePlayPause,
      stop: handleStop,
      openFile: openFileDialog,
      toggleSettings: toggleSettingsPanel,
    }),
    [handleTogglePlayPause, handleStop, openFileDialog, toggleSettingsPanel],
  );
  useKeyboardShortcuts(shortcutHandlers);

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

  const handleExportWAV = useCallback(async () => {
    try {
      await initialize();
      const duration = playbackConfig.duration;
      await exportWAV(() => sync.prepare(), duration);
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
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss error">
              &times;
            </button>
          </div>
        )}

        {/* Toolbar */}
        <Toolbar
          onOpenFile={openFileDialog}
          onPlay={handlePlay}
          onPause={() => sync.pause()}
          onStop={handleStop}
          onTogglePlayPause={handleTogglePlayPause}
          onSeekProgress={(p) => sync.seekProgress(p)}
          onExportSVG={handleExportSVG}
          onExportPNG={handleExportPNG}
          onExportWAV={handleExportWAV}
        />

        {/* Body */}
        <div className="app-body">
          {/* Sidebar */}
          <nav className="app-sidebar" aria-label="Data sources and settings">
            <SourceList />
            {settingsPanelOpen && (
              <div id="settings-panel">
                <SettingsPanel />
              </div>
            )}
          </nav>

          {/* Main content */}
          <main className="app-main" id="main-content">
            {/* Chart */}
            <div className="app-chart" ref={chartRef}>
              {sources.length === 0 ? (
                <div className={`drop-zone ${dragOver ? 'drop-zone-active' : ''}`}>
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
                  />
                </ErrorBoundary>
              </div>
            )}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
