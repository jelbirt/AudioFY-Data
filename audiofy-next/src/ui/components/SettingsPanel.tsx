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
 * SettingsPanel — source audio mapping, visualization, and audio config.
 * All form controls have proper label associations for screen readers.
 */
import { useAppStore } from '@store';
import type { OscillatorType, NormalizationMode, FrequencyScale } from '@types';

const WAVEFORMS: OscillatorType[] = [
  'sine',
  'square',
  'sawtooth',
  'triangle',
  'fmsine',
  'fmsquare',
  'fmsawtooth',
  'fmtriangle',
  'amsine',
  'amsquare',
  'amsawtooth',
  'amtriangle',
];

const NORMALIZATIONS: NormalizationMode[] = ['none', 'min-max', 'z-score', 'robust', 'log'];
const FREQ_SCALES: FrequencyScale[] = ['log', 'linear', 'midi'];

export function SettingsPanel() {
  const sources = useAppStore((s) => s.sources);
  const selectedSourceId = useAppStore((s) => s.selectedSourceId);
  const updateSourceMapping = useAppStore((s) => s.updateSourceMapping);
  const updateSourceNormalization = useAppStore((s) => s.updateSourceNormalization);
  const updateSourceColor = useAppStore((s) => s.updateSourceColor);
  const visualizationConfig = useAppStore((s) => s.visualizationConfig);
  const updateVisualizationConfig = useAppStore((s) => s.updateVisualizationConfig);
  const audioConfig = useAppStore((s) => s.audioConfig);
  const updateAudioConfig = useAppStore((s) => s.updateAudioConfig);
  const playbackConfig = useAppStore((s) => s.playbackConfig);
  const updatePlaybackConfig = useAppStore((s) => s.updatePlaybackConfig);

  const selectedSource = sources.find((s) => s.id === selectedSourceId);

  return (
    <div className="settings-panel" role="form" aria-label="Settings">
      {/* --- Source Settings --- */}
      {selectedSource && (
        <>
          <div className="sidebar-section-title">Source: {selectedSource.name}</div>

          <div className="setting-group">
            <label className="setting-label" htmlFor="setting-color">
              Color
            </label>
            <input
              id="setting-color"
              type="color"
              className="setting-input"
              value={selectedSource.color}
              onChange={(e) => updateSourceColor(selectedSource.id, e.target.value)}
              style={{ height: 28, padding: 2 }}
            />
          </div>

          <div className="setting-group">
            <label className="setting-label" htmlFor="setting-waveform">
              Waveform
            </label>
            <select
              id="setting-waveform"
              className="setting-select"
              value={selectedSource.audioMapping.waveform}
              onChange={(e) =>
                updateSourceMapping(selectedSource.id, {
                  waveform: e.target.value as OscillatorType,
                })
              }
            >
              {WAVEFORMS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          <div className="setting-group">
            <label className="setting-label" htmlFor="setting-normalization">
              Normalization
            </label>
            <select
              id="setting-normalization"
              className="setting-select"
              value={selectedSource.normalization}
              onChange={(e) =>
                updateSourceNormalization(selectedSource.id, e.target.value as NormalizationMode)
              }
            >
              {NORMALIZATIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="setting-group">
            <label className="setting-label" htmlFor="setting-freq-scale">
              Frequency Scale
            </label>
            <select
              id="setting-freq-scale"
              className="setting-select"
              value={selectedSource.audioMapping.frequencyScale}
              onChange={(e) =>
                updateSourceMapping(selectedSource.id, {
                  frequencyScale: e.target.value as FrequencyScale,
                })
              }
            >
              {FREQ_SCALES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="setting-group" role="group" aria-label="Frequency range">
            <label className="setting-label">
              Frequency Range: {selectedSource.audioMapping.frequencyRange[0]}–
              {selectedSource.audioMapping.frequencyRange[1]} Hz
            </label>
            <div className="setting-row">
              <label htmlFor="setting-freq-min" style={{ fontSize: 11 }}>
                Min
              </label>
              <input
                id="setting-freq-min"
                type="range"
                className="setting-range"
                min={20}
                max={8000}
                value={selectedSource.audioMapping.frequencyRange[0]}
                aria-label={`Minimum frequency: ${selectedSource.audioMapping.frequencyRange[0]} Hz`}
                onChange={(e) =>
                  updateSourceMapping(selectedSource.id, {
                    frequencyRange: [
                      parseInt(e.target.value),
                      selectedSource.audioMapping.frequencyRange[1],
                    ],
                  })
                }
              />
            </div>
            <div className="setting-row">
              <label htmlFor="setting-freq-max" style={{ fontSize: 11 }}>
                Max
              </label>
              <input
                id="setting-freq-max"
                type="range"
                className="setting-range"
                min={200}
                max={20000}
                value={selectedSource.audioMapping.frequencyRange[1]}
                aria-label={`Maximum frequency: ${selectedSource.audioMapping.frequencyRange[1]} Hz`}
                onChange={(e) =>
                  updateSourceMapping(selectedSource.id, {
                    frequencyRange: [
                      selectedSource.audioMapping.frequencyRange[0],
                      parseInt(e.target.value),
                    ],
                  })
                }
              />
            </div>
          </div>

          <div className="setting-group" role="group" aria-label="ADSR envelope">
            <label className="setting-label">Envelope (ADSR)</label>
            {(['attack', 'decay', 'sustain', 'release'] as const).map((param) => (
              <div className="setting-row" key={param}>
                <label htmlFor={`setting-env-${param}`} style={{ width: 50, fontSize: 11 }}>
                  {param.charAt(0).toUpperCase() + param.slice(1)}
                </label>
                <input
                  id={`setting-env-${param}`}
                  type="range"
                  className="setting-range"
                  min={0}
                  max={param === 'sustain' ? 100 : param === 'release' ? 300 : 100}
                  value={Math.round(selectedSource.audioMapping.envelope[param] * 100)}
                  aria-label={`${param}: ${selectedSource.audioMapping.envelope[param].toFixed(2)}`}
                  onChange={(e) =>
                    updateSourceMapping(selectedSource.id, {
                      envelope: {
                        ...selectedSource.audioMapping.envelope,
                        [param]: parseInt(e.target.value) / 100,
                      },
                    })
                  }
                />
                <span
                  style={{
                    fontSize: 10,
                    width: 36,
                    textAlign: 'right',
                    fontFamily: 'var(--font-mono)',
                  }}
                  aria-hidden="true"
                >
                  {selectedSource.audioMapping.envelope[param].toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {!selectedSource && sources.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>
          Select a source to edit its settings.
        </div>
      )}

      {/* --- Playback Settings --- */}
      <div className="sidebar-section-title" style={{ marginTop: 16 }}>
        Playback
      </div>

      <div className="setting-group">
        <label className="setting-label" htmlFor="setting-duration">
          Duration: {playbackConfig.duration}s
        </label>
        <input
          id="setting-duration"
          type="range"
          className="setting-range"
          min={1}
          max={120}
          value={playbackConfig.duration}
          aria-label={`Playback duration: ${playbackConfig.duration} seconds`}
          onChange={(e) => updatePlaybackConfig({ duration: parseInt(e.target.value) })}
        />
      </div>

      {/* --- Visualization Settings --- */}
      <div className="sidebar-section-title" style={{ marginTop: 16 }}>
        Visualization
      </div>

      <div className="setting-group">
        <div className="setting-row">
          <label htmlFor="setting-show-grid">Show Grid</label>
          <input
            id="setting-show-grid"
            type="checkbox"
            className="setting-checkbox"
            checked={visualizationConfig.showGrid}
            onChange={(e) => updateVisualizationConfig({ showGrid: e.target.checked })}
          />
        </div>
        <div className="setting-row">
          <label htmlFor="setting-show-legend">Show Legend</label>
          <input
            id="setting-show-legend"
            type="checkbox"
            className="setting-checkbox"
            checked={visualizationConfig.showLegend}
            onChange={(e) => updateVisualizationConfig({ showLegend: e.target.checked })}
          />
        </div>
        <div className="setting-row">
          <label htmlFor="setting-point-size">Point Size: {visualizationConfig.pointSize}</label>
          <input
            id="setting-point-size"
            type="range"
            className="setting-range"
            min={2}
            max={20}
            value={visualizationConfig.pointSize}
            aria-label={`Point size: ${visualizationConfig.pointSize}`}
            onChange={(e) => updateVisualizationConfig({ pointSize: parseInt(e.target.value) })}
          />
        </div>
        <div className="setting-row">
          <label htmlFor="setting-theme">Theme</label>
          <select
            id="setting-theme"
            className="setting-select"
            value={visualizationConfig.theme}
            onChange={(e) =>
              updateVisualizationConfig({
                theme: e.target.value as 'light' | 'dark',
              })
            }
            style={{ width: 'auto' }}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>

      {/* --- Audio Settings --- */}
      <div className="sidebar-section-title" style={{ marginTop: 16 }}>
        Audio
      </div>

      <div className="setting-group">
        <label className="setting-label" htmlFor="setting-master-volume">
          Master Volume: {Math.round(audioConfig.masterVolume * 100)}%
        </label>
        <input
          id="setting-master-volume"
          type="range"
          className="setting-range"
          min={0}
          max={100}
          value={Math.round(audioConfig.masterVolume * 100)}
          aria-label={`Master volume: ${Math.round(audioConfig.masterVolume * 100)}%`}
          onChange={(e) => updateAudioConfig({ masterVolume: parseInt(e.target.value) / 100 })}
        />
      </div>

      <div className="setting-group">
        <div className="setting-row">
          <label htmlFor="setting-reverb">Reverb</label>
          <input
            id="setting-reverb"
            type="checkbox"
            className="setting-checkbox"
            checked={audioConfig.effects.reverb.enabled}
            onChange={(e) =>
              updateAudioConfig({
                effects: {
                  ...audioConfig.effects,
                  reverb: { ...audioConfig.effects.reverb, enabled: e.target.checked },
                },
              })
            }
          />
        </div>
        {audioConfig.effects.reverb.enabled && (
          <div className="setting-row">
            <label htmlFor="setting-reverb-wet" style={{ fontSize: 11 }}>
              Wet: {audioConfig.effects.reverb.wet.toFixed(1)}
            </label>
            <input
              id="setting-reverb-wet"
              type="range"
              className="setting-range"
              min={0}
              max={100}
              value={Math.round(audioConfig.effects.reverb.wet * 100)}
              aria-label={`Reverb wet: ${audioConfig.effects.reverb.wet.toFixed(1)}`}
              onChange={(e) =>
                updateAudioConfig({
                  effects: {
                    ...audioConfig.effects,
                    reverb: { ...audioConfig.effects.reverb, wet: parseInt(e.target.value) / 100 },
                  },
                })
              }
            />
          </div>
        )}
      </div>

      <div className="setting-group">
        <div className="setting-row">
          <label htmlFor="setting-filter">Low-pass Filter</label>
          <input
            id="setting-filter"
            type="checkbox"
            className="setting-checkbox"
            checked={audioConfig.effects.filter.enabled}
            onChange={(e) =>
              updateAudioConfig({
                effects: {
                  ...audioConfig.effects,
                  filter: { ...audioConfig.effects.filter, enabled: e.target.checked },
                },
              })
            }
          />
        </div>
        {audioConfig.effects.filter.enabled && (
          <div className="setting-row">
            <label htmlFor="setting-filter-freq" style={{ fontSize: 11 }}>
              Cutoff: {audioConfig.effects.filter.frequency} Hz
            </label>
            <input
              id="setting-filter-freq"
              type="range"
              className="setting-range"
              min={20}
              max={20000}
              value={audioConfig.effects.filter.frequency}
              aria-label={`Filter cutoff: ${audioConfig.effects.filter.frequency} Hz`}
              onChange={(e) =>
                updateAudioConfig({
                  effects: {
                    ...audioConfig.effects,
                    filter: {
                      ...audioConfig.effects.filter,
                      frequency: parseInt(e.target.value),
                    },
                  },
                })
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
