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
 * Toolbar — top bar with file import, playback controls, export, and settings toggle.
 */
import { memo } from 'react';
import { PlaybackControls } from './PlaybackControls';
import { useAppStore } from '@store';

interface ToolbarProps {
  onOpenFile: () => void;
  onStop: () => void;
  onTogglePlayPause: () => void;
  onSeekProgress: (progress: number) => void;
  onExportSVG: () => void;
  onExportPNG: () => void;
  onExportAudio: () => void;
  onSaveProject: () => void;
  onLoadProject: () => void;
}

export const Toolbar = memo(function Toolbar({
  onOpenFile,
  onStop,
  onTogglePlayPause,
  onSeekProgress,
  onExportSVG,
  onExportPNG,
  onExportAudio,
  onSaveProject,
  onLoadProject,
}: ToolbarProps) {
  const toggleSettingsPanel = useAppStore((s) => s.toggleSettingsPanel);
  const settingsPanelOpen = useAppStore((s) => s.settingsPanelOpen);
  const sources = useAppStore((s) => s.sources);
  const hasData = sources.length > 0;

  return (
    <div className="app-toolbar" role="toolbar" aria-label="Main toolbar">
      <div className="toolbar-group">
        <button className="btn" onClick={onOpenFile} title="Open file (Ctrl+O)">
          Open File
        </button>
        <button className="btn" onClick={onSaveProject} disabled={!hasData} title="Save project (Ctrl+S)">
          Save
        </button>
        <button className="btn" onClick={onLoadProject} title="Load project">
          Load
        </button>
      </div>

      <div className="toolbar-separator" aria-hidden="true" />

      <PlaybackControls
        onStop={onStop}
        onTogglePlayPause={onTogglePlayPause}
        onSeekProgress={onSeekProgress}
      />

      <div className="toolbar-separator" aria-hidden="true" />

      <div className="toolbar-group" role="group" aria-label="Export">
        <button
          className="btn"
          onClick={onExportSVG}
          disabled={!hasData}
          title={hasData ? 'Export chart as SVG' : 'Load data to enable SVG export'}
          aria-label={hasData ? 'Export SVG' : 'Export SVG (load data first)'}
        >
          SVG
        </button>
        <button
          className="btn"
          onClick={onExportPNG}
          disabled={!hasData}
          title={hasData ? 'Export chart as PNG' : 'Load data to enable PNG export'}
          aria-label={hasData ? 'Export PNG' : 'Export PNG (load data first)'}
        >
          PNG
        </button>
        <button
          className="btn"
          onClick={onExportAudio}
          disabled={!hasData}
          title={hasData ? 'Export audio (WebM/Opus)' : 'Load data to enable audio export'}
          aria-label={hasData ? 'Export audio' : 'Export audio (load data first)'}
        >
          Audio
        </button>
      </div>

      <div className="toolbar-spacer" />

      <div className="toolbar-group">
        <button
          className={`btn ${settingsPanelOpen ? 'btn-primary' : ''}`}
          onClick={toggleSettingsPanel}
          title="Settings (Ctrl+,)"
          aria-expanded={settingsPanelOpen}
          aria-controls="settings-panel"
        >
          Settings
        </button>
      </div>
    </div>
  );
});
