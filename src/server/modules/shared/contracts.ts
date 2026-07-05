import type { Tx } from '@/server/db/client';

/**
 * Paginated result shape returned by repositories and services.
 *
 * Matches the output of `buildPaginationMeta` so the API layer can
 * pass `data`, `total`, `page`, `perPage`, and `lastPage` directly
 * to `ApiResponse.paginated`.
 */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
}

/**
 * Generic repository contract for workspace-scoped entities.
 *
 * Type parameters should be inferred from the module's Zod schemas
 * (e.g. TeamFormInput, TeamUpdateInput, TeamListQuery) so the frontend
 * and backend stay in sync.
 */
export interface IRepository<T, CreateInput, UpdateInput, ListQuery = unknown> {
  create(workspaceId: string, data: CreateInput, createdBy: string, tx?: Tx): Promise<T>;
  update(id: string, data: UpdateInput, updatedBy: string, tx?: Tx): Promise<T>;
  softDelete(id: string, deletedBy: string, tx?: Tx): Promise<T>;
  findById(id: string, tx?: Tx): Promise<T | null>;
  list(workspaceId: string, params?: ListQuery, tx?: Tx): Promise<Paginated<T>>;
  listAll(workspaceId: string, tx?: Tx): Promise<T[]>;
}

/**
 * Generic service contract for workspace-scoped entity operations.
 *
 * Permission checks and business logic live here. The CRUD shape matches
 * the repository contract so callers can predict method names across modules.
 */
export interface IEntityService<T, CreateInput, UpdateInput, ListQuery = unknown> {
  list(workspaceId: string, userId: string, params?: ListQuery): Promise<Paginated<T>>;
  getById(workspaceId: string, id: string, userId: string): Promise<T>;
  create(workspaceId: string, input: CreateInput, userId: string): Promise<T>;
  update(workspaceId: string, id: string, input: UpdateInput, userId: string): Promise<T>;
  softDelete(workspaceId: string, id: string, userId: string): Promise<T>;
}
