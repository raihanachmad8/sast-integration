# Scan Policies

## Overview

Scan policies define which scanners to run and how to handle results. Configure policies per project or workspace-wide.

## Policy Structure

```typescript
interface ScanPolicy {
  id: string;
  workspace_id: string;
  name: string;
  scanners: ScannerId[];
  enabled: boolean;
  created_at: Date;
}
```

## Default Scanners

When no policy is specified:

```typescript
const DEFAULT_SCANNERS: ScannerId[] = ['semgrep', 'gitleaks'];
```

## Scanner Selection

| Scanner | Default | Recommended |
|---------|---------|-------------|
| semgrep | Yes | Always |
| gitleaks | Yes | Always |
| flawfinder | No | C/C++ projects |
| cppcheck | No | C/C++ projects |
| clang-tidy | No | C/C++ projects |
| gcc-fanalyzer | No | C/C++ projects |

## Policy Configuration

### Via UI

1. Go to **Scan Policies** page
2. Click **Add Policy**
3. Enter policy name
4. Select scanners
5. Configure thresholds
6. Click **Save**

### Via API

```bash
POST /api/v1/workspaces/:workspaceId/scan-policies
{
  "name": "C/C++ Full Scan",
  "scanners": ["semgrep", "gitleaks", "flawfinder", "cppcheck", "clang-tidy", "gcc-fanalyzer"],
  "enabled": true
}
```

## Feature Flag

Scan policies require `FEATURE_FLAG_SCAN_PROFILES=true`.
