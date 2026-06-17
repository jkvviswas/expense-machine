/**
 * Curated IANA timezone → preferred abbreviation map. Lightweight (a single
 * record, no large dataset) so it is safe to import from the header/dashboard
 * formatters as well as the Settings catalogue. Standard-time abbreviations are
 * used (most users recognise these regardless of DST). Zones not listed fall
 * back to a GMT±offset label.
 */
export const TZ_ABBR: Record<string, string> = {
  'Asia/Kolkata': 'IST', 'Asia/Colombo': 'IST',
  'America/Los_Angeles': 'PST', 'America/Vancouver': 'PST', 'America/Tijuana': 'PST',
  'America/Denver': 'MST', 'America/Phoenix': 'MST', 'America/Edmonton': 'MST',
  'America/Chicago': 'CST', 'America/Mexico_City': 'CST', 'America/Winnipeg': 'CST',
  'America/New_York': 'EST', 'America/Toronto': 'EST', 'America/Montreal': 'EST',
  'America/Sao_Paulo': 'BRT', 'America/Argentina/Buenos_Aires': 'ART', 'America/Bogota': 'COT',
  'America/Lima': 'PET', 'America/Santiago': 'CLT', 'America/Anchorage': 'AKST',
  'Pacific/Honolulu': 'HST', 'America/Halifax': 'AST', 'America/St_Johns': 'NST',
  'Europe/London': 'GMT', 'Europe/Dublin': 'GMT', 'Atlantic/Reykjavik': 'GMT',
  'Europe/Lisbon': 'WET',
  'Europe/Paris': 'CET', 'Europe/Berlin': 'CET', 'Europe/Madrid': 'CET', 'Europe/Rome': 'CET',
  'Europe/Amsterdam': 'CET', 'Europe/Brussels': 'CET', 'Europe/Zurich': 'CET', 'Europe/Vienna': 'CET',
  'Europe/Stockholm': 'CET', 'Europe/Oslo': 'CET', 'Europe/Copenhagen': 'CET', 'Europe/Warsaw': 'CET',
  'Europe/Prague': 'CET', 'Europe/Budapest': 'CET',
  'Europe/Athens': 'EET', 'Europe/Helsinki': 'EET', 'Europe/Bucharest': 'EET',
  'Europe/Kiev': 'EET', 'Europe/Kyiv': 'EET', 'Africa/Cairo': 'EET',
  'Europe/Istanbul': 'TRT', 'Europe/Moscow': 'MSK',
  'Asia/Dubai': 'GST', 'Asia/Muscat': 'GST', 'Asia/Riyadh': 'AST', 'Asia/Qatar': 'AST',
  'Asia/Kuwait': 'AST', 'Asia/Baghdad': 'AST',
  'Asia/Tehran': 'IRST', 'Asia/Karachi': 'PKT', 'Asia/Dhaka': 'BST', 'Asia/Kathmandu': 'NPT',
  'Asia/Yangon': 'MMT', 'Asia/Bangkok': 'ICT', 'Asia/Ho_Chi_Minh': 'ICT', 'Asia/Jakarta': 'WIB',
  'Asia/Singapore': 'SGT', 'Asia/Kuala_Lumpur': 'MYT', 'Asia/Manila': 'PHT', 'Asia/Hong_Kong': 'HKT',
  'Asia/Shanghai': 'CST', 'Asia/Taipei': 'CST', 'Asia/Seoul': 'KST', 'Asia/Tokyo': 'JST',
  'Asia/Jerusalem': 'IST',
  'Australia/Perth': 'AWST', 'Australia/Adelaide': 'ACST', 'Australia/Darwin': 'ACST',
  'Australia/Sydney': 'AEST', 'Australia/Melbourne': 'AEST', 'Australia/Brisbane': 'AEST',
  'Pacific/Auckland': 'NZST', 'Pacific/Fiji': 'FJT', 'Pacific/Guam': 'ChST',
  'Africa/Johannesburg': 'SAST', 'Africa/Lagos': 'WAT', 'Africa/Nairobi': 'EAT',
  'Africa/Casablanca': 'WET', 'Africa/Accra': 'GMT', 'Africa/Algiers': 'CET',
  'UTC': 'UTC', 'Etc/UTC': 'UTC',
};

/** GMT±HH:MM label for a numeric offset in minutes. */
export function gmtOffsetLabel(offsetMin: number): string {
  const sign = offsetMin < 0 ? '-' : '+';
  const abs = Math.abs(offsetMin);
  const h = String(Math.floor(abs / 60)).padStart(2, '0');
  const m = String(abs % 60).padStart(2, '0');
  return `GMT${sign}${h}:${m}`;
}
