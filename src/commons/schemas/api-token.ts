/**
 * Shared Zod schemas for project API tokens.
 *
 * Single source of truth — used by:
 *   - Backend: validateBody(createTokenSchema)
 *   - Frontend: zodResolver(createTokenSchema)
 */

import { z } from 'zod';

export const createApiTokenSchema = z.object({
  name: z.string().min(1, 'Token name is required').max(255, 'Name must be at most 255 characters'),
  permissions: z.array(z.string()).optional(),
  expiresInDays: z.number().int().positive().max(365 * 5).optional().nullable(),
});

export type CreateApiTokenInput = z.infer<typeof createApiTokenSchema>;
