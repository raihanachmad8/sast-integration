# 🌳 Scope Branching, PR Scan, & Comment Placement Flow

## 📍 Gambaran Umum: Main → PR → Commits

```
TIME →
═════════════════════════════════════════════════════════════════════

MAIN BRANCH
│
├─ Commit A (SHA: abc123)
│  └─ SCAN A.1 (manual or CI/CD)
│     └─ Findings: 20 active (persisted)
│
│  └─ Commit B (SHA: def456) ← NEW commit dari developer
│     └─ SCAN B.1 (CI/CD)
│        └─ Findings: 18 (2 resolved dari A)
│
├─ PULL REQUEST: feature/auth (dari branch)
│  │
│  ├─ HEAD: Commit X (SHA: ghi789) 
│  │  └─ SCAN X.1 (CI/CD on PR)
│  │     └─ Findings: 22 new + 5 old
│  │        ↓
│  │     Dedup vs MAIN:
│  │        - 20 from main still exist? YES → PERSISTENT
│  │        - 2 from main gone? → MARKED FIXED
│  │        - 2 new findings in PR? → NEW
│  │
│  ├─ Developer fixes one issue
│  │  └─ Commit X+1 (SHA: jkl012)
│  │     └─ SCAN X+1.1 (CI/CD on updated PR)
│  │        └─ Findings: 21 (1 less)
│  │           ↓
│  │        Dedup vs PR Commit X:
│  │           - Previous 22 findings, now 21 → 1 resolved
│  │           - Same fingerprints → PERSISTENT or RESOLVED
│  │           - New file scanned → POTENTIALLY NEW
│  │
│  └─ Developer adds new file with issues
│     └─ Commit X+2 (SHA: mno345)
│        └─ SCAN X+2.1 (CI/CD on updated PR)
│           └─ Findings: 25 (4 new from new file)
│              ↓
│           Dedup vs PR Commit X+1:
│              - Previous 21, now 25 → 4 added
│              - Same fingerprints → PERSISTENT
│              - New fingerprints from new file → NEW

═════════════════════════════════════════════════════════════════════
```

---

## 🎯 Deduplication Scope: Di Mana Terjadi?

### **Scope 1: WITHIN SAME SCAN (Per-Scanner)**

```
SCAN X.1 (CI/CD) pada PR Commit X
├─ Parser 1: Semgrep → 12 findings
│  ├─ Input: 12 findings
│  ├─ Query previous (same scan): 0 (first time)
│  └─ Create: 12 findings
│
├─ Parser 2: Gitleaks → 5 findings
│  ├─ Input: 5 findings
│  ├─ Query previous (same scan): 0 (different scanner)
│  └─ Create: 5 findings
│
└─ Parser 3: Flawfinder → 5 findings
   ├─ Input: 5 findings
   ├─ Query previous (same scan): 0 (different scanner)
   └─ Create: 5 findings

Result: 22 findings created (no dedup, different scanners)
```

### **Scope 2: ACROSS SCANS (Same Branch)**

```
Timeline:
  Commit X → SCAN X.1 → 22 findings created (active=true)
  Commit X+1 → SCAN X+1.1 → Incoming 21 findings
  
  Process Semgrep part:
    ├─ Query: active=true, repositoryId=repo, scanner='semgrep', 
    │          excludeScanId='scan_x1'
    │  ↓
    │  Result: 12 findings from SCAN X.1 (Semgrep)
    │
    ├─ Incoming: 12 findings (same fingerprints)
    │  ↓
    │  Match: Fingerprint by fingerprint
    │    - FP_SQL_1: Found in previous → MARK PREVIOUS AS INACTIVE (superseded)
    │    - FP_SQL_2: Found in previous → MARK PREVIOUS AS INACTIVE (superseded)
    │    - ... (10 more matches)
    │    - FP_NEW_1: NOT in previous → CREATE NEW
    │    - FP_NEW_2: NOT in previous → CREATE NEW
    │
    └─ Result: 10 persistent, 2 new → 12 total active for Semgrep
```

### **Scope 3: ACROSS BRANCHES (Main vs PR)**

```
⚠️ IMPORTANT: Dedup DOES NOT cross branch boundaries!

Main Branch:
  └─ 20 findings (active=true)

PR Branch:
  └─ SCAN P.1 incoming 22 findings
     └─ Query: active=true, repositoryId=repo, scanner='semgrep'
        ↓
        Result: 0 (different branch!)
        
     ├─ Reason: Query filters by repositoryId only
     ├─ Does NOT filter by branch
     ├─ But findings have branch metadata
     └─ So if findings tied to scans → scans have branches
        
  Current Logic:
    └─ Looks for active findings from ANY branch (wrong?)
    └─ Should look only from SAME branch (right)
    
  Result: Potential cross-branch false dedup!
```

