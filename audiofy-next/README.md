# AudioFY

**Data sonification and visualization desktop application.**

AudioFY takes tabular data (Excel, CSV, TSV, ODS, JSON) and simultaneously presents it as an animated scatter plot, synchronized data table, and sonified audio — allowing users to *hear* and *see* their data at the same time.

Built with [Tauri v2](https://v2.tauri.app/), [React](https://react.dev/), [Tone.js](https://tonejs.github.io/), and [D3.js](https://d3js.org/).

## Features

- **Multi-format import** — xlsx, xls, csv, tsv, ods, json with automatic header detection
- **Data sonification** — Maps data values to frequency, volume, and stereo panning with configurable waveforms (sine, square, sawtooth, triangle) and full ADSR envelopes
- **Interactive scatter plot** — D3.js SVG with zoom/pan, color-coded multi-source rendering, animated point highlighting during playback, tooltips, and legend
- **Synchronized data table** — Auto-scrolling, sortable columns, statistical footer, color-coded rows matching the scatter plot
- **Audio-visual sync** — AudioContext.currentTime master clock with lookahead scheduling and Tone.Draw.schedule() for frame-accurate visual updates
- **Multiple normalization modes** — Min-max, z-score, robust (IQR), and log transform
- **Frequency mapping** — Logarithmic (perceptually uniform), linear, and MIDI scale-constrained
- **Polyphonic playback** — Up to 16 simultaneous voices per data source with spatial audio panning
- **Playback controls** — Play/pause/stop, speed (0.25x–4x), loop, seek/scrub
- **Configuration persistence** — Save/load `.audiofy` config files with versioned JSON schema and Zod validation
- **Export** — SVG, PNG (2x resolution), and audio (WebM) export
- **Light/dark theme** — Automatic detection via `prefers-color-scheme` with manual toggle
- **Keyboard accessible** — Full keyboard navigation, ARIA landmarks, screen reader support, `prefers-reduced-motion` respect
- **Cross-platform** — Windows (.msi), macOS (.dmg), Linux (.AppImage, .deb) — ~10-15 MB bundle

## Architecture

```
Tauri Shell (Rust backend — file I/O, native dialogs)
  └── React App (TypeScript frontend)
        ├── Data Pipeline      — SheetJS parsing, normalization, frequency mapping
        ├── Audio Engine       — Tone.js PolySynth, ADSR, effects chain, Transport
        ├── Visualization      — D3.js SVG scatter plot + synchronized data table
        ├── Sync Controller    — Master clock, lookahead scheduler, visual sync
        ├── Config Manager     — Zod schemas, versioned JSON, save/load
        └── UI Shell           — Zustand store, React components, keyboard shortcuts
```

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [Rust](https://rustup.rs/) >= 1.70
- Platform-specific Tauri dependencies — see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/jelbirt/AudioFy.git
cd AudioFy/audiofy-next

# Install dependencies
npm install

# Run in development mode (web only)
npm run dev

# Run with Tauri desktop shell
npm run tauri dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + Vite production build |
| `npm run tauri dev` | Launch Tauri desktop app in dev mode |
| `npm run tauri build` | Build platform-specific installer |
| `npm run test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting |
| `npm run typecheck` | TypeScript type checking |

## Project Structure

```
audiofy-next/
├── src/
│   ├── core/
│   │   ├── data/           # File parsing, normalization, frequency mapping
│   │   ├── audio/          # Tone.js audio engine
│   │   ├── visualization/  # D3 scatter plot, data table
│   │   ├── sync/           # Audio-visual synchronization
│   │   ├── config/         # Configuration schemas and persistence
│   │   └── export/         # SVG/PNG/audio export
│   ├── ui/
│   │   ├── components/     # React UI components
│   │   ├── hooks/          # Custom React hooks
│   │   └── styles/         # CSS with light/dark themes
│   ├── store/              # Zustand state management
│   ├── types/              # TypeScript type definitions
│   ├── App.tsx             # Main application component
│   └── main.tsx            # Entry point
├── src-tauri/              # Rust backend (Tauri v2)
├── tests/
│   ├── unit/               # Unit tests (Vitest)
│   ├── integration/        # Integration tests
│   └── e2e/                # End-to-end tests
└── .github/workflows/      # CI/CD pipeline
```

## Background

AudioFY originated as a research fellowship project at Worcester State University (2023), built as a Java Swing desktop application. This is a ground-up rebuild replacing all Java code with a modern web-native architecture while preserving the core concept: simultaneous auditory and visual data representation.

Key improvements over the original:
- 32-bit float audio at 48kHz (was 8-bit at 16384Hz)
- Polyphonic synthesis with ADSR envelopes (was monophonic sine waves with click artifacts)
- Frame-accurate audio-visual synchronization (was busy-wait threading)
- Multi-format file support (was Excel-only)
- Full keyboard accessibility and screen reader support
- Cross-platform desktop builds at ~10-15MB (was Windows-only)

## License

AudioFY is licensed under the [GNU General Public License v3.0](LICENSE).

Copyright (C) 2026 Jordan Elbirt
