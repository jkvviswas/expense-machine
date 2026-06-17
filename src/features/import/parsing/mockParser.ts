import type { ExtractionResult, ImportInput, StatementParser } from './types';
import { indianStatement, indianTransactions, detectedSummary } from './sampleData';

/**
 * The mock parser. It implements the SAME contract a real CSV/PDF/bank
 * parser will implement later, so swapping it out requires no UI changes.
 * It ignores the file contents and returns the curated Indian sample, after
 * a short delay to mimic real extraction latency.
 */
export const mockParser: StatementParser = {
  id: 'mock-india-hdfc',

  // In mock mode we accept anything the user drops.
  canHandle(_input: ImportInput): boolean {
    return true;
  },

  async parse(input: ImportInput): Promise<ExtractionResult> {
    // Reflect the chosen filename if provided, so the UI feels responsive,
    // while keeping the curated transactions + detected summary.
    const statement = input.fileName
      ? { ...indianStatement, fileName: input.fileName }
      : indianStatement;

    // Simulate latency the ProcessingScreen animates over.
    await new Promise((r) => setTimeout(r, 200));

    return { statement, transactions: indianTransactions };
  },
};

/** Re-export the believable detected headline for the Extraction screen. */
export { detectedSummary };
