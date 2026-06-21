# 🔍 Diagnosis: Mengapa Total Findings Sampai 88 Padahal Harusnya 22-16?

## Pertanyaan Anda
> "Saya lakukan scan CI/CD dan manual bersamaan di branch yang sama dengan main. Manual: 22 findings, CI/CD: 16 findings, Total: 88 findings. Sama file, sama lokasi beberapa. Apakah logic error?"

## Jawaban: **YA, ada multiple kemungkinan bug!**

---

## 🚨 Root Cause Analysis

### Kemungkinan 1: Deduplication Scope TIDAK BENAR

```typescript
// finding.service.ts L50-52

const previousActiveFindings = await findingRepository.listActiveFindingsByProject(
  projectId ?? null,          // ← Null jika tidak ada projectId
  repositoryId ?? null,       // ← Null jika tidak ada repositoryId  
  scanId,                     // ← CURRENT scanId!
  scannerName ?? undefined,   // ← Scanner name
  tx
);
```

**ADA BUG DI SINI!** Mari lihat detail:

```typescript
// finding.repository.ts L512-538

async listActiveFindingsByProject(projectId, repositoryId, scanId, scanner, tx) {
  const conditions = [
    eq(findings.active, true),  // ✅ Only active
  ];

  if (projectId) {
    conditions.push(eq(findingGroups.projectId, projectId));
  } else if (repositoryId) {
    conditions.push(eq(findingGroups.repositoryId, repositoryId));
  }

  if (scanId) {
    conditions.push(eq(findings.scanId, scanId));  // ← PROBLEM HERE!
  }
  if (scanner) {
    conditions.push(eq(findings.scanner, scanner));
  }
  
  return executor.select(...).from(findings)...
}
```

**MASALAHNYA:**

```
Ketika replaceFindingsForScanJob dipanggil:
  Input:
    projectId = 'proj_123'
    scanId = 'scan_222'  ← CURRENT scan being processed
    scanner = 'semgrep'

Logic query:
  WHERE active=true 
  AND projectId='proj_123'
  AND scanId='scan_222'  ← CURRENT SCAN!
  AND scanner='semgrep'

❌ INI SALAH!

Should be:
  WHERE active=true 
  AND projectId='proj_123'
  AND scanner='semgrep'
  AND scanId != 'scan_222'  ← EXCLUDE current scan!
```

---

### Kemungkinan 2: Multiple Scanners Tidak di-Deduplikasi

```
Scenario:
  Manual scan di branch:
    - Semgrep: 12 findings
    - Gitleaks: 5 findings
    - Flawfinder: 5 findings
    Total manual: 22

  CI/CD scan di branch (same code):
    - Semgrep: 8 findings
    - Gitleaks: 5 findings
    - Flawfinder: 3 findings
    Total CI/CD: 16

Current Dedup Logic:
  1. Manual Scan Semgrep processed:
     - Input: 12 findings
     - Query previous: scanId='manual_scan', scanner='semgrep'
     - Previous: 0 (first time)
     - Create: 12 findings
  
  2. Manual Scan Gitleaks processed:
     - Input: 5 findings
     - Query previous: scanId='manual_scan', scanner='gitleaks'
     - Previous: 0 (first time)
     - Create: 5 findings
  
  3. Manual Scan Flawfinder processed:
     - Input: 5 findings
     - Query previous: scanId='manual_scan', scanner='flawfinder'
     - Previous: 0 (first time)
     - Create: 5 findings
  
  Total Manual Findings Created: 22 ✅

  4. CI/CD Scan Semgrep processed:
     - Input: 8 findings
     - Query previous: scanId='cicd_scan', scanner='semgrep'
     - Previous: 0 (different scanId!)  ← BUG!
     - Create: 8 findings (should deduplicate vs manual!)
  
  5. CI/CD Scan Gitleaks processed:
     - Input: 5 findings
     - Query previous: scanId='cicd_scan', scanner='gitleaks'
     - Previous: 0 (different scanId!)  ← BUG!
     - Create: 5 findings
  
  6. CI/CD Scan Flawfinder processed:
     - Input: 3 findings
     - Query previous: scanId='cicd_scan', scanner='flawfinder'
     - Previous: 0 (different scanId!)  ← BUG!
     - Create: 3 findings

Total Findings in DB: 22 + 16 = 38

Wait, you said 88. Let me continue...
```

---

### Kemungkinan 3: Scan Dijalankan Multiple Kali

```
Scenario: Scan triggered multiple times

Timeline:
  1. Manual Scan Triggered (branch)
     Semgrep: 12 findings created
     
  2. Manual Scan Triggered AGAIN (rerun)
     Previous: 0 (no findings from other scanId)
     Create: 12 findings (same 12)
     Total: 24 (12 old inactive + 12 new)
  
  3. CI/CD Scan Triggered (branch)
     Previous: 0 (different scanId)
     Create: 16 findings
     Total: 24 + 16 = 40

Bahkan ini baru 40, bukan 88...
```

---

### Kemungkinan 4: BRANCH vs MAIN Finding Groups TIDAK TERISOLASI

**AH! SAYA MENEMUKAN BUG-NYA!**

```typescript
// finding.repository.ts L78

const groupMap = await findingRepository.findOrCreateFindingGroups(
  projectId,           // ← Project-scoped!
  repositoryId ?? null,  // ← Can be null or repo-scoped
  fingerprintEntries,
  tx
);
```

Lihat di `findOrCreateFindingGroups`:

```typescript
// finding.repository.ts L461-500

async findOrCreateFindingGroups(projectId, repositoryId, entries, tx) {
  const executor = tx ?? db;
  
  projectId = projectId || null;
  repositoryId = repositoryId || null;

  const fingerprints = entries.map(e => e.fingerprint);
  
  // Condition untuk query existing groups
  const repoCondition = repositoryId 
    ? eq(findingGroups.repositoryId, repositoryId)
    : isNull(findingGroups.repositoryId);

  const groups = await executor
    .select({ id: findingGroups.id, fingerprint: findingGroups.fingerprint })
    .from(findingGroups)
    .where(and(
      eq(findingGroups.projectId, projectId),  // ← PROJECT-SCOPED!
      repoCondition,
      inArray(findingGroups.fingerprint, fingerprints)
    ));

  // ... create groups for fingerprints not found
}
```

**MASALAHNYA:**

```
Finding Groups are project-scoped, not branch-scoped!

Scan 1 (branch feature/auth):
  Finding: SQL-1 at line 50
  Fingerprint: fp_sql
  GroupId: fg_001
  Create: f_001 (branch=feature/auth, groupId=fg_001)

Scan 2 (branch main):
  Finding: SQL-1 at line 50 (same code)
  Fingerprint: fp_sql (SAME!)
  GroupId: fg_001 (REUSED! ← Should be separate!)
  
  But wait, when dedup:
    listActiveFindingsByProject(projectId, repositoryId, scanId='scan_2', scanner='semgrep')
    → Query: findings.active=true AND findingGroups.projectId=proj AND scanId='scan_2'
    → Result: 0 (scanId is different!)
    
  So it creates:
    f_002 (branch=main, groupId=fg_001) ← SAME GROUP!

Database:
  Finding Groups:
  fg_001: fingerprint=fp_sql, projectId=proj_1, repositoryId=repo_1
  
  Findings:
  f_001: branch=feature/auth, groupId=fg_001, active=true, scanId=scan_1
  f_002: branch=main, groupId=fg_001, active=true, scanId=scan_2 ← DUPLICATE!
```

---

### Kemungkinan 5: Query Not Excluding Current Scan

**INI DIA BUG YANG PALING MUNGKIN!**

```typescript
// finding.service.ts L50-52

const previousActiveFindings = await findingRepository.listActiveFindingsByProject(
  projectId ?? null,
  repositoryId ?? null,
  scanId,  // ← CURRENT scan!
  scannerName ?? undefined,
  tx
);
```

Logic di `listActiveFindingsByProject`:

```typescript
if (scanId) {
  conditions.push(eq(findings.scanId, scanId));  // ← Query ONLY findings from current scan!
}
```

**ARTINYA:**

```
Ketika parse-scan-result.job.ts process findings dari manual scan:

replaceFindingsForScanJob(projectId, 'manual_scan_id', [...], repositoryId)
  ↓
listActiveFindingsByProject(..., 'manual_scan_id', 'semgrep')
  ↓
Query: WHERE scanId='manual_scan_id' AND scanner='semgrep'
  ↓
Result: findings yang SUDAH created dalam manual scan

Contoh:
  Manual Scan Semgrep Part 1:
    - Create findings f_001-f_012
    
  Manual Scan Gitleaks:
    - Query previous: scanId='manual_scan', scanner='gitleaks'
    - Result: 0 (no gitleaks from this scan yet)
    - Create f_013-f_017
    
  Manual Scan Semgrep Part 2 (if runs again):
    - Query previous: scanId='manual_scan', scanner='semgrep'
    - Result: f_001-f_012 (found!)
    - Dedup: mark as superseded
    - Create f_018-f_029 (new)
    - Total in manual scan: 17 active

  CI/CD Scan Semgrep:
    - Query previous: scanId='cicd_scan', scanner='semgrep'
    - Result: 0 (different scanId!)  ← BUG!
    - Create: 8 findings (should have deduplicated vs manual!)

  Total: 17 (manual) + 8 (cicd) = 25 (should be ~8 after dedup)
```

---

## 🎯 Root Cause: Dedup Query WRONG

### Current (WRONG):

```typescript
const previousActiveFindings = await findingRepository.listActiveFindingsByProject(
  projectId,
  repositoryId,
  scanId,        // ← CURRENT scan
  scanner,
  tx
);

// Query:
WHERE active=true 
AND projectId=?
AND repositoryId=?
AND scanId=?       // ← CURRENT SCAN ONLY!
AND scanner=?

// Result: Only finds findings from the SAME scan
```

**IMPACT:**
- Manual Scan creates findings f_001-f_022
- CI/CD Scan queries: scanId='cicd_scan' → finds 0 from manual
- CI/CD Scan creates ALL 16 findings (no dedup!)
- Total: 22 + 16 = 38

But if Semgrep runs multiple times in same scan:
- Semgrep Part 1: Create f_001-f_012
- Semgrep Part 2: Query scanId='manual_scan' → finds f_001-f_012 → dedup them
- Total: Still 22 from manual

If CI/CD Semgrep runs 5 times:
- Each time: Query scanId='cicd_scan' → finds previous from THIS run → dedup
- But never deduped against manual!

Hmm, still not 88...

---

## 🔍 Investigating Further: Multiple Scans Same Fingerprint

```
What if both CI/CD and Manual create findings without dedup,
AND both connect to same finding_group?

Manual Scan:
  SQL-1 (fp_sql): Create f_001 → groupId=fg_001
  SQL-1 (fp_sql): Rerun creates f_002 → groupId=fg_001 (same group!)
  → 2 findings, same group

CI/CD Scan:
  SQL-1 (fp_sql): Create f_003 → groupId=fg_001 (same group!)
  SQL-1 (fp_sql): Rerun creates f_004 → groupId=fg_001
  → 2 findings, same group

If this happens for multiple findings:
  22 findings × 2 (manual ran twice) = 44
  16 findings × 2 (CI/CD ran twice?) = 32
  But different scanners...

Actually, let me think differently...
```

---

## 📊 Most Likely Explanation: Per-Scanner Dedup NOT Across-Scan

```
Your Scenario:
  Manual Scan (one scan ID, multiple scanners):
    - Semgrep parser runs: creates 12 findings (scan_manual_1)
    - Gitleaks parser runs: creates 5 findings (scan_manual_1)
    - Flawfinder parser runs: creates 5 findings (scan_manual_1)
    Total: 22 findings in 1 scan

  CI/CD Scan (one scan ID, multiple scanners):
    - Semgrep parser runs: creates 8 findings (scan_cicd_1)
    - Gitleaks parser runs: creates 5 findings (scan_cicd_1)
    - Flawfinder parser runs: creates 3 findings (scan_cicd_1)
    Total: 16 findings in 1 scan

  UI Query ALL findings:
    SELECT * FROM findings WHERE active=true AND branch='branch' AND scanner IN (all)
    Result: 22 + 16 = 38 findings ✅

But you said 88...

What if you're counting findings grouped by finding_group?
  Manual: 22 unique fingerprints → 22 groups
  CI/CD: 16 unique fingerprints → could be same groups!

No wait, findings are individual records...

UNLESS: You're querying by finding_groups table, not findings!
  Manual branch scan:
    - Creates 22 finding_groups (one per unique fingerprint)
    
  CI/CD branch scan:
    - Creates 16 finding_groups (one per unique fingerprint)
    - But if different scanners found same issue → same fingerprint → same group!
    
  But that still doesn't add up to 88...
```

