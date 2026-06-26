# Knowledge Base Flow

## Pre-conditions
- Knowledge sources configured (NVD/CWE)
- User has KNOWLEDGE_BASE permission

## Role Context
| Action | Owner | Manager | Reviewer | Member |
|--------|-------|---------|----------|--------|
| View entries | ✅ | ✅ | ✅ | ✅ |
| Edit entry | ✅ | ✅ | ❌ | ❌ |
| Mute/Unmute | ✅ | ✅ | ❌ | ❌ |
| Backfill NVD | ✅ | ❌ | ❌ | ❌ |

## User Scenarios

### 1. View Knowledge Base
1. User navigates to Knowledge Base page
2. Table shows entries with:
   - Name
   - Source (NVD/CWE)
   - Severity
   - Status (Active/Muted)
3. Filterable by source and severity

### 2. Search Entries
1. User types in search box
2. Results filtered by name, description
3. Pagination updates

### 3. View Entry Details
1. User clicks entry row
2. Modal shows:
   - Full description
   - Affected versions
   - References
   - Related findings

### 4. Mute Entry
1. User clicks "Mute" on entry
2. Entry marked as muted
3. No longer used in AI verification
4. Can unmute later

### 5. Edit Entry
1. User clicks "Edit" on entry
2. Can update description, references
3. Changes saved

### 6. Backfill Knowledge
1. Admin triggers NVD backfill
2. System fetches recent CVEs
3. Entries updated in background
4. Progress shown in UI

## Knowledge Sources
| Source | Description |
|--------|-------------|
| NVD | National Vulnerability Database |
| CWE | Common Weakness Enumeration |
| Custom | Workspace-specific rules |

## Pre-condition Checks
- Knowledge base requires KNOWLEDGE_VIEW permission
- Edit/Mute requires KNOWLEDGE_MANAGE permission
- Backfill requires ADMIN role
