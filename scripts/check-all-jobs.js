const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  // Check all job names and states
  const jobs = await client.query("SELECT name, state, COUNT(*) as count FROM pgboss.job GROUP BY name, state ORDER BY name");
  console.log("=== All jobs ===");
  for (const row of jobs.rows) {
    console.log(`  ${row.name} | ${row.state}: ${row.count}`);
  }
  
  // Check if ai-verify-finding exists at all
  const aiJobs = await client.query("SELECT COUNT(*) as count FROM pgboss.job WHERE name = 'ai-verify-finding'");
  console.log(`\n=== AI verify jobs total: ${aiJobs.rows[0].count} ===`);
  
  // Check queue config
  const queues = await client.query("SELECT name, policy FROM pgboss.queue");
  console.log("\n=== Queue config ===");
  for (const row of queues.rows) {
    console.log(`  ${row.name} | policy: ${row.policy}`);
  }
  
  await client.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });