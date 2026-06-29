# Best Practices

## Scanner Selection

| Codebase | Recommended Scanners |
|----------|---------------------|
| Multi-language | semgrep, gitleaks |
| C/C++ projects | semgrep, flawfinder, cppcheck, clang-tidy, gcc-fanalyzer |
| JavaScript/TypeScript | semgrep, gitleaks |
| Python | semgrep, gitleaks |
| Go | semgrep, gitleaks |

## Scan Frequency

| Trigger | Frequency | Use Case |
|---------|-----------|----------|
| Push | Every push | Catch issues early |
| PR/MR | On every PR | Block insecure code |
| Scheduled | Daily/Weekly | Catch new CVEs |
| Manual | As needed | Ad-hoc analysis |

## Quality Gates

Configure quality gates to block merges:

| Threshold | Recommended Value |
|-----------|-------------------|
| Fail on critical TP | Yes |
| Fail on high TP | Yes |
| Warn on pending | Yes |
| Require human ack | Optional |

## Finding Triage

1. **Review AI verdicts** — Trust but verify
2. **Focus on critical/high** — Address immediately
3. **Bulk triage** — Use bulk actions for efficiency
4. **Assign ownership** — Assign to responsible developers
5. **Track metrics** — Monitor false positive rate over time

## AI Model Selection

| Model | Latency | Accuracy | Cost |
|-------|---------|----------|------|
| GPT-4 | High | High | High |
| GPT-3.5 | Low | Medium | Low |
| Claude | Medium | High | Medium |

## Knowledge Base

- Keep CWE entries updated
- Add project-specific context
- Link findings to remediation guides

## Team Organization

- Use teams for project-based access
- Assign reviewers for finding triage
- Keep permissions minimal (principle of least privilege)
