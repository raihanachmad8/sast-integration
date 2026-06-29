/**
 * Repository types — matches Drizzle schema.
 */

export interface SourceControl {
  id: string;
  workspaceId: string;
  provider: string;
  name: string;
  createdAt: string;
}

export interface RepositoryExtended {
  id: string;
  projectId: string;
  name: string;
  url: string;
  defaultBranch: string;
  autoScan: boolean;
  sourceControlId: string | null;
  connectionType: string[];
  lastSyncedAt: string | null;
  projectName: string;
  provider: 'github' | 'gitlab' | 'gitea' | null;
  findingCount?: number;
  scanCount?: number;
  lastScan?: string | null;
}
