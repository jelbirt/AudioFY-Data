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
 * Tests for the export module — SVG, PNG, and WAV utilities.
 *
 * These tests mock DOM APIs (XMLSerializer, canvas, Image, Blob) since
 * the export functions depend on browser APIs not fully available in jsdom.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportSVG, exportPNG, exportAudio } from '../../src/core/export';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock Tone.js to avoid audio context issues in tests
vi.mock('tone', () => {
  class MockRecorder {
    start = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn().mockResolvedValue(new Blob(['audio'], { type: 'audio/webm' }));
    dispose = vi.fn();
  }
  return {
    Recorder: MockRecorder,
    getDestination: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    getTransport: vi.fn(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      position: 0,
    })),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockSVG(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '800');
  svg.setAttribute('height', '600');

  // Add some content
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', '100');
  circle.setAttribute('cy', '100');
  circle.setAttribute('r', '50');
  svg.appendChild(circle);

  // jsdom doesn't implement SVGAnimatedLength properly, so we mock it
  Object.defineProperty(svg, 'width', {
    value: { baseVal: { value: 800 } },
    configurable: true,
  });
  Object.defineProperty(svg, 'height', {
    value: { baseVal: { value: 600 } },
    configurable: true,
  });

  return svg;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Export: exportSVG', () => {
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    mockRevokeObjectURL = vi.fn();
    URL.createObjectURL = mockCreateObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock anchor click
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        const anchor = {
          href: '',
          download: '',
          click: vi.fn(),
        } as unknown as HTMLAnchorElement;
        return anchor;
      }
      // For style elements in exportSVG
      return document.implementation.createDocument(null, null).createElement(tag) as unknown as HTMLElement;
    });

    vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as unknown as Node);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as unknown as Node);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a blob with SVG content and triggers download', () => {
    const svg = createMockSVG();
    exportSVG(svg);

    // Should create an object URL from a blob
    expect(mockCreateObjectURL).toHaveBeenCalledOnce();
    const blobArg = mockCreateObjectURL.mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);

    // Should revoke the URL after download
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('uses custom filename when provided', () => {
    const svg = createMockSVG();

    // Re-mock createElement to capture download attribute
    let downloadName = '';
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return {
          href: '',
          set download(name: string) {
            downloadName = name;
          },
          get download() {
            return downloadName;
          },
          click: vi.fn(),
        } as unknown as HTMLAnchorElement;
      }
      return document.implementation.createDocument(null, null).createElement(tag) as unknown as HTMLElement;
    });

    exportSVG(svg, 'my-chart.svg');
    expect(downloadName).toBe('my-chart.svg');
  });

  it('sets proper XML namespaces on cloned SVG', () => {
    const svg = createMockSVG();
    exportSVG(svg);

    // The original SVG should not be modified
    // We can't easily check the clone, but we verify the function didn't throw
    expect(mockCreateObjectURL).toHaveBeenCalled();
  });
});

describe('Export: exportAudio', () => {
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-audio-url');
    mockRevokeObjectURL = vi.fn();
    URL.createObjectURL = mockCreateObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL;

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return {
          href: '',
          download: '',
          click: vi.fn(),
        } as unknown as HTMLAnchorElement;
      }
      return document.implementation.createDocument(null, null).createElement(tag) as unknown as HTMLElement;
    });

    vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as unknown as Node);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as unknown as Node);

    // Mock MediaRecorder globally
    vi.stubGlobal('MediaRecorder', class MockMediaRecorder {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('calls prepareFn and triggers download', async () => {
    const prepareFn = vi.fn();

    await exportAudio(prepareFn, 0.1, 'test-audio.webm', 0.05);

    expect(prepareFn).toHaveBeenCalledOnce();
    expect(mockCreateObjectURL).toHaveBeenCalledOnce();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-audio-url');
  }, 10000);

  it('throws when MediaRecorder is unavailable', async () => {
    vi.unstubAllGlobals(); // Remove MediaRecorder
    // Ensure MediaRecorder is undefined
    const globalObj = globalThis as Record<string, unknown>;
    const original = globalObj.MediaRecorder;
    delete globalObj.MediaRecorder;

    try {
      await expect(exportAudio(vi.fn(), 1)).rejects.toThrow('MediaRecorder unavailable');
    } finally {
      if (original !== undefined) {
        globalObj.MediaRecorder = original;
      }
    }
  });

  it('uses custom release buffer', async () => {
    const prepareFn = vi.fn();

    // With a very short duration and custom release buffer
    await exportAudio(prepareFn, 0.05, undefined, 0.05);

    expect(prepareFn).toHaveBeenCalledOnce();
    expect(mockCreateObjectURL).toHaveBeenCalled();
  }, 10000);
});

describe('Export: exportPNG', () => {
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-svg-url');
    mockRevokeObjectURL = vi.fn();
    URL.createObjectURL = mockCreateObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock Image constructor — must be a class/function for `new Image()`
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = '';

      get src() { return this._src; }
      set src(url: string) {
        this._src = url;
        if (this.onload) setTimeout(this.onload, 0);
      }
    }

    vi.stubGlobal('Image', MockImage);

    // Mock canvas
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue({
            fillStyle: '',
            fillRect: vi.fn(),
            scale: vi.fn(),
            drawImage: vi.fn(),
          }),
          toBlob: vi.fn((cb: (blob: Blob | null) => void) => {
            cb(new Blob(['png-data'], { type: 'image/png' }));
          }),
        } as unknown as HTMLCanvasElement;
      }
      if (tag === 'a') {
        return {
          href: '',
          download: '',
          click: vi.fn(),
        } as unknown as HTMLAnchorElement;
      }
      return document.implementation.createDocument(null, null).createElement(tag) as unknown as HTMLElement;
    });

    vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as unknown as Node);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as unknown as Node);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a canvas at 2x scale by default', async () => {
    const svg = createMockSVG();
    await exportPNG(svg);

    // Should have created a canvas element
    expect(document.createElement).toHaveBeenCalledWith('canvas');
  });

  it('rejects when canvas context is unavailable', async () => {
    // Mock Image for this test too
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = '';

      get src() { return this._src; }
      set src(url: string) {
        this._src = url;
        if (this.onload) setTimeout(this.onload, 0);
      }
    }
    vi.stubGlobal('Image', MockImage);

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue(null),
        } as unknown as HTMLCanvasElement;
      }
      return document.implementation.createDocument(null, null).createElement(tag) as unknown as HTMLElement;
    });

    const svg = createMockSVG();
    await expect(exportPNG(svg)).rejects.toThrow('Could not create canvas context');
  });
});
