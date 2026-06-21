# Debug Queries untuk Investigate 88 Findings Issue

Copy-paste queries ini ke database Anda untuk investigate:

---

## Query 1: Lihat Total Findings per Branch

```sql
SELECT 
  s.branch,
  COUNT(*) as total_findings,
  COUNT(DISTINCT f.scanner) as unique_scanners,
  COUNT(DISTINCT f.groupId) as unique_groups,
  COUNT(CASE WHEN f.active = true THEN 1 END) as active_findings,
  COUNT(CASE WHEN f.active = false THEN 1 END) as inactive_findings
FROM findings f
INNER JOIN scans s ON f.scanId = s.id
WHERE s.repositoryId = '<REPLACE_WITH_YOUR_REPO_ID>'
GROUP BY s.branch
ORDER BY s.branch;
```

**Expected Output:**
```
branch         | total_findings | unique_scanners | unique_groups | active_findings | inactive_findings
---------------|----------------|-----------------|---------------|-----------------|-------------------
feature/auth   | 22             | 3               | 22            | 22              | 0
main           | 16             | 3               | 16            | 16              | 0
```

If you're seeing 88, it might be showing more rows or way higher numbers.

---

## Query 2: Breakdown per Scan

```sql
SELECT 
  s.id as scanId,
  s.branch,
  s.origin,
  f.scanner,
  COUNT(*) as findings_count,
  COUNT(DISTINCT f.groupId) as unique_groups,
  COUNT(CASE WHEN f.active = true THEN 1 END) as active_count,
  MIN(f.createdAt) as earliest_finding,
  MAX(f.createdAt) as latest_finding
FROM findings f
INNER JOIN scans s ON f.scanId = s.id
WHERE s.repositoryId = '<REPLACE_WITH_YOUR_REPO_ID>'
GROUP BY s.id, s.branch, s.origin, f.scanner
ORDER BY s.createdAt DESC, f.scanner;
```

**What to look for:**
- Are there multiple scans with same branch?
- Are findings duplicated across scans?
- Is `active_count` matching `findings_count` (all should be active)?

---

## Query 3: Duplicate Findings (Same Fingerprint, Same Group, Different Findings)

```sql
SELECT 
  fg.id as groupId,
  fg.fingerprint,
  fg.title,
  COUNT(DISTINCT f.id) as duplicate_finding_count,
  COUNT(DISTINCT f.scanner) as scanners_found_by,
  COUNT(DISTINCT s.id) as scans_found_in,
  STRING_AGG(DISTINCT s.branch, ', ') as branches,
  STRING_AGG(DISTINCT f.scanner, ', ') as scanners,
  COUNT(CASE WHEN f.active = true THEN 1 END) as active_count,
  COUNT(CASE WHEN f.active = false THEN 1 END) as inactive_count
FROM findings f
INNER JOIN finding_groups fg ON f.groupId = fg.id
INNER JOIN scans s ON f.scanId = s.id
WHERE fg.repositoryId = '<REPLACE_WITH_YOUR_REPO_ID>'
GROUP BY fg.id, fg.fingerprint, fg.title
HAVING COUNT(DISTINCT f.id) > 1
ORDER BY COUNT(DISTINCT f.id) DESC;
```

**What to look for:**
- If you see `duplicate_finding_count > 2` for same fingerprint, that's a BUG
- Should be maximum 2 (one old inactive, one new active)

---

## Query 4: Check Dedup Status (Superseded vs Active)

```sql
SELECT 
  fg.fingerprint,
  fg.title,
  COUNT(DISTINCT CASE WHEN f.active = true THEN f.id END) as active_findings,
  COUNT(DISTINCT CASE WHEN f.active = false THEN f.id END) as inactive_findings,
  STRING_AGG(DISTINCT s.branch, ', ') FILTER (WHERE f.active = true) as active_branches,
  STRING_AGG(DISTINCT s.branch, ', ') FILTER (WHERE f.active = false) as inactive_branches
FROM findings f
INNER JOIN finding_groups fg ON f.groupId = fg.id
INNER JOIN scans s ON f.scanId = s.id
WHERE fg.repositoryId = '<REPLACE_WITH_YOUR_REPO_ID>'
GROUP BY fg.fingerprint, fg.title
ORDER BY COUNT(*) DESC;
```

**What to look for:**
- Each fingerprint should have exactly 1 or 2 findings
- If both are inactive → BUG
- If more than 2 active → BUG

---

## Query 5: Check if Scans Are Properly Deduplicated

