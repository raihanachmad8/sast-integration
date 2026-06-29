# Dashboard Flow

## Pre-conditions
- User authenticated with workspace access
- At least one scan completed
- User has DASHBOARD_VIEW permission

## Role Context
- All workspace members can view dashboard
- Summary data visible to all roles
- Quick actions respect individual permissions

## User Scenarios

### 1. View Dashboard
1. User lands on workspace dashboard
2. Shows summary cards:
   - Total scans
   - Findings by severity
   - Recent activity
3. Quick actions available

### 2. Recent Scans Widget
1. Shows last 5 scans
2. Status indicators (Running/Completed/Failed)
3. Click to view scan details

### 3. Findings Summary
1. Count by severity:
   - Critical (red)
   - High (orange)
   - Medium (yellow)
   - Low (green)
2. Click to view findings filtered by severity

### 4. Quick Actions
1. "New scan" - Opens scan creation
2. "View findings" - Goes to findings page
3. "Generate report" - Opens report modal

### 5. Activity Timeline
1. Shows recent events:
   - Scans completed
   - Findings created
   - Reports generated
2. Timestamps and user info

## Dashboard Notes
- Dashboard uses simplified pagination (top 5 items)
- Real-time updates via polling
- No server-side pagination for summary widgets
- Full pagination available on dedicated pages
