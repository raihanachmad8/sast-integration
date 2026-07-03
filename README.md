# SAST Integration

![Next.js](https://img.shields.io/badge/Next.js-16.2.9-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Ant Design](https://img.shields.io/badge/Ant%20Design-6.4.5-0170FE?logo=antdesign)
![Drizzle](https://img.shields.io/badge/Drizzle%20ORM-0.45.2-C5F74F?logo=drizzle)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)

---

## Purpose

SAST Integration is a production-grade, multi-tenant Static Application Security Testing (SAST) platform designed for security teams and development organizations.

Its primary objective is to unify multiple SAST scanners, enrich findings with AI-powered verification (using fine-tuned LLMs), and provide a structured workflow for triage, collaboration, and reporting — all within a secure, role-based multi-workspace environment.

This project was developed as a thesis.

---

## Core Capabilities

- **Multi-Engine SAST Scanning** — Integration with Semgrep, Gitleaks, Flawfinder, Cppcheck, Clang-Tidy, and GCC Fanalyzer.
- **AI-Assisted Verification** — QLoRA fine-tuned models to classify findings as True Positive / False Positive with per-model reasoning.
- **Multi-Workspace Architecture** — Isolated workspaces with granular RBAC (39 permissions across 19 resources, 4 roles: Owner, Manager, Reviewer, Member).
- **Self-Service & Invitation Workflows** — Personal workspace creation in multiple mode; email-based invitations with role assignment.
- **Production-Ready Hardening** — Strict environment validation, rejection of development secrets in production, and secure defaults.
- **SCM & CI Integration** — GitHub, GitLab, Gitea support with quality gates for PR blocking.
- **Reporting & Knowledge Base** — Exportable reports (PDF/XLSX) and integrated CWE/NVD knowledge base.
- **Operational Features** — Scheduled scans, webhooks, and audit-friendly member management.

---

## Workspace Operating Modes

The platform supports two distinct operating models, controlled by the `NEXT_PUBLIC_WORKSPACE_MODE` environment variable.

| Mode       | Purpose                              | Key Behaviors |
|------------|--------------------------------------|---------------|
| `single`   | Single-organization / invite-only    | One shared organization workspace. Self-service signup and personal workspace creation are disabled. New users must be invited. The organization workspace is seeded during `pnpm db:seed`. |
| `multiple` | Multi-user / self-service            | Users can sign up freely and automatically receive a personal workspace. Additional access is granted via invitations to organization workspaces. |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.9 |
| Language | TypeScript (strict) | 5 |
| UI | React | 19.2.7 |
| Component Library | Ant Design | 6.4.5 |
| ORM | Drizzle ORM | 0.45.2 |
| Database | PostgreSQL | 16 |
| Auth | JWT (jose) + bcryptjs | — |
| Validation | Zod | 4.4.3 |
| Queue | pg-boss | 12.23.0 |
| AI | QLoRA fine-tuned models (Ollama / OpenAI-compatible) | — |
| Testing | Vitest + Playwright | — |
| Container | Docker (Alpine Linux) | — |
| Package Mgr | pnpm | 10+ |
| Node.js | — | 22+ |

---

## Thesis Scope

This project was developed as an undergraduate thesis. The thesis scope covers **9 core features** with **32 relevant database tables** (out of 41 total):

| Feature | Description | Key Tables |
|---------|-------------|------------|
| **Member** | Workspace membership & user management | `users`, `sessions`, `workspace_members` |
| **Team** | Team creation & member assignment | `teams`, `team_members` |
| **Project** | Project organization & environments | `projects`, `project_members`, `project_teams` |
| **Source Control** | SCM provider connections (GitHub, GitLab, Gitea) | `source_controls`, `source_control_repositories` |
| **Repository** | Repository import & management | `repositories`, `source_control_imports` |
| **Scan** | Multi-engine SAST scanning & upload | `scans`, `scan_results`, `scan_uploads` |
| **Finding** | Finding management, triage & history | `findings`, `finding_groups`, `finding_history` |
| **AI** | AI model config & TP/FP verification | `ai_models`, `ai_verifications` |
| **Knowledge View** | CWE/NVD knowledge base (read-only) | `knowledge_sources`, `knowledge_entries` |

The remaining features (webhooks, schedules, quality gates, reports, dashboard, etc.) exist as optional extensions and are not part of the thesis defense scope.

---

## Quick Start

### Docker (Recommended)

```bash
# 1. Clone and configure
git clone <repo-url> && cd sast-integration
cp .env.example .env

# 2. Edit .env — set these values:
#    DATABASE_URL=postgresql://user:pass@host:5432/dbname
#    JWT_SECRET=<random-32+chars>
#    OWNER_EMAIL=<your-email>
#    OWNER_PASSWORD=<secure-password>

# 3. Build and start
docker compose up -d

# 4. Initialize database
docker compose exec app pnpm db:reset

# 5. Access
#    App: http://localhost:3000
#    Login: owner@sast.local / ChangeMe123!
```

### Build with Scanners (for managed scans)

```bash
# Include Semgrep, Flawfinder, Cppcheck, Clang-Tidy, GCC, Gitleaks in Docker image
docker build --build-arg INCLUDE_SCANNERS=true -t sast-integration .
```

### Local Development

```bash
pnpm install
cp .env.example .env
pnpm db:reset       # Drop → push schema → seed data
pnpm dev            # http://localhost:3000
```

### Default Credentials

```
Email: owner@sast.local
Password: ChangeMe123!
```

⚠️ **Production**: Override `OWNER_EMAIL` / `OWNER_PASSWORD` / `JWT_SECRET`. App rejects defaults in production.

### Available Scripts

```bash
# Development
pnpm dev                    # Start dev server (http://localhost:3000)
pnpm build                  # Production build
pnpm build:prod             # CSS compile + production build
pnpm start                  # Start production server
pnpm lint                   # ESLint check

# Testing
pnpm test                   # Unit tests (Vitest)
pnpm test:e2e               # API end-to-end tests
pnpm test:ui                # Playwright UI tests (headless)
pnpm test:ui:headed         # Playwright UI tests (headed)
pnpm test:watch             # Watch mode
pnpm test:coverage          # Coverage report
pnpm test:all               # Unit + E2E

# Database
pnpm db:generate            # Generate migration from schema changes
pnpm db:migrate             # Run pending migrations
pnpm db:push                # Push schema directly (dev only)
pnpm db:reset               # Drop → push → seed
pnpm db:seed                # Seed default data only
pnpm db:studio              # Open Drizzle Studio GUI

# Utilities
pnpm backfill:nvd           # Backfill NVD knowledge base
pnpm docs:index             # Generate search index for docs
```

---

## Documentation

### User Guide
| Doc | Description |
|-----|-------------|
| [User Guide](docs/site/) | Enterprise user documentation — login, roles, features, workflows |

### Developer Docs
| Doc | Description |
|-----|-------------|
| [DATABASE.md](docs/DATABASE.md) | Schema reference (41 tables, 32 thesis-relevant) |
| [database.dbml](docs/database.dbml) | DBML schema file |
| [ROADMAP.md](docs/ROADMAP.md) | Version plan & milestones |
| [CONVENTIONS.md](docs/CONVENTIONS.md) | Coding standards |
| [PROJECT_STANDARDS.md](docs/PROJECT_STANDARDS.md) | Architecture & patterns |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker deployment |
| [INSTALLATION.md](docs/INSTALLATION.md) | Environment setup & installation |
| [SCANNER_INSTALLATION.md](docs/SCANNER_INSTALLATION.md) | Scanner engine setup |
| [ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md) | Environment variable reference |
| [API_OVERVIEW.md](docs/API_OVERVIEW.md) | REST API documentation |
| [STORAGE.md](docs/STORAGE.md) | Storage system (local, S3, Cloudinary) |
| [SCANNER.md](docs/SCANNER.md) | Scanner engine configuration |
| [TESTING.md](docs/TESTING.md) | Testing standards & patterns |
| [UI_UX_GUIDELINES.md](docs/UI_UX_GUIDELINES.md) | UI/UX component guidelines |
| [PERMISSIONS.md](docs/PERMISSIONS.md) | RBAC & feature flags |
| [SECURITY.md](docs/SECURITY.md) | Security architecture, auth & data protection |
| [FLOWS/](docs/FLOWS/) | User scenarios (17 features) |
| [API Reference](docs/api/) | Endpoint documentation (22 modules) |
| [CLAUDE.md](CLAUDE.md) | AI agent project rules |
| [AGENTS.md](AGENTS.md) | AI agent standards & conventions |

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

---

## License

This project is part of an undergraduate thesis. All rights reserved.
