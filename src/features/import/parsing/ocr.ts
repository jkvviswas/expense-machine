import type { PdfTextLine } from './pdfText';

/**
 * ============================================================================
 *  OCR PIPELINE ARCHITECTURE  (Phase 16 — provider abstraction)
 * ============================================================================
 *
 * Scanned / image-only PDFs have no text layer, so character recognition is
 * required. Rather than hard-wire one OCR engine, the pipeline depends on an
 * `OcrProvider` interface. The PDF parser asks the active provider to recognise
 * a file; if a provider is configured AND succeeds, its lines feed the SAME bank
 * strategy + categorization path as a text-layer PDF — real parsing, not mock.
 *
 * HONEST STATUS: no OCR engine is bundled in this build (Tesseract.js / a
 * server OCR endpoint would add significant weight and, for a server, infra).
 * The default provider is therefore `unavailable`, and scanned PDFs cleanly
 * fall back to the labelled sample path. This is the integration seam: drop in
 * a real provider (set `activeOcrProvider`) and scanned PDFs parse for real with
 * zero changes elsewhere.
 *
 * Two reference providers are included:
 *   - `unavailableOcr`  — the safe default; reports unavailable.
 *   - `tesseractOcr`    — a ready-to-wire client-side provider that lazy-loads
 *                         tesseract.js IF it is installed; otherwise unavailable.
 *                         (tesseract.js is intentionally NOT a dependency here.)
 */

export interface OcrResult {
  lines: PdfTextLine[];
  /** 0–1 average OCR character confidence reported by the engine. */
  confidence: number;
}

export interface OcrProvider {
  readonly id: string;
  /** Whether this provider can run in the current environment. */
  isAvailable(): Promise<boolean>;
  /** Recognise text from a (scanned) PDF file into reconstructed lines. */
  recognise(file: File): Promise<OcrResult>;
}

/** Default provider: no OCR engine bundled. */
export const unavailableOcr: OcrProvider = {
  id: 'none',
  async isAvailable() {
    return false;
  },
  async recognise() {
    throw new Error('No OCR provider is configured.');
  },
};

/**
 * Client-side OCR via tesseract.js, IF it is installed. tesseract.js is not a
 * dependency of this project (it is large), so this provider reports unavailable
 * unless the package resolves at runtime. To enable scanned-PDF OCR:
 *   npm i tesseract.js pdfjs-dist
 * then `setOcrProvider(tesseractOcr)`.
 */
export const tesseractOcr: OcrProvider = {
  id: 'tesseract',
  async isAvailable() {
    try {
      // Probe without bundling: only resolves if the package is installed.
      // tesseract.js is intentionally NOT a dependency (see file header).
      // @ts-expect-error optional peer module, resolved at runtime if present
      await import(/* @vite-ignore */ 'tesseract.js');
      return true;
    } catch {
      return false;
    }
  },
  async recognise(file: File): Promise<OcrResult> {
    // Lazy import; rasterise each page with pdfjs, then OCR the canvas.
    // @ts-expect-error optional peer module, resolved at runtime if present
    const Tesseract = await import(/* @vite-ignore */ 'tesseract.js');
    const pdfjs = await import('pdfjs-dist');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (pdfjs as any).GlobalWorkerOptions.workerSrc = (
      await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    ).default;

    const data = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data }).promise;
    const lines: PdfTextLine[] = [];
    let confidenceSum = 0;
    let pages = 0;

    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await page.render({ canvasContext: ctx, viewport } as any).promise;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await (Tesseract as any).recognize(canvas, 'eng');
      pages += 1;
      confidenceSum += (result?.data?.confidence ?? 0) / 100;
      const text: string = result?.data?.text ?? '';
      text
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((t, i) => lines.push({ page: p, text: t, y: -i }));
    }

    return { lines, confidence: pages > 0 ? confidenceSum / pages : 0 };
  },
};

// The active provider. Defaults to unavailable; swap via setOcrProvider().
let active: OcrProvider = unavailableOcr;

export function setOcrProvider(provider: OcrProvider) {
  active = provider;
}

export function getOcrProvider(): OcrProvider {
  return active;
}
