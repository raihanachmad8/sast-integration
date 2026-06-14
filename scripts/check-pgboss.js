const { Client } = require('pg');
async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@localhost:5432/sast_db' });
  await client.connect();
  
  // Check pgboss schema
  const schemas = await client.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE '%pgboss%'");
  console.log("=== pgboss schemas ===");
  for (const row of schemas.rows) {
    console.log(`  ${row.schema_name}`);
  }
  
  // Check all tables in pgboss schema
  const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'pgboss'");
  console.log("\n=== pgboss tables ===");
  for (const row of tables.rows) {
    console.log(`  ${row.tablename}`);
  }
  
  // Check job count
  const jobCount = await client.query("SELECT COUNT(*) as count FROM pgboss.job");
  console.log(`\n=== Total jobs: ${jobCount.rows[0].count} ===`);
  
  await client.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });