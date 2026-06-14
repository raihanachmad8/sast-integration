const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  // Check scanner rules versions
  const result = await client.query("SELECT * FROM scanner_rules_versions ORDER BY created_at DESC LIMIT 5");
  console.log("=== Scanner Rules Versions ===");
  for (const row of result.rows) {
    console.log(`  id: ${row.id} | user: ${row.user_id} | version: ${row.version} | status: ${row.status} | path: ${row.path}`);
  }
  
  await client.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });