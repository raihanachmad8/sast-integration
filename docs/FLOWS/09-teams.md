# Teams Flow

Team management within a workspace.

## Pre-conditions
- User has TEAMS feature flag enabled
- User has appropriate permissions

## Role Context
| Action | Owner | Manager | Reviewer | Member |
|--------|-------|---------|----------|--------|
| View teams | ✅ | ✅ | ✅ | ✅ |
| Create team | ✅ | ✅ | ❌ | ❌ |
| Edit team | ✅ | ✅ | ❌ | ❌ |
| Delete team | ✅ | ✅ | ❌ | ❌ |
| Add member | ✅ | ✅ | ❌ | ❌ |
| Link project | ✅ | ✅ | ❌ | ❌ |

## Sequence Diagrams

### Create Team

```mermaid
sequenceDiagram
    actor User
    participant UI as Teams Page
    participant API
    participant DB[(Database)]

    User->>UI: Click "Create Team"
    UI->>UI: Show form (name, slug, description)
    User->>UI: Fill form + select members
    UI->>API: POST /api/v1/teams
    API->>DB: INSERT team
    API->>DB: INSERT team_members (for each selected user)
    API-->>UI: 201 { team }
    UI->>UI: Redirect to teams list
```

### Add/Remove Members

```mermaid
sequenceDiagram
    actor User
    participant UI
    participant API
    participant DB[(Database)]

    User->>UI: Add member to team
    UI->>API: POST /api/v1/teams/:id/members
    API->>DB: INSERT team_member (unique: team_id + user_id)
    API-->>UI: 201

    User->>UI: Remove member from team
    UI->>API: DELETE /api/v1/teams/:id/members/:userId
    API->>DB: DELETE team_member
    API-->>UI: 204
```

### Assign Team to Project

```mermaid
sequenceDiagram
    actor User
    participant UI as Project Edit
    participant API
    participant DB[(Database)]

    User->>UI: Edit project → select teams
    UI->>API: PATCH /api/v1/projects/:id
    API->>DB: DELETE project_teams WHERE project_id = ?
    API->>DB: INSERT project_teams (for each selected team)
    API-->>UI: 200
```

## User Scenarios

### 1. Create Team
1. User navigates to Teams page
2. Clicks "New team"
3. Enters name and description
4. Clicks "Create"
5. Team created, user becomes Manager

### 2. View Team List
1. Table shows all teams with:
   - Name
   - Member count
   - Project count
   - Created date
2. Searchable by name

### 3. View Team Details
1. User clicks team row
2. Detail drawer shows:
   - Team info
   - Members list
   - Linked projects

### 4. Manage Members
1. Team Manager clicks "Add member"
2. Selects from workspace members
3. Member added to team
4. Can remove members later

### 5. Link Projects
1. Team Manager clicks "Add project"
2. Selects from workspace projects
3. Project linked to team
4. Team members get project access

### 6. Edit Team
1. Manager clicks "Edit"
2. Can update: name, description
3. Changes saved

### 7. Delete Team
1. Owner clicks "Delete"
2. Confirmation dialog
3. Team removed
4. Project links removed
5. Members lose team-based access

## Pre-condition Checks
- Team creation requires TEAM_MANAGE permission
- Member management requires TEAM_MANAGE permission
- Delete requires TEAM_MANAGE permission
