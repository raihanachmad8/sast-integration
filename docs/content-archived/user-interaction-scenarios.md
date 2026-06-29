# User Interaction Scenarios

## Scenario 1: Developer — First-Time Setup

**Role:** Developer (member)

1. Receive workspace invitation via email
2. Create account and set password
3. Accept invitation
4. View workspace dashboard (limited view)

## Scenario 2: Security Lead — Full Workflow

**Role:** Owner

1. Connect GitHub organization
2. Import 10 repositories
3. Configure AI model (GPT-4)
4. Create quality gates (fail on critical)
5. Run first scans on all repos
6. Review AI-verified findings
7. Assign critical findings to developers
8. Generate compliance report (PDF)
9. Share report with stakeholders

## Scenario 3: Developer — Finding Triage

**Role:** Reviewer

1. Receive notification for new findings
2. Open Finding detail
3. Review code snippet and AI verdict
4. Confirm true positive
5. Add comment with remediation plan
6. Mark as "verified"
7. Assign to team member

## Scenario 4: Manager — Team Organization

**Role:** Manager

1. Create teams (Frontend, Backend, DevOps)
2. Assign members to teams
3. Create projects with team assignments
4. Configure project-specific scan policies
5. Review team activity in audit logs

## Scenario 5: CI/CD Integration

**Role:** DevOps (member)

1. Create project API token
2. Add scanner to CI pipeline
3. Configure CI workflow:

```yaml
- name: Run SAST Scan
  run: |
    semgrep scan --json --config p/default > results.json
    curl -X POST $SAST_API/ci/upload \
      -H "Authorization: Bearer $TOKEN" \
      -F "scanId=$SCAN_ID" \
      -F "tool=semgrep" \
      -F "sarif=@results.json"
```

4. Review findings in web UI
5. Quality gate blocks merge if critical findings

## Scenario 6: Audit Review

**Role:** Owner

1. Open audit logs page
2. Filter by date range and action type
3. Review member changes
4. Export audit trail for compliance
5. Generate security report
