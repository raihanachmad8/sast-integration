/**
 * Shared slug generation utility.
 *
 * Purpose: Single source of truth for slug generation used across
 * teams, projects, and any future entities that need URL-safe slugs.
 *
 * @module commons/utils/slug
 */

/**
 * Generate a URL-safe slug from a name.
 * - Lowercases
 * - Removes non-alphanumeric characters (except spaces and hyphens)
 * - Converts spaces to hyphens
 * - Collapses consecutive hyphens
 * - Truncates to maxLength
 *
 * @param name - The entity name to slugify
 * @param maxLength - Maximum slug length (default: 255)
 * @returns URL-safe slug string
 */
export function generateSlug(name: string, maxLength = 255): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, maxLength);
}
