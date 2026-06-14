const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  // Check pg-boss version
  const version = await client.query("SELECT version FROM pgboss.version");
  console.log("pg-boss version:", version.rows[0]?.version);
  
  // Check all tables in pgboss schema
  const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'pgboss'");
  console.log("\npgboss tables:");
  for (const row of tables.rows) {
    console.log(`  ${row.tablename}`);
  }
  
  // Check job count by state
  const states = await client.query("SELECT state, COUNT(*) as count FROM pgboss.job GROUP BY state");
  console.log("\nJob states:");
  for (const row of states.rows) {
    console.log(`  ${row.state}: ${row.count}`);
  }
  
  await client.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });