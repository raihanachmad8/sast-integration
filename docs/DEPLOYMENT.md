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

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| DATABASE_URL | Yes | — | PostgreSQL connection string |
| JWT_SECRET | Yes | — | Secret for JWT signing (jose). Must not be a default/example value in production |
| APP_URL | Yes | http://localhost:3000 | Application base URL. Must not be localhost in production |
| WORKSPACE_MODE | No | multiple | `single` = one org workspace, invitation-only; `multiple` = open self-signup + per-user workspaces |
| MAIL_PROVIDER | No | console | `console` (dev) or `smtp`. `console` is rejected in production |
| OWNER_EMAIL / OWNER_PASSWORD / OWNER_NAME | No* | admin@sast.local / ChangeMe123! / Owner | Bootstrap owner for `db:seed`. *Required (non-default) in production |
| ORG_NAME / ORG_SLUG | No | SAST Organization / sast-org | Seeded org workspace (single mode) |
| PORT | No | 3000 | Server port |
| NODE_ENV | No | development | Environment mode |
| STORAGE_PROVIDER | No | local | File storage provider |
| STORAGE_LOCAL_PATH | No | ./storage | Local file storage path |
| SCANNER_MODE | No | local | Scanner execution mode |
| SCANNER_TIMEOUT | No | 300000 | Scanner timeout in ms |

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

> **Note:** Queue runs in-process with Next.js. No separate worker command needed.

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