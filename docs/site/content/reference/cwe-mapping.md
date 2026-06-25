# CWE Mapping

## Overview

The platform maps scanner findings to CWE (Common Weakness Enumeration) identifiers for standardized vulnerability classification.

## CWE Severity Mapping

| CWE | Name | Severity |
|-----|------|----------|
| CWE-787 | Out-of-bounds Write | Critical |
| CWE-416 | Use After Free | Critical |
| CWE-476 | NULL Pointer Dereference | High |
| CWE-78 | OS Command Injection | High |
| CWE-120 | Buffer Copy without Checking Size | High |
| CWE-125 | Out-of-bounds Read | High |
| CWE-79 | Cross-site Scripting | High |
| CWE-89 | SQL Injection | High |
| CWE-94 | Code Injection | High |
| CWE-401 | Memory Leak | Medium |
| CWE-690 | NULL Pointer Dereference | Medium |
| CWE-190 | Integer Overflow | Medium |
| CWE-676 | Use of Potentially Dangerous Function | Medium |
| CWE-200 | Information Exposure | Medium |
| CWE-502 | Deserialization of Untrusted Data | High |

## Scanner → CWE Mapping

### Semgrep

Extracts CWE from rule metadata:

```yaml
metadata:
  cwe:
  - 'CWE-787: Out-of-bounds Write'
```

### GCC Fanalyzer

Parses CWE from output:

```
warning: message [CWE-787] [-Wcheck-name]
```

### Other Scanners

CWE assigned based on rule patterns and severity mapping.

## Knowledge Base Integration

CWE entries are enriched from:

| Source | Content |
|--------|---------|
| CWE Dictionary | Official CWE descriptions |
| NVD | CVE references |
| MITRE | ATT&CK technique mappings |

## API Usage

### Get CWE Details

```bash
GET /api/v1/workspaces/:workspaceId/knowledge-base?cwe_id=CWE-787
```

### Response

```json
{
  "data": {
    "cwe_id": "CWE-787",
    "title": "Out-of-bounds Write",
    "description": "The software writes data past the end, or before the beginning, of the intended buffer.",
    "severity": "Critical",
    "remediation": "Use bounds-checking interfaces, validate array indices",
    "references": ["https://cwe.mitre.org/data/definitions/787.html"]
  }
}
```
