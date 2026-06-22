# Notifications API

Module: `notifications`
Base: `/api/v1/notifications`

---

## GET /notifications

List notifications for the current user.

**Auth:** Bearer token

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `limit` | number | No | Max items (default: 20, max: 100) |
| `offset` | number | No | Pagination offset (default: 0) |

**Response Data:**
```json
{
  "success": true,
  "message": "Notifications retrieved",
  "data": [
    {
      "id": "uuid",
      "workspaceId": "uuid",
      "userId": "uuid",
      "type": "scan_completed",
      "description": "Scan completed for repository backend-api",
      "metadata": {
        "scanId": "uuid",
        "repository": "backend-api"
      },
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
| 500 | Internal Server Error |

---

## GET /notifications/unread-count

Get unread notification count for the current user.

**Auth:** Bearer token

**Response Data:**
```json
{
  "success": true,
  "message": "Unread count retrieved",
  "data": {
    "count": 5
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 500 | Internal Server Error |
