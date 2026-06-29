# Security

Security architecture, authentication, authorization, and protection mechanisms.

## Table of Contents

- [Authentication](#authentication)
- [JWT Tokens](#jwt-tokens)
- [Session Management](#session-management)
- [Refresh Token Rotation](#refresh-token-rotation)
- [Password Security](#password-security)
- [Authorization (RBAC)](#authorization-rbac)
- [CSRF Protection](#csrf-protection)
- [Rate Limiting](#rate-limiting)
- [API Tokens](#api-tokens)
- [Data Protection](#data-protection)
- [Security Checklist](#security-checklist)

---

## Authentication

### Sign In Flow

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant API
    participant Auth as Auth Service
    participant Mail as Mail Service
    participant DB[(Database)]

    User->>Client: Enter email + password
    Client->>API: POST /api/v1/auth/signin
    API->>Auth: authService.signin(email, password)
    Auth->>DB: SELECT user WHERE email = ?
    alt User not found
        Auth-->>API: 401 "Invalid credentials"
    else User found
        Auth->>Auth: bcrypt.compare(password, hash)
        alt Password wrong
            Auth->>Auth: Same delay as bcrypt (timing-safe)
            Auth-->>API: 401 "Invalid credentials"
        else Password correct
            Auth->>Auth: Check emailVerifiedAt
            alt Email not verified
                Auth->>Mail: Send verification email
                Auth-->>API: 403 "Email not verified"
            else Email verified
                Auth->>DB: INSERT session
                Auth->>Auth: Generate access JWT (15 min)
                Auth->>Auth: Generate refresh JWT (7 days)
                Auth-->>API: { accessToken, refreshToken, user }
            end
        end
    end
    API-->>Client: 200 + Set-Cookie (refreshToken)
```

### Sign Up Flow

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant API
    participant Auth as Auth Service
    participant Mail as Mail Service
    participant DB[(Database)]

    User->>Client: Fill signup form
    Client->>API: POST /api/v1/auth/signup
    API->>Auth: authService.signup(data)
    Auth->>DB: Check if email exists
    alt Email exists
        Auth-->>API: 200 "If account exists, check email"
        Note right of Auth: Same response as success<br/>Prevents email enumeration
    else Email new
        Auth->>Auth: bcrypt.hash(password, 12)
        Auth->>DB: INSERT user
        Auth->>DB: Create personal workspace
        Auth->>DB: INSERT workspace_member (owner)
        Auth->>DB: INSERT email_verification_token
        Auth->>Mail: Send verification email
        Auth-->>API: 200 "Check email"
    end
    API-->>Client: 200 (same response either way)
```

---

## JWT Tokens

### Token Types

| Token | Lifetime | Purpose | Storage |
|-------|----------|---------|---------|
| Access Token | 15 minutes | API authentication | In-memory (JavaScript variable) |
| Refresh Token | 7 days | Token renewal | HttpOnly cookie + DB session |
| Personal Access Token | Configurable | API automation | DB only |
| Project API Token | Configurable | CI/CD integration | DB only (SHA-256 hash) |

### JWT Payload

```json
{
  "sub": "user-uuid",
  "sessionId": "session-id",
  "iat": 1782400000,
  "exp": 1782400900
}
```

### Token Security

- **Access tokens**: Short-lived (15m), stored in memory only, never persisted
- **Refresh tokens**: Stored in HttpOnly cookie (not accessible via JavaScript)
- **JWT signing**: HMAC-SHA256 with `JWT_SECRET` (min 32 chars)
- **Production**: Rejects default/insecure JWT_SECRET values

---

## Session Management

### Session Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Active: Sign in
    Active --> Active: Refresh token
    Active --> Expired: 7 days pass
    Active --> Revoked: User signs out
    Active --> Revoked: Admin revokes
    Active --> Compromised: Reuse detection
    Expired --> [*]
    Revoked --> [*]
    Compromised --> [*]

    note right of Active: DB tracks:<br/>- currentRefreshTokenId<br/>- lastActivity<br/>- expiresAt
    note right of Compromised: All sessions deleted<br/>for this user
```

### Session Fields

| Field | Purpose |
|-------|---------|
| `id` | Session identifier (not JWT) |
| `userId` | Associated user |
| `ipAddress` | Client IP (for audit) |
| `userAgent` | Client browser (for audit) |
| `lastActivity` | Last API call timestamp |
| `expiresAt` | Session expiration |
| `currentRefreshTokenId` | For rotation + reuse detection |

---

## Refresh Token Rotation

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API
    participant DB[(Database)]

    Note over C, DB: Normal Refresh
    C->>API: POST /auth/refresh
    Note right of C: Cookie: refreshToken<br/>Header: x-refresh-request: 1
    API->>DB: Find session by userId
    API->>API: Verify refresh JWT
    API->>DB: Check currentRefreshTokenId matches
    API->>DB: UPDATE session (new refreshTokenId)
    API->>API: Generate new access + refresh tokens
    API-->>C: 200 { newAccessToken, newRefreshToken }

    Note over C, DB: Reuse Detection (Attack)
    C->>API: POST /auth/refresh (stolen old token)
    API->>DB: Find session by userId
    API->>DB: currentRefreshTokenId ≠ token's ID
    API->>DB: DELETE all sessions for user
    API-->>C: 401 "Session invalidated"
```

**Key points:**
- Each refresh generates a new `refreshTokenId`
- Presenting an old `refreshTokenId` = token was stolen
- On detection: **all sessions for the user are deleted**
- CSRF protection: `x-refresh-request: 1` header required

---

## Password Security

| Mechanism | Implementation |
|-----------|---------------|
| Hashing | bcryptjs with cost factor 12 |
| Minimum length | 8 characters (validated by Zod) |
| Password strength | Visual indicator (Weak/Fair/Good/Strong) |
| Storage | Only bcrypt hash stored, never plaintext |
| Reset flow | Token-based, single-use, 1-hour expiry |
| Timing safety | bcrypt.compare is timing-safe |

### Password Reset Flow

```mermaid
sequenceDiagram
    actor User
    participant API
    participant Auth
    participant Mail
    participant DB[(Database)]

    User->>API: POST /auth/forgot-password
    API->>DB: INSERT password_reset_token
    API->>Mail: Send reset link email
    API-->>User: "Check your email"

    User->>API: GET /auth/reset-password?token=xxx
    API->>DB: Validate token (exists, not used, not expired)
    API-->>User: Show reset form

    User->>API: POST /auth/reset-password { token, password }
    API->>Auth: authService.resetPassword()
    Auth->>DB: UPDATE user.passwordHash
    Auth->>DB: UPDATE password_reset_token.usedAt
    Auth->>DB: DELETE all user sessions
    Auth-->>User: "Password updated, please sign in"
```

---

## Authorization (RBAC)

### Role Hierarchy

```mermaid
graph TB
    Owner["👑 Owner<br/>Level 4<br/>39 permissions<br/>Full control"] --> Manager["🔧 Manager<br/>Level 3<br/>39 permissions<br/>Same as owner"]
    Manager --> Reviewer["🔍 Reviewer<br/>Level 2<br/>23 permissions<br/>View + Triage + Run"]
    Reviewer --> Member["👤 Member<br/>Level 1<br/>17 permissions<br/>View only"]

    style Owner fill:#ef4444,color:#fff
    style Manager fill:#f59e0b,color:#fff
    style Reviewer fill:#4a9eff,color:#fff
    style Member fill:#22c55e,color:#fff
```

### Permission Resources & Actions

| Resources (19) | Actions (10) |
|----------------|-------------|
| dashboard, repository, scan, finding, report, arena, member, team, project, integration, webhook, schedule, policy, quality_gate, scanner, ai_model, knowledge, workspace, audit | view, manage, run, upload, triage, override_ai, export, invite, settings, read |

### Key Permission Differences

| Capability | Owner | Manager | Reviewer | Member |
|------------|-------|---------|----------|--------|
| Manage members (invite/remove) | ✅ | ✅ | ✅ | ❌ |
| Change member roles | ✅ | ✅ | ❌ | ❌ |
| Trigger scans | ✅ | ✅ | ✅ | ❌ |
| Triage findings | ✅ | ✅ | ✅ | ❌ |
| Override AI verdict | ✅ | ✅ | ✅ | ❌ |
| Export reports | ✅ | ✅ | ✅ | ❌ |
| View all data | ✅ | ✅ | ✅ | ✅ |

---

## CSRF Protection

```
POST /api/v1/auth/refresh
Header: x-refresh-request: 1
```

The refresh endpoint requires a custom header (`x-refresh-request: 1`) that cannot be set by cross-origin forms or simple requests. This prevents CSRF attacks on the token refresh flow.

---

## Rate Limiting

Rate limiting is available via the `rateLimiter` service. Configuration:

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_ENABLED` | `true` | Enable/disable rate limiting |

Rate limiting is applied per-IP for sensitive endpoints (signin, signup, password reset).

---

## API Tokens

### Personal Access Tokens (PAT)

```mermaid
graph LR
    A["User creates PAT"] --> B["Token generated<br/>(64 chars)"]
    B --> C["Raw token shown ONCE"]
    C --> D["SHA-256 hash stored in DB"]
    D --> E["Subsequent auth:<br/>hash lookup"]

    style C fill:#f59e0b,color:#fff
    style D fill:#22c55e,color:#fff
```

- Token shown to user **only once** at creation
- Only SHA-256 hash stored in database
- Configurable expiry
- Can be revoked at any time
- `abilities` field controls permissions (JSON array)

### Project API Tokens

- Scoped to a specific project
- Default permission: `["scans:upload"]`
- Used by CI/CD pipelines for external scan uploads
- SHA-256 hash for O(1) lookup
- Token prefix (8-12 chars) shown for identification

---

## Data Protection

| Data Type | Protection |
|-----------|-----------|
| Passwords | bcrypt hash (cost 12) |
| JWT Secret | Min 32 chars, production rejects defaults |
| API Keys (AI) | `api_key_encrypted` column |
| SCM Credentials | `credentials` JSONB (encrypted) |
| PAT Tokens | SHA-256 hash only |
| Session tokens | HttpOnly cookie, not accessible via JS |
| Database connections | SSL required (`sslmode=require`) |

### Soft Delete Pattern

Most entities use soft delete (`deleted_at` + `deleted_by`) instead of hard delete:
- Users, Workspaces, Projects, Repositories, Teams, Webhooks

### Audit Trail

| Log Type | Records |
|----------|---------|
| `audit_logs` | User actions (who, what, when, where) |
| `activity_logs` | System events (scan completed, finding updated) |
| `finding_history` | Finding field changes (old → new value) |

---

## Security Checklist

### Infrastructure
- [ ] `JWT_SECRET` is 32+ random characters
- [ ] `DATABASE_URL` uses SSL (`sslmode=require`)
- [ ] HTTPS enforced via reverse proxy
- [ ] Container runs as non-root user
- [ ] Rate limiting enabled

### Authentication
- [ ] Password hashing with bcrypt (cost 12+)
- [ ] Email verification required
- [ ] Refresh token rotation enabled
- [ ] Session invalidation on password change
- [ ] Brute-force protection via rate limiting

### Authorization
- [ ] RBAC enforced on all API endpoints
- [ ] Feature flags control UI visibility
- [ ] Workspace isolation (no cross-workspace data access)
- [ ] Project-level access control

### Data
- [ ] `.env` not committed to git
- [ ] Secrets stored in cloud secret manager (production)
- [ ] No sensitive data in logs
- [ ] SQL injection prevented (Drizzle ORM parameterized queries)
- [ ] XSS prevented (React auto-escaping + CSP headers)

### API
- [ ] CORS configured for production domain
- [ ] Request validation (Zod) on all endpoints
- [ ] Error responses don't leak internals
- [ ] API rate limiting enabled
- [ ] CSRF protection on state-changing operations
