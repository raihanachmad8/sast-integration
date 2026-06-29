# Scanner Engines Flow

Scanner engine management and configuration.

## Pre-conditions
- User has SCANNER_ENGINES feature flag enabled
- User has SCANNER_VIEW permission

## Role Context
| Action | Owner | Manager | Reviewer | Member |
|--------|-------|---------|----------|--------|
| View engines | ✅ | ✅ | ✅ | ✅ |
| Browse rules | ✅ | ✅ | ✅ | ✅ |
| Probe all | ✅ | ✅ | ❌ | ❌ |
| Enable/Disable | ✅ | ✅ | ❌ | ❌ |

## Available Scanners

```mermaid
graph LR
    subgraph "Multi-Language"
        Semgrep["🔍 Semgrep<br/>30+ languages<br/>Custom rules"]
    end

    subgraph "Secrets"
        Gitleaks["🔑 Gitleaks<br/>API keys, tokens<br/>Passwords"]
    end

    subgraph "C/C++"
        Flawfinder["🐛 Flawfinder<br/>Pattern matching"]
        Cppcheck["⚡ Cppcheck<br/>Static analysis"]
        ClangTidy["🔧 Clang-Tidy<br/>Linting"]
        GCC["🏗️ GCC FanAnalyzer<br/>Data flow"]
    end

    style Semgrep fill:#4a9eff,color:#fff
    style Gitleaks fill:#ef4444,color:#fff
    style Flawfinder fill:#22c55e,color:#fff
    style Cppcheck fill:#f59e0b,color:#fff
    style ClangTidy fill:#a855f7,color:#fff
    style GCC fill:#06b6d4,color:#fff
```

## Scanner Availability Check

```mermaid
sequenceDiagram
    participant UI as Scanner Engines Page
    participant API
    participant System as OS Commands

    UI->>API: GET /api/v1/scanner-engines
    API->>System: which semgrep / semgrep --version
    API->>System: which gitleaks / gitleaks version
    API->>System: which flawfinder / flawfinder --version
    API->>System: which cppcheck / cppcheck --version
    API->>System: which clang-tidy / clang-tidy --version
    API->>System: which gcc / gcc --version
    System-->>API: Version info or not found
    API-->>UI: 200 [{ name, version, installed }]
```

## Scanner Selection per Scan

```mermaid
flowchart TD
    A["User triggers scan"] --> B["Select scanners"]
    B --> C{"Which scanners?"}
    C -->|"All"| D["semgrep + gitleaks + flawfinder + cppcheck + clang-tidy + gcc"]
    C -->|"Custom"| E["User selects subset"]
    C -->|"Default"| F["semgrep + gitleaks"]
    D --> G["Run selected scanners in parallel"]
    E --> G
    F --> G
```

## Custom Rules

### Semgrep Rules
Custom rules directory: `./rules/semgrep/`

```yaml
# Example custom rule
rules:
  - id: custom-sql-injection
    pattern: |
      $QUERY = "SELECT ..." + $INPUT
      ...
    message: Potential SQL injection
    severity: ERROR
    languages: [python]
```

### Gitleaks Rules
Custom config: `GITLEAKS_CONFIG_PATH` env var

### Flawfinder Rules
Custom rules directory: `./rules/flawfinder/`

## User Scenarios

### 1. View Scanner Engines
1. User navigates to Scanner Engines page
2. Table shows all engines with:
   - Name
   - Status (Ready/Not installed)
   - Rules count
   - Enabled status

### 2. Probe All Engines
1. User clicks "Probe all"
2. System checks each engine's availability
3. Status updated for each engine
4. Success message shown

### 3. Browse Rules
1. User clicks "Browse rules" on engine
2. Drawer opens showing:
   - Rule name
   - Severity
   - CWE reference
   - File pattern
3. Searchable by rule name

### 4. Enable/Disable Engine
1. User toggles engine switch
2. Engine enabled/disabled
3. Scans skip disabled engines

### 5. View Rule Details
1. User clicks rule in rules browser
2. Shows:
   - Full description
   - Code pattern
   - Fix suggestion
   - References

## Scanner Engine Status
| Status | Meaning |
|--------|---------|
| Ready | Installed and available |
| Not installed | Engine not configured |

## Pre-condition Checks
- Probe requires SCANNER_MANAGE permission
- Rules browser read-only for viewers
- Engine toggle requires SCANNER_MANAGE permission
