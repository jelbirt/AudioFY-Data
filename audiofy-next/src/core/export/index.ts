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
 * Export utilities — SVG, PNG, and WAV export for AudioFY.
 *
 * SVG: Serializes the scatter plot SVG element to a downloadable file.
 * PNG: Renders the SVG to a canvas and exports as PNG.
 * WAV: Uses Tone.js Recorder to capture audio output and export as WAV.
 */
import * as Tone from 'tone';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Trigger a browser file download from a Blob.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate a timestamped filename.
 */
function timestampedName(base: string, ext: string): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${base}-${ts}.${ext}`;
}

// ---------------------------------------------------------------------------
// SVG Export
// ---------------------------------------------------------------------------

/**
 * Export the scatter plot SVG element as a .svg file.
 *
 * @param svgElement The SVG DOM element to export
 * @param filename Optional custom filename
 */
export function exportSVG(svgElement: SVGSVGElement, filename?: string): void {
  // Clone the SVG to avoid modifying the live DOM
  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  // Ensure the SVG has proper XML namespace
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  // Inline computed styles for standalone rendering
  const styles = document.createElement('style');
  styles.textContent = `
    text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .data-point { transition: none; }
  `;
  clone.insertBefore(styles, clone.firstChild);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });

  downloadBlob(blob, filename ?? timestampedName('audiofy-chart', 'svg'));
}

// ---------------------------------------------------------------------------
// PNG Export
// ---------------------------------------------------------------------------

/**
 * Export the scatter plot SVG element as a .png file.
 *
 * Renders the SVG to a canvas at 2x resolution for crisp output,
 * then exports the canvas as PNG.
 *
 * @param svgElement The SVG DOM element to export
 * @param options Optional width/height overrides and scale factor
 * @param filename Optional custom filename
 * @returns Promise that resolves when the download is triggered
 */
export async function exportPNG(
  svgElement: SVGSVGElement,
  options?: { scale?: number },
  filename?: string,
): Promise<void> {
  const scale = options?.scale ?? 2;
  const width = svgElement.width.baseVal.value;
  const height = svgElement.height.baseVal.value;

  // Clone and prepare SVG
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  // Get background color from the SVG style
  const bgColor = svgElement.style.background || '#fafafa';

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  return new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(svgUrl);
        reject(new Error('Could not create canvas context'));
        return;
      }

      // Fill background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw SVG
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);

      URL.revokeObjectURL(svgUrl);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            downloadBlob(blob, filename ?? timestampedName('audiofy-chart', 'png'));
            resolve();
          } else {
            reject(new Error('PNG export failed: canvas.toBlob returned null'));
          }
        },
        'image/png',
        1.0,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error('Failed to load SVG for PNG conversion'));
    };

    img.src = svgUrl;
  });
}

// ---------------------------------------------------------------------------
// WAV Export
// ---------------------------------------------------------------------------

/**
 * Export the current sonification as a WAV file using Tone.js Recorder.
 *
 * This re-plays the sonification in real-time while recording the audio
 * output, then saves the result as a WAV file.
 *
 * @param prepareFn Function that sets up the sonification (add sources, schedule)
 * @param duration Total duration in seconds
 * @param filename Optional custom filename
 * @returns Promise that resolves when the recording and download are complete
 */
export async function exportWAV(
  prepareFn: () => void,
  duration: number,
  filename?: string,
): Promise<void> {
  // Create a recorder connected to the Tone.js destination
  const recorder = new Tone.Recorder();
  Tone.getDestination().connect(recorder);

  try {
    // Prepare the sonification
    prepareFn();

    // Start recording and playback
    await recorder.start();
    Tone.getTransport().start();

    // Wait for the duration + a small buffer for release tails
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        Tone.getTransport().stop();
        resolve();
      }, (duration + 0.5) * 1000);
    });

    // Stop recording and get the blob
    const blob = await recorder.stop();

    // Download
    downloadBlob(blob, filename ?? timestampedName('audiofy-audio', 'webm'));
  } finally {
    // Clean up
    Tone.getDestination().disconnect(recorder);
    recorder.dispose();
  }
}
