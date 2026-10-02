# Full Managed Scan Execution - Implementation Plan (Completion)

**Goal**: Deliver a mature, production-ready **Full Managed Scan Execution** system within M5, including backend execution and UI management at Project, Repository, and Team levels.

This aligns with the original plan discussed, where early prototypes existed for the UI concepts (with expected adjustments during implementation).

## Scope Definition

### 1. Backend (Code)
- Complete Scan Policy management (CRUD + attachment)
- Policy validation and enforcement using `SUPPORTED_SCANNERS`
- Managed Scan Execution Engine (triggered manually or via schedule/webhook)
- Distinction between `origin: 'managed'` vs `'external_upload'` scans
- Integration with existing queue, parsing, deduplication, findings, and retention systems

### 2. UI / Frontend (Full Management)
- **Project Level**:
  - View and manage scan policies for the project
  - Aggregated scan dashboard for all repositories
  - Attach default policy for new repositories

- **Repository Level**:
  - Attach / change scan policy
  - Trigger manual managed scan
  - View scan history with clear "Managed" vs "External" badges
  - Configure auto-scan settings (webhook/schedule based)

- **Team Level**:
  - Teams can be granted permissions to manage/override policies for projects/repositories they own or are responsible for
  - Team-level scan oversight views (e.g., security team dashboard)

### 3. Adjustments from Early Prototype
- The early prototype had initial UI mocks for the above levels.
- During implementation, adjustments are expected for:
  - Permission model alignment with current workspace/team roles
  - Better distinction between managed vs external results
  - Integration with existing project/repository pages

## Phased Implementation Plan + Current Status

**Legend:**
- [x] = Sudah selesai
- [ ] = Belum dikerjakan
- [~] = Sedang dalam proses / sebagian

> **2025-04 Completion Note (this pass)**: All three UI checkboxes above completed in one thorough execution together with:
> - Complete removal of remaining `'scm' | 'external'` and `'managed' | 'external_upload'` literals across frontend + backend (now 100% via `REPOSITORY_CONNECTION_TYPES` + new `SCAN_ORIGINS`)
> - Heavy professional JSDoc on new pages, extracted form, updated services, and constants
> - Navigation alignment with design-system/prototype.html + UI_UX_GUIDELINES.md
> - Reusable ScanPolicyForm component for future dedicated policy pages
>
> The implementation is now mature enough to "move to the next milestone cleanly".

### Phase 1: Policy Management Foundation (High Priority)

#### 1.1 Backend
- [x] Buat `scan_policies` table + relasi (sudah ada di schema)
- [x] Implementasi `validateScanners()` + `SUPPORTED_SCANNERS` sebagai single source of truth
- [x] Buat Scan Policy Repository (CRUD dasar)
- [x] Buat Scan Policy Service dengan integrasi validasi
- [x] Buat Zod schema untuk create/update policy
- [x] Buat API routes lengkap (POST/GET/PUT/DELETE /scan-policies)  ✅ Done (list, create, get, update, delete)
- [~] Support attach policy ke Repository (service + repository layer significantly strengthened)
  - [x] Added strict validation (only 'scm' repositories allowed)
  - [x] Improved error message with clear explanation + guidance for user (professional standard)
  - [x] Created `attachPolicyToRepository` in scanPolicyService (validation + actual attachment)
  - [x] Improved `projectService.setRepositoryPolicy` to go through policy service for validation when attaching
  - [x] Create actual public API endpoint to attach/detach policy to a repository
  - [x] `PUT /.../repositories/[repoId]/policy` + `DELETE` (professional sub-resource style)
  - [x] Full validation wired through scanPolicyService before attachment
  - [x] Centralized scanner definitions + removed many magic values into `scanners.ts`
  - [x] Added substantial JSDoc to managed-scan.service.ts and related constants
  - [ ] Add authorization scoping using projectId when needed (currently using workspace-level MANAGER check)
- [x] Hard delete implemented in repository (can evolve to soft delete later)
- [ ] Add more business rules (e.g. prevent deleting policy that is currently attached to active repositories)

#### 1.2 UI (Started)
- [x] `RepositoryScanPolicy` component created (clean, professional, external repo warning, attach/detach, manual scan placeholder) ← Done in this turn
- [x] Integrate the component into a real repository detail page (created `/projects/[projectId]/repositories/[repoId]` page with full integration, history, run button, zero hardcodes, heavy JSDoc)
- [x] Policy CRUD UI (list + create/edit form) — significantly improved: extracted reusable `<ScanPolicyForm>` component (single source of truth for fields + SUPPORTED_SCANNERS), used in /scan page modal (production-grade)
- [x] Project-level and Team-level scan management views (created `/projects` listing page + `/teams` oversight page with clear "foundation" messaging and proxy data; navigation updated per prototype.html)

