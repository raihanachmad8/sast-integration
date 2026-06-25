# Troubleshooting

## Common Issues

### Scanner Not Found

**Symptom:** Scanner shows as unavailable in scanner status.

**Solution:**
```bash
# Check if scanner is installed
which semgrep    # Linux/macOS
where semgrep    # Windows

# Install missing scanner
pip install semgrep
```

### Scan Stuck in "Processing"

**Symptom:** Scan remains in processing state for > 30 minutes.

**Cause:** Worker may have crashed or scanner timed out.

**Solution:**
1. Check worker logs for errors
2. The `scan-timeout-watchdog` job auto-fails scans > 30 minutes
3. Trigger a new scan if needed

### No Findings After Scan

**Symptom:** Scan completes but shows 0 findings.

**Possible causes:**
- Code has no security issues (unlikely)
- Scanner misconfigured
- Parser failed to extract findings

**Solution:**
1. Check scanner output in scan results
2. Verify scanner is installed and available
3. Check parser logs for errors

### AI Verification Not Running

**Symptom:** Findings show "pending" AI verdict.

**Check:**
1. `FEATURE_FLAG_AI_VERIFICATION=true`
2. AI model configured in workspace settings
3. LLM provider API key is valid

### Permission Denied on Actions

**Symptom:** UI shows buttons but actions fail with 403.

**Cause:** User's role lacks the required MANAGE permission.

**Solution:** Check `ROLE_PERMISSIONS` matrix in `PERMISSIONS.md`.

### Database Connection Errors

**Symptom:** Application fails to start with database errors.

**Solution:**
1. Verify `DATABASE_URL` is correct
2. Check PostgreSQL is running
3. Run migrations: `npm run db:migrate`

## Debug Mode

Enable verbose logging:

```bash
DEBUG=sast:* npm run dev
```

## Log Locations

| Component | Location |
|-----------|----------|
| Application | stdout/stderr |
| Workers | pg-boss job table |
| Scans | `scan_results` table |
| Audit | `audit_logs` table |

## Getting Help

1. Check this troubleshooting guide
2. Review API error messages
3. Check database for data consistency
4. Review worker job logs
