# Reports

## Overview

Reports provide exportable security summaries in PDF and XLSX formats for compliance and stakeholder communication.

## Report Types

| Format | Use Case |
|--------|----------|
| PDF | Formal security reports, compliance |
| XLSX | Data analysis, spreadsheet review |

## Generating Reports

### Via UI

1. Go to **Reports** page
2. Click **Generate Report**
3. Select scope (workspace, project, or scan)
4. Choose format (PDF/XLSX)
5. Click **Generate**

### Via API

```bash
POST /api/v1/workspaces/:workspaceId/reports
{
  "type": "pdf",
  "scope": "workspace",
  "projectIds": ["uuid"]
}
```

## Report Contents

| Section | Content |
|---------|---------|
| Executive Summary | Key metrics, risk score |
| Findings by Severity | Critical, high, medium, low breakdown |
| Findings by Scanner | Per-scanner analysis |
| AI Verification Stats | TP/FP ratios, confidence |
| Recommendations | Prioritized remediation steps |

## Report Lifecycle

```
generating → ready → downloadable
           → expired (after retention period)
```

## API Endpoints

| Method | Endpoint | Permission |
|--------|----------|-----------|
| GET | `/reports` | `REPORT_VIEW` |
| POST | `/reports` | `REPORT_EXPORT` |
| GET | `/reports/:reportId` | `REPORT_VIEW` |
| DELETE | `/reports/:reportId` | `REPORT_EXPORT` |
| GET | `/reports/:reportId/download` | `REPORT_VIEW` |
| GET | `/reports/:reportId/preview` | `REPORT_VIEW` |

## Feature Flag

Reports require `FEATURE_FLAG_REPORTS=true`.
