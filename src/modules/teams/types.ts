/**
 * Team module types.
 *
 * Input types are inferred from Zod schemas (single source of truth).
 * This file only re-exports them for convenience.
 */
import type { TeamFormInput as TeamFormInputSchema } from '@/commons/schemas/team.schema';

/** Team form input for creating or updating a team. */
export type TeamFormInput = TeamFormInputSchema;
