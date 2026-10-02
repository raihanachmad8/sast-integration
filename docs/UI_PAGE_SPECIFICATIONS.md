# SAST Integration — UI Page Specifications

**Purpose**: Complete specification for all workspace pages based on `prototype.html`.
**Last Updated**: 2026-05-31

---

## Sidebar Navigation Structure

```
DAILY WORK
├── Dashboard
├── Repositories
├── Scans
├── Findings
├── Reports
└── Arena [Plan]

SETTINGS
├── Account
│   ├── Profile
│   └── Security [Plan]
├── Workspace
│   ├── Members
│   ├── Teams [Plan]
│   └── Projects [Plan]
├── Integrations
│   ├── Source Control
│   └── Webhooks [Plan]
├── Analysis Policy
│   ├── Scan Policies [Plan]
│   ├── Scanner Engines [Plan]
│   ├── AI Models
│   └── Quality Gates [Plan]
├── Intelligence
│   └── Knowledge Base [Plan]
└── Operations
    └── Schedules [Plan]
```

---

## Page 1: Dashboard

**Route**: `/:workspace`
**Breadcrumb**: Daily Work / Dashboard

### Purpose
Workspace-level security status overview. Shows connected repos, active scans, critical findings, and AI verification queue.

### Sections
1. **Page Header**: Title "Dashboard", subtitle "Workspace level security status, recent scans, and review work."
2. **Stat Cards** (4 cards, responsive grid):
   - Connected repositories (count + sparkline)
   - Active scans (count + sparkline)
   - Critical findings (count + sparkline)
   - Awaiting AI (count + sparkline)
3. **Populated State** (if repos exist):
   - Recent scans table (5 rows max)
   - Recent findings table (5 rows max)
4. **Empty State** (if no repos):
   - Centered icon + "Connect your first repository"
   - CTA: "Connect repository" button

### Mock Data
```ts
// From workspace.repos
repos: [
  { id: "repo-api", name: "backend-api", provider: "GitHub", branch: "main", status: "Healthy", findings: 28, ai: "22/28" },
  { id: "repo-web", name: "customer-web", provider: "GitLab", branch: "release", status: "Warning", findings: 9, ai: "9/9" },
]

// From state.findings (filtered)
criticalFindings: findings.filter(f => f.severity === "critical")
pendingAi: findings.filter(f => f.verdict === "Pending")

// From state.scans (filtered)
activeScans: scans.filter(s => s.status === "Running").length
```

### Interactive Elements
- Click stat card → navigate to corresponding page
- "Connect repository" → open connect modal
- "Run scan" → open run scan modal

---

## Page 2: Repositories

**Route**: `/:workspace/repositories`
**Breadcrumb**: Daily Work / Repositories

### Purpose
List all repositories connected to the workspace. Shows provider, branch, status, findings count, and AI verification ratio.

### Sections
1. **Page Header**: Title "Repositories"
2. **Toolbar**: Search input, Provider filter (All/GitHub/GitLab/Gitea), Status filter (All/Healthy/Warning/Lost access)
3. **Data Table**: Columns below
4. **Empty State**: "Connect your first repository" with CTA

### Table Columns
| Column | Width | Notes |
|--------|-------|-------|
| Repository | auto | Clickable, shows provider icon + name |
| Provider | 100px | GitHub/GitLab/Gitea badge |
| Branch | 100px | Monospace |
| Status | 100px | Healthy (green), Warning (amber), Lost access (red) |
| Findings | 80px | Count + critical count |
| AI | 80px | "22/28" format |
| Actions | 120px | "Run scan" button |

### Mock Data
```ts
repos: [
  { id: "repo-api", name: "backend-api", provider: "GitHub", branch: "main", visibility: "private", status: "Healthy", lastScan: "12 min ago", findings: 28, critical: 4, ai: "22/28" },
  { id: "repo-web", name: "customer-web", provider: "GitLab", branch: "release", visibility: "private", status: "Warning", lastScan: "1 hr ago", findings: 9, critical: 1, ai: "9/9" },
  { id: "repo-mobile", name: "mobile-app", provider: "Gitea", branch: "develop", visibility: "internal", status: "Lost access", lastScan: "Yesterday", findings: 0, ai: "0/0" },
]
```

### Interactive Elements
- Click repo name → open repository detail drawer
- "Run scan" → open run scan modal
- "Source control" → navigate to source control page

---

