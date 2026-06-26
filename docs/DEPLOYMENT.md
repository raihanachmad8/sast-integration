# Deployment Guide

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development](#development)
- [Docker](#docker)
  - [Build](#build)
  - [Run (Manual)](#run-manual)
  - [Docker Compose](#docker-compose)
  - [Docker Networking](#docker-networking)
- [Cloud Deployment](#cloud-deployment)
  - [AWS ECS/Fargate](#aws-ecsfargate)
  - [Google Cloud Run](#google-cloud-run)
  - [Azure Container Instances](#azure-container-instances)
- [Kubernetes](#kubernetes)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Production Checklist](#production-checklist)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 22+ | Local development |
| pnpm | 10+ | Package manager |
| Docker | 24+ | Container runtime |
| PostgreSQL | 15+ | Database (local or cloud) |

---

## Development

```bash
# Install dependencies
pnpm install

# Setup database
pnpm db:reset        # Drop → Push schema → Seed
pnpm db:seed         # Seed only

# Start dev server
pnpm dev             # http://localhost:3000

# Run tests
pnpm test            # Unit tests
pnpm test:e2e        # API tests
pnpm test:ui         # Playwright UI tests
```

---

## Docker

### Build

```bash
# Standard build
docker build -t sast-integration .

# Build with scanners (semgrep, flawfinder, cppcheck, gitleaks, clang-tidy, gcc)
docker build --build-arg INCLUDE_SCANNERS=true -t sast-integration .

# Build with custom tag
docker build -t sast-integration:v1.0.0 .
```

### Run (Manual)

```bash
# Create .env file first
cp .env.example .env

# Run container (single line — works on Windows + Linux)
docker run -d --name sast-app -p 3000:3000 --sysctl net.ipv6.conf.all.disable_ipv6=1 --restart unless-stopped --env-file .env sast-integration

# Check logs
docker logs -f sast-app

# Run with inline env vars (no .env file needed)
docker run -d --name sast-app -p 3000:3000 --sysctl net.ipv6.conf.all.disable_ipv6=1 -e DATABASE_URL="postgresql://user:pass@host:5432/dbname" -e JWT_SECRET="your-32-char-secret-here" -e APP_URL="https://your-domain.com" -e NEXT_PUBLIC_APP_URL="https://your-domain.com" -e NEXT_PUBLIC_API_URL="https://your-domain.com/api/v1" sast-integration

# Run with scanners
docker run -d --name sast-app -p 3000:3000 --sysctl net.ipv6.conf.all.disable_ipv6=1 --env-file .env sast-integration

# Stop
docker rm -f sast-app
```

**Flags explained:**

| Flag | Purpose |
|------|---------|
| `-d` | Detached mode (background) |
| `--name sast-app` | Container name |
| `-p 3000:3000` | Port mapping (host:container) |
| `--sysctl net.ipv6.conf.all.disable_ipv6=1` | Disable IPv6 at kernel level (fix DNS timeout with external PostgreSQL) |
| `--restart unless-stopped` | Auto-restart on crash/reboot |
| `--env-file .env` | Load environment variables |

### Docker Compose

```bash
# Start
docker compose up -d

# View logs
docker compose logs -f app

# Stop
docker compose down

# Stop + remove volumes
docker compose down -v

# Rebuild
docker compose build --no-cache
docker compose up -d
```

### Docker Networking

#### Why `--sysctl disable_ipv6=1`?

Docker Desktop bridge network has broken IPv6 resolution. When Node.js resolves external hostnames (e.g., Neon PostgreSQL), it gets both IPv4 and IPv6 addresses. IPv6 fails with `ENETUNREACH`, and the connection times out before IPv4 fallback.

**This is a Docker Desktop issue, not a code issue.** Cloud providers (AWS, GCP, Azure) have proper Linux networking and may not need this flag — but it's safe to include everywhere (no-op if IPv6 is already disabled).

```
Docker Desktop (without sysctl):
  dns.lookup() → [IPv6, IPv4] → IPv6 ENETUNREACH → timeout

Docker Desktop (with sysctl):
  dns.lookup() → [IPv4 only] → OK

Cloud Provider (any):
  dns.lookup() → [IPv4] → OK (IPv6 properly configured or absent)
```

#### Local PostgreSQL in Docker

If PostgreSQL runs inside Docker, use container networking:

```bash
# Run PostgreSQL
docker run -d --name sast-db -e POSTGRES_DB=sast_db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine

# Run app (connect to db container)
docker run -d --name sast-app -p 3000:3000 --sysctl net.ipv6.conf.all.disable_ipv6=1 --env-file .env sast-integration
```

With `DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/sast_db`

#### External Cloud PostgreSQL

```bash
# DATABASE_URL points to cloud host — works everywhere
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require
```

---

## Cloud Deployment

### AWS ECS/Fargate

#### 1. Push Image to ECR

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Tag image
docker tag sast-integration:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/sast-integration:latest

# Push
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/sast-integration:latest
```

#### 2. Store Secrets in SSM Parameter Store

```bash
aws ssm put-parameter --name "/sast/DATABASE_URL" --value "postgresql://..." --type SecureString
aws ssm put-parameter --name "/sast/JWT_SECRET" --value "your-secret" --type SecureString
```

#### 3. Create ECS Task Definition

```json
{
  "family": "sast-integration",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "sast-app",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/sast-integration:latest",
      "portMappings": [
        { "containerPort": 3000, "protocol": "tcp" }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "3000" }
      ],
      "secrets": [
        { "name": "DATABASE_URL", "valueFrom": "arn:aws:ssm:us-east-1:<account-id>:parameter/sast/DATABASE_URL" },
        { "name": "JWT_SECRET", "valueFrom": "arn:aws:ssm:us-east-1:<account-id>:parameter/sast/JWT_SECRET" }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "wget --quiet --tries=1 --spider http://localhost:3000/api/v1/health || exit 1"],
        "interval": 30,
        "timeout": 10,
        "retries": 3,
        "startPeriod": 40
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/sast-integration",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### 4. Create ECS Service

```bash
aws ecs create-service --cluster sast-cluster --service-name sast-integration --task-definition sast-integration --desired-count 1 --launch-type FARGATE --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

---

### Google Cloud Run

```bash
# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/<project-id>/sast-integration

# Deploy to Cloud Run
gcloud run deploy sast-integration --image gcr.io/<project-id>/sast-integration --platform managed --region us-central1 --port 3000 --memory 1Gi --cpu 1 --min-instances 0 --max-instances 10 --allow-unauthenticated --set-env-vars "NODE_ENV=production" --set-secrets "DATABASE_URL=sast-database-url:latest,JWT_SECRET=sast-jwt-secret:latest"
```

**Note:** Cloud Run manages networking — no `--sysctl` needed.

---

### Azure Container Instances

```bash
# Create resource group
az group create --name sast-rg --location eastus

# Create container instance
az container create --resource-group sast-rg --name sast-app --image sast-integration:latest --cpu 1 --memory 1.5 --ports 3000 --ip-address Public --environment-variables NODE_ENV=production PORT=3000 --secure-environment-variables DATABASE_URL="postgresql://user:pass@host:5432/db" JWT_SECRET="<your-secret>"
```

---

## Kubernetes

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sast-integration
  labels:
    app: sast-integration
spec:
  replicas: 2
  selector:
    matchLabels:
      app: sast-integration
  template:
    metadata:
      labels:
        app: sast-integration
    spec:
      containers:
        - name: sast-app
          image: sast-integration:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: sast-secrets
                  key: database-url
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: sast-secrets
                  key: jwt-secret
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          livenessProbe:
            httpGet:
              path: /api/v1/health
              port: 3000
            initialDelaySeconds: 40
            periodSeconds: 30
            timeoutSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/v1/health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10
```

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: sast-integration
spec:
  selector:
    app: sast-integration
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
```

### Secrets

```bash
kubectl create secret generic sast-secrets --from-literal=database-url="postgresql://user:pass@host:5432/db" --from-literal=jwt-secret="<your-32-char-secret>"
```

### Apply

```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
```

---

## Environment Variables

### Required

| Variable | Example | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | PostgreSQL connection string |
| `JWT_SECRET` | `random-32+chars` | JWT signing secret (min 32 chars) |
| `NODE_ENV` | `production` | Environment mode |
| `OWNER_EMAIL` | `admin@domain.com` | Initial owner email |
| `OWNER_PASSWORD` | `secure-password` | Initial owner password |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `APP_URL` | `http://localhost:3000` | Server-side app URL |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Client-side app URL |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000/api/v1` | Client-side API URL |
| `WORKSPACE_MODE` | `multiple` | `single` or `multiple` |
| `MAIL_PROVIDER` | `console` | `console` or `smtp` |
| `NVD_API_KEY` | — | NVD API key for knowledge base |
| `STORAGE_PROVIDER` | `local` | `local`, `s3`, or `cloudinary` |
| `APP_MEMORY_LIMIT` | `1G` | Docker memory limit |
| `APP_CPU_LIMIT` | `1` | Docker CPU limit |
| `INCLUDE_SCANNERS` | `false` | Enable semgrep, flawfinder, cppcheck |

### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `FEATURE_FLAG_SCAN_MANAGED` | `true` | Managed scan feature |
| `FEATURE_FLAG_AI_VERIFICATION` | `true` | AI verification feature |
| `FEATURE_FLAG_QUALITY_GATES` | `true` | Quality gates feature |
| `FEATURE_FLAG_TEAMS` | `true` | Teams feature |
| `FEATURE_FLAG_PROJECTS` | `true` | Projects feature |
| `FEATURE_FLAG_SOURCE_CONTROL_GITEA` | `true` | Gitea integration |
| `FEATURE_FLAG_SOURCE_CONTROL_GITHUB` | `true` | GitHub integration |
| `FEATURE_FLAG_SOURCE_CONTROL_GITLAB` | `true` | GitLab integration |
| `FEATURE_FLAG_KNOWLEDGE_BASE` | `true` | Knowledge base feature |
| `FEATURE_FLAG_REPORTS` | `true` | Reports feature |

### Cloud Database URLs

**Neon:**
```
DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```

**Supabase:**
```
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
```

**AWS RDS:**
```
DATABASE_URL=postgresql://user:pass@xxx.us-east-1.rds.amazonaws.com:5432/dbname?sslmode=require
```

---

## Storage

### Local Storage (Docker)

When `STORAGE_PROVIDER=local`, files are stored **inside the container** at `/app/storage/uploads`. You **must** mount a volume to persist data across container restarts.

```bash
# Docker run — mount named volume
docker run -d --name sast-app -p 3000:3000 --sysctl net.ipv6.conf.all.disable_ipv6=1 --env-file .env -v sast-storage:/app/storage sast-integration

# Or mount host directory
docker run -d --name sast-app -p 3000:3000 --sysctl net.ipv6.conf.all.disable_ipv6=1 --env-file .env -v C:/data/sast-storage:/app/storage sast-integration
```

```yaml
# docker-compose.yml — already configured
volumes:
  - storage:/app/storage
```

**⚠️ Without volume mount, all uploaded files (reports, scan results) are LOST when container is removed.**

### Cloud Storage (S3 / Cloudinary)

When `STORAGE_PROVIDER=s3` or `STORAGE_PROVIDER=cloudinary`, files are stored **externally** — no volume mount needed.

```bash
# S3 — no volume needed, just set env vars
docker run -d --name sast-app -p 3000:3000 --sysctl net.ipv6.conf.all.disable_ipv6=1 --env-file .env sast-integration

# .env for S3
STORAGE_PROVIDER=s3
SAST_BUCKET=sast-uploads
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_ENDPOINT=https://s3.us-east-1.amazonaws.com

# Cloudinary — no volume needed
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
CLOUDINARY_FOLDER=sast
```

### Storage Comparison

| Provider | Data Location | Volume Mount | Cost | Best For |
|----------|---------------|-------------|------|----------|
| `local` | Inside container | ✅ Required | Free | Development, small deployments |
| `s3` | AWS S3 / MinIO | ❌ Not needed | Pay per GB | Production, scalable |
| `cloudinary` | Cloudinary CDN | ❌ Not needed | Pay per GB | Production, image optimization |

---

## Storage

### Local Storage (Docker)

When `STORAGE_PROVIDER=local`, files are stored **inside the container** at `/app/storage/uploads`. You **must** mount a volume to persist data across container restarts.

```bash
# Docker run — mount named volume
docker run -d --name sast-app -p 3000:3000 --sysctl net.ipv6.conf.all.disable_ipv6=1 --env-file .env -v sast-storage:/app/storage sast-integration

# Or mount host directory
docker run -d --name sast-app -p 3000:3000 --sysctl net.ipv6.conf.all.disable_ipv6=1 --env-file .env -v C:/data/sast-storage:/app/storage sast-integration
```

```yaml
# docker-compose.yml — already configured
volumes:
  - storage:/app/storage
```

**⚠️ Without volume mount, all uploaded files (reports, scan results) are LOST when container is removed.**

### Cloud Storage (S3 / Cloudinary)

When `STORAGE_PROVIDER=s3` or `STORAGE_PROVIDER=cloudinary`, files are stored **externally** — no volume mount needed.

```bash
# S3 — no volume needed, just set env vars
docker run -d --name sast-app -p 3000:3000 --sysctl net.ipv6.conf.all.disable_ipv6=1 --env-file .env sast-integration

# .env for S3
STORAGE_PROVIDER=s3
SAST_BUCKET=sast-uploads
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_ENDPOINT=https://s3.us-east-1.amazonaws.com

# Cloudinary — no volume needed
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
CLOUDINARY_FOLDER=sast
```

### Storage Comparison

| Provider | Data Location | Volume Mount | Cost | Best For |
|----------|---------------|-------------|------|----------|
| `local` | Inside container | ✅ Required | Free | Development, small deployments |
| `s3` | AWS S3 / MinIO | ❌ Not needed | Pay per GB | Production, scalable |
| `cloudinary` | Cloudinary CDN | ❌ Not needed | Pay per GB | Production, image optimization |

---

## Database

### Migration

```bash
# Run migrations
pnpm db:migrate

# Push schema directly (development only)
pnpm db:push

# Generate migration from schema changes
pnpm db:generate
```

### Reset

```bash
# Full reset: drop → push schema → seed
pnpm db:reset

# Seed only
pnpm db:seed

# Open Drizzle Studio (GUI)
pnpm db:studio
```

### Docker Migration

```bash
# Run migration inside container
docker exec sast-app node drizzle/migrate.js
```

---

## Production Checklist

- [ ] `DATABASE_URL` set to production database with `sslmode=require`
- [ ] `JWT_SECRET` is a strong random value (32+ chars)
- [ ] `NODE_ENV=production`
- [ ] `APP_URL` points to your domain (not localhost)
- [ ] `NEXT_PUBLIC_APP_URL` matches `APP_URL`
- [ ] `NEXT_PUBLIC_API_URL` points to `/api/v1` endpoint
- [ ] `OWNER_EMAIL` and `OWNER_PASSWORD` set to secure values
- [ ] Database migrations applied (`pnpm db:migrate`)
- [ ] Initial seed run (`pnpm db:seed`)
- [ ] HTTPS configured (via reverse proxy: Nginx, Caddy, Cloudflare)
- [ ] Health check returns 200
- [ ] `.env` file is not committed to git
- [ ] Container runs as non-root user (default in Dockerfile)
- [ ] Rate limiting is enabled (`RATE_LIMIT_ENABLED=true`)
- [ ] Secrets stored in cloud secret manager (not in `.env` for production)

---

## Monitoring

### Health Check

```bash
curl http://localhost:3000/api/v1/health
```

### Logs

```bash
# Docker
docker logs -f sast-app

# Filter errors
docker logs sast-app 2>&1 | grep '"level":"error"'

# Docker Compose
docker compose logs -f app
```

### Docker Stats

```bash
docker stats sast-app
```

### Queue Workers

Background jobs run in-process:

| Worker | Schedule | Purpose |
|--------|----------|---------|
| `parse-scan-result` | On-demand | Parse scan output |
| `run-managed-scan` | On-demand | Execute managed scans |
| `ai-verify-finding` | On-demand | AI verification |
| `sync-source-control` | Every 30 min | Sync SCM repos |
| `scan-timeout-watchdog` | Every 5 min | Clean timed-out scans |
| `cleanup-old-scan-files` | Daily 2am | Cleanup old files |
| `sync-knowledge-base` | Every 6 hours | Sync NVD/CWE data |

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL not running or wrong host | Check `DATABASE_URL`, ensure PG is running |
| `ETIMEDOUT` on external DB | Docker IPv6 DNS issue | Add `--sysctl net.ipv6.conf.all.disable_ipv6=1` |
| `ENETUNREACH` IPv6 | Docker bridge network | Same as above |
| Queue init fails | Database sleeping (Neon free tier) | First request wakes it — normal behavior |
| Build fails | `.dockerignore` issue | Ensure `node_modules` excluded |
| Health check 500 | App startup error | Check logs: `docker logs <container>` |
| Port in use | Another process on port | Change `PORT` env or stop other services |
| `CHANNEL_BINDING` error | Neon URL has unsupported param | Remove `&channel_binding=require` from URL |
| Browser can't connect | `--network host` on Docker Desktop | Use bridge network with `-p 3000:3000` |
| SSL certificate error | Missing CA certificates | Already fixed in Dockerfile (`ca-certificates`) |
| `clang-tidy: not found` | Alpine versioned path | Symlink in Dockerfile handles this |

---

## Production Architecture

```mermaid
graph TB
    User["👤 User Browser"] --> CDN["☁️ CDN<br/>(CloudFlare)"]
    CDN --> Proxy["🔀 Reverse Proxy<br/>(Nginx / Caddy)"]
    Proxy -->|"HTTP :3000"| App["🐳 SAST App<br/>(Docker Container)"]

    App --> DB[("🐘 PostgreSQL<br/>(Neon / RDS)")]
    App --> Storage["📦 Storage<br/>(S3 / Local)"]
    App --> Queue["⚙️ Queue Workers<br/>(pg-boss, in-process)"]

    Queue --> DB
    Queue --> AI["🤖 AI Models<br/>(Ollama / External)"]
    Queue --> SCM["🔗 Source Control<br/>(Gitea / GitHub / GitLab)"]

    subgraph Docker Container
        App
        Queue
        Tini["tini (PID 1)"] --> Entrypoint["docker-entrypoint.sh"]
        Entrypoint --> App
    end

    style App fill:#4a9eff,color:#fff
    style DB fill:#336791,color:#fff
    style Queue fill:#f59e0b,color:#fff
    style CDN fill:#f472b6,color:#fff
    style Proxy fill:#10b981,color:#fff
```

### Docker Container Internals

```mermaid
graph LR
    subgraph "Docker Container (Alpine Linux)"
        Tini["tini<br/>(PID 1)"] --> Entrypoint["docker-entrypoint.sh"]
        Entrypoint --> Validate["✅ Validate<br/>env vars"]
        Entrypoint --> WaitDB["⏳ Wait for<br/>DB (nc check)"]
        Entrypoint --> Start["🚀 node server.js"]
    end

    subgraph "Next.js Standalone"
        Start --> API["API Routes<br/>/api/v1/*"]
        Start --> SSR["SSR Pages"]
        Start --> Workers["pg-boss<br/>Workers"]
    end

    API --> PG[("PostgreSQL")]
    Workers --> PG

    style Tini fill:#6366f1,color:#fff
    style Start fill:#4a9eff,color:#fff
    style PG fill:#336791,color:#fff
```

### Docker Networking (IPv6 Issue)

```mermaid
graph TD
    subgraph "Without --sysctl"
        DNS1["dns.lookup()"] --> IPv6["IPv6 Address"]
        DNS1 --> IPv4["IPv4 Address"]
        IPv6 -->|"ENETUNREACH"| Fail["❌ ETIMEDOUT"]
        IPv4 -->|"Tries after IPv6 fails"| Fail
    end

    subgraph "With --sysctl disable_ipv6=1"
        DNS2["dns.lookup()"] --> IPv4Only["IPv4 Only"]
        IPv4Only -->|"✅ Connected"| OK["PostgreSQL"]
    end

    style Fail fill:#ef4444,color:#fff
    style OK fill:#22c55e,color:#fff
    style IPv6 fill:#f97316,color:#fff
    style IPv4Only fill:#22c55e,color:#fff
```

### Deployment Flow

```mermaid
flowchart TD
    A["📝 Code Push"] --> B{"Which Environment?"}
    B -->|"Local Dev"| C["pnpm dev"]
    B -->|"Docker Local"| D["docker build + run"]
    B -->|"Cloud"| E{"Which Provider?"}

    E -->|"AWS"| F["ECR → ECS/Fargate"]
    E -->|"GCP"| G["GCR → Cloud Run"]
    E -->|"Azure"| H["ACR → Container Instances"]
    E -->|"K8s"| I["Registry → kubectl apply"]

    D --> J["🐳 Docker Container"]
    F --> J
    G --> J
    H --> J
    I --> J

    J --> K["⏳ Wait for DB"]
    K --> L["🚀 Start App"]
    L --> M["✅ Health Check"]

    style A fill:#6366f1,color:#fff
    style J fill:#4a9eff,color:#fff
    style M fill:#22c55e,color:#fff
```

### Request Flow

```mermaid
sequenceDiagram
    participant Browser
    participant CDN
    participant Proxy
    participant App
    participant DB
    participant Queue

    Browser->>CDN: GET /api/v1/scans
    CDN->>Proxy: Forward request
    Proxy->>App: HTTP :3000
    App->>App: authenticate(JWT)
    App->>App: validate(Zod)
    App->>DB: SELECT scans
    DB-->>App: Result
    App-->>Browser: 200 { data, meta }

    Note over Browser,Queue: Scan trigger flow
    Browser->>App: POST /api/v1/scans
    App->>DB: INSERT scan
    App->>Queue: enqueue scan job
    App-->>Browser: 201 { scanId }
    Queue->>DB: UPDATE scan status
```
