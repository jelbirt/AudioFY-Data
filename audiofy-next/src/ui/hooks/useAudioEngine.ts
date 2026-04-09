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
 * useAudioEngine — manages AudioEngine lifecycle and keeps store in sync.
 */
import { useEffect, useRef, useCallback } from 'react';
import { AudioEngine, getAudioEngine } from '@core/audio';
import { useAppStore } from '@store';

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);
  const setAudioInitialized = useAppStore((s) => s.setAudioInitialized);
  const audioConfig = useAppStore((s) => s.audioConfig);
  const audioInitialized = useAppStore((s) => s.audioInitialized);

  const initialize = useCallback(async () => {
    if (engineRef.current?.state === 'ready' || engineRef.current?.state === 'playing') {
      return engineRef.current;
    }
    const engine = getAudioEngine();
    await engine.initialize();
    engineRef.current = engine;
    setAudioInitialized(true);
    return engine;
  }, [setAudioInitialized]);

  const getEngine = useCallback((): AudioEngine | null => {
    return engineRef.current;
  }, []);

  // Sync master volume + effects when audioConfig changes or engine initializes
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || engine.state === 'uninitialized' || engine.state === 'disposed') return;

    engine.setMasterVolume(audioConfig.masterVolume);
    engine.setEffects(audioConfig.effects);
  }, [audioConfig, audioInitialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  return { initialize, getEngine, audioInitialized };
}
