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
import type { ADSR, OscillatorType } from '@types';

interface PrevSourceSnapshot {
  waveform: OscillatorType;
  envelope: ADSR;
  sourceVolume: number;
}

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);
  const setAudioInitialized = useAppStore((s) => s.setAudioInitialized);
  const audioConfig = useAppStore((s) => s.audioConfig);
  const audioInitialized = useAppStore((s) => s.audioInitialized);
  const sources = useAppStore((s) => s.sources);
  const prevSourcesRef = useRef<Map<string, PrevSourceSnapshot>>(new Map());

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

  // Diff sources: remove channels for deleted sources, propagate per-source
  // audio-mapping changes (waveform, envelope) to the engine.
  useEffect(() => {
    const engine = engineRef.current;
    const prev = prevSourcesRef.current;
    const currentIds = new Set(sources.map((s) => s.id));

    // Removals: call engine.removeSource for any previously-tracked id
    // that's gone now. Safe regardless of engine state — the engine's own
    // guard skips if no channel exists.
    for (const id of prev.keys()) {
      if (!currentIds.has(id)) {
        if (engine && engine.state !== 'uninitialized' && engine.state !== 'disposed') {
          engine.removeSource(id);
        }
        prev.delete(id);
      }
    }

    // Diff per-source mapping against prior snapshot and invoke setters.
    // `sourceVolume` drives the per-source Tone.Gain node (post-synth, pre-panner);
    // `volumeRange` is a separate concept — per-note velocity at schedule time.
    for (const source of sources) {
      const snapshot = prev.get(source.id);
      const { waveform, envelope, sourceVolume } = source.audioMapping;
      const engineReady =
        engine && engine.state !== 'uninitialized' && engine.state !== 'disposed';

      if (snapshot) {
        if (engineReady) {
          if (snapshot.waveform !== waveform) engine!.setWaveform(source.id, waveform);
          if (
            snapshot.envelope.attack !== envelope.attack ||
            snapshot.envelope.decay !== envelope.decay ||
            snapshot.envelope.sustain !== envelope.sustain ||
            snapshot.envelope.release !== envelope.release
          ) {
            engine!.setEnvelope(source.id, envelope);
          }
          if (snapshot.sourceVolume !== sourceVolume) {
            engine!.setSourceVolume(source.id, sourceVolume);
          }
        }
      }

      prev.set(source.id, { waveform, envelope, sourceVolume });
    }
  }, [sources, audioInitialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
      prevSourcesRef.current.clear();
    };
  }, []);

  return { initialize, getEngine, audioInitialized };
}
