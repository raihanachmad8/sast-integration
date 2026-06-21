# ✅ Quick Reference: Branch PR Commit Scope & Comment Strategy

## 📊 Cheat Sheet (Copy This)

```
MAIN BRANCH (Baseline)
└─ Commit A (abc123)
   └─ SCAN A.1: 20 findings → Stored with branch='main'

PR BRANCH (Feature Development)
├─ Commit X (ghi789)
│  └─ SCAN X.1: 22 findings
│     ├─ Dedup Source: Previous findings from SAME REPO + SAME SCANNER - EXCLUDE this scan
│     ├─ Result: 22 all NEW (no previous scans on PR yet)
│     ├─ AI Verify: 22 findings
│     └─ Comment: 1 PR Summary + 2 inline (critical only)
│
├─ Commit X+1 (jkl012) [developer fix]
│  └─ SCAN X+1.1: 21 findings
│     ├─ Dedup Source: Query findings from repo + scanner WHERE NOT in X.1
│     ├─ Result: 17 persistent + 2 new + 1 resolved (fixed)
│     ├─ AI Verify: 17 + 2 = 19 findings
│     └─ Comment: 1 PR Summary (REPLACE) + update inline (✅ fixed)
│
└─ Commit X+2 (mno345) [add new file]
   └─ SCAN X+2.1: 25 findings
      ├─ Dedup Source: Query findings from repo + scanner WHERE NOT in X+1.1
      ├─ Result: 17 persistent + 4 new + 0 resolved
      ├─ AI Verify: 21 findings
      └─ Comment: 1 PR Summary (REPLACE) + 4 inline (new critical/high)
```

---

## 🔍 Dedup Query (What Should Happen)

```sql
-- CORRECT dedup query (for next fix):

SELECT f.id, f.fingerprint
FROM findings f
INNER JOIN finding_groups fg ON f.groupId = fg.id
WHERE 
  fg.repositoryId = 'repo_id'          -- Same repo
  AND f.scanner = 'semgrep'            -- Same scanner
  AND f.active = true                  -- Only active
  AND f.scanId != 'scan_x1'            -- EXCLUDE current scan ← KEY!
  -- AND s.branch = 'feature/auth'     -- Optional: same branch
ORDER BY f.createdAt DESC;

-- Current WRONG query:
WHERE f.scanId = 'scan_x1'  -- ← INCLUDES current scan = finds NOTHING!
```

---

## 💬 Comment Decision Matrix

```
Finding Status          Severity    Post Inline?  Post Summary?  Post Dashboard?
────────────────────────────────────────────────────────────────────────────────
NEW (first time)        CRITICAL    ✅ YES        ✅ Highlight   ✅ YES
                        HIGH        ✅ YES        ✅ List        ❓ Maybe
                        MEDIUM      ❌ NO         ✅ Count       ❌ NO
                        LOW         ❌ NO         ✅ Count       ❌ NO

PERSISTENT              CRITICAL    ❌ NO*        ✅ Track       ✅ Keep open
(from previous)         HIGH        ❌ NO         ✅ Track       ❌ NO
                        MEDIUM      ❌ NO         ✅ Count       ❌ NO

RESOLVED/FIXED          (any)       ✅ Update(✅) ✅ Highlight   ✅ Mark done

FALSE POSITIVE          (any)       ❌ Remove     ✅ Exclude     ✅ Document

* = Link to existing inline comment if it exists
```

---

## 📍 Where Each Comment Goes

```
PR INTERFACE (GitHub):
├─ PR Summary Comment (1x per scan)
│  ├─ Posted by: SAST Bot
│  ├─ Content: "22 findings (2 critical, 8 high...)"
│  ├─ Update strategy: REPLACE (don't accumulate)
│  └─ Location: PR conversation tab
│
├─ Inline Comments (per file/line)
│  ├─ Posted by: SAST Bot
│  ├─ Content: "🔴 CRITICAL: Hardcoded secret"
│  ├─ Update strategy: ADD ✅ when fixed, or hide if false positive
│  └─ Location: File changes tab (at specific line)
│
└─ PR Review (optional)
   ├─ Approve / Request Changes (if critical findings)
   └─ Link to dashboard for details

DASHBOARD (Our App):
├─ Finding Details Page
│  ├─ Full context, history, all scans
│  ├─ Discussion threads
│  └─ Status tracking
│
├─ Finding Group History
│  ├─ Timeline across all branches/scans
│  ├─ Status changes documented
│  └─ All comments linked
│
└─ Dashboard Discussions (optional)
   ├─ For security team decisions
   ├─ Remediation tracking
   └─ SLA monitoring
```

---

## 🎯 The "88 Issue" - Possible Causes

```
Scenario: Manual scan = 22, CI/CD scan = 16, Total shown = 88

Possible Cause 1: Query includes INACTIVE findings
  └─ SELECT * FROM findings WHERE active IN (true, false)
  └─ Count: 22 active + 22 inactive (from rerun) + 16 active + 16 inactive = 76
  └─ Close to 88!

Possible Cause 2: Multiple scans per commit
  └─ Manual triggered 2x: 22 + 22 = 44
  └─ CI/CD triggered 2x: 16 + 16 = 32
  └─ Total: 76 (still not 88)

Possible Cause 3: Cross-branch query
  └─ Main branch also scanned: 10 + 20 (inactive) = 30
  └─ Feature branch: 22 + 22 (inactive) + 16 = 60
  └─ Total: 90 ≈ 88!

Possible Cause 4: UI query problem
  └─ Counting findings per finding_group instead of per finding
  └─ Or joining wrong tables

ACTION: Run debug query to check:
  SELECT COUNT(*) as total, COUNT(CASE WHEN active=true THEN 1 END) as active
  FROM findings WHERE repositoryId = 'repo_id';
```

---

## 🚀 Quick Fix Plan

### Step 1: Add New Repository Method (5 min)
```typescript
// finding.repository.ts - ADD NEW METHOD

async listActiveFindingsByRepositoryAndScanner(
  repositoryId: string,
  scanner: string,
  excludeScanId?: string
) {
  const conditions = [
    eq(findings.active, true),
    eq(findingGroups.repositoryId, repositoryId),
    eq(findings.scanner, scanner),
  ];
  if (excludeScanId) {
    conditions.push(ne(findings.scanId, excludeScanId));
  }
  return executor.select(...)
    .from(findings)
    .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
    .where(and(...conditions));
}
```

### Step 2: Update Service Call (5 min)
```typescript
// finding.service.ts L50-52 - REPLACE

// OLD:
// const previousActiveFindings = await findingRepository.listActiveFindingsByProject(
//   projectId, repositoryId, scanId, scannerName, tx
// );

// NEW:
const previousActiveFindings = await findingRepository
  .listActiveFindingsByRepositoryAndScanner(
    repositoryId!,
    scannerName!,
    scanId  // ← EXCLUDE current scan
  );
```

### Step 3: Add Logging (5 min)
```typescript
// finding.service.ts L106 - ADD LOGGING

logger.scan.info('replaceFindingsForScanJob completed', {
  projectId, scanId, scanner: scannerName,
  incomingCount: inputs.length,
  previousActiveCount: previousActiveFindings.length,  // ← NEW
  newCount: created.length,
});
```

### Step 4: Test & Verify (30 min)
```bash
# Run same PR scan again
# Check logs for:
#   - incomingCount: should match incoming
#   - previousActiveCount: should be > 0 on 2nd scan
#   - newCount: should be lower (deduped)

# Run query to verify findings count
SELECT COUNT(*) FROM findings 
WHERE repositoryId='repo' AND active=true;
```

---

## 📝 Comment Template Examples

### **PR Summary Comment**
```markdown
## 🔍 SAST Security Scan Results

**Total Findings:** 22
- 🔴 **Critical:** 2 (must fix)
- 🟠 **High:** 8 (should fix)
- 🟡 **Medium:** 12 (review)

**Changes in this commit:**
- ✅ Fixed: 1 finding
- ⚠️ New: 0 findings
- 📌 Persistent: 21 findings

[View Full Report](link-to-dashboard) | [Previous Scan](link-to-previous)
```

### **Inline Comment (Critical)**
```markdown
🔴 **CRITICAL Security Issue**

**Type:** Hardcoded Secret
**Rule:** semgrep/hardcoded-password
**Severity:** CRITICAL

**Issue:** 
Found hardcoded API key in code

**Fix:**
Move to environment variables

**Code:**
```
const apiKey = "sk_prod_abc123..."  ← UNSAFE
```

[View Full Details](dashboard-link) | [Mark False Positive](#)
```

### **Inline Comment Update (Fixed)**
```markdown
✅ **FIXED in this commit!**

The hardcoded secret at this location has been resolved.

Previous finding from commit abc123 → Now fixed in commit def456
```

---

## ⚡ For Your Next Commit

When you push commits:

```
Commit 1: Initial PR
└─ System comments: ~3 (1 summary + 2 inline critical)

Commit 2: Fix 1 issue
└─ System comments: ~2 (1 summary replace + 1 inline update ✅)

Commit 3: Add new file
└─ System comments: ~7 (1 summary replace + 4 inline new + 2 dashboard)

Total comments: ~12 (NOT 88!)
```

---

## ✅ Verification Checklist

After implementing dedup fix:

- [ ] New repository method added
- [ ] Service calls updated to use new method
- [ ] Logging added for visibility
- [ ] Test: Push new commit to PR
- [ ] Verify: `previousActiveCount` > 0 in logs
- [ ] Verify: `newCount` < `incomingCount` (dedup working)
- [ ] Verify: Database count matches expected
- [ ] Verify: PR comments posted correctly
- [ ] Verify: Inline comments only for critical
- [ ] Verify: PR summary comment replaces previous

