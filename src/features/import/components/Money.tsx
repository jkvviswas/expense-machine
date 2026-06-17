import { formatMoney } from '../format';

interface MoneyProps {
  amount: number;
  /** Color by direction (gain/loss). When false, uses bright. */
  colorize?: boolean;
  className?: string;
  /**
   * 'superscript' (default) renders paise as a smaller raised suffix —
   * compact for tables/lists. 'inline' renders the decimal at full size as
   * part of the same text run, so the whole figure (₹ + integer + decimal)
   * is one uniform block whose bounding-box center matches its visual
   * center — required for centering inside a fixed shape (e.g. the
   * dashboard hero circle) regardless of digit count or sign.
   */
  decimalStyle?: 'superscript' | 'inline';
}

/**
 * The V2 money treatment, India-first: ₹, Geist Mono tabular figures, Indian
 * grouping. Paise are shown as smaller superscript only when present (most
 * statement rows are whole rupees, so figures stay clean).
 */
export function Money({ amount, colorize = true, className = '', decimalStyle = 'inline' }: MoneyProps) {
  const { whole, paise, sign } = formatMoney(amount);
  const tone = !colorize
    ? 'text-bright'
    : amount >= 0
      ? 'text-gain'
      : 'text-loss';
  return (
    <span className={`font-num whitespace-nowrap ${tone} ${className}`}>
      {sign}₹{whole}
      {paise && (
        decimalStyle === 'inline'
          ? <>.{paise}</>
          : <span className="text-[0.62em] align-super text-muted">.{paise}</span>
      )}
    </span>
  );
}
