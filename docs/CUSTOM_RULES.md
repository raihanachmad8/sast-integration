---
title: Custom Rules
description: Write and configure custom security rules
---

# Custom Rules

## Overview

The platform supports custom rules for Semgrep, Gitleaks, and Flawfinder.

## Semgrep Custom Rules

### Directory Structure

```
rules/semgrep/
├── custom-rules.yaml
├── security/
│   └── sql-injection.yaml
└── best-practices/
    └── error-handling.yaml
```

### Rule Format

```yaml
rules:
  - id: custom-sql-injection
    pattern: |
      $QUERY = "SELECT ..." + $INPUT
      ...
    message: Potential SQL injection via string concatenation
    severity: ERROR
    languages: [python, javascript, typescript]
    metadata:
      cwe: "CWE-89"
      category: security
```

### Environment Variable

```bash
SEMGREP_RULES_DIR=./rules/semgrep
```

## Gitleaks Custom Rules

### Configuration File

```toml
# .gitleaks.toml
[[rules]]
id = "custom-api-key"
description = "Custom API key pattern"
regex = '''(?i)(api[_-]?key[_-]?=|[\'"])[A-Za-z0-9]{32,}'''
tags = ["api-key", "custom"]
```

### Environment Variable

```bash
GITLEAKS_CONFIG_PATH=./.gitleaks.toml
```

## Flawfinder Custom Rules

### Directory Structure

```
rules/flawfinder/
├── custom-rules.ff
```

### Rule Format

```
# Custom flawfinder rules
function_name:short maxlen:10 context:function
```

### Environment Variable

```bash
FLAWFINDER_RULES_DIR=./rules/flawfinder
```

## Testing Rules

```bash
# Test Semgrep rules
semgrep --config ./rules/semgrep/ --test ./test-files/

# Test Gitleaks rules
gitleaks detect --config .gitleaks.toml --source ./test-files/
```
