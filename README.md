# AudioFY

**Data sonification and visualization desktop application** — transforms tabular data into synchronized audio and animated scatter plots, letting you *hear* and *see* your data at the same time.

The active codebase is in [**`audiofy-next/`**](audiofy-next/README.md) — a Tauri v2 + React + TypeScript desktop app supporting Windows, macOS, and Linux.

## Quick start

```bash
cd audiofy-next
npm install
npm run tauri dev
```

See [`audiofy-next/README.md`](audiofy-next/README.md) for full setup, features, and documentation.

## History

This repository began in 2023 as a Java Swing prototype developed during the Summer 2023 Aisiku Research Fellowship at Worcester State University. That original Java codebase has been archived — the final commit containing it is preserved under the `legacy-java` git tag:

```bash
git checkout legacy-java
```

`audiofy-next` is a ground-up rewrite in TypeScript. Key improvements over the original:

- 32-bit float audio at 48 kHz (was 8-bit at 16,384 Hz)
- Polyphonic synthesis with ADSR envelopes (was monophonic sine with click artifacts)
- Frame-accurate audio-visual synchronization (was busy-wait threading)
- Multi-format file support — xlsx, xls, csv, tsv, json (was Excel-only)
- Full keyboard accessibility and screen-reader support
- Cross-platform desktop builds at ~10–15 MB (was Windows-only)

## License

GPL-3.0 — see [LICENSE.md](LICENSE.md).

## Contact

Original author: Jacob Elbirt — jelbirt@worcester.edu