## Page 3: Scans

**Route**: `/:workspace/scans`
**Breadcrumb**: Daily Work / Scans

### Purpose
List all scan executions with status, stage, findings, and AI verification progress.

### Sections
1. **Page Header**: Title "Scans"
2. **Summary Cards** (3 cards): Running, Completed, Failed
3. **Toolbar**: Search input, Status filter (All/Running/Completed/Failed), Origin filter (All/Managed/Upload)
4. **Data Table**: Columns below

### Table Columns
| Column | Width | Notes |
|--------|-------|-------|
| Repository | auto | Clickable, shows provider icon + name, branch, origin badge |
| Status | 100px | Running (blue), Completed (green), Failed (red) |
| Stage | 120px | Current processing stage |
| Findings | 80px | Total + critical count |
| AI | 80px | "22/28" format |
| Actions | 120px | "Retry" (failed) or "View findings" |

### Mock Data
```ts
scans: [
  { id: "scan-1042", repo: "backend-api", branch: "main", status: "Running", stage: "AI verification", findings: 28, critical: 4, high: 7, ai: "22/28", origin: "managed", started: "12 min ago" },
  { id: "scan-1041", repo: "customer-web", branch: "release", status: "Completed", stage: "Completed", findings: 9, critical: 1, high: 2, ai: "9/9", origin: "external_upload", started: "1 hr ago" },
  { id: "scan-1039", repo: "backend-api", branch: "main", status: "Failed", stage: "Gitleaks timeout", findings: 0, critical: 0, ai: "0/0", origin: "managed", started: "Yesterday" },
]
```

### Interactive Elements
- "New scan" → open run scan modal
- Click repo name → open scan detail drawer
- "Retry" → retry failed scan
- "View findings" → navigate to findings with scan filter

---

## Page 4: Findings

**Route**: `/:workspace/findings`
**Breadcrumb**: Daily Work / Findings

### Purpose
List all findings across scans with severity, AI verdict, assignee, and status. Supports bulk operations.

### Sections
1. **Page Header**: Title "Findings"
2. **Toolbar**: Search input, Severity filter (All/Critical/High/Medium/Low), Verdict filter (All/TP/FP/Pending), Status filter
3. **Bulk Actions Bar** (when rows selected): Accept, Re-verify, Assign buttons
4. **Data Table**: Columns below

### Table Columns
| Column | Width | Notes |
|--------|-------|-------|
| checkbox | 40px | Row selection |
| Finding | auto | Clickable, shows rule name + file:line |
| Severity | 100px | Critical (red), High (amber), Medium (blue), Low (green) |
| Scanner | 100px | Semgrep/Gitleaks/Flawfinder badge |
| AI verdict | 120px | TP (red), FP (green), Pending (amber), confidence % |
| Assignee | 120px | User avatar or "Assign" button |
| Status | 100px | Open/Accepted/Needs review/Fixed |
| Actions | 80px | "Review" button |

### Mock Data
```ts
findings: [
  { id: "finding-1", rule: "SQL Injection", repo: "backend-api", file: "src/routes/orders.ts:88", severity: "critical", scanner: "Semgrep", verdict: "TP", confidence: "94%", model: "Modal QLoRA", status: "Open", cwe: "CWE-89" },
  { id: "finding-2", rule: "Hardcoded secret", repo: "backend-api", file: "config/secrets.env:4", severity: "high", scanner: "Gitleaks", verdict: "TP", confidence: "98%", model: "Modal QLoRA", status: "Open", cwe: "CWE-798" },
  { id: "finding-3", rule: "Weak random token", repo: "customer-web", file: "lib/token.ts:31", severity: "medium", scanner: "Semgrep", verdict: "FP", confidence: "81%", model: "Ollama q4", status: "Accepted", cwe: "CWE-330" },
  { id: "finding-4", rule: "Unchecked strcpy", repo: "backend-api", file: "native/parser.c:42", severity: "critical", scanner: "Flawfinder", verdict: "Pending", confidence: "-", model: "Not verified", status: "Needs review", cwe: "CWE-120" },
]
```

### Interactive Elements
- "Run AI verification" → verify all pending findings
- Click finding → open finding detail page
- "Review" → open finding detail drawer
- Bulk: Accept/Re-verify/Assign selected

---

## Page 5: Reports

**Route**: `/:workspace/reports`
**Breadcrumb**: Daily Work / Reports

