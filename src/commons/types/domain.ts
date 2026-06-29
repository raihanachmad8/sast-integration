/**
 * Unified domain types for the SAST Integration frontend.
 *
 * Single source of truth for all domain types used by feature modules.
 *
 * @module commons-types-domain
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Enums & Literals
// ═══════════════════════════════════════════════════════════════════════════════

/** Severity levels — used by findings, scan, reports, quality-gates, knowledge-base */
export type Severity = "critical" | "high" | "medium" | "low" | "info";

/** AI verdict on a finding (simple) — used by findings list */
export type AiVerdict = "TP" | "FP" | "Pending";

/** Finding triage status — used by findings, reports */
export type FindingStatus = "open" | "dismissed" | "resolved";

/** Scan execution status — used by scan list, dashboard */
export type ScanStatus = "queued" | "running" | "processing" | "parsing" | "completed" | "failed";

/** SCM provider — used by source-control, scan, repositories */
export type ScmProvider = "github" | "gitlab" | "gitea";

/** SCM connection type — determines auth flow */
export type ScmConnectionType = "oauth" | "pat" | "github-app";

/** Repository connection type — used by repositories, scan, source-control */
export type RepositoryConnectionType = "scm" | "external";

/** Scan origin type — used by scan, dashboard */
export type ScanOrigin = "managed" | "external_upload";

// ═══════════════════════════════════════════════════════════════════════════════
// Finding (Unified)
// ═══════════════════════════════════════════════════════════════════════════════

export interface Finding {
  id: string;
  /** Project ID this finding belongs to (via finding_groups). */
  projectId?: string;
  rule: string;
  repo: string;
  file: string;
  /** File path — alias for `file`, used by scan detail components. */
  filePath?: string;
  severity: Severity;
  scanner: string;
  verdict: AiVerdict;
  confidence: number | null;
  model: string;
  assignee: string | null;
  status: FindingStatus;
  cwe: string;
  // Rich fields (for detail drawer) — optional
  aiAnalysis?: AiAnalysis;
  sourceCode?: SourceCodeLine[] | string;
  lineNumber?: number;
  message?: string;
  codeSnippet?: string;
  cweIds?: string[];
  dataFlow?: string;
  taintSource?: string;
  matchDetail?: string;
  likelyCwe?: string[];
  fixSuggestion?: string;
  explanation?: string;
  /** When this finding group was first seen (ISO 8601). */
  firstSeenAt?: string;
  /** When this finding record was created (ISO 8601). */
  createdAt?: string;
}

export interface AiAnalysis {
  reasoning: string;
  cweMapping: string;
  remediation: string;
  knowledgeRef: string | null;
}

export interface SourceCodeLine {
  line: number;
  content: string;
  highlighted: boolean;
}

/** Scanner evidence item for detail view */
export interface ScannerEvidence {
  label: string;
  value: string;
  tone: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Team
// ═══════════════════════════════════════════════════════════════════════════════

/** Team — used by teams, projects */
export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string;
  memberCount?: number;
  projects?: string[];
  projectIds?: string[];
  members?: TeamMember[];
  createdAt: string;
  workspaceId?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

/** Team member — used by teams, projects (member picker) */
export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  joinedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Repository
// ═══════════════════════════════════════════════════════════════════════════════

/** Repository — used by repositories, projects, source-control, scan, schedules */
export interface Repository {
  id: string;
  name: string;
  url: string;
  branch: string;
  status: "active" | "inactive" | "error";
  projectId?: string | null;
  project: string | null;
  policyName: string | null;
  connectionType: string[];
  provider: ScmProvider | null;
  findings: number;
  scans: number;
  lastScan: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Project
// ═══════════════════════════════════════════════════════════════════════════════

/** Summary object for a project member. */
export interface ProjectMemberSummary {
  id: string;
  name: string;
  email?: string;
}

/** Summary object for a project team. */
export interface ProjectTeamSummary {
  id: string;
  name: string;
}

/** Summary object for a project repository. */
export interface ProjectRepositorySummary {
  id: string;
  name: string;
}

/** Project — used by projects, repositories */
export interface Project {
  id: string;
  name: string;
  description: string;
  lead: string;
  repositories: ProjectRepositorySummary[];
  teams: ProjectTeamSummary[];
  members: ProjectMemberSummary[];
  /** ISO 8601 timestamp of when the project was created. */
  createdAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Scan
// ═══════════════════════════════════════════════════════════════════════════════

/** Scan row — used by scan list, dashboard recent scans */
export interface ScanRow {
  id: string;
  repository: string;
  repoSub: string;
  /** Server maps DB status to TitleCase display labels. */
  status: "Queued" | "Running" | "Processing" | "Parsing" | "Completed" | "Failed";
  stage: string;
  findings: number;
  critical: number;
  ai: string;
  origin: "managed" | "external_upload";
  provider: ScmProvider | null;
  connectionType: string[];
  startedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
}

/** Scan detail — used by scan detail drawer */
export interface ScanDetail {
  id: string;
  repository: string;
  branch: string;
  commitSha: string;
  origin: "managed" | "external_upload";
  status: "queued" | "running" | "processing" | "parsing" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
  scannerResults: ScannerResult[];
  totalFindings: number;
  newFindings: number;
  existingFindings: number;
  severityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  aiStats?: {
    enabled: boolean;
    verified: number;
    total: number;
    truePositives: number;
    falsePositives: number;
    pending: number;
  };
  timeline: TimelineEvent[];
}

export interface ScannerResult {
  scanner: string;
  status: "completed" | "failed" | "skipped";
  findingsCount: number;
  error?: string;
  durationSeconds?: number;
}

export type TimelineEventType =
  | "triggered"
  | "queued"
  | "cloning"
  | "scanning"
  | "parsing"
  | "ai_verifying"
  | "completed"
  | "failed"
  | "skipped";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  description: string;
  timestamp: string;
  durationSeconds?: number;
  metadata?: Record<string, string | number>;
}

/** Scan config for new scan modal */
export interface ScanConfig {
  repositoryId: string;
  branch: string;
  scanners: string[];
}

/** Repository data for scan modal */
export interface ScanRepository {
  id: string;
  name: string;
  branch: string;
  provider: ScmProvider | null;
  connectionType: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Status Variant Maps
// ═══════════════════════════════════════════════════════════════════════════════

/** Member role → StatusPill variant */
export const ROLE_VARIANT: Record<string, string> = {
  owner: "purple",
  manager: "blue",
  reviewer: "teal",
  member: "slate",
};

/** Member role → CSS pill class (supports string keys for backward compat) */
export const ROLE_PILL_CLASS: Record<string, string> = {
  owner: "pill-purple",
  manager: "pill-blue",
  reviewer: "pill-teal",
  member: "pill-slate",
};