```sql
WITH scan_summary AS (
  SELECT 
    s.id as scanId,
    s.branch,
    s.origin,
    COUNT(*) as total_findings,
    COUNT(DISTINCT f.groupId) as unique_groups
  FROM findings f
  INNER JOIN scans s ON f.scanId = s.id
  WHERE s.repositoryId = '<REPLACE_WITH_YOUR_REPO_ID>'
  GROUP BY s.id, s.branch, s.origin
)
SELECT 
  branch,
  origin,
  COUNT(*) as scan_count,
  SUM(total_findings) as total_findings_all_scans,
  SUM(unique_groups) as unique_groups_across_scans,
  AVG(total_findings) as avg_findings_per_scan
FROM scan_summary
GROUP BY branch, origin
ORDER BY branch;
```

**What to look for:**
- If `total_findings_all_scans = 88` but should be `22 + 16 = 38`
- Then findings are being counted multiple times (multiple scans or multiple scanners)

---

## Query 6: Check Scanner Breakdown

```sql
SELECT 
  s.branch,
  s.id as scanId,
  f.scanner,
  COUNT(*) as findings_count,
  COUNT(DISTINCT f.groupId) as unique_issues,
  STRING_AGG(DISTINCT f.rule, ', ')::text as rules_found,
  MIN(f.createdAt) as created_at
FROM findings f
INNER JOIN scans s ON f.scanId = s.id
WHERE s.repositoryId = '<REPLACE_WITH_YOUR_REPO_ID>'
  AND f.active = true
GROUP BY s.branch, s.id, f.scanner
ORDER BY s.branch, s.createdAt DESC;
```

**Expected result (for your case):**
```
branch       | scanner   | findings_count
-------------|-----------|----------------
feature/auth | semgrep   | 12
feature/auth | gitleaks  | 5
feature/auth | flawfinder| 5
main         | semgrep   | 8
main         | gitleaks  | 5
main         | flawfinder| 3
```

If you're seeing 88, the numbers will be much different.

---

## Query 7: Find Orphaned AI Verifications

```sql
SELECT 
  av.id as av_id,
  av.findingId,
  av.verdict,
  av.confidence,
  f.id as finding_id,
  f.active as finding_active,
  CASE WHEN f.id IS NULL THEN 'ORPHANED' ELSE 'OK' END as status
FROM ai_verifications av
LEFT JOIN findings f ON av.findingId = f.id
WHERE f.id IS NULL OR f.active = false
ORDER BY av.createdAt DESC;
```

**What to look for:**
- Orphaned AI verifications (finding is inactive or deleted)
- If many, this explains why verdict counts don't match finding counts

---

## Query 8: Compare Findings Between Manual and CI/CD Scans

```sql
WITH branch_findings AS (
  SELECT 
    fg.fingerprint,
    fg.title,
    f.scanner,
    STRING_AGG(DISTINCT s.origin, ', ') as origins,
    COUNT(DISTINCT s.id) as scan_count,
    MAX(f.createdAt) as latest_created
  FROM findings f
  INNER JOIN finding_groups fg ON f.groupId = fg.id
  INNER JOIN scans s ON f.scanId = s.id
  WHERE s.repositoryId = '<REPLACE_WITH_YOUR_REPO_ID>'
    AND s.branch = 'feature/auth'
    AND f.active = true
  GROUP BY fg.fingerprint, fg.title, f.scanner
)
SELECT 
  fingerprint,
  title,
  scanner,
  origins,
  scan_count,
  CASE 
    WHEN scan_count > 1 THEN '⚠️ DUPLICATE (found in multiple scans!)'
    ELSE '✅ OK'
  END as status
FROM branch_findings
ORDER BY scan_count DESC, fingerprint;
```

**What to look for:**
- If `scan_count > 1`, same finding found in multiple scans (not deduplicated)
- This would explain duplicates

---

## Query 9: Total Count by Status

```sql
SELECT 
  f.status,
  COUNT(*) as count
FROM findings f
WHERE repositoryId IN (
  SELECT id FROM repositories WHERE name = '<REPLACE_WITH_REPO_NAME>'
)
GROUP BY f.status;
```

This shows distribution of statuses.

---

## Next Steps

1. **Run Query 1** first → Shows total summary
2. **Run Query 2** → Shows per-scan breakdown
3. **Run Query 3** → Shows duplicate findings (if any)
4. **Run Query 6** → Shows scanner breakdown

From these results, you'll know if:
- ✅ Findings are correctly deduplicated → Numbers should add up
- ❌ Findings are duplicated → You'll see multiple scans with same findings
- ❌ Multiple scanners are creating duplicates → You'll see same fingerprint with different scanners

Share the output of these queries and I can help pinpoint the exact bug!

---

## Quick Debug Checklist

```
[ ] Run Query 1 → Total per branch
[ ] Run Query 2 → Per-scan breakdown
[ ] Run Query 3 → Duplicate findings
[ ] Run Query 6 → Scanner breakdown
[ ] Check if active_findings matches expected (22 + 16)
[ ] Check if there are scans you don't remember triggering
[ ] Check logs: grep "replaceFindingsForScanJob" (see dedup counts)
[ ] Check if "previousActiveCount" is 0 when should be > 0
```
