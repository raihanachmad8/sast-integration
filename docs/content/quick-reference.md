# Quick Reference

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/signup` | Create account |
| POST | `/api/v1/auth/signin` | Sign in |
| POST | `/api/v1/auth/signout` | Sign out |
| POST | `/api/v1/auth/refresh` | Refresh session |

### Workspaces

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/workspaces` | List workspaces |
| POST | `/api/v1/workspaces` | Create workspace |
| GET | `/api/v1/workspaces/:id` | Get workspace |
| PUT | `/api/v1/workspaces/:id` | Update workspace |

### Scans

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/scans` | List scans |
| POST | `/scans` | Trigger scan |
| GET | `/scans/:scanId` | Scan detail |
| POST | `/scans/upload` | Upload results |

### Findings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/findings` | List findings |
| GET | `/findings/:findingId` | Finding detail |
| PATCH | `/findings/:findingId` | Update finding |
| POST | `/findings/:findingId/verify` | AI verify |
| PUT | `/findings/bulk` | Bulk update |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports` | List reports |
| POST | `/reports` | Generate report |
| GET | `/reports/:reportId/download` | Download |

## Permissions

| Permission | Value | Description |
|------------|-------|-------------|
| DASHBOARD_VIEW | `dashboard:view` | View dashboard |
| REPOSITORY_VIEW | `repository:view` | View repos |
| REPOSITORY_MANAGE | `repository:manage` | Manage repos |
| SCAN_VIEW | `scan:view` | View scans |
| SCAN_RUN | `scan:run` | Run scans |
| FINDING_VIEW | `finding:view` | View findings |
| FINDING_TRIAGE | `finding:triage` | Triage findings |
| FINDING_OVERRIDE_AI | `finding:override_ai` | Override AI |
| REPORT_VIEW | `report:view` | View reports |
| REPORT_EXPORT | `report:export` | Export reports |
| MEMBER_VIEW | `member:view` | View members |
| MEMBER_INVITE | `member:invite` | Invite members |
| MEMBER_MANAGE | `member:manage` | Manage members |
| TEAM_VIEW | `team:view` | View teams |
| TEAM_MANAGE | `team:manage` | Manage teams |
| PROJECT_VIEW | `project:view` | View projects |
| PROJECT_MANAGE | `project:manage` | Manage projects |
| WORKSPACE_SETTINGS_VIEW | `workspace:view` | View settings |
| WORKSPACE_SETTINGS_MANAGE | `workspace:settings` | Manage settings |
| AUDIT_VIEW | `audit:read` | View audit logs |
| ARENA_VIEW | `arena:view` | View arena |
| ARENA_MANAGE | `arena:manage` | Manage arena |
| INTEGRATION_VIEW | `integration:view` | View integrations |
| INTEGRATION_MANAGE | `integration:manage` | Manage integrations |
| WEBHOOK_VIEW | `webhook:view` | View webhooks |
| WEBHOOK_MANAGE | `webhook:manage` | Manage webhooks |
| SCHEDULE_VIEW | `schedule:view` | View schedules |
| SCHEDULE_MANAGE | `schedule:manage` | Manage schedules |
| POLICY_VIEW | `policy:view` | View policies |
| POLICY_MANAGE | `policy:manage` | Manage policies |
| SCANNER_VIEW | `scanner:view` | View scanners |
| SCANNER_MANAGE | `scanner:manage` | Manage scanners |
| AI_MODEL_VIEW | `ai_model:view` | View AI models |
| AI_MODEL_MANAGE | `ai_model:manage` | Manage AI models |
| KNOWLEDGE_VIEW | `knowledge:view` | View knowledge base |
| KNOWLEDGE_MANAGE | `knowledge:manage` | Manage knowledge base |

## Role Hierarchy

```
owner (4) > manager (3) > reviewer (2) > member (1)
```

## Scanner IDs

| ID | Scanner | Format |
|----|---------|--------|
| `semgrep` | Semgrep | JSON |
| `gitleaks` | Gitleaks | JSON |
| `flawfinder` | Flawfinder | SARIF |
| `cppcheck` | Cppcheck | XML |
| `clang-tidy` | Clang-Tidy | Text |
| `gcc-fanalyzer` | GCC Fanalyzer | Text |
