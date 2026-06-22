# Source Control — Future Improvements

**Created**: 2026-06-23
**Status**: Planning
**Related Audit**: Phase 1-2 complete, Phase 3 remaining

---

## Current State

Source control integration supports 3 providers (GitHub, GitLab, Gitea) with:
- OAuth + PAT authentication
- Auto token refresh (GitLab, Gitea)
- PR comment posting with inline review
- Webhook provisioning (outbound)
- Centralized provider factory with typed credentials

### What Works
- SCM provider connection (OAuth, PAT, GitHub App)
- Repository discovery and import
- PR comment posting (summary + inline)
- Commit status for branch protection
- Token refresh with dedup lock
- Webhook creation/deletion on SCM providers

### What's Missing
1. Inbound webhook receiver (webhooks provisioned but no endpoint to receive)
2. Outbound webhook dispatch (CRUD works but no events fired)
3. Webhook secrets stored as plaintext
4. No HMAC verification for inbound webhooks

---

## Phase 3: Remaining Fixes

### Fix 10: Webhook Secrets Encryption

**Priority**: High
**Effort**: Medium (DB migration)
**Files**: `drizzle/schema/source-controls.ts`

**Problem**:
```
webhook_secret stored as varchar(255) plaintext
→ Database breach = all webhook secrets exposed
→ Attacker can forge webhook payloads
```

**Solution**:
- Add `webhook_secret_encrypted` column (or use existing `ai_models.apiKeyEncrypted` pattern)
- Encrypt on write, decrypt on verify
- Migration: encrypt existing plaintext secrets

**Impact**: Security hardening. Prevents webhook forgery after DB compromise.

---

### Fix 11: Inbound Webhook HMAC Verification

**Priority**: High
**Effort**: Medium
**Files**: Integrate into Fix 12

**Problem**:
- No signature verification for inbound webhooks
- Anyone who discovers the webhook URL can send forged payloads

**Solution** (per provider):

| Provider | Header | Algorithm |
|----------|--------|-----------|
| GitHub | `X-Hub-Signature-256` | HMAC-SHA256(secret, body) |
| GitLab | `X-Gitlab-Token` | Token comparison (constant-time) |
| Gitea | `X-Gitea-Signature` | HMAC-SHA256(secret, body) |

**Impact**: Prevents webhook spoofing and payload tampering.

---

### Fix 12: Inbound Webhook Receiver Route

**Priority**: Critical
**Effort**: Large
**Files**: NEW `src/app/api/v1/source-control/webhooks/[provider]/route.ts`

**Problem**:
```
User import repo → webhook provisioned to GitHub/GitLab/Gitea
→ SCM sends event to /api/v1/source-control/webhooks/github
→ Route doesn't exist → 404
→ Webhook setup is useless
```

**Solution**:

```
POST /api/v1/source-control/webhooks/[provider]

1. Verify HMAC signature (Fix 11)
2. Parse event type (push, pull_request, pull_request_review)
3. Extract: repo, branch, commit SHA, PR number
4. Lookup repository in DB via sourceControlImports
5. Create scan record
6. Enqueue managed scan job
```

**Provider Payload Differences**:

| Provider | Event Header | PR Number Field | Branch Field |
|----------|-------------|-----------------|--------------|
| GitHub | `X-GitHub-Event` | `pull_request.number` | `pull_request.head.ref` |
| GitLab | `X-Gitlab-Event` | `object_attributes.iid` | `object_attributes.source_branch` |
| Gitea | `X-Gitea-Event` | `pull_request.number` | `pull_request.head.ref` |

**Impact**:
- **With**: Push to GitHub → auto trigger scan → PR comment appears
- **Without**: Webhooks useless, scans只能 manual or CI/CD

---

### Fix 13: Outbound Webhook Dispatch

**Priority**: Critical
**Effort**: Large
**Files**: `src/server/modules/webhooks/webhook.service.ts`

**Problem**:
```
User creates webhook in UI (URL: https://slack.com/api/...)
→ CRUD works
→ But no events are ever fired
→ Webhook = dead feature
```

**Solution**:

```
Event occurs (scan.completed, finding.critical, etc)
→ Query active webhooks subscribed to that event
→ POST payload to webhook URL
→ Sign payload with HMAC-SHA256(secret, body)
→ Log delivery success/failure
→ Retry on failure (exponential backoff)
```

**Events to Dispatch**:

| Event | Trigger | Payload |
|-------|---------|---------|
| `scan.completed` | Scan finishes | scanId, status, findings count |
| `scan.failed` | Scan errors | scanId, error message |
| `finding.critical` | Critical finding detected | findingId, severity, file, rule |
| `quality_gate.passed` | Quality gate passes | scanId, gate status |
| `quality_gate.failed` | Quality gate fails | scanId, gate status, blocking findings |

**Architecture**:

```
Event Source → Event Bus → Dispatcher → Webhook Delivery
                  ↓                        ↓
              Event Log              Delivery Log
                                   (success/failure/retry)
```

**Impact**:
- **With**: Scan completes → auto notify Slack/Teams/custom endpoint
- **Without**: User must check UI manually for scan status

---

## Implementation Order

```
Fix 12 (Inbound Receiver)
  └─ Fix 11 (HMAC Verification) — integrate into receiver
Fix 13 (Outbound Dispatch)
Fix 10 (Secrets Encryption) — can be last, security hardening
```

### Recommended PR Structure

| PR | Fixes | Description |
|----|-------|-------------|
| PR 1 | Fix 12 + Fix 11 | Inbound webhook receiver with HMAC verification |
| PR 2 | Fix 13 | Outbound webhook dispatch system |
| PR 3 | Fix 10 | Webhook secrets encryption migration |

---

## Testing Strategy

### Fix 12 (Inbound Webhook)
- Unit test: HMAC verification per provider
- Unit test: Payload parsing per provider
- E2E test: Mock SCM webhook → verify scan created
- E2E test: Invalid signature → rejected

### Fix 13 (Outbound Dispatch)
- Unit test: Event matching to webhooks
- Unit test: HMAC signing
- Unit test: Retry logic
- E2E test: Scan completed → webhook fired
- E2E test: Delivery failure → retry logged

### Fix 10 (Encryption)
- Unit test: Encrypt/decrypt round-trip
- Migration test: Existing plaintext secrets encrypted
- Integration test: HMAC verification works with encrypted secrets

---

## Dependencies

| Fix | Depends On | Blocks |
|-----|-----------|--------|
| Fix 12 | Fix 11 (HMAC) | — |
| Fix 13 | — | — |
| Fix 10 | — | — |

---

## Risk Assessment

| Fix | Risk | Mitigation |
|-----|------|------------|
| Fix 12 | Provider payload format changes | Abstract parser per provider |
| Fix 12 | Webhook URL discovery | Rate limiting, IP allowlist |
| Fix 13 | Dispatch failure cascading | Circuit breaker, dead letter queue |
| Fix 13 | Performance impact | Async dispatch, batch processing |
| Fix 10 | Migration data loss | Backup before migration, rollback plan |

---

## Success Criteria

### Fix 12
- [ ] GitHub push triggers scan
- [ ] GitLab push triggers scan
- [ ] Gitea push triggers scan
- [ ] Invalid signatures rejected
- [ ] PR events trigger scan with PR context

### Fix 13
- [ ] scan.completed fires webhook
- [ ] finding.critical fires webhook
- [ ] Delivery success logged
- [ ] Delivery failure retried
- [ ] HMAC signature included

### Fix 10
- [ ] Existing secrets encrypted
- [ ] New secrets encrypted on write
- [ ] HMAC verification works
- [ ] No plaintext secrets in DB
