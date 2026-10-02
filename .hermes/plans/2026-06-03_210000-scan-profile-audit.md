# Audit: Scan Profile Feature — FE → BE Gap Analysis

**Date:** 2026-06-03
**Status:** AUDIT COMPLETE — action items below

---

## 1. Feature Overview

**Scan Profile** defines reusable scanning configurations: which scanners to run, severity thresholds, AI verification settings, and timeout limits. These profiles are attached to repositories or schedules for managed SCM scanning.

**Flow:**
```
User creates profile → Profile stored in scan_profiles table
  → Attached to schedules (schedules.profile_id FK)
  → Attached to scans (scans.profile_id FK)
  → When scan triggered, profile config drives scanner execution
```

**Related Features:**
- **Schedules** — uses profile_id to know which config to apply
- **Scans** — stores profile_id for audit trail
- **New Scan Modal** — user picks a profile when starting a scan
- **Managed Scan Service** — reads profile to determine scanners, timeout, AI settings
- **Quality Gates** — evaluates findings against profile severity thresholds

---

## 2. Data Shape Comparison

### DB Schema (scan_profiles table)
| Column              | Type         | Default      |
|---------------------|--------------|--------------|
| id                  | uuid (PK)    | gen_random   |
| workspace_id        | uuid         | —            |
| name                | varchar(255) | NOT NULL     |
| profile             | varchar(20)  | 'standard'   |
| scanners            | jsonb        | NOT NULL     |
| ai_verification     | varchar(20)  | 'enabled'    |
| severity_threshold  | varchar(20)  | 'medium'     |
| timeout_seconds     | integer      | 300          |
| max_findings        | integer      | 2000         |
| created_at          | timestamp    | now()        |
| updated_at          | timestamp    | now()        |

### Backend Schema (Zod: createScanProfileSchema)
| Field            | Type/Enum                              | Default      |
|------------------|----------------------------------------|--------------|
| name             | string (1–255)                         | required     |
| profile          | 'standard' \| 'strict' \| 'custom'    | 'standard'   |
| scanners         | string[] (min 1, validated)            | required     |
| aiVerification   | 'enabled' \| 'disabled'                | 'enabled'    |
| severityThreshold| 'low' \| 'medium' \| 'high' \| 'critical' | 'medium'  |
| timeoutSeconds   | int (1–3600)                           | 300          |
| maxFindings      | int (1–10000)                          | 2000         |

### Frontend API Type (modules/scan-profiles/api.ts)
| Field            | Type                                  | Notes        |
|------------------|----------------------------------------|--------------|
| id               | string                                 |              |
| name             | string                                 |              |
| description      | string                                 | ⚠️ NOT IN DB |
| scanners         | string[]                               |              |
| aiVerification   | boolean                                | ⚠️ DB uses string |
| severityThreshold| 'critical'\|'high'\|'medium'\|'low'   |              |
| enabled          | boolean                                | ⚠️ NOT IN DB |
| createdAt        | string                                 |              |

### Frontend Form (ProfileModals.tsx)
| Field    | Form Type        | Values Sent         |
|----------|------------------|---------------------|
| name     | Input            | string              |
| profile  | Select           | 'Quick'\|'Standard'\|'Comprehensive' |
| scanners | Multi-Select     | 'Semgrep'\|'Gitleaks'\|'Flawfinder'\|'CodeQL' |
| ai       | Select           | 'Enabled'\|'Critical only'\|'Disabled' |
| severity | Select           | 'Low+'\|'Medium+'\|'High+'\|'Critical only' |

---

## 3. GAP ANALYSIS

### ❌ GAP 1: `profile` field values mismatch

| Layer        | Values                                   |
|--------------|------------------------------------------|
| DB default   | 'standard'                               |
| Zod schema   | 'standard', 'strict', 'custom'           |
| Frontend form| 'Quick', 'Standard', 'Comprehensive'     |

**Problem:** Frontend sends TitleCase ('Quick'), Zod expects lowercase ('standard'). The `profile` field in the form is also semantically wrong — it's being used as a "tier" label, not the actual profile type. The form value 'Quick' will NOT pass Zod validation.

**Impact:** Create/update will fail with Zod validation error if `profile` field is sent.

### ❌ GAP 2: `ai` field naming mismatch

| Layer        | Field Name      | Values                    |
|--------------|-----------------|---------------------------|
| DB           | ai_verification | 'enabled' / 'disabled'    |
| Zod schema   | aiVerification  | 'enabled' / 'disabled'    |
| Frontend form| ai              | 'Enabled' / 'Critical only' / 'Disabled' |

**Problem:** 
1. Frontend field name `ai` ≠ backend `aiVerification`
2. Frontend has 3 values ('Enabled', 'Critical only', 'Disabled') but schema only accepts 2 ('enabled', 'disabled')
3. 'Critical only' has no backend equivalent

**Impact:** 'Critical only' will fail validation. 'Enabled'/'Disabled' need case conversion.

### ❌ GAP 3: `severity` field naming mismatch

