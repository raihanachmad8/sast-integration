# Auth API Contract

Module: `auth`
Base: `/api/v1/auth`

---

## POST /auth/signup

Create a new user account. Disabled when `REGISTRATION_MODE=invite`.

**Auth:** None

**Request:**
```json
{
  "email": "user@example.com",
  "password": "min8chars",
  "name": "John Doe"
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| email | required, valid email |
| password | required, min 8, max 128 |
| name | required, min 2, max 255 |

**Success (200):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 403 | AUTH_ERROR | Registration is disabled. Use invitation link. |
| 409 | AUTH_ERROR | Email already registered |
| 400 | VALIDATION_ERROR | Validation failed |

---

## POST /auth/signin

Authenticate user and return JWT tokens.

**Auth:** None

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "tokenType": "Bearer",
    "accessToken": "eyJhbG...",
    "expiresAt": "2026-05-29T18:30:00.000Z",
    "expiresIn": 900,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "emailVerified": true,
      "currentWorkspaceId": "ws-uuid"
    }
  },
  "meta": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-05-29T18:15:00.000Z"
  }
}
```

**Cookies set:**
| Name | Value | Options |
|------|-------|---------|
| `refresh_token` | JWT refresh token | httpOnly, secure (prod), sameSite=lax, path=/api/v1/auth/refresh, maxAge=7d |

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 401 | AUTH_ERROR | Invalid credentials |

---

## POST /auth/signout

Invalidate current session. After signout, the access token is rejected (session deleted from DB).

**Auth:** Bearer token required

**Request:** Empty body

**Success (200):**
```json
{
  "success": true,
  "message": "Signed out",
  "data": null,
  "meta": null
}
```

**Cookies cleared:** `refresh_token`

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 401 | AUTH_ERROR | No token provided |
| 401 | AUTH_ERROR | Invalid token |
| 401 | AUTH_ERROR | Invalid session |

---

## POST /auth/refresh

Rotate access and refresh tokens.

**Auth:** None (uses refresh_token cookie)

**Request:** Empty body (reads cookie)

**Success (200):**
```json
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "tokenType": "Bearer",
    "accessToken": "eyJhbG...",
    "expiresAt": "2026-05-29T18:45:00.000Z",
    "expiresIn": 900
  },
  "meta": null
}
```

**Cookies set:** New `refresh_token` (rotated)

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 401 | AUTH_ERROR | No token provided |
| 401 | AUTH_ERROR | Invalid token |

---

## POST /auth/invite

Send workspace invitation to a user.

**Auth:** Bearer token required
**Headers:** `X-Workspace-Id` required

**Request:**
```json
{
  "email": "newuser@example.com",
  "role": "reviewer"
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| email | required, valid email |
| role | required, one of: owner, manager, reviewer, member (default: member) |

**Success (200):**
```json
{
  "success": true,
  "message": "Invitation sent",
  "data": {
    "email": "newuser@example.com"
  }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 400 | AUTH_ERROR | Workspace ID required |
| 401 | AUTH_ERROR | No token provided |

---

## POST /auth/invite/accept

Accept invitation and create/activate account.

**Auth:** None

**Request:**
```json
{
  "token": "invitation_token_hex",
  "password": "min8chars",
  "name": "New User"
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| token | required |
| password | required, min 8, max 128 |
| name | required, min 2, max 255 |

**Success (200):**
```json
{
  "success": true,
  "message": "Invitation accepted",
  "data": {
    "id": "uuid",
    "email": "newuser@example.com",
    "name": "New User"
  }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 410 | AUTH_ERROR | Invitation expired or invalid |
| 410 | AUTH_ERROR | Invitation already accepted |

---

## GET /auth/me

Get current authenticated user and active workspace.

**Auth:** Bearer token required

**Success (200):**
```json
{
  "success": true,
  "message": "Session retrieved",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "emailVerified": true,
      "currentWorkspaceId": "ws-uuid"
    },
    "workspace": {
      "id": "ws-uuid",
      "name": "My Team",
      "slug": "my-team",
      "role": "owner"
    }
  },
  "meta": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-05-29T18:15:00.000Z"
  }
}
```

**Notes:**
- `workspace` is null if user has no `currentWorkspaceId` set
- Used by client on page refresh to restore session state

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 401 | AUTH_ERROR | No token provided |
| 401 | AUTH_ERROR | Invalid token |
| 401 | AUTH_ERROR | Invalid session |

---

## GET /config

Public endpoint exposing application mode configuration.

**Auth:** None

**Success (200):**
```json
{
  "success": true,
  "data": {
    "workspaceMode": "single",
    "registrationMode": "invite"
  }
}
```

---

## Token Payload

**Access Token (short-lived):**
```json
{
  "sub": "user_uuid",
  "email": "user@example.com",
  "sessionId": "session_uuid",
  "iat": 1717000000,
  "exp": 1717000900
}
```

**Refresh Token (long-lived, httpOnly cookie):**
```json
{
  "sessionId": "session_uuid",
  "iat": 1717000000,
  "exp": 1717604800
}
```
