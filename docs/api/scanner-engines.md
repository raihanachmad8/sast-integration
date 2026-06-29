# Scanner Engines API

Module: `scanner-engines`
Base: `/api/v1/scanner-engines`

---

## GET /scanner-engines

List all supported scanner engines with their configuration and availability status.

**Auth:** Bearer token

**Response Data:**
```json
{
  "success": true,
  "message": "Scanner engines retrieved",
  "data": {
    "scanners": [
      {
        "name": "semgrep",
        "command": "semgrep",
        "format": "json",
        "outputStream": "stdout",
        "isAvailable": true,
        "status": "ready"
      },
      {
        "name": "gitleaks",
        "command": "gitleaks",
        "format": "json",
        "outputStream": "stdout",
        "isAvailable": true,
        "status": "ready"
      },
      {
        "name": "flawfinder",
        "command": "flawfinder",
        "format": "json",
        "outputStream": "stdout",
        "isAvailable": false,
        "status": "not_installed"
      },
      {
        "name": "cppcheck",
        "command": "cppcheck",
        "format": "cppcheck",
        "outputStream": "stderr",
        "isAvailable": false,
        "status": "not_installed"
      },
      {
        "name": "clang-tidy",
        "command": "clang-tidy",
        "format": "json",
        "outputStream": "stdout",
        "isAvailable": false,
        "status": "not_installed"
      },
      {
        "name": "gcc-fanalyzer",
        "command": "gcc",
        "format": "json",
        "outputStream": "stderr",
        "isAvailable": false,
        "status": "not_installed"
      }
    ]
  }
}
```

**Supported Scanners:**
| Scanner | Description |
|---------|-------------|
| `semgrep` | Static analysis for many languages |
| `gitleaks` | Secret detection in git repos |
| `flawfinder` | C/C++ vulnerability scanner |
| `cppcheck` | C/C++ static analysis |
| `clang-tidy` | Clang-based linter and analyzer |
| `gcc-fanalyzer` | GCC static analysis |

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 500 | Internal Server Error |

---

## GET /scanner-engines/:scannerId/rules

List available rules for a scanner engine.

**Auth:** Bearer token

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `scannerId` | string | Scanner ID (semgrep, gitleaks, flawfinder, cppcheck, clang-tidy, gcc-fanalyzer) |

**Response Data:**
```json
{
  "success": true,
  "message": "Rules retrieved",
  "data": [
    {
      "name": "p/default",
      "description": "Default ruleset for common vulnerabilities",
      "enabled": true
    },
    {
      "name": "p/security-audit",
      "description": "Security audit rules",
      "enabled": true
    },
    {
      "name": "p/owasp-top-ten",
      "description": "OWASP Top 10 rules",
      "enabled": false
    },
    {
      "name": "p/r2c-ci",
      "description": "Recommended CI rules",
      "enabled": false
    }
  ]
}
```

**Semgrep Rules:**
| Rule | Description | Default |
|------|-------------|---------|
| `p/default` | Default ruleset for common vulnerabilities | Enabled |
| `p/security-audit` | Security audit rules | Enabled |
| `p/owasp-top-ten` | OWASP Top 10 rules | Disabled |
| `p/r2c-ci` | Recommended CI rules | Disabled |

**Gitleaks Rules:**
| Rule | Description | Default |
|------|-------------|---------|
| `default` | Default secret detection rules | Enabled |
| `generic-api-key` | Generic API key detection | Enabled |
| `aws-access-key` | AWS access key detection | Enabled |
| `github-pat` | GitHub personal access token | Enabled |

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Unknown scanner |
| 401 | Unauthorized |
| 500 | Internal Server Error |
