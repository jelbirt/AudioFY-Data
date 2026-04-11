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
 * Async file parser — uses a Web Worker to parse files off the main thread.
 * Falls back to synchronous parsing if Web Workers are unavailable (e.g. tests, SSR).
 */
import type { ParsedFile } from '@types';
import type { ParseWorkerRequest, ParseWorkerResponse } from './parser.worker';
import { parseFile } from './parser';

let worker: Worker | null = null;
let requestId = 0;
const pending = new Map<number, { resolve: (v: ParsedFile) => void; reject: (e: Error) => void }>();

function getWorker(): Worker | null {
  if (worker) return worker;

  try {
    worker = new Worker(new URL('./parser.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event: MessageEvent<ParseWorkerResponse>) => {
      const { id, result, error } = event.data;
      const handlers = pending.get(id);
      if (!handlers) return;
      pending.delete(id);

      if (error) {
        handlers.reject(new Error(error));
      } else if (result) {
        handlers.resolve(result);
      }
    };

    worker.onerror = () => {
      // Worker failed — reject all pending requests and fall back to sync
      for (const [id, handlers] of pending) {
        handlers.reject(new Error('Parse worker encountered an error'));
        pending.delete(id);
      }
      worker?.terminate();
      worker = null;
    };

    return worker;
  } catch {
    // Web Workers not available
    return null;
  }
}

/**
 * Parse a file asynchronously using a Web Worker.
 * Falls back to synchronous parsing if workers aren't available.
 */
export function parseFileAsync(data: ArrayBuffer, fileName: string): Promise<ParsedFile> {
  const w = getWorker();

  if (!w) {
    // Fallback: synchronous parse wrapped in a promise
    return new Promise((resolve, reject) => {
      try {
        resolve(parseFile(data, fileName));
      } catch (err) {
        reject(err);
      }
    });
  }

  return new Promise<ParsedFile>((resolve, reject) => {
    const id = ++requestId;
    pending.set(id, { resolve, reject });

    const message: ParseWorkerRequest = { id, data, fileName };
    w.postMessage(message, [data]);
  });
}

/**
 * Terminate the worker (for cleanup).
 */
export function terminateParseWorker(): void {
  worker?.terminate();
  worker = null;
  pending.clear();
}
