import type { Severity, AiVerdict, FindingStatus } from '@/commons/types/domain';
import type { PaginatedResponse } from '@/commons/types/pagination';

/**
 * Parameters for fetching findings with server-side pagination, filtering, and sorting.
 */
export interface FindingListParams {
  page: number;
  perPage: number;
  search?: string;
  severity?: Severity;
  verdict?: AiVerdict;
  status?: FindingStatus;
  projectId?: string;
  repositoryId?: string;
  scanId?: string;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

/** Paginated findings list response — reuses shared PaginatedResponse. */
export type FindingListResponse<T> = PaginatedResponse<T>;
