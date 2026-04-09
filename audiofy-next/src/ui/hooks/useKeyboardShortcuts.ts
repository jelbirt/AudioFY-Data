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
import { useEffect } from 'react';

interface ShortcutHandlers {
  togglePlayPause: () => void;
  stop: () => void;
  openFile: () => void;
  toggleSettings: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlers.togglePlayPause();
          break;
        case 'Escape':
          handlers.stop();
          break;
        case 'o':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handlers.openFile();
          }
          break;
        case ',':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handlers.toggleSettings();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
