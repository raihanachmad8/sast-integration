import type { Severity, AiVerdict, FindingStatus } from '@/commons/types/domain';

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
  sort?: string;
  order?: 'ASC' | 'DESC';
}

/**
 * Paginated response from the findings API.
 * Matches the actual API response format from ApiResponse paginated helper.
 */
export interface FindingListResponse<T> {
  data: T[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Payload for assigning a finding to a user.
 *
 * @example
 * ```ts
 * const payload: AssignFindingPayload = {
 *   findingId: 'f-1',
 *   userId: 'usr_01',
 * };
 * ```
 */
export interface AssignFindingPayload {
  /** Finding ID to assign. */
  findingId: string;
  /** User ID to assign to. */
  userId: string;
}

/**
 * Payload for updating a finding's triage status.
 *
 * @example
 * ```ts
 * const payload: UpdateFindingStatusPayload = {
 *   findingId: 'f-1',
 *   status: 'accepted',
 * };
 * ```
 */
export interface UpdateFindingStatusPayload {
  /** Finding ID to update. */
  findingId: string;
  /** New triage status. */
  status: FindingStatus;
}

/**
 * Payload for requesting AI re-verification on a finding.
 *
 * @example
 * ```ts
 * const payload: ReverifyFindingPayload = {
 *   findingId: 'f-1',
 *   modelId: 'modal-qlora',
 * };
 * ```
 */
export interface ReverifyFindingPayload {
  /** Finding ID to re-verify. */
  findingId: string;
  /** AI model ID to use for verification. */
  modelId: string;
}
