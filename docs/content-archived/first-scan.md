# First Scan

## Prerequisites

Before running your first scan, ensure you have:

1. A user account with access to a workspace
2. A source control provider connected (GitHub, GitLab, or Gitea)
3. At least one repository imported

## Step 1: Connect a Repository

1. Navigate to **Source Control** in the sidebar
2. Click **Connect Provider** and authorize your SCM
3. Click **Import Repositories** and select a repository
4. Wait for the initial sync to complete

## Step 2: Trigger a Scan

1. Go to **Scans** in the sidebar
2. Click **New Scan**
3. Select the repository and branch
4. Choose scanner engines:
   - **semgrep** — Multi-language (recommended)
   - **gitleaks** — Secrets detection (recommended)
   - **flawfinder** — C/C++ buffer overflows
   - **cppcheck** — C/C++ static analysis
   - **clang-tidy** — C/C++ linter
   - **gcc-fanalyzer** — C/C++ analysis
5. Click **Start Scan**

## Step 3: Monitor Progress

The scan progresses through these stages:

| Stage | Description |
|-------|-------------|
| queued | Waiting for worker pickup |
| running | Worker is processing |
| processing | Scanners executing in parallel |
| parsing | Output being parsed into findings |
| completed | Scan finished successfully |

## Step 4: Review Findings

1. Go to **Findings** in the sidebar
2. Filter by severity, scanner, or status
3. Click a finding to view details:
   - Source code snippet
   - AI verdict (true positive / false positive)
   - Confidence score
   - CWE classification
   - Fix suggestion

## Step 5: Triage Findings

- Mark findings as **Verified**, **Fixed**, **False Positive**, or **Ignored**
- Assign findings to team members
- Add comments for collaboration

## CI/CD Integration

For automated scanning in CI/CD pipelines:

```bash
# Initialize scan
curl -X POST /api/v1/ci/init \
  -H "Authorization: Bearer <token>" \
  -d '{"repoName":"my-repo","branch":"main","commit":"abc123"}'

# Upload results
curl -X POST /api/v1/ci/upload \
  -H "Authorization: Bearer <token>" \
  -F "scanId=<uuid>" \
  -F "tool=semgrep" \
  -F "sarif=@results.json"

# Complete scan
curl -X POST /api/v1/ci/complete \
  -H "Authorization: Bearer <token>" \
  -d '{"scanId":"<uuid>","status":"completed","tools":["semgrep"]}'
```
