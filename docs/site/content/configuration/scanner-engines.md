# Scanner Engines

## Overview

Configure and manage the 6 scanner engines available in the platform.

## Scanner Overview

| Scanner | Language Focus | Output | Binary |
|---------|---------------|--------|--------|
| semgrep | 30+ languages | JSON | `semgrep` |
| gitleaks | Secrets | JSON | `gitleaks` |
| flawfinder | C/C++ | SARIF | `flawfinder` |
| cppcheck | C/C++ | XML | `cppcheck` |
| clang-tidy | C/C++ | Text | `clang-tidy` |
| gcc-fanalyzer | C/C++ | Text | `gcc` |

## Scanner Configuration

### Semgrep

```typescript
{
  command: 'semgrep',
  args: (targetDir) => [
    'scan',
    '--json',
    '--config', SEMGREP_RULES_DIR,
    '--metrics=off',
    '--disable-version-check',
    '--no-git-ignore',
    '--skip-unknown-extensions',
    targetDir,
  ],
  format: 'json',
}
```

### Gitleaks

```typescript
{
  command: 'gitleaks',
  args: (targetDir) => [
    'detect',
    '--source', targetDir,
    '--report-format', 'json',
    '--report-path', 'results.json',
    '--no-git',
  ],
  format: 'json',
  outputStream: 'results.json',
}
```

### Flawfinder

```typescript
{
  command: 'flawfinder',
  args: (targetDir) => ['--sarif', '--columns', targetDir],
  format: 'sarif',
}
```

### Cppcheck

```typescript
{
  command: 'cppcheck',
  args: (targetDir) => [
    '--enable=warning,style,performance,portability,information',
    '--force', '--quiet', '--xml', '--xml-version=2',
    '.',
  ],
  format: 'xml',
}
```

## Availability Check

```bash
GET /api/v1/workspaces/:workspaceId/scanners

# Response
{
  "semgrep": true,
  "gitleaks": true,
  "flawfinder": false,
  "cppcheck": true,
  "clang-tidy": false,
  "gcc-fanalyzer": true
}
```

## Limits

| Setting | Value |
|---------|-------|
| Max output buffer | 50MB |
| Scanner timeout | 300 seconds |
| Default scanners | semgrep, gitleaks |

## Feature Flag

Scanner engines configuration requires `FEATURE_FLAG_SCANNER_ENGINES=true`.
