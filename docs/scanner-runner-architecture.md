# Scanner Runner Architecture — VPS & Production Deployment

## Storage Architecture

### Directory Strategy

| Directory | Purpose | Persistence | Cleanup |
|-----------|---------|-------------|---------|
| `/tmp/scan-*` | Cloned repos during scan | Ephemeral (deleted after scan) | Scanner runner `finally` block |
| `/storage/artifacts/*` | Scan reports, findings | Persistent (30-day retention) | Retention job |
| `/storage/backups/*` | Database backups | Persistent (7-day retention) | Backup cron |
| `/storage/logs/*` | Application logs | Persistent (7-day retention) | Logrotate |

### Why This Layout

```
/tmp/                          ← OS-managed, auto-cleaned on reboot
├── scan-abc123/               ← Fresh clone per scan (5-500MB)
├── scan-def456/               ← Another concurrent scan
└── scan-ghi789/               ← Ephemeral, gone after scan completes

/storage/                      ← Persistent, survives reboots
├── artifacts/                 ← Scan results (kept 30 days)
│   ├── scan-1042/
│   │   ├── semgrep.json       ← Raw scanner output
│   │   ├── gitleaks.json
│   │   └── summary.json       ← Parsed findings
│   └── scan-1043/
├── backups/                   ← PostgreSQL dumps
│   └── sast_2026-05-31.sql.gz
└── logs/                      ← Application logs
    └── scanner.log
```

### Why Not Use `/data/`?

| Aspect | `/data/` | `/storage/` |
|--------|----------|-------------|
| **Naming** | Ambiguous (could be database, cache, etc.) | Clear: "storage" = file storage |
| **Convention** | Not standard | Matches Docker/industry convention |
| **Discoverability** | Harder to find | Easier to find and manage |
| **Backup scope** | Unclear what to backup | Clear: backup `/storage/` |

### Why Not Use `/tmp/` for Everything?

| Issue | Explanation |
|-------|-------------|
| **Cleared on reboot** | Artifacts lost if server restarts |
| **OS-managed cleanup** | Files deleted when space is low |
| **No backup** | Not included in backup scripts |
| **Size limits** | tmpfs may have size limits |

### Environment Variables

```bash
# .env.production
STORAGE_DIR=/storage              # Persistent storage root
CLONE_DIR=/tmp                    # Ephemeral clone location
RETENTION_DAYS=30                 # Days to keep scan artifacts

# Optional: S3/MinIO for scaling beyond single VPS
# STORAGE_ENDPOINT=http://minio:9000
# STORAGE_BUCKET=sast-artifacts
```

### File Paths in Code

```typescript
// src/server/modules/scan/constants.ts
export const STORAGE_PATHS = {
  /** Root directory for persistent storage */
  ROOT: process.env.STORAGE_DIR || '/storage',
  /** Scan artifacts (reports, findings) */
  ARTIFACTS: process.env.STORAGE_DIR || '/storage/artifacts',
  /** Database backups */
  BACKUPS: process.env.STORAGE_DIR || '/storage/backups',
  /** Application logs */
  LOGS: process.env.STORAGE_DIR || '/storage/logs',
  /** Ephemeral clone directory (cleaned after scan) */
  CLONES: process.env.CLONE_DIR || '/tmp',
} as const;
```

## PM2 Process Architecture

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'sast-server',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'sast-worker',
      script: 'dist/server/worker.js',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'sast-scanner',
      script: 'dist/server/scanner-runner.js',
      env: {
        STORAGE_DIR: '/storage',
        CLONE_DIR: '/tmp',
      },
    },
  ],
};
```

## Scanner Runner Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  Scanner Runner (PM2 process)                │
│                                                             │
│  1. Pull job from pg-boss queue                             │
│                                                             │
│  2. Clone to /tmp/scan-{id}/:                              │
│     $ git clone --depth 1 --branch main \                  │
│       git@github.com:org/repo.git \                         │
│       /tmp/scan-abc123/                                     │
│                                                             │
│  3. Run scanners:                                          │
│     $ cd /tmp/scan-abc123/                                  │
│     $ semgrep scan --config auto . \                        │
│       --json --output /storage/artifacts/scan-1042/semgrep  │
│     $ gitleaks detect --source . \                          │
│       --report-file /storage/artifacts/scan-1042/gitleaks   │
│                                                             │
│  4. Parse results → Store in PostgreSQL                     │
│                                                             │
│  5. Cleanup:                                               │
│     $ rm -rf /tmp/scan-abc123/                              │
│                                                             │
│  Note: /storage/artifacts/scan-1042/ is KEPT (30-day ret)  │
└─────────────────────────────────────────────────────────────┘
```

## VPS Setup Commands

```bash
# 1. Create storage directories
sudo mkdir -p /storage/{artifacts,backups,logs}
sudo chown -R sast:sast /storage/

# 2. Install scanners
sudo apt-get install -y git semgrep gitleaks

# 3. Configure retention cleanup (cron)
echo "0 2 * * * find /storage/artifacts/ -mtime +30 -delete" | sudo tee /etc/cron.d/sast-cleanup

# 4. Start services with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 5. Monitor
pm2 monit
pm2 logs sast-scanner
du -sh /storage/artifacts/  # Check storage usage
```

## Docker Compose (Recommended)

```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    env_file: .env
    depends_on:
      postgres: { condition: service_healthy }
    volumes:
      - storage:/storage          # Persistent artifacts

  scanner:
    build: .
    command: node dist/server/scanner-runner.js
    env_file: .env
    environment:
      - STORAGE_DIR=/storage
      - CLONE_DIR=/tmp
    volumes:
      - storage:/storage          # Read/write artifacts
      - scan-tmp:/tmp             # Ephemeral clones
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
      - storage:/storage          # Access to artifacts if needed

volumes:
  storage:                        # Persistent across restarts
  scan-tmp:                       # Ephemeral, reset on restart
  pgdata:                         # Database persistence
```

## Scaling Summary

| Scenario | Clone Location | Artifact Location |
|----------|---------------|-------------------|
| **Single VPS + PM2** | `/tmp/scan-*` | `/storage/artifacts/` |
| **Docker Compose** | `scan-tmp` volume | `storage` volume |
| **Multiple VPS** | NFS mount `/tmp` or local | NFS mount `/storage` or S3 |
| **Kubernetes** | `emptyDir` | PVC or S3 |
| **Vercel** | ❌ Not compatible | ❌ Not compatible |

## Key Principle

```
/tmp/  =  "I need this for 5 minutes"     (clones)
/storage/ = "I need this for 30 days"     (artifacts, backups, logs)
```
