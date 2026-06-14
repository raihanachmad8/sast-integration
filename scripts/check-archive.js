const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  // Check archive table
  const archiveCount = await client.query("SELECT COUNT(*) as count FROM pgboss.archive");
  console.log(`Archive count: ${archiveCount.rows[0].count}`);
  
  // Check archived ai-verify-finding jobs
  const archived = await client.query("SELECT name, state, data FROM pgboss.archive WHERE name = 'ai-verify-finding' ORDER BY created_on DESC LIMIT 5");
  console.log("\n=== Archived AI verify jobs ===");
  for (const row of archived.rows) {
    console.log(`  state: ${row.state} | data: ${JSON.stringify(row.data)}`);
  }
  
  // Check if there are any failed jobs
  const failed = await client.query("SELECT name, state, data FROM pgboss.job WHERE state = 'failed' ORDER BY created_on DESC LIMIT 5");
  console.log("\n=== Failed jobs ===");
  for (const row of failed.rows) {
    console.log(`  ${row.name} | state: ${row.state}`);
  }
  
  await client.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });