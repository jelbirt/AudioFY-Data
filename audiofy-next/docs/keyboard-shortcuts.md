# Keyboard Shortcuts

All shortcuts work globally except when focus is inside a text input, textarea, or select element.

## Playback

| Shortcut | Action |
|----------|--------|
| `Space` | Toggle play / pause |
| `Escape` | Stop playback and reset to beginning |

## File Operations

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` / `Cmd+O` | Open file dialog |
| `Ctrl+S` / `Cmd+S` | Save settings to JSON |

## Interface

| Shortcut | Action |
|----------|--------|
| `Ctrl+,` / `Cmd+,` | Toggle settings panel |

## Scatter Plot

| Input | Action |
|-------|--------|
| Scroll wheel | Zoom in/out |
| Click + drag | Pan the view |
| Click point | Seek playback to that data point |

## Data Table

| Input | Action |
|-------|--------|
| Click column header | Sort by column (toggle asc/desc) |
| Click row | Seek playback to that row |

## Accessibility Notes

- AudioFY supports full keyboard navigation through all interactive elements via `Tab` / `Shift+Tab`.
- ARIA landmarks and live regions provide screen reader feedback for source selection changes and errors.
- The `prefers-reduced-motion` media query is respected — animations are disabled when the user's OS requests it.
