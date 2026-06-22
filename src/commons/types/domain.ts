/**
 * Unified domain types for the SAST Integration frontend.
 *
 * Single source of truth for all domain types, status enums, variant maps,
 * and UI constants. Imported by all feature modules.
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

/** Repository connection type — used by repositories, scan, source-control */
export type RepositoryConnectionType = "scm" | "external";

/** Scan origin type — used by scan, dashboard */
export type ScanOrigin = "managed" | "external_upload";

/** Workspace member role — used by members, teams */
export type MemberRole = "owner" | "manager" | "reviewer" | "member";

/** Report format */
export type ReportFormat = "pdf" | "xlsx" | "json";

/** Report type */
export type ReportType =
  | "ai_verdict_summary"
  | "detailed_findings"
  | "executive_summary"
  | "compliance_export";

// ═══════════════════════════════════════════════════════════════════════════════
// Finding (Unified)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Unified finding type — replaces both FindingRow (findings module) and Finding (scan module).
 *
 * Used by: findings, scan, reports, dashboard, quality-gates
 *
 * @remarks
 * - `confidence` is `number | null` (0–100 or null for unverified). Display formatting ("94%", "—") is a UI concern.
 * - `status` uses consistent lowercase with underscores: `'open' | 'dismissed' | 'resolved'`
 * - Rich fields (`aiAnalysis`, `sourceCode`, `comments`) are optional — list views don't need them.
 */
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
  memberCount: number;
  projects: string[];
  projectIds?: string[];
  createdAt: string;
}

/** Team member — used by teams, projects (member picker) */
export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role?: MemberRole;
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

/** Project automation flags */
export type ProjectAutomation =
  | "auto_scan"
  | "gate_enforced"
  | "notify_critical";

/** Project — used by projects, repositories */
export interface Project {
  id: string;
  name: string;
  description: string;
  lead: string;
  repositories: string[];
  teams: string[];
  members: string[];
  repositoryIds?: string[];
  teamIds?: string[];
  memberIds?: string[];
  memberNames?: string[];
  teamNames?: string[];
  automation: string[];
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
  status: "queued" | "running" | "processing" | "parsing" | "completed" | "failed";
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
  status: "queued" | "running" | "processing" | "completed" | "failed";
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
// Member
// ═══════════════════════════════════════════════════════════════════════════════

/** Workspace member */
export interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
  status: "active" | "invited";
  joinedAt: string;
}

/** Pending invitation */
export interface Invitation {
  id: string;
  email: string;
  role: MemberRole;
  status: "pending";
  sentAt: string;
  expiresAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Other Modules
// ═══════════════════════════════════════════════════════════════════════════════

/** Scan policy */
export interface ScanPolicy {
  id: string;
  name: string;
  profile: "quick" | "standard" | "comprehensive";
  aiVerification: boolean;
  severityGate: Severity;
  scanners: string[];
}

/** AI model */
export interface AiModel {
  id: string;
  name: string;
  provider: string;
  role: "primary" | "fallback_1" | "fallback_2";
  status: "active" | "inactive" | "error";
  lastTested: string | null;
}

/** Knowledge base entry */
export interface KnowledgeEntry {
  id: string;
  name: string;
  source: "CWE" | "NVD" | "MITRE" | "Custom";
  severity: Severity;
  description: string;
  usedByAi: string;
  enabled: boolean;
}

/** Scan schedule */
export interface Schedule {
  id: string;
  repo: string;
  branch: string;
  frequency: "hourly" | "daily" | "weekly" | "monthly";
  cron: string;
  timezone: string;
  policy: string;
  nextRun: string;
  lastRuns: ScheduleRun[];
  status: "active" | "paused";
}

export interface ScheduleRun {
  status: "pass" | "fail";
  time: string;
}

/** Scanner engine */
export interface ScannerEngine {
  id: string;
  name: string;
  capability: string;
  status: "active" | "inactive" | "error";
  rules: number;
  version: string;
}

/** Webhook */
export interface Webhook {
  id: string;
  name: string;
  provider: string;
  endpoint: string;
  events: string[];
  lastDelivery: WebhookDelivery;
  status: "Active" | "Inactive";
}

export interface WebhookDelivery {
  code: number;
  time: string;
}

/** SCM provider config */
export interface ScmProviderConfig {
  id: string;
  name: string;
  type: ScmProvider;
  status: "Connected" | "Disconnected" | "Needs refresh";
  mode: string;
  org: string;
  discovered: number;
  imported: number;
  lastSync: string | null;
}

/** Report */
export interface Report {
  id: string;
  name: string;
  type: ReportType;
  range: string;
  status: "Generated" | "Pending" | "Failed";
  format: ReportFormat;
  created: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Status Variant Maps
// ═══════════════════════════════════════════════════════════════════════════════

/** Severity → StatusPill variant (supports both lowercase and TitleCase keys) */
export const SEVERITY_VARIANT: Record<string, string> = {
  critical: "red",
  high: "amber",
  medium: "blue",
  low: "slate",
  info: "slate",
  Critical: "red",
  High: "amber",
  Medium: "blue",
  Low: "slate",
  Info: "slate",
};

/** Finding status → StatusPill variant */
export const FINDING_STATUS_VARIANT: Record<FindingStatus, string> = {
  open: "red",
  dismissed: "teal",
  resolved: "green",
};

/** AI verdict → StatusPill variant */
export const VERDICT_VARIANT: Record<AiVerdict, string> = {
  TP: "red",
  FP: "teal",
  Pending: "amber",
};

/** Scan status → StatusPill variant */
export const SCAN_STATUS_VARIANT: Record<string, string> = {
  queued: "slate",
  running: "blue",
  processing: "amber",
  parsing: "blue",
  completed: "teal",
  failed: "red",
};

/** Member role → StatusPill variant */
export const ROLE_VARIANT: Record<MemberRole, string> = {
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

/** SCM connection status → StatusPill variant */
export const CONNECTION_STATUS_VARIANT: Record<string, string> = {
  Connected: "teal",
  Disconnected: "slate",
  "Needs refresh": "amber",
};

/** Repository status → StatusPill variant */
export const REPO_STATUS_VARIANT: Record<string, string> = {
  active: "teal",
  inactive: "slate",
  error: "red",
};

// ═══════════════════════════════════════════════════════════════════════════════
// UI Constants
// ═══════════════════════════════════════════════════════════════════════════════

/** Avatar size presets */
export const AVATAR_SIZES = { sm: 20, md: 40, lg: 56 } as const;

/** Standard checkbox size */
export const CHECKBOX_SIZE = 16;

/** Icon size presets */
export const ICON_SIZES = { sm: 16, md: 18, lg: 20, xl: 24, xxl: 48 } as const;

/** Default locale for date formatting */
export const DATE_LOCALE = "en-US";
/** Default git branch */
export const DEFAULT_BRANCH = "main";
