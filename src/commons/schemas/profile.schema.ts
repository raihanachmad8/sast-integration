import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/, 'Username must be alphanumeric with hyphens or underscores').optional(),
  bio: z.string().max(500).optional(),
  timezone: z.string().max(50).optional(),
  language: z.string().max(10).optional(),
  avatarUrl: z.string().url().max(500).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
