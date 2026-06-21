# 🎯 Visual Decision Tree: Di Mana Comment & Dedup Terjadi?

## 1️⃣ Deduplication Flow (Per Commit Push)

```
Developer Push New Commit to PR
        ↓
   ┌────────────────────┐
   │ SCAN TRIGGERED     │
   │ (CI/CD pipeline)   │
   └────────────────────┘
        ↓
   ┌────────────────────────────────────────┐
   │ STEP 1: Parse Scanner Results          │
   │ - Semgrep: find 12 issues              │
   │ - Gitleaks: find 5 issues              │
   │ - Flawfinder: find 3 issues            │
   │ Total: 20 raw findings                 │
   └────────────────────────────────────────┘
        ↓
   ┌────────────────────────────────────────┐
   │ STEP 2: Dedup Within Batch (per parser)│
   │ Semgrep batch: 12 → 12 unique (no dup) │
   │ Gitleaks batch: 5 → 5 unique (no dup)  │
   │ Flawfinder batch: 3 → 3 unique (no dup)│
   └────────────────────────────────────────┘
        ↓
   ┌────────────────────────────────────────┐
   │ STEP 3: Cross-Scan Dedup               │
   │ Query: Active findings for this repo    │
   │        + this scanner + EXCLUDE this    │
   │        scan ID                          │
   │                                         │
   │ For Semgrep:                            │
   │  Previous: 12 findings (from commit N-1)│
   │  Current: 12 findings (from commit N)   │
   │  Match by fingerprint:                  │
   │   - 10 matched → PERSISTENT             │
   │   - 2 new → CREATE NEW                  │
   │   - 0 removed → no RESOLVED             │
   │                                         │
   │ For Gitleaks:                           │
   │  Previous: 5 findings                   │
   │  Current: 5 findings                    │
   │  Match: 5 persistent, 0 new, 0 resolved│
   │                                         │
   │ For Flawfinder:                         │
   │  Previous: 3 findings                   │
   │  Current: 2 findings                    │
   │  Match: 2 persistent, 0 new, 1 resolved│
   │                                         │
   │ TOTAL: 17 persistent + 2 new            │
   │        + 1 resolved (marked inactive)   │
   └────────────────────────────────────────┘
        ↓
   ┌────────────────────────────────────────┐
   │ STEP 4: Save Findings + AI Verification│
   │ Insert: 2 new findings                  │
   │ Re-verify: 17 persistent + 2 new (all!)│
   │ (NO skip - every finding gets verified)│
   └────────────────────────────────────────┘
        ↓
   ┌────────────────────────────────────────┐
   │ STEP 5: Report & Comments              │
   │ - Generate PR Summary comment           │
   │ - Post inline comments (critical only)  │
   │ - Update dashboard                      │
   └────────────────────────────────────────┘
        ↓
   Developer sees PR with updated findings
```

---

## 2️⃣ Dedup Scope: 3 Levels

