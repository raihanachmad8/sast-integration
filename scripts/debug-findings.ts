import pg from 'pg';
const c = new pg.Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
async function main() {
  await c.connect();

  // Check all scans and their findings
  const scans = await c.query(`
    SELECT s.id, s.status, s.origin, r.name as repo_name,
           (SELECT COUNT(*) FROM findings WHERE scan_id = s.id) as finding_count,
           (SELECT COUNT(*) FROM scan_results WHERE scan_id = s.id) as result_count
    FROM scans s
    LEFT JOIN repositories r ON s.repository_id = r.id
    ORDER BY s.created_at DESC
  `);

  for (const scan of scans.rows) {
    console.log(`\nScan ${scan.id?.substring(0,8)}: ${scan.repo_name} | ${scan.origin} | ${scan.status}`);
    console.log(`  Findings: ${scan.finding_count}, Scan Results: ${scan.result_count}`);

    if (scan.finding_count > 0) {
      const findings = await c.query(`
        SELECT scanner, COUNT(*) as count,
               SUM(CASE WHEN code_snippet IS NULL THEN 1 ELSE 0 END) as no_snippet
        FROM findings WHERE scan_id = $1
        GROUP BY scanner ORDER BY scanner
      `, [scan.id]);
      console.log('  By scanner:');
      for (const f of findings.rows) {
        console.log(`    ${f.scanner}: ${f.count} findings (${f.no_snippet} missing snippet)`);
      }
    }

    if (scan.result_count > 0) {
      const results = await c.query(`
        SELECT scanner, parsed_summary->>'totalFindings' as total, parsed_summary->>'summary' as summary
        FROM scan_results WHERE scan_id = $1
      `, [scan.id]);
      console.log('  Scan Results:');
      for (const r of results.rows) {
        console.log(`    ${r.scanner}: reported=${r.total}`);
      }
    }
  }

  await c.end();
}
main();
