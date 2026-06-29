# Quality Gates Flow

Automated scan quality evaluation.

## Pre-conditions
- User has QUALITY_GATES permission
- At least one scan completed

## Role Context
| Action | Owner | Manager | Reviewer | Member |
|--------|-------|---------|----------|--------|
| View gate config | ✅ | ✅ | ✅ | ✅ |
| Configure gate | ✅ | ✅ | ❌ | ❌ |
| Override (project) | ✅ | ✅ | ❌ | ❌ |
| View gate results | ✅ | ✅ | ✅ | ✅ |

## Configuration

```mermaid
graph TB
    subgraph "Quality Gate Rules"
        A["fail_on_critical = true"]
        B["fail_on_high = true"]
        C["fail_on_high_tp = true"]
        D["fail_on_medium = false"]
        E["fail_on_low = false"]
        F["fail_on_pending = true"]
        G["pending_behavior = warn"]
        H["require_human_ack = false"]
    end

    subgraph "Threshold"
        I["threshold = high"]
    end

    A --> J{"Evaluation"}
    B --> J
    C --> J
    D --> J
    E --> J
    F --> J
    G --> J
    H --> J
    I --> J

    J --> K["PASS / WARN / FAIL"]
```

## Evaluation Flow

```mermaid
flowchart TD
    A["Scan completed"] --> B["Get workspace quality gate config"]
    B --> C["Count findings by severity + verdict"]
    C --> D["Evaluate each rule"]

    D --> E{"Critical findings > 0<br/>AND fail_on_critical?"}
    D --> F{"High findings > 0<br/>AND fail_on_high?"}
    D --> G{"High TP findings > 0<br/>AND fail_on_high_tp?"}
    D --> H{"Pending findings > 0<br/>AND fail_on_pending?"}
    D --> I{"require_human_ack<br/>AND unverified AI?"}

    E -->|"Yes"| FAIL["❌ FAIL"]
    F -->|"Yes"| FAIL
    G -->|"Yes"| FAIL
    H -->|"Yes + pending_behavior=fail"| FAIL
    H -->|"Yes + pending_behavior=warn"| WARN["⚠️ WARN"]
    I -->|"Yes"| WARN

    E -->|"No"| PASS["✅ PASS"]
    F -->|"No"| PASS
    G -->|"No"| PASS
    H -->|"No"| PASS
    I -->|"No"| PASS

    FAIL --> RESULT["Post commit status"]
    WARN --> RESULT
    PASS --> RESULT

    style FAIL fill:#ef4444,color:#fff
    style WARN fill:#f59e0b,color:#fff
    style PASS fill:#22c55e,color:#fff
```

## Commit Status Integration

```mermaid
sequenceDiagram
    participant Gate as Quality Gate
    participant SCM as SCM Provider
    participant DB[(Database)]

    Gate->>Gate: Evaluate rules
    Gate->>DB: INSERT quality_gate_result
    alt PR context exists
        Gate->>SCM: POST commit status
        Note right of SCM: success / pending / failure
    end
```

## PR Context (Diff Analysis)

When scanning a PR, quality gates also track:

| Metric | Description |
|--------|-------------|
| `new_findings` | Findings new in this PR |
| `fixed_findings` | Findings fixed in this PR |
| `persistent_findings` | Pre-existing findings |
| `blocking_findings` | Findings that fail the gate |

## User Scenarios

### 1. Configure Quality Gate
1. User navigates to Quality Gates page
2. Toggles settings:
   - Fail on critical findings
   - Fail on high TP findings
   - Warn on pending AI verification
   - Require human acknowledgement
3. Sets thresholds and behaviors
4. Clicks "Save settings"

### 2. View Gate Results
1. User goes to scan detail page
2. Gate evaluation shown:
   - Pass/Fail status
   - Which rules triggered
   - Findings that caused failure

### 3. Override Gate (Project Level)
1. Project Manager goes to project settings
2. Overrides workspace-level gate rules
3. Project-specific rules applied

### 4. PR Review Integration
1. Source control sends PR event
2. Gate evaluated against PR changes
3. Pass/Fail status posted to PR
4. Comments with finding details

## Gate Rules
| Rule | Description |
|------|-------------|
| Fail on Critical | Block merge if critical finding |
| Fail on High TP | Block if AI confirms high severity |
| Warn on Pending | Show warning for unverified findings |
| Require Human Ack | Manual approval required |

## Pre-condition Checks
- Gate requires QUALITY_GATES feature flag enabled
- PR review requires source control connected
- Override requires PROJECT_MANAGE permission
