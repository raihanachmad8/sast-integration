# SAST Integration

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Ant Design](https://img.shields.io/badge/Ant%20Design-5-0170FE?logo=antdesign)
![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)

---

## Overview

**SAST Integration** is a web-based Static Application Security Testing platform that integrates open-source SAST engines into a unified dashboard. It provides automated code scanning, vulnerability management, and security reporting for development teams.

Built as a thesis project targeting defense in **June 2026**.

---

## Features (Planned)

- 🔍 Multi-engine SAST scanning (Semgrep, Bandit, etc.)
- 📊 Unified vulnerability dashboard
- 📋 Custom rule & policy management
- 🔗 CI/CD pipeline integration via webhooks
- 📄 Report generation (PDF, CSV)
- 👥 Multi-project & team support
- 📈 Trend analysis & metrics
- 🔐 Role-based access control

---

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Framework    | Next.js 15 (App Router)             |
| Language     | TypeScript 5                        |
| UI           | Ant Design 5                        |
| State        | TanStack Query                      |
| ORM          | Drizzle ORM                         |
| Database     | PostgreSQL 16                       |
| Auth         | NextAuth.js                         |
| Validation   | Zod                                 |
| Queue        | BullMQ + Redis                      |
| Testing      | Vitest + Playwright                 |
| Package Mgr  | pnpm                                |

---

## Project Status

| Metric          | Value                    |
|-----------------|--------------------------|
| Current Version | v0.1.0                   |
| Target          | v1.0.0 (June 2026)      |
| Stage           | Foundation & Setup       |

---

## Roadmap

| Version | Focus Area                        | Status     |
|---------|-----------------------------------|------------|
| v0.1.0  | Project setup, DB, auth           | 🟢 Current |
| v0.2.0  | SAST engine integration           | ⬜ Next    |
| v0.3.0  | Results dashboard                 | ⬜ Planned |
| v0.4.0  | Rule management                   | ⬜ Planned |
| v0.5.0  | CI/CD integration                 | ⬜ Planned |
| v1.0.0  | Thesis defense release            | 🎯 Target  |

Full roadmap: [docs/ROADMAP.md](docs/ROADMAP.md)

---

## Target Architecture

`	ext
┌─────────────────────────────────────────────────────┐
│                    Client (Browser)                   │
├─────────────────────────────────────────────────────┤
│              Next.js App Router (SSR/CSR)             │
├──────────┬──────────┬──────────┬────────────────────┤
│ Features │ Modules  │ Commons  │ App (Routes/API)    │
├──────────┴──────────┴──────────┴────────────────────┤
│                  Server Layer                         │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Services │  │ Repositories │  │ Queue Workers │  │
│  └────┬─────┘  └──────┬───────┘  └───────┬───────┘  │
│       │               │                  │           │
├───────┴───────────────┴──────────────────┴───────────┤
│          PostgreSQL          │        Redis           │
└──────────────────────────────┴───────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │   SAST Engines       │
                    │  (Semgrep, Bandit)   │
                    └─────────────────────┘
`

---

## Branch Flow

`	ext
main ─────────────────────────────── production releases
  └── develop ────────────────────── integration branch
        ├── feature/scan-engine ──── feature work
        ├── feature/dashboard ────── feature work
        └── fix/auth-redirect ────── bug fixes
`

- main: Tagged releases only
- develop: Integration & testing
- eature/*: New features (branch from develop)
- ix/*: Bug fixes (branch from develop)

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16
- Redis (optional, for queue)

### Setup

`ash
# Clone
git clone <repository-url>
cd sast-integration

# Install dependencies
pnpm install

# Environment setup
cp .env.example .env
# Edit .env with your database credentials

# Database setup
pnpm db:push        # Apply schema (development)
# or
pnpm db:migrate     # Run migrations (production)

# Start development server
pnpm dev
`

App available at http://localhost:3000

---

## Quality Checks

`ash
# Lint
pnpm lint

# Type check
pnpm type-check

# Build
pnpm build

# Test
pnpm test

# Test with coverage
pnpm test:coverage
`

---

## Deployment

`ash
# Docker (recommended)
docker-compose up -d

# Manual
pnpm build && pnpm start
`

Full deployment guide: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## Documentation

| Document                                        | Description              |
|-------------------------------------------------|--------------------------|
| [docs/PROJECT_STANDARDS.md](docs/PROJECT_STANDARDS.md) | Architecture & patterns |
| [docs/CONVENTIONS.md](docs/CONVENTIONS.md)      | Coding conventions       |
| [docs/ROADMAP.md](docs/ROADMAP.md)              | Version roadmap          |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)        | Deployment guide         |

---

## License

This project is part of a thesis research. All rights reserved.

---

## Author

**Thesis Project** — SAST Integration Platform  
Built with Next.js, TypeScript, and open-source SAST engines.