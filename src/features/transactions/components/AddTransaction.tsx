import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { CategorySelect } from '../../import/components/CategorySelect';
import { transactionsStore } from '../store';
import type { Category, PaymentMethod } from '../types';

interface AddTransactionProps {
  open: boolean;
  onClose: () => void;
  /** Account ids present in the ledger, for the account selector. */
  accountOptions: { id: string; label: string }[];
}

const METHODS: PaymentMethod[] = ['UPI', 'Debit Card', 'Credit Card', 'NEFT', 'Net Banking', 'Auto-pay', 'Cash'];

export function AddTransaction({ open, onClose, accountOptions }: AddTransactionProps) {
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState<Category>('Uncategorized');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [account, setAccount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [notes, setNotes] = useState('');

  const reset = () => {
    setMerchant(''); setAmount(''); setType('expense'); setCategory('Uncategorized');
    setDate(new Date().toISOString().slice(0, 10)); setAccount(''); setMethod('UPI'); setNotes('');
  };

  const valid = merchant.trim() !== '' && amount.trim() !== '' && Number(amount) > 0;

  const submit = () => {
    if (!valid) return;
    const signed = type === 'income' ? Math.abs(Number(amount)) : -Math.abs(Number(amount));
    transactionsStore.add({
      date,
      merchant: merchant.trim(),
      description: notes.trim() || merchant.trim(),
      amount: signed,
      category: type === 'income' && category === 'Uncategorized' ? 'Income' : category,
      accountId: account || accountOptions[0]?.id || 'manual',
      paymentMethod: method,
      notes: notes.trim() || undefined,
      confidence: 1,
      edited: true,
    });
    reset();
    onClose();
  };

  const field = 'h-11 w-full rounded-control border border-hairline bg-ground px-3 text-[0.9rem] text-bright placeholder:text-faint transition-colors focus:border-brass focus:outline-none';
  const label = 'mb-1.5 block font-mono text-[0.62rem] uppercase tracking-[0.12em] text-faint';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-void/75 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-1/2 top-1/2 z-[70] max-h-[90vh] w-[min(480px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-panel border border-hairline-strong bg-surface p-7 shadow-elevated"
            initial={{ opacity: 0, scale: 0.96, y: '-46%' }} animate={{ opacity: 1, scale: 1, y: '-50%' }} exit={{ opacity: 0, scale: 0.96, y: '-46%' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-serif text-[1.4rem] text-bright">Add transaction</h3>
              <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-control text-muted transition-colors hover:text-bright">
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            <div className="mb-4">
              <label className={label}>Merchant / payee</label>
              <input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. Swiggy" autoFocus className={field} />
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Amount (₹)</label>
                <input type="number" inputMode="numeric" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className={field} />
              </div>
              <div>
                <label className={label}>Type</label>
                <div className="flex h-11 rounded-control border border-hairline p-1">
                  {(['expense', 'income'] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setType(t)}
                      className={['flex-1 rounded-[5px] text-[0.82rem] capitalize transition-colors', type === t ? 'bg-brass text-void' : 'text-muted'].join(' ')}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Category</label>
                <CategorySelect value={category} onChange={setCategory} />
              </div>
              <div>
                <label className={label}>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Account</label>
                <select value={account} onChange={(e) => setAccount(e.target.value)} className={field}>
                  <option value="">{accountOptions.length ? 'Select…' : 'Manual'}</option>
                  {accountOptions.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Method</label>
                <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={field}>
                  {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="mb-7">
              <label className={label}>Notes</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className={field} />
            </div>

            <button type="button" disabled={!valid} onClick={submit}
              className="w-full rounded-control bg-brass px-5 py-2.5 text-[0.88rem] font-medium text-void transition-colors duration-300 ease-lux hover:bg-brass-bright disabled:cursor-not-allowed disabled:opacity-40">
              Add transaction
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
