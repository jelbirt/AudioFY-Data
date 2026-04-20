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
import { memo } from 'react';
import { useAppStore } from '@store';
import { useShallow } from 'zustand/react/shallow';
import type { OscillatorType, NormalizationMode, FrequencyScale } from '@types';

const FILTER_TYPES: BiquadFilterType[] = [
  'lowpass',
  'highpass',
  'bandpass',
  'lowshelf',
  'highshelf',
  'peaking',
  'notch',
  'allpass',
];

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

export const SettingsPanel = memo(function SettingsPanel() {
  const { sources, selectedSourceId, visualizationConfig, audioConfig, playbackConfig } = useAppStore(
    useShallow((s) => ({
      sources: s.sources,
      selectedSourceId: s.selectedSourceId,
      visualizationConfig: s.visualizationConfig,
      audioConfig: s.audioConfig,
      playbackConfig: s.playbackConfig,
    })),
  );
  const updateSourceMapping = useAppStore((s) => s.updateSourceMapping);
  const updateSourceNormalization = useAppStore((s) => s.updateSourceNormalization);
  const updateSourceColor = useAppStore((s) => s.updateSourceColor);
  const updateVisualizationConfig = useAppStore((s) => s.updateVisualizationConfig);
  const updateAudioConfig = useAppStore((s) => s.updateAudioConfig);
  const updatePlaybackConfig = useAppStore((s) => s.updatePlaybackConfig);

  const selectedSource = sources.find((s) => s.id === selectedSourceId);

  return (
    <div className="settings-panel" role="form" aria-label="Settings">
      {/* --- Source Settings --- */}
      {selectedSource && (
        <>
          <div className="sidebar-section-title">Source: {selectedSource.name}</div>

          <div className="setting-group">
            <label className="setting-label" htmlFor="setting-x-column">
              X Column
            </label>
            <select
              id="setting-x-column"
              className="setting-select"
              value={selectedSource.audioMapping.xColumn}
              onChange={(e) =>
                updateSourceMapping(selectedSource.id, {
                  xColumn: parseInt(e.target.value),
                })
              }
            >
              {selectedSource.columns.map((col) => (
                <option key={col.index} value={col.index}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>

          <div className="setting-group">
            <label className="setting-label" htmlFor="setting-y-column">
              Y Column
            </label>
            <select
              id="setting-y-column"
              className="setting-select"
              value={selectedSource.audioMapping.yColumn}
              onChange={(e) =>
                updateSourceMapping(selectedSource.id, {
                  yColumn: parseInt(e.target.value),
                })
              }
            >
              {selectedSource.columns.map((col) => (
                <option key={col.index} value={col.index}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>

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
            <label className="setting-label" htmlFor="setting-source-volume" title="Output volume for this source (mixes against master volume)">
              Volume: {Math.round(selectedSource.audioMapping.sourceVolume * 100)}%
            </label>
            <input
              id="setting-source-volume"
              type="range"
              className="setting-range"
              min={0}
              max={100}
              step={1}
              value={Math.round(selectedSource.audioMapping.sourceVolume * 100)}
              aria-label={`Source volume: ${Math.round(selectedSource.audioMapping.sourceVolume * 100)}%`}
              onChange={(e) =>
                updateSourceMapping(selectedSource.id, {
                  sourceVolume: parseInt(e.target.value) / 100,
                })
              }
            />
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
            <label className="setting-label" title="Controls the pitch range used to represent data values">
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
                onChange={(e) => {
                  const newMin = parseInt(e.target.value);
                  const currentMax = selectedSource.audioMapping.frequencyRange[1];
                  updateSourceMapping(selectedSource.id, {
                    frequencyRange: [
                      Math.min(newMin, currentMax),
                      Math.max(newMin, currentMax),
                    ],
                  });
                }}
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
                onChange={(e) => {
                  const newMax = parseInt(e.target.value);
                  const currentMin = selectedSource.audioMapping.frequencyRange[0];
                  updateSourceMapping(selectedSource.id, {
                    frequencyRange: [
                      Math.min(currentMin, newMax),
                      Math.max(currentMin, newMax),
                    ],
                  });
                }}
              />
            </div>
          </div>

          <div className="setting-group" role="group" aria-label="ADSR envelope">
            <label className="setting-label" title="Controls how each note's volume changes over time">Envelope (ADSR)</label>
            {(['attack', 'decay', 'sustain', 'release'] as const).map((param) => {
              const tooltips = {
                attack: 'How quickly the sound reaches full volume after a note starts',
                decay: 'How quickly the sound drops from peak to the sustain level',
                sustain: 'The volume level held while the note is active',
                release: 'How long the sound takes to fade out after the note ends',
              };
              return (
              <div className="setting-row" key={param}>
                <label htmlFor={`setting-env-${param}`} style={{ width: 50, fontSize: 11 }} title={tooltips[param]}>
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
              );
            })}
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
        <label className="setting-label" htmlFor="setting-duration" title="Total time to play through all data points">
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
        <label className="setting-label" htmlFor="setting-master-volume" title="Overall output volume for all sources">
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
          <label htmlFor="setting-reverb" title="Adds a spacious echo effect to the sound">Reverb</label>
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
          <>
            <div className="setting-row">
              <label htmlFor="setting-reverb-wet" style={{ fontSize: 11 }} title="Balance between dry (original) and reverb signal">
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
            <div className="setting-row">
              <label htmlFor="setting-reverb-decay" style={{ fontSize: 11 }} title="How long the reverb tail lasts">
                Decay: {audioConfig.effects.reverb.decay.toFixed(1)}s
              </label>
              <input
                id="setting-reverb-decay"
                type="range"
                className="setting-range"
                min={1}
                max={300}
                value={Math.round(audioConfig.effects.reverb.decay * 10)}
                aria-label={`Reverb decay: ${audioConfig.effects.reverb.decay.toFixed(1)} seconds`}
                onChange={(e) =>
                  updateAudioConfig({
                    effects: {
                      ...audioConfig.effects,
                      reverb: {
                        ...audioConfig.effects.reverb,
                        decay: parseInt(e.target.value) / 10,
                      },
                    },
                  })
                }
              />
            </div>
          </>
        )}
      </div>

      <div className="setting-group">
        <div className="setting-row">
          <label htmlFor="setting-filter" title="Shapes the tone by cutting or boosting certain frequencies">Filter</label>
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
          <>
            <div className="setting-row">
              <label htmlFor="setting-filter-type" style={{ fontSize: 11 }}>
                Type
              </label>
              <select
                id="setting-filter-type"
                className="setting-select"
                value={audioConfig.effects.filter.type}
                style={{ width: 'auto' }}
                onChange={(e) =>
                  updateAudioConfig({
                    effects: {
                      ...audioConfig.effects,
                      filter: {
                        ...audioConfig.effects.filter,
                        type: e.target.value as BiquadFilterType,
                      },
                    },
                  })
                }
              >
                {FILTER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
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
          </>
        )}
      </div>

      <div className="setting-group">
        <div className="setting-row">
          <label htmlFor="setting-chorus" title="Adds thickness by layering slightly detuned copies of the sound">Chorus</label>
          <input
            id="setting-chorus"
            type="checkbox"
            className="setting-checkbox"
            checked={audioConfig.effects.chorus.enabled}
            onChange={(e) =>
              updateAudioConfig({
                effects: {
                  ...audioConfig.effects,
                  chorus: { ...audioConfig.effects.chorus, enabled: e.target.checked },
                },
              })
            }
          />
        </div>
        {audioConfig.effects.chorus.enabled && (
          <>
            <div className="setting-row">
              <label htmlFor="setting-chorus-freq" style={{ fontSize: 11 }}>
                Rate: {audioConfig.effects.chorus.frequency.toFixed(1)} Hz
              </label>
              <input
                id="setting-chorus-freq"
                type="range"
                className="setting-range"
                min={1}
                max={100}
                value={Math.round(audioConfig.effects.chorus.frequency * 10)}
                aria-label={`Chorus rate: ${audioConfig.effects.chorus.frequency.toFixed(1)} Hz`}
                onChange={(e) =>
                  updateAudioConfig({
                    effects: {
                      ...audioConfig.effects,
                      chorus: {
                        ...audioConfig.effects.chorus,
                        frequency: parseInt(e.target.value) / 10,
                      },
                    },
                  })
                }
              />
            </div>
            <div className="setting-row">
              <label htmlFor="setting-chorus-depth" style={{ fontSize: 11 }}>
                Depth: {audioConfig.effects.chorus.depth.toFixed(1)}
              </label>
              <input
                id="setting-chorus-depth"
                type="range"
                className="setting-range"
                min={0}
                max={100}
                value={Math.round(audioConfig.effects.chorus.depth * 100)}
                aria-label={`Chorus depth: ${audioConfig.effects.chorus.depth.toFixed(1)}`}
                onChange={(e) =>
                  updateAudioConfig({
                    effects: {
                      ...audioConfig.effects,
                      chorus: {
                        ...audioConfig.effects.chorus,
                        depth: parseInt(e.target.value) / 100,
                      },
                    },
                  })
                }
              />
            </div>
            <div className="setting-row">
              <label htmlFor="setting-chorus-delay" style={{ fontSize: 11 }}>
                Delay: {audioConfig.effects.chorus.delayTime.toFixed(1)} ms
              </label>
              <input
                id="setting-chorus-delay"
                type="range"
                className="setting-range"
                min={2}
                max={200}
                value={Math.round(audioConfig.effects.chorus.delayTime * 10)}
                aria-label={`Chorus delay: ${audioConfig.effects.chorus.delayTime.toFixed(1)} ms`}
                onChange={(e) =>
                  updateAudioConfig({
                    effects: {
                      ...audioConfig.effects,
                      chorus: {
                        ...audioConfig.effects.chorus,
                        delayTime: parseInt(e.target.value) / 10,
                      },
                    },
                  })
                }
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
});
