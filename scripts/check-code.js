const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  const findings = await client.query("SELECT id, scanner, rule, code_snippet IS NOT NULL as has_code, LENGTH(code_snippet) as code_len FROM findings WHERE active = true LIMIT 10");
  console.log("=== Findings code_snippet status ===");
  for (const row of findings.rows) {
    console.log(`  ${row.scanner} | ${row.rule} | has_code: ${row.has_code} | code_len: ${row.code_len}`);
  }
  
  await client.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });