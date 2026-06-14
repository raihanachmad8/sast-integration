const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  // Check pgboss jobs
  const jobs = await client.query("SELECT name, state, data, created_on FROM pgboss.job WHERE name = 'ai-verify-finding' ORDER BY created_on DESC LIMIT 5");
  console.log("=== AI Verify Jobs ===");
  for (const row of jobs.rows) {
    console.log(`  state: ${row.state} | data: ${JSON.stringify(row.data)} | created: ${row.created_on}`);
  }
  
  await client.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });