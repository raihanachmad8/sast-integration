const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  const findings = await client.query("SELECT id, rule, file_path, line_number, code_snippet FROM findings WHERE rule = 'arrayIndexOutOfBounds' LIMIT 1");
  console.log("=== Finding ===");
  for (const row of findings.rows) {
    console.log(`  rule: ${row.rule}`);
    console.log(`  file: ${row.file_path}`);
    console.log(`  line: ${row.line_number}`);
    console.log(`  code_snippet:`);
    console.log(row.code_snippet);
  }
  
  await client.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });