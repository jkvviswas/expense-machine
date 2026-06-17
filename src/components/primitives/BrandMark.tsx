interface BrandMarkProps {
  /** Hide the wordmark, show glyph only (collapsed rail). */
  glyphOnly?: boolean;
  size?: number;
}

/**
 * Expense Machine — the Ledger-E monogram.
 *
 * A geometric, architectural "E" built from three ledger bars on a vertical
 * spine; the shorter middle bar gives it a distinct ledger-entry character.
 * Brass on the warm ground — editorial, timeless, unmistakably financial.
 * Recognisable down to 16px. No purple, no lightning, no crypto energy.
 */
export function BrandMark({ glyphOnly = false, size = 34 }: BrandMarkProps) {
  return (
    <div className="flex items-center gap-3 select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        className="flex-none"
      >
        {/* Architectural tile — subtle, lets the monogram breathe. */}
        <rect
          x="3.6"
          y="3.6"
          width="40.8"
          height="40.8"
          rx="10.4"
          fill="none"
          stroke="var(--em-brass)"
          strokeWidth="1.2"
          opacity="0.38"
        />
        <g fill="var(--em-brass)">
          <rect x="15" y="13" width="19" height="4.2" rx="2.1" />
          <rect x="15" y="21.9" width="14" height="4.2" rx="2.1" />
          <rect x="15" y="30.8" width="19" height="4.2" rx="2.1" />
          <rect x="15" y="13" width="4.4" height="22" rx="2.2" />
        </g>
      </svg>
      {!glyphOnly && (
        <span className="font-serif text-[1.12rem] tracking-tight text-bright">
          Expense Machine
        </span>
      )}
    </div>
  );
}
