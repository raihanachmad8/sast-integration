# ⚠️ PENTING: Clarification tentang AI Verification - Skip vs Re-verify

## Pertanyaan Anda
> "Jadi ketika sudah ada finding lalu di review lalu di scan lagi yang lama hilang atau gmana intinya? Dan apakah perlu AI verification lagi dan lagi?"

Jawaban singkat: **TIDAK ADA LOGIC UNTUK SKIP AI!** Dokumentasi sebelumnya **MISLEADING**.

---

## Keadaan SEBENARNYA di Codebase

### Current Flow (tidak ada skip):

```typescript
// parse-scan-result.job.ts L115-155

// Step 1: Create findings with dedup (replaces old active findings)
const findingResult = await findingService.replaceFindingsForScanJob(
  projectId, 
  scanId, 
  enrichedFindings, 
  repositoryId
);
const createdFindings = findingResult.findings ?? [];
// → Returns: array of NEWLY CREATED finding records (f_003, f_004, etc.)

// Step 2: Auto-trigger AI verification for EVERY finding
for (const finding of createdFindings) {
  if (!finding.id) continue;
  
  // ENQUEUE AI JOB — NO CHECK IF ALREADY VERIFIED!
  await enqueue('ai-verify-finding', {
    findingId: finding.id,
    scanId,
    modelId: model.id,
    workspaceId,
  }, {
    retryLimit: 5,
    retryDelay: 30,
  });
}
```

**TIDAK ADA LOGIC:**
```typescript
// This code does NOT exist:
const existingVerification = await aiVerificationRepository.findLatestByFinding(finding.id);
if (existingVerification) {
  continue;  // SKIP AI
}
```

### Artinya?

```
SCAN 1 (May 1):
  Finding SQL-1 (fp_sql):
    → f_001 created
    → AI Job queued → TP verified, confidence=95%
    → Stored in ai_verifications table

SCAN 2 (May 2): Same code, same fingerprint
  Finding SQL-1 (fp_sql):
    → f_001 marked as superseded (inactive)
    → f_002 created (NEW finding record)
    → AI Job QUEUED AGAIN ← ⚠️ WASTEFUL!
    → Will run LLM verification AGAIN
    → Result stored in NEW ai_verifications record
    → Two verdicts now exist for different finding records!
```

---

## Database State Setelah Scan 2

```
findings table:
┌─────────┬────────┬───────────┬─────────┬──────────┐
│ id      │ groupId│ active    │ scanner │ createdAt│
├─────────┼────────┼───────────┼─────────┼──────────┤
│ f_001   │ fg_sql │ false     │ semgrep │ May 1    │ ← OLD
│ f_002   │ fg_sql │ true      │ semgrep │ May 2    │ ← NEW
└─────────┴────────┴───────────┴─────────┴──────────┘

ai_verifications table:
┌─────────────┬───────────┬─────────┬──────────┐
│ id          │ findingId │ verdict │ createdAt│
├─────────────┼───────────┼─────────┼──────────┤
│ av_001      │ f_001     │ TP      │ May 1    │ ← From Scan 1
│ av_002      │ f_002     │ TP      │ May 2    │ ← From Scan 2 (DUPLICATE!)
└─────────────┴───────────┴─────────┴──────────┘
```

**Problem:**
- f_001 (old, inactive) has verdict from Scan 1
- f_002 (new, active) has verdict from Scan 2
- UI shows f_002 with av_002 verdict
- av_001 becomes "orphaned" (old finding is inactive)

---

## Apa yang Terjadi Saat User Review Finding

### Timeline:

```
SCAN 1 (May 1):
  f_001 created, av_001 verified: TP
  
USER REVIEW (May 5):
  Opens UI → sees f_001 verdict: TP
  Says: "Actually, this is false positive"
  Clicks: "Mark as False Positive"
  
  Backend:
    UPDATE findings SET status='false_positive' WHERE id='f_001'
    
SCAN 2 (May 10): Developer pushes new code
  f_001 marked as superseded (active=false)
  f_002 created (active=true, status='open')  ← DEFAULT status!
  AI Job queued for f_002
  
  av_001 still says: "TP" (not transferred!)
  av_002 says: "TP" (newly verified)
  
UI SHOWS:
  f_002 (current): TP, pending review ← User has to review AGAIN!
  
⚠️ USER'S PREVIOUS REVIEW IS LOST!
```

---

## Apa yang SEBENARNYA Terjadi pada Old Finding

### f_001 (Old Finding)

