import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PageStage, StageItem } from '../../components/layout/PageStage';
import { FlowStepper } from './components/FlowStepper';
import { UploadScreen } from './components/UploadScreen';
import { ProcessingScreen } from './components/ProcessingScreen';
import { ExtractionScreen } from './components/ExtractionScreen';
import { ReviewScreen } from './components/ReviewScreen';
import { CompleteScreen } from './components/CompleteScreen';
import { ImportError } from './components/ImportError';
import { extractStatement } from './parsing/registry';
import { toImportInput } from './parsing/types';
import { summarizeExtraction } from './parsing/summary';
import { validateImport } from './parsing/validation';
import { scanDuplicates, type DuplicateMatch } from './parsing/duplicates';
import { importHistoryStore } from './parsing/importHistory';
import { transactionsStore } from '../transactions/store';
import { accounts } from '../transactions/data';
import { accountsStore, useAccounts, type UserAccount } from '../accounts/store';
import { normalizeImportedAccounts } from '../accounts/normalize';
import { suggestAccountMatch } from './parsing/extractMeta';
import { useSettings } from '../settings/store';
import type { Category, FlowStep, ParsedTransaction, StatementMeta } from './types';

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
};

// Imported transactions land in the user's primary account by default.
const DEFAULT_ACCOUNT_ID = accounts[0]?.id ?? 'acc-1';

