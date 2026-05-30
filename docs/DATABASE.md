# Database Schema

PostgreSQL + Drizzle ORM | 41 tables | Single migration

---

## Quick Reference

```bash
pnpm db:push       # Push schema to DB (dev)
pnpm db:migrate    # Run migrations (production)
pnpm db:seed       # Seed owner + permissions (+ org workspace in single mode)
pnpm db:studio     # Open Drizzle Studio
pnpm db:generate   # Generate migration from schema changes
```

---

## Table Groups

### Core (6 tables)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | email, password_hash, name |
| `sessions` | Active sessions | user_id, ip_address, user_agent |
| `workspaces` | Multi-tenant workspaces | name, slug, type (personal/organization) |
| `workspace_members` | User ↔ Workspace | user_id, workspace_id, role |
| `workspace_settings` | Per-workspace config | workspace_id, key, value |
| `user_settings` | Per-user preferences | user_id, key, value |

### Auth & Tokens (5 tables)

| Table | Purpose | Expiration |
|-------|---------|------------|
| `workspace_invitations` | Pending invites | 7 days |
| `password_reset_tokens` | Password reset | 1 hour |
| `email_verification_tokens` | Email verify | 24 hours |
| `personal_access_tokens` | API tokens | Revocable |
| `notifications` | In-app notifications | — |

### Teams & RBAC (5 tables)

| Table | Purpose |
|-------|---------|
| `teams` | Team grouping within workspace |
| `team_members` | User ↔ Team (role: admin/contributor) |
| `permissions` | Permission definitions (resource:action) |
| `role_permissions` | Role → Permission mapping |
| `user_permissions` | Per-user permission overrides |

### Projects & Source Control (5 tables)

| Table | Purpose |
|-------|---------|
| `projects` | Project containers |
| `project_members` | User ↔ Project |
| `project_teams` | Team ↔ Project |
| `source_controls` | SCM provider connections (GitHub/GitLab/Gitea) |
| `repositories` | Imported repositories |

### Scanning (7 tables)

| Table | Purpose |
|-------|---------|
| `scan_policies` | Reusable scan configs (profile, scanners, AI toggle) |
| `scans` | Scan executions |
| `scan_results` | Raw scanner output per scan |
| `schedules` | Recurring scan schedules (cron) |
| `quality_gates` | Pass/fail rules per workspace |
| `quality_gate_results` | Per-scan gate evaluation |
| `environments` | Deployment environments |

### Findings & AI (5 tables)

| Table | Purpose |
|-------|---------|
| `finding_groups` | Deduplicated finding fingerprints |
| `findings` | Individual findings (file, line, severity, rule) |
| `ai_verifications` | AI verdict per model per finding |
| `comments` | Finding comments (threaded) |
| `finding_history` | Finding field change audit |

### AI & Intelligence (3 tables)

| Table | Purpose |
|-------|---------|
| `ai_models` | Model chain config (provider, prompt_preset, priority) |
| `knowledge_sources` | Knowledge source registry (CWE, NVD, Custom) |
| `knowledge_entries` | Individual knowledge entries with tags |

### Reports & Storage (2 tables)

| Table | Purpose | Expiration |
|-------|---------|------------|
| `reports` | Generated reports (PDF/XLSX) | 90 days |
| `storage_files` | File storage references | Configurable |

### Integrations & Audit (3 tables)

| Table | Purpose |
|-------|---------|
| `webhooks` | Outgoing webhook configs |
| `audit_logs` | Security audit trail |
| `activity_logs` | User activity feed |

---

## Key Design Decisions

### Multi-tenancy
- All data scoped by `workspace_id`
- Query path: workspace → project → repository → scan → finding

### AI Verifications (Research-informed)
- **One row per model per finding** (not single verdict)
- Fields from research: `verdict`, `confidence`, `explanation`, `data_flow`, `taint_source`, `match_detail`, `likely_cwe`, `fix_suggestion`
- `model_id` FK → `ai_models` table
- Supports 2+ models verifying same finding independently

### AI Models
- `prompt_preset`: `strict` | `balanced` | `custom`
- `role`: `primary` | `fallback` with `priority` ordering
- Research basis: strict preset → 90-100% accuracy on Qwen; balanced → 88% on Llama

### Permissions
- Format: `resource:action` (colon separator)
- 24 granular permissions, 1 per module
- Constants in `src/commons/constants/permissions.ts`
- Roles: owner (24), manager (16), reviewer (9), member (5)

### Soft Delete
Tables with `deleted_at` + `deleted_by`: users, workspaces, teams, projects, repositories, comments, webhooks

### Fingerprint Deduplication
`finding_groups.fingerprint` = SHA256(file + line + rule + scanner)

---

## Schema Files

```
drizzle/schema/
├── index.ts            # Re-exports all schemas
├── users.ts            # users, sessions, user_settings
├── workspaces.ts       # workspaces, workspace_members, workspace_settings
├── auth.ts             # invitations, tokens, notifications
├── teams.ts            # teams, team_members
├── permissions.ts      # permissions, role_permissions, user_permissions
├── projects.ts         # projects, project_members, project_teams, environments
├── source-controls.ts  # source_controls, repositories
├── scans.ts            # scan_policies, scans, scan_results, schedules, quality_gates, quality_gate_results
├── findings.ts         # finding_groups, findings, ai_verifications, comments, finding_history
├── integrations.ts     # ai_models, webhooks, audit_logs, activity_logs, knowledge_sources, knowledge_entries
└── reports.ts          # reports, storage_files
```

---

## Seed Data

`pnpm db:seed` runs env-aware modules (override defaults via env):

| Module | Details |
|------|---------|
| Permissions | 24 resource:action pairs + role mappings (always) |
| Owner user | `admin@sast.local` / `ChangeMe123!` — override via `OWNER_EMAIL` / `OWNER_PASSWORD` / `OWNER_NAME` (always) |
| Organization workspace | Seeded only when `WORKSPACE_MODE=single`; name/slug via `ORG_NAME` / `ORG_SLUG`, owner assigned |

Flags: `pnpm db:seed -- --only=<permissions|owner|workspace>` or `--all`.
In production the seeder refuses to run with missing or default owner credentials.

---

## Connection

```env
DATABASE_URL=postgresql://postgres:root@localhost:5432/sast_db
```

Or individual vars: `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`
