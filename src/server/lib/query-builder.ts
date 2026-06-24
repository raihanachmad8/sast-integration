import { eq, and, isNull, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

/**
 * Build an array of WHERE conditions from a filter record.
 * Only includes conditions where the value is not undefined/null.
 *
 * @param filters - Record of column → value pairs (undefined/null values are skipped)
 * @returns Array of SQL conditions
 *
 * @example
 * const conditions = buildFilters({
 *   [users.workspaceId]: workspaceId,
 *   [users.deletedAt]: undefined, // skipped
 *   [users.role]: role,           // included if defined
 * });
 */
export function buildFilters(
  filters: Record<string, unknown>,
): SQL[] {
  const conditions: SQL[] = [];
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;
    // Find the column by matching the key
    // The key is the column reference itself when passed as a PgColumn
    conditions.push(eq(key as unknown as PgColumn, value as string));
  }
  return conditions;
}

/**
 * Build a WHERE clause from conditions, returning undefined if empty.
 *
 * @param conditions - Array of SQL conditions
 * @returns Combined AND condition or undefined
 */
export function buildWhere(conditions: SQL[]): SQL | undefined {
  if (conditions.length === 0) return undefined;
  return and(...conditions);
}

/**
 * Add soft-delete filter (isNull on deletedAt column) to conditions.
 *
 * @param conditions - Existing conditions array (mutated in place)
 * @param deletedAtColumn - The deletedAt column to check
 */
export function addSoftDeleteFilter(
  conditions: SQL[],
  deletedAtColumn: PgColumn,
): void {
  conditions.push(isNull(deletedAtColumn));
}

/**
 * Standard pagination result type.
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
