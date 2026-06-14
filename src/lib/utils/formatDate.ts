import { DATE_LOCALE } from '@/commons/types';

/**
 * Format an ISO date string to a human-readable format.
 *
 * @param value - ISO date string
 * @param options - Optional Intl.DateTimeFormatOptions override
 * @returns Formatted date string (e.g., "Jan 1, 2026")
 *
 * @example
 * formatDate('2026-01-15T00:00:00Z') // 'Jan 15, 2026'
 */
export function formatDate(
  value: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
): string {
  return new Date(value).toLocaleDateString(DATE_LOCALE, options);
}

/**
 * Format a date with "Today" or "Joined" prefix for relative context.
 *
 * @param value - ISO date string
 * @returns "Today" if the date is today, otherwise "Joined Jan 1, 2026"
 *
 * @example
 * formatJoinedDate(new Date().toISOString()) // 'Today'
 * formatJoinedDate('2026-01-15T00:00:00Z')  // 'Joined Jan 15, 2026'
 */
export function formatJoinedDate(value: string): string {
  const date = new Date(value);
  const today = new Date();

  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return 'Today';
  }

  return `Joined ${formatDate(value)}`;
}
