# Dual-Flow Architecture: Managed SCM Scanning + External Uploads

**Status**: Architectural Foundation — Production Ready for External Flow  
**Last Updated**: 2026

> **This is the central reference document** for the two scanning flows, repository connection types, scanner governance via `SUPPORTED_SCANNERS`, and the foundation prepared for future managed policies.
>
> **Quick one-page reference**: [Dual-Flow Architecture Cheat Sheet](./dual-flow-architecture-cheatsheet.md)

---

## Executive Summary

This document describes support for **two different ways** teams can deliver SAST results into the platform:

1. **External / CI Upload Flow** (fully implemented)
2. **Managed SCM Flow** (foundation + schema ready, execution planned)

The key enablers are:
- `repositories.connection_type` (`'scm'` | `'external'`)
- `SUPPORTED_SCANNERS` + `validateScanners()` as single source of truth
- `scan_policies` table (with `scanners` jsonb array)
- Project API Tokens + dual auth on upload endpoint
- Hybrid storage (DB metadata + object storage for raw reports) + 30-day retention job

This document exists so future developers (or AI) don't have to piece the design together from code and old chat messages.

> **Maturity note (April 2026)**: All remaining hard-coded connection types (`'scm' | 'external'`) and scan origins (`'managed' | 'external_upload'`) have been eliminated. The UI now includes a real repository detail page, reusable policy form, project/team views, and navigation aligned to the design prototype. See plan-full-managed-scan-execution.md for the final checklist status.

## Purpose

This document explains the dual-flow architecture, with special focus on:

- Repository `connection_type` (`scm` vs `external`)
- How external repositories are auto-created
- The role of `SUPPORTED_SCANNERS` + `validateScanners()`
- Preparation for future managed `scan_policies`

This architecture was designed so that the platform can support both "we already run scanners in CI, just send us the results" teams **and** "we want the platform to run the scans for us using our SCM" teams — without forcing one model on everyone.

---

## Two Distinct Scanning Flows + Full Management UI

The platform supports two fundamentally different ways of running SAST scans, **plus full management UI** at Project, Repository, and Team levels for the managed flow.

The goal (as per the original plan and early prototype) is complete management of Scan Execution — not just triggering scans, but governing, assigning, and overseeing them at different organizational levels (Project, Repository, Team), with adjustments expected from the early prototype.

### 1. External / CI-Driven Upload Flow (Current)

- **Trigger**: External CI pipeline (GitHub Actions, GitLab CI, Jenkins, etc.)
- **Mechanism**: POST to `/api/v1/projects/{projectId}/scans/upload` with scanner report files + Project API Token
- **Characteristics**:
  - No SCM credentials required on the platform side
  - Repository can be "external" (auto-created on first upload)
  - Scanner selection is **implicit** — whatever files the CI job uploads
  - Results are parsed asynchronously via pg-boss when files are large
- **Validation**: Already implemented in [upload route](../src/app/api/v1/projects/[projectId]/scans/upload/route.ts) using `SUPPORTED_SCANNERS`

This flow was prioritized because many teams already have scanner execution in their pipelines and only need a secure way to push results.

**Repository aspect**: Repositories used in this flow have `connection_type = 'external'`. They can be auto-created on first successful upload (see `resolveOrCreateExternalRepository` in `upload.service.ts`).

### 2. Managed / Platform-Driven SCM Scanning (Full Management)

This is the **complete managed scanning capability**, including execution engine + full management UI.

**Core Execution**:
- Platform connects to repositories (connection_type = 'scm') using SCM integrations.
- Checks out code and runs scanners according to attached `scan_policy`.
- Results flow through the same parsing, deduplication, and storage pipeline.

**Full Management UI Scope** (as per original plan and early prototype):
- **Project level**: Assign policies, view aggregated scan status across all repositories in the project, manage scan schedules at project level.
- **Repository level**: Attach specific policies, trigger manual managed scans, view scan history (distinguishing managed vs external), configure auto-scan settings.
- **Team level**: Teams can have permissions over certain projects/repositories' scan policies and execution oversight (e.g., a security team managing policies for multiple projects).

The early prototype had initial UI examples for these levels. Adjustments will be needed as implementation progresses (as you noted).

