/**
 * Date utility functions to handle timezone issues.
 * 
 * The main problem: When JavaScript parses a date string like "2026-01-28",
 * it interprets it as UTC midnight. When displayed in local time (e.g., WIB UTC+7),
 * this can cause the date to shift back by 1 day.
 * 
 * Solution: Parse the date string directly without timezone conversion.
 */

/**
 * Formats a date string from the database (YYYY-MM-DD or ISO format) to a localized string.
 * This function avoids timezone issues by parsing the date components directly.
 * 
 * @param dateString - The date string from the database (e.g., "2026-01-28" or "2026-01-28T00:00:00.000Z" or "2026-01-28 00:00:00")
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
  dateString: string | undefined | null,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
): string {
  if (!dateString) return '';
  
  // Extract the date part (YYYY-MM-DD) from the string
  // Handle both ISO format (with T) and MySQL format (with space)
  const datePart = dateString.split('T')[0].split(' ')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  
  // Create a date object using local time (not UTC)
  // This avoids the timezone shift issue
  const date = new Date(year, month - 1, day);
  
  return date.toLocaleDateString('id-ID', options);
}

/**
 * Formats a date string to YYYY-MM-DD format for form inputs.
 * 
 * @param dateString - The date string from the database
 * @returns Date in YYYY-MM-DD format
 */
export function toInputDateFormat(dateString: string | undefined | null): string {
  if (!dateString) {
    // Return today's date in local format
    return getTodayLocal();
  }
  
  // Extract just the date part (handles both "YYYY-MM-DD" and "YYYY-MM-DD HH:MM:SS" formats)
  return dateString.split('T')[0].split(' ')[0];
}

/**
 * Gets today's date in YYYY-MM-DD format using local time.
 * This avoids issues with toISOString() which uses UTC.
 * 
 * @returns Today's date in YYYY-MM-DD format
 */
export function getTodayLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
