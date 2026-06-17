/**
 * ============================================================================
 *  PDF TEXT EXTRACTION  (presentation-layer, additive)
 * ============================================================================
 *
 * Extracts a text layer from a PDF bank statement using pdfjs-dist, entirely
 * client-side. Returns lines grouped per page, reconstructed from positioned
 * text items (pdfjs gives loose text fragments with coordinates; we re-assemble
 * them into visual rows by y-position so a downstream parser can read columns).
 *
 * BUNDLE NOTE: pdfjs is heavy and imported dynamically by the PDF parser, so it
 * never ships in the initial bundle.
 *
 * OCR-READY SEAM: `extractPdfText` reports whether a usable text layer was
 * found (`hasText`). Scanned/image-only statements yield little or no text;
 * that signal is where an OCR provider (Tesseract.js client-side, or a
 * server/Textract round-trip) would plug in later — the parser interface and
 * the downstream normalization layer stay identical regardless of source.
 */

export interface PdfTextLine {
  page: number;
  /** Reconstructed line text, left-to-right. */
  text: string;
  /** Approximate y-position (descending down the page) for ordering/debug. */
  y: number;
}

export interface PdfTextResult {
  lines: PdfTextLine[];
  pageCount: number;
  /** True if a meaningful text layer was found (vs a scanned/image PDF). */
  hasText: boolean;
  /** Total characters extracted — a cheap signal of text-layer richness. */
  charCount: number;
}

// Group text items into the same line if their vertical positions are within
// this fraction of the page height.
const LINE_TOLERANCE = 3;

interface TextItemLike {
  str: string;
  transform: number[]; // [a,b,c,d,e,f]; e=x, f=y
}

/**
 * Extract and reconstruct text lines from a PDF file. Configures the pdfjs
 * worker from the installed package so it works under Vite without a manual
 * asset copy.
 */
export async function extractPdfText(file: File): Promise<PdfTextResult> {
  const pdfjs = await import('pdfjs-dist');
  // Wire the worker. Vite resolves this URL at build time.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfjs as any).GlobalWorkerOptions.workerSrc = (
    await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  ).default;

  const data = await file.arrayBuffer();
  let doc;
  try {
    doc = await pdfjs.getDocument({ data }).promise;
  } catch (e: any) {
    if (e?.name === 'PasswordException') {
      throw new Error('This PDF is password-protected. Please remove the password and try again.');
    }
    if (e?.name === 'InvalidPDFException') {
      throw new Error('This file could not be read as a PDF. It may be corrupted or not a valid PDF.');
    }
    throw new Error('Could not open this PDF. It may be corrupted or unsupported.');
  }

  const lines: PdfTextLine[] = [];
  let charCount = 0;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = content.items as unknown as TextItemLike[];

    // Bucket items by rounded y so fragments on the same visual row merge.
    const rows = new Map<number, { y: number; parts: { x: number; str: string }[] }>();
    for (const it of items) {
      if (!it.str) continue;
      charCount += it.str.length;
      const x = it.transform[4];
      const y = it.transform[5];
      const key = Math.round(y / LINE_TOLERANCE);
      const row = rows.get(key);
      if (row) row.parts.push({ x, str: it.str });
      else rows.set(key, { y, parts: [{ x, str: it.str }] });
    }

    // Emit rows top-to-bottom; within a row, left-to-right.
    const ordered = [...rows.values()].sort((a, b) => b.y - a.y);
    for (const row of ordered) {
      const text = row.parts
        .sort((a, b) => a.x - b.x)
        .map((p) => p.str)
        .join(' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      if (text) lines.push({ page: p, text, y: row.y });
    }
  }

  // A real statement page has hundreds of characters; an image-only scan has
  // near-zero. Use a conservative floor to decide whether OCR would be needed.
  const hasText = charCount > 40 && lines.length > 3;

  return { lines, pageCount: doc.numPages, hasText, charCount };
}
