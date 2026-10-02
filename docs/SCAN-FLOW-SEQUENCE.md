# Scan Flow Sequence Diagram

**Purpose**: This document provides detailed sequence diagrams for both scanning flows, showing the exact interaction between components including AI verification.

---

## Flow 1: External CI Upload (Complete Pipeline)

```mermaid
sequenceDiagram
    participant CI as CI Pipeline<br/>(GitHub Actions)
    participant API as Upload API<br/>/scans/upload
    participant Auth as Auth Service
    participant Upload as Upload Service
    participant Storage as Object Storage<br/>(S3/MinIO/Local)
    participant Queue as Queue Service<br/>(pg-boss)
    participant Parser as Parser Worker
    participant Finding as Finding Service
    participant AI as AI Verification Worker
    participant LLM as AI Model<br/>(Qwen2.5/Llama3)
    participant DB as PostgreSQL

    CI->>API: POST /projects/{id}/scans/upload<br/>Authorization: Bearer sast_p_xxx<br/>Files: semgrep.json, gitleaks.json

    API->>Auth: authenticate(request)
    Auth-->>API: { type: 'project_api_token', projectId, permissions }

    API->>Upload: uploadResults(input)

    Upload->>Upload: validateScanners(files)
    Note over Upload: Check each file<br/>against SUPPORTED_SCANNERS

    alt Repository not exists
        Upload->>DB: resolveOrCreateExternalRepository()
        DB-->>Upload: { id: 'repo-ext-1', connection_type: 'external' }
    end

    Upload->>DB: createScan({ origin: 'external_upload' })
    DB-->>Upload: { id: 'scan-100', status: 'processing' }

    Upload->>DB: createScanUpload({ projectApiTokenId })
    Note over DB: Audit trail: who uploaded what

    loop For each scanner file
        Upload->>Storage: upload(buffer, 'scan-100/semgrep.json')
        Storage-->>Upload: { key: 'scan-100/semgrep.json', size: 2048 }

        Upload->>DB: createScanResult({ fileKey, status: 'queued' })
        DB-->>Upload: { id: 'result-1' }

        Upload->>Queue: enqueue('parse-scan-result', { scanResultId })
    end

    Upload->>DB: updateScanStatus('scan-100', 'completed')
    Upload-->>API: { success: true, scanId: 'scan-100', resultsCount: 2 }
    API-->>CI: 200 OK

    Note over Queue,Parser: === Background: Parse ===

    Queue->>Parser: processParseScanResultJob(job)
    Parser->>Storage: download('scan-100/semgrep.json')
    Storage-->>Parser: raw content

    Parser->>Parser: parseScanResult('semgrep', content)
    Note over Parser: Semgrep → findings with<br/>severity, CWE, file, line

    Parser->>DB: updateScanResult({ parsedSummary })
    Parser->>Finding: createManyWithDedup(projectId, scanId, findings)
    Finding->>Finding: generateFindingFingerprint(rule, file, line)
    Finding->>DB: findOrCreateFindingGroup({ fingerprint })
    Finding->>DB: insert findings + link to group
    Finding-->>Parser: { created: 5 }

    Parser->>DB: updateScanResult({ totalFindings: 5 })

    Note over Queue,AI: === Background: AI Verification (if enabled) ===

    Parser->>Queue: enqueue('ai-verify-findings', { scanId, findings })
    Queue-->>Parser: { jobId: 'job-ai-1' }

    Queue->>AI: processAiVerifyJob(job)
    AI->>DB: getFindingsForVerification(scanId)
    DB-->>AI: { findings: [...], model: 'qwen2.5-sva' }

    loop For each finding
        AI->>DB: getKnowledgeContext(rule, file_path)
        DB-->>AI: { cwe_entries, nvd_entries }

        AI->>LLM: verify(code, rule, context, knowledge)
        Note over LLM: QLoRA fine-tuned model<br/>Input: code + rule + context<br/>Output: verdict + confidence

        LLM-->>AI: { verdict: 'true_positive', confidence: 0.87, reasoning: '...' }

        AI->>DB: insertAiVerification({ finding_id, verdict, confidence, reasoning })
        AI->>DB: updateFinding({ ai_verdict: 'true_positive', status: 'verified' })
    end

    AI->>DB: updateScanResult({ aiVerifiedCount: 5 })
```

---

## Flow 2: Managed SCM Scan (Complete Pipeline)

```mermaid
sequenceDiagram
    participant User as User / Webhook
    participant API as Scan API<br/>/scans/run
    participant Service as ManagedScan Service
    participant DB as PostgreSQL
    participant Queue as Queue Service<br/>(pg-boss)
    participant Worker as Queue Worker
    participant Git as Git CLI
    participant Scanner as Scanner CLI<br/>(semgrep/gitleaks)
    participant Storage as Object Storage
    participant Parser as Parser Worker
    participant Finding as Finding Service
    participant AI as AI Verification Worker
    participant LLM as AI Model

    User->>API: POST /workspaces/{id}/projects/{pid}/repositories/{rid}/scans/run

    API->>Service: triggerManualScan(input)

    Service->>DB: findRepositoryByIdAndWorkspace()
    DB-->>Service: { repository: { connection_type: 'scm', policy_id: 'p1' } }

    Service->>DB: scanPolicyRepository.findById('p1')
    DB-->>Service: { scanners: ['semgrep', 'gitleaks'], ai_verification: 'enabled' }

    Service->>Service: normalizeScanners(policy.scanners)

    Service->>DB: createScan({ origin: 'managed', status: 'queued' })
    DB-->>Service: { id: 'scan-200' }

    Service->>Queue: enqueue('run-managed-scan', { scanId, repoUrl, branch, scanners })
    Queue-->>Service: { jobId: 'job-1' }

    Service-->>API: { scanId: 'scan-200', status: 'queued' }
    API-->>User: 200 OK

    Note over Queue,Worker: === Background: Execute ===

    Queue->>Worker: processManagedScanJob(job)

    Worker->>DB: updateScanStatus('scan-200', 'processing')

    Worker->>Git: git clone --depth 1 --branch main repo.git /tmp/scan-200/
    Git-->>Worker: Repository cloned

    loop For each scanner in policy.scanners
        Worker->>Worker: checkScannerAvailability(scanner)

        alt Scanner not installed
            Worker->>Worker: SKIP + log warning
        else Scanner available
            Worker->>Scanner: execFile('semgrep', ['--config', 'auto', '--json', '/tmp/scan-200/'])
            Scanner-->>Worker: JSON output (stdout)

            Worker->>Storage: upload(output, 'scan-200/semgrep.json')
            Storage-->>Worker: { key: 'scan-200/semgrep.json' }

            Worker->>DB: createScanResult({ scanner: 'semgrep', fileKey })
            DB-->>Worker: { id: 'result-1' }

            Worker->>Queue: enqueue('parse-scan-result', { scanResultId: 'result-1' })
        end
    end

    Worker->>Worker: evaluateResults()
    Note over Worker: If all scanners failed/skipped<br/>→ status: 'failed'<br/>Else → status: 'completed'

    Worker->>DB: updateScanStatus('scan-200', 'completed')
    Worker->>Git: rm -rf /tmp/scan-200/

    Note over Queue,Parser: === Background: Parse ===

    Queue->>Parser: processParseScanResultJob(job)
    Parser->>Storage: download('scan-200/semgrep.json')
    Storage-->>Parser: raw content

    Parser->>Parser: parseScanResult('semgrep', content)

    Parser->>DB: updateScanResult({ parsedSummary })
    Parser->>Finding: createManyWithDedup(projectId, scanId, findings)
    Finding->>Finding: generateFindingFingerprint()
    Finding->>DB: findOrCreateFindingGroup() + insert findings

    Note over Queue,AI: === Background: AI Verification (if policy.ai_verification === 'enabled') ===

    Parser->>Queue: enqueue('ai-verify-findings', { scanId, findings })
    Queue-->>Parser: { jobId: 'job-ai-1' }

    Queue->>AI: processAiVerifyJob(job)
    AI->>DB: getFindingsForVerification(scanId)
    DB-->>AI: { findings: [...], model: 'qwen2.5-sva' }

    loop For each finding
        AI->>DB: getKnowledgeContext(rule, file_path)
        DB-->>AI: { cwe_entries, nvd_entries }

        AI->>LLM: verify(code, rule, context, knowledge)
        LLM-->>AI: { verdict: 'true_positive', confidence: 0.87, reasoning: '...' }

        AI->>DB: insertAiVerification({ finding_id, verdict, confidence, reasoning })
        AI->>DB: updateFinding({ ai_verdict: 'true_positive', status: 'verified' })
    end

    AI->>DB: updateScanResult({ aiVerifiedCount: 5 })
```

---

## Flow 3: Finding Status Workflow

```mermaid
sequenceDiagram
    participant User as User
    participant API as Finding API
    participant Service as Finding Service
    participant DB as PostgreSQL

    User->>API: PATCH /findings/{id}/status<br/>Body: { status: 'fixed' }

    API->>Service: updateStatus(findingId, 'fixed', userId)

    Service->>DB: getFinding(findingId)
    DB-->>Service: { id, status: 'open' }

    Service->>DB: updateFinding(findingId, {<br/>  status: 'fixed',<br/>  updated_by: userId,<br/>  updated_at: new Date() })

    Service->>DB: insertFindingHistory({<br/>  finding_id: findingId,<br/>  action: 'status_changed',<br/>  from: 'open',<br/>  to: 'fixed',<br/>  by: userId })

    Service-->>API: { success: true }
    API-->>User: 200 OK
```

---

## AI Verification Detail

