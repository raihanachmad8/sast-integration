/**
 * Purpose: Utility functions for exporting data to CSV format.
 */

/**
 * Convert an array of objects to CSV string.
 *
 * @param data - Array of objects to convert
 * @param columns - Column definitions with key and optional label
 * @returns CSV string with headers
 *
 * @example
 * ```ts
 * const csv = toCSV([
 *   { name: 'John', age: 30 },
 *   { name: 'Jane', age: 25 },
 * ], [
 *   { key: 'name', label: 'Name' },
 *   { key: 'age', label: 'Age' },
 * ]);
 * // Returns: "Name,Age\nJohn,30\nJane,25"
 * ```
 */
export function toCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; label: string }[]
): string {
  const headers = columns.map((c) => c.label).join(',');
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const value = row[c.key];
        const str = String(value ?? '');
        // Escape quotes and wrap in quotes if contains comma or newline
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(',')
  );
  return [headers, ...rows].join('\n');
}

/**
 * Download a string as a file.
 *
 * @param content - File content
 * @param filename - Filename with extension
 * @param mimeType - MIME type (default: text/csv)
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/csv'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data to CSV and trigger download.
 *
 * @param data - Array of objects to export
 * @param columns - Column definitions
 * @param filename - Filename without extension
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; label: string }[],
  filename: string
): void {
  const csv = toCSV(data, columns);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(csv, `${filename}-${timestamp}.csv`);
}
