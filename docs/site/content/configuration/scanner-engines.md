---
title: Scanner Engines
description: Configure and manage security scanner engines
---

# Scanner Engines

## Overview

Configure and manage the 6 scanner engines available in the platform.

## Scanner Overview

```mermaid
graph LR
    subgraph "Multi-Language"
        Semgrep["🔍 Semgrep<br/>30+ languages"]
        Gitleaks["🔑 Gitleaks<br/>Secrets"]
    end
    subgraph "C/C++"
        Flawfinder["🐛 Flawfinder"]
        Cppcheck["⚡ Cppcheck"]
        ClangTidy["🔧 Clang-Tidy"]
        GCC["🏗️ GCC FanAnalyzer"]
    end
    style Semgrep fill:#4a9eff,color:#fff
    style Gitleaks fill:#ef4444,color:#fff
```

| Scanner | Languages | Output | Binary |
|---------|-----------|--------|--------|
| Semgrep | 30+ | JSON | `semgrep` |
| Gitleaks | All | JSON | `gitleaks` |
| Flawfinder | C/C++ | SARIF | `flawfinder` |
| Cppcheck | C/C++ | XML | `cppcheck` |
| Clang-Tidy | C/C++ | Text | `clang-tidy` |
| GCC FanAnalyzer | C/C++ | Text | `gcc -fanalyzer` |

## Availability Check

```mermaid
sequenceDiagram
    participant UI
    participant API
    participant System

    UI->>API: GET /api/v1/scanner-engines
    API->>System: which semgrep / semgrep --version
    API->>System: which gitleaks / gitleaks version
    API->>System: which cppcheck / cppcheck --version
    System-->>API: Version info
    API-->>UI: 200 [{ name, version, installed }]
```

## Custom Rules

| Scanner | Config | Directory |
|---------|--------|-----------|
| Semgrep | `SEMGREP_RULES_DIR` | `./rules/semgrep/` |
| Gitleaks | `GITLEAKS_CONFIG_PATH` | `./.gitleaks.toml` |
| Flawfinder | `FLAWFINDER_RULES_DIR` | `./rules/flawfinder/` |
