/**
 * Profile schemas — single source of truth for user profile validation.
 *
 * ## Validation Flow
 *
 * ### Get Profile (server-side)
 * - No input validation needed — userId from auth context.
 *
 * ### Update Profile (server-side)
 * 1. Route handler calls `validateBody(request, profileUpdateSchema)`
 * 2. Strict validation — invalid input returns 422
 * 3. All fields optional (partial update semantics)
 *
 * ### Form (client-side)
 * - `react-hook-form` with `zodResolver(profileUpdateSchema)` validates in-browser
 *
 * @module schemas/profile
 */
import { z } from 'zod';

/** Profile update schema — all fields optional for partial updates. */
export const profileUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  username: z.string().min(1, 'Username is required').max(100).optional(),
  bio: z.string().max(500).optional().default(''),
  timezone: z.string().max(50).optional(),
  language: z.string().max(10).optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
