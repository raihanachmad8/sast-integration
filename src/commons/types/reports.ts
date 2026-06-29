/**
 * Report types — matches Drizzle schema.
 */

export interface ReportRow {
  id: string;
  workspaceId: string;
  type: string;
  title: string;
  status?: string;
  format: string | null;
  filters?: unknown;
  filePath: string | null;
  fileSize: number | null;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}
