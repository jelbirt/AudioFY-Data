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

Object.freeze(Object.prototype);
Object.freeze(Array.prototype);
Object.freeze(Object);

/**
 * Web Worker for file parsing — runs papaparse (CSV/TSV) and exceljs (XLSX)
 * parsing off the main thread to keep the UI responsive for large files.
 */
import type { ParsedFile } from '@types';
import { parseFile } from './parser';

export interface ParseWorkerRequest {
  id: number;
  data: ArrayBuffer;
  fileName: string;
}

export interface ParseWorkerResponse {
  id: number;
  result?: ParsedFile;
  error?: string;
}

self.onmessage = async (event: MessageEvent<ParseWorkerRequest>) => {
  const { id, data, fileName } = event.data;

  try {
    const result = await parseFile(data, fileName);
    const response: ParseWorkerResponse = { id, result };
    self.postMessage(response);
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown parse error';
    const response: ParseWorkerResponse = { id, error };
    self.postMessage(response);
  }
};
