import { z } from 'zod';

export const createApiTokenSchema = z.object({
  name: z.string().min(1, 'Token name is required').max(100),
});

export const revokeApiTokenSchema = z.object({
  tokenId: z.string().uuid('Invalid token ID'),
});

export type CreateApiTokenInput = z.infer<typeof createApiTokenSchema>;
export type RevokeApiTokenInput = z.infer<typeof revokeApiTokenSchema>;
