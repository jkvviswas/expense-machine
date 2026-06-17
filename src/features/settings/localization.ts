/**
 * ============================================================================
 *  LOCALIZATION  (presentation-layer, additive)
 * ============================================================================
 *
 * Centralizes regional presentation: a searchable country catalogue (with the
 * sensible currency, timezone, date and number defaults for each) and the
 * date/time formatters the app uses. These respect the user's Settings choices
 * (timezone, date format, number locale) and implement the date-formatting
 * audit: FULL month names on premium surfaces (headers, settings, reports,
 * analytics, onboarding, executive overview), ABBREVIATED months only where
 * horizontal space is tight (tables, feeds, chips, mobile lists).
 *
 * No locked calculation is touched — this is formatting only.
 */

/**
 * Formatter-only module (no catalogue data) so date/time helpers used by the
 * header and dashboard stay lightweight. The full country/currency/timezone
 * catalogues and their lookups live in ./catalogues, imported only by Settings.
 */
import { TZ_ABBR, gmtOffsetLabel } from './timezoneAbbr';

// ---- date / time formatting ------------------------------------------------

interface FmtOpts {
  timezone?: string;
  locale?: string;
}

/**
 * Premium surfaces: full month name. e.g. "Saturday, June 7, 2026".
 * Used by headers, settings, reports, analytics summaries, onboarding,
 * executive overviews.
 */
export function formatFullDate(date: Date, opts: FmtOpts = {}): string {
  return date.toLocaleDateString(opts.locale ?? 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: opts.timezone,
  });
}

/** Full date without weekday, e.g. "June 7, 2026". */
export function formatLongDate(date: Date, opts: FmtOpts = {}): string {
  return date.toLocaleDateString(opts.locale ?? 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: opts.timezone,
  });
}

/** Live local time, e.g. "9:14 PM". */
export function formatTime(date: Date, opts: FmtOpts = {}): string {
  return date.toLocaleTimeString(opts.locale ?? 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: opts.timezone,
  });
}

/**
 * Short timezone abbreviation, e.g. "IST", "EST", "CET". Prefers the curated
 * map; if the zone isn't listed, tries the platform short name (only when it's
 * a real abbreviation, not a "GMT+5:30" string); otherwise computes a clean
 * GMT±offset label live.
 */
export function timezoneAbbrev(date: Date, timezone?: string): string {
  if (timezone && TZ_ABBR[timezone]) return TZ_ABBR[timezone];
  // Try the platform short name, but reject offset-style results.
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    }).formatToParts(date);
    const v = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    if (v && /^[A-Z]{2,5}$/.test(v) && !/^GMT/.test(v) && !/^UTC[+-]/.test(v)) return v;
  } catch {
    /* fall through */
  }
  // Live GMT offset fallback.
  if (!timezone) return '';
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const p = Object.fromEntries(
      dtf.formatToParts(date).filter((x) => x.type !== 'literal').map((x) => [x.type, x.value]),
    ) as Record<string, string>;
    const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    const offsetMin = Math.round((asUTC - date.getTime()) / 60000);
    return gmtOffsetLabel(offsetMin);
  } catch {
    return '';
  }
}

/** Time-of-day greeting computed in the user's timezone. */
export function greetingFor(date: Date, timezone?: string): string {
  let hour = date.getHours();
  if (timezone) {
    const h = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone,
    }).format(date);
    hour = parseInt(h, 10) % 24;
  }
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