---

## 📌 Comment Placement Strategy

### **WHEN Comment Should Be Created**

```
Timeline with Comment Points:

Commit X (SHA: abc123)
├─ SCAN X.1 (CI/CD)
│  ├─ Finding F1: SQLi at line 50 [SEVERITY: high]
│  │  └─ Comment Point 1: On PR (if exists)
│  │     └─ "🔍 SAST found SQLi at /auth.js:50"
│  │     └─ Link to finding details
│  │     └─ Assignable to developer
│  │
│  └─ Finding F2: Hardcoded secret at line 100 [SEVERITY: critical]
│     └─ Comment Point 2: On PR Thread
│        └─ "🔴 CRITICAL: Hardcoded secret"
│        └─ Mark for immediate fix
│
Commit X+1 (Developer fixes F1)
├─ SCAN X+1.1 (CI/CD)
│  ├─ F1 Status: FIXED/RESOLVED
│  │  └─ Comment Update: ✅ "This issue was resolved in commit SHA..."
│  │  └─ Moved to "Resolved" section
│  │
│  └─ F2 Still Found
│     └─ Comment Update: ⏰ "Still present, please fix"
│     └─ Escalate if not fixed
```

---

## 🏗️ Comment Architecture: 3 Options

### **OPTION A: Dashboard-Only Comments (❌ Not Recommended)**

```
Where: SAST Dashboard / Finding Details Page

Pros:
  ✓ Centralized view
  ✓ Organized by finding
  ✓ Full history preserved

Cons:
  ✗ Developer must open SAST dashboard
  ✗ No PR notification
  ✗ Discussion scattered across tools
```

### **OPTION B: PR Inline Comments (✅ RECOMMENDED)**

```
Where: GitHub PR → Files Changed → Line numbers

Comment Structure:
┌─────────────────────────────────────────────┐
│ 🔴 SAST Finding: SQLi Vulnerability        │
├─────────────────────────────────────────────┤
│ Line 50: String concatenation in SQL query  │
│                                             │
│ Rule: semgrep/sql-injection                 │
│ Severity: HIGH                              │
│ Fingerprint: fp_sql_1a2b3c                  │
│                                             │
│ Code:                                       │
│  47  query = "SELECT * FROM users WHERE... │
│  48  id = " + userId  ← UNSAFE              │
│                                             │
│ Fix: Use prepared statements                │
│                                             │
│ [View Details] [Mark False Positive]        │
│ [Link to Finding Group] [Dismiss]           │
└─────────────────────────────────────────────┘

Pros:
  ✓ Right at the code
  ✓ Developer sees while reviewing
  ✓ PR notifications work
  ✓ GitHub discussion native

Cons:
  ✗ Can be noisy if many findings
  ✗ Hard to track across commits
  ✗ Comments may become stale
```

### **OPTION C: PR Review Comment + Dashboard (✅ BEST PRACTICE)**

```
Where: Both PR + Dashboard

PR Comment (Summary):
┌─────────────────────────────────────────────┐
│ SAST Scan Results                           │
├─────────────────────────────────────────────┤
│ 📊 Total Findings: 22                       │
│   🔴 Critical: 2  (must fix)                │
│   🟠 High: 8     (should fix)               │
│   🟡 Medium: 12  (review)                   │
│                                             │
│ Changes since last commit:                  │
│   ✅ Fixed: 1 (SQLi at auth.js:50)          │
│   ⚠️  New: 2 (hardcoded secrets)             │
│   📌 Persistent: 19                         │
│                                             │
│ [View Full Report] [Review on Dashboard]    │
│ [Previous Scan Diff]                        │
└─────────────────────────────────────────────┘

Inline Comments (Critical Only):
  └─ Only post inline for:
     ├─ 🔴 CRITICAL findings
     ├─ 🟠 Newly introduced security issues
     └─ Findings changed from previous scan

Dashboard (Deep Dive):
  └─ All findings with:
     ├─ Discussion threads
     ├─ False positive marking
     ├─ Historical tracking
     ├─ Remediation status
     └─ AI verification details
```

---

## 📋 Comment Lifecycle: Across Commits

