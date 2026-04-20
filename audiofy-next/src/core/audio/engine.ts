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
 * Audio Engine — wraps Tone.js for data sonification.
 *
 * Manages per-source polyphonic synths, frequency/volume/pan mapping,
 * ADSR envelopes, effects chain, and playback lifecycle.
 */
import * as Tone from 'tone';
import type { DataSource, AudioMapping, ADSR, EffectsConfig, OscillatorType } from '@types';
import {
  normalize,
  mapToFrequencyLog,
  mapToFrequencyLinear,
  mapToFrequencyMidi,
  mapToRange,
} from '@core/data';

export type AudioEngineState = 'uninitialized' | 'ready' | 'playing' | 'paused' | 'disposed';

export interface SourceChannel {
  synth: Tone.PolySynth;
  panner: Tone.Panner;
  gain: Tone.Gain;
}

export interface ScheduledNote {
  sourceId: string;
  pointIndex: number;
  frequency: number;
  velocity: number;
  pan: number;
  time: number;
  duration: number;
}

export type NoteCallback = (sourceId: string, pointIndex: number, time: number) => void;

export class AudioEngine {
  private channels: Map<string, SourceChannel> = new Map();
  private masterGain: Tone.Gain | null = null;
  private reverb: Tone.Reverb | null = null;
  private chorus: Tone.Chorus | null = null;
  private filter: Tone.Filter | null = null;
  private scheduledEvents: number[] = [];
  private _state: AudioEngineState = 'uninitialized';
  private _initPromise: Promise<void> | null = null;
  private _scheduleGeneration = 0;
  private _onNoteStart: NoteCallback[] = [];
  private _onNoteEnd: NoteCallback[] = [];
  private _totalDuration = 0;

  get state(): AudioEngineState {
    return this._state;
  }

  get totalDuration(): number {
    return this._totalDuration;
  }

