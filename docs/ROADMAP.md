# Roadmap & Milestone Plan

**Purpose**: This document tracks the phased delivery of SAST Integration toward a production-ready thesis defense in June 2026.

**Current Status**: Workspace Management & Collaboration is complete. The platform now supports secure multi-tenant workspace operations with granular permissions.

**Target**: v1.0.0 — Full thesis defense (June 2026)

---

## Milestone Overview

| Milestone | Version | Focus Area                          | Status     |
|-----------|---------|-------------------------------------|------------|
| M1        | v0.1.0  | Project Setup & Architecture        | ✅ Complete |
| M2        | v0.2.0  | Database Schema & Seeding (41 tables) | ✅ Complete |
| M3        | v0.3.0  | Authentication, Sessions & Security | ✅ Complete |
| M4        | v0.4.0  | Multi-Workspace Management & Collaboration | ✅ Complete |
| Dual-Flow & SCM | v0.5.0  | Projects, Repositories & SCM Integration | In Progress |
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

### Projects, Repositories & SCM — Dual Flow Support (In Progress)

**Major Deliverables:**
- Project + Repository CRUD with workspace scoping
- `connection_type` on repositories (`'scm'` | `'external'`)
- External repositories auto-created on first CI upload (no SCM required)
- Project API Tokens (scoped, revocable, auditable via `scan_uploads`)
- Dual-auth upload endpoint (`/scans/upload`) with multi-scanner support
- Full parser suite (Semgrep, Cppcheck via fast-xml-parser, Gitleaks, Trivy, Flawfinder, basic SARIF)
- Finding deduplication via `finding_groups` + stable fingerprint
- Object storage abstraction (Local / S3+MinIO / Cloudinary) + hybrid sync/async parsing
- 30-day retention cleanup job (with manual trigger + dry-run)
- `SUPPORTED_SCANNERS` + `validateScanners()` as single source of truth (ready for future policies)

**See the central architecture document:** [docs/managed-scanning-and-scanner-policies.md](./managed-scanning-and-scanner-policies.md)

**Quick reference:** [Dual-Flow Architecture Cheat Sheet](./dual-flow-architecture-cheatsheet.md)

This milestone established the dual-flow foundation (External CI uploads today + Managed SCM scanning tomorrow).

### Upcoming Milestones (High-Level Purpose)

- Reliable scanning execution pipeline with background processing and scheduling.
- AI-powered finding verification with multi-model support and transparent reasoning.
- Actionable reporting, dashboards, and external notifications.
- Advanced team structures and comprehensive audit capabilities.
- Production deployment readiness and thesis defense artifacts.

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
