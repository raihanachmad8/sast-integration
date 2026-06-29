# Webhooks Flow

Outgoing webhook management for external integrations.

## Pre-conditions
- User has WEBHOOKS feature flag enabled
- Source control connected

## Role Context

| Action | Owner | Manager | Reviewer | Member |
|--------|-------|---------|----------|--------|
| View webhooks | ✅ | ✅ | ✅ | ✅ |
| Create webhook | ✅ | ✅ | ❌ | ❌ |
| Edit webhook | ✅ | ✅ | ❌ | ❌ |
| Delete webhook | ✅ | ✅ | ❌ | ❌ |
| View deliveries | ✅ | ✅ | ✅ | ✅ |

## Sequence Diagrams

### Create Webhook

```mermaid
sequenceDiagram
    actor User
    participant UI as Webhooks Page
    participant API
    participant DB[(Database)]

    User->>UI: Click "Add Webhook"
    UI->>UI: Show form (name, URL, events, secret)
    User->>UI: Fill form + select events
    UI->>API: POST /api/v1/webhooks
    API->>DB: INSERT webhook
    API-->>UI: 201 { webhook }
```

### Test Webhook

```mermaid
sequenceDiagram
    actor User
    participant UI
    participant API
    participant External as External URL

    User->>UI: Click "Test" on webhook
    UI->>API: POST /api/v1/webhooks/:id/test
    API->>API: Build test payload
    API->>External: POST { test: true, timestamp }
    External-->>API: 200 OK
    API->>API: Log delivery (success)
    API-->>UI: 200 { success: true, responseStatus: 200 }
```

## Event Delivery Flowchart

```mermaid
flowchart TD
    A["Event occurs<br/>(scan completed, finding updated)"] --> B["Find active webhooks<br/>subscribed to this event"]
    B --> C{"Webhook exists?"}
    C -->|"Yes"| D["Build event payload"]
    C -->|"No"| E["Skip"]
    D --> F["POST to webhook URL<br/>(with HMAC signature)"]
    F --> G{"Response?"}
    G -->|"2xx"| H["Log: success"]
    G -->|"Error/Timeout"| I["Log: failed"]
    H --> J["INSERT webhook_delivery"]
    I --> J
```

## User Scenarios

### 1. Create Webhook
1. User navigates to Webhooks page
2. Clicks "New webhook"
3. Selects events to subscribe
4. Enters target URL
5. Clicks "Create"
6. Webhook created, test event sent

### 2. View Webhook List
1. Table shows all webhooks with:
   - Name
   - Events
   - Status (Active/Inactive)
   - Last delivery

### 3. Test Webhook
1. User clicks "Test" on webhook
2. Test event sent to URL
3. Response shown (success/failure)

### 4. View Delivery History
1. User clicks "View deliveries" on webhook
2. Drawer shows delivery log:
   - Event type
   - Status (Success/Failed/Pending)
   - HTTP status code
   - Duration
   - Timestamp

### 5. Edit Webhook
1. User clicks "Edit"
2. Can update: name, events, URL
3. Changes saved

### 6. Toggle Webhook
1. User clicks toggle switch
2. Webhook enabled/disabled
3. Events stop/start flowing

### 7. Delete Webhook
1. User clicks "Delete"
2. Confirmation dialog
3. Webhook removed
4. Events stop flowing

## Supported Events
| Event | Trigger |
|-------|---------|
| `scan.completed` | Scan finishes |
| `scan.failed` | Scan fails |
| `finding.created` | New finding detected |
| `finding.resolved` | Finding resolved |
| `finding.dismissed` | Finding dismissed |

## Delivery Status
| Status | Meaning |
|--------|---------|
| Success | 2xx response received |
| Failed | Error or timeout |
| Pending | Awaiting delivery |

## Delivery Log
Each delivery is recorded in `webhook_deliveries`:
- `event`: Which event triggered it
- `status`: success/failed/pending
- `response_status`: HTTP status code
- `request_body`: What was sent
- `response_body`: What was received
- `duration_ms`: Round-trip time

## Pre-condition Checks
- Webhook requires WEBHOOK_MANAGE permission
- Target URL must be reachable
- Events must be valid for provider type
