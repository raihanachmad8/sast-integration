# TRACK.md — Migration Tracker: Stash → Active

> This file tracks the phased migration of modules from the stash project
> (v0.4.0) into the active project (v0.1.0). Each phase lists what to migrate,
> dependencies, files involved, and schema alignment notes.

---

## Current State

| Layer | Active | Stash | Gap |
|-------|--------|-------|-----|
| Server Modules | 7 (auth, workspace, mail, storage, **teams, model, webhooks**) | 13 | 6 missing |
| API Routes | 22 route files | 86 route files | 64 missing |
| Frontend Modules | 6 (auth, dashboard, members, project, teams, workspace) | 19 | 13 missing |
| Frontend Features | 8 dirs | 8 dirs | ~60 components vs ~16 |
| DB Schema | 11 files | 12 files | ✅ Aligned (44 tables) |
| Shared Components | 33 files | 35 files | 2 missing |
| Zod Schemas | 14 files | 14 files | ✅ Complete |

---

## Phase 1 — Foundation (Schema + Low-Dep Modules)

### 1A: Schema Alignment

> **Goal:** Align Active schema with Stash to resolve naming and column differences.

**Files to modify in Active:**

| Schema File | Changes Needed | Status |
|-------------|----------------|--------|
| `drizzle/schema/scans.ts` | Rename `scanPolicies` → `scanProfiles`, add `origin`/`trigger_source` to scans, add `format`/`file_key`/`file_size`/`parsed_summary` to scanResults (replace `raw_output`/`summary`), add `scanUploads` table, rename `policy_id` → `profile_id` everywhere | ✅ |
| `drizzle/schema/projects.ts` | Add `lead` column, add `projectApiTokens` table, remove FK refs on `created_by`/`updated_by` (use plain uuid), add missing `workspaces` import | ✅ |
| `drizzle/schema/findings.ts` | Rename `aiModels` import → `models`, make `finding_id`/`model_id` nullable in aiVerifications | ✅ |
| `drizzle/schema/integrations.ts` | Rename `aiModels` table → `models` (export as `models`), add `knowledgeBackfillJobs` table, add uniqueIndex on knowledgeEntries(source_id, cwe_id) | ✅ |
| `drizzle/schema/source-controls.ts` | Add `connection_type` column with CHECK constraint to repositories | ✅ |
| `drizzle/schema/users.ts` | Add `username`, `bio`, `timezone`, `language` columns | ✅ |

> **Action:** Run `pnpm db:generate && pnpm db:migrate` after all schema changes.

---

### 1B: Teams Module

> **Schema tables:** `teams`, `team_members`
> **Dependencies:** workspace (getMemberRole)
> **Complexity:** Low

| File | Source (Stash) | Target (Active) | Status |
|------|---------------|-----------------|--------|
| `constants.ts` | `server/modules/teams/constants.ts` | `src/server/modules/teams/constants.ts` | ✅ |
| `index.ts` | (not in stash — create barrel) | `src/server/modules/teams/index.ts` | ✅ |
| `services/team.service.ts` | `server/modules/teams/services/team.service.ts` | `src/server/modules/teams/services/team.service.ts` | ✅ |
| `repositories/team.repository.ts` | `server/modules/teams/repositories/team.repository.ts` | `src/server/modules/teams/repositories/team.repository.ts` | ✅ |

**Service methods:** list, getById, create, update, softDelete, listMembers, addMember, removeMember
**Repository methods:** listByWorkspace, listByWorkspaceWithSummaries, findById, findBySlug, create, update, softDelete, listMembers, addMember, removeMember, setMembers, getMemberIds, getMemberCount, getProjectCount, getProjectNames

**Import fixes needed:**
- `@/server/modules/workspace/workspace.repository` → already exists in Active ✅
- `@/server/http/errors` (AppError) → already exists in Active ✅

---

### 1C: Model Module

