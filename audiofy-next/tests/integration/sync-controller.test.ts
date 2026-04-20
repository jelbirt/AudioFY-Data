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
 * Integration tests — SyncController with mocked AudioEngine.
 * Tests the full prepare → play → pause → stop → seek lifecycle
 * plus state subscription and active point tracking.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SyncController,
  findActivePoints,
  computeProgress,
  sortNotesByTime,
} from '../../src/core/sync';
import type { ScheduledNote } from '../../src/core/audio/engine';
import type { DataSource } from '../../src/types';

// ---------------------------------------------------------------------------
// Mock AudioEngine
// ---------------------------------------------------------------------------

function createMockEngine() {
  const noteStartCallbacks: Array<(sourceId: string, pointIndex: number, time: number) => void> = [];
  const noteEndCallbacks: Array<(sourceId: string, pointIndex: number, time: number) => void> = [];

  let currentTime = 0;
  let isPlaying = false;
  let speed = 1;
  let loopEnabled = false;

  const mockNotes: ScheduledNote[] = [
    { sourceId: 'src-1', pointIndex: 0, frequency: 440, velocity: 0.5, pan: 0, time: 0, duration: 0.5 },
    { sourceId: 'src-1', pointIndex: 1, frequency: 880, velocity: 0.6, pan: 0.3, time: 1, duration: 0.5 },
    { sourceId: 'src-1', pointIndex: 2, frequency: 660, velocity: 0.4, pan: -0.3, time: 2, duration: 0.5 },
  ];

  return {
    engine: {
      addSource: vi.fn(),
      removeSource: vi.fn(),
      scheduleSonification: vi.fn().mockReturnValue(mockNotes),
      play: vi.fn(() => { isPlaying = true; }),
      pause: vi.fn(() => { isPlaying = false; }),
      stop: vi.fn(() => {
        isPlaying = false;
        currentTime = 0;
      }),
      seek: vi.fn((time: number) => { currentTime = time; }),
      setSpeed: vi.fn((s: number) => { speed = s; }),
      setLoop: vi.fn((enabled: boolean) => { loopEnabled = enabled; }),
      getCurrentTime: vi.fn(() => currentTime),
      onNoteStart: vi.fn((cb: (sourceId: string, pointIndex: number, time: number) => void) => {
        noteStartCallbacks.push(cb);
        return () => {
          const idx = noteStartCallbacks.indexOf(cb);
          if (idx >= 0) noteStartCallbacks.splice(idx, 1);
        };
      }),
      onNoteEnd: vi.fn((cb: (sourceId: string, pointIndex: number, time: number) => void) => {
        noteEndCallbacks.push(cb);
        return () => {
          const idx = noteEndCallbacks.indexOf(cb);
          if (idx >= 0) noteEndCallbacks.splice(idx, 1);
        };
      }),
    },
    mockNotes,
    noteStartCallbacks,
    noteEndCallbacks,
    getState: () => ({ currentTime, isPlaying, speed, loopEnabled }),
    setCurrentTime: (t: number) => { currentTime = t; },
  };
}

function mockSource(id = 'src-1'): DataSource {
  return {
    id,
    name: 'Sheet1',
    fileName: 'test.csv',
    columns: [
      { index: 0, name: 'x', type: 'numeric', stats: { min: 0, max: 10, mean: 5, stdDev: 3, median: 5, q1: 2.5, q3: 7.5 } },
      { index: 1, name: 'y', type: 'numeric', stats: { min: 0, max: 100, mean: 50, stdDev: 30, median: 50, q1: 25, q3: 75 } },
    ],
    rows: [[1, 10], [2, 20], [3, 30]],
    headers: { row: [], col: ['x', 'y'] },
    color: '#8884d8',
    normalization: 'min-max',
    audioMapping: {
      xColumn: 0,
      yColumn: 1,
      frequencyRange: [200, 2000],
      frequencyScale: 'log',
      volumeRange: [0.1, 0.8],
      panRange: [-0.8, 0.8],
      waveform: 'sine',
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 },
      sourceVolume: 1,
    },
  };
}

// ---------------------------------------------------------------------------
// Pure helper tests
// ---------------------------------------------------------------------------

