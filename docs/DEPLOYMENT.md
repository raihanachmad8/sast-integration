# Deployment Guide

## Development

```bash
pnpm install
pnpm dev
```

App runs at http://localhost:3000

---

## Docker

### Build & Run

```bash
docker-compose up -d
```

### docker-compose.yml

```yaml
services:
  app:
    build: .
    ports:
      - 3000:3000
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    ports:
      - 5432:5432
    environment:
      POSTGRES_DB: sast_integration
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: [CMD-SHELL, pg_isready -U postgres]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  pgdata:
```

### Dockerfile

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## Gitea + Actions Runner

Jalankan Gitea (Git server) + Gitea Actions Runner (CI executor) via Docker Compose terpisah.

### Quick Start

```bash
# 1. Pastikan .env punya RUNNER_TOKEN
#    Token didapat dari Gitea → Site Administration → Actions → Runners
echo "RUNNER_TOKEN=<your-token>" >> .env

# 2. Jalankan Gitea + Runner
docker compose -f docker-compose.runner.yml up -d

# 3. Akses Gitea
#    http://localhost:4000
```

### Architecture

```
┌─────────────────────────────────────────────────┐
│                 Docker Network                  │
│              (sast-integration_gitea-net)        │
│                                                 │
│  ┌──────────┐  ┌────────────┐  ┌─────────────┐ │
│  │ gitea-db │  │   gitea    │  │   runner    │ │
│  │ (postgres)│  │  :4000     │  │ (act_runner)│ │
│  └──────────┘  └────────────┘  └──────┬──────┘ │
│                                        │        │
│                              ┌─────────▼──────┐ │
│                              │  Job Container  │ │
│                              │  (ubuntu-latest)│ │
│                              │  clone via      │ │
│                              │  gitea:4000     │ │
│                              └────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Files

| File | Description |
|------|-------------|
| `docker-compose.runner.yml` | Compose Gitea + PostgreSQL + Runner |
| `runner-config.yaml` | Runner config (mounted ke container) |

### Key Configuration

**ROOT_URL** harus `http://localhost:4000` untuk akses browser. Runner sudah di-configure untuk override clone URL via `GITHUB_SERVER_URL=http://gitea:4000` di `runner-config.yaml`.

**Runner network** di-set ke `sast-integration_gitea-net` supaya job container satu network dengan Gitea.

### Troubleshooting

| Problem | Solution |
|---------|----------|
| Runner offline di admin panel | Cek `docker logs sast-gitea-runner` — pastikan registration token valid |
| `actions/checkout` gagal clone | Pastikan `runner-config.yaml` punya `GITHUB_SERVER_URL=http://gitea:4000` di `container.options` |
| ROOT_URL warning di Gitea | ROOT_URL harus `http://localhost:4000` — jangan diubah ke `gitea:4000` |
| Runner hilang setelah restart | Pastikan `gitea-runner-data` volume ter-mount di compose |
| Job container tidak bisa akses Gitea | Pastikan `container.network` di runner config = `sast-integration_gitea-net` |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| DATABASE_URL | Yes | — | PostgreSQL connection string |
| JWT_SECRET | Yes | — | Secret for JWT signing (jose). Must not be a default/example value in production |
| APP_URL | Yes | http://localhost:3000 | Application base URL. Must not be localhost in production |
| WORKSPACE_MODE | No | multiple | `single` = one org workspace, invitation-only; `multiple` = open self-signup + per-user workspaces |
| MAIL_PROVIDER | No | console | `console` (dev) or `smtp`. `console` is rejected in production |
| OWNER_EMAIL / OWNER_PASSWORD / OWNER_NAME | No* | owner@sast.local / ChangeMe123! / Owner | Bootstrap owner for `db:seed`. *Required (non-default) in production |
| ORG_NAME / ORG_SLUG | No | SAST Organization / sast-org | Seeded org workspace (single mode) |
| PORT | No | 3000 | Server port |
| NODE_ENV | No | development | Environment mode |
| LOG_LEVEL | No | info | Log level: debug, info, warn, error |
| RATE_LIMIT_ENABLED | No | true | Set to `false` to disable rate limiting (for testing/development) |
| NVD_API_KEY | No | — | NVD API key (optional but recommended — higher rate limits) |
| SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM | No* | localhost / 1025 / — / — / noreply@sast.local | SMTP config. *Required when `MAIL_PROVIDER=smtp` |
| SEMGREP_RULES_DIR | No | ./rules/semgrep | Custom Semgrep rules directory |
| FEATURE_FLAG_* | No | true | Feature flags (see `.env.example` for full list) |
| STORAGE_PROVIDER | No | local | File storage provider (`local`, `s3`, or `cloudinary`) — see [STORAGE.md](STORAGE.md) |
| S3_BUCKET / AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / S3_ENDPOINT | No* | sast-uploads / us-east-1 / — / — / — | S3/MinIO config. *Required when `STORAGE_PROVIDER=s3` |
| CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET / CLOUDINARY_FOLDER | No* | — / — / — / sast | Cloudinary config. *Required when `STORAGE_PROVIDER=cloudinary` |

> **Production hardening**: env validation fails fast on boot if `JWT_SECRET` is a known example value, `APP_URL` points to localhost, or `MAIL_PROVIDER=console`.

> **Note**: `REGISTRATION_MODE` was removed — registration is derived from `WORKSPACE_MODE` (single → invite-only, multiple → open).

> **Note**: This project uses custom JWT via `jose` for authentication and `pg-boss` for job queues (uses the same DATABASE_URL). No Redis or NextAuth required.

Copy `.env.example` to `.env` and fill in values.

---

## Database Migrations

```bash
# Generate migration from schema changes
pnpm db:generate

# Apply pending migrations
pnpm db:migrate

# Push schema directly (development only)
pnpm db:push

# Open Drizzle Studio
pnpm db:studio
```

---

## Health Check

```
GET /api/v1/health
```

Response:

```json
{ "success": true, "message": "OK", "data": { "status": "healthy", "version": "0.1.0" } }
```

---

## Queue Worker

Background job processing for scan execution uses pg-boss (PostgreSQL-based).
Workers are registered automatically on server startup via `src/instrumentation.ts`.

**Registered workers:**
- `parse-scan-result` — Parse raw scan output into findings
- `run-managed-scan` — Execute managed scan on repository
- `trigger-scheduled-managed-scan` — Trigger scheduled scans
- `ai-verify-finding` — AI verification of findings
- `cleanup-old-scan-files` — Cleanup old scan files from storage
- `nvd-knowledge-backfill` — Backfill NVD knowledge base
- `sync-source-control` — Sync repositories from source control (scheduled every 30 minutes)
- `scan-timeout-watchdog` — Detect and clean up timed-out scans (scheduled every 5 minutes)

> **Note:** Queue runs in-process with Next.js. No separate worker command needed. `sync-source-control` runs every 30 minutes and `scan-timeout-watchdog` runs every 5 minutes automatically.

---

## Production Checklist

- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] NODE_ENV=production
- [ ] JWT_SECRET is a strong random value (32+ chars)
- [ ] Health check returns 200
- [ ] HTTPS configured (reverse proxy)
- [ ] Rate limiting enabled
- [ ] Error monitoring connected (Sentry)
- [ ] Backup strategy for PostgreSQL
- [ ] Log aggregation configured