> **Schema table:** `ai_models` (exported as `models` after 1A)
> **Dependencies:** workspace
> **Complexity:** Low

| File | Source | Target | Status |
|------|--------|--------|--------|
| `model.service.ts` | `server/modules/model/model.service.ts` | `src/server/modules/model/model.service.ts` | ✅ |
| `model.repository.ts` | `server/modules/model/model.repository.ts` | `src/server/modules/model/model.repository.ts` | ✅ |

**Service methods:** createModel, getModelById, listModelsByWorkspace, updateModel, deleteModel
**Repository methods:** create, findById, findByWorkspace, update, delete

---

### 1D: Webhooks Module

> **Schema table:** `webhooks`
> **Dependencies:** workspace
> **Complexity:** Low

| File | Source | Target | Status |
|------|--------|--------|--------|
| `webhook.service.ts` | `server/modules/webhooks/webhook.service.ts` | `src/server/modules/webhooks/webhook.service.ts` | ✅ |
| `webhook.repository.ts` | (new — extracted from service) | `src/server/modules/webhooks/webhook.repository.ts` | ✅ |
| `index.ts` | (new — create barrel) | `src/server/modules/webhooks/index.ts` | ✅ |

**Service methods:** createWebhook, getWebhookById, listWebhooksByWorkspace, updateWebhook, deleteWebhook

---

### 1E: Commons Constants Update

| File | Changes Needed | Status |
|------|----------------|--------|
| `src/commons/constants/scan.ts` | Update imports to match new schema names (`scanProfiles` not `scanPolicies`) | ⬜ |
| `src/commons/constants/source-control.ts` | Add `connection_type` handling if not present | ⬜ |
| `src/commons/constants/queue.ts` | Verify QUEUE_JOBS enum matches stash | ⬜ |
| `src/commons/schemas/model.ts` | Add `modelSchema` (if missing — stash has it) | ⬜ |

---

## Phase 2 — Project Module

> **Schema tables:** `projects`, `project_members`, `project_teams`, `environments`, `project_api_tokens`
> **Dependencies:** workspace
> **Complexity:** Medium

| File | Source | Target | Status |
|------|--------|--------|--------|
| `constants.ts` | `server/modules/project/constants.ts` | `src/server/modules/project/constants.ts` | ✅ |
| `index.ts` | `server/modules/project/index.ts` | `src/server/modules/project/index.ts` | ✅ |
| `schemas/project.schema.ts` | — | `src/commons/schemas/project.ts` (already exists) | ✅ |
| `services/project.service.ts` | `server/modules/project/services/project.service.ts` | `src/server/modules/project/services/project.service.ts` | ✅ |
| `repositories/project.repository.ts` | `server/modules/project/repositories/project.repository.ts` | `src/server/modules/project/repositories/project.repository.ts` | ✅ |
| `repositories/project-api-token.repository.ts` | `server/modules/project/repositories/project-api-token.repository.ts` | `src/server/modules/project/repositories/project-api-token.repository.ts` | ✅ |

**Service methods:** list, getById, create, update, softDelete, listRepositories, listRepositoriesByWorkspace, attachRepository, setRepositoryPolicy, createApiToken, listApiTokens, revokeApiToken

**Cross-module dependency:**
- `setRepositoryPolicy` dynamically imports `@/server/modules/scan/services/scan-policy.service` — this won't resolve until Phase 4. Options:
  - a) Stub it and add later
  - b) Migrate scan-profile service first (recommended)

---

## Phase 3 — Source Controls + Knowledge Base

### 3A: Source Controls Module

> **Schema tables:** `source_controls`, `repositories`
> **Dependencies:** project (attachRepository)
> **Complexity:** High (OAuth flows)

| File | Source | Target | Status |
|------|--------|--------|--------|
| `source-control.service.ts` | `server/modules/source-controls/source-control.service.ts` | `src/server/modules/source-controls/source-control.service.ts` | ⬜ |

**Service methods:** create, getById, listByWorkspace, update, delete, finalizeCallback, testConnection, sync, buildRedirectUrl, discoverRepositories (GitHub/GitLab/Gitea), OAuth code exchange, JWT builder for GitHub App

**Note:** This file is ~530 lines and contains provider-specific OAuth logic. Test carefully.

---

### 3B: Knowledge Base Module

> **Schema tables:** `knowledge_sources`, `knowledge_entries`, `knowledge_backfill_jobs`
> **Dependencies:** workspace, queue (backfill jobs)
> **Complexity:** Medium

| File | Source | Target | Status |
|------|--------|--------|--------|
| `knowledge-base.service.ts` | `server/modules/knowledge-base/knowledge-base.service.ts` | `src/server/modules/knowledge-base/knowledge-base.service.ts` | ⬜ |
| `knowledge-source.service.ts` | `server/modules/knowledge-base/knowledge-source.service.ts` | `src/server/modules/knowledge-base/knowledge-source.service.ts` | ⬜ |
| `knowledge-source.repository.ts` | `server/modules/knowledge-base/knowledge-source.repository.ts` | `src/server/modules/knowledge-base/knowledge-source.repository.ts` | ⬜ |
| `sync-engine.ts` | `server/modules/knowledge-base/sync-engine.ts` | `src/server/modules/knowledge-base/sync-engine.ts` | ⬜ |
| `knowledge-backfill.service.ts` | `server/modules/knowledge-base/knowledge-backfill.service.ts` | `src/server/modules/knowledge-base/knowledge-backfill.service.ts` | ⬜ |

---

## Phase 4 — Scan Module (Largest)

> **Schema tables:** `scan_profiles`, `scans`, `scan_results`, `quality_gates`, `quality_gate_results`, `scan_uploads`
> **Dependencies:** project, source-controls, queue, storage
> **Complexity:** HIGH — 23 files, parsers, managed scan execution, AI verification

### 4A: Scan Core (constants, types, scanners)

| File | Source | Target | Status |
|------|--------|--------|--------|
| `constants.ts` | `server/modules/scan/constants.ts` | `src/server/modules/scan/constants.ts` | ⬜ |
| `scanners.ts` | `server/modules/scan/scanners.ts` | `src/server/modules/scan/scanners.ts` | ⬜ |
| `rules.ts` | `server/modules/scan/rules.ts` | `src/server/modules/scan/rules.ts` | ⬜ |
| `scanner-availability.ts` | `server/modules/scan/scanner-availability.ts` | `src/server/modules/scan/scanner-availability.ts` | ⬜ |

### 4B: Scan Repositories

| File | Source | Target | Status |
|------|--------|--------|--------|
| `repositories/scan.repository.ts` | stash | `src/server/modules/scan/repositories/scan.repository.ts` | ⬜ |
| `repositories/finding.repository.ts` | stash | `src/server/modules/scan/repositories/finding.repository.ts` | ⬜ |
| `repositories/scan-profile.repository.ts` | stash | `src/server/modules/scan/repositories/scan-profile.repository.ts` | ⬜ |
| `repositories/quality-gate.repository.ts` | stash | `src/server/modules/scan/repositories/quality-gate.repository.ts` | ⬜ |
| `repositories/ai-verification.repository.ts` | stash | `src/server/modules/scan/repositories/ai-verification.repository.ts` | ⬜ |

### 4C: Scan Services

| File | Source | Target | Status |
|------|--------|--------|--------|
| `services/finding.fingerprint.ts` | stash | `src/server/modules/scan/services/finding.fingerprint.ts` | ⬜ |
| `services/finding.service.ts` | stash | `src/server/modules/scan/services/finding.service.ts` | ⬜ |
| `services/scan-profile.service.ts` | stash | `src/server/modules/scan/services/scan-profile.service.ts` | ⬜ |
| `services/quality-gate.service.ts` | stash | `src/server/modules/scan/services/quality-gate.service.ts` | ⬜ |
| `services/ai-verification.service.ts` | stash | `src/server/modules/scan/services/ai-verification.service.ts` | ⬜ |
| `services/managed-scan.service.ts` | stash | `src/server/modules/scan/services/managed-scan.service.ts` | ⬜ |
| `upload.service.ts` | stash | `src/server/modules/scan/upload.service.ts` | ⬜ |

