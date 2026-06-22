# DATABASE.md

> Single source of truth for the PostgreSQL schema used by SAST Integration.
> Auto-generated from `drizzle/schema/*`. Keep in sync with actual schema files.

## Overview

- **Engine:** PostgreSQL 16
- **ORM:** Drizzle ORM (`drizzle-orm/postgres-js`)
- **Driver:** `postgres` (postgres.js)
- **Naming:** `snake_case` columns, `camelCase` Drizzle exports
- **Primary Keys:** `uuid` with `gen_random_uuid()` default
- **Timestamps:** All tables use `created_at` / `updated_at` where applicable
- **Soft Deletes:** Most domain entities use `deleted_at` / `deleted_by`
- **Total Tables:** 44

---

## Entity Relationship Diagram

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    users     │────<│ workspace_members │>────│   workspaces     │
│              │     └──────────────────┘     │                  │
│              │────< user_settings           │                  │
│              │                              └────────┬─────────┘
│              │                                       │
│              │     ┌──────────────────┐              │
│              │────<│    teams         │──────────────┘
│              │     │ team_members     │
│              │     └──────────────────┘
│              │
│              │     ┌──────────────────┐
│              │────<│    projects      │──────────────┘
│              │     │ project_members  │
│              │     │ project_teams    │
│              │     │ environments     │
│              │     │ project_api_tokens│
│              │     └────────┬─────────┘
│              │              │
│              │     ┌────────┴─────────┐
│              │     │   repositories   │
│              │     │ source_controls  │
│              │     │ source_control_repositories│
│              │     │ source_control_imports│
│              │     └────────┬─────────┘
│              │              │
│              │     ┌────────┴─────────┐
│              │     │     scans        │
│              │     │ scan_results     │
│              │     │ scan_uploads     │
│              │     │ commit_statuses  │
│              │     │ quality_gates    │
│              │     │ quality_gate_results│
│              │     │   schedules      │
│              │     └────────┬─────────┘
│              │              │
│              │     ┌────────┴─────────┐
│              │     │    findings      │
│              │     │ finding_groups   │
│              │     │ ai_verifications │────> ai_models
│              │     │    comments      │
│              │     │ finding_history  │
│              │     └──────────────────┘
│              │
│              │     ┌──────────────────┐
│              │────<│     reports      │
│              │     │  storage_files   │
│              │     └──────────────────┘
│              │
│              │     ┌──────────────────┐
│              │────<│    webhooks      │
│              │────<│ webhook_deliveries│
│              │────<│   audit_logs     │
│              │────<│ activity_logs    │
│              │────<│ knowledge_sources│
│              │     │ knowledge_entries│
│              │     │ knowledge_backfill_jobs│
│              │     └──────────────────┘
│              │
│              │     ┌──────────────────┐
│              │────<│   ai_models      │
│              │────<│ workspace_invitations│
│              │────<│ password_reset_tokens│
│              │────<│ email_verification_tokens│
│              │────<│ personal_access_tokens│
│              │────<│   notifications   │
│              └────<│  role_permissions │
│                    │ user_permissions  │
│                    └──────────────────┘
```

---

## Tables

### 1. Authentication & Users

#### `users`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| email | varchar(255) | NOT NULL, UNIQUE | | Login identifier |
| password_hash | text | NOT NULL | | bcrypt hash |
| name | varchar(255) | NOT NULL | | Display name |
| avatar_url | text | nullable | | URL to avatar image |
| username | varchar(50) | nullable | | Optional unique handle |
| bio | text | nullable | | User biography |
| timezone | varchar(50) | nullable | | e.g. "Asia/Jakarta" |
| language | varchar(10) | nullable | | e.g. "en", "id" |
| two_factor_secret | text | nullable | | TOTP secret |
| two_factor_confirmed_at | timestamp | nullable | | When 2FA was confirmed |
| email_verified_at | timestamp | nullable | | When email was verified |
| current_workspace_id | uuid | nullable | | Active workspace context |
| remember_token | varchar(100) | nullable | | Remember-me token |
| created_at | timestamp | NOT NULL | now() | |
| updated_at | timestamp | NOT NULL | now() | |
| deleted_at | timestamp | nullable | | Soft delete marker |
| deleted_by | uuid | nullable | | Who soft-deleted |

#### `sessions`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | varchar(255) | PK | | Session ID (not UUID) |
| user_id | uuid | NOT NULL | FK → users.id | |
| ip_address | varchar(45) | nullable | | IPv4 or IPv6 |
| user_agent | text | nullable | | Browser client string |
| last_activity | timestamp | NOT NULL | | For idle timeout |
| expires_at | timestamp | NOT NULL | | Session TTL |
| current_refresh_token_id | varchar(64) | nullable | | For rotation + reuse detection |
| created_at | timestamp | NOT NULL | now() | |

#### `user_settings`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| user_id | uuid | NOT NULL | FK → users.id | |
| key | varchar(255) | NOT NULL | | Setting name |
| value | text | nullable | | Setting value (string) |
| created_at | timestamp | NOT NULL | now() | |
| updated_at | timestamp | NOT NULL | now() | |

---

### 2. Workspaces & Members

#### `workspaces`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| name | varchar(255) | NOT NULL | | Workspace display name |
| slug | varchar(255) | NOT NULL, UNIQUE | | URL-safe identifier |
| type | varchar(20) | NOT NULL | | `'personal'` or `'organization'` |
| avatar_url | text | nullable | | Workspace avatar |
| description | text | nullable | | |
| features | jsonb | nullable | '{}' | Feature flags per workspace |
| created_at | timestamp | NOT NULL | now() | |
| created_by | uuid | nullable | FK → users.id | |
| updated_at | timestamp | NOT NULL | now() | |
| updated_by | uuid | nullable | FK → users.id | |
| deleted_at | timestamp | nullable | | Soft delete |
| deleted_by | uuid | nullable | FK → users.id | |

#### `workspace_members`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| workspace_id | uuid | NOT NULL | FK → workspaces.id | |
| user_id | uuid | NOT NULL | FK → users.id | |
| role | varchar(20) | NOT NULL | | `'owner'` / `'manager'` / `'reviewer'` / `'member'` |
| joined_at | timestamp | NOT NULL | now() | |

**Constraints:** UNIQUE(workspace_id, user_id)

#### `workspace_settings`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| workspace_id | uuid | NOT NULL | FK → workspaces.id | |
| key | varchar(255) | NOT NULL | | |
| value | text | nullable | | |
| created_at | timestamp | NOT NULL | now() | |
| updated_at | timestamp | NOT NULL | now() | |

#### `workspace_invitations`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| workspace_id | uuid | NOT NULL | FK → workspaces.id | |
| email | varchar(255) | NOT NULL | | Invitee email |
| role | varchar(20) | NOT NULL | | Role to assign on accept |
| token | varchar(255) | NOT NULL, UNIQUE | | Invitation token |
| accepted_at | timestamp | nullable | | When accepted |
| created_at | timestamp | NOT NULL | now() | |
| created_by | uuid | nullable | FK → users.id | Inviter |
| expires_at | timestamp | NOT NULL | | Invitation TTL |

---

### 3. Teams

#### `teams`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| workspace_id | uuid | NOT NULL | FK → workspaces.id | |
| name | varchar(255) | NOT NULL | | |
| slug | varchar(255) | NOT NULL | | URL-safe, unique per workspace |
| description | text | nullable | | |
| created_at | timestamp | NOT NULL | now() | |
| created_by | uuid | nullable | FK → users.id | |
| updated_at | timestamp | NOT NULL | now() | |
| updated_by | uuid | nullable | FK → users.id | |
| deleted_at | timestamp | nullable | | Soft delete |
| deleted_by | uuid | nullable | FK → users.id | |

#### `team_members`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| team_id | uuid | NOT NULL | FK → teams.id | |
| user_id | uuid | NOT NULL | FK → users.id | |
| role | varchar(20) | NOT NULL | | `'admin'` or `'contributor'` |
| joined_at | timestamp | NOT NULL | now() | |

---

### 4. Projects

#### `projects`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| workspace_id | uuid | NOT NULL | FK → workspaces.id | |
| name | varchar(255) | NOT NULL | | |
| slug | varchar(255) | NOT NULL | | |
| platform | varchar(50) | nullable | | e.g. "web", "mobile", "api" |
| language | varchar(50) | nullable | | e.g. "typescript", "python" |
| avatar_url | text | nullable | | |
| description | text | nullable | | |
| lead | varchar(255) | nullable | | Project lead name |
| created_at | timestamp | | now() | |
| created_by | uuid | | | Not FK — flexible reference |
| updated_at | timestamp | | now() | |
| updated_by | uuid | | | Not FK — flexible reference |
| deleted_at | timestamp | nullable | | Soft delete |
| deleted_by | uuid | nullable | FK → users.id | |

**Constraints:** UNIQUE(workspace_id, slug)

#### `project_members`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| project_id | uuid | NOT NULL | FK → projects.id | |
| user_id | uuid | NOT NULL | FK → users.id | |
| role | varchar(20) | NOT NULL | | |
| joined_at | timestamp | NOT NULL | now() | |

#### `project_teams`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| project_id | uuid | NOT NULL | FK → projects.id | |
| team_id | uuid | NOT NULL | | No FK — flexible reference |
| role | varchar(20) | NOT NULL | | |
| added_at | timestamp | NOT NULL | now() | |

#### `environments`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| project_id | uuid | NOT NULL | FK → projects.id | |
| name | varchar(100) | NOT NULL | | e.g. "production", "staging" |
| type | varchar(20) | NOT NULL | | e.g. "production", "development" |
| is_default | boolean | | false | |
| created_at | timestamp | NOT NULL | now() | |

#### `project_api_tokens`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| project_id | uuid | NOT NULL | FK → projects.id (CASCADE) | |
| created_by | uuid | NOT NULL | FK → users.id | |
| name | varchar(255) | NOT NULL | | Human-readable label |
| token_sha256 | varchar(64) | NOT NULL, UNIQUE | | SHA-256 hash for O(1) token matching |
| token_prefix | varchar(20) | nullable | | First 8-12 chars for identification (e.g. `sast_p_abc123..`) |
| permissions | jsonb | NOT NULL | ['scans:upload'] | Array of permission strings |
| last_used_at | timestamp | nullable | | |
| created_at | timestamp | NOT NULL | now() | |
| expires_at | timestamp | nullable | | null = never expires |
| revoked_at | timestamp | nullable | | |
| revoked_by | uuid | nullable | FK → users.id | |

**Purpose:** CI/CD pipelines use these tokens to upload scan results without user sessions.

---

### 5. Source Control & Repositories

#### `source_controls`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| workspace_id | uuid | NOT NULL | FK → workspaces.id | |
| provider | varchar(20) | NOT NULL | | `'github'` / `'gitlab'` / `'gitea'` |
| name | varchar(255) | NOT NULL | | Display name |
| credentials | jsonb | nullable | | Encrypted OAuth tokens / app credentials |
| created_at | timestamp | NOT NULL | now() | |
| created_by | uuid | nullable | FK → users.id | |
| last_synced_at | timestamp | nullable | | Last successful sync time |

#### `repositories`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| workspace_id | uuid | NOT NULL | FK → workspaces.id | |
| project_id | uuid | nullable | FK → projects.id | |
| external_id | varchar(255) | nullable | | Provider's stable repo ID |
| provider | varchar(20) | nullable | | e.g. `'gitea'`, `'github'` |
| name | varchar(255) | NOT NULL | | |
| url | varchar(500) | NOT NULL | | Repository URL |
| default_branch | varchar(100) | | 'main' | |
| connection_type | varchar(20) | NOT NULL | 'scm' | `'scm'` or `'external'` |
| import_mode | varchar(20) | | 'manual' | `'manual'` or `'auto'` |
| auto_scan | boolean | | false | |
| last_synced_at | timestamp | nullable | | |
| created_at | timestamp | NOT NULL | now() | |
| created_by | uuid | nullable | FK → users.id | |
| updated_at | timestamp | NOT NULL | now() | |
| updated_by | uuid | nullable | FK → users.id | |
| deleted_at | timestamp | nullable | | Soft delete |
| deleted_by | uuid | nullable | FK → users.id | |

**Connection types:**
- `scm` — Connected via GitHub App / GitLab / Gitea. Platform can checkout and run managed scans.
- `external` — No SCM connection. Only supports direct upload of pre-generated results from CI.

#### `source_control_repositories`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| source_control_id | uuid | NOT NULL | FK → source_controls.id (CASCADE) | |
| workspace_id | uuid | NOT NULL | FK → workspaces.id | |
| external_id | varchar(255) | nullable | | Provider's stable repo ID |
| name | varchar(255) | NOT NULL | | Repository name |
| full_name | varchar(500) | NOT NULL | | Full repo path (e.g. `org/repo`) |
| url | varchar(500) | nullable | | Repository URL |
| default_branch | varchar(100) | | 'main' | |
| visibility | varchar(20) | | 'private' | `'public'` or `'private'` |
| synced_at | timestamp | | now() | Last successful sync |
| created_at | timestamp | NOT NULL | now() | |
| updated_at | timestamp | NOT NULL | now() | |
| deleted_at | timestamp | nullable | | Soft delete |

**Constraints:** UNIQUE(source_control_id, name), UNIQUE(source_control_id, external_id)

#### `source_control_imports`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| workspace_id | uuid | NOT NULL | FK → workspaces.id | |
| source_control_id | uuid | NOT NULL | FK → source_controls.id | |
| source_control_repository_id | uuid | NOT NULL | FK → source_control_repositories.id | |
| repository_id | uuid | nullable | FK → repositories.id | Internal project repo |
| webhook_external_id | varchar(255) | nullable | | SCM webhook ID |
| webhook_secret | varchar(255) | nullable | | For HMAC verification |
| webhook_status | varchar(20) | | 'pending' | Webhook registration status |
| imported_by | uuid | nullable | FK → users.id | |
| imported_at | timestamp | nullable | | When import completed |
| uninstalled_at | timestamp | nullable | | When integration was removed |
| created_at | timestamp | NOT NULL | now() | |
| updated_at | timestamp | NOT NULL | now() | |

---

### 6. Scans & Results

#### `scans`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| repository_id | uuid | nullable | | null for external uploads before repo resolution |
| commit_sha | varchar(40) | nullable | | Git commit SHA |
| branch | varchar(100) | nullable | | |
| origin | varchar(30) | NOT NULL | 'managed' | `'managed'` or `'external'` |
| trigger_source | varchar(30) | nullable | | `'manual'` / `'schedule'` / `'webhook'` / `'ci'` |
| status | varchar(20) | NOT NULL | 'pending' | `'pending'` / `'running'` / `'completed'` / `'failed'` |
| started_at | timestamp | nullable | | |
| completed_at | timestamp | nullable | | |
| progress_events | jsonb | NOT NULL | '[]' | Array of ProgressEvent objects |
| created_at | timestamp | NOT NULL | now() | |
| created_by | uuid | nullable | FK → users.id | |
| pr_number | integer | nullable | | PR number for PR analysis scans |
| base_branch | varchar(100) | nullable | | PR base branch |
| head_branch | varchar(100) | nullable | | PR head branch |
| pr_author | varchar(255) | nullable | | PR author username |

**Scan origins:**
- `managed` — Platform clones repo, runs scanners, uploads results.
- `external` — CI pipeline pushes pre-generated results via API.

#### `scan_results`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| scan_id | uuid | NOT NULL | FK → scans.id | |
| scanner | varchar(50) | NOT NULL | | e.g. `'semgrep'`, `'gitleaks'` |
| format | varchar(20) | nullable | | Output format: `'json'`, `'xml'`, `'sarif'` |
| file_key | text | nullable | | Object storage key for raw results |
| file_size | integer | nullable | | Bytes |
| parsed_summary | jsonb | nullable | | Parsed summary (counts by severity, etc.) |
| created_at | timestamp | | now() | |

#### `scan_uploads`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| repository_id | uuid | nullable | | |
| project_id | uuid | nullable | | |
| scan_id | uuid | nullable | FK → scans.id | |
| branch | varchar(100) | nullable | | |
| commit_sha | varchar(40) | nullable | | |
| uploaded_by | uuid | nullable | | |
| source | varchar(30) | nullable | | Upload source identifier |
| metadata | jsonb | nullable | | Arbitrary upload metadata |
| project_api_token_id | uuid | nullable | FK → project_api_tokens.id (SET NULL) | |
| personal_access_token_id | uuid | nullable | FK → personal_access_tokens.id (SET NULL) | |
| created_at | timestamp | | now() | |

**Purpose:** Bridge between external CI uploads and internal Scan model. Tracks who uploaded, how, and which token was used.

#### `commit_statuses`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| scan_id | uuid | NOT NULL | FK → scans.id | |
| repository_id | uuid | NOT NULL | FK → repositories.id | |
| commit_sha | varchar(40) | NOT NULL | | Git commit SHA |
| status | varchar(20) | NOT NULL | | `'pending'` / `'success'` / `'failure'` / `'error'` |
| context | varchar(100) | NOT NULL | | e.g. `'sast-integration/gate'` |
| description | text | nullable | | Status description |
| target_url | text | nullable | | Link to details |
| provider | varchar(20) | NOT NULL | | `'gitea'` / `'github'` |
| external_id | varchar(100) | nullable | | ID from provider API |
| created_at | timestamp | NOT NULL | now() | |
| updated_at | timestamp | NOT NULL | now() | |

#### `quality_gates`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| workspace_id | uuid | NOT NULL | FK → workspaces.id | |
| threshold | varchar(20) | NOT NULL | 'high' | Severity threshold for blocking |
| fail_on_critical | boolean | | true | Block on critical findings |
| fail_on_high_tp | boolean | | true | Block on high-confidence true positives |
| warn_on_pending | boolean | | true | Warn on pending AI verification |
| require_human_ack | boolean | | false | Require manual acknowledgment |
| pending_behavior | varchar(20) | | 'warn' | `'warn'` or `'block'` |
| created_at | timestamp | NOT NULL | now() | |
| updated_at | timestamp | NOT NULL | now() | |

#### `quality_gate_results`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| scan_id | uuid | nullable | FK → scans.id | |
| gate_id | uuid | nullable | FK → quality_gates.id | |
| status | varchar(20) | NOT NULL | | `'pass'` / `'fail'` / `'warn'` |
| blocking_findings | integer | | 0 | |
| pending_findings | integer | | 0 | |
| new_findings | integer | | 0 | PR context: findings new in this PR |
| fixed_findings | integer | | 0 | PR context: findings fixed in this PR |
| evaluated_at | timestamp | NOT NULL | now() | |

#### `schedules`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| workspace_id | uuid | NOT NULL | FK → workspaces.id | |
| repository_id | uuid | nullable | | |
| branch | varchar(100) | nullable | | |
| timezone | varchar(50) | | 'UTC' | |
| cron_expression | varchar(100) | NOT NULL | | Standard cron syntax |
| active | boolean | | true | |
| last_run_at | timestamp | nullable | | |
| next_run_at | timestamp | nullable | | |
| created_at | timestamp | NOT NULL | now() | |
| updated_at | timestamp | NOT NULL | now() | |
| created_by | uuid | nullable | FK → users.id | |
| deleted_at | timestamp | nullable | | Soft delete |

---

### 7. Findings & AI Verification

#### `finding_groups`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| project_id | uuid | nullable | FK → projects.id | |
| repository_id | uuid | nullable | FK → repositories.id | |
| fingerprint | varchar(64) | NOT NULL | | SHA-256 hash of (rule + file + line + message) |
| title | varchar(500) | nullable | | Human-readable title |
| first_seen_at | timestamp | NOT NULL | now() | |
| last_seen_at | timestamp | NOT NULL | now() | Updated on each access |

**Constraints:** UNIQUE(repository_id, fingerprint) via uniqueIndex

**Purpose:** Deduplication. Same logical vulnerability across scans/branches shares one group.

#### `findings`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| scan_id | uuid | NOT NULL | FK → scans.id | |
| group_id | uuid | nullable | FK → finding_groups.id | |
| cwe_id | varchar(20) | nullable | | e.g. `"CWE-89"` |
| severity | varchar(20) | NOT NULL | | `'critical'` / `'high'` / `'medium'` / `'low'` / `'info'` |
| status | varchar(20) | NOT NULL | 'open' | `'open'` / `'fixed'` / `'false_positive'` / `'ignored'` |
| active | boolean | NOT NULL | true | Whether finding is currently active |
| file_path | varchar(500) | nullable | | Relative path from repo root |
| line_number | integer | nullable | | |
| code_snippet | text | nullable | | Source code context |
| description | text | nullable | | |
| rule | varchar(500) | nullable | | Scanner rule ID |
| scanner | varchar(50) | nullable | | Which scanner found this |
| message | text | nullable | | Scanner output message |
| assigned_to | uuid | nullable | FK → users.id | |
| created_at | timestamp | NOT NULL | now() | |
| updated_at | timestamp | NOT NULL | now() | |

#### `ai_verifications`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| finding_id | uuid | nullable | FK → findings.id | |
| model_id | uuid | nullable | FK → ai_models.id | |
| verdict | varchar(20) | NOT NULL | | `'true_positive'` / `'false_positive'` / `'error'` |
| confidence | numeric(3,2) | nullable | | 0.00 – 1.00 |
| explanation | text | nullable | | AI reasoning |
| data_flow | text | nullable | | Taint flow description |
| taint_source | text | nullable | | Source of taint |
| match_detail | text | nullable | | Pattern match details |
| likely_cwe | jsonb | nullable | | Array of suggested CWE IDs |
| fix_suggestion | text | nullable | | Remediation advice |
| latency_ms | integer | nullable | | Model inference time |
| raw_response | text | nullable | | Full model output for debugging |
| created_at | timestamp | NOT NULL | now() | |

#### `comments`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| finding_id | uuid | NOT NULL | FK → findings.id | |
| parent_id | uuid | nullable | | For threaded comments |
| content | text | NOT NULL | | |
| created_at | timestamp | NOT NULL | now() | |
| created_by | uuid | nullable | FK → users.id | |
| updated_at | timestamp | NOT NULL | now() | |
| updated_by | uuid | nullable | FK → users.id | |
| deleted_at | timestamp | nullable | | Soft delete |
| deleted_by | uuid | nullable | FK → users.id | |

#### `finding_history`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| finding_id | uuid | NOT NULL | FK → findings.id | |
| field | varchar(50) | NOT NULL | | Which field changed |
| old_value | text | nullable | | |
| new_value | text | nullable | | |
| created_at | timestamp | NOT NULL | now() | |
| created_by | uuid | nullable | FK → users.id | |

---

### 8. Integrations

#### `ai_models`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| workspace_id | uuid | NOT NULL | FK → workspaces.id | |
| name | varchar(100) | NOT NULL | | Model display name |
| provider | varchar(50) | NOT NULL | | e.g. `"openai"`, `"anthropic"`, `"local"` |
| base_url | varchar(500) | NOT NULL | | API endpoint URL |
| api_key_encrypted | text | nullable | | Encrypted API key |
| role | varchar(20) | NOT NULL | 'fallback' | `'primary'` or `'fallback'` |
| priority | integer | NOT NULL | 1 | Lower = higher priority |
| prompt_preset | varchar(20) | NOT NULL | 'strict' | Prompt template preset |
| custom_system_prompt | text | nullable | | Override default system prompt |
| status | varchar(20) | | 'unreachable' | `'reachable'` / `'unreachable'` |
| last_tested_at | timestamp | nullable | | Last connectivity test |
| created_at | timestamp | NOT NULL | now() | |
| updated_at | timestamp | NOT NULL | now() | |

#### `webhooks`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| workspace_id | uuid | NOT NULL | FK → workspaces.id | |
| name | varchar(255) | nullable | | |
| url | varchar(500) | NOT NULL | | Webhook target URL |
| events | jsonb | NOT NULL | | Array of event types |
| secret | varchar(255) | NOT NULL | | HMAC signing secret |
| active | boolean | | true | |
| created_at | timestamp | NOT NULL | now() | |
| created_by | uuid | nullable | FK → users.id | |
| updated_at | timestamp | NOT NULL | now() | |
| updated_by | uuid | nullable | FK → users.id | |
| deleted_at | timestamp | nullable | | Soft delete |
| deleted_by | uuid | nullable | FK → users.id | |

#### `webhook_deliveries`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| webhook_id | uuid | NOT NULL | FK → webhooks.id (CASCADE) | |
| event | varchar(100) | NOT NULL | | Event type delivered |
| status | varchar(20) | NOT NULL | | Delivery status |
| response_status | integer | nullable | | HTTP response code |
| request_body | jsonb | nullable | | Outgoing payload |
| response_body | text | nullable | | Response from target |
| duration_ms | integer | nullable | | Delivery duration |
| created_at | timestamp | NOT NULL | now() | |

#### `audit_logs`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| workspace_id | uuid | NOT NULL | FK → workspaces.id | |
| user_id | uuid | nullable | FK → users.id | |
| action | varchar(100) | NOT NULL | | e.g. `"signin"`, `"project.create"` |
| resource_type | varchar(50) | nullable | | e.g. `"project"`, `"scan"` |
| resource_id | uuid | nullable | | ID of affected resource |
| data | jsonb | nullable | | Additional context |
| ip_address | varchar(45) | nullable | | |
| created_at | timestamp | NOT NULL | now() | |

#### `activity_logs`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| workspace_id | uuid | NOT NULL | FK → workspaces.id | |
| user_id | uuid | nullable | FK → users.id | |
| type | varchar(50) | NOT NULL | | Activity type |
| description | text | nullable | | Human-readable description |
| metadata | jsonb | nullable | | Additional data |
| created_at | timestamp | NOT NULL | now() | |

#### `knowledge_sources`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| workspace_id | uuid | nullable | FK → workspaces.id | null = global knowledge |
| name | varchar(100) | NOT NULL | | |
| type | varchar(50) | NOT NULL | | Source type (e.g. `"nvd"`, `"manual"`) |
| url | varchar(500) | nullable | | Source URL |
| status | varchar(20) | | 'disconnected' | `'connected'` / `'disconnected'` / `'syncing'` |
| entry_count | integer | | 0 | Number of entries |
| last_synced_at | timestamp | nullable | | |
| created_at | timestamp | NOT NULL | now() | |

#### `knowledge_entries`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| source_id | uuid | NOT NULL | FK → knowledge_sources.id | |
| cwe_id | varchar(20) | nullable | | e.g. `"CWE-89"` |
| title | varchar(500) | NOT NULL | | |
| content | text | nullable | | |
| severity | varchar(20) | nullable | | |
| remediation | text | nullable | | |
| tags | jsonb | nullable | | Array of tags |
| muted | boolean | | false | Hide from AI context |
| used_by_ai_count | integer | | 0 | How many times AI referenced this |
| references | jsonb | nullable | | Array of reference URLs |
| created_at | timestamp | | now() | |
| updated_at | timestamp | | now() | |

**Constraints:** UNIQUE(source_id, cwe_id) via uniqueIndex

#### `knowledge_backfill_jobs`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| workspace_id | uuid | nullable | | |
| source_id | uuid | nullable | FK → knowledge_sources.id | |
| source_type | varchar(50) | NOT NULL | | |
| status | varchar(20) | NOT NULL | 'queued' | `'queued'` / `'running'` / `'completed'` / `'failed'` |
| range_start | timestamp | NOT NULL | | CVE date range start |
| range_end | timestamp | NOT NULL | | CVE date range end |
| cursor_start | timestamp | NOT NULL | | Pagination cursor |
| window_days | integer | NOT NULL | 30 | Days per batch |
| imported_count | integer | NOT NULL | 0 | Entries imported so far |
| last_error | text | nullable | | |
| started_at | timestamp | nullable | | |
| completed_at | timestamp | nullable | | |
| created_at | timestamp | | now() | |
| updated_at | timestamp | | now() | |

**Indexes:** INDEX(source_id, status)

---

### 9. Reports & Storage

#### `reports`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| workspace_id | uuid | NOT NULL | FK → workspaces.id | |
| type | varchar(50) | NOT NULL | | Report type |
| title | varchar(255) | NOT NULL | | |
| status | varchar(20) | NOT NULL | 'generated' | Report generation status |
| filters | jsonb | nullable | | Applied filter criteria |
| file_path | varchar(500) | nullable | | Generated file location |
| file_size | integer | nullable | | Bytes |
| format | varchar(20) | nullable | | `"pdf"`, `"csv"`, `"json"` |
| created_at | timestamp | NOT NULL | now() | |
| created_by | uuid | nullable | FK → users.id | |
| expires_at | timestamp | nullable | | Auto-cleanup timestamp |

#### `storage_files`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| workspace_id | uuid | NOT NULL | FK → workspaces.id | |
| file_name | varchar(255) | NOT NULL | | Original filename |
| file_path | varchar(500) | NOT NULL | | Storage path |
| file_size | integer | NOT NULL | | Bytes |
| mime_type | varchar(100) | nullable | | |
| storage_provider | varchar(50) | NOT NULL | 'local' | `'local'` / `'s3'` / `'cloudinary'` |
| storage_key | varchar(500) | nullable | | Provider-specific key |
| metadata | jsonb | nullable | | Additional file metadata |
| created_at | timestamp | NOT NULL | now() | |
| created_by | uuid | nullable | FK → users.id | |
| expires_at | timestamp | nullable | | Auto-cleanup timestamp |

---

### 10. Auth Tokens & Notifications

#### `password_reset_tokens`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| user_id | uuid | NOT NULL | FK → users.id | |
| token | varchar(255) | NOT NULL, UNIQUE | | |
| used_at | timestamp | nullable | | |
| created_at | timestamp | NOT NULL | now() | |
| expires_at | timestamp | NOT NULL | | |

#### `email_verification_tokens`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| user_id | uuid | NOT NULL | FK → users.id | |
| token | varchar(255) | NOT NULL, UNIQUE | | |
| verified_at | timestamp | nullable | | |
| created_at | timestamp | NOT NULL | now() | |
| expires_at | timestamp | NOT NULL | | |

#### `personal_access_tokens`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| user_id | uuid | NOT NULL | FK → users.id | |
| name | varchar(255) | NOT NULL | | |
| token | varchar(64) | NOT NULL, UNIQUE | | Hash stored, raw shown once |
| abilities | jsonb | nullable | | Permission array |
| last_used_at | timestamp | nullable | | |
| created_at | timestamp | NOT NULL | now() | |
| expires_at | timestamp | nullable | | |
| revoked_at | timestamp | nullable | | |
| revoked_by | uuid | nullable | FK → users.id | |

#### `notifications`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | PK | gen_random_uuid() | |
| user_id | uuid | NOT NULL | FK → users.id | |
| type | varchar(100) | NOT NULL | | Notification type |
| title | varchar(255) | NOT NULL | | |
| data | jsonb | nullable | | Type-specific payload |
| read_at | timestamp | nullable | | null = unread |
| created_at | timestamp | NOT NULL | now() | |

---

## Key Relationships

```
users ──< workspace_members >── workspaces
workspaces ──< workspace_members
workspaces ──< teams ──< team_members >── users
workspaces ──< projects ──< project_members >── users
projects ──< environments
projects ──< repositories ──< scans ──< scan_results
source_controls ──< source_control_repositories
source_controls ──< source_control_imports
workspaces ──< schedules ──< repositories
scans ──< commit_statuses >── repositories
projects ──< finding_groups ──< findings
scans ──< findings
findings ──< ai_verifications >── ai_models
findings ──< comments
findings ──< finding_history
workspaces ──< quality_gates ──< quality_gate_results >── scans
workspaces ──< ai_models
workspaces ──< webhooks ──< webhook_deliveries
workspaces ──< knowledge_sources ──< knowledge_entries
workspaces ──< reports
workspaces ──< storage_files
```

> **Note:** Permissions are now derived from the `ROLE_PERMISSIONS` constant
> in `src/commons/constants/permissions.ts`, not from database tables.

---

## Naming Conventions

| Aspect | Convention | Example |
|--------|-----------|---------|
| Table names | `snake_case`, plural | `scan_results`, `finding_groups` |
| Column names | `snake_case` | `created_at`, `workspace_id` |
| Primary keys | `id` (uuid) | Every table |
| Foreign keys | `{table}_id` | `workspace_id`, `user_id` |
| Timestamps | `created_at` / `updated_at` | Standard |
| Soft deletes | `deleted_at` / `deleted_by` | Domain entities |
| Drizzle exports | `camelCase` | `workspaceMembers`, `projectApiTokens` |

---

## Migration Commands

```bash
pnpm db:generate   # Generate migration SQL from schema changes
pnpm db:migrate    # Apply pending migrations
pnpm db:push       # Push schema directly (dev only, no migration file)
pnpm db:seed       # Seed permissions, owner, org workspace
pnpm db:reset      # Truncate all tables (preserves schema)
pnpm db:studio     # Open Drizzle Studio GUI
```
