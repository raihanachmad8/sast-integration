#!/bin/bash
# =============================================================================
# CI/CD Scan Upload Example
# =============================================================================
# This script demonstrates how to run multiple scanners and upload results
# to the SAST Integration API. The API will auto-register the repository
# if it doesn't exist yet.
#
# Usage:
#   1. Set environment variables (or update the values below)
#   2. Run this script from your CI/CD pipeline
#   3. The API will auto-create the repository on first upload
#
# Required tools:
#   - semgrep (for SAST scanning)
#   - gitleaks (for secret scanning)
#   - curl (for API calls)
# =============================================================================

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────
API_BASE_URL="${SAST_API_BASE_URL:-http://localhost:3000/api/v1}"
WORKSPACE_ID="${SAST_WORKSPACE_ID:-}"
PROJECT_ID="${SAST_PROJECT_ID:-}"
REPOSITORY_URL="${REPOSITORY_URL:-}"
REPOSITORY_NAME="${REPOSITORY_NAME:-}"
BRANCH="${BRANCH:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'main')}"
COMMIT_SHA="${COMMIT_SHA:-$(git rev-parse HEAD 2>/dev/null || echo '')}"
AUTH_TOKEN="${SAST_AUTH_TOKEN:-}"

# Validate required variables
if [[ -z "$WORKSPACE_ID" ]]; then
  echo "Error: SAST_WORKSPACE_ID is required"
  exit 1
fi

if [[ -z "$PROJECT_ID" ]]; then
  echo "Error: SAST_PROJECT_ID is required"
  exit 1
fi

if [[ -z "$AUTH_TOKEN" ]]; then
  echo "Error: SAST_AUTH_TOKEN is required"
  exit 1
fi

# Auto-detect repository URL if not provided
if [[ -z "$REPOSITORY_URL" ]]; then
  REPOSITORY_URL=$(git remote get-url origin 2>/dev/null || echo "")
fi

# Auto-detect repository name from URL
if [[ -z "$REPOSITORY_NAME" && -n "$REPOSITORY_URL" ]]; then
  REPOSITORY_NAME=$(basename "$REPOSITORY_URL" .git)
fi

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    SAST CI/CD Scan Upload                    ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  Workspace:  $WORKSPACE_ID"
echo "║  Project:    $PROJECT_ID"
echo "║  Repository: $REPOSITORY_NAME"
echo "║  Branch:     $BRANCH"
echo "║  Commit:     ${COMMIT_SHA:0:8}"
echo "╚════════════════════════════════════════════════════════════════╝"

# ─── Step 1: Run Scanners ───────────────────────────────────────────────────
echo ""
echo "▶ Step 1: Running scanners..."
echo ""

SCAN_DIR="./scan-results-$(date +%s)"
mkdir -p "$SCAN_DIR"

# 1.1 Run Semgrep (SAST)
echo "  ├─ Running Semgrep (SAST)..."
if command -v semgrep &> /dev/null; then
  semgrep scan \
    --config p/default \
    --sarif \
    --output "$SCAN_DIR/semgrep.sarif" \
    --quiet \
    . 2>/dev/null || true
  echo "  │  └─ ✓ Semgrep completed"
else
  echo "  │  └─ ⚠ Semgrep not installed, skipping"
fi

# 1.2 Run Gitleaks (Secret Scanning)
echo "  ├─ Running Gitleaks (Secrets)..."
if command -v gitleaks &> /dev/null; then
  gitleaks detect \
    --source . \
    --report-format sarif \
    --report-path "$SCAN_DIR/gitleaks.sarif" \
    --quiet || true
  echo "  │  └─ ✓ Gitleaks completed"
else
  echo "  │  └─ ⚠ Gitleaks not installed, skipping"
fi

# 1.3 Run Trivy (Dependency Scanning)
echo "  └─ Running Trivy (Dependencies)..."
if command -v trivy &> /dev/null; then
  trivy fs \
    --format sarif \
    --output "$SCAN_DIR/trivy.sarif" \
    --quiet \
    . 2>/dev/null || true
  echo "     └─ ✓ Trivy completed"
else
  echo "     └─ ⚠ Trivy not installed, skipping"
fi

# Count files
FILE_COUNT=$(find "$SCAN_DIR" -name "*.sarif" -type f | wc -l)
if [[ "$FILE_COUNT" -eq 0 ]]; then
  echo ""
  echo "⚠ No scan results generated. Ensure at least one scanner is installed."
  exit 1
fi

echo ""
echo "  ✓ Generated $FILE_COUNT scan result(s)"
echo ""

# ─── Step 2: Upload Results ─────────────────────────────────────────────────
echo "▶ Step 2: Uploading results to SAST API..."
echo ""

# Build curl command with all SARIF files
CURL_CMD=(
  curl
  --fail-with-body
  --silent
  --show-error
  -X POST
  "${API_BASE_URL}/workspaces/${WORKSPACE_ID}/scans/upload"
  -H "Authorization: Bearer ${AUTH_TOKEN}"
  -F "projectId=${PROJECT_ID}"
  -F "repositoryUrl=${REPOSITORY_URL}"
  -F "repositoryName=${REPOSITORY_NAME}"
  -F "branch=${BRANCH}"
  -F "commit=${COMMIT_SHA}"
  -F "source=ci_upload"
)

# Add all SARIF files to the request
for sarif_file in "$SCAN_DIR"/*.sarif; do
  if [[ -f "$sarif_file" ]]; then
    filename=$(basename "$sarif_file")
    CURL_CMD+=(-F "file=@${sarif_file};filename=${filename}")
    echo "  ├─ Adding: $filename"
  fi
done

echo "  └─ Uploading ${FILE_COUNT} file(s)..."
echo ""

# Execute the upload
RESPONSE=$("${CURL_CMD[@]}" 2>&1) || {
  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║                      ✗ Upload Failed                         ║"
  echo "╠════════════════════════════════════════════════════════════════╣"
  echo "║  Response: $RESPONSE"
  echo "╚════════════════════════════════════════════════════════════════╝"
  exit 1
}

# Parse response
SCAN_ID=$(echo "$RESPONSE" | grep -o '"scanId":"[^"]*"' | cut -d'"' -f4)
FINDINGS_COUNT=$(echo "$RESPONSE" | grep -o '"findingsCount":[0-9]*' | cut -d':' -f2)

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                      ✓ Upload Successful                     ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  Scan ID:     $SCAN_ID"
echo "║  Findings:    $FINDINGS_COUNT"
echo "║  View:        ${API_BASE_URL%/*}/../${WORKSPACE_ID}/scan"
echo "╚════════════════════════════════════════════════════════════════╝"

# ─── Step 3: Cleanup ────────────────────────────────────────────────────────
echo ""
echo "▶ Step 3: Cleaning up..."
rm -rf "$SCAN_DIR"
echo "  └─ ✓ Temporary files removed"

echo ""
echo "Done! Scan results are available in the SAST dashboard."
