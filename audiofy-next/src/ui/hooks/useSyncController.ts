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
 * useSyncController — manages SyncController lifecycle and pipes state to the store.
 */
import { useEffect, useRef, useCallback } from 'react';
import { SyncController } from '@core/sync';
import type { AudioEngine } from '@core/audio';
import { useAppStore } from '@store';

export function useSyncController(getEngine: () => AudioEngine | null) {
  const controllerRef = useRef<SyncController | null>(null);
  const syncState = useAppStore((s) => s.syncState);
  const playbackConfig = useAppStore((s) => s.playbackConfig);
  const sources = useAppStore((s) => s.sources);

  /**
   * Ensure a SyncController exists and is wired to the current engine.
   */
  const getController = useCallback((): SyncController | null => {
    const engine = getEngine();
    if (!engine) return null;

    if (!controllerRef.current) {
      const ctrl = new SyncController(engine, {
        defaultDuration: playbackConfig.duration,
        defaultSpeed: playbackConfig.speed,
        defaultLoop: playbackConfig.loop,
      });

      // Pipe sync state changes into the Zustand store
      ctrl.onStateChange((state) => {
        syncState({
          playbackState: state.playbackState,
          currentTime: state.currentTime,
          progress: state.progress,
          activePoints: state.activePoints,
        });
      });

      controllerRef.current = ctrl;
    }

    return controllerRef.current;
  }, [getEngine, syncState, playbackConfig]);

  /**
   * Prepare sources for playback (schedule sonification).
   */
  const prepare = useCallback(() => {
    const ctrl = getController();
    if (!ctrl || sources.length === 0) return;
    ctrl.prepare(sources, playbackConfig.duration);
  }, [getController, sources, playbackConfig.duration]);

  const play = useCallback(() => getController()?.play(), [getController]);
  const pause = useCallback(() => getController()?.pause(), [getController]);
  const stop = useCallback(() => getController()?.stop(), [getController]);
  const togglePlayPause = useCallback(() => getController()?.togglePlayPause(), [getController]);
  const seek = useCallback((time: number) => getController()?.seek(time), [getController]);
  const seekProgress = useCallback(
    (progress: number) => getController()?.seekProgress(progress),
    [getController],
  );

  // Sync playback config changes to controller
  useEffect(() => {
    const ctrl = controllerRef.current;
    if (!ctrl) return;
    ctrl.setSpeed(playbackConfig.speed);
    ctrl.setLoop(playbackConfig.loop);
  }, [playbackConfig.speed, playbackConfig.loop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      controllerRef.current?.dispose();
      controllerRef.current = null;
    };
  }, []);

  return {
    getController,
    prepare,
    play,
    pause,
    stop,
    togglePlayPause,
    seek,
    seekProgress,
  };
}
