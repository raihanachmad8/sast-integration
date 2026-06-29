# Projects Flow

## Pre-conditions
- User authenticated with workspace access

## Role Context
| Action | Owner | Manager | Reviewer | Member |
|--------|-------|---------|----------|--------|
| View projects | ✅ | ✅ | ✅ | ✅ |
| Create project | ✅ | ✅ | ❌ | ❌ |
| Edit project | ✅ | ✅ | ❌ | ❌ |
| Delete project | ✅ | ✅ | ❌ | ❌ |
| Manage API tokens | ✅ | ✅ | ❌ | ❌ |

## User Scenarios

### 1. Create Project
1. User navigates to Projects page
2. Clicks "New project"
3. Fills in name, description
4. Optionally links repositories and teams
5. Clicks "Create"
6. Project created, appears in list

### 2. View Project List
1. Table shows all projects with:
   - Name
   - Repository count
   - Team count
   - Created date
2. Searchable by name

### 3. View Project Details
1. User clicks project row
2. Detail page shows:
   - Project info (name, description, lead)
   - Linked repositories
   - Linked teams
   - Members
   - API tokens

### 4. Edit Project
1. Owner/Manager clicks "Edit" on project
2. Can update: name, description
3. Can manage: repositories, teams, members
4. Changes saved

### 5. Delete Project
1. Owner clicks "Delete" on project
2. Confirmation dialog
3. Project removed
4. API tokens invalidated

### 6. API Tokens
1. User goes to project → API Tokens tab
2. Clicks "Create token"
3. Enters name and permissions
4. Token shown once (copy immediately)
5. Can revoke token later

## Pre-condition Checks
- Project creation requires PROJECT_MANAGE permission
- Delete requires PROJECT_MANAGE permission
- API tokens scoped to project
