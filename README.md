# SAST Integration

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Ant Design](https://img.shields.io/badge/Ant%20Design-6-0170FE?logo=antdesign)
![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)

---

## Overview

**SAST Integration** is a web-based Static Application Security Testing platform with AI-powered verification. It integrates multiple SAST scanners (Semgrep, Gitleaks, Flawfinder) into a unified dashboard, with QLoRA fine-tuned LLMs verifying findings as True Positive or False Positive.

Built as a thesis project targeting defense in **June 2026**.

---

## Features

- 🔍 Multi-engine SAST scanning (Semgrep, Gitleaks, Flawfinder)
- 🤖 AI-powered finding verification (multi-model, per-model detail output)
- 📊 Unified vulnerability dashboard with analytics
- 🏢 Multi-workspace with RBAC (24 granular permissions, 4 roles)
- 🔗 SCM integration (GitHub, GitLab, Gitea)
- 📋 Scan policies & quality gates for PR blocking
- 📄 Report generation (PDF, XLSX)
- 👥 Teams & project management
- 🧠 Knowledge base (CWE, NVD, custom rules)
- 🔔 Webhooks & notifications
- ⏰ Scheduled recurring scans

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

## Project Status

| Milestone | Version | Status |
|-----------|---------|--------|
| M1: Project Setup | v0.1.0 | ✅ Done |
| M2: Database & Schema | v0.2.0 | ✅ Done |
| M3: Auth & Session | v0.3.0 | ✅ Done |
| M4: Workspace | v0.4.0 | ⏳ |
| M5: Projects & Repos | v0.5.0 | ⏳ |
| M6: Scanning Pipeline | v0.6.0 | ⏳ |
| M7: Findings & AI | v0.7.0 | ⏳ |
| M8: Reports & Dashboard | v0.8.0 | ⏳ |
| M9: Teams & RBAC | v0.9.0 | ⏳ |
| M10: Deployment & UAT | v1.0.0 | 🎯 Target |

See [docs/ROADMAP.md](docs/ROADMAP.md) for details.

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env.local

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

---

## Documentation

| Doc | Description |
|-----|-------------|
| [DATABASE.md](docs/DATABASE.md) | Schema reference (41 tables) |
| [ROADMAP.md](docs/ROADMAP.md) | Version plan & milestones |
| [CONVENTIONS.md](docs/CONVENTIONS.md) | Coding standards |
| [PROJECT_STANDARDS.md](docs/PROJECT_STANDARDS.md) | Architecture & patterns |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker deployment |

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
