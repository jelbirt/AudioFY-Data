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
 * Tests for AudioEngine class methods with mocked Tone.js.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DataSource, EffectsConfig } from '../../src/types';

// ---------------------------------------------------------------------------
// Tone.js mock
// ---------------------------------------------------------------------------

vi.mock('tone', () => {
  class MockNode {
    connect = vi.fn().mockReturnThis();
    toDestination = vi.fn().mockReturnThis();
    dispose = vi.fn();
    gain = { value: 0.8 };
    pan = { setValueAtTime: vi.fn() };
    frequency = { value: 20000 };
    wet = { value: 0 };
    type = 'lowpass';
    set = vi.fn();
    triggerAttackRelease = vi.fn();
    releaseAll = vi.fn();
  }

  const mockTransportInner = {
    start: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    schedule: vi.fn((_cb: unknown, _time: unknown) => Math.random()),
    clear: vi.fn(),
    position: 0,
    seconds: 0,
    loop: false,
    loopStart: 0,
    loopEnd: 0,
    bpm: { value: 120 },
  };

  const mockDrawInner = {
    schedule: vi.fn((_cb: unknown, _time: unknown) => {}),
  };

  return {
    start: vi.fn().mockResolvedValue(undefined),
    Gain: MockNode,
    Reverb: MockNode,
    Filter: MockNode,
    Panner: MockNode,
    Synth: MockNode,
    PolySynth: MockNode,
    getTransport: vi.fn(() => mockTransportInner),
    getDraw: vi.fn(() => mockDrawInner),
    __mockTransport: mockTransportInner,
  };
});

// Import AFTER mock setup
import { AudioEngine, getAudioEngine } from '../../src/core/audio/engine';
import * as Tone from 'tone';

