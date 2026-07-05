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

// ─── Base Repository ───────────────────────────────────────────────

/**
 * Base repository contract for workspace-scoped entities.
 *
 * Every entity repository extends this. Junction tables omit methods
 * they don't need (e.g. junction tables don't have `list` or `softDelete`).
 *
 * Type parameters:
 * - T: Drizzle row type (e.g. Project, Team)
 * - CreateInput: Zod-inferred input type (e.g. ProjectFormInput)
 * - UpdateInput: Zod-inferred input type (e.g. ProjectUpdateInput)
 * - ListQuery: Zod-inferred query type (e.g. ProjectListQuery)
 */
export interface IEntityRepository<T, CreateInput, UpdateInput, ListQuery = unknown> {
  findById(id: string, tx?: Tx): Promise<T | null>;
  create(data: CreateInput, createdBy: string, tx?: Tx): Promise<T>;
  update(id: string, data: UpdateInput, updatedBy: string, tx?: Tx): Promise<T>;
  softDelete(id: string, deletedBy: string, tx?: Tx): Promise<void>;
  list(workspaceId: string, params?: ListQuery, tx?: Tx): Promise<Paginated<T>>;
  listAll(workspaceId: string, tx?: Tx): Promise<T[]>;
}

// ─── Junction Repository ───────────────────────────────────────────

/**
 * Junction table repository for replace-all many-to-many relationships.
 *
 * Pattern: delete all → insert new set. Used for projectMembers,
 * teamMembers, projectTeams, etc.
 *
 * Junction tables typically:
 * - HAVE: set(), getIds(), count()
 * - OMIT: findById, create (single), update, softDelete, list, listAll
 *
 * Usage:
 *   interface ProjectMemberJunction extends Omit<IEntityRepository<...>, 'findById' | 'create' | 'update' | 'softDelete' | 'list' | 'listAll'> {
 *     set(parentId: string, childIds: string[], tx?: Tx): Promise<void>;
 *     getIds(parentId: string, tx?: Tx): Promise<string[]>;
 *     count(parentId: string, tx?: Tx): Promise<number>;
 *   }
 */
export interface IJunctionRepository<T> {
  /** Replace all children for a parent (delete all → insert new set). */
  set(parentId: string, childIds: string[], tx?: Tx): Promise<void>;
  /** Get all child IDs for a parent. */
  getIds(parentId: string, tx?: Tx): Promise<string[]>;
  /** Count children for a parent. */
  count(parentId: string, tx?: Tx): Promise<number>;
}

// ─── FK-based Junction ─────────────────────────────────────────────

/**
 * FK-based junction for one-to-many via foreign key on child table.
 *
 * Pattern: update FK on child rows. Used when the child table has
 * a nullable FK to the parent (e.g. repositories.projectId).
 *
 * Usage:
 *   interface RepositoryLink {
 *     setByParent(parentId: string, childIds: string[], tx?: Tx): Promise<void>;
 *     clearByParent(parentId: string, tx?: Tx): Promise<void>;
 *   }
 */

// ─── Base Service ──────────────────────────────────────────────────

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
  softDelete(workspaceId: string, id: string, userId: string): Promise<void>;
}

// ─── Legacy alias ──────────────────────────────────────────────────

/** @deprecated Use IEntityRepository instead */
export type IRepository<T, CreateInput, UpdateInput, ListQuery = unknown> =
  IEntityRepository<T, CreateInput, UpdateInput, ListQuery>;
