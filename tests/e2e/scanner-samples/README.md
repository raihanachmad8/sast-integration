# Scanner Test Samples

**Purpose**: Sample code files for E2E testing of SAST scanners (Flawfinder, Semgrep, Gitleaks).

## Files

| File | Type | Scanners | Purpose |
|------|------|----------|---------|
| `vulnerable.c` | C | Flawfinder, Semgrep | True positives for C vulnerabilities |
| `safe.c` | C | Flawfinder, Semgrep | False positives (safe code patterns) |
| `secrets.c` | C | Gitleaks | Hardcoded secrets detection |
| `vulnerable.py` | Python | Semgrep | True positives for Python vulnerabilities |
| `safe.py` | Python | Semgrep | False positives (safe code patterns) |

## Vulnerability Coverage

### C Files (`vulnerable.c`)

| CWE | Vulnerability | Scanner |
|-----|---------------|---------|
| CWE-120 | Buffer Overflow (strcpy, gets) | Flawfinder |
| CWE-78 | Command Injection (system) | Flawfinder, Semgrep |
| CWE-134 | Format String (printf with user input) | Flawfinder |
| CWE-190 | Integer Overflow | Flawfinder |
| CWE-476 | Null Pointer Dereference | Flawfinder |
| CWE-22 | Path Traversal (fopen with user input) | Flawfinder |

### Python Files (`vulnerable.py`)

| CWE | Vulnerability | Scanner |
|-----|---------------|---------|
| CWE-89 | SQL Injection (f-string in SQL) | Semgrep |
| CWE-78 | Command Injection (os.system, subprocess) | Semgrep |
| CWE-22 | Path Traversal (open with user input) | Semgrep |
| CWE-502 | Deserialization (pickle.loads) | Semgrep |
| CWE-798 | Hardcoded Credentials | Semgrep |
| CWE-79 | XSS (Flask unescaped output) | Semgrep |
| CWE-330 | Weak Random (random module) | Semgrep |
| CWE-377 | Insecure Temp File | Semgrep |

### Secrets File (`secrets.c`)

| Secret Type | Pattern | Scanner |
|-------------|---------|---------|
| AWS Access Key | `AKIA...` | Gitleaks |
| AWS Secret Key | `wJalr...` | Gitleaks |
| GitHub Token | `ghp_...` | Gitleaks |
| GitLab Token | `glpat-...` | Gitleaks |
| Database URL | `postgresql://...` | Gitleaks |
| API Key | `sk-...` | Gitleaks |
| Private Key | `BEGIN RSA PRIVATE KEY` | Gitleaks |

## Usage

```bash
# Test Flawfinder on C files
flawfinder --quiet tests/e2e/scanner-samples/vulnerable.c
flawfinder --quiet tests/e2e/scanner-samples/safe.c

# Test Semgrep on Python files
semgrep --config auto tests/e2e/scanner-samples/vulnerable.py
semgrep --config auto tests/e2e/scanner-samples/safe.py

# Test Gitleaks on secrets file
gitleaks detect --source tests/e2e/scanner-samples/secrets.c --no-banner
```

## Expected Results

| File | Expected Findings | Expected False Positives |
|------|-------------------|--------------------------|
| `vulnerable.c` | 8-12 findings | 0 |
| `safe.c` | 0 findings | 0 (should not flag) |
| `secrets.c` | 8-10 secrets | 0 |
| `vulnerable.py` | 10-15 findings | 0 |
| `safe.py` | 0 findings | 0 (should not flag) |
