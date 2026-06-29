---
title: Installation
description: Step-by-step installation guide for SAST Integration
---

# Installation

## Prerequisites

| Requirement | Version | Purpose |
|------------|---------|---------|
| Node.js | 22+ | Runtime |
| pnpm | 10+ | Package manager |
| PostgreSQL | 16 | Database |
| Git | 2.x | Repository cloning |
| Docker | 24+ | Container runtime (optional) |

## Quick Start

```mermaid
flowchart TD
    A["git clone"] --> B["pnpm install"]
    B --> C["cp .env.example .env"]
    C --> D["Configure DATABASE_URL"]
    D --> E["pnpm db:reset"]
    E --> F["pnpm dev"]
    F --> G["http://localhost:3000"]

    style A fill:#4a9eff,color:#fff
    style E fill:#22c55e,color:#fff
    style G fill:#f59e0b,color:#fff
```

### Step 1: Clone and Install

```bash
git clone https://github.com/your-org/sast-integration.git
cd sast-integration
pnpm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Database (required)
DATABASE_URL=postgresql://postgres:root@localhost:5432/sast_db

# Auth (required — minimum 32 characters)
JWT_SECRET=your-secret-key-minimum-32-characters-long!!

# App
NODE_ENV=development
PORT=3000

# Owner account (created on first seed)
OWNER_EMAIL=admin@yourdomain.com
OWNER_PASSWORD=SecurePassword123!

# Workspace mode
# single = one shared org workspace (invite-only)
# multiple = users self-signup + create workspaces (default)
WORKSPACE_MODE=multiple
```

### Step 3: Setup Database

```bash
# Full reset: drop all tables → push schema → seed data
pnpm db:reset
```

This creates the database schema and seeds:
- Default permissions and roles
- Owner user account
- Organization workspace (in single mode)

### Step 4: Start Development

```bash
pnpm dev
```

Access at **http://localhost:3000**.

## Scanner Dependencies

All scanners are optional — install what you need:

| Scanner | Purpose | Install |
|---------|---------|---------|
| **Semgrep** | Multi-language (30+) SAST | `pip install semgrep` |
| **Gitleaks** | Secret detection | [Download binary](https://github.com/gitleaks/gitleaks/releases) |
| **Flawfinder** | C/C++ pattern matching | `pip install flawfinder` |
| **Cppcheck** | C/C++ static analysis | `apt install cppcheck` / `brew install cppcheck` |
| **Clang-Tidy** | C/C++ linting | `apt install clang-tidy` / `brew install llvm` |
| **GCC FanAnalyzer** | C/C++ data flow | Requires GCC 10+ |

```bash
# Linux (Ubuntu/Debian)
sudo apt install cppcheck clang-tidy gcc

# macOS
brew install cppcheck llvm gcc

# Docker (Alpine — included in image with INCLUDE_SCANNERS=true)
# Already installed: semgrep, flawfinder, cppcheck, clang-tidy, gcc, gitleaks
```

## Docker Installation

### Build Image

```bash
# Standard build
docker build -t sast-integration .

# Build with all scanners included
docker build --build-arg INCLUDE_SCANNERS=true -t sast-integration .
```

### Run Container

```bash
# Run with .env file (recommended)
docker run -d --name sast-app -p 3000:3000 --sysctl net.ipv6.conf.all.disable_ipv6=1 --restart unless-stopped --env-file .env sast-integration
```

> **Important:** The `--sysctl net.ipv6.conf.all.disable_ipv6=1` flag fixes DNS resolution timeouts with external PostgreSQL providers (Neon, Supabase). See [Docker Networking](../../DEPLOYMENT.md#docker-networking) for details.

### Docker Compose

```bash
docker compose up -d
docker compose logs -f app
```

## Available Commands

```bash
# Development
pnpm dev                    # Start dev server (http://localhost:3000)
pnpm build                  # Production build
pnpm start                  # Start production server
pnpm lint                   # ESLint check

# Testing
pnpm test                   # Unit tests (Vitest)
pnpm test:e2e               # API end-to-end tests
pnpm test:ui                # Playwright UI tests (headless)
pnpm test:ui:headed         # Playwright UI tests (headed)

# Database
pnpm db:generate            # Generate migration from schema changes
pnpm db:migrate             # Run pending migrations
pnpm db:push                # Push schema directly (dev only)
pnpm db:reset               # Drop → push → seed
pnpm db:seed                # Seed default data only
pnpm db:studio              # Open Drizzle Studio GUI
```

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/sast_db` |
| `JWT_SECRET` | Secret for JWT tokens (min 32 chars) | `<random-32+ chars>` |
| `NODE_ENV` | Environment mode | `development` / `production` |
| `OWNER_EMAIL` | Admin email for initial seed | `admin@domain.com` |
| `OWNER_PASSWORD` | Admin password | `<secure-password>` |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Application port |
| `WORKSPACE_MODE` | `multiple` | `single` or `multiple` |
| `MAIL_PROVIDER` | `console` | `console` or `smtp` |
| `STORAGE_PROVIDER` | `local` | `local`, `s3`, or `cloudinary` |

See [Environment Variables Reference](../reference/environment-variables.md) for the complete list.

## Verify Installation

```bash
# Check health endpoint
curl http://localhost:3000/api/v1/health

# Expected response
{
  "success": true,
  "message": "OK",
  "data": {
    "status": "healthy"
  }
}
```
