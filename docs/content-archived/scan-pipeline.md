# Scan Pipeline

## Overview

The scan pipeline handles the complete lifecycle from scan trigger to finding storage.

## Pipeline Architecture

```mermaid
graph TD
    subgraph TRIGGER["Trigger Layer"]
        A1[POST /scans] 
        A2[Schedule]
        A3[Webhook]
        A4[CI Upload]
    end

    subgraph ORCHESTRATION["Scan Orchestration"]
        B[triggerManualScan] --> C[enqueue run-managed-scan]
        C --> D[processManagedScanJob]
    end

    subgraph EXECUTION["Execution"]
        D --> E[git clone]
        E --> F[scanner 1]
        E --> G[scanner N]
        F --> H[Upload to Storage]
        G --> H
    end

    subgraph PARSING["Parsing Layer"]
        H --> I[enqueue parse-scan-result]
        I --> J[Download from Storage]
        J --> K[parseScanResult]
        K --> L[createManyWithDedup]
    end

    subgraph AI["AI Verification"]
        L --> M[enqueue ai-verify-finding]
        M --> N[Call LLM Provider]
        N --> O[Update Finding Verdict]
    end

    TRIGGER --> ORCHESTRATION
```

## Scan Lifecycle

### Status Flow

```mermaid
stateDiagram-v2
    [*] --> queued
    queued --> running
    running --> processing
    processing --> parsing
    parsing --> completed
    processing --> failed
    parsing --> failed
    completed --> [*]
    failed --> [*]
```

| Status | Description |
|--------|-------------|
| `queued` | Enqueued to pg-boss worker |
| `running` | Worker picked up job |
| `processing` | Scanners executing in parallel |
| `parsing` | Scanner output being parsed |
| `completed` | All parse jobs finished |
| `failed` | One or more scanners/parse jobs failed |

### Timeline Events

Each scan generates a timeline with these event types:

| Event | Description |
|-------|-------------|
| `triggered` | Scan initiated |
| `queued` | Waiting for worker |
| `cloning` | Git clone in progress |
| `scanning` | Scanner execution |
| `parsing` | Output parsing |
| `ai_verifying` | AI verification |
| `completed` | Scan finished |
| `failed` | Scan failed |
| `skipped` | Scanner skipped (not installed) |

## Managed Scan Execution

### `triggerManualScan(input)`

```typescript
interface TriggerManagedScanInput {
  workspaceId: string;
  projectId?: string;
  repositoryId: string;
  userId: string;
  branch?: string;          // Default: repository's default_branch
  scanners?: ScannerId[];   // Default: ['semgrep', 'gitleaks']
  triggerSource?: 'manual' | 'schedule' | 'webhook';
}
```

### `processManagedScanJob(data)`

1. Set status to `processing`
2. `git clone --depth 1 --branch {branch} {url}`
3. For each scanner:
   - Check availability
   - Run scanner CLI
   - Upload output to storage
   - Create `scan_result` record
   - Enqueue `parse-scan-result` job
4. If ALL scanners failed → throw error
5. Set status to `completed`
6. Cleanup temp directory

## CI/CD Upload Flow

For external CI/CD pipelines:

```mermaid
sequenceDiagram
    participant CI as CI/CD Pipeline
    participant API as API
    participant DB as Database
    participant Storage as Object Storage

    CI->>API: POST /ci/init
    API->>DB: Create scan record
    API-->>CI: Return scanId

    CI->>API: POST /ci/upload
    API->>Storage: Store output
    API->>DB: Create scan_result

    CI->>API: POST /ci/complete
    API->>DB: Evaluate quality gate
    API->>CI: Post PR comment
```

## Scanner Output Parsers

| Scanner | Format | Parser |
|---------|--------|--------|
| semgrep | JSON | `parseSemgrep()` |
| gitleaks | JSON | `parseGitleaks()` |
| flawfinder | SARIF | `parseSarif()` |
| cppcheck | XML | `parseCppcheck()` |
| clang-tidy | Text | `parseClangTidy()` |
| gcc-fanalyzer | Text | `parseGCCFanalyzer()` |

## Queue Jobs

| Job | Handler | Description |
|-----|---------|-------------|
| `run-managed-scan` | `processRunManagedScanJob` | Clone repo, run scanners |
| `parse-scan-result` | `processParseScanResultJob` | Parse output, create findings |
| `ai-verify-finding` | `processAiVerifyFindingJob` | AI verification |
| `trigger-scheduled-managed-scan` | Scheduled scan trigger |
| `cleanup-old-scan-files` | Retention cleanup |
| `nvd-knowledge-backfill` | NVD CVE data import |
| `sync-source-control` | SCM token refresh |
| `scan-timeout-watchdog` | Detect orphaned scans (>30min) |
