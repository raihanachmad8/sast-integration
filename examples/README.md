# CI/CD Integration Examples

This directory contains examples for integrating SAST scanners with the API.

## Quick Start

### 1. Shell Script (Bash)
```bash
# Set environment variables
export SAST_API_URL=http://localhost:3000/api/v1
export SAST_WORKSPACE_ID=ws_xxx
export SAST_PROJECT_ID=repo_xxx
export SAST_AUTH_TOKEN=your-token

# Run the script
chmod +x ci-cd-upload.sh
./ci-cd-upload.sh
```

### 2. GitHub Actions
Copy `github-actions.yml` to `.github/workflows/sast-scan.yml` in your repository.

Set these secrets in your GitHub repository:
- `SAST_API_URL` — Your SAST API URL
- `SAST_WORKSPACE_ID` — Your workspace ID
- `SAST_PROJECT_ID` — The project/repository ID
- `SAST_AUTH_TOKEN` — Your API token

### 3. GitLab CI
Copy `gitlab-ci.yml` to the root of your repository.

Set these variables in GitLab (Settings > CI/CD > Variables):
- `SAST_API_URL` — Your SAST API URL
- `SAST_WORKSPACE_ID` — Your workspace ID
- `SAST_PROJECT_ID` — The project/repository ID
- `SAST_AUTH_TOKEN` — Your API token (masked)

### 4. Node.js
```bash
# Install dependencies (optional, for running scanners)
npm install -g @semgrep/cli gitleaks trivy

# Set environment variables
export SAST_API_URL=http://localhost:3000/api/v1
export SAST_WORKSPACE_ID=ws_xxx
export SAST_PROJECT_ID=repo_xxx
export SAST_AUTH_TOKEN=your-token

# Run the script
node upload-scan.js
```

## API Reference

### POST `/api/v1/workspaces/:workspaceId/scans/upload`

Upload scan results from CI/CD pipelines.

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | string | Yes | Repository ID (auto-registered if not exists) |
| `repositoryUrl` | string | No | Repository URL (for auto-registration) |
| `repositoryName` | string | No | Display name (for auto-registration) |
| `branch` | string | No | Branch name (default: `main`) |
| `commit` | string | No | Commit SHA |
| `source` | string | No | Source identifier (default: `ci_upload`) |
| `file` | file | Yes | One or more SARIF/JSON scanner output files |

**Response:**
```json
{
  "success": true,
  "data": {
    "scanId": "scan_xxx",
    "findingsCount": 42
  }
}
```

## Auto-Registration

When you upload scan results, the API automatically:

1. **Checks if the repository exists** by `projectId`
2. **If not, searches by URL** (`repositoryUrl`) for deduplication
3. **If not found, creates an external repository** with the provided name

This means you can start uploading scans immediately without pre-registering repositories.

## Supported Scanners

The API accepts any SARIF format output. These scanners are tested:

| Scanner | Type | Command |
|---------|------|---------|
| Semgrep | SAST | `semgrep scan --config p/default --sarif` |
| Gitleaks | Secrets | `gitleaks detect --report-format sarif` |
| Trivy | Dependencies | `trivy fs --format sarif` |
| Cppcheck | C/C++ | `cppcheck --xml` (converted to SARIF) |
| Flawfinder | C/C++ | Custom parser |

## Example CI/CD Pipeline

```yaml
# .github/workflows/sast.yml
name: Security Scan
on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Semgrep
        uses: semgrep/semgrep-action@v1
        with:
          config: p/default
          generateSarif: true
      
      - name: Upload to SAST
        run: |
          curl -X POST \
            "${{ secrets.SAST_API_URL }}/workspaces/${{ secrets.SAST_WORKSPACE_ID }}/scans/upload" \
            -H "Authorization: Bearer ${{ secrets.SAST_AUTH_TOKEN }}" \
            -F "projectId=${{ secrets.SAST_PROJECT_ID }}" \
            -F "repositoryUrl=${{ github.server_url }}/${{ github.repository }}" \
            -F "branch=${{ github.ref_name }}" \
            -F "commit=${{ github.sha }}" \
            -F "file=@semgrep.sarif"
```