```
Before Scan 2:
  id: f_001
  active: true
  status: 'false_positive' ← User marked it
  groupId: fg_sql

After Scan 2:
  id: f_001
  active: false              ← Marked as inactive
  status: 'false_positive'   ← Status PRESERVED
  groupId: fg_sql

UI Behavior:
  - f_001 NOT shown in findings list (active=false)
  - Hidden in UI, but exists in database
  - Dashboard shows: "1 new finding" (f_002)
  - User doesn't see f_001 anymore
  
⚠️ User's review of f_001 is effectively IGNORED for f_002
```

### Masalahnya:

1. **Status tidak ditransfer** ke finding baru
   - f_001 status='false_positive'
   - f_002 status='open' (default)
   - User review lost!

2. **Verdicts tidak saling terhubung**
   - av_001 belongs to f_001
   - av_002 belongs to f_002
   - They don't know about each other

3. **AI always re-runs**
   - No check: "Has this fingerprint been verified before?"
   - Always enqueue new AI job
   - Wasteful!

4. **User sees duplicate work**
   - First scan: "Mark as FP"
   - Second scan: "Oh, finding new finding!" (same issue)
   - User: "I already reviewed this!"

---

## Solution yang SEHARUSNYA Ada

### Option 1: Transfer Status to New Finding

```typescript
// finding.service.ts - replaceFindingsForScanJob

async replaceFindingsForScanJob(projectId, scanId, inputs, repositoryId) {
  // ... dedup logic ...
  
  // NEW CODE:
  for (const [fingerprint, input] of incomingFingerprints.entries()) {
    // Check if this fingerprint was reviewed before
    const previousGroup = await findingRepository.findByGroupIdAndFingerprint(
      groupId, 
      fingerprint
    );
    
    if (previousGroup && previousGroup.status !== 'open') {
      // Transfer user's previous review!
      input.status = previousGroup.status;
    }
  }
  
  // Insert findings with transferred status
  const created = await findingRepository.createMany(findingsToInsert, tx);
}
```

Result:
```
Before: f_001 status='false_positive'
After:  f_002 status='false_positive' ← INHERITED!
        User doesn't have to review again
```

### Option 2: Skip AI if Already Verified

```typescript
// parse-scan-result.job.ts

for (const finding of createdFindings) {
  // NEW CODE:
  const group = await findingRepository.findById(finding.groupId);
  const groupFinding = await aiVerificationRepository.findLatestByGroup(group.id);
  
  if (groupFinding && groupFinding.confidence > 80) {
    // Skip AI, already high-confidence verified
    logger.info('Skipping AI: already verified', { 
      findingId: finding.id, 
      confidence: groupFinding.confidence 
    });
    continue;
  }
  
  // Otherwise queue AI
  await enqueue('ai-verify-finding', { findingId: finding.id, ... });
}
```

Result:
```
Scan 1: f_001 → AI queued → TP, confidence=95%
Scan 2: f_002 → AI SKIPPED (already verified) ← Cost savings!
        User sees: "TP (verified 10 days ago)"
```

### Option 3: Link Findings via Groups

```typescript
// finding.service.ts

class FindingGroup {
  id: string;
  fingerprint: string;
  latestVerdict?: string;      // ← NEW
  latestConfidence?: number;   // ← NEW
  lastReviewStatus?: string;   // ← NEW
}

// When creating new finding:
const group = await findingRepository.findOrCreateFindingGroup(...);

// Check group history
if (group.lastReviewStatus) {
  newFinding.status = group.lastReviewStatus;  // Inherit review
}

// AI verification queries group, not individual finding
const verification = await aiVerificationRepository.getLatestByGroup(group.id);
if (verification?.confidence > 80) {
  // Skip verification
}
```

---

## Perbandingan: Current vs Proposed

### Current (WASTEFUL):

```
Scan 1 (May 1):   SQL-1 found
                  → f_001 created
                  → AI verified: TP
                  → User marks: FP
                  
Scan 2 (May 2):   SQL-1 found (same code)
                  → f_001 marked inactive
                  → f_002 created (NEW, status='open')
                  → AI verified AGAIN: TP ← WASTEFUL!
                  → User sees: "New finding, please review"
                  → User: "Why am I reviewing this again?!"
                  
Cost: 2x AI verification calls (wasteful)
UX: Bad (duplicate work)
```

### Proposed (SMART):

```
Scan 1 (May 1):   SQL-1 found
                  → f_001 created
                  → AI verified: TP
                  → User marks: FP
                  → finding_group.lastReviewStatus = 'false_positive'
                  
Scan 2 (May 2):   SQL-1 found (same fingerprint)
                  → f_001 marked inactive
                  → f_002 created (NEW, status='false_positive') ← INHERITED!
                  → AI verification: SKIPPED ← No re-verify!
                  → User sees: "FP (previously marked)" in list
                  → User: "Good, it remembered"
                  
Cost: 1x AI verification call (saved 50%)
UX: Good (honors user review)
```

