---
title: Quick Reference
description: Quick reference card for commands, APIs, and configuration
---

# Quick Reference

## CLI Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | API end-to-end tests |
| `pnpm test:ui` | Playwright UI tests |
| `pnpm db:reset` | Reset database (drop → push → seed) |
| `pnpm db:push` | Push schema changes |
| `pnpm db:studio` | Open Drizzle Studio |

## Docker Commands

```bash
# Build
docker build -t sast-integration .
docker build --build-arg INCLUDE_SCANNERS=true -t sast-integration .

# Run
docker run -d --name sast-app -p 3000:3000 --sysctl net.ipv6.conf.all.disable_ipv6=1 --env-file .env sast-integration

# Logs
docker logs -f sast-app

# Stop
docker rm -f sast-app

# Compose
docker compose up -d
docker compose logs -f app
docker compose down
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/signup` | Create account |
| POST | `/api/v1/auth/signin` | Sign in |
| POST | `/api/v1/auth/signout` | Sign out |
| POST | `/api/v1/auth/refresh` | Refresh tokens |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Reset password |

### Scans

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/scans` | List scans |
| POST | `/api/v1/scans` | Trigger scan |
| GET | `/api/v1/scans/:id` | Get scan detail |

### Findings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/findings` | List findings |
| PATCH | `/api/v1/findings/:id` | Update finding |
| POST | `/api/v1/findings/:id/verify` | Re-verify with AI |

## Key Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_SECRET` | — | Secret for JWT tokens (min 32 chars) |
| `PORT` | `3000` | Application port |
| `WORKSPACE_MODE` | `multiple` | `single` or `multiple` |
| `STORAGE_PROVIDER` | `local` | `local`, `s3`, or `cloudinary` |

## Roles & Permissions

| Role | Level | Key Permissions |
|------|-------|-----------------|
| Owner | 4 | All 39 permissions |
| Manager | 3 | All 39 permissions (same as Owner) |
| Reviewer | 2 | View + Triage + Run |
| Member | 1 | View only |