```
┌─────────────────────────────────────────────────────────┐
│ LEVEL 1: WITHIN-SCAN DEDUP (same parser, same scan)    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Parser Output (raw): [SQL1, SQL2, SQL1-dup, Sec1]      │
│                                                         │
│ Dedup: [SQL1, SQL2, Sec1]  ← Remove duplicates         │
│                                                         │
│ Location: finding.service.ts L35                        │
│ Code: seenFingerprints = new Map()                      │
│                                                         │
│ Result: 4 findings → 3 unique findings                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────┐
│ LEVEL 2: ACROSS-SCAN DEDUP (same branch, same scanner) │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Previous Scan (Commit N-1):                             │
│   Semgrep: [SQL1, SQL2, Sec1]  (3 active)               │
│                                                         │
│ Current Scan (Commit N):                                │
│   Semgrep: [SQL1, SQL2, SQL3-new]  (3 incoming)        │
│                                                         │
│ Dedup Logic:                                             │
│   SELECT findings WHERE                                 │
│     repositoryId = 'repo'                               │
│     AND scanner = 'semgrep'                             │
│     AND active = true                                   │
│     AND scanId != 'current_scan'  ← EXCLUDE current     │
│   Result: [SQL1, SQL2, Sec1]                            │
│                                                         │
│ Match by fingerprint:                                    │
│   SQL1: previous=yes, current=yes → PERSISTENT          │
│   SQL2: previous=yes, current=yes → PERSISTENT          │
│   Sec1: previous=yes, current=no → RESOLVED (mark false)│
│   SQL3: previous=no, current=yes → NEW                  │
│                                                         │
│ Location: finding.repository.ts (NEW method)            │
│ Location: finding.service.ts L50-60 (CALL NEW METHOD)   │
│                                                         │
│ Result: Previous findings marked inactive, new created  │
│                                                         │
└─────────────────────────────────────────────────────────┘
        ↓
⚠️ DO NOT EXIST IN CURRENT CODE:
┌─────────────────────────────────────────────────────────┐
│ LEVEL 3: CROSS-BRANCH DEDUP (main vs PR)                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Current Behavior: NO FILTERING by branch                │
│   Query finds findings from ANY branch                  │
│                                                         │
│ Example:                                                 │
│   Main branch: SQL1 at line 50 (still exists)           │
│   PR branch: SQL1 at line 50 (new code, different)      │
│   Result: Same fingerprint → deduplicated              │
│            BUT WRONG! Different branches!               │
│                                                         │
│ Solution Needed:                                         │
│   Check: Is finding from same branch?                   │
│   Problem: findings table doesn't have branch column    │
│   Branch is in scans table!                             │
│                                                         │
│ Fix: Update query to join with scans table              │
│   AND scans.branch = 'current_branch'                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 3️⃣ Comment Placement Decision Tree

```
New Finding Detected in Scan
        ↓
    ┌───────────────────────┐
    │ What is severity?     │
    └───────────────────────┘
        ↓
        ├─ CRITICAL
        │   ↓
        │   ┌──────────────────────────────┐
        │   │ Post INLINE COMMENT          │
        │   │ Show: Code, Rule, Fix        │
        │   │ Add: [Mark False Positive]   │
        │   │       [View Dashboard]       │
        │   │       [Assign]               │
        │   └──────────────────────────────┘
        │   ↓
        │   ┌──────────────────────────────┐
        │   │ Post DASHBOARD DISCUSSION    │
        │   │ Assign to security team      │
        │   │ Link to inline comment       │
        │   └──────────────────────────────┘
        │   ↓
        │   ┌──────────────────────────────┐
        │   │ Update PR SUMMARY COMMENT    │
        │   │ Highlight: "CRITICAL: 1"    │
        │   └──────────────────────────────┘
        │
        ├─ HIGH / MEDIUM (NEW)
        │   ↓
        │   ┌──────────────────────────────┐
        │   │ Post INLINE COMMENT          │
        │   │ Show code + explanation      │
        │   └──────────────────────────────┘
        │   ↓
        │   ┌──────────────────────────────┐
        │   │ Update PR SUMMARY COMMENT    │
        │   │ Count: "New: 1"              │
        │   └──────────────────────────────┘
        │
        ├─ MEDIUM / LOW (NEW)
        │   ↓
        │   ┌──────────────────────────────┐
        │   │ NO INLINE COMMENT            │
        │   │ Only update PR summary       │
        │   │ "Medium/Low: 2 new"          │
        │   └──────────────────────────────┘
        │
        └─ PERSISTENT (Already existed)
            ↓
            ┌──────────────────────────────┐
            │ NO NEW COMMENT               │
            │ Only update status if needed │
            │ Link existing inline comment │
            │ (if was critical)            │
            └──────────────────────────────┘
```

---

## 4️⃣ Comment Count vs Findings Count

```
SCENARIO: 3 Commits, 22 + 21 + 25 findings

