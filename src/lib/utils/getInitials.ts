/**
 * Extract up to 2 initials from a name or email string.
 * Splits on whitespace, @, dots, underscores, and hyphens.
 *
 * @param name - Full name or email
 * @param fallback - Fallback string if no initials can be extracted (default: 'U')
 * @returns Uppercase initials (1-2 characters)
 *
 * @example
 * getInitials('John Doe')      // 'JD'
 * getInitials('john@test.com') // 'JT'
 * getInitials('')              // 'U'
 */
export function getInitials(name: string, fallback = 'U'): string {
  const source = name.trim();
  if (!source) return fallback;

  const initials = source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();

  return initials || fallback;
}
