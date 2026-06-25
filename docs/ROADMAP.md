# Roadmap & Milestone Plan

**Purpose**: This document tracks the phased delivery of SAST Integration toward a production-ready thesis defense in June 2026.

**Current Status**: M5 (Projects, Repositories & SCM) is largely complete with all core features implemented and tested. The platform now supports full SCM integration, scanning pipeline, AI verification, and comprehensive UI with no fake data or stubs.

**Target**: v1.0.0 — Full thesis defense (June 2026)

---

## Milestone Overview

| Milestone | Version | Focus Area                          | Status     |
|-----------|---------|-------------------------------------|------------|
| M1        | v0.1.0  | Project Setup & Architecture        | ✅ Complete |
| M2        | v0.2.0  | Database Schema & Seeding (44 tables) | ✅ Complete |
| M3        | v0.3.0  | Authentication, Sessions & Security | ✅ Complete |
| M4        | v0.4.0  | Multi-Workspace Management & Collaboration | ✅ Complete |
| M5        | v0.5.0  | Projects, Repositories & SCM Integration | ✅ Complete |
| M6        | v0.6.0  | Scanning Pipeline & Queue Processing | ✅ Complete |
| M7        | v0.7.0  | Findings Management & AI Verification | ✅ Complete |
| M8        | v0.8.0  | Reporting, Dashboard & Notifications | ✅ Complete |
| M9        | v0.9.0  | Advanced RBAC, Teams & Audit        | ✅ Complete |
| M10       | v1.0.0  | Deployment, UAT & Thesis Defense    | In Progress |

---

## Milestone Details

### M5 — Projects, Repositories & SCM (v0.5.0) ✅ Complete

**Objective**: Deliver project management, repository import, and SCM provider integrations.

**Delivered**:
- Project CRUD API + UI with team assignment
- Repository management with SCM connection
- SCM provider integrations (GitHub, GitLab, Gitea)
- Repository import, sync, and webhook handling
- Source control test and send test event functionality

### M6 — Scanning Pipeline & Queue Processing (v0.6.0) ✅ Complete

**Objective**: Deliver reliable scanning execution with background processing.

**Delivered**:
- Multi-engine scanning (Semgrep, Gitleaks, Flawfinder, Cppcheck, Clang-Tidy, GCC Fanalyzer)
- Scan trigger, status tracking, and result parsing
- Quality gates with configurable thresholds
- Scheduled scans with cron expressions
- Scan upload for CI/CD integration

### M7 — Findings Management & AI Verification (v0.7.0) ✅ Complete

**Objective**: Deliver AI-powered finding verification with multi-model support.

**Delivered**:
- Finding list with filtering, sorting, and grouping
- AI verification pipeline with strict/balanced prompts
- CWE context enrichment from knowledge base
- Finding assignment, status updates, and comments
- AI model management (add, test, configure)
- Bulk findings operations

### M8 — Reporting, Dashboard & Notifications (v0.8.0) ✅ Complete

**Objective**: Deliver actionable reporting and dashboard analytics.

**Delivered**:
- Dashboard with stats, recent scans, attention required
- Report generation and export (PDF/XLSX)
- Activity logs and audit trail
- Notification system with unread count
- Workspace health monitoring

### M9 — Teams & RBAC (v0.9.0) ✅ Complete

**Objective**: Deliver advanced team structures and comprehensive audit.

**Delivered**:
- Team management with member assignment
- RBAC with 24 permissions across 4 roles
- Audit logs with workspace scoping
- Activity logs tracking
- Verification settings management

### M10 — Deployment, UAT & Thesis Defense (v1.0.0) In Progress

**Objective**: Production deployment readiness and thesis defense artifacts.

**Remaining**:
- Docker deployment configuration
- E2E testing for critical flows
- UAT with target users
- Thesis documentation and defense preparation
- Performance optimization
- Security audit

---

## Branching & Release Strategy

The project follows a disciplined trunk-based workflow with protected `main`:

- `main` — Production releases only (tagged)
- `dev` — Integration branch for all feature work
- `feature/*`, `fix/*` — Short-lived branches
- `release/vX.X.X` — Release preparation branches

All significant changes are delivered through well-documented Pull Requests that reference their originating Issue (see [CONTRIBUTING.md](../CONTRIBUTING.md) for standards).
