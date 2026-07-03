---
title: Scan Pipeline
description: How scans are triggered, executed, and completed
---

# Scan Pipeline

## Overview

The scan pipeline handles the complete lifecycle from trigger to findings.

## Pipeline Architecture

```mermaid
flowchart TD
    A["Trigger"] --> B{"Scan Type?"}
    B -->|"Managed"| C["POST /api/v1/scans"]
    B -->|"Scheduled"| D["trigger-scheduled-managed-scan"]
    B -->|"External"| E["POST /api/v1/scans/upload/init"]

    C --> F["Enqueue run-managed-scan"]
    D --> F
    E --> G["Create scan upload"]

    F --> H["Worker: git clone"]
    H --> I["Run scanners (parallel)"]
    I --> J["Parse results"]
    J --> K["Deduplicate by fingerprint"]
    K --> L["Create findings"]
    L --> M["Enqueue AI verify"]
    M --> N["AI verifies each finding"]
    N --> O["Evaluate quality gate"]
    O --> P["Post commit status (if PR)"]

    G --> Q["CI uploads results"]
    Q --> R["Enqueue parse-scan-result"]
    R --> J

    style A fill:#4a9eff,color:#fff
    style I fill:#f59e0b,color:#fff
    style N fill:#a855f7,color:#fff
    style O fill:#ef4444,color:#fff
```

## Scan Lifecycle

```mermaid
stateDiagram-v2
    [*] --> pending: Trigger scan
    pending --> queued: Enqueued
    queued --> cloning: Worker picks up
    cloning --> scanning: Repo cloned
    scanning --> parsing: Scanner output
    parsing --> ai_verifying: Results parsed
    ai_verifying --> completed: AI verification done
    ai_verifying --> failed: Error occurred
    completed --> [*]
    failed --> [*]

    note right of pending: Managed: user triggers\nExternal: CI/CD upload
    note right of scanning: Multiple scanners run\nin parallel
```

| Stage | Description | Duration |
|-------|-------------|----------|
| `pending` | Scan record created | — |
| `queued` | Enqueued in pg-boss | Seconds |
| `cloning` | Git clone in progress | 10-30s |
| `scanning` | Scanners executing in parallel | 30s-5min |
| `parsing` | Output parsed into findings | 5-15s |
| `ai_verifying` | AI models verifying findings | 1-10min |
| `completed` | Scan finished | — |

## Scanner Execution

```mermaid
flowchart LR
    subgraph "Scan Worker"
        Clone["git clone"] --> Router["Scanner Router"]
    end

    subgraph "Scanners (parallel)"
        Router --> Semgrep["🔍 Semgrep"]
        Router --> Gitleaks["🔑 Gitleaks"]
        Router --> Flawfinder["🐛 Flawfinder"]
        Router --> Cppcheck["⚡ Cppcheck"]
        Router --> ClangTidy["🔧 Clang-Tidy"]
        Router --> GCC["🏗️ GCC FanAnalyzer"]
    end

    subgraph "Parsers"
        Semgrep --> JSON["JSON Parser"]
        Gitleaks --> JSON
        Flawfinder --> CSV["CSV Parser"]
        Cppcheck --> XML["XML Parser"]
        ClangTidy --> Diag["Diagnostic Parser"]
        GCC --> GCCOut["GCC Output Parser"]
    end

    JSON --> Results["Structured Findings"]
    CSV --> Results
    XML --> Results
    Diag --> Results
    GCCOut --> Results
```

## Finding Deduplication

```mermaid
flowchart TD
    A["Scanner output"] --> B["Generate fingerprint<br/>SHA-256(rule + file + line + code)"]
    B --> C{"Fingerprint exists<br/>in finding_groups?"}
    C -->|"Yes (same repo)"| D["Update last_seen_at<br/>isNew = false"]
    C -->|"No"| E["Create new finding_group<br/>isNew = true"]
    D --> F["Create finding record"]
    E --> F
    F --> G["Enqueue AI verification"]

    style C fill:#f59e0b,color:#fff
    style E fill:#22c55e,color:#fff
```

## Finding Deduplication

Each finding generates a **fingerprint** (SHA-256 hash of rule + file + line + code snippet). If a matching fingerprint exists in `finding_groups` for the same repository, it's an existing finding. Otherwise, a new `finding_group` is created.

## AI Verification

After findings are created, each finding is enqueued for AI verification:

```mermaid
sequenceDiagram
    participant Q as Queue Worker
    participant V as AI Verifier
    participant M as AI Model
    participant DB[(Database)]

    Q->>V: ai-verify-finding job
    V->>DB: Get finding + group details
    V->>DB: Get knowledge entries (CWE context)
    V->>M: Send verification prompt
    M-->>V: { verdict, confidence, explanation }
    V->>DB: INSERT ai_verification
    V->>DB: UPDATE finding_group.verdict
```

## Quality Gate Evaluation

```mermaid
flowchart TD
    A["Scan completed"] --> B["Get quality gate config"]
    B --> C["Count findings by severity"]
    C --> D{"Evaluate rules"}
    D --> E{"fail_on_critical<br/>AND critical > 0?"}
    E -->|"Yes"| I["FAIL"]
    E -->|"No"| K["PASS"]
    D --> F{"fail_on_high<br/>AND high > 0?"}
    F -->|"Yes"| I
    F -->|"No"| K
    D --> G{"fail_on_pending<br/>AND pending > 0?"}
    G -->|"pending_behavior=fail"| I
    G -->|"pending_behavior=warn"| J["WARN"]
    G -->|"pending_behavior=ignore"| K
    I --> L["Post commit status: failure"]
    J --> L2["Post commit status: pending"]
    K --> L3["Post commit status: success"]

    style I fill:#ef4444,color:#fff
    style J fill:#f59e0b,color:#fff
    style K fill:#22c55e,color:#fff
```

## External Upload (CI/CD)

```mermaid
sequenceDiagram
    participant CI as CI/CD Pipeline
    participant API
    participant DB[(Database)]

    CI->>API: POST /scans/upload/init
    API->>DB: Create scan (status: pending)
    API-->>CI: scanId

    loop Each scanner
        CI->>API: POST /scans/upload (scanId, scanner, file)
        API->>DB: Store scan_result (file_key, parsed_summary)
    end

    CI->>API: POST /scans/upload/complete
    API->>DB: Update scan status → completed
    API->>API: Enqueue parse-scan-result
    Note over API: Parse results, create findings,\nrun AI verification
```
