# Auth API Contract

Module: `auth`
Base: `/api/v1/auth`

---

## POST /auth/signup

Create a new user account. Disabled when `WORKSPACE_MODE=single` (invitation-only).

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

Public endpoint exposing application mode configuration. `single` is invitation-only (signup disabled); `multiple` allows open self-signup.

**Auth:** None

**Success (200):**
```json
{
  "success": true,
  "data": {
    "workspaceMode": "single"
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

---

## POST /auth/forgot-password

Request a password reset email. Silent on unknown email (security).

**Auth:** None

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Success (200):**
```json
{
  "success": true,
  "message": "Password reset email sent",
  "data": null,
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 429 | AUTH_ERROR | Please wait before requesting another email |
| 422 | VALIDATION_ERROR | Validation failed |

---

## POST /auth/reset-password

Verify reset token and set new password.

**Auth:** None

**Request:**
```json
{
  "token": "hex_token_from_email",
  "password": "newPassword123!"
}
```

**Success (200):**
```json
{
  "success": true,
  "message": "Password reset successful",
  "data": null,
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 410 | AUTH_ERROR | Token expired or invalid |
| 410 | AUTH_ERROR | Token already used |

---

## GET /auth/verify-email?token=

Verify email address from link sent to user.

**Auth:** None

**Query params:** `token` (required)

**Success (200):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": null,
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 400 | AUTH_ERROR | Token required |
| 410 | AUTH_ERROR | Token expired or invalid |
| 410 | AUTH_ERROR | Token already used |

---

## POST /auth/resend-verification

Resend email verification link. Rate limited (5 min cooldown).

**Auth:** Bearer token required

**Request:** Empty body

**Success (200):**
```json
{
  "success": true,
  "message": "Verification email sent",
  "data": null,
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 400 | AUTH_ERROR | Email already verified |
| 429 | AUTH_ERROR | Please wait before requesting another email |
| 401 | AUTH_ERROR | No token provided |

---

## Project API Tokens (untuk CI/CD Pipelines)

**Endpoint dasar:** `/api/v1/projects/{projectId}/api-tokens`

Project API Token adalah **token khusus project** yang dirancang untuk digunakan dari CI/CD pipeline (GitHub Actions, GitLab CI, Jenkins, Azure DevOps, dll) untuk meng-upload hasil scan (Semgrep, Cppcheck, dll) tanpa perlu user session atau akses ke SCM.

Ini adalah mekanisme utama untuk **external upload flow**.

### Karakteristik

| Aspek | Session JWT | Project API Token |
|-------|-------------|-------------------|
| Dibuat dari | Login user | Project → API Tokens |
| Umur | Pendek + refresh | Panjang (bisa tanpa expiry) |
| Scope | User + Workspace | **Hanya 1 project** |
| Cocok untuk | Frontend / human | CI/CD pipeline |
| Bisa di-revoke | Ya (logout) | Ya (per token) |
| Permissions | Penuh sesuai role | Narrow (`["scans:upload"]`) |

### Format Token

```
sast_p_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- Prefix `sast_p_` = Project token
- Hanya ditampilkan **sekali** saat pembuatan
- Disimpan di database dalam bentuk hash (bcrypt)

### Cara Membuat Token

```http
POST /api/v1/projects/{projectId}/api-tokens
Authorization: Bearer <user_session_jwt>
Content-Type: application/json

{
  "name": "github-actions-upload",
  "permissions": ["scans:upload"],
  "expiresInDays": 365
}
```

**Success (201):**

```json
{
  "success": true,
  "message": "Project API token created. Store the token value securely — it will not be shown again.",
  "data": {
    "token": {
      "id": "uuid",
      "name": "github-actions-upload",
      "tokenPrefix": "sast_p_abc123...",
      "permissions": ["scans:upload"],
      "expiresAt": "2027-06-01T00:00:00.000Z",
      "createdAt": "2026-06-01T10:00:00.000Z"
    },
    "rawToken": "sast_p_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

> **PENTING:** `rawToken` hanya muncul sekali. Simpan segera ke secret manager (GitHub Secrets, GitLab CI Variables, dll).

### Cara Menggunakan di Upload Endpoint

Ini adalah use case utama token ini.

```bash
curl -X POST \
  -H "Authorization: Bearer sast_p_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -F "branch=main" \
  -F "commit=$(git rev-parse HEAD)" \
  -F "repository_url=https://github.com/org/repo" \
  -F "repository_name=my-repo" \
  -F "source=github_actions" \
  -F "semgrep=@reports/semgrep.json" \
  -F "cppcheck=@reports/cppcheck.xml" \
  https://your-domain/api/v1/projects/{projectId}/scans/upload
```

**Response sukses (201):**

```json
{
  "success": true,
  "message": "Scan results uploaded successfully",
  "data": {
    "success": true,
    "scanId": "scan-uuid",
    "repositoryId": "repo-uuid",
    "uploadId": "upload-uuid",
    "resultsCount": 2,
    "message": "Scan results uploaded successfully...",
    "retentionNote": "Raw scan files will be retained for 30 days by default."
  }
}
```

### Contoh GitHub Actions

```yaml
- name: Upload SAST Results
  env:
    SAST_API_TOKEN: ${{ secrets.SAST_PROJECT_TOKEN }}
    PROJECT_ID: "your-project-uuid"
  run: |
    curl -X POST \
      -H "Authorization: Bearer $SAST_API_TOKEN" \
      -F "branch=${GITHUB_REF#refs/heads/}" \
      -F "commit=$GITHUB_SHA" \
      -F "repository_url=${{ github.server_url }}/${{ github.repository }}" \
      -F "source=github_actions" \
      -F "semgrep=@semgrep-results.json" \
      https://your-domain/api/v1/projects/$PROJECT_ID/scans/upload
```

### Endpoint Management Token

| Method | Endpoint | Role Minimum | Keterangan |
|--------|----------|--------------|----------|
| `POST` | `/projects/{projectId}/api-tokens` | MANAGER | Buat token baru |
| `GET`  | `/projects/{projectId}/api-tokens` | MEMBER | List semua token (termasuk revoked) |
| `DELETE` | `/projects/{projectId}/api-tokens/{tokenId}` | MANAGER | Revoke token |

### Security Notes

- Token **hanya valid untuk 1 project** (dicek ketat di upload).
- Token tidak bisa digunakan untuk operasi workspace/project management.
- Setiap penggunaan akan update `last_used_at`.
- Token bisa di-revoke kapan saja dari UI/API.
- Disarankan memberi nama yang deskriptif (contoh: `github-actions-main`, `gitlab-ci-staging`).
- Gunakan expiry untuk token yang sifatnya sementara.

### Error yang Sering Muncul di CI

| Message | Penyebab |
|---------|----------|
| `This API token is not valid for the requested project` | Token dibuat untuk project lain |
| `Project API token is invalid, expired, or has been revoked` | Token sudah dihapus / expired |
| `Project API token does not have the required "scans:upload" permission` | Permissions token tidak mencakup upload |

---

## Catatan Arsitektur Authentication

Saat ini sistem mendukung 3 jenis kredensial:

1. **Session JWT** (dari `/auth/signin`) — untuk user interaktif
2. **Project API Token** (`sast_p_*`) — untuk CI pipeline (external upload)
3. **Personal Access Token** (masih dalam pengembangan)

Endpoint `/scans/upload` adalah satu-satunya endpoint yang secara resmi mendukung Project API Token saat ini.
