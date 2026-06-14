const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  const result = await client.query("SELECT id, branch, status, created_at FROM scans ORDER BY created_at DESC LIMIT 5");
  console.log("=== Recent scans ===");
  for (const row of result.rows) {
    console.log(`  ${row.id.substring(0,8)}... | branch: ${row.branch} | status: ${row.status} | created: ${row.created_at}`);
  }
  
  await client.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });