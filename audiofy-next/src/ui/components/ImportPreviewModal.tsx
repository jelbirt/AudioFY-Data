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
 * ImportPreviewModal — shown when a multi-sheet file is opened.
 * Lets the user pick which sheet to import and preview its contents.
 */
import { useState, useCallback, useEffect, useRef, memo } from 'react';
import type { PendingImport } from '@store';
import type { ParsedSheet } from '@types';

interface ImportPreviewModalProps {
  pending: PendingImport;
  onConfirm: (sheetIndex: number) => void;
  onCancel: () => void;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export const ImportPreviewModal = memo(function ImportPreviewModal({ pending, onConfirm, onCancel }: ImportPreviewModalProps) {
  const { parsedFile } = pending;
  const [selectedSheet, setSelectedSheet] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const onCancelRef = useRef(onCancel);

  // Keep latest onCancel accessible from the mount-only effect without retrapping focus.
  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  // Clamp selectedSheet to valid range (defensive)
  const hasSheets = parsedFile.sheets.length > 0;
  const safeSheetIndex = hasSheets
    ? Math.min(selectedSheet, parsedFile.sheets.length - 1)
    : 0;
  const sheet: ParsedSheet | undefined = hasSheets
    ? parsedFile.sheets[safeSheetIndex]
    : undefined;

  // Focus trap: focus the dialog on mount, trap Tab/Shift+Tab inside it,
  // handle Escape, and restore focus on unmount with a graceful fallback.
  useEffect(() => {
    const dialog = dialogRef.current;
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    dialog?.focus();

    // Attach keydown to the dialog container (not the backdrop) so the
    // listener fires reliably for events originating inside the dialog.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancelRef.current();
        return;
      }
      if (e.key === 'Tab' && dialog) {
        const focusable = Array.from(
          dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter(
          (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
        );
        if (focusable.length === 0) {
          e.preventDefault();
          dialog.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;
        // If focus escaped the dialog entirely, pull it back to the first element.
        if (!active || !dialog.contains(active)) {
          e.preventDefault();
          first.focus();
          return;
        }
        if (e.shiftKey) {
          if (active === first || active === dialog) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    dialog?.addEventListener('keydown', handleKeyDown);

    return () => {
      dialog?.removeEventListener('keydown', handleKeyDown);

      // Restore focus to previously-focused element if it still exists in DOM.
      const prev = prevFocusRef.current;
      if (prev && document.body.contains(prev)) {
        prev.focus();
        return;
      }
      // Fallback: a stable anchor marked by the host app.
      const anchor = document.querySelector<HTMLElement>('[data-initial-focus]');
      if (anchor) {
        anchor.focus();
        return;
      }
      // Dev-only warning: focus will fall through to <body>.
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn(
          '[ImportPreviewModal] Could not restore focus: previous element no longer in DOM and no [data-initial-focus] anchor found.',
        );
      }
    };
    // Mount-only: listener and cleanup own their lifecycle via onCancelRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(safeSheetIndex);
  }, [onConfirm, safeSheetIndex]);

  // Guard: if there are no sheets, show an error state
  if (!sheet) {
    return (
      <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="import-preview-title">
        <div className="modal-content" ref={dialogRef} tabIndex={-1}>
          <div className="modal-header">
            <h2 className="modal-title" id="import-preview-title">Import: {pending.fileName}</h2>
            <button className="btn modal-close" onClick={onCancel} aria-label="Close">&times;</button>
          </div>
          <div className="modal-body">
            <p>This file contains no readable sheets.</p>
          </div>
          <div className="modal-footer">
            <button className="btn" onClick={onCancel}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  // Preview: show first 5 rows of the selected sheet
  const previewRows = sheet.data.slice(0, 5);
  const headers = sheet.headers.col;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-preview-title"
    >
      <div className="modal-content" ref={dialogRef} tabIndex={-1}>
        <div className="modal-header">
          <h2 className="modal-title" id="import-preview-title">Import: {pending.fileName}</h2>
          <button
            className="btn modal-close"
            onClick={onCancel}
            aria-label="Cancel import"
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="setting-group">
            <label className="setting-label" htmlFor="sheet-select">
              Sheet ({parsedFile.sheets.length} available)
            </label>
            <select
              id="sheet-select"
              className="setting-select"
              value={selectedSheet}
              onChange={(e) => setSelectedSheet(parseInt(e.target.value))}
            >
              {parsedFile.sheets.map((s, i) => (
                <option key={i} value={i}>
                  {s.name} ({s.data.length} rows, {s.numericColumns.length} numeric cols)
                </option>
              ))}
            </select>
          </div>

          {/* Data preview */}
          <div className="setting-label" style={{ marginTop: 12 }}>
            Preview (first 5 rows)
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 200 }}>
            <table className="data-table" style={{ fontSize: 11, width: '100%' }}>
              <thead>
                <tr>
                  {headers.map((h, i) => {
                    // Sparse-column warning: the column passes the numeric
                    // threshold but is at least 10% blank. Missing cells
                    // become NaN and are skipped during playback/rendering.
                    const q = sheet.columnQuality?.find((cq) => cq.index === i);
                    const isSparseNumeric = q && q.isNumeric && q.populatedRatio < 0.9;
                    const blankPct = q ? Math.round((1 - q.populatedRatio) * 100) : 0;
                    return (
                      <th key={i} style={{ padding: '4px 6px', textAlign: 'left' }}>
                        {h || `Col ${i + 1}`}
                        {sheet.numericColumns.includes(i) && (
                          <span
                            style={{ color: 'var(--accent)', marginLeft: 4, fontSize: 9 }}
                            title="Numeric column"
                          >
                            #
                          </span>
                        )}
                        {isSparseNumeric && (
                          <span
                            className="sparse-column-badge"
                            style={{
                              marginLeft: 6,
                              fontSize: 9,
                              color: 'var(--warning)',
                              fontWeight: 500,
                            }}
                            title={`This column has ${blankPct}% blank values. Missing data will be skipped in playback and not shown on the chart.`}
                            aria-label={`Warning: ${blankPct}% blank`}
                          >
                            {`\u26A0 ${blankPct}% blank`}
                          </span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{ padding: '3px 6px' }}>
                        {cell === null ? '' : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sheet.numericColumns.length < 2 && (
            <div style={{ color: 'var(--danger, #ff3b30)', fontSize: 12, marginTop: 8 }}>
              This sheet has fewer than 2 numeric columns and cannot be sonified.
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={sheet.numericColumns.length < 2}
          >
            Import Sheet
          </button>
        </div>
      </div>
    </div>
  );
});
