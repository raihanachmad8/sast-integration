const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  // Check findings active status
  const findings = await client.query("SELECT id, active, scan_id FROM findings LIMIT 5");
  console.log("=== Findings active status ===");
  for (const row of findings.rows) {
    console.log(`  id: ${row.id.substring(0,8)}... | active: ${row.active} | scan: ${row.scan_id.substring(0,8)}...`);
  }
  
  // Check latest scan
  const scans = await client.query("SELECT id, status FROM scans ORDER BY created_at DESC LIMIT 1");
  console.log("\n=== Latest scan ===");
  console.log(`  id: ${scans.rows[0].id} | status: ${scans.rows[0].status}`);
  
  // Check findings for this scan
  const scanFindings = await client.query("SELECT id, active, rule FROM findings WHERE scan_id = $1", [scans.rows[0].id]);
  console.log(`\n=== Findings for latest scan: ${scanFindings.rows.length} ===`);
  for (const row of scanFindings.rows) {
    console.log(`  ${row.rule} | active: ${row.active}`);
  }
  
  await client.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });