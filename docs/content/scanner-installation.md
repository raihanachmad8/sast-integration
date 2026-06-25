# Scanner Installation

## Supported Scanners

| Scanner | Language Focus | Output Format | Install |
|---------|---------------|---------------|---------|
| semgrep | 30+ languages | JSON | `pip install semgrep` |
| gitleaks | Secrets | JSON | Binary download |
| flawfinder | C/C++ | SARIF | `pip install flawfinder` |
| cppcheck | C/C++ | XML | `apt install cppcheck` |
| clang-tidy | C/C++ | Text | `apt install clang-tidy` |
| gcc-fanalyzer | C/C++ | Text | GCC 10+ with analyzer |

## Semgrep

```bash
pip install semgrep

# Verify
semgrep --version
```

**Configuration:**
- Uses local rules from `rules/semgrep/` directory
- 30+ language packs with 247+ security rules
- Metrics disabled by default (`--metrics=off`)
- Custom rules via `SEMGREP_RULES_DIR` env var

## Gitleaks

```bash
# Linux
wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.0/gitleaks_8.18.0_linux_x64.tar.gz
tar -xzf gitleaks_8.18.0_linux_x64.tar.gz
sudo mv gitleaks /usr/local/bin/

# macOS
brew install gitleaks
```

**Notes:**
- Runs with `--no-git` flag (shallow clone has incomplete history)
- Exit code 1 when leaks are found (expected behavior)

## Flawfinder

```bash
pip install flawfinder

# Verify
flawfinder --version
```

**Output:** SARIF format with `--sarif --columns` flags.

## Cppcheck

```bash
# Ubuntu/Debian
sudo apt install cppcheck

# macOS
brew install cppcheck

# Verify
cppcheck --version
```

**Configuration:**
- Enables: warning, style, performance, portability, information
- Uses `--xml --xml-version=2` for structured output
- Optional suppressions via `CPPCHECK_SUPPRESSIONS_PATH`

## Clang-Tidy

```bash
# Ubuntu/Debian
sudo apt install clang-tidy

# macOS
brew install llvm
```

**Checks enabled:**
- `clang-analyzer-*`
- `cert-*`
- `bugprone-*`
- `security-*`

## GCC Fanalyzer

Requires GCC 10+ with the analyzer feature:

```bash
# Verify GCC version
gcc --version

# Test analyzer support
echo 'int main(){}' > test.c
gcc -fanalyzer test.c
```

## Availability Check

The platform checks scanner availability before each scan:

```bash
# API endpoint
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

Unavailable scanners are skipped gracefully. Scans continue even if some scanners fail.
