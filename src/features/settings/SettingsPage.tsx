import { useRef, useState, useEffect } from 'react';
import { CategoriesSection } from './components/CategoriesSection';
import { BalancePrivacySection } from './components/BalancePrivacySection';
import { Check, RotateCcw, Download, Upload, Trash2 } from 'lucide-react';
import { PageStage, StageItem } from '../../components/layout/PageStage';
import { useSettings, settingsStore } from './store';
import { budgetStore } from '../budgets/store';
import { transactionsStore } from '../transactions/store';
import { importHistoryStore } from '../import/parsing/importHistory';
import { persist } from '../../lib/persist';
import { buildBackup, parseBackup, restoreBackup, BackupError } from './backup';
import { SettingsSection, SettingRow, Toggle, Segmented, TextField } from './components/controls';
import { SearchableSelect } from './components/SearchableSelect';
import { COUNTRIES, findCountry, currencyOptions, timezoneOptions } from './catalogues';
import { useThemeMode, type ThemeMode } from '../theme/store';
import { setThemeMode } from '../theme/ThemeProvider';
import { useAuth, authStore } from '../auth/store';

export function SettingsPage() {
  const s = useSettings();
  const { user } = useAuth();
  const themeMode = useThemeMode();
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Identity seeding (runs once): if the stored profile is empty or holds a
  // legacy demo value from an earlier build, seed it from the signed-in
  // account. After seeding, the settings store is the single source of truth
  // for the Name/Email fields — so the inputs are directly editable, can be
  // cleared, and persist exactly what the user types (no display fallback that
  // would fight edits or snap the value back).
  const LEGACY_DEMO = new Set(['vikram', 'vikram@example.in']);
  useEffect(() => {
    if (!user) return;
    const nameEmpty = !s.name.trim() || LEGACY_DEMO.has(s.name.trim().toLowerCase());
    const emailEmpty = !s.email.trim() || LEGACY_DEMO.has(s.email.trim().toLowerCase());
    if (nameEmpty && user.name) settingsStore.set('name', user.name);
    if (emailEmpty && user.email) settingsStore.set('email', user.email);
    // Keep the username field seeded from the signed-in account.
    if (!s.username?.trim() && user.username) settingsStore.set('username', user.username);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const flash = (msg: string) => {
    setSavedFlash(msg);
    window.setTimeout(() => setSavedFlash(null), 2600);
  };

  // Avatar follows the live edited name (falls back to the account, then '?').
  const avatarInitial = (s.name.trim()[0] || user?.name?.trim()[0] || '?').toUpperCase();

  // Profile fields persist instantly; show a brief "Changes saved" confirmation
  // and keep the auth session display name/email in sync (Priority 5).
  const setProfile = (key: 'name' | 'email' | 'username' | 'dateOfBirth' | 'occupation' | 'city' | 'gender', value: string) => {
    settingsStore.set(key, value);
    if (key === 'name' || key === 'email' || key === 'username') {
      try { authStore.updateProfile({ [key]: value } as { name?: string; email?: string; username?: string }); } catch { /* ignore invalid intermediate values */ }
    }
    flash('Changes saved');
  };

  const exportAll = () => {
    const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-machine-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash('Backup downloaded.');
  };

  const onRestoreFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const backup = parseBackup(text);
      const result = restoreBackup(backup);
      flash(
        `Restored ${result.transactions} transaction${result.transactions === 1 ? '' : 's'} and ${result.budgets} budget${result.budgets === 1 ? '' : 's'}.`,
      );
    } catch (e) {
      const msg =
        e instanceof BackupError
          ? e.message
          : 'Couldn’t restore that file.';
      flash(msg);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <PageStage>
      <StageItem className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-brass">Preferences</p>
          <h2 className="font-serif text-[2.2rem] leading-tight text-bright">Settings</h2>
          <p className="mt-1 text-[0.9rem] text-muted">Tune Expense Machine to the way you work.</p>
        </div>
        {savedFlash && (
          <div className="flex items-center gap-2 rounded-control border border-brass-deep bg-brass-deep/20 px-3.5 py-2 text-[0.82rem] text-brass">
            <Check size={14} /> {savedFlash}
          </div>
        )}
      </StageItem>

      <div className="flex flex-col gap-6">
        {/* Profile */}
        <StageItem>
          <SettingsSection title="Profile" description="How you appear across Expense Machine.">
            <div className="mb-2 flex items-center gap-4 border-b border-hairline py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-brass-deep font-serif text-[1.5rem] text-brass"
                style={{ boxShadow: 'inset 0 0 20px var(--em-glow-brass)' }}>
                {avatarInitial}
              </div>
              <div className="text-[0.82rem] text-muted">Your avatar is generated from your name.</div>
            </div>
            <SettingRow label="Name">
              <TextField value={s.name} onChange={(v) => setProfile('name', v)} placeholder="Your name" />
            </SettingRow>
            <SettingRow label="Username" hint="Your display handle.">
              <TextField value={s.username} onChange={(v) => setProfile('username', v)} placeholder="your_handle" />
            </SettingRow>
            <SettingRow label="Email">
              <TextField value={s.email} onChange={(v) => setProfile('email', v)} placeholder="you@example.in" type="email" />
            </SettingRow>
            <SettingRow label="Date of birth" hint="Optional. Used for a birthday greeting.">
              <TextField value={s.dateOfBirth} onChange={(v) => setProfile('dateOfBirth', v)} placeholder="" type="date" />
            </SettingRow>
            <SettingRow label="Occupation" hint="Optional.">
              <TextField value={s.occupation} onChange={(v) => setProfile('occupation', v)} placeholder="e.g. Designer" />
            </SettingRow>
            <SettingRow label="City" hint="Optional.">
              <TextField value={s.city} onChange={(v) => setProfile('city', v)} placeholder="e.g. Chennai" />
            </SettingRow>
            <SettingRow label="Gender" hint="Optional.">
              <TextField value={s.gender} onChange={(v) => setProfile('gender', v)} placeholder="" />
            </SettingRow>
          </SettingsSection>
        </StageItem>

        {/* Appearance */}
        <StageItem>
          <SettingsSection title="Appearance" description="Interface and accessibility preferences.">
            <SettingRow label="Theme" hint="Light, dark, or follow your system. Changes apply instantly with a smooth transition.">
              <Segmented<ThemeMode>
                value={themeMode}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'System' },
                ]}
                onChange={(v) => setThemeMode(v)}
              />
            </SettingRow>
            <SettingRow label="Reduce motion" hint="Minimise animations and transitions.">
              <Toggle on={s.reduceMotion} onChange={(v) => settingsStore.set('reduceMotion', v)} />
            </SettingRow>
            <SettingRow label="Dense tables" hint="Tighter row spacing in ledgers and reports.">
              <Toggle on={s.denseTables} onChange={(v) => settingsStore.set('denseTables', v)} />
            </SettingRow>
            <SettingRow label="Higher contrast" hint="Increase text contrast for readability.">
              <Toggle on={s.highContrast} onChange={(v) => settingsStore.set('highContrast', v)} />
            </SettingRow>
          </SettingsSection>
        </StageItem>

        {/* Regional preferences */}
        <StageItem>
          <SettingsSection title="Regional preferences" description="Country, currency, timezone and formats. These localize how dates, times and numbers are presented.">
            <SettingRow label="Country" hint="Sets sensible defaults for the fields below.">
              <SearchableSelect
                value={s.country}
                onChange={(code) => {
                  const c = findCountry(code);
                  settingsStore.set('country', code);
                  if (c) {
                    settingsStore.set('currency', c.currency);
                    settingsStore.set('timezone', c.timezone);
                    settingsStore.set('numberFormat', c.numberFormat);
                    settingsStore.set('dateFormat', c.dateFormat);
                  }
                }}
                placeholder="Select country"
                searchPlaceholder="Search country…"
                options={COUNTRIES.map((c) => ({ value: c.code, code: c.code, label: c.name, meta: c.currency }))}
              />
            </SettingRow>
            <SettingRow label="Currency" hint="Recorded as a preference; figures stay India-first ₹ in this version.">
              <SearchableSelect
                value={s.currency}
                onChange={(code) => settingsStore.set('currency', code)}
                placeholder="Select currency"
                searchPlaceholder="Search currency…"
                options={currencyOptions()}
              />
            </SettingRow>
            <SettingRow label="Timezone" hint="The dashboard clock and greetings follow this.">
              <SearchableSelect
                value={s.timezone}
                onChange={(tz) => settingsStore.set('timezone', tz)}
                placeholder="Select timezone"
                searchPlaceholder="Search city or abbreviation…"
                width="w-64"
                menuWidth="w-80"
                options={timezoneOptions()}
              />
            </SettingRow>
            <SettingRow label="Date format" hint="Order used in compact, numeric dates.">
              <Segmented
                value={s.dateFormat}
                options={[
                  { value: 'dmy', label: 'D/M/Y' },
                  { value: 'mdy', label: 'M/D/Y' },
                  { value: 'ymd', label: 'Y/M/D' },
                ]}
                onChange={(v) => settingsStore.set('dateFormat', v)}
              />
            </SettingRow>
            <SettingRow label="Number format" hint="Digit grouping style for amounts.">
              <Segmented
                value={s.numberFormat}
                options={[
                  { value: 'en-IN', label: '12,34,567' },
                  { value: 'en-US', label: '1,234,567' },
                  { value: 'de-DE', label: '1.234.567' },
                ]}
                onChange={(v) => settingsStore.set('numberFormat', v)}
              />
            </SettingRow>
          </SettingsSection>
        </StageItem>

        {/* Finance preferences */}
        <StageItem>
          <SettingsSection title="Finance preferences" description="These shape how your money is presented. Changes are saved to your preferences.">
            <SettingRow label="Reference month" hint="Which month the dashboard and reports center on.">
              <Segmented
                value={s.referenceMonth}
                options={[{ value: 'latest', label: 'Latest' }, { value: 'auto', label: 'Auto' }]}
                onChange={(v) => settingsStore.set('referenceMonth', v)}
              />
            </SettingRow>
            <SettingRow label="Safe-to-Spend buffer" hint="Cushion held back before money is called 'safe to spend'.">
              <Segmented
                value={String(s.safeToSpendBuffer)}
                options={[{ value: '5', label: '5%' }, { value: '10', label: '10%' }, { value: '15', label: '15%' }]}
                onChange={(v) => settingsStore.set('safeToSpendBuffer', Number(v))}
              />
            </SettingRow>
            <SettingRow label="Budget warnings" hint="Alert when a category approaches its limit.">
              <Toggle on={s.budgetWarnings} onChange={(v) => settingsStore.set('budgetWarnings', v)} />
            </SettingRow>
          </SettingsSection>
        </StageItem>

        {/* Reporting preferences */}
        <StageItem>
          <SettingsSection title="Reporting preferences" description="Defaults for the Reports module.">
            <SettingRow label="Default export format">
              <Segmented
                value={s.defaultExport}
                options={[{ value: 'xlsx', label: 'Excel' }, { value: 'pdf', label: 'PDF' }]}
                onChange={(v) => settingsStore.set('defaultExport', v)}
              />
            </SettingRow>
            <SettingRow label="Report style" hint="Executive is concise; detailed includes every line.">
              <Segmented
                value={s.reportStyle}
                options={[{ value: 'executive', label: 'Executive' }, { value: 'detailed', label: 'Detailed' }]}
                onChange={(v) => settingsStore.set('reportStyle', v)}
              />
            </SettingRow>
          </SettingsSection>
        </StageItem>

        {/* Categories */}
        <StageItem>
          <CategoriesSection />
        </StageItem>

        {/* Balance privacy */}
        <StageItem>
          <BalancePrivacySection />
        </StageItem>

        {/* Import preferences */}
        <StageItem>
          <SettingsSection title="Import preferences" description="How statements are handled on import.">
            <SettingRow label="Auto-categorize" hint="Assign categories automatically during import.">
              <Toggle on={s.autoCategorize} onChange={(v) => settingsStore.set('autoCategorize', v)} />
            </SettingRow>
            <SettingRow label="Duplicate detection" hint="Flag transactions that look like repeats.">
              <Toggle on={s.duplicateDetection} onChange={(v) => settingsStore.set('duplicateDetection', v)} />
            </SettingRow>
          </SettingsSection>
        </StageItem>

        {/* Data management */}
        <StageItem>
          <SettingsSection title="Data management" description="Back up, restore, or reset your workspace.">
            <SettingRow label="Export all data" hint="Download a full JSON backup: settings, budgets, transactions and import history.">
              <button type="button" onClick={exportAll}
                className="flex items-center gap-2 rounded-control border border-hairline px-3.5 py-2 text-[0.82rem] text-soft transition-colors hover:border-brass-deep hover:text-bright">
                <Download size={14} /> Export
              </button>
            </SettingRow>
            <SettingRow label="Restore from backup" hint="Import a previously exported JSON backup. This replaces your current data.">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => onRestoreFile(e.target.files?.[0])}
              />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-control border border-hairline px-3.5 py-2 text-[0.82rem] text-soft transition-colors hover:border-brass-deep hover:text-bright">
                <Upload size={14} /> Restore
              </button>
            </SettingRow>
            <SettingRow label="Reset settings" hint="Return all preferences to their defaults.">
              <button type="button" onClick={() => { settingsStore.reset(); flash('Settings reset to defaults.'); }}
                className="flex items-center gap-2 rounded-control border border-hairline px-3.5 py-2 text-[0.82rem] text-soft transition-colors hover:border-brass-deep hover:text-bright">
                <RotateCcw size={14} /> Reset
              </button>
            </SettingRow>
            <SettingRow label="Clear all data" hint="Remove budgets and reset preferences. This cannot be undone.">
              {confirmClear ? (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => { persist.clearAll(); budgetStore.reset(); settingsStore.reset(); importHistoryStore.reset(); void transactionsStore.resetToSeed(); setConfirmClear(false); flash('Workspace cleared.'); }}
                    className="rounded-control bg-loss px-3 py-2 text-[0.8rem] font-medium text-void">Confirm</button>
                  <button type="button" onClick={() => setConfirmClear(false)}
                    className="rounded-control border border-hairline px-3 py-2 text-[0.8rem] text-muted">Cancel</button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmClear(true)}
                  className="flex items-center gap-2 rounded-control border border-hairline px-3.5 py-2 text-[0.82rem] text-loss transition-colors hover:border-loss">
                  <Trash2 size={14} /> Clear
                </button>
              )}
            </SettingRow>
          </SettingsSection>
        </StageItem>
      </div>
    </PageStage>
  );
}
