import { useEffect, useState } from 'react';
import { useSettings } from '../../features/settings/store';
import { formatFullDate, formatTime, timezoneAbbrev, greetingFor } from '../../features/settings/localization';

/**
 * Live local date/time for the header, e.g.
 *   GOOD EVENING • SATURDAY, JUNE 7, 2026 • 9:14 PM IST
 * Updates every 30s and respects the timezone chosen in Settings. Full month
 * name (premium surface). Pure presentation.
 */
export function LiveClock({ className = '' }: { className?: string }) {
  const { timezone } = useSettings();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const greeting = greetingFor(now, timezone).toUpperCase();
  const date = formatFullDate(now, { timezone }).toUpperCase();
  const time = formatTime(now, { timezone });
  const tz = timezoneAbbrev(now, timezone);

  return (
    <span className={`font-mono uppercase tracking-[0.12em] text-faint ${className}`}>
      {greeting} <span className="text-hairline-strong">•</span> {date}{' '}
      <span className="text-hairline-strong">•</span> {time}
      {tz ? ` ${tz}` : ''}
    </span>
  );
}
