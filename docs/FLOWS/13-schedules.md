# Schedules Flow

## Pre-conditions
- User has SCHEDULES feature flag enabled
- At least one repository imported

## Role Context
| Action | Owner | Manager | Reviewer | Member |
|--------|-------|---------|----------|--------|
| View schedules | ✅ | ✅ | ✅ | ✅ |
| Create schedule | ✅ | ✅ | ❌ | ❌ |
| Edit schedule | ✅ | ✅ | ❌ | ❌ |
| Delete schedule | ✅ | ✅ | ❌ | ❌ |
| Run immediately | ✅ | ✅ | ✅ | ❌ |

## User Scenarios

### 1. Create Schedule
1. User navigates to Schedules page
2. Clicks "Add schedule"
3. Selects repository and branch
4. Sets cron expression (e.g., "0 2 * * *" for daily 2am)
5. Selects timezone
6. Clicks "Create"
7. Schedule created, next run shown

### 2. View Schedule List
1. Table shows all schedules with:
   - Repository
   - Branch
   - Cron expression
   - Next run time
   - Status (Active/Paused)

### 3. Toggle Schedule
1. User clicks toggle on schedule
2. Schedule enabled/disabled
3. Next run updated or cleared

### 4. Edit Schedule
1. User clicks "Edit" on schedule
2. Can update: cron, branch, timezone
3. Changes saved
4. Next run recalculated

### 5. Delete Schedule
1. User clicks "Delete"
2. Confirmation dialog
3. Schedule removed
4. No future runs

### 6. Run Immediately
1. User clicks "Run now" on schedule
2. Scan triggered immediately
3. Schedule continues on normal cadence

## Cron Expression Examples
| Expression | Meaning |
|------------|---------|
| `0 2 * * *` | Daily at 2:00 AM |
| `0 */6 * * *` | Every 6 hours |
| `0 9 * * 1-5` | Weekdays at 9:00 AM |
| `0 0 1 * *` | Monthly on 1st |

## Pre-condition Checks
- Schedule requires SCHEDULE_MANAGE permission
- Repository must be imported
- Cron expression validated on save
