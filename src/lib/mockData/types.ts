/**
 * Re-export from new locations for backward compatibility.
 *
 * @deprecated Import from `@/commons/types/` domain files directly.
 */

export type { User as MockUser, Workspace as MockWorkspace, WorkspaceMember as MockWorkspaceMember, WorkspaceInvitation as MockWorkspaceInvitation, WorkspaceSetting as MockWorkspaceSetting, Profile as MockProfile, Environment as MockEnvironment } from '@/commons/types/auth';
export type { TeamRow as MockTeam, TeamMemberRow as MockTeamMember } from '@/commons/types/teams';
export type { ProjectRow as MockProject, ProjectMember as MockProjectMember, ProjectTeam as MockProjectTeam, ProjectApiToken as MockProjectApiToken } from '@/commons/types/projects';
export type { RepositoryRow as MockRepository, RepositoryExtended as MockRepositoryExtended, SourceControl as MockSourceControl } from '@/commons/types/repositories';
export type { Scan as MockScan, ScanExtended as MockScanExtended, ScanResult as MockScanResult, ScanUpload as MockScanUpload } from '@/commons/types/scans';
export type { FindingRow as MockFinding, FindingExtended as MockFindingExtended, FindingGroup as MockFindingGroup, FindingHistory as MockFindingHistory, AiVerification as MockAiVerification } from '@/commons/types/findings';
export type { ReportRow as MockReport, QualityGate as MockQualityGate, QualityGateResult as MockQualityGateResult } from '@/commons/types/reports';
export type { AiModelRow as MockAiModel } from '@/commons/types/ai-models';
export type { WebhookRow as MockWebhook } from '@/commons/types/webhooks';
export type { KnowledgeSource as MockKnowledgeSource, KnowledgeEntryRow as MockKnowledgeEntry, KnowledgeBackfillJob as MockKnowledgeBackfillJob } from '@/commons/types/knowledge';
export type { ScheduleRow as MockSchedule } from '@/commons/types/schedules';
export type { Comment as MockComment, AuditLog as MockAuditLog, ActivityLog as MockActivityLog, Notification as MockNotification, StorageFile as MockStorageFile } from '@/commons/types/dashboard';