Commit 1: 22 findings
├─ SCAN finds: 22 findings (12 semgrep + 5 gitleaks + 5 flawfinder)
│  ├─ Dedup vs previous: No previous → all 22 NEW
│  ├─ Status: persistent=0, new=22, resolved=0
│  │
│  └─ COMMENTS POSTED:
│     ├─ 1x PR Summary Comment
│     │   "🔴 22 findings (2 critical, 8 high, 12 medium)"
│     │
│     ├─ 2x Inline Comments (critical only)
│     │   "CRITICAL: Hardcoded secret at line X"
│     │   "CRITICAL: SQLi at line Y"
│     │
│     └─ Total Comments by System: 3

Commit 2: 21 findings (1 fixed)
├─ SCAN finds: 21 findings
│  ├─ Dedup vs Commit 1:
│  │   Previous: 22 (semgrep=12, gitleaks=5, flawfinder=5)
│  │   Current: 21 (semgrep=12, gitleaks=5, flawfinder=4)
│  │
│  ├─ Per-scanner:
│  │   Semgrep: 12 → 12 (10 persistent, 0 new, 2 from before)
│  │   Gitleaks: 5 → 5 (5 persistent, 0 new, 0 resolved)
│  │   Flawfinder: 5 → 4 (4 persistent, 0 new, 1 resolved ✓)
│  │
│  ├─ Status: persistent=17, new=0, resolved=1
│  │
│  └─ COMMENTS POSTED:
│     ├─ 1x PR Summary Comment (REPLACE previous)
│     │   "✅ Progress! 1 finding fixed!"
│     │   "21 findings remaining (1 critical, 8 high, 12 medium)"
│     │
│     ├─ 1x Inline Comment Update
│     │   On the old critical finding: ✅ "FIXED in this commit!"
│     │
│     └─ Total Comments by System: 2 (1 replaced + 1 updated)

Commit 3: 25 findings (4 new from new file)
├─ SCAN finds: 25 findings
│  ├─ Dedup vs Commit 2:
│  │   Previous: 21 findings
│  │   Current: 25 findings
│  │
│  ├─ Status: persistent=17, new=4, resolved=0
│  │
│  └─ COMMENTS POSTED:
│     ├─ 1x PR Summary Comment (REPLACE previous)
│     │   "⚠️ 4 new findings in new file"
│     │   "25 findings total"
│     │
│     ├─ 4x Inline Comments (if critical/new)
│     │   Only for the 4 new findings
│     │
│     ├─ 2x Dashboard Discussions (if security team needed)
│     │
│     └─ Total Comments by System: 7

═══════════════════════════════════════════════════════

SUMMARY:
  Findings Count: 22 + 21 + 25 = 68 (cumulative)
  Comments Count: 3 + 2 + 7 = 12 (across commits)
  
  ✓ This is HEALTHY ratio (not 88!)
  ✓ Comments track changes, not all findings
  ✓ Dashboard tracks full history
```

---

## 5️⃣ Status Flow per Finding Group

```
Finding Group: FP_SQL_001 (SQLi vulnerability)

Timeline Across PR Commits:

Commit 1:
├─ Finding f_001 (groupId=fg_001)
│  ├─ Status: OPEN (new finding)
│  ├─ Active: true
│  ├─ Comments: [Inline PR comment, PR summary]
│  ├─ AI Verification: MALICIOUS (confidence 95%)
│  └─ Action: Developer to fix

Commit 2 (developer starts fixing):
├─ Previous f_001: Mark active=false (superseded)
│
├─ Finding f_002 (groupId=fg_001)  ← SAME GROUP
│  ├─ Status: OPEN (inherited? or reset?)
│  │  ⚠️ BUG HERE: Currently reset to OPEN
│  │  ✓ Should inherit: OPEN
│  │
│  ├─ Active: true
│  ├─ Code change: Different line number
│  ├─ Comments: Previous comment still linked
│  ├─ AI Verification: MALICIOUS (confidence 95%)
│  └─ Action: Dev working on fix

