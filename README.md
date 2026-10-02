# SAST Integration

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Ant Design](https://img.shields.io/badge/Ant%20Design-6-0170FE?logo=antdesign)
![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)

---

## Purpose

SAST Integration is a production-grade, multi-tenant Static Application Security Testing (SAST) platform designed for security teams and development organizations.

Its primary objective is to unify multiple SAST scanners, enrich findings with AI-powered verification (using fine-tuned LLMs), and provide a structured workflow for triage, collaboration, and reporting — all within a secure, role-based multi-workspace environment.

This project was developed as a thesis and is targeted for defense in **June 2026**.

---

## Core Capabilities

- **Multi-Engine SAST Scanning** — Integration with Semgrep, Gitleaks, Flawfinder, Cppcheck, Trivy, and SARIF-compatible tools.
- **AI-Assisted Verification** — QLoRA fine-tuned models to classify findings as True Positive / False Positive with per-model reasoning, confidence scoring, and CWE mapping.
- **Multi-Workspace Architecture** — Isolated workspaces with granular RBAC (24 permissions across 4 roles: Owner, Manager, Reviewer, Member).
- **Self-Service & Invitation Workflows** — Personal workspace creation in multiple mode; email-based invitations with role assignment.
- **Production-Ready Hardening** — Strict environment validation, rejection of development secrets in production, and secure defaults.
- **SCM & CI Integration** — GitHub, GitLab, Gitea support with dual-flow architecture (external CI uploads + managed SCM scanning).
- **Scan Policies & Quality Gates** — Reusable scan configurations with scanner selection, AI toggle, severity thresholds, and pass/fail quality gate evaluation.
- **Team Management** — Create teams, assign members, link teams to projects for organized security ownership.
- **Knowledge Base** — Integrated CWE/NVD knowledge sources for enriched AI verification context.
- **Reporting & Export** — Exportable reports (PDF/XLSX/CSV) with AI verdict summaries, executive summaries, and compliance exports.
- **Scheduled Scans** — Cron-based recurring scan execution with timezone support.
- **Operational Features** — 30-day retention cleanup, webhooks, audit logs, and activity feeds.

---

## Workspace Operating Modes

The platform supports two distinct operating models, controlled by the `WORKSPACE_MODE` environment variable. This allows the same codebase to serve both single-organization and multi-tenant / open-registration scenarios.

| Mode       | Purpose                              | Key Behaviors |
|------------|--------------------------------------|---------------|
| `single`   | Single-organization / invite-only    | One shared organization workspace. Self-service signup and personal workspace creation are disabled. New users must be invited. The organization workspace is seeded during `pnpm db:seed`. |
| `multiple` | Multi-user / self-service            | Users can sign up freely and create their own personal workspace on first visit to `/workspaces`. Additional access is granted via invitations to organization workspaces. |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | Ant Design 6 |
| ORM | Drizzle ORM |
| Database | PostgreSQL 16 |
| Auth | JWT (jose + bcryptjs) |
| Validation | Zod |
| Queue | pg-boss |
| AI | QLoRA fine-tuned models (Ollama / OpenAI-compatible) |
| Testing | Vitest + Playwright |
| Package Mgr | pnpm |

---

## Current Status

The platform has completed the foundational architecture, the complete multi-workspace collaboration layer (M4), and the dual-flow scanning foundation (M5).

| Milestone | Version | Status |
|-----------|---------|--------|
| M1: Project Setup | v0.1.0 | ✅ Complete |
| M2: Database & Schema (43 tables) | v0.2.0 | ✅ Complete |
| M3: Authentication & Sessions | v0.3.0 | ✅ Complete |
| M4: Workspace Management & Collaboration | v0.4.0 | ✅ Complete |
| M5: Projects, Repositories & SCM (Dual-Flow) | v0.5.0 | ✅ Complete |
| M6: Scanning Pipeline & Queue Processing | v0.6.0 | Planned |
| M7: Findings Management & AI Verification | v0.7.0 | Planned |
| M8: Reporting, Dashboard & Notifications | v0.8.0 | Planned |
| M9: Advanced RBAC, Teams & Audit | v0.9.0 | Planned |
| M10: Deployment, UAT & Thesis Defense | v1.0.0 | Target (June 2026) |

For the detailed milestone breakdown and remaining scope, see [docs/ROADMAP.md](docs/ROADMAP.md).

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env

# Database
pnpm db:push       # Create tables
pnpm db:seed       # Seed owner + permissions (+ org workspace in single mode)

# Development
pnpm dev           # http://localhost:3000
pnpm db:studio     # Drizzle Studio
```

### Default Credentials

```
Email: admin@sast.local
Password: ChangeMe123!
```

Override via `OWNER_EMAIL` / `OWNER_PASSWORD` env vars. Production rejects defaults.

### Testing

```bash
pnpm test            # Unit tests (Vitest)
pnpm test:coverage   # Unit tests with coverage report (target: ≥80% for server modules)
pnpm test:e2e        # E2E API tests (Vitest)
pnpm test:ui         # E2E UI tests (Playwright)
pnpm test:ui:headed  # Playwright in headed mode (visible browser)
pnpm lint            # ESLint
pnpm build           # Production build
```

See [docs/TESTING.md](docs/TESTING.md) for testing standards and conventions.

---

## Documentation

| Doc | Description |
|-----|-------------|
| [DATABASE.md](docs/DATABASE.md) | Schema reference (43 tables) |
| [ROADMAP.md](docs/ROADMAP.md) | Version plan & milestones |
| [CONVENTIONS.md](docs/CONVENTIONS.md) | Coding standards |
| [PROJECT_STANDARDS.md](docs/PROJECT_STANDARDS.md) | Architecture & patterns |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker deployment |
| [TESTING.md](docs/TESTING.md) | Testing standards & conventions |
| [UI_UX_GUIDELINES.md](docs/UI_UX_GUIDELINES.md) | UI/UX design standards |
| [FLOW.md](docs/FLOW.md) | Feature flow diagrams |
| [SCANNER_SETUP.md](docs/SCANNER_SETUP.md) | Scanner installation per OS |
| [SCANNER_ARCHITECTURE.md](docs/SCANNER_ARCHITECTURE.md) | Scan execution architecture |
| [SCAN-FLOW-SEQUENCE.md](docs/SCAN-FLOW-SEQUENCE.md) | Sequence diagrams for scan flows |
| [managed-scanning-and-scanner-policies.md](docs/managed-scanning-and-scanner-policies.md) | Dual-flow architecture |
| [dual-flow-architecture-cheatsheet.md](docs/dual-flow-architecture-cheatsheet.md) | One-page dual-flow reference |
| [upload-api.md](docs/upload-api.md) | External CI upload API |
| [queue.md](docs/queue.md) | Background queue system |

---

## AI Verification (Research)

The AI verification pipeline uses QLoRA fine-tuned models:

| Model | Prompt | Accuracy |
|-------|--------|----------|
| Qwen2.5-Coder-SVA | strict | 90% (detail) / 100% (verdict) |
| Llama3-SVA | strict | 88% (detail) |

Each finding is verified by multiple models independently, producing:
- Verdict (TP/FP) with confidence score
- Data flow analysis
- Taint source identification
- CWE mapping
- Remediation suggestion

See `research/sast-integration/REPORT.md` for full research report.

---

## License

This project is part of an undergraduate thesis. All rights reserved.
