/**
 * Shared Zod schemas for user profile management.
 *
 * Single source of truth — used by:
 *   - Backend: validateBody(updateProfileSchema)
 *   - Frontend: zodResolver(updateProfileSchema)
 */

import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be at most 255 characters').optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be at most 50 characters').regex(/^[a-zA-Z0-9_-]+$/, 'Username must be alphanumeric with hyphens or underscores').optional(),
  bio: z.string().max(500, 'Bio must be at most 500 characters').optional(),
  timezone: z.string().max(50, 'Timezone must be at most 50 characters').optional(),
  language: z.string().max(10, 'Language must be at most 10 characters').optional(),
  avatarUrl: z.string().url('Avatar URL must be a valid URL').max(500).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