**Governance**: `scan_policies` (with validated `scanners` array) are the central control point that can be attached at Project/Repository/Team scopes.

---

## Repository Connection Types (`scm` vs `external`)

This is one of the most important concepts introduced to support both flows.

### The Field

Table: `repositories`

```ts
connection_type: 'scm' | 'external'
```

- **`scm`** (default): The repository is connected to a Source Control system (GitHub App, GitLab, Gitea, etc.). The platform can:
  - Receive webhooks
  - Clone the code itself
  - Trigger scans on its own schedule (this is the future "Managed SCM Scanning" path)

- **`external`**: The repository has **no SCM connection** on the platform side. Results are only ever received via direct upload from CI pipelines. The platform never clones the code.

### Why This Design?

Previously, every repository had to be imported through an SCM integration. This created friction for teams that:
- Use private repos without wanting to install GitHub Apps
- Already run scanners in their CI and only want to centralize results
- Follow a "SonarQube DX" model (upload reports, don't give the platform git access)

By adding `connection_type`, we enabled a true dual-mode system without forcing everyone into the SCM path.

### Auto-Creation of External Repositories

When a CI job calls the upload endpoint with a new `repository_url` / `repository_name`:

```ts
// In upload.service.ts
const repository = await this.resolveOrCreateExternalRepository(...)
// ...
connectionType: 'external',
```

The system automatically creates the repository record with `connection_type = 'external'`. No manual registration needed.

This is explicitly mentioned in the upload flow documentation and the migration `0003_add_connection_type_and_upload_support.sql`.

### Relationship to Scanning Flows

| Flow                    | Typical `connection_type` | Who creates the repo record?      | Can use Managed Policies? |
|-------------------------|---------------------------|-----------------------------------|---------------------------|
| External / CI Upload    | `external`                | Auto-created on first upload      | No (not yet)             |
| Managed SCM Scanning    | `scm`                     | User imports via SCM integration  | Yes (future)             |

In the future, it is possible that a policy could also apply to `external` repositories (if someone wants to define "for this external repo, when results come in, treat them as if they followed this policy"), but the primary use case for policies is the `scm` path.

---

## Core Design Principle: Single Source of Truth for Scanners

```ts
// src/server/modules/scan/constants.ts
export const SUPPORTED_SCANNERS = [
  'semgrep',
  'cppcheck',
  'gitleaks',
  'trivy',
  'flawfinder',
  'sarif',
] as const;

export type SupportedScanner = (typeof SUPPORTED_SCANNERS)[number];
```

### Why This Matters

- Both flows must agree on what "semgrep", "flawfinder", etc. means.
- When a workspace creates a `scan_policy`, the `scanners: string[]` field **must** only contain values from this list.
- The upload API already enforces this today (see comment in code: *"both for external upload and future managed scans"*).
- Future managed scan execution engine will also rely on this list.

---

## The `validateScanners()` Guard

Located in `src/server/modules/scan/constants.ts` (re-exported via `@/commons/constants/scan`):

```ts
export function validateScanners(scanners: string[]): {
  valid: boolean;
  unsupported: string[];
}
```

### Intended Usage

| Layer                        | When to Call                              | Current Status          |
|-----------------------------|-------------------------------------------|-------------------------|
| External Upload API         | On every `/upload` request                | ✅ Implemented         |
| Scan Policy CRUD            | When creating or updating a policy        | **Not yet implemented** (foundation ready) |
| Managed Scan Execution      | Before starting a scheduled/managed scan  | Planned                |
| UI Form Validation          | When user configures a policy             | Planned                |

**Important**: The function was deliberately placed at a high level (`commons/constants`) so that the future policy service can import it without circular dependencies.

---

## Database Schema (Current State)

### `scan_policies`

```sql
scanners jsonb NOT NULL   -- e.g. ["semgrep", "gitleaks", "flawfinder"]
```

Other relevant fields (for context):
- `profile` (standard, strict, etc.)
- `ai_verification`
- `severity_threshold`
- `timeout_seconds`, `max_findings`

### Relationships

- `scans.policy_id` → `scan_policies.id`
- `schedules.policy_id` → `scan_policies.id`

This design allows one policy to be reused across multiple repositories or schedules.

---

## Architectural Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| `scanners` stored as `jsonb` array | Flexible per-workspace configuration. Avoids complex many-to-many tables for v1. |
| Validation lives in constants, not inside the policy model | Constants are the source of truth. Policy layer should only *use* validation. |
| Same `SUPPORTED_SCANNERS` for both external upload and managed policies | Prevents drift. A scanner that works via upload must also be runnable in managed mode (and vice versa). |
| `validateScanners()` returns `{valid, unsupported}` instead of throwing | Allows different layers to decide how to surface the error (HTTP 400, form validation, job failure, etc.). |
| Flawfinder + SARIF included early | Demonstrates that the list is not limited to "our" scanners. External tools and standards must be first-class citizens. |
| `repositories.connection_type` ('scm' vs 'external') | Enables dual flow: teams can upload results without giving the platform git access. External repos are auto-created on first upload. |

---

## Future Implementation Checklist

When implementing the actual managed scanning engine, the following must happen:

1. **Policy Service**
   - `createPolicy()` / `updatePolicy()` must call `validateScanners(policy.scanners)`
   - Return clear error if unsupported scanners are provided

2. **Managed Scan Execution**
   - When a schedule or webhook triggers a scan:
     - Load the attached `scan_policy`
     - Call `validateScanners()` again as a safety net
     - For each scanner in the array, dispatch the appropriate scanner runner

3. **SCM Integration Layer**
   - The actual "SCM Scanner" component will live here (checkout code, run selected scanners, upload results internally)

4. **UI**
   - When creating/editing a policy, the scanner selection dropdown/multi-select should be driven by `SUPPORTED_SCANNERS` + `SCANNER_LABELS`

---

## How External Upload and Managed Scanning Relate

```
                    ┌─────────────────────────────────────┐
                    │         SUPPORTED_SCANNERS          │
                    │   (Single Source of Truth)          │
                    └─────────────────────────────────────┘
                                   ▲
                                   │
            ┌──────────────────────┼──────────────────────┐
            │                      │                      │
            ▼                      ▼                      ▼
   External Upload API     Scan Policy CRUD      Managed Scan Engine
   (current)               (future)              (future)
   - validates on upload   - validates on create - validates before run
   - uses project tokens   - uses workspace      - uses SCM integration
```

Both paths ultimately feed into the same downstream systems:
- `scan_results`
- `findings` + `finding_groups` (deduplication)
- Parsing jobs via pg-boss
- Retention cleanup

---

## For AI / Future Developers

**Key files to understand the foundation:**

| File | Why It Matters |
|------|----------------|
| `src/server/modules/scan/constants.ts` | The authoritative list + `validateScanners()` |
| `src/commons/constants/scan.ts` | Re-exports for cross-module use (use this in most places) |
| `drizzle/schema/scans.ts` | `scanPolicies`, `scans.policy_id`, `schedules.policy_id` |
| `drizzle/schema/source-controls.ts` (repositories table) | `connection_type` ('scm' \| 'external') — critical for dual flow |
| `src/server/modules/scan/upload.service.ts` | `resolveOrCreateExternalRepository` + auto-creation logic |
| `src/app/api/v1/projects/[projectId]/scans/upload/route.ts:150` | Current enforcement point (read the comment) |
| `docs/upload-api.md` | Current external flow documentation |

**Anti-patterns to avoid:**
- Hardcoding scanner names anywhere except inside `SUPPORTED_SCANNERS`
- Creating a second list of "managed scanners"
- Bypassing `validateScanners()` when handling policy input
- Assuming every repository has `connection_type = 'scm'` (many will be `'external'`)
- Forgetting that external repositories are created lazily on first upload

---

## Related Documents

- [Upload API](./upload-api.md) — Current external flow
- [Queue Architecture](./queue.md) — How parsing and retention jobs work
- [Database Schema](../DATABASE.md) — Full table definitions
- [ROADMAP.md](./ROADMAP.md) — High-level milestone context

---

**This document exists so that when someone (human or AI) asks in 6 months "why do we validate scanners in the upload route and what is the plan for policies?", the answer is here — not scattered across Slack messages and commit comments.**