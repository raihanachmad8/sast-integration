const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  // Check queue configuration
  const queues = await client.query("SELECT * FROM pgboss.queue");
  console.log("=== Queue configuration ===");
  for (const row of queues.rows) {
    console.log(`  ${row.name}:`);
    console.log(`    policy: ${row.policy}`);
    console.log(`    retryLimit: ${row.retry_limit}`);
    console.log(`    deleteAfterSeconds: ${row.delete_after_seconds}`);
    console.log(`    retentionSeconds: ${row.retention_seconds}`);
  }
  
  await client.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });