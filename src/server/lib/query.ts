/**
 * Reusable query utilities for Drizzle ORM.
 *
 * Provides composable search, filter, sort, and pagination helpers
 * that work directly with Drizzle query builder.
 */

import { eq, ilike, or, asc, desc, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

// ─── Search ────────────────────────────────────────────────────────────────────

/**
 * Build search conditions for multiple fields (case-insensitive LIKE).
 *
 * @param search - Search term (e.g. "john")
 * @param fields - Drizzle columns to search against
 * @returns Array of SQL conditions (empty if no search)
 *
 * @example
 * ```ts
 * // Search by name and email
 * conditions.push(...buildSearch(query.search, users.name, users.email));
 *
 * // Result: WHERE (name ILIKE '%john%' OR email ILIKE '%john%')
 * ```
 */
export function buildSearch(search: string | undefined, ...fields: PgColumn[]): SQL[] {
  if (!search || !fields.length) return [];
  const q = `%${search.toLowerCase()}%`;
  const conditions = fields.map((f) => ilike(f, q));
  return [or(...conditions)!];
}

// ─── Filter ────────────────────────────────────────────────────────────────────

/**
 * Build filter conditions from a record of field → value.
 *
 * @param filters - Object where keys are field names and values are filter values
 * @param columns - Map of field names to Drizzle columns
 * @returns Array of SQL conditions (empty if no filters)
 *
 * @example
 * ```ts
 * // Filter by role
 * conditions.push(...buildFilters(
 *   { role: query.role },
 *   { role: workspaceMembers.role },
 * ));
 *
 * // Result: WHERE role = 'manager'
 * ```
 */
export function buildFilters(
  filters: Record<string, unknown>,
  columns: Record<string, PgColumn>,
): SQL[] {
  const conditions: SQL[] = [];
  for (const [key, value] of Object.entries(filters)) {
    if (value != null && value !== '' && columns[key]) {
      conditions.push(eq(columns[key], value as string));
    }
  }
  return conditions;
}

// ─── Sort ──────────────────────────────────────────────────────────────────────

/**
 * Build sort expression from field name and order.
 *
 * @param sortBy - Field name to sort by (e.g. "name")
 * @param order - 'asc' or 'desc'
 * @param columns - Map of field names to Drizzle columns
 * @param fallback - Default column if sortBy is invalid
 * @returns SQL ordering expression for orderBy
 *
 * @example
 * ```ts
 * // Sort by name descending
 * .orderBy(buildSort(query.sort, query.order, { name: users.name }, users.createdAt))
 *
 * // Result: ORDER BY name DESC (or ORDER BY created_at DESC if sort is invalid)
 * ```
 */
export function buildSort(
  sortBy: string | undefined,
  order: string | undefined,
  columns: Record<string, PgColumn>,
  fallback: PgColumn,
): SQL {
  const col = sortBy && columns[sortBy] ? columns[sortBy] : fallback;
  const dir = order?.toLowerCase() === 'desc' ? desc : asc;
  return dir(col);
}

// ─── Pagination ────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
}

/**
 * Calculate pagination metadata.
 *
 * @param total - Total number of records
 * @param page - Current page (1-based)
 * @param perPage - Records per page
 * @returns Pagination metadata
 *
 * @example
 * ```ts
 * const meta = buildPaginationMeta(50, 2, 10);
 * // { total: 50, page: 2, perPage: 10, lastPage: 5 }
 * ```
 */
export function buildPaginationMeta(total: number, page: number, perPage: number): PaginationMeta {
  return {
    total,
    page,
    perPage,
    lastPage: Math.ceil(total / perPage),
  };
}
