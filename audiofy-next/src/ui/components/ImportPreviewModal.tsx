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

export const ImportPreviewModal = memo(function ImportPreviewModal({ pending, onConfirm, onCancel }: ImportPreviewModalProps) {
  const { parsedFile } = pending;
  const [selectedSheet, setSelectedSheet] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  // Clamp selectedSheet to valid range (defensive)
  const hasSheets = parsedFile.sheets.length > 0;
  const safeSheetIndex = hasSheets
    ? Math.min(selectedSheet, parsedFile.sheets.length - 1)
    : 0;
  const sheet: ParsedSheet | undefined = hasSheets
    ? parsedFile.sheets[safeSheetIndex]
    : undefined;

  // Focus trap: focus the dialog on mount, restore focus on unmount
  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement;
    dialogRef.current?.focus();
    return () => {
      prevFocusRef.current?.focus();
    };
  }, []);

  // Close on Escape and trap focus within the dialog
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }
      if (e.key === 'Tab') {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onCancel],
  );

  const handleConfirm = useCallback(() => {
    onConfirm(safeSheetIndex);
  }, [onConfirm, safeSheetIndex]);

  // Guard: if there are no sheets, show an error state
  if (!sheet) {
    return (
      <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Import error">
        <div className="modal-content" ref={dialogRef} tabIndex={-1}>
          <div className="modal-header">
            <h2 className="modal-title">Import: {pending.fileName}</h2>
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
      aria-label={`Import preview: ${pending.fileName}`}
      onKeyDown={handleKeyDown}
    >
      <div className="modal-content" ref={dialogRef} tabIndex={-1}>
        <div className="modal-header">
          <h2 className="modal-title">Import: {pending.fileName}</h2>
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
                  {headers.map((h, i) => (
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
                    </th>
                  ))}
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
