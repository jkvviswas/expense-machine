import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { balanceLockStore, useBalanceLock } from '../../balance/lockStore';

/**
 * Balance Privacy controls. Enable a 4-digit PIN that masks the dashboard's
 * Current Balance; change or disable it later. Only the balance figure is gated.
 */
export function BalancePrivacySection() {
  const { enabled } = useBalanceLock();
  const [mode, setMode] = useState<'idle' | 'enable' | 'change' | 'disable'>('idle');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  const reset = () => { setMode('idle'); setPin(''); setPin2(''); setError(''); };
  const showFlash = (m: string) => { setFlash(m); setTimeout(() => setFlash(''), 2200); };

  const onlyDigits = (v: string) => v.replace(/\D/g, '').slice(0, 4);

  const doEnable = () => {
    if (pin.length !== 4) { setError('PIN must be 4 digits.'); return; }
    if (pin !== pin2) { setError('PINs do not match.'); return; }
    balanceLockStore.enable(pin);
    reset(); showFlash('Balance lock enabled');
  };
  const doChange = () => {
    // pin = current, pin2 = new
    if (!balanceLockStore.verify(pin)) { setError('Current PIN is incorrect.'); return; }
    if (pin2.length !== 4) { setError('New PIN must be 4 digits.'); return; }
    balanceLockStore.enable(pin2);
    reset(); showFlash('PIN changed');
  };
  const doDisable = () => {
    if (!balanceLockStore.disable(pin)) { setError('PIN is incorrect.'); return; }
    reset(); showFlash('Balance lock disabled');
  };

  const field = 'h-10 w-36 rounded-control border border-hairline bg-ground px-3 text-[0.9rem] tracking-[0.3em] text-bright placeholder:tracking-normal placeholder:text-faint focus:border-brass focus:outline-none';
  const primaryBtn = 'h-10 rounded-control bg-brass px-4 text-[0.82rem] font-medium text-void transition-colors hover:bg-brass-bright disabled:opacity-40';
  const ghostBtn = 'h-10 rounded-control border border-hairline px-4 text-[0.82rem] text-muted transition-colors hover:text-bright';

  return (
    <div className="rounded-panel border border-hairline bg-surface p-6">
      <div className="flex items-start gap-3">
        <ShieldCheck size={18} strokeWidth={1.75} className="mt-0.5 text-brass" />
        <div className="flex-1">
          <h2 className="font-serif text-[1.2rem] text-bright">Balance privacy</h2>
          <p className="mb-4 mt-1 text-[0.82rem] text-muted">
            Hide your Current Balance on the dashboard behind a 4-digit PIN. Transactions, Reports and Analytics are never locked.
          </p>

          {flash && <p className="mb-3 text-[0.8rem] text-gain">✓ {flash}</p>}

          {mode === 'idle' && (
            <div className="flex items-center gap-2">
              <span className={`font-mono text-[0.72rem] uppercase tracking-[0.12em] ${enabled ? 'text-gain' : 'text-faint'}`}>
                {enabled ? 'Enabled' : 'Disabled'}
              </span>
              <span className="flex-1" />
              {!enabled ? (
                <button type="button" onClick={() => setMode('enable')} className={primaryBtn}>Enable balance lock</button>
              ) : (
                <>
                  <button type="button" onClick={() => setMode('change')} className={ghostBtn}>Change PIN</button>
                  <button type="button" onClick={() => setMode('disable')} className={ghostBtn}>Disable</button>
                </>
              )}
            </div>
          )}

          {mode === 'enable' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input type="password" inputMode="numeric" value={pin} onChange={(e) => { setPin(onlyDigits(e.target.value)); setError(''); }} placeholder="New PIN" className={field} />
                <input type="password" inputMode="numeric" value={pin2} onChange={(e) => { setPin2(onlyDigits(e.target.value)); setError(''); }} placeholder="Confirm" className={field} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={doEnable} className={primaryBtn}>Create PIN</button>
                <button type="button" onClick={reset} className={ghostBtn}>Cancel</button>
              </div>
            </div>
          )}

          {mode === 'change' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input type="password" inputMode="numeric" value={pin} onChange={(e) => { setPin(onlyDigits(e.target.value)); setError(''); }} placeholder="Current PIN" className={field} />
                <input type="password" inputMode="numeric" value={pin2} onChange={(e) => { setPin2(onlyDigits(e.target.value)); setError(''); }} placeholder="New PIN" className={field} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={doChange} className={primaryBtn}>Change PIN</button>
                <button type="button" onClick={reset} className={ghostBtn}>Cancel</button>
              </div>
            </div>
          )}

          {mode === 'disable' && (
            <div className="flex flex-col gap-2">
              <input type="password" inputMode="numeric" value={pin} onChange={(e) => { setPin(onlyDigits(e.target.value)); setError(''); }} placeholder="Enter PIN" className={field} />
              <div className="flex gap-2">
                <button type="button" onClick={doDisable} className={primaryBtn}>Disable lock</button>
                <button type="button" onClick={reset} className={ghostBtn}>Cancel</button>
              </div>
            </div>
          )}

          {error && <p className="mt-2 text-[0.78rem] text-loss">{error}</p>}
        </div>
      </div>
    </div>
  );
}
