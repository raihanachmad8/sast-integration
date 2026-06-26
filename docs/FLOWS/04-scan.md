# Scan Flow

## Pre-conditions
- At least one repository imported
- Scanner engine installed and ready

## Role Context
| Action | Owner | Manager | Reviewer | Member |
|--------|-------|---------|----------|--------|
| View scans | ✅ | ✅ | ✅ | ✅ |
| Trigger scan | ✅ | ✅ | ✅ | ❌ |
| View findings | ✅ | ✅ | ✅ | ✅ |
| Dismiss/Resolve | ✅ | ✅ | ✅ | ❌ |

## User Scenarios

### 1. Trigger Manual Scan
1. User navigates to Scans page
2. Clicks "New scan"
3. Selects repository and branch
4. Optionally selects specific scanners
5. Clicks "Run scan"
6. Scan queued, status shows "Running"

### 2. Scan Lifecycle
1. **Queued**: Scan waiting to start
2. **Cloning**: Repository being cloned
3. **Scanning**: Scanner engines running
4. **Parsing**: Results being parsed
5. **AI Verifying**: AI analyzing findings
6. **Completed**: Scan finished successfully
7. **Failed**: Scan encountered error

### 3. View Scan Results
1. User clicks scan row in table
2. Drawer opens showing:
   - Scan metadata (origin, branch, commit)
   - Timeline of events
   - Summary cards (findings by severity)
   - List of findings with expandable details

### 4. View Finding Details
1. User clicks finding in list
2. Shows:
   - Severity, scanner, status tags
   - File path and line number
   - Code snippet with highlighted vulnerability
   - AI analysis (if available)
   - CWE reference
3. Actions: Dismiss, Mark Resolved, Re-verify

### 5. AI Verification
1. After scan completes, AI analyzes each finding
2. Verdict: True Positive / False Positive
3. Confidence score shown
4. User can request re-verification with different model

### 6. Bulk Actions
1. User selects multiple findings via checkboxes
2. Bulk actions appear: Dismiss, Resolve, Re-verify, Assign
3. Actions applied to all selected findings

### 7. CI/CD Integration
1. User goes to Scan page → CI/CD tab
2. Gets API token and endpoint
3. Adds to CI pipeline
4. Scan triggered automatically on push/PR

## Scan Origins
- **Managed**: Platform-triggered via UI or schedule
- **External Upload**: Via CI/CD API upload

## Scanner Engines
| Engine | Type | What it detects |
|--------|------|-----------------|
| Semgrep | Pattern-based SAST | Code vulnerabilities |
| Gitleaks | Secret detection | Hardcoded secrets |
| Flawfinder | C/C++ | Buffer overflows, race conditions |
| Cppcheck | C/C++ | Memory leaks, null pointers |

## Pre-condition Checks
- Repository must be imported before scanning
- Scanner engine must be "Ready" status
- User needs SCAN_RUN permission
