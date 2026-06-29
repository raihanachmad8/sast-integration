# Members Flow

Workspace member management and invitations.

## Invite Member

```mermaid
sequenceDiagram
    actor Owner as Owner/Manager
    participant UI as Members Page
    participant API
    participant Mail as Mail Service
    participant DB[(Database)]

    Owner->>UI: Click "Invite Member"
    UI->>UI: Show form (email, role)
    Owner->>UI: Fill email + select role
    UI->>API: POST /api/v1/members/invite
    API->>DB: Check if email already member
    API->>DB: INSERT workspace_invitation
    API->>Mail: Send invitation email
    API-->>UI: 201
    UI->>UI: Show in "Pending" tab
```

## Accept Invitation

```mermaid
flowchart TD
    A["User clicks invite link"] --> B{"Already signed in?"}
    B -->|"Yes"| C{"Email matches?"}
    B -->|"No"| D["Sign in / Sign up"]
    D --> C
    C -->|"Yes"| E["POST /auth/invite/accept-logged-in"]
    C -->|"No"| F["Show email mismatch warning"]
    E --> G["INSERT workspace_member"]
    G --> H["Redirect to workspace"]
    F --> I["User signs in with correct email"]
    I --> E
```

## Change Role

```mermaid
sequenceDiagram
    actor Owner
    participant UI
    participant API
    participant DB[(Database)]

    Owner->>UI: Change member role
    UI->>API: PUT /api/v1/members/:userId/role
    Note right of API: Only OWNER can change roles
    API->>DB: UPDATE workspace_member SET role = ?
    API-->>UI: 200
```

## Remove Member

```mermaid
sequenceDiagram
    actor Owner
    participant UI
    participant API
    participant DB[(Database)]

    Owner->>UI: Remove member
    UI->>API: DELETE /api/v1/members/:userId
    API->>DB: DELETE workspace_member
    API->>DB: DELETE related team memberships
    API-->>UI: 204
```

## Role Permissions

| Role | Can Invite | Can Remove | Can Change Roles |
|------|-----------|------------|-----------------|
| Owner | ✅ | ✅ | ✅ |
| Manager | ✅ | ✅ | ❌ |
| Reviewer | ❌ | ❌ | ❌ |
| Member | ❌ | ❌ | ❌ |
