/**
 * Barrel exports for workspace shared types, mock data, and constants.
 *
 * @module workspace-shared
 */

// Types
export type {
  Severity,
  AiVerdict,
  FindingStatus,
  ScanStatus,
  ScmProvider,
  MemberRole,
  ReportFormat,
  ReportType,
  Finding,
  AiAnalysis,
  SourceCodeLine,
  FindingComment,
  ScannerEvidence,
  Team,
  TeamMember,
  Repository,
  Project,
  ProjectAutomation,
  ScanRow,
  ScanDetail,
  ScannerResult,
  TimelineEvent,
  TimelineEventType,
  ScanConfig,
  ScanRepository,
  Member,
  Invitation,
  ScanPolicy,
  AiModel,
  KnowledgeEntry,
  Schedule,
  ScheduleRun,
  ScannerEngine,
  Webhook,
  WebhookDelivery,
  ScmProviderConfig,
  Report,
} from './types';

// Variant maps
export {
  SEVERITY_VARIANT,
  FINDING_STATUS_VARIANT,
  VERDICT_VARIANT,
  SCAN_STATUS_VARIANT,
  ROLE_VARIANT,
  ROLE_PILL_CLASS,
  CONNECTION_STATUS_VARIANT,
  REPO_STATUS_VARIANT,
} from './types';

// UI constants
export {
  AVATAR_SIZES,
  CHECKBOX_SIZE,
  ICON_SIZES,
  DATE_LOCALE,
  DEFAULT_BRANCH,
} from './types';

// Mock data
export { MOCK_TEAMS, MOCK_TEAM_MEMBERS } from './mockTeams';
export { MOCK_REPOSITORIES } from './mockRepositories';
export { MOCK_FINDINGS, MOCK_COMMENTS, getMockScannerOutput, getMockAiAnalysis, getMockSourceCode, getMockAiSuggestion } from './mockFindings';
