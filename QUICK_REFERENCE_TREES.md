# Quick Reference: Decision Trees

## Pertanyaan Anda: "Gimana Jika Ada Commit Baru?"

### Tree 1: Deduplication Decision pada Setiap Scan

```
SCAN DIMULAI
│
├─ Fingerprint sudah ada di project?
│  │
│  ├─ YA: Cek previous active findings (same project + scanner)
│  │  │
│  │  ├─ Ada findings dengan fingerprint sama?
│  │  │  │
│  │  │  ├─ YA: Mark OLD as "superseded"
│  │  │  │      Insert NEW finding (active=true)
│  │  │  │      → AI Verification: ❌ SKIP
│  │  │  │      (Already analyzed before)
│  │  │  │
│  │  │  └─ TIDAK: Insert NEW finding
│  │  │            → AI Verification: ✅ QUEUE
│  │  │            (First time seeing this)
│  │  │
│  │  └─ Ada findings yang tidak di incoming list?
│  │     Mark OLD as "resolved" (fixed)
│  │     Status: "fixed"
│  │
│  └─ TIDAK: Insert NEW finding
│           → AI Verification: ✅ QUEUE
│
└─ DONE
```

---

### Tree 2: PR dengan 3 Commit

```
PR #1: feature/auth → main (3 commits baru)

Step 1: Scan FINAL (commit #3)
┌─────────────────────────────────────────┐
│ Parse findings from commit #3 scan       │
│ Found: [SQL-1, XSS-1, Auth-1, CORS-1]   │
│ Fingerprints: {fp_sql, fp_xss, fp_auth, fp_cors}
└──────────┬──────────────────────────────┘
           │
           ▼
Step 2: Dedup Logic (per scanner)
┌─────────────────────────────────────────┐
│ Previous findings on feature/auth?       │
│ - No previous scan on this branch       │
│ So all 4 findings are NEW (active=true) │
│                                         │
│ AI Verification: ✅ Queue all 4        │
│ (Since never verified before)           │
└──────────┬──────────────────────────────┘
           │
           ▼
Step 3: Quality Gate (PR context)
┌─────────────────────────────────────────┐
│ Call diffNewFindings(                    │
│   head='feature/auth',                  │
│   base='main'                           │
│ )                                       │
│                                         │
│ Last scan on main: [Auth-1, CORS-1]    │
│ Fingerprints on base: {fp_auth, fp_cors}
│                                         │
│ New findings (head - base):             │
│ {fp_sql, fp_xss} = [SQL-1, XSS-1]      │
│                                         │
│ Fixed findings (base - head):           │
│ {} = []                                 │
│ (because fp_auth, fp_cors still exist) │
└──────────┬──────────────────────────────┘
           │
           ▼
Step 4: Gate Evaluation
┌─────────────────────────────────────────┐
│ NEW: [SQL-1 (HIGH, TP), XSS-1 (HIGH, TP)]
│ FIXED: []                               │
│ PENDING: 2                              │
│                                         │
│ Config: failOnHighTp=true              │
│ → FAIL (2 new HIGH TP)                  │
└──────────┬──────────────────────────────┘
           │
           ▼
Step 5: Post PR Comment & Status
┌─────────────────────────────────────────┐
│ Comment: "2 new blocking findings"      │
│ Status: ❌ FAIL                         │
└─────────────────────────────────────────┘

CRITICAL POINT:
- Commits #1 & #2 TIDAK di-scan individually
- Only final state (commit #3) matters for gate
- Gate doesn't care which commit introduced SQL-1
```

---

### Tree 3: Manual Scan dengan Lama Tidak Scan

```
Timeline:
Commit A [main] - Scan 1 (1 month ago)
  Found: [SQL-1, Auth-1, CORS-1]
  Fingerprints: {fp_sql, fp_auth, fp_cors}
  AI Verified: ✅ (all 3)

(1 month passes, no scans)

(Developer makes changes)
Commit B [main]
Commit C [main]
Commit D [main] - Scan 2 (TODAY)
  Scanner found: [SQL-1*, Auth-1, XSS-1]
  (*line number changed: SQL-1 was line 50, now line 75)
  Fingerprints: {fp_sql_75, fp_auth, fp_xss}

Processing Scan 2:
┌──────────────────────────────────────────────┐
│ Step A: Previous findings (Scan 1)            │
│ - f_001 (fp_sql_50, active=true)             │
│ - f_002 (fp_auth, active=true)               │
│ - f_003 (fp_cors, active=true)               │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ Step B: Incoming findings (Scan 2)            │
│ - SQL-1 at line 75 → fp_sql_75 (DIFFERENT!) │
│ - Auth-1 at line ?? → fp_auth (SAME)         │
│ - XSS-1 → fp_xss (NEW)                       │
│                                              │
│ Missing: fp_cors (was in Scan 1)             │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ Step C: Dedup Decision                       │
│                                              │
│ fp_sql_75:                                   │
│   - Not in previous findings                │
│   - Insert NEW finding                       │
│   - AI Verification: ✅ QUEUE                │
│   - (Different location = different issue) │
│                                              │
│ fp_auth:                                     │
│   - Found in previous (f_002)                │
│   - Mark f_002 as "superseded"              │
│   - Insert NEW finding (f_004)              │
│   - AI Verification: ❌ SKIP                 │
│   - (Same fingerprint = persistent)         │
│                                              │
│ fp_xss:                                      │
│   - New fingerprint                          │
│   - Insert NEW finding                       │
│   - AI Verification: ✅ QUEUE                │
│                                              │
│ fp_cors:                                     │
│   - Not in incoming                          │
│   - Mark f_003 as "resolved"                │
│   - Status: "fixed"                          │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ RESULT:                                      │
│ - new: 2 (SQL-1 moved, XSS-1)               │
│ - persistent: 1 (Auth-1 same location)      │
│ - resolved: 1 (CORS-1 fixed/removed)        │
│                                              │
│ Dashboard:                                   │
│ ✅ SQL-1 (75) — NEW, pending AI review     │
│ ✅ Auth-1 — PERSISTENT, verdict inherited  │
│ ✅ XSS-1 — NEW, pending AI review          │
│ ✅ CORS-1 — FIXED                           │
└──────────────────────────────────────────────┘
```

