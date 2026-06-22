# SCANNER System — Technical Documentation

> **Last Updated:** 2026-06-17
> **Status:** Production-ready (semgrep, gitleaks, flawfinder, cppcheck, clang-tidy, gcc-fanalyzer verified)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Supported Scanners](#2-supported-scanners)
3. [Database Schema](#3-database-schema)
4. [Scan Lifecycle](#4-scan-lifecycle)
5. [Scanner Configuration](#5-scanner-configuration)
6. [Scanner Availability](#6-scanner-availability)
7. [Managed Scan Execution](#7-managed-scan-execution)
8. [Report Parsers](#8-report-parsers)
9. [Finding Deduplication](#9-finding-deduplication)
10. [Timeline & Progress Events](#10-timeline--progress-events)
11. [CI/CD Upload Flow](#11-cicd-upload-flow)
12. [Queue Jobs](#12-queue-jobs)
13. [API Reference](#13-api-reference)
14. [Semgrep Rules](#14-semgrep-rules)
15. [Frontend Types](#15-frontend-types)
16. [File Reference](#16-file-reference)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TRIGGER LAYER                               │
│  POST /scans (manual)  │  Schedule (cron)  │  Webhook  │  CI Upload │
└────────────┬───────────────────┬──────────────────┬─────────────────┘
             │                   │                  │
             ▼                   ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SCAN ORCHESTRATION                             │
│                                                                     │
│  triggerManualScan() ──► enqueue("run-managed-scan")               │
│                              │                                      │
│                              ▼                                      │
│                    processManagedScanJob()                          │
│                              │                                      │
│              ┌───────────────┼───────────────┐                     │
│              ▼               ▼               ▼                     │
│         ┌────────┐     ┌────────┐     ┌────────┐                  │
│         │ git    │     │ scanner│     │ scanner│  ...              │
│         │ clone  │     │ 1      │     │ N      │                  │
│         └────────┘     └───┬────┘     └───┬────┘                  │
│                            │              │                         │
│                            ▼              ▼                         │
│                    ┌──────────────────────────┐                    │
│                    │  Upload to Object Storage │                    │
│                    └────────────┬─────────────┘                    │
│                                 │                                   │
│                                 ▼                                   │
│                    ┌──────────────────────────┐                    │
│                    │ enqueue("parse-scan-     │                    │
│                    │         result")          │                    │
│                    └────────────┬─────────────┘                    │
└─────────────────────────────────┼───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PARSING LAYER                                  │
│                                                                     │
│  processParseScanResultJob()                                       │
│         │                                                           │
│         ├── Download from storage                                   │
│         ├── parseScanResult(scanner, content, scanId)              │
│         │      ├── parseSemgrep()    (JSON)                        │
│         │      ├── parseGitleaks()   (JSON)                        │
│         │      ├── parseFlawfinder() (SARIF)                       │
│         │      ├── parseCppcheck()   (XML)                         │
│         │      ├── parseClangTidy()  (Text)                        │
│         │      └── parseGCCFanalyzer() (Text)                      │
│         │                                                           │
│         └── findingService.createManyWithDedup()                   │
│                ├── SHA-256 fingerprint generation                   │
│                ├── finding_groups UPSERT (ON CONFLICT DO NOTHING)  │
│                └── findings INSERT with group_id                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AI VERIFICATION (optional)                     │
│                                                                     │
│  enqueue("ai-verify-finding") per finding                         │
│         │                                                           │
│         ├── Load AI model for workspace                             │
│         ├── Call LLM provider                                       │
│         ├── Update finding: verdict, confidence, explanation       │
│         └── Update finding_groups: title, first/last_seen_at       │
└─────────────────────────────────────────────────────────────────────┘
```

**Two entry points:**

| Entry Point | Description | Flow |
|-------------|-------------|------|
| **Managed Scan** | Clone from SCM, run scanners locally | POST /scans → clone → scan → parse → store |
| **External Upload** | Receive CI/CD output | POST /scans/upload → parse → store |

---

## 2. Supported Scanners

| Scanner | Language Focus | Output Format | Parser |
|---------|----------------|---------------|--------|
| **semgrep** | Multi-language (30+) | JSON (`--json`) | `semgrep.parser.ts` |
| **gitleaks** | Secrets detection | JSON (`--report-format json`) | `gitleaks.parser.ts` |
| **flawfinder** | C/C++ buffer overflows | SARIF (`--sarif`) | `flawfinder.parser.ts` (SARIF) |
| **cppcheck** | C/C++ static analysis | XML (`--xml`) | `cppcheck.parser.ts` |
| **clang-tidy** | C/C++ linter + static analysis | Text (stderr) | `clang-tidy.parser.ts` |
| **gcc-fanalyzer** | C/C++ static analysis | Text (stderr) | `gcc-fanalyzer.parser.ts` |

### Scanner Selection Rules

- **Default scanners** (when none specified): `['semgrep', 'gitleaks']`
- **Availability check** runs before each scanner — unavailable scanners are skipped
- **Graceful degradation**: scan continues if individual scanners fail; only fails if ALL fail
- **Max buffer**: 50MB per scanner output (`MAX_SCANNER_OUTPUT_BUFFER_BYTES`)
- **Timeout**: 300 seconds per scanner (`DEFAULT_SCANNER_TIMEOUT_SECONDS`)

### Semgrep Config

- **Manual scan**: `--config p/default --config p/security-audit --metrics off`
- **CI/CD**: `--config p/default --config p/security-audit --metrics off`
- **Custom rules**: Set `SEMGREP_RULES_DIR` env var to use local rules directory

---

## 3. Database Schema

### Entity Relationship Diagram

```
┌──────────────┐     ┌────────────────┐     ┌──────────────────┐
│   projects   │────<│ finding_groups │────<│    findings      │
│              │     │                │     │                  │
│ id (PK)      │     │ id (PK)        │     │ id (PK)          │
│ workspace_id │     │ project_id(FK) │     │ scan_id (FK)     │
│ name         │     │ fingerprint    │     │ group_id (FK)    │
└──────────────┘     │ title          │     │ cwe_id           │
                     │ first_seen_at  │     │ severity         │
                     │ last_seen_at   │     │ status           │
                     └────────────────┘     │ file_path        │
                                            │ line_number      │
┌──────────────┐     ┌────────────────┐     │ code_snippet     │
│   scans      │────<│  scan_results  │     │ description      │
│              │     │                │     │ rule             │
│ id (PK)      │     │ id (PK)        │     │ scanner          │
│ repository_id│     │ scan_id (FK)   │     │ message          │
│ branch       │     │ scanner        │     │ assigned_to(FK)  │
│ origin       │     │ format         │     │ created_at       │
│ status       │     │ file_key       │     │ updated_at       │
│ started_at   │     │ file_size      │     └────────┬─────────┘
│ completed_at │     │ parsed_summary │              │
│ progress_    │     │ created_at     │              │
│   events     │     └────────────────┘              │
│ created_at   │                                     │
│ created_by   │     ┌────────────────┐              │
└──────────────┘     │ai_verifications│<─────────────┘
                     │                │
                     │ id (PK)        │
                     │ finding_id(FK) │
                     │ model_id (FK)  │
                     │ verdict        │
                     │ confidence     │
                     │ explanation    │
                     │ data_flow      │
                     │ taint_source   │
                     │ match_detail   │
                     │ likely_cwe     │
                     │ fix_suggestion │
                     │ latency_ms     │
                     │ raw_response   │
                     │ created_at     │
                     └────────────────┘

┌────────────────┐     ┌────────────────┐
│ quality_gates  │────<│quality_gate_   │
│                │     │   results      │
│ id (PK)        │     │                │
│ workspace_id   │     │ id (PK)        │
│ threshold      │     │ scan_id (FK)   │
│ fail_on_       │     │ gate_id (FK)   │
│   critical     │     │ status         │
│ fail_on_high_  │     │ blocking_      │
│   tp           │     │   findings     │
│ warn_on_pending│     │ pending_       │
│ require_human_ │     │   findings     │
│   ack          │     │ evaluated_at   │
│ pending_       │     └────────────────┘
│   behavior     │
│ created_at     │     ┌────────────────┐
│ updated_at     │     │   schedules    │
└────────────────┘     │                │
                       │ id (PK)        │
                       │ workspace_id   │
                       │ repository_id  │
                       │ branch         │
                       │ cron_expression│
                       │ timezone       │
                       │ active         │
                       │ last_run_at    │
                       │ next_run_at    │
                       │ created_at     │
                       │ updated_at     │
                       │ created_by     │
                       │ deleted_at     │
                       └────────────────┘

┌────────────────┐
│ scan_uploads   │
│                │
│ id (PK)        │
│ repository_id  │
│ project_id     │
│ scan_id (FK)   │
│ branch         │
│ commit_sha     │
│ uploaded_by    │
│ source         │
│ metadata       │
│ projectApiToken│
│   Id (FK)      │
│ personalAccess │
│   TokenId (FK) │
│ created_at     │
└────────────────┘
```

### Table: `scans`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | `gen_random_uuid()` | Primary key |
| `repository_id` | UUID | — | FK to `repositories` (nullable for uploads) |
| `commit_sha` | VARCHAR(40) | — | Git commit SHA |
| `branch` | VARCHAR(100) | — | Branch name |
| `origin` | VARCHAR(30) | `'managed'` | `'managed'` or `'external_upload'` |
| `trigger_source` | VARCHAR(30) | — | `'manual'`, `'schedule'`, `'webhook'` |
| `status` | VARCHAR(20) | `'pending'` | See [Scan Status](#scan-status) |
| `started_at` | TIMESTAMP | — | Set when worker picks up job |
| `completed_at` | TIMESTAMP | — | Set on terminal state |
| `progress_events` | JSONB | `[]` | Timeline events array |
| `created_at` | TIMESTAMP | `NOW()` | Creation timestamp |
| `created_by` | UUID | — | FK to `users` |

### Table: `scan_results`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `scan_id` | UUID | FK to `scans` |
| `scanner` | VARCHAR(50) | Scanner ID (e.g., `'semgrep'`) |
| `format` | VARCHAR(20) | Output format (`'json'`, `'xml'`, `'sarif'`) |
| `file_key` | TEXT | Object storage key |
| `file_size` | INTEGER | File size in bytes |
| `parsed_summary` | JSONB | Severity breakdown from parser |
| `created_at` | TIMESTAMP | Creation timestamp |

### Table: `findings`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | `gen_random_uuid()` | Primary key |
| `scan_id` | UUID | — | FK to `scans` |
| `group_id` | UUID | — | FK to `finding_groups` (dedup) |
| `cwe_id` | VARCHAR(20) | — | CWE identifier |
| `severity` | VARCHAR(20) | — | `'critical'`/`'high'`/`'medium'`/`'low'`/`'info'` |
| `status` | VARCHAR(20) | `'open'` | See [Finding Status](#finding-status) |
| `file_path` | VARCHAR(500) | — | Source file path |
| `line_number` | INTEGER | — | Line number |
| `code_snippet` | TEXT | — | Source code context |
| `description` | TEXT | — | Human-readable description |
| `rule` | VARCHAR(500) | — | Scanner rule identifier |
| `scanner` | VARCHAR(50) | — | Scanner that found this |
| `message` | TEXT | — | Detailed message |
| `assigned_to` | UUID | — | FK to `users` |
| `created_at` | TIMESTAMP | `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMP | `NOW()` | Last update timestamp |

### Table: `finding_groups`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `project_id` | UUID | FK to `projects` |
| `fingerprint` | VARCHAR(64) | SHA-256 hash (unique) |
| `title` | VARCHAR(500) | Auto-generated title |
| `first_seen_at` | TIMESTAMP | First occurrence |
| `last_seen_at` | TIMESTAMP | Most recent occurrence |

### Table: `ai_verifications`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `finding_id` | UUID | FK to `findings` |
| `model_id` | UUID | FK to `models` |
| `verdict` | VARCHAR(20) | `'true_positive'`/`'false_positive'`/`'pending'` |
| `confidence` | NUMERIC(3,2) | 0.00–1.00 |
| `explanation` | TEXT | AI explanation |
| `data_flow` | TEXT | Source-to-sink data flow |
| `taint_source` | TEXT | Taint source identification |
| `match_detail` | TEXT | Match detail |
| `likely_cwe` | JSONB | Array of CWE identifiers |
| `fix_suggestion` | TEXT | Remediation suggestion |
| `latency_ms` | INTEGER | AI inference time |
| `raw_response` | TEXT | Full LLM output |
| `created_at` | TIMESTAMP | Creation timestamp |

---

## 4. Scan Lifecycle

### Scan Status

```
queued ──► running ──► processing ──► parsing ──► completed
                         │              │
                         └──────────────┴──────────► failed
```

| Status | Description |
|--------|-------------|
| `queued` | Enqueued to pg-boss worker |
| `running` | Worker picked up job (sets `started_at`) |
| `processing` | Scanners executing in parallel |
| `parsing` | Scanner output being parsed (background jobs) |
| `completed` | All parse jobs finished successfully |
| `failed` | One or more scanners/parse jobs failed |

### Scan Status Display (Frontend)

| DB Status | Badge Color | Findings Display |
|-----------|-------------|------------------|
| `queued` | Gray | `—` |
| `running` | Blue | dimmed count |
| `processing` | Dark blue | dimmed count |
| `parsing` | Purple | dimmed count |
| `completed` | Green | **bold** count with critical badge |
| `failed` | Red | bold count |

### Complete Timeline Flow

```
1. Scan triggered (API/Schedule/Webhook)
   │
   ├── Status: pending → queued
   ├── Event: { type: "triggered", description: "Scan triggered" }
   │
   ▼
2. Worker picks up job
   │
   ├── Status: queued → processing
   ├── started_at set
   ├── Event: { type: "cloning", description: "Preparing repository" }
   │
   ▼
3. Git clone (shallow, --depth 1)
   │
   ├── Event: { type: "cloning", description: "Repository cloned" }
   │
   ▼
4. For each scanner:
   │
   ├── Event: { type: "scanning", description: "Running {scanner}", scanner }
   ├── Check availability
   ├── Execute scanner CLI
   ├── Event: { type: "scanning", description: "{scanner} completed", duration }
   ├── Upload output to storage
   ├── Create scan_result record
   ├── Enqueue parse-scan-result job
   │
   ▼
5. All scanners done
   │
   ├── Status: processing → completed
   ├── completed_at set
   ├── Event: { type: "completed", description: "Scan completed" }
   │
   ▼
6. Parse jobs run (per scanner)
   │
   ├── Event: { type: "parsing", description: "Parsing {scanner} results" }
   ├── Download output from storage
   ├── Parse with scanner-specific parser
   ├── Deduplicate findings
   ├── Event: { type: "parsing", description: "{scanner} parsing completed — N findings" }
   │
   ▼
7. AI Verification (optional, per finding)
   │
   ├── Event: { type: "ai_verifying", description: "AI verifying finding" }
   ├── Call LLM provider
   ├── Update finding verdict
   │
   ▼
8. Done
```

---

## 5. Scanner Configuration

### `ScannerCommandConfig` Interface

```ts
interface ScannerCommandConfig {
  command: string;                          // Executable name
  args: (targetDir: string) => string[];   // CLI arguments
  format: 'sarif' | 'json' | 'xml' | 'text';   // Output format
  outputStream?: string;                    // File to read output from (if not stdout)
  env?: Record<string, string>;            // Extra environment variables
}
```

### Scanner Configurations

#### Semgrep

```ts
{
  command: 'semgrep',
  args: (targetDir) => [
    'scan',
    '--json',                              // JSON output (parser expects JSON)
    '--config', SEMGREP_RULES_DIR,         // Local rules: rules/semgrep/
    '--metrics=off',                       // No network metrics
    '--disable-version-check',             // No version check HTTP
    '--no-git-ignore',                     // Scan filesystem, not just git-tracked
    '--skip-unknown-extensions',           // Skip unrecognized files silently
    targetDir,
  ],
  format: 'json',
  env: {
    PYTHONUTF8: '1',                       // Python UTF-8 mode (PEP 540)
    PYTHONIOENCODING: 'utf-8',            // UTF-8 for stream operations
    PYTHONLEGACYWINDOWSSTDIO: '0',         // New-style UTF-8 stdio on Windows
    SEMGREP_SEND_METRICS: 'off',           // Disable metrics upload
    SEMGREP_ENABLE_VERSION_CHECK: '0',     // Disable version check
    SEMGREP_DISABLE_VERSION_CHECK: '1',    // Double-disable version check
  },
}
```

**Why these flags:**
- `--json` (not `--sarif`): Parser expects semgrep native JSON format
- `--config SEMGREP_RULES_DIR`: Uses local rules from `rules/semgrep/` directory (30+ language packs, 1000+ rules) instead of downloading from registry
- `--metrics=off`: Prevents network requests that trigger Unicode encoding errors on Windows
- `--no-git-ignore`: Scans filesystem directly (clone is `--depth 1`, git history incomplete)
- `PYTHONUTF8=1`: Fixes `UnicodeEncodeError: 'charmap' codec can't encode character` on Windows when semgrep downloads registry rules

#### Gitleaks

```ts
{
  command: 'gitleaks',
  args: (targetDir) => [
    'detect',
    '--source', targetDir,
    '--report-format', 'json',             // JSON output (parser expects JSON)
    '--report-path', path.join(targetDir, 'results.json'),
    '--no-git',                            // Filesystem scan (shallow clone)
  ],
  format: 'json',
  outputStream: 'results.json',            // Read from file, not stdout
}
```

**Why `--no-git`:** Gitleaks normally requires full git history. With `--depth 1` clone, history is incomplete. `--no-git` scans filesystem directly.

**Exit code handling:** Gitleaks exits with code 1 when leaks are found (expected behavior). The `runScanner` function catches this and reads the output file.

#### Flawfinder

```ts
{
  command: 'flawfinder',
  args: (targetDir) => {
    const args: string[] = ['--sarif', '--columns'];
    if (env.FLAWFINDER_RULES_DIR) args.push('--rulesdir', env.FLAWFINDER_RULES_DIR);
    args.push(targetDir);
    return args;
  },
  format: 'json',                          // Actually SARIF; format field is metadata
}
```

**Output format:** Flawfinder with `--sarif` outputs SARIF JSON. The `format` field is used for parser dispatch metadata. Parser uses `parseSarif()` for unified SARIF handling.

#### Cppcheck

```ts
{
  command: 'cppcheck',
  args: (targetDir) => {
    const args = ['--enable=warning,style,performance,portability,information', '--force', '--quiet', '--xml', '--xml-version=2'];
    if (env.CPPCHECK_SUPPRESSIONS_PATH) args.push('--suppressions-list', env.CPPCHECK_SUPPRESSIONS_PATH);
    args.push('.');
    return args;
  },
  format: 'xml',
  outputStream: 'results.xml',             // Read from file
}
```

---

## 6. Scanner Availability

### `scanner-availability.ts`

Platform-aware binary detection:

```ts
// Windows: uses 'where' command
// Linux/Mac: uses 'which' command
function getLookupCommand(): string {
  return process.platform === 'win32' ? 'where' : 'which';
}
```

**Key functions:**

| Function | Description |
|----------|-------------|
| `checkScannerAvailability(scanner)` | Check if scanner binary exists in PATH |
| `checkAllScannerAvailability()` | Check all scanners, return `Record<ScannerId, boolean>` |
| `clearAvailabilityCache()` | Clear in-memory cache |
| `getCachedAvailability(scanner)` | Get cached result |
| `getAvailableScanners()` | Return list of available scanner IDs |

**Caching:** Results are cached in-memory (`Map<ScannerId, boolean>`). Call `clearAvailabilityCache()` to refresh.

**API Endpoint:** `GET /api/v1/workspaces/:workspaceId/scanners` returns availability for all scanners.

---

## 7. Managed Scan Execution

### `managed-scan.service.ts`

#### `triggerManualScan(input)`

```ts
interface TriggerManagedScanInput {
  workspaceId: string;
  projectId?: string;
  repositoryId: string;
  userId: string;
  branch?: string;          // Default: repository's default_branch or 'main'
  scanners?: ScannerId[];   // Default: ['semgrep', 'gitleaks']
  triggerSource?: 'manual' | 'schedule' | 'webhook';
}
```

**Flow:**
1. Validate repository exists and belongs to workspace
2. Validate repository is SCM-connected (not external)
3. Normalize scanners (filter to supported IDs)
4. Create scan record: `status: 'queued'`
5. Enqueue `run-managed-scan` job with full payload
6. Return `{ scanId, jobId, status, branch, scanners }`

#### `processManagedScanJob(data)`

```ts
interface ManagedScanJobData {
  scanId: string;
  projectId: string;
  repositoryId: string;
  repositoryUrl: string;
  branch: string;
  scanners: ScannerId[];
  timeoutSeconds: number;     // Default: 300
  requestedBy: string;
}
```

**Flow:**
1. Set status to `processing`
2. Record "cloning" progress event
3. `git clone --depth 1 --branch {branch} {url} {workDir}/repo`
4. Record "cloned" progress event
5. For each scanner:
   - Record "scanning started" event
   - Check availability (skip if not installed)
   - Run scanner CLI via `execFileAsync`
   - Record "scanning completed" event (with duration)
   - Upload output to storage: `{scanId}/{scanner}-{timestamp}.{format}`
   - Create `scan_result` record
   - Enqueue `parse-scan-result` job
6. If ALL scanners failed → throw error
7. Set status to `completed`
8. Record "completed" event
9. Cleanup temp directory in `finally` block

#### `runScanner(scanner, targetDir, timeoutSeconds)`

Handles scanner execution with special cases:
- **Gitleaks exit code 1**: Reads output file (leaks found = expected)
- **Semgrep non-zero exit**: Tries `error.stdout` for valid JSON output
- **Output stream**: Reads from `config.outputStream` file if specified
- **Environment**: Merges `config.env` with `process.env`

---

## 8. Report Parsers

### Parser Dispatch (`parsers/index.ts`)

```ts
function parseScanResult(scanner: string, content: string | Buffer, scanId: string): ParseResult
```

**Dispatch flow:**
1. Check if content is SARIF format (`isSarifContent()` — checks for `runs` array)
2. If SARIF → use unified `parseSarif()` parser (handles all scanners)
3. If not SARIF → route to scanner-specific parser by name

**Scanner-specific parsers:**

| Scanner | Native Format | Parser | SARIF Fallback |
|---------|--------------|--------|----------------|
| semgrep | JSON (`{results:[...]}`) | `parseSemgrep()` | `parseSarif()` |
| gitleaks | JSON (flat array `[{...}]`) | `parseGitleaks()` | `parseSarif()` |
| flawfinder | SARIF (`--sarif`) | `parseSarif()` (unified) | — |
| cppcheck | XML | `parseCppcheck()` | `parseSarif()` |
| clang-tidy | Text (regex) | `parseClangTidy()` | `parseSarif()` |
| gcc-fanalyzer | Text (regex) | `parseGCCFanalyzer()` | `parseSarif()` |

### Semgrep Parser

**Input:** JSON output from `semgrep scan --json`

**Key fields extracted:**
- `check_id` → `rule`
- `path` → `file_path`
- `start.line` → `line_number`
- `extra.message` → `message`
- `extra.severity` → `severity` (mapped)
- `extra.metadata.cwe[0]` → `cwe_id`
- `extra.lines` → `code_snippet`

**Severity mapping:**
| Semgrep | Normalized |
|---------|------------|
| `CRITICAL` | `critical` |
| `HIGH` / `ERROR` | `high` |
| `MEDIUM` / `WARNING` | `medium` |
| `LOW` / `INFO` | `low` |

### Gitleaks Parser

**Input:** JSON output from `gitleaks detect --report-format json`

**Supported formats:**
1. **Flat array** (native gitleaks): `[{...}, {...}]`
2. **Object with results** (converters): `{results: [{...}]}`

**Key fields:**
- `RuleID` → `rule`
- `File` → `file_path`
- `StartLine` → `line_number`
- `Description` → `message`
- `Match` → `description` (truncated to 120 chars)

**Note:** All secrets mapped to severity `high`.

### Flawfinder Parser

**Input:** SARIF output from `flawfinder --sarif`

Uses unified `parseSarif()` handler for SARIF-format input.

### Cppcheck Parser

**Input:** XML output from `cppcheck --xml`

Uses `fast-xml-parser` with attribute handling (`@_` prefix).

**Severity mapping:**
| Cppcheck | Normalized |
|----------|------------|
| `error` | `high` |
| `warning` | `medium` |
| `style` / `performance` / `portability` | `low` |
| `information` | `info` |

### Clang-Tidy Parser

**Input:** Text output from `clang-tidy` (stderr)

**Line format:**
```
/path/file.c:42:12: warning: message [check-name]
C:\path\file.c:42:12: error: message [check-name]
```

**Regex:** `/^(.+):(\d+):(\d+):\s+(warning|error):\s+(.+?)(?:\s+\[([^\]]+)\])?\s*$/`

**Note:** Uses greedy `.+` for file path to handle Windows drive letters (`C:\path`).

**Severity mapping:**
| Check Type | Severity |
|------------|----------|
| `error` level | `high` |
| `cert-*` or `security-*` | `high` |
| `clang-analyzer-*` | `medium` |
| `bugprone-*` | `medium` |
| Other | `low` |

### GCC-Fanalyzer Parser

**Input:** Text output from `gcc -fanalyzer` (stderr)

**Line format:**
```
/path/file.c:42:12: warning: message [CWE-XXX] [-Wcheck-name]
```

**Regex:** `/^(.+?):(\d+):(\d+):\s+(warning|error):\s+(.+?)\s+\[(-W[^\]]+)\]\s*$/`

**CWE extraction:** Parses `[CWE-XXX]` from message for vulnerability classification.

**Severity mapping (CWE-based):**
| CWE | Severity |
|-----|----------|
| CWE-416, CWE-476, CWE-78, CWE-120, CWE-125 | `high` |
| CWE-401, CWE-690, CWE-190 | `medium` |
| Other | `medium` |

## 9. Finding Deduplication

### Fingerprint Generation (`finding.fingerprint.ts`)

```ts
function generateFindingFingerprint(input: {
  rule: string;
  file_path?: string | null;
  line_number?: number | null;
  message?: string | null;
}): string
```

**Algorithm:**
1. Normalize: trim whitespace, truncate message to 180 chars
2. Join with `||`: `{rule}||{file_path}||{line_number}||{message}`
3. SHA-256 hash → 64-character hex string

### Dedup Flow (`finding.service.ts`)

```
For each finding:
  1. Generate fingerprint from (rule, file_path, line_number, message)
  2. INSERT INTO finding_groups (..., fingerprint) ON CONFLICT DO NOTHING
  3. If conflict (group exists):
     - Fetch existing group
     - UPDATE last_seen_at = NOW()
     - Use existing group_id
  4. INSERT INTO findings (..., group_id)
```

**Result:** Same vulnerability across multiple scans → single `finding_groups` entry, multiple `findings` rows linked by `group_id`.

---

## 10. Timeline & Progress Events

### ProgressEvent Schema

```ts
interface ProgressEvent {
  id: string;           // UUID
  type: TimelineEventType;
  description: string;  // Human-readable
  timestamp: string;    // ISO 8601
  scanner?: string;     // For scanner-specific events
  durationSeconds?: number;
}
```

### TimelineEventType

```ts
type TimelineEventType =
  | 'triggered'     // Scan initiated
  | 'queued'        // Waiting for worker
  | 'cloning'       // Git clone in progress
  | 'scanning'      // Scanner execution
  | 'parsing'       // Output parsing
  | 'ai_verifying'  // AI verification
  | 'completed'     // Scan finished successfully
  | 'failed'        // Scan failed
  | 'skipped';      // Scanner skipped (not installed)
```

### Storage

Events are stored in `scans.progress_events` JSONB column. Appended atomically using PostgreSQL `||` operator:

```sql
UPDATE scans
SET progress_events = progress_events || '[{"id":"...","type":"scanning",...}]'::jsonb
WHERE id = $1;
```

### Timeline Construction (`scan.service.ts:getDetail`)

```
1. Add synthetic "Scan triggered" event at created_at
2. Append all stored progress_events (skip duplicate triggered)
3. Map scanner field to metadata for frontend display
4. If scan is still running, append in-progress event
5. Sort by timestamp
```

---

## 11. CI/CD Upload Flow

### CI/CD Init (`ci/init/route.ts`)

**Endpoint:** `POST /api/v1/ci/init`

**Purpose:** Create scan record before tools run (SonarQube-like flow).

**Request Body:**
```json
{
  "repoName": "MeAdmin/net-scanner",
  "repoUrl": "http://localhost:4000/MeAdmin/net-scanner.git",
  "branch": "main",
  "commit": "abc123",
  "prNumber": 1,
  "baseBranch": "main",
  "headBranch": "feature/test"
}
```

**Flow:**
1. Authenticate via CI/CD token (resolves workspace_id + project_id)
2. Find or create repository (auto-created as `external` if not found)
3. Create scan record: `status: 'queued'`, `triggerSource: 'ci'`
4. Return `scanId` for tools to use

### CI/CD Upload (`ci/upload/route.ts`)

**Endpoint:** `POST /api/v1/ci/upload`

**Request:** `multipart/form-data`
- `scanId`: Scan UUID (from init)
- `tool`: Scanner name (e.g., `semgrep`, `cppcheck`)
- `sarif`: SARIF/JSON/XML output file
- `repoName`: Repository name
- `findingsCount`: Number of findings (optional, for logging)

**Flow:**
1. Authenticate via CI/CD token
2. Look up scan by ID
3. Parse output using `parseScanResult()`
4. Store findings with dedup (per scanner + repository)
5. Upload SARIF to storage
6. Enqueue AI verification for new findings
7. Return `findingsCount`

### CI/CD Complete (`ci/complete/route.ts`)

**Endpoint:** `POST /api/v1/ci/complete`

**Request Body:**
```json
{
  "scanId": "uuid",
  "status": "completed",
  "tools": ["semgrep", "cppcheck", "flawfinder", "gitleaks", "clang-tidy", "gcc-fanalyzer"],
  "platform": "gitea",
  "trigger": "ci"
}
```

**Flow:**
1. Authenticate via CI/CD token
2. Update scan status
3. Evaluate quality gate (if projectId exists)
4. Post PR comment and set commit status (if applicable)

### CI/CD Workflow (`examples/gitea-actions.yml`)

**Scanner Commands:**

| Scanner | Command | Config |
|---------|---------|--------|
| semgrep | `semgrep scan --json --metrics=off --disable-version-check --no-git-ignore --skip-unknown-extensions --config p/default --config p/security-audit` | `p/default + p/security-audit` |
| cppcheck | `cppcheck --enable=warning,style,performance,portability,information --force --quiet --xml --xml-version=2` | XML output |
| flawfinder | `flawfinder --sarif --columns` | SARIF output |
| gitleaks | `gitleaks detect --source <dir> --report-format json --report-path results.json --no-git` | JSON output |
| clang-tidy | `clang-tidy --checks=-*,clang-analyzer-*,cert-*,bugprone-*,security-* --warnings-as-errors=-* <files>` | Text output |
| gcc-fanalyzer | `gcc -fanalyzer -Wall <files> -c` | Text output |

**Note:** All scanners use `--metrics off` for privacy. Semgrep requires specific configs (`p/default + p/security-audit`) when metrics are off.

---

## 12. Queue Jobs

### Queue System

Uses **pg-boss** (PostgreSQL-based job queue). Jobs are stored in `pgboss.job` table.

### Job Definitions

| Job Name | Handler | Description |
|----------|---------|-------------|
| `run-managed-scan` | `processRunManagedScanJob` | Clone repo, run scanners, upload results |
| `parse-scan-result` | `processParseScanResultJob` | Download output, parse, create findings |
| `ai-verify-finding` | `processAiVerifyFindingJob` | AI verification of single finding |
| `trigger-scheduled-managed-scan` | `processScheduledManagedScanJob` | Trigger scheduled scan |
| `cleanup-old-scan-files` | `processCleanupOldScanFilesJob` | Retention cleanup |
| `nvd-knowledge-backfill` | `processNvdKnowledgeBackfillJob` | NVD CVE data import |
| `sync-source-control` | `processSyncSourceControlJob` | SCM token refresh, rename detection |
| `scan-timeout-watchdog` | `processScanTimeoutWatchdog` | Detect orphaned scans (>30min) |

### Worker Registration

Workers are registered at server startup in `src/instrumentation.ts`:

```ts
await registerWorker(QUEUE_JOBS.RUN_MANAGED_SCAN, processRunManagedScanJob);
await registerWorker(QUEUE_JOBS.PARSE_SCAN_RESULT, processParseScanResultJob);
await registerWorker(QUEUE_JOBS.AI_VERIFY_FINDING, async (job) => {
  await processAiVerifyJob(job as Parameters<typeof processAiVerifyJob>[0]);
});
await registerWorker(QUEUE_JOBS.TRIGGER_SCHEDULED_MANAGED_SCAN, async (job) => {
  await processTriggerScheduledManagedScanJob(job as Parameters<typeof processTriggerScheduledManagedScanJob>[0]);
});
await registerWorker(QUEUE_JOBS.CLEANUP_OLD_SCAN_FILES, processCleanupOldScanFilesJob);
await registerWorker(QUEUE_JOBS.NVD_KNOWLEDGE_BACKFILL, processNvdKnowledgeBackfillJob);
await registerWorker(QUEUE_JOBS.SYNC_SOURCE_CONTROL, processSyncSourceControlJob);
await registerWorker(QUEUE_JOBS.SCAN_TIMEOUT_WATCHDOG, processScanTimeoutWatchdog);
```

### Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| `sync-source-control` | `*/30 * * * *` | Refresh SCM tokens, detect renames |
| `scan-timeout-watchdog` | `*/5 * * * *` | Fail scans stuck >30min |

---

## 13. API Reference

### `GET /api/v1/workspaces/:workspaceId/scans`

List scans with pagination and filters.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `per_page` | number | 20 | Items per page |
| `status` | string | — | Filter: `queued`, `processing`, `completed`, `failed` |
| `origin` | string | — | Filter: `managed`, `external_upload` |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "repository": "repo-name",
      "repoSub": "main",
      "status": "Completed",
      "findings": 12,
      "critical": 2,
      "ai": "8/12",
      "origin": "managed",
      "startedAt": "2026-06-10T...",
      "completedAt": "2026-06-10T...",
      "durationSeconds": 45
    }
  ],
  "total": 100
}
```

### `POST /api/v1/workspaces/:workspaceId/scans`

Trigger a managed scan.

**Request Body:**
```json
{
  "repositoryId": "uuid",
  "branch": "main",
  "scanners": ["semgrep", "gitleaks", "flawfinder"]
}
```

**Response:**
```json
{
  "scanId": "uuid",
  "jobId": "uuid",
  "status": "queued",
  "branch": "main",
  "scanners": ["semgrep", "gitleaks", "flawfinder"]
}
```

### `GET /api/v1/workspaces/:workspaceId/scans/:scanId`

Get scan detail with full timeline, findings breakdown, and AI stats.

**Response:**
```json
{
  "id": "uuid",
  "repository": "repo-name",
  "branch": "main",
  "commitSha": "abc123",
  "origin": "managed",
  "status": "completed",
  "startedAt": "2026-06-10T...",
  "completedAt": "2026-06-10T...",
  "durationSeconds": 45,
  "scannerResults": [
    { "scanner": "semgrep", "status": "completed", "findingsCount": 5, "durationSeconds": 20 },
    { "scanner": "flawfinder", "status": "completed", "findingsCount": 3, "durationSeconds": 2 }
  ],
  "totalFindings": 8,
  "severityBreakdown": { "critical": 1, "high": 2, "medium": 3, "low": 2, "info": 0 },
  "aiStats": { "enabled": true, "verified": 5, "total": 8, "truePositives": 4, "falsePositives": 1, "pending": 3 },
  "timeline": [
    { "id": "triggered", "type": "triggered", "description": "Scan triggered", "timestamp": "..." },
    { "id": "...", "type": "cloning", "description": "Preparing repository", "timestamp": "..." },
    { "id": "...", "type": "cloning", "description": "Repository cloned", "timestamp": "..." },
    { "id": "...", "type": "scanning", "description": "Running semgrep", "timestamp": "...", "metadata": { "scanner": "semgrep" } },
    { "id": "...", "type": "scanning", "description": "semgrep completed", "timestamp": "...", "durationSeconds": 20, "metadata": { "scanner": "semgrep" } },
    { "id": "...", "type": "parsing", "description": "Parsing semgrep results", "timestamp": "...", "metadata": { "scanner": "semgrep" } },
    { "id": "...", "type": "parsing", "description": "semgrep parsing completed — 5 findings", "timestamp": "...", "metadata": { "scanner": "semgrep" } },
    { "id": "...", "type": "scanning", "description": "Running flawfinder", "timestamp": "...", "metadata": { "scanner": "flawfinder" } },
    { "id": "...", "type": "scanning", "description": "flawfinder completed", "timestamp": "...", "durationSeconds": 2, "metadata": { "scanner": "flawfinder" } },
    { "id": "...", "type": "parsing", "description": "Parsing flawfinder results", "timestamp": "...", "metadata": { "scanner": "flawfinder" } },
    { "id": "...", "type": "parsing", "description": "flawfinder parsing completed — 3 findings", "timestamp": "...", "metadata": { "scanner": "flawfinder" } },
    { "id": "...", "type": "completed", "description": "Scan completed", "timestamp": "..." }
  ]
}
```

### `POST /api/v1/workspaces/:workspaceId/scans/upload`

Upload CI/CD scan results.

**Request:** `multipart/form-data`

**Response:**
```json
{
  "scanId": "uuid",
  "findingsCount": 15
}
```

### `GET /api/v1/workspaces/:workspaceId/scanners`

Get scanner availability.

**Response:**
```json
{
  "semgrep": true,
  "gitleaks": true,
  "flawfinder": true,
  "cppcheck": true,
  "clang-tidy": true,
  "gcc-fanalyzer": true
}
```

---

## 14. Semgrep Rules

### Local Rules Directory: `rules/semgrep/`

Semgrep uses **local rules** (not downloaded from registry) for faster execution and offline capability.

**Language Packs:**

| Directory | Language/Framework | Example Rules |
|-----------|-------------------|---------------|
| `c/` | C | buffer overflow, strcpy, printf, memset |
| `java/` | Java | Spring, Servlets, JBoss, deserialization |
| `javascript/` | JavaScript | XSS, prototype pollution, eval |
| `typescript/` | TypeScript | Type safety, injection |
| `python/` | Python | Injection, pickle, yaml.load |
| `go/` | Go | SQL injection, path traversal |
| `ruby/` | Ruby | SQL injection, eval |
| `rust/` | Rust | Unsafe code patterns |
| `php/` | PHP | SQL injection, file inclusion |
| `csharp/` | C# | SQL injection, XSS |
| `kotlin/` | Kotlin | Android security |
| `swift/` | Swift | iOS security |
| `terraform/` | Terraform | AWS/Azure/GCP misconfig |
| `dockerfile/` | Dockerfile | Image security |
| `yaml/` | YAML | Kubernetes, GitHub Actions |
| `generic/` | Multi-language | JWT, secrets, API keys |

**Rule YAML Structure:**
```yaml
rules:
- id: insecure-use-string-copy-fn
  pattern-either:
  - pattern: strcpy(...)
  - pattern: strncpy(...)
  message: >-
    Finding triggers whenever there is a strcpy or strncpy used.
  metadata:
    cwe:
    - 'CWE-676: Use of Potentially Dangerous Function'
    category: security
    technology:
    - c
    confidence: LOW
  languages: [c]
  severity: WARNING
```

---

## 15. Frontend Types

### `ScanRow` (Scan List)

```ts
interface ScanRow {
  id: string;
  repository: string;        // Repository name
  repoSub: string;           // Branch name
  status: 'Queued' | 'Running' | 'Processing' | 'Parsing' | 'Completed' | 'Failed';
  stage: string;             // Raw DB status
  findings: number;          // Total findings count
  critical: number;          // Critical findings count
  ai: string;                // "12/15" or "—"
  origin: 'managed' | 'external_upload';
  provider: ScmProvider | null;
  connectionType: 'scm' | 'external';
  startedAt?: string;        // ISO timestamp
  completedAt?: string;      // ISO timestamp
  durationSeconds?: number;
}
```

### `ScanDetail` (Scan Detail Drawer)

```ts
interface ScanDetail {
  id: string;
  repository: string;
  branch: string;
  commitSha: string;
  origin: 'managed' | 'external_upload';
  status: 'queued' | 'running' | 'processing' | 'parsing' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
  scannerResults: ScannerResult[];
  totalFindings: number;
  severityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  aiStats?: {
    enabled: boolean;
    verified: number;
    total: number;
    truePositives: number;
    falsePositives: number;
    pending: number;
  };
  timeline: TimelineEvent[];
}
```

### `TimelineEvent`

```ts
interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  description: string;
  timestamp: string;
  durationSeconds?: number;
  metadata?: Record<string, string | number>;
}
```

### `Finding` (Finding Detail)

```ts
interface Finding {
  id: string;
  scanner: string;
  rule: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  filePath?: string;
  lineNumber?: number;
  message?: string;
  cwe?: string;
  status: 'open' | 'verified' | 'fixed' | 'false_positive' | 'ignored';
  aiVerdict?: 'true_positive' | 'false_positive' | 'pending';
  confidence?: number;
  codeSnippet?: string;
  sourceCode?: string;
  cweIds?: string[];
  dataFlow?: string;
  taintSource?: string;
  aiAnalysis?: Record<string, AiRichAnalysis>;
}
```

---

## 16. File Reference

### Core Scanner Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/server/modules/scan/scanners.ts` | 145 | Scanner CLI command configurations |
| `src/server/modules/scan/scanner-availability.ts` | 94 | Platform-aware binary detection |
| `src/server/modules/scan/constants.ts` | 119 | Scanner IDs, limits, error codes |
| `src/server/modules/scan/services/managed-scan.service.ts` | 523 | Scan execution pipeline |
| `src/server/modules/scan/upload.service.ts` | 112 | CI/CD upload handling |
| `src/server/modules/scan/scan.service.ts` | 336 | Business logic with auth |
| `src/server/modules/scan/rules.ts` | 157 | Rule file reading + search |

### Parser Files

| File | Lines | Input Format |
|------|-------|-------------|
| `src/server/modules/scan/parsers/index.ts` | 154 | Parser dispatcher + SARIF auto-detect |
| `src/server/modules/scan/parsers/semgrep.parser.ts` | 126 | JSON |
| `src/server/modules/scan/parsers/gitleaks.parser.ts` | 103 | JSON (flat array or object) |
| `src/server/modules/scan/parsers/flawfinder.parser.ts` | 193 | SARIF |
| `src/server/modules/scan/parsers/cppcheck.parser.ts` | 211 | XML |
| `src/server/modules/scan/parsers/clang-tidy.parser.ts` | 154 | Text (regex) |
| `src/server/modules/scan/parsers/gcc-fanalyzer.parser.ts` | 192 | Text (regex) |

### Repository Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/server/modules/scan/repositories/scan.repository.ts` | 228 | Scan CRUD + progress events |
| `src/server/modules/scan/repositories/finding.repository.ts` | 303 | Finding CRUD + history |
| `src/server/modules/scan/repositories/ai-verification.repository.ts` | — | AI verification CRUD |
| `src/server/modules/scan/repositories/quality-gate.repository.ts` | — | Quality gate CRUD |

### Service Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/server/modules/scan/services/finding.service.ts` | 244 | Finding dedup + CRUD |
| `src/server/modules/scan/services/finding.fingerprint.ts` | 31 | SHA-256 fingerprint |
| `src/server/modules/scan/services/ai-verification.service.ts` | — | AI verification orchestration |
| `src/server/modules/scan/services/quality-gate.service.ts` | — | Quality gate evaluation |

### Queue Job Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/server/modules/queue/jobs/run-managed-scan.job.ts` | 15 | Managed scan worker |
| `src/server/modules/queue/jobs/parse-scan-result.job.ts` | 331 | Parse worker + quality gate |
| `src/server/modules/queue/jobs/ai-verify-finding.job.ts` | — | AI verify worker |
| `src/server/modules/queue/jobs/scan-timeout-watchdog.job.ts` | 79 | Detect orphaned scans |
| `src/server/modules/queue/jobs/sync-source-control.job.ts` | — | SCM token refresh |
| `src/server/modules/queue/queue.service.ts` | 79 | pg-boss singleton |

### Schema Files

| File | Lines | Purpose |
|------|-------|---------|
| `drizzle/schema/scans.ts` | 118 | scans, scan_results, quality_gates, schedules, scan_uploads |
| `drizzle/schema/findings.ts` | 85 | finding_groups, findings, ai_verifications, finding_history, comments |

### API Route Files

| File | Method | Endpoint |
|------|--------|----------|
| `src/app/api/v1/workspaces/[workspaceId]/scans/route.ts` | GET | List scans |
| `src/app/api/v1/workspaces/[workspaceId]/scans/route.ts` | POST | Trigger scan |
| `src/app/api/v1/workspaces/[workspaceId]/scans/[scanId]/route.ts` | GET | Scan detail |
| `src/app/api/v1/workspaces/[workspaceId]/scans/upload/route.ts` | POST | Upload results |
| `src/app/api/v1/workspaces/[workspaceId]/scanners/route.ts` | GET | Scanner availability |
| `src/app/api/v1/ci/init/route.ts` | POST | CI/CD scan init |
| `src/app/api/v1/ci/upload/route.ts` | POST | CI/CD findings upload |
| `src/app/api/v1/ci/complete/route.ts` | POST | CI/CD scan complete |

### Frontend Files

| File | Purpose |
|------|---------|
| `src/features/scan/ScanTable.tsx` | Scan list table |
| `src/features/scan/ScanDetailDrawer.tsx` | Scan detail drawer |
| `src/features/scan/ScanTimeline.tsx` | Timeline visualization |
| `src/features/scan/NewScanModal.tsx` | Trigger scan modal |
| `src/features/scan/FindingItem.tsx` | Finding card |
| `src/modules/scan/api.ts` | API client |
| `src/modules/scan/queries.ts` | React Query hooks |
| `src/modules/scan/types.ts` | Frontend types |
| `src/commons/types/domain.ts` | Shared domain types |

---

## 17. Known Issues & Fixes (2026-06-13)

### Parser Fixes

| Issue | Root Cause | Fix |
|-------|------------|-----|
| **Gitleaks 0 findings** | Flat array `[{...}]` not handled | Added `Array.isArray(report)` check |
| **Cppcheck fragile XML** | Complex extraction chain | Simplified direct `resultsObj['error']` extraction |
| **Clang-tidy missing findings** | Non-greedy regex fails on Windows paths | Greedy `.+` for file path |
| **System header filter** | `file.includes('include')` filters ALL user files | Precise: `/usr/include/`, `\include\` |

### Scan Status Fixes

| Issue | Root Cause | Fix |
|-------|------------|-----|
| **Status shows "Running" for all** | `toScanRow()` collapses to 3 states | Proper `statusMap` for all 6 states |
| **Findings visible during parsing** | No status filter on findings count | Dim count for non-completed scans |
| **Missing status colors** | `scanStatus` token map incomplete | Added `Processing` (blue), `Parsing` (purple) |

### Critical Bug Fixes

| Issue | Root Cause | Fix |
|-------|------------|-----|
| **Quality gate wrong ID** | `repositoryId` passed as `workspaceId` | Look up `workspaceId` from `repositories` table |
| **CI/CD schema invalid status** | `pending` not handled by watchdog/UI | Changed to actual scan statuses |
| **Semgrep config conflict** | `--config auto` + `--metrics off` | Use `--config p/default --config p/security-audit` |
| **GCC-analyzer name mismatch** | Workflow sends `gcc-analyzer` | Changed to `gcc-fanalyzer` |

### Semgrep Config

| Config | Findings | Coverage |
|--------|----------|----------|
| `p/default` | 1 (scanf) | Basic |
| `p/security-audit` | 2 (strcpy + scanf) | Better |
| `p/default + p/security-audit` | 2 (deduplicated) | **Recommended** |
| `p/owasp-top-ten` | 0 | Limited C rules |
| `p/cwe-top-25` | 0 | Limited C rules |

**Note:** Semgrep's C rules are limited. Command injection (CWE-78) and use-after-free (CWE-416) are NOT detected. Use cppcheck, flawfinder, or custom rules for comprehensive C coverage.
