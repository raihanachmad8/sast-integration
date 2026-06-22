# Schedules API

Module: `schedules`
Base: `/api/v1/workspaces/:workspaceId/schedules`

---

## GET /schedules

List schedules for the workspace.

**Auth:** Bearer token
**Required Role:** Member+ (SCAN_VIEW permission)

**Response Data:**
```json
{
  "success": true,
  "message": "Schedules retrieved",
  "data": [
    {
      "id": "uuid",
      "repositoryId": "uuid",
      "repositoryName": "backend-api",
      "branch": "main",
      "cronExpression": "0 6 * * *",
      "timezone": "UTC",
      "active": true,
      "lastRunAt": "2026-01-01T06:00:00.000Z",
      "nextRunAt": "2026-01-02T06:00:00.000Z",
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

## POST /schedules

Create a new schedule.

**Auth:** Bearer token
**Required Role:** Manager+ (SCHEDULE_MANAGE permission)

**Request Body:**
```json
{
  "repositoryId": "uuid",
  "branch": "main",
  "cronExpression": "0 6 * * *",
  "timezone": "UTC",
  "active": true
}
```

**Response Data:**
```json
{
  "success": true,
  "message": "Schedule created",
  "data": {
    "id": "uuid",
    "repositoryId": "uuid",
    "branch": "main",
    "cronExpression": "0 6 * * *",
    "timezone": "UTC",
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

## GET /schedules/:scheduleId

Get schedule detail.

**Auth:** Bearer token
**Required Role:** Member+ (SCAN_VIEW permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `scheduleId` | uuid | Schedule ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Schedule retrieved",
  "data": {
    "id": "uuid",
    "repositoryId": "uuid",
    "repositoryName": "backend-api",
    "branch": "main",
    "cronExpression": "0 6 * * *",
    "timezone": "UTC",
    "active": true,
    "lastRunAt": "2026-01-01T06:00:00.000Z",
    "nextRunAt": "2026-01-02T06:00:00.000Z",
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
| 404 | Schedule not found |
| 500 | Internal Server Error |

---

## PUT /schedules/:scheduleId

Update a schedule.

**Auth:** Bearer token
**Required Role:** Manager+ (SCHEDULE_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `scheduleId` | uuid | Schedule ID |

**Request Body:**
```json
{
  "branch": "develop",
  "cronExpression": "0 12 * * *",
  "timezone": "America/New_York",
  "active": false
}
```

**Response Data:**
```json
{
  "success": true,
  "message": "Schedule updated",
  "data": {
    "id": "uuid",
    "branch": "develop",
    "cronExpression": "0 12 * * *",
    "timezone": "America/New_York",
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
| 404 | Schedule not found |
| 422 | Validation error |
| 500 | Internal Server Error |

---

## DELETE /schedules/:scheduleId

Delete a schedule.

**Auth:** Bearer token
**Required Role:** Manager+ (SCHEDULE_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `scheduleId` | uuid | Schedule ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Schedule deleted",
  "data": null
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Schedule not found |
| 500 | Internal Server Error |

---

## PUT /schedules/:scheduleId/toggle

Toggle schedule enabled/disabled.

**Auth:** Bearer token
**Required Role:** Manager+ (SCHEDULE_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `scheduleId` | uuid | Schedule ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Schedule toggled",
  "data": {
    "id": "uuid",
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
| 404 | Schedule not found |
| 500 | Internal Server Error |
