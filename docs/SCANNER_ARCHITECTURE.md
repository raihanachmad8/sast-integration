# Scanner Architecture

**Purpose**: This document describes the scanner execution architecture, binary detection mechanism, and dual-flow design.

---

## Overview

The platform supports two distinct scan execution flows:

1. **Managed Scans** — Platform clones repo and runs scanner CLIs
2. **External Uploads** — CI pipelines upload pre-generated results

Both flows converge into the same parsing and findings pipeline.

```
┌─────────────────────────────────────────────────────────────────┐
│                     DUAL-FLOW ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Flow A: Managed Scan                                           │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ Trigger  │───▶│ Validate │───▶│ Git Clone│───▶│ Run      │  │
│  │ (manual/ │    │ (policy, │    │ (shallow │    │ Scanners │  │
│  │ schedule)│    │  repo)   │    │  clone)  │    │ (CLI)    │  │
│  └──────────┘    └──────────┘    └──────────┘    └────┬─────┘  │
│                                                        │        │
│                                                        ▼        │
│                                                 ┌──────────┐   │
│                                                 │ Upload   │   │
│                                                 │ Results  │   │
│                                                 │ (S3/MinIO│   │
│                                                 │  /Local) │   │
│                                                 └────┬─────┘   │
│                                                      │         │
│  Flow B: External Upload                             │         │
│  ┌──────────┐    ┌──────────┐                        │         │
│  │ CI       │───▶│ Upload   │────────────────────────┘         │
│  │ Pipeline │    │ Results  │                                   │
│  │ (GitHub  │    │ (JSON/   │                                   │
│  │  Actions)│    │  XML)    │                                   │
│  └──────────┘    └──────────┘                                   │
│                                                                  │
│                        ┌──────────┐                              │
│                        │  Parse   │                              │
│                        │  Results │                              │
│                        │ (shared) │                              │
│                        └────┬─────┘                              │
│                             │                                   │
│                             ▼                                   │
│                        ┌──────────┐                              │
│                        │ Findings │                              │
│                        │ (dedup)  │                              │
│                        └──────────┘                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Scanner Binary Detection

### Problem

Different operating systems have different methods for finding executable binaries:

| OS | Command | Notes |
|----|---------|-------|
| Windows | `where <binary>` | Searches PATH for `.exe`, `.cmd`, `.bat` |
| Linux | `which <binary>` | Searches PATH for executable files |
| macOS | `which <binary>` | Same as Linux (BSD heritage) |
| Fallback | `<binary> --version` | Tries to execute directly |

### Solution

The `scanner-availability.ts` module abstracts platform differences:

```typescript
// Platform detection
const isWindows = process.platform === 'win32';

if (isWindows) {
  await execFileAsync('where', [config.command]);
} else {
  await execFileAsync('which', [config.command]);
}
```

### Detection Flow

```
checkScannerAvailability('semgrep')
    │
    ├── Cache hit? → return cached result immediately
    │
    ├── Is Windows (process.platform === 'win32')?
    │   ├── YES → exec('where semgrep')
    │   │   ├── exit code 0 → cache true, return true
    │   │   └── exit code ≠ 0 → cache false, return false
    │   │
    │   └── NO (Linux/Mac) → exec('which semgrep')
    │       ├── exit code 0 → cache true, return true
    │       └── exit code ≠ 0 → cache false, return false
    │
    └── Return cached result
```

### Why Not Use `fs.access()`?

`fs.access()` checks if a file exists and is accessible, but:
- Doesn't search PATH (need full path)
- Doesn't verify the file is executable
- Platform-specific (Windows `.exe` vs Linux ELF)

`which`/`where` are the standard tools for PATH-based binary lookup.

### Cache Behavior

```typescript
// First call: executes `which semgrep`
await checkScannerAvailability('semgrep'); // → true (cached)

// Subsequent calls: returns cached result
await checkScannerAvailability('semgrep'); // → true (from cache)

// Clear cache if scanners were installed/uninstalled
clearAvailabilityCache();
```

---

## Graceful Degradation

### Problem

Before: If scanner #1 fails, scanners #2-N are never executed.

```
for scanner in [semgrep, gitleaks, trivy]:
    runScanner(scanner)  // semgrep fails → gitleaks, trivy skipped!
```

### Solution

After: Each scanner is checked independently. Failures are isolated.

```
for scanner in [semgrep, gitleaks, trivy]:
    if not available(scanner):
        log warning, skip
        continue
    
    try:
        runScanner(scanner)
        record success
    catch error:
        log error, record failure
        continue  // don't stop the loop
