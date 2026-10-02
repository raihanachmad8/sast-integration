# Scan Upload API

**Base Path:** `/api/v1/projects/{projectId}/scans`

This API allows CI/CD pipelines to upload pre-generated SAST results (Semgrep, Trivy, Cppcheck, Gitleaks, Flawfinder, SARIF, etc.) without requiring SCM integration.

It is the primary mechanism for the **"external" repository flow** (`repositories.connection_type = 'external'`).

Repositories used via this API are often **auto-created** on first upload (no manual registration required). See [Managed Scanning & Dual Flow Architecture](./managed-scanning-and-scanner-policies.md) for the full picture of `scm` vs `external` repositories.

---

## Authentication

The upload endpoint supports two authentication methods:

### 1. Project API Token (Recommended for CI)

Long-lived, project-scoped tokens created via the management API.

**Format:** `Authorization: Bearer sast_p_xxxxxxxxxxxxxxxx`

**Permissions required:** `["scans:upload"]`

**Advantages:**
- No user session required
- Narrowly scoped to one project
- Safe to store in GitHub Secrets / GitLab CI Variables

### 2. User Session JWT

Standard Bearer token obtained from `/auth/signin`.

Requires the user to be at least a **member** of the project's workspace.

---

## POST /projects/{projectId}/scans/upload

Upload one or more scanner result files for a specific commit.

### Form Data Parameters

| Field            | Type   | Required | Description |
|------------------|--------|----------|-------------|
| `branch`         | string | Yes      | Git branch name |
| `commit`         | string | Yes      | Full commit SHA |
| `repository_url` | string | No       | Recommended for external repositories |
| `repository_name`| string | No       | Fallback name if URL is not provided |
| `source`         | string | No       | e.g. `github_actions`, `gitlab_ci`, `jenkins` |
| `{scanner}`      | file   | Yes*     | One or more files. Key = scanner name (semgrep, trivy, cppcheck, etc.) |

*At least one file is required.

### Supported Scanners (validated against `SUPPORTED_SCANNERS`)

- `semgrep`
- `cppcheck`
- `trivy`
- `gitleaks`
- `flawfinder`
- `sarif` (generic)

All uploads are validated using `validateScanners()`. This same function will be used for future managed `scan_policies`. See the [architecture document](./managed-scanning-and-scanner-policies.md).

### Success Response (201)

```json
{
  "success": true,
  "message": "Scan results uploaded and 47 findings parsed successfully.",
  "data": {
    "success": true,
    "scanId": "uuid",
    "repositoryId": "uuid",
    "uploadId": "uuid",
    "resultsCount": 1,
    "findingsCreated": 47,
    "retentionNote": "Raw scan files will be retained for 30 days by default."
  }
}
```

### Error Responses

| Status | Code                | When it happens |
|--------|---------------------|-----------------|
| 400    | VALIDATION_ERROR    | Missing branch/commit or no files |
| 401    | AUTH_ERROR          | Invalid/expired token |
| 403    | FORBIDDEN           | Token not valid for this project or missing `scans:upload` permission |
| 413    | PAYLOAD_TOO_LARGE   | Total upload size exceeds 50MB |
| 500    | UPLOAD_FAILED       | Unexpected server error |

---

## POST /projects/{projectId}/scans/{scanId}/reparse

Manually triggers re-parsing of all previously uploaded results for a scan.

### Use Cases

- After improving parser logic or severity mapping
- After fixing deduplication bugs
- Recovery from transient processing failures

### Authorization

Requires **MEMBER** role or higher in the project's workspace.

### Success Response (200)

```json
{
  "success": true,
  "message": "Manual reparse triggered successfully",
  "data": {
    "scanId": "uuid",
    "resultsQueued": 3,
    "status": "processing"
  }
}
```

The actual parsing happens asynchronously via the background queue.

---

## Best Practices for CI

### GitHub Actions Example

```yaml
- name: Upload SAST Results
  env:
    SAST_TOKEN: ${{ secrets.SAST_PROJECT_TOKEN }}
  run: |
    curl -X POST \
      -H "Authorization: Bearer $SAST_TOKEN" \
      -F "branch=${GITHUB_REF#refs/heads/}" \
      -F "commit=$GITHUB_SHA" \
      -F "repository_url=${{ github.server_url }}/${{ github.repository }}" \
      -F "source=github_actions" \
      -F "semgrep=@semgrep-results.json" \
      -F "trivy=@trivy-report.json" \
      https://your-domain/api/v1/projects/${{ secrets.SAST_PROJECT_ID }}/scans/upload
```

### Recommendations

1. **Always use Project API Tokens** for CI (never user passwords or session tokens).
2. Give the token a clear name (e.g. `github-actions-main`).
3. Prefer narrow permissions (`["scans:upload"]`).
4. Set a reasonable expiry if the pipeline is temporary.
5. Use `repository_url` for better grouping of external repositories.

---

## Notes on Processing

- Small reports (< 5MB) are parsed **synchronously** during the upload request.
- Large reports are uploaded to object storage and processed **asynchronously** via the queue.
- Findings are automatically deduplicated using stable fingerprints.
- Raw files are retained for 30 days by default (configurable in future).

---

## Related Endpoints

- Create Project API Token: `POST /projects/{projectId}/api-tokens`
- List Project API Tokens: `GET /projects/{projectId}/api-tokens`
- Revoke Token: `DELETE /projects/{projectId}/api-tokens/{tokenId}`

See `docs/api/auth.md` for full Project API Token documentation.