### 4D: Parsers

| File | Source | Target | Status |
|------|--------|--------|--------|
| `parsers/index.ts` | stash | `src/server/modules/scan/parsers/index.ts` | ⬜ |
| `parsers/semgrep.parser.ts` | stash | `src/server/modules/scan/parsers/semgrep.parser.ts` | ⬜ |
| `parsers/cppcheck.parser.ts` | stash | `src/server/modules/scan/parsers/cppcheck.parser.ts` | ⬜ |
| `parsers/gitleaks.parser.ts` | stash | `src/server/modules/scan/parsers/gitleaks.parser.ts` | ⬜ |
| `parsers/trivy.parser.ts` | stash | `src/server/modules/scan/parsers/trivy.parser.ts` | ⬜ |
| `parsers/flawfinder.parser.ts` | stash | `src/server/modules/scan/parsers/flawfinder.parser.ts` | ⬜ |

---

## Phase 5 — Queue Module

> **Schema tables:** None (uses pg-boss on existing PostgreSQL)
> **Dependencies:** scan (parsers, finding service), model (AI models), knowledge-base (entries), storage (cleanup)
> **Complexity:** Medium

| File | Source | Target | Status |
|------|--------|--------|--------|
| `queue.service.ts` | stash | `src/server/modules/queue/queue.service.ts` | ⬜ |
| `jobs/parse-scan-result.job.ts` | stash | `src/server/modules/queue/jobs/parse-scan-result.job.ts` | ⬜ |
| `jobs/ai-verify-finding.job.ts` | stash | `src/server/modules/queue/jobs/ai-verify-finding.job.ts` | ⬜ |
| `jobs/cleanup-old-scan-files.job.ts` | stash | `src/server/modules/queue/jobs/cleanup-old-scan-files.job.ts` | ⬜ |
| `jobs/nvd-knowledge-backfill.job.ts` | stash | `src/server/modules/queue/jobs/nvd-knowledge-backfill.job.ts` | ⬜ |

**Dependency note:** Queue jobs reference scan parsers, AI models, knowledge-base entries, and storage service. All of these must be migrated first.

---

## Phase 6 — Schedules + Report

### 6A: Schedules Module

> **Schema table:** `schedules` (in scans schema)
> **Dependencies:** scan (scan-profiles, managed-scan)
> **Complexity:** Low

| File | Source | Target | Status |
|------|--------|--------|--------|
| `schedule.service.ts` | stash | `src/server/modules/schedules/schedule.service.ts` | ⬜ |

**Service methods:** createSchedule, getScheduleById, listSchedulesByWorkspace, updateSchedule, deleteSchedule

### 6B: Report Module

> **Schema tables:** `reports`, `storage_files`
> **Dependencies:** workspace, scan, findings, storage
> **Complexity:** Low

| File | Source | Target | Status |
|------|--------|--------|--------|
| `services/report.service.ts` | stash | `src/server/modules/report/services/report.service.ts` | ⬜ |
| `repositories/report.repository.ts` | stash | `src/server/modules/report/repositories/report.repository.ts` | ⬜ |

---

## Phase 7 — API Routes

> **Goal:** Wire up all server modules to Next.js App Router route handlers.
> Stash has 86 route files. Active currently has 22. Need to add ~64 route files.

**Route groups to create (in priority order):**

| Group | Route Pattern | Method(s) | Module | Status |
|-------|--------------|-----------|--------|--------|
| **Projects** | `/api/v1/workspaces/[id]/projects` | GET, POST | project | ⬜ |
| | `/api/v1/workspaces/[id]/projects/[projectId]` | GET, PATCH, DELETE | project | ⬜ |
| | `/api/v1/workspaces/[id]/projects/[projectId]/api-tokens` | GET, POST | project | ⬜ |
| | `/api/v1/workspaces/[id]/projects/[projectId]/api-tokens/[tokenId]` | DELETE | project | ⬜ |
| | `/api/v1/workspaces/[id]/projects/[projectId]/repositories` | GET, POST | project | ⬜ |
| | `/api/v1/workspaces/[id]/projects/[projectId]/repositories/[repoId]` | GET, DELETE | project | ⬜ |
| | `/api/v1/workspaces/[id]/projects/[projectId]/repositories/[repoId]/policy` | PUT | project | ⬜ |
| | `/api/v1/workspaces/[id]/projects/[projectId]/repositories/[repoId]/scans` | GET | scan | ⬜ |
| | `/api/v1/workspaces/[id]/projects/[projectId]/repositories/[repoId]/scans/run` | POST | scan | ⬜ |
| | `/api/v1/workspaces/[id]/projects/[projectId]/repositories/[repoId]/schedule` | GET, PUT | schedules | ⬜ |
| **Teams** | `/api/v1/workspaces/[id]/teams` | GET, POST | teams | ⬜ |
| | `/api/v1/workspaces/[id]/teams/[teamId]` | GET, PATCH, DELETE | teams | ⬜ |
| | `/api/v1/workspaces/[id]/teams/[teamId]/members` | GET, POST, DELETE | teams | ⬜ |
| **Scan Profiles** | `/api/v1/workspaces/[id]/scan-profiles` | GET, POST | scan | ⬜ |
| | `/api/v1/workspaces/[id]/scan-profiles/[profileId]` | GET, PATCH, DELETE | scan | ⬜ |
| **Scans** | `/api/v1/scans` | GET | scan | ⬜ |
| | `/api/v1/scans/[id]` | GET | scan | ⬜ |
| | `/api/v1/scans/[id]/findings` | GET | scan | ⬜ |
| **Findings** | `/api/v1/findings` | GET | scan | ⬜ |
| | `/api/v1/findings/[id]` | GET | scan | ⬜ |
| | `/api/v1/findings/[id]/status` | PATCH | scan | ⬜ |
| | `/api/v1/findings/[id]/assign` | PATCH | scan | ⬜ |
| | `/api/v1/findings/[id]/verify` | POST | scan | ⬜ |
| | `/api/v1/findings/bulk` | POST | scan | ⬜ |
| **Source Controls** | `/api/v1/workspaces/[id]/source-controls` | GET, POST | source-controls | ⬜ |
| | `/api/v1/workspaces/[id]/source-controls/[providerId]` | GET, PATCH, DELETE | source-controls | ⬜ |
| | `/api/v1/workspaces/[id]/source-controls/[providerId]/sync` | POST | source-controls | ⬜ |
| | `/api/v1/workspaces/[id]/source-controls/[providerId]/test` | POST | source-controls | ⬜ |
| | `/api/v1/source-control/callback/[provider]` | GET | source-controls | ⬜ |
| **AI Models** | `/api/v1/workspaces/[id]/model` | GET, POST | model | ⬜ |
| | `/api/v1/workspaces/[id]/model/[modelId]` | GET, PATCH, DELETE | model | ⬜ |
| **Knowledge Base** | `/api/v1/workspaces/[id]/knowledge-base` | GET, POST | knowledge-base | ⬜ |
| | `/api/v1/workspaces/[id]/knowledge-base/[entryId]` | GET, PATCH, DELETE | knowledge-base | ⬜ |
| | `/api/v1/workspaces/[id]/knowledge-sources` | GET, POST | knowledge-base | ⬜ |
| | `/api/v1/workspaces/[id]/knowledge-sources/[sourceId]` | GET, DELETE | knowledge-base | ⬜ |
| | `/api/v1/workspaces/[id]/knowledge-sources/[sourceId]/sync` | POST | knowledge-base | ⬜ |
| | `/api/v1/workspaces/[id]/knowledge-sources/[sourceId]/backfill` | POST | knowledge-base | ⬜ |
| **Quality Gates** | `/api/v1/quality-gates` | GET | scan | ⬜ |
| | `/api/v1/quality-gates/evaluate` | POST | scan | ⬜ |
| | `/api/v1/quality-gates/results` | GET | scan | ⬜ |
| **Scanner Engines** | `/api/v1/scanner-engines` | GET | scan | ⬜ |
| | `/api/v1/scanner-engines/[id]/rules` | GET | scan | ⬜ |
| **Webhooks** | `/api/v1/workspaces/[id]/webhooks` | GET, POST | webhooks | ⬜ |
| | `/api/v1/workspaces/[id]/webhooks/[webhookId]` | GET, PATCH, DELETE | webhooks | ⬜ |
| **Schedules** | `/api/v1/workspaces/[id]/schedules` | GET, POST | schedules | ⬜ |
| | `/api/v1/workspaces/[id]/schedules/[scheduleId]` | GET, PATCH, DELETE | schedules | ⬜ |
| **Reports** | `/api/v1/reports` | GET, POST | report | ⬜ |
| **Upload** | `/api/v1/projects/[projectId]/scans/upload` | POST | scan | ⬜ |
| | `/api/v1/projects/[projectId]/scans/[scanId]/reparse` | POST | scan | ⬜ |
| **Retention** | `/api/v1/retention/cleanup` | POST | queue | ⬜ |

---

## Phase 8 — Frontend Modules

> **Goal:** Migrate TanStack Query data-access layers from stash.
> Each module: `api.ts`, `keys.ts`, `queries.ts`, `index.ts` (+ optional `types.ts`)

| Module | Files | Status |
|--------|-------|--------|
| `scan/` | api.ts, keys.ts, queries.ts, types.ts, mock-data.ts, index.ts | ⬜ |
| `finding/` | api.ts, keys.ts, queries.ts, index.ts | ⬜ |
| `repository/` | api.ts, keys.ts, queries.ts, index.ts | ⬜ |
| `source-control/` | api.ts, keys.ts, queries.ts, index.ts | ⬜ |
| `scan-profiles/` | api.ts, keys.ts, queries.ts, index.ts | ⬜ |
| `scanner-engines/` | api.ts, keys.ts, queries.ts, index.ts | ⬜ |
| `quality-gates/` | api.ts, keys.ts, queries.ts, index.ts | ⬜ |
| `model/` | api.ts, keys.ts, queries.ts, index.ts | ⬜ |
| `knowledge-base/` | api.ts, keys.ts, queries.ts, source-flow.ts, index.ts | ⬜ |
| `schedules/` | api.ts, keys.ts, queries.ts, index.ts | ⬜ |
| `webhooks/` | api.ts, keys.ts, queries.ts, index.ts | ⬜ |
| `report/` | api.ts, keys.ts, queries.ts, index.ts | ⬜ |
| `project/` | Add api-tokens.ts from stash | ⬜ |
| `profile/` | api.ts, keys.ts, queries.ts, index.ts | ⬜ |

**Post-migration:** Remove all `mockData` fallbacks, wire to real endpoints.

---

## Phase 9 — Frontend Features

> **Goal:** Migrate UI components. Active already has many feature dirs with mock data.
> Stash feature dirs use the same component names — diff and merge.