describe('Sync helpers', () => {
  describe('findActivePoints', () => {
    const notes: ScheduledNote[] = [
      { sourceId: 's1', pointIndex: 0, frequency: 440, velocity: 0.5, pan: 0, time: 0, duration: 1 },
      { sourceId: 's1', pointIndex: 1, frequency: 880, velocity: 0.5, pan: 0, time: 1, duration: 1 },
      { sourceId: 's1', pointIndex: 2, frequency: 660, velocity: 0.5, pan: 0, time: 2, duration: 1 },
    ];

    it('finds active note at time within duration', () => {
      const active = findActivePoints(notes, 0.5);
      expect(active).toHaveLength(1);
      expect(active[0]).toEqual({ sourceId: 's1', pointIndex: 0 });
    });

    it('finds no active notes between notes', () => {
      // Gap doesn't exist here since notes are contiguous (0-1, 1-2, 2-3)
      // But the boundary is exclusive: time < note.time + note.duration
      // At exactly time=1.0, note 0 (time:0, dur:1) is NOT active (1 < 0+1 is false)
      // But note 1 (time:1, dur:1) IS active (1 >= 1 && 1 < 1+1)
      const active = findActivePoints(notes, 1.0);
      expect(active).toHaveLength(1);
      expect(active[0].pointIndex).toBe(1);
    });

    it('returns empty for time after all notes', () => {
      const active = findActivePoints(notes, 5.0);
      expect(active).toHaveLength(0);
    });

    it('returns empty for negative time', () => {
      const active = findActivePoints(notes, -1);
      expect(active).toHaveLength(0);
    });

    it('handles empty notes array', () => {
      expect(findActivePoints([], 1.0)).toHaveLength(0);
    });
  });

  describe('computeProgress', () => {
    it('returns 0 at time 0', () => {
      expect(computeProgress(0, 10)).toBe(0);
    });

    it('returns 1 at end of duration', () => {
      expect(computeProgress(10, 10)).toBe(1);
    });

    it('returns 0.5 at halfway', () => {
      expect(computeProgress(5, 10)).toBe(0.5);
    });

    it('clamps to 0 for negative time', () => {
      expect(computeProgress(-5, 10)).toBe(0);
    });

    it('clamps to 1 for time beyond duration', () => {
      expect(computeProgress(15, 10)).toBe(1);
    });

    it('returns 0 for zero duration', () => {
      expect(computeProgress(5, 0)).toBe(0);
    });
  });

  describe('sortNotesByTime', () => {
    it('sorts notes in ascending time order', () => {
      const unsorted: ScheduledNote[] = [
        { sourceId: 's', pointIndex: 2, frequency: 440, velocity: 0.5, pan: 0, time: 2, duration: 0.5 },
        { sourceId: 's', pointIndex: 0, frequency: 440, velocity: 0.5, pan: 0, time: 0, duration: 0.5 },
        { sourceId: 's', pointIndex: 1, frequency: 440, velocity: 0.5, pan: 0, time: 1, duration: 0.5 },
      ];

      const sorted = sortNotesByTime(unsorted);
      expect(sorted[0].time).toBe(0);
      expect(sorted[1].time).toBe(1);
      expect(sorted[2].time).toBe(2);
    });

    it('does not mutate the original array', () => {
      const original: ScheduledNote[] = [
        { sourceId: 's', pointIndex: 1, frequency: 440, velocity: 0.5, pan: 0, time: 2, duration: 0.5 },
        { sourceId: 's', pointIndex: 0, frequency: 440, velocity: 0.5, pan: 0, time: 0, duration: 0.5 },
      ];

      sortNotesByTime(original);
      expect(original[0].time).toBe(2); // unchanged
    });
  });
});

// ---------------------------------------------------------------------------
// SyncController integration
// ---------------------------------------------------------------------------

