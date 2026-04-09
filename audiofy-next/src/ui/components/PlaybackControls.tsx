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
 * PlaybackControls — play/pause/stop, progress bar, speed, loop, duration.
 */
import { useCallback } from 'react';
import { useAppStore } from '@store';

interface PlaybackControlsProps {
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onTogglePlayPause: () => void;
  onSeekProgress: (progress: number) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
}

export function PlaybackControls({
  onStop,
  onTogglePlayPause,
  onSeekProgress,
}: PlaybackControlsProps) {
  const playbackState = useAppStore((s) => s.playbackState);
  const currentTime = useAppStore((s) => s.currentTime);
  const progress = useAppStore((s) => s.progress);
  const playbackConfig = useAppStore((s) => s.playbackConfig);
  const updatePlaybackConfig = useAppStore((s) => s.updatePlaybackConfig);
  const sources = useAppStore((s) => s.sources);

  const hasData = sources.length > 0;

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onSeekProgress(p);
    },
    [onSeekProgress],
  );

  const handleProgressKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 0.1 : 0.02;
      // Read fresh progress from store to avoid stale closure during rapid key presses
      const currentProgress = useAppStore.getState().progress;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        onSeekProgress(Math.min(1, currentProgress + step));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        onSeekProgress(Math.max(0, currentProgress - step));
      } else if (e.key === 'Home') {
        e.preventDefault();
        onSeekProgress(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        onSeekProgress(1);
      }
    },
    [onSeekProgress],
  );

  return (
    <div className="playback-controls">
      <button
        className="btn btn-icon"
        onClick={onStop}
        disabled={!hasData || playbackState === 'stopped'}
        title="Stop (Esc)"
        aria-label="Stop"
      >
        &#9632;
      </button>
      <button
        className="btn btn-icon btn-primary"
        onClick={onTogglePlayPause}
        disabled={!hasData}
        title="Play/Pause (Space)"
        aria-label={playbackState === 'playing' ? 'Pause' : 'Play'}
      >
        {playbackState === 'playing' ? '\u275A\u275A' : '\u25B6'}
      </button>

      <div
        className="progress-bar"
        onClick={handleProgressClick}
        onKeyDown={handleProgressKeyDown}
        role="slider"
        aria-label="Playback progress"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(playbackConfig.duration)}`}
        tabIndex={0}
        title={`${Math.round(progress * 100)}%`}
      >
        <div className="progress-bar-fill" style={{ width: `${progress * 100}%` }} />
      </div>

      <span className="playback-time" aria-hidden="true">
        {formatTime(currentTime)} / {formatTime(playbackConfig.duration)}
      </span>

      <select
        className="speed-select"
        value={playbackConfig.speed}
        onChange={(e) => updatePlaybackConfig({ speed: parseFloat(e.target.value) })}
        title="Playback speed"
        aria-label="Playback speed"
      >
        <option value={0.25}>0.25x</option>
        <option value={0.5}>0.5x</option>
        <option value={1}>1x</option>
        <option value={1.5}>1.5x</option>
        <option value={2}>2x</option>
        <option value={4}>4x</option>
      </select>

      <button
        className={`btn btn-icon ${playbackConfig.loop ? 'btn-primary' : ''}`}
        onClick={() => updatePlaybackConfig({ loop: !playbackConfig.loop })}
        title={`Loop: ${playbackConfig.loop ? 'On' : 'Off'}`}
        aria-label={`Loop: ${playbackConfig.loop ? 'On' : 'Off'}`}
        aria-pressed={playbackConfig.loop}
      >
        &#8634;
      </button>
    </div>
  );
}