### Purpose
Generate and download security reports. Supports scheduled reports.

### Sections
1. **Page Header**: Title "Reports"
2. **Main Content**: Report list table
3. **Sidebar**: Report types cards + Scheduled reports

### Table Columns
| Column | Width | Notes |
|--------|-------|-------|
| Report | auto | Title |
| Range | 120px | Time range |
| Status | 100px | Ready (green) |
| Format | 80px | PDF/XLSX/CSV badge |
| Created | 100px | Date |
| Actions | 100px | Preview/Download |

### Sidebar Cards
- AI Verdict Summary (blue icon)
- Detailed Findings (purple icon)
- Executive Summary (green icon)
- Compliance Export (amber icon)

### Mock Data
```ts
reports: [
  { id: "rep-21", title: "AI Verdict Summary", range: "Last 7 days", status: "Ready", format: "PDF", created: "Today" },
  { id: "rep-20", title: "Detailed Findings Export", range: "May 2026", status: "Ready", format: "XLSX", created: "Yesterday" },
]
```

### Interactive Elements
- "Generate report" → open generate modal
- Click report type card → open modal with pre-selected type
- "Preview" → open report preview drawer
- "Download" → download report file

---

## Page 6: Teams

**Route**: `/:workspace/teams`
**Breadcrumb**: Settings / Workspace / Teams

### Purpose
Manage teams for project assignment. Teams group people for scan oversight.

### Sections
1. **Page Header**: Title "Teams"
2. **Data Table**: Columns below

### Table Columns
| Column | Width | Notes |
|--------|-------|-------|
| Team | auto | Name + description |
| Slug | 150px | Monospace |
| Members | 80px | Count |
| Projects | auto | Chip list of project names |
| Actions | 100px | View/Edit buttons |

### Mock Data
```ts
teams: [
  { id: "team-backend", name: "Backend Platform", slug: "backend-platform", description: "API, auth, and worker services.", members: [{ name: "Maya Putri", role: "Admin" }, { name: "Reza Oktaviansyah", role: "Contributor" }], receiveScanNotifications: true, autoAssignCriticalFindings: true },
  { id: "team-frontend", name: "Frontend Apps", slug: "frontend-apps", description: "Customer web and UI surfaces.", members: [{ name: "Rudi Reviewer", role: "Admin" }], receiveScanNotifications: true, autoAssignCriticalFindings: false },
]
```

### Interactive Elements
- "New team" → open team modal
- "View" → open team detail drawer
- "Edit" → open team edit modal

---

## Page 7: Projects

**Route**: `/:workspace/projects`
**Breadcrumb**: Settings / Workspace / Projects

### Purpose
Group repositories and teams into projects for unified scan policy management.

### Sections
1. **Page Header**: Title "Projects"
2. **Planned Notice**: Feature flag banner
3. **Data Table**: Columns below
4. **Sidebar**: Grouping model explanation + mini-stats

### Table Columns
| Column | Width | Notes |
|--------|-------|-------|
| Project | auto | Name + description + lead |
| Repositories | auto | Chip list |
| Teams | auto | Chip list |
| Members | auto | Derived from teams + direct |
| Automation | auto | Quality gate, auto-trigger badges |
| Actions | 100px | View/Edit buttons |

### Mock Data
```ts
projects: [
  { id: "project-commerce", name: "Commerce Platform", description: "Checkout, customer web, and platform APIs.", lead: "Maya Putri", repositories: ["backend-api", "customer-web"], teams: ["Backend Platform", "Frontend Apps"], members: ["Maya Putri", "Reza Oktaviansyah", "Dimas Pratama", "Nadia Reviewer"], settings: { enforceQualityGate: true, notifyOnCritical: true, autoTriggerScan: true } },
  { id: "project-mobile", name: "Mobile Delivery", description: "Mobile app release security workflow.", lead: "Dimas Pratama", repositories: ["mobile-app"], teams: ["Backend Platform"], settings: { enforceQualityGate: true, autoTriggerScan: false } },
]
```

---

## Page 8: Source Control

**Route**: `/:workspace/integrations/source-control`
**Breadcrumb**: Settings / Integrations / Source Control

### Purpose
Connect and manage SCM providers (GitHub, GitLab, Gitea). Import repositories.

### Sections
1. **Page Header**: Title "Source Control"
2. **Provider Cards** (3 cards, responsive grid): Shows each provider with status, repo count, features
3. **Repository Catalog Table**: All discovered repos across providers
4. **PR Review Settings**: 3 toggles
5. **Inbound Webhook Sidebar**: Endpoint URL + test button

