# Authentication

## Overview

SAST Integration uses session-based authentication with secure HTTP-only cookies. Passwords are hashed with bcrypt.

## Auth Flow

```
Login Request → Validate Credentials → Create Session → Set Cookie → Redirect to Workspace
```

## Sign Up

```
POST /api/v1/auth/signup
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Full name |
| email | string | Yes | Email address |
| password | string | Yes | Minimum 8 characters |

## Sign In

```
POST /api/v1/auth/signin
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Email address |
| password | string | Yes | Password |

## Session Management

- Sessions are stored in PostgreSQL with configurable TTL
- HTTP-only cookies prevent XSS attacks
- Secure flag enabled in production
- Sessions are invalidated on sign out

## Refresh Token Rotation

The platform implements refresh token rotation with reuse detection:

1. On each authenticated request, a new refresh token is issued
2. The old refresh token is invalidated
3. If a reused (already-invalidated) token is detected, all sessions for that user are revoked
4. The refresh endpoint requires the `x-refresh-request: 1` header

## Password Requirements

- Minimum 8 characters
- Stored with bcrypt (12 rounds)
- Never logged or exposed in API responses

## Protected Routes

All routes under `/(authenticated)/` require a valid session. The `AuthenticatedShell` component handles:

1. Session validation on mount
2. Workspace slug verification
3. Redirect to `/auth/signin` on session expiry
4. Redirect to `/workspaces` on workspace mismatch
