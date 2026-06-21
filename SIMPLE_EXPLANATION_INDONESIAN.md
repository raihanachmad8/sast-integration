# 🎯 SIMPLE EXPLANATION (Bahasa Sederhana)

## Pertanyaan Anda

> Branch main → ada commit, dia scan. Lalu ada PR dia scan. Di PR ada commit baru. Mau fix atau memperbaiki yang lama atau menambah karena file kurang atau hal lain. Di manakah letak comment paling okay? Di inline PR langsung atau gmana?

---

## Jawaban SINGKAT

**Kommentar sebaiknya di DUA tempat:**

1. **PR Summary Comment** (1 komentar saja, di PR tab utama)
   - Otomatis dipost oleh system
   - Berisi: Total findings, berapa critical, berapa high, etc
   - **REPLACE** komentar sebelumnya (jangan numpuk)
   
2. **Inline Comment** (hanya untuk CRITICAL findings saja)
   - Di file → right at the code line
   - Hanya critical findings yang penting
   - Jangan semua findings (terlalu berisik)

3. **Dashboard** (untuk diskusi mendalam)
   - Jika tim security perlu diskusi
   - History lengkap, siapa fix apa

---

## Gambaran Scope (Paling Gampang)

```
MAIN BRANCH:
  Commit A (abc123) 
  → Scan: 20 findings
  → Store: branch='main'

PR BRANCH (misalnya feature/auth):
  Commit X (ghi789)
    → Scan: 22 findings
    → Comments: 1 PR summary + 2 inline (critical only)
    → DB check: Apakah 22 ini semua NEW? Atau ada yang sama dengan main?
    → Dedup check: CARI findings dari repo yang SAMA + scanner SAMA - tapi BUKAN dari scan ini!
    
  Commit X+1 (jkl012) - developer fix 1 issue
    → Scan: 21 findings (1 berkurang!)
    → Dedup check: CARI findings dari SCAN X saja (bukan scan ini!)
    → Result: 17 persistent + 2 new + 1 resolved (fixed)
    → Comments: UPDATE PR summary + UPDATE inline comment (✅ Fixed!)
    
  Commit X+2 (mno345) - add new file
    → Scan: 25 findings (4 bertambah!)
    → Dedup check: CARI findings dari SCAN X+1 saja
    → Result: 17 persistent + 4 new + 0 resolved
    → Comments: UPDATE PR summary + 4 inline (baru)
```

---

## Di Mana Dedup Terjadi?

### **BENAR ✅**
```
Cari findings dari:
  - Repository SAMA
  - Scanner SAMA
  - Active = TRUE
  - BUKAN dari scan ini (EXCLUDE current scan!)
  
Misal:
  SELECT * FROM findings 
  WHERE repositoryId='repo_1'
  AND scanner='semgrep'
  AND active=true
  AND scanId != 'current_scan_id'  ← PENTING!
```

### **SALAH ❌ (Current Code)**
```
Cari findings dari:
  - Repository SAMA
  - Scanner SAMA
  - Active = TRUE
  - FROM scan ini (INCLUDE current scan!)
  
Hasilnya: TIDAK ketemu apa-apa! (karena belum insert ke DB)

SQL yang salah:
  SELECT * FROM findings 
  WHERE repositoryId='repo_1'
  AND scanner='semgrep'
  AND scanId = 'current_scan_id'  ← INI SALAH!
  → Result: 0 (belum ada di DB untuk scan ini!)
```

---

## Kenapa Jadi 88?

**Scenario:**
- Manual scan di branch: 22 findings
- CI/CD scan di branch: 16 findings
- Total seharusnya: ~22 (deduplicated) atau maks 38 (gabung)
- Actual: 88 ❌

**Kemungkinan:**
```
Cause 1: Query juga include INACTIVE findings
  22 active + 22 inactive (dari rerun) + 16 active + 16 inactive = 76 ≈ 88!

Cause 2: Cross-branch query
  Main branch: 10 findings (active) + 10 (inactive)
  Feature branch: 22 (active) + 22 (inactive) + 16 (active) = 60
  Total: 30 + 60 = 90 ≈ 88!

Cause 3: Scan triggered multiple times
  Semua scan ran 2x = double count
```

---

## Comment Placement - Tabel Simple

| Finding | Inline? | PR Summary? | Dashboard? | Contoh |
|---------|---------|-------------|-----------|--------|
| NEW CRITICAL | ✅ YES | ✅ YES | ✅ YES | "Hardcoded secret di line 50" |
| NEW HIGH | ✅ YES | ✅ YES | ❓ Maybe | "SQLi di line 100" |
| NEW MEDIUM | ❌ NO | ✅ YES | ❌ NO | "Count in summary, no inline" |
| PERSISTENT | ❌ NO | ✅ YES | ✅ YES | "Track, tapi no new inline" |
| FIXED ✅ | ✅ UPDATE | ✅ YES | ✅ YES | "Add ✅ mark" |

---

## Comment Flow: 3 Commits

### **Commit 1 (ghi789): Awal**

```
SCAN: 22 findings

Database Status:
  findings table: 22 rows, all active=true

Comment Posted:
  1x PR Summary:
    "🔴 22 findings detected
     - 2 CRITICAL
     - 8 HIGH
     - 12 MEDIUM"
  
  2x Inline Comments:
    Line 50: "🔴 CRITICAL: Hardcoded secret"
    Line 100: "🔴 CRITICAL: SQLi vulnerability"

Total: 3 comments
```

