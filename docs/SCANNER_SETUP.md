# Scanner Setup Guide

**Purpose**: This document explains how to install, verify, and troubleshoot SAST scanner binaries on different platforms. The platform supports 5 scanners: Semgrep, Gitleaks, Trivy, Cppcheck, and Flawfinder.

---

## Quick Check

```bash
# Check which scanners are installed via API
curl http://localhost:3000/api/v1/health | jq .scanners
```

Or check manually:

```bash
semgrep --version
gitleaks version
trivy --version
cppcheck --version
flawfinder --version
```

---

## Supported Scanners

| Scanner | Purpose | Output Format | Runtime Dependency |
|---------|---------|---------------|-------------------|
| **Semgrep** | Multi-language SAST | JSON | Python 3.8+ |
| **Gitleaks** | Secret detection | JSON | None (Go binary) |
| **Trivy** | Vulnerability + misconfig + secrets | JSON | None (Go binary) |
| **Cppcheck** | C/C++ static analysis | XML (stderr) | None (C++ binary) |
| **Flawfinder** | C/C++ token-based analysis | Text | Python 2.7+ or 3.x |

---

## Windows Installation

### Option A: Scoop (Recommended)

```powershell
# Install scoop if not already installed
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# Install scanners
scoop install semgrep gitleaks trivy cppcheck

# Flawfinder (Python-based)
pip install flawfinder
```

### Option B: Chocolatey

```powershell
# Install scanners
choco install gitleaks trivy cppcheck

# Semgrep and Flawfinder (Python-based)
pip install semgrep flawfinder
```

### Option C: Manual Download

| Scanner | Download URL | Notes |
|---------|-------------|-------|
| Gitleaks | https://github.com/gitleaks/gitleaks/releases | Download `.zip`, extract, add to PATH |
| Trivy | https://github.com/aquasecurity/trivy/releases | Download `.zip`, extract, add to PATH |
| Cppcheck | https://cppcheck.sourceforge.io | Download installer from SourceForge |
| Semgrep | `pip install semgrep` | Requires Python 3.8+ |
| Flawfinder | `pip install flawfinder` | Requires Python |

### Windows PATH Notes

After installing via Scoop/Chocolatey, binaries are typically in:
- Scoop: `C:\Users\<user>\scoop\shims\`
- Chocolatey: `C:\ProgramData\chocolatey\bin\`

If `where scanner` fails, add the install directory to your PATH.

---

## Linux Installation

### Ubuntu/Debian

```bash
# Update package list
sudo apt update

# Semgrep (Python-based)
pip3 install semgrep
# Or: pipx install semgrep

# Gitleaks
sudo apt install gitleaks
# Or: go install github.com/gitleaks/gitleaks/v8@latest

# Trivy
sudo apt-get install trivy
# Or: curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sudo sh -s -- -b /usr/local/bin

# Cppcheck
sudo apt-get install cppcheck

# Flawfinder (Python-based)
pip3 install flawfinder
```

### macOS (Homebrew)

```bash
# Install all scanners at once
brew install semgrep gitleaks trivy cppcheck flawfinder
```

### Fedora/RHEL

```bash
sudo dnf install cppcheck
pip3 install semgrep gitleaks trivy flawfinder
```

---

## Binary Detection Mechanism

The platform detects scanner availability using OS-specific commands:

| Platform | Command Used | How It Works |
|----------|-------------|--------------|
| **Windows** | `where <binary>` | Searches PATH for executable |
| **Linux/Mac** | `which <binary>` | Searches PATH for executable |
| **Fallback** | `<binary> --version` | Tries to execute with version flag |

### Detection Flow

```
checkScannerAvailability('semgrep')
    │
    ├── Cache hit? → return cached result
    │
    ├── platform === 'win32'?
    │   ├── exec('where semgrep')
    │   ├── success → cache true, return true
    │   └── ENOENT → cache false, return false
    │
    └── platform !== 'win32'?
        ├── exec('which semgrep')
        ├── success → cache true, return true
        └── ENOENT → cache false, return false
```

### Cache Behavior

- Results are cached in-memory after first check
- Cache persists for the lifetime of the Node.js process
- Call `clearAvailabilityCache()` to force re-check (e.g., after installing a scanner)
- Cache is per-process, not shared across instances

---

## Docker (Production)

All scanners are pre-installed in the Docker image:

```bash
docker-compose up -d
```

The Dockerfile installs:
- Semgrep (via pip)
- Gitleaks (Go binary from GitHub releases)
- Trivy (Go binary from GitHub releases)
- Cppcheck (apt)
- Flawfinder (via pip)

---

## Verification

### Check Individual Scanner

```bash
# Linux/Mac
which semgrep && semgrep --version

# Windows
where semgrep && semgrep --version
```

### Check All Scanners via API

```bash
curl -s http://localhost:3000/api/v1/health | jq '.data.scanners'
```

Response:

```json
{
  "semgrep": true,
  "gitleaks": true,
  "trivy": true,
  "cppcheck": true,
  "flawfinder": true
}
```

---

## Troubleshooting

### "Scanner binary not found"

1. Verify the scanner is installed: `which <scanner>` or `where <scanner>`
2. Check PATH: `echo $PATH` (Linux/Mac) or `echo %PATH%` (Windows)
3. Restart the server after installing new scanners (cache is per-process)

### "Permission denied" on Linux

```bash
# Make binary executable
chmod +x /usr/local/bin/<scanner>
```

### Python-based scanners not found

```bash
# Ensure pip packages are in PATH
pip3 install --user semgrep flawfinder
# Or use pipx for isolated environments
pipx install semgrep
```

### Scanner version mismatch

The platform uses the latest stable version by default. To pin a version:

```bash
# Semgrep
pip install semgrep==1.56.0

# Gitleaks (download specific release)
# See https://github.com/gitleaks/gitleaks/releases
```

---

## Scanner-Specific Notes

### Semgrep

- Requires Python 3.8+ in PATH
- First run downloads rules (~50MB)
- Uses `--config auto` for automatic rule selection
- Output format: JSON

### Gitleaks

- Single Go binary, no dependencies
- Uses `detect` subcommand with `--report-format json`
- Includes `--no-banner` to suppress ASCII art

### Trivy

- Single Go binary, no dependencies
- Uses `fs` subcommand for filesystem scanning
- Covers vulnerabilities, misconfigurations, and secrets

### Cppcheck

- **Note**: Output goes to stderr, not stdout
- Uses `--xml --enable=all` flags
- XML output is parsed by the platform

### Flawfinder

- Python-based, requires Python 2.7+ or 3.x
- Uses `--dataonly --quiet` flags
- Text output is parsed line-by-line