### **Scenario: 3 Commits dalam 1 PR**

```
PR: feature/auth

COMMIT 1 (X): Initial scan
└─ SCAN X.1 findings: 22
   ├─ SQLi at auth.js:50 (F1)
   ├─ Hardcoded secret at config.js:10 (F2)
   └─ ... 20 more
   
   Comment on PR:
   "🔴 22 findings detected
    - Critical: 2 issues need immediate fix
    - View: [link to dashboard]"

COMMIT 2 (X+1): Developer fixes F1 (SQLi)
└─ SCAN X+1.1 findings: 21
   ├─ F1 Status: FIXED (marked inactive)
   ├─ F2 Still present (PERSISTENT)
   └─ ... 20 others (PERSISTENT)
   
   Comment Update on PR:
   "✅ SQLi at auth.js:50 - FIXED in this commit!
    ⏰ Hardcoded secret at config.js:10 - Still present
    
    Updated findings: 21 (was 22)
    - Critical: 1 (was 2) ✓"

COMMIT 3 (X+2): Developer adds new file with issues
└─ SCAN X+2.1 findings: 25
   ├─ F2 Still present (PERSISTENT)
   ├─ New file findings (NEW, 4 from new file)
   └─ ... 20 others (PERSISTENT)
   
   Comment Update on PR:
   "⚠️ New findings detected in new file:
    - 4 new issues added
    
    Current status: 25 findings
    - Fixed since commit 1: 1 ✓
    - New since commit 1: 2
    - Persistent: 22"
```

---

## 🎯 BEST PRACTICE: Recommendation untuk Project Anda

### **Struktur Optimal**

```
1. AUTOMATED PR COMMENT (Posted by SAST CI/CD)
   ├─ Trigger: Setiap kali SCAN baru di PR
   ├─ Content: Summary (critical + new only)
   ├─ Action: Link ke dashboard untuk detail
   └─ Update: Replace previous comment (don't accumulate)

2. INLINE COMMENTS (Only for Critical/New)
   ├─ Trigger: Critical severity OR first-time detection
   ├─ Content: Brief explanation + link to full finding
   ├─ Dismiss-able: Developer bisa mark false positive
   └─ Persist: Through all commits (tie to fingerprint)

3. DASHBOARD DISCUSSION THREADS
   ├─ Trigger: Manual or finding status change
   ├─ Content: Full context, remediation, decisions
   ├─ Participants: Security + Dev team
   └─ History: Complete audit trail

4. FINDING GROUP HISTORY
   ├─ Shows: Every scan, every status change
   ├─ Shows: Comments, decisions, false positives
   ├─ Linked: To commits, PRs, branches
   └─ Queryable: For metrics, SLA tracking
```

---

## 🔄 Current Logic vs Recommended

### **Current (In Code)**

```typescript
// finding.service.ts L28-84: replaceFindingsForScanJob

await db.transaction(async (tx) => {
  // 1. Dedup within scan (per parser)
  const seenFingerprints = new Map();  // ← Dedup within this batch
  
  // 2. Find/create groups (global fingerprint lookup)
  const groupMap = await findingRepository.findOrCreateFindingGroups(...);
  
  // 3. Insert new findings (ALL as active=true)
  const created = await findingRepository.createMany(findingsToInsert, tx);
  
  return { new: created.length, persistent: 0, resolved: 0 };
});

// ⚠️ ISSUE: persistent=0 and resolved=0 always!
// ⚠️ REASON: No cross-scan dedup query
// ⚠️ RESULT: Every scan creates all findings as "new"
```

### **Recommended (After Fix)**

```typescript
// finding.service.ts (FIXED)

await db.transaction(async (tx) => {
  // 1. Dedup within scan
  const seenFingerprints = new Map();
  
  // 2. Find/create groups
  const groupMap = await findingRepository.findOrCreateFindingGroups(...);
  
  // 3. ✅ NEW: Query previous findings from same repo+scanner
  const previousActiveFindings = await findingRepository
    .listActiveFindingsByRepositoryAndScanner(
      repositoryId,
      scannerName,
      scanId  // ← EXCLUDE current scan
    );
  
  const previousMap = new Map(
    previousActiveFindings.map(f => [f.fingerprint, f.id])
  );
  
  // 4. Classify findings
  const persistent = [];
  const newFindings = [];
  const resolved = [];
  
  for (const [fingerprint, input] of seenFingerprints) {
    if (previousMap.has(fingerprint)) {
      persistent.push({ fingerprint, input });
    } else {
      newFindings.push({ fingerprint, input });
    }
  }
  
  for (const [fingerprint, id] of previousMap) {
    if (!seenFingerprints.has(fingerprint)) {
      resolved.push(id);
    }
  }
  
  // 5. ✅ Mark old findings as inactive
  if (resolved.length > 0) {
    await findingRepository.updateMany(
      resolved.map(id => ({ id, active: false, status: 'fixed' })),
      tx
    );
  }
  
  // 6. Insert new + persistent findings
  const created = await findingRepository.createMany(newFindings, tx);
  
  return { 
    new: newFindings.length, 
    persistent: persistent.length,  // ← NOW ACCURATE!
    resolved: resolved.length,       // ← NOW ACCURATE!
    findings: created 
  };
});
```

