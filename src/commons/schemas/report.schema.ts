import { z } from 'zod';

import { lenientEnum, lenientInt, SORT_ORDERS } from './member.schema';

export const createReportSchema = z.object({
  type: z.enum(['findings', 'verdict', 'executive', 'compliance']),
  title: z.string().min(1).max(255),
  format: z.enum(['pdf', 'xlsx', 'csv']).optional().default('pdf'),
  range: z.string().optional(),
});

export const REPORT_SORT_FIELDS = ['title', 'type', 'format', 'status', 'createdAt'] as const;

export const reportListQuerySchema = z.object({
  page: lenientInt(1),
  perPage: lenientInt(10, 100),
  search: z.string().optional(),
  sort: lenientEnum(REPORT_SORT_FIELDS),
  order: lenientEnum(SORT_ORDERS),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ReportListQuery = z.infer<typeof reportListQuerySchema>;
