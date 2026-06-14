const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  const findings = await client.query("SELECT id, scanner, rule, active, status FROM findings ORDER BY created_at DESC LIMIT 10");
  console.log("=== Findings ===");
  for (const row of findings.rows) {
    console.log(`  ${row.scanner} | ${row.rule} | active: ${row.active} | status: ${row.status}`);
  }
  
  await client.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });