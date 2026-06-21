# Profile API

Module: `profile`
Base: `/api/v1/users`

---

## GET /users/me

Get current user profile.

**Auth:** Bearer token

**Response Data:**
```json
{
  "success": true,
  "message": "Profile retrieved",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "username": "johndoe",
    "bio": "Security engineer",
    "timezone": "Asia/Jakarta",
    "language": "en",
    "avatarUrl": "https://...",
    "emailVerified": true,
    "currentWorkspaceId": "uuid",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 500 | Internal Server Error |

---

## GET /users/profile

Get current user profile (alternative endpoint).

**Auth:** Bearer token

**Response Data:**
```json
{
  "success": true,
  "message": "Profile retrieved",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "username": "johndoe",
    "bio": "Security engineer",
    "timezone": "Asia/Jakarta",
    "language": "en",
    "avatarUrl": "https://...",
    "emailVerified": true,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden (requires user authentication) |
| 500 | Internal Server Error |

---

## PUT /users/profile

Update current user profile.

**Auth:** Bearer token

**Request Body:**
```json
{
  "name": "John Updated",
  "username": "johnupdated",
  "bio": "Senior security engineer",
  "timezone": "America/New_York",
  "language": "en"
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| `name` | Optional, min 1, max 255 |
| `username` | Optional, min 1, max 100 |
| `bio` | Optional, max 500 |
| `timezone` | Optional, max 50 |
| `language` | Optional, max 10 |

**Response Data:**
```json
{
  "success": true,
  "message": "Profile updated",
  "data": {
    "id": "uuid",
    "name": "John Updated",
    "email": "user@example.com",
    "username": "johnupdated",
    "bio": "Senior security engineer",
    "timezone": "America/New_York",
    "language": "en",
    "avatarUrl": "https://..."
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 422 | Validation error |
| 500 | Internal Server Error |

---

## PUT /users/me/password

Change current user password.

**Auth:** Bearer token

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewStr0ng!Pass",
  "confirmPassword": "NewStr0ng!Pass"
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| `currentPassword` | Required |
| `newPassword` | Required, min 8 |
| `confirmPassword` | Required, must match newPassword |

**Response Data:**
```json
{
  "success": true,
  "message": "Password updated",
  "data": null
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 422 | Validation error (passwords don't match) |
| 500 | Internal Server Error |

---

## POST /users/me/avatar

Upload a new avatar image for the current user.

**Auth:** Bearer token
**Content-Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | Yes | Image file (JPEG, PNG, GIF, WebP; max 2MB) |

**Response Data:**
```json
{
  "success": true,
  "message": "Avatar uploaded",
  "data": {
    "avatarUrl": "https://storage.example.com/avatars/uuid/avatar.jpg"
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request (invalid file type or too large) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 500 | Internal Server Error |

---

## DELETE /users/me/avatar

Remove current user's avatar.

**Auth:** Bearer token

**Response Data:**
```json
{
  "success": true,
  "message": "Avatar removed",
  "data": {
    "avatarUrl": null
  }
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

## PATCH /users/me

Switch active workspace.

**Auth:** Bearer token

**Request Body:**
```json
{
  "currentWorkspaceId": "uuid"
}
```

**Response Data:**
```json
{
  "success": true,
  "message": "Workspace switched",
  "data": {
    "currentWorkspaceId": "uuid"
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden (not a member of target workspace) |
| 422 | Validation error |
| 500 | Internal Server Error |

---

## GET /auth/sessions

List active sessions for the current user.

**Auth:** Bearer token

**Response Data:**
```json
{
  "success": true,
  "message": "Sessions retrieved",
  "data": [
    {
      "id": "uuid",
      "userAgent": "Mozilla/5.0...",
      "ipAddress": "192.168.1.1",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "expiresAt": "2026-01-08T00:00:00.000Z"
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
