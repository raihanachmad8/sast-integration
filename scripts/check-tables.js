const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  // Check for scanner_rules_versions table
  const result = await client.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'scanner_rules_versions')");
  console.log("scanner_rules_versions exists:", result.rows[0].exists);
  
  // Check for async_jobs table
  const result2 = await client.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'async_jobs')");
  console.log("async_jobs exists:", result2.rows[0].exists);
  
  await client.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });