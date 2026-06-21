# SonarQube vs SAST Integration — Detailed Analysis

## 🎯 Executive Summary

Aplikasi Anda **BERBEDA FUNDAMENTAL** dari SonarQube dalam hal penanganan branches, commits, dan deduplication:

| Aspek | SonarQube | Aplikasi Anda | Winner |
|-------|-----------|---------------|--------|
| **Branching** | Per-branch project | Per-repository, multi-branch native | 🏆 App |
| **PR Analysis** | Fingerprint-based diff (new findings) | Fingerprint-based diff + AI verify | 🏆 App |
| **Deduplication** | Issue Key (rule+file+line) | Fingerprint (SHA256) | 🏆 Same |
| **Commit History** | Stored implicitly | Per-scan tracking | 🏆 App |
| **AI Verification** | Manual or 3rd party | Native QLoRA + voting | 🏆 App |
| **Re-scan Behavior** | Clean or incremental | Smart dedup + AI re-analyze | 🏆 App |

---

## 📊 Architecture Comparison

### SonarQube Flow

```
┌─────────────────────────────────────────┐
│ Developer push to main                   │
│ OR manual trigger                        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ SonarScanner runs (single project)       │
│ - Scans entire branch                    │
│ - Computes issue keys (fingerprints)     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Compare vs PREVIOUS scan on same branch  │
│ - New issues (not in prev)               │
│ - Resolved issues (in prev, not now)     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Quality Gate (if PR):                    │
│ - Count NEW issues only                  │
│ - Fail if new HIGH/CRITICAL              │
│ - Post PR comment (dedup by project ID)  │
└─────────────────────────────────────────┘
```

### Aplikasi Anda Flow

```
┌─────────────────────────────────────────────────────────┐
│ Developer push to branch OR create PR                    │
│ - Webhook triggered (GitHub/GitLab/Gitea)              │
│ - Manual scan triggered                                 │
│ - CI/CD pipeline scan                                   │
└──────────────┬────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│ Create Scan Record                                       │
│ - scan.branch = 'feature/X' or 'main'                   │
│ - scan.prNumber = 123 (if from PR webhook)              │
│ - scan.baseBranch = 'main' (if PR)                      │
│ - scan.headBranch = 'feature/X' (if PR)                 │
└──────────────┬────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│ Run ALL Scanners in Parallel                            │
│ - Semgrep, Gitleaks, Flawfinder, Cppcheck, etc.         │
│ - Each scanner produces raw output                      │
└──────────────┬────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│ Parse & Deduplicate (Per Scanner)                       │
│                                                         │
│  For each finding:                                      │
│  1. Compute fingerprint (SHA256)                        │
│     fingerprint = SHA256(rule || file || line || msg)   │
│                                                         │
│  2. Find or create finding_group by fingerprint         │
│     (handles previous findings on OTHER branches)       │
│                                                         │
│  3. Mark old findings as inactive:                      │
│     - Same fingerprint = "superseded"                   │
│     - Missing fingerprint = "resolved"                  │
│                                                         │
│  4. Insert new findings as active                       │
│                                                         │
│  5. Enqueue AI verification jobs                        │
└──────────────┬────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│ AI Verification (Background Job)                        │
│                                                         │
│ For each finding (Verdict = Pending):                   │
│ - Query first available AI model                        │
│ - Send finding to LLM (Qwen2.5-Coder-SVA or Llama3)     │
│ - Receive: TP/FP + confidence + data flow + CWE         │
│ - Store in ai_verifications table                       │
│ - Update finding verdict field                          │
└──────────────┬────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│ Quality Gate Evaluation                                 │
│                                                         │
│ IF PR (head vs base branch):                           │
│ - Use diffNewFindings() → fingerprints NOT in base      │
│ - Use diffFixedFindings() → fingerprints NOT in head    │
│ - Count: new findings, fixed findings                   │
│ - Status = PASSED/FAILED/WARNING                        │
│                                                         │
│ IF Regular Scan (no PR):                               │
│ - Count all findings by severity                        │
│ - Status = PASSED/FAILED/WARNING                        │
└──────────────┬────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│ Post Results                                            │
│                                                         │
│ IF PR:                                                  │
│ - Post PR comment with new findings (dedup by scan ID)  │
│ - Post inline review comments per finding line          │
│ - Post commit status (✓ pass / ✗ fail)                  │
│                                                         │
│ IF Regular:                                             │
│ - Update dashboard                                      │
│ - Store timeline event                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🔀 Branch & Commit Handling

### Scenario 1: Regular Scan on Main Branch

```
Timeline:
  Commit A [main] (old scan 1 month ago)
          └─ Findings: [SQL-Inject-1, XSS-2]
                    
  Commit B [main] (TODAY - new scan)
          └─ Run scanner → 3 findings: [SQL-Inject-1, Auth-3, XSS-4]

Deduplication Logic:
  ┌─────────────────────────────────────────┐
  │ New Fingerprints in Commit B:            │
  │ - fp1 = SHA256("SQL Inject rule || ..") │
  │ - fp3 = SHA256("Auth rule || ..")       │
  │ - fp4 = SHA256("XSS rule || ..")        │
  └─────────────────────────────────────────┘
         │
         ▼
  ┌─────────────────────────────────────────┐
  │ Previous Active Findings (same scanner): │
  │ From Commit A (1 month ago):             │
  │ - fp1 (SQL-Inject-1) ← SAME             │
  │ - fp2 (XSS-2) ← MISSING                 │
  └─────────────────────────────────────────┘
         │
         ▼
  ┌─────────────────────────────────────────┐
  │ Result:                                  │
  │ - fp1: Mark OLD as "superseded"         │
  │        Insert NEW with active=true      │
  │        (NOT AI verified again)          │
  │                                         │
  │ - fp2: Mark OLD as "resolved" (fixed)   │
  │        Status = "fixed"                 │
  │                                         │
  │ - fp3: Insert NEW finding               │
  │        Enqueue AI verification job      │
  │                                         │
  │ - fp4: Insert NEW finding               │
  │        Enqueue AI verification job      │
  │                                         │
  │ Result Counts:                          │
  │ - new: 2        (fp3, fp4)              │
  │ - persistent: 1 (fp1 - superseded)      │
  │ - resolved: 1   (fp2 - fixed)           │
  └─────────────────────────────────────────┘
```

**KEY INSIGHT:** Old findings dengan fingerprint yang sama **TIDAK** di-AI-verify lagi. Mereka dianggap "persisten", hanya ditandai inactive lalu inserted baru.

---

### Scenario 2: Manual Scan with Commit History

```
Timeline:
  Commit 1 [main] - SCAN 1 (done 1 week ago)
    Findings: [SQL-1, Auth-1]
    
  Commit 2 [main] - NO SCAN
    Developer fixed SQL-1 in code
    
  Commit 3 [main] - NO SCAN
    Developer added new XSS vuln (oops)
    
  Commit 4 [main] - SCAN 2 (done TODAY)
    Run manual scan

Result in Database:
  
  Finding Group (Fingerprint) | Last Seen | Active | Superseded | Status
  ──────────────────────────────────────────────────────────────────────
  fp_sql_1                    | Commit 1  | false | true       | open/closed
  fp_sql_1 (new version)      | Commit 4  | true  | false      | open
  fp_auth_1                   | Commit 1  | false | true       | fixed
  fp_xss_1                    | Commit 4  | true  | false      | open

Notes:
- SQL-1: Old version marked superseded, new version inserted
- Auth-1: Marked as "fixed" (in old but not in new)
- XSS-1: NEW finding, will be AI verified
```

---

### Scenario 3: PR dengan Multiple Commits

```
PR #42: feature/auth-refactor → main
  
  Base Branch (main):
    Last Scan (Commit A):
      Findings: [SQL-1, Auth-1, CORS-1]
      Fingerprints: {fp_sql, fp_auth, fp_cors}
  
  Head Branch (feature/auth-refactor):
    Commit 1 (old) - merged 3 commits
    Commit 2 (middle)  
    Commit 3 (latest) - PR triggered scan
    
    Findings (Commit 3 scan):
      [SQL-1, XSS-1, Auth-2, CORS-1]
      Fingerprints: {fp_sql, fp_xss, fp_auth2, fp_cors}

