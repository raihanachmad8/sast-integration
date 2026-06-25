# Custom Semgrep Rules

## Overview

The platform supports custom Semgrep rules via the `SEMGREP_RULES_DIR` environment variable.

## Rule Directory Structure

```
rules/semgrep/
├── c/
│   └── custom-c-rules.yaml
├── java/
│   └── custom-java-rules.yaml
├── javascript/
│   └── custom-js-rules.yaml
├── python/
│   └── custom-python-rules.yaml
└── generic/
    └── custom-generic-rules.yaml
```

## Rule Format

```yaml
rules:
- id: my-custom-rule
  pattern-either:
  - pattern: dangerousFunction(...)
  - pattern: unsafePattern(...)
  message: >-
    Description of the security issue found.
  metadata:
    cwe:
    - 'CWE-XXX: Vulnerability Category'
    category: security
    technology:
    - language-name
    confidence: HIGH
  languages: [language]
  severity: WARNING
```

## Rule Severity Levels

| Level | Description |
|-------|-------------|
| ERROR | Critical security issues |
| WARNING | Security concerns |
| INFO | Code quality issues |

## Testing Rules

```bash
# Run semgrep with custom rules
SEMGREP_RULES_DIR=rules/semgrep semgrep scan --config p/default --json target/
```

## Language Packs

| Directory | Language | Rules Count |
|-----------|----------|-------------|
| `c/` | C | 25+ |
| `java/` | Java | 30+ |
| `javascript/` | JavaScript | 40+ |
| `typescript/` | TypeScript | 35+ |
| `python/` | Python | 30+ |
| `go/` | Go | 20+ |
| `ruby/` | Ruby | 15+ |
| `rust/` | Rust | 10+ |
| `php/` | PHP | 20+ |
| `csharp/` | C# | 15+ |
| `terraform/` | Terraform | 10+ |
| `dockerfile/` | Dockerfile | 5+ |
| `yaml/` | YAML | 10+ |
