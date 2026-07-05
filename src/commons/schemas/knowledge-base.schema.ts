/**
 * Knowledge Base schemas — single source of truth for knowledge base validation.
 *
 * @module schemas/knowledge-base
 */
import { z } from 'zod';

const KNOWLEDGE_SOURCE_TYPES = ['cwe', 'nvd', 'custom'] as const;

// ─── Source schemas (strict) ───────────────────────────────────────────────────

export const createKnowledgeSourceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(KNOWLEDGE_SOURCE_TYPES, { message: 'Type must be one of: cwe, nvd, custom' }),
  url: z.url('Invalid URL').max(500).optional(),
});

export const updateKnowledgeSourceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  type: z.enum(KNOWLEDGE_SOURCE_TYPES, { message: 'Type must be one of: cwe, nvd, custom' }).optional(),
  url: z.url('Invalid URL').max(500).optional().nullable(),
  status: z.enum(['connected', 'disconnected', 'syncing', 'error'], { message: 'Status is required' }).optional(),
});

// ─── Entry schemas (strict) ────────────────────────────────────────────────────

export const createKnowledgeEntrySchema = z.object({
  sourceId: z.string().uuid('Invalid source ID'),
  cweId: z.string().max(20).optional(),
  title: z.string().min(1, 'Title is required').max(500),
  content: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical'], { message: 'Severity is required' }).optional(),
  remediation: z.string().optional(),
  tags: z.array(z.string()).optional(),
  muted: z.boolean().optional(),
});

export const updateKnowledgeEntrySchema = z.object({
  cweId: z.string().max(20).optional(),
  title: z.string().min(1, 'Title is required').max(500).optional(),
  content: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical'], { message: 'Severity is required' }).optional(),
  remediation: z.string().optional(),
  tags: z.array(z.string()).optional(),
  muted: z.boolean().optional(),
});

// ─── Inferred types ────────────────────────────────────────────────────────────

export type CreateKnowledgeSourceInput = z.infer<typeof createKnowledgeSourceSchema>;
export type UpdateKnowledgeSourceInput = z.infer<typeof updateKnowledgeSourceSchema>;
export type CreateKnowledgeEntryInput = z.infer<typeof createKnowledgeEntrySchema>;
export type UpdateKnowledgeEntryInput = z.infer<typeof updateKnowledgeEntrySchema>;

// ─── Backfill ────────────────────────────────────────────────────────────────

export const backfillBodySchema = z.object({
  resume: z.boolean().optional(),
});

export type BackfillBodyInput = z.infer<typeof backfillBodySchema>;
