/**
 * Shared helper functions for source-control modules.
 */

export type CredentialMap = Record<string, unknown>;

export interface DiscoveredRepository {
  name: string;
  url: string;
  defaultBranch?: string;
  externalId?: string;
}

export function toCredentials(value: unknown): CredentialMap {
  if (!value || typeof value !== 'object') return {};
  return value as CredentialMap;
}

export function stringValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value !== undefined && value !== null) return String(value);
  return '';
}

export function normalizeBaseUrl(value: string): string {
  if (!value) return '';
  return value.endsWith('/') ? value : `${value}/`;
}

export function normalizePrivateKey(value: string): string {
  return value.replace(/\\n/g, '\n');
}
