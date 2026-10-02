# API Documentation

## Overview

This document describes the REST API endpoints for the SAST Integration platform.
All endpoints are prefixed with `/api/v1`.

## Authentication

All endpoints require authentication via HTTP-only cookies.
The `Authorization` header is not used — tokens are managed via cookies.

### Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": {
      "fields": [
        { "field": "email", "message": "Invalid email format" }
      ]
    }
  }
}
```

---

## Knowledge Base

### List Knowledge Entries

```
GET /api/v1/workspaces/:workspaceId/knowledge-base
```

**Response:**
```json
{
  "success": true,
  "message": "Knowledge entries retrieved",
  "data": [
    {
      "id": "uuid",
      "sourceId": "uuid",
      "cweId": "CWE-89",
      "title": "SQL Injection",
      "content": "Description of the vulnerability...",
      "severity": "critical",
      "tags": ["injection", "database"],
      "muted": false,
      "usedByAiCount": 42,
      "remediation": "Use parameterized queries...",
      "references": {},
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Get Knowledge Entry

```
GET /api/v1/workspaces/:workspaceId/knowledge-base/:entryId
```

**Response:**
```json
{
  "success": true,
  "message": "Knowledge entry retrieved",
  "data": {
    "id": "uuid",
    "sourceId": "uuid",
    "cweId": "CWE-89",
    "title": "SQL Injection",
    "content": "Description...",
    "severity": "critical",
    "tags": ["injection"],
    "muted": false,
    "usedByAiCount": 42,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### Create Knowledge Entry

```
POST /api/v1/workspaces/:workspaceId/knowledge-base
```

**Request Body:**
```json
{
  "sourceId": "uuid",
  "cweId": "CWE-89",
  "title": "SQL Injection",
  "content": "Description...",
  "severity": "critical",
  "tags": ["injection", "database"],
  "remediation": "Use parameterized queries..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Knowledge entry created",
  "data": {
    "id": "uuid",
    "sourceId": "uuid",
    "cweId": "CWE-89",
    "title": "SQL Injection",
    "content": "Description...",
    "severity": "critical",
    "tags": ["injection", "database"],
    "muted": false,
    "usedByAiCount": 0,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### Update Knowledge Entry

```
PUT /api/v1/workspaces/:workspaceId/knowledge-base/:entryId
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "severity": "high",
  "muted": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Knowledge entry updated",
  "data": { ... }
}
```

### Delete Knowledge Entry

```
DELETE /api/v1/workspaces/:workspaceId/knowledge-base/:entryId
```

**Response:**
```json
{
  "success": true,
  "message": "Knowledge entry deleted"
}
```

---

## Schedules

### List Schedules

```
GET /api/v1/workspaces/:workspaceId/schedules
```

**Response:**
```json
{
  "success": true,
  "message": "Schedules retrieved",
  "data": [
    {
      "id": "uuid",
      "repositoryId": "uuid",
      "policyId": "uuid",
      "branch": "main",
      "cronExpression": "0 2 * * *",
      "timezone": "UTC",
      "active": true,
      "lastRunAt": "2024-01-01T02:00:00Z",
      "nextRunAt": "2024-01-02T02:00:00Z",
      "createdBy": "uuid",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Get Schedule

```
GET /api/v1/workspaces/:workspaceId/schedules/:scheduleId
```

**Response:**
```json
{
  "success": true,
  "message": "Schedule retrieved",
  "data": {
    "id": "uuid",
    "repositoryId": "uuid",
    "policyId": "uuid",
    "branch": "main",
    "cronExpression": "0 2 * * *",
    "timezone": "UTC",
    "active": true,
    "lastRunAt": "2024-01-01T02:00:00Z",
    "nextRunAt": "2024-01-02T02:00:00Z",
    "createdBy": "uuid",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### Create Schedule

```
POST /api/v1/workspaces/:workspaceId/schedules
```

**Request Body:**
```json
{
  "repositoryId": "uuid",
  "policyId": "uuid",
  "branch": "main",
  "cronExpression": "0 2 * * *",
  "timezone": "UTC",
  "active": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Schedule created",
  "data": {
    "id": "uuid",
    "repositoryId": "uuid",
    "policyId": "uuid",
    "branch": "main",
    "cronExpression": "0 2 * * *",
    "timezone": "UTC",
    "active": true,
    "createdBy": "uuid",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### Update Schedule

```
PUT /api/v1/workspaces/:workspaceId/schedules/:scheduleId
```

**Request Body:**
```json
{
  "cronExpression": "0 3 * * *",
  "active": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Schedule updated",
  "data": { ... }
}
```

### Delete Schedule

```
DELETE /api/v1/workspaces/:workspaceId/schedules/:scheduleId
```

**Response:**
```json
{
  "success": true,
  "message": "Schedule deleted"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Invalid request body |
| `INTERNAL_ERROR` | Server error |

---

## Rate Limiting

Auth endpoints are rate-limited:
- `POST /api/v1/auth/signin`: 5 requests per minute
- `POST /api/v1/auth/signup`: 3 requests per minute
- `POST /api/v1/auth/forgot-password`: 3 requests per minute
