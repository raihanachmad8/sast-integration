/**
 * Purpose: Test roleLabel utility correctly maps roles to display labels.
 */
import { describe, it, expect } from 'vitest';
import { roleLabel } from '@/lib/utils/roleLabel';

describe('roleLabel', () => {
  /**
   * Purpose: Verify owner role maps to correct label.
   */
  it('should return "Owner" for owner role', () => {
    expect(roleLabel('owner')).toBe('Owner');
  });

  /**
   * Purpose: Verify manager role maps to correct label.
   */
  it('should return "Manager" for manager role', () => {
    expect(roleLabel('manager')).toBe('Manager');
  });

  /**
   * Purpose: Verify reviewer role maps to correct label.
   */
  it('should return "Reviewer" for reviewer role', () => {
    expect(roleLabel('reviewer')).toBe('Reviewer');
  });

  /**
   * Purpose: Verify member role maps to correct label.
   */
  it('should return "Member" for member role', () => {
    expect(roleLabel('member')).toBe('Member');
  });

  /**
   * Purpose: Verify unknown role returns capitalized string.
   */
  it('should capitalize unknown role', () => {
    expect(roleLabel('custom')).toBe('Custom');
  });
});
