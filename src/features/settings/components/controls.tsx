interface RowProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

/** A labelled settings row with control on the right. */
export function SettingRow({ label, hint, children }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-hairline py-4 last:border-b-0">
      <div className="min-w-0">
        <div className="text-[0.9rem] text-bright">{label}</div>
        {hint && <div className="mt-0.5 text-[0.78rem] text-faint">{hint}</div>}
      </div>
      <div className="flex-none">{children}</div>
    </div>
  );
}

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-panel border border-hairline bg-surface p-6">
      <div className="mb-2">
        <h3 className="font-serif text-[1.3rem] text-bright">{title}</h3>
        {description && <p className="mt-1 text-[0.84rem] text-muted">{description}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={[
        'relative h-6 w-11 flex-none rounded-full transition-colors duration-300 ease-lux',
        on ? 'bg-brass' : 'bg-elevated',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 h-5 w-5 rounded-full bg-void transition-all duration-300 ease-lux',
          on ? 'left-[22px]' : 'left-0.5',
        ].join(' ')}
        style={on ? {} : { background: 'var(--em-muted)' }}
      />
    </button>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({ value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="inline-flex rounded-control border border-hairline bg-ground p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={[
            'rounded-[9px] px-3 py-1.5 text-[0.8rem] transition-colors duration-300',
            value === o.value ? 'bg-brass text-void' : 'text-soft hover:text-bright',
          ].join(' ')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-10 w-64 rounded-control border border-hairline bg-ground px-3 text-[0.88rem] text-bright placeholder:text-faint transition-colors duration-300 ease-lux focus:border-brass focus:outline-none"
    />
  );
}
