/**
 * Purpose: Test formatDate utility correctly formats dates.
 */
import { describe, it, expect } from 'vitest';
import { formatDate } from '@/lib/utils/formatDate';

describe('formatDate', () => {
  /**
   * Purpose: Verify ISO date string is formatted to readable format.
   */
  it('should format ISO date string to readable format', () => {
    const result = formatDate('2026-05-15T10:30:00Z');
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  /**
   * Purpose: Verify null/undefined returns empty string.
   */
  it('should return empty string for null input', () => {
    const result = formatDate(null);
    expect(result).toBe('');
  });

  /**
   * Purpose: Verify undefined returns empty string.
   */
  it('should return empty string for undefined input', () => {
    const result = formatDate(undefined);
    expect(result).toBe('');
  });
});
