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

- **Multi-Engine SAST Scanning** — Integration with Semgrep, Gitleaks, Flawfinder, Cppcheck, Clang-Tidy, and GCC Fanalyzer.
- **AI-Assisted Verification** — QLoRA fine-tuned models to classify findings as True Positive / False Positive with per-model reasoning.
- **Multi-Workspace Architecture** — Isolated workspaces with granular RBAC (24 permissions across 4 roles: Owner, Manager, Reviewer, Member).
- **Self-Service & Invitation Workflows** — Personal workspace creation in multiple mode; email-based invitations with role assignment.
- **Production-Ready Hardening** — Strict environment validation, rejection of development secrets in production, and secure defaults.
- **SCM & CI Integration** — GitHub, GitLab, Gitea support with planned quality gates for PR blocking.
- **Reporting & Knowledge Base** — Exportable reports (PDF/XLSX) and integrated CWE/NVD knowledge base.
- **Operational Features** — Scheduled scans, webhooks, and audit-friendly member management.

---

## Workspace Operating Modes

The platform supports two distinct operating models, controlled by the `WORKSPACE_MODE` environment variable. This allows the same codebase to serve both single-organization and multi-tenant / open-registration scenarios.

| Mode       | Purpose                              | Key Behaviors |
|------------|--------------------------------------|---------------|
| `single`   | Single-organization / invite-only    | One shared organization workspace. Self-service signup and personal workspace creation are disabled. New users must be invited. The organization workspace is seeded during `pnpm db:seed`. |
| `multiple` | Multi-user / self-service            | Users can sign up freely and automatically receive a personal workspace. Additional access is granted via invitations to organization workspaces. |

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

The platform has completed milestones M1 through M9, covering project setup, database schema, authentication, workspace management, SCM integration, scanning pipeline, AI verification, reporting, and advanced RBAC. M10 (Deployment, UAT & Thesis Defense) is in progress.

| Milestone | Version | Status |
|-----------|---------|--------|
| M1: Project Setup | v0.1.0 | ✅ Complete |
| M2: Database & Schema (44 tables) | v0.2.0 | ✅ Complete |
| M3: Authentication & Sessions | v0.3.0 | ✅ Complete |
| M4: Workspace Management & Collaboration | v0.4.0 | ✅ Complete |
| M5: Projects, Repositories & SCM | v0.5.0 | ✅ Complete |
| M6: Scanning Pipeline & Queue Processing | v0.6.0 | ✅ Complete |
| M7: Findings Management & AI Verification | v0.7.0 | ✅ Complete |
| M8: Reporting, Dashboard & Notifications | v0.8.0 | ✅ Complete |
| M9: Advanced RBAC, Teams & Audit | v0.9.0 | ✅ Complete |
| M10: Deployment, UAT & Thesis Defense | v1.0.0 | In Progress |

For the detailed milestone breakdown and remaining scope, see [docs/ROADMAP.md](docs/ROADMAP.md).

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
docker compose exec app pnpm db:push
docker compose exec app pnpm db:seed

# 5. Access
#    App: http://localhost:3000
#    Login: owner@sast.local / ChangeMe123!
```

### Build with Scanners (for managed scans)

```bash
# Include Semgrep, Flawfinder, Cppcheck in Docker image
docker build --build-arg INCLUDE_SCANNERS=true -t sast-integration .
```

### Local Development

```bash
pnpm install
cp .env.example .env
pnpm db:push
pnpm db:seed
pnpm dev           # http://localhost:3000
```

### Default Credentials

```
Email: owner@sast.local
Password: ChangeMe123!
```

⚠️ **Production**: Override `OWNER_EMAIL` / `OWNER_PASSWORD` / `JWT_SECRET`. App rejects defaults in production.

### Testing

```bash
pnpm test          # Unit tests (Vitest)
pnpm test:ui       # E2E tests (Playwright)
pnpm lint          # ESLint
pnpm build         # Production build
```

---

## Documentation

| Doc | Description |
|-----|-------------|
| [DATABASE.md](docs/DATABASE.md) | Schema reference (44 tables) |
| [database.dbml](docs/database.dbml) | DBML schema file |
| [ROADMAP.md](docs/ROADMAP.md) | Version plan & milestones |
| [CONVENTIONS.md](docs/CONVENTIONS.md) | Coding standards |
| [PROJECT_STANDARDS.md](docs/PROJECT_STANDARDS.md) | Architecture & patterns |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker deployment |
| [STORAGE.md](docs/STORAGE.md) | Storage system (local, S3, Cloudinary) |
| [SCANNER.md](docs/SCANNER.md) | Scanner engine configuration |
| [TESTING.md](docs/TESTING.md) | Testing standards & patterns |
| [UI_UX_GUIDELINES.md](docs/UI_UX_GUIDELINES.md) | UI/UX component guidelines |
| [PERMISSIONS.md](docs/PERMISSIONS.md) | RBAC & feature flags |
| [FLOWS/](docs/FLOWS/) | User scenarios (15 features) |
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
