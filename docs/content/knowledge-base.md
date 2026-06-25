# Knowledge Base

## Overview

The knowledge base provides CWE, NVD, and MITRE ATT&CK context to enrich findings and improve AI verification accuracy.

## Knowledge Sources

| Source | Content |
|--------|---------|
| CWE | Common Weakness Enumeration entries |
| NVD | National Vulnerability Database CVEs |
| MITRE | ATT&CK technique mappings |

## How Knowledge Enrichment Works

1. Finding has `cwe_id` from scanner
2. System queries knowledge base for matching entries
3. Context is injected into AI verification prompt
4. AI uses enriched context for better classification

## Example

```typescript
const cweContext = await buildCweContext('CWE-787');
// Returns:
// "CWE Knowledge (CWE-787 - Out-of-bounds Write):
//  Description: The software writes data past the end, or before the beginning, of the intended buffer.
//  Severity: High
//  Remediation: Use bounds-checking interfaces, validate array indices"
```

## Knowledge Base Entries

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| workspace_id | UUID | Workspace scope |
| cwe_id | VARCHAR | CWE identifier |
| title | VARCHAR | Short title |
| description | TEXT | Detailed description |
| severity | VARCHAR | Recommended severity |
| remediation | TEXT | Fix guidance |
| source | VARCHAR | Knowledge source |

## API Endpoints

| Method | Endpoint | Permission |
|--------|----------|-----------|
| GET | `/knowledge-base` | `KNOWLEDGE_VIEW` |
| POST | `/knowledge-base` | `KNOWLEDGE_MANAGE` |
| GET | `/knowledge-base/:entryId` | `KNOWLEDGE_VIEW` |
| PATCH | `/knowledge-base/:entryId` | `KNOWLEDGE_MANAGE` |
| DELETE | `/knowledge-base/:entryId` | `KNOWLEDGE_MANAGE` |

## Feature Flag

Knowledge base requires `FEATURE_FLAG_KNOWLEDGE_BASE=true`.