### Provider Card Content
- Icon + Name + Mode (GitHub App/OAuth)
- Status badge (Connected/Needs refresh/Disconnected)
- Org name, repo count, imported count
- Last sync time
- Features list (Commits, PR review, Webhooks)
- Auth flow description
- Actions: Setup guide, Configure, Test, Sync, Disconnect

### Repository Catalog Columns
| Column | Width | Notes |
|--------|-------|-------|
| Repository | auto | Provider icon + full name |
| Branch | 100px | Default branch |
| Status | 100px | Imported/Pending/Available |
| Project | 120px | Assigned project name |
| Actions | 100px | Import/Uninstall button |

### Mock Data
```ts
sourceProviders: [
  { id: "github", name: "GitHub", icon: "fa-brands fa-github", mode: "GitHub App", status: "Connected", org: "acme", repos: 18, imported: 2, lastSync: "8 min ago", features: ["Commits", "PR review", "CODEOWNERS", "Webhooks"], authFlow: "App installation" },
  { id: "gitlab", name: "GitLab", icon: "fa-brands fa-gitlab", mode: "OAuth app", status: "Needs refresh", org: "acme-platform", repos: 3, imported: 1, lastSync: "Yesterday", features: ["Merge request review", "CODEOWNERS", "Webhooks"], authFlow: "OAuth callback" },
  { id: "gitea", name: "Gitea", icon: "fa-solid fa-code-fork", mode: "OAuth app", status: "Disconnected", org: "local-gitea", repos: 0, imported: 0, lastSync: "Not synced", features: ["Local OAuth", "Repository import", "Webhooks"], authFlow: "OAuth callback" },
]

sourceRepositories: [
  { id: "src-gh-api", connectionId: "github", provider: "GitHub", fullName: "acme/backend-api", name: "backend-api", branch: "main", visibility: "private", imported: true, webhookStatus: "active", project: "Commerce Platform" },
  { id: "src-gh-web", connectionId: "github", provider: "GitHub", fullName: "acme/customer-web", name: "customer-web", branch: "release", visibility: "private", imported: true, webhookStatus: "active", project: "Commerce Platform" },
  { id: "src-gh-worker", connectionId: "github", provider: "GitHub", fullName: "acme/payment-worker", name: "payment-worker", branch: "main", visibility: "private", imported: false, project: "" },
  { id: "src-gl-mobile", connectionId: "gitlab", provider: "GitLab", fullName: "acme/mobile-app", name: "mobile-app", branch: "develop", visibility: "internal", imported: true, webhookStatus: "pending", project: "Mobile Delivery" },
]
```

### Interactive Elements
- "Connect provider" → open provider connection modal
- Per-provider: Setup guide drawer, Configure, Test, Sync, Disconnect
- "Import" → import repository
- "Uninstall" → remove repository
- Toggles: Post PR summary, Inline annotations, Quality gate status

---

## Page 9: Webhooks

**Route**: `/:workspace/integrations/webhooks`
**Breadcrumb**: Settings / Integrations / Webhooks

### Purpose
Configure outbound webhooks for scan events.

### Sections
1. **Page Header**: Title "Webhooks"
2. **Planned Notice**: Feature flag banner
3. **Data Table**: Columns below

### Table Columns
| Column | Width | Notes |
|--------|-------|-------|
| checkbox | 40px | Row selection |
| Webhook | auto | Name + URL |
| Endpoint | auto | URL (copyable) |
| Events | auto | Chip list (finding.critical, scan.completed, etc.) |
| Last delivery | 120px | Time + status code |
| Status | 100px | Active (green) / Disabled (gray) |
| Actions | 120px | History/Test/Edit/Delete |

### Mock Data
```ts
webhooks: [
  { id: "webhook-secops", name: "Security Ops", provider: "generic", url: "https://api.internal.example/security", secretPrefix: "whsec_live_82f4", events: ["finding.critical", "gate.result"], delivery: "Last success 18 min ago", status: "Active" },
  { id: "webhook-archive", name: "Scan Archive", provider: "generic", url: "https://warehouse.example/hooks/sast", secretPrefix: "whsec_arch_11c9", events: ["scan.completed", "scan.failed"], delivery: "Disabled", status: "Disabled" },
]
```

