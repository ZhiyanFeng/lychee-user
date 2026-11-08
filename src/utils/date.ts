/**
 * Small date helpers shared by the booking wizard's `DatePickerModal`, its
 * "Select Move Date" trigger button, and the Step 3 review summary. Kept
 * dependency-free (no date library) since the app doesn't otherwise need
 * one — everything here operates on plain `Date` objects and the
 * `rfqs.move_date`-compatible 'YYYY-MM-DD' string format.
 */

/** Zero-pads a 1-2 digit number to a 2-digit string, e.g. `3` -> `"03"`. */
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** `Date` -> plain local 'YYYY-MM-DD' string (matches `rfqs.move_date`). */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Parses a 'YYYY-MM-DD' string into a local `Date` at midnight, or `null` if malformed/empty. */
export function fromISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** True if both dates fall on the same local calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Strips the time component, returning midnight of the same local day. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * True only if the given 'YYYY-MM-DD' string parses to a date strictly
 * after today (i.e. tomorrow or later) — matches the backend's `@Future`
 * validation on `moveDate` (`LocalDate`), which rejects today's date, not
 * just past dates. Returns `false` for empty/malformed input.
 */
export function isFutureDate(value: string, referenceDate: Date = new Date()): boolean {
  const date = fromISODate(value);
  if (!date) return false;
  return date.getTime() > startOfDay(referenceDate).getTime();
}

/** Tomorrow at local midnight, relative to `referenceDate` (defaults to now). */
export function tomorrow(referenceDate: Date = new Date()): Date {
  const start = startOfDay(referenceDate);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
}

/**
 * Formats a 'YYYY-MM-DD' string for display, e.g. "Sat, Oct 17, 2026".
 * Returns the fallback ('Select Move Date' by default) for empty/malformed input.
 */
export function formatDisplayDate(value: string, fallback = 'Select Move Date'): string {
  const date = fromISODate(value);
  if (!date) return fallback;
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export interface CalendarDay {
  date: Date;
  inCurrentMonth: boolean;
}

/**
 * Builds a full 6-row/7-column month grid (including the trailing days of
 * the previous/next month needed to fill the first/last week), the shape a
 * typical calendar UI renders.
 */
export function getMonthGrid(year: number, month: number): CalendarDay[] {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
  const gridStart = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    return { date, inCurrentMonth: date.getMonth() === month };
  });
}

