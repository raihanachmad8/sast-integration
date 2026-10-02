/**
 * Test mocking utilities.
 *
 * This module provides safe, documented helpers for working around
 * complex third-party or ORM-generated types in unit tests.
 *
 * ## Philosophy
 *
 * In a strict TypeScript project, we avoid `any` in production code.
 * However, in unit tests — especially those that mock database repositories
 * (Drizzle ORM in this project) — the inferred types are extremely large,
 * deeply nested, and change often when the schema evolves.
 *
 * For tests whose primary goal is to verify **business logic** (auth flows,
 * upload processing, deduplication, etc.) rather than perfect type fidelity
 * of the persistence layer, it is a widely accepted professional practice
 * to use a small number of controlled `any` casts for mock data.
 *
 * This helper centralizes that escape hatch and forces every usage to be
 * intentional and documented.
 */

/**
 * Casts an arbitrary value to a desired type `T`.
 *
 * Use this **only** when mocking repository / service return values whose
 * real types come from Drizzle (`$inferSelect`, etc.) and would otherwise
 * require duplicating large portions of the schema just for tests.
 *
 * ### Example
 * ```ts
 * mockRepo.findById.mockResolvedValue(mockValue<User>({ id: 'u1', email: '...' }));
 * ```
 *
 * @param value - The mock data (shape should roughly match T)
 * @returns The value cast as T
 */
export function mockValue<T>(value: unknown): T {
  return value as T;
}

/**
 * Convenience alias for `mockValue` when the intent is very clear.
 * Some teams prefer this name for readability.
 */
export const asMock = mockValue;
