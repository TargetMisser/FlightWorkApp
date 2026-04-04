/**
 * Centralised date/time formatters — Italian locale.
 * Avoids scattered toLocaleTimeString calls with inconsistent options.
 */

const TIME_OPTIONS: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
const LOCALE = 'it-IT';

/** Format a Date or unix-seconds timestamp to "HH:MM". */
export function fmtTime(input: Date | number): string {
  const date = typeof input === 'number'
    ? new Date(input > 1e12 ? input : input * 1000)   // auto-detect seconds vs ms
    : input;
  return date.toLocaleTimeString(LOCALE, TIME_OPTIONS);
}

/** Format a unix-seconds departure minus an offset in minutes to "HH:MM". */
export function fmtOffset(departureSec: number, offsetMinutes: number): string {
  return fmtTime(departureSec - offsetMinutes * 60);
}

/** Italian month names (0-indexed). */
export const MONTHS_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
] as const;

/** Format ISO date "YYYY-MM-DD" → "Lun 05/03". */
export function fmtDateShort(iso: string): string {
  const [y, m, d] = iso.split('-');
  const dt = new Date(+y, +m - 1, +d);
  const dayName = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'][dt.getDay()];
  return `${dayName} ${d}/${m}`;
}