Commit 3 (developer fixes it):
├─ Previous f_002: Mark active=false (resolved)
│  └─ Status: FIXED ✓
│
├─ No Finding f_003
│  └─ Finding deleted/inactive, not found in new scan
│
└─ Result: Finding group fg_001 has:
   - 3 finding records (all inactive except last if found again)
   - Status history: OPEN → FIXED
   - Comments: All linked to finding_group, not specific finding
   - AI History: 3 verification records
```

---

## 6️⃣ The 88 Problem: Root Cause Visualization

```
Current (BROKEN) Dedup Logic:

SCAN X.1 (Manual on branch feature/auth)
├─ Semgrep input: 12 findings
├─ Query: WHERE scanId='scan_manual_1' AND scanner='semgrep'
│         ↓ Result: 0 (no findings from THIS scan yet)
├─ Action: Create 12 findings
└─ Total: 12 active, scanId='scan_manual_1'

SCAN X.2 (Gitleaks on branch feature/auth, SAME SCAN)
├─ Gitleaks input: 5 findings
├─ Query: WHERE scanId='scan_manual_1' AND scanner='gitleaks'
│         ↓ Result: 0 (no gitleaks from this scan yet)
├─ Action: Create 5 findings
└─ Total: 17 active for this scan

SCAN Y.1 (CI/CD on branch feature/auth) ← DIFFERENT SCAN
├─ Semgrep input: 16 findings
├─ Query: WHERE scanId='scan_cicd_1' AND scanner='semgrep'
│         ↓ Result: 0 (NO! Should find 12 from manual scan!)
│         ↓ BUG: Query looks for THIS scan, not previous scans!
├─ Action: Create 16 findings (should dedup vs manual!)
└─ Total in DB: 17 (manual) + 16 (CI/CD) = 33

If Semgrep runs TWICE in manual scan:
  SCAN X.1 attempt 2:
  ├─ Query: WHERE scanId='scan_manual_1' AND scanner='semgrep'
  │         ↓ Result: 12 (finds the 12 we just created!)
  ├─ Action: Dedup, mark old 12 as inactive, create 0 new
  └─ No change to count

If Gitleaks runs TWICE in CI/CD scan:
  Similar: 16 stays same (deduplicated within scan)

Still doesn't equal 88...

UNLESS: Multiple scan OBJECTS created (not just rerun same scan)

If you have:
  Main branch scans: 10 findings
  Feature branch scans: Manual 22 + CI/CD 16 = 38
  
  And UI queries: "ALL findings" without branch filter
  Count: 10 + 38 = 48 (not 88)

If scans triggered 2x each:
  Main: 10 × 2 = 20
  Feature: (22 + 16) × 2 = 76
  Total: 96 (too high)

If query includes inactive findings:
  All versions: 10 + (22+22) + (16+16) = 86 ≈ 88! ✓

═════════════════════════════════════════════════════════════

THE ACTUAL BUG:
1. Query should EXCLUDE current scanId
2. Query should include branch filter
3. Query should only return active=true
4. Comments should track by fingerprint, not finding record
```

---

## 🎯 Quick Reference: Where to Comment?

```
╔════════════════════════════════════════════════════════════╗
║ Finding Type        │ Where?           │ Why?              ║
╠════════════════════════════════════════════════════════════╣
║ New Critical        │ Inline + Summary │ Needs immediate   ║
║                     │ + Dashboard      │ action            ║
╟────────────────────────────────────────────────────────────╢
║ New High            │ Inline + Summary │ Should fix        ║
║                     │                  │ in this PR        ║
╟────────────────────────────────────────────────────────────╢
║ New Medium          │ Summary only     │ Not urgent        ║
╟────────────────────────────────────────────────────────────╢
║ Persistent Critical │ Dashboard only   │ Already known     ║
║                     │ (if new status)  │ issue             ║
╟────────────────────────────────────────────────────────────╢
║ Persistent High     │ Dashboard link   │ Track, don't      ║
║                     │ in summary       │ spam inline       ║
╟────────────────────────────────────────────────────────────╢
║ Resolved / Fixed    │ Inline update    │ Celebrate!        ║
║                     │ (add ✅)         │ Show progress     ║
╚════════════════════════════════════════════════════════════╝
```

