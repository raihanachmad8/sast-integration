# CI/CD Integration Examples

Workflow SAST scan untuk GitHub Actions, GitLab CI, dan Gitea Actions.

## Flow Baru: `init → parallel scanners → finalize`

Semua workflow mengikuti pola yang sama:

1. **Init** — buat scan record via `/api/v1/ci/init`
2. **Scan** — jalankan scanner paralel, masing-masing upload via `/api/v1/ci/upload`
3. **Finalize** — tutup scan via `/api/v1/ci/complete`

## Setup

### Required Secrets / Variables

| Name | Description |
|------|-------------|
| `SAST_API_URL` | API base URL, e.g. `https://sast.example.com` |
| `SAST_API_KEY` | API authentication token |

### GitHub Actions

Copy `github-actions.yml` ke `.github/workflows/sast-scan.yml`.

### GitLab CI

Copy `gitlab-ci.yml` ke root repository.

### Gitea Actions

Copy `gitea-actions.yml` ke `.gitea/workflows/sast-scan.yml`.

**Setup Gitea Runner:**

1. Jalankan Gitea + Runner (lihat [DEPLOYMENT.md](../docs/DEPLOYMENT.md#gitea--actions-runner))
2. Buka Gitea → Site Administration → Actions → Runners
3. Copy registration token
4. Set `RUNNER_TOKEN=<token>` di `.env`
5. Jalankan `docker compose -f docker-compose.runner.yml up -d`

**Job container akses Gitea via Docker network** (`http://gitea:4000`), bukan `localhost:4000`. Ini sudah di-handle oleh `runner-config.yaml` yang override `GITHUB_SERVER_URL`.

## Supported Scanners

| Scanner | Type | Tools |
|---------|------|-------|
| Semgrep | SAST | p/default + p/security-audit |
| Cppcheck | C/C++ Static | `--enable=all` + SARIF conversion |
| Flawfinder | C/C++ Sinks | `--sarif --minlevel 1` |
| Gitleaks | Secrets | `--report-format json` + SARIF conversion |
| Clang-Tidy | C/C++ Analysis | `clang-analyzer-*,cert-*,bugprone-*,security-*` |
| GCC Fanalyzer | C Static | `gcc -fanalyzer` + SARIF merge |

## API Endpoints

### POST `/api/v1/ci/init`

Buat scan record baru.

**Request:**
```json
{
  "repoName": "owner/repo",
  "repoUrl": "https://github.com/owner/repo.git",
  "branch": "main",
  "commit": "abc12345",
  "prNumber": 42,
  "baseBranch": "main",
  "headBranch": "feature/my-feature"
}
```

> **PR metadata** (`prNumber`, `baseBranch`, `headBranch`) bersifat optional. Jika diisi, system akan:
> 1. Evaluate quality gate dengan diff findings (new vs fixed)
> 2. Post PR comment dengan severity breakdown + inline findings
> 3. Set commit status (`sast-integration/gate`) untuk branch protection

**Response:**
```json
{
  "success": true,
  "data": {
    "scanId": "scan_xxx"
  }
}
```

### POST `/api/v1/ci/upload`

Upload SARIF results per scanner.

**Request:** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `scanId` | string | Scan ID dari init |
| `tool` | string | Nama scanner (semgrep, cppcheck, dll) |
| `sarif` | file | File SARIF hasil scan |
| `repoName` | string | Nama repository |
| `findingsCount` | number | Jumlah findings |

### POST `/api/v1/ci/complete`

Tutup scan dan trigger quality gate.

**Request:**
```json
{
  "scanId": "scan_xxx",
  "status": "completed",
  "tools": ["semgrep", "cppcheck", "flawfinder", "gitleaks", "clang-tidy", "gcc-fanalyzer"],
  "platform": "github",
  "trigger": "ci"
}
```
