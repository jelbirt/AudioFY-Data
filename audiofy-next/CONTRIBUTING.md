# Contributing to AudioFY

Thank you for your interest in contributing to AudioFY. This document covers development setup, testing, and coding conventions.

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [Rust](https://rustup.rs/) >= 1.70 (for Tauri desktop builds)
- Platform-specific Tauri dependencies — see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

### Installation

```bash
git clone https://github.com/jelbirt/AudioFy.git
cd AudioFy/audiofy-next
npm install
```

### Running

```bash
# Web development (no Rust required)
npm run dev

# Desktop development (requires Rust + Tauri deps)
npm run tauri dev
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (web only) |
| `npm run build` | TypeScript check + Vite production build |
| `npm run preview` | Preview the production build locally |
| `npm run tauri dev` | Launch Tauri desktop app in dev mode |
| `npm run tauri build` | Build platform-specific installer |
| `npm run test` | Run unit + integration tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with V8 coverage report |
| `npm run test:e2e` | Run end-to-end tests (Playwright) |
| `npm run test:e2e:ui` | Run E2E tests with Playwright UI |
| `npm run lint` | Run ESLint on `src/` |
| `npm run typecheck` | TypeScript type checking (no emit) |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting without writing |

## Testing

### Running Tests

```bash
# All tests
npm run test

# Watch mode (re-runs on file changes)
npm run test:watch

# With coverage
npm run test:coverage
```

### Test Structure

```
tests/
├── unit/           # Unit tests for individual modules
├── integration/    # Integration tests for combined systems
└── e2e/            # End-to-end tests (Playwright)
```

Tests use [Vitest](https://vitest.dev/) with [jsdom](https://github.com/jsdom/jsdom) as the DOM environment. React components are tested with [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/).

### Mocking

External dependencies that require browser APIs are mocked:

- **Tone.js** — mocked in test setup files (see existing mock patterns in `tests/unit/`)
- **D3** — mocked for component tests that render SVG
- **Tauri APIs** — mocked to allow tests to run without the Rust backend

### Writing Tests

- Place unit tests in `tests/unit/` with the naming pattern `*.test.ts` or `*.test.tsx`
- Integration tests go in `tests/integration/`
- Each test file should import from the module under test, not from barrel exports
- Use `describe` blocks to group related tests and `it` for individual cases

## Code Quality Checks

Before submitting changes, ensure all three checks pass:

```bash
npm run typecheck    # TypeScript — must be clean
npm run lint         # ESLint — 0 errors, 0 warnings
npm run test         # Vitest — all tests pass
```

## Project Architecture

```
src/
├── core/                   # Framework-agnostic business logic
│   ├── data/               # File parsing, normalization, frequency mapping
│   │   ├── parser.ts       # SheetJS file parsing
│   │   ├── parser.worker.ts # Web Worker for off-thread parsing
│   │   ├── parseAsync.ts   # Promise-based worker API
│   │   └── index.ts        # buildDataSource, createDataSource
│   ├── audio/              # Tone.js audio engine
│   │   └── engine.ts       # AudioEngine class (synth, effects, scheduling)
│   ├── visualization/      # D3 scatter plot, virtualized data table
│   ├── sync/               # Audio-visual synchronization controller
│   ├── config/             # Zod schemas, save/load, migration
│   └── export/             # SVG, PNG, audio export
├── ui/
│   ├── components/         # React UI components
│   ├── hooks/              # Custom hooks (sync, file import, shortcuts)
│   └── styles/             # CSS with light/dark theme support
├── store/                  # Zustand state management
├── types/                  # TypeScript interfaces and type definitions
├── App.tsx                 # Main application component
└── main.tsx                # Entry point
```

### Key Conventions

- **`core/` is framework-agnostic** — no React imports. This code should work in any JS environment.
- **`ui/` contains React-specific code** — components, hooks, styles.
- **State flows through Zustand** — the store in `src/store/index.ts` is the single source of truth.
- **Types are centralized** in `src/types/index.ts`.

## Coding Style

- TypeScript strict mode
- Prettier for formatting (run `npm run format` before committing)
- ESLint with React Hooks and React Refresh plugins
- Functional components with hooks (no class components except ErrorBoundary)
- Named exports preferred over default exports

## Commit Guidelines

- Use descriptive commit messages that explain the "why"
- Group related changes into a single commit
- Ensure all checks pass before committing

## License

By contributing, you agree that your contributions will be licensed under the [GNU General Public License v3.0](LICENSE).
