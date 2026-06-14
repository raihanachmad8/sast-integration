const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  const findings = await client.query("SELECT id, rule, file_path, line_number, code_snippet FROM findings WHERE active = true AND rule != 'checkersReport' LIMIT 5");
  console.log("=== Findings code_snippet ===");
  for (const row of findings.rows) {
    console.log(`  ${row.rule} | line: ${row.line_number}`);
    console.log(`  code_snippet (${row.code_snippet ? row.code_snippet.length : 0} chars):`);
    console.log(row.code_snippet || '  NULL');
    console.log("");
  }
  
  await client.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });