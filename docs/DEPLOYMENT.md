# Deployment Guide

## Development

```bash
pnpm install
pnpm dev
```

App runs at http://localhost:3000

---

## Docker Deployment Options

### Option 1: Docker Run (Simplest)

```bash
# Build image
docker build -t sast-integration .

# Run with .env file
docker run -d --name sast-app -p 3000:3000 --env-file .env sast-integration

# Run with inline env vars
docker run -d --name sast-app -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/dbname" \
  -e JWT_SECRET="your-32-char-secret-here" \
  -e APP_URL="https://your-domain.com" \
  -e NEXT_PUBLIC_APP_URL="https://your-domain.com" \
  -e NEXT_PUBLIC_API_URL="https://your-domain.com/api/v1" \
  sast-integration

# Run with host network (for local PostgreSQL)
docker run -d --name sast-app --network host --env-file .env sast-integration

# Run with scanners
docker build --build-arg INCLUDE_SCANNERS=true -t sast-integration .
docker run -d --name sast-app -p 3000:3000 --env-file .env sast-integration
```

### Option 2: Docker Compose

```bash
# Simple (external database)
docker compose up -d

# With local PostgreSQL
docker compose -f docker-compose.yml up -d
```

### Option 3: Manual Docker Commands

```bash
# Build
docker build -t sast-integration .

# Create network
docker network create sast-network

# Run PostgreSQL (if local)
docker run -d --name sast-db \
  --network sast-network \
  -e POSTGRES_DB=sast_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16-alpine

# Run app
docker run -d --name sast-app \
  --network sast-network \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:postgres@db:5432/sast_db" \
  -e JWT_SECRET="your-secret-key-minimum-32-characters" \
  -e APP_URL="http://localhost:3000" \
  -e NEXT_PUBLIC_APP_URL="http://localhost:3000" \
  -e NEXT_PUBLIC_API_URL="http://localhost:3000/api/v1" \
  sast-integration
```

---

## Environment Variables

### Required

| Variable | Example | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | PostgreSQL connection string |
| `JWT_SECRET` | `random-32+chars` | JWT signing secret |
| `APP_URL` | `https://your-domain.com` | Server-side app URL |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` | Client-side app URL |
| `NEXT_PUBLIC_API_URL` | `https://your-domain.com/api/v1` | Client-side API URL |
| `OWNER_EMAIL` | `admin@domain.com` | Initial owner email |
| `OWNER_PASSWORD` | `secure-password` | Initial owner password |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `WORKSPACE_MODE` | `multiple` | `single` or `multiple` |
| `MAIL_PROVIDER` | `console` | `console` or `smtp` |
| `NVD_API_KEY` | — | NVD API key |
| `STORAGE_PROVIDER` | `local` | `local`, `s3`, `cloudinary` |
| `APP_MEMORY_LIMIT` | `1G` | Docker memory limit |
| `APP_CPU_LIMIT` | `1` | Docker CPU limit |

### Override Environment Variables

```bash
# Override single variable
docker run -e DATABASE_URL="new-url" sast-integration

# Override from file
docker run --env-file .env.prod sast-integration

# Override multiple variables
docker run \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="new-secret" \
  -e APP_URL="https://prod.domain.com" \
  sast-integration
```

### .env File Example

```bash
# .env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-secret-key-minimum-32-characters
APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com/api/v1
OWNER_EMAIL=admin@yourdomain.com
OWNER_PASSWORD=secure-password
```

---

## Cloud Database

### Neon

```bash
DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```

**Notes:**
- Use `sslmode=require` (not `verify-full`) for Docker compatibility
- Neon free tier pauses after inactivity

### Supabase

```bash
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
```

---

## Production Checklist

- [ ] `DATABASE_URL` set to production database
- [ ] `JWT_SECRET` is a strong random value (32+ chars)
- [ ] `APP_URL` points to your domain (not localhost)
- [ ] `NEXT_PUBLIC_APP_URL` matches `APP_URL`
- [ ] `NEXT_PUBLIC_API_URL` points to `/api/v1` endpoint
- [ ] `OWNER_EMAIL` and `OWNER_PASSWORD` set
- [ ] Database migrations applied (`pnpm db:push`)
- [ ] Initial seed run (`pnpm db:seed`)
- [ ] HTTPS configured (reverse proxy)
- [ ] Health check returns 200

---

## Gitea + Actions Runner

```bash
# 1. Set runner token in .env
echo "RUNNER_TOKEN=<your-token>" >> .env

# 2. Start Gitea + Runner
docker compose -f docker-compose.runner.yml up -d

# 3. Access Gitea at http://localhost:4000
```

---

## Queue Workers

Background jobs run in-process:

| Worker | Schedule | Purpose |
|--------|----------|---------|
| parse-scan-result | On-demand | Parse scan output |
| run-managed-scan | On-demand | Execute managed scans |
| ai-verify-finding | On-demand | AI verification |
| sync-source-control | Every 30 min | Sync SCM repos |
| scan-timeout-watchdog | Every 5 min | Clean timed-out scans |
| cleanup-old-scan-files | Daily 2am | Cleanup old files |
| sync-knowledge-base | Every 6 hours | Sync NVD/CWE data |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Database timeout | Check `DATABASE_URL`, use `sslmode=require` for Neon |
| Queue init fails | Database may be sleeping — first request wakes it |
| Build fails | Check `.dockerignore`, ensure `node_modules` excluded |
| Health check 500 | Check logs: `docker logs <container>` |
| Port in use | Change `PORT` env var or stop other services |
