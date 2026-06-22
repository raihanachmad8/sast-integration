import pg from 'pg';
const c = new pg.Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
async function main() {
  await c.connect();

  // Find CI/CD scan
  const scans = await c.query(`
    SELECT s.id, s.origin, s.status, r.name as repo_name
    FROM scans s LEFT JOIN repositories r ON s.repository_id = r.id
    WHERE s.origin = 'external_upload' AND s.status = 'completed'
    ORDER BY s.created_at DESC LIMIT 1
  `);

  if (scans.rows.length === 0) {
    console.log('No CI/CD scan found');
    await c.end();
    return;
  }

  const scanId = scans.rows[0].id;
  console.log(`CI/CD Scan: ${scanId}`);

  // Check all findings
  const findings = await c.query(`
    SELECT scanner, COUNT(*) as count FROM findings WHERE scan_id = $1 GROUP BY scanner ORDER BY scanner
  `, [scanId]);
  console.log('Findings by scanner:');
  for (const f of findings.rows) {
    console.log(`  ${f.scanner}: ${f.count}`);
  }

  // Check gitleaks findings detail
  const gitleaks = await c.query(`
    SELECT rule, file_path, line_number, message FROM findings WHERE scan_id = $1 AND scanner = 'gitleaks'
  `, [scanId]);
  console.log(`\nGitleaks findings (${gitleaks.rows.length}):`);
  for (const f of gitleaks.rows) {
    console.log(`  ${f.rule} | ${f.file_path}:${f.line_number}`);
  }

  await c.end();
}
main();
