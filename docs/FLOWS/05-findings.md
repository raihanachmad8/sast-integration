# Findings Management Flow

## Pre-conditions
- At least one scan completed
- Findings exist in workspace

## Role Context
| Action | Owner | Manager | Reviewer | Member |
|--------|-------|---------|----------|--------|
| View findings | ✅ | ✅ | ✅ | ✅ |
| Dismiss finding | ✅ | ✅ | ✅ | ❌ |
| Mark resolved | ✅ | ✅ | ✅ | ❌ |
| Re-verify | ✅ | ✅ | ✅ | ❌ |
| Assign | ✅ | ✅ | ✅ | ❌ |

## User Scenarios

### 1. View Findings List
1. User navigates to Findings page
2. Table shows all findings with:
   - Severity (Critical/High/Medium/Low)
   - Scanner type
   - Status (Open/Dismissed/Resolved)
   - File path
   - Rule name
3. Filters: severity, scanner, status, verdict

### 2. Filter Findings
1. User clicks filter dropdown
2. Selects severity: Critical
3. Table updates to show only critical findings
4. Active filter tag appears, can be removed

### 3. Search Findings
1. User types in search box
2. Results filtered by:
   - File path
   - Rule name
   - Message content

### 4. View Finding Detail
1. User clicks finding row
2. Drawer opens with:
   - Full description
   - Code snippet with line highlighting
   - AI verification verdict
   - CWE reference
   - Related knowledge base entries

### 5. Dismiss Finding
1. User clicks "Dismiss" on finding
2. Finding marked as false positive
3. Status changes to "Dismissed"
4. No longer appears in default view

### 6. Mark Resolved
1. User clicks "Mark Resolved"
2. Finding marked as fixed
3. Status changes to "Resolved"
4. Tracked in resolution metrics

### 7. Re-verify with AI
1. User clicks "Re-verify"
2. Different AI model analyzes finding
3. New verdict and confidence score
4. History of verifications preserved

### 8. Assign Finding
1. User clicks "Assign"
2. Selects team member from dropdown
3. Finding assigned to reviewer
4. Reviewer notified

### 9. Bulk Operations
1. User selects multiple findings
2. Bulk bar appears with actions
3. Apply action to all selected

## Finding Statuses
| Status | Description |
|--------|-------------|
| Open | New finding, needs review |
| Dismissed | Marked as false positive |
| Resolved | Confirmed and fixed |

## AI Verdicts
| Verdict | Meaning |
|---------|---------|
| True Positive | AI confirms vulnerability |
| False Positive | AI believes it's safe |
| Pending | Awaiting AI analysis |

## Pre-condition Checks
- Dismiss/Resolve requires FINDING_TRIAGE permission
- Assign requires FINDING_TRIAGE permission
- Re-verify requires SCAN_RUN permission
