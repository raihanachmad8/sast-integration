# Findings

## Overview

Findings are security issues detected by scanners. Each finding includes AI verification, CWE classification, and remediation guidance.

## Finding Lifecycle

```
open → verified → fixed
open → false_positive
open → ignored
```

## Severity Levels

| Level | Description |
|-------|-------------|
| critical | Immediate action required |
| high | Significant risk, address soon |
| medium | Moderate risk, plan remediation |
| low | Minor issue, address when convenient |
| info | Informational, no action required |

## AI Verdicts

| Verdict | Description |
|---------|-------------|
| true_positive | AI confirmed the finding is valid |
| false_positive | AI determined the finding is not a real issue |
| pending | Awaiting AI verification |

## Finding Fields

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| scan_id | UUID | FK to scans |
| group_id | UUID | FK to finding_groups (dedup) |
| cwe_id | VARCHAR | CWE identifier |
| severity | VARCHAR | Critical/High/Medium/Low/Info |
| status | VARCHAR | Open/Verified/Fixed/FPIgnored |
| file_path | VARCHAR | Source file path |
| line_number | INTEGER | Line number |
| code_snippet | TEXT | Source code context |
| scanner | VARCHAR | Scanner that found this |
| message | TEXT | Detailed message |

## Deduplication

Findings are deduplicated using SHA-256 fingerprints:

```
fingerprint = SHA-256(rule || file_path || line_number || message)
```

Same vulnerability across multiple scans creates:
- One `finding_groups` entry
- Multiple `findings` rows linked by `group_id`

## Bulk Operations

```bash
PUT /api/v1/workspaces/:workspaceId/findings/bulk
{
  "findingIds": ["uuid1", "uuid2"],
  "status": "verified"
}
```

## Comments

Findings support threaded comments:

```bash
GET  /api/v1/workspaces/:workspaceId/findings/:findingId/comments
POST /api/v1/workspaces/:workspaceId/findings/:findingId/comments
{
  "content": "This is a known safe pattern"
}
```

## API Endpoints

| Method | Endpoint | Permission |
|--------|----------|-----------|
| GET | `/findings` | `SCAN_VIEW` |
| GET | `/findings/:findingId` | `SCAN_VIEW` |
| PATCH | `/findings/:findingId` | `FINDING_TRIAGE` |
| POST | `/findings/:findingId/verify` | `FINDING_OVERRIDE_AI` |
| POST | `/findings/ai-verify` | `FINDING_OVERRIDE_AI` |
| PUT | `/findings/bulk` | `FINDING_TRIAGE` |