### Interactive Elements
- "New webhook" → open webhook modal
- Per-row: History drawer, Test, Edit, Enable/Disable, Delete
- Bulk: Delete selected, Disable selected

---

## Page 10: Scan Policies

**Route**: `/:workspace/scan-policies`
**Breadcrumb**: Settings / Analysis Policy / Scan Policies

### Purpose
Define which scanners and profiles to apply across repositories.

### Sections
1. **Page Header**: Title "Scan Policies"
2. **Planned Notice**: Feature flag banner
3. **Data Table**: Columns below
4. **Sidebar**: Policy hierarchy diagram + mini-stats

### Table Columns
| Column | Width | Notes |
|--------|-------|-------|
| Policy | auto | Name |
| Profile | 120px | Quick/Standard/Comprehensive badge |
| Scanners | auto | Chip list of scanner names |
| AI verification | 120px | Enabled/Critical only/Disabled |
| Severity gate | 100px | Threshold (Medium+/High+/Low+) |
| Actions | 100px | Preview/Edit buttons |

### Sidebar
- Policy hierarchy: Scan Policy → Scanner Engines → AI Models → Quality Gate
- Mini-stats: Timeout (300 sec), Max findings (2,000), Knowledge context (Attached)

### Mock Data
```ts
scanPolicies: [
  { id: "policy-standard", name: "Standard Workspace Policy", profile: "Standard", scanners: "Semgrep, Gitleaks", ai: "Enabled", severity: "Medium+" },
  { id: "policy-quick", name: "PR Quick Check", profile: "Quick", scanners: "Semgrep", ai: "Critical only", severity: "High+" },
  { id: "policy-release", name: "Release Comprehensive", profile: "Comprehensive", scanners: "All ready scanners", ai: "Enabled", severity: "Low+" },
]
```

### Interactive Elements
- "Templates" → open policy templates modal
- "New policy" → open policy modal
- Per-row: Preview drawer (execution flow), Edit modal

---

## Page 11: Scanner Engines

**Route**: `/:workspace/scanner-engines`
**Breadcrumb**: Settings / Analysis Policy / Scanner Engines

### Purpose
View and manage static analysis scanner engines.

### Sections
1. **Page Header**: Title "Scanner Engines"
2. **Planned Notice**: Feature flag banner
3. **Data Table**: Columns below
4. **Sidebar**: Scanner defaults (2 toggles + adapter lifecycle)

### Table Columns
| Column | Width | Notes |
|--------|-------|-------|
| Scanner | auto | Icon + name |
| Capability | auto | Description |
| Status | 120px | Ready (green) / Installed not wired (amber) |
| Rules | 120px | Rule count or "Planned" |
| Version | 100px | Version number |
| Actions | 100px | Browse rules / Settings |

### Mock Data
```ts
scanners: [
  { id: "semgrep", name: "Semgrep", capability: "Multi-language SAST", status: "Ready", rules: "132 active", version: "1.x", enabled: true },
  { id: "gitleaks", name: "Gitleaks", capability: "Secret scanning", status: "Ready", rules: "Baseline config", version: "8.x", enabled: true },
  { id: "flawfinder", name: "Flawfinder", capability: "C/C++ sink detection", status: "Ready", rules: "Runtime default", version: "2.x", enabled: true },
  { id: "codeql", name: "CodeQL", capability: "Semantic analysis", status: "Installed, not wired", rules: "Planned", version: "Detected", enabled: false },
]
```

### Interactive Elements
- "Probe all" → check all scanner availability
- "Apply changes" → save scanner settings
- Per-row: Browse rules drawer, Settings modal
- Sidebar toggles: Auto-sync rules, AI triage new patterns (disabled behind flag)

---

## Page 12: AI Models

**Route**: `/:workspace/ai-models`
**Breadcrumb**: Settings / Analysis Policy / AI Models

### Purpose
Manage AI models for vulnerability analysis and false positive reduction.

### Sections
1. **Page Header**: Title "AI Models"
2. **Data Table**: Model registry
3. **Verification Behavior Section**: 3 toggles + 3 selects
4. **Fallback Chain Sidebar**: Ordered model list
5. **Scenario Test Console**: 4 test buttons

### Table Columns
| Column | Width | Notes |
|--------|-------|-------|
| Model | auto | Name |
| Provider | 150px | Provider name |
| Role | 100px | Primary/Fallback 1/Fallback 2 |
| Status | 100px | Healthy (green) / Rate limited (amber) |
| Last tested | 120px | Time ago |
| Actions | 80px | Edit button |

