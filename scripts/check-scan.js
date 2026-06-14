const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  // Get the latest scan results
  const scans = await client.query("SELECT id, branch, status FROM scans ORDER BY created_at DESC LIMIT 1");
  const scanId = scans.rows[0].id;
  console.log('Scan:', scanId, 'Branch:', scans.rows[0].branch);
  
  // Get scan results
  const results = await client.query("SELECT * FROM scan_results WHERE scan_id = $1", [scanId]);
  for (const r of results.rows) {
    console.log(`\nScanner: ${r.scanner}`);
    console.log(`  File key: ${r.file_key}`);
    console.log(`  Summary:`, JSON.stringify(r.parsed_summary));
  }
  
  // Get findings
  const findings = await client.query("SELECT * FROM findings WHERE scan_id = $1", [scanId]);
  console.log(`\n=== Findings: ${findings.rows.length} ===`);
  for (const f of findings.rows) {
    console.log(`  Rule: ${f.rule} | Scanner: ${f.scanner} | File: ${f.file_path} | Line: ${f.line_number}`);
    console.log(`  Message: ${f.message}`);
    console.log(`  Code: ${f.code_snippet ? f.code_snippet.substring(0, 100) : 'none'}`);
  }
  
  await client.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });