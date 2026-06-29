---
title: Knowledge Base
description: CWE/NVD knowledge management for AI verification context
---

# Knowledge Base

## Overview

The knowledge base provides NVD context to enrich findings and improve AI verification accuracy.

## Knowledge Sources

```mermaid
graph LR
    subgraph "Sources"
        NVD["NVD Feed"]
        CWE["CWE Catalog"]
        Custom["Custom Rules"]
    end

    subgraph "Sync"
        Sync["sync-knowledge-base<br/>worker (every 6h)"]
        Backfill["nvd-knowledge-backfill<br/>worker (manual)"]
    end

    subgraph "Store"
        Entries["knowledge_entries"]
    end

    subgraph "AI"
        AI["AI Verification"]
    end

    NVD --> Sync
    CWE --> Sync
    Sync --> Entries
    Backfill --> Entries
    Entries --> AI

    style Entries fill:#336791,color:#fff
    style AI fill:#f59e0b,color:#fff
```

| Source | Content |
|--------|---------|
| **NVD** | National Vulnerability Database feed |
| **CWE** | Common Weakness Enumeration catalog |
| **Custom** | User-defined knowledge entries |

## Sync Flow

```mermaid
sequenceDiagram
    participant Cron
    participant Worker
    participant NVD as NVD API
    participant DB[(Database)]

    Cron->>Worker: Every 6 hours
    Worker->>DB: SELECT knowledge_sources
    Worker->>NVD: Fetch recent CVEs
    NVD-->>Worker: CVE data
    Worker->>DB: UPSERT knowledge_entries
    Worker->>DB: UPDATE lastSyncedAt
```

## AI Enrichment

During AI verification, the system enriches prompts with relevant knowledge:

```mermaid
flowchart LR
    A["Finding with CWE-89"] --> B["Query knowledge_entries<br/>WHERE cwe_id = 'CWE-89'"]
    B --> C["Include in AI prompt:<br/>- CWE title & description<br/>- Remediation steps<br/>- Related weaknesses"]
    C --> D["AI verifies with<br/>better context"]

    style B fill:#336791,color:#fff
    style D fill:#22c55e,color:#fff
```

## Entry Fields

| Field | Description |
|-------|-------------|
| `cwe_id` | CWE identifier (e.g., CWE-89) |
| `title` | Weakness title |
| `content` | Detailed description |
| `severity` | Critical, High, Medium, Low |
| `remediation` | Fix guidance |
| `tags` | Category tags (JSONB) |
| `muted` | Exclude from AI context |

## Mute Entry

Muted entries are excluded from AI verification context:

```mermaid
sequenceDiagram
    actor User
    participant UI
    participant API
    participant DB[(Database)]

    User->>UI: Click "Mute" on knowledge entry
    UI->>API: PATCH /api/v1/knowledge/entries/:id
    API->>DB: UPDATE knowledge_entries SET muted = true
    API-->>UI: 200
```