---

### Tree 4: What If? Scenarios

#### Scenario: Developer Marks FP, But Scanner Finds Again

```
Timeline:
Scan 1: Finding SQL-1 found
  → f_001 created, AI verified: TP
  
Scan 2: Developer marks f_001 as "false_positive"
  (In UI, status changed)
  
Scan 3: Scanner finds SQL-1 AGAIN (same code still vulnerable!)

Processing:
  f_001: status='false_positive', groupId=fg_sql
  
  New finding: fp_sql (same fingerprint)
  
  Dedup logic:
  - fp_sql found in previous
  - Mark f_001 as "superseded"
  - Insert NEW f_002 (active=true)
  
  Question: Should f_002 inherit "false_positive" status?
  Answer: NO! It's a new finding
  
  f_002: status='open' (default)
         groupId=fg_sql (same group)
         verdict='pending' (will be AI verified)
  
  ⚠️ This means:
  - User marked as FP
  - But new scan treats it as NEW finding
  - Will be AI verified again
  - If AI says TP, user must review again
```

#### Scenario: Same Fingerprint But Different Scanner

```
Scan 1 (Semgrep):
  - SQL-1 found by Semgrep
  - f_001 created, groupId=fg_sql

Scan 2 (CodeQL):
  - SQL-1 found by CodeQL (same file, line, issue)
  - fp_sql (same fingerprint)

Processing:
  Dedup is PER SCANNER:
  - Previous findings: Only look at Semgrep findings
  - CodeQL findings are treated SEPARATELY
  
  → f_002 created (CodeQL version)
  → Both f_001 and f_002 point to SAME groupId=fg_sql
  
  Finding Group (fg_sql):
    ├─ f_001 (Semgrep)
    ├─ f_002 (CodeQL)
    └─ Both are active=true
  
  UI shows: "2 findings, same issue detected by 2 scanners"
  AI verification: Both queued (or skip if already verified)
```

#### Scenario: PR Review Then New Push

```
PR #1 opened: feature/auth → main
  Commit A (Scanned): [SQL-1, XSS-1]
  Gate: ❌ FAILED
  PR Comments posted
  
Developer pushes fix:
  Commit B (Scanned): [XSS-1] (SQL-1 removed)
  
Processing Scan 2:
  Previous (on feature/auth): [SQL-1, XSS-1]
  New incoming: [XSS-1]
  
  Dedup logic:
  - XSS-1: Mark old as superseded, insert new
  - SQL-1: NOT in incoming, mark as resolved (fixed)
  
  Quality Gate:
  - diffNewFindings(): {} (no new issues beyond base)
  - diffFixedFindings(): {} (nothing fixed vs base)
  
  Gate: ✅ PASSED
  
  But wait... what about the OLD PR comments?
  - GitHub will keep the comments from first review
  - New comments should be posted if there are new findings
  - Use dedup by scan ID to avoid duplicate comments
```

---

## Summary Matrix: When Does AI Get Called Again?

```
Scenario                              | Fingerprint | Previous Found? | AI Called?
─────────────────────────────────────────────────────────────────────────────
Same code, same location              | Same        | Yes            | ❌ NO
Code moved to different line          | Different   | No             | ✅ YES
New vulnerability                     | New         | No             | ✅ YES
Vulnerability fixed                   | Same        | Yes (missing)  | ❌ NO
User marked FP, code still vuln       | Same        | Yes (FP status)| ✅ YES
Same issue found by 2 scanners        | Same        | Yes (1st scan) | ⚠️ Depends*
Re-scan same commit                   | Same        | Yes            | ❌ NO
─────────────────────────────────────────────────────────────────────────────

* 2nd scanner: YES (first time CodeQL sees it)
  1st scanner: NO (already verified)
```

---

## Key Takeaway: How It Differs From SonarQube

**SonarQube**: Compares entire project state, updates historical view

**Your App**: 
1. Tracks individual scans (with timeline)
2. Deduplicates per scanner (not globally)
3. AI-verifies new/modified findings only
4. Preserves previous verdicts for persistent issues
5. More granular (fingerprint includes line number)

**Result**: 
- ✅ Better for continuous monitoring
- ✅ AI integration is native
- ⚠️ Code movement = new issue (might want to soften?)
- ⚠️ No cross-scan comparison in UI (yet)
