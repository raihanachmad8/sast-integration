# Roadmap

## Current Version: v0.1.0

**Target**: v1.0.0 — Thesis Defense (June 2026)

---

## Version Plan

| Version | Timeline | Focus Area | Status |
|---------|----------|------------|--------|
| v0.1.0 | Week 1 | Project Setup | 🟢 Current |
| v0.2.0 | Week 2 | Database & Schema | ⬜ Planned |
| v0.3.0 | Week 3 | Auth & Session | ⬜ Planned |
| v0.4.0 | Week 4 | Workspace Management | ⬜ Planned |
| v0.5.0 | Week 5 | Projects & Repositories | ⬜ Planned |
| v0.6.0 | Week 6-7 | Scanning Pipeline | ⬜ Planned |
| v0.7.0 | Week 8-9 | Findings & AI Verification | ⬜ Planned |
| v0.8.0 | Week 10 | Reports & Dashboard | ⬜ Planned |
| v0.9.0 | Week 11 | Teams & RBAC | ⬜ Planned |
| v1.0.0 | Week 12 | Deployment & UAT | 🎯 Target |

---

## Milestone Details

### v0.1.0 — Project Setup (Week 1) 🟢

- Initialize Next.js + TypeScript project
- Configure ESLint, Prettier, project structure
- Set up Drizzle ORM + PostgreSQL connection
- Define workspace folder conventions
- Create documentation scaffolding

### v0.2.0 — Database & Schema (Week 2)

- Design and implement full database schema
- Set up Drizzle migrations workflow
- Seed data for development
- Database utility functions

### v0.3.0 — Auth & Session (Week 3)

- Custom JWT authentication (jose)
- Login / Register flows
- Session management middleware
- Protected route guards

### v0.4.0 — Workspace Management (Week 4)

- Workspace CRUD operations
- Workspace settings and configuration
- Member invitation flow

### v0.5.0 — Projects & Repositories (Week 5)

- Project creation and management
- Repository connection (Git integration)
- File browsing and source viewing

### v0.6.0 — Scanning Pipeline (Week 6-7)

- SAST engine integration (Semgrep)
- Scan job queue (pg-boss)
- Scan execution and result collection
- Scan history and status tracking

### v0.7.0 — Findings & AI Verification (Week 8-9)

- Vulnerability findings display
- AI-powered false positive detection
- Finding triage workflow
- Severity classification

### v0.8.0 — Reports & Dashboard (Week 10)

- Dashboard with scan metrics
- Report generation (PDF/CSV)
- Trend analysis and charts

### v0.9.0 — Teams & RBAC (Week 11)

- Role-based access control
- Team management
- Permission enforcement across features

### v1.0.0 — Deployment & UAT (Week 12)

- Production deployment setup
- User acceptance testing
- Final documentation
- **Thesis Defense: June 2026**

---

## Milestone Tracking

Detailed milestones and cross-project goals are tracked at workspace level:

📎 [Workspace Milestones](../../../milestones/MILESTONES.md)

---

## Versioning Strategy

- Follow [Semantic Versioning](https://semver.org/)
- Each minor version = one thesis chapter deliverable
- Patch versions for bug fixes within a milestone
- Tag releases on main branch