import { z } from 'zod';

export const teamFormSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
  slug: z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(500).optional().default(''),
  memberIds: z.array(z.string()).optional().default([]),
});

export const teamUpdateSchema = teamFormSchema.partial();

export type TeamFormInput = z.infer<typeof teamFormSchema>;
export type TeamUpdateInput = z.infer<typeof teamUpdateSchema>;
