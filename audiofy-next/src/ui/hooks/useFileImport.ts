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
 * useFileImport — handles file import via Tauri dialog or drag-and-drop.
 *
 * Falls back to an <input type="file"> in development/browser context.
 */
import { useCallback, useEffect, useRef } from 'react';
import { createDataSource } from '@core/data';
import { addRecentFile } from '@core/config';
import { useAppStore } from '@store';

/** Supported file extensions */
const SUPPORTED_EXTENSIONS = ['xlsx', 'xls', 'csv', 'tsv', 'ods', 'json'];

export function useFileImport() {
  const addSource = useAppStore((s) => s.addSource);
  const setRecentFiles = useAppStore((s) => s.setRecentFiles);
  const setError = useAppStore((s) => s.setError);
  const setLoading = useAppStore((s) => s.setLoading);

  // Ref to hold browser fallback so openFileDialog can reference it
  // without a circular dependency.
  const browserDialogRef = useRef<() => void>(() => {});

  /**
   * Import a file from an ArrayBuffer (e.g., from drag-and-drop or input).
   */
  const importFromBuffer = useCallback(
    async (buffer: ArrayBuffer, fileName: string, filePath?: string) => {
      setLoading(true);
      setError(null);

      try {
        const { parsedFile, source } = createDataSource(buffer, fileName);
        addSource(source, parsedFile);

        // Update recent files — read fresh state to avoid stale closure
        if (filePath) {
          const currentRecentFiles = useAppStore.getState().recentFiles;
          const updated = addRecentFile(currentRecentFiles, filePath, fileName);
          setRecentFiles(updated);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to import file';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [addSource, setRecentFiles, setError, setLoading],
  );

  /**
   * Open native file dialog (Tauri) or fallback to browser input.
   */
  const openFileDialog = useCallback(async () => {
    setError(null);

    // Try Tauri dialog first
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readFile } = await import('@tauri-apps/plugin-fs');

      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Spreadsheets',
            extensions: SUPPORTED_EXTENSIONS,
          },
        ],
      });

      if (!selected) return; // User cancelled

      const filePath = typeof selected === 'string' ? selected : selected.path;
      if (!filePath) return;

      setLoading(true);
      const contents = await readFile(filePath);
      const buffer = contents.buffer as ArrayBuffer;
      const fileName = filePath.split(/[\\/]/).pop() ?? filePath;

      await importFromBuffer(buffer, fileName, filePath);
    } catch {
      // Tauri not available — fallback to browser file input
      browserDialogRef.current();
    }
  }, [setError, setLoading, importFromBuffer]);

  /**
   * Browser fallback: create a temporary file input and trigger it.
   */
  const openBrowserFileDialog = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = SUPPORTED_EXTENSIONS.map((ext) => `.${ext}`).join(',');

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        setLoading(true);
        const buffer = await file.arrayBuffer();
        await importFromBuffer(buffer, file.name);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to read file';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    input.click();
  }, [importFromBuffer, setError, setLoading]);

  // Keep the ref in sync with the latest callback
  useEffect(() => {
    browserDialogRef.current = openBrowserFileDialog;
  });

  /**
   * Handle drag-and-drop file events.
   */
  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const file = event.dataTransfer.files[0];
      if (!file) return;

      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !SUPPORTED_EXTENSIONS.includes(ext)) {
        setError(`Unsupported file type: .${ext}`);
        return;
      }

      const buffer = await file.arrayBuffer();
      await importFromBuffer(buffer, file.name);
    },
    [importFromBuffer, setError],
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return {
    openFileDialog,
    importFromBuffer,
    handleDrop,
    handleDragOver,
    supportedExtensions: SUPPORTED_EXTENSIONS,
  };
}
