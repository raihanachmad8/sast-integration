/**
 * Dashboard types — mirror the Drizzle schema for frontend development.
 *
 * @module commons-types-dashboard
 */

/**
 * Mock comment — user discussion on a finding.
 *
 * @example
 * ```ts
 * const comment: Comment = {
 *   id: 'cmt_01',
 *   findingId: 'f_01',
 *   content: 'Confirmed — this needs immediate fix.',
 *   createdByName: 'Bob Chen',
 *   createdAt: '2026-06-04T08:00:00Z',
 *   updatedAt: '2026-06-04T08:00:00Z',
 * };
 * ```
 */
export type Comment = {
  /** Unique comment ID. */
  id: string;
  /** Finding ID the comment belongs to. */
  findingId: string;
  /** Comment body text. */
  content: string;
  /** Display name of comment author. */
  createdByName: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last update timestamp. */
  updatedAt: string;
};

/**
 * Mock audit log — security-relevant workspace events.
 *
 * @example
 * ```ts
 * const log: AuditLog = {
 *   id: 'al_01',
 *   workspaceId: 'ws_01',
 *   userId: 'usr_01',
 *   userName: 'Alice Tan',
 *   action: 'member.invite',
 *   resourceType: 'member',
 *   resourceId: null,
 *   ipAddress: '192.168.1.100',
 *   createdAt: '2026-05-20T08:00:00Z',
 * };
 * ```
 */
export type AuditLog = {
  /** Unique audit log ID. */
  id: string;
  /** Workspace ID. */
  workspaceId: string;
  /** User who performed the action. */
  userId: string | null;
  /** Display name of the user. */
  userName: string;
  /** Action identifier (e.g. 'member.invite', 'project.create'). */
  action: string;
  /** Type of resource affected. */
  resourceType: string | null;
  /** ID of resource affected. */
  resourceId: string | null;
  /** IP address of the request. */
  ipAddress: string | null;
  /** ISO 8601 event timestamp. */
  createdAt: string;
};

/**
 * Mock activity log — user-facing feed of workspace events.
 *
 * @example
 * ```ts
 * const log: ActivityLog = {
 *   id: 'acl_01',
 *   workspaceId: 'ws_01',
 *   userId: 'usr_02',
 *   userName: 'Bob Chen',
 *   type: 'scan.completed',
 *   description: 'Scan completed on backend-api/main with 8 findings',
 *   createdAt: '2026-06-04T06:12:00Z',
 * };
 * ```
 */
export type ActivityLog = {
  /** Unique activity log ID. */
  id: string;
  /** Workspace ID. */
  workspaceId: string;
  /** User who performed the activity. */
  userId: string | null;
  /** Display name of the user. */
  userName: string;
  /** Activity type (scan.completed, member.joined, etc.). */
  type: string;
  /** Human-readable description. */
  description: string | null;
  /** ISO 8601 event timestamp. */
  createdAt: string;
};

/**
 * Mock notification — in-app alert for a user.
 *
 * @example
 * ```ts
 * const notif: Notification = {
 *   id: 'n_01',
 *   userId: 'usr_01',
 *   type: 'finding.critical',
 *   title: 'Critical finding detected in backend-api',
 *   data: { findingId: 'f_01', repository: 'backend-api' },
 *   readAt: null,
 *   createdAt: '2026-06-04T06:05:00Z',
 * };
 * ```
 */
export type Notification = {
  /** Unique notification ID. */
  id: string;
  /** Target user ID. */
  userId: string;
  /** Notification type (finding.critical, scan.completed, etc.). */
  type: string;
  /** Notification title. */
  title: string;
  /** Additional structured data payload. */
  data: Record<string, unknown> | null;
  /** ISO 8601 read timestamp (null if unread). */
  readAt: string | null;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
};

/**
 * Mock storage file — uploaded file metadata.
 *
 * @example
 * ```ts
 * const file: StorageFile = {
 *   id: 'sf_01',
 *   workspaceId: 'ws_01',
 *   fileName: 'june-2026.pdf',
 *   filePath: '/reports/june-2026.pdf',
 *   fileSize: 245760,
 *   mimeType: 'application/pdf',
 *   storageProvider: 'local',
 *   createdAt: '2026-06-01T08:00:00Z',
 * };
 * ```
 */
export type StorageFile = {
  /** Unique file ID. */
  id: string;
  /** Workspace ID. */
  workspaceId: string;
  /** Original file name. */
  fileName: string;
  /** Storage path. */
  filePath: string;
  /** File size in bytes. */
  fileSize: number;
  /** MIME type. */
  mimeType: string | null;
  /** Storage provider (local, s3, cloudinary). */
  storageProvider: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
};
