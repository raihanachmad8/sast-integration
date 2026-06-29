# Workspace Management Flow

## Pre-conditions
- User authenticated with valid session
- User has appropriate permissions

## Role Context
| Role | Settings | Invite | Remove | Change Roles | View |
|------|----------|--------|--------|--------------|------|
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manager | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reviewer | ❌ | ❌ | ❌ | ❌ | ✅ |
| Member | ❌ | ❌ | ❌ | ❌ | ✅ |

## User Scenarios

### 1. Create Workspace
1. User clicks "Create workspace" on chooser page
2. Enters workspace name and slug
3. Clicks "Create"
4. Workspace created, user becomes Owner
5. Redirected to workspace dashboard

### 2. Switch Workspace
1. User clicks workspace name in top bar
2. Dropdown shows all accessible workspaces
3. Clicks target workspace
4. Context switches, page reloads with new workspace data

### 3. Workspace Settings
1. Owner/Manager navigates to Settings
2. Can update: name, slug, description
3. Changes saved immediately

### 4. Invite Members
1. Owner/Manager goes to Members page
2. Clicks "Invite member"
3. Enters email and selects role (Owner/Manager/Reviewer/Member)
4. Invitation sent via email
5. Invitee joins workspace via link

### 5. Manage Roles
1. Owner/Manager clicks member row
2. Selects "Edit role"
3. Changes role in dropdown
4. Permissions updated immediately

### 6. Remove Member
1. Owner/Manager clicks "Remove" on member row
2. Confirmation dialog appears
3. Member removed from workspace
4. Member loses access immediately

### 7. Revoke Invitation
1. Owner/Manager goes to "Pending" tab
2. Clicks "Revoke" on invitation
3. Invitation link invalidated
4. Invitee can no longer join

### 8. Leave Workspace
1. Member goes to Profile
2. Clicks "Leave workspace" (if not last owner)
3. Removed from workspace
4. Redirected to chooser

## Role Permissions
| Action | Owner | Manager | Reviewer | Member |
|--------|-------|---------|----------|--------|
| Manage workspace settings | ✅ | ❌ | ❌ | ❌ |
| Invite/remove members | ✅ | ✅ | ❌ | ❌ |
| Change member roles | ✅ | ✅ | ❌ | ❌ |
| Manage integrations | ✅ | ✅ | ❌ | ❌ |
| Run scans | ✅ | ✅ | ✅ | ❌ |
| View findings | ✅ | ✅ | ✅ | ✅ |

## Pre-condition Checks
- Owner cannot be removed if last owner
- Role changes require Manager+ permission
- Invitation requires email format validation