### **Commit 2 (jkl012): Dev Fix 1 Issue**

```
SCAN: 21 findings (1 less!)

Database Status:
  findings table: 22 old (active=false) + 21 new (active=true)

Dedup Logic:
  Previous findings: 22 (from scan 1)
  Current findings: 21 (from scan 2)
  Match: 20 are SAME → persistent
  New: 1 is NEW
  Gone: 1 is RESOLVED (fixed!)

Comment Updates:
  1x PR Summary: REPLACE previous
    "✅ Progress! 21 findings
     - Fixed: 1 (SQLi)
     - New: 0"
  
  1x Inline Update (on the fixed one):
    "✅ FIXED in this commit!"

Total: 2 comments (1 replaced + 1 updated)
```

### **Commit 3 (mno345): Add New File**

```
SCAN: 25 findings (4 more!)

Database Status:
  findings table: 42 old (active=false) + 25 new (active=true)

Dedup Logic:
  Previous findings: 21 (from scan 2)
  Current findings: 25 (from scan 3)
  Match: 17 are SAME → persistent
  New: 4 are NEW (from new file!)
  Gone: 0

Comment Updates:
  1x PR Summary: REPLACE previous
    "⚠️ 4 NEW findings in new file!
     25 total findings"
  
  4x Inline Comments (new findings only):
    Line 1: "New finding A"
    Line 2: "New finding B"
    Line 3: "New finding C"
    Line 4: "New finding D"

Total: 5 comments (1 replaced + 4 new inline)
```

---

## Final Count

```
Commit 1: 3 comments
Commit 2: 2 comments
Commit 3: 5 comments
───────────────────
Total: 10 comments (NOT 88!)

vs

Findings:
Commit 1: 22 findings
Commit 2: 21 findings
Commit 3: 25 findings
───────────────────
Total: 68 findings (cumulative)
```

---

## The 3 Dedup Levels (Bahasa Gampang)

### **Level 1: Dalam Satu Parser (Per-Parser Dedup)**

```
Semgrep output raw: [SQL1, SQL2, SQL1-duplicate, Sec1]
After dedup: [SQL1, SQL2, Sec1]

Di-handle oleh: seenFingerprints = new Map()
File: finding.service.ts line 35
```

### **Level 2: Across Scans, Same Branch (The Bug!)**

```
Scan 1 (Semgrep): [SQL1, SQL2, Sec1]  → Create findings
Scan 2 (Semgrep): [SQL1, SQL2, SQL3]  → Find previous?

Current code SALAH:
  Query WHERE scanId = 'scan_2' AND scanner='semgrep'
  → Result: 0 (belum ada di DB!)
  → Create semua: [SQL1, SQL2, SQL3]
  → Total: 6 findings (should be 3 unique + 1 new)

SHOULD BE:
  Query WHERE scanId != 'scan_2' AND scanner='semgrep'
  → Result: [SQL1, SQL2, Sec1]
  → Compare: SQL1=match, SQL2=match, Sec1=gone, SQL3=new
  → Result: Create only SQL3
  → Total: 3 unique + 1 new = 4 findings
```

### **Level 3: Cross-Branch (Not Implemented)**

```
Main branch: SQL1 at line 50 = fixed
Feature branch: SQL1 at line 50 = still exists (new code)

Should be DIFFERENT because:
  - Different branches = different codebases
  - But same fingerprint = same dedup group

Current code: No filtering by branch!
  → Might dedup incorrectly across branches

Solution: Add branch check in query
  AND scan.branch = current_branch
```

---

## Kesimpulan: Jawaban Anda

**Di mana letak comment paling OK?**

```
✅ BEST PRACTICE:

1. PR Summary Comment (1x, auto-update per scan)
   - Location: PR conversation tab
   - Update: REPLACE (jangan numpuk)
   
2. Inline Comments (hanya CRITICAL findings)
   - Location: File changes tab, at code line
   - Update: Add ✅ when fixed
   
3. Dashboard Threads (optional, untuk team discussion)
   - Location: Dashboard > Finding > Discussion
   - Update: For decisions, remediation

❌ DON'T DO:
- Inline comment untuk setiap finding (too noisy)
- Dashboard only (dev tidak lihat)
- Jangan comment di semua findings
```

**Untuk kasus Anda (22 → 21 → 25):**
- Commit 1: 3 comments (1 summary + 2 inline critical)
- Commit 2: 2 comments (update summary + update inline ✅)
- Commit 3: 5 comments (update summary + 4 inline new)
- **Total: 10 comments (healthy, not 88!)**

---

## Implementasi Sekarang

```typescript
// Step 1: Fix repository method
async listActiveFindingsByRepositoryAndScanner(
  repositoryId: string,
  scanner: string,
  excludeScanId?: string  // ← KEY: EXCLUDE current!
) {
  // Query findings where scanId != current
}

// Step 2: Update service call
const previousActiveFindings = await findingRepository
  .listActiveFindingsByRepositoryAndScanner(
    repositoryId,
    scannerName,
    scanId  // ← Pass current scan to EXCLUDE
  );

// Step 3: Log for visibility
logger.scan.info('replaceFindingsForScanJob', {
  incomingCount: inputs.length,
  previousActiveCount: previousActiveFindings.length,  // ← Should be > 0!
  newCount: created.length,
});
```

**Result setelah fix:**
- Manual scan: 22 findings
- CI/CD scan: Dedup vs manual → hasil 16 menjadi lebih sedikit (hanya yang baru)
- Total: ~22-26 (not 88!)

