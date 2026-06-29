---
title: Reports
description: Generate and export security reports
---

# Reports

## Overview

Reports provide exportable security summaries in PDF, XLSX, and CSV formats for compliance and stakeholder communication.

## Report Types

| Format | Use Case |
|--------|----------|
| **PDF** | Executive summary, compliance audits |
| **XLSX** | Data analysis, team collaboration |
| **CSV** | Integration with other tools |

## Generate Report

```mermaid
sequenceDiagram
    actor User
    participant UI
    participant API
    participant Worker
    participant DB[(Database)]

    User->>UI: Click "Generate Report"
    UI->>UI: Select filters (project, date range, severity)
    User->>UI: Click "Generate"
    UI->>API: POST /api/v1/reports
    API->>DB: INSERT report (status: generating)
    API->>Worker: Enqueue report generation
    API-->>UI: 201 { reportId }
    Worker->>DB: UPDATE report status → generated
    Worker->>DB: Store file in storage
```

## Report Fields

| Field | Description |
|-------|-------------|
| `type` | PDF, XLSX, or CSV |
| `title` | Report title |
| `filters` | Applied filters (project, severity, date range) |
| `status` | generating, generated, failed |
| `file_path` | Storage path |
| `file_size` | File size in bytes |
| `format` | Output format |

## Download Report

```mermaid
sequenceDiagram
    actor User
    participant UI
    participant API
    participant Storage
    participant DB[(Database)]

    User->>UI: Click "Download"
    UI->>API: GET /api/v1/reports/:id/download
    API->>DB: Get report file_path
    API->>Storage: Get signed URL
    Storage-->>API: URL
    API-->>UI: 302 redirect to URL
```