### Verification Behavior
- Toggles: Attach knowledge context, Require confidence for auto-accept, Allow fallback on timeout
- Selects: Confidence threshold (90%/85%/95%), Timeout (90/60/120 sec), CWE mismatch behavior

### Mock Data
```ts
aiModels: [
  { id: "model-primary", name: "sast-qlora-8b", provider: "Custom OpenAI-compatible", baseUrl: "https://models.internal.example/v1", role: "Primary", status: "Healthy", lastTested: "8 min ago", detail: "Primary security verifier" },
  { id: "model-ollama", name: "llama3.2:3b-q4_K_M", provider: "Ollama", baseUrl: "http://localhost:11434", role: "Fallback 1", status: "Healthy", lastTested: "1 hour ago", detail: "Local fallback" },
  { id: "model-groq", name: "llama-3.1-8b-instant", provider: "Custom OpenAI-compatible", baseUrl: "https://api.groq.com/openai/v1", role: "Fallback 2", status: "Rate limited", lastTested: "Yesterday", detail: "Hosted fallback" },
]
```

### Interactive Elements
- "Test primary" → test AI connection
- "Add model" → open model modal
- Per-row: Edit modal
- Scenario test buttons: Scanner, AI, Knowledge, Pipeline

---

## Page 13: Quality Gates

**Route**: `/:workspace/quality-gates`
**Breadcrumb**: Settings / Analysis Policy / Quality Gates

### Purpose
Define pass/fail criteria for PRs, releases, and scheduled checks.

### Sections
1. **Page Header**: Title "Quality Gates"
2. **Planned Notice**: Feature flag banner
3. **Default PR Gate Section**: 4 toggles + 2 selects
4. **Provider Delivery Sidebar**: Info card

### Toggles
- Fail on unresolved critical findings (default: checked)
- Fail on high findings verified as TP (default: checked)
- Warn on pending AI verification (default: checked)
- Require human acknowledgement (default: unchecked)

### Selects
- Blocking threshold: "High and above" / "Critical only" / "Medium and above"
- Pending behavior: "Warn" / "Fail" / "Ignore"

### Mock Data
```ts
qualityGate: {
  threshold: "High and above",
  pending: "Warn",
  requireHuman: false,
  failCritical: true,
  failHighTp: true,
  warnPending: true,
}
```

### Interactive Elements
- "Save gate" → save quality gate settings

---

## Page 14: Knowledge Base

**Route**: `/:workspace/knowledge-base`
**Breadcrumb**: Settings / Intelligence / Knowledge Base

### Purpose
Browse CWE/NVD entries and their associated findings. Supports custom rules.

### Sections
1. **Page Header**: Title "Knowledge Base"
2. **Planned Notice**: Feature flag banner
3. **Left Sidebar**: Sources list + Usage analytics
4. **Main Content**: Knowledge entries table

### Sources Sidebar
- CWE: Weakness taxonomy, 923 entries, Connected
- NVD: Vulnerability database, 256,441 entries, Stale
- MITRE: Attack context, 188 entries, Connected
- Custom Rules: Workspace policy notes, 12 entries, Connected

### Table Columns
| Column | Width | Notes |
|--------|-------|-------|
| checkbox | 40px | Row selection |
| Entry | auto | Name + snippet preview |
| Source | 100px | CWE/NVD/MITRE/Custom badge |
| Severity | 100px | Critical/High/Medium/Low |
| Used by AI | 120px | Finding count |
| Actions | 100px | Preview/Edit/Mute |

### Mock Data
```ts
knowledgeSources: [
  { id: "cwe", name: "CWE", desc: "Weakness taxonomy", count: "923 entries", status: "Connected" },
  { id: "nvd", name: "NVD", desc: "Vulnerability database", count: "256,441 entries", status: "Stale" },
  { id: "mitre", name: "MITRE", desc: "Attack context", count: "188 entries", status: "Connected" },
  { id: "custom", name: "Custom Rules", desc: "Workspace policy notes", count: "12 entries", status: "Connected" },
]

knowledgeEntries: [
  { id: "kb-cwe-89", name: "CWE-89 SQL Injection", source: "CWE", severity: "Critical", usedByAi: "142 findings", muted: false, updated: "Synced today", tags: ["injection", "database", "input validation"], snippet: "Use when scanner findings include dynamic SQL construction..." },
  { id: "kb-cve-2024-3094", name: "CVE-2024-3094", source: "NVD", severity: "Critical", usedByAi: "4 findings", muted: false, updated: "Synced yesterday", tags: ["supply chain", "xz", "backdoor"], snippet: "Use as enrichment for dependency or build-chain findings..." },
  { id: "kb-custom-auth", name: "Internal auth bypass pattern", source: "Custom Rules", severity: "High", usedByAi: "9 findings", muted: false, updated: "Edited 2 days ago", tags: ["workspace rule", "auth", "middleware"], snippet: "Require explicit authorization middleware on protected routes..." },
]
```