  /**
   * Initialize the audio context. Must be called after a user gesture.
   */
  async initialize(timeoutMs = 10000): Promise<void> {
    if (this._state !== 'uninitialized') return;

    // Guard against concurrent init calls
    if (this._initPromise) return this._initPromise;

    this._initPromise = (async () => {
      try {
        await Promise.race([
          Tone.start(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Audio context initialization timed out')), timeoutMs),
          ),
        ]);
      } catch (err) {
        this._initPromise = null;
        throw new Error(
          `Failed to start audio context: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      this.masterGain = new Tone.Gain(0.8).toDestination();
      this.reverb = new Tone.Reverb({ decay: 2, wet: 0 }).connect(this.masterGain);
      this.chorus = new Tone.Chorus({ frequency: 1.5, delayTime: 3.5, depth: 0.7, wet: 0 })
        .connect(this.reverb)
        .start();
      this.filter = new Tone.Filter({ frequency: 20000, type: 'lowpass' }).connect(this.chorus);

      this._state = 'ready';
    })();

    return this._initPromise;
  }

  /**
   * Add a data source as an audio channel with its own synth and panner.
   */
  addSource(source: DataSource): void {
    this.ensureReady();
    this.removeSource(source.id);

    const panner = new Tone.Panner(0);
    const initialVolume = Number.isFinite(source.audioMapping.sourceVolume)
      ? Math.max(0, Math.min(1, source.audioMapping.sourceVolume))
      : 1;
    const gain = new Tone.Gain(initialVolume);

    const synth = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 16,
      oscillator: { type: source.audioMapping.waveform },
      envelope: {
        attack: source.audioMapping.envelope.attack,
        decay: source.audioMapping.envelope.decay,
        sustain: source.audioMapping.envelope.sustain,
        release: source.audioMapping.envelope.release,
      },
    });

    synth.connect(gain);
    gain.connect(panner);
    panner.connect(this.filter!);

    this.channels.set(source.id, { synth, panner, gain });
  }

  /**
   * Remove a source channel and clean up its audio nodes.
   */
  removeSource(sourceId: string): void {
    const channel = this.channels.get(sourceId);
    if (channel) {
      channel.synth.dispose();
      channel.panner.dispose();
      channel.gain.dispose();
      this.channels.delete(sourceId);
    }
  }

  /**
   * Update the waveform for a source.
   */
  setWaveform(sourceId: string, waveform: OscillatorType): void {
    const channel = this.channels.get(sourceId);
    if (channel) {
      channel.synth.set({ oscillator: { type: waveform } });
    }
  }

  /**
   * Update the ADSR envelope for a source.
   */
  setEnvelope(sourceId: string, envelope: ADSR): void {
    const channel = this.channels.get(sourceId);
    if (channel) {
      channel.synth.set({ envelope });
    }
  }

  /**
   * Update the volume for a source (0-1).
   */
  setSourceVolume(sourceId: string, volume: number): void {
    const channel = this.channels.get(sourceId);
    if (channel) {
      const safeVolume = Number.isFinite(volume) ? volume : 0;
      channel.gain.gain.value = Math.max(0, Math.min(1, safeVolume));
    }
  }

  /**
   * Set master volume (0-1).
   */
  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Configure effects chain.
   */
  setEffects(config: EffectsConfig): void {
    if (this.reverb) {
      this.reverb.wet.value = config.reverb.enabled ? config.reverb.wet : 0;
    }
    if (this.chorus && config.chorus) {
      this.chorus.wet.value = config.chorus.enabled ? 1 : 0;
      if (config.chorus.enabled) {
        this.chorus.frequency.value = config.chorus.frequency;
        this.chorus.delayTime = config.chorus.delayTime;
        this.chorus.depth = config.chorus.depth;
      }
    }
    if (this.filter) {
      this.filter.frequency.value = config.filter.enabled ? config.filter.frequency : 20000;
      this.filter.type = config.filter.type;
    }
  }

  /**
   * Schedule sonification for all sources. Returns the total duration.
   *
   * @param sources Data sources to sonify
   * @param playbackDuration Total duration in seconds for the sonification
   * @returns Array of scheduled notes for sync controller use
   */
  scheduleSonification(sources: DataSource[], playbackDuration: number): ScheduledNote[] {
    this.ensureReady();
    this.clearSchedule();

    const transport = Tone.getTransport();
    const allNotes: ScheduledNote[] = [];
    const generation = ++this._scheduleGeneration;

    for (const source of sources) {
      const channel = this.channels.get(source.id);
      if (!channel || source.rows.length === 0) continue;

      const notes = computeNotes(source, playbackDuration);
      allNotes.push(...notes);

      for (const note of notes) {
        const eventId = transport.schedule((time) => {
          // Set panner position for this note
          channel.panner.pan.setValueAtTime(note.pan, time);

          // Trigger the note
          channel.synth.triggerAttackRelease(note.frequency, note.duration, time, note.velocity);

          // Fire callbacks (via Tone.Draw for visual sync)
          // Use generation check to skip stale callbacks after stop/re-prepare
          Tone.getDraw().schedule(() => {
            if (this._scheduleGeneration !== generation) return;
            this._onNoteStart.forEach((cb) => cb(source.id, note.pointIndex, time));
          }, time);

          Tone.getDraw().schedule(() => {
            if (this._scheduleGeneration !== generation) return;
            this._onNoteEnd.forEach((cb) => cb(source.id, note.pointIndex, time));
          }, time + note.duration);
        }, note.time);

        this.scheduledEvents.push(eventId);
      }
    }

    this._totalDuration = playbackDuration;
    return allNotes;
  }

  /**
   * Start playback.
   */
  play(): void {
    this.ensureReady();
    if (this._state === 'playing') return;
    const transport = Tone.getTransport();
    transport.start();
    this._state = 'playing';
  }

  /**
   * Pause playback.
   */
  pause(): void {
    if (this._state !== 'playing') return;
    Tone.getTransport().pause();
    this._state = 'paused';
  }

  /**
   * Stop playback and reset position.
   */
  stop(): void {
    const transport = Tone.getTransport();
    transport.stop();
    transport.position = 0;

    // Invalidate stale Tone.Draw callbacks
    this._scheduleGeneration++;

    // Release all active notes
    for (const channel of this.channels.values()) {
      channel.synth.releaseAll();
    }

    this._state = 'ready';
  }

  /**
   * Seek to a specific time in seconds.
   */
  seek(time: number): void {
    Tone.getTransport().seconds = Math.max(0, Math.min(time, this._totalDuration));
  }

  /**
   * Set playback speed multiplier.
   */
  setSpeed(multiplier: number): void {
    Tone.getTransport().bpm.value = 120 * multiplier;
  }

  /**
   * Set loop mode.
   */
  setLoop(enabled: boolean, duration?: number): void {
    const transport = Tone.getTransport();
    transport.loop = enabled;
    if (enabled && duration) {
      transport.loopStart = 0;
      transport.loopEnd = duration;
    }
  }

  /**
   * Register callbacks.
   */
  onNoteStart(callback: NoteCallback): () => void {
    this._onNoteStart.push(callback);
    return () => {
      this._onNoteStart = this._onNoteStart.filter((cb) => cb !== callback);
    };
  }

  onNoteEnd(callback: NoteCallback): () => void {
    this._onNoteEnd.push(callback);
    return () => {
      this._onNoteEnd = this._onNoteEnd.filter((cb) => cb !== callback);
    };
  }

  /**
   * Get current playback position in seconds.
   */
  getCurrentTime(): number {
    return Tone.getTransport().seconds;
  }

  /**
   * Clean up all audio resources.
   */
  dispose(): void {
    this.clearSchedule();
    for (const channel of this.channels.values()) {
      channel.synth.dispose();
      channel.panner.dispose();
      channel.gain.dispose();
    }
    this.channels.clear();
    this.reverb?.dispose();
    this.chorus?.dispose();
    this.filter?.dispose();
    this.masterGain?.dispose();
    this._onNoteStart = [];
    this._onNoteEnd = [];
    this._state = 'disposed';
  }

  private clearSchedule(): void {
    const transport = Tone.getTransport();
    for (const id of this.scheduledEvents) {
      transport.clear(id);
    }
    this.scheduledEvents = [];
  }

  private ensureReady(): void {
    if (this._state === 'uninitialized') {
      throw new Error('AudioEngine not initialized. Call initialize() first.');
    }
    if (this._state === 'disposed') {
      throw new Error('AudioEngine has been disposed.');
    }
  }
}

/**
 * Compute scheduled notes for a data source.
 */
export function computeNotes(source: DataSource, totalDuration: number): ScheduledNote[] {
  const mapping = source.audioMapping;
  const rows = source.rows;
  const numPoints = rows.length;

  if (numPoints === 0 || totalDuration <= 0) return [];

  // Validate mapping ranges — ensure they are finite and ordered
  const [freqLo, freqHi] = mapping.frequencyRange;
  if (!Number.isFinite(freqLo) || !Number.isFinite(freqHi) || freqLo <= 0 || freqHi <= 0) {
    return [];
  }
  const [volLo, volHi] = mapping.volumeRange;
  if (!Number.isFinite(volLo) || !Number.isFinite(volHi)) return [];
  const [panLo, panHi] = mapping.panRange;
  if (!Number.isFinite(panLo) || !Number.isFinite(panHi)) return [];

  // Find the column indices in the numeric-only rows array
  const xColIdx = source.columns.findIndex((c) => c.index === mapping.xColumn);
  const yColIdx = source.columns.findIndex((c) => c.index === mapping.yColumn);

  if (xColIdx === -1 || yColIdx === -1) return [];

  // Extract values for mapping
  const yValues = rows.map((row) => row[yColIdx]);
  const xValues = rows.map((row) => row[xColIdx]);

  // Normalize Y values for frequency mapping
  const normalizedY = normalize(yValues, source.normalization);

  // Normalize X values for panning
  const normalizedX = normalize(xValues, 'min-max');

  // Note duration: spread evenly across total duration
  const noteSpacing = totalDuration / numPoints;
  const noteDuration = Math.max(0.05, noteSpacing * 0.8); // 80% of spacing, min 50ms

  const notes: ScheduledNote[] = [];
  for (let i = 0; i < rows.length; i++) {
    // Skip rows where the mapped X or Y cell was missing/non-numeric. These
    // rows contribute no audio — they exist in the source for alignment with
    // the original spreadsheet but carry no sonifiable value on the chosen
    // axes. Time slots stay reserved so overall playback duration is
    // preserved.
    if (Number.isNaN(xValues[i]) || Number.isNaN(yValues[i])) continue;

    const frequency = mapFrequency(normalizedY[i], mapping);
    const velocity = mapToRange(
      Math.max(0, Math.min(1, normalizedY[i])),
      mapping.volumeRange[0],
      mapping.volumeRange[1],
    );
    const pan = mapToRange(normalizedX[i], mapping.panRange[0], mapping.panRange[1]);

    notes.push({
      sourceId: source.id,
      pointIndex: i,
      frequency,
      velocity: Math.max(0, Math.min(1, velocity)),
      pan: Math.max(-1, Math.min(1, pan)),
      time: i * noteSpacing,
      duration: noteDuration,
    });
  }
  return notes;
}

/**
 * Map a normalized value to frequency based on the mapping's scale type.
 */
function mapFrequency(normalizedValue: number, mapping: AudioMapping): number {
  const clamped = Math.max(0, Math.min(1, normalizedValue));
  const [minHz, maxHz] = mapping.frequencyRange;

  switch (mapping.frequencyScale) {
    case 'log':
      return mapToFrequencyLog(clamped, minHz, maxHz);
    case 'linear':
      return mapToFrequencyLinear(clamped, minHz, maxHz);
    case 'midi': {
      // Convert Hz range to approximate MIDI range
      const minMidi = Math.round(12 * Math.log2(minHz / 440) + 69);
      const maxMidi = Math.round(12 * Math.log2(maxHz / 440) + 69);
      return mapToFrequencyMidi(clamped, minMidi, maxMidi);
    }
    default:
      return mapToFrequencyLog(clamped, minHz, maxHz);
  }
}

/**
 * Singleton-ish factory for convenience.
 */
let _instance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!_instance || _instance.state === 'disposed') {
    _instance = new AudioEngine();
  }
  return _instance;
}

/** Reset singleton (for testing). */
export function _resetAudioEngine(): void {
  if (_instance) {
    if (_instance.state !== 'disposed') {
      _instance.dispose();
    }
    _instance = null;
  }
}
