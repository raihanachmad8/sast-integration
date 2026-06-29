---
title: Troubleshooting
description: Common issues and solutions
---

# Troubleshooting

## Common Issues

### Database Connection Refused

**Symptom:** `ECONNREFUSED 127.0.0.1:5432`

**Solution:** PostgreSQL is not running or wrong host in `DATABASE_URL`.

```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# For Docker: use host.docker.internal or external URL
DATABASE_URL=postgresql://user:pass@host.docker.internal:5432/sast_db
```

### DNS Timeout in Docker

**Symptom:** `ETIMEDOUT` or `ENETUNREACH` on external PostgreSQL.

**Solution:** Docker bridge network IPv6 issue.

```bash
docker run -d --sysctl net.ipv6.conf.all.disable_ipv6=1 ...
```

### Scanner Not Found

**Symptom:** Scanner shows as unavailable.

**Solution:**

```bash
# Check scanner installation
semgrep --version
gitleaks version
cppcheck --version
clang-tidy --version
gcc --version

# For Docker with scanners
docker build --build-arg INCLUDE_SCANNERS=true -t sast-integration .
```

### Queue Initialization Fails

**Symptom:** Workers don't start.

**Solution:** Database may be sleeping (Neon free tier). First request wakes it — normal behavior.

### Build Fails

**Symptom:** Docker build fails during `pnpm run build`.

**Solution:** Check `.dockerignore`, ensure `node_modules` excluded.

### Health Check Returns 500

**Symptom:** Health endpoint returns error.

**Solution:** Check logs:

```bash
docker logs sast-app
```

### Port Already in Use

**Symptom:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:** Change `PORT` env or stop other services.

### SSL Certificate Error

**Symptom:** SSL handshake fails with external PostgreSQL.

**Solution:** Already fixed in Dockerfile (`ca-certificates` package).

### Browser Can't Connect

**Symptom:** Browser shows "Cannot connect" but Docker logs are fine.

**Solution:** `--network host` on Docker Desktop doesn't expose to Windows. Use bridge network with `-p 3000:3000`.

### Channel Binding Error

**Symptom:** Neon URL has unsupported `channel_binding` parameter.

**Solution:** Remove `&channel_binding=require` from `DATABASE_URL`.

## Diagnostic Commands

```bash
# Check container status
docker ps --filter name=sast-app

# Check container logs
docker logs sast-app

# Check health
curl http://localhost:3000/api/v1/health

# Check database connectivity
docker exec sast-app node -e "require('pg').Client({connectionString:process.env.DATABASE_URL}).connect().then(()=>console.log('OK')).catch(e=>console.log(e.message))"

# Check scanner availability
curl http://localhost:3000/api/v1/scanner-engines
```