| Layer        | Field Name        | Values                            |
|--------------|-------------------|-----------------------------------|
| DB           | severity_threshold| 'low' / 'medium' / 'high' / 'critical' |
| Zod schema   | severityThreshold | 'low' / 'medium' / 'high' / 'critical' |
| Frontend form| severity          | 'Low+' / 'Medium+' / 'High+' / 'Critical only' |

**Problem:**
1. Frontend field name `severity` ≠ backend `severityThreshold`
2. Frontend values have '+' suffix ('Low+') and different format ('Critical only')
3. No case normalization

**Impact:** All severity values will fail Zod validation.

### ❌ GAP 4: `scanners` values mismatch

| Layer        | Values                                              |
|--------------|-----------------------------------------------------|
| DB           | jsonb array (any strings)                           |
| Zod schema   | Validated against SUPPORTED_SCANNERS constant        |
| Frontend form| 'Semgrep', 'Gitleaks', 'Flawfinder', 'CodeQL'      |

**Problem:** Need to verify if 'CodeQL' is in SUPPORTED_SCANNERS. Also need to check if scanner names are case-sensitive in the backend.

### ❌ GAP 5: Frontend API type has fields not in DB

| Frontend Field   | In DB? | Notes                    |
|------------------|--------|--------------------------|
| description      | ❌      | Not a column in scan_profiles |
| enabled          | ❌      | Not a column in scan_profiles |
| aiVerification   | ⚠️     | DB uses 'ai_verification' (string), FE uses boolean |

**Problem:** Frontend type doesn't match DB schema. `enabled` and `description` don't exist in the database. The `mapProfile()` function in page.tsx derives `isDefault` from `enabled`, but `enabled` is never stored.

### ❌ GAP 6: Missing `timeoutSeconds` and `maxFindings` in form

| Layer        | timeoutSeconds | maxFindings |
|--------------|----------------|-------------|
| DB           | ✅ (300)        | ✅ (2000)    |
| Zod schema   | ✅              | ✅           |
| Frontend form| ❌ NOT IN FORM  | ❌ NOT IN FORM|

**Problem:** Users cannot configure timeout or max findings from the UI. These are always default values.

### ❌ GAP 7: Page function name mismatch

The page file exports `ScanPoliciesPage` (old naming) but the route is `scan-profiles`. Should be `ScanProfilesPage`.

---

## 4. References to Other Features

| Feature            | How it uses Scan Profile |
|--------------------|--------------------------|
| **Schedules**      | `schedules.profile_id` FK — profile config drives scheduled scans |
| **Scans**          | `scans.profile_id` FK — audit trail of which profile was used |
| **New Scan Modal** | User selects a profile when triggering a manual scan |
| **Managed Scan**   | Reads profile to determine scanners, timeout, AI settings |
| **Quality Gates**  | Evaluates findings against profile severity thresholds |
| **Repositories**   | Can have a default profile attached |

---

## 5. Action Items

### Priority 1 — Fix Form/Schema Value Mismatch (Blocks CRUD)

1. **Align form values with Zod schema:**
   - `profile` field: change form options to `'standard'`, `'strict'`, `'custom'` (lowercase)
   - `ai` field: rename to `aiVerification`, change options to `'enabled'`/`'disabled'`
   - `severity` field: rename to `severityThreshold`, change options to `'low'`/`'medium'`/`'high'`/`'critical'`

2. **Add 'Critical only' → 'critical' mapping** if we want to keep the user-friendly label in the form (use a mapping object).

3. **Verify SUPPORTED_SCANNERS** includes 'CodeQL' or remove it from form options.

### Priority 2 — Fix Frontend API Type

4. **Update `ScanProfile` interface** in `modules/scan-profiles/api.ts` to match DB:
   - Remove `description` and `enabled` (or add DB columns if needed)
   - Change `aiVerification: boolean` → `aiVerification: string`
   - Add `timeoutSeconds` and `maxFindings`

5. **Fix `mapProfile()`** in page.tsx to work with correct field names.

### Priority 3 — Add Missing Form Fields

6. **Add `timeoutSeconds` and `maxFindings`** to Create/Edit modals (optional but useful for advanced users).

### Priority 4 — Naming Cleanup

7. **Rename `ScanPoliciesPage`** → `ScanProfilesPage` in page.tsx.

---

## 6. Files to Change

| File | Change |
|------|--------|
| `src/features/scan-profiles/ProfileModals.tsx` | Fix form field names, options, initial values |
| `src/modules/scan-profiles/api.ts` | Fix ScanProfile interface, mock data |
| `src/app/(authenticated)/[workspace]/scan-profiles/page.tsx` | Fix mapProfile(), rename function |
| `src/commons/schemas/scan-profile.ts` | (optional) Add 'Critical only' mapping |

## 7. Verification

- [ ] Create a scan profile via form → check DB has correct values
- [ ] Edit a scan profile → values load correctly in form
- [ ] Template selection → creates profile with correct values
- [ ] Profile appears in New Scan Modal dropdown
- [ ] Scheduled scan uses profile config correctly
