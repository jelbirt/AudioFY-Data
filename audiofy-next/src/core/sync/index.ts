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
 * Synchronization Controller — bridges the Audio Engine and Visualization Engine.
 *
 * Uses AudioContext.currentTime as master clock. Manages:
 * - Playback lifecycle (play/pause/stop/seek/speed/loop)
 * - Active point tracking via audio engine callbacks
 * - Progress polling via requestAnimationFrame
 * - Scheduled note lookup for scrubbing
 */
import type { DataSource, ActivePoint, PlaybackState } from '@types';
import type { AudioEngine, ScheduledNote } from '@core/audio';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SyncStateCallback = (state: SyncState) => void;

export interface SyncState {
  /** Current playback state */
  playbackState: PlaybackState;
  /** Current time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  totalDuration: number;
  /** Progress 0–1 */
  progress: number;
  /** Currently active (sounding) points */
  activePoints: ActivePoint[];
  /** Playback speed multiplier */
  speed: number;
  /** Whether loop is enabled */
  loop: boolean;
}

export interface SyncControllerOptions {
  /** Default playback duration in seconds */
  defaultDuration?: number;
  /** Default speed multiplier */
  defaultSpeed?: number;
  /** Default loop state */
  defaultLoop?: boolean;
}

// ---------------------------------------------------------------------------
// Pure helpers (testable)
// ---------------------------------------------------------------------------

/**
 * Given sorted notes and a current time, find all notes currently sounding.
 * A note is active if time >= note.time && time < note.time + note.duration.
 *
 * Notes MUST be sorted by time for the early-exit optimization.
 * If unsorted input is suspected, call sortNotesByTime() first.
 */
export function findActivePoints(notes: ScheduledNote[], currentTime: number): ActivePoint[] {
  const active: ActivePoint[] = [];

  for (const note of notes) {
    // Early exit: all remaining notes are in the future (relies on sorted input)
    if (note.time > currentTime) break;

    if (currentTime >= note.time && currentTime < note.time + note.duration) {
      active.push({ sourceId: note.sourceId, pointIndex: note.pointIndex });
    }
  }

  return active;
}

/**
 * Compute progress from current time and total duration.
 */
export function computeProgress(currentTime: number, totalDuration: number): number {
  if (totalDuration <= 0) return 0;
  return Math.max(0, Math.min(1, currentTime / totalDuration));
}

/**
 * Sort notes by time for efficient lookup.
 */
