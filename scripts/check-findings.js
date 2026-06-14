const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  const findings = await client.query("SELECT id, active, rule, scan_id FROM findings WHERE scan_id = '2511048a-4241-41d8-ad50-ed7b87ddf8b9'");
  console.log("=== Findings for scan ===");
  for (const row of findings.rows) {
    console.log(`  ${row.rule} | active: ${row.active}`);
  }
  
  await client.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });