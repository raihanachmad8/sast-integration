/**
 * Lenient Zod transform helpers for query parameter validation.
 *
 * These coerce invalid/missing values to safe defaults instead of failing validation.
 * Used by all list query schemas across modules.
 *
 * @module schemas/lenient-helpers
 */
import { z } from 'zod';

export const SORT_ORDERS = ['asc', 'desc'] as const;

/**
 * Accept any string, return valid value or undefined for invalid/missing values.
 * The route falls back to a default rather than failing validation.
 */
export function lenientEnum<T extends readonly string[]>(allowed: T) {
  return z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      const lower = val.toLowerCase();
      return (allowed as readonly string[]).includes(lower) ? (lower as T[number]) : undefined;
    });
}

/**
 * Accept string input from search params, coerce to integer within bounds.
 * Returns defaultVal for invalid/missing values.
 */
export function lenientInt(defaultVal: number, max?: number) {
  return z.string().optional().transform((val) => {
    if (val === undefined || val === '') return defaultVal;
    const num = Number(val);
    if (isNaN(num) || !Number.isInteger(num) || num < 1) return defaultVal;
    if (max && num > max) return max;
    return num;
  });
}