---

## 📊 Comment Count & Activity Matrix

### **For Your Use Case (3 scanners, 2 scans per PR)**

```
Commit X:
├─ SCAN X.1: 22 findings
│  ├─ 1 PR Summary Comment (auto-posted)
│  ├─ 2 Inline Comments (critical only)
│  ├─ 0 Discussion threads (auto)
│  └─ Subtotal: 3 comments from system
│
├─ Developer reaction: 1-2 comments ("on it" / "reviewed")
└─ Commit X Total: ~5 comments

Commit X+1:
├─ SCAN X+1.1: 21 findings (1 fixed)
│  ├─ 1 PR Summary Comment (REPLACE previous)
│  ├─ 1 Inline Comment update (for fixed finding: ✅)
│  ├─ 1 Dashboard discussion (optional: how was F1 fixed?)
│  └─ Subtotal: 3 comments from system
│
├─ Developer reaction: 1 comment ("fixed the SQLi")
└─ Commit X+1 Total: ~4 comments

Commit X+2:
├─ SCAN X+2.1: 25 findings (4 new from new file)
│  ├─ 1 PR Summary Comment (REPLACE previous)
│  ├─ 4 Inline Comments (new critical findings)
│  ├─ 2 Discussion threads (if critical)
│  └─ Subtotal: 7 comments from system
│
├─ Developer reaction: 2-3 comments
└─ Commit X+2 Total: ~10 comments

═════════════════════════════════════════════
Total PR Lifetime: ~19 comments (NOT 88!)
```

---

## ✅ Checklist: Where Should Comment Appear?

### **Per Finding Type**

| Finding Type | Inline Comment? | Dashboard Thread? | PR Summary? | Notes |
|---|---|---|---|---|
| New Critical | ✅ Yes | ✅ Yes | ✅ Highlighted | Immediate attention needed |
| New High | ✅ Yes | ❓ Optional | ✅ Listed | Should fix in PR |
| New Medium/Low | ❌ No | ❌ No | ✅ Counted | Can be fixed later |
| Persistent Critical | ❌ No | ✅ If discussing | ✅ Tracked | Keep tracking until fixed |
| Persistent High | ❌ No | ❌ No | ✅ Tracked | Inherited from main |
| Resolved | ✅ Update (✅) | ❓ Mark closed | ✅ Highlighted | Celebrate fix! |
| False Positive | ❌ Remove inline | ✅ Documented | ✅ Excluded | Won't recheck |

---

## 🎓 Summary: Untuk PR Anda

```
Branch main:
  └─ Commit A (abc123)
     └─ 20 findings (scanned yesterday)

PR feature/auth:
  └─ Commit X (ghi789)
     └─ SCAN: 22 findings
        ├─ 20 inherited from main (PERSISTENT)
        ├─ 2 new from branch changes (NEW)
        └─ PR Comment: "22 findings (2 new, 20 from main)"
           + 2 inline comments for new critical
  
  └─ Commit X+1 (jkl012) - fixes 1 issue
     └─ SCAN: 21 findings
        ├─ 19 inherited (still PERSISTENT)
        ├─ 1 newly found (NEW in X+1)
        ├─ 1 fixed from X
        ├─ 1 inherited but now fixed from main
        └─ PR Comment UPDATE: "21 findings (1 fixed ✅, 1 new ⚠️)"
           + inline comment shows: ✅ Previous SQLi fixed
```

**Tempat paling OK untuk comment:**
1. ✅ PR Summary (auto-post, high-level)
2. ✅ Inline critical only (at the code)
3. ✅ Dashboard threads (for discussion/decision)
4. ❌ Don't: Comment di setiap finding (too noisy)

```