| Feature | Components | Status |
|---------|-----------|--------|
| `scan/` | ScanTable, ScanDetailDrawer, ScanSummaryCards, ScanTimeline, NewScanModal, FindingItem, AiVerificationBadge, RepositoryScanPolicy, types.ts, mockData.ts, index.ts | ⬜ |
| `findings/` | FindingsPage, FindingsTable, FindingDetailDrawer, index.ts | ⬜ |
| `repositories/` | RepositoriesTable, RepositoryDetailDrawer, mockData.ts, index.ts | ⬜ |
| `quality-gates/` | GateResultsTable, index.ts | ⬜ |
| `workspace/` | WorkspaceCard, WorkspaceGeneralSettings, EmptyWorkspaceState, index.ts | ⬜ |
| `dashboard/` | DashboardSummaryCards, RecentScansTable, WorkspaceHealth, AttentionRequired, index.ts | ⬜ |

**Post-migration:** Remove all mockData imports, verify all components connect to real APIs.

---

## Phase 10 — Testing

| Area | Test Files (from Stash) | Status |
|------|------------------------|--------|
| Unit: teams | `team.service.test.ts` | ⬜ |
| Unit: project | `project.service.test.ts`, `project-api-token.repository.test.ts`, `project-audit.service.test.ts` | ⬜ |
| Unit: scan | `finding.service.test.ts`, `managed-scan.service.test.ts`, `parsers.test.ts`, `upload.service.test.ts`, `scanner-availability.test.ts` | ⬜ |
| Unit: knowledge-base | `api.test.ts`, `source-flow.test.ts`, `sync-engine.test.ts` | ⬜ |
| Unit: storage | `storage.service.test.ts`, `local.driver.test.ts`, `s3.driver.test.ts`, `cloudinary.driver.test.ts` | ⬜ |
| Unit: source-control | `source-control.api.test.ts` | ⬜ |
| Unit: scan simulation | `simulate-managed.test.ts`, `simulate-upload.test.ts` + fixtures | ⬜ |
| E2E API | `finding-flow.test.ts`, `api-tokens.test.ts`, `report-flow.test.ts`, `scan-list-flow.test.ts`, `scan-upload-flow.test.ts` | ⬜ |
| E2E UI | `projects.spec.ts`, `teams.spec.ts`, `workspace-chooser.spec.ts`, `workspace-members.spec.ts`, `mobile-responsiveness.spec.ts` | ⬜ |

---

## Phase 11 — Documentation

| File | Changes | Status |
|------|---------|--------|
| `CLAUDE.md` | Update module count, add scan/project/source-control docs | ⬜ |
| `AGENTS.md` | Update with scan-specific rules | ⬜ |
| `docs/SCANNER_ARCHITECTURE.md` | Copy from stash | ⬜ |
| `docs/SCAN-FLOW-SEQUENCE.md` | Copy from stash | ⬜ |
| `docs/queue.md` | Copy from stash | ⬜ |
| `docs/upload-api.md` | Copy from stash | ⬜ |

---

## Schema Conflict Resolution Notes

Stash's `drizzle/schema/` files contain git merge conflict markers (`<<<<<<< Updated upstream`). The following columns diverge and need manual resolution:

| Table | Active | Stash (resolved) | Decision |
|-------|--------|-------------------|----------|
| `scans` | `policy_id`, `repository_id` NOT NULL | `profile_id`, `repository_id` nullable | Use stash (nullable allows external uploads) |
| `scan_results` | `raw_output`, `summary` | `format`, `file_key`, `file_size`, `parsed_summary` | Use stash (supports file-based storage) |
| `projects` | no `lead`, `created_by` FK | `lead`, `created_by` no FK | Use stash (lead field useful, FK removed for flexibility) |
| `repositories` | no `connection_type` | `connection_type` with CHECK | Use stash (required for managed vs external flow) |
| `ai_verifications` | `finding_id`/`model_id` NOT NULL | nullable | Use stash (nullable allows partial data) |
| `integrations` | `aiModels` export name | `models` export name | Use stash (`models` — shorter, matches table name) |
| `knowledge_entries` | no unique index | uniqueIndex on (source_id, cwe_id) | Use stash (prevents duplicates) |
