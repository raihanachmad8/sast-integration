# Scans

## Overview

Scans are the core analysis unit. Each scan runs multiple security scanners against a repository branch and produces findings.

## Scan Types

| Type | Trigger | Description |
|------|---------|-------------|
| Managed | Manual/Schedule/Webhook | Clone from SCM, run scanners locally |
| External Upload | CI/CD | Receive pre-computed results |

## Scan Lifecycle

```
queued → processing → parsing → completed
                    │          │
                    └──────────┴──► failed
```

## Creating a Scan

### Via UI

1. Go to **Scans** page
2. Click **New Scan**
3. Select repository and branch
4. Choose scanner engines
5. Click **Start Scan**

### Via API

```bash
POST /api/v1/workspaces/:workspaceId/scans
{
  "repositoryId": "uuid",
  "branch": "main",
  "scanners": ["semgrep", "gitleaks", "flawfinder"]
}
```

### Response

```json
{
  "scanId": "uuid",
  "jobId": "uuid",
  "status": "queued",
  "branch": "main",
  "scanners": ["semgrep", "gitleaks", "flawfinder"]
}
```

## Scanner Selection

| Scanner | Default | Best For |
|---------|---------|----------|
| semgrep | Yes | Multi-language (30+) |
| gitleaks | Yes | Secrets detection |
| flawfinder | No | C/C++ buffer overflows |
| cppcheck | No | C/C++ static analysis |
| clang-tidy | No | C/C++ linter |
| gcc-fanalyzer | No | C/C++ analysis |

## Scan Detail

Each scan provides:

- Timeline of events
- Scanner results breakdown
- Finding severity distribution
- AI verification statistics
- Duration and commit info

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/scans` | List scans |
| POST | `/scans` | Trigger scan |
| GET | `/scans/:scanId` | Scan detail |
| POST | `/scans/upload` | Upload results |
| GET | `/scanners` | Scanner availability |
