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
 * SourceList — displays loaded data sources with color indicators,
 * selection, remove buttons, and full keyboard navigation.
 */
import { useRef, useCallback } from 'react';
import { useAppStore } from '@store';

export function SourceList() {
  const sources = useAppStore((s) => s.sources);
  const selectedSourceId = useAppStore((s) => s.selectedSourceId);
  const selectSource = useAppStore((s) => s.selectSource);
  const removeSource = useAppStore((s) => s.removeSource);
  const listRef = useRef<HTMLDivElement>(null);

  /**
   * Handle arrow key navigation within the source list.
   * Implements roving tabindex pattern for WCAG keyboard nav.
   */
  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (sources.length === 0) return;

      const currentIndex = sources.findIndex((s) => s.id === selectedSourceId);

      let nextIndex: number | null = null;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          nextIndex = currentIndex < sources.length - 1 ? currentIndex + 1 : 0;
          break;
        case 'ArrowUp':
          e.preventDefault();
          nextIndex = currentIndex > 0 ? currentIndex - 1 : sources.length - 1;
          break;
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = sources.length - 1;
          break;
        case 'Delete':
        case 'Backspace':
          if (selectedSourceId) {
            e.preventDefault();
            removeSource(selectedSourceId);
          }
          break;
      }

      if (nextIndex !== null) {
        selectSource(sources[nextIndex].id);
        // Move focus to the newly selected item
        const items = listRef.current?.querySelectorAll('[role="option"]');
        (items?.[nextIndex] as HTMLElement)?.focus();
      }
    },
    [sources, selectedSourceId, selectSource, removeSource],
  );

  if (sources.length === 0) {
    return (
      <div className="sidebar-section">
        <div className="sidebar-section-title" id="sources-heading">Sources</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>
          No data loaded. Open a file to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar-section">
      <div className="sidebar-section-title" id="sources-heading">
        Sources ({sources.length})
      </div>
      <div
        ref={listRef}
        className="source-list"
        role="listbox"
        aria-labelledby="sources-heading"
        aria-activedescendant={selectedSourceId ? `source-${selectedSourceId}` : undefined}
        onKeyDown={handleListKeyDown}
      >
        {sources.map((source, _index) => (
          <div
            key={source.id}
            id={`source-${source.id}`}
            className={`source-item ${selectedSourceId === source.id ? 'selected' : ''}`}
            onClick={() => selectSource(source.id)}
            role="option"
            aria-selected={selectedSourceId === source.id}
            tabIndex={selectedSourceId === source.id ? 0 : -1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectSource(source.id);
              }
            }}
          >
            <div
              className="source-color"
              style={{ background: source.color }}
              aria-hidden="true"
            />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div className="source-name">{source.name}</div>
              <div className="source-file">
                {source.fileName} &middot; {source.rows.length} rows
              </div>
            </div>
            <button
              className="btn btn-icon btn-danger source-remove"
              onClick={(e) => {
                e.stopPropagation();
                removeSource(source.id);
              }}
              title="Remove source"
              aria-label={`Remove ${source.name}`}
              tabIndex={-1}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
