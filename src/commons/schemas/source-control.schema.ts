import { z } from 'zod';

import { lenientEnum, lenientInt, SORT_ORDERS } from './member.schema';

const PROVIDERS = ['github', 'gitlab', 'gitea', 'bitbucket', 'azure-devops'] as const;

export const createSourceControlSchema = z.object({
  provider: z.enum(PROVIDERS, { message: 'Provider must be one of: github, gitlab, gitea, bitbucket, azure-devops' }),
  name: z.string().min(1, 'Name is required').max(255),
  credentials: z.record(z.string(), z.unknown()).optional(),
});

export const updateSourceControlSchema = z.object({
  provider: z.enum(PROVIDERS, { message: 'Provider must be one of: github, gitlab, gitea, bitbucket, azure-devops' }).optional(),
  name: z.string().min(1, 'Name is required').max(255).optional(),
  credentials: z.record(z.string(), z.unknown()).optional(),
});

export type CreateSourceControlInput = z.infer<typeof createSourceControlSchema>;
export type UpdateSourceControlInput = z.infer<typeof updateSourceControlSchema>;

// ─── List query schema ─────────────────────────────────────────────────────

export const SOURCE_CONTROL_SORT_FIELDS = ['name', 'provider', 'createdAt'] as const;

export const sourceControlListQuerySchema = z.object({
  page: lenientInt(1),
  perPage: lenientInt(10, 100),
  search: z.string().optional(),
  sort: lenientEnum(SOURCE_CONTROL_SORT_FIELDS),
  order: lenientEnum(SORT_ORDERS),
});

export type SourceControlListQuery = z.infer<typeof sourceControlListQuerySchema>;

// ─── Test event ──────────────────────────────────────────────────────────────

export const testEventSchema = z.object({
  eventType: z.string().optional(),
});

export type TestEventInput = z.infer<typeof testEventSchema>;
