import pg from 'pg';
const c = new pg.Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
async function main() {
  await c.connect();

  // Check gitleaks findings in CI/CD scan
  const scanId = '0c9a14a4-00f5-47e6-b297-c04d16c56b35';
  const gitleaks = await c.query(`
    SELECT id, scanner, rule, file_path, line_number, message, 
           CASE WHEN code_snippet IS NOT NULL AND length(code_snippet) > 0 THEN 'YES' ELSE 'NO' END as has_snippet
    FROM findings WHERE scan_id = $1 AND scanner = 'gitleaks'
  `, [scanId]);
  console.log('Gitleaks findings in CI/CD scan:');
  for (const f of gitleaks.rows) {
    console.log(`  ${f.rule} | ${f.file_path}:${f.line_number} | snippet=${f.has_snippet}`);
  }

  // Check what gitleaks SARIF reported
  const results = await c.query(`
    SELECT scanner, parsed_summary FROM scan_results WHERE scan_id = $1 AND scanner = 'gitleaks'
  `, [scanId]);
  console.log('\nGitleaks scan results:');
  for (const r of results.rows) {
    console.log(`  ${r.scanner}: summary=${JSON.stringify(r.parsed_summary)}`);
  }

  // Check what all scanners reported vs what was stored
  const allResults = await c.query(`
    SELECT scanner, COUNT(*) as stored 
    FROM findings WHERE scan_id = $1 
    GROUP BY scanner ORDER BY scanner
  `, [scanId]);
  console.log('\nFindings stored per scanner:');
  for (const r of allResults.rows) {
    console.log(`  ${r.scanner}: ${r.stored}`);
  }

  await c.end();
}
main();