export function sortNotesByTime(notes: ScheduledNote[]): ScheduledNote[] {
  return [...notes].sort((a, b) => a.time - b.time);
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export class SyncController {
  private engine: AudioEngine;
  private scheduledNotes: ScheduledNote[] = [];
  private animFrameId: number | null = null;
  private listeners: SyncStateCallback[] = [];
  private _state: SyncState;
  private unsubNoteStart: (() => void) | null = null;
  private unsubNoteEnd: (() => void) | null = null;

  constructor(engine: AudioEngine, options: SyncControllerOptions = {}) {
    this.engine = engine;
    this._state = {
      playbackState: 'stopped',
      currentTime: 0,
      totalDuration: options.defaultDuration ?? 10,
      progress: 0,
      activePoints: [],
      speed: options.defaultSpeed ?? 1,
      loop: options.defaultLoop ?? false,
    };
  }

  /** Current sync state (read-only snapshot) */
  get state(): Readonly<SyncState> {
    return this._state;
  }

  /**
   * Subscribe to state changes. Returns unsubscribe function.
   */
  onStateChange(callback: SyncStateCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Load sources into the audio engine and prepare for playback.
   */
  prepare(sources: DataSource[], duration?: number): void {
    const dur = duration ?? this._state.totalDuration;

    // Add sources to engine
    for (const src of sources) {
      this.engine.addSource(src);
    }

    // Schedule sonification and capture notes
    const notes = this.engine.scheduleSonification(sources, dur);
    this.scheduledNotes = sortNotesByTime(notes);

    // Set loop if enabled
    this.engine.setLoop(this._state.loop, dur);

    // Update state
    this.updateState({ totalDuration: dur, currentTime: 0, progress: 0 });

    // Register engine callbacks for event-driven note tracking
    // Clean up any existing callbacks from a previous prepare() call
    if (this.unsubNoteStart) {
      this.unsubNoteStart();
      this.unsubNoteStart = null;
    }
    if (this.unsubNoteEnd) {
      this.unsubNoteEnd();
      this.unsubNoteEnd = null;
    }

    this.unsubNoteStart = this.engine.onNoteStart((sourceId, pointIndex, _time) => {
      const existing = this._state.activePoints;
      if (!existing.some((ap) => ap.sourceId === sourceId && ap.pointIndex === pointIndex)) {
        this.updateState({
          activePoints: [...existing, { sourceId, pointIndex }],
        });
      }
    });

    this.unsubNoteEnd = this.engine.onNoteEnd((sourceId, pointIndex, _time) => {
      this.updateState({
        activePoints: this._state.activePoints.filter(
          (ap) => !(ap.sourceId === sourceId && ap.pointIndex === pointIndex),
        ),
      });
    });
  }

  /**
   * Start or resume playback.
   */
  play(): void {
    if (this._state.playbackState === 'playing') return;

    this.engine.play();
    this.updateState({ playbackState: 'playing' });
    this.startProgressLoop();
  }

  /**
   * Pause playback.
   */
  pause(): void {
    if (this._state.playbackState !== 'playing') return;

    this.engine.pause();
    this.updateState({ playbackState: 'paused' });
    this.stopProgressLoop();
  }

  /**
   * Stop playback and reset to beginning.
   */
  stop(): void {
    this.engine.stop();
    this.stopProgressLoop();
    this.updateState({
      playbackState: 'stopped',
      currentTime: 0,
      progress: 0,
      activePoints: [],
    });
  }

  /**
   * Toggle between play and pause.
   */
  togglePlayPause(): void {
    if (this._state.playbackState === 'playing') {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Seek to a specific time.
   */
  seek(time: number): void {
    const clampedTime = Math.max(0, Math.min(time, this._state.totalDuration));
    this.engine.seek(clampedTime);

    // Recalculate active points at the seek position
    const activePoints = findActivePoints(this.scheduledNotes, clampedTime);
    const progress = computeProgress(clampedTime, this._state.totalDuration);

    this.updateState({ currentTime: clampedTime, progress, activePoints });
  }

  /**
   * Seek to a progress value (0–1).
   */
  seekProgress(progress: number): void {
    const time = Math.max(0, Math.min(1, progress)) * this._state.totalDuration;
    this.seek(time);
  }

  /**
   * Set playback speed.
   */
  setSpeed(multiplier: number): void {
    const clamped = Math.max(0.25, Math.min(4, multiplier));
    this.engine.setSpeed(clamped);
    this.updateState({ speed: clamped });
  }

  /**
   * Set loop mode.
   */
  setLoop(enabled: boolean): void {
    this.engine.setLoop(enabled, this._state.totalDuration);
    this.updateState({ loop: enabled });
  }

  /**
   * Set playback duration and re-prepare if sources exist.
   */
  setDuration(duration: number): void {
    this.updateState({ totalDuration: Math.max(1, duration) });
  }

  /**
   * Clean up all resources.
   */
  dispose(): void {
    this.stopProgressLoop();
    if (this.unsubNoteStart) {
      this.unsubNoteStart();
      this.unsubNoteStart = null;
    }
    if (this.unsubNoteEnd) {
      this.unsubNoteEnd();
      this.unsubNoteEnd = null;
    }
    this.listeners = [];
    this.scheduledNotes = [];
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  /**
   * The rAF progress loop — polls AudioContext.currentTime for continuous updates.
   */
  private startProgressLoop(): void {
    this.stopProgressLoop();

    const tick = () => {
      if (this._state.playbackState !== 'playing') return;

      let currentTime: number;
      try {
        currentTime = this.engine.getCurrentTime();
      } catch {
        // Engine may have been disposed mid-playback
        this.stop();
        return;
      }
      const progress = computeProgress(currentTime, this._state.totalDuration);

      // Determine active points from the scheduled notes
      const activePoints = findActivePoints(this.scheduledNotes, currentTime);

      // Check if playback has finished
      if (currentTime >= this._state.totalDuration && !this._state.loop) {
        this.stop();
        return;
      }

      this.updateState({ currentTime, progress, activePoints });
      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  private stopProgressLoop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private updateState(partial: Partial<SyncState>): void {
    this._state = { ...this._state, ...partial };
    for (const listener of this.listeners) {
      listener(this._state);
    }
  }
}