---

## 💡 The Real Answer: Check Your Query

**I need to see:**

1. **How you're counting:** 
   - Are you counting `findings` or `finding_groups`?
   - Are you filtering by `active=true`?
   - Are you querying specific scanners or all?

2. **Your actual database state:**
   ```sql
   SELECT 
     branch,
     COUNT(DISTINCT scanner) as scanners,
     COUNT(*) as total_findings,
     COUNT(DISTINCT groupId) as unique_issues,
     COUNT(CASE WHEN active=true THEN 1 END) as active_count
   FROM findings
   WHERE repositoryId = 'your_repo'
   GROUP BY branch;
   ```

3. **Per-scan breakdown:**
   ```sql
   SELECT 
     scanId,
     scanner,
     branch,
     COUNT(*) as findings_count,
     COUNT(DISTINCT groupId) as unique_groups
   FROM findings
   WHERE repositoryId = 'your_repo' AND branch IN ('feature/auth', 'main')
   GROUP BY scanId, scanner, branch;
   ```

---

## ✅ Recommendations

### 1. **Fix Dedup Query** (Most Likely Fix)

```typescript
// finding.repository.ts - NEW METHOD

async listActiveFindingsByRepositoryAndScanner(
  repositoryId: string,
  scanner: string,
  excludeScanId?: string  // ← Exclude current scan!
) {
  const conditions = [
    eq(findings.active, true),
    eq(findingGroups.repositoryId, repositoryId),
    eq(findings.scanner, scanner),
  ];

  if (excludeScanId) {
    conditions.push(ne(findings.scanId, excludeScanId));  // ← KEY FIX!
  }

  return executor.select({ ... }).from(findings)...where(and(...conditions));
}
```

Then in finding.service.ts:

```typescript
// OLD (WRONG):
const previousActiveFindings = await findingRepository.listActiveFindingsByProject(
  projectId, repositoryId, scanId, scannerName  // ← scanId filters TO current scan
);

// NEW (RIGHT):
const previousActiveFindings = await findingRepository.listActiveFindingsByRepositoryAndScanner(
  repositoryId, scannerName, scanId  // ← scanId excludes current scan
);
```

### 2. **Add Logging**

```typescript
logger.scan.info('replaceFindingsForScanJob', {
  scanId,
  scanner: scannerName,
  incomingCount: inputs.length,
  previousActiveCount: previousActiveFindings.length,
  superseded: supersededIds.length,
  resolved: resolvedIds.length,
  newCreated: created.length,
});
```

Then check your logs to see if `previousActiveCount` is 0 when it should be > 0.

### 3. **Verify in UI**

```
Check dashboard:
  Manual scan branch: 22 findings
  CI/CD scan branch: 16 findings (or should be <16 after dedup?)
  
Show per-scan:
  - Manual Scan ID: X
    - Semgrep: 12 findings
    - Gitleaks: 5 findings
    - Flawfinder: 5 findings
  - CI/CD Scan ID: Y
    - Semgrep: 8 findings (check if deduplicated!)
    - Gitleaks: 5 findings
    - Flawfinder: 3 findings
```

---

## 🎓 Conclusion

**The 88 findings issue is likely due to:**

1. ❌ **Dedup query includes `scanId` condition** → prevents dedup across different scans
2. ❌ **Multiple scanners not deduplicated against each other** (if they find same fingerprint)
3. ⚠️ **Possible multiple scan runs** (same scan triggered twice?)

**To fix:**
- Query previous findings from **repository + scanner**, NOT specific scanId
- Exclude current scanId from the query
- Add logging to see actual dedup counts

**To debug:**
- Run SQL query above to see real numbers
- Check logs for dedup statistics
- Compare manual vs CI/CD findings details
