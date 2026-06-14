const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  // Check job states
  const states = await client.query("SELECT name, state, COUNT(*) as count FROM pgboss.job GROUP BY name, state ORDER BY name, state");
  console.log("=== Job states ===");
  for (const row of states.rows) {
    console.log(`  ${row.name} | ${row.state}: ${row.count}`);
  }
  
  // Check recent ai-verify-finding jobs
  const jobs = await client.query("SELECT id, name, state, data, created_on, start_in FROM pgboss.job WHERE name = 'ai-verify-finding' ORDER BY created_on DESC LIMIT 5");
  console.log("\n=== Recent AI verify jobs ===");
  for (const row of jobs.rows) {
    console.log(`  id: ${row.id} | state: ${row.state} | start_in: ${row.start_in}`);
    console.log(`    data: ${JSON.stringify(row.data)}`);
  }
  
  await client.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });