import { ROLE, type Role } from '@/commons/constants/permissions';

/** Display labels for workspace roles */
export const ROLE_LABELS: Record<Role | string, string> = {
  [ROLE.OWNER]: 'Owner',
  [ROLE.MANAGER]: 'Manager',
  [ROLE.REVIEWER]: 'Reviewer',
  [ROLE.MEMBER]: 'Member',
};

/** CSS class mapping for role-based pills */
export const ROLE_PILL_CLASS: Record<Role | string, string> = {
  [ROLE.OWNER]: 'pill pill-purple',
  [ROLE.MANAGER]: 'pill pill-blue',
  [ROLE.REVIEWER]: 'pill pill-teal',
  [ROLE.MEMBER]: 'pill pill-slate',
};

/** Roles that can be assigned via the UI (excludes owner) */
export const ASSIGNABLE_ROLES = [
  { value: ROLE.MANAGER, label: 'Manager' },
  { value: ROLE.REVIEWER, label: 'Reviewer' },
  { value: ROLE.MEMBER, label: 'Member' },
];

/** Helper text for each assignable role */
export const ROLE_HELP: Record<string, string> = {
  [ROLE.MANAGER]: 'Can invite members, manage access, and coordinate reviews.',
  [ROLE.REVIEWER]: 'Can inspect findings and participate in security review.',
  [ROLE.MEMBER]: 'Can view workspace context with limited review actions.',
};

/**
 * Get the display label for a role.
 * Falls back to capitalizing the raw role string if not in the label map.
 *
 * @param role - Role key (e.g., 'owner', 'manager')
 * @returns Display label (e.g., 'Owner', 'Manager')
 *
 * @example
 * roleLabel('owner')   // 'Owner'
 * roleLabel('member')  // 'Member'
 * roleLabel(undefined) // 'Member'
 */
export function roleLabel(role: string | undefined | null): string {
  if (!role) return 'Member';
  return ROLE_LABELS[role] ?? role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Format a field name into a human-readable label.
 * Converts snake_case and camelCase to Title Case.
 *
 * @param field - Field name (e.g., 'email_address', 'firstName')
 * @returns Formatted label (e.g., 'Email Address', 'First Name')
 *
 * @example
 * formatFieldLabel('email_address') // 'Email Address'
 * formatFieldLabel('firstName')     // 'First Name'
 * formatFieldLabel('role')          // 'Role'
 */
export function formatFieldLabel(field: string): string {
  return field
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, c => c.toUpperCase());
}