export function ImportCenter() {
  const settings = useSettings();
  const [step, setStep] = useState<FlowStep>('upload');
  const [statement, setStatement] = useState<StatementMeta | null>(null);
  const [txns, setTxns] = useState<ParsedTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  // True when the curated mock provided the data (PDF / demo path).
  const [isMock, setIsMock] = useState(false);
  // Parsed-txn ids the user has chosen to skip (detected duplicates).
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  // Account the imported rows will be attached to. 'default' = primary; any
  // other value is a user account id. Imports never silently create accounts.
  const userAccounts = useAccounts();
  const [targetAccountId, setTargetAccountId] = useState<string>('default');
  const [suggestedAccount, setSuggestedAccount] = useState<UserAccount | null>(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);

  // Honest, data-driven summary derived from whatever the parser returned.
  const summary = useMemo(() => summarizeExtraction(txns), [txns]);
  // Independent validation + import-confidence report (Phase 16).
  const validation = useMemo(() => validateImport(txns), [txns]);

  // Scan the parsed set against the persisted ledger for likely duplicates.
  const duplicates: DuplicateMatch[] = useMemo(() => {
    if (!settings.duplicateDetection || txns.length === 0) return [];
    const scan = scanDuplicates(txns, transactionsStore.get());
    return [...scan.matches.values()];
  }, [txns, settings.duplicateDetection]);

  const handleFileChosen = useCallback(async (name: string, file?: File) => {
    setError(null);
    setExcluded(new Set());
    setStep('processing');
    try {
      const input = toImportInput(name, file);
      const result = await extractStatement(input);
      setStatement(result.statement);
      setTxns(result.transactions);
      // Suggest a matching existing account from statement metadata; user
      // must confirm — never auto-selected.
      const match = suggestAccountMatch(result.statement, accountsStore.all());
      setSuggestedAccount(match);
      setSuggestionDismissed(false);
      // Badge as sample only when the mock actually produced the data
      // (no real file, or a scanned/unparseable PDF that fell back).
      setIsMock(result.fromMock);
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : 'Something went wrong while reading that file.';
      setError(message);
    }
  }, []);

  // When the review step is reached, pre-select detected duplicates to skip.
  const goToReview = useCallback(() => {
    setExcluded(new Set(duplicates.map((d) => d.parsed.id)));
    setStep('review');
  }, [duplicates]);

  const changeCategory = useCallback((id: string, next: Category) => {
    setTxns((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, category: next, edited: true, confidence: 1 } : t,
      ),
    );
  }, []);

  const bulkCategory = useCallback((ids: string[], next: Category) => {
    const idSet = new Set(ids);
    setTxns((prev) =>
      prev.map((t) =>
        idSet.has(t.id) ? { ...t, category: next, edited: true, confidence: 1 } : t,
      ),
    );
  }, []);

  const toggleExcluded = useCallback((t: ParsedTransaction) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      next.has(t.id) ? next.delete(t.id) : next.add(t.id);
      return next;
    });
  }, []);

  const skipAllDuplicates = useCallback(() => {
    setExcluded(new Set(duplicates.map((d) => d.parsed.id)));
  }, [duplicates]);

  const keepAllDuplicates = useCallback(() => {
    setExcluded(new Set());
  }, []);

  // Create a new account from the detected statement metadata, then target it.
  const createAccountFromStatement = useCallback(() => {
    if (!statement) return;
    const created = accountsStore.add({
      name: statement.accountName || 'Imported account',
      bank: statement.accountName?.split(' ')[0] || 'Bank',
      type: 'Savings',
      last4: (statement.accountMask || '').replace(/\D/g, '').slice(-4),
      openingBalance: 0,
      currency: 'INR',
    });
    setTargetAccountId(created.id);
  }, [statement]);

  // Commit the reviewed (non-excluded) transactions to ledger + history.
  const confirmImport = useCallback(() => {
    const accountId = targetAccountId === 'default' ? DEFAULT_ACCOUNT_ID : targetAccountId;
    const toCommit = txns.filter((t) => !excluded.has(t.id));
    if (toCommit.length > 0) {
      transactionsStore.addImported(toCommit, accountId);
    }
    importHistoryStore.add({
      fileName: statement?.fileName ?? 'Statement',
      fileType: statement?.fileType ?? 'CSV',
      transactionCount: toCommit.length,
      bankName: statement?.bankName ?? statement?.accountName,
    });
    // Normalize orphan accountIds into real accounts. The statement's opening
    // balance is set on the ACCOUNT (single source of truth) rather than as a
    // ledger transaction — so editing it later auto-reconciles everywhere.
    const openingHint =
      statement?.openingBalance != null && statement.openingBalance !== 0
        ? { accountId, amount: statement.openingBalance }
        : undefined;
    normalizeImportedAccounts(openingHint);
    setStep('complete');
  }, [txns, excluded, statement, targetAccountId]);

  const restart = useCallback(() => {
    setTxns([]);
    setStatement(null);
    setError(null);
    setIsMock(false);
    setExcluded(new Set());
    setStep('upload');
  }, []);

  // Transactions actually committed (used by the Complete screen).
  const committed = useMemo(
    () => txns.filter((t) => !excluded.has(t.id)),
    [txns, excluded],
  );

  const showStepper = step !== 'upload' && !error;

  return (
    <PageStage>
      {step === 'upload' && !error && (
        <StageItem className="mb-9 text-center">
          <p className="mb-3 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-brass">
            Import Center
          </p>
          <h2 className="font-serif text-[2.4rem] leading-tight text-bright">
            Turn a statement into clarity
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[0.95rem] text-muted">
            Drop in a bank statement and watch it become organised, categorised
            money — reviewed by you, before anything is saved.
          </p>
        </StageItem>
      )}

      {showStepper && (
        <StageItem className="mb-10">
          <FlowStepper current={step} />
        </StageItem>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={error ? 'error' : step} {...fade}>
          {error ? (
            <ImportError message={error} onRetry={restart} />
          ) : (
            <>
              {step === 'upload' && <UploadScreen onFileChosen={handleFileChosen} />}
              {step === 'processing' && (
                <ProcessingScreen
                  fileName={statement?.fileName ?? 'statement'}
                  fileSizeLabel={statement?.fileSizeLabel ?? '—'}
                  onDone={() => setStep('extraction')}
                />
              )}
              {step === 'extraction' && (
                <ExtractionScreen
                  statement={statement}
                  transactions={txns}
                  summary={summary}
                  confidence={validation.confidence}
                  isMock={isMock}
                  onContinue={goToReview}
                />
              )}
              {step === 'review' && (
                <>
                  {suggestedAccount && !suggestionDismissed && targetAccountId !== suggestedAccount.id && (
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-panel border border-brass-deep/40 bg-brass/5 p-4">
                      <p className="text-[0.84rem] text-soft">
                        <span className="text-bright">{suggestedAccount.name}</span> (••••{suggestedAccount.last4}) appears to match this statement.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => { setTargetAccountId(suggestedAccount.id); setSuggestionDismissed(true); }}
                          className="h-9 rounded-control bg-brass px-3 text-[0.8rem] font-medium text-void transition-colors hover:bg-brass-bright"
                        >
                          Use Suggested Account
                        </button>
                        <button
                          type="button"
                          onClick={() => setSuggestionDismissed(true)}
                          className="h-9 rounded-control border border-hairline px-3 text-[0.8rem] text-soft hover:border-brass-deep"
                        >
                          Select Another
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="mb-4 rounded-panel border border-hairline bg-surface p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-faint">Import into account</p>
                        {statement && (statement.accountName || statement.accountMask) && (
                          <p className="mt-1 text-[0.8rem] text-muted">
                            Detected on statement: <span className="text-soft">{statement.accountName || 'Account'} {statement.accountMask}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={targetAccountId}
                          onChange={(e) => setTargetAccountId(e.target.value)}
                          aria-label="Import target account"
                          className="h-10 rounded-control border border-hairline bg-ground px-3 text-[0.85rem] text-bright focus:border-brass focus:outline-none"
                        >
                          <option value="default">Primary account</option>
                          {userAccounts.filter((a) => !a.archived).map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                        {statement && (statement.accountName || statement.accountMask) && (
                          <button
                            type="button"
                            onClick={createAccountFromStatement}
                            className="h-10 rounded-control border border-brass-deep/50 px-3 text-[0.8rem] text-brass transition-colors hover:bg-brass/10"
                          >
                            Create account from statement
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <ReviewScreen
                    transactions={txns}
                    summary={summary}
                    duplicates={duplicates}
                    excluded={excluded}
                    onToggleExcluded={toggleExcluded}
                    onSkipAllDuplicates={skipAllDuplicates}
                    onKeepAllDuplicates={keepAllDuplicates}
                    onChangeCategory={changeCategory}
                    onBulkCategory={bulkCategory}
                    onConfirm={confirmImport}
                  />
                </>
              )}
              {step === 'complete' && (
                <CompleteScreen transactions={committed} onImportAnother={restart} />
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </PageStage>
  );
}
