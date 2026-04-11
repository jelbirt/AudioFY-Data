# AudioFY User Guide

This guide walks through the complete workflow: importing data, configuring sonification, playing back, and exporting results.

## Quick Start

1. Launch AudioFY (`npm run dev` for web, or `npm run tauri dev` for desktop)
2. Open a data file (Ctrl+O or the **Open File** button)
3. Press **Space** to play — you'll hear and see your data simultaneously

## Importing Data

### Supported Formats

| Format | Extensions |
|--------|-----------|
| Excel | `.xlsx`, `.xls` |
| CSV | `.csv` |
| TSV | `.tsv` |
| OpenDocument | `.ods` |
| JSON | `.json` |

### How to Import

**Option A — File dialog:** Click **Open File** in the toolbar or press `Ctrl+O` / `Cmd+O`.

**Option B — Drag and drop:** Drag a file directly onto the application window.

### Multi-sheet Files

If the file contains multiple sheets (common with `.xlsx`), a **sheet selection modal** appears:

1. Browse sheets using the dropdown
2. Preview the first 5 rows to confirm the correct sheet
3. Numeric columns are marked with `#` — you need at least 2 for sonification
4. Click **Confirm** to import or **Cancel** to abort

Single-sheet files import immediately without the modal.

### Header Detection

AudioFY automatically detects whether the first row contains column headers. If headers are found, they appear as column names in the data table and axis labels on the scatter plot.

## Working with Sources

Each imported file (or sheet) becomes a **data source**. You can load multiple sources simultaneously for comparison.

### Source List

The left sidebar shows all loaded sources. Click a source to select it — the settings panel will show its configuration. The active source is highlighted.

### Removing Sources

Click the remove button next to a source to delete it. AudioFY automatically selects the next available source.

## Configuring Sonification

Open the settings panel with the gear icon or `Ctrl+,` / `Cmd+,`.

### Column Mapping

- **X Column** — the data column mapped to time (playback order)
- **Y Column** — the data column mapped to pitch (frequency)

Change these at any time using the dropdowns. Only numeric columns are available.

### Frequency Settings

| Setting | Description | Range |
|---------|-------------|-------|
| **Frequency Scale** | How data values map to pitch | Logarithmic (default), Linear, MIDI |
| **Min Frequency** | Lowest pitch in Hz | 20 – 8,000 |
| **Max Frequency** | Highest pitch in Hz | 200 – 20,000 |

- **Logarithmic** — perceptually uniform spacing; recommended for most data
- **Linear** — direct proportional mapping; better for small ranges
- **MIDI** — quantizes to musical note frequencies

### Waveform

Choose the oscillator shape: sine, square, sawtooth, triangle, or FM/AM variants of each (e.g., fmsine, amsawtooth).

### Envelope (ADSR)

Controls how each note fades in and out:

| Parameter | Description | Default |
|-----------|-------------|---------|
| **Attack** | Fade-in time (seconds) | 0.02 |
| **Decay** | Time to reach sustain level | 0.1 |
| **Sustain** | Held volume level (0–1) | 0.3 |
| **Release** | Fade-out time after note ends | 0.5 |

### Normalization

How raw data values are scaled before mapping to audio:

| Mode | Best for |
|------|----------|
| **None** | Pre-normalized data |
| **Min-Max** | General use — scales to 0–1 range |
| **Z-Score** | Comparing distributions — centers on mean |
| **Robust (IQR)** | Data with outliers — uses median and interquartile range |
| **Log** | Exponentially distributed data |

### Color

Each source has an assigned color used consistently in the scatter plot, data table, and source list.

## Audio Effects

Global effects applied to all sources:

### Reverb
- **Enabled** — toggle on/off
- **Decay** — reverb tail length (0.1–30 seconds)
- **Wet** — mix level (0 = dry, 1 = fully wet)

