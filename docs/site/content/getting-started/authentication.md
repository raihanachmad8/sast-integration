---
title: Authentication
description: Sign in, sign up, password reset, and token management
---

# Authentication

SAST Integration uses JWT-based authentication with refresh token rotation and reuse detection.

## Auth Architecture

```mermaid
graph TB
    subgraph "Client"
        Browser["Browser"]
        Token["In-Memory<br/>Access Token<br/>(15 min)"]
        Cookie["HttpOnly Cookie<br/>Refresh Token<br/>(7 days)"]
    end

    subgraph "Server"
        API["API Routes"]
        JWT["JWT Service"]
        Session["Session Service"]
    end

    subgraph "Database"
        DB[("PostgreSQL<br/>sessions table")]
    end

    Browser --> API
    API --> JWT
    JWT --> Session
    Session --> DB
    Browser --> Token
    Browser --> Cookie

    style Token fill:#22c55e,color:#fff
    style Cookie fill:#f59e0b,color:#fff
    style DB fill:#336791,color:#fff
```

## Sign In

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant API
    participant Auth as Auth Service
    participant DB[(Database)]

    User->>Client: Enter email + password
    Client->>API: POST /api/v1/auth/signin
    API->>Auth: authService.signin()
    Auth->>DB: SELECT user WHERE email = ?
    Auth->>Auth: bcrypt.compare(password, hash)
    Auth->>DB: INSERT session
    Auth->>Auth: Generate access JWT (15 min)
    Auth->>Auth: Generate refresh JWT (7 days)
    Auth-->>API: { accessToken, refreshToken, user }
    API-->>Client: 200 + Set-Cookie
    Client->>Client: Store accessToken in memory
```

**Request:**

```bash
POST /api/v1/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name"
    }
  }
}
```

## Sign Up

```mermaid
sequenceDiagram
    actor User
    participant API
    participant Auth
    participant Mail
    participant DB[(Database)]

    User->>API: POST /api/v1/auth/signup
    API->>Auth: authService.signup()
    Auth->>DB: Check email existence
    Auth->>DB: INSERT user (bcrypt hash)
    Auth->>DB: Create personal workspace
    Auth->>DB: INSERT workspace_member (owner)
    Auth->>DB: INSERT email_verification_token
    Auth->>Mail: Send verification email
    Auth-->>API: 200 "Check your email"
    Note right of Auth: Same response whether<br/>email exists or not<br/>(prevents enumeration)
```

**Request:**

```bash
POST /api/v1/auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

## Password Reset

```mermaid
sequenceDiagram
    actor User
    participant API
    participant Auth
    participant Mail
    participant DB[(Database)]

    User->>API: POST /auth/forgot-password
    API->>DB: INSERT password_reset_token
    API->>Mail: Send reset link
    API-->>User: "Check your email"

    User->>API: POST /auth/reset-password
    API->>Auth: authService.resetPassword()
    Auth->>DB: UPDATE passwordHash
    Auth->>DB: UPDATE token.usedAt
    Auth->>DB: DELETE all user sessions
    Auth-->>User: "Password updated"
```

## Token Refresh

```mermaid
sequenceDiagram
    participant C as Client
    participant API
    participant DB[(Database)]

    C->>API: POST /auth/refresh
    Note right of C: Header: x-refresh-request: 1
    Note right of C: Cookie: refreshToken
    API->>DB: Find session
    API->>API: Verify refresh JWT
    API->>DB: Check currentRefreshTokenId
    API->>DB: UPDATE session (new refreshTokenId)
    API->>API: Generate new tokens
    API-->>C: 200 { newAccessToken, newRefreshToken }
```

## Refresh Token Rotation + Reuse Detection

```mermaid
sequenceDiagram
    participant C as Client
    participant API
    participant DB[(Database)]

    Note over C, DB: Normal: Each refresh rotates the token
    C->>API: POST /auth/refresh (token A)
    API->>DB: token A matches currentRefreshTokenId ✓
    API->>DB: UPDATE session (new ID for token B)
    API-->>C: { accessToken, refreshToken: B }

    Note over C, DB: Attack: Stolen old token
    C->>API: POST /auth/refresh (stolen token A)
    API->>DB: token A ≠ currentRefreshTokenId (now B)
    API->>DB: DELETE all sessions for user
    API-->>C: 401 Unauthorized
```

**Key security features:**
- Each refresh generates a new `refreshTokenId`
- Presenting an old `refreshTokenId` = token was stolen
- On detection: **all sessions for the user are deleted**
- CSRF protection: `x-refresh-request: 1` header required

## Email Verification

```mermaid
sequenceDiagram
    actor User
    participant API
    participant Mail
    participant DB[(Database)]

    User->>API: GET /auth/verify-email?token=xxx
    API->>DB: Validate token (exists, not expired)
    API->>DB: UPDATE user.emailVerifiedAt
    API->>DB: DELETE verification token
    API-->>User: 200 "Email verified"
```

## Personal Access Tokens (PAT)

For API automation:

```mermaid
graph LR
    A["Create PAT"] --> B["Token shown ONCE<br/>(64 chars)"]
    B --> C["SHA-256 hash stored"]
    C --> D["Auth: hash lookup"]

    style B fill:#f59e0b,color:#fff
    style C fill:#22c55e,color:#fff
```

- Token shown to user **only once** at creation
- Only SHA-256 hash stored in database
- Configurable expiry
- Can be revoked at any time

## Password Security

| Mechanism | Implementation |
|-----------|---------------|
| Hashing | bcryptjs with cost factor 12 |
| Minimum length | 8 characters |
| Storage | Only bcrypt hash, never plaintext |
| Reset flow | Token-based, single-use, 1-hour expiry |
| Timing safety | bcrypt.compare is timing-safe |
| Enumeration prevention | Same response for existing/non-existing emails |
