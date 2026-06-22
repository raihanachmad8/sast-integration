/**
 * Calculate offset for pagination.
 * @param page - Current page number (1-based)
 * @param perPage - Items per page
 * @returns Offset value for database query
 */
export function getOffset(page: number, perPage: number): number {
  return Math.max(0, (page - 1) * perPage);
}

/**
 * Calculate pagination metadata.
 * @param total - Total number of items
 * @param page - Current page number (1-based)
 * @param perPage - Items per page
 * @returns Pagination metadata
 */
export function getPaginationMeta(total: number, page: number, perPage: number) {
  return {
    page,
    perPage,
    total,
    lastPage: Math.ceil(total / perPage) || 1,
  };
}