Deduplication & Quality Gate:

  Step 1: Mark OLD findings (same scanner on same PR scan)
  ─────────────────────────────────────────────────────
  (none, this is first scan on this branch)
  
  
  Step 2: Quality Gate - diffNewFindings()
  ─────────────────────────────────────────────────────
  
  SELECT findings WHERE:
    - branch = 'feature/auth-refactor'  (head)
    - fingerprint NOT IN (
        SELECT fingerprint
        FROM findings
        WHERE branch = 'main' AND status = 'completed'
      )
  
  Result:
    NEW findings = [XSS-1, Auth-2]
    (fp_sql, fp_cors = already on main)
    
    
  Step 3: Quality Gate - diffFixedFindings()
  ─────────────────────────────────────────────────────
  
  SELECT findings WHERE:
    - branch = 'main'  (base)
    - fingerprint NOT IN (
        SELECT fingerprint
        FROM findings
        WHERE branch = 'feature/auth-refactor'
      )
  
  Result:
    FIXED findings = [CORS-1] ← Actually fp_cors IS in head
                                So this should be EMPTY
    
    Actually it should show if only finding removed:
    FIXED findings = [Auth-1]  ← Old fp_auth, new is fp_auth2
                                (fingerprint changed!)
                                (This is NOT a fix, it's a refactor!)
                                

  Step 4: Gate Decision
  ─────────────────────────────────────────────────────
  
  Config: failOnHighTp = true
  
  New findings with AI verdict:
    - XSS-1: TP, severity=HIGH → FAIL
    - Auth-2: FP, severity=MEDIUM → pass (FP doesn't count)
  
  Result: GATE = FAILED (due to HIGH TP)
  
  
  Step 5: PR Comment
  ─────────────────────────────────────────────────────
  
  "🔴 SAST Check Failed
  
  New findings introduced:
  - XSS-1 (HIGH, TP) — SQL injection in query builder
  - Auth-2 (MEDIUM, FP) — Mock auth header check
  
  Fixed findings:
  - Auth-1 (was HIGH) — Moved to different rule
  "
```

**CRITICAL DIFFERENCE FROM SONARQUBE:**

SonarQube would count `Auth-1 → Auth-2` as potentially the same issue if fingerprints match. Aplikasi Anda menggunakan **deterministic SHA256** dari rule+file+line+message, jadi perubahan minor = fingerprint baru!

---

## 🔁 Deduplication Deep Dive

### Fingerprint Strategy

```typescript
// finding.fingerprint.ts

fingerprint = SHA256(
  rule            ||  // "semgrep.python.sql-injection"
  file            ||  // "src/db/query.py"
  line_number     ||  // 42
  message               // "Use parameterized query" (first 180 chars)
)

// Example:
rule:     "insecure-use-string-copy"
file:     "src/main.c"
line:     100
message:  "Use strcpy() detected. Use strncpy() or strlcpy()..."

fingerprint = SHA256("insecure-use-string-copy||src/main.c||100||Use strcpy() detected...")
            = "a1b2c3d4e5f6..."

// If developer refactors but same logic:
// → Different file or line → DIFFERENT fingerprint → NEW finding group
// → Same fingerprint → SAME finding group → superseded
```

### Finding Group Behavior

```
finding_groups TABLE:
  id              | projectId | repositoryId | fingerprint | title        | firstSeenAt | lastSeenAt
  ─────────────────────────────────────────────────────────────────────────────────────────────────
  fg_001          | proj_1    | repo_1       | a1b2c3d4... | SQL Inject   | 2026-01-01  | 2026-06-20
  fg_002          | proj_1    | repo_1       | b2c3d4e5... | XSS Issue    | 2026-05-01  | 2026-06-20
  fg_003          | proj_1    | repo_1       | c3d4e5f6... | Auth Check   | 2026-06-20  | 2026-06-20

findings TABLE:
  id              | scanId | groupId | active | severity | status     | scanner  | created_at
  ──────────────────────────────────────────────────────────────────────────────────────────
  f_001           | scan_1 | fg_001  | false  | HIGH     | open       | semgrep  | 2026-01-01
  f_002           | scan_1 | fg_002  | true   | MEDIUM   | open       | semgrep  | 2026-01-01
  f_003           | scan_2 | fg_001  | true   | HIGH     | open       | semgrep  | 2026-06-20 ← NEW for same group
  f_004           | scan_2 | fg_003  | true   | HIGH     | pending    | semgrep  | 2026-06-20 ← NEW group
```

---

## 🤖 AI Verification Flow

### When Does AI Get Called?

```typescript
// parse-scan-result.job.ts

When findings are persisted:
  
  1. Query previous active findings (same project/scanner)
     → Mark as superseded or resolved
  
  2. Create NEW findings (active=true, status=open)
  
  3. For each NEW finding:
     await aiVerificationService.queueVerification({
       findingId: f.id,
       finding: { rule, filePath, lineNumber, message, codeSnippet },
       projectId,
     });
     
     // Enqueues ai-verify-finding job with:
     // - exponentialBackoff (30s, 1m, 2m, 5m, 10m)
     // - max 5 retries
```

### Key Rule: Persistent Findings = SKIP AI

```
Scan 1 (May 1):
  Finding SQL-1 (fp_sql)
    → Create: f_001, groupId=fg_sql, active=true
    → AI Verification: ✅ QUEUED
    → Result: TP, confidence=95%, verdict stored in ai_verifications

Scan 2 (June 20):  ← 50 days later
  Finding SQL-1 (same fp_sql)
    → Old f_001: active=true, superseded
    → New f_002: active=true, groupId=fg_sql
    → AI Verification: ❌ SKIP (persistent)
    
    Why skip?
    - Fingerprint same = same vulnerability in same location
    - Already verified 50 days ago
    - Unless code changed → fingerprint would be different

But what if developer changed line 42 to line 43?
  Finding SQL-1 (NEW lineNumber)
    → fingerprint = SHA256(rule||file||43||msg) = DIFFERENT
    → New finding group created!
    → f_003: active=true, groupId=fg_sql_line43
    → AI Verification: ✅ QUEUED
```

**This is fundamentally different from SonarQube**, which might re-verify if status changed.

---

## 🆚 PR Scenarios Detailed

### PR Case 1: 3 Commits, Scan on Commit 3

```
History:
  main: Commit A (scan done last week)
         Findings: [Auth-1, CORS-1]

  PR #1: feature/auth-refactor
    Commit B (new, unscanned)
      └─ Findings would be: [Auth-1, CORS-1, XSS-1]
    
    Commit C (new, unscanned)
      └─ Findings would be: [Auth-1, CORS-1, XSS-1, SQL-1]
    
    Commit D (new, SCANNED now)
      └─ Scan found: [Auth-1, CORS-1, XSS-1, SQL-1]

Dedup Process:

  1. Parse & create findings for Commit D scan
     (No previous findings on this branch, so all are new)
     
  2. diffNewFindings() compares:
     - headBranch='feature/auth-refactor'
     - baseBranch='main'
     
     New findings (in head, NOT in base):
       fp_xss_1 ✓ NEW
       fp_sql_1 ✓ NEW
       fp_auth_1 ✗ Already in base
       fp_cors_1 ✗ Already in base
     
  3. Gate Result:
     - NEW: [XSS-1, SQL-1]
     - FIXED: (none, nothing removed)

Issue: Commits B & C were NOT scanned individually!
  - If Commit B introduced XSS-1, we don't know which commit
  - We only know the final state at Commit D
  
Workaround: Use CI/CD to scan on EVERY commit
  - GitHub Actions on every push
  - Or scan only on PR open/update events
```

### PR Case 2: 3 Commits, Each Scanned

```
History:
  main: Commit A (scan done)
         Findings: [Auth-1, CORS-1]

  PR #1: feature/auth-refactor
    Commit B (SCANNED)
      Scan B found: [Auth-1, CORS-1, XSS-1]
      
    Commit C (SCANNED)
      Scan C found: [Auth-1, CORS-1, XSS-1, SQL-1]
      
    Commit D (SCANNED - FINAL, for PR review)
      Scan D found: [Auth-1, CORS-1, XSS-1, SQL-1]

Quality Gate on Scan D (final scan):

  diffNewFindings(head='feature/auth-refactor', base='main'):
    Fingerprints in Scan D: {fp_auth_1, fp_cors_1, fp_xss_1, fp_sql_1}
    Fingerprints in Scan A (main): {fp_auth_1, fp_cors_1}
    
    Result: NEW = [XSS-1, SQL-1]
    
  Ignore fact that:
    - Scan B had only XSS-1
    - Scan C added SQL-1
    - Gate only cares about: final state vs base branch

This is INTENTIONAL DESIGN:
  - Quality gate is for PR (not per-commit)
  - Want to avoid "flaky gates" (pass then fail per commit)
  - Only final state matters for merge decision
```

---

## 🔂 Re-scanning Scenarios

### Scenario A: Re-scan Same Commit

```
Timeline:
  Commit Z [main] - First Scan
    Findings: [SQL-1, Auth-1]
    Scan ID: scan_001
    Status: completed
  
  (developer discovers false positive Auth-1)
  
  Commit Z [main] - Re-scan (trigger scan_002)
    Findings: [SQL-1, Auth-1] (scanner still reports it)

Processing Scan 2:

  1. Query active findings from Scan 1:
     - f_001 (fp_sql, active=true)
     - f_002 (fp_auth, active=true)
  
  2. Parse Scan 2 findings:
     New fingerprints: {fp_sql, fp_auth}
  
  3. Dedup logic:
     - fp_sql in prev → Mark f_001 as superseded
     - fp_auth in prev → Mark f_002 as superseded
  
  4. Create new findings:
     - f_003 (fp_sql, scan_002, active=true)
     - f_004 (fp_auth, scan_002, active=true)
  
  5. AI Verification:
     - f_003: SKIP (persistent)
     - f_004: SKIP (persistent)

Result:
  Old verdicts preserved!
  If f_002 was marked "false_positive" manually:
    → f_004 inherits that status (same finding group)
    
  Or you can override at UI level.
```

### Scenario B: Re-scan After Code Fix

```
Timeline:
  Commit A [main] - Scan 1
    Code: query = "SELECT * WHERE id=" + user_input
    Findings: [SQL-1]
    
  (developer fixes vulnerability)
  
  Commit B [main] - Scan 2
    Code: query = "SELECT * WHERE id=?" + bind(user_input)
    Findings: [] (empty)

Processing Scan 2:

  1. Previous active findings (Scan 1):
     - f_001 (fp_sql, active=true, groupId=fg_sql)
  
  2. Incoming findings (Scan 2):
     - (none)
  
  3. Dedup logic:
     - f_001: NOT in incoming → Mark as "resolved"
     - Status updated: "fixed"
  
  4. AI Verification:
     - (no new findings)

Result:
  f_001.active = false
  f_001.status = "fixed"
  User sees: "SQL-1 — FIXED" in UI
```

---

## 📋 Quality Gate Logic Explained

```typescript
// quality-gate.service.ts

async evaluatePrScan(scanId, workspaceId, repositoryId, headBranch, baseBranch) {
  
  // 1. Get quality gate config
  const gate = {
    threshold: 'high',           // Block on: critical, high
    failOnCritical: true,        // Block if critical > 0
    failOnHighTp: true,          // Block if high TP > 0
    warnOnPending: true,         // Warn if pending > 0
    pendingBehavior: 'warn',     // 'warn' or 'fail'
  };
  
  // 2. Get NEW findings (not on base branch)
  const newFindings = diffNewFindings(
    repositoryId,
    headBranch='feature/x',
    baseBranch='main'
  );
  // → Returns: [XSS-1 (HIGH, TP), Auth-2 (MEDIUM, FP)]
  
  // 3. Get FIXED findings (on base, not on head)
  const fixedFindings = diffFixedFindings(
    repositoryId,
    headBranch='feature/x',
    baseBranch='main'
  );
  // → Returns: [Auth-1 (was HIGH, TP)]
  
  // 4. Count blocking findings (severity >= threshold)
  const blocking = countBlockingFindings(newFindings, gate);
  // → critical: 0, high: 1 (XSS-1 is TP, Auth-2 is FP so excluded)
  
  // 5. Count pending findings
  const pending = newFindings.filter(f => f.status === 'open').length;
  // → pending: 2 (both are open/unreviewed)
  
  // 6. Determine status
  let status = 'passed';
  if (gate.failOnCritical && blocking.critical > 0) status = 'failed';
  else if (gate.failOnHighTp && blocking.high > 0) status = 'failed';
  
  if (gate.warnOnPending && pending > 0) {
    if (status === 'passed') {
      status = gate.pendingBehavior === 'fail' ? 'failed' : 'warning';
    }
  }
  
  // → status = 'failed' (HIGH TP blocking)
  
  // 7. Store result
  qualityGateResults.create({
    scanId,
    gateId: gate.id,
    status: 'failed',
    blockingFindings: 1,        // XSS-1
    pendingFindings: 2,         // Both awaiting review
    newFindings: 2,             // XSS-1, Auth-2
    fixedFindings: 1,           // Auth-1
  });
  
  // 8. Post PR comment (if applicable)
  github.createComment({
    prNumber: 42,
    body: `🔴 SAST Gate FAILED\n\nBlocking: XSS-1 (HIGH, TP)`
  });
  
  // 9. Post commit status
  github.createCommitStatus({
    commit: headBranch.latestCommitSha,
    status: 'failure',
    context: 'sast-integration/gate',
    description: 'Blocking findings detected',
  });
}
```

---

## ⚙️ Handling AI Verdict in Gate

```
Finding Status:
  - "open" (default, awaiting review)
  - "fixed" (manually marked or auto-detected)
  - "false_positive" (user or AI marked)
  - "acknowledged" (user acknowledged but not fixed)
  - "wont_fix" (intentional, will not fix)

AI Verification Result:
  - verdict: 'true_positive' or 'false_positive'
  - confidence: 0-100
  - explanation: reasoning from LLM
  - dataFlow: if TP, shows taint flow
  - fixSuggestion: how to fix

Gate Counting:

  def countBlockingFindings(findings, gate):
    // Count findings by severity that match threshold
    // ONLY if NOT false_positive
    
    for finding in findings:
      if finding.status == 'false_positive':
        continue  // Skip FP
      
      if finding.severity in gate.threshold:
        blockingCount++
    
    return blockingCount


Example:
  New findings:
    f1: SQL-1, HIGH, TP ← COUNTS
    f2: Auth-2, MEDIUM, FP ← SKIP
    f3: XSS-3, CRITICAL, TP ← COUNTS
    f4: CORS-4, HIGH, pending ← COUNTS (pending counts!)
  
  threshold='high' → count critical & high
  blocking count = 2 (f1, f3)
  
  // If gate.pendingBehavior='fail' and f4 pending
  // → override to 'failed'
```

---

## 🎯 Summary: When AI Re-analyzes

### ✅ AI RE-ANALYZES (Enqueue new verification)

1. **New Finding** — First time seeing this fingerprint in project
   - `status='open'` by default
   - Queued for AI verification
   - No previous verdict to inherit

2. **Modified Finding** — Fingerprint changed (line moved, code refactored)
   - Old fingerprint (e.g., `fp_sql_line42`) → marked resolved
   - New fingerprint (e.g., `fp_sql_line43`) → new finding group
   - Queued for AI verification

3. **User Overrides** — User marked FP but scanner found again
   - Old verdict: "false_positive"
   - New scan finds same fingerprint again
   - Marked superseded, new finding created
   - **Questionable:** Should inherit old verdict or re-verify?
   - **Current app:** Will be AI verified (new finding)

### ❌ AI SKIPS (Reuses previous verdict)

1. **Persistent Finding** — Same fingerprint on same location
   - Old finding marked superseded
   - New finding inherits finding_group
   - Verdict status might transfer
   - No new AI job enqueued

2. **Already Verified** — Finding has existing `ai_verifications` record
   - Multiple models might have verified it
   - All verdicts stored in table
   - UI picks latest/highest-confidence verdict
   - No new verification unless explicitly requested

---

## 🚀 Key Differences from SonarQube

| Feature | SonarQube | App | Why Different |
|---------|-----------|-----|--------------|
| **Dedup Key** | rule+file+line (string) | SHA256(rule\|\|file\|\|line\|\|msg) | Deterministic hashing prevents collision |
| **PR Findings** | New only | New only + AI verdict | AI adds trust score |
| **Re-scan** | Clean or incremental | Smart dedup per scanner | Preserves history, avoids duplication |
| **Commit History** | Implicit (overwritten) | Explicit per-scan | Better audit trail |
| **AI Integration** | Manual/plugin | Native + multi-model | Built-in, no integration needed |
| **Finding Groups** | Not explicit | Explicit table | Easy to track "same issue" across scans |
| **Line Movement** | Can re-fingerprint | New fingerprint = new group | More granular tracking |

---

## 📌 Important Notes

### Note 1: Fingerprint Sensitivity

Current fingerprint includes line number:
```
SHA256(rule || file || lineNumber || message)
```

If developer moves code (same logic, different line):
```
Old: rule="SQL Inject", file="db.py", line=42, message="..."
New: rule="SQL Inject", file="db.py", line=45, message="..."
```

→ **DIFFERENT fingerprints** = Two separate finding groups!

This is intentional because line number is part of severity assessment. But it means refactored code = new finding.

### Note 2: AI Re-verification on Override

If user marks a finding as "false_positive":
```
f_001: status='false_positive', groupId=fg_sql, verdict='TP' (from AI)
```

Next scan finds SAME fingerprint:
```
→ New f_002: status='open', groupId=fg_sql, verdict='pending'
→ Will be AI verified AGAIN (new finding)
```

User verdict is not inherited automatically. This avoids "stuck" verdicts.

### Note 3: PR Comment Deduplication

```typescript
// ci/complete/route.ts L200

const seenFindingIds = new Set<string>();
for (const finding of newFindings) {
  if (seenFindingIds.has(finding.id)) {
    continue;  // Skip if already posted
  }
  seenFindingIds.add(finding.id);
  
  // Post inline comment on GitHub PR
  github.createReview({
    prNumber,
    comments: [{
      path: finding.filePath,
      line: finding.lineNumber,
      body: `🔴 ${finding.severity.toUpperCase()}\n\n${finding.description}`
    }]
  });
}
```

Each finding gets ONE comment per PR review event. If comment already exists, don't post again (use GitHub API to check).

---

## 🎓 Conclusion

Your app is **NOT a SonarQube clone**. It's a **hybrid SAST platform** with:

1. ✅ **Multi-scanner support** (6 engines)
2. ✅ **Sophisticated deduplication** (fingerprint + groups)
3. ✅ **Smart PR analysis** (diff-based, new findings only)
4. ✅ **AI-native verification** (not bolted on)
5. ✅ **Commit-level granularity** (every scan tracked)
6. ⚠️ **Fingerprint change = new issue** (could be pro or con)
7. ⚠️ **No multi-model voting** yet (but architecture ready)

The fundamental difference: **SonarQube = Quality Gates**, **Your App = Security + AI Trust**.
