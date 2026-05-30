# Roadmap & Milestone Plan

**Purpose**: This document tracks the phased delivery of SAST Integration toward a production-ready thesis defense in June 2026.

**Current Status**: M4 (Workspace Management & Collaboration) is complete. The platform now supports secure multi-tenant workspace operations with granular permissions.

**Target**: v1.0.0 — Full thesis defense (June 2026)

---

## Milestone Overview

| Milestone | Version | Focus Area                          | Status     |
|-----------|---------|-------------------------------------|------------|
| M1        | v0.1.0  | Project Setup & Architecture        | ✅ Complete |
| M2        | v0.2.0  | Database Schema & Seeding (41 tables) | ✅ Complete |
| M3        | v0.3.0  | Authentication, Sessions & Security | ✅ Complete |
| M4        | v0.4.0  | Multi-Workspace Management & Collaboration | ✅ Complete |
| M5        | v0.5.0  | Projects, Repositories & SCM Integration | In Progress |
| M6        | v0.6.0  | Scanning Pipeline & Queue Processing | Planned |
| M7        | v0.7.0  | Findings Management & AI Verification | Planned |
| M8        | v0.8.0  | Reporting, Dashboard & Notifications | Planned |
| M9        | v0.9.0  | Advanced RBAC, Teams & Audit        | Planned |
| M10       | v1.0.0  | Deployment, UAT & Thesis Defense    | Target (June 2026) |

---

## Milestone Details

### M4 — Workspace Management & Collaboration (v0.4.0) ✅ Complete

**Objective**: Deliver a secure, production-hardened multi-workspace collaboration layer with self-service and invitation-based access patterns.

**Delivered**:
- Workspace CRUD API + UI (chooser, switcher, creation)
- `WORKSPACE_MODE` as single source of truth (`single` vs `multiple`)
- Member management (list, role change, remove) with strict ownership rules
- Invitation system with email delivery and acceptance flow
- Modular, env-aware seeding
- Production environment validation and security headers

### M5 — Projects, Repositories & SCM (In Progress)

- Project and repository management
- SCM provider integrations (GitHub, GitLab, Gitea)
- Repository import, sync, and webhook handling

### Upcoming Milestones (High-Level Purpose)

- **M6**: Reliable scanning execution pipeline with background processing and scheduling.
- **M7**: AI-powered finding verification with multi-model support and transparent reasoning.
- **M8**: Actionable reporting, dashboards, and external notifications.
- **M9**: Advanced team structures and comprehensive audit capabilities.
- **M10**: Production deployment readiness and thesis defense artifacts.

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

## Branching & Release Strategy

The project follows a disciplined trunk-based workflow with protected `main`:

- `main` — Production releases only (tagged)
- `dev` — Integration branch for all feature work
- `feature/*`, `fix/*` — Short-lived branches
- `release/vX.X.X` — Release preparation branches

All significant changes are delivered through well-documented Pull Requests that reference their originating Issue (see [CONTRIBUTING.md](../CONTRIBUTING.md) for standards).
