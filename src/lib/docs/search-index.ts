/**
 * Auto-generated search index from markdown files.
 * Run: node scripts/generate-search-index.js
 * 
 * Last generated: 2026-06-26T12:40:25.109Z
 */

export interface SearchEntry {
  headings: string[];
  content: string;
}

export const SEARCH_INDEX: Record<string, SearchEntry> = {
  "ai-models": {
    "headings": [
      "AI Models",
      "Overview",
      "Supported Providers",
      "Configuration",
      "Adding a Model",
      "Model Settings",
      "Prompt Variants",
      "Strict",
      "Balanced",
      "Model Testing",
      "Model Presets",
      "API Endpoints",
      "Feature Flag"
    ],
    "content": "Configure LLM providers for AI-powered finding verification. Each workspace can have its own model configuration. 1. Go to **AI Models** page 2. Click **Add Model** 3. Select provider 4. Enter API key and model settings 5. Click **Test Connection** 6. Click **Save** Detailed analysis with: Brief analysis with: Test model configuration: Returns sample verification result. AI models require FEATURE_FLAG_AI_MODELS=true."
  },
  "ai-verification": {
    "headings": [
      "AI Verification",
      "Overview",
      "Pipeline Flow",
      "CWE Context Enrichment",
      "Prompt Templates",
      "System Rules",
      "Response Format",
      "AI Model Management",
      "Model Configuration",
      "Model Presets",
      "Database Schema",
      "`ai_verifications`",
      "Quality Metrics"
    ],
    "content": "The AI verification pipeline uses LLM to reduce false positives in security findings. Each finding is analyzed with CWE context and classified as true positive or false positive. Knowledge base entries provide context to the LLM: Two prompt variants (same JSON response format): Both prompts enforce strict rules: 1. Default assumption: scanner is CORRECT (true_positive) 2. Only classify as false_positive with PROOF of safety 3. If unsure → true_positive Each workspace can configure: Pre-configured model setups:"
  },
  "api-overview": {
    "headings": [
      "API Overview",
      "Base URL",
      "Authentication",
      "Getting a Token",
      "Response Envelope",
      "Endpoint Groups",
      "Authentication",
      "Workspaces",
      "Repositories",
      "Scans",
      "Findings",
      "Reports",
      "Members",
      "Teams",
      "Projects",
      "Source Controls",
      "Webhooks",
      "Schedules",
      "Scanner Engines",
      "Quality Gates",
      "Knowledge Base",
      "AI Models",
      "Dashboard",
      "Error Responses",
      "Pagination",
      "Rate Limiting",
      "Webhooks"
    ],
    "content": "All endpoints are prefixed with /api/v1. The full URL is: All authenticated endpoints require a Bearer token in the Authorization header: The refresh token is stored in an HTTP-only cookie and automatically rotates on each use. All responses follow a standard envelope: Most list endpoints support pagination: Rate limit headers are included in responses: Webhooks send POST requests to your configured URL when events occur:"
  },
  "api-tokens": {
    "headings": [
      "API Tokens",
      "Overview",
      "Token Types",
      "Personal Access Tokens",
      "Creating a Token",
      "Using the Token",
      "Project API Tokens",
      "Creating a Project Token",
      "CI/CD Usage",
      "Initialize scan",
      "Upload results",
      "Token Security",
      "Token Fields"
    ],
    "content": "API tokens authenticate external services (CI/CD pipelines, scripts) against the platform. 1. Go to **Profile** page 2. Click **Generate Token** 3. Enter token name 4. Select expiration 5. Copy token (shown once) 1. Go to **Projects** → Select project 2. Click **API Tokens** 3. Click **Generate Token** 4. Enter token name 5. Copy token"
  },
  "arena": {
    "headings": [
      "Arena",
      "Overview",
      "How It Works",
      "Use Cases",
      "Comparison Metrics",
      "API Endpoints",
      "Feature Flag"
    ],
    "content": "Arena provides A/B comparison of AI model configurations. Test different models, prompts, and settings to find the optimal verification setup. 1. Create a comparison run 2. Select findings to verify 3. Configure model variants 4. Run comparison 5. Review results and pick the best model Arena requires FEATURE_FLAG_ARENA=true (disabled by default)."
  },
  "audit-logs": {
    "headings": [
      "Audit Logs",
      "Overview",
      "Logged Events",
      "Audit Log Fields",
      "Querying Audit Logs",
      "Via UI",
      "Via API",
      "Response",
      "Activity Logs",
      "API Endpoints",
      "Retention"
    ],
    "content": "Audit logs track all significant actions in the workspace for compliance and security monitoring. 1. Go to **Audit Logs** page 2. Filter by: - Date range - Action type - Resource type 3. Export as CSV Lighter-weight logging for UI activity:"
  },
  "authentication": {
    "headings": [
      "Authentication",
      "Overview",
      "Auth Flow",
      "Sign Up",
      "Sign In",
      "Session Management",
      "Refresh Token Rotation",
      "Password Requirements",
      "Protected Routes"
    ],
    "content": "SAST Integration uses session-based authentication with secure HTTP-only cookies. Passwords are hashed with bcrypt. The platform implements refresh token rotation with reuse detection: 1. On each authenticated request, a new refresh token is issued 2. The old refresh token is invalidated 3. If a reused (already-invalidated) token is detected, all sessions for that user are revoked 4. The refresh endpoint requires the x-refresh-request: 1 header All routes under /(authenticated)/ require a valid session. The AuthenticatedShell component handles: 1. Session validation on mount 2. Workspace slug verification 3. Redirect to /auth/signin on session expiry 4. Redirect to /workspaces on workspace mismatch"
  },
  "best-practices": {
    "headings": [
      "Best Practices",
      "Scanner Selection",
      "Scan Frequency",
      "Quality Gates",
      "Finding Triage",
      "AI Model Selection",
      "Knowledge Base",
      "Team Organization"
    ],
    "content": "Configure quality gates to block merges: 1. **Review AI verdicts** — Trust but verify 2. **Focus on critical/high** — Address immediately 3. **Bulk triage** — Use bulk actions for efficiency 4. **Assign ownership** — Assign to responsible developers 5. **Track metrics** — Monitor false positive rate over time"
  },
  "cpp-security": {
    "headings": [
      "C/C++ Security Guide",
      "Overview",
      "Common Vulnerabilities",
      "Buffer Overflows",
      "Memory Leaks",
      "Format String Vulnerabilities",
      "Recommended Scanner Configuration",
      "All C/C++ scanners",
      "Semgrep Rules for C",
      "Clang-Tidy Checks",
      "Cppcheck Configuration",
      "GCC Fanalyzer"
    ],
    "content": "C/C++ code requires special attention due to memory safety issues. This guide covers common vulnerabilities and how the scanner engines detect them. For comprehensive C/C++ analysis: The platform includes 100+ C-specific rules: Enabled checks for security: CWE mapping for GCC fanalyzer:"
  },
  "custom-rules": {
    "headings": [
      "Custom Semgrep Rules",
      "Overview",
      "Rule Directory Structure",
      "Rule Format",
      "Rule Severity Levels",
      "Testing Rules",
      "Run semgrep with custom rules",
      "Language Packs"
    ],
    "content": "The platform supports custom Semgrep rules via the SEMGREP_RULES_DIR environment variable."
  },
  "cwe-mapping": {
    "headings": [
      "CWE Mapping",
      "Overview",
      "CWE Severity Mapping",
      "Scanner → CWE Mapping",
      "Semgrep",
      "GCC Fanalyzer",
      "Other Scanners",
      "Knowledge Base Integration",
      "API Usage",
      "Get CWE Details",
      "Response"
    ],
    "content": "The platform maps scanner findings to CWE (Common Weakness Enumeration) identifiers for standardized vulnerability classification. Extracts CWE from rule metadata: Parses CWE from output: CWE assigned based on rule patterns and severity mapping. CWE entries are enriched from:"
  },
  "environment-variables": {
    "headings": [
      "Environment Variables",
      "Server-Side Variables",
      "Core",
      "Feature Flags (Server)",
      "Scanner",
      "Storage",
      "Client-Side Variables",
      "CI/CD Variables"
    ],
    "content": "All client-side feature flags use the NEXT_PUBLIC_ prefix:"
  },
  "findings": {
    "headings": [
      "Findings",
      "Overview",
      "Finding Lifecycle",
      "Severity Levels",
      "AI Verdicts",
      "Finding Fields",
      "Deduplication",
      "Bulk Operations",
      "Comments",
      "API Endpoints"
    ],
    "content": "Findings are security issues detected by scanners. Each finding includes AI verification, CWE classification, and remediation guidance. Findings are deduplicated using SHA-256 fingerprints: Same vulnerability across multiple scans creates: Findings support threaded comments:"
  },
  "first-scan": {
    "headings": [
      "First Scan",
      "Prerequisites",
      "Step 1: Connect a Repository",
      "Step 2: Trigger a Scan",
      "Step 3: Monitor Progress",
      "Step 4: Review Findings",
      "Step 5: Triage Findings",
      "CI/CD Integration",
      "Initialize scan",
      "Upload results",
      "Complete scan"
    ],
    "content": "Before running your first scan, ensure you have: 1. A user account with access to a workspace 2. A source control provider connected (GitHub, GitLab, or Gitea) 3. At least one repository imported 1. Navigate to **Source Control** in the sidebar 2. Click **Connect Provider** and authorize your SCM 3. Click **Import Repositories** and select a repository 4. Wait for the initial sync to complete 1. Go to **Scans** in the sidebar 2. Click **New Scan** 3. Select the repository and branch 4. Choose scanner engines: - **semgrep** — Multi-language (recommended) - **gitleaks** — Secrets detection (recommended) - **flawfinder** — C/C++ buffer overflows - **cppcheck** — C/C++ static analysis - **clang-tidy** — C/C++ linter - **gcc-fanalyzer** — C/C++ analysis 5. Click **Start Scan** The scan progresses through these stages: 1. Go to **Findings** in the sidebar 2. Filter by severity, scanner, or status 3. Click a finding to view details: - Source code snippet - AI verdict (true positive / false positive) - Confidence score - CWE classification - Fix suggestion For automated scanning in CI/CD pipelines:"
  },
  "installation": {
    "headings": [
      "Installation",
      "Prerequisites",
      "Scanner Dependencies",
      "Semgrep (multi-language, 30+ languages)",
      "Gitleaks (secrets detection)",
      "Download from: https://github.com/gitleaks/gitleaks/releases",
      "Flawfinder (C/C++ buffer overflows)",
      "Cppcheck (C/C++ static analysis)",
      "Ubuntu: sudo apt install cppcheck",
      "macOS: brew install cppcheck",
      "Clang-Tidy (C/C++ linter)",
      "Ubuntu: sudo apt install clang-tidy",
      "macOS: brew install llvm",
      "GCC Fanalyzer (C/C++ static analysis)",
      "Requires GCC 10+ with --enable analyzer",
      "Environment Setup",
      "Copy environment template",
      "Required variables",
      "Feature flags (enable/disable features)",
      "Database Setup",
      "Generate Drizzle schema",
      "Run migrations",
      "Seed initial data (optional)",
      "Start Development",
      "Production Build",
      "Docker (Alternative)"
    ],
    "content": "Install the scanners you need (all are optional): The application runs at http://localhost:3000. This starts PostgreSQL and the application server."
  },
  "knowledge-base": {
    "headings": [
      "Knowledge Base",
      "Overview",
      "Knowledge Sources",
      "How Knowledge Enrichment Works",
      "Example",
      "Knowledge Base Entries",
      "API Endpoints",
      "Feature Flag"
    ],
    "content": "The knowledge base provides CWE, NVD, and MITRE ATT&CK context to enrich findings and improve AI verification accuracy. 1. Finding has cwe_id from scanner 2. System queries knowledge base for matching entries 3. Context is injected into AI verification prompt 4. AI uses enriched context for better classification Knowledge base requires FEATURE_FLAG_KNOWLEDGE_BASE=true."
  },
  "overview": {
    "headings": [
      "Architecture Overview",
      "System Architecture",
      "Data Flow",
      "Directory Structure",
      "Key Design Decisions",
      "1. Server/Client Separation",
      "2. Feature Module Pattern",
      "3. Permission-First UI",
      "4. Queue-Based Scan Processing",
      "Database Schema"
    ],
    "content": "Server modules (server/) are never imported from client code. Client data access goes through API routes via modules/api.ts. Each feature is self-contained: Every page uses a layered guard system: Scans are processed asynchronously via pg-boss: 44 tables organized by domain:"
  },
  "project-access-control": {
    "headings": [
      "Project Access Control",
      "Overview",
      "Project Structure",
      "Project Members",
      "Access Control Rules",
      "API Token Scope",
      "API Endpoints",
      "Feature Flag"
    ],
    "content": "Projects provide an additional layer of access control within workspaces. Each project can have its own members, repositories, and API tokens. 1. **Workspace scope**: Projects belong to a workspace 2. **Member scope**: Users must be workspace members 3. **Project membership**: Optional project-level membership 4. **Repository scope**: Repositories can be assigned to projects Project API tokens are scoped to a single project: Projects require FEATURE_FLAG_PROJECTS=true."
  },
  "quality-gates": {
    "headings": [
      "Quality Gates",
      "Overview",
      "Gate Configuration",
      "Gate Evaluation",
      "Evaluation Flow",
      "PR Integration",
      "PR Comment Example",
      "Configuration",
      "Via UI",
      "Via API",
      "API Endpoints",
      "Feature Flag"
    ],
    "content": "Quality gates evaluate scan results against configurable thresholds and block merges when criteria are not met. Quality gates evaluate after scan completion: 1. Count findings by severity and AI verdict 2. Compare against thresholds 3. Return pass/fail status 4. Block PR merge if gate fails When a quality gate fails: 1. Commit status set to **failed** 2. PR comment posted with details 3. Merge blocked until gate passes 1. Go to **Quality Gates** page 2. Configure thresholds 3. Set blocking behavior 4. Click **Save** Quality gates require FEATURE_FLAG_QUALITY_GATES=true."
  },
  "quick-reference": {
    "headings": [
      "Quick Reference",
      "API Endpoints",
      "Authentication",
      "Workspaces",
      "Scans",
      "Findings",
      "Reports",
      "Permissions",
      "Role Hierarchy",
      "Scanner IDs"
    ],
    "content": ""
  },
  "rbac": {
    "headings": [
      "Role-Based Access Control (RBAC)",
      "Overview",
      "Role Hierarchy",
      "Roles",
      "Permission Matrix",
      "Permission Format",
      "Resources (18)",
      "Actions (9)",
      "Component Guards",
      "PermissionGate (UI)",
      "requirePermission (API)",
      "Role Summary"
    ],
    "content": "SAST Integration implements granular RBAC with 4 roles and 36 permissions. dashboard, repository, scan, finding, report, arena, member, team, project, integration, webhook, schedule, policy, scanner, ai_model, knowledge, workspace, audit view, manage, run, triage, override_ai, export, invite, settings, read"
  },
  "reports": {
    "headings": [
      "Reports",
      "Overview",
      "Report Types",
      "Generating Reports",
      "Via UI",
      "Via API",
      "Report Contents",
      "Report Lifecycle",
      "API Endpoints",
      "Feature Flag"
    ],
    "content": "Reports provide exportable security summaries in PDF and XLSX formats for compliance and stakeholder communication. 1. Go to **Reports** page 2. Click **Generate Report** 3. Select scope (workspace, project, or scan) 4. Choose format (PDF/XLSX) 5. Click **Generate** Reports require FEATURE_FLAG_REPORTS=true."
  },
  "repositories": {
    "headings": [
      "Repositories",
      "Overview",
      "Supported Providers",
      "Repository States",
      "Import Flow",
      "API Endpoints",
      "List Repositories",
      "Update Repository",
      "List Branches",
      "Repository Fields",
      "External Uploads"
    ],
    "content": "Repositories connect your code to the scanning platform. Import repositories from GitHub, GitLab, or Gitea for automated security analysis. 1. Connect SCM provider (OAuth/Token) 2. List available repositories 3. Select repositories to import 4. System creates repository records 5. Initial branch sync For repositories not connected via SCM: The system auto-creates external repository records."
  },
  "scan-pipeline": {
    "headings": [
      "Scan Pipeline",
      "Overview",
      "Pipeline Architecture",
      "Scan Lifecycle",
      "Status Flow",
      "Timeline Events",
      "Managed Scan Execution",
      "`triggerManualScan(input)`",
      "`processManagedScanJob(data)`",
      "CI/CD Upload Flow",
      "Scanner Output Parsers",
      "Queue Jobs"
    ],
    "content": "The scan pipeline handles the complete lifecycle from scan trigger to finding storage. Each scan generates a timeline with these event types: 1. Set status to processing 2. git clone --depth 1 --branch {branch} {url} 3. For each scanner: - Check availability - Run scanner CLI - Upload output to storage - Create scan_result record - Enqueue parse-scan-result job 4. If ALL scanners failed → throw error 5. Set status to completed 6. Cleanup temp directory For external CI/CD pipelines:"
  },
  "scan-policies": {
    "headings": [
      "Scan Policies",
      "Overview",
      "Policy Structure",
      "Default Scanners",
      "Scanner Selection",
      "Policy Configuration",
      "Via UI",
      "Via API",
      "Feature Flag"
    ],
    "content": "Scan policies define which scanners to run and how to handle results. Configure policies per project or workspace-wide. When no policy is specified: 1. Go to **Scan Policies** page 2. Click **Add Policy** 3. Enter policy name 4. Select scanners 5. Configure thresholds 6. Click **Save** Scan policies require FEATURE_FLAG_SCAN_PROFILES=true."
  },
  "scanner-engines": {
    "headings": [
      "Scanner Engines",
      "Overview",
      "Scanner Overview",
      "Scanner Configuration",
      "Semgrep",
      "Gitleaks",
      "Flawfinder",
      "Cppcheck",
      "Availability Check",
      "Response",
      "Limits",
      "Feature Flag"
    ],
    "content": "Configure and manage the 6 scanner engines available in the platform. Scanner engines configuration requires FEATURE_FLAG_SCANNER_ENGINES=true."
  },
  "scanner-installation": {
    "headings": [
      "Scanner Installation",
      "Supported Scanners",
      "Semgrep",
      "Verify",
      "Gitleaks",
      "Linux",
      "macOS",
      "Flawfinder",
      "Verify",
      "Cppcheck",
      "Ubuntu/Debian",
      "macOS",
      "Verify",
      "Clang-Tidy",
      "Ubuntu/Debian",
      "macOS",
      "GCC Fanalyzer",
      "Verify GCC version",
      "Test analyzer support",
      "Availability Check",
      "API endpoint",
      "Response"
    ],
    "content": "Requires GCC 10+ with the analyzer feature: The platform checks scanner availability before each scan: Unavailable scanners are skipped gracefully. Scans continue even if some scanners fail."
  },
  "scans": {
    "headings": [
      "Scans",
      "Overview",
      "Scan Types",
      "Scan Lifecycle",
      "Creating a Scan",
      "Via UI",
      "Via API",
      "Response",
      "Scanner Selection",
      "Scan Detail",
      "API Endpoints"
    ],
    "content": "Scans are the core analysis unit. Each scan runs multiple security scanners against a repository branch and produces findings. 1. Go to **Scans** page 2. Click **New Scan** 3. Select repository and branch 4. Choose scanner engines 5. Click **Start Scan** Each scan provides:"
  },
  "schedules": {
    "headings": [
      "Schedules",
      "Overview",
      "Schedule Structure",
      "Creating a Schedule",
      "Via UI",
      "Via API",
      "Cron Expressions",
      "Timezone",
      "Schedule Management",
      "Feature Flag"
    ],
    "content": "Schedules automate recurring scans using cron expressions. Configure scans to run daily, weekly, or on custom schedules. 1. Go to **Schedules** page 2. Click **Add Schedule** 3. Select repository and branch 4. Enter cron expression 5. Set timezone 6. Click **Create** Schedules support timezone-aware cron expressions: Schedules require FEATURE_FLAG_SCHEDULES=true (disabled by default)."
  },
  "source-control": {
    "headings": [
      "Source Control Integration",
      "Supported Providers",
      "Connecting a Provider",
      "GitHub",
      "GitLab",
      "Gitea",
      "Repository Import",
      "Branch Sync",
      "Webhook Events",
      "API Endpoints",
      "Feature Flags"
    ],
    "content": "1. Go to **Source Control** page 2. Click **Connect GitHub** 3. Authorize the OAuth app 4. Select organization/personal account 1. Go to **Source Control** page 2. Click **Connect GitLab** 3. Enter GitLab URL and access token 4. Authorize 1. Go to **Source Control** page 2. Click **Connect Gitea** 3. Enter Gitea URL and personal access token 4. Test connection After connecting a provider: 1. Click **Import Repositories** 2. Browse available repositories 3. Select repositories to import 4. Click **Import** 5. System creates repository records and syncs branches"
  },
  "storage": {
    "headings": [
      "Storage",
      "Overview",
      "Storage Structure",
      "Storage Configuration",
      "Environment Variables",
      "Local Storage",
      "S3 Storage",
      "Retention",
      "Cleanup Job",
      "Automatic cleanup via queue job",
      "File Size Limits"
    ],
    "content": "Scan results and reports are stored in object storage (S3-compatible or local filesystem)."
  },
  "troubleshooting": {
    "headings": [
      "Troubleshooting",
      "Common Issues",
      "Scanner Not Found",
      "Check if scanner is installed",
      "Install missing scanner",
      "Scan Stuck in \"Processing\"",
      "No Findings After Scan",
      "AI Verification Not Running",
      "Permission Denied on Actions",
      "Database Connection Errors",
      "Debug Mode",
      "Log Locations",
      "Getting Help"
    ],
    "content": "1. Check worker logs for errors 2. The scan-timeout-watchdog job auto-fails scans > 30 minutes 3. Trigger a new scan if needed 1. Check scanner output in scan results 2. Verify scanner is installed and available 3. Check parser logs for errors 1. FEATURE_FLAG_AI_VERIFICATION=true 2. AI model configured in workspace settings 3. LLM provider API key is valid 1. Verify DATABASE_URL is correct 2. Check PostgreSQL is running 3. Run migrations: npm run db:migrate Enable verbose logging: 1. Check this troubleshooting guide 2. Review API error messages 3. Check database for data consistency 4. Review worker job logs"
  },
  "user-interaction-scenarios": {
    "headings": [
      "User Interaction Scenarios",
      "Scenario 1: Developer — First-Time Setup",
      "Scenario 2: Security Lead — Full Workflow",
      "Scenario 3: Developer — Finding Triage",
      "Scenario 4: Manager — Team Organization",
      "Scenario 5: CI/CD Integration",
      "Scenario 6: Audit Review"
    ],
    "content": "1. Receive workspace invitation via email 2. Create account and set password 3. Accept invitation 4. View workspace dashboard (limited view) 1. Connect GitHub organization 2. Import 10 repositories 3. Configure AI model (GPT-4) 4. Create quality gates (fail on critical) 5. Run first scans on all repos 6. Review AI-verified findings 7. Assign critical findings to developers 8. Generate compliance report (PDF) 9. Share report with stakeholders 1. Receive notification for new findings 2. Open Finding detail 3. Review code snippet and AI verdict 4. Confirm true positive 5. Add comment with remediation plan 6. Mark as \"verified\" 7. Assign to team member 1. Create teams (Frontend, Backend, DevOps) 2. Assign members to teams 3. Create projects with team assignments 4. Configure project-specific scan policies 5. Review team activity in audit logs 1. Create project API token 2. Add scanner to CI pipeline 3. Configure CI workflow: 4. Review findings in web UI 5. Quality gate blocks merge if critical findings 1. Open audit logs page 2. Filter by date range and action type 3. Review member changes 4. Export audit trail for compliance 5. Generate security report"
  },
  "webhooks": {
    "headings": [
      "Webhooks",
      "Overview",
      "Supported Events",
      "Configuration",
      "Creating a Webhook",
      "Webhook Payload",
      "Authentication",
      "Delivery",
      "Delivery History",
      "API Endpoints",
      "Feature Flag"
    ],
    "content": "Webhooks send real-time notifications to external services when events occur in your workspace. 1. Go to **Webhooks** page 2. Click **Add Webhook** 3. Enter URL and secret 4. Select events to subscribe 5. Click **Create** Webhooks include a signature header: Verify with: View delivery status for each webhook: Webhooks require FEATURE_FLAG_WEBHOOKS=true (disabled by default)."
  },
  "welcome": {
    "headings": [
      "Welcome to SAST Integration",
      "Key Capabilities",
      "Quick Links",
      "How It Works",
      "Tech Stack",
      "Getting Started",
      "Clone the repository",
      "Install dependencies",
      "Set up environment",
      "Run database migrations",
      "Start development server"
    ],
    "content": "> Multi-scanner static application security testing platform with AI-powered false positive reduction. SAST Integration is a comprehensive security scanning platform that combines 6 scanner engines with LLM-based verification to deliver actionable security findings with minimal false positives. 1. **Connect** — Import repositories from GitHub, GitLab, or Gitea 2. **Scan** — Run multi-engine static analysis with 6 scanners 3. **Verify** — AI verifies findings and reduces false positives 4. **Report** — Generate PDF/XLSX security reports See the Installation Guide for detailed setup instructions."
  },
  "workspace-model": {
    "headings": [
      "Workspace Model",
      "Overview",
      "Hierarchy",
      "Workspace Structure",
      "Role Hierarchy",
      "Multi-Workspace",
      "Permission System",
      "Format",
      "Resources (18)",
      "Actions (9)",
      "Total Permissions: 36",
      "Feature Flags"
    ],
    "content": "SAST Integration uses a workspace-based multi-tenant architecture. Workspaces isolate data, members, and configurations. Users can belong to multiple workspaces: dashboard, repository, scan, finding, report, arena, member, team, project, integration, webhook, schedule, policy, scanner, ai_model, knowledge, workspace, audit view, manage, run, triage, override_ai, export, invite, settings, read Each workspace can have different features enabled:"
  },
  "workspace-permissions": {
    "headings": [
      "Workspace Permissions",
      "Overview",
      "Permission Architecture",
      "Page Guards",
      "Non-Feature-Flagged Pages",
      "Feature-Flagged Pages",
      "Sidebar Navigation",
      "API Route Permissions"
    ],
    "content": "Permissions are workspace-scoped. Each workspace member has a role that determines their access level. Every page uses layered guards: Every API route enforces permission checks:"
  }
};
