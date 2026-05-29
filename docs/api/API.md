# API Contract

Base URL: `/api/v1`

---

## Standard Response Format

All endpoints return this structure:

```typescript
interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  data: T | null;
  meta: {
    requestId: string;
    timestamp: string;
    pagination?: {
      page: number;
      perPage: number;
      total: number;
      totalPages: number;
    };
  };
  error?: {
    code: string;
    details?: unknown;
  };
}
```

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "meta": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-05-29T19:00:00.000Z"
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Human-readable error message",
  "data": null,
  "meta": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-05-29T19:00:00.000Z"
  },
  "error": {
    "code": "ERROR_CODE",
    "details": null
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "message": "Items retrieved",
  "data": [ ... ],
  "meta": {
    "pagination": {
      "page": 1,
      "perPage": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

---

## HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / validation error |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (no permission) |
| 404 | Not found |
| 409 | Conflict (duplicate) |
| 410 | Gone (expired resource) |
| 422 | Unprocessable entity |
| 500 | Internal server error |

---

## Authentication

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

Workspace-scoped endpoints also require:
```
X-Workspace-Id: <workspace_uuid>
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `AUTH_ERROR` | Authentication/authorization failure |
| `VALIDATION_ERROR` | Input validation failed |
| `NOT_FOUND` | Resource not found |
| `FORBIDDEN` | Insufficient permissions |
| `CONFLICT` | Resource already exists |
