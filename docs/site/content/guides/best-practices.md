---
title: Best Practices
description: Recommended practices for using SAST Integration effectively
---

# Best Practices

## Scanner Selection

| Codebase | Recommended Scanners |
|----------|---------------------|
| Multi-language | Semgrep + Gitleaks |
| C/C++ | Semgrep + Flawfinder + Cppcheck + Clang-Tidy + GCC FanAnalyzer |
| JavaScript/TypeScript | Semgrep + Gitleaks |
| Python | Semgrep + Gitleaks |
| Java | Semgrep + Gitleaks |

## Scan Frequency

```mermaid
flowchart TD
    A["Code Changes"] --> B{"Scan Type?"}
    B -->|"PR/Push"| C["Trigger scan on PR"]
    B -->|"Scheduled"| D["Daily scheduled scan"]
    B -->|"Manual"| E["On-demand scan"]

    C --> F["Catch issues early"]
    D --> G["Continuous monitoring"]
    E --> H["Investigate specific concern"]

    style C fill:#22c55e,color:#fff
    style D fill:#4a9eff,color:#fff
```

## Finding Triage Workflow

```mermaid
flowchart TD
    A["New findings"] --> B["Review severity + AI verdict"]
    B --> C{"AI verdict?"}
    C -->|"True Positive"| D["Acknowledge + assign"]
    C -->|"False Positive"| E["Dismiss"]
    C -->|"Pending"| F["Manual review"]
    D --> G["Track to resolution"]
    F --> G

    style B fill:#4a9eff,color:#fff
    style E fill:#f59e0b,color:#fff
```

## Repository Organization

- Group related repositories in projects
- Use descriptive names and descriptions
- Set appropriate default branches
- Enable auto-scan for critical repositories

## Team-Based Access Control

- Assign appropriate roles (Owner/Manager/Reviewer/Member)
- Use teams for project-level access
- Review permissions regularly

## Quality Gate Configuration

- Enable `fail_on_critical` for all workspaces
- Set `fail_on_high` for production codebases
- Use `pending_behavior: warn` during initial adoption
- Enable `require_human_ack` for high-security projects
