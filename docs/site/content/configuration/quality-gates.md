---
title: Quality Gates
description: Automated scan quality evaluation
---

# Quality Gates

## Overview

Quality gates evaluate scan results against configurable thresholds and block merges when criteria are not met.

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `fail_on_critical` | Block on critical findings | `true` |
| `fail_on_high` | Block on high findings | `true` |
| `fail_on_high_tp` | Block on high true-positive findings | `true` |
| `fail_on_medium` | Block on medium findings | `false` |
| `fail_on_low` | Block on low findings | `false` |
| `fail_on_pending` | Block on pending findings | `true` |
| `pending_behavior` | How to handle pending | `warn` |
| `require_human_ack` | Require human acknowledgment | `false` |

## Evaluation Flow

```mermaid
flowchart TD
    A["Scan completed"] --> B["Get quality gate config"]
    B --> C["Count findings by severity"]
    C --> D{"Evaluate rules"}
    D --> E{"fail_on_critical<br/>AND critical > 0?"}
    E -->|"Yes"| I["FAIL"]
    E -->|"No"| K["PASS"]
    D --> F{"fail_on_high<br/>AND high > 0?"}
    F -->|"Yes"| I
    F -->|"No"| K
    D --> G{"fail_on_pending<br/>AND pending > 0?"}
    G -->|"pending_behavior=fail"| I
    G -->|"pending_behavior=warn"| J["WARN"]
    G -->|"pending_behavior=ignore"| K

    style I fill:#ef4444,color:#fff
    style J fill:#f59e0b,color:#fff
    style K fill:#22c55e,color:#fff
```

## Commit Status Integration

```mermaid
sequenceDiagram
    participant Gate
    participant SCM as SCM Provider
    participant DB[(Database)]

    Gate->>Gate: Evaluate rules
    Gate->>DB: INSERT quality_gate_result
    Gate->>SCM: POST commit status
    Note right of SCM: success / pending / failure
```

## PR Context

When scanning a PR, quality gates track:

| Metric | Description |
|--------|-------------|
| `new_findings` | Findings new in this PR |
| `fixed_findings` | Findings fixed in this PR |
| `persistent_findings` | Pre-existing findings |
| `blocking_findings` | Findings that fail the gate |