```mermaid
sequenceDiagram
    participant Worker as AI Worker
    participant DB as PostgreSQL
    participant LLM as AI Model<br/>(Qwen2.5-Coder-SVA)
    participant KB as Knowledge Base<br/>(CWE/NVD)

    Worker->>DB: getFinding(findingId)
    DB-->>Worker: { id, rule, file_path, message, scanner }

    Worker->>DB: getSourceCode(file_path, line_number)
    DB-->>Worker: code snippet

    Worker->>KB: getKnowledgeContext(rule, file_path)
    KB-->>Worker: { cwe_entries: ['CWE-89'], nvd_entries: [...] }

    Worker->>LLM: verify({<br/>  code: codeSnippet,<br/>  rule: rule,<br/>  context: context,<br/>  knowledge: knowledgeBase<br/>})
    Note over LLM: QLoRA fine-tuned model<br/>Prompt: "Analyze this code...<br/>Is this a true positive?"<br/>Output: verdict + confidence

    LLM-->>Worker: {<br/>  verdict: 'true_positive',<br/>  confidence: 0.87,<br/>  reasoning: 'strcpy without bounds check...',<br/>  likely_cwe: ['CWE-120'],<br/>  fix_suggestion: 'Use strncpy instead'<br/>}

    Worker->>DB: insertAiVerification({<br/>  finding_id: findingId,<br/>  model_id: 'qwen2.5-sva',<br/>  verdict: 'true_positive',<br/>  confidence: 0.87,<br/>  explanation: 'strcpy without bounds...',<br/>  likely_cwe: ['CWE-120'],<br/>  fix_suggestion: 'Use strncpy'<br/>})

    Worker->>DB: updateFinding(findingId, {<br/>  ai_verdict: 'true_positive',<br/>  status: 'verified'<br/>})
```

---

## Queue Job Chain

```
Upload/Trigger
    │
    ├──→ enqueue('run-managed-scan')  [Managed flow only]
    │         │
    │         ▼
    │    processManagedScanJob()
    │         │
    │         ├──→ enqueue('parse-scan-result')  [per scanner]
    │         │
    │         └──→ enqueue('ai-verify-findings')  [if policy.ai_verification = 'enabled']
    │
    └──→ enqueue('parse-scan-result')  [External flow]
              │
              ├──→ processParseScanResultJob()
              │         │
              │         ├──→ create findings with dedup
              │         │
              │         └──→ enqueue('ai-verify-findings')  [if enabled]
              │
              └──→ processAiVerifyJob()
                        │
                        ├──→ for each finding:
                        │      ├──→ getKnowledgeContext()
                        │      ├──→ LLM.verify()
                        │      ├──→ insertAiVerification()
                        │      └──→ updateFinding()
                        │
                        └──→ updateScanResult({ aiVerifiedCount })
```

---

## Storage Layout

```
/storage/
├── artifacts/                    # Scan reports (30-day retention)
│   └── scan-{id}/
│       ├── semgrep.json         # Raw scanner output
│       ├── gitleaks.json        # Raw scanner output
│       └── trivy.json           # Raw scanner output
├── reports/                      # Generated reports
│   └── report-{id}.pdf
├── backups/                      # Database dumps (7-day retention)
│   └── backup-{date}.sql
└── logs/                         # Application logs (7-day retention)
    └── app-{date}.log

/tmp/
└── scan-{id}/                   # Cloned repos (ephemeral)
    └── repo/                    # Git checkout
```

---

## Key Database Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `scans` | Scan execution record | `origin`, `status`, `branch`, `commit_sha` |
| `scan_results` | Per-scanner results | `scanner`, `file_key`, `parsed_summary` |
| `scan_uploads` | Audit trail | `project_api_token_id`, `source` |
| `findings` | Individual findings | `severity`, `status`, `ai_verdict` |
| `finding_groups` | Deduplication groups | `fingerprint`, `first_seen_at` |
| `ai_verifications` | AI verification results | `verdict`, `confidence`, `reasoning` |
| `ai_models` | AI model configuration | `provider`, `base_url`, `role` |
| `scan_policies` | Reusable scan configs | `scanners[]`, `ai_verification` |

---

## Constants Reference

```ts
// src/server/modules/scan/constants.ts
SUPPORTED_SCANNERS = ['semgrep', 'cppcheck', 'gitleaks', 'trivy', 'flawfinder', 'sarif']
SCAN_ORIGINS = { MANAGED: 'managed', EXTERNAL_UPLOAD: 'external_upload' }
ASYNC_PARSE_THRESHOLD_BYTES = 5 * 1024 * 1024  // 5MB
MAX_UPLOAD_TOTAL_SIZE_BYTES = 50 * 1024 * 1024  // 50MB
RETENTION_DAYS = 30

// src/server/modules/scan/scanners.ts
DEFAULT_SCANNER_TIMEOUT_SECONDS = 300
DEFAULT_GIT_CLONE_DEPTH = 1
DEFAULT_MANAGED_SCAN_BRANCH = 'main'
MAX_SCANNER_OUTPUT_BUFFER_BYTES = 20 * 1024 * 1024  // 20MB
```
