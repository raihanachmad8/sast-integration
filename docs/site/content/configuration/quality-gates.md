# Quality Gates

## Overview

Quality gates evaluate scan results against configurable thresholds and block merges when criteria are not met.

## Gate Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| threshold | Maximum findings allowed | 0 |
| fail_on_critical | Block on critical true positives | true |
| fail_on_high_tp | Block on high true positives | false |
| warn_on_pending | Warn on pending AI verification | true |
| require_human_ack | Require human acknowledgment | false |
| pending_behavior | How to handle pending findings | `warn` |

## Gate Evaluation

Quality gates evaluate after scan completion:

1. Count findings by severity and AI verdict
2. Compare against thresholds
3. Return pass/fail status
4. Block PR merge if gate fails

## Evaluation Flow

```
Scan Complete → Evaluate Quality Gate → Set Commit Status → Post PR Comment
```

## PR Integration

When a quality gate fails:

1. Commit status set to **failed**
2. PR comment posted with details
3. Merge blocked until gate passes

### PR Comment Example

```
❌ Quality Gate Failed

Critical (TP): 2 (threshold: 0)
High (TP): 5 (threshold: 0)
Pending AI: 3

Fix findings to merge this PR.
```

## Configuration

### Via UI

1. Go to **Quality Gates** page
2. Configure thresholds
3. Set blocking behavior
4. Click **Save**

### Via API

```bash
PUT /api/v1/quality-gates
{
  "threshold": 0,
  "fail_on_critical": true,
  "fail_on_high_tp": true,
  "warn_on_pending": true,
  "require_human_ack": false,
  "pending_behavior": "warn"
}
```

## API Endpoints

| Method | Endpoint | Permission |
|--------|----------|-----------|
| GET | `/quality-gates` | `POLICY_VIEW` |
| PUT | `/quality-gates` | `POLICY_MANAGE` |

## Feature Flag

Quality gates require `FEATURE_FLAG_QUALITY_GATES=true`.
