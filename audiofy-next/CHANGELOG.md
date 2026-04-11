# Changelog

All notable changes to AudioFY are documented here.

## [Unreleased]

### Added — Phase 3: Performance
- **Virtualized data table** — renders only visible rows with a 10-row overscan buffer, enabling smooth scrolling for large datasets. Added `aria-rowindex` and `aria-rowcount` for accessibility.
- **Optimized scatter plot rendering** — decoupled SVG structure setup from data point updates. Changing data sources no longer triggers a full SVG rebuild.
- **Web Worker file parsing** — `parseFile()` runs in a background thread via `parser.worker.ts` to keep the UI responsive during import. Falls back to synchronous parsing when Workers are unavailable.

### Added — Phase 2: Core UX
- **Sheet selection modal** — when importing multi-sheet files (xlsx, ods), a modal lets users preview each sheet's first 5 rows and select which one to import. Numeric columns are marked with `#`, and a warning appears if fewer than 2 numeric columns are found.
- **X/Y column selectors** — dropdowns in the settings panel to remap which columns are used for the X and Y axes without re-importing.
- **Save/Load projects** — Save button (or `Ctrl+S`) exports all settings to an `audiofy-project.json` file. Load button restores settings from a previously saved file with full Zod schema validation.
- **Expanded test coverage** — added tests for audio export, store operations (pending import, column mapping, config restoration), bringing the suite to 277 tests.

### Added — Phase 1: Quick Wins
- **Chart/table interaction** — clicking a scatter plot point or data table row now seeks playback to that data point's position.
- **Chorus effect** — fully wired Tone.Chorus node in the audio engine with UI controls (rate, depth, delay) in the settings panel.

### Changed — Phase 1
- **Export naming** — corrected UI labels from "WAV" to "Audio (WebM/Opus)" to match the actual export format.

### Removed — Phase 1
- Unused `ProgressCallback` type and `onProgress` method from AudioEngine.
- Unused `onPlay`/`onPause` props from PlaybackControls and Toolbar.
- Deprecated `exportWAV` alias (use `exportAudio`).

### Fixed — Third Audit Pass (55 total fixes across 3 passes)
- Store `parsedFiles` converted from `Map` to `Record` for JSON serialization.
- `removeSource` now auto-selects the next source and cleans orphaned parsed files.
- `useSyncController` stale closure over `playbackConfig` fixed with ref pattern.
- `computeNotes` validates `audioMapping` before accessing properties.
- `exportAudio` differentiates between user cancellation and recording errors.
- `useFileImport` exhaustive-deps lint fix.
- `SourceList` live region for screen reader announcements on selection changes.
- Error banner focus management for accessibility.
- Drop zone `aria-dropeffect` and `aria-label` attributes.
- `useKeyboardShortcuts` ref pattern to register listener only once.

## [0.1.0] — Initial Release

### Added
- Multi-format data import (xlsx, xls, csv, tsv, ods, json) with automatic header detection
- Data sonification with configurable frequency mapping, waveforms (12 types), and ADSR envelopes
- Interactive D3.js scatter plot with zoom, pan, tooltips, and legend
- Synchronized data table with sorting, statistics footer, and color-coded rows
- Audio-visual sync via AudioContext master clock with lookahead scheduling
- Multiple normalization modes (min-max, z-score, robust/IQR, log)
- Frequency mapping scales (logarithmic, linear, MIDI-constrained)
- Polyphonic playback with up to 16 voices and spatial panning
- Playback controls (play/pause/stop, speed 0.25x-4x, loop, seek)
- Audio effects (reverb, filter)
- Export to SVG, PNG (2x resolution), and audio (WebM/Opus)
- Light/dark theme with `prefers-color-scheme` detection
- Full keyboard accessibility with ARIA landmarks and `prefers-reduced-motion` support
- Zustand state management with configuration persistence via Zod-validated JSON schemas
- Tauri v2 desktop shell for cross-platform builds (Windows, macOS, Linux)