---

## Current Code Analysis

### What DOES transfer:

```typescript
// finding.service.ts L78

const groupMap = await findingRepository.findOrCreateFindingGroups(
  projectId, 
  repositoryId, 
  fingerprintEntries, 
  tx
);

// ✅ finding_group is reused (same groupId)
// ✅ firstSeenAt/lastSeenAt updated
// ❌ But user's review status NOT transferred!
```

### What DOESN'T transfer:

```typescript
// No code like this exists:
const previousFinding = await findingRepository.findLatestByGroup(groupId);
if (previousFinding.status !== 'open') {
  newFinding.status = previousFinding.status;  // ← THIS IS NOT DONE!
}

// No code like this either:
const existingVerdict = await aiVerificationRepository.findByGroup(groupId);
if (existingVerdict.confidence > threshold) {
  skipAiVerification();  // ← THIS IS NOT DONE!
}
```

---

## Real-World Impact

### Scenario 1: Security Team Reviews PRs

```
PR #1 (May 1):
  Scan found: 5 security issues
  Team reviewed: All marked as "false_positive" (they're OK with code)
  Status: ✅ PR merged
  
PR #2 (May 3):
  Developer pushed new code
  Scan found: SQL-1, XSS-1, Auth-1
  (same code from PR #1, they didn't change those lines)
  
  New findings (unnecessary):
  ❌ SQL-1 "false_positive" from PR #1 → NOW shows as "new finding"
  ❌ XSS-1 "false_positive" from PR #1 → NOW shows as "new finding"
  ❌ Auth-1 "false_positive" from PR #1 → NOW shows as "new finding"
  
  AI Verification (unnecessary):
  ❌ Re-verify SQL-1 (already verified as FP)
  ❌ Re-verify XSS-1 (already verified as FP)
  ❌ Re-verify Auth-1 (already verified as FP)
  
  Cost: 3x unnecessary AI calls
  UX: "Why are these appearing again?"
```

### Scenario 2: False Positive Handling

```
Scan 1: Finding "potential security issue"
  → AI verifies: TP, confidence=92%
  → User reviews: "Actually, this is safe code"
  → Status: false_positive
  
Scan 2: Same code still present
  → f_001 superseded, f_002 created
  → Status reset to 'open' ← LOST USER'S REVIEW!
  → AI re-verifies: TP, confidence=92%
  → Quality gate: "New HIGH TP finding!" → Gate FAILS
  → PR BLOCKED by same false positive!
```

---

## Kesimpulan

### TRUTH tentang Current Implementation:

1. ✅ **Finding groups PERSIST** (same groupId across scans)
2. ✅ **Finding groups track history** (firstSeenAt, lastSeenAt)
3. ❌ **But user reviews do NOT transfer** to new findings
4. ❌ **AI is ALWAYS re-verified** (no skip logic)
5. ❌ **Each scan = new finding records** = duplicate work

### Jawabannya ke Pertanyaan Anda:

**Q: "Finding lama hilang atau gimana?"**
- A: **Lama tidak hilang, tapi di-mark inactive** (active=false)
- A: **Hidden from UI, but still exists in database**

**Q: "Perlu AI verification lagi dan lagi?"**
- A: **Ya! Setiap scan, AI di-queue ulang**
- A: **Tidak ada logic untuk skip** (walau documentation bilang ada)
- A: **Wasteful, but currently working as-is**

**Q: "Intinya?"**
- A: **Finding group persists (good), but verdicts don't (bad)**
- A: **User review lost when finding re-detected**
- A: **Better solution: transfer status + skip AI when high-confidence**

---

## Recommendations untuk Improvement

### Priority 1: Transfer Status

```typescript
// When creating new findings with same fingerprint
// Transfer user's previous review to new finding
newFinding.status = previousFinding.status;
```

### Priority 2: Smart AI Skip

```typescript
// Before enqueue AI job
const recentVerification = await getLatestByGroup(groupId);
if (recentVerification?.confidence > 85 && recentVerification.createdAt > 7days) {
  // Skip AI, reuse verdict
} else {
  // Queue AI job
}
```

### Priority 3: Show History

```typescript
// In UI, show finding history
finding.previousStatus = 'false_positive';
finding.previousReviewedBy = 'user@example.com';
finding.previousReviewedAt = '2026-05-01';
```
