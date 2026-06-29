---
title: Webhooks
description: Send notifications to external services
---

# Webhooks

## Overview

Webhooks send real-time notifications to external services when events occur in your workspace.

## Supported Events

| Event | Trigger |
|-------|---------|
| `scan.completed` | Scan finishes successfully |
| `scan.failed` | Scan fails |
| `finding.created` | New finding detected |
| `finding.resolved` | Finding resolved |
| `finding.dismissed` | Finding dismissed |

## Create Webhook

```mermaid
sequenceDiagram
    actor User
    participant UI
    participant API
    participant DB[(Database)]

    User->>UI: Click "Add Webhook"
    UI->>API: POST /api/v1/webhooks
    API->>DB: INSERT webhook
    API-->>UI: 201 { webhook }
```

## Event Delivery

```mermaid
flowchart TD
    A["Event occurs"] --> B["Find active webhooks"]
    B --> C{"Webhook exists?"}
    C -->|"Yes"| D["Build payload"]
    C -->|"No"| E["Skip"]
    D --> F["POST to URL<br/>(with HMAC signature)"]
    F --> G{"Response?"}
    G -->|"2xx"| H["Log: success"]
    G -->|"Error"| I["Log: failed"]

    style H fill:#22c55e,color:#fff
    style I fill:#ef4444,color:#fff
```

## Delivery Log

Each delivery is recorded with:
- `event`: Which event triggered it
- `status`: success/failed/pending
- `response_status`: HTTP status code
- `request_body`: Payload sent
- `response_body`: Response received
- `duration_ms`: Round-trip time

## Test Webhook

```mermaid
sequenceDiagram
    actor User
    participant API
    participant External

    User->>API: POST /api/v1/webhooks/:id/test
    API->>External: POST { test: true }
    External-->>API: 200 OK
    API-->>User: 200 { success: true }
```
