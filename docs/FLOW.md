# Feature Flows

**Purpose**: End-to-end flow documentation for every major feature in SAST Integration.
Each section describes the trigger, steps, decision points, key files, and database tables.

**Last Updated**: June 2026

---

## Table of Contents

1. [Authentication Flow](#1-authentication-flow)
2. [Workspace Management Flow](#2-workspace-management-flow)
3. [Project Management Flow](#3-project-management-flow)
4. [Repository Management Flow](#4-repository-management-flow)
5. [External CI Upload Flow](#5-external-ci-upload-flow)
6. [Managed SCM Scan Flow](#6-managed-scm-scan-flow)
7. [Finding Management Flow](#7-finding-management-flow)
8. [AI Verification Flow](#8-ai-verification-flow)
9. [Reporting Flow](#9-reporting-flow)
10. [Team Management Flow](#10-team-management-flow)
11. [Queue System Flow](#11-queue-system-flow)
12. [Quality Gate Flow](#12-quality-gate-flow)
13. [Scan Policy Flow](#13-scan-policy-flow)
14. [Knowledge Base Flow](#14-knowledge-base-flow)
15. [Storage Flow](#15-storage-flow)

---

## 1. Authentication Flow

### 1.1 Sign Up

**Trigger**: User submits registration form at `/auth/signup`

**Steps**:
1. Client sends `POST /api/v1/auth/signup` with email, password, name
2. Zod validates input (password: 8-128 chars, uppercase+lowercase+digit+special)
3. `authService.signup()` checks for duplicate email (neutral — no enumeration)
4. Hash password with bcryptjs (12 salt rounds)
5. Create user record in `users` table (`currentWorkspaceId = null`)
6. Create email verification token
7. Send verification email
8. Return user ID and email

> **Note**: No workspace is created during signup. The user creates their own personal workspace when they first visit `/workspaces`.

**Key Files**:
- `src/app/api/v1/auth/signup/route.ts`
- `src/server/modules/auth/services/auth.service.ts` → `signup()`
- `src/server/modules/auth/repositories/auth.repository.ts`
- `src/server/modules/auth/schemas/auth.schema.ts`

**Database Tables**: `users`, `email_verification_tokens`

---

### 1.2 Sign In

**Trigger**: User submits login form at `/auth/signin`

**Steps**:
1. Client sends `POST /api/v1/auth/signin` with email, password
2. Rate limiter checks attempt count (5 attempts / 15 min window)
3. `authService.signin()` finds user by email
4. Compare password with bcryptjs
5. Create session record with JWT IDs
6. Sign access token (short-lived, 15m) and refresh token (long-lived, 7d)
7. Set refresh token as httpOnly cookie
8. Return access token + user info + current workspace

**Key Files**:
- `src/app/api/v1/auth/signin/route.ts`
- `src/server/modules/auth/services/auth.service.ts` → `signin()`
- `src/server/modules/auth/services/jwt.service.ts`
- `src/server/modules/auth/services/rate-limiter.ts`
- `src/server/modules/auth/cookie.ts`

**Database Tables**: `sessions`, `users`, `workspace_members`, `workspaces`

---

### 1.3 Token Refresh

**Trigger**: Access token expires (15m) or client requests refresh

**Steps**:
1. Client sends `POST /api/v1/auth/refresh` with `x-refresh-request: 1` header
2. Read refresh token from httpOnly cookie
3. Verify refresh token signature
4. Find session by `sessionId` from token payload
5. **Reuse detection**: Compare `refreshTokenId` from token with stored `currentRefreshTokenId`
   - Match → Generate new refresh token ID, update session
   - Mismatch → **Delete session** (potential token theft)
6. Sign new access token
7. Return new access token

**Key Files**:
- `src/app/api/v1/auth/refresh/route.ts`
- `src/server/modules/auth/services/auth.service.ts` → `refresh()`
- `src/server/modules/auth/services/jwt.service.ts`

**Database Tables**: `sessions`

---

### 1.4 Password Reset

**Trigger**: User clicks "Forgot password" at `/auth/forgot-password`

**Steps**:
1. Client sends `POST /api/v1/auth/forgot-password` with email
2. `authFlowsService.forgotPassword()` finds user (silent if not found)
3. Create `password_reset_tokens` record (1 hour expiry)
4. Send reset email with token link
5. User clicks link → `/auth/reset-password?token=xxx`
6. User submits new password
7. Client sends `POST /api/v1/auth/reset-password` with token + new password
8. Validate token, update password hash
9. **Invalidate all user sessions** (security)
10. User must sign in again

**Key Files**:
- `src/app/api/v1/auth/forgot-password/route.ts`
- `src/app/api/v1/auth/reset-password/route.ts`
- `src/server/modules/auth/services/auth-flows.service.ts` → `forgotPassword()`, `resetPassword()`
- `src/server/modules/mail/mail.service.ts`
- `src/server/modules/mail/templates.ts`

**Database Tables**: `password_reset_tokens`, `users`, `sessions`

---

### 1.5 Email Verification

**Trigger**: User clicks verification link from email

**Steps**:
1. Verification link: `/auth/verify-email?token=xxx`
2. Client sends `POST /api/v1/auth/verify-email` with token
3. `authFlowsService.verifyEmail()` validates token
4. Set `emailVerifiedAt` on user record
5. Mark token as used

**Key Files**:
- `src/app/api/v1/auth/verify-email/route.ts`
- `src/server/modules/auth/services/auth-flows.service.ts` → `verifyEmail()`

**Database Tables**: `email_verification_tokens`, `users`

---

### 1.6 Workspace Invitation

**Trigger**: Manager+ sends invite at `/[workspace]/members`

**Steps**:
1. Manager sends `POST /api/v1/auth/invite` with email + role
2. `authService.invite()` creates invitation record (7-day expiry)
3. Send invitation email with accept link
4. Invitee clicks link → `/auth/invite?token=xxx`
5. If new user: account created (no workspace auto-created)
6. User added to inviting workspace with invited role
7. Invitation marked as accepted

> **Note**: Invited users do not get a personal workspace automatically. They can create one later from `/workspaces`.

**Key Files**:
- `src/app/api/v1/auth/invite/route.ts`
- `src/app/api/v1/auth/invite/accept/route.ts`
- `src/server/modules/auth/services/auth.service.ts` → `invite()`, `acceptInvite()`
- `src/server/modules/mail/templates.ts` → `workspaceInviteTemplate()`

**Database Tables**: `workspace_invitations`, `users`, `workspaces`, `workspace_members`

---

## 2. Workspace Management Flow

### 2.1 Create Workspace (Multiple Mode)

**Trigger**: User creates workspace at `/workspaces`

**Steps**:
1. Client sends `POST /api/v1/workspaces` with name, slug, description, type
2. Validate slug uniqueness
3. Create workspace record (type: personal or organization)
4. Add creator as owner
5. Switch user's current workspace to new workspace

**Key Files**:
- `src/app/api/v1/workspaces/route.ts`
- `src/server/modules/workspace/workspace.service.ts` → `create()`
- `src/server/modules/workspace/workspace.repository.ts`

**Database Tables**: `workspaces`, `workspace_members`, `users`

---

### 2.2 Switch Workspace

**Trigger**: User selects different workspace from dropdown

**Steps**:
1. Client sends `PATCH /api/v1/users/me` with `{ currentWorkspaceId }`
2. Verify user is member of target workspace
3. Update `users.current_workspace_id`
4. Client refetches session with new workspace context

**Key Files**:
- `src/app/api/v1/users/me/route.ts`
- `src/server/modules/workspace/workspace.service.ts` → `switchWorkspace()`
- `src/modules/workspace/queries.ts` → `useSwitchWorkspaceMutation()`

**Database Tables**: `users`

---

### 2.3 Member Management

**Trigger**: Manager+ manages members at `/[workspace]/members`

**Change Role**:
1. Owner sends `PATCH /api/v1/workspaces/[id]/members/[userId]` with new role
2. Validate: cannot change own role, cannot assign owner, cannot change owner
3. Update `workspace_members.role`
4. Record in audit log

**Remove Member**:
1. Manager+ sends `DELETE /api/v1/workspaces/[id]/members/[userId]`
2. Validate: cannot remove self, cannot remove owner
3. Delete from `workspace_members`

**Key Files**:
- `src/app/api/v1/workspaces/[id]/members/route.ts`
- `src/server/modules/workspace/member.service.ts` → `changeRole()`, `removeMember()`
- `src/server/modules/workspace/workspace.middleware.ts` → `requireWorkspaceRole()`

**Database Tables**: `workspace_members`, `audit_logs`

---

### 2.4 Workspace Settings

**Trigger**: Owner/Manager edits workspace at `/[workspace]/settings`

**Steps**:
1. User loads settings page, form populated from session/workspace data
2. User edits name, description, or slug
3. Client sends `PATCH /api/v1/workspaces/:id` with updated fields
4. `workspaceService.update()` validates ownership (Owner only)
5. Validate slug uniqueness (if changed)
6. Update workspace record
7. Session cache updated with new workspace name

**Key Files**:
- `src/app/(authenticated)/[workspace]/settings/page.tsx` (new)
- `src/app/api/v1/workspaces/[id]/route.ts` — PATCH handler
- `src/server/modules/workspace/workspace.service.ts` → `update()`
- `src/server/modules/workspace/workspace.repository.ts`

**Database Tables**: `workspaces`

**Permissions**: Owner can edit. Manager can view but fields are disabled.

### 3.1 Create Project

**Trigger**: Manager+ creates project at `/[workspace]/projects/new`

**Steps**:
1. Client sends `POST /api/v1/workspaces/[id]/projects` with name, description, etc.
2. Auto-generate slug from name, check uniqueness
3. Create project record
4. Add creator as project member

**Key Files**:
- `src/app/api/v1/workspaces/[id]/projects/route.ts`
- `src/server/modules/project/services/project.service.ts` → `create()`
- `src/server/modules/project/repositories/project.repository.ts`

**Database Tables**: `projects`, `project_members`

---

### 3.2 Project API Tokens

**Trigger**: Manager+ creates CI token at project settings

**Steps**:
1. Manager sends `POST /api/v1/projects/[projectId]/api-tokens` with name
2. Generate raw token with `sast_p_` prefix
3. Hash token with bcryptjs
4. Store hash + prefix in `project_api_tokens`
5. Return raw token **once** (never stored in plaintext)

**Key Files**:
- `src/app/api/v1/projects/[projectId]/api-tokens/route.ts`
- `src/server/modules/project/repositories/project-api-token.repository.ts` → `create()`

**Database Tables**: `project_api_tokens`

---

## 4. Repository Management Flow

### 4.1 SCM Repository (connection_type = 'scm')

**Trigger**: User connects SCM provider at `/[workspace]/integrations/source-control`

**Steps**:
1. User configures GitHub/GitLab/Gitea credentials via `ConfigureModal`
2. System stores credentials in `source_controls` table
3. User imports repositories from provider
4. Repository records created with `connection_type = 'scm'`
5. Webhooks can be provisioned for automated scanning

**Key Files**:
- `src/features/source-control/ConfigureModal.tsx`
- `src/features/source-control/SetupGuideDrawer.tsx`
- `src/server/modules/project/repositories/project.repository.ts` → `attachRepository()`

**Database Tables**: `source_controls`, `repositories`

---

### 4.2 External Repository (connection_type = 'external')

**Trigger**: First CI upload with new repository URL

**Steps**:
1. CI pipeline uploads to `POST /api/v1/projects/[projectId]/scans/upload`
2. `scanUploadService.resolveOrCreateExternalRepository()` checks for existing repo
3. If not found: create repository with `connection_type = 'external'`
4. No SCM credentials required — results-only flow

**Key Files**:
- `src/server/modules/scan/upload.service.ts` → `resolveOrCreateExternalRepository()`
- `src/server/modules/project/constants.ts` → `REPOSITORY_CONNECTION_TYPES`

**Database Tables**: `repositories`

---

### 4.3 Policy Assignment

**Trigger**: Manager attaches scan policy to repository

**Steps**:
1. User selects policy in `RepositoryScanPolicy` component
2. `PUT /api/v1/workspaces/[id]/projects/[projectId]/repositories/[repoId]/policy`
3. Validate: workspace ownership, policy exists, repository is SCM type
4. Update `repositories.current_policy_id`

**Key Files**:
- `src/app/api/v1/workspaces/[id]/projects/[projectId]/repositories/[repoId]/policy/route.ts`
- `src/server/modules/scan/services/scan-policy.service.ts` → `attachPolicyToRepository()`

**Database Tables**: `repositories`

---

## 5. External CI Upload Flow

**Trigger**: CI pipeline sends `POST /api/v1/projects/[projectId]/scans/upload`

### Full Sequence

1. **Authenticate** — Verify Project API Token (`sast_p_...`) or User JWT
2. **Validate** — Branch, commit, at least one scanner file
3. **Validate Scanners** — `validateScanners()` against `SUPPORTED_SCANNERS`
4. **Resolve Repository** — Find or auto-create external repository
5. **Create Scan** — Insert with `origin: 'external_upload'`
6. **Create Audit** — Insert `scan_uploads` record (who uploaded what)
7. **Process Files** (per scanner):
   a. Upload raw file to storage (Local/S3/Cloudinary)
   b. If file > 5MB → enqueue async parse job
   c. If file ≤ 5MB → parse synchronously
8. **Parse Results** — Dispatch to scanner-specific parser
9. **Create Findings** — Deduplicate via `finding_groups` fingerprint
10. **Complete** — Update scan status to `completed`

### Sync vs Async Decision

```
file.size > ASYNC_PARSE_THRESHOLD_BYTES (5MB)?
    ├── YES → enqueue('parse-scan-result', { scanResultId }) → background worker
    └── NO  → parse immediately → return findings in response
```

### Supported Parsers

| Scanner | Format | Parser |
|---------|--------|--------|
| semgrep | JSON | `parseSemgrep()` |
| gitleaks | JSON | `parseGitleaks()` |
| trivy | JSON | `parseTrivy()` |
| flawfinder | Text | `parseFlawfinder()` |
| cppcheck | XML | `parseCppcheck()` |
| sarif | JSON | `parseSarifStub()` |

### Key Files

- `src/app/api/v1/projects/[projectId]/scans/upload/route.ts`
- `src/server/modules/scan/upload.service.ts` → `uploadResults()`
- `src/server/modules/scan/parsers/index.ts` → `parseScanResult()`
- `src/server/modules/scan/services/finding.service.ts` → `createManyWithDedup()`
- `src/server/modules/scan/services/finding.fingerprint.ts` → `generateFindingFingerprint()`

### Database Tables

`repositories`, `scans`, `scan_results`, `scan_uploads`, `finding_groups`, `findings`

---

## 6. Managed SCM Scan Flow

**Trigger**: Manual trigger, webhook, or schedule

### 6.1 Manual Trigger

1. User clicks "Run Scan" in UI
2. `POST /api/v1/workspaces/[id]/projects/[projectId]/repositories/[repoId]/scans/run`
3. `managedScanService.triggerManualScan()` validates repository (must be SCM + have policy)
4. Create scan record (status: `queued`)
5. Enqueue `run-managed-scan` job
6. Return scan ID immediately

### 6.2 Queue Worker Execution

1. `processManagedScanJob()` picks up job
2. Update scan status to `processing`
3. Shallow clone repository (`git clone --depth 1`)
4. For each scanner in policy:
   a. Check availability (`checkScannerAvailability()`)
   b. If unavailable → skip with warning
   c. Run scanner CLI (`execFile`)
   d. Upload output to storage
   e. Create `scan_results` record
   f. Enqueue `parse-scan-result` job
5. Cleanup temp directory
6. Evaluate results: if all failed → `failed`, else → `completed`

### 6.3 Scheduled Trigger

1. Cron job fires (`trigger-scheduled-managed-scan`)
2. `processScheduledManagedScanJob()` finds due schedules
3. For each due schedule: clone repo, run scanners (same as manual)

### Graceful Degradation

Each scanner is checked independently. Failures are isolated:

```
for scanner in [semgrep, gitleaks, trivy]:
    if not available(scanner):
        log warning, skip
        continue
    try:
        runScanner(scanner)
        record success
    catch error:
        log error, record failure
        continue  // don't stop the loop
```

### Key Files

- `src/server/modules/scan/services/managed-scan.service.ts` → `triggerManualScan()`, `processManagedScanJob()`
- `src/server/modules/scan/scanner-availability.ts` → `checkScannerAvailability()`
- `src/server/modules/scan/scanners.ts` → `SCANNER_COMMANDS`
- `src/server/modules/queue/jobs/parse-scan-result.job.ts`

### Database Tables

`repositories`, `scans`, `scan_results`, `scan_policies`, `schedules`, `finding_groups`, `findings`

---

## 7. Finding Management Flow

### 7.1 Finding Creation (via Scan)

**Trigger**: Parser produces findings from scan results

**Steps**:
1. Parser outputs `NewFinding[]` with severity, rule, file, line, message
2. `findingService.createManyWithDedup()` processes each finding:
   a. Generate fingerprint: `SHA-256(rule + file_path + line_number + message[:180])`
   b. Find or create `finding_groups` row by fingerprint
   c. Insert `findings` row linked to group
3. Update `finding_groups.first_seen_at` / `last_seen_at`

### 7.2 Status Workflow

```
open → verified → fixed
open → false_positive
open → ignored
```

**Steps**:
1. User sends `PATCH /api/v1/findings/[id]/status` with new status
2. `findingService.updateStatus()` validates transition
3. Update `findings.status`
4. Insert `finding_history` record (audit trail)

### 7.3 Assignment

**Steps**:
1. User sends `PATCH /api/v1/findings/[id]/assign` with userId (or null)
2. Update `findings.assigned_to`

### 7.4 Bulk Operations

**Steps**:
1. User selects multiple findings in `FindingsTable`
2. Bulk actions: Accept, Re-verify, Assign
3. Client sends bulk update request

### Key Files

- `src/app/api/v1/findings/route.ts`
- `src/app/api/v1/findings/[id]/status/route.ts`
- `src/app/api/v1/findings/[id]/assign/route.ts`
- `src/server/modules/scan/services/finding.service.ts`
- `src/server/modules/scan/repositories/finding.repository.ts`
- `src/features/findings/FindingsTable.tsx`
- `src/features/findings/FindingDetailDrawer.tsx`

### Database Tables

`findings`, `finding_groups`, `finding_history`

---

## 8. AI Verification Flow

**Trigger**: After scan parsing (if `policy.ai_verification = 'enabled'`)

### Full Sequence

1. **Enqueue** — After parsing, enqueue `ai-verify-findings` job
2. **Load Findings** — `aiVerificationService.batchVerify()` gets all findings for scan
3. **Load Model** — Get AI model config from `ai_models` table (primary or fallback)
4. **For Each Finding**:
   a. Build prompt using `PROMPT_TEMPLATES.strict` or `.balanced`
   b. Include: code snippet, rule, file path, CWE context
   c. Call AI model (currently heuristic simulation, future: Ollama/OpenAI-compatible)
   d. Parse response: verdict (TP/FP), confidence, reasoning, CWE mapping, fix suggestion
   e. Store in `ai_verifications` table
   f. Update `findings.status` to `verified` if verdict is TP
5. **Update Summary** — Store `aiVerifiedCount` in `scan_results.parsed_summary`

### AI Model Configuration

| Field | Purpose |
|-------|---------|
| `provider` | `ollama` / `openai_compatible` / `groq` |
| `base_url` | Model endpoint URL |
| `role` | `primary` / `fallback` |
| `priority` | Ordering for fallback chain |
| `prompt_preset` | `strict` / `balanced` / `custom` |

### Prompt Templates

**Strict** (90% accuracy on Qwen2.5-Coder-SVA):
```
Analyze the following code finding. Is this a TRUE POSITIVE or FALSE POSITIVE?
[Code snippet]
[Rule description]
[CWE context]
```

**Balanced** (88% accuracy on Llama3):
```
Review this security finding...
```

### Key Files

- `src/server/modules/scan/services/ai-verification.service.ts` → `verifyFinding()`, `batchVerify()`
- `src/server/modules/scan/repositories/ai-verification.repository.ts`
- `src/server/modules/queue/jobs/ai-verify-finding.job.ts`
- `src/features/scan/AiVerificationBadge.tsx`
- `src/features/scan/FindingItem.tsx`

### Database Tables

`ai_models`, `ai_verifications`, `findings`, `scan_results`

---

## 9. Reporting Flow

**Trigger**: User generates report at `/[workspace]/reports`

### Steps

1. User selects report type and format
2. `POST /api/v1/reports` with type, filters, format
3. `reportService.generate()` creates report record
4. Gather finding statistics (`reportRepository.getFindingStats()`)
5. Gather AI verification stats (`reportRepository.getAiVerificationStats()`)
6. Generate content based on type:
   - `ai_verdict_summary` — TP/FP counts, confidence
   - `detailed_findings` — Finding counts by severity/status
   - `executive_summary` — High-level metrics
   - `compliance_export` — CSV with severity counts
7. Upload generated file to storage
8. Update report record with file info
9. Report expires in 30 days

### Key Files

- `src/app/api/v1/reports/route.ts`
- `src/server/modules/report/services/report.service.ts`
- `src/server/modules/report/repositories/report.repository.ts`
- `src/features/reports/ReportPreviewDrawer.tsx`

### Database Tables

`reports`, `storage_files`, `findings`, `finding_groups`, `ai_verifications`

---

## 10. Team Management Flow

### 10.1 Create Team

**Trigger**: Manager+ creates team at `/[workspace]/teams/new`

**Steps**:
1. Client sends POST with name, slug, description, memberIds
2. Create team record
3. Add members with roles (admin/contributor)

### 10.2 Assign Team to Project

**Trigger**: Manager assigns team in project form

**Steps**:
1. In `ProjectForm`, select teams
2. Create `project_teams` records

### Key Files

- `src/features/teams/TeamsTable.tsx`
- `src/features/teams/TeamForm.tsx`
- `src/modules/teams/api.ts`

### Database Tables

`teams`, `team_members`, `project_teams`

---

## 11. Queue System Flow

### Job Types

| Job Name | Handler | Trigger |
|----------|---------|---------|
| `parse-scan-result` | `processParseScanResultJob` | After scan upload or managed scan |
| `cleanup-old-scan-files` | `processCleanupOldScanFilesJob` | Daily at 03:00 UTC + manual trigger |
| `run-managed-scan` | `processManagedScanJob` | Manual trigger or schedule |
| `trigger-scheduled-managed-scan` | `processScheduledManagedScanJob` | Cron scheduler |
| `ai-verify-findings` | `processAiVerifyJob` | After parsing (if AI enabled) |

### Worker Registration

Workers are registered in `src/instrumentation.ts` at server startup (Node.js runtime only):

```typescript
// parse results
await queue.work(QUEUE_JOBS.PARSE_SCAN_RESULT, processParseScanResultJob);

// retention cleanup (also scheduled daily at 03:00)
await queue.work(CLEANUP_OLD_SCAN_FILES_JOB_NAME, processCleanupOldScanFilesJob);
await queue.schedule(CLEANUP_OLD_SCAN_FILES_JOB_NAME, '0 3 * * *');

// managed scan execution
await queue.work(QUEUE_JOBS.RUN_MANAGED_SCAN, processManagedScanJob);

// scheduled scan trigger
await queue.work(QUEUE_JOBS.TRIGGER_SCHEDULED_MANAGED_SCAN, processScheduledManagedScanJob);
```

### Job Chain

```
Upload/Trigger
    │
    ├──→ enqueue('run-managed-scan')  [Managed flow only]
    │         │
    │         ▼
    │    processManagedScanJob()
    │         │
    │         ├──→ enqueue('parse-scan-result')  [per scanner]
    │         │
    │         └──→ enqueue('ai-verify-findings')  [if policy.ai_verification = 'enabled']
    │
    └──→ enqueue('parse-scan-result')  [External flow]
              │
              ├──→ processParseScanResultJob()
              │         │
              │         ├──→ create findings with dedup
              │         │
              │         └──→ enqueue('ai-verify-findings')  [if enabled]
              │
              └──→ processAiVerifyJob()
                        │
                        ├──→ for each finding:
                        │      ├──→ getKnowledgeContext()
                        │      ├──→ LLM.verify()
                        │      ├──→ insertAiVerification()
                        │      └──→ updateFinding()
                        │
                        └──→ updateScanResult({ aiVerifiedCount })
```

### Key Files

- `src/instrumentation.ts`
- `src/server/modules/queue/queue.service.ts`
- `src/server/modules/queue/jobs/parse-scan-result.job.ts`
- `src/server/modules/queue/jobs/cleanup-old-scan-files.job.ts`
- `src/server/modules/queue/jobs/ai-verify-finding.job.ts`
- `src/commons/constants/queue.ts`

---

## 12. Quality Gate Flow

**Trigger**: After scan completion or manual evaluation

### Steps

1. `POST /api/v1/quality-gates/evaluate` with scanId
2. `qualityGateService.evaluate()` loads gate config for workspace
3. Get findings for the scan
4. Count blocking findings (above severity threshold)
5. Count pending findings (open status)
6. Evaluate:
   - If blocking findings > 0 → `failed`
   - If pending findings > 0 and `warn_on_pending` → `warning`
   - Else → `passed`
7. Store result in `quality_gate_results`

### Key Files

- `src/app/api/v1/quality-gates/evaluate/route.ts`
- `src/server/modules/scan/services/quality-gate.service.ts`

### Database Tables

`quality_gates`, `quality_gate_results`, `findings`

---

## 13. Scan Policy Flow

### Create Policy

1. Manager+ sends `POST /api/v1/workspaces/[id]/scan-policies`
2. Validate scanners against `SUPPORTED_SCANNERS`
3. Create policy with defaults (profile: standard, ai_verification: enabled, etc.)

### Attach Policy to Repository

1. Manager selects policy for repository
2. `PUT .../repositories/[repoId]/policy`
3. Validate: workspace ownership, repository is SCM type
4. Update `repositories.current_policy_id`

### Key Files

- `src/app/api/v1/workspaces/[id]/scan-policies/route.ts`
- `src/server/modules/scan/services/scan-policy.service.ts`
- `src/server/modules/scan/schemas/scan-policy.schema.ts`

### Database Tables

`scan_policies`, `repositories`

---

## 14. Knowledge Base Flow

### Purpose

Provides CWE/NVD context to AI verification models for more accurate verdicts.

### Steps

1. Knowledge sources configured in `knowledge_sources` table
2. Entries stored in `knowledge_entries` with CWE IDs, severity, tags
3. During AI verification: `getKnowledgeContext(rule, file_path)` fetches relevant entries
4. Context included in AI prompt for better accuracy

### Key Files

- `src/features/knowledge-base/EntryModals.tsx`
- `drizzle/schema/integrations.ts` — `knowledge_sources`, `knowledge_entries`

### Database Tables

`knowledge_sources`, `knowledge_entries`

---

## 15. Storage Flow

### Architecture

Three storage drivers via Strategy pattern:

| Driver | When to Use | Configuration |
|--------|-------------|---------------|
| Local | Development, small deployments | `STORAGE_LOCAL_PATH` |
| S3/MinIO | Production, scalable | AWS credentials or MinIO endpoint |
| Cloudinary | Cloud-native | Cloudinary API key |

### Flow

1. Service calls `getStorageDriver()` singleton
2. Driver resolved from `STORAGE_PROVIDER` env var
3. Upload: `driver.upload(buffer, key, options)` → returns `{ key, url, size }`
4. Download: `driver.getStream(key)` or `driver.getUrl(key)`
5. Delete: `driver.delete(key)`

### Key Files

- `src/server/modules/storage/storage.service.ts` → `getStorageDriver()`
- `src/server/modules/storage/storage.interface.ts` — `StorageDriver` interface
- `src/server/modules/storage/drivers/local.driver.ts`
- `src/server/modules/storage/drivers/s3.driver.ts`
- `src/server/modules/storage/drivers/cloudinary.driver.ts`

### Storage Layout

```
/storage/
├── artifacts/                    # Scan reports (30-day retention)
│   └── scan-{id}/
│       ├── semgrep.json
│       └── gitleaks.json
├── reports/                      # Generated reports
│   └── report-{id}.pdf
└── uploads/                      # Local driver uploads
```

---

**Last Updated**: June 2026
