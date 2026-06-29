# Knowledge Base Flow

CWE/NVD knowledge management for AI verification context.

## Pre-conditions
- Knowledge sources configured (NVD/CWE)
- User has KNOWLEDGE_VIEW permission

## Role Context
| Action | Owner | Manager | Reviewer | Member |
|--------|-------|---------|----------|--------|
| View entries | ✅ | ✅ | ✅ | ✅ |

## Architecture

```mermaid
graph TB
    subgraph "Knowledge Sources"
        NVD["NVD Feed<br/>(National Vulnerability DB)"]
        CWE["CWE Catalog<br/>(Weakness Enumeration)"]
        Custom["Custom Rules"]
    end

    subgraph "Sync Pipeline"
        Sync["sync-knowledge-base<br/>worker (every 6h)"]
        Backfill["nvd-knowledge-backfill<br/>worker (manual)"]
    end

    subgraph "Knowledge Store"
        Sources["knowledge_sources<br/>(source config)"]
        Entries["knowledge_entries<br/>(CWE/NVD data)"]
    end

    subgraph "AI Enrichment"
        AI["AI Verification"]
        Prompt["Verification Prompt<br/>+ CWE Context"]
    end

    NVD --> Sync
    CWE --> Sync
    Sync --> Entries
    Backfill --> Entries
    Entries --> Prompt
    Prompt --> AI

    style Entries fill:#336791,color:#fff
    style AI fill:#f59e0b,color:#fff
```

## Sync Flow

Server-managed background sync (no user action required):

```mermaid
sequenceDiagram
    participant Cron as Cron Job
    participant Worker as sync-knowledge-base
    participant NVD as NVD API
    participant DB[(Database)]

    Cron->>Worker: Trigger every 6 hours
    Worker->>DB: SELECT knowledge_sources WHERE status = 'connected'
    Worker->>NVD: Fetch recent CVEs (since lastSyncedAt)
    NVD-->>Worker: CVE data
    Worker->>DB: UPSERT knowledge_entries (by source_id + cwe_id)
    Worker->>DB: UPDATE knowledge_sources.lastSyncedAt
    Note over Worker,DB: Skip muted entries<br/>Track used_by_ai_count
```

## AI Usage

During AI verification, the system enriches prompts with relevant knowledge:

```mermaid
flowchart LR
    A["Finding with CWE-89"] --> B["Query knowledge_entries<br/>WHERE cwe_id = 'CWE-89'"]
    B --> C["Include in AI prompt:<br/>- CWE title & description<br/>- Remediation steps<br/>- Related weaknesses"]
    C --> D["AI verifies with<br/>better context"]
```

## User Scenarios

### 1. View Knowledge Base
1. User navigates to Knowledge Base page
2. Table shows entries with:
   - Name
   - Source (NVD/CWE)
   - Severity
   - Status (Active/Muted)
3. Filterable by source and severity

### 2. Search Entries
1. User types in search box
2. Results filtered by name, description
3. Pagination updates

### 3. View Entry Details
1. User clicks entry row
2. Modal shows:
   - Full description
   - Affected versions
   - References
   - Related findings

## Knowledge Sources
| Source | Description |
|--------|-------------|
| NVD | National Vulnerability Database |
| CWE | Common Weakness Enumeration |
| Custom | Workspace-specific rules |

## Pre-condition Checks
- Knowledge base requires KNOWLEDGE_VIEW permission
- All sync and backfill operations are server-managed
