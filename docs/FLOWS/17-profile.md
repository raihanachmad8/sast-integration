# Profile Flow

User profile and security management.

## Profile Management

```mermaid
sequenceDiagram
    actor User
    participant UI as Profile Page
    participant API
    participant DB[(Database)]

    User->>UI: Edit profile
    UI->>UI: Show form (name, username, bio, timezone, language)
    User->>UI: Update fields
    UI->>API: PATCH /api/v1/profile
    API->>DB: UPDATE users
    API-->>UI: 200 { user }
```

## Avatar Upload

```mermaid
sequenceDiagram
    actor User
    participant UI
    participant API
    participant Storage as Storage Service
    participant DB[(Database)]

    User->>UI: Click avatar → select image
    UI->>API: POST /api/v1/profile/avatar
    API->>Storage: Upload image
    Storage-->>API: file URL
    API->>DB: UPDATE users.avatarUrl
    API-->>UI: 200 { avatarUrl }
```

## Password Change

```mermaid
sequenceDiagram
    actor User
    participant UI
    participant API
    participant DB[(Database)]

    User->>UI: Security tab → Change password
    UI->>UI: Show form (current, new, confirm)
    User->>UI: Fill form
    UI->>API: POST /api/v1/profile/change-password
    API->>DB: Verify current password (bcrypt)
    API->>DB: UPDATE users.passwordHash
    API->>DB: DELETE all other sessions
    API-->>UI: 200
    UI->>UI: Redirect to signin (re-login required)
```

## Session Management

```mermaid
sequenceDiagram
    actor User
    participant UI as Security Tab
    participant API
    participant DB[(Database)]

    User->>UI: View active sessions
    UI->>API: GET /api/v1/profile/sessions
    API->>DB: SELECT sessions WHERE userId = ?
    API-->>UI: 200 [{ id, ip, userAgent, lastActivity }]

    User->>UI: Revoke a session
    UI->>API: DELETE /api/v1/profile/sessions/:id
    API->>DB: DELETE session
    API-->>UI: 204
```

## Two-Factor Authentication (2FA)

| Status | Notes |
|--------|-------|
| Schema ready | `two_factor_secret` + `two_factor_confirmed_at` columns exist |
| Not yet implemented | Placeholder in Security tab UI |
| Future: TOTP | Will support Google Authenticator, Authy, etc. |
