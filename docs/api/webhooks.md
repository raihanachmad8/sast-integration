# Webhooks API

Module: `webhooks`
Base: `/api/v1/workspaces/:workspaceId/webhooks`

---

## GET /webhooks

List webhooks in the workspace.

**Auth:** Bearer token
**Required Role:** Member+ (WEBHOOK_MANAGE permission)

**Response Data:**
```json
{
  "success": true,
  "message": "Webhooks retrieved",
  "data": [
    {
      "id": "uuid",
      "name": "Slack Notifier",
      "url": "https://hooks.slack.com/...",
      "events": ["scan.completed", "finding.critical"],
      "active": true,
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 500 | Internal Server Error |

---

## POST /webhooks

Create a new webhook.

**Auth:** Bearer token
**Required Role:** Manager+ (WEBHOOK_MANAGE permission)

**Request Body:**
```json
{
  "name": "Slack Notifier",
  "url": "https://hooks.slack.com/...",
  "events": ["scan.completed", "finding.critical"],
  "secret": "whsec_...",
  "active": true
}
```

**Response Data:**
```json
{
  "success": true,
  "message": "Webhook created",
  "data": {
    "id": "uuid",
    "name": "Slack Notifier",
    "url": "https://hooks.slack.com/...",
    "events": ["scan.completed", "finding.critical"],
    "active": true,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 201 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 422 | Validation error |
| 500 | Internal Server Error |

---

## GET /webhooks/:webhookId

Get a webhook.

**Auth:** Bearer token
**Required Role:** Member+ (WEBHOOK_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `webhookId` | uuid | Webhook ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Webhook retrieved",
  "data": {
    "id": "uuid",
    "name": "Slack Notifier",
    "url": "https://hooks.slack.com/...",
    "events": ["scan.completed", "finding.critical"],
    "active": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Webhook not found |
| 500 | Internal Server Error |

---

## PUT /webhooks/:webhookId

Update a webhook.

**Auth:** Bearer token
**Required Role:** Manager+ (WEBHOOK_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `webhookId` | uuid | Webhook ID |

**Request Body:**
```json
{
  "name": "Updated Webhook",
  "url": "https://new-url.example.com",
  "events": ["scan.completed"],
  "active": false
}
```

**Response Data:**
```json
{
  "success": true,
  "message": "Webhook updated",
  "data": {
    "id": "uuid",
    "name": "Updated Webhook",
    "url": "https://new-url.example.com",
    "events": ["scan.completed"],
    "active": false,
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Webhook not found |
| 422 | Validation error |
| 500 | Internal Server Error |

---

## DELETE /webhooks/:webhookId

Soft-delete a webhook.

**Auth:** Bearer token
**Required Role:** Manager+ (WEBHOOK_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `webhookId` | uuid | Webhook ID |

**Response Data:** No Content (204)

**Status Codes:**
| Code | Description |
|------|-------------|
| 204 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Webhook not found |
| 500 | Internal Server Error |

---

## POST /webhooks/:webhookId/test

Send a test webhook event.

**Auth:** Bearer token
**Required Role:** Manager+ (WEBHOOK_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `webhookId` | uuid | Webhook ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Test sent",
  "data": {
    "success": true,
    "statusCode": 200,
    "responseTime": 150
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Webhook not found |
| 500 | Internal Server Error |

---

## GET /webhooks/:webhookId/deliveries

List webhook delivery attempts.

**Auth:** Bearer token
**Required Role:** Manager+ (WEBHOOK_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `webhookId` | uuid | Webhook ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Deliveries retrieved",
  "data": [
    {
      "id": "uuid",
      "event": "scan.completed",
      "statusCode": 200,
      "success": true,
      "responseTime": 150,
      "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "uuid",
      "event": "scan.completed",
      "statusCode": 500,
      "success": false,
      "error": "Internal Server Error",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Webhook not found |
| 500 | Internal Server Error |