### Filter
- **Enabled** — toggle on/off
- **Type** — lowpass, highpass, bandpass, notch, etc.
- **Frequency** — cutoff frequency (20–20,000 Hz)

### Chorus
- **Enabled** — toggle on/off
- **Rate** — modulation speed (0.1–10 Hz)
- **Depth** — modulation intensity (0–1)
- **Delay** — base delay time (0.2–20 ms)

## Playback

### Controls

| Control | Action |
|---------|--------|
| **Play/Pause** | Toggle playback (also: `Space`) |
| **Stop** | Stop and reset to beginning (`Escape`) |
| **Speed** | 0.25x to 4x playback speed |
| **Loop** | Toggle continuous looping |
| **Duration** | Total playback time (1–120 seconds) |
| **Seek** | Click the progress bar to jump to a position |

### What Happens During Playback

- The scatter plot highlights the current data point with an animated marker
- The data table auto-scrolls to the corresponding row
- Audio plays the mapped frequency, volume, and panning for each point in sequence

### Clicking Data Points

- Click a point on the scatter plot to seek playback to that data point
- Click a row in the data table to seek to that row's position

## Visualization

### Scatter Plot

- **Zoom** — scroll wheel
- **Pan** — click and drag
- **Tooltips** — hover over points to see values
- **Legend** — shows source names and colors (toggle in settings)
- **Grid** — toggle grid lines in settings
- **Point Size** — adjustable in settings (1–30)

### Data Table

- **Sort** — click column headers to sort ascending/descending
- **Stats Footer** — shows min, max, mean, and standard deviation per column
- **Virtual Scrolling** — handles large datasets efficiently

### Theme

Toggle between light and dark themes in the visualization settings. AudioFY also respects your system's `prefers-color-scheme` setting on first load.

## Exporting

### Audio Export

Click the **Export Audio** button in the toolbar. This records the full playback and downloads a **WebM (Opus)** audio file.

### Image Export

- **Export SVG** — vector format, scalable, editable in Illustrator/Inkscape
- **Export PNG** — raster format at 2x resolution for high-DPI displays

## Saving and Loading Projects

### Save

`Ctrl+S` / `Cmd+S` or the **Save** button. Downloads an `audiofy-project.json` file containing:

- All source configurations (file paths, column mappings, colors, normalization, audio mappings)
- Playback settings (speed, loop, duration)
- Visualization settings (theme, grid, legend, point size)
- Audio settings (master volume, effects)

**Note:** Project files store configuration only, not the raw data. You'll need the original data files available when loading a project.

### Load

Click the **Load** button and select a previously saved `.json` project file. AudioFY validates the config against its schema and restores playback, visualization, and audio settings. Older config versions (v1 or missing version) are automatically migrated. If validation fails, you'll see an error message with details.

**Current limitation:** Loading a project restores settings (playback speed, effects, theme, etc.) but does not automatically re-import data sources. You'll need to re-open your data files manually after loading a project.

## Troubleshooting

### Audio doesn't play
- Browsers require a user gesture (click/keypress) before playing audio. Click anywhere in the app first, then try playing.
- Check that master volume is above 0 in the audio settings.
- Ensure the frequency range makes sense (min < max, both in audible range).

### File won't import
- Confirm the file is a supported format (xlsx, csv, tsv, ods, json).
- The file must contain at least 2 numeric columns for sonification.
- Large files may take a moment — parsing runs in a background thread to keep the UI responsive.

### Scatter plot is empty
- Check that the selected X and Y columns contain numeric data.
- If all values are identical, the plot may appear as a single point.

### Project won't load
- Project files must match the current config schema (version 2). Older files are automatically migrated when possible.
- Check the error message for specific validation failures (e.g., missing fields, out-of-range values).

### Desktop (Tauri) vs. Web
- In the desktop app, file dialogs use native OS dialogs.
- In the web version, standard browser file pickers are used as a fallback.
- All core functionality works in both environments.
