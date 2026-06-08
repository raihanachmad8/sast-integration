import { z } from 'zod';

export const projectFormSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).optional(),
  description: z.string().max(500).optional().default(''),
  lead: z.string().max(100).optional().default(''),
  platform: z.string().max(50).optional(),
  language: z.string().max(50).optional(),
  avatar_url: z.string().url().optional(),
  teamIds: z.array(z.string()).optional().default([]),
  memberIds: z.array(z.string()).optional().default([]),
  repositoryIds: z.array(z.string()).optional().default([]),
  settings: z.object({
    enforceQualityGate: z.boolean().default(false),
    notifyOnCritical: z.boolean().default(false),
    autoTriggerScan: z.boolean().default(false),
  }),
});

export const projectUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).optional(),
  description: z.string().max(500).optional(),
  lead: z.string().max(100).optional(),
  platform: z.string().max(50).optional(),
  language: z.string().max(50).optional(),
  avatar_url: z.string().url().optional(),
  teamIds: z.array(z.string()).optional(),
  memberIds: z.array(z.string()).optional(),
  repositoryIds: z.array(z.string()).optional(),
  settings: z.object({
    enforceQualityGate: z.boolean().optional(),
    notifyOnCritical: z.boolean().optional(),
    autoTriggerScan: z.boolean().optional(),
  }).optional(),
});

export type ProjectFormInput = z.infer<typeof projectFormSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
