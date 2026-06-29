---
title: Scan Policies
description: Configure which scanners to run and how to handle results
---

# Scan Policies

## Overview

Scan policies define which scanners to run and how to handle results.

## Default Scanners

| Scanner | Default | Notes |
|---------|:-------:|-------|
| Semgrep | ✅ | Always recommended |
| Gitleaks | ✅ | Always recommended |
| Flawfinder | ❌ | C/C++ only |
| Cppcheck | ❌ | C/C++ only |
| Clang-Tidy | ❌ | C/C++ only |
| GCC FanAnalyzer | ❌ | C/C++ only |

## Scanner Selection

```mermaid
flowchart TD
    A["Trigger scan"] --> B{"Codebase type?"}
    B -->|"Multi-language"| C["Semgrep + Gitleaks"]
    B -->|"C/C++"| D["All 6 scanners"]
    B -->|"Custom"| E["User selects"]

    style C fill:#4a9eff,color:#fff
    style D fill:#f59e0b,color:#fff
```

## Branch Patterns

| Pattern | Description |
|---------|-------------|
| `main` | Default branch |
| `develop` | Development branch |
| `feature/*` | Feature branches |
| `release/*` | Release branches |