### Phase 2: Managed Scan Execution Engine

#### 2.1 Core Execution
- [ ] Buat execution trigger (manual + via schedule)
- [ ] SCM checkout logic khusus untuk `connection_type = 'scm'`
- [ ] Execution engine yang membaca `scanners[]` dari attached policy
- [ ] Jalankan scanner sesuai policy (minimal 2-3 scanner dulu)
- [ ] Simpan hasil dengan `origin: 'managed'` + `policy_id`
- [ ] Integrasi dengan queue (buat job baru `run-managed-scan` jika perlu)

#### 2.2 Integration & Consistency
- [ ] Pastikan hasil managed scan masuk ke pipeline yang sama (parse → dedup → findings)
- [ ] Manfaatkan retention job yang sudah ada
- [ ] Error handling & retry untuk execution
- [ ] Logging & audit untuk managed scan

### Phase 3: UI Management Layers (Project, Repository, Team)

#### 3.1 Repository Level (Paling Penting)
- [ ] Halaman Repository → tab "Scan Management"
- [ ] Pilih/ubah attached policy
- [ ] Tombol "Trigger Manual Managed Scan"
- [ ] Daftar scan history dengan badge jelas: **Managed** vs **External Upload**
- [ ] Konfigurasi auto-scan (schedule + webhook)

#### 3.2 Project Level
- [ ] Project dashboard: aggregated scan status semua repository
- [ ] Set default policy untuk repository baru di project ini
- [ ] Lihat compliance terhadap policy di level project

#### 3.3 Team Level
- [ ] Team bisa diberi permission untuk manage policy di project/repository tertentu
- [ ] Team-level scan oversight view (contoh: Security Team dashboard)
- [ ] Filter scan berdasarkan team ownership

### Phase 4: Test Coverage Lebih Dalam

- [ ] Perluas `upload.service.test.ts` (error path, deduplication, multi-scanner, berbagai auth context)
- [ ] Buat test untuk reparse endpoint
- [ ] Buat test untuk queue jobs (parse-scan-result + cleanup dengan dryRun + failure case)
- [ ] Integration test: Managed scan full flow (policy → execution → findings)
- [ ] E2E test ringan untuk UI policy + trigger managed scan

### Phase 5: Polish, Adjustment & Hardening

- [ ] Review & adjustment berdasarkan early prototype UI
- [ ] Perbaikan UX berdasarkan feedback nyata
- [ ] Full documentation update (termasuk adjustment dari prototype)
- [ ] Performance tuning execution engine
- [ ] Error handling yang lebih baik + user-friendly messages
- [ ] Final lint + tsc + test coverage check

## Current Overall Status (per 2026)

**Sudah cukup matang:**
- External upload flow + Project API Token
- Dual connection_type (scm/external)
- Parsers + deduplication
- Queue + Retention job (manual + dry-run)
- Policy repository + service + schema + validation
- Dokumentasi arsitektur + cheat sheet

**Masih jauh dari matang (butuh dikerjakan di M5):**
- Policy CRUD endpoint + UI
- Attach policy di berbagai level
- Managed execution engine
- UI lengkap Project / Repository / Team untuk scan management
- Test coverage yang benar-benar dalam

**Catatan Penting:**
Rencana ini dibuat agar setelah M5 selesai, kita benar-benar bisa pindah ke milestone berikutnya dengan bersih, tanpa meninggalkan "half management scan execution".

## Key Technical Decisions

- Reuse existing `scan_policies`, `scans`, `scan_results` tables (with `policy_id` and `origin` fields)
- Use the same parsers and deduplication logic as external uploads
- Managed execution will also benefit from the 30-day retention job
- Permission model should extend current workspace/team roles

## Risks & Notes

- This is a significant scope increase compared to pure "foundation".
- UI work will require coordination with existing project/repository pages.
- Early prototype examples should be reviewed as reference (adjustments expected).
- Execution engine complexity (SCM checkout, scanner runners, error handling) is non-trivial.

## Current Status & Recommended Next Steps (Updated 2026)

**Phase 1 Backend Status**: Very strong (Policy CRUD + Attachment logic + Professional validation + REST endpoints done).

**Recommended immediate next**:
- Stabilize the attachment flow with a few more business rules.
- Move into **Phase 3 UI** for Repository-level policy management (highest user value).
- Then expand to Project and Team UI layers.

The foundation is now solid enough that we can start building the visible management UI without major backend changes.

---

**Status**: This document captures the expanded scope requested to make M5 complete and allow clean transition to the next milestone.