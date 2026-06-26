# Source Control Integration Flow

## Pre-conditions
- User has Manager+ role in workspace
- Provider supports API access (GitHub/GitLab/Gitea)

## Role Context
| Action | Owner | Manager | Reviewer | Member |
|--------|-------|---------|----------|--------|
| View providers | ✅ | ✅ | ✅ | ✅ |
| Connect provider | ✅ | ✅ | ❌ | ❌ |
| Sync repos | ✅ | ✅ | ❌ | ❌ |
| Import repo | ✅ | ✅ | ❌ | ❌ |
| Disconnect | ✅ | ✅ | ❌ | ❌ |
| Delete provider | ✅ | ✅ | ❌ | ❌ |

## User Scenarios

### 1. Connect GitHub Provider
1. User navigates to Source Control page
2. Clicks "Connect provider" → selects GitHub
3. Setup guide drawer opens with 3 modes:
   - **GitHub App** (recommended): Creates GitHub App automatically
   - **OAuth**: Redirects to GitHub OAuth
   - **PAT**: User enters personal access token
4. User completes authorization
5. Provider appears in Providers table with status "Connected"

### 2. Connect GitLab Provider
1. Clicks "Connect provider" → selects GitLab
2. Setup guide shows PAT mode
3. User creates PAT in GitLab with `api` scope
4. Pastes token, clicks "Connect GitLab"
5. Provider connected

### 3. Connect Gitea Provider
1. Clicks "Connect provider" → selects Gitea
2. Enters Gitea URL and PAT
3. Clicks "Connect Gitea"
4. Provider connected

### 4. Sync Repositories
1. User clicks "Sync" on connected provider
2. System fetches repository list from provider
3. Repository catalog updates with discovered repos
4. Status shows "Imported" or "Available"

### 5. Import Repository
1. User finds "Available" repository in catalog
2. Clicks "Import" action
3. Repository imported to workspace
4. Can now run scans on this repository

### 6. Disconnect Provider
1. User clicks "Disconnect" on provider
2. Confirmation dialog
3. Credentials cleared, provider remains in list
4. Status changes to "Disconnected"
5. Can reconnect later without re-adding

### 7. Delete Provider
1. User clicks "Delete" on provider
2. Warning: "This will remove provider and all data permanently"
3. Confirmation required
4. Provider removed from list entirely

### 8. Test Connection
1. User clicks "Test" on connected provider
2. System sends test API call
3. Shows success/failure with configured keys

## Webhook Status
- **Active**: Webhook registered and receiving events
- **Pending**: Webhook created but not yet verified
- **No webhook**: Repository not imported or webhook not set up

## Pre-condition Checks
- Provider must be "Connected" to sync/import
- Import requires Manager+ role
- Delete removes all associated data permanently
