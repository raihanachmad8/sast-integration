# [feat] Quality Gate Results Display

## Objective

Wire the quality gates page to the backend API and add a results display component that shows pass/fail/warning status per scan. Currently the page is a static placeholder with no API integration.

---

## Scope

### Backend (already exists — no changes)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/quality-gates?workspaceId=xxx` | GET | Get gate config for workspace |
| `/api/v1/quality-gates` | PUT | Update gate config |
| `/api/v1/quality-gates/evaluate` | POST | Evaluate gate for a scan (returns status, findings counts) |

### Frontend (new/modified)

| # | Component | File | Detail |
|---|-----------|------|--------|
| 1 | Wire config to API | `src/app/(authenticated)/[workspace]/quality-gates/page.tsx` | Replace static form with API-backed form. Load config on mount, save on submit. |
| 2 | Gate results section | `src/features/quality-gates/GateResultsTable.tsx` | New component. Table showing recent gate evaluations: scan repo, status pill (passed/failed/warning), blocking count, pending count, evaluated date. |
| 3 | Auto-evaluate on scan complete | No UI change | The evaluate endpoint exists. Add a call after scan completion in the scan flow (or leave as manual trigger for now). |
| 4 | API client hooks | `src/modules/quality-gates/api.ts` | New file. `getConfig`, `updateConfig`, `evaluate` functions. |
| 5 | React Query hooks | `src/modules/quality-gates/queries.ts` | New file. `useQualityGateConfigQuery`, `useUpdateQualityGateMutation`. |

### UI Behavior

**Config form (existing page, wired to API)**:
- Load config on mount via `GET /api/v1/quality-gates?workspaceId=xxx`
- Toggle rows bound to `fail_on_critical`, `fail_on_high_tp`, `warn_on_pending`, `require_human_ack`
- Selects bound to `threshold`, `pending_behavior`
- Save button → `PUT /api/v1/quality-gates`

**Results section (new, below config)**:
- Table of recent evaluations (from `quality_gate_results` table)
- Columns: Repository, Scan, Status (pill), Blocking findings, Pending findings, Evaluated at
- Status pill: `passed` → teal, `failed` → red, `warning` → amber
- Empty state: "No gate evaluations yet. Results appear after scans complete."

---

## Out of Scope

- Real-time gate status updates (webhooks)
- PR comment / commit status integration
- Per-project gate overrides

---

## Acceptance Criteria

- [ ] Quality gates page loads config from API (not hardcoded)
- [ ] Toggle/select changes persist on save
- [ ] Results section shows recent evaluations in a table
- [ ] Status pill colors: passed=teal, failed=red, warning=amber
- [ ] Empty state shown when no evaluations exist
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes

---

## Technical Notes

- The `quality_gate_results` table stores: `scan_id`, `gate_id`, `status`, `blocking_findings`, `pending_findings`, `evaluated_at`
- Need a GET endpoint for results list (currently only evaluate exists) — add `GET /api/v1/quality-gates/results?workspaceId=xxx` or include results in the evaluate response
- Follow the same form pattern as `QualityGatesPage` but with API binding
- Use `summary-card` for stats: total evaluations, pass rate, fail rate

---

## Verification Plan

- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes
- [ ] Manual: page loads existing config from API
- [ ] Manual: toggle changes + save → reload → config persists
- [ ] Manual: after scan, evaluate → results section shows entry
- [ ] Manual: empty state when no evaluations

---

## Git & PR Information

**Branch:** `feature/quality-gate-results`  
**Base:** `dev`  
**Related Issue:** TBD