```

### Result Tracking

Each scan stores per-scanner results:

```json
{
  "scanId": "scan-123",
  "scanners": {
    "semgrep": { "status": "completed", "findings": 5 },
    "gitleaks": { "status": "skipped", "reason": "Binary not installed" },
    "trivy": { "status": "completed", "findings": 2 }
  },
  "overallStatus": "completed"
}
```

### Failure Rules

| Scenario | Scan Status | Notes |
|----------|-------------|-------|
| All scanners completed | `completed` | Normal success |
| Some scanners skipped, some completed | `completed` | Partial success |
| Some scanners failed, some completed | `completed` | Partial success with errors |
| All scanners skipped | `failed` | No results produced |
| All scanners failed | `failed` | No results produced |
| Scanner execution error (crash) | `completed` (with errors) | Other scanners continue |

---

## Managed Scan Pipeline

### Trigger Sources

| Source | Trigger | Auth |
|--------|---------|------|
| Manual | User clicks "Run Scan" | User session |
| Schedule | Cron job (`0 3 * * *`) | System |
| Webhook | SCM push event | Webhook secret |

### Execution Steps

1. **Validate** — Repository exists, workspace membership, SCM connection, policy attached
2. **Normalize** — Filter policy scanners through `SCANNER_COMMANDS` keys
3. **Create Scan** — Insert scan record (status: `queued`)
4. **Enqueue** — Add job to `RUN_MANAGED_SCAN` queue
5. **Worker Process**:
   a. Update status to `processing`
   b. Create temp directory (`mkdtemp`)
   c. `git clone --depth 1 --branch <branch> <url> <dir>`
   d. For each scanner:
      - Check availability
      - Run CLI (`execFile`)
      - Upload output to storage
      - Create scan result record
      - Enqueue parse job
   e. Cleanup temp directory
   f. Update scan status to `completed`

### Scanner Execution

```typescript
async function runScanner(scanner, targetDir, timeoutSeconds) {
  const config = SCANNER_COMMANDS[scanner];
  
  const result = await execFileAsync(
    config.command,           // e.g., 'semgrep'
    config.args(targetDir),   // e.g., ['--config', 'auto', '--json', '/tmp/repo']
    {
      cwd: targetDir,
      timeout: timeoutSeconds * 1000,
      maxBuffer: 20 * 1024 * 1024,  // 20MB
      windowsHide: true,             // Hide console window on Windows
    }
  );
  
  // cppcheck outputs to stderr, others to stdout
  const content = config.outputStream === 'stderr' 
    ? result.stderr 
    : result.stdout;
  
  return { format: config.format, content };
}
```

---

## External Upload Pipeline

### Authentication

Two authentication methods:

1. **Project API Token** — `Authorization: Bearer sast_p_...`
   - Scoped to a specific project
   - Permissions: `["scans:upload"]`
   - Used by CI pipelines

2. **User Session** — `Authorization: Bearer <jwt>`
   - Full user context
   - Used by web UI, manual uploads

### Upload Flow

1. **Authenticate** — Verify token/JWT
2. **Validate** — Branch, commit, at least one file
3. **Resolve Repository** — Find or auto-create external repository
4. **Create Scan** — Insert scan record (status: `processing`)
5. **Create Audit** — Insert scan upload record
6. **Process Files**:
   - Upload to object storage
   - If > 5MB: enqueue async parse job
   - If ≤ 5MB: parse synchronously
7. **Create Findings** — Deduplicate via fingerprint
8. **Complete** — Update scan status

### Sync vs Async Decision

```
file.size > ASYNC_PARSE_THRESHOLD_BYTES (5MB)?
    ├── YES → enqueue parse job (background processing)
    └── NO  → parse immediately (fast response)
```

---

## Parser Architecture

### Dispatch Flow

```
parseScanResult(scanner, content, scanId)
    │
    ├── 'semgrep' → parseSemgrep()
    ├── 'cppcheck' → parseCppcheck()
    ├── 'gitleaks' → parseGitleaks()
    ├── 'trivy' → parseTrivy()
    ├── 'flawfinder' → parseFlawfinder()
    ├── 'sarif' → parseSarifStub()
    └── unknown → { findings: [], summary: {} }
```

### Normalization

All parsers produce normalized `NewFinding[]`:

```typescript
{
  scan_id: string,
  scanner: string,
  rule: string,           // e.g., 'CWE-89', 'sql-injection'
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info',
  file_path?: string,
  line_number?: number,
  message: string,
  description?: string,
  status: 'open',
}
```

### Deduplication

Findings are deduplicated via `finding_groups`:

```
fingerprint = SHA-256(rule + file_path + line_number + message)
```

Same vulnerability across scans → same `finding_group_id`.

---

## Health Endpoint

```
GET /api/v1/health
```

Response:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "0.1.0",
    "scanners": {
      "semgrep": true,
      "gitleaks": true,
      "trivy": false,
      "cppcheck": true,
      "flawfinder": true
    },
    "uptime": 3600
  }
}
```

---

## Constants Reference

| Constant | Value | Location |
|----------|-------|----------|
| `SUPPORTED_SCANNERS` | `['semgrep', 'cppcheck', 'gitleaks', 'trivy', 'flawfinder', 'sarif']` | `constants.ts` |
| `DEFAULT_SCANNER_TIMEOUT_SECONDS` | `300` | `scanners.ts` |
| `MAX_SCANNER_OUTPUT_BUFFER_BYTES` | `20MB` | `scanners.ts` |
| `DEFAULT_GIT_CLONE_DEPTH` | `1` | `scanners.ts` |
| `DEFAULT_MANAGED_SCAN_BRANCH` | `'main'` | `scanners.ts` |
| `DEFAULT_MANAGED_SCAN_CRON` | `'0 3 * * *'` | `scanners.ts` |
| `ASYNC_PARSE_THRESHOLD_BYTES` | `5MB` | `constants.ts` |
| `MAX_UPLOAD_TOTAL_SIZE_BYTES` | `50MB` | `constants.ts` |
| `RETENTION_DAYS` | `30` | `constants.ts` |

---

## Error Handling

### Scanner Binary Missing

```
Error: ENOENT: no such file or directory, spawn semgrep
    → checkScannerAvailability() returns false
    → Scanner skipped with warning log
    → Other scanners continue
```

### Scanner Timeout

```
Error: execFile timeout after 300000ms
    → Scan status: 'failed'
    → Error logged with scanner name
```

### Scanner Crash

```
Error: execFile failed with exit code 1
    → Stderr captured (cppcheck outputs here)
    → Scan status: 'completed' (with partial results)
    → Other scanners continue
```

### Git Clone Failure

```
Error: git clone failed (repository not accessible)
    → Scan status: 'failed'
    → Temp directory cleaned up
    → Error message includes repository URL
```
