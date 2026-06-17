import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  FileType,
  ShieldCheck,
  Lock,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import { Reveal, RevealItem } from './Reveal';
import { useImportHistory, importHistoryStore } from '../parsing/importHistory';
import { Trash2 } from 'lucide-react';

interface UploadScreenProps {
  onFileChosen: (fileName: string, file?: File) => void;
}

const supported = [
  { icon: FileText, label: 'PDF', hint: 'Bank statements' },
  { icon: FileSpreadsheet, label: 'CSV', hint: 'Exports' },
  { icon: FileType, label: 'XLSX', hint: 'Spreadsheets' },
];

const fileTypeIcon: Record<string, typeof FileText> = {
  PDF: FileText,
  CSV: FileSpreadsheet,
  XLSX: FileType,
};

export function UploadScreen({ onFileChosen }: UploadScreenProps) {
  const recentImports = useImportHistory();
  const [dragging, setDragging] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files?.[0];
      onFileChosen(f?.name ?? 'HDFC_Statement_May_2026.pdf', f);
    },
    [onFileChosen],
  );

  return (
    <Reveal className="grid gap-7 lg:grid-cols-[1.55fr_1fr]">
      {/* ---- Left: the drop zone ---- */}
      <RevealItem>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={[
            'relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden rounded-panel border bg-surface px-8 py-14 text-center transition-colors duration-500 ease-lux',
            dragging ? 'border-brass' : 'border-hairline',
          ].join(' ')}
        >
          {/* one ambient focal glow, intensifies on drag */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full"
            animate={{ opacity: dragging ? 0.5 : 0.28 }}
            transition={{ duration: 0.5 }}
            style={{
              background:
                'radial-gradient(circle, var(--em-glow-focal), transparent 60%)',
            }}
          />

          <motion.div
            className="relative z-[1] mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-brass-deep"
            animate={{
              y: dragging ? -4 : 0,
              boxShadow: dragging
                ? '0 0 50px var(--em-glow-focal), inset 0 0 30px var(--em-glow-brass)'
                : 'inset 0 0 26px var(--em-glow-brass)',
            }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <UploadCloud size={30} strokeWidth={1.5} className="text-brass" />
          </motion.div>

          <h2 className="relative z-[1] mb-2 font-serif text-[1.7rem] leading-tight text-bright">
            {dragging ? 'Release to begin' : 'Drop your statement here'}
          </h2>
          <p className="relative z-[1] mb-7 max-w-sm text-[0.92rem] text-muted">
            We&rsquo;ll read it, extract every transaction, and organize your
            money in seconds. Your file never leaves an encrypted channel.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.csv,.xlsx"
            className="hidden"
            onChange={(e) =>
              onFileChosen(
                e.target.files?.[0]?.name ?? 'HDFC_Statement_May_2026.pdf',
                e.target.files?.[0],
              )
            }
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="relative z-[1] rounded-control bg-brass px-6 py-2.5 text-[0.9rem] font-medium text-void transition-colors duration-300 ease-lux hover:bg-brass-bright"
          >
            Browse files
          </button>

          {/* supported types */}
          <div className="relative z-[1] mt-10 flex flex-wrap items-center justify-center gap-3">
            {supported.map(({ icon: Icon, label, hint }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 rounded-control border border-hairline bg-elevated px-3.5 py-2"
              >
                <Icon size={16} strokeWidth={1.75} className="text-soft" />
                <div className="text-left leading-tight">
                  <div className="font-mono text-[0.72rem] text-bright">
                    {label}
                  </div>
                  <div className="text-[0.66rem] text-faint">{hint}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </RevealItem>

      {/* ---- Right: trust + recent ---- */}
      <div className="flex flex-col gap-7">
        {/* Security reassurance */}
        <RevealItem>
          <div className="rounded-panel border border-hairline bg-surface p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <ShieldCheck size={18} strokeWidth={1.75} className="text-brass" />
              <h3 className="font-serif text-[1.15rem] text-bright">
                Handled with care
              </h3>
            </div>
            <ul className="flex flex-col gap-3.5">
              {[
                { icon: Lock, text: 'Encrypted in transit and at rest.' },
                { icon: EyeOff, text: 'Never sold, never shared with third parties.' },
                { icon: CheckCircle2, text: 'You review every transaction before anything is saved.' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <Icon
                    size={15}
                    strokeWidth={1.75}
                    className="mt-0.5 flex-none text-muted"
                  />
                  <span className="text-[0.86rem] leading-snug text-soft">
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </RevealItem>

        {/* Recent imports */}
        <RevealItem>
          <div className="rounded-panel border border-hairline bg-surface p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-serif text-[1.15rem] text-bright">
                Recent imports
              </h3>
              {recentImports.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="font-mono text-[0.66rem] uppercase tracking-wider text-muted transition-colors hover:text-loss"
                >
                  Clear History
                </button>
              )}
            </div>
            {recentImports.length === 0 ? (
              <p className="text-[0.82rem] text-faint">No import history yet.</p>
            ) : (
              <div className="flex max-h-[400px] flex-col overflow-y-auto scroll-smooth">
                {recentImports.map((r, i) => {
                  const Icon = fileTypeIcon[r.fileType];
                  return (
                    <div
                      key={r.id}
                      className={[
                        'group flex items-center gap-3 py-3',
                        i < recentImports.length - 1
                          ? 'border-b border-hairline'
                          : '',
                      ].join(' ')}
                    >
                      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-control border border-hairline bg-elevated">
                        <Icon size={15} strokeWidth={1.75} className="text-soft" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[0.84rem] text-bright">
                          {r.fileName}
                        </div>
                        <div className="text-[0.72rem] text-faint">
                          {r.importedOn} · {r.transactionCount} transactions
                          {r.bankName ? ` · ${r.bankName}` : ''}
                        </div>
                      </div>
                      <span className="flex items-center gap-1.5 font-mono text-[0.66rem] uppercase tracking-wider text-gain">
                        <CheckCircle2 size={12} /> done
                      </span>
                      <button
                        type="button"
                        aria-label="Delete this history record"
                        onClick={() => importHistoryStore.remove(r.id)}
                        className="flex h-7 w-7 flex-none items-center justify-center rounded-control text-faint opacity-0 transition-colors group-hover:opacity-100 hover:bg-loss/10 hover:text-loss"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </RevealItem>
      </div>

      {confirmClear && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-panel border border-hairline bg-elevated p-5">
            <h3 className="font-serif text-[1.05rem] text-bright">Clear import history?</h3>
            <p className="mt-2 text-[0.84rem] text-muted">
              This removes the Recent Imports list only. Your imported transactions, accounts,
              categories, and budgets are not affected.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="h-9 rounded-control border border-hairline px-4 text-[0.84rem] text-soft hover:border-brass-deep"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { importHistoryStore.clearHistory(); setConfirmClear(false); }}
                className="h-9 rounded-control bg-loss px-4 text-[0.84rem] font-medium text-void hover:opacity-90"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}
    </Reveal>
  );
}