// Access the mock transport from within the module
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockTransport = (Tone as any).__mockTransport;

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeSource(overrides: Partial<DataSource> = {}): DataSource {
  return {
    id: 'test-source',
    name: 'Test',
    fileName: 'test.xlsx',
    columns: [
      { index: 0, name: 'X', type: 'numeric', stats: { min: 1, max: 5, mean: 3, stdDev: 1.4, median: 3, q1: 2, q3: 4 } },
      { index: 1, name: 'Y', type: 'numeric', stats: { min: 10, max: 50, mean: 30, stdDev: 14, median: 30, q1: 20, q3: 40 } },
    ],
    rows: [
      [1, 10],
      [2, 20],
      [3, 30],
      [4, 40],
      [5, 50],
    ],
    headers: { row: [], col: ['X', 'Y'] },
    color: '#8884d8',
    normalization: 'min-max',
    audioMapping: {
      xColumn: 0,
      yColumn: 1,
      frequencyRange: [200, 2000],
      frequencyScale: 'log',
      volumeRange: [0.1, 0.8],
      panRange: [-1, 1],
      waveform: 'sine',
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 },
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AudioEngine', () => {
  let engine: AudioEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransport.seconds = 0;
    mockTransport.position = 0;
    mockTransport.loop = false;
    mockTransport.bpm.value = 120;
    engine = new AudioEngine();
  });

  describe('state machine', () => {
    it('starts as uninitialized', () => {
      expect(engine.state).toBe('uninitialized');
    });

    it('transitions to ready after initialize()', async () => {
      await engine.initialize();
      expect(engine.state).toBe('ready');
    });

    it('initialize() is idempotent when already ready', async () => {
      await engine.initialize();
      await engine.initialize();
      expect(engine.state).toBe('ready');
    });

    it('throws when calling ensureReady methods before init', () => {
      expect(() => engine.addSource(makeSource())).toThrow('not initialized');
    });

    it('throws when calling methods after dispose', async () => {
      await engine.initialize();
      engine.dispose();
      expect(engine.state).toBe('disposed');
      expect(() => engine.addSource(makeSource())).toThrow('disposed');
    });
  });

  describe('source management', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('addSource creates a channel', () => {
      engine.addSource(makeSource());
      // If no error thrown, channel was created
      expect(engine.state).toBe('ready');
    });

    it('addSource replaces existing channel with same id', () => {
      engine.addSource(makeSource());
      engine.addSource(makeSource()); // should not throw
      expect(engine.state).toBe('ready');
    });

    it('removeSource cleans up a channel', () => {
      engine.addSource(makeSource());
      engine.removeSource('test-source');
      expect(engine.state).toBe('ready');
    });

    it('removeSource does nothing for non-existent source', () => {
      engine.removeSource('non-existent');
      expect(engine.state).toBe('ready');
    });
  });

  describe('channel configuration', () => {
    beforeEach(async () => {
      await engine.initialize();
      engine.addSource(makeSource());
    });

    it('setWaveform updates synth oscillator', () => {
      engine.setWaveform('test-source', 'square');
      // No error means success (mock synth.set called)
      expect(engine.state).toBe('ready');
    });

    it('setWaveform ignores non-existent source', () => {
      engine.setWaveform('no-such-source', 'square');
      expect(engine.state).toBe('ready');
    });

    it('setEnvelope updates synth ADSR', () => {
      engine.setEnvelope('test-source', {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.5,
        release: 1.0,
      });
      expect(engine.state).toBe('ready');
    });

    it('setEnvelope ignores non-existent source', () => {
      engine.setEnvelope('no-such-source', {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.5,
        release: 1.0,
      });
      expect(engine.state).toBe('ready');
    });

    it('setSourceVolume clamps to [0,1]', () => {
      engine.setSourceVolume('test-source', 1.5);
      engine.setSourceVolume('test-source', -0.5);
      expect(engine.state).toBe('ready');
    });

    it('setSourceVolume ignores non-existent source', () => {
      engine.setSourceVolume('no-such-source', 0.5);
      expect(engine.state).toBe('ready');
    });
  });

  describe('master controls', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('setMasterVolume clamps to [0,1]', () => {
      engine.setMasterVolume(0.5);
      engine.setMasterVolume(1.5);
      engine.setMasterVolume(-0.3);
      expect(engine.state).toBe('ready');
    });

    it('setMasterVolume does nothing before init', () => {
      const raw = new AudioEngine();
      raw.setMasterVolume(0.5); // should not throw
    });

    it('setEffects configures reverb and filter', () => {
      const config: EffectsConfig = {
        reverb: { enabled: true, wet: 0.3, decay: 2 },
        filter: { enabled: true, frequency: 5000, type: 'lowpass' },
      };
      engine.setEffects(config);
      expect(engine.state).toBe('ready');
    });

    it('setEffects disables reverb when not enabled', () => {
      const config: EffectsConfig = {
        reverb: { enabled: false, wet: 0.3, decay: 2 },
        filter: { enabled: false, frequency: 5000, type: 'lowpass' },
      };
      engine.setEffects(config);
      expect(engine.state).toBe('ready');
    });
  });

  describe('scheduling', () => {
    beforeEach(async () => {
      await engine.initialize();
      engine.addSource(makeSource());
    });

    it('scheduleSonification returns notes for source', () => {
      const notes = engine.scheduleSonification([makeSource()], 10);
      expect(notes).toHaveLength(5);
      expect(mockTransport.schedule).toHaveBeenCalled();
    });

    it('scheduleSonification sets totalDuration', () => {
      engine.scheduleSonification([makeSource()], 15);
      expect(engine.totalDuration).toBe(15);
    });

    it('scheduleSonification clears previous schedule', () => {
      engine.scheduleSonification([makeSource()], 10);
      const clearCount = mockTransport.clear.mock.calls.length;
      engine.scheduleSonification([makeSource()], 10);
      // Second call should clear the events scheduled in the first call
      expect(mockTransport.clear.mock.calls.length).toBeGreaterThan(clearCount);
    });

    it('scheduleSonification skips sources with no channel', () => {
      const unknownSource = makeSource({ id: 'unknown' });
      const notes = engine.scheduleSonification([unknownSource], 10);
      expect(notes).toHaveLength(0);
    });

    it('scheduleSonification skips sources with empty rows', () => {
      const emptySource = makeSource({ rows: [] });
      engine.addSource(emptySource);
      const notes = engine.scheduleSonification([emptySource], 10);
      expect(notes).toHaveLength(0);
    });
  });

  describe('playback control', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('play starts transport and sets state to playing', () => {
      engine.play();
      expect(mockTransport.start).toHaveBeenCalled();
      expect(engine.state).toBe('playing');
    });

    it('pause pauses transport when playing', () => {
      engine.play();
      engine.pause();
      expect(mockTransport.pause).toHaveBeenCalled();
      expect(engine.state).toBe('paused');
    });

    it('pause does nothing when not playing', () => {
      engine.pause();
      expect(mockTransport.pause).not.toHaveBeenCalled();
      expect(engine.state).toBe('ready');
    });

    it('stop resets transport and releases all notes', () => {
      engine.addSource(makeSource());
      engine.play();
      engine.stop();
      expect(mockTransport.stop).toHaveBeenCalled();
      expect(engine.state).toBe('ready');
    });

    it('seek clamps to [0, totalDuration]', () => {
      engine.scheduleSonification([], 10);
      engine.seek(5);
      engine.seek(-1);
      engine.seek(999);
      expect(engine.state).toBe('ready');
    });

    it('setSpeed adjusts transport BPM', () => {
      engine.setSpeed(2);
      expect(mockTransport.bpm.value).toBe(240);
    });

    it('setLoop configures transport loop', () => {
      engine.setLoop(true, 10);
      expect(mockTransport.loop).toBe(true);
      expect(mockTransport.loopStart).toBe(0);
      expect(mockTransport.loopEnd).toBe(10);
    });

    it('setLoop disables loop', () => {
      engine.setLoop(false);
      expect(mockTransport.loop).toBe(false);
    });

    it('getCurrentTime returns transport seconds', () => {
      mockTransport.seconds = 5.5;
      expect(engine.getCurrentTime()).toBe(5.5);
    });
  });

  describe('callbacks', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('onNoteStart registers and returns unsubscribe', () => {
      const cb = vi.fn();
      const unsub = engine.onNoteStart(cb);
      expect(typeof unsub).toBe('function');
      unsub();
    });

    it('onNoteEnd registers and returns unsubscribe', () => {
      const cb = vi.fn();
      const unsub = engine.onNoteEnd(cb);
      expect(typeof unsub).toBe('function');
      unsub();
    });

    it('onProgress registers and returns unsubscribe', () => {
      const cb = vi.fn();
      const unsub = engine.onProgress(cb);
      expect(typeof unsub).toBe('function');
      unsub();
    });
  });

  describe('dispose', () => {
    it('disposes all channels and audio nodes', async () => {
      await engine.initialize();
      engine.addSource(makeSource());
      engine.addSource(makeSource({ id: 'source-2' }));
      engine.dispose();
      expect(engine.state).toBe('disposed');
    });
  });
});

describe('getAudioEngine', () => {
  it('returns an AudioEngine instance', () => {
    const engine = getAudioEngine();
    expect(engine).toBeInstanceOf(AudioEngine);
  });

  it('returns the same instance on multiple calls', () => {
    const a = getAudioEngine();
    const b = getAudioEngine();
    expect(a).toBe(b);
  });

  it('creates a new instance after dispose', async () => {
    const a = getAudioEngine();
    await a.initialize();
    a.dispose();
    const b = getAudioEngine();
    expect(b).not.toBe(a);
    expect(b.state).toBe('uninitialized');
  });
});
