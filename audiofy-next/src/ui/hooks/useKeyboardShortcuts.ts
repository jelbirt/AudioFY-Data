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
 * useKeyboardShortcuts — global keyboard shortcuts for AudioFY.
 */
import { useEffect, useRef } from 'react';

interface ShortcutHandlers {
  togglePlayPause: () => void;
  stop: () => void;
  openFile: () => void;
  toggleSettings: () => void;
  saveProject?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  // Use a ref so the keydown listener always calls the latest handlers
  // without needing to re-register on every render.
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an editable element
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      // Don't capture inside open dialogs/modals unless the shortcut is Escape
      if (e.key !== 'Escape' && target.closest('[role="dialog"], dialog')) return;

      // Space and Enter are ARIA activation keys for role="button"; don't steal
      // them from focused button-like elements (e.g. the drop-zone).
      if (e.key === ' ' || e.key === 'Enter') {
        if (target.getAttribute('role') === 'button' || target.closest('[role="button"]')) {
          return;
        }
      }

      const h = handlersRef.current;
      switch (e.key) {
        case ' ':
          // Ignore key-repeat to avoid spamming play/pause
          if (e.repeat) return;
          e.preventDefault();
          h.togglePlayPause();
          break;
        case 'Escape':
          h.stop();
          break;
        case 'o':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            h.openFile();
          }
          break;
        case ',':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            h.toggleSettings();
          }
          break;
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            h.saveProject?.();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
