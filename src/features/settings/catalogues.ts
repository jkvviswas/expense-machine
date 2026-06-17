import {
  COUNTRY_DATA,
  CURRENCY_DATA,
  TIMEZONE_DATA,
  type CountryData,
  type CurrencyData,
  type TimezoneData,
} from './localizationData';
import { TZ_ABBR, gmtOffsetLabel } from './timezoneAbbr';

/**
 * Full localization catalogues (countries, currencies, timezones) and their
 * lookups. Kept separate from localization.ts so the lightweight date/time
 * formatters used by the header and dashboard never pull this large dataset
 * into the main bundle — only the Settings chunk imports this.
 */

export type Country = CountryData;

export const COUNTRIES: Country[] = COUNTRY_DATA;
export const CURRENCIES: CurrencyData[] = CURRENCY_DATA;
export const TIMEZONES: TimezoneData[] = TIMEZONE_DATA;

export function findCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}
export function findCurrency(code: string): CurrencyData | undefined {
  return CURRENCIES.find((c) => c.code === code);
}
export function findTimezone(tz: string): TimezoneData | undefined {
  return TIMEZONES.find((t) => t.tz === tz);
}

/** Currency symbol for a code (from the catalogue; falls back to the code). */
export function currencySymbol(code: string): string {
  return findCurrency(code)?.symbol ?? code;
}

/**
 * Display label for a currency. If a distinct symbol exists, "₹ INR"; if the
 * "symbol" is just the code (no reliable glyph), only "INR" — never "INR INR".
 */
export function currencyDisplay(code: string): string {
  const c = findCurrency(code);
  if (!c) return code;
  const hasSymbol = c.symbol && c.symbol !== c.code;
  return hasSymbol ? `${c.symbol} ${c.code}` : c.code;
}

/** Searchable currency options with consistent labels. */
export interface CurrencyOption {
  value: string;
  label: string;
  keywords: string;
}
export function currencyOptions(): CurrencyOption[] {
  return CURRENCIES.map((c) => ({
    value: c.code,
    label: currencyDisplay(c.code),
    keywords: `${c.code} ${c.name}`,
  }));
}

/** Preferred abbreviation for a timezone (IST, EST, CET…), else GMT offset. */
export function timezoneLabel(tz: string): string {
  if (TZ_ABBR[tz]) return TZ_ABBR[tz];
  const t = findTimezone(tz);
  if (t) {
    if (/^[A-Z]{2,5}$/.test(t.abbr) && !/^GMT/.test(t.abbr) && !/^UTC[+-]/.test(t.abbr)) return t.abbr;
    return gmtOffsetLabel(t.offsetMin);
  }
  return '';
}

/** Searchable timezone options as "IST • Asia/Kolkata" (abbreviation leads). */
export interface TimezoneOption {
  value: string;
  label: string; // "IST • Asia/Kolkata"
  abbr: string;
  keywords: string;
}
export function timezoneOptions(): TimezoneOption[] {
  return TIMEZONES.map((t) => {
    const abbr = timezoneLabel(t.tz);
    const zone = t.tz.replace(/_/g, ' ');
    return { value: t.tz, label: `${abbr} • ${zone}`, abbr, keywords: `${t.tz} ${abbr}` };
  });
}