### Interactive Elements
- "Sync all" → sync all knowledge sources
- "Custom rule" → open custom rule modal
- Per-source: Sync individual source
- Per-row: Preview drawer, Edit/Mute/Unmute
- Bulk: Mute selected, Unmute selected

---

## Page 15: Schedules

**Route**: `/:workspace/schedules`
**Breadcrumb**: Settings / Operations / Schedules

### Purpose
Manage recurring scan schedules for repositories.

### Sections
1. **Page Header**: Title "Schedules"
2. **Planned Notice**: Feature flag banner
3. **Data Table**: Columns below

### Table Columns
| Column | Width | Notes |
|--------|-------|-------|
| Repository | auto | Repo name + branch |
| Frequency | 120px | Daily/Weekly + cron |
| Timezone | 100px | Timezone |
| Policy | auto | Attached policy name |
| Next run | 120px | Scheduled time |
| Last 3 runs | 120px | 3 colored pills (✓/✗/~) |
| Status | 100px | Active (green) / Paused (gray) |
| Actions | 80px | Edit/Pause button |

### Mock Data
```ts
schedules: [
  { id: "schedule-backend", repo: "backend-api", branch: "main", frequency: "Daily", policy: "Standard Workspace Policy", nextRun: "Tonight 01:00", status: "Active" },
  { id: "schedule-web", repo: "customer-web", branch: "release", frequency: "Weekly", policy: "Release Comprehensive", nextRun: "Monday 02:00", status: "Paused" },
]
```

### Interactive Elements
- "Add schedule" → open schedule modal
- Per-row: Edit modal, Pause/Resume toggle

---

## Shared UI Patterns

### Page Header Pattern
```tsx
<div style={{ display: 'grid', gap: 'var(--space-3xl)' }}>
  <PageHeader
    title="Page Title"
    description="Page description"
    actions={<Button type="primary">Action</Button>}
  />
  {/* Content */}
</div>
```

### Data Table Pattern
```tsx
<section className="surface">
  <Toolbar>
    <Input placeholder="Search..." />
    <Select options={[...]} />
  </Toolbar>
  <DataTable data={rows} columns={columns} />
  <div className="table-footer">
    <span>Showing X of Y</span>
  </div>
</section>
```

### Mock Data Pattern
```ts
const MOCK_DATA = [
  { id: '1', name: 'Item 1', status: 'active' },
  { id: '2', name: 'Item 2', status: 'inactive' },
] as const;
```

### Status Badge Pattern
```tsx
<Tag color={status === 'active' ? 'green' : 'default'}>
  {status === 'active' ? 'Active' : 'Inactive'}
</Tag>
```

---

## File Structure

```
src/app/(authenticated)/[workspace]/
├── page.tsx                    # Dashboard
├── repositories/
│   └── page.tsx                # Repositories
├── scan/
│   ├── page.tsx                # Scans
│   └── _components/            # Scan UI components
├── findings/
│   └── page.tsx                # Findings
├── reports/
│   └── page.tsx                # Reports
├── teams/
│   └── page.tsx                # Teams
├── projects/
│   └── page.tsx                # Projects
├── integrations/
│   ├── source-control/
│   │   └── page.tsx            # Source Control
│   └── webhooks/
│       └── page.tsx            # Webhooks
├── scan-policies/
│   └── page.tsx                # Scan Policies
├── scanner-engines/
│   └── page.tsx                # Scanner Engines
├── ai-models/
│   └── page.tsx                # AI Models
├── quality-gates/
│   └── page.tsx                # Quality Gates
├── knowledge-base/
│   └── page.tsx                # Knowledge Base
└── schedules/
    └── page.tsx                # Schedules
```
