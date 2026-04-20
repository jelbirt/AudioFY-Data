# Settings Configuration Format

AudioFY settings files are JSON documents with a `.json` extension (conventionally named `audiofy-settings.json`). They store playback, visualization, and audio configuration — they do **not** store data sources or raw data, so original spreadsheet files must be re-opened after loading settings.

## Schema Version

The current schema version is **2**. Files with `version: 1` or no version field are automatically migrated to version 2 on load.

## Top-Level Structure

```json
{
  "version": 2,
  "sources": [ ... ],
  "playback": { ... },
  "visualization": { ... },
  "audio": { ... }
}
```

## Sources

Each source represents one imported data file/sheet and its sonification configuration.

```json
{
  "filePath": "/path/to/data.csv",
  "sheetName": "Sheet1",
  "xColumn": 0,
  "yColumn": 1,
  "color": "#4e79a7",
  "normalization": "min-max",
  "audioMapping": {
    "xColumn": 0,
    "yColumn": 1,
    "frequencyRange": [200, 2000],
    "frequencyScale": "log",
    "volumeRange": [0.1, 0.8],
    "panRange": [-0.8, 0.8],
    "waveform": "sine",
    "envelope": {
      "attack": 0.02,
      "decay": 0.1,
      "sustain": 0.3,
      "release": 0.5
    },
    "sourceVolume": 1.0
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `filePath` | string | Path to the original data file (required, non-empty) |
| `sheetName` | string? | Sheet name for multi-sheet files (optional) |
| `xColumn` | integer | Original column index for X axis (>= 0) |
| `yColumn` | integer | Original column index for Y axis (>= 0) |
| `color` | string | Hex color code (`#RRGGBB` format) |
| `normalization` | enum | `"none"`, `"min-max"`, `"z-score"`, `"robust"`, `"log"` |

### Audio Mapping

| Field | Type | Description |
|-------|------|-------------|
| `xColumn` | integer | Column index mapped to time |
| `yColumn` | integer | Column index mapped to pitch |
| `frequencyRange` | [number, number] | Min and max frequency in Hz (20–20,000) |
| `frequencyScale` | enum | `"log"`, `"linear"`, `"midi"` |
| `volumeRange` | [number, number] | Min and max volume (0–1) |
| `panRange` | [number, number] | Stereo pan range. Allowed: -1.0 (full left) to 1.0 (full right). Default: `[-0.8, 0.8]`. |
| `waveform` | enum | `"sine"`, `"square"`, `"sawtooth"`, `"triangle"`, or FM/AM variants |
| `envelope` | object | ADSR envelope (see below) |
| `sourceVolume` | number | Per-source output gain, 0–1. Default: `1.0`. Applied to the source's gain node post-synth; distinct from `volumeRange` (per-note velocity) and `masterVolume` (global output). |

### ADSR Envelope

| Field | Type | Range | Default |
|-------|------|-------|---------|
| `attack` | number | 0–10 seconds | 0.02 |
| `decay` | number | 0–10 seconds | 0.1 |
| `sustain` | number | 0–1 | 0.3 |
| `release` | number | 0–30 seconds | 0.5 |

> **Note:** The schema allows the full ranges above for interoperability. The UI sliders expose a practical subset: attack/decay up to 1s, release up to 3s, duration up to 120s, point size 2–20, min frequency 20–8,000 Hz, max frequency 200–20,000 Hz.

## Playback

```json
{
  "speed": 1,
  "loop": false,
  "duration": 10
}
```

| Field | Type | Range | Default |
|-------|------|-------|---------|
| `speed` | number | 0.25–4 | 1 |
| `loop` | boolean | — | false |
| `duration` | number | 1–600 seconds | 10 |

## Visualization

```json
{
  "theme": "light",
  "showGrid": true,
  "showLegend": true,
  "pointSize": 6
}
```

| Field | Type | Options | Default |
|-------|------|---------|---------|
| `theme` | enum | `"light"`, `"dark"` | `"light"` |
| `showGrid` | boolean | — | true |
| `showLegend` | boolean | — | true |
| `pointSize` | number | 1–30 | 6 |

## Audio

```json
{
  "masterVolume": 0.8,
  "effects": {
    "reverb": { "enabled": false, "decay": 2, "wet": 0.3 },
    "filter": { "enabled": false, "frequency": 20000, "type": "lowpass" },
    "chorus": { "enabled": false, "frequency": 4, "delayTime": 2.5, "depth": 0.5 }
  }
}
```

| Field | Type | Range | Default |
|-------|------|-------|---------|
| `masterVolume` | number | 0–1 | 0.8 |

### Effects: Reverb

| Field | Type | Range | Default |
|-------|------|-------|---------|
| `enabled` | boolean | — | false |
| `decay` | number | 0.1–30 seconds | 2 |
| `wet` | number | 0–1 | 0.3 |

### Effects: Filter

| Field | Type | Range | Default |
|-------|------|-------|---------|
| `enabled` | boolean | — | false |
| `frequency` | number | 20–20,000 Hz | 20000 |
| `type` | enum | `"lowpass"`, `"highpass"`, `"bandpass"`, `"lowshelf"`, `"highshelf"`, `"peaking"`, `"notch"`, `"allpass"` | `"lowpass"` |

### Effects: Chorus

| Field | Type | Range | Default |
|-------|------|-------|---------|
| `enabled` | boolean | — | false |
| `frequency` | number | 0.1–100 Hz | 4 |
| `delayTime` | number | 0–100 ms | 2.5 |
| `depth` | number | 0–1 | 0.5 |

## Validation

All config files are validated at load time using [Zod](https://zod.dev/) schemas. If validation fails, AudioFY reports specific errors (e.g., `"audio.effects.reverb.decay: Number must be greater than or equal to 0.1"`).

## Migration

Configs with `version: 1` or missing version fields are automatically migrated:
- Missing fields are filled with defaults
- The migrated config is re-validated through the schema
- If migration fails, the app falls back to a fresh default config

## Waveform Types

The full set of supported oscillator types:

| Category | Types |
|----------|-------|
| Basic | `sine`, `square`, `sawtooth`, `triangle` |
| FM synthesis | `fmsine`, `fmsquare`, `fmsawtooth`, `fmtriangle` |
| AM synthesis | `amsine`, `amsquare`, `amsawtooth`, `amtriangle` |
