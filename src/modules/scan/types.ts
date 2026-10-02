import type { Severity, ScanOrigin, ScmProvider } from '@/commons/types';

/** Scan module types — shared across API, queries, and components. */

export interface ScanProject {
  id: string;
  name: string | null;
  slug: string | null;
}

export interface ScanRepository {
  id: string;
  name: string;
  url: string;
  default_branch: string | null;
  connection_type: 'scm' | 'external';
}

export interface ScanProfileItem {
  id: string;
  name: string;
  profile: string;
  scanners: string[];
  severity_threshold: string;
  timeout_seconds: number | null;
  max_findings: number | null;
}

export interface ScanRecord {
  id: string;
  origin: ScanOrigin;
  trigger_source: string | null;
  status: string;
  branch: string | null;
  commit_sha: string | null;
  created_at: string;
}

/** Row shape for the Scans table view. */
export interface ScanRow {
  id: string;
  repository: string;
  repoSub: string;
  status: 'Running' | 'Completed' | 'Failed';
  stage: string;
  findings: number;
  critical: number;
  ai: string;
  origin: ScanOrigin;
  provider: ScmProvider | null;
  connectionType: 'scm' | 'external';
}
