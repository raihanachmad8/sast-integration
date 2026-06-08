export * from './api';
export * from './domain';
export * from './auth';
export * from './teams';
export * from './projects';
export * from './repositories';
export * from './scans';
export * from './findings';
export * from './reports';
export * from './ai-models';
export * from './webhooks';
export * from './knowledge';
export * from './schedules';
export * from './dashboard';

export const DATE_LOCALE = 'en-US';

/**
 * Convert a project ref name (repository, team, member) to a display-friendly format.
 * Extracts the last segment after '/' and formats it for display.
 *
 * @example
 * toProjectRefName('org/backend-api') → 'backend-api'
 * toProjectRefName('simple-name') → 'simple-name'
 */
export function toProjectRefName(ref: string): string {
  if (!ref) return '';
  const parts = ref.split('/');
  return parts[parts.length - 1] || ref;
}