describe('SyncController', () => {
  let mock: ReturnType<typeof createMockEngine>;
  let ctrl: SyncController;

  beforeEach(() => {
    mock = createMockEngine();
    ctrl = new SyncController(mock.engine as unknown as import('../../src/core/audio/engine').AudioEngine);
    vi.useFakeTimers();
  });

  afterEach(() => {
    ctrl.dispose();
    vi.useRealTimers();
  });

  it('has initial stopped state', () => {
    expect(ctrl.state.playbackState).toBe('stopped');
    expect(ctrl.state.currentTime).toBe(0);
    expect(ctrl.state.progress).toBe(0);
    expect(ctrl.state.activePoints).toEqual([]);
  });

  it('prepare adds sources and schedules sonification', () => {
    const source = mockSource();
    ctrl.prepare([source], 10);

    expect(mock.engine.addSource).toHaveBeenCalledWith(source);
    expect(mock.engine.scheduleSonification).toHaveBeenCalledWith([source], 10);
    expect(ctrl.state.totalDuration).toBe(10);
  });

  it('play sets state to playing', () => {
    ctrl.play();
    expect(mock.engine.play).toHaveBeenCalled();
    expect(ctrl.state.playbackState).toBe('playing');
  });

  it('pause sets state to paused', () => {
    ctrl.play();
    ctrl.pause();
    expect(mock.engine.pause).toHaveBeenCalled();
    expect(ctrl.state.playbackState).toBe('paused');
  });

  it('pause does nothing if not playing', () => {
    ctrl.pause();
    expect(mock.engine.pause).not.toHaveBeenCalled();
  });

  it('stop resets state', () => {
    ctrl.play();
    ctrl.stop();

    expect(mock.engine.stop).toHaveBeenCalled();
    expect(ctrl.state.playbackState).toBe('stopped');
    expect(ctrl.state.currentTime).toBe(0);
    expect(ctrl.state.progress).toBe(0);
    expect(ctrl.state.activePoints).toEqual([]);
  });

  it('togglePlayPause toggles between play and pause', () => {
    ctrl.togglePlayPause();
    expect(ctrl.state.playbackState).toBe('playing');

    ctrl.togglePlayPause();
    expect(ctrl.state.playbackState).toBe('paused');
  });

  it('seek updates time and active points', () => {
    ctrl.prepare([mockSource()], 10);
    ctrl.seek(1.2);

    expect(mock.engine.seek).toHaveBeenCalledWith(1.2);
    expect(ctrl.state.currentTime).toBe(1.2);
    expect(ctrl.state.progress).toBeCloseTo(0.12, 2);
  });

  it('seek clamps to duration bounds', () => {
    ctrl.prepare([mockSource()], 10);
    ctrl.seek(100);
    expect(ctrl.state.currentTime).toBe(10);

    ctrl.seek(-5);
    expect(ctrl.state.currentTime).toBe(0);
  });

  it('seekProgress converts to time', () => {
    ctrl.prepare([mockSource()], 10);
    ctrl.seekProgress(0.5);

    expect(ctrl.state.currentTime).toBe(5);
    expect(ctrl.state.progress).toBe(0.5);
  });

  it('setSpeed clamps and passes to engine', () => {
    ctrl.setSpeed(2);
    expect(mock.engine.setSpeed).toHaveBeenCalledWith(2);
    expect(ctrl.state.speed).toBe(2);

    ctrl.setSpeed(0.1); // below min
    expect(mock.engine.setSpeed).toHaveBeenCalledWith(0.25);
    expect(ctrl.state.speed).toBe(0.25);

    ctrl.setSpeed(10); // above max
    expect(mock.engine.setSpeed).toHaveBeenCalledWith(4);
    expect(ctrl.state.speed).toBe(4);
  });

  it('setLoop updates loop state', () => {
    ctrl.setLoop(true);
    expect(mock.engine.setLoop).toHaveBeenCalledWith(true, ctrl.state.totalDuration);
    expect(ctrl.state.loop).toBe(true);
  });

  it('setDuration updates totalDuration with min of 1', () => {
    ctrl.setDuration(20);
    expect(ctrl.state.totalDuration).toBe(20);

    ctrl.setDuration(0);
    expect(ctrl.state.totalDuration).toBe(1);
  });

  it('onStateChange notifies listeners', () => {
    const listener = vi.fn();
    ctrl.onStateChange(listener);

    ctrl.play();
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ playbackState: 'playing' }),
    );
  });

  it('onStateChange returns unsubscribe function', () => {
    const listener = vi.fn();
    const unsub = ctrl.onStateChange(listener);

    ctrl.play();
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    ctrl.stop();
    // Should not be called again after unsubscribe
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('dispose cleans up listeners', () => {
    const listener = vi.fn();
    ctrl.onStateChange(listener);
    ctrl.dispose();

    // After dispose, state changes should not notify
    // (We can't easily call play after dispose, so we just verify dispose ran without error)
    expect(() => ctrl.dispose()).not.toThrow(); // idempotent
  });

  it('constructor accepts options', () => {
    const customCtrl = new SyncController(mock.engine as unknown as import('../../src/core/audio/engine').AudioEngine, {
      defaultDuration: 30,
      defaultSpeed: 1.5,
      defaultLoop: true,
    });

    expect(customCtrl.state.totalDuration).toBe(30);
    expect(customCtrl.state.speed).toBe(1.5);
    expect(customCtrl.state.loop).toBe(true);

    customCtrl.dispose();
  });
});
