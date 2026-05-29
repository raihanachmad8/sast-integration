# Roadmap

## Current Version: v0.2.0 (done)

**Target**: v1.0.0 — Thesis Defense (June 2026)

---

## Version Plan

| Version | Timeline | Focus Area | Issues | Status |
|---------|----------|------------|--------|--------|
| v0.1.0 | Week 1 | Project Setup | 3 | ✅ Done |
| v0.2.0 | Week 2 | Database & Schema | 3 | ✅ Done |
| v0.3.0 | Week 3 | Auth & Session | 3 | ⏳ Planned |
| v0.4.0 | Week 4 | Workspace Management | 3 | ⏳ Planned |
| v0.5.0 | Week 5 | Projects & Repositories | 3 | ⏳ Planned |
| v0.6.0 | Week 6-7 | Scanning Pipeline | 5 | ⏳ Planned |
| v0.7.0 | Week 8-9 | Findings & AI Verification | 5 | ⏳ Planned |
| v0.8.0 | Week 10 | Reports & Dashboard | 3 | ⏳ Planned |
| v0.9.0 | Week 11 | Teams & RBAC | 3 | ⏳ Planned |
| v1.0.0 | Week 12 | Deployment & UAT | 3 | 🎯 Target |

**Total: 10 milestones, 34 issues, 12 weeks**

---

## Milestone Details

### v0.1.0 — Project Setup ✅

- [x] Next.js 16 + TypeScript + pnpm
- [x] Ant Design 6 with custom theme
- [x] Modular folder structure
- [x] Route group layouts
- [x] Base documentation

### v0.2.0 — Database & Schema ✅

- [x] Drizzle ORM + PostgreSQL setup
- [x] Core schemas (users, workspaces, teams, auth, RBAC)
- [x] Remaining schemas (41 tables total)
- [x] AI-informed schema (ai_verifications, ai_models, scan_policies, quality_gates)
- [x] Seed script (admin, permissions, roles)
- [x] Migration runner

### v0.3.0 — Auth & Session

- Auth API (signup/signin/signout with JWT)
- Auth UI (pages + middleware)
- Password reset & email verification

### v0.4.0 — Workspace Management

- Workspace CRUD & API
- Workspace UI (select, create, switch)
- Members & invitations

### v0.5.0 — Projects & Repositories

- Project CRUD & API
- SCM providers (GitHub, GitLab, Gitea)
- Repository import & sync

### v0.6.0 — Scanning Pipeline

- Scanner providers (Semgrep, Gitleaks, Flawfinder) + pg-boss queue
- Scan trigger & status UI + schedules
- Output parsing & findings storage + AI trigger
- Quality gates
- Scan policies

### v0.7.0 — Findings & AI Verification

- Finding list & detail UI (per-model AI cards)
- AI verification pipeline (multi-model, prompt presets)
- Comments, assignment & status
- AI models settings
- Knowledge base

### v0.8.0 — Reports & Dashboard

- Dashboard & charts
- Report generation & export
- Webhooks & notifications

### v0.9.0 — Teams & RBAC

- Teams & member management
- RBAC & permission enforcement (24 permissions)
- Audit logs & storage drivers

### v1.0.0 — Deployment & UAT

- Docker & deployment
- E2E testing
- UAT & thesis preparation

---

## Git Flow

```
main ──────────────────────────── tags: v0.1.0, v0.2.0, ... v1.0.0
  │                                ↑
  └── dev ─── merge feature PRs ─── release/vX.X.X ─── PR to main
        ↑         ↑         ↑
   feature/   feature/   feature/
```
