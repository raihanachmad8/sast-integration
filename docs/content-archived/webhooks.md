# Webhooks

## Overview

Webhooks send real-time notifications to external services when events occur in your workspace.

## Supported Events

| Event | Trigger |
|-------|---------|
| scan.completed | Scan finishes |
| scan.failed | Scan fails |
| finding.created | New finding detected |
| finding.status_changed | Finding triaged |
| report.generated | Report ready |

## Configuration

### Creating a Webhook

1. Go to **Webhooks** page
2. Click **Add Webhook**
3. Enter URL and secret
4. Select events to subscribe
5. Click **Create**

### Webhook Payload

```json
{
  "event": "scan.completed",
  "timestamp": "2026-06-25T10:30:00Z",
  "workspace_id": "uuid",
  "data": {
    "scan_id": "uuid",
    "repository": "my-repo",
    "branch": "main",
    "status": "completed",
    "findings_count": 12,
    "critical_count": 2
  }
}
```

### Authentication

Webhooks include a signature header:

```
X-Webhook-Signature: sha256=...
```

Verify with:

```typescript
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', secret)
  .update(body)
  .digest('hex');
```

## Delivery

| Setting | Default |
|---------|---------|
| Timeout | 30 seconds |
| Retries | 3 |
| Retry delay | 5, 30, 120 seconds |

## Delivery History

View delivery status for each webhook:

| Status | Description |
|--------|-------------|
| success | Delivered (2xx response) |
| failed | Delivery failed after retries |
| pending | Waiting to be delivered |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/webhooks` | List webhooks |
| POST | `/webhooks` | Create webhook |
| GET | `/webhooks/:id` | Webhook detail |
| PUT | `/webhooks/:id` | Update webhook |
| DELETE | `/webhooks/:id` | Delete webhook |
| GET | `/webhooks/:id/deliveries` | Delivery history |
| POST | `/webhooks/:id/test` | Test webhook |

## Feature Flag

Webhooks require `FEATURE_FLAG_WEBHOOKS=true` (disabled by default).